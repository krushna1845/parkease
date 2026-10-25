import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Navigation,
  LocateFixed,
  Maximize2,
  AlertCircle,
  Car,
  Clock,
  Sparkles,
  MapPin
} from 'lucide-react';

// Default center coordinates: Mumbai Kandivali/Central area
const DEFAULT_CENTER = [19.2025, 72.8468];
const DEFAULT_ZOOM = 14;

// Format distance: < 1km -> "431 m", >= 1km -> "1.4 km"
function formatDistance(distKm) {
  if (distKm === null || distKm === undefined) return null;
  if (distKm < 1) {
    return `${Math.round(distKm * 1000)} m`;
  }
  return `${distKm.toFixed(1)} km`;
}

// Custom Leaflet DivIcon generator for parking spots matching the screenshot
function createParkingIcon(area, isSelected) {
  const distText = formatDistance(area.distanceKm) || (area.pricePerHour ? `₹${area.pricePerHour}` : 'Park');

  const pillClass = isSelected
    ? 'bg-[#5B21B6] text-white shadow-xl ring-4 ring-purple-300/60 font-black'
    : 'bg-white text-slate-800 border border-slate-200/90 shadow-md font-bold hover:bg-slate-50';

  const markerHtml = `
    <div class="relative flex flex-col items-center cursor-pointer transition-transform duration-200 ${
      isSelected ? 'scale-115 z-50' : 'hover:scale-105 z-20'
    }">
      <div class="px-2.5 py-1 rounded-full text-[11px] leading-tight whitespace-nowrap flex items-center justify-center transition-all ${pillClass}">
        ${distText}
      </div>
      <div class="w-0.5 h-3 bg-[#5B21B6] -mt-0.5 shadow-xs"></div>
    </div>
  `;

  return L.divIcon({
    html: markerHtml,
    className: 'custom-parking-marker',
    iconSize: [64, 34],
    iconAnchor: [32, 34],
    popupAnchor: [0, -34]
  });
}

// User location marker: central purple/blue dot with soft radar heading cone
function createUserLocationIcon() {
  const markerHtml = `
    <div class="relative flex items-center justify-center pointer-events-none" style="width: 50px; height: 50px; margin-left: -9px; margin-top: -9px;">
      <!-- Soft translucent radar cone pointing up-right (northeast) -->
      <div class="absolute w-12 h-12 bg-gradient-to-tr from-purple-600/40 via-purple-500/20 to-transparent rounded-full" style="clip-path: polygon(50% 50%, 100% 0, 100% 55%); transform: rotate(-25deg);"></div>
      <!-- Pulse ring -->
      <span class="absolute w-7 h-7 bg-purple-500/30 rounded-full animate-ping"></span>
      <!-- Core circle -->
      <span class="w-4 h-4 bg-[#5B21B6] border-2 border-white rounded-full shadow-md z-10"></span>
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
  className = '',
  showControls = true,
  onOpenDetails = null
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

    const initialCenter = userLocation
      ? [userLocation.lat, userLocation.lng]
      : DEFAULT_CENTER;

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: DEFAULT_ZOOM,
      zoomControl: false,
      attributionControl: false
    });

    // Standard OpenStreetMap tiles (100% free, no API key required)
    const tileLayer = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        maxZoom: 19,
        subdomains: ['a', 'b', 'c'],
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }
    );

    tileLayer.addTo(map);

    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 2. Update parking area markers whenever areas or selectedArea changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    const validAreas = areas.filter(
      (a) => typeof a.latitude === 'number' && typeof a.longitude === 'number'
    );

    validAreas.forEach((area) => {
      const isSelected = selectedArea?._id === area._id;
      const marker = L.marker([area.latitude, area.longitude], {
        icon: createParkingIcon(area, isSelected),
        title: area.name,
        zIndexOffset: isSelected ? 1000 : 100
      });

      marker.on('click', () => {
        onSelectArea(area);
      });

      marker.addTo(markersLayer);
    });
  }, [areas, selectedArea, onSelectArea]);

  // 3. Center map when a facility is selected
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedArea) return;

    if (typeof selectedArea.latitude === 'number' && typeof selectedArea.longitude === 'number') {
      map.flyTo([selectedArea.latitude, selectedArea.longitude], Math.max(map.getZoom(), 14), {
        duration: 0.6
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
          '<div class="font-sans text-xs font-bold text-indigo-900 px-2 py-1">📍 You are here (Live GPS)</div>',
          { offset: [0, -10] }
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

  return (
    <div className={`relative w-full h-full overflow-hidden bg-slate-100 ${className}`}>
      {/* Leaflet DOM container */}
      <div ref={mapContainerRef} className="w-full h-full min-h-[350px] z-0" />

      {/* Floating Status Notification Pill */}
      {locationStatus && (
        <div className="absolute top-24 left-4 right-4 sm:left-auto sm:right-4 z-[1000] bg-slate-900/90 text-white text-xs font-medium px-4 py-2.5 rounded-xl backdrop-blur border border-slate-700 shadow-xl flex items-center justify-between gap-3 animate-in fade-in">
          <span>{locationStatus}</span>
          <button
            onClick={() => setLocationStatus('')}
            className="text-slate-400 hover:text-white font-bold ml-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Tile loading error fallback */}
      {tileError && (
        <div className="absolute top-20 right-4 z-[1000] bg-amber-50 border border-amber-200 text-amber-900 text-xs px-3 py-2 rounded-xl shadow-md flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Map tiles couldn't load. Card listings remain active.</span>
        </div>
      )}

      {/* Floating Map Re-center Bounds Button (bottom-right above carousel) */}
      {showControls && (
        <button
          type="button"
          onClick={handleResetBounds}
          title="Fit all parking spots"
          className="absolute bottom-28 right-4 z-[900] w-10 h-10 bg-white hover:bg-slate-50 text-slate-700 rounded-full shadow-lg border border-slate-200/90 flex items-center justify-center transition active:scale-95"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
