'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Trash2, Star, Loader2, X, ZoomIn } from 'lucide-react';
import type { VehicleImage } from '@/types';

interface Props {
  images: VehicleImage[];
  vehicleId: string;
  onRefresh: () => void;
}

export default function ImageGallery({ images: initialImages, vehicleId, onRefresh }: Props) {
  const [images, setImages] = useState(initialImages);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState<VehicleImage | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string>('');

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setUploading(true);
    for (let i = 0; i < acceptedFiles.length; i++) {
      const file = acceptedFiles[i];
      setUploadProgress(`Uploading ${i + 1}/${acceptedFiles.length}: ${file.name}`);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('vehicleId', vehicleId);
      formData.append('isCover', images.length === 0 && i === 0 ? 'true' : 'false');

      const res = await fetch('/api/images/upload', { method: 'POST', body: formData });
      if (res.ok) {
        const newImage = await res.json();
        setImages(prev => [...prev, newImage]);
      }
    }
    setUploading(false);
    setUploadProgress('');
    onRefresh();
  }, [vehicleId, images.length, onRefresh]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.heic'] },
    maxSize: 20 * 1024 * 1024,
  });

  async function setCover(image: VehicleImage) {
    // Optimistic update
    setImages(prev => prev.map(img => ({ ...img, is_cover: img.id === image.id })));

    // Upload a new version flagged as cover isn't quite right — we need a PATCH endpoint
    // For now, re-upload concept: update via Supabase directly
    const res = await fetch(`/api/images/upload?imageId=${image.id}&setCover=true`, { method: 'PATCH' });
    onRefresh();
  }

  async function deleteImage(image: VehicleImage) {
    if (!confirm('Delete this image?')) return;
    setImages(prev => prev.filter(img => img.id !== image.id));
    await fetch(`/api/images/upload?imageId=${image.id}`, { method: 'DELETE' });
    onRefresh();
  }

  return (
    <div className="space-y-6">
      {/* Upload zone */}
      <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${isDragActive ? 'border-amber-DEFAULT bg-amber-DEFAULT/5' : 'border-white/10 hover:border-amber-DEFAULT/30 hover:bg-white/2'}`}>
        <input {...getInputProps()} />
        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-amber-DEFAULT animate-spin" />
            <div className="text-sm text-chrome-dim">{uploadProgress}</div>
          </div>
        ) : (
          <div>
            <Upload className="w-8 h-8 text-chrome-muted mx-auto mb-3" />
            <div className="text-sm text-chrome-dim">{isDragActive ? 'Drop images here' : 'Drag photos here or click to browse'}</div>
            <div className="text-xs text-chrome-muted mt-1">JPEG, PNG, WebP — multiple files supported</div>
          </div>
        )}
      </div>

      {/* Gallery grid */}
      {images.length === 0 ? (
        <div className="text-center py-8 text-chrome-dim text-sm">No photos yet — upload some above</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {images.map(img => (
            <div key={img.id} className="relative group rounded-xl overflow-hidden aspect-video bg-obsidian-700">
              <img src={img.public_url} alt={img.caption ?? 'Vehicle photo'}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />

              {/* Cover badge */}
              {img.is_cover && (
                <div className="absolute top-2 left-2 flex items-center gap-1 bg-amber-DEFAULT text-obsidian-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  <Star className="w-3 h-3" /> Cover
                </div>
              )}

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-obsidian-900/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                <button onClick={() => setLightbox(img)}
                  className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                  <ZoomIn className="w-4 h-4 text-chrome-bright" />
                </button>
                {!img.is_cover && (
                  <button onClick={() => setCover(img)}
                    className="w-9 h-9 rounded-full bg-amber-DEFAULT/20 flex items-center justify-center hover:bg-amber-DEFAULT/30 transition-colors">
                    <Star className="w-4 h-4 text-amber-DEFAULT" />
                  </button>
                )}
                <button onClick={() => deleteImage(img)}
                  className="w-9 h-9 rounded-full bg-red-500/20 flex items-center justify-center hover:bg-red-500/30 transition-colors">
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>

              {/* Caption */}
              {img.caption && (
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-obsidian-900 text-xs text-chrome-dim truncate">
                  {img.caption}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-obsidian-900/95 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20"
            onClick={() => setLightbox(null)}>
            <X className="w-5 h-5" />
          </button>
          <img src={lightbox.public_url} alt={lightbox.caption ?? ''}
            className="max-w-full max-h-full rounded-xl object-contain"
            onClick={e => e.stopPropagation()} />
          {lightbox.caption && (
            <div className="absolute bottom-6 text-sm text-chrome-dim">{lightbox.caption}</div>
          )}
        </div>
      )}
    </div>
  );
}
