import { MapPin, Tag, CreditCard } from 'lucide-react';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&w=400&q=80';

export default function CarouselParkingCard({
  area,
  isSelected = false,
  onClick = () => {}
}) {
  const imageUrl = Array.isArray(area.images) && area.images[0]
    ? area.images[0]
    : FALLBACK_IMAGE;

  const formattedDistance = area.distanceKm !== undefined && area.distanceKm !== null
    ? (area.distanceKm < 1 ? `${Math.round(area.distanceKm * 1000)} m` : `${area.distanceKm.toFixed(1)} km`)
    : '1.4 km';

  return (
    <div
      onClick={onClick}
      className={`cursor-pointer w-[300px] sm:w-[320px] shrink-0 bg-white rounded-2xl p-3 border transition-all duration-200 flex items-center gap-3 select-none ${
        isSelected
          ? 'border-indigo-600 shadow-xl ring-2 ring-indigo-300/60 scale-[1.02]'
          : 'border-slate-200/90 shadow-md hover:border-indigo-300 hover:shadow-lg'
      }`}
    >
      {/* Thumbnail */}
      <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-100 shrink-0 relative">
        <img
          src={imageUrl}
          alt={area.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 space-y-1">
        <h4 className="font-extrabold text-sm text-slate-900 truncate tracking-tight">
          {area.name}
        </h4>

        <div className="flex items-center gap-1 text-xs font-bold text-slate-500">
          <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          <span className="truncate">{formattedDistance}</span>
        </div>

        <div className="flex items-center gap-2 pt-0.5">
          <div className="flex items-center gap-1 text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
            <span className="text-[10px]">🏷️</span>
            <span>₹{area.pricePerHour || 40}</span>
          </div>

          <div className="flex items-center gap-1 text-[11px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md">
            <CreditCard className="w-3 h-3 text-sky-600" />
            <span>Pay online</span>
          </div>
        </div>
      </div>
    </div>
  );
}
