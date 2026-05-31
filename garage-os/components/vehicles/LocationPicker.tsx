'use client';

import { useState, useCallback } from 'react';
import Map, { Marker, NavigationControl } from 'react-map-gl/mapbox';
import { MapPin, Search, X, Check } from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';

interface LocationData {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

interface Props {
  value?: LocationData | null;
  onChange: (location: LocationData | null) => void;
}

export default function LocationPicker({ value, onChange }: Props) {
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [viewState, setViewState] = useState({
    longitude: value?.lng ?? -1.5,
    latitude: value?.lat ?? 52.5,
    zoom: value ? 13 : 6,
  });

  const searchAddress = useCallback(async (query: string) => {
    if (query.length < 3) { setSuggestions([]); return; }
    setSearching(true);
    try {
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&limit=8`
      );
      const data = await res.json();
      setSuggestions(data.features || []);
    } finally {
      setSearching(false);
    }
  }, []);

  function selectSuggestion(feature: any) {
    const [lng, lat] = feature.center;
    const location: LocationData = {
      name: feature.text,
      address: feature.place_name,
      lat,
      lng,
    };
    onChange(location);
    setSuggestions([]);
    setSearch(feature.place_name);
    setViewState({ longitude: lng, latitude: lat, zoom: 14 });
  }

  return (
    <div className="space-y-3">
      {/* Search box */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-chrome-muted" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); searchAddress(e.target.value); }}
            className="input-dark w-full rounded-lg pl-10 pr-10 py-3 text-sm"
            placeholder="Search address or postcode..."
          />
          {value && (
            <button onClick={() => { onChange(null); setSearch(''); setSuggestions([]); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-chrome-muted hover:text-red-400 transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Suggestions dropdown */}
        {suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 glass-card rounded-lg overflow-hidden z-50 shadow-card-hover">
            {suggestions.map((s, i) => (
              <button key={i} onClick={() => selectSuggestion(s)}
                className="w-full text-left px-4 py-3 text-sm hover:bg-white/5 transition-colors border-b border-white/5 last:border-0">
                <div className="text-chrome-bright truncate">{s.text}</div>
                <div className="text-chrome-muted text-xs truncate mt-0.5">{s.place_name}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Current location display */}
      {value && (
        <div className="flex items-start gap-3 bg-amber-DEFAULT/5 border border-amber-DEFAULT/20 rounded-lg px-4 py-3">
          <MapPin className="w-4 h-4 text-amber-DEFAULT shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="text-sm text-chrome-bright font-medium">{value.name}</div>
            <div className="text-xs text-chrome-dim mt-0.5 truncate">{value.address}</div>
          </div>
          <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        </div>
      )}

      {/* Map */}
      <div className="rounded-xl overflow-hidden h-48 border border-white/10">
        <Map
          {...viewState}
          onMove={e => setViewState(e.viewState)}
          mapStyle="mapbox://styles/mapbox/dark-v11"
          mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
          style={{ width: '100%', height: '100%' }}
        >
          <NavigationControl position="top-right" showCompass={false} />
          {value && (
            <Marker longitude={value.lng} latitude={value.lat} anchor="bottom">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shadow-lg"
                style={{ background: 'linear-gradient(135deg, #e8a800, #d4960a)' }}>
                <MapPin className="w-4 h-4 text-obsidian-900" />
              </div>
            </Marker>
          )}
        </Map>
      </div>
    </div>
  );
}
