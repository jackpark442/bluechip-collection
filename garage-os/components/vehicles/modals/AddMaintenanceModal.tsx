'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';
import Modal from './Modal';
import type { ServiceType } from '@/types';
import { SERVICE_TYPE_LABELS } from '@/lib/utils';

interface Props { vehicleId: string; onClose: () => void; onSave: () => void; }

const SERVICE_TYPES = Object.entries(SERVICE_TYPE_LABELS) as [ServiceType, string][];

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-chrome-dim mb-1.5 uppercase tracking-wider font-medium">{label}</label>
      {children}
    </div>
  );
}

export default function AddMaintenanceModal({ vehicleId, onClose, onSave }: Props) {
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [serviceType, setServiceType] = useState<ServiceType>('other');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [mileage, setMileage] = useState('');
  const [labourCost, setLabourCost] = useState('');
  const [partsCost, setPartsCost] = useState('');
  const [workshop, setWorkshop] = useState('');
  const [technician, setTechnician] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [nextServiceDate, setNextServiceDate] = useState('');
  const [nextServiceMileage, setNextServiceMileage] = useState('');
  const [notes, setNotes] = useState('');

  // Auto-fill title from service type
  function handleTypeChange(type: ServiceType) {
    setServiceType(type);
    if (!title) setTitle(SERVICE_TYPE_LABELS[type]);
  }

  const total = (parseFloat(labourCost || '0') + parseFloat(partsCost || '0')).toFixed(2);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    await supabase.from('maintenance_records').insert({
      vehicle_id: vehicleId, owner_id: user.id,
      service_type: serviceType, title: title.trim(), description: description || null,
      service_date: serviceDate,
      mileage_at_service: mileage ? parseInt(mileage) : null,
      labour_cost: parseFloat(labourCost || '0'),
      parts_cost: parseFloat(partsCost || '0'),
      workshop: workshop || null, technician: technician || null,
      invoice_number: invoiceNumber || null,
      next_service_date: nextServiceDate || null,
      next_service_mileage: nextServiceMileage ? parseInt(nextServiceMileage) : null,
      notes: notes || null,
    });

    setSaving(false); onSave(); onClose();
  }

  return (
    <Modal title="Log Service / Maintenance" onClose={onClose} width="max-w-2xl">
      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <F label="Service Type *">
            <select value={serviceType} onChange={e => handleTypeChange(e.target.value as ServiceType)} className="input-dark w-full rounded-lg px-3 py-2 text-sm">
              {SERVICE_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </F>
          <F label="Date *">
            <input type="date" value={serviceDate} onChange={e => setServiceDate(e.target.value)} className="input-dark w-full rounded-lg px-3 py-2 text-sm" required />
          </F>
        </div>

        <F label="Title *">
          <input value={title} onChange={e => setTitle(e.target.value)} className="input-dark w-full rounded-lg px-3 py-2 text-sm" required placeholder="Brief description of work done" />
        </F>

        <F label="Description">
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="input-dark w-full rounded-lg px-3 py-2 text-sm resize-none" placeholder="Detailed notes about the work carried out…" />
        </F>

        <div className="grid grid-cols-3 gap-4">
          <F label="Labour Cost (£)">
            <input type="number" value={labourCost} onChange={e => setLabourCost(e.target.value)} className="input-dark w-full rounded-lg px-3 py-2 text-sm" step="0.01" placeholder="0.00" />
          </F>
          <F label="Parts Cost (£)">
            <input type="number" value={partsCost} onChange={e => setPartsCost(e.target.value)} className="input-dark w-full rounded-lg px-3 py-2 text-sm" step="0.01" placeholder="0.00" />
          </F>
          <F label="Total">
            <div className="input-dark rounded-lg px-3 py-2 text-sm font-mono text-amber-DEFAULT">£{total}</div>
          </F>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <F label="Mileage at Service">
            <input type="number" value={mileage} onChange={e => setMileage(e.target.value)} className="input-dark w-full rounded-lg px-3 py-2 text-sm" placeholder="miles" />
          </F>
          <F label="Invoice Number">
            <input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} className="input-dark w-full rounded-lg px-3 py-2 text-sm font-mono" />
          </F>
          <F label="Workshop / Garage">
            <input value={workshop} onChange={e => setWorkshop(e.target.value)} className="input-dark w-full rounded-lg px-3 py-2 text-sm" />
          </F>
          <F label="Technician">
            <input value={technician} onChange={e => setTechnician(e.target.value)} className="input-dark w-full rounded-lg px-3 py-2 text-sm" />
          </F>
        </div>

        <div className="border-t border-white/5 pt-4">
          <div className="text-xs text-chrome-dim uppercase tracking-wider mb-3">Next Service Reminder</div>
          <div className="grid grid-cols-2 gap-4">
            <F label="Next Service Date">
              <input type="date" value={nextServiceDate} onChange={e => setNextServiceDate(e.target.value)} className="input-dark w-full rounded-lg px-3 py-2 text-sm" />
            </F>
            <F label="Next Service Mileage">
              <input type="number" value={nextServiceMileage} onChange={e => setNextServiceMileage(e.target.value)} className="input-dark w-full rounded-lg px-3 py-2 text-sm" placeholder="miles" />
            </F>
          </div>
        </div>

        <F label="Notes">
          <input value={notes} onChange={e => setNotes(e.target.value)} className="input-dark w-full rounded-lg px-3 py-2 text-sm" />
        </F>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className="btn-amber rounded-lg px-5 py-2.5 text-sm flex items-center gap-2 disabled:opacity-60">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Log Service
          </button>
          <button type="button" onClick={onClose} className="btn-ghost rounded-lg px-5 py-2.5 text-sm">Cancel</button>
        </div>
      </form>
    </Modal>
  );
}
