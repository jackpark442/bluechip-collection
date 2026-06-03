'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ChevronLeft, ChevronRight, Car, Shield, FileText, Wrench, Bell,
} from 'lucide-react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, isToday,
  addMonths, subMonths, format, parseISO,
} from 'date-fns';

type CalVehicle = {
  id: string; make: string; model: string; year: number;
  registration?: string; cover_image_url?: string;
};

export type CalEvent = {
  id: string;
  date: string;
  type: 'mot' | 'insurance' | 'tax' | 'service' | 'reminder';
  vehicleId: string;
  label: string;
  vehicleLabel: string;
};

const EVENT_STYLES: Record<CalEvent['type'], { bg: string; text: string; dot: string; icon: typeof Shield }> = {
  mot:       { bg: 'bg-purple-500/20', text: 'text-purple-300', dot: 'bg-purple-400', icon: Shield },
  insurance: { bg: 'bg-blue-500/20',   text: 'text-blue-300',   dot: 'bg-blue-400',   icon: FileText },
  tax:       { bg: 'bg-teal-500/20',   text: 'text-teal-300',   dot: 'bg-teal-400',   icon: Car },
  service:   { bg: 'bg-amber-500/20',  text: 'text-amber-300',  dot: 'bg-amber-400',  icon: Wrench },
  reminder:  { bg: 'bg-rose-500/20',   text: 'text-rose-300',   dot: 'bg-rose-400',   icon: Bell },
};

interface Props {
  vehicles: CalVehicle[];
  motRecords: { id: string; vehicle_id: string; expiry_date: string; result: string }[];
  insurance: { id: string; vehicle_id: string; provider: string; end_date: string }[];
  taxRecords: { id: string; vehicle_id: string; end_date: string; is_exempt: boolean }[];
  maintenance: { id: string; vehicle_id: string; title: string; service_type: string; next_service_date?: string; service_date: string }[];
  reminders: { id: string; vehicle_id?: string; title: string; due_date: string; type: string }[];
}

