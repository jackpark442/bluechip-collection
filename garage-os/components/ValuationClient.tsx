'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Car, ArrowUpRight, Wrench, PoundSterling } from 'lucide-react';
import type { Vehicle, Valuation, VehicleCategory } from '@/types';
import { formatCurrency, formatDate, CATEGORY_LABELS } from '@/lib/utils';

interface FleetVehicle extends Partial<Vehicle> {
  total_maintenance_cost?: number;
}

interface Props {
  fleet: FleetVehicle[];
  valuations: (Valuation & { vehicle?: any })[];
}

export default function ValuationClient({ fleet, valuations }: Props) {
  const stats = useMemo(() => {
    const totalValue = fleet.reduce((s, v) => s + (v.current_value || 0), 0);
    const totalPurchase = fleet.reduce((s, v) => s + (v.purchase_price || 0), 0);
    const totalMaintenance = fleet.reduce((s, v) => s + (v.total_maintenance_cost || 0), 0);
    const totalInvested = totalPurchase + totalMaintenance;
    const trueGainLoss = totalValue - totalInvested;
    const roi = totalInvested > 0 ? (trueGainLoss / totalInvested) * 100 : null;

    const gainers = fleet.filter(v => {
      const invested = (v.purchase_price || 0) + (v.total_maintenance_cost || 0);
      return v.current_value && invested && v.current_value > invested;
    }).length;

    const losers = fleet.filter(v => {
      const invested = (v.purchase_price || 0) + (v.total_maintenance_cost || 0);
      return v.current_value && invested && v.current_value < invested;
    }).length;

    return { totalValue, totalPurchase, totalMaintenance, totalInvested, trueGainLoss, roi, gainers, losers, valued: fleet.filter(v => v.current_value).length };
  }, [fleet]);

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
          <div className="font-display text-2xl text-chrome-bright">{formatCurrency(stats.totalInvested)}</div>
          <div className="text-xs text-chrome-dim mt-1">
            {formatCurrency(stats.totalPurchase)} purchase + {formatCurrency(stats.totalMaintenance)} maintenance
          </div>
        </div>
        <div className="glass-card rounded-xl p-5">
          <div className="text-xs text-chrome-dim uppercase tracking-wider mb-2">True Gain / Loss</div>
          <div className={`font-display text-2xl flex items-center gap-2 ${stats.trueGainLoss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {stats.trueGainLoss >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            {stats.trueGainLoss >= 0 ? '+' : ''}{formatCurrency(stats.trueGainLoss)}
          </div>
          {stats.roi !== null && (
            <div className={`text-xs mt-1 font-mono ${stats.trueGainLoss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {stats.roi >= 0 ? '+' : ''}{stats.roi.toFixed(1)}% ROI after maintenance
            </div>
          )}
        </div>
        <div className="glass-card rounded-xl p-5">
          <div className="text-xs text-chrome-dim uppercase tracking-wider mb-2">Portfolio Split</div>
          <div className="flex items-center gap-3 mt-2">
            <div className="text-center">
              <div className="font-display text-xl text-emerald-400">{stats.gainers}</div>
              <div className="text-xs text-chrome-dim mt-0.5">Profit</div>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center">
              <div className="font-display text-xl text-red-400">{stats.losers}</div>
              <div className="text-xs text-chrome-dim mt-0.5">Loss</div>
            </div>
          </div>
        </div>
      </div>

      {/* Invested breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="glass-card rounded-xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-amber-DEFAULT/10 flex items-center justify-center shrink-0">
            <PoundSterling className="w-5 h-5 text-amber-DEFAULT" />
          </div>
          <div>
            <div className="text-xs text-chrome-dim uppercase tracking-wider mb-1">Total Purchase Cost</div>
            <div className="font-display text-xl text-chrome-bright">{formatCurrency(stats.totalPurchase)}</div>
          </div>
        </div>
        <div className="glass-card rounded-xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
            <Wrench className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <div className="text-xs text-chrome-dim uppercase tracking-wider mb-1">Total Maintenance Spend</div>
            <div className="font-display text-xl text-chrome-bright">{formatCurrency(stats.totalMaintenance)}</div>
          </div>
        </div>
        <div className="glass-card rounded-xl p-5 flex items-center gap-4">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${stats.trueGainLoss >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
            {stats.trueGainLoss >= 0
              ? <TrendingUp className="w-5 h-5 text-emerald-400" />
              : <TrendingDown className="w-5 h-5 text-red-400" />}
          </div>
          <div>
            <div className="text-xs text-chrome-dim uppercase tracking-wider mb-1">Net Position</div>
            <div className={`font-display text-xl ${stats.trueGainLoss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {stats.trueGainLoss >= 0 ? '+' : ''}{formatCurrency(stats.trueGainLoss)}
              {stats.roi !== null && <span className="text-sm ml-2 opacity-70">({stats.roi >= 0 ? '+' : ''}{stats.roi.toFixed(1)}%)</span>}
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
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byCategory} margin={{ top: 0, right: 0, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#555568' }} angle={-25} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 11, fill: '#555568' }} tickFormatter={v => `£${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }}
                  formatter={(val: number) => [formatCurrency(val), 'Value']}
                  labelStyle={{ color: '#c8c8d0' }}
                />
                <Bar dataKey="value" fill="#e8a800" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Per vehicle ROI table */}
        <div className="glass-card rounded-xl p-6">
          <h3 className="font-display text-lg text-chrome-bright mb-5">ROI Per Vehicle</h3>
          <div className="space-y-3">
            {topVehicles.length === 0 ? (
              <div className="text-center py-8 text-chrome-dim text-sm">No values recorded yet</div>
            ) : topVehicles.map((v, i) => {
              const invested = (v.purchase_price || 0) + (v.total_maintenance_cost || 0);
              const gainLoss = v.current_value && invested ? v.current_value - invested : null;
              const roi = gainLoss !== null && invested > 0 ? (gainLoss / invested) * 100 : null;
              return (
                <Link key={v.id} href={`/vehicles/${v.id}`}
                  className="flex items-center gap-3 py-3 border-b border-white/4 last:border-0 hover:bg-white/2 rounded-lg px-2 -mx-2 transition-colors">
                  <div className="w-7 h-7 rounded-full bg-amber-DEFAULT/10 flex items-center justify-center text-amber-DEFAULT text-xs font-bold shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-chrome-bright font-medium truncate">
                      {v.year} {v.make} {v.model}
                    </div>
                    <div className="text-xs text-chrome-dim mt-0.5">
                      {formatCurrency(v.purchase_price)} purchase
                      {v.total_maintenance_cost ? ` + ${formatCurrency(v.total_maintenance_cost)} maintenance` : ''}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono font-semibold text-amber-DEFAULT text-sm">{formatCurrency(v.current_value)}</div>
                    {gainLoss !== null && (
                      <div className={`text-xs font-mono ${gainLoss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {gainLoss >= 0 ? '+' : ''}{formatCurrency(gainLoss)}
                        {roi !== null && ` (${roi >= 0 ? '+' : ''}${roi.toFixed(1)}%)`}
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
            <h3 className="font-display text-base text-chrome-bright">Valuation History</h3>
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
