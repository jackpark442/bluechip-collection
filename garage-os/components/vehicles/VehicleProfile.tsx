'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getVehicleClass } from '@/lib/utils';
import {
  Car, Shield, FileText, Wrench, Camera, TrendingUp, Bell,
  Edit2, Trash2, ChevronLeft, Plus, ExternalLink, Download,
  CheckCircle, AlertTriangle, AlertCircle, Clock, MapPin, Key, ClipboardList, RefreshCw, Loader2
} from 'lucide-react';
import type {
  Vehicle, VehicleImage, MotRecord, InsurancePolicy, VehicleTax,
  MaintenanceRecord, Document, Reminder, Valuation, VehicleKey, KeyType, VehicleJob
} from '@/types';
import {
  formatCurrency, formatDate, formatMileage, daysUntil, getExpiryStatus,
  getExpiryBadgeColor, CATEGORY_LABELS, STATUS_LABELS, STATUS_COLORS,
  SERVICE_TYPE_LABELS, DOCUMENT_CATEGORY_LABELS, getVehicleDisplayName, formatFileSize
} from '@/lib/utils';
import MarketPricePanel from './MarketPricePanel';
import ValuationChart from './ValuationChart';
import AddMotModal from './modals/AddMotModal';
import AddInsuranceModal from './modals/AddInsuranceModal';
import AddTaxModal from './modals/AddTaxModal';
import AddMaintenanceModal from './modals/AddMaintenanceModal';
import AddDocumentModal from './modals/AddDocumentModal';
import AddKeyModal from './modals/AddKeyModal';
import ImageGallery from './ImageGallery';
import PaperworkChecklist from './PaperworkChecklist';
import MileageChart from './MileageChart';
import JobsTab from './JobsTab';
import DvlaStatusChecker from './DvlaStatusChecker';

interface Props {
  vehicle: Vehicle;
  images: VehicleImage[];
  motRecords: MotRecord[];
  insurance: InsurancePolicy[];
  taxRecords: VehicleTax[];
  maintenance: MaintenanceRecord[];
  documents: Document[];
  reminders: Reminder[];
  valuations: Valuation[];
  vehicleKeys: VehicleKey[];
  jobs: VehicleJob[];
}

const TABS = [
  { id: 'overview', label: 'Overview', icon: Car },
  { id: 'compliance', label: 'Compliance', icon: Shield },
  { id: 'maintenance', label: 'Maintenance', icon: Wrench },
  { id: 'jobs', label: 'Jobs', icon: ClipboardList },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'gallery', label: 'Gallery', icon: Camera },
  { id: 'valuation', label: 'Valuation', icon: TrendingUp },
];