export default function CalendarClient({ vehicles, motRecords, insurance, taxRecords, maintenance, reminders }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [filterType, setFilterType] = useState<CalEvent['type'] | 'all'>('all');

  const vehicleMap = useMemo(() => {
    const m: Record<string, CalVehicle> = {};
    for (const v of vehicles) m[v.id] = v;
    return m;
  }, [vehicles]);

  function vLabel(id: string) {
    const v = vehicleMap[id];
    return v ? `${v.make} ${v.model}${v.registration ? ` (${v.registration.toUpperCase()})` : ''}` : 'Unknown';
  }

  const events: CalEvent[] = useMemo(() => {
    const evts: CalEvent[] = [];

    // Latest MOT per vehicle
    const latestMot = new Map<string, typeof motRecords[0]>();
    for (const m of motRecords) {
      const existing = latestMot.get(m.vehicle_id);
      if (!existing || m.expiry_date > existing.expiry_date) latestMot.set(m.vehicle_id, m);
    }
    Array.from(latestMot.values()).forEach(m => {
      evts.push({ id: `mot-${m.id}`, date: m.expiry_date, type: 'mot', vehicleId: m.vehicle_id, label: 'MOT Expiry', vehicleLabel: vLabel(m.vehicle_id) });
    });

    // Latest insurance per vehicle
    const latestIns = new Map<string, typeof insurance[0]>();
    for (const i of insurance) {
      const existing = latestIns.get(i.vehicle_id);
      if (!existing || i.end_date > existing.end_date) latestIns.set(i.vehicle_id, i);
    }
    Array.from(latestIns.values()).forEach(i => {
      evts.push({ id: `ins-${i.id}`, date: i.end_date, type: 'insurance', vehicleId: i.vehicle_id, label: `Insurance Expires (${i.provider})`, vehicleLabel: vLabel(i.vehicle_id) });
    });

    // Latest tax per vehicle (non-exempt)
    const latestTax = new Map<string, typeof taxRecords[0]>();
    for (const t of taxRecords) {
      if (t.is_exempt) continue;
      const existing = latestTax.get(t.vehicle_id);
      if (!existing || t.end_date > existing.end_date) latestTax.set(t.vehicle_id, t);
    }
    Array.from(latestTax.values()).forEach(t => {
      evts.push({ id: `tax-${t.id}`, date: t.end_date, type: 'tax', vehicleId: t.vehicle_id, label: 'Vehicle Tax Expires', vehicleLabel: vLabel(t.vehicle_id) });
    });

    // Maintenance — service dates and next_service_date
    for (const m of maintenance) {
      evts.push({ id: `svc-${m.id}`, date: m.service_date, type: 'service', vehicleId: m.vehicle_id, label: m.title, vehicleLabel: vLabel(m.vehicle_id) });
      if (m.next_service_date) {
        evts.push({ id: `svc-next-${m.id}`, date: m.next_service_date, type: 'service', vehicleId: m.vehicle_id, label: `Next: ${m.title}`, vehicleLabel: vLabel(m.vehicle_id) });
      }
    }

    // Reminders
    for (const r of reminders) {
      if (!r.vehicle_id) continue;
      evts.push({ id: `rem-${r.id}`, date: r.due_date, type: 'reminder', vehicleId: r.vehicle_id, label: r.title, vehicleLabel: vLabel(r.vehicle_id) });
    }

    return evts;
  }, [motRecords, insurance, taxRecords, maintenance, reminders, vehicleMap]);

  const filteredEvents = useMemo(() =>
    filterType === 'all' ? events : events.filter(e => e.type === filterType),
    [events, filterType]);

  // Group events by date string "YYYY-MM-DD"
  const eventsByDate = useMemo(() => {
    const m: Record<string, CalEvent[]> = {};
    for (const e of filteredEvents) {
      if (!m[e.date]) m[e.date] = [];
      m[e.date].push(e);
    }
    return m;
  }, [filteredEvents]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const selectedDateStr = selectedDay ? format(selectedDay, 'yyyy-MM-dd') : null;
  const selectedEvents = selectedDateStr ? (eventsByDate[selectedDateStr] ?? []) : [];

  // Upcoming events in next 90 days
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const ninetyDays = format(addMonths(today, 3), 'yyyy-MM-dd');
  const upcoming = filteredEvents
    .filter(e => e.date >= todayStr && e.date <= ninetyDays)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 20);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-chrome-bright">Fleet Calendar</h1>
          <p className="text-chrome-dim text-sm mt-1">MOT, insurance, tax, services &amp; reminders</p>
        </div>
        {/* Type filter */}
        <div className="flex gap-2 flex-wrap">
          {(['all', 'mot', 'insurance', 'tax', 'service', 'reminder'] as const).map(t => (
            <button key={t} onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterType === t
                  ? 'bg-amber-DEFAULT/20 text-amber-DEFAULT border border-amber-DEFAULT/30'
                  : 'bg-white/4 text-chrome-dim border border-white/8 hover:border-white/16'
              }`}>
              {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Calendar grid */}
        <div className="xl:col-span-2 glass-card rounded-xl p-5">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-5">
            <button onClick={() => setCurrentMonth(m => subMonths(m, 1))}
              className="btn-ghost rounded-lg p-2"><ChevronLeft className="w-4 h-4" /></button>
            <h2 className="font-display text-lg text-chrome-bright">{format(currentMonth, 'MMMM yyyy')}</h2>
            <button onClick={() => setCurrentMonth(m => addMonths(m, 1))}
              className="btn-ghost rounded-lg p-2"><ChevronRight className="w-4 h-4" /></button>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 mb-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
              <div key={d} className="text-center text-[10px] font-semibold uppercase tracking-wider text-chrome-muted py-1">{d}</div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-px bg-white/4 rounded-lg overflow-hidden">
            {days.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const dayEvents = eventsByDate[dateStr] ?? [];
              const inMonth = isSameMonth(day, currentMonth);
              const today_ = isToday(day);
              const selected = selectedDay && isSameDay(day, selectedDay);

              return (
                <button key={dateStr} onClick={() => setSelectedDay(prev => prev && isSameDay(prev, day) ? null : day)}
                  className={`min-h-[72px] p-1.5 text-left transition-colors relative ${
                    !inMonth ? 'bg-obsidian-900/60' : 'bg-obsidian-800/40 hover:bg-obsidian-700/60'
                  } ${selected ? 'ring-2 ring-inset ring-amber-DEFAULT/50' : ''}`}>
                  <div className={`text-xs font-mono mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                    today_ ? 'bg-amber-DEFAULT text-obsidian-900 font-bold' :
                    !inMonth ? 'text-chrome-muted' : 'text-chrome-dim'
                  }`}>{format(day, 'd')}</div>

                  {/* Event dots */}
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map(e => {
                      const st = EVENT_STYLES[e.type];
                      return (
                        <div key={e.id} className={`text-[9px] leading-tight px-1 py-0.5 rounded truncate ${st.bg} ${st.text}`}>
                          {e.label}
                        </div>
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <div className="text-[9px] text-chrome-muted px-1">+{dayEvents.length - 3} more</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected day events */}
          {selectedDay && (
            <div className="mt-4 border-t border-white/5 pt-4">
              <h3 className="text-sm font-semibold text-chrome-bright mb-3">{format(selectedDay, 'EEEE, d MMMM yyyy')}</h3>
              {selectedEvents.length === 0 ? (
                <p className="text-sm text-chrome-dim">No events on this day.</p>
              ) : (
                <div className="space-y-2">
                  {selectedEvents.map(e => {
                    const st = EVENT_STYLES[e.type];
                    const Icon = st.icon;
                    return (
                      <Link key={e.id} href={`/vehicles/${e.vehicleId}`}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${st.bg} border border-white/5 hover:border-white/10 transition-colors`}>
                        <Icon className={`w-4 h-4 shrink-0 ${st.text}`} />
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-medium ${st.text}`}>{e.label}</div>
                          <div className="text-xs text-chrome-dim truncate">{e.vehicleLabel}</div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Upcoming panel */}
        <div className="glass-card rounded-xl p-5">
          <h3 className="font-display text-base text-chrome-bright mb-4">Upcoming (90 days)</h3>
          {upcoming.length === 0 ? (
            <p className="text-sm text-chrome-dim">Nothing scheduled in the next 90 days.</p>
          ) : (
            <div className="space-y-2">
              {upcoming.map(e => {
                const st = EVENT_STYLES[e.type];
                const Icon = st.icon;
                const daysAway = Math.ceil((parseISO(e.date).getTime() - today.getTime()) / 86400000);
                return (
                  <Link key={e.id} href={`/vehicles/${e.vehicleId}`}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/3 border border-white/5 hover:border-white/10 transition-colors group">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${st.dot}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-chrome-bright truncate">{e.label}</div>
                      <div className="text-[10px] text-chrome-dim truncate">{e.vehicleLabel}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`text-xs font-mono font-semibold ${daysAway <= 7 ? 'text-red-400' : daysAway <= 30 ? 'text-amber-400' : 'text-chrome-dim'}`}>
                        {daysAway === 0 ? 'Today' : `${daysAway}d`}
                      </div>
                      <div className="text-[10px] text-chrome-muted">{format(parseISO(e.date), 'd MMM')}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
