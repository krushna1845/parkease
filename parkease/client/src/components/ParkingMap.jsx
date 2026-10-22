import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Navigation,
  LocateFixed,
  Maximize2,
  AlertCircle,
  ExternalLink,
  Car,
  Clock,
  Sparkles,
  MapPin
} from 'lucide-react';

// Default center coordinates if no areas have coordinates: Mumbai coordinates
const DEFAULT_CENTER = [19.076, 72.8777];
const DEFAULT_ZOOM = 12;

// Custom Leaflet DivIcon generator for parking spots
function createParkingIcon(area, isSelected) {
  const isAvailable = (area.availableSlots ?? 1) > 0;
  const price = area.pricePerHour ? `₹${area.pricePerHour}` : 'P';

  const markerHtml = `
    <div class="relative group cursor-pointer transition-transform duration-200 ${isSelected ? 'scale-125 z-50' : 'hover:scale-110 z-10'}">
      <div class="flex items-center gap-1 px-2.5 py-1.5 rounded-full shadow-lg border-2 ${
        isSelected
          ? 'bg-emerald-600 border-white text-white ring-4 ring-emerald-400/50'
          : isAvailable
          ? 'bg-slate-900 border-emerald-400 text-white hover:bg-slate-800'
          : 'bg-slate-700 border-slate-500 text-slate-300'
      }">
        <span class="w-2 h-2 rounded-full ${isAvailable ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}"></span>
        <span class="text-[11px] font-black tracking-tight">${price}</span>
      </div>
      <div class="w-2 h-2 bg-inherit border-r-2 border-b-2 ${
        isSelected ? 'border-white bg-emerald-600' : 'border-emerald-400 bg-slate-900'
      } rotate-45 mx-auto -mt-1 shadow-xs"></div>
    </div>
  `;

  return L.divIcon({
    html: markerHtml,
    className: 'custom-parking-marker',
    iconSize: [60, 36],
    iconAnchor: [30, 36],
    popupAnchor: [0, -36]
  });
}

