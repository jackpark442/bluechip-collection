'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Search, Loader2, CheckCircle, AlertTriangle, ChevronLeft, Save, Info } from 'lucide-react';
import type { Vehicle, VehicleCategory, VehicleStatus, FuelType } from '@/types';
import { CATEGORY_LABELS, STATUS_LABELS } from '@/lib/utils';
import Link from 'next/link';

interface Props {
  mode: 'create' | 'edit';
  vehicle?: Vehicle;
}

const FUEL_TYPES: { value: FuelType; label: string }[] = [
  { value: 'petrol', label: 'Petrol' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'electric', label: 'Electric' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'lpg', label: 'LPG' },
  { value: 'hydrogen', label: 'Hydrogen' },
  { value: 'other', label: 'Other' },
];

const ALL_CATEGORIES = Object.entries(CATEGORY_LABELS) as [VehicleCategory, string][];
const ALL_STATUSES = Object.entries(STATUS_LABELS) as [VehicleStatus, string][];

type DvsaLookupState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; make: string; model: string; colour?: string; fuelType?: string; engineSizeCc?: number; motExpiryDate?: string; testDate?: string; mileage?: number; advisories?: string[]; totalTests?: number }
  | { status: 'error'; message: string };

export default function VehicleForm({ mode, vehicle }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // DVSA lookup state
  const [dvsaState, setDvsaState] = useState<DvsaLookupState>({ status: 'idle' });
  const [autoImportMot, setAutoImportMot] = useState(true);

  // Form fields
  const [reg, setReg] = useState(vehicle?.registration ?? '');
  const [make, setMake] = useState(vehicle?.make ?? '');
  const [model, setModel] = useState(vehicle?.model ?? '');
  const [variant, setVariant] = useState(vehicle?.variant ?? '');
  const [year, setYear] = useState(vehicle?.year?.toString() ?? '');
  const [colour, setColour] = useState(vehicle?.colour ?? '');
  const [vin, setVin] = useState(vehicle?.vin ?? '');
  const [category, setCategory] = useState<VehicleCategory>(vehicle?.category ?? 'other');
  const [status, setStatus] = useState<VehicleStatus>(vehicle?.status ?? 'active');
  const [fuelType, setFuelType] = useState<FuelType>(vehicle?.fuel_type ?? 'petrol');
  const [engineSizeCc, setEngineSizeCc] = useState(vehicle?.engine_size_cc?.toString() ?? '');
  const [horsepower, setHorsepower] = useState(vehicle?.horsepower?.toString() ?? '');
  const [torqueNm, setTorqueNm] = useState(vehicle?.torque_nm?.toString() ?? '');
  const [transmission, setTransmission] = useState(vehicle?.transmission ?? '');
  const [driveType, setDriveType] = useState(vehicle?.drive_type ?? '');
  const [mileage, setMileage] = useState(vehicle?.mileage?.toString() ?? '0');
  const [purchasePrice, setPurchasePrice] = useState(vehicle?.purchase_price?.toString() ?? '');
  const [purchaseDate, setPurchaseDate] = useState(vehicle?.purchase_date ?? '');
  const [currentValue, setCurrentValue] = useState(vehicle?.current_value?.toString() ?? '');
  const [notes, setNotes] = useState(vehicle?.notes ?? '');

  // ── DVSA lookup ─────────────────────────────────────────────────────────────
  async function handleDvsaLookup() {
    if (!reg.trim()) return;
    setDvsaState({ status: 'loading' });

    try {
      const res = await fetch(`/api/mot/lookup?reg=${encodeURIComponent(reg.trim())}`);
      const data = await res.json();

      if (!res.ok) {
        setDvsaState({ status: 'error', message: data.error ?? 'Lookup failed' });
        return;
      }

      setDvsaState({
        status: 'success',
        make: data.make,
        model: data.model,
        colour: data.colour,
        fuelType: data.fuelType,
        engineSizeCc: data.engineSizeCc,
        motExpiryDate: data.latestTest?.expiryDate,
        testDate: data.latestTest?.testDate?.split(' ')[0],
        mileage: data.latestTest?.mileage,
        advisories: data.latestTest?.advisories,
        totalTests: data.allTests?.length ?? 0,
      });

      // Auto-fill empty fields
      if (!make && data.make) setMake(data.make);
      if (!model && data.model) setModel(data.model);
      if (!colour && data.colour) setColour(capitalise(data.colour));
      if (!engineSizeCc && data.engineSizeCc) setEngineSizeCc(data.engineSizeCc.toString());
      if (data.latestTest?.mileage && (!mileage || mileage === '0')) {
        setMileage(data.latestTest.mileage.toString());
      }
      if (data.fuelType) {
        const fuelMap: Record<string, FuelType> = {
          'Petrol': 'petrol', 'Diesel': 'diesel', 'Electric': 'electric',
          'Hybrid Electric': 'hybrid', 'Gas Bi-Fuel': 'lpg',
        };
        const mapped = fuelMap[data.fuelType];
        if (mapped) setFuelType(mapped);
      }
    } catch {
      setDvsaState({ status: 'error', message: 'Network error. Check your connection.' });
    }
  }

  // ── Save ─────────────────────────────────────────────────────────────────────
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('Not authenticated'); setSaving(false); return; }

    const payload = {
      make: make.trim(),
      model: model.trim(),
      variant: variant.trim() || null,
      year: parseInt(year),
      registration: reg.trim().toUpperCase() || null,
      vin: vin.trim() || null,
      colour: colour.trim() || null,
      category,
      status,
      fuel_type: fuelType,
      engine_size_cc: engineSizeCc ? parseInt(engineSizeCc) : null,
      horsepower: horsepower ? parseInt(horsepower) : null,
      torque_nm: torqueNm ? parseInt(torqueNm) : null,
      transmission: transmission.trim() || null,
      drive_type: driveType.trim() || null,
      mileage: parseInt(mileage) || 0,
      purchase_price: purchasePrice ? parseFloat(purchasePrice) : null,
      purchase_date: purchaseDate || null,
      current_value: currentValue ? parseFloat(currentValue) : null,
      notes: notes.trim() || null,
    };

    let vehicleId: string;

    if (mode === 'create') {
      const { data, error: err } = await supabase
        .from('vehicles').insert({ ...payload, owner_id: user.id }).select().single();
      if (err || !data) { setError(err?.message ?? 'Failed to create vehicle'); setSaving(false); return; }
      vehicleId = data.id;
    } else {
      const { data, error: err } = await supabase
        .from('vehicles').update(payload).eq('id', vehicle!.id).eq('owner_id', user.id).select().single();
      if (err || !data) { setError(err?.message ?? 'Failed to update vehicle'); setSaving(false); return; }
      vehicleId = data.id;
    }

    // If DVSA lookup succeeded and autoImportMot, sync MOT record
    if (autoImportMot && dvsaState.status === 'success' && reg.trim()) {
      try {
        await fetch('/api/mot/sync', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ vehicleId, registration: reg.trim() }),
        });
      } catch {
        // Non-fatal — vehicle was saved, MOT sync failed
      }
    }

    router.push(`/vehicles/${vehicleId}`);
    router.refresh();
  }

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href={mode === 'edit' && vehicle ? `/vehicles/${vehicle.id}` : '/vehicles'}
          className="text-chrome-dim hover:text-chrome-bright transition-colors flex items-center gap-1.5 text-sm">
          <ChevronLeft className="w-4 h-4" />
          {mode === 'edit' ? 'Back to vehicle' : 'Back to fleet'}
        </Link>
      </div>

      <h1 className="font-display text-2xl text-chrome-bright mb-8">
        {mode === 'create' ? 'Add Vehicle to Fleet' : `Edit ${vehicle?.make} ${vehicle?.model}`}
      </h1>

      <form onSubmit={handleSave} className="space-y-8">

        {/* ── DVSA Lookup ───────────────────────────────────────────────────── */}
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-start gap-3 mb-5">
            <div className="w-8 h-8 rounded-lg bg-amber-DEFAULT/10 flex items-center justify-center shrink-0 mt-0.5">
              <Search className="w-4 h-4 text-amber-DEFAULT" />
            </div>
            <div>
              <h2 className="font-display text-lg text-chrome-bright">DVSA MOT Lookup</h2>
              <p className="text-sm text-chrome-dim mt-0.5">
                Enter the registration to auto-fill details and import the latest MOT record from the official DVSA database.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <input
              type="text"
              value={reg}
              onChange={e => setReg(e.target.value.toUpperCase())}
              className="input-dark rounded-lg px-4 py-2.5 text-sm font-mono flex-1 uppercase tracking-wider"
              placeholder="e.g. AB12 CDE"
              maxLength={8}
            />
            <button type="button" onClick={handleDvsaLookup}
              disabled={!reg.trim() || dvsaState.status === 'loading'}
              className="btn-amber rounded-lg px-5 py-2.5 text-sm flex items-center gap-2 disabled:opacity-50">
              {dvsaState.status === 'loading'
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Checking...</>
                : <><Search className="w-4 h-4" /> Check MOT</>}
            </button>
          </div>

          {/* Result */}
          {dvsaState.status === 'success' && (
            <div className="mt-4 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-emerald-400 mb-2">Vehicle found in DVSA database</div>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs">
                    <div><span className="text-chrome-dim">Make:</span> <span className="text-chrome-bright">{dvsaState.make}</span></div>
                    <div><span className="text-chrome-dim">Model:</span> <span className="text-chrome-bright">{dvsaState.model}</span></div>
                    {dvsaState.colour && <div><span className="text-chrome-dim">Colour:</span> <span className="text-chrome-bright">{capitalise(dvsaState.colour)}</span></div>}
                    {dvsaState.fuelType && <div><span className="text-chrome-dim">Fuel:</span> <span className="text-chrome-bright">{dvsaState.fuelType}</span></div>}
                    {dvsaState.motExpiryDate && <div><span className="text-chrome-dim">MOT expiry:</span> <span className="text-chrome-bright">{dvsaState.motExpiryDate}</span></div>}
                    {dvsaState.mileage && <div><span className="text-chrome-dim">Last mileage:</span> <span className="text-chrome-bright">{dvsaState.mileage.toLocaleString()} mi</span></div>}
                    {dvsaState.totalTests !== undefined && <div><span className="text-chrome-dim">MOT tests:</span> <span className="text-chrome-bright">{dvsaState.totalTests} on record</span></div>}
                  </div>
                  {dvsaState.advisories && dvsaState.advisories.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-emerald-500/20">
                      <div className="text-xs text-amber-400 font-medium mb-1">Advisories from last MOT:</div>
                      {dvsaState.advisories.slice(0, 3).map((a, i) => (
                        <div key={i} className="text-xs text-chrome-dim">· {a}</div>
                      ))}
                    </div>
                  )}
                  <label className="flex items-center gap-2 mt-3 cursor-pointer">
                    <input type="checkbox" checked={autoImportMot} onChange={e => setAutoImportMot(e.target.checked)}
                      className="rounded" />
                    <span className="text-xs text-chrome-dim">Import latest MOT record after saving</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {dvsaState.status === 'error' && (
            <div className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-red-400 mb-1">DVSA lookup failed</div>
                <div className="text-xs text-chrome-dim">{dvsaState.message}</div>
                <div className="text-xs text-chrome-dim mt-1">You can still add the vehicle manually below.</div>
              </div>
            </div>
          )}

          {dvsaState.status === 'idle' && (
            <div className="mt-3 flex items-center gap-2 text-xs text-chrome-muted">
              <Info className="w-3.5 h-3.5" />
              <span>Requires a DVSA MOT History API key — see setup instructions.</span>
            </div>
          )}
        </div>

        {/* ── Identity ──────────────────────────────────────────────────────── */}
        <FormSection title="Vehicle Identity">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Make" required>
              <input value={make} onChange={e => setMake(e.target.value)} className="input-dark w-full rounded-lg px-3 py-2.5 text-sm" placeholder="e.g. Ferrari" required />
            </Field>
            <Field label="Model" required>
              <input value={model} onChange={e => setModel(e.target.value)} className="input-dark w-full rounded-lg px-3 py-2.5 text-sm" placeholder="e.g. 488 Pista" required />
            </Field>
            <Field label="Variant / Trim">
              <input value={variant} onChange={e => setVariant(e.target.value)} className="input-dark w-full rounded-lg px-3 py-2.5 text-sm" placeholder="e.g. Spider, Challenge" />
            </Field>
            <Field label="Year" required>
              <input type="number" value={year} onChange={e => setYear(e.target.value)} className="input-dark w-full rounded-lg px-3 py-2.5 text-sm" placeholder="2019" min={1900} max={new Date().getFullYear() + 2} required />
            </Field>
            <Field label="Colour">
              <input value={colour} onChange={e => setColour(e.target.value)} className="input-dark w-full rounded-lg px-3 py-2.5 text-sm" placeholder="e.g. Rosso Corsa" />
            </Field>
            <Field label="VIN">
              <input value={vin} onChange={e => setVin(e.target.value)} className="input-dark w-full rounded-lg px-3 py-2.5 text-sm font-mono" placeholder="17-character VIN" maxLength={17} />
            </Field>
          </div>
        </FormSection>

        {/* ── Classification ────────────────────────────────────────────────── */}
        <FormSection title="Classification">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Category" required>
              <select value={category} onChange={e => setCategory(e.target.value as VehicleCategory)} className="input-dark w-full rounded-lg px-3 py-2.5 text-sm">
                {ALL_CATEGORIES.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
              </select>
            </Field>
            <Field label="Status" required>
              <select value={status} onChange={e => setStatus(e.target.value as VehicleStatus)} className="input-dark w-full rounded-lg px-3 py-2.5 text-sm">
                {ALL_STATUSES.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
              </select>
            </Field>
            <Field label="Fuel Type">
              <select value={fuelType} onChange={e => setFuelType(e.target.value as FuelType)} className="input-dark w-full rounded-lg px-3 py-2.5 text-sm">
                {FUEL_TYPES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </Field>
            <Field label="Current Mileage">
              <input type="number" value={mileage} onChange={e => setMileage(e.target.value)} className="input-dark w-full rounded-lg px-3 py-2.5 text-sm" placeholder="0" min={0} />
            </Field>
          </div>
        </FormSection>

        {/* ── Technical ─────────────────────────────────────────────────────── */}
        <FormSection title="Technical Specifications">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Engine Size (cc)">
              <input type="number" value={engineSizeCc} onChange={e => setEngineSizeCc(e.target.value)} className="input-dark w-full rounded-lg px-3 py-2.5 text-sm" placeholder="e.g. 3902" />
            </Field>
            <Field label="Horsepower (hp)">
              <input type="number" value={horsepower} onChange={e => setHorsepower(e.target.value)} className="input-dark w-full rounded-lg px-3 py-2.5 text-sm" placeholder="e.g. 710" />
            </Field>
            <Field label="Torque (Nm)">
              <input type="number" value={torqueNm} onChange={e => setTorqueNm(e.target.value)} className="input-dark w-full rounded-lg px-3 py-2.5 text-sm" placeholder="e.g. 770" />
            </Field>
            <Field label="Transmission">
              <input value={transmission} onChange={e => setTransmission(e.target.value)} className="input-dark w-full rounded-lg px-3 py-2.5 text-sm" placeholder="e.g. 7-speed DCT" />
            </Field>
            <Field label="Drive Type">
              <input value={driveType} onChange={e => setDriveType(e.target.value)} className="input-dark w-full rounded-lg px-3 py-2.5 text-sm" placeholder="e.g. RWD, AWD, 4WD" />
            </Field>
          </div>
        </FormSection>

        {/* ── Financial ─────────────────────────────────────────────────────── */}
        <FormSection title="Financial">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Purchase Price (£)">
              <input type="number" value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)} className="input-dark w-full rounded-lg px-3 py-2.5 text-sm" placeholder="0.00" step="0.01" min={0} />
            </Field>
            <Field label="Purchase Date">
              <input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} className="input-dark w-full rounded-lg px-3 py-2.5 text-sm" />
            </Field>
            <Field label="Current Value (£)">
              <input type="number" value={currentValue} onChange={e => setCurrentValue(e.target.value)} className="input-dark w-full rounded-lg px-3 py-2.5 text-sm" placeholder="0.00" step="0.01" min={0} />
            </Field>
          </div>
        </FormSection>

        {/* ── Notes ─────────────────────────────────────────────────────────── */}
        <FormSection title="Notes">
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4}
            className="input-dark w-full rounded-lg px-3 py-2.5 text-sm resize-none"
            placeholder="Any additional notes about this vehicle…" />
        </FormSection>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="flex gap-3 pb-8">
          <button type="submit" disabled={saving}
            className="btn-amber rounded-lg px-6 py-3 text-sm flex items-center gap-2 disabled:opacity-60">
            {saving
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
              : <><Save className="w-4 h-4" /> {mode === 'create' ? 'Add to Fleet' : 'Save Changes'}</>}
          </button>
          <Link href={mode === 'edit' && vehicle ? `/vehicles/${vehicle.id}` : '/vehicles'}
            className="btn-ghost rounded-lg px-6 py-3 text-sm">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass-card rounded-xl p-6">
      <h2 className="font-display text-base text-chrome-bright mb-5 pb-4 border-b border-white/5">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-chrome-dim mb-2 tracking-[0.06em] uppercase">
        {label}{required && <span className="text-amber-DEFAULT ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

function capitalise(str: string) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : str;
}
