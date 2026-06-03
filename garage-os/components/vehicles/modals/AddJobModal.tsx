'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2, ClipboardList } from 'lucide-react';
import Modal from './Modal';
import type { VehicleJob, JobPriority, JobStatus } from '@/types';

interface Props {
  vehicleId: string;
  existing?: VehicleJob;
  onClose: () => void;
  onSave: () => void;
}

const PRIORITIES: { value: JobPriority; label: string; color: string }[] = [
  { value: 'low',    label: 'Low',    color: 'border-white/20 bg-white/5 text-chrome-dim' },
  { value: 'medium', label: 'Medium', color: 'border-blue-500/30 bg-blue-500/10 text-blue-300' },
  { value: 'high',   label: 'High',   color: 'border-amber-500/30 bg-amber-500/10 text-amber-300' },
  { value: 'urgent', label: 'Urgent', color: 'border-red-500/30 bg-red-500/10 text-red-300' },
];

export default function AddJobModal({ vehicleId, existing, onClose, onSave }: Props) {
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [title, setTitle]           = useState(existing?.title ?? '');
  const [description, setDesc]      = useState(existing?.description ?? '');
  const [priority, setPriority]     = useState<JobPriority>(existing?.priority ?? 'medium');
  const [status, setStatus]         = useState<JobStatus>(existing?.status ?? 'todo');
  const [dueDate, setDueDate]       = useState(existing?.due_date ?? '');
  const [requestedBy, setReqBy]     = useState(existing?.requested_by ?? '');

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError('');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); setError('Not logged in.'); return; }

    const payload = {
      vehicle_id:   vehicleId,
      owner_id:     user.id,
      title:        title.trim(),
      description:  description.trim() || null,
      priority,
      status,
      due_date:     dueDate || null,
      requested_by: requestedBy.trim() || null,
      completed_at: status === 'done' && !existing?.completed_at ? new Date().toISOString() : (existing?.completed_at ?? null),
    };

    let err;
    if (existing) {
      ({ error: err } = await supabase.from('vehicle_jobs').update(payload).eq('id', existing.id));
    } else {
      ({ error: err } = await supabase.from('vehicle_jobs').insert(payload));
    }

    setSaving(false);
    if (err) { setError(err.message); return; }
    onSave();
    onClose();
  }

  return (
    <Modal title={existing ? 'Edit Job' : 'Add Job'} onClose={onClose}>
      <form onSubmit={handleSave} className="space-y-5">

        {/* Title */}
        <div>
          <label className="block text-xs text-chrome-dim mb-1.5 uppercase tracking-wider font-medium">Job Title *</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="input-dark w-full rounded-lg px-3 py-2 text-sm"
            placeholder="e.g. Change number plate, Paint repair, Service due"
            required
            autoFocus
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs text-chrome-dim mb-1.5 uppercase tracking-wider font-medium">Details (optional)</label>
          <textarea
            value={description}
            onChange={e => setDesc(e.target.value)}
            rows={3}
            className="input-dark w-full rounded-lg px-3 py-2 text-sm resize-none"
            placeholder="Any additional notes, parts needed, quotes, instructions…"
          />
        </div>

        {/* Priority */}
        <div>
          <label className="block text-xs text-chrome-dim mb-2 uppercase tracking-wider font-medium">Priority</label>
          <div className="grid grid-cols-4 gap-2">
            {PRIORITIES.map(p => (
              <button key={p.value} type="button" onClick={() => setPriority(p.value)}
                className={`py-2 rounded-lg border text-xs font-semibold transition-all ${
                  priority === p.value ? p.color + ' ring-1 ring-inset ring-white/20' : 'border-white/8 bg-white/3 text-chrome-muted hover:border-white/16'
                }`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Status */}
        <div>
          <label className="block text-xs text-chrome-dim mb-2 uppercase tracking-wider font-medium">Status</label>
          <div className="grid grid-cols-3 gap-2">
            {(['todo', 'in_progress', 'done'] as JobStatus[]).map(s => (
              <button key={s} type="button" onClick={() => setStatus(s)}
                className={`py-2 rounded-lg border text-xs font-medium transition-all ${
                  status === s
                    ? s === 'done' ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                      : s === 'in_progress' ? 'border-blue-500/40 bg-blue-500/15 text-blue-300'
                      : 'border-white/20 bg-white/8 text-chrome-bright'
                    : 'border-white/8 bg-white/3 text-chrome-muted hover:border-white/16'
                }`}>
                {s === 'todo' ? 'To Do' : s === 'in_progress' ? 'In Progress' : 'Done'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Due date */}
          <div>
            <label className="block text-xs text-chrome-dim mb-1.5 uppercase tracking-wider font-medium">Due Date (optional)</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
              className="input-dark w-full rounded-lg px-3 py-2 text-sm" />
          </div>

          {/* Requested by */}
          <div>
            <label className="block text-xs text-chrome-dim mb-1.5 uppercase tracking-wider font-medium">Requested By (optional)</label>
            <input type="text" value={requestedBy} onChange={e => setReqBy(e.target.value)}
              className="input-dark w-full rounded-lg px-3 py-2 text-sm"
              placeholder="Owner, Client name…" />
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">⚠ {error}</div>
        )}

        <div className="flex gap-3 pt-1">
          <button type="submit" disabled={saving || !title.trim()}
            className="btn-amber rounded-lg px-5 py-2.5 text-sm flex items-center gap-2 disabled:opacity-60">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {existing ? 'Save Changes' : 'Add Job'}
          </button>
          <button type="button" onClick={onClose} className="btn-ghost rounded-lg px-5 py-2.5 text-sm">Cancel</button>
        </div>
      </form>
    </Modal>
  );
}