// User location marker (pulsing blue dot)
function createUserLocationIcon() {
  const markerHtml = `
    <div class="relative flex items-center justify-center">
      <span class="absolute w-8 h-8 bg-sky-500/30 rounded-full animate-ping"></span>
      <span class="w-4 h-4 bg-sky-600 border-2 border-white rounded-full shadow-md"></span>
    </div>
  `;
  return L.divIcon({
    html: markerHtml,
    className: 'custom-user-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
}

export default function ParkingMap({
  areas = [],
  selectedArea = null,
  onSelectArea = () => {},
  userLocation = null,
  onUserLocationChange = () => {},
  className = ''
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const userMarkerRef = useRef(null);

  const [tileError, setTileError] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState('');

  // 1. Initialize Map instance once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: false, // will add customized position
      attributionControl: true
    });

    // Clean zoom control in top-right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // OpenStreetMap standard tile layer with proper attribution and error listening
    const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
      subdomains: ['a', 'b', 'c']
    });

    tileLayer.on('tileerror', () => {
      setTileError(true);
    });

    tileLayer.addTo(map);

    // Layer group for parking markers
    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. Update parking area markers whenever areas or selectedArea changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    const validAreas = areas.filter(
      (a) => typeof a.latitude === 'number' && typeof a.longitude === 'number'
    );

    const latLngs = [];

    validAreas.forEach((area) => {
      const isSelected = selectedArea?._id === area._id;
      const marker = L.marker([area.latitude, area.longitude], {
        icon: createParkingIcon(area, isSelected),
        title: area.name,
        zIndexOffset: isSelected ? 1000 : 100
      });

      // Marker click synchronizes with list and opens popup
      marker.on('click', () => {
        onSelectArea(area);
      });

      // Rich informative popup
      const isAvailable = (area.availableSlots ?? 1) > 0;
      const navUrl = `https://www.google.com/maps/dir/?api=1&destination=${area.latitude},${area.longitude}`;

      const popupHtml = `
        <div class="font-sans text-xs p-1 max-w-[240px]">
          <div class="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5 mb-2">
            <span class="font-extrabold text-slate-900 text-sm truncate">${area.name}</span>
            <span class="text-emerald-700 font-black text-xs shrink-0">₹${area.pricePerHour}/hr</span>
          </div>
          <p class="text-[11px] text-slate-500 mb-2 leading-relaxed">${area.address || area.city}</p>
          <div class="flex items-center gap-2 mb-3">
            <span class="px-2 py-0.5 rounded-md font-bold text-[10px] ${
              isAvailable
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }">
              ${isAvailable ? `${area.availableSlots ?? 'Available'} spots open` : 'Fully Occupied'}
            </span>
            ${area.openingHours ? `<span class="text-[10px] text-slate-400 font-medium">${area.openingHours}</span>` : ''}
          </div>
          <div class="flex items-center gap-1.5 pt-1 border-t border-slate-100">
            <a href="/parking/${area._id}" class="flex-1 text-center bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-2 rounded-lg text-[11px] no-underline transition">
              Reserve Spot →
            </a>
            <a href="${navUrl}" target="_blank" rel="noopener noreferrer" title="Turn-by-turn Directions" class="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition text-[11px] font-bold">
              🗺️
            </a>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, {
        maxWidth: 280,
        className: 'parkease-map-popup'
      });

      marker.addTo(markersLayer);
      latLngs.push([area.latitude, area.longitude]);

      if (isSelected) {
        marker.openPopup();
      }
    });

    // Auto-fit bounds if we have valid coordinates and not manually dragging
    if (latLngs.length > 0 && !selectedArea) {
      if (userLocation) {
        latLngs.push([userLocation.lat, userLocation.lng]);
      }
      try {
        const bounds = L.latLngBounds(latLngs);
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      } catch (e) {
        // fallback
      }
    }
  }, [areas, selectedArea, onSelectArea, userLocation]);

  // 3. Center map when a facility is selected from list
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedArea) return;

    if (typeof selectedArea.latitude === 'number' && typeof selectedArea.longitude === 'number') {
      map.flyTo([selectedArea.latitude, selectedArea.longitude], Math.max(map.getZoom(), 14), {
        duration: 0.8
      });
    }
  }, [selectedArea]);

  // 4. Update or render User Location marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (userLocation) {
      if (!userMarkerRef.current) {
        const marker = L.marker([userLocation.lat, userLocation.lng], {
          icon: createUserLocationIcon(),
          zIndexOffset: 2000
        }).bindPopup(
          '<div class="text-xs font-bold text-sky-900 py-0.5">📍 You are here</div>'
        );
        marker.addTo(map);
        userMarkerRef.current = marker;
      } else {
        userMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng]);
      }
    } else if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }
  }, [userLocation]);

  // 5. Request browser geolocation
  const handleRequestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationStatus('Geolocation is not supported by your browser.');
      return;
    }

    setLocating(true);
    setLocationStatus('');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        };
        onUserLocationChange(coords);
        setLocationStatus('Location found! Showing parking facilities sorted by distance.');

        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([coords.lat, coords.lng], 14, { duration: 1 });
        }
      },
      (err) => {
        setLocating(false);
        let msg = 'Location access denied or unavailable.';
        if (err.code === 1) msg = 'Location permission denied. Discovery remains available.';
        else if (err.code === 2) msg = 'Location position unavailable. Discovery remains available.';
        else if (err.code === 3) msg = 'Location request timed out. Discovery remains available.';
        setLocationStatus(msg);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }, [onUserLocationChange]);

  // 6. Reset map view to fit all markers
  const handleResetBounds = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const validAreas = areas.filter(
      (a) => typeof a.latitude === 'number' && typeof a.longitude === 'number'
    );
    const latLngs = validAreas.map((a) => [a.latitude, a.longitude]);
    if (userLocation) latLngs.push([userLocation.lat, userLocation.lng]);

    if (latLngs.length > 0) {
      map.fitBounds(L.latLngBounds(latLngs), { padding: [40, 40], maxZoom: 15 });
    } else {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    }
  }, [areas, userLocation]);

  const validPinCount = areas.filter(
    (a) => typeof a.latitude === 'number' && typeof a.longitude === 'number'
  ).length;

  return (
    <div className={`relative rounded-2xl overflow-hidden border border-slate-200/90 shadow-xs bg-slate-100 ${className}`}>
      {/* Map DOM target */}
      <div ref={mapContainerRef} className="w-full h-full min-h-[380px] z-0" />

      {/* Floating Map Controls Top-Left */}
      <div className="absolute top-3 left-3 z-[1000] flex flex-col gap-2">
        <button
          type="button"
          onClick={handleRequestLocation}
          disabled={locating}
          title="Find parking near my current location"
          className="flex items-center gap-1.5 px-3 py-2 bg-white/95 hover:bg-white backdrop-blur text-slate-800 text-xs font-bold rounded-xl shadow-md border border-slate-200/80 transition hover:shadow-lg active:scale-95"
        >
          <LocateFixed className={`w-3.5 h-3.5 text-emerald-600 ${locating ? 'animate-spin' : ''}`} />
          <span>{locating ? 'Locating...' : userLocation ? 'Update Location' : 'Locate Me'}</span>
        </button>

        <button
          type="button"
          onClick={handleResetBounds}
          title="Fit all parking facilities on map"
          className="flex items-center justify-center w-8 h-8 bg-white/95 hover:bg-white backdrop-blur text-slate-700 rounded-xl shadow-md border border-slate-200/80 transition hover:shadow-lg active:scale-95"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Floating Status Notification Pill */}
      {locationStatus && (
        <div className="absolute bottom-10 left-3 right-3 sm:left-auto sm:right-3 z-[1000] bg-slate-900/90 text-white text-[11px] font-medium px-3.5 py-2 rounded-xl backdrop-blur border border-slate-700 shadow-xl flex items-center justify-between gap-3 animate-in fade-in">
          <span>{locationStatus}</span>
          <button
            onClick={() => setLocationStatus('')}
            className="text-slate-400 hover:text-white font-bold ml-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Tile loading error fallback banner */}
      {tileError && (
        <div className="absolute top-3 right-12 z-[1000] bg-amber-50 border border-amber-200 text-amber-900 text-xs px-3 py-2 rounded-xl shadow-md flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Map tiles couldn't load. Check internet connection. Search and card listings remain active.</span>
        </div>
      )}

      {/* Live Map Info Footer Tag */}
      <div className="absolute bottom-2 left-2 z-[1000] pointer-events-none">
        <div className="inline-flex items-center gap-1.5 bg-slate-950/80 backdrop-blur text-[10px] text-white font-mono px-2.5 py-1 rounded-lg border border-white/10 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>{validPinCount} / {areas.length} with GPS</span>
        </div>
      </div>
    </div>
  );
}
