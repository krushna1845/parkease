import { Link } from 'react-router-dom';
import {
  MapPin,
  Shield,
  Zap,
  Video,
  Clock,
  ChevronRight,
  Car,
  Bike,
  Navigation,
  Compass,
  CheckCircle2
} from 'lucide-react';

const DEFAULT_IMAGES = [
  'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1573348722427-f1d6819fdf98?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=800&q=80'
];

const AMENITY_CONFIG = {
  cctv: { label: 'CCTV', icon: Video },
  covered: { label: 'Covered', icon: Shield },
  security_guard: { label: 'Guarded', icon: Shield },
  ev_charging: { label: 'EV Charger', icon: Zap },
  valet: { label: 'Valet', icon: Car },
  disabled_access: { label: 'Accessible', icon: CheckCircle2 }
};

export default function ParkingCard({
  area,
  index = 0,
  isSelected = false,
  onCardClick = null
}) {
  const imageUrl = DEFAULT_IMAGES[index % DEFAULT_IMAGES.length];
  const hasCoordinates =
    typeof area.latitude === 'number' && typeof area.longitude === 'number';

  const navUrl = hasCoordinates
    ? `https://www.google.com/maps/dir/?api=1&destination=${area.latitude},${area.longitude}`
    : null;

  const totalSlots = area.totalSlots ?? 6;
  const availableSlots = area.availableSlots ?? totalSlots;
  const isAvailable = availableSlots > 0;

  const recordedAmenities = Array.isArray(area.amenities) && area.amenities.length > 0
    ? area.amenities
    : ['cctv', 'security_guard'];

  return (
    <div
      onClick={onCardClick}
      className={`bg-white rounded-2xl border transition-all duration-300 flex flex-col overflow-hidden group ${
        isSelected
          ? 'border-emerald-500 shadow-lg ring-2 ring-emerald-500/30'
          : 'border-slate-200/90 shadow-xs hover:shadow-md hover:border-emerald-300'
      }`}
    >
      {/* Image container with price badge */}
      <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
        <img
          src={imageUrl}
          alt={area.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.parentElement.classList.add('bg-gradient-to-tr', 'from-slate-800', 'to-emerald-950');
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/20 to-transparent" />

        {/* Price tag */}
        <div className="absolute top-3 right-3 bg-white/95 backdrop-blur px-3 py-1 rounded-full shadow-xs border border-white/20 text-slate-900 font-bold text-sm">
          <span className="text-emerald-700 font-extrabold">₹{area.pricePerHour}</span>
          <span className="text-slate-500 font-medium text-xs"> / hr</span>
        </div>

        {/* City and distance badge */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 flex-wrap">
          <div className="bg-slate-900/80 backdrop-blur text-white text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            <span>{area.city}</span>
          </div>

          {typeof area.distanceKm === 'number' && (
            <div className="bg-emerald-600/90 backdrop-blur text-white text-[11px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm">
              <Compass className="w-3 h-3 text-emerald-200" />
              <span>{area.distanceKm < 1 ? `${Math.round(area.distanceKm * 1000)} m` : `${area.distanceKm.toFixed(1)} km`}</span>
            </div>
          )}
        </div>

        {/* Live availability pill */}
        <div className="absolute top-3 left-3">
          <span
            className={`inline-flex items-center gap-1.5 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full shadow-sm backdrop-blur ${
              isAvailable
                ? 'bg-emerald-500/90 text-white'
                : 'bg-rose-600/90 text-white'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isAvailable ? 'bg-white animate-pulse' : 'bg-white'}`} />
            {isAvailable ? `${availableSlots} / ${totalSlots} Open` : 'Full'}
          </span>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-base text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-1">
              {area.name}
            </h3>
          </div>

          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
            {area.address || `${area.city} Central Parking Facility`}
          </p>

          {/* Vehicle type & operating hours metadata */}
          <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-500">
            {Array.isArray(area.vehicleTypes) && area.vehicleTypes.length > 0 && (
              <div className="flex items-center gap-1 bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded-md">
                {area.vehicleTypes.includes('car') && <Car className="w-3 h-3 text-slate-600" title="Car parking" />}
                {area.vehicleTypes.includes('bike') && <Bike className="w-3 h-3 text-slate-600" title="Bike parking" />}
                <span className="capitalize">{area.vehicleTypes.join(' & ')}</span>
              </div>
            )}
            {area.openingHours && (
              <span className="inline-flex items-center gap-1 text-slate-400">
                <Clock className="w-3 h-3" />
                {area.openingHours}
              </span>
            )}
          </div>

          {/* Amenities pill list */}
          <div className="flex flex-wrap gap-1 mt-2.5 pt-2.5 border-t border-slate-100 text-[10px] text-slate-600 font-medium">
            {recordedAmenities.slice(0, 3).map((amenityId) => {
              const config = AMENITY_CONFIG[amenityId] || { label: amenityId, icon: Shield };
              const IconComp = config.icon;
              return (
                <span
                  key={amenityId}
                  className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200/80 px-1.5 py-0.5 rounded-md"
                >
                  <IconComp className="w-2.5 h-2.5 text-emerald-600" />
                  {config.label}
                </span>
              );
            })}
            {recordedAmenities.length > 3 && (
              <span className="text-slate-400 self-center text-[10px] px-1">
                +{recordedAmenities.length - 3} more
              </span>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100">
          {navUrl ? (
            <a
              href={navUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-emerald-700 px-2 py-1 rounded-lg hover:bg-slate-100 transition"
              title="Open Google Maps Directions"
            >
              <Navigation className="w-3 h-3 text-emerald-600" />
              Navigate
            </a>
          ) : (
            <span className="text-[11px] text-slate-400 font-medium">Verified Facility</span>
          )}

          <Link
            to={`/parking/${area._id}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl transition"
          >
            Select Spot
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
