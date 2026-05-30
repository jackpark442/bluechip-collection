'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Bell, CheckCircle, Clock, AlertTriangle, Car, Shield, FileText, Wrench, Plus } from 'lucide-react';
import type { Reminder, ReminderType, ReminderStatus } from '@/types';
import { formatDate, daysUntil, REMINDER_TYPE_LABELS, getVehicleDisplayName } from '@/lib/utils';

interface Props {
  reminders: (Reminder & { vehicle?: any })[];
}

const TYPE_ICONS: Record<ReminderType, typeof Bell> = {
  mot_due: Shield,
  insurance_due: FileText,
  tax_due: FileText,
  service_due: Wrench,
  tyre_check: Car,
  fluid_check: Car,
  custom: Bell,
};

export default function RemindersClient({ reminders: initialReminders }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [reminders, setReminders] = useState(initialReminders);
  const [filter, setFilter] = useState<'all' | 'overdue' | 'upcoming' | 'completed'>('all');
  const [typeFilter, setTypeFilter] = useState<ReminderType | 'all'>('all');

  const overdue = reminders.filter(r => r.status === 'pending' && daysUntil(r.due_date) !== null && (daysUntil(r.due_date) as number) < 0);
  const upcoming30 = reminders.filter(r => r.status === 'pending' && daysUntil(r.due_date) !== null && (daysUntil(r.due_date) as number) >= 0 && (daysUntil(r.due_date) as number) <= 30);
  const upcoming90 = reminders.filter(r => r.status === 'pending' && daysUntil(r.due_date) !== null && (daysUntil(r.due_date) as number) > 30 && (daysUntil(r.due_date) as number) <= 90);
  const ok = reminders.filter(r => r.status === 'pending' && daysUntil(r.due_date) !== null && (daysUntil(r.due_date) as number) > 90);

  const filtered = reminders.filter(r => {
    if (filter === 'overdue') return r.status === 'pending' && (daysUntil(r.due_date) ?? 1) < 0;
    if (filter === 'upcoming') return r.status === 'pending' && (daysUntil(r.due_date) ?? 999) >= 0 && (daysUntil(r.due_date) ?? 999) <= 90;
    if (filter === 'completed') return r.status === 'completed';
    return r.status !== 'completed';
  }).filter(r => typeFilter === 'all' || r.type === typeFilter);

  async function markComplete(id: string) {
    await supabase.from('reminders').update({ status: 'completed' }).eq('id', id);
    setReminders(prev => prev.map(r => r.id === id ? { ...r, status: 'completed' as ReminderStatus } : r));
  }

  async function snooze(id: string, days: number) {
    const snoozeUntil = new Date();
    snoozeUntil.setDate(snoozeUntil.getDate() + days);
    await supabase.from('reminders').update({
      status: 'snoozed',
      snoozed_until: snoozeUntil.toISOString().split('T')[0],
    }).eq('id', id);
    setReminders(prev => prev.map(r => r.id === id ? { ...r, status: 'snoozed' as ReminderStatus } : r));
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard color="red" count={overdue.length} label="Overdue" sub="Immediate action needed" icon={<AlertTriangle className="w-5 h-5" />} />
        <StatCard color="amber" count={upcoming30.length} label="Next 30 days" sub="Expiring soon" icon={<Clock className="w-5 h-5" />} />
        <StatCard color="blue" count={upcoming90.length} label="Next 90 days" sub="Coming up" icon={<Bell className="w-5 h-5" />} />
        <StatCard color="green" count={ok.length} label="All clear" sub="Compliant vehicles" icon={<CheckCircle className="w-5 h-5" />} />
      </div>

      {/* Filters */}
      <div className="glass-card rounded-xl p-4 flex flex-wrap gap-4 items-center">
        <div className="flex gap-1">
          {(['all', 'overdue', 'upcoming', 'completed'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === f ? 'bg-amber-DEFAULT/15 text-amber-DEFAULT' : 'text-chrome-dim hover:text-chrome-bright'}`}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as any)}
          className="input-dark rounded-lg px-3 py-1.5 text-xs ml-auto">
          <option value="all">All Types</option>
          {Object.entries(REMINDER_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="glass-card rounded-xl p-16 text-center">
          <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3 opacity-50" />
          <h3 className="font-display text-xl text-chrome-bright mb-2">All Clear</h3>
          <p className="text-chrome-dim text-sm">No reminders in this category</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => <ReminderCard key={r.id} reminder={r} onComplete={markComplete} onSnooze={snooze} />)}
        </div>
      )}
    </div>
  );
}

function ReminderCard({ reminder: r, onComplete, onSnooze }: {
  reminder: Reminder & { vehicle?: any };
  onComplete: (id: string) => void;
  onSnooze: (id: string, days: number) => void;
}) {
  const days = daysUntil(r.due_date);
  const isExpired = days !== null && days < 0;
  const isCritical = days !== null && days >= 0 && days <= 7;
  const isWarning = days !== null && days > 7 && days <= 30;
  const Icon = TYPE_ICONS[r.type] ?? Bell;

  const borderColor = isExpired ? 'border-red-500/25' : isCritical ? 'border-red-500/20' : isWarning ? 'border-amber-500/20' : 'border-white/5';
  const bgColor = isExpired ? 'bg-red-500/5' : isCritical ? 'bg-red-500/5' : isWarning ? 'bg-amber-500/5' : '';
  const dayColor = isExpired ? 'text-red-400' : isCritical ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-emerald-400';

  return (
    <div className={`glass-card rounded-xl p-5 border ${borderColor} ${bgColor}`}>
      <div className="flex items-start gap-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isExpired || isCritical ? 'bg-red-500/15 text-red-400' : isWarning ? 'bg-amber-500/15 text-amber-400' : 'bg-white/5 text-chrome-dim'}`}>
          <Icon className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-1">
            <div>
              <div className="font-medium text-chrome-bright">{r.title}</div>
              {r.description && <div className="text-sm text-chrome-dim mt-0.5">{r.description}</div>}
            </div>
            <div className={`text-sm font-mono font-semibold shrink-0 ${dayColor}`}>
              {days === null ? '?' : days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Today' : `${days} days`}
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-chrome-dim mt-2">
            {r.vehicle && (
              <Link href={`/vehicles/${r.vehicle.id}`} className="hover:text-amber-DEFAULT transition-colors flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5" />
                {r.vehicle.make} {r.vehicle.model} {r.vehicle.year}
                {r.vehicle.registration && <span className="font-mono">({r.vehicle.registration.toUpperCase()})</span>}
              </Link>
            )}
            <span>{REMINDER_TYPE_LABELS[r.type]}</span>
            <span>Due {formatDate(r.due_date)}</span>
          </div>
        </div>

        {r.status === 'pending' && (
          <div className="flex gap-2 shrink-0">
            <div className="relative group">
              <button className="btn-ghost rounded-lg px-3 py-1.5 text-xs">Snooze</button>
              <div className="absolute right-0 top-full mt-1 w-28 glass-card rounded-lg py-1 z-10 hidden group-hover:block border border-white/8">
                {[7, 14, 30].map(d => (
                  <button key={d} onClick={() => onSnooze(r.id, d)}
                    className="w-full text-left px-3 py-1.5 text-xs text-chrome-dim hover:text-chrome-bright hover:bg-white/3">
                    {d} days
                  </button>
                ))}
              </div>
            </div>
            <button onClick={() => onComplete(r.id)}
              className="btn-ghost rounded-lg px-3 py-1.5 text-xs border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10">
              <CheckCircle className="w-3.5 h-3.5 inline mr-1" />Done
            </button>
          </div>
        )}
        {r.status === 'completed' && (
          <span className="text-xs text-emerald-400 flex items-center gap-1 shrink-0">
            <CheckCircle className="w-4 h-4" /> Completed
          </span>
        )}
        {r.status === 'snoozed' && (
          <span className="text-xs text-blue-400 shrink-0">Snoozed</span>
        )}
      </div>
    </div>
  );
}

function StatCard({ color, count, label, sub, icon }: {
  color: 'red' | 'amber' | 'blue' | 'green'; count: number; label: string; sub: string; icon: React.ReactNode;
}) {
  const colors = {
    red: 'text-red-400 bg-red-400/10',
    amber: 'text-amber-400 bg-amber-400/10',
    blue: 'text-blue-400 bg-blue-400/10',
    green: 'text-emerald-400 bg-emerald-400/10',
  };
  const countColors = { red: 'text-red-400', amber: 'text-amber-400', blue: 'text-chrome-bright', green: 'text-emerald-400' };
  return (
    <div className="glass-card rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="text-xs text-chrome-dim uppercase tracking-wider font-medium">{label}</div>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colors[color]}`}>{icon}</div>
      </div>
      <div className={`font-display text-3xl font-bold ${countColors[color]} mb-1`}>{count}</div>
      <div className="text-xs text-chrome-dim">{sub}</div>
    </div>
  );
}
