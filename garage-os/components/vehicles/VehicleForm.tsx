'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Search, Loader2, CheckCircle, AlertTriangle, ChevronLeft, Save, Info } from 'lucide-react';
import type { Vehicle, VehicleCategory, VehicleStatus, FuelType } from '@/types';
import { CATEGORY_LABELS, STATUS_LABELS, getVehicleClass } from '@/lib/utils';
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

const ROAD_CATEGORIES: VehicleCategory[] = ['supercar','sports_car','classic_car','luxury_saloon','suv','motorhome','campervan','motorcycle','van','pickup_truck','other'];
const NON_ROAD_CATEGORIES: VehicleCategory[] = ['trailer','pushbike','lawnmower','plant_equipment','quad_bike'];
const COMMERCIAL_CATEGORIES: VehicleCategory[] = ['hgv'];
const ALL_STATUSES = Object.entries(STATUS_LABELS) as [VehicleStatus, string][];

type DvsaLookupState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; make: string; model: string; colour?: string; fuelType?: string; engineSizeCc?: number; motExpiryDate?: string; firstMotDueDate?: string; testDate?: string; mileage?: number; advisories?: string[]; totalTests?: number; source?: string; yearOfManufacture?: number; taxStatus?: string; taxDueDate?: string; noMotYet?: boolean; }
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
  const [zeroToSixty, setZeroToSixty] = useState(vehicle?.zero_to_sixty?.toString() ?? '');
  const [topSpeedMph, setTopSpeedMph] = useState(vehicle?.top_speed_mph?.toString() ?? '');
  const [kerbWeightKg, setKerbWeightKg] = useState(vehicle?.kerb_weight_kg?.toString() ?? '');
  const [bodyStyle, setBodyStyle] = useState(vehicle?.body_style ?? '');
  const [seats, setSeats] = useState(vehicle?.seats?.toString() ?? '');
  const [cylinders, setCylinders] = useState(vehicle?.cylinders?.toString() ?? '');
  const [co2Gkm, setCo2Gkm] = useState(vehicle?.co2_gkm?.toString() ?? '');
  const [wheelbaseMm, setWheelbaseMm] = useState(vehicle?.wheelbase_mm?.toString() ?? '');
  const [lengthMm, setLengthMm] = useState(vehicle?.length_mm?.toString() ?? '');
  const [widthMm, setWidthMm] = useState(vehicle?.width_mm?.toString() ?? '');
  const [heightMm, setHeightMm] = useState(vehicle?.height_mm?.toString() ?? '');
  const [purchasePrice, setPurchasePrice] = useState(vehicle?.purchase_price?.toString() ?? '');
  const [purchaseDate, setPurchaseDate] = useState(vehicle?.purchase_date ?? '');
  const [currentValue, setCurrentValue] = useState(vehicle?.current_value?.toString() ?? '');
  const [notes, setNotes] = useState(vehicle?.notes ?? '');
  const [firstMotDueDate, setFirstMotDueDate] = useState(vehicle?.first_mot_due_date ?? '');

  const vehicleClass = getVehicleClass(category);

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

      // Also fetch live tax/SORN status from DVLA VES
      let taxStatus = data.taxStatus as string | undefined;
      let taxDueDate = data.taxDueDate as string | undefined;
      if (!taxStatus) {
        try {
          const taxRes = await fetch(`/api/tax/lookup?reg=${encodeURIComponent(reg.trim())}`);
          if (taxRes.ok) {
            const taxData = await taxRes.json();
            taxStatus = taxData.taxStatus;
            taxDueDate = taxData.taxDueDate;
          }
        } catch { /* non-fatal */ }
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
        source: data.source,
        yearOfManufacture: data.yearOfManufacture,
        taxStatus,
        taxDueDate,
        noMotYet: data.noMotYet,
        firstMotDueDate: data.firstMotDueDate,
      });

      // Auto-fill empty fields
      if (!make && data.make) setMake(data.make);
      if (!model && data.model) setModel(data.model);
      if (!colour && data.colour) setColour(capitalise(data.colour));
      if (!engineSizeCc && data.engineSizeCc) setEngineSizeCc(data.engineSizeCc.toString());
      if (!year && data.yearOfManufacture) setYear(data.yearOfManufacture.toString());
      if (data.latestTest?.mileage && (!mileage || mileage === '0')) {
        setMileage(data.latestTest.mileage.toString());
      }
      if (data.firstMotDueDate && !firstMotDueDate) {
        setFirstMotDueDate(data.firstMotDueDate);
      }
      if (data.fuelType) {
        const fuelMap: Record<string, FuelType> = {
          'Petrol': 'petrol', 'Diesel': 'diesel', 'Electric': 'electric',
          'Hybrid Electric': 'hybrid', 'Gas Bi-Fuel': 'lpg',
        };
        const mapped = fuelMap[data.fuelType];
        if (mapped) setFuelType(mapped);
      }
    } catch (err: any) {
      setDvsaState({ status: 'error', message: err?.message ?? 'Network error. Check your connection.' });
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
      zero_to_sixty: zeroToSixty ? parseFloat(zeroToSixty) : null,
      top_speed_mph: topSpeedMph ? parseInt(topSpeedMph) : null,
      kerb_weight_kg: kerbWeightKg ? parseInt(kerbWeightKg) : null,
      body_style: bodyStyle.trim() || null,
      seats: seats ? parseInt(seats) : null,
      cylinders: cylinders ? parseInt(cylinders) : null,
      co2_gkm: co2Gkm ? parseInt(co2Gkm) : null,
      wheelbase_mm: wheelbaseMm ? parseInt(wheelbaseMm) : null,
      length_mm: lengthMm ? parseInt(lengthMm) : null,
      width_mm: widthMm ? parseInt(widthMm) : null,
      height_mm: heightMm ? parseInt(heightMm) : null,
      purchase_price: purchasePrice ? parseFloat(purchasePrice) : null,
      purchase_date: purchaseDate || null,
      current_value: currentValue ? parseFloat(currentValue) : null,
      notes: notes.trim() || null,
      first_mot_due_date: firstMotDueDate || null,
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

    // Auto-import tax / SORN record if we have data from DVLA
    if (dvsaState.status === 'success' && dvsaState.taxStatus) {
      try {
        const isSorn = dvsaState.taxStatus.toLowerCase() === 'sorn';
        const endDate = dvsaState.taxDueDate ?? new Date().toISOString().split('T')[0];
        const { data: existingTax } = await supabase
          .from('vehicle_tax').select('id').eq('vehicle_id', vehicleId).eq('end_date', endDate).maybeSingle();
        if (!existingTax) {
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
      } catch { /* non-fatal */ }
    }

    // If vehicle has no MOT yet but we know the first MOT due date, create a reminder
    if (
      mode === 'create' &&
      dvsaState.status === 'success' &&
      dvsaState.noMotYet &&
      dvsaState.firstMotDueDate
    ) {
      try {
        await supabase.from('reminders').insert({
          vehicle_id: vehicleId,
          owner_id: user.id,
          type: 'mot_due',
          title: 'First MOT Due',
          description: 'This vehicle has not had its first MOT yet.',
          due_date: dvsaState.firstMotDueDate,
          status: 'pending',
          notify_days_before: [60, 30, 14, 7],
        });
      } catch {
        // Non-fatal
      }
    }

    // Auto-create reminder templates for commercial vehicles on first add
    if (mode === 'create' && vehicleClass === 'commercial') {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const todayStr = `${yyyy}-${mm}-${dd}`;
      const nextYear = `${yyyy + 1}-${mm}-${dd}`;
      const in2Years = `${yyyy + 2}-${mm}-${dd}`;
      const in5Years = `${yyyy + 5}-${mm}-${dd}`;

      const commercialReminders = [
        { type: 'mot_due',  title: 'HGV Annual MOT Due',              due_date: nextYear,  description: 'Heavy goods vehicles require an annual MOT.' },
        { type: 'custom',   title: 'Tachograph Calibration Due',       due_date: in2Years,  description: 'Tachographs must be calibrated every 2 years.' },
        { type: 'custom',   title: 'Driver CPC Renewal',               due_date: in5Years,  description: 'Driver Certificate of Professional Competence — 35 hours periodic training every 5 years.' },
        { type: 'custom',   title: 'Operator Licence Review',          due_date: nextYear,  description: 'Review operator licence compliance and documentation annually.' },
        { type: 'service_due', title: 'Annual Safety Inspection',      due_date: nextYear,  description: '6-weekly or annual safety inspection as required by DVSA.' },
      ];

      try {
        await supabase.from('reminders').insert(
          commercialReminders.map(r => ({
            vehicle_id: vehicleId,
            owner_id: user.id,
            status: 'pending',
            notify_days_before: [30, 14, 7],
            ...r,
          }))
        );
      } catch { /* non-fatal */ }
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

        {/* ── Classification first so class drives rest of form ─────────── */}
        <FormSection title="Classification">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Category" required>
              <select value={category} onChange={e => setCategory(e.target.value as VehicleCategory)} className="input-dark w-full rounded-lg px-3 py-2.5 text-sm">
                <optgroup label="Road Vehicles">
                  {ROAD_CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                </optgroup>
                <optgroup label="Non-Road">
                  {NON_ROAD_CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                </optgroup>
                <optgroup label="Commercial">
                  {COMMERCIAL_CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                </optgroup>
              </select>
            </Field>
            <Field label="Status" required>
              <select value={status} onChange={e => setStatus(e.target.value as VehicleStatus)} className="input-dark w-full rounded-lg px-3 py-2.5 text-sm">
                {ALL_STATUSES.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
              </select>
            </Field>
          </div>
          {vehicleClass === 'non_road' && (
            <div className="mt-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300">
              Non-road vehicle — DVLA lookup, MOT, insurance and tax sections are hidden.
            </div>
          )}
          {vehicleClass === 'commercial' && (
            <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
              Commercial vehicle — HGV MOT, tachograph, operator licence and Driver CPC reminders will be created automatically.
            </div>
          )}
        </FormSection>

        {/* ── DVSA Lookup — road & commercial only ──────────────────────────── */}
        {vehicleClass !== 'non_road' && <div className="glass-card rounded-xl p-6">
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
                  <div className="text-sm font-semibold text-emerald-400 mb-2">
                    {dvsaState.status === 'success' && dvsaState.noMotYet
                      ? 'Vehicle found — no MOT yet (under 3 years old)'
                      : dvsaState.status === 'success' && dvsaState.source === 'dvla-ves'
                      ? 'Vehicle found via DVLA (basic data)'
                      : 'Vehicle found — MOT history imported'}
                  </div>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs">
                    <div><span className="text-chrome-dim">Make:</span> <span className="text-chrome-bright">{dvsaState.make}</span></div>
                    <div><span className="text-chrome-dim">Model:</span> <span className="text-chrome-bright">{dvsaState.model}</span></div>
                    {dvsaState.colour && <div><span className="text-chrome-dim">Colour:</span> <span className="text-chrome-bright">{capitalise(dvsaState.colour)}</span></div>}
                    {dvsaState.fuelType && <div><span className="text-chrome-dim">Fuel:</span> <span className="text-chrome-bright">{dvsaState.fuelType}</span></div>}
                    {dvsaState.status === 'success' && dvsaState.yearOfManufacture && <div><span className="text-chrome-dim">Year:</span> <span className="text-chrome-bright">{dvsaState.yearOfManufacture}</span></div>}
                    {dvsaState.motExpiryDate && <div><span className="text-chrome-dim">MOT expiry:</span> <span className="text-chrome-bright">{dvsaState.motExpiryDate}</span></div>}
                    {dvsaState.status === 'success' && dvsaState.firstMotDueDate && !dvsaState.motExpiryDate && (
                      <div><span className="text-chrome-dim">First MOT due:</span> <span className="text-amber-400 font-medium">{dvsaState.firstMotDueDate}</span></div>
                    )}
                    {dvsaState.status === 'success' && dvsaState.taxStatus && (
                      <div className="col-span-2 flex items-center gap-2 mt-1 pt-1 border-t border-emerald-500/10">
                        <span className="text-chrome-dim">Vehicle Tax:</span>
                        <span className={`font-semibold px-2 py-0.5 rounded text-xs ${
                          dvsaState.taxStatus.toLowerCase() === 'taxed'   ? 'bg-emerald-500/20 text-emerald-400' :
                          dvsaState.taxStatus.toLowerCase() === 'sorn'    ? 'bg-amber-500/20 text-amber-400' :
                                                                            'bg-red-500/20 text-red-400'
                        }`}>{dvsaState.taxStatus}</span>
                        {dvsaState.taxDueDate && (
                          <span className="text-chrome-dim text-xs">· expires {dvsaState.taxDueDate}</span>
                        )}
                        <span className="text-chrome-muted text-xs">(will be saved automatically)</span>
                      </div>
                    )}
                    {dvsaState.mileage && <div><span className="text-chrome-dim">Last mileage:</span> <span className="text-chrome-bright">{dvsaState.mileage.toLocaleString()} mi</span></div>}
                    {dvsaState.status === 'success' && dvsaState.totalTests !== undefined && dvsaState.totalTests > 0 && <div><span className="text-chrome-dim">MOT tests:</span> <span className="text-chrome-bright">{dvsaState.totalTests} on record</span></div>}
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
              <span>Enter a UK registration and click Check — auto-fills make, colour, fuel type &amp; MOT expiry.</span>
            </div>
          )}
        </div>}

        {/* ── Identity ──────────────────────────────────────────────────────── */}
        <FormSection title="Vehicle Identity">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Make" required>
              <input value={make} onChange={e => setMake(e.target.value)} className="input-dark w-full rounded-lg px-3 py-2.5 text-sm" placeholder={vehicleClass === 'non_road' ? 'e.g. Ifor Williams' : 'e.g. Ferrari'} required />
            </Field>
            <Field label="Model" required>
              <input value={model} onChange={e => setModel(e.target.value)} className="input-dark w-full rounded-lg px-3 py-2.5 text-sm" placeholder={vehicleClass === 'non_road' ? 'e.g. LM166' : 'e.g. 488 Pista'} required />
            </Field>
            <Field label="Variant / Description">
              <input value={variant} onChange={e => setVariant(e.target.value)} className="input-dark w-full rounded-lg px-3 py-2.5 text-sm" placeholder="e.g. flatbed, 16ft" />
            </Field>
            <Field label="Year" required>
              <input type="number" value={year} onChange={e => setYear(e.target.value)} className="input-dark w-full rounded-lg px-3 py-2.5 text-sm" placeholder="2019" min={1900} max={new Date().getFullYear() + 2} required />
            </Field>
            {vehicleClass !== 'non_road' && (
              <Field label="Colour">
                <input value={colour} onChange={e => setColour(e.target.value)} className="input-dark w-full rounded-lg px-3 py-2.5 text-sm" placeholder="e.g. Rosso Corsa" />
              </Field>
            )}
            {vehicleClass !== 'non_road' && (
              <Field label="VIN / Serial Number">
                <input value={vin} onChange={e => setVin(e.target.value)} className="input-dark w-full rounded-lg px-3 py-2.5 text-sm font-mono" placeholder="17-character VIN" maxLength={17} />
              </Field>
            )}
            {vehicleClass === 'non_road' && (
              <Field label="Serial / Chassis Number">
                <input value={vin} onChange={e => setVin(e.target.value)} className="input-dark w-full rounded-lg px-3 py-2.5 text-sm font-mono" placeholder="Serial or chassis number" />
              </Field>
            )}
          </div>
        </FormSection>

        {/* ── Road/commercial only fields ───────────────────────────────────── */}
        {vehicleClass !== 'non_road' && (
          <FormSection title="Registration &amp; Engine">
            <div className="grid grid-cols-2 gap-4">
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
        )}

        {/* ── Technical — road & commercial only ───────────────────────────── */}
        {vehicleClass !== 'non_road' && <FormSection title="Technical Specifications">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Engine Size (cc)">
              <input type="number" value={engineSizeCc} onChange={e => setEngineSizeCc(e.target.value)} className="input-dark w-full rounded-lg px-3 py-2.5 text-sm" placeholder="e.g. 3902" />
            </Field>
            <Field label="Cylinders">
              <input type="number" value={cylinders} onChange={e => setCylinders(e.target.value)} className="input-dark w-full rounded-lg px-3 py-2.5 text-sm" placeholder="e.g. 8" />
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
            <Field label="Body Style">
              <input value={bodyStyle} onChange={e => setBodyStyle(e.target.value)} className="input-dark w-full rounded-lg px-3 py-2.5 text-sm" placeholder="e.g. Coupe, Roadster" />
            </Field>
            <Field label="Seats">
              <input type="number" value={seats} onChange={e => setSeats(e.target.value)} className="input-dark w-full rounded-lg px-3 py-2.5 text-sm" placeholder="e.g. 2" min={1} max={9} />
            </Field>
          </div>

          <div className="mt-4 pt-4 border-t border-white/5">
            <p className="text-xs text-chrome-muted uppercase tracking-wider mb-3">Performance</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="0–60 mph (seconds)">
                <input type="number" value={zeroToSixty} onChange={e => setZeroToSixty(e.target.value)} className="input-dark w-full rounded-lg px-3 py-2.5 text-sm" placeholder="e.g. 3.4" step="0.1" min={0} />
              </Field>
              <Field label="Top Speed (mph)">
                <input type="number" value={topSpeedMph} onChange={e => setTopSpeedMph(e.target.value)} className="input-dark w-full rounded-lg px-3 py-2.5 text-sm" placeholder="e.g. 205" />
              </Field>
              <Field label="Kerb Weight (kg)">
                <input type="number" value={kerbWeightKg} onChange={e => setKerbWeightKg(e.target.value)} className="input-dark w-full rounded-lg px-3 py-2.5 text-sm" placeholder="e.g. 1485" />
              </Field>
              <Field label="CO₂ Emissions (g/km)">
                <input type="number" value={co2Gkm} onChange={e => setCo2Gkm(e.target.value)} className="input-dark w-full rounded-lg px-3 py-2.5 text-sm" placeholder="e.g. 285" />
              </Field>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-white/5">
            <p className="text-xs text-chrome-muted uppercase tracking-wider mb-3">Dimensions</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Wheelbase (mm)">
                <input type="number" value={wheelbaseMm} onChange={e => setWheelbaseMm(e.target.value)} className="input-dark w-full rounded-lg px-3 py-2.5 text-sm" placeholder="e.g. 2650" />
              </Field>
              <Field label="Length (mm)">
                <input type="number" value={lengthMm} onChange={e => setLengthMm(e.target.value)} className="input-dark w-full rounded-lg px-3 py-2.5 text-sm" placeholder="e.g. 4500" />
              </Field>
              <Field label="Width (mm)">
                <input type="number" value={widthMm} onChange={e => setWidthMm(e.target.value)} className="input-dark w-full rounded-lg px-3 py-2.5 text-sm" placeholder="e.g. 1950" />
              </Field>
              <Field label="Height (mm)">
                <input type="number" value={heightMm} onChange={e => setHeightMm(e.target.value)} className="input-dark w-full rounded-lg px-3 py-2.5 text-sm" placeholder="e.g. 1140" />
              </Field>
            </div>
          </div>
        </FormSection>}

        {/* ── Compliance — road & commercial only ───────────────────────────── */}
        {vehicleClass !== 'non_road' && (
          <FormSection title="Compliance">
            <Field label="First MOT Due Date" hint="Auto-filled from DVLA — correct to exact date from V5C if needed">
              <input type="date" value={firstMotDueDate} onChange={e => setFirstMotDueDate(e.target.value)}
                className="input-dark w-full rounded-lg px-3 py-2.5 text-sm" />
            </Field>
            <p className="text-xs text-chrome-muted mt-1">Only set this for vehicles with no MOT history yet. Leave blank for vehicles that already have an MOT.</p>
          </FormSection>
        )}

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

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-chrome-dim mb-2 tracking-[0.06em] uppercase">
        {label}{required && <span className="text-amber-DEFAULT ml-1">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-chrome-muted mt-1">{hint}</p>}
    </div>
  );
}

function capitalise(str: string) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : str;
}
