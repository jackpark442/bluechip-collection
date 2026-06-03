'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RefreshCw, CheckCircle2, AlertTriangle, XCircle, Loader2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface DvlaResult {
  registration: string;
  taxStatus?: string;
  taxDueDate?: string;
  motStatus?: string;
  motExpiryDate?: string;
  make?: string;
  colour?: string;
}

interface Props {
  registration?: string;
  vehicleId: string;
  onSaved: () => void;
}

function TaxStatusIcon({ status }: { status?: string }) {
  if (!status) return null;
  const s = status.toLowerCase();
  if (s === 'taxed')   return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
  if (s === 'sorn')    return <AlertTriangle className="w-5 h-5 text-amber-400" />;
  return <XCircle className="w-5 h-5 text-red-400" />;
}

function taxStatusColor(status?: string) {
  if (!status) return 'text-chrome-dim';
  const s = status.toLowerCase();
  if (s === 'taxed')   return 'text-emerald-400';
  if (s === 'sorn')    return 'text-amber-400';
  return 'text-red-400';
}

function taxStatusBg(status?: string) {
  if (!status) return 'border-white/10 bg-white/3';
  const s = status.toLowerCase();
  if (s === 'taxed')   return 'border-emerald-500/25 bg-emerald-500/8';
  if (s === 'sorn')    return 'border-amber-500/25 bg-amber-500/8';
  return 'border-red-500/25 bg-red-500/8';
}

export default function DvlaStatusChecker({ registration, vehicleId, onSaved }: Props) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DvlaResult | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function check() {
    if (!registration) return;
    setLoading(true);
    setError('');
    setResult(null);
    setSaved(false);

    const res = await fetch(`/api/tax/lookup?reg=${encodeURIComponent(registration)}`);
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? 'DVLA lookup failed');
      return;
    }
    setResult(data);
    // Auto-save the result to tax records
    await saveResult(data);
  }

  async function saveResult(data: DvlaResult) {
    const isSorn = data.taxStatus?.toLowerCase() === 'sorn';
    // Need either a due date or SORN status to save
    if (!data.taxDueDate && !isSorn) return;

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const endDate = data.taxDueDate ?? new Date().toISOString().split('T')[0];

    // Upsert: delete any existing DVLA-sourced record then insert fresh
    const { data: existing } = await supabase
      .from('vehicle_tax')
      .select('id')
      .eq('vehicle_id', vehicleId)
      .eq('end_date', endDate)
      .maybeSingle();

    if (!existing) {
      await supabase.from('vehicle_tax').insert({
        vehicle_id: vehicleId,
        owner_id: user.id,
        start_date: new Date().toISOString().split('T')[0],
        end_date: endDate,
        is_exempt: isSorn,
        exemption_reason: isSorn ? 'SORN' : null,
        notes: `Auto-imported from DVLA on ${new Date().toLocaleDateString('en-GB')}`,
      });
    }

    setSaving(false);
    setSaved(true);
    onSaved();
  }

  if (!registration) {
    return (
      <div className="rounded-xl border border-white/8 bg-white/2 p-4 text-sm text-chrome-dim">
        Add a registration number to this vehicle to enable live DVLA lookups.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/8 bg-white/2 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-chrome-bright">Live DVLA Check</div>
          <div className="text-xs text-chrome-dim mt-0.5">
            Real-time tax &amp; SORN status for <span className="font-mono text-chrome-bright">{registration.toUpperCase()}</span>
          </div>
        </div>
        <button onClick={check} disabled={loading}
          className="btn-ghost rounded-lg px-3 py-2 text-xs flex items-center gap-2 disabled:opacity-60">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          {loading ? 'Checking…' : result ? 'Refresh' : 'Check Now'}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
          <XCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-3">
          {/* Tax / SORN status */}
          <div className={`rounded-xl border p-4 flex items-center gap-4 ${taxStatusBg(result.taxStatus)}`}>
            <TaxStatusIcon status={result.taxStatus} />
            <div className="flex-1">
              <div className={`text-base font-display font-bold ${taxStatusColor(result.taxStatus)}`}>
                {result.taxStatus ?? 'Unknown'}
              </div>
              {result.taxStatus?.toLowerCase() === 'sorn' && (
                <div className="text-xs text-amber-300/80 mt-0.5">
                  Statutory Off Road Notification — vehicle must not be used on public roads
                </div>
              )}
              {result.taxStatus?.toLowerCase() === 'untaxed' && (
                <div className="text-xs text-red-300/80 mt-0.5">
                  Vehicle tax has expired or was not renewed
                </div>
              )}
            </div>
            {result.taxDueDate && (
              <div className="text-right shrink-0">
                <div className="text-xs text-chrome-dim">Due / Expires</div>
                <div className="text-sm font-mono text-chrome-bright">{formatDate(result.taxDueDate)}</div>
              </div>
            )}
          </div>

          {/* MOT status from VES */}
          {result.motExpiryDate && (
            <div className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-white/3 border border-white/8 text-sm">
              <span className="text-chrome-dim">MOT (DVLA record)</span>
              <span className="font-mono text-chrome-bright">{formatDate(result.motExpiryDate)}</span>
            </div>
          )}

          {saving && (
            <div className="flex items-center gap-2 text-xs text-chrome-dim py-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving to tax records…
            </div>
          )}
          {saved && !saving && (
            <div className="flex items-center gap-2 text-xs text-emerald-400 py-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Saved — tax record updated
            </div>
          )}

          <div className="text-[10px] text-chrome-muted text-right">
            Source: DVLA Vehicle Enquiry Service · {new Date().toLocaleTimeString('en-GB')}
          </div>
        </div>
      )}
    </div>
  );
}
