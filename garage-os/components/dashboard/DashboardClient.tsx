'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Car, Shield, TrendingUp, AlertTriangle, CheckCircle, Clock, Wrench, ChevronRight, Plus } from 'lucide-react';
import type { FleetOverview, Reminder, MaintenanceRecord } from '@/types';
import { formatCurrency, formatDate, daysUntil, getExpiryStatus, CATEGORY_LABELS, STATUS_LABELS, getVehicleDisplayName } from '@/lib/utils';

interface Props {
  fleet: FleetOverview[];
  reminders: (Reminder & { vehicle?: any })[];
  recentMaintenance: (MaintenanceRecord & { vehicle?: any })[];
  ytdMaintenanceCost: number;
  userId: string;
}

const CATEGORY_COLORS = ['#e8a800', '#d4960a', '#b87d08', '#8c5e06', '#644205', '#3a2603', '#1a1002', '#f5c842', '#fde68a', '#c8c8d0', '#888896', '#555560'];

export default function DashboardClient({ fleet, reminders, recentMaintenance, ytdMaintenanceCost }: Props) {
  const stats = useMemo(() => {
    const active = fleet.filter(v => v.status === 'active');
    const totalValue = fleet.reduce((s, v) => s + (v.current_value || 0), 0);
    const totalPurchase = fleet.reduce((s, v) => s + (v.purchase_price || 0), 0);
    const expired = fleet.filter(v => {
      const motDays = daysUntil(v.mot_expiry);
      const insDays = daysUntil(v.insurance_expiry);
      const taxDays = v.tax_exempt ? null : daysUntil(v.tax_expiry);
      return (motDays !== null && motDays < 0) || (insDays !== null && insDays < 0) || (taxDays !== null && taxDays < 0);
    }).length;
    const expiringSoon = fleet.filter(v => {
      const motDays = daysUntil(v.mot_expiry);
      const insDays = daysUntil(v.insurance_expiry);
      const taxDays = v.tax_exempt ? null : daysUntil(v.tax_expiry);
      return (motDays !== null && motDays >= 0 && motDays <= 30) ||
             (insDays !== null && insDays >= 0 && insDays <= 30) ||
             (taxDays !== null && taxDays >= 0 && taxDays <= 30);
    }).length;

    return { total: fleet.length, active: active.length, totalValue, totalPurchase, expired, expiringSoon };
  }, [fleet]);

  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    fleet.forEach(v => { counts[v.category] = (counts[v.category] || 0) + 1; });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([category, count]) => ({
        name: CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] || category,
        value: count,
      }));
  }, [fleet]);

  const urgentReminders = reminders.filter(r => {
    const days = daysUntil(r.due_date);
    return days !== null && days <= 30;
  });

  const gainLoss = stats.totalValue - stats.totalPurchase;
  const gainLossPct = stats.totalPurchase > 0 ? ((gainLoss / stats.totalPurchase) * 100).toFixed(1) : null;

  return (
    <div className="space-y-8">
      {/* Hero stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Vehicles"
          value={stats.total.toString()}
          sub={`${stats.active} active`}
          icon={<Car className="w-5 h-5" />}
          accent="amber"
        />
        <StatCard
          label="Fleet Value"
          value={formatCurrency(stats.totalValue)}
          sub={gainLoss !== 0 ? `${gainLoss >= 0 ? '+' : ''}${formatCurrency(gainLoss)} vs purchase${gainLossPct ? ` (${gainLossPct}%)` : ''}` : 'vs purchase cost'}
          icon={<TrendingUp className="w-5 h-5" />}
          accent={gainLoss >= 0 ? 'green' : 'red'}
        />
        <StatCard
          label="Compliance Issues"
          value={stats.expired.toString()}
          sub={`${stats.expiringSoon} expiring within 30 days`}
          icon={<Shield className="w-5 h-5" />}
          accent={stats.expired > 0 ? 'red' : 'green'}
        />
        <StatCard
          label="Maintenance YTD"
          value={formatCurrency(ytdMaintenanceCost)}
          sub={`${new Date().getFullYear()} spend`}
          icon={<Wrench className="w-5 h-5" />}
          accent="amber"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fleet by category */}
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-display text-base text-chrome-bright">Fleet Composition</h3>
            <span className="text-xs text-chrome-dim">{stats.total} vehicles</span>
          </div>
          {categoryData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                    paddingAngle={2} dataKey="value">
                    {categoryData.map((_, i) => (
                      <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }}
                    labelStyle={{ color: '#c8c8d0' }} itemStyle={{ color: '#e8a800' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {categoryData.map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                      <span className="text-chrome-dim">{d.name}</span>
                    </div>
                    <span className="text-chrome-bright font-mono text-xs">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyState message="No vehicles yet" />
          )}
        </div>

        {/* Urgent reminders */}
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-display text-base text-chrome-bright">Upcoming Deadlines</h3>
            <Link href="/reminders" className="text-xs text-amber-DEFAULT hover:text-amber-light transition-colors flex items-center gap-1">
              All <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {urgentReminders.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-50" />
                <p className="text-sm text-chrome-dim">All compliant</p>
              </div>
            ) : urgentReminders.slice(0, 5).map(r => {
              const days = daysUntil(r.due_date);
              const isExpired = days !== null && days < 0;
              const isCritical = days !== null && days <= 7;
              return (
                <div key={r.id} className="flex items-start gap-3 py-2">
                  <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${isExpired || isCritical ? 'bg-red-400' : 'bg-amber-400'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-chrome-bright truncate">{r.title}</div>
                    {r.vehicle && (
                      <div className="text-xs text-chrome-dim mt-0.5">{r.vehicle.make} {r.vehicle.model} · {r.vehicle.year}</div>
                    )}
                  </div>
                  <div className={`text-xs font-mono shrink-0 ${isExpired ? 'text-red-400' : isCritical ? 'text-red-400' : 'text-amber-400'}`}>
                    {days === null ? '?' : days < 0 ? `${Math.abs(days)}d late` : days === 0 ? 'Today' : `${days}d`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent maintenance */}
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-display text-base text-chrome-bright">Recent Work</h3>
            <Link href="/vehicles" className="text-xs text-amber-DEFAULT hover:text-amber-light transition-colors flex items-center gap-1">
              Fleet <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {recentMaintenance.length === 0 ? (
              <EmptyState message="No service records" />
            ) : recentMaintenance.map(m => (
              <div key={m.id} className="flex items-start gap-3 py-2 border-b border-white/4 last:border-0">
                <div className="w-8 h-8 rounded-lg bg-amber-DEFAULT/10 flex items-center justify-center shrink-0">
                  <Wrench className="w-4 h-4 text-amber-DEFAULT" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-chrome-bright truncate">{m.title}</div>
                  <div className="text-xs text-chrome-dim mt-0.5">
                    {m.vehicle?.make} {m.vehicle?.model} · {formatDate(m.service_date)}
                  </div>
                </div>
                <div className="text-xs font-mono text-amber-DEFAULT shrink-0">
                  {formatCurrency(m.total_cost)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Fleet vehicles grid */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xl text-chrome-bright">Your Fleet</h2>
          <Link href="/vehicles/new"
            className="btn-amber rounded-lg px-4 py-2 text-sm flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Vehicle
          </Link>
        </div>

        {fleet.length === 0 ? (
          <div className="glass-card rounded-xl p-16 text-center">
            <Car className="w-12 h-12 text-chrome-muted mx-auto mb-4 opacity-50" />
            <h3 className="font-display text-xl text-chrome-bright mb-2">No vehicles yet</h3>
            <p className="text-chrome-dim mb-6">Add your first vehicle to get started</p>
            <Link href="/vehicles/new" className="btn-amber inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm">
              <Plus className="w-4 h-4" /> Add Vehicle
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {fleet.slice(0, 6).map(v => (
              <VehicleCard key={v.id} vehicle={v} />
            ))}
          </div>
        )}

        {fleet.length > 6 && (
          <div className="mt-4 text-center">
            <Link href="/vehicles" className="btn-ghost inline-flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm">
              View all {fleet.length} vehicles <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, icon, accent }: {
  label: string; value: string; sub: string; icon: React.ReactNode;
  accent: 'amber' | 'green' | 'red';
}) {
  const accentClasses = {
    amber: 'text-amber-DEFAULT bg-amber-DEFAULT/10',
    green: 'text-emerald-400 bg-emerald-400/10',
    red: 'text-red-400 bg-red-400/10',
  };
  return (
    <div className="glass-card rounded-xl p-5 glass-card-hover">
      <div className="flex items-start justify-between mb-4">
        <span className="text-xs font-semibold tracking-[0.08em] uppercase text-chrome-dim">{label}</span>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${accentClasses[accent]}`}>
          {icon}
        </div>
      </div>
      <div className="font-display text-2xl text-chrome-bright mb-1">{value}</div>
      <div className="text-xs text-chrome-dim">{sub}</div>
    </div>
  );
}

function VehicleCard({ vehicle: v }: { vehicle: FleetOverview }) {
  const motStatus = getExpiryStatus(v.mot_expiry);
  const insStatus = getExpiryStatus(v.insurance_expiry);

  return (
    <Link href={`/vehicles/${v.id}`} className="glass-card glass-card-hover rounded-xl overflow-hidden block">
      {/* Image */}
      <div className="relative h-40 bg-obsidian-700 overflow-hidden">
        {v.cover_image_url ? (
          <img src={v.cover_image_url} alt={getVehicleDisplayName(v)} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center carbon-bg">
            <Car className="w-12 h-12 text-chrome-muted opacity-30" />
          </div>
        )}
        {/* Status badge */}
        <div className="absolute top-3 right-3">
          <span className={`status-badge text-[10px] ${v.status === 'active' ? 'bg-emerald-500/30 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'}`}>
            {STATUS_LABELS[v.status]}
          </span>
        </div>
        {/* Overlay */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(10,10,15,0.9) 0%, transparent 50%)' }} />
        <div className="absolute bottom-3 left-4">
          <div className="font-display text-base font-bold text-chrome-bright">{v.make} {v.model}</div>
          <div className="text-xs text-chrome-dim">{v.year}{v.registration ? ` · ${v.registration.toUpperCase()}` : ''}</div>
        </div>
      </div>

      {/* Compliance strip */}
      <div className="px-4 py-3 grid grid-cols-3 gap-2 border-t border-white/5">
        <ComplianceIndicator label="MOT" date={v.mot_expiry} status={motStatus} />
        <ComplianceIndicator label="INS" date={v.insurance_expiry} status={insStatus} />
        <div className="text-center">
          <div className="text-[10px] text-chrome-muted uppercase tracking-wider mb-1">Value</div>
          <div className="text-xs font-mono text-chrome-bright">{v.current_value ? formatCurrency(v.current_value) : '—'}</div>
        </div>
      </div>
    </Link>
  );
}

function ComplianceIndicator({ label, date, status }: { label: string; date?: string; status: string }) {
  const color = status === 'expired' || status === 'critical' ? 'text-red-400' :
                status === 'warning' ? 'text-amber-400' :
                status === 'ok' ? 'text-emerald-400' : 'text-chrome-muted';
  const days = daysUntil(date);
  return (
    <div className="text-center">
      <div className="text-[10px] text-chrome-muted uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-xs font-mono ${color}`}>
        {!date ? '—' : days !== null && days < 0 ? 'Expired' : days === 0 ? 'Today' : days !== null && days <= 30 ? `${days}d` : formatDate(date)?.split(' ').slice(0, 2).join(' ')}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-8 text-center">
      <p className="text-sm text-chrome-dim">{message}</p>
    </div>
  );
}

function getExpiryStatus(dateStr?: string) {
  if (!dateStr) return 'unknown';
  const days = daysUntil(dateStr);
  if (days === null) return 'unknown';
  if (days < 0) return 'expired';
  if (days <= 7) return 'critical';
  if (days <= 30) return 'warning';
  return 'ok';
}
