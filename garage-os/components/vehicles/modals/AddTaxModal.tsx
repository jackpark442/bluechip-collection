'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';
import Modal from './Modal';

interface Props { vehicleId: string; onClose: () => void; onSave: () => void; }

export default function AddTaxModal({ vehicleId, onClose, onSave }: Props) {
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [isExempt, setIsExempt] = useState(false);
  const [exemptionReason, setExemptionReason] = useState('Historic vehicle (pre-1984)');
  const [notes, setNotes] = useState('');

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    await supabase.from('vehicle_tax').insert({
      vehicle_id: vehicleId, owner_id: user.id,
      start_date: startDate || new Date().toISOString().split('T')[0],
      end_date: isExempt ? (endDate || '2099-12-31') : endDate,
      amount: amount ? parseFloat(amount) : null,
      reference: reference || null,
      is_exempt: isExempt,
      exemption_reason: isExempt ? exemptionReason : null,
      notes: notes || null,
    });

    setSaving(false); onSave(); onClose();
  }

  const F = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div><label className="block text-xs text-chrome-dim mb-1.5 uppercase tracking-wider font-medium">{label}</label>{children}</div>
  );

  return (
    <Modal title="Add Vehicle Tax Record" onClose={onClose}>
      <form onSubmit={handleSave} className="space-y-4">
        <label className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 cursor-pointer">
          <input type="checkbox" checked={isExempt} onChange={e => setIsExempt(e.target.checked)} />
          <div>
            <div className="text-sm text-blue-400 font-medium">Tax Exempt</div>
            <div className="text-xs text-chrome-dim">Historic vehicles, disabled exemptions, etc.</div>
          </div>
        </label>

        {isExempt ? (
          <F label="Exemption Reason">
            <input value={exemptionReason} onChange={e => setExemptionReason(e.target.value)}
              className="input-dark w-full rounded-lg px-3 py-2 text-sm"
              placeholder="e.g. Historic vehicle (pre-1984)" />
          </F>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <F label="Start Date *">
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input-dark w-full rounded-lg px-3 py-2 text-sm" required={!isExempt} />
            </F>
            <F label="End / Expiry Date *">
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input-dark w-full rounded-lg px-3 py-2 text-sm" required={!isExempt} />
            </F>
            <F label="Amount Paid (£)">
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="input-dark w-full rounded-lg px-3 py-2 text-sm" placeholder="0.00" step="0.01" />
            </F>
            <F label="Reference / V5C Number">
              <input value={reference} onChange={e => setReference(e.target.value)} className="input-dark w-full rounded-lg px-3 py-2 text-sm font-mono" />
            </F>
          </div>
        )}

        <F label="Notes">
          <input value={notes} onChange={e => setNotes(e.target.value)} className="input-dark w-full rounded-lg px-3 py-2 text-sm" />
        </F>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className="btn-amber rounded-lg px-5 py-2.5 text-sm flex items-center gap-2 disabled:opacity-60">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save Record
          </button>
          <button type="button" onClick={onClose} className="btn-ghost rounded-lg px-5 py-2.5 text-sm">Cancel</button>
        </div>
      </form>
    </Modal>
  );
}
