'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Loader2, Upload, FileText, X } from 'lucide-react';
import Modal from './Modal';
import type { DocumentCategory } from '@/types';
import { DOCUMENT_CATEGORY_LABELS, formatFileSize } from '@/lib/utils';

interface Props { vehicleId: string; onClose: () => void; onSave: () => void; }

const DOC_CATEGORIES = Object.entries(DOCUMENT_CATEGORY_LABELS) as [DocumentCategory, string][];

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-xs text-chrome-dim mb-1.5 uppercase tracking-wider font-medium">{label}</label>{children}</div>;
}

export default function AddDocumentModal({ vehicleId, onClose, onSave }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<DocumentCategory>('other');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const f = acceptedFiles[0];
    if (f) {
      setFile(f);
      // Auto-fill title from filename
      if (!title) {
        const name = f.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
        setTitle(name.charAt(0).toUpperCase() + name.slice(1));
      }
    }
  }, [title]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.jpg', '.jpeg', '.png', '.webp'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxSize: 20 * 1024 * 1024, // 20MB
    multiple: false,
  });

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !title.trim()) return;
    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('vehicleId', vehicleId);
    formData.append('category', category);
    formData.append('title', title.trim());
    if (description) formData.append('description', description);

    const res = await fetch('/api/documents/upload', { method: 'POST', body: formData });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? 'Upload failed');
      setUploading(false);
      return;
    }

    setUploading(false);
    onSave();
    onClose();
  }

  return (
    <Modal title="Upload Document" onClose={onClose}>
      <form onSubmit={handleUpload} className="space-y-4">
        {/* Dropzone */}
        <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${isDragActive ? 'border-amber-DEFAULT bg-amber-DEFAULT/5' : file ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-white/10 hover:border-amber-DEFAULT/30 hover:bg-white/2'}`}>
          <input {...getInputProps()} />
          {file ? (
            <div className="flex items-center justify-center gap-3">
              <FileText className="w-8 h-8 text-emerald-400" />
              <div className="text-left">
                <div className="text-sm text-chrome-bright font-medium">{file.name}</div>
                <div className="text-xs text-chrome-dim">{formatFileSize(file.size)}</div>
              </div>
              <button type="button" onClick={e => { e.stopPropagation(); setFile(null); }}
                className="ml-2 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20">
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div>
              <Upload className="w-8 h-8 text-chrome-muted mx-auto mb-3" />
              <div className="text-sm text-chrome-dim">
                {isDragActive ? 'Drop the file here' : 'Drag & drop or click to browse'}
              </div>
              <div className="text-xs text-chrome-muted mt-1">PDF, images, Word docs up to 20MB</div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <F label="Category *">
            <select value={category} onChange={e => setCategory(e.target.value as DocumentCategory)} className="input-dark w-full rounded-lg px-3 py-2 text-sm">
              {DOC_CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </F>
          <F label="Title *">
            <input value={title} onChange={e => setTitle(e.target.value)} className="input-dark w-full rounded-lg px-3 py-2 text-sm" required placeholder="Document name" />
          </F>
        </div>

        <F label="Description">
          <input value={description} onChange={e => setDescription(e.target.value)} className="input-dark w-full rounded-lg px-3 py-2 text-sm" placeholder="Optional description" />
        </F>

        {error && <div className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</div>}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={uploading || !file}
            className="btn-amber rounded-lg px-5 py-2.5 text-sm flex items-center gap-2 disabled:opacity-60">
            {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</> : <><Upload className="w-4 h-4" /> Upload</>}
          </button>
          <button type="button" onClick={onClose} className="btn-ghost rounded-lg px-5 py-2.5 text-sm">Cancel</button>
        </div>
      </form>
    </Modal>
  );
}
