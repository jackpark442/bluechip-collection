'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CheckSquare, Square, BookOpen } from 'lucide-react';
import type { Vehicle } from '@/types';

type CheckKey =
  | 'has_v5c' | 'has_service_book' | 'has_owners_manual' | 'has_spare_key'
  | 'has_purchase_invoice' | 'has_warranty_docs' | 'has_mot_certificates'
  | 'has_insurance_cert' | 'has_stamped_history' | 'has_toolkit';

const ITEMS: { key: CheckKey; label: string; description: string }[] = [
  { key: 'has_v5c',             label: 'V5C Logbook',          description: 'DVLA registration certificate' },
  { key: 'has_service_book',    label: 'Service Book',         description: 'Full service history book' },
  { key: 'has_stamped_history', label: 'Stamped History',      description: 'Dealer-stamped service records' },
  { key: 'has_owners_manual',   label: "Owner's Manual",       description: 'Handbook / instruction manual' },
  { key: 'has_spare_key',       label: 'Spare Key',            description: 'Second set of keys' },
  { key: 'has_mot_certificates',label: 'MOT Certificates',     description: 'Past MOT paperwork' },
  { key: 'has_insurance_cert',  label: 'Insurance Certificate',description: 'Current policy certificate' },
  { key: 'has_purchase_invoice',label: 'Purchase Invoice',     description: 'Original purchase receipt' },
  { key: 'has_warranty_docs',   label: 'Warranty Documents',   description: "Manufacturer / dealer warranty" },
  { key: 'has_toolkit',         label: 'Toolkit / Jack',       description: 'OEM tool kit, locking wheel nut key, jack' },
];

interface Props {
  vehicle: Vehicle;
  onRefresh: () => void;
}

export default function PaperworkChecklist({ vehicle, onRefresh }: Props) {
  const supabase = createClient();
  const [saving, setSaving] = useState<CheckKey | null>(null);

  // Local state mirrors vehicle's current checklist values
  const [checks, setChecks] = useState<Record<CheckKey, boolean>>(() => {
    const init: Partial<Record<CheckKey, boolean>> = {};
    for (const { key } of ITEMS) init[key] = vehicle[key] ?? false;
    return init as Record<CheckKey, boolean>;
  });

  async function toggle(key: CheckKey) {
    const newVal = !checks[key];
    setSaving(key);
    setChecks(prev => ({ ...prev, [key]: newVal }));

    await supabase.from('vehicles').update({ [key]: newVal }).eq('id', vehicle.id);
    setSaving(null);
    onRefresh();
  }

  const present = ITEMS.filter(i => checks[i.key]).length;

  return (
    <div className="glass-card rounded-xl p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-amber-DEFAULT" />
          <h3 className="font-display text-base text-chrome-bright">Paperwork &amp; Documents</h3>
        </div>
        <div className="text-xs text-chrome-dim">
          <span className={present === ITEMS.length ? 'text-emerald-400 font-semibold' : present >= ITEMS.length * 0.7 ? 'text-amber-400 font-semibold' : 'text-red-400 font-semibold'}>
            {present}
          </span>
          <span> / {ITEMS.length}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-white/8 rounded-full mb-5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            present === ITEMS.length ? 'bg-emerald-500' : present >= ITEMS.length * 0.7 ? 'bg-amber-400' : 'bg-red-400'
          }`}
          style={{ width: `${(present / ITEMS.length) * 100}%` }}
        />
      </div>

      <div className="space-y-1">
        {ITEMS.map(({ key, label, description }) => {
          const checked = checks[key];
          const isSaving = saving === key;
          return (
            <button
              key={key}
              onClick={() => toggle(key)}
              disabled={isSaving}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                checked
                  ? 'bg-emerald-500/8 border border-emerald-500/20 hover:bg-emerald-500/12'
                  : 'bg-white/3 border border-white/5 hover:border-white/10'
              } disabled:opacity-60`}
            >
              {checked
                ? <CheckSquare className={`w-4 h-4 shrink-0 text-emerald-400 ${isSaving ? 'opacity-50' : ''}`} />
                : <Square className="w-4 h-4 shrink-0 text-chrome-muted" />
              }
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium ${checked ? 'text-emerald-300' : 'text-chrome-dim'}`}>{label}</div>
                <div className="text-xs text-chrome-muted leading-tight">{description}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
