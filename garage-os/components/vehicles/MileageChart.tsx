'use client';

import {
  ResponsiveContainer, ComposedChart, Line, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts';
import type { MotRecord } from '@/types';
import { formatMileage } from '@/lib/utils';

interface Props {
  motRecords: MotRecord[];
  currentMileage?: number;
  purchaseDate?: string;
}

function formatK(v: number) {
  if (v >= 1000) return `${(v / 1000).toFixed(0)}k`;
  return `${v}`;
}

export default function MileageChart({ motRecords, currentMileage, purchaseDate }: Props) {
  const now = new Date();
  const nowStr = now.toISOString().split('T')[0].slice(0, 7); // YYYY-MM

  // Build historical data points from MOT records that have mileage
  const historical = motRecords
    .filter(m => m.mileage_at_test && m.test_date)
    .map(m => ({
      date: m.test_date!.slice(0, 7), // YYYY-MM
      mileage: m.mileage_at_test!,
      label: `MOT ${m.test_date!.slice(0, 4)}`,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Add current mileage as today's point if higher than last MOT
  const lastMot = historical[historical.length - 1];
  if (currentMileage && currentMileage > (lastMot?.mileage ?? 0)) {
    historical.push({ date: nowStr, mileage: currentMileage, label: 'Now' });
  }

  if (historical.length < 2) {
    return (
      <div className="glass-card rounded-xl p-8 text-center text-chrome-dim text-sm">
        Need at least 2 MOT records with mileage to show the projection.
      </div>
    );
  }

  // Calculate average annual mileage from all data points
  const first = historical[0];
  const last = historical[historical.length - 1];
  const yearSpan = (new Date(last.date + '-01').getTime() - new Date(first.date + '-01').getTime()) / (365.25 * 24 * 3600 * 1000);
  const annualMileage = yearSpan > 0 ? (last.mileage - first.mileage) / yearSpan : 0;

  // Build chart series — monthly from first MOT to 5 years ahead
  const startDate = new Date(first.date + '-01');
  const endDate = new Date(now.getFullYear() + 5, now.getMonth(), 1);
  const chartData: { month: string; actual?: number; projected?: number; lower?: number; upper?: number }[] = [];

  const cur = new Date(startDate);
  while (cur <= endDate) {
    const month = cur.toISOString().slice(0, 7);
    const isPast = cur <= now;
    const msFromFirst = cur.getTime() - startDate.getTime();
    const yearsFromFirst = msFromFirst / (365.25 * 24 * 3600 * 1000);
    const projMileage = Math.max(0, Math.round(first.mileage + annualMileage * yearsFromFirst));
    const band = projMileage * 0.05; // ±5% uncertainty band

    // Find actual data point for this month
    const actual = historical.find(h => h.date === month);

    chartData.push({
      month,
      actual: isPast ? (actual?.mileage) : undefined,
      projected: !isPast ? projMileage : undefined,
      lower: !isPast ? Math.max(0, projMileage - band) : undefined,
      upper: !isPast ? projMileage + band : undefined,
    });

    cur.setMonth(cur.getMonth() + 1);
  }

  // Interpolate actuals — fill in each historical point
  for (const h of historical) {
    const row = chartData.find(r => r.month === h.date);
    if (row) row.actual = h.mileage;
  }

  // Bridge last actual to first projected
  const lastActualIdx = [...chartData].reverse().findIndex(r => r.actual !== undefined);
  if (lastActualIdx !== -1) {
    const idx = chartData.length - 1 - lastActualIdx;
    const bridgeVal = chartData[idx].actual!;
    if (chartData[idx + 1]) {
      chartData[idx + 1].projected = bridgeVal;
      chartData[idx + 1].lower = bridgeVal;
      chartData[idx + 1].upper = bridgeVal;
    }
  }

  // Milestone projections
  const milestones = [50000, 75000, 100000, 125000, 150000, 200000].filter(m =>
    m > last.mileage && m < last.mileage + annualMileage * 5
  );

  function yearsTilMilestone(target: number) {
    if (annualMileage <= 0) return null;
    const years = (target - last.mileage) / annualMileage;
    const date = new Date(now.getTime() + years * 365.25 * 24 * 3600 * 1000);
    return date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const val = payload.find((p: any) => p.value !== undefined && p.name !== 'upper' && p.name !== 'lower')?.value;
    if (!val) return null;
    return (
      <div className="glass-card rounded-lg px-3 py-2 text-xs border border-white/10">
        <div className="text-chrome-dim mb-1">{label}</div>
        <div className="font-mono text-chrome-bright">{formatMileage(val)}</div>
      </div>
    );
  };

  return (
    <div className="glass-card rounded-xl p-5 space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h4 className="font-display text-base text-chrome-bright">Mileage History &amp; Projection</h4>
          <p className="text-xs text-chrome-dim mt-0.5">
            Based on {historical.length} data points · avg <span className="font-mono text-chrome-bright">{Math.round(annualMileage).toLocaleString()} miles/year</span>
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs text-chrome-dim">
          <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-emerald-400 inline-block rounded" /> Actual</span>
          <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-blue-400 inline-block rounded border-dashed border-t border-blue-400" /> Projected</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="mileageGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.12} />
              <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis tickFormatter={formatK} tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} width={44} />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine x={nowStr} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 3"
            label={{ value: 'Today', fill: '#6b7280', fontSize: 10 }} />
          {/* Milestone reference lines */}
          {milestones.map(m => (
            <ReferenceLine key={m} y={m} stroke="rgba(255,255,255,0.06)"
              label={{ value: `${formatK(m)}`, fill: '#4b5563', fontSize: 9, position: 'insideTopRight' }} />
          ))}
          {/* Uncertainty band */}
          <Area dataKey="upper" stroke="none" fill="url(#mileageGrad)" legendType="none" connectNulls />
          <Area dataKey="lower" stroke="none" fill="white" fillOpacity={0} legendType="none" connectNulls />
          {/* Projected */}
          <Line dataKey="projected" stroke="#60a5fa" strokeWidth={2} strokeDasharray="6 3" dot={false} connectNulls name="projected" />
          {/* Actual */}
          <Line dataKey="actual" stroke="#34d399" strokeWidth={2.5}
            dot={{ r: 4, fill: '#34d399', strokeWidth: 0 }} activeDot={{ r: 6 }} connectNulls name="actual" />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Milestone projections */}
      {milestones.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {milestones.map(m => (
            <div key={m} className="bg-white/3 border border-white/6 rounded-lg px-3 py-2">
              <div className="text-[10px] text-chrome-muted uppercase tracking-wider">{formatMileage(m)}</div>
              <div className="text-sm font-mono text-chrome-bright mt-0.5">{yearsTilMilestone(m) ?? '—'}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
