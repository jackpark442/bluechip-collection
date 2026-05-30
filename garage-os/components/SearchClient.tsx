'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, Car, FileText, Wrench, X } from 'lucide-react';
import type { FleetOverview } from '@/types';
import { formatCurrency, formatDate, CATEGORY_LABELS, STATUS_LABELS, STATUS_COLORS, getVehicleDisplayName } from '@/lib/utils';

interface Props {
  fleet: FleetOverview[];
  maintenance: any[];
  documents: any[];
}

type ResultType = 'vehicle' | 'maintenance' | 'document';
interface Result { type: ResultType; id: string; title: string; sub: string; link: string; meta?: string; }

export default function SearchClient({ fleet, maintenance, documents }: Props) {
  const [query, setQuery] = useState('');

  const results = useMemo((): Result[] => {
    if (query.trim().length < 2) return [];
    const q = query.toLowerCase();

    const vehicleResults: Result[] = fleet
      .filter(v => `${v.make} ${v.model} ${v.variant ?? ''} ${v.registration ?? ''} ${v.year} ${v.colour ?? ''} ${v.vin ?? ''}`.toLowerCase().includes(q))
      .map(v => ({
        type: 'vehicle',
        id: v.id,
        title: getVehicleDisplayName(v),
        sub: `${CATEGORY_LABELS[v.category]} · ${STATUS_LABELS[v.status]}${v.registration ? ` · ${v.registration.toUpperCase()}` : ''}`,
        link: `/vehicles/${v.id}`,
        meta: formatCurrency(v.current_value),
      }));

    const maintenanceResults: Result[] = maintenance
      .filter(m => `${m.title} ${m.vehicle?.make ?? ''} ${m.vehicle?.model ?? ''}`.toLowerCase().includes(q))
      .slice(0, 10)
      .map(m => ({
        type: 'maintenance',
        id: m.id,
        title: m.title,
        sub: `${m.vehicle?.year} ${m.vehicle?.make} ${m.vehicle?.model} · ${formatDate(m.service_date)}`,
        link: `/vehicles/${m.vehicle?.id}`,
        meta: formatCurrency(m.total_cost),
      }));

    const documentResults: Result[] = documents
      .filter(d => `${d.title} ${d.file_name} ${d.vehicle?.make ?? ''} ${d.vehicle?.model ?? ''}`.toLowerCase().includes(q))
      .slice(0, 10)
      .map(d => ({
        type: 'document',
        id: d.id,
        title: d.title,
        sub: `${d.vehicle?.year} ${d.vehicle?.make} ${d.vehicle?.model} · ${d.category.replace(/_/g, ' ')}`,
        link: d.public_url,
        meta: d.file_name,
      }));

    return [...vehicleResults, ...maintenanceResults, ...documentResults];
  }, [query, fleet, maintenance, documents]);

  const grouped = useMemo(() => ({
    vehicle: results.filter(r => r.type === 'vehicle'),
    maintenance: results.filter(r => r.type === 'maintenance'),
    document: results.filter(r => r.type === 'document'),
  }), [results]);

  const TypeIcon = { vehicle: Car, maintenance: Wrench, document: FileText };
  const TypeLabel = { vehicle: 'Vehicles', maintenance: 'Maintenance Records', document: 'Documents' };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Search input */}
      <div className="relative mb-8">
        <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-chrome-muted" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoFocus
          className="input-dark w-full rounded-xl pl-12 pr-12 py-4 text-base"
          placeholder="Search vehicles, service records, documents…"
        />
        {query && (
          <button onClick={() => setQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-chrome-muted hover:text-chrome-dim">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Results */}
      {query.trim().length < 2 ? (
        <div className="text-center py-16">
          <Search className="w-12 h-12 text-chrome-muted mx-auto mb-4 opacity-30" />
          <div className="font-display text-xl text-chrome-bright mb-2">Search your fleet</div>
          <div className="text-sm text-chrome-dim">Make, model, registration, service records, documents…</div>
          <div className="mt-6 flex flex-wrap gap-2 justify-center text-xs text-chrome-muted">
            {['Ferrari', 'MOT', 'Insurance', 'Service', 'V5C'].map(s => (
              <button key={s} onClick={() => setQuery(s)}
                className="px-3 py-1.5 rounded-full border border-white/8 hover:border-amber-DEFAULT/30 hover:text-amber-DEFAULT transition-all">
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-chrome-dim">No results for "<span className="text-chrome-bright">{query}</span>"</div>
        </div>
      ) : (
        <div className="space-y-6">
          {(['vehicle', 'maintenance', 'document'] as ResultType[]).map(type => {
            const items = grouped[type];
            if (items.length === 0) return null;
            const Icon = TypeIcon[type];
            return (
              <div key={type}>
                <div className="flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-wider text-chrome-dim">
                  <Icon className="w-3.5 h-3.5" />
                  {TypeLabel[type]} · {items.length}
                </div>
                <div className="space-y-2">
                  {items.map(r => (
                    <Link key={r.id} href={r.link}
                      target={type === 'document' ? '_blank' : undefined}
                      className="glass-card glass-card-hover rounded-xl p-4 flex items-center gap-4 block">
                      <div className="w-9 h-9 rounded-lg bg-amber-DEFAULT/10 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-amber-DEFAULT" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-chrome-bright truncate">{r.title}</div>
                        <div className="text-xs text-chrome-dim mt-0.5 truncate">{r.sub}</div>
                      </div>
                      {r.meta && <div className="text-xs text-chrome-dim shrink-0 font-mono">{r.meta}</div>}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
