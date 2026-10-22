import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Search,
  MapPin,
  SlidersHorizontal,
  RotateCcw,
  Car,
  Bike,
  DollarSign,
  ArrowUpDown,
  Navigation,
  Compass,
  LocateFixed,
  ShieldCheck,
  Check,
  Map,
  List,
  Sparkles,
  Info
} from 'lucide-react';
import { parkingService } from '../services/parkingService';
import ParkingCard from '../components/ParkingCard';
import ParkingMap from '../components/ParkingMap';

// Calculate Haversine distance in kilometers between two GPS coordinates
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (
    lat1 === null || lat1 === undefined ||
    lon1 === null || lon1 === undefined ||
    lat2 === null || lat2 === undefined ||
    lon2 === null || lon2 === undefined
  ) {
    return null;
  }
  const R = 6371; // Earth radius in km
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

const AMENITY_FILTER_OPTIONS = [
  { id: 'cctv', label: 'CCTV' },
  { id: 'covered', label: 'Covered' },
  { id: 'security_guard', label: 'Guarded' },
  { id: 'ev_charging', label: 'EV Charger' },
  { id: 'valet', label: 'Valet' },
  { id: 'disabled_access', label: 'Accessible' }
];

export default function FindParking() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const initialType = searchParams.get('type') || 'all';

  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filter States
  const [query, setQuery] = useState(initialQuery);
  const [selectedCity, setSelectedCity] = useState('all');
  const [selectedVehicleType, setSelectedVehicleType] = useState(initialType);
  const [onlyAvailableNow, setOnlyAvailableNow] = useState(false);
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [maxPrice, setMaxPrice] = useState(200);
  const [sortBy, setSortBy] = useState('price-asc');

  // Map & Interaction states
  const [selectedAreaOnMap, setSelectedAreaOnMap] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [mobileView, setMobileView] = useState('split'); // 'list', 'map', 'split'

  const cardRefs = useRef({});

  // Fetch areas from API with search query
  useEffect(() => {
    setLoading(true);
    parkingService
      .getAll(query)
      .then((data) => {
        setAreas(data);
        if (data.length > 0 && !selectedAreaOnMap) {
          setSelectedAreaOnMap(data[0]);
        }
      })
      .catch(() => setError('Failed to load parking facilities. Please verify the backend API.'))
      .finally(() => setLoading(false));
  }, [query]);

  // Unique cities from areas
  const cities = useMemo(() => {
    const list = Array.from(new Set(areas.map((a) => a.city).filter(Boolean)));
    return ['all', ...list];
  }, [areas]);

  // Compute distances for each area if user location is available
  const areasWithDistance = useMemo(() => {
    return areas.map((area) => {
      let distanceKm = null;
      if (
        userLocation &&
        typeof area.latitude === 'number' &&
        typeof area.longitude === 'number'
      ) {
        distanceKm = calculateDistanceKm(
          userLocation.lat,
          userLocation.lng,
          area.latitude,
          area.longitude
        );
      }
      return {
        ...area,
        distanceKm
      };
    });
  }, [areas, userLocation]);

  // Filtered and sorted facilities
  const filteredAreas = useMemo(() => {
    return areasWithDistance
      .filter((a) => {
        const matchesCity =
          selectedCity === 'all' || a.city.toLowerCase() === selectedCity.toLowerCase();
        const matchesPrice = a.pricePerHour <= maxPrice;

        // Vehicle type filter
        const matchesVehicle =
          selectedVehicleType === 'all' ||
          (Array.isArray(a.vehicleTypes) && a.vehicleTypes.includes(selectedVehicleType)) ||
          !a.vehicleTypes; // fallback if area has no explicit slots yet

        // Real availability filter
        const matchesAvailability =
          !onlyAvailableNow || (a.availableSlots !== undefined ? a.availableSlots > 0 : true);

        // Amenities filter
        const matchesAmenities =
          selectedAmenities.length === 0 ||
          (Array.isArray(a.amenities) &&
            selectedAmenities.every((amenity) => a.amenities.includes(amenity)));

        return (
          matchesCity &&
          matchesPrice &&
          matchesVehicle &&
          matchesAvailability &&
          matchesAmenities
        );
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') return a.pricePerHour - b.pricePerHour;
        if (sortBy === 'price-desc') return b.pricePerHour - a.pricePerHour;
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'distance') {
          if (a.distanceKm === null && b.distanceKm === null) return 0;
          if (a.distanceKm === null) return 1;
          if (b.distanceKm === null) return -1;
          return a.distanceKm - b.distanceKm;
        }
        return 0;
      });
  }, [
    areasWithDistance,
    selectedCity,
    maxPrice,
    selectedVehicleType,
    onlyAvailableNow,
    selectedAmenities,
    sortBy
  ]);

  // Scroll facility card into view when clicked on map
  const handleSelectAreaFromMap = (area) => {
    setSelectedAreaOnMap(area);
    const cardEl = cardRefs.current[area._id];
    if (cardEl) {
      cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const handleUserLocationChange = (coords) => {
    setUserLocation(coords);
    setSortBy('distance'); // Automatically prioritize distance when user locates themselves!
  };

  const toggleAmenityFilter = (id) => {
    setSelectedAmenities((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const handleResetFilters = () => {
    setQuery('');
    setSelectedCity('all');
    setSelectedVehicleType('all');
    setOnlyAvailableNow(false);
    setSelectedAmenities([]);
    setMaxPrice(200);
    setSortBy('price-asc');
    setSearchParams({});
  };

  const hasActiveFilters =
    Boolean(query) ||
    selectedCity !== 'all' ||
    selectedVehicleType !== 'all' ||
    onlyAvailableNow ||
    selectedAmenities.length > 0 ||
    maxPrice < 200 ||
    sortBy !== 'price-asc';

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16 px-4 sm:px-6 lg:px-8">
      {/* Header and Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Explore Parking Facilities</span>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-100/90 px-2.5 py-1 rounded-full border border-emerald-300">
              Live GPS Map
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Discover verified city garages with real-time slot availability and turn-by-turn navigation.
          </p>
        </div>

        {/* Mobile View Toggle Buttons */}
        <div className="flex lg:hidden items-center bg-slate-100 p-1 rounded-xl self-start border border-slate-200">
          <button
            type="button"
            onClick={() => setMobileView('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              mobileView === 'list'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <List className="w-3.5 h-3.5" /> List
          </button>
          <button
            type="button"
            onClick={() => setMobileView('map')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              mobileView === 'map'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Map className="w-3.5 h-3.5" /> Map
          </button>
          <button
            type="button"
            onClick={() => setMobileView('split')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              mobileView === 'split'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Compass className="w-3.5 h-3.5" /> Split
          </button>
        </div>
      </div>

      {/* Top Filter and Search Control Center */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
        {/* Row 1: Search Query + City + Vehicle + Sort Controls */}
        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
          {/* Search bar */}
          <div className="relative flex-1 max-w-lg">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by facility name, address, or landmark..."
              className="w-full text-sm pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* City Dropdown */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-semibold text-slate-500">City:</span>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {cities.map((c) => (
                  <option key={c} value={c}>
                    {c === 'all' ? 'All Cities' : c}
                  </option>
                ))}
              </select>
            </div>

            {/* Vehicle Type Filter */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setSelectedVehicleType('all')}
                className={`px-2.5 py-1 rounded-md font-bold transition ${
                  selectedVehicleType === 'all'
                    ? 'bg-white text-emerald-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setSelectedVehicleType('car')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-bold transition ${
                  selectedVehicleType === 'car'
                    ? 'bg-white text-emerald-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Car className="w-3 h-3" /> Cars
              </button>
              <button
                type="button"
                onClick={() => setSelectedVehicleType('bike')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-bold transition ${
                  selectedVehicleType === 'bike'
                    ? 'bg-white text-emerald-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Bike className="w-3 h-3" /> Bikes
              </button>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-semibold text-slate-500">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="name">Facility Name (A–Z)</option>
                <option value="distance" disabled={!userLocation}>
                  {userLocation ? '📍 Nearest to Me' : '📍 Distance (Use Locate Me)'}
                </option>
              </select>
            </div>

            {/* Reset Button */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-bold px-2.5 py-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 transition"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Amenities Filter Pills + Availability Toggle + Price Slider */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-3 border-t border-slate-100 text-xs">
          {/* Amenities & Availability */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Live Availability Toggle */}
            <button
              type="button"
              onClick={() => setOnlyAvailableNow((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold border transition ${
                onlyAvailableNow
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${onlyAvailableNow ? 'bg-white' : 'bg-emerald-500'}`} />
              Available Now Only
            </button>

            {/* Amenity Badges */}
            {AMENITY_FILTER_OPTIONS.map((amenity) => {
              const active = selectedAmenities.includes(amenity.id);
              return (
                <button
                  key={amenity.id}
                  type="button"
                  onClick={() => toggleAmenityFilter(amenity.id)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                    active
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {active && <Check className="w-3 h-3 text-emerald-600" />}
                  {amenity.label}
                </button>
              );
            })}
          </div>

          {/* Max Hourly Rate Slider */}
          <div className="flex items-center gap-3 shrink-0">
            <span className="font-semibold text-slate-500">Max Rate:</span>
            <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
              ₹{maxPrice}/hr
            </span>
            <input
              type="range"
              min="20"
              max="200"
              step="10"
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-36 accent-emerald-600 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Main Content Layout: Grid of Cards + Real Leaflet Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Facilities List (Columns 1-7 on desktop) */}
        <div
          className={`space-y-4 ${
            mobileView === 'map' ? 'hidden lg:block' : 'block'
          } lg:col-span-7`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 px-1">
            <span>
              Showing <strong className="text-slate-900 font-bold">{filteredAreas.length}</strong> matching parking facilities
            </span>
            {userLocation && (
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <Compass className="w-3.5 h-3.5" /> Distances calculated from your GPS
              </span>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-72 bg-white rounded-2xl border border-slate-100 p-4 animate-pulse space-y-3">
                  <div className="h-36 bg-slate-100 rounded-xl" />
                  <div className="h-4 bg-slate-100 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="p-8 bg-rose-50 border border-rose-200 rounded-2xl text-center text-rose-800 text-sm">
              {error}
            </div>
          ) : filteredAreas.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredAreas.map((area, idx) => (
                <div
                  key={area._id}
                  ref={(el) => (cardRefs.current[area._id] = el)}
                  onMouseEnter={() => setSelectedAreaOnMap(area)}
                  onClick={() => setSelectedAreaOnMap(area)}
                  className="cursor-pointer transition"
                >
                  <ParkingCard
                    area={area}
                    index={idx}
                    isSelected={selectedAreaOnMap?._id === area._id}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200/90 p-12 text-center space-y-3">
              <Car className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-900">No parking facilities match your filters</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                Try widening your price range, searching for another city, or unchecking amenity filters.
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl hover:bg-emerald-100 transition"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>

        {/* Real Interactive Leaflet Map (Columns 8-12 on desktop, sticky) */}
        <div
          className={`${
            mobileView === 'list' ? 'hidden lg:block' : 'block'
          } lg:col-span-5 sticky top-20`}
        >
          <div className="bg-white rounded-3xl border border-slate-200/90 p-4 shadow-xs space-y-3">
            {/* Map Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-emerald-600" />
                <span className="font-bold text-sm text-slate-900">Interactive Parking Map</span>
              </div>
              <span className="text-[11px] font-semibold text-slate-400">OpenStreetMap</span>
            </div>

            {/* Interactive Leaflet Map Component */}
            <ParkingMap
              areas={filteredAreas}
              selectedArea={selectedAreaOnMap}
              onSelectArea={handleSelectAreaFromMap}
              userLocation={userLocation}
              onUserLocationChange={handleUserLocationChange}
              className="h-[480px] w-full"
            />

            {/* Map Interaction Legend and Help */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Available
                </span>
                <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span> Full
                </span>
              </div>
              <span className="text-[10px] text-slate-400">
                Click pin to view rates & directions
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
