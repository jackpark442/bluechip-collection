'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Key } from 'lucide-react';
import Modal from './Modal';
import type { VehicleKey, KeyType } from '@/types';

interface Props {
  vehicleId: string;
  existing?: VehicleKey;
  onClose: () => void;
  onSave: () => void;
}

const KEY_TYPES: { value: KeyType; label: string; description: string }[] = [
  { value: 'main',   label: 'Main Key',   description: 'Primary key used day-to-day' },
  { value: 'spare',  label: 'Spare Key',  description: 'Backup / spare key' },
  { value: 'valet',  label: 'Valet Key',  description: 'Restricted valet key' },
  { value: 'other',  label: 'Other',      description: 'Key fob, tracker key, etc.' },
];

export default function AddKeyModal({ vehicleId, existing, onClose, onSave }: Props) {
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [keyType, setKeyType] = useState<KeyType>(existing?.key_type ?? 'main');
  const [label, setLabel] = useState(existing?.label ?? '');
  const [location, setLocation] = useState(existing?.location ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError('');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); setSaveError('Not logged in.'); return; }

    const payload = {
      vehicle_id: vehicleId,
      owner_id: user.id,
      key_type: keyType,
      label: label.trim() || null,
      location: location.trim() || null,
      notes: notes.trim() || null,
    };

    let error;
    if (existing) {
      ({ error } = await supabase.from('vehicle_keys').update(payload).eq('id', existing.id));
    } else {
      ({ error } = await supabase.from('vehicle_keys').insert(payload));
    }

    setSaving(false);

    if (error) {
      setSaveError(error.message);
      return;
    }

    onSave();
    onClose();
  }

  return (
    <Modal title={existing ? 'Edit Key' : 'Add Key'} onClose={onClose}>
      <form onSubmit={handleSave} className="space-y-5">

        {/* Key type selector */}
        <div>
          <label className="block text-xs text-chrome-dim mb-2 uppercase tracking-wider font-medium">Key Type</label>
          <div className="grid grid-cols-2 gap-2">
            {KEY_TYPES.map(({ value, label: lbl, description }) => (
              <button
                key={value}
                type="button"
                onClick={() => setKeyType(value)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  keyType === value
                    ? 'border-amber-DEFAULT/60 bg-amber-DEFAULT/10 text-amber-DEFAULT'
                    : 'border-white/10 bg-white/3 text-chrome-dim hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Key className={`w-3.5 h-3.5 ${keyType === value ? 'text-amber-DEFAULT' : 'text-chrome-muted'}`} />
                  <span className="text-sm font-medium">{lbl}</span>
                </div>
                <div className="text-xs opacity-70">{description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Label */}
        <FormField label="Label (optional)">
          <input
            type="text"
            value={label}
            onChange={e => setLabel(e.target.value)}
            className="input-dark w-full rounded-lg px-3 py-2 text-sm"
            placeholder="e.g. Red fob, Key 1, Leather tag"
            maxLength={80}
          />
        </FormField>

        {/* Location */}
        <FormField label="Where is it stored?">
          <input
            type="text"
            value={location}
            onChange={e => setLocation(e.target.value)}
            className="input-dark w-full rounded-lg px-3 py-2 text-sm"
            placeholder="e.g. Safe, Key cabinet, Drawer, With solicitor"
            maxLength={120}
          />
        </FormField>

        {/* Notes */}
        <FormField label="Notes (optional)">
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            className="input-dark w-full rounded-lg px-3 py-2 text-sm resize-none"
            placeholder="Any additional notes about this key…"
          />
        </FormField>

        {saveError && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
            ⚠ {saveError}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button type="submit" disabled={saving}
            className="btn-amber rounded-lg px-5 py-2.5 text-sm flex items-center gap-2 disabled:opacity-60">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {existing ? 'Save Changes' : 'Add Key'}
          </button>
          <button type="button" onClick={onClose} className="btn-ghost rounded-lg px-5 py-2.5 text-sm">
            Cancel
          </button>
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
