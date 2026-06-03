'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  ClipboardList, Plus, ChevronDown, ChevronUp, Car,
  CheckCircle2, Clock, Circle, CalendarDays, Loader2, BookOpen
} from 'lucide-react';
import type { VehicleJob, JobLog, JobPriority } from '@/types';
import { formatDate, daysUntil } from '@/lib/utils';

const PRIORITY_DOT: Record<JobPriority, string> = {
  low:    'bg-white/30',
  medium: 'bg-blue-400',
  high:   'bg-amber-400',
  urgent: 'bg-red-400',
};

interface Props {
  jobs: VehicleJob[];
  ownerId: string;
  onRefresh: () => void;
}

export default function JobBoard({ jobs, ownerId, onRefresh }: Props) {
  const supabase = createClient();
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [addingLog, setAddingLog] = useState<string | null>(null);
  const [logText, setLogText] = useState('');
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [savingLog, setSavingLog] = useState(false);
  const [addingJob, setAddingJob] = useState(false);
  const [newJobTitle, setNewJobTitle] = useState('');
  const [newJobDesc, setNewJobDesc] = useState('');
  const [savingJob, setSavingJob] = useState(false);

  // Local log cache so new entries appear instantly
  const [localLogs, setLocalLogs] = useState<Record<string, JobLog[]>>({});

  function getLogsForJob(job: VehicleJob) {
    return [...(job.logs ?? []), ...(localLogs[job.id] ?? [])]
      .sort((a, b) => b.log_date.localeCompare(a.log_date));
  }

  async function saveLog(jobId: string) {
    if (!logText.trim()) return;
    setSavingLog(true);
    const { data, error } = await supabase.from('job_logs').insert({
      job_id: jobId,
      owner_id: ownerId,
      log_date: logDate,
      notes: logText.trim(),
    }).select().single();
    setSavingLog(false);
    if (!error && data) {
      setLocalLogs(prev => ({ ...prev, [jobId]: [...(prev[jobId] ?? []), data as JobLog] }));
    }
    setLogText('');
    setAddingLog(null);
  }

  async function cycleStatus(job: VehicleJob) {
    const next: Record<string, string> = { todo: 'in_progress', in_progress: 'done', done: 'todo' };
    const newStatus = next[job.status];
    await supabase.from('vehicle_jobs').update({
      status: newStatus,
      completed_at: newStatus === 'done' ? new Date().toISOString() : null,
    }).eq('id', job.id);
    onRefresh();
  }

  async function saveQuickJob(e: React.FormEvent) {
    e.preventDefault();
    if (!newJobTitle.trim()) return;
    setSavingJob(true);
    await supabase.from('vehicle_jobs').insert({
      owner_id: ownerId,
      title: newJobTitle.trim(),
      description: newJobDesc.trim() || null,
      priority: 'medium',
      status: 'todo',
      vehicle_id: null,
    });
    setSavingJob(false);
    setNewJobTitle('');
    setNewJobDesc('');
    setAddingJob(false);
    onRefresh();
  }

  // Group: general jobs first, then by vehicle
  const generalJobs = jobs.filter(j => !j.vehicle_id);
  const vehicleJobs = jobs.filter(j => j.vehicle_id);

  const todoCount = jobs.filter(j => j.status === 'todo').length;
  const inProgressCount = jobs.filter(j => j.status === 'in_progress').length;

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardList className="w-4 h-4 text-amber-DEFAULT" />
          <h2 className="font-display text-base text-chrome-bright">Job Board</h2>
          <div className="flex gap-2 text-xs">
            {inProgressCount > 0 && (
              <span className="bg-blue-500/15 text-blue-300 border border-blue-500/25 px-2 py-0.5 rounded-full font-medium">
                {inProgressCount} in progress
              </span>
            )}
            {todoCount > 0 && (
              <span className="bg-white/8 text-chrome-dim border border-white/10 px-2 py-0.5 rounded-full font-medium">
                {todoCount} to do
              </span>
            )}
          </div>
        </div>
        <button onClick={() => setAddingJob(v => !v)}
          className="btn-ghost rounded-lg px-3 py-1.5 text-xs flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Add Job
        </button>
      </div>

      {/* Quick add job */}
      {addingJob && (
        <form onSubmit={saveQuickJob} className="px-5 py-4 border-b border-white/5 space-y-3 bg-white/2">
          <div className="text-xs text-chrome-dim uppercase tracking-wider font-medium">New General Job</div>
          <input
            type="text"
            value={newJobTitle}
            onChange={e => setNewJobTitle(e.target.value)}
            className="input-dark w-full rounded-lg px-3 py-2 text-sm"
            placeholder="e.g. Tyre check at client's, Detail Ferrari, Source parts…"
            autoFocus
            required
          />
          <textarea
            value={newJobDesc}
            onChange={e => setNewJobDesc(e.target.value)}
            className="input-dark w-full rounded-lg px-3 py-2 text-sm resize-none"
            rows={2}
            placeholder="Details (optional)…"
          />
          <div className="flex gap-2">
            <button type="submit" disabled={savingJob}
              className="btn-amber rounded-lg px-4 py-2 text-sm flex items-center gap-2 disabled:opacity-60">
              {savingJob && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Add Job
            </button>
            <button type="button" onClick={() => setAddingJob(false)} className="btn-ghost rounded-lg px-4 py-2 text-sm">Cancel</button>
          </div>
        </form>
      )}

      <div className="divide-y divide-white/4">
        {jobs.length === 0 && !addingJob && (
          <div className="px-5 py-10 text-center text-chrome-dim text-sm">
            No open jobs — click "Add Job" to create one.
          </div>
        )}

        {/* General jobs */}
        {generalJobs.map(job => (
          <JobRow key={job.id} job={job} logs={getLogsForJob(job)}
            expanded={expandedJob === job.id}
            onToggle={() => setExpandedJob(expandedJob === job.id ? null : job.id)}
            addingLog={addingLog === job.id}
            onAddLog={() => { setAddingLog(job.id); setLogText(''); setLogDate(new Date().toISOString().split('T')[0]); }}
            onCancelLog={() => setAddingLog(null)}
            logText={logText} setLogText={setLogText}
            logDate={logDate} setLogDate={setLogDate}
            onSaveLog={() => saveLog(job.id)} savingLog={savingLog}
            onCycleStatus={() => cycleStatus(job)}
          />
        ))}

        {/* Vehicle jobs */}
        {vehicleJobs.map(job => (
          <JobRow key={job.id} job={job} logs={getLogsForJob(job)}
            expanded={expandedJob === job.id}
            onToggle={() => setExpandedJob(expandedJob === job.id ? null : job.id)}
            addingLog={addingLog === job.id}
            onAddLog={() => { setAddingLog(job.id); setLogText(''); setLogDate(new Date().toISOString().split('T')[0]); }}
            onCancelLog={() => setAddingLog(null)}
            logText={logText} setLogText={setLogText}
            logDate={logDate} setLogDate={setLogDate}
            onSaveLog={() => saveLog(job.id)} savingLog={savingLog}
            onCycleStatus={() => cycleStatus(job)}
          />
        ))}
      </div>
    </div>
  );
}

