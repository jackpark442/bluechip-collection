'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Plus, Edit2, Trash2, CheckCircle2, Circle, Clock, AlertTriangle, User, CalendarDays, ClipboardList
} from 'lucide-react';
import type { VehicleJob, JobPriority, JobStatus } from '@/types';
import { formatDate, daysUntil } from '@/lib/utils';
import AddJobModal from './modals/AddJobModal';

interface Props {
  jobs: VehicleJob[];
  vehicleId: string;
  onRefresh: () => void;
}

const PRIORITY_CONFIG: Record<JobPriority, { label: string; badge: string; dot: string }> = {
  low:    { label: 'Low',    badge: 'bg-white/8 text-chrome-dim border-white/10',          dot: 'bg-white/30' },
  medium: { label: 'Medium', badge: 'bg-blue-500/15 text-blue-300 border-blue-500/25',    dot: 'bg-blue-400' },
  high:   { label: 'High',   badge: 'bg-amber-500/15 text-amber-300 border-amber-500/25', dot: 'bg-amber-400' },
  urgent: { label: 'Urgent', badge: 'bg-red-500/15 text-red-300 border-red-500/25',       dot: 'bg-red-400' },
};

const STATUS_ORDER: JobStatus[] = ['urgent' as any, 'todo', 'in_progress', 'done'];

function sortJobs(jobs: VehicleJob[]): VehicleJob[] {
  const priorityWeight: Record<JobPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
  const statusWeight: Record<JobStatus, number> = { todo: 0, in_progress: 1, done: 2 };
  return [...jobs].sort((a, b) => {
    if (a.status !== b.status) return statusWeight[a.status] - statusWeight[b.status];
    if (a.priority !== b.priority) return priorityWeight[a.priority] - priorityWeight[b.priority];
    return a.created_at.localeCompare(b.created_at);
  });
}

