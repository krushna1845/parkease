import { Car, Bike, Lock, Ban, Check } from 'lucide-react';

export default function SlotGrid({ slots = [], selectedSlot = null, onSelectSlot, loading = false }) {
  if (loading) {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 py-6">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!slots.length) {
    return (
      <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6">
        <Car className="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <p className="text-slate-600 font-semibold text-sm">No parking slots configured for this area</p>
        <p className="text-xs text-slate-400 mt-1">Please check back later or select another facility.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-md bg-white border-2 border-emerald-500 shadow-2xs" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-md bg-emerald-600 border border-emerald-700 shadow-2xs" />
          <span>Selected</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-md bg-slate-200 border border-slate-300 text-slate-500" />
          <span>Occupied / Held</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-md bg-rose-100 border border-rose-300 text-rose-500" />
          <span>Maintenance</span>
        </div>
      </div>

      {/* Slots interactive grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {slots.map((s) => {
          const isSelected = selectedSlot?._id === s._id;
          const isAvailable = s.available && s.isActive;
          const isMaintenance = !s.isActive;

          let cardStyle = '';
          if (isSelected) {
            cardStyle = 'bg-emerald-600 text-white border-emerald-700 shadow-md ring-2 ring-emerald-500 ring-offset-2 scale-102';
          } else if (isMaintenance) {
            cardStyle = 'bg-rose-50/70 text-rose-400 border-rose-200 cursor-not-allowed opacity-75';
          } else if (isAvailable) {
            cardStyle = 'bg-white text-slate-800 border-slate-200 hover:border-emerald-500 hover:shadow-sm cursor-pointer hover:-translate-y-0.5';
          } else {
            // Occupied
            cardStyle = 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-80';
          }

          return (
            <button
              key={s._id}
              type="button"
              disabled={!isAvailable}
              onClick={() => isAvailable && onSelectSlot(s)}
              className={`p-3 rounded-xl border text-center transition-all duration-200 flex flex-col items-center justify-between min-h-[90px] ${cardStyle}`}
            >
              {/* Type icon & badge */}
              <div className="w-full flex items-center justify-between text-xs">
                {s.type === 'bike' ? (
                  <Bike className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                ) : (
                  <Car className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                )}
                <span className={`text-[10px] uppercase font-bold tracking-wider ${isSelected ? 'text-emerald-100' : 'text-slate-400'}`}>
                  {s.type}
                </span>
              </div>

              {/* Slot Number */}
              <div className="my-1">
                <span className={`text-base font-extrabold tracking-tight ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                  {s.slotNumber}
                </span>
              </div>

              {/* State label */}
              <div className="text-[11px] font-semibold flex items-center gap-1">
                {isSelected ? (
                  <span className="text-white flex items-center gap-0.5">
                    <Check className="w-3 h-3" /> Selected
                  </span>
                ) : isMaintenance ? (
                  <span className="text-rose-500 flex items-center gap-0.5">
                    <Ban className="w-3 h-3" /> Offline
                  </span>
                ) : isAvailable ? (
                  <span className="text-emerald-600 font-bold">Available</span>
                ) : (
                  <span className="text-slate-500 flex items-center gap-0.5">
                    <Lock className="w-3 h-3" /> Booked
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
