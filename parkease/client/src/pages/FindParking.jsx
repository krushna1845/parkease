import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Search,
  MapPin,
  Car,
  Bike,
  LocateFixed,
  Bookmark,
  Calendar,
  List,
  Map as MapIcon,
  ChevronDown,
  ArrowLeft,
  Filter,
  RefreshCw,
  Sparkles,
  Compass,
  Check,
  Home as HomeIcon,
  LayoutDashboard
} from 'lucide-react';
import { parkingService } from '../services/parkingService';
import ParkingMap from '../components/ParkingMap';
import CarouselParkingCard from '../components/CarouselParkingCard';
import ParkingCard from '../components/ParkingCard';
import FacilitySheet from '../components/FacilitySheet';
import ConnectionIndicator from '../components/ConnectionIndicator';
import { useSocket } from '../context/SocketContext';

// Haversine distance in kilometers
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (
    lat1 === null || lat1 === undefined ||
    lon1 === null || lon1 === undefined ||
    lat2 === null || lat2 === undefined ||
    lon2 === null || lon2 === undefined
  ) {
    return null;
  }
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

// Default fallback coordinates: Kandivali / Mumbai
const DEFAULT_COORDS = { lat: 19.2025, lng: 72.8468 };
const DEFAULT_LOCATION_LABEL = 'Kandivali East, Mumbai City North';