export default function VehicleProfile(props: Props) {
  const { vehicle, images, motRecords, insurance, taxRecords, maintenance, documents, reminders, valuations, vehicleKeys, jobs } = props;
  const [tab, setTab] = useState('overview');
  const [showAddMot, setShowAddMot] = useState(false);
  const [showAddIns, setShowAddIns] = useState(false);
  const [showAddTax, setShowAddTax] = useState(false);
  const [showAddMaint, setShowAddMaint] = useState(false);
  const [showAddDoc, setShowAddDoc] = useState(false);
  const [showAddKey, setShowAddKey] = useState(false);
  const [editingKey, setEditingKey] = useState<VehicleKey | undefined>();
  const router = useRouter();
  const supabase = createClient();

  const latestMot = motRecords.find(m => m.result === 'pass') ?? motRecords[0];
  const latestIns = insurance[0];
  const latestTax = taxRecords[0];
  const firstMotDue = !latestMot ? vehicle.first_mot_due_date : undefined;
  const motStatus = latestMot ? getExpiryStatus(latestMot.expiry_date) : firstMotDue ? getExpiryStatus(firstMotDue) : 'expired';
  const insStatus = getExpiryStatus(latestIns?.end_date);
  const isSorn = latestTax?.is_exempt && latestTax?.exemption_reason === 'SORN';
  const taxStatus = isSorn ? 'warning' : latestTax?.is_exempt ? 'ok' : getExpiryStatus(latestTax?.end_date);
  const totalMaintenanceCost = maintenance.reduce((s, m) => s + (m.total_cost || 0), 0);

  async function handleDelete() {
    if (!confirm('Delete this vehicle and all its records? This cannot be undone.')) return;
    await supabase.from('vehicles').delete().eq('id', vehicle.id);
    router.push('/vehicles');
  }

  function refresh() { router.refresh(); }

  return (
    <div className="space-y-6">
      {/* Back + actions bar */}
      <div className="flex items-center justify-between">
        <Link href="/vehicles" className="flex items-center gap-2 text-chrome-dim hover:text-chrome-bright transition-colors text-sm">
          <ChevronLeft className="w-4 h-4" /> Back to Fleet
        </Link>
        <div className="flex gap-2">
          <Link href={`/vehicles/${vehicle.id}/edit`} className="btn-ghost rounded-lg px-4 py-2 text-sm flex items-center gap-2">
            <Edit2 className="w-4 h-4" /> Edit
          </Link>
          <button onClick={handleDelete} className="rounded-lg px-4 py-2 text-sm flex items-center gap-2 border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors">
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      </div>

      {/* Hero */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="relative h-56 md:h-72">
          {vehicle.cover_image_url ? (
            <img src={vehicle.cover_image_url} alt={getVehicleDisplayName(vehicle)} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full carbon-bg flex items-center justify-center">
              <Car className="w-20 h-20 text-chrome-muted opacity-20" />
            </div>
          )}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(10,10,15,0.95) 30%, rgba(10,10,15,0.3) 70%, transparent 100%)' }} />
          <div className="absolute bottom-6 left-8">
            <div className="flex items-center gap-3 mb-2">
              <span className={`status-badge ${STATUS_COLORS[vehicle.status]}`}>{STATUS_LABELS[vehicle.status]}</span>
              <span className="text-xs text-chrome-dim bg-obsidian-800/80 px-2 py-1 rounded">{CATEGORY_LABELS[vehicle.category]}</span>
            </div>
            <h1 className="font-display text-3xl md:text-4xl text-chrome-bright font-bold">{vehicle.make} {vehicle.model}</h1>
            {vehicle.variant && <div className="text-chrome-dim mt-1">{vehicle.variant}</div>}
            <div className="flex items-center gap-4 mt-3 text-sm text-chrome-dim">
              <span>{vehicle.year}</span>
              {vehicle.registration && <span className="font-mono text-chrome-bright">{vehicle.registration.toUpperCase()}</span>}
              {vehicle.colour && <span>{vehicle.colour}</span>}
              {vehicle.mileage > 0 && <span>{formatMileage(vehicle.mileage)}</span>}
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 border-t border-white/5 overflow-x-auto">
          {[
            { label: 'Current Value', value: formatCurrency(vehicle.current_value), accent: true },
            { label: 'Purchase Price', value: formatCurrency(vehicle.purchase_price) },
            { label: 'Maintenance Total', value: formatCurrency(totalMaintenanceCost) },
            { label: 'Engine', value: vehicle.engine_size_cc ? `${(vehicle.engine_size_cc / 1000).toFixed(1)}L` + (vehicle.horsepower ? ` · ${vehicle.horsepower}hp` : '') : '—' },
          ].map(({ label, value, accent }) => (
            <div key={label} className="px-6 py-4 border-r border-white/5 last:border-0">
              <div className="text-xs text-chrome-dim uppercase tracking-wider mb-1">{label}</div>
              <div className={`font-display text-xl ${accent ? 'text-amber-DEFAULT' : 'text-chrome-bright'}`}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Compliance summary — road & commercial only */}
      {getVehicleClass(vehicle.category) !== 'non_road' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <ComplianceCard label={getVehicleClass(vehicle.category) === 'commercial' ? 'Annual MOT' : 'MOT'} status={motStatus}
            date={latestMot?.expiry_date ?? firstMotDue}
            days={daysUntil(latestMot?.expiry_date ?? firstMotDue)}
            onAdd={() => setShowAddMot(true)}
            provider={latestMot?.test_centre ?? (firstMotDue ? 'First MOT due' : undefined)} />
          <ComplianceCard label="Insurance" status={insStatus}
            date={latestIns?.end_date} days={daysUntil(latestIns?.end_date)}
            onAdd={() => setShowAddIns(true)} provider={latestIns?.provider} />
          <ComplianceCard label="Vehicle Tax" status={taxStatus}
            date={isSorn ? latestTax?.end_date : latestTax?.is_exempt ? undefined : latestTax?.end_date}
            days={latestTax?.is_exempt && !isSorn ? null : daysUntil(latestTax?.end_date)}
            onAdd={() => setShowAddTax(true)}
            provider={isSorn ? 'SORN' : latestTax?.is_exempt ? 'Tax Exempt' : undefined}
            exempt={latestTax?.is_exempt && !isSorn}
            sorn={isSorn} />
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-white/5">
        <div className="flex gap-1 overflow-x-auto scrollbar-none">
          {TABS.map(({ id, label, icon: Icon }) => {
            const openJobs = id === 'jobs' ? jobs.filter(j => j.status !== 'done').length : 0;
            return (
              <button key={id} onClick={() => setTab(id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 -mb-px ${
                  tab === id ? 'border-amber-DEFAULT text-amber-DEFAULT' : 'border-transparent text-chrome-dim hover:text-chrome-bright'
                }`}>
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{label}</span>
                {id === 'jobs' && openJobs > 0 && (
                  <span className="text-[10px] font-bold bg-amber-DEFAULT text-obsidian-900 rounded-full w-4 h-4 flex items-center justify-center leading-none">
                    {openJobs}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="min-h-[400px]">
        {tab === 'overview' && <OverviewTab vehicle={vehicle} reminders={reminders} vehicleKeys={vehicleKeys} motRecords={motRecords} onRefresh={refresh} onAddKey={() => setShowAddKey(true)} onEditKey={k => { setEditingKey(k); setShowAddKey(true); }} />}
        {tab === 'compliance' && (
          <ComplianceTab motRecords={motRecords} insurance={insurance} taxRecords={taxRecords}
            onAddMot={() => setShowAddMot(true)} onAddIns={() => setShowAddIns(true)} onAddTax={() => setShowAddTax(true)}
            vehicleId={vehicle.id} registration={vehicle.registration} onRefresh={refresh} />
        )}
        {tab === 'maintenance' && (
          <MaintenanceTab records={maintenance} onAdd={() => setShowAddMaint(true)} vehicleId={vehicle.id} onRefresh={refresh} />
        )}
        {tab === 'jobs' && (
          <JobsTab jobs={jobs} vehicleId={vehicle.id} onRefresh={refresh} />
        )}
        {tab === 'documents' && (
          <DocumentsTab documents={documents} onAdd={() => setShowAddDoc(true)} />
        )}
        {tab === 'gallery' && (
          <ImageGallery images={images} vehicleId={vehicle.id} onRefresh={refresh} />
        )}
        {tab === 'valuation' && (
          <ValuationTab valuations={valuations} vehicle={vehicle} maintenance={maintenance} onRefresh={refresh} />
        )}
      </div>

      {/* Modals */}
      {showAddMot && <AddMotModal vehicleId={vehicle.id} onClose={() => setShowAddMot(false)} onSave={refresh} />}
      {showAddIns && <AddInsuranceModal vehicleId={vehicle.id} onClose={() => setShowAddIns(false)} onSave={refresh} />}
      {showAddTax && <AddTaxModal vehicleId={vehicle.id} onClose={() => setShowAddTax(false)} onSave={refresh} />}
      {showAddMaint && <AddMaintenanceModal vehicleId={vehicle.id} onClose={() => setShowAddMaint(false)} onSave={refresh} />}
      {showAddDoc && <AddDocumentModal vehicleId={vehicle.id} onClose={() => setShowAddDoc(false)} onSave={refresh} />}
      {showAddKey && (
        <AddKeyModal
          vehicleId={vehicle.id}
          existing={editingKey}
          onClose={() => { setShowAddKey(false); setEditingKey(undefined); }}
          onSave={refresh}
        />
      )}
    </div>
  );
}

// ─── Compliance Card ──────────────────────────────────────
function ComplianceCard({ label, status, date, days, onAdd, provider, exempt, sorn }: {
  label: string; status: string; date?: string; days: number | null;
  onAdd: () => void; provider?: string; exempt?: boolean; sorn?: boolean;
}) {
  const Icon = exempt ? CheckCircle : sorn ? AlertTriangle : status === 'ok' ? CheckCircle : status === 'warning' ? Clock : AlertTriangle;
  const iconColor = sorn ? 'text-amber-400' : status === 'ok' || exempt ? 'text-emerald-400' : status === 'warning' ? 'text-amber-400' : 'text-red-400';
  const bgColor = sorn ? 'bg-amber-500/10 border-amber-500/20' : status === 'ok' || exempt ? 'bg-emerald-500/10 border-emerald-500/20' : status === 'warning' ? 'bg-amber-500/10 border-amber-500/20' : 'bg-red-500/10 border-red-500/20';

  return (
    <div className={`glass-card rounded-xl p-5 border ${bgColor}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-chrome-dim mb-1">{label}</div>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <button onClick={onAdd} className="w-7 h-7 rounded-lg btn-ghost flex items-center justify-center">
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
      {sorn ? (
        <>
          <div className="text-sm text-amber-400 font-bold">SORN</div>
          {date && <div className="text-xs text-chrome-dim mt-1">Declared {formatDate(date)}</div>}
        </>
      ) : exempt ? (
        <div className="text-sm text-blue-400 font-medium">Exempt</div>
      ) : date ? (
        <>
          <div className="font-display text-lg text-chrome-bright">{formatDate(date)}</div>
          <div className={`text-sm mt-1 ${days !== null && days < 0 ? 'text-red-400' : days !== null && days <= 30 ? 'text-amber-400' : 'text-chrome-dim'}`}>
            {days === null ? '' : days < 0 ? `${Math.abs(days)} days overdue` : days === 0 ? 'Expires today' : `${days} days remaining`}
          </div>
        </>
      ) : (
        <div className="text-sm text-chrome-muted">Not recorded</div>
      )}
      {provider && <div className="text-xs text-chrome-dim mt-2">{provider}</div>}
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────
function OverviewTab({ vehicle: v, reminders, vehicleKeys, motRecords, onRefresh, onAddKey, onEditKey }: {
  vehicle: Vehicle;
  reminders: Reminder[];
  vehicleKeys: VehicleKey[];
  motRecords: MotRecord[];
  onRefresh: () => void;
  onAddKey: () => void;
  onEditKey: (k: VehicleKey) => void;
}) {
  const specs = [
    { label: 'Engine',       value: v.engine_size_cc ? `${(v.engine_size_cc / 1000).toFixed(1)}L` : null },
    { label: 'Power',        value: v.horsepower ? `${v.horsepower} hp` : null },
    { label: 'Torque',       value: v.torque_nm ? `${v.torque_nm} Nm` : null },
    { label: 'Transmission', value: v.transmission },
    { label: 'Drive',        value: v.drive_type },
    { label: 'Fuel',         value: v.fuel_type?.replace('_', ' ') },
    { label: 'Colour',       value: v.colour },
    { label: 'VIN',          value: v.vin },
  ].filter(s => s.value);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-5">
        {/* Tech specs */}
        <div className="glass-card rounded-xl p-6">
          <h3 className="font-display text-lg text-chrome-bright mb-5">Technical Specifications</h3>
          {specs.length === 0 ? (
            <p className="text-chrome-dim text-sm">No specifications recorded</p>
          ) : (
            <div className="space-y-0">
              {specs.map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between py-2 border-b border-white/4 last:border-0">
                  <span className="text-sm text-chrome-dim">{label}</span>
                  <span className="text-sm text-chrome-bright font-mono">{value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* MOT mileage projection */}
        <MileageChart motRecords={motRecords} currentMileage={v.mileage} purchaseDate={v.purchase_date} />
      </div>

      <div className="space-y-5">
        <div className="glass-card rounded-xl p-6">
          <h3 className="font-display text-lg text-chrome-bright mb-5">Purchase History</h3>
          <div className="space-y-3">
            {[
              { label: 'Purchase Date', value: formatDate(v.purchase_date) },
              { label: 'Purchase Price', value: formatCurrency(v.purchase_price) },
              { label: 'Current Value', value: formatCurrency(v.current_value) },
              { label: 'Last Valued', value: formatDate(v.last_valued_date) },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between py-2 border-b border-white/4 last:border-0">
                <span className="text-sm text-chrome-dim">{label}</span>
                <span className="text-sm text-chrome-bright">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {reminders.length > 0 && (
          <div className="glass-card rounded-xl p-6">
            <h3 className="font-display text-base text-chrome-bright mb-4">Active Reminders</h3>
            <div className="space-y-2">
              {reminders.map(r => {
                const days = daysUntil(r.due_date);
                return (
                  <div key={r.id} className="flex items-center justify-between">
                    <span className="text-sm text-chrome-dim">{r.title}</span>
                    <span className={`text-xs font-mono ${days !== null && days < 0 ? 'text-red-400' : days !== null && days <= 7 ? 'text-red-400' : 'text-amber-400'}`}>
                      {days === null ? '?' : days < 0 ? `${Math.abs(days)}d late` : `${days}d`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {v.notes && (
          <div className="glass-card rounded-xl p-6">
            <h3 className="font-display text-base text-chrome-bright mb-3">Notes</h3>
            <p className="text-sm text-chrome-dim leading-relaxed whitespace-pre-wrap">{v.notes}</p>
          </div>
        )}

        <KeysCard keys={vehicleKeys} onAdd={onAddKey} onEdit={onEditKey} vehicleId={v.id} onRefresh={onRefresh} />

        <PaperworkChecklist vehicle={v} onRefresh={onRefresh} />

        <LocationCard vehicle={v} onRefresh={onRefresh} />
      </div>

    </div>
  );
}

// ─── Keys Card ───────────────────────────────────────────
const KEY_TYPE_LABELS: Record<KeyType, string> = {
  main: 'Main', spare: 'Spare', valet: 'Valet', other: 'Other',
};
const KEY_TYPE_COLORS: Record<KeyType, string> = {
  main: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  spare: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  valet: 'bg-purple-500/15 text-purple-400 border-purple-500/25',
  other: 'bg-white/8 text-chrome-dim border-white/10',
};

function KeysCard({ keys, onAdd, onEdit, vehicleId, onRefresh }: {
  keys: VehicleKey[];
  onAdd: () => void;
  onEdit: (k: VehicleKey) => void;
  vehicleId: string;
  onRefresh: () => void;
}) {
  const supabase = createClient();

  async function handleDelete(id: string) {
    if (!confirm('Remove this key record?')) return;
    await supabase.from('vehicle_keys').delete().eq('id', id);
    onRefresh();
  }

  return (
    <div className="glass-card rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-amber-DEFAULT" />
          <h3 className="font-display text-base text-chrome-bright">Keys</h3>
          {keys.length > 0 && (
            <span className="text-xs bg-amber-DEFAULT/10 text-amber-DEFAULT px-2 py-0.5 rounded-full font-mono">
              {keys.length}
            </span>
          )}
        </div>
        <button onClick={onAdd}
          className="btn-ghost rounded-lg px-3 py-1.5 text-xs flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Add Key
        </button>
      </div>

      {keys.length === 0 ? (
        <p className="text-sm text-chrome-dim">No keys recorded — click "Add Key" to start tracking.</p>
      ) : (
        <div className="space-y-2">
          {keys.map(k => (
            <div key={k.id}
              className="flex items-center gap-3 py-2.5 px-3 rounded-lg bg-white/3 border border-white/5 hover:border-white/10 transition-colors group">
              <Key className="w-4 h-4 text-chrome-muted shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded border font-medium ${KEY_TYPE_COLORS[k.key_type]}`}>
                    {KEY_TYPE_LABELS[k.key_type]}
                  </span>
                  {k.label && (
                    <span className="text-sm text-chrome-bright truncate">{k.label}</span>
                  )}
                </div>
                {k.location && (
                  <div className="text-xs text-chrome-dim mt-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {k.location}
                  </div>
                )}
                {k.notes && (
                  <div className="text-xs text-chrome-muted mt-0.5">{k.notes}</div>
                )}
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button onClick={() => onEdit(k)}
                  className="w-7 h-7 rounded btn-ghost flex items-center justify-center text-chrome-dim hover:text-chrome-bright">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDelete(k.id)}
                  className="w-7 h-7 rounded btn-ghost flex items-center justify-center text-chrome-dim hover:text-red-400">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Location Card ────────────────────────────────────────
function LocationCard({ vehicle, onRefresh }: { vehicle: Vehicle; onRefresh: () => void }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [location, setLocation] = useState<{ name: string; address: string; lat: number; lng: number } | null>(
    vehicle.location_lat && vehicle.location_lng ? {
      name: (vehicle as any).location_name || '',
      address: (vehicle as any).location_address || '',
      lat: (vehicle as any).location_lat,
      lng: (vehicle as any).location_lng,
    } : null
  );

  async function saveLocation() {
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('vehicles').update({
      location_name: location?.name || null,
      location_address: location?.address || null,
      location_lat: location?.lat || null,
      location_lng: location?.lng || null,
    }).eq('id', vehicle.id).eq('owner_id', user.id);
    setSaving(false);
    setEditing(false);
    onRefresh();
  }

  return (
    <div className="glass-card rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-base text-chrome-bright">Location</h3>
        <button onClick={() => setEditing(!editing)}
          className="btn-ghost rounded-lg px-3 py-1.5 text-xs flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5" />
          {editing ? 'Cancel' : location ? 'Edit' : 'Set Location'}
        </button>
      </div>

      {editing ? (
        <div className="space-y-3">
          <LocationPickerDynamic value={location} onChange={setLocation} />
          <button onClick={saveLocation} disabled={saving || !location}
            className="btn-amber rounded-lg px-4 py-2 text-sm w-full disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Location'}
          </button>
        </div>
      ) : location ? (
        <div className="flex items-start gap-3">
          <MapPin className="w-4 h-4 text-amber-DEFAULT shrink-0 mt-0.5" />
          <div>
            <div className="text-sm text-chrome-bright font-medium">{location.name}</div>
            <div className="text-xs text-chrome-dim mt-0.5">{location.address}</div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-chrome-dim">No location set — click "Set Location" to add one.</p>
      )}
    </div>
  );
}

// Lazy load LocationPicker to avoid SSR issues with mapbox
function LocationPickerDynamic(props: any) {
  const [mounted, setMounted] = useState(false);
  const [Component, setComponent] = useState<any>(null);
  useState(() => {
    setMounted(true);
    import('./LocationPicker').then(m => setComponent(() => m.default));
  });
  if (!mounted || !Component) return <div className="text-sm text-chrome-dim py-4 text-center">Loading map...</div>;
  return <Component {...props} />;
}

// ─── Compliance Tab ───────────────────────────────────────
function ComplianceTab({ motRecords, insurance, taxRecords, onAddMot, onAddIns, onAddTax, vehicleId, registration, onRefresh }: any) {
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  async function syncMot() {
    if (!registration) { setSyncMsg('No registration set on this vehicle.'); return; }
    setSyncing(true);
    setSyncMsg('');
    try {
      const res = await fetch('/api/mot/sync', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ vehicleId, registration }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSyncMsg(`Error: ${data.error ?? 'Sync failed'}`);
      } else {
        setSyncMsg(`✓ Synced ${data.dvsa?.totalTests ?? 0} tests (${data.imported ?? 0} new)`);
        onRefresh();
      }
    } catch {
      setSyncMsg('Network error — please try again');
    }
    setSyncing(false);
  }

  return (
    <div className="space-y-8">
      {/* MOT */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg text-chrome-bright">MOT History</h3>
          <div className="flex items-center gap-2">
            {registration && (
              <button onClick={syncMot} disabled={syncing}
                className="btn-ghost rounded-lg px-3 py-2 text-xs flex items-center gap-1.5 disabled:opacity-60">
                {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                {syncing ? 'Syncing…' : 'Sync DVSA'}
              </button>
            )}
            <button onClick={onAddMot} className="btn-ghost rounded-lg px-3 py-2 text-xs flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Add MOT
            </button>
          </div>
        </div>
        {syncMsg && (
          <div className={`mb-4 px-4 py-2.5 rounded-lg text-xs ${syncMsg.startsWith('✓') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
            {syncMsg}
          </div>
        )}
        {motRecords.length === 0 ? (
          <EmptySection message="No MOT records" action={onAddMot} actionLabel="Add MOT" />
        ) : (
          <div className="glass-card rounded-xl overflow-x-auto">
            <table className="w-full data-table min-w-[540px]">
              <thead><tr><th>Expiry</th><th>Test Date</th><th>Result</th><th>Mileage</th><th>Certificate</th><th>Centre</th></tr></thead>
              <tbody>
                {motRecords.map((m: MotRecord) => (
                  <tr key={m.id}>
                    <td className="font-mono">{formatDate(m.expiry_date)}</td>
                    <td>{formatDate(m.test_date)}</td>
                    <td>
                      <span className={`status-badge ${m.result === 'pass' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : m.result === 'fail' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'}`}>
                        {m.result}
                      </span>
                    </td>
                    <td>{formatMileage(m.mileage_at_test)}</td>
                    <td className="font-mono text-xs">{m.certificate_number || '—'}</td>
                    <td>{m.test_centre || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Insurance */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg text-chrome-bright">Insurance Policies</h3>
          <div className="flex items-center gap-2">
            <a
              href={`https://ownvehicle.askmid.com/?vrm=${encodeURIComponent((registration ?? '').replace(/\s+/g, ''))}`}
              target="_blank"
              rel="noreferrer"
              className="btn-ghost rounded-lg px-3 py-2 text-xs flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Check MID
            </a>
            <button onClick={onAddIns} className="btn-ghost rounded-lg px-3 py-2 text-xs flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Add Policy
            </button>
          </div>
        </div>
        {insurance.length === 0 ? (
          <EmptySection message="No insurance records" action={onAddIns} actionLabel="Add Policy" />
        ) : (
          <div className="glass-card rounded-xl overflow-x-auto">
            <table className="w-full data-table min-w-[540px]">
              <thead><tr><th>Provider</th><th>Policy No.</th><th>Start</th><th>End</th><th>Premium</th><th>Agreed Value</th></tr></thead>
              <tbody>
                {insurance.map((i: InsurancePolicy) => (
                  <tr key={i.id}>
                    <td className="font-medium">{i.provider}</td>
                    <td className="font-mono text-xs">{i.policy_number || '—'}</td>
                    <td>{formatDate(i.start_date)}</td>
                    <td><span className={getExpiryBadgeColor(getExpiryStatus(i.end_date))}>{formatDate(i.end_date)}</span></td>
                    <td className="font-mono">{formatCurrency(i.annual_premium)}</td>
                    <td className="font-mono">{formatCurrency(i.agreed_value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Tax */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg text-chrome-bright">Vehicle Tax</h3>
          <button onClick={onAddTax} className="btn-ghost rounded-lg px-3 py-2 text-xs flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Add Tax
          </button>
        </div>
        <div className="mb-4">
          <DvlaStatusChecker registration={registration} vehicleId={vehicleId} onSaved={onRefresh} />
        </div>
        {taxRecords.length === 0 ? (
          <EmptySection message="No tax records" action={onAddTax} actionLabel="Add Tax Record" />
        ) : (
          <div className="glass-card rounded-xl overflow-x-auto">
            <table className="w-full data-table min-w-[400px]">
              <thead><tr><th>Start</th><th>End</th><th>Amount</th><th>Reference</th><th>Status</th></tr></thead>
              <tbody>
                {taxRecords.map((t: VehicleTax) => (
                  <tr key={t.id}>
                    <td>{formatDate(t.start_date)}</td>
                    <td>{t.is_exempt ? <span className="text-blue-400">Exempt</span> : formatDate(t.end_date)}</td>
                    <td className="font-mono">{t.is_exempt ? '—' : formatCurrency(t.amount)}</td>
                    <td className="font-mono text-xs">{t.reference || '—'}</td>
                    <td>
                      {t.is_exempt ? (
                        <span className="status-badge bg-blue-500/20 text-blue-400 border-blue-500/30">Exempt</span>
                      ) : (
                        <span className={`status-badge ${getExpiryBadgeColor(getExpiryStatus(t.end_date))}`}>
                          {getExpiryStatus(t.end_date)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

// ─── Maintenance Tab ──────────────────────────────────────
function MaintenanceTab({ records, onAdd, vehicleId, onRefresh }: any) {
  const supabase = createClient();
  const totalCost = records.reduce((s: number, r: MaintenanceRecord) => s + (r.total_cost || 0), 0);

  async function handleDelete(id: string) {
    if (!confirm('Delete this service record? This cannot be undone.')) return;
    await supabase.from('maintenance_records').delete().eq('id', id);
    onRefresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="text-sm text-chrome-dim">
          {records.length} records · Total: <span className="text-amber-DEFAULT font-mono">{formatCurrency(totalCost)}</span>
        </div>
        <button onClick={onAdd} className="btn-amber rounded-lg px-4 py-2 text-sm flex items-center gap-2">
          <Plus className="w-4 h-4" /> Log Service
        </button>
      </div>

      {records.length === 0 ? (
        <EmptySection message="No maintenance records" action={onAdd} actionLabel="Log Service" />
      ) : (
        <div className="space-y-3">
          {records.map((m: MaintenanceRecord) => (
            <div key={m.id} className="glass-card rounded-xl p-5 group">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <span className="text-xs bg-amber-DEFAULT/10 text-amber-DEFAULT px-2 py-0.5 rounded font-medium">
                      {SERVICE_TYPE_LABELS[m.service_type]}
                    </span>
                    <span className="text-xs text-chrome-dim">{formatDate(m.service_date)}</span>
                    {m.mileage_at_service && <span className="text-xs text-chrome-dim font-mono">{formatMileage(m.mileage_at_service)}</span>}
                  </div>
                  <h4 className="text-chrome-bright font-medium mb-1">{m.title}</h4>
                  {m.description && <p className="text-sm text-chrome-dim">{m.description}</p>}
                  <div className="flex gap-4 mt-2 text-xs text-chrome-dim flex-wrap">
                    {m.workshop && <span>🔧 {m.workshop}</span>}
                    {m.next_service_date && <span>Next: {formatDate(m.next_service_date)}</span>}
                    {m.invoice_number && <span className="font-mono">#{m.invoice_number}</span>}
                  </div>
                </div>
                <div className="flex items-start gap-3 shrink-0">
                  <div className="text-right">
                    <div className="font-display text-lg text-chrome-bright">{formatCurrency(m.total_cost)}</div>
                    {(m.labour_cost > 0 || m.parts_cost > 0) && (
                      <div className="text-xs text-chrome-dim mt-1">
                        L: {formatCurrency(m.labour_cost)} / P: {formatCurrency(m.parts_cost)}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(m.id)}
                    className="w-8 h-8 rounded-lg btn-ghost flex items-center justify-center text-chrome-muted hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100 mt-0.5"
                    title="Delete record"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Documents Tab ────────────────────────────────────────
function DocumentsTab({ documents, onAdd }: { documents: Document[]; onAdd: () => void }) {
  const grouped = documents.reduce((acc: Record<string, Document[]>, doc) => {
    if (!acc[doc.category]) acc[doc.category] = [];
    acc[doc.category].push(doc);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button onClick={onAdd} className="btn-amber rounded-lg px-4 py-2 text-sm flex items-center gap-2">
          <Plus className="w-4 h-4" /> Upload Document
        </button>
      </div>

      {documents.length === 0 ? (
        <EmptySection message="No documents uploaded" action={onAdd} actionLabel="Upload Document" />
      ) : (
        Object.entries(grouped).map(([cat, docs]) => (
          <div key={cat}>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-chrome-dim mb-3">
              {DOCUMENT_CATEGORY_LABELS[cat as keyof typeof DOCUMENT_CATEGORY_LABELS] || cat}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {docs.map(doc => (
                <div key={doc.id} className="glass-card rounded-xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-DEFAULT/10 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-amber-DEFAULT" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-chrome-bright truncate">{doc.title}</div>
                    <div className="text-xs text-chrome-dim mt-0.5">{doc.file_name} · {doc.file_size ? formatFileSize(doc.file_size) : ''}</div>
                    <div className="text-xs text-chrome-dim">{formatDate(doc.created_at)}</div>
                  </div>
                  <a href={doc.public_url} target="_blank" rel="noreferrer"
                    className="w-8 h-8 rounded-lg btn-ghost flex items-center justify-center shrink-0">
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ─── Valuation Tab ────────────────────────────────────────
function ValuationTab({ valuations, vehicle, maintenance, onRefresh }: { valuations: Valuation[]; vehicle: Vehicle; maintenance: MaintenanceRecord[]; onRefresh: () => void }) {
  const supabase = createClient();
  const [adding, setAdding] = useState(false);
  const [value, setValue] = useState('');
  const [source, setSource] = useState('');
  const [loading, setLoading] = useState(false);

  const totalMaintenance = maintenance.reduce((s, r) => s + (r.total_cost || 0), 0);
  const totalInvested = (vehicle.purchase_price || 0) + totalMaintenance;
  const gainLoss = vehicle.current_value && totalInvested ? vehicle.current_value - totalInvested : null;
  const roi = gainLoss !== null && totalInvested > 0 ? (gainLoss / totalInvested) * 100 : null;

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('valuations').insert({
      vehicle_id: vehicle.id, owner_id: user.id,
      value: parseFloat(value), source,
      valuation_date: new Date().toISOString().split('T')[0],
    });
    // Also update vehicle current_value
    await supabase.from('vehicles').update({ current_value: parseFloat(value), last_valued_date: new Date().toISOString().split('T')[0] }).eq('id', vehicle.id);
    setAdding(false); setValue(''); setSource(''); setLoading(false);
    onRefresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-chrome-dim">Current estimated value</div>
          <div className="font-display text-3xl text-amber-DEFAULT mt-1">{formatCurrency(vehicle.current_value)}</div>
        </div>
        <button onClick={() => setAdding(!adding)} className="btn-ghost rounded-lg px-4 py-2 text-sm flex items-center gap-2">
          <Plus className="w-4 h-4" /> Record Valuation
        </button>
      </div>

      {/* ROI breakdown */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card rounded-lg p-4 bg-white/2">
          <div className="text-[10px] text-chrome-muted uppercase tracking-wider mb-1">Purchase Price</div>
          <div className="font-display text-lg text-chrome-bright">{formatCurrency(vehicle.purchase_price)}</div>
        </div>
        <div className="glass-card rounded-lg p-4 bg-white/2">
          <div className="text-[10px] text-chrome-muted uppercase tracking-wider mb-1">Maintenance Spend</div>
          <div className="font-display text-lg text-chrome-bright">{formatCurrency(totalMaintenance)}</div>
          <div className="text-xs text-chrome-dim mt-0.5">{maintenance.length} records</div>
        </div>
        <div className="glass-card rounded-lg p-4 bg-white/2">
          <div className="text-[10px] text-chrome-muted uppercase tracking-wider mb-1">Total Invested</div>
          <div className="font-display text-lg text-chrome-bright">{formatCurrency(totalInvested)}</div>
        </div>
      </div>

      {gainLoss !== null && (
        <div className={`rounded-xl p-4 flex items-center justify-between ${gainLoss >= 0 ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
          <div>
            <div className="text-xs uppercase tracking-wider mb-1 text-chrome-dim">True Gain / Loss after all costs</div>
            <div className={`font-display text-2xl ${gainLoss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {gainLoss >= 0 ? '+' : ''}{formatCurrency(gainLoss)}
            </div>
          </div>
          {roi !== null && (
            <div className="text-right">
              <div className="text-xs text-chrome-dim mb-1">ROI</div>
              <div className={`font-display text-3xl font-bold ${roi >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {roi >= 0 ? '+' : ''}{roi.toFixed(1)}%
              </div>
            </div>
          )}
        </div>
      )}

      {adding && (
        <form onSubmit={handleAdd} className="glass-card rounded-xl p-5 space-y-4">
          <h4 className="font-display text-base text-chrome-bright">New Valuation</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-chrome-dim mb-2 uppercase tracking-wider">Value (£)</label>
              <input type="number" value={value} onChange={e => setValue(e.target.value)}
                className="input-dark w-full rounded-lg px-3 py-2 text-sm" placeholder="0" required />
            </div>
            <div>
              <label className="block text-xs text-chrome-dim mb-2 uppercase tracking-wider">Source</label>
              <input type="text" value={source} onChange={e => setSource(e.target.value)}
                className="input-dark w-full rounded-lg px-3 py-2 text-sm" placeholder="e.g. Hagerty, AutoTrader" />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={loading} className="btn-amber rounded-lg px-4 py-2 text-sm">Save</button>
            <button type="button" onClick={() => setAdding(false)} className="btn-ghost rounded-lg px-4 py-2 text-sm">Cancel</button>
          </div>
        </form>
      )}

      <ValuationChart
        valuations={valuations}
        purchasePrice={vehicle.purchase_price}
        purchaseDate={vehicle.purchase_date}
        currentValue={vehicle.current_value}
      />

      <MarketPricePanel
        make={vehicle.make}
        model={vehicle.model}
        year={vehicle.year}
        currentValue={vehicle.current_value}
        vehicleId={vehicle.id}
        engineSizeCc={vehicle.engine_size_cc}
        mileage={vehicle.mileage}
        onValueUpdate={onRefresh}
      />

      {valuations.length > 0 ? (
        <div className="glass-card rounded-xl overflow-hidden">
          <table className="w-full data-table">
            <thead><tr><th>Date</th><th>Value</th><th>Source</th><th>Notes</th></tr></thead>
            <tbody>
              {valuations.map(v => (
                <tr key={v.id}>
                  <td>{formatDate(v.valuation_date)}</td>
                  <td className="font-mono font-semibold text-amber-DEFAULT">{formatCurrency(v.value)}</td>
                  <td>{v.source || '—'}</td>
                  <td className="text-chrome-dim">{v.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptySection message="No valuation history" />
      )}
    </div>
  );
}

function EmptySection({ message, action, actionLabel }: { message: string; action?: () => void; actionLabel?: string }) {
  return (
    <div className="glass-card rounded-xl p-12 text-center">
      <p className="text-chrome-dim mb-4">{message}</p>
      {action && actionLabel && (
        <button onClick={action} className="btn-ghost rounded-lg px-4 py-2 text-sm inline-flex items-center gap-2">
          <Plus className="w-4 h-4" /> {actionLabel}
        </button>
      )}
    </div>
  );
}
