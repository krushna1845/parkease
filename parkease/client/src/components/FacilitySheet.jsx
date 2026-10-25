import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Bookmark,
  Share2,
  Navigation,
  Star,
  CheckCircle2,
  Calendar,
  Clock,
  Edit2,
  KeyRound,
  Shield,
  Video,
  Zap,
  Car,
  ChevronLeft,
  ChevronRight,
  Info
} from 'lucide-react';
import { useAuth } from '../AuthContext';

const AMENITY_MAP = {
  cctv: { label: 'CCTV Surveillance', icon: Video },
  covered: { label: 'Covered Parking', icon: Shield },
  security_guard: { label: 'Security Guard', icon: Shield },
  ev_charging: { label: 'EV Charging Station', icon: Zap },
  valet: { label: 'Valet Parking', icon: Car },
  disabled_access: { label: 'Accessible Parking', icon: CheckCircle2 }
};

const DEFAULT_IMAGES = [
  'https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1621929747188-0b4dc28498d2?auto=format&fit=crop&w=800&q=80'
];

export default function FacilitySheet({
  area,
  onClose,
  bookingTimes = null,
  onEditTimes = null,
  onSelectSlot = null
}) {
  const nav = useNavigate();
  const { user } = useAuth();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [saved, setSaved] = useState(false);

  if (!area) return null;

  const images = Array.isArray(area.images) && area.images.length > 0
    ? area.images
    : DEFAULT_IMAGES;

  const formattedDistance = area.distanceKm !== undefined && area.distanceKm !== null
    ? (area.distanceKm < 1 ? `${Math.round(area.distanceKm * 1000)} m` : `${area.distanceKm.toFixed(1)} km`)
    : '1.4 km';

  const navUrl = area.latitude && area.longitude
    ? `https://www.google.com/maps/dir/?api=1&destination=${area.latitude},${area.longitude}`
    : '#';

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: area.name,
          text: `Check out parking at ${area.name} on ParkEase`,
          url: window.location.href
        });
      } catch (e) {
        // user cancelled
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  const handleActionClick = () => {
    if (!user) {
      nav('/login');
    } else if (onSelectSlot) {
      onSelectSlot(area);
    } else {
      nav(`/parking/${area._id}`);
    }
  };

  // Format In and Out dates for "When do you want to park?"
  const inDate = bookingTimes?.inDate || new Date(Date.now() + 3600_000);
  const outDate = bookingTimes?.outDate || new Date(Date.now() + 3 * 3600_000);

  const formatTimeOnly = (d) => {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const formatDateOnly = (d) => {
    return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div className="fixed inset-0 z-[2000] flex flex-col justify-end sm:justify-center sm:items-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Top Image Carousel Header */}
        <div className="relative h-60 w-full bg-slate-900 shrink-0">
          <img
            src={images[activeImageIndex]}
            alt={area.name}
            className="w-full h-full object-cover transition-all duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/30" />

          {/* Floating Navigation & Action Buttons */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/95 backdrop-blur text-slate-800 shadow-lg flex items-center justify-center hover:bg-white active:scale-95 transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSaved(!saved)}
                className="w-10 h-10 rounded-full bg-white/95 backdrop-blur text-slate-800 shadow-lg flex items-center justify-center hover:bg-white active:scale-95 transition"
              >
                <Bookmark className={`w-5 h-5 ${saved ? 'fill-indigo-600 text-indigo-600' : ''}`} />
              </button>
              <button
                onClick={handleShare}
                className="w-10 h-10 rounded-full bg-white/95 backdrop-blur text-slate-800 shadow-lg flex items-center justify-center hover:bg-white active:scale-95 transition"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Image carousel arrows if multiple images */}
          {images.length > 1 && (
            <>
              <button
                onClick={() => setActiveImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setActiveImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          {/* Image Counter Badge matching screenshot: [camera] 1/3 */}
          <div className="absolute bottom-3 right-4 bg-black/70 backdrop-blur px-2.5 py-1 rounded-full text-white text-xs font-bold flex items-center gap-1.5 shadow-sm">
            <span>📷</span>
            <span>{activeImageIndex + 1}/{images.length}</span>
          </div>
        </div>

        {/* Scrollable Information Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Rating & Booking Frequency Badges */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-amber-500 font-bold text-xs">
              <div className="flex text-amber-400">
                {'★'.repeat(5)}
              </div>
              <span className="text-slate-600">({area.ratingCount || 1} ratings)</span>
            </div>

            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Booked {area.bookedTimes || 2} times
            </span>
          </div>

          {/* Facility Title & Address */}
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              {area.name}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {area.address || `${area.city} Parking Facility`}
            </p>
          </div>

          {/* Distance & Navigation Row */}
          <div className="flex items-center justify-between bg-slate-50 border border-slate-200/80 rounded-2xl p-3">
            <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700">
                <Navigation className="w-4 h-4" />
              </div>
              <span>{formattedDistance} away</span>
            </div>

            <a
              href={navUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-sm shadow-indigo-600/30 transition active:scale-95"
              title="Open turn-by-turn navigation in Google Maps"
            >
              <Navigation className="w-4 h-4 transform rotate-45" />
            </a>
          </div>

          {/* When do you want to park? Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-sm">When do you want to park?</h3>
              {onEditTimes && (
                <button
                  onClick={onEditTimes}
                  className="text-indigo-600 text-xs font-bold hover:underline flex items-center gap-1"
                >
                  <Edit2 className="w-3 h-3" /> Edit
                </button>
              )}
            </div>

            <div
              onClick={onEditTimes || (() => nav(`/parking/${area._id}`))}
              className="cursor-pointer bg-white border border-slate-200/90 hover:border-indigo-400 rounded-2xl p-4 shadow-2xs flex items-center justify-between transition group"
            >
              {/* In Time */}
              <div className="text-left space-y-0.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">In</span>
                <p className="text-base font-black text-indigo-700 group-hover:text-indigo-800">
                  {formatTimeOnly(inDate)}
                </p>
                <p className="text-xs font-medium text-slate-500">
                  {formatDateOnly(inDate)}
                </p>
              </div>

              {/* Arrow */}
              <div className="text-indigo-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-transform">
                →
              </div>

              {/* Out Time */}
              <div className="text-right space-y-0.5">
                <div className="flex items-center justify-end gap-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Out</span>
                  <Edit2 className="w-3 h-3 text-slate-400" />
                </div>
                <p className="text-base font-black text-indigo-700 group-hover:text-indigo-800">
                  {formatTimeOnly(outDate)}
                </p>
                <p className="text-xs font-medium text-slate-500">
                  {formatDateOnly(outDate)}
                </p>
              </div>
            </div>
          </div>

          {/* Key handover Notice Banner with illustration */}
          <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-800 leading-snug">
                {area.operatorNotice || 'You may have to leave your car key with the parking operator at site'}
              </p>
            </div>
          </div>

          {/* Highlights & Amenities */}
          <div className="space-y-2">
            <h3 className="font-extrabold text-slate-900 text-sm">Highlights</h3>
            <div className="grid grid-cols-2 gap-2">
              {(area.amenities && area.amenities.length > 0
                ? area.amenities
                : ['cctv', 'covered', 'security_guard', 'valet']
              ).map((amenityKey) => {
                const conf = AMENITY_MAP[amenityKey] || { label: amenityKey, icon: Shield };
                const IconComp = conf.icon;
                return (
                  <div
                    key={amenityKey}
                    className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-bold text-slate-700"
                  >
                    <IconComp className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span className="truncate">{conf.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sticky Bottom Action Button matching Picture 2 */}
        <div className="p-4 bg-white border-t border-slate-100 shrink-0">
          <button
            onClick={handleActionClick}
            className="w-full py-3.5 bg-[#5B21B6] hover:bg-[#4C1D95] text-white text-sm font-extrabold rounded-xl shadow-lg shadow-purple-900/20 active:scale-98 transition flex items-center justify-center gap-2"
          >
            {user ? 'Select Slot & Continue' : 'Login and continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
