'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Plus, Grid, List, Search, Car } from 'lucide-react';
import type { FleetOverview, VehicleCategory, VehicleStatus } from '@/types';
import { formatCurrency, formatDate, daysUntil, CATEGORY_LABELS, STATUS_LABELS, STATUS_COLORS, getVehicleDisplayName } from '@/lib/utils';

function getTrafficLight(v: FleetOverview): 'red' | 'amber' | 'green' | 'none' {
  const isSorn = v.tax_exempt && v.tax_exemption_reason === 'SORN';
  const motDays = daysUntil(v.mot_expiry);
  const insDays = daysUntil(v.insurance_expiry);
  const taxDays = v.tax_exempt && !isSorn ? null : isSorn ? null : daysUntil(v.tax_expiry);

  const all = [motDays, insDays, taxDays].filter(d => d !== null) as number[];

  // Expired or overdue on anything = red
  if (all.some(d => d < 0)) return 'red';

  // SORN = amber (can't drive on public roads)
  if (isSorn) return 'amber';

  // MOT or insurance within 30 days = amber
  if (all.length === 0) return 'none';
  if (Math.min(...all) <= 30) return 'amber';

  return 'green';
}

interface Props { fleet: FleetOverview[] }

const ALL_CATEGORIES: VehicleCategory[] = ['supercar','sports_car','classic_car','luxury_saloon','suv','motorhome','campervan','motorcycle','van','pickup_truck','trailer','other'];
const ALL_STATUSES: VehicleStatus[] = ['active','stored','restoration','for_sale','sold','written_off'];

