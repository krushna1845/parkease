import { Link } from 'react-router-dom';
import { MapPin, Shield, Zap, Video, Clock, ChevronRight } from 'lucide-react';

// Reliable curated parking garage photography with fallback gradient
const DEFAULT_IMAGES = [
  'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1573348722427-f1d6819fdf98?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=800&q=80'
];

export default function ParkingCard({ area, index = 0, availableCount = null }) {
  const imageUrl = DEFAULT_IMAGES[index % DEFAULT_IMAGES.length];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col overflow-hidden group hover:border-emerald-300">
      {/* Image container with price badge */}
      <div className="relative h-48 w-full bg-slate-100 overflow-hidden">
        <img
          src={imageUrl}
          alt={area.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            // Fallback gradient if external image fails
            e.target.style.display = 'none';
            e.target.parentElement.classList.add('bg-gradient-to-tr', 'from-slate-800', 'to-emerald-950');
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />

        {/* Price tag */}
        <div className="absolute top-3 right-3 bg-white/95 backdrop-blur px-3 py-1 rounded-full shadow-xs border border-white/20 text-slate-900 font-bold text-sm">
          <span className="text-emerald-700 font-extrabold">₹{area.pricePerHour}</span>
          <span className="text-slate-500 font-medium text-xs"> / hour</span>
        </div>

        {/* City tag */}
        <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur text-white text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5 text-emerald-400" />
          <span>{area.city}</span>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          <h3 className="font-bold text-lg text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-1">
            {area.name}
          </h3>
          <p className="text-xs text-slate-500 mt-1 line-clamp-2">
            {area.address || `${area.city} Central Parking Facility`}
          </p>

          {/* Amenities pill list */}
          <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-600 font-medium">
            <span className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200/80 px-2 py-0.5 rounded-md">
              <Video className="w-3 h-3 text-emerald-600" /> CCTV 24/7
            </span>
            <span className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200/80 px-2 py-0.5 rounded-md">
              <Shield className="w-3 h-3 text-emerald-600" /> Guarded
            </span>
            <span className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200/80 px-2 py-0.5 rounded-md">
              <Clock className="w-3 h-3 text-emerald-600" /> Instant Lock
            </span>
          </div>
        </div>

        {/* Footer actions */}
        <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100">
          <div className="text-xs">
            <span className="text-emerald-700 font-bold">● Active Facility</span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to={`/parking/${area._id}`}
              className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-2 rounded-xl transition"
            >
              Select Spot
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