export default function FindParking() {
  const [searchParams] = useSearchParams();
  const nav = useNavigate();

  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Location states
  const [userLocation, setUserLocation] = useState(null);
  const [locationLabel, setLocationLabel] = useState(DEFAULT_LOCATION_LABEL);
  const [locating, setLocating] = useState(false);
  const [locationPermissionStatus, setLocationPermissionStatus] = useState('prompt'); // 'prompt' | 'granted' | 'denied'

  // Filter states
  const [selectedVehicleType, setSelectedVehicleType] = useState('car'); // 'car' | 'bike' | 'all'
  const [vehicleMenuOpen, setVehicleMenuOpen] = useState(false);
  const [savedOnly, setSavedOnly] = useState(false);
  const [viewMode, setViewMode] = useState('map'); // 'map' | 'list'
  const [selectedArea, setSelectedArea] = useState(null);

  // Detailed sheet modal state (Picture 2)
  const [activeFacilitySheet, setActiveFacilitySheet] = useState(null);

  // Real-time update banner
  const [liveUpdateNotice, setLiveUpdateNotice] = useState(false);

  const carouselRef = useRef(null);
  const cardRefs = useRef({});
  const { subscribeToArea, unsubscribeFromArea, on } = useSocket() || {};

  // ─────────────────────────────────────────────────────────────────────────
  // 1. Fetch facilities from backend API
  // ─────────────────────────────────────────────────────────────────────────
  const loadAreas = useCallback(() => {
    setLoading(true);
    parkingService
      .getAll()
      .then((data) => {
        setAreas(data);
        if (data.length > 0 && !selectedArea) {
          setSelectedArea(data[0]);
        }
      })
      .catch(() => setError('Failed to load parking facilities. Please verify the backend.'))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadAreas();
  }, [loadAreas]);

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Reverse Geocoding helper to get friendly location name
  // ─────────────────────────────────────────────────────────────────────────
  const reverseGeocode = useCallback(async (lat, lng) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      if (res.ok) {
        const data = await res.json();
        const addr = data.address || {};
        const neighborhood = addr.suburb || addr.neighbourhood || addr.residential || addr.road || 'Current Location';
        const city = addr.city || addr.state_district || addr.county || 'Mumbai';
        setLocationLabel(`${neighborhood}, ${city}`);
        return;
      }
    } catch {
      // Fallback
    }
    setLocationLabel(DEFAULT_LOCATION_LABEL);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Request Geolocation Permission and continuously track live location
  // ─────────────────────────────────────────────────────────────────────────
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationPermissionStatus('denied');
      setUserLocation(DEFAULT_COORDS);
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setLocationPermissionStatus('granted');
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        };
        setUserLocation(coords);
        reverseGeocode(coords.lat, coords.lng);
      },
      (err) => {
        setLocating(false);
        setLocationPermissionStatus('denied');
        setUserLocation((prev) => prev || DEFAULT_COORDS);
        setLocationLabel(DEFAULT_LOCATION_LABEL);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [reverseGeocode]);

  // Continuously watch user's live position
  useEffect(() => {
    if (!navigator.geolocation) {
      setUserLocation(DEFAULT_COORDS);
      return;
    }

    requestLocation();

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setLocationPermissionStatus('granted');
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        };
        setUserLocation(coords);
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 10000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [requestLocation]);

  // ─────────────────────────────────────────────────────────────────────────
  // 4. Enrich & Sort facilities by live distance
  // ─────────────────────────────────────────────────────────────────────────
  const enrichedAreas = useMemo(() => {
    const origin = userLocation || DEFAULT_COORDS;
    let list = areas.map((area) => {
      const dist = calculateDistanceKm(
        origin.lat,
        origin.lng,
        area.latitude,
        area.longitude
      );
      return {
        ...area,
        distanceKm: dist !== null ? dist : 1.4
      };
    });

    // Sort by distance ascending (closest first)
    list.sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));

    // Filter by vehicle type
    if (selectedVehicleType !== 'all') {
      list = list.filter((a) => {
        if (!a.vehicleTypes || a.vehicleTypes.length === 0) return true;
        return a.vehicleTypes.includes(selectedVehicleType);
      });
    }

    // Filter saved if toggle enabled
    if (savedOnly) {
      list = list.slice(0, 3); // demo saved items
    }

    return list;
  }, [areas, userLocation, selectedVehicleType, savedOnly]);

  // Keep selected area in sync
  useEffect(() => {
    if (enrichedAreas.length > 0 && !selectedArea) {
      setSelectedArea(enrichedAreas[0]);
    }
  }, [enrichedAreas, selectedArea]);

  // Auto-scroll carousel when selectedArea changes
  const handleSelectArea = (area) => {
    setSelectedArea(area);
    const cardEl = cardRefs.current[area._id];
    if (cardEl && carouselRef.current) {
      cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // 5. Real-time Socket.IO Subscription
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!on || !subscribeToArea) return;

    enrichedAreas.forEach((area) => {
      subscribeToArea(area._id);
    });

    const unsubSlot = on('slot:updated', (payload) => {
      setLiveUpdateNotice(true);
      setAreas((prev) =>
        prev.map((a) => {
          if (a._id === payload.areaId) {
            const currentAvail = a.availableSlots ?? 6;
            const delta = payload.status === 'available' ? 1 : -1;
            return {
              ...a,
              availableSlots: Math.max(0, currentAvail + delta)
            };
          }
          return a;
        })
      );
    });

    const unsubReconnect = on('reconnected', () => {
      loadAreas();
    });

    return () => {
      enrichedAreas.forEach((area) => {
        if (unsubscribeFromArea) unsubscribeFromArea(area._id);
      });
      unsubSlot();
      unsubReconnect();
    };
  }, [enrichedAreas, on, subscribeToArea, unsubscribeFromArea, loadAreas]);

  return (
    <div className="relative w-full h-[calc(100vh-64px)] min-h-[600px] overflow-hidden bg-slate-900 select-none">
      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* Top Floating App Bar (Matching Picture 1) */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      <div className="absolute top-4 left-4 right-4 z-[1000] flex flex-col gap-2 pointer-events-none">
        <div className="flex items-center justify-between gap-2">
          {/* Back & Home Navigation Group */}
          <div className="pointer-events-auto flex items-center gap-1.5">
            <button
              onClick={() => {
                if (window.history.length > 1) {
                  nav(-1);
                } else {
                  nav('/');
                }
              }}
              className="w-11 h-11 rounded-2xl bg-white/95 hover:bg-white text-slate-800 shadow-lg border border-slate-200/80 flex items-center justify-center transition active:scale-95"
              title="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <Link
              to="/"
              className="w-11 h-11 rounded-2xl bg-white/95 hover:bg-white text-emerald-700 shadow-lg border border-slate-200/80 flex items-center justify-center transition active:scale-95"
              title="Return to Home Page"
            >
              <HomeIcon className="w-5 h-5" />
            </Link>
          </div>

          {/* Location Center Pill Card */}
          <div className="pointer-events-auto flex-1 max-w-md mx-auto bg-white/95 backdrop-blur rounded-2xl px-4 py-2.5 shadow-lg border border-slate-200/80 flex items-center justify-center gap-2">
            <span className="font-extrabold text-xs sm:text-sm text-slate-900 tracking-tight truncate text-center">
              {locationLabel}
            </span>
          </div>

          {/* Dashboard & Locate Me Group */}
          <div className="pointer-events-auto flex items-center gap-1.5">
            <Link
              to="/dashboard"
              className="w-11 h-11 rounded-2xl bg-white/95 hover:bg-white text-indigo-700 shadow-lg border border-slate-200/80 flex items-center justify-center transition active:scale-95"
              title="Go to Dashboard"
            >
              <LayoutDashboard className="w-5 h-5" />
            </Link>

            <button
              onClick={requestLocation}
              disabled={locating}
              title="Locate my position live"
              className="w-11 h-11 rounded-2xl bg-white/95 hover:bg-white text-indigo-700 shadow-lg border border-slate-200/80 flex items-center justify-center transition active:scale-95"
            >
              <LocateFixed className={`w-5 h-5 ${locating ? 'animate-spin text-purple-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filter Chips Bar (Home, Dashboard, Saved, My Bookings, Car dropdown) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pointer-events-auto">
          {/* Quick Home Pill */}
          <Link
            to="/"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-white/95 backdrop-blur text-slate-800 border border-slate-200/80 shadow-md hover:bg-white hover:text-emerald-700 transition active:scale-95 whitespace-nowrap"
          >
            <HomeIcon className="w-3.5 h-3.5 text-emerald-600" />
            <span>Home</span>
          </Link>

          {/* Quick Dashboard Pill */}
          <Link
            to="/dashboard"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-white/95 backdrop-blur text-slate-800 border border-slate-200/80 shadow-md hover:bg-white hover:text-indigo-700 transition active:scale-95 whitespace-nowrap"
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-indigo-600" />
            <span>Dashboard</span>
          </Link>

          {/* Saved Pill */}
          <button
            onClick={() => setSavedOnly(!savedOnly)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold shadow-md border transition active:scale-95 whitespace-nowrap ${
              savedOnly
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white/95 backdrop-blur text-slate-800 border-slate-200/80 hover:bg-white'
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${savedOnly ? 'fill-white' : ''}`} />
            <span>Saved</span>
          </button>

          {/* My Bookings Pill */}
          <Link
            to="/my-bookings"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-white/95 backdrop-blur text-slate-800 border border-slate-200/80 shadow-md hover:bg-white hover:text-indigo-700 transition active:scale-95 whitespace-nowrap"
          >
            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
            <span>My Bookings</span>
          </Link>

          {/* Vehicle Type Dropdown Pill */}
          <div className="relative">
            <button
              onClick={() => setVehicleMenuOpen(!vehicleMenuOpen)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-white/95 backdrop-blur text-slate-800 border border-slate-200/80 shadow-md hover:bg-white transition active:scale-95 whitespace-nowrap"
            >
              {selectedVehicleType === 'bike' ? (
                <Bike className="w-3.5 h-3.5 text-indigo-600" />
              ) : (
                <Car className="w-3.5 h-3.5 text-indigo-600" />
              )}
              <span className="capitalize">{selectedVehicleType}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {vehicleMenuOpen && (
              <div className="absolute left-0 mt-2 w-32 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-50 text-xs">
                {['car', 'bike', 'all'].map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setSelectedVehicleType(t);
                      setVehicleMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between font-bold capitalize transition ${
                      selectedVehicleType === t
                        ? 'text-indigo-700 bg-indigo-50'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{t}</span>
                    {selectedVehicleType === t && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Connection Indicator badge */}
          <div className="ml-auto shrink-0">
            <ConnectionIndicator />
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* Real-time Socket Update Notification Banner */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      {liveUpdateNotice && (
        <div className="absolute top-28 left-1/2 -translate-x-1/2 z-[1000] bg-indigo-900/90 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-xl border border-indigo-500/40 backdrop-blur flex items-center gap-2 animate-in fade-in">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>Real-time availability updated</span>
          <button
            onClick={() => setLiveUpdateNotice(false)}
            className="text-indigo-300 hover:text-white font-bold ml-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* Live Map or List View */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      {viewMode === 'map' ? (
        <ParkingMap
          areas={enrichedAreas}
          selectedArea={selectedArea}
          onSelectArea={handleSelectArea}
          userLocation={userLocation}
          onUserLocationChange={(coords) => {
            setUserLocation(coords);
            reverseGeocode(coords.lat, coords.lng);
          }}
          className="w-full h-full"
        />
      ) : (
        <div className="w-full h-full bg-slate-50 overflow-y-auto pt-32 pb-24 px-4 sm:px-6 max-w-4xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-extrabold text-lg text-slate-900">
              Nearby Parking Spots ({enrichedAreas.length})
            </h2>
            <button
              onClick={() => setViewMode('map')}
              className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
            >
              <MapIcon className="w-3.5 h-3.5" /> Open Map
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {enrichedAreas.map((area, idx) => (
              <ParkingCard
                key={area._id}
                area={area}
                index={idx}
                isSelected={selectedArea?._id === area._id}
                onCardClick={() => {
                  setSelectedArea(area);
                  setActiveFacilitySheet(area);
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* Floating "List View" Toggle Button (Centered above cards, matching Picture 1) */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      {viewMode === 'map' && (
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-[1000]">
          <button
            onClick={() => setViewMode('list')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-900/95 hover:bg-slate-900 text-white text-xs font-bold shadow-xl border border-slate-700 backdrop-blur transition active:scale-95"
          >
            <List className="w-4 h-4" />
            <span>List View</span>
          </button>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* Bottom Horizontal Cards Carousel (Matching Picture 1) */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      {viewMode === 'map' && enrichedAreas.length > 0 && (
        <div
          ref={carouselRef}
          className="absolute bottom-4 left-0 right-0 z-[1000] px-4 flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory"
        >
          {enrichedAreas.map((area) => (
            <div
              key={area._id}
              ref={(el) => (cardRefs.current[area._id] = el)}
              className="snap-center"
            >
              <CarouselParkingCard
                area={area}
                isSelected={selectedArea?._id === area._id}
                onClick={() => {
                  setSelectedArea(area);
                  setActiveFacilitySheet(area);
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* Facility Details Bottom Sheet Modal (Matching Picture 2) */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      {activeFacilitySheet && (
        <FacilitySheet
          area={activeFacilitySheet}
          onClose={() => setActiveFacilitySheet(null)}
          onSelectSlot={(facility) => {
            nav(`/parking/${facility._id}`);
          }}
        />
      )}
    </div>
  );
}
