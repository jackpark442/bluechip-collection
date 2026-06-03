'use client';

import { useState } from 'react';
import Map, { Marker, Popup, NavigationControl, FullscreenControl } from 'react-map-gl/mapbox';
import Link from 'next/link';
import { MapPin, Car, X, ArrowUpRight } from 'lucide-react';
import { formatCurrency, CATEGORY_LABELS, STATUS_LABELS, STATUS_COLORS } from '@/lib/utils';
import type { VehicleCategory, VehicleStatus } from '@/types';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapVehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  registration?: string;
  category: VehicleCategory;
  status: VehicleStatus;
  cover_image_url?: string;
  location_name?: string;
  location_address?: string;
  location_lat: number;
  location_lng: number;
  current_value?: number;
}

interface Props {
  vehicles: MapVehicle[];
}

export default function FleetMapClient({ vehicles }: Props) {
  const [selectedGroup, setSelectedGroup] = useState<MapVehicle[] | null>(null);
  const [groupIndex, setGroupIndex] = useState(0);
  const [viewState, setViewState] = useState({
    longitude: vehicles.length > 0 ? vehicles[0].location_lng : -1.5,
    latitude: vehicles.length > 0 ? vehicles[0].location_lat : 52.5,
    zoom: vehicles.length > 0 ? 8 : 6,
  });

  // Group vehicles by location (same lat/lng)
  const locationGroups = vehicles.reduce((acc, v) => {
    const key = `${v.location_lat.toFixed(4)},${v.location_lng.toFixed(4)}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(v);
    return acc;
  }, {} as Record<string, MapVehicle[]>);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl text-chrome-bright">Fleet Locations</h2>
          <p className="text-sm text-chrome-dim mt-0.5">
            {vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''} with location data
          </p>
        </div>
        {vehicles.length === 0 && (
          <p className="text-sm text-chrome-dim">Add locations to vehicles in their profile to see them here.</p>
        )}
      </div>

      {/* Map */}
      <div className="rounded-2xl overflow-hidden border border-white/10" style={{ height: 'calc(100vh - 200px)' }}>
        <Map
          {...viewState}
          onMove={e => setViewState(e.viewState)}
          mapStyle="mapbox://styles/mapbox/dark-v11"
          mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
          style={{ width: '100%', height: '100%' }}
        >
          <NavigationControl position="top-right" showCompass={false} />
          <FullscreenControl position="top-right" />

          {/* Markers */}
          {Object.entries(locationGroups).map(([key, groupVehicles]) => {
            const v = groupVehicles[0];
            const count = groupVehicles.length;
            return (
              <Marker
                key={key}
                longitude={v.location_lng}
                latitude={v.location_lat}
                anchor="bottom"
                onClick={e => { e.originalEvent.stopPropagation(); setSelectedGroup(groupVehicles); setGroupIndex(0); }}
              >
                <div className="relative cursor-pointer group">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-transform group-hover:scale-110"
                    style={{ background: 'linear-gradient(135deg, #e8a800, #d4960a)' }}
                  >
                    {count > 1 ? (
                      <span className="text-obsidian-900 font-bold text-sm">{count}</span>
                    ) : (
                      <MapPin className="w-5 h-5 text-obsidian-900" />
                    )}
                  </div>
                  {/* Pulse ring */}
                  <div className="absolute inset-0 rounded-full animate-ping opacity-20"
                    style={{ background: '#e8a800' }} />
                </div>
              </Marker>
            );
          })}

          {/* Popup */}
          {selectedGroup && (() => {
            const selected = selectedGroup[groupIndex];
            const total = selectedGroup.length;
            return (
              <Popup
                longitude={selected.location_lng}
                latitude={selected.location_lat}
                anchor="bottom"
                offset={48}
                onClose={() => setSelectedGroup(null)}
                closeButton={false}
                className="vehicle-popup"
              >
                <div className="rounded-xl overflow-hidden w-64" style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {/* Image */}
                  <div className="relative h-32 bg-obsidian-700">
                    {selected.cover_image_url ? (
                      <img src={selected.cover_image_url} alt={`${selected.make} ${selected.model}`}
                        className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Car className="w-10 h-10 text-chrome-muted opacity-30" />
                      </div>
                    )}
                    <button onClick={() => setSelectedGroup(null)}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-obsidian-900/80 flex items-center justify-center hover:bg-obsidian-900 transition-colors">
                      <X className="w-3.5 h-3.5 text-chrome-dim" />
                    </button>
                    <div className="absolute bottom-2 left-3">
                      <span className={`status-badge text-[10px] ${STATUS_COLORS[selected.status]}`}>
                        {STATUS_LABELS[selected.status]}
                      </span>
                    </div>
                  </div>

                  {/* Multi-vehicle nav */}
                  {total > 1 && (
                    <div className="flex items-center justify-between px-3 py-2 border-b border-white/8 bg-white/3">
                      <button
                        onClick={() => setGroupIndex(i => (i - 1 + total) % total)}
                        className="w-6 h-6 rounded flex items-center justify-center text-chrome-dim hover:text-chrome-bright transition-colors text-lg leading-none"
                      >‹</button>
                      <span className="text-[10px] text-chrome-dim">
                        {groupIndex + 1} of {total} vehicles at this location
                      </span>
                      <button
                        onClick={() => setGroupIndex(i => (i + 1) % total)}
                        className="w-6 h-6 rounded flex items-center justify-center text-chrome-dim hover:text-chrome-bright transition-colors text-lg leading-none"
                      >›</button>
                    </div>
                  )}

                  {/* Info */}
                  <div className="p-3">
                    <div className="font-display text-sm font-bold text-chrome-bright">
                      {selected.year} {selected.make} {selected.model}
                    </div>
                    {selected.registration && (
                      <div className="text-xs text-chrome-dim mt-0.5">{selected.registration.toUpperCase()}</div>
                    )}
                    {selected.location_name && (
                      <div className="flex items-center gap-1.5 mt-2">
                        <MapPin className="w-3 h-3 text-amber-DEFAULT shrink-0" />
                        <span className="text-xs text-chrome-dim truncate">{selected.location_name}</span>
                      </div>
                    )}
                    {selected.current_value && (
                      <div className="text-xs font-mono text-amber-DEFAULT mt-1">{formatCurrency(selected.current_value)}</div>
                    )}
                    <Link href={`/vehicles/${selected.id}`}
                      className="mt-3 w-full btn-amber rounded-lg py-2 text-xs flex items-center justify-center gap-1.5">
                      View Profile <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </Popup>
            );
          })()}
        </Map>
      </div>

      {/* Vehicle list below map */}
      {vehicles.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {vehicles.map(v => (
            <Link key={v.id} href={`/vehicles/${v.id}`}
              className="glass-card rounded-xl p-4 flex items-center gap-3 glass-card-hover">
              <div className="w-10 h-10 rounded-lg bg-amber-DEFAULT/10 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5 text-amber-DEFAULT" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-chrome-bright font-medium truncate">{v.year} {v.make} {v.model}</div>
                <div className="text-xs text-chrome-dim truncate mt-0.5">{v.location_name || v.location_address}</div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-chrome-muted shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