export default function FleetClient({ fleet }: Props) {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<VehicleCategory | 'all'>('all');
  const [status, setStatus] = useState<VehicleStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'make' | 'year' | 'value' | 'compliance'>('make');

  const filtered = useMemo(() => {
    let result = [...fleet];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(v =>
        `${v.make} ${v.model} ${v.variant || ''} ${v.registration || ''} ${v.year}`.toLowerCase().includes(q)
      );
    }
    if (category !== 'all') result = result.filter(v => v.category === category);
    if (status !== 'all') result = result.filter(v => v.status === status);

    result.sort((a, b) => {
      switch (sortBy) {
        case 'year': return b.year - a.year;
        case 'value': return (b.current_value || 0) - (a.current_value || 0);
        case 'compliance': return (a.days_to_nearest_expiry || 9999) - (b.days_to_nearest_expiry || 9999);
        default: return `${a.make} ${a.model}`.localeCompare(`${b.make} ${b.model}`);
      }
    });
    return result;
  }, [fleet, search, category, status, sortBy]);

  const categories = useMemo(() => {
    const used = new Set(fleet.map(v => v.category));
    return ALL_CATEGORIES.filter(c => used.has(c));
  }, [fleet]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-chrome-dim text-sm mt-1">{fleet.length} vehicles · {filtered.length} shown</p>
        </div>
        <Link href="/vehicles/new" className="btn-amber rounded-lg px-4 py-2.5 text-sm flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Vehicle
        </Link>
      </div>

      {/* Filters */}
      <div className="glass-card rounded-xl p-4 flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-chrome-muted" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            className="input-dark w-full rounded-lg pl-9 pr-4 py-2 text-sm"
            placeholder="Search by make, model, reg..."
          />
        </div>

        {/* Category filter */}
        <select value={category} onChange={e => setCategory(e.target.value as any)}
          className="input-dark rounded-lg px-3 py-2 text-sm">
          <option value="all">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
        </select>

        {/* Status filter */}
        <select value={status} onChange={e => setStatus(e.target.value as any)}
          className="input-dark rounded-lg px-3 py-2 text-sm">
          <option value="all">All Statuses</option>
          {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>

        {/* Sort */}
        <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
          className="input-dark rounded-lg px-3 py-2 text-sm">
          <option value="make">Sort: Make</option>
          <option value="year">Sort: Year</option>
          <option value="value">Sort: Value</option>
          <option value="compliance">Sort: Compliance</option>
        </select>

        {/* View toggle */}
        <div className="flex gap-1 border border-white/8 rounded-lg p-1">
          <button onClick={() => setView('grid')}
            className={`p-1.5 rounded ${view === 'grid' ? 'bg-amber-DEFAULT/20 text-amber-DEFAULT' : 'text-chrome-dim hover:text-chrome'}`}>
            <Grid className="w-4 h-4" />
          </button>
          <button onClick={() => setView('list')}
            className={`p-1.5 rounded ${view === 'list' ? 'bg-amber-DEFAULT/20 text-amber-DEFAULT' : 'text-chrome-dim hover:text-chrome'}`}>
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="glass-card rounded-xl p-16 text-center">
          <Car className="w-12 h-12 text-chrome-muted mx-auto mb-3 opacity-40" />
          <p className="text-chrome-dim">No vehicles match your filters</p>
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(v => <VehicleGridCard key={v.id} vehicle={v} />)}
        </div>
      ) : (
        <div className="glass-card rounded-xl overflow-x-auto">
          <table className="w-full data-table min-w-[700px]">
            <thead>
              <tr>
                <th className="text-left">Vehicle</th>
                <th className="text-left">Registration</th>
                <th className="text-left">Category</th>
                <th className="text-left">Status</th>
                <th className="text-right">MOT</th>
                <th className="text-right">Insurance</th>
                <th className="text-right">Value</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(v => (
                <tr key={v.id} className="cursor-pointer" onClick={() => window.location.href = `/vehicles/${v.id}`}>
                  <td>
                    <div className="flex items-center gap-3">
                      {(() => { const lc = TRAFFIC_LIGHT_COLORS[getTrafficLight(v)]; return <span title={lc.label} className={`w-2 h-2 rounded-full ${lc.dot} ring-1 ${lc.ring} shrink-0`} />; })()}
                      {v.cover_image_url ? (
                        <img src={v.cover_image_url} className="w-10 h-10 rounded-lg object-cover" alt="" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-obsidian-600 flex items-center justify-center">
                          <Car className="w-5 h-5 text-chrome-muted opacity-40" />
                        </div>
                      )}
                      <div>
                        <div className="text-chrome-bright font-medium text-sm">{v.make} {v.model}</div>
                        <div className="text-chrome-dim text-xs">{v.year}{v.variant ? ` · ${v.variant}` : ''}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className="font-mono text-sm">{v.registration?.toUpperCase() || '—'}</span></td>
                  <td><span className="text-sm">{CATEGORY_LABELS[v.category]}</span></td>
                  <td><span className={`status-badge ${STATUS_COLORS[v.status]}`}>{STATUS_LABELS[v.status]}</span></td>
                  <td className="text-right"><ExpiryCell date={v.mot_expiry} firstMot={!v.mot_result && !!v.first_mot_due_date} /></td>
                  <td className="text-right"><ExpiryCell date={v.insurance_expiry} /></td>
                  <td className="text-right font-mono text-sm">{formatCurrency(v.current_value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const TRAFFIC_LIGHT_COLORS = {
  red:   { bar: 'bg-red-500',    dot: 'bg-red-500',    ring: 'ring-red-500/40',    label: 'Needs Attention' },
  amber: { bar: 'bg-amber-400',  dot: 'bg-amber-400',  ring: 'ring-amber-400/40',  label: 'Coming Up' },
  green: { bar: 'bg-emerald-500',dot: 'bg-emerald-500',ring: 'ring-emerald-500/40',label: 'All Good' },
  none:  { bar: 'bg-white/10',   dot: 'bg-white/20',   ring: 'ring-white/10',      label: 'No Data' },
};

function VehicleGridCard({ vehicle: v }: { vehicle: FleetOverview }) {
  const motDays = daysUntil(v.mot_expiry);
  const insDays = daysUntil(v.insurance_expiry);
  const taxDays = v.tax_exempt ? null : daysUntil(v.tax_expiry);
  const light = getTrafficLight(v);
  const lc = TRAFFIC_LIGHT_COLORS[light];
  const isFirstMot = !v.mot_result && !!v.first_mot_due_date;

  return (
    <Link href={`/vehicles/${v.id}`} className="glass-card glass-card-hover rounded-xl overflow-hidden block group">
      {/* Traffic light status bar */}
      <div className={`h-1 w-full ${lc.bar} transition-colors`} />
      <div className="relative h-44 bg-obsidian-700 overflow-hidden">
        {v.cover_image_url ? (
          <img src={v.cover_image_url} alt={getVehicleDisplayName(v)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center carbon-bg">
            <Car className="w-14 h-14 text-chrome-muted opacity-20" />
          </div>
        )}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(10,10,15,0.95) 0%, rgba(10,10,15,0.2) 60%, transparent 100%)' }} />
        <div className="absolute top-3 left-3 right-3 flex justify-between items-start">
          <span className="text-[10px] font-semibold tracking-wider uppercase text-chrome-dim bg-obsidian-900/80 px-2 py-1 rounded">
            {CATEGORY_LABELS[v.category]}
          </span>
          <div className="flex items-center gap-2">
            <span className={`status-badge ${STATUS_COLORS[v.status]}`}>{STATUS_LABELS[v.status]}</span>
            <span title={lc.label} className={`w-2.5 h-2.5 rounded-full ${lc.dot} ring-2 ${lc.ring} shrink-0`} />
          </div>
        </div>
        <div className="absolute bottom-3 left-4 right-4">
          <div className="font-display text-lg text-chrome-bright leading-tight">{v.make} {v.model}</div>
          {v.variant && <div className="text-xs text-chrome-dim">{v.variant}</div>}
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-chrome-dim">{v.year}</span>
            {v.registration && <span className="text-xs font-mono text-chrome-dim">{v.registration.toUpperCase()}</span>}
            {v.mileage > 0 && <span className="text-xs text-chrome-dim">{v.mileage.toLocaleString()} mi</span>}
          </div>
        </div>
      </div>

      <div className="px-4 py-3">
        {/* Compliance indicators */}
        <div className="grid grid-cols-3 gap-2 text-center mb-3">
          <CompliancePill label={isFirstMot ? '1st MOT' : 'MOT'} days={motDays} />
          <CompliancePill label="Insurance" days={insDays} />
          <CompliancePill label="Tax" days={taxDays} exempt={v.tax_exempt} sorn={v.tax_exemption_reason === 'SORN'} />
        </div>

        {/* Value */}
        {v.current_value && (
          <div className="flex items-center justify-between text-xs pt-2 border-t border-white/5">
            <span className="text-chrome-dim">Current Value</span>
            <span className="font-mono text-amber-DEFAULT font-semibold">{formatCurrency(v.current_value)}</span>
          </div>
        )}
      </div>
    </Link>
  );
}

function CompliancePill({ label, days, exempt, sorn }: { label: string; days: number | null; exempt?: boolean; sorn?: boolean }) {
  if (sorn) return (
    <div className="text-center">
      <div className="text-[10px] text-chrome-muted mb-0.5">{label}</div>
      <div className="text-xs text-amber-400 font-semibold">SORN</div>
    </div>
  );
  if (exempt) return (
    <div className="text-center">
      <div className="text-[10px] text-chrome-muted mb-0.5">{label}</div>
      <div className="text-xs text-blue-400">Exempt</div>
    </div>
  );
  const color = days === null ? 'text-chrome-muted' :
    days < 0 ? 'text-red-400' : days <= 7 ? 'text-red-400' : days <= 30 ? 'text-amber-400' : 'text-emerald-400';
  return (
    <div className="text-center">
      <div className="text-[10px] text-chrome-muted mb-0.5">{label}</div>
      <div className={`text-xs font-mono ${color}`}>
        {days === null ? '—' : days < 0 ? `${Math.abs(days)}d late` : days === 0 ? 'Today' : `${days}d`}
      </div>
    </div>
  );
}

function ExpiryCell({ date, firstMot }: { date?: string; firstMot?: boolean }) {
  const days = daysUntil(date);
  const color = days === null ? 'text-chrome-muted' :
    days < 0 ? 'text-red-400' : days <= 7 ? 'text-red-400' : days <= 30 ? 'text-amber-400' : 'text-emerald-400';
  return (
    <span className={`text-sm font-mono ${color}`}>
      {!date ? '—' : days !== null && days < 0 ? 'Overdue' : days === 0 ? 'Today' : `${formatDate(date)}`}
      {firstMot && date ? <span className="text-[10px] text-chrome-muted ml-1 font-sans">1st</span> : null}
    </span>
  );
}
