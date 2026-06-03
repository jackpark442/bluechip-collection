'use client';

import { useState, useRef } from 'react';
import { Upload, Trash2, Star, Loader2, X, ZoomIn, Camera } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { VehicleImage } from '@/types';

interface Props {
  images: VehicleImage[];
  vehicleId: string;
  onRefresh: () => void;
}

export default function ImageGallery({ images: initialImages, vehicleId, onRefresh }: Props) {
  const [images, setImages] = useState(initialImages);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [lightbox, setLightbox] = useState<VehicleImage | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  async function uploadFiles(files: File[]) {
    if (files.length === 0) return;
    setUploading(true);
    setUploadError('');
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setUploadError('Not logged in'); setUploading(false); return; }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress(`Uploading ${i + 1} of ${files.length}…`);

      // Upload directly from browser to Supabase Storage — no Vercel size limit
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${user.id}/${vehicleId}/${Date.now()}-${safeName}`;

      const { error: storageError } = await supabase.storage
        .from('vehicle-images')
        .upload(storagePath, file, { contentType: file.type || 'image/jpeg', upsert: false });

      if (storageError) {
        setUploadError(`Upload failed: ${storageError.message}`);
        break;
      }

      const { data: { publicUrl } } = supabase.storage.from('vehicle-images').getPublicUrl(storagePath);
      const isCover = images.length === 0 && i === 0;

      // Record in database via lightweight API call
      const res = await fetch('/api/images/record', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ vehicleId, storagePath, publicUrl, isCover }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setUploadError(data.error ?? 'Failed to save image record');
        // Clean up the uploaded file
        await supabase.storage.from('vehicle-images').remove([storagePath]);
        break;
      }

      const newImage = await res.json();
      setImages(prev => [...prev, newImage]);
    }

    setUploading(false);
    setUploadProgress('');
    onRefresh();
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length) uploadFiles(files);
    e.target.value = '';
  }

  function onDragOver(e: React.DragEvent) { e.preventDefault(); setIsDragActive(true); }
  function onDragLeave() { setIsDragActive(false); }
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragActive(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    uploadFiles(files);
  }

  async function setCover(image: VehicleImage) {
    setImages(prev => prev.map(img => ({ ...img, is_cover: img.id === image.id })));
    await fetch(`/api/images/upload?imageId=${image.id}&setCover=true`, { method: 'PATCH' });
    onRefresh();
  }

  async function deleteImage(image: VehicleImage) {
    if (!confirm('Delete this image?')) return;
    setImages(prev => prev.filter(img => img.id !== image.id));
    await fetch(`/api/images/upload?imageId=${image.id}`, { method: 'DELETE' });
    onRefresh();
  }

  return (
    <div className="space-y-5">
      {/* Hidden inputs */}
      <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={onFileChange} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFileChange} />

      {/* Upload zone */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
          isDragActive ? 'border-amber-DEFAULT bg-amber-DEFAULT/5' : 'border-white/10 hover:border-amber-DEFAULT/30'
        }`}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-3 py-2">
            <Loader2 className="w-8 h-8 text-amber-DEFAULT animate-spin" />
            <div className="text-sm text-chrome-dim">{uploadProgress}</div>
          </div>
        ) : (
          <div className="space-y-3">
            <Upload className="w-8 h-8 text-chrome-muted mx-auto" />
            <div className="text-sm text-chrome-dim">
              {isDragActive ? 'Drop images here' : 'Drag photos here or use buttons below'}
            </div>
            <div className="text-xs text-chrome-muted">JPEG · PNG · WebP · HEIC — any size</div>
            <div className="flex flex-wrap gap-3 justify-center pt-1">
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="btn-amber rounded-lg px-4 py-2 text-sm flex items-center gap-2">
                <Upload className="w-4 h-4" /> Choose Photos
              </button>
              <button type="button" onClick={() => cameraInputRef.current?.click()}
                className="btn-ghost rounded-lg px-4 py-2 text-sm flex items-center gap-2 md:hidden">
                <Camera className="w-4 h-4" /> Camera
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {uploadError && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
          <span className="flex-1">{uploadError}</span>
          <button onClick={() => setUploadError('')}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Gallery */}
      {images.length === 0 ? (
        <div className="text-center py-8 text-chrome-dim text-sm">No photos yet</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {images.map(img => (
            <div key={img.id} className="relative group rounded-xl overflow-hidden aspect-video bg-obsidian-700">
              <img src={img.public_url} alt={img.caption ?? 'Vehicle photo'}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />

              {img.is_cover && (
                <div className="absolute top-2 left-2 flex items-center gap-1 bg-amber-DEFAULT text-obsidian-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  <Star className="w-3 h-3" /> Cover
                </div>
              )}

              {/* Desktop hover overlay */}
              <div className="absolute inset-0 bg-obsidian-900/70 opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex items-center justify-center gap-3">
                <button onClick={() => setLightbox(img)} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20">
                  <ZoomIn className="w-4 h-4 text-chrome-bright" />
                </button>
                {!img.is_cover && (
                  <button onClick={() => setCover(img)} className="w-9 h-9 rounded-full bg-amber-DEFAULT/20 flex items-center justify-center hover:bg-amber-DEFAULT/30">
                    <Star className="w-4 h-4 text-amber-DEFAULT" />
                  </button>
                )}
                <button onClick={() => deleteImage(img)} className="w-9 h-9 rounded-full bg-red-500/20 flex items-center justify-center hover:bg-red-500/30">
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>

              {/* Mobile action bar */}
              <div className="absolute bottom-0 left-0 right-0 flex justify-end gap-1.5 p-2 bg-gradient-to-t from-obsidian-900/90 to-transparent md:hidden">
                <button onClick={() => setLightbox(img)} className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <ZoomIn className="w-3.5 h-3.5 text-chrome-bright" />
                </button>
                {!img.is_cover && (
                  <button onClick={() => setCover(img)} className="w-8 h-8 rounded-lg bg-amber-DEFAULT/20 flex items-center justify-center">
                    <Star className="w-3.5 h-3.5 text-amber-DEFAULT" />
                  </button>
                )}
                <button onClick={() => deleteImage(img)} className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-[9999] bg-obsidian-900/95 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
            onClick={() => setLightbox(null)}>
            <X className="w-5 h-5" />
          </button>
          <img src={lightbox.public_url} alt={lightbox.caption ?? ''}
            className="max-w-full max-h-full rounded-xl object-contain"
            onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
