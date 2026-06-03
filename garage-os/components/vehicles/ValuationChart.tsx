'use client';

import {
  ResponsiveContainer, ComposedChart, Line, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Legend,
} from 'recharts';
import type { Valuation } from '@/types';
import { formatCurrency } from '@/lib/utils';

interface Props {
  valuations: Valuation[];
  purchasePrice?: number;
  purchaseDate?: string;
  currentValue?: number;
}

function formatK(v: number) {
  return v >= 1000 ? `£${(v / 1000).toFixed(0)}k` : `£${v}`;
}

export default function ValuationChart({ valuations, purchasePrice, purchaseDate, currentValue }: Props) {
  const now = new Date();

  // Build historical data points from valuations + purchase price
  const historicalRaw: { date: string; value: number; label: string }[] = [];

  if (purchaseDate && purchasePrice) {
    historicalRaw.push({ date: purchaseDate, value: purchasePrice, label: 'Purchase' });
  }

  valuations.forEach(v => {
    historicalRaw.push({ date: v.valuation_date, value: v.value, label: v.source || 'Valuation' });
  });

  historicalRaw.sort((a, b) => a.date.localeCompare(b.date));

  // Deduplicate by date, keeping last
  const seen = new Map<string, typeof historicalRaw[0]>();
  for (const p of historicalRaw) seen.set(p.date, p);
  const historical = Array.from(seen.values());

  if (historical.length === 0 && !currentValue) {
    return (
      <div className="glass-card rounded-xl p-8 text-center text-chrome-dim text-sm">
        Add at least one valuation to see the chart.
      </div>
    );
  }

  // Forecast: linear regression over historical data to project 3 years ahead
  const points = historical.map(h => ({
    x: new Date(h.date).getTime(),
    y: h.value,
  }));

  // If only one point, project flat / slight depreciation
  let slope = 0;
  let intercept = points[0]?.y ?? currentValue ?? 0;

  if (points.length >= 2) {
    const n = points.length;
    const sumX = points.reduce((s, p) => s + p.x, 0);
    const sumY = points.reduce((s, p) => s + p.y, 0);
    const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
    const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);
    slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    intercept = (sumY - slope * sumX) / n;
  } else if (currentValue && points.length === 1) {
    // assume 5% pa depreciation if no second point
    const msPerYear = 365.25 * 24 * 3600 * 1000;
    slope = -(points[0].y * 0.05) / msPerYear;
    intercept = points[0].y - slope * points[0].x;
  }

  // Build chart series
  // Historical line points
  const chartData: { dateLabel: string; historical?: number; forecast?: number; lower?: number; upper?: number }[] = [];

  // All dates from start of history to 3 years in the future, monthly
  const startMs = points.length > 0 ? points[0].x : now.getTime();
  const endMs = now.getTime() + 3 * 365.25 * 24 * 3600 * 1000;

  const cur = new Date(startMs);
  cur.setDate(1); // snap to month start

  while (cur.getTime() <= endMs) {
    const ms = cur.getTime();
    const dateLabel = cur.toISOString().slice(0, 7); // "YYYY-MM"
    const isPast = ms <= now.getTime();

    // Historical: look up actual value for this month
    const actual = historical.find(h => h.date.slice(0, 7) === dateLabel);

    const projectedValue = Math.max(0, slope * ms + intercept);
    const band = projectedValue * 0.08; // ±8% uncertainty band

    chartData.push({
      dateLabel,
      historical: isPast ? (actual?.value ?? undefined) : undefined,
      forecast: !isPast ? projectedValue : undefined,
      lower: !isPast ? projectedValue - band : undefined,
      upper: !isPast ? projectedValue + band : undefined,
    });

    cur.setMonth(cur.getMonth() + 1);
  }

  // Fill in actual historical values at the exact recorded months
  for (const h of historical) {
    const month = h.date.slice(0, 7);
    const row = chartData.find(r => r.dateLabel === month);
    if (row) row.historical = h.value;
  }

  // Connect last historical point to first forecast point
  const lastHistIdx = [...chartData].reverse().findIndex(r => r.historical !== undefined);
  if (lastHistIdx !== -1) {
    const idx = chartData.length - 1 - lastHistIdx;
    const lastVal = chartData[idx].historical!;
    if (chartData[idx + 1]) {
      chartData[idx + 1].forecast = lastVal; // bridge the gap
      chartData[idx + 1].lower = lastVal;
      chartData[idx + 1].upper = lastVal;
    }
  }

  const nowLabel = now.toISOString().slice(0, 7);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const val = payload.find((p: any) => p.value !== undefined)?.value;
    return (
      <div className="glass-card rounded-lg px-3 py-2 text-xs border border-white/10">
        <div className="text-chrome-dim mb-1">{label}</div>
        {payload.map((p: any) => p.value !== undefined && (
          <div key={p.name} style={{ color: p.color }} className="font-mono">
            {p.name === 'lower' || p.name === 'upper' ? null : `${p.name === 'historical' ? 'Actual' : 'Forecast'}: ${formatCurrency(p.value)}`}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="glass-card rounded-xl p-5">
      <div className="flex items-center justify-between mb-5">
        <h4 className="font-display text-base text-chrome-bright">Value History & Forecast</h4>
        <div className="flex items-center gap-4 text-xs text-chrome-dim">
          <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-amber-DEFAULT inline-block rounded" /> Actual</span>
          <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-blue-400 inline-block rounded border-dashed border-t border-blue-400" /> Forecast</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis
            dataKey="dateLabel"
            tick={{ fontSize: 10, fill: '#6b7280' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={formatK}
            tick={{ fontSize: 10, fill: '#6b7280' }}
            tickLine={false}
            axisLine={false}
            width={50}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine x={nowLabel} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 3" label={{ value: 'Today', fill: '#6b7280', fontSize: 10 }} />
          {/* Uncertainty band */}
          <Area dataKey="upper" stroke="none" fill="url(#forecastGrad)" legendType="none" connectNulls />
          <Area dataKey="lower" stroke="none" fill="white" fillOpacity={0} legendType="none" connectNulls />
          {/* Forecast line */}
          <Line
            dataKey="forecast"
            stroke="#60a5fa"
            strokeWidth={2}
            strokeDasharray="6 3"
            dot={false}
            connectNulls
            name="forecast"
          />
          {/* Historical line */}
          <Line
            dataKey="historical"
            stroke="#e8a800"
            strokeWidth={2.5}
            dot={{ r: 4, fill: '#e8a800', strokeWidth: 0 }}
            activeDot={{ r: 6 }}
            connectNulls
            name="historical"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
