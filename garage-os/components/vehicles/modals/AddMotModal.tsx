'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';
import Modal from './Modal';

interface Props {
  vehicleId: string;
  vehicleRegistration?: string;
  onClose: () => void;
  onSave: () => void;
}

export default function AddMotModal({ vehicleId, vehicleRegistration, onClose, onSave }: Props) {
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [syncOk, setSyncOk] = useState<boolean | null>(null);

  const [expiryDate, setExpiryDate] = useState('');
  const [testDate, setTestDate] = useState('');
  const [result, setResult] = useState<'pass' | 'fail' | 'advisory' | 'pending'>('pass');
  const [mileage, setMileage] = useState('');
  const [certNumber, setCertNumber] = useState('');
  const [testCentre, setTestCentre] = useState('');
  const [advisories, setAdvisories] = useState('');
  const [failures, setFailures] = useState('');
  const [notes, setNotes] = useState('');
  const [reg, setReg] = useState(vehicleRegistration ?? '');

  async function handleDvsaSync() {
    if (!reg.trim()) return;
    setSyncing(true);
    setSyncMsg('');
    setSyncOk(null);

    const res = await fetch('/api/mot/sync', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ vehicleId, registration: reg.trim() }),
    });
    const data = await res.json();

    if (!res.ok) {
      setSyncMsg(data.error ?? 'Sync failed');
      setSyncOk(false);
    } else {
      setSyncMsg(`Imported ${data.dvsa?.totalTests ?? 0} MOT test(s) — latest expiry: ${data.motRecord?.expiry_date ?? 'N/A'}`);
      setSyncOk(true);
      onSave();
    }
    setSyncing(false);
  }

  async function handleManualSave(e: React.FormEvent) {
    e.preventDefault();
    if (!expiryDate) return;
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    await supabase.from('mot_records').insert({
      vehicle_id: vehicleId,
      owner_id: user.id,
      expiry_date: expiryDate,
      test_date: testDate || null,
      result,
      mileage_at_test: mileage ? parseInt(mileage) : null,
      certificate_number: certNumber || null,
      test_centre: testCentre || null,
      advisories: advisories ? advisories.split('\n').filter(Boolean) : null,
      failures: failures ? failures.split('\n').filter(Boolean) : null,
      notes: notes || null,
    });

    setSaving(false);
    onSave();
    onClose();
  }

  return (
    <Modal title="Add MOT Record" onClose={onClose}>
      {/* DVSA sync */}
      <div className="mb-6 p-4 rounded-xl bg-amber-DEFAULT/5 border border-amber-DEFAULT/15">
        <div className="text-xs font-semibold text-amber-DEFAULT uppercase tracking-wider mb-3">
          Import from DVSA
        </div>
        <div className="flex gap-2">
          <input type="text" value={reg} onChange={e => setReg(e.target.value.toUpperCase())}
            className="input-dark rounded-lg px-3 py-2 text-sm font-mono flex-1 uppercase"
            placeholder="Registration e.g. AB12CDE" />
          <button type="button" onClick={handleDvsaSync}
            disabled={!reg.trim() || syncing}
            className="btn-amber rounded-lg px-4 py-2 text-sm flex items-center gap-2 shrink-0 disabled:opacity-50">
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {syncing ? 'Syncing…' : 'Sync MOT'}
          </button>
        </div>
        {syncMsg && (
          <div className={`mt-3 flex items-start gap-2 text-xs ${syncOk ? 'text-emerald-400' : 'text-red-400'}`}>
            {syncOk ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
            <span>{syncMsg}</span>
          </div>
        )}
        {syncOk && (
          <button onClick={onClose} className="mt-3 btn-ghost rounded-lg px-3 py-1.5 text-xs w-full">
            Done — record imported
          </button>
        )}
      </div>

      <div className="text-xs text-chrome-dim text-center mb-4 relative">
        <span className="relative z-10 bg-obsidian-800 px-3">or add manually</span>
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/5"></div>
        </div>
      </div>

      <form onSubmit={handleManualSave} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Expiry Date *">
            <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)}
              className="input-dark w-full rounded-lg px-3 py-2 text-sm" required />
          </FormField>
          <FormField label="Test Date">
            <input type="date" value={testDate} onChange={e => setTestDate(e.target.value)}
              className="input-dark w-full rounded-lg px-3 py-2 text-sm" />
          </FormField>
          <FormField label="Result">
            <select value={result} onChange={e => setResult(e.target.value as any)}
              className="input-dark w-full rounded-lg px-3 py-2 text-sm">
              <option value="pass">Pass</option>
              <option value="fail">Fail</option>
              <option value="advisory">Advisory</option>
              <option value="pending">Pending</option>
            </select>
          </FormField>
          <FormField label="Mileage at Test">
            <input type="number" value={mileage} onChange={e => setMileage(e.target.value)}
              className="input-dark w-full rounded-lg px-3 py-2 text-sm" placeholder="miles" />
          </FormField>
          <FormField label="Certificate No.">
            <input value={certNumber} onChange={e => setCertNumber(e.target.value)}
              className="input-dark w-full rounded-lg px-3 py-2 text-sm font-mono" placeholder="12 digits" />
          </FormField>
          <FormField label="Test Centre">
            <input value={testCentre} onChange={e => setTestCentre(e.target.value)}
              className="input-dark w-full rounded-lg px-3 py-2 text-sm" placeholder="Garage name" />
          </FormField>
        </div>
        <FormField label="Advisories (one per line)">
          <textarea value={advisories} onChange={e => setAdvisories(e.target.value)} rows={3}
            className="input-dark w-full rounded-lg px-3 py-2 text-sm resize-none"
            placeholder="e.g. Nearside front tyre slightly worn on inner edge" />
        </FormField>
        <FormField label="Failures (one per line)">
          <textarea value={failures} onChange={e => setFailures(e.target.value)} rows={2}
            className="input-dark w-full rounded-lg px-3 py-2 text-sm resize-none"
            placeholder="Any fail reasons…" />
        </FormField>
        <FormField label="Notes">
          <input value={notes} onChange={e => setNotes(e.target.value)}
            className="input-dark w-full rounded-lg px-3 py-2 text-sm" placeholder="Optional notes" />
        </FormField>
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving}
            className="btn-amber rounded-lg px-5 py-2.5 text-sm flex items-center gap-2 disabled:opacity-60">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Save Record
          </button>
          <button type="button" onClick={onClose} className="btn-ghost rounded-lg px-5 py-2.5 text-sm">Cancel</button>
        </div>
      </form>
    </Modal>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-chrome-dim mb-1.5 uppercase tracking-wider font-medium">{label}</label>
      {children}
    </div>
  );
}
