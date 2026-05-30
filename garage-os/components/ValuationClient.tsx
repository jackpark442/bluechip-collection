'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Car, ArrowUpRight } from 'lucide-react';
import type { Vehicle, Valuation, VehicleCategory } from '@/types';
import { formatCurrency, formatDate, CATEGORY_LABELS } from '@/lib/utils';

interface Props {
  fleet: Partial<Vehicle>[];
  valuations: (Valuation & { vehicle?: any })[];
}

export default function ValuationClient({ fleet, valuations }: Props) {
  const stats = useMemo(() => {
    const withValue = fleet.filter(v => v.current_value);
    const totalValue = fleet.reduce((s, v) => s + (v.current_value || 0), 0);
    const totalPurchase = fleet.reduce((s, v) => s + (v.purchase_price || 0), 0);
    const gainers = fleet.filter(v => v.current_value && v.purchase_price && v.current_value > v.purchase_price).length;
    const losers = fleet.filter(v => v.current_value && v.purchase_price && v.current_value < v.purchase_price).length;
    return { totalValue, totalPurchase, gainers, losers, valued: withValue.length };
  }, [fleet]);

  const gainLoss = stats.totalValue - stats.totalPurchase;

  const byCategory = useMemo(() => {
    const acc: Record<string, number> = {};
    fleet.forEach(v => {
      if (v.category && v.current_value) {
        acc[v.category] = (acc[v.category] || 0) + v.current_value;
      }
    });
    return Object.entries(acc)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, value]) => ({
        name: CATEGORY_LABELS[cat as VehicleCategory] || cat,
        value,
        display: `£${(value / 1000).toFixed(0)}k`,
      }));
  }, [fleet]);

  const topVehicles = [...fleet]
    .filter(v => v.current_value)
    .sort((a, b) => (b.current_value || 0) - (a.current_value || 0))
    .slice(0, 10);

  return (
    <div className="space-y-8">
      {/* Top stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-xl p-5 col-span-2 lg:col-span-1">
          <div className="text-xs text-chrome-dim uppercase tracking-wider mb-2">Total Fleet Value</div>
          <div className="font-display text-3xl text-amber-DEFAULT">{formatCurrency(stats.totalValue)}</div>
          <div className="text-xs text-chrome-dim mt-1">{stats.valued} of {fleet.length} vehicles valued</div>
        </div>
        <div className="glass-card rounded-xl p-5">
          <div className="text-xs text-chrome-dim uppercase tracking-wider mb-2">Total Invested</div>
          <div className="font-display text-2xl text-chrome-bright">{formatCurrency(stats.totalPurchase)}</div>
          <div className="text-xs text-chrome-dim mt-1">Purchase cost</div>
        </div>
        <div className="glass-card rounded-xl p-5">
          <div className="text-xs text-chrome-dim uppercase tracking-wider mb-2">Overall Gain / Loss</div>
          <div className={`font-display text-2xl flex items-center gap-2 ${gainLoss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {gainLoss >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            {gainLoss >= 0 ? '+' : ''}{formatCurrency(gainLoss)}
          </div>
          {stats.totalPurchase > 0 && (
            <div className={`text-xs mt-1 ${gainLoss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {((gainLoss / stats.totalPurchase) * 100).toFixed(1)}% overall
            </div>
          )}
        </div>
        <div className="glass-card rounded-xl p-5">
          <div className="text-xs text-chrome-dim uppercase tracking-wider mb-2">Portfolio Split</div>
          <div className="flex items-center gap-3 mt-2">
            <div className="text-center">
              <div className="font-display text-xl text-emerald-400">{stats.gainers}</div>
              <div className="text-xs text-chrome-dim mt-0.5">Gained</div>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center">
              <div className="font-display text-xl text-red-400">{stats.losers}</div>
              <div className="text-xs text-chrome-dim mt-0.5">Declined</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By category chart */}
        <div className="glass-card rounded-xl p-6">
          <h3 className="font-display text-lg text-chrome-bright mb-6">Value by Category</h3>
          {byCategory.length === 0 ? (
            <div className="text-center py-8 text-chrome-dim text-sm">No values recorded</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={byCategory} margin={{ top: 0, right: 0, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#555568' }} angle={-25} textAnchor="end" interval={0} />
                  <YAxis tick={{ fontSize: 11, fill: '#555568' }} tickFormatter={v => `£${(v/1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }}
                    formatter={(val: number) => [formatCurrency(val), 'Value']}
                    labelStyle={{ color: '#c8c8d0' }}
                  />
                  <Bar dataKey="value" fill="#e8a800" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>

              {/* Gauge bars */}
              <div className="space-y-3 mt-4 pt-4 border-t border-white/5">
                {byCategory.map(cat => (
                  <div key={cat.name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-chrome-dim">{cat.name}</span>
                      <span className="text-amber-DEFAULT font-mono">{formatCurrency(cat.value)}</span>
                    </div>
                    <div className="gauge-track">
                      <div className="gauge-fill" style={{ width: `${(cat.value / stats.totalValue * 100).toFixed(1)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Top vehicles */}
        <div className="glass-card rounded-xl p-6">
          <h3 className="font-display text-lg text-chrome-bright mb-5">Top Vehicles by Value</h3>
          <div className="space-y-3">
            {topVehicles.length === 0 ? (
              <div className="text-center py-8 text-chrome-dim text-sm">No values recorded yet</div>
            ) : topVehicles.map((v, i) => {
              const gl = v.current_value && v.purchase_price ? v.current_value - v.purchase_price : null;
              return (
                <Link key={v.id} href={`/vehicles/${v.id}`}
                  className="flex items-center gap-4 py-3 border-b border-white/4 last:border-0 hover:bg-white/2 rounded-lg px-2 -mx-2 transition-colors">
                  <div className="w-7 h-7 rounded-full bg-amber-DEFAULT/10 flex items-center justify-center text-amber-DEFAULT text-xs font-bold shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-chrome-bright font-medium truncate">
                      {v.year} {v.make} {v.model}
                    </div>
                    {CATEGORY_LABELS[v.category as VehicleCategory] && (
                      <div className="text-xs text-chrome-dim">{CATEGORY_LABELS[v.category as VehicleCategory]}</div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono font-semibold text-amber-DEFAULT text-sm">{formatCurrency(v.current_value)}</div>
                    {gl !== null && (
                      <div className={`text-xs font-mono ${gl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {gl >= 0 ? '+' : ''}{formatCurrency(gl)}
                      </div>
                    )}
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-chrome-muted shrink-0" />
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent valuations log */}
      {valuations.length > 0 && (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5">
            <h3 className="font-display text-base text-chrome-bright">Recent Valuations</h3>
          </div>
          <table className="w-full data-table">
            <thead>
              <tr><th>Vehicle</th><th>Date</th><th>Value</th><th>Source</th><th>Notes</th></tr>
            </thead>
            <tbody>
              {valuations.slice(0, 20).map(v => (
                <tr key={v.id}>
                  <td>{v.vehicle ? `${v.vehicle.year} ${v.vehicle.make} ${v.vehicle.model}` : '—'}</td>
                  <td>{formatDate(v.valuation_date)}</td>
                  <td className="font-mono text-amber-DEFAULT font-semibold">{formatCurrency(v.value)}</td>
                  <td className="text-chrome-dim">{v.source || '—'}</td>
                  <td className="text-chrome-dim">{v.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