function JobRow({ job, logs, expanded, onToggle, addingLog, onAddLog, onCancelLog,
  logText, setLogText, logDate, setLogDate, onSaveLog, savingLog, onCycleStatus }: {
  job: VehicleJob; logs: JobLog[]; expanded: boolean;
  onToggle: () => void; addingLog: boolean;
  onAddLog: () => void; onCancelLog: () => void;
  logText: string; setLogText: (v: string) => void;
  logDate: string; setLogDate: (v: string) => void;
  onSaveLog: () => void; savingLog: boolean;
  onCycleStatus: () => void;
}) {
  const days = daysUntil(job.due_date);

  return (
    <div className="px-5 py-3.5">
      <div className="flex items-start gap-3">
        {/* Status toggle */}
        <button onClick={onCycleStatus} className="mt-0.5 shrink-0" title="Click to advance status">
          {job.status === 'done'
            ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            : job.status === 'in_progress'
            ? <Clock className="w-4 h-4 text-blue-400" />
            : <Circle className="w-4 h-4 text-chrome-muted" />
          }
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[job.priority]}`} />
            <span className="text-sm font-medium text-chrome-bright">{job.title}</span>
            {job.vehicle && (
              <Link href={`/vehicles/${job.vehicle.id}`}
                className="text-[10px] text-chrome-muted bg-white/5 px-1.5 py-0.5 rounded flex items-center gap-1 hover:text-amber-DEFAULT transition-colors">
                <Car className="w-2.5 h-2.5" />
                {job.vehicle.make} {job.vehicle.model}
              </Link>
            )}
            {job.status === 'in_progress' && (
              <span className="text-[10px] bg-blue-500/15 text-blue-300 border border-blue-500/20 px-1.5 py-0.5 rounded font-medium">In Progress</span>
            )}
            {job.due_date && days !== null && (
              <span className={`text-[10px] font-mono ${days < 0 ? 'text-red-400' : days <= 7 ? 'text-amber-400' : 'text-chrome-muted'}`}>
                {days < 0 ? `${Math.abs(days)}d overdue` : `due ${days}d`}
              </span>
            )}
          </div>
          {job.description && (
            <p className="text-xs text-chrome-dim mt-0.5 truncate">{job.description}</p>
          )}
          {/* Log summary */}
          {logs.length > 0 && (
            <div className="text-[10px] text-chrome-muted mt-0.5">
              {logs.length} log {logs.length === 1 ? 'entry' : 'entries'} · Last: {formatDate(logs[0].log_date)}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onAddLog} title="Log today's work"
            className="w-7 h-7 rounded btn-ghost flex items-center justify-center text-chrome-muted hover:text-amber-DEFAULT">
            <BookOpen className="w-3.5 h-3.5" />
          </button>
          <button onClick={onToggle}
            className="w-7 h-7 rounded btn-ghost flex items-center justify-center text-chrome-muted hover:text-chrome-bright">
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded: log entries + add log form */}
      {expanded && (
        <div className="mt-3 ml-7 space-y-3">
          {/* Existing logs */}
          {logs.length > 0 && (
            <div className="space-y-2">
              {logs.map(log => (
                <div key={log.id} className="bg-white/3 border border-white/6 rounded-lg px-3 py-2.5">
                  <div className="flex items-center gap-2 mb-1">
                    <CalendarDays className="w-3 h-3 text-amber-DEFAULT shrink-0" />
                    <span className="text-xs font-semibold text-amber-DEFAULT">{formatDate(log.log_date)}</span>
                  </div>
                  <p className="text-sm text-chrome-dim leading-relaxed">{log.notes}</p>
                </div>
              ))}
            </div>
          )}

          {logs.length === 0 && !addingLog && (
            <p className="text-xs text-chrome-muted italic">No work logged yet.</p>
          )}

          {/* Add log form */}
          {addingLog && (
            <div className="bg-white/3 border border-amber-DEFAULT/20 rounded-lg p-3 space-y-2">
              <div className="text-xs text-chrome-dim uppercase tracking-wider font-medium">Log Work</div>
              <input type="date" value={logDate} onChange={e => setLogDate(e.target.value)}
                className="input-dark w-full rounded-lg px-3 py-2 text-sm" />
              <textarea
                value={logText}
                onChange={e => setLogText(e.target.value)}
                rows={3}
                className="input-dark w-full rounded-lg px-3 py-2 text-sm resize-none"
                placeholder="What was done today? e.g. Replaced brake pads front axle, cleaned calipers, test drive completed…"
                autoFocus
              />
              <div className="flex gap-2">
                <button onClick={onSaveLog} disabled={savingLog || !logText.trim()}
                  className="btn-amber rounded-lg px-3 py-1.5 text-xs flex items-center gap-1.5 disabled:opacity-60">
                  {savingLog && <Loader2 className="w-3 h-3 animate-spin" />}
                  Save Log
                </button>
                <button onClick={onCancelLog} className="btn-ghost rounded-lg px-3 py-1.5 text-xs">Cancel</button>
              </div>
            </div>
          )}

          {!addingLog && (
            <button onClick={onAddLog}
              className="text-xs text-amber-DEFAULT hover:text-amber-light flex items-center gap-1.5 transition-colors">
              <Plus className="w-3 h-3" /> Log today's work
            </button>
          )}
        </div>
      )}
    </div>
  );
}
