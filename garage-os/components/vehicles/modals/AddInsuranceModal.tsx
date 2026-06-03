'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';
import Modal from './Modal';
import type { InsuranceType } from '@/types';

interface Props { vehicleId: string; onClose: () => void; onSave: () => void; }

const INSURANCE_TYPES: { value: InsuranceType; label: string }[] = [
  { value: 'comprehensive', label: 'Comprehensive' },
  { value: 'third_party_fire_theft', label: 'Third Party, Fire & Theft' },
  { value: 'third_party', label: 'Third Party Only' },
  { value: 'classic_agreed_value', label: 'Classic — Agreed Value' },
  { value: 'fleet', label: 'Fleet Policy' },
  { value: 'motor_trade', label: 'Motor Trade' },
];

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-xs text-chrome-dim mb-1.5 uppercase tracking-wider font-medium">{label}</label>{children}</div>;
}

export default function AddInsuranceModal({ vehicleId, onClose, onSave }: Props) {
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [provider, setProvider] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');
  const [type, setType] = useState<InsuranceType>('comprehensive');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [premium, setPremium] = useState('');
  const [agreedValue, setAgreedValue] = useState('');
  const [excess, setExcess] = useState('');
  const [broker, setBroker] = useState('');
  const [brokerPhone, setBrokerPhone] = useState('');
  const [notes, setNotes] = useState('');

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    await supabase.from('insurance_policies').insert({
      vehicle_id: vehicleId, owner_id: user.id,
      provider: provider.trim(), policy_number: policyNumber || null,
      type, start_date: startDate, end_date: endDate,
      annual_premium: premium ? parseFloat(premium) : null,
      agreed_value: agreedValue ? parseFloat(agreedValue) : null,
      excess: excess ? parseFloat(excess) : null,
      broker: broker || null, broker_phone: brokerPhone || null,
      notes: notes || null,
    });

    setSaving(false); onSave(); onClose();
  }

  return (
    <Modal title="Add Insurance Policy" onClose={onClose}>
      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <F label="Provider *">
            <input value={provider} onChange={e => setProvider(e.target.value)} className="input-dark w-full rounded-lg px-3 py-2 text-sm" placeholder="e.g. Hagerty, Adrian Flux" required />
          </F>
          <F label="Policy Number">
            <input value={policyNumber} onChange={e => setPolicyNumber(e.target.value)} className="input-dark w-full rounded-lg px-3 py-2 text-sm font-mono" />
          </F>
          <F label="Type">
            <select value={type} onChange={e => setType(e.target.value as InsuranceType)} className="input-dark w-full rounded-lg px-3 py-2 text-sm">
              {INSURANCE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </F>
          <F label="Annual Premium (£)">
            <input type="number" value={premium} onChange={e => setPremium(e.target.value)} className="input-dark w-full rounded-lg px-3 py-2 text-sm" placeholder="0.00" step="0.01" />
          </F>
          <F label="Start Date *">
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input-dark w-full rounded-lg px-3 py-2 text-sm" required />
          </F>
          <F label="End Date *">
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input-dark w-full rounded-lg px-3 py-2 text-sm" required />
          </F>
          <F label="Agreed Value (£)">
            <input type="number" value={agreedValue} onChange={e => setAgreedValue(e.target.value)} className="input-dark w-full rounded-lg px-3 py-2 text-sm" placeholder="Classic car value" step="0.01" />
          </F>
          <F label="Excess (£)">
            <input type="number" value={excess} onChange={e => setExcess(e.target.value)} className="input-dark w-full rounded-lg px-3 py-2 text-sm" step="0.01" />
          </F>
          <F label="Broker">
            <input value={broker} onChange={e => setBroker(e.target.value)} className="input-dark w-full rounded-lg px-3 py-2 text-sm" />
          </F>
          <F label="Broker Phone">
            <input value={brokerPhone} onChange={e => setBrokerPhone(e.target.value)} className="input-dark w-full rounded-lg px-3 py-2 text-sm" type="tel" />
          </F>
        </div>
        <F label="Notes">
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="input-dark w-full rounded-lg px-3 py-2 text-sm resize-none" />
        </F>
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className="btn-amber rounded-lg px-5 py-2.5 text-sm flex items-center gap-2 disabled:opacity-60">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save Policy
          </button>
          <button type="button" onClick={onClose} className="btn-ghost rounded-lg px-5 py-2.5 text-sm">Cancel</button>
        </div>
      </form>
    </Modal>
  );
}
