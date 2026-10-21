import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Search,
  MapPin,
  SlidersHorizontal,
  RotateCcw,
  Car,
  DollarSign,
  ArrowUpDown,
  Navigation,
  Compass
} from 'lucide-react';
import { parkingService } from '../services/parkingService';
import ParkingCard from '../components/ParkingCard';

export default function FindParking() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filter States
  const [query, setQuery] = useState(initialQuery);
  const [selectedCity, setSelectedCity] = useState('all');
  const [maxPrice, setMaxPrice] = useState(200);
  const [sortBy, setSortBy] = useState('price-asc');
  const [selectedAreaOnMap, setSelectedAreaOnMap] = useState(null);

  // Fetch all areas from API
  useEffect(() => {
    setLoading(true);
    parkingService
      .getAll(query)
      .then((data) => {
        setAreas(data);
        if (data.length > 0) setSelectedAreaOnMap(data[0]);
      })
      .catch((err) => setError('Failed to load parking facilities. Please verify the backend API.'))
      .finally(() => setLoading(false));
  }, [query]);

  // Unique cities from areas
  const cities = useMemo(() => {
    const list = Array.from(new Set(areas.map((a) => a.city).filter(Boolean)));
    return ['all', ...list];
  }, [areas]);

  // Filtered and sorted list
  const filteredAreas = useMemo(() => {
    return areas
      .filter((a) => {
        const matchesCity = selectedCity === 'all' || a.city.toLowerCase() === selectedCity.toLowerCase();
        const matchesPrice = a.pricePerHour <= maxPrice;
        return matchesCity && matchesPrice;
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') return a.pricePerHour - b.pricePerHour;
        if (sortBy === 'price-desc') return b.pricePerHour - a.pricePerHour;
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        return 0;
      });
  }, [areas, selectedCity, maxPrice, sortBy]);

  const handleResetFilters = () => {
    setQuery('');
    setSelectedCity('all');
    setMaxPrice(200);
    setSortBy('price-asc');
    setSearchParams({});
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Filter and Search Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by facility name, address, or city..."
              className="w-full text-sm pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* City Filter */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-semibold text-slate-500">City:</span>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {cities.map((c) => (
                  <option key={c} value={c}>
                    {c === 'all' ? 'All Cities' : c}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Filter */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-semibold text-slate-500">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="name">Facility Name</option>
              </select>
            </div>

            {/* Reset Filter Button */}
            {(selectedCity !== 'all' || maxPrice < 200 || query) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-semibold px-2.5 py-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 transition"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            )}
          </div>
        </div>

        {/* Max price slider */}
        <div className="flex items-center justify-between gap-4 pt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-500">Max Rate:</span>
            <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              ₹{maxPrice}/hr
            </span>
          </div>
          <input
            type="range"
            min="20"
            max="200"
            step="10"
            value={maxPrice}
            onChange={(e) => setMaxPrice(Number(e.target.value))}
            className="w-48 accent-emerald-600"
          />
        </div>
      </div>

      {/* Main Layout: List & Map View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Parking Cards Grid */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>
              Showing <strong className="text-slate-800">{filteredAreas.length}</strong> available parking facilities
            </span>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-64 bg-white rounded-2xl border border-slate-100 p-4 animate-pulse" />
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
                  onMouseEnter={() => setSelectedAreaOnMap(area)}
                  className="cursor-pointer"
                >
                  <ParkingCard area={area} index={idx} />
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
              <Car className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-900">No parking facilities match your filters</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Try widening your price range, searching for another city, or clearing your query filters.
              </p>
              <button
                onClick={handleResetFilters}
                className="mt-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>

        {/* Right Side: Visual Interactive Parking Locator Map Card */}
        <div className="lg:col-span-4 sticky top-24 hidden lg:block">
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-emerald-600" />
                <span className="font-bold text-sm text-slate-900">City Parking Map</span>
              </div>
              <span className="text-[11px] font-semibold text-slate-400">GPS Schematic</span>
            </div>

            {/* Simulated Schematic Map Canvas */}
            <div className="relative h-72 w-full bg-slate-900 rounded-xl overflow-hidden p-4 border border-slate-800 flex flex-col justify-between">
              {/* Grid road lines */}
              <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px]" />
              <div className="absolute inset-x-0 top-1/3 h-1 bg-slate-800" />
              <div className="absolute inset-x-0 top-2/3 h-1 bg-slate-800" />
              <div className="absolute inset-y-0 left-1/3 w-1 bg-slate-800" />
              <div className="absolute inset-y-0 left-2/3 w-1 bg-slate-800" />

              {/* Pins for each facility */}
              {filteredAreas.map((area, idx) => {
                const isSelected = selectedAreaOnMap?._id === area._id;
                // Distribute pseudo coordinates across schematic grid
                const leftPercent = 20 + ((idx * 28) % 65);
                const topPercent = 25 + ((idx * 33) % 55);

                return (
                  <button
                    key={area._id}
                    onClick={() => setSelectedAreaOnMap(area)}
                    style={{ left: `${leftPercent}%`, top: `${topPercent}%` }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 p-1.5 rounded-full shadow-lg transition-transform hover:scale-125 ${
                      isSelected
                        ? 'bg-emerald-500 text-white ring-4 ring-emerald-400/40 z-20 scale-110'
                        : 'bg-white text-slate-900 hover:bg-emerald-50 z-10'
                    }`}
                  >
                    <MapPin className="w-4 h-4" />
                  </button>
                );
              })}

              <div className="relative z-10 text-[10px] text-slate-400 font-mono">
                LIVE GPS · {selectedCity.toUpperCase()} HUB
              </div>

              {/* Active selection preview banner */}
              {selectedAreaOnMap && (
                <div className="relative z-10 bg-slate-900/90 backdrop-blur p-2.5 rounded-lg border border-slate-700 text-white space-y-1">
                  <p className="font-bold text-xs text-emerald-400 truncate">{selectedAreaOnMap.name}</p>
                  <p className="text-[10px] text-slate-300 truncate">{selectedAreaOnMap.city} • ₹{selectedAreaOnMap.pricePerHour}/hr</p>
                  <Link
                    to={`/parking/${selectedAreaOnMap._id}`}
                    className="block text-center text-[10px] font-bold text-emerald-300 hover:text-emerald-200 mt-1 underline"
                  >
                    View Slots & Reserve →
                  </Link>
                </div>
              )}
            </div>

            <p className="text-[11px] text-slate-400 text-center leading-normal">
              Click on pins or hover over facility cards to view detailed location parameters and rates.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