export default function JobsTab({ jobs, vehicleId, onRefresh }: Props) {
  const supabase = createClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<VehicleJob | undefined>();
  const [filter, setFilter] = useState<JobStatus | 'all'>('all');

  const sorted = sortJobs(jobs);
  const filtered = filter === 'all' ? sorted : sorted.filter(j => j.status === filter);

  const counts = {
    all: jobs.length,
    todo: jobs.filter(j => j.status === 'todo').length,
    in_progress: jobs.filter(j => j.status === 'in_progress').length,
    done: jobs.filter(j => j.status === 'done').length,
  };

  async function cycleStatus(job: VehicleJob) {
    const next: Record<JobStatus, JobStatus> = { todo: 'in_progress', in_progress: 'done', done: 'todo' };
    const newStatus = next[job.status];
    await supabase.from('vehicle_jobs').update({
      status: newStatus,
      completed_at: newStatus === 'done' ? new Date().toISOString() : null,
    }).eq('id', job.id);
    onRefresh();
  }

  async function deleteJob(id: string) {
    if (!confirm('Remove this job?')) return;
    await supabase.from('vehicle_jobs').delete().eq('id', id);
    onRefresh();
  }

  function openEdit(job: VehicleJob) {
    setEditing(job);
    setShowModal(true);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Status filter tabs */}
          {([
            { key: 'all',         label: 'All' },
            { key: 'todo',        label: 'To Do' },
            { key: 'in_progress', label: 'In Progress' },
            { key: 'done',        label: 'Done' },
          ] as { key: JobStatus | 'all'; label: string }[]).map(({ key, label }) => (
            <button key={key} onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === key
                  ? 'bg-amber-DEFAULT/20 text-amber-DEFAULT border border-amber-DEFAULT/30'
                  : 'bg-white/4 text-chrome-dim border border-white/8 hover:border-white/16'
              }`}>
              {label}
              {counts[key] > 0 && (
                <span className="ml-1.5 text-[10px] opacity-70">{counts[key]}</span>
              )}
            </button>
          ))}
        </div>
        <button onClick={() => { setEditing(undefined); setShowModal(true); }}
          className="btn-amber rounded-lg px-4 py-2 text-sm flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Job
        </button>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="glass-card rounded-xl p-12 text-center">
          <ClipboardList className="w-10 h-10 text-chrome-muted mx-auto mb-3 opacity-30" />
          <p className="text-chrome-dim text-sm">
            {filter === 'all' ? 'No jobs yet — click "Add Job" to create one.' : `No ${filter.replace('_', ' ')} jobs.`}
          </p>
        </div>
      )}

      {/* Job cards */}
      <div className="space-y-2">
        {filtered.map(job => <JobCard key={job.id} job={job} onCycle={cycleStatus} onEdit={openEdit} onDelete={deleteJob} />)}
      </div>

      {showModal && (
        <AddJobModal
          vehicleId={vehicleId}
          existing={editing}
          onClose={() => { setShowModal(false); setEditing(undefined); }}
          onSave={onRefresh}
        />
      )}
    </div>
  );
}

function JobCard({ job, onCycle, onEdit, onDelete }: {
  job: VehicleJob;
  onCycle: (j: VehicleJob) => void;
  onEdit: (j: VehicleJob) => void;
  onDelete: (id: string) => void;
}) {
  const pc = PRIORITY_CONFIG[job.priority];
  const isDone = job.status === 'done';
  const isInProgress = job.status === 'in_progress';
  const days = daysUntil(job.due_date);

  return (
    <div className={`glass-card rounded-xl p-4 flex gap-3 transition-all border group ${
      isDone ? 'border-white/4 opacity-60' :
      job.priority === 'urgent' ? 'border-red-500/25' :
      'border-white/5 hover:border-white/10'
    }`}>
      {/* Status toggle button */}
      <button onClick={() => onCycle(job)}
        title={isDone ? 'Mark to-do' : isInProgress ? 'Mark done' : 'Mark in progress'}
        className="shrink-0 mt-0.5 transition-colors">
        {isDone
          ? <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          : isInProgress
          ? <Clock className="w-5 h-5 text-blue-400" />
          : <Circle className="w-5 h-5 text-chrome-muted hover:text-chrome-dim" />
        }
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 flex-wrap">
          <span className={`text-sm font-medium ${isDone ? 'line-through text-chrome-muted' : 'text-chrome-bright'}`}>
            {job.title}
          </span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${pc.badge}`}>
            {pc.label}
          </span>
          {isInProgress && (
            <span className="text-[10px] px-1.5 py-0.5 rounded border bg-blue-500/15 text-blue-300 border-blue-500/25 font-semibold">
              In Progress
            </span>
          )}
        </div>

        {job.description && (
          <p className="text-xs text-chrome-dim mt-1 leading-relaxed">{job.description}</p>
        )}

        <div className="flex items-center gap-3 mt-2 flex-wrap">
          {job.requested_by && (
            <span className="flex items-center gap-1 text-[10px] text-chrome-muted">
              <User className="w-3 h-3" /> {job.requested_by}
            </span>
          )}
          {job.due_date && (
            <span className={`flex items-center gap-1 text-[10px] font-mono ${
              days !== null && days < 0 ? 'text-red-400' : days !== null && days <= 7 ? 'text-amber-400' : 'text-chrome-muted'
            }`}>
              <CalendarDays className="w-3 h-3" />
              {formatDate(job.due_date)}
              {days !== null && !isDone && (
                <span className="ml-0.5">({days < 0 ? `${Math.abs(days)}d overdue` : `${days}d`})</span>
              )}
            </span>
          )}
          {isDone && job.completed_at && (
            <span className="text-[10px] text-emerald-400/60">
              Completed {formatDate(job.completed_at.split('T')[0])}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity self-start">
        <button onClick={() => onEdit(job)}
          className="w-7 h-7 rounded btn-ghost flex items-center justify-center text-chrome-dim hover:text-chrome-bright">
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => onDelete(job.id)}
          className="w-7 h-7 rounded btn-ghost flex items-center justify-center text-chrome-dim hover:text-red-400">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
