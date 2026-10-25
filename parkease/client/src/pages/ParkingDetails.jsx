import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  MapPin,
  Calendar,
  Clock,
  Car,
  Shield,
  Video,
  Zap,
  CheckCircle2,
  Lock,
  ArrowLeft,
  Navigation,
  RefreshCw,
  Bookmark,
  Share2,
  ChevronLeft,
  ChevronRight,
  KeyRound,
  Edit2
} from 'lucide-react';
import { parkingService } from '../services/parkingService';
import { slotService } from '../services/slotService';
import { bookingService } from '../services/bookingService';
import { paymentService } from '../services/paymentService';
import { useAuth } from '../AuthContext';
import { useToast } from '../context/ToastContext';
import SlotGrid from '../components/SlotGrid';
import ConnectionIndicator from '../components/ConnectionIndicator';
import { useSocket } from '../context/SocketContext';

const DEFAULT_IMAGES = [
  'https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1621929747188-0b4dc28498d2?auto=format&fit=crop&w=1200&q=80'
];

export default function ParkingDetails() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const { subscribeToArea, unsubscribeFromArea, on } = useSocket() || {};

  const [area, setArea] = useState(null);
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [saved, setSaved] = useState(false);

  // Helper to format local YYYY-MM-DD and HH:MM
  const formatLocalDate = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatLocalTime = (d) => {
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // Time & date selection defaults (1 hour in future to 3 hours in future)
  const defaultStart = new Date(Date.now() + 3600 * 1000);
  const defaultEnd = new Date(Date.now() + 3 * 3600 * 1000);

  const [date, setDate] = useState(() => formatLocalDate(defaultStart));
  const [startTimeStr, setStartTimeStr] = useState(() => formatLocalTime(defaultStart));
  const [endTimeStr, setEndTimeStr] = useState(() => formatLocalTime(defaultEnd));

  const [vehicleNumber, setVehicleNumber] = useState('');
  const [loadingArea, setLoadingArea] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [error, setError] = useState('');

  // Track if a competing slot update arrived while user has one selected
  const [slotConflictNotice, setSlotConflictNotice] = useState(null);

  // Compute actual start and end Date objects
  const startDateTime = new Date(`${date}T${startTimeStr}:00`);
  let endDateTime = new Date(`${date}T${endTimeStr}:00`);

  // Detect overnight / next-day rollover (e.g. 11:00 PM to 01:00 AM)
  const isOvernight = endDateTime <= startDateTime;
  if (isOvernight && startTimeStr !== endTimeStr) {
    endDateTime = new Date(endDateTime.getTime() + 24 * 3600 * 1000);
  }

  const diffHours = Math.max(1, Math.ceil((endDateTime - startDateTime) / 3600000));
  const estimatedAmount = area ? diffHours * area.pricePerHour : 0;

  // Load Area Details
  useEffect(() => {
    setLoadingArea(true);
    parkingService
      .getById(id)
      .then((data) => setArea(data))
      .catch(() => setError('Unable to load parking facility details.'))
      .finally(() => setLoadingArea(false));
  }, [id]);

  // Load Slot Availability for selected time range
  const fetchSlotAvailability = () => {
    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime()) || endDateTime <= startDateTime) {
      setLoadingSlots(false);
      return;
    }
    setLoadingSlots(true);
    slotService
      .getByArea(id, startDateTime, endDateTime)
      .then((data) => {
        setSlots(data);
        if (selectedSlot && !data.find((s) => s._id === selectedSlot._id && s.available)) {
          setSelectedSlot(null);
        }
      })
      .catch((err) => {
        console.warn('Slot availability fetch fallback:', err);
        slotService
          .getByArea(id)
          .then((fallbackData) => setSlots(fallbackData))
          .catch(() => {});
      })
      .finally(() => setLoadingSlots(false));
  };

  useEffect(() => {
    fetchSlotAvailability();
  }, [id, date, startTimeStr, endTimeStr]); // eslint-disable-line react-hooks/exhaustive-deps

  // Socket.IO real-time availability updates
  useEffect(() => {
    if (!id || !on || !subscribeToArea) return;

    subscribeToArea(id);

    const unsubSlot = on('slot:updated', (data) => {
      if (data.areaId !== id) return;

      setSlots((prev) =>
        prev.map((s) => {
          if (s._id !== data.slotId) return s;
          const isNowAvailable = data.status === 'available';
          const updated = { ...s, available: isNowAvailable };

          if (selectedSlot && selectedSlot._id === data.slotId && !isNowAvailable) {
            setSlotConflictNotice({
              slotNumber: data.slotNumber,
              status: data.status
            });
          }
          return updated;
        })
      );
    });

    const unsubReconnect = on('reconnected', () => {
      fetchSlotAvailability();
    });

    return () => {
      unsubscribeFromArea?.(id);
      unsubSlot();
      unsubReconnect();
    };
  }, [id, on, subscribeToArea, unsubscribeFromArea, selectedSlot]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: area?.name,
          text: `Check out parking at ${area?.name} on ParkEase`,
          url: window.location.href
        });
      } catch (e) {}
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.info('Link copied to clipboard!');
    }
  };

  const handleReserve = async (e) => {
    e.preventDefault();

    if (!user) {
      toast.info('Please log in to complete your reservation');
      return nav(`/login?return=/parking/${id}`);
    }

    if (!selectedSlot) {
      setError('Please select an available parking slot from the grid below');
      return;
    }

    if (!vehicleNumber.trim()) {
      setError('Please enter your vehicle license plate number');
      return;
    }

    if (endDateTime <= startDateTime) {
      setError('End time must be after start time');
      return;
    }

    if (startDateTime < new Date(Date.now() - 60 * 1000)) {
      setError('Start time cannot be in the past');
      return;
    }

    setBookingLoading(true);
    setError('');

    try {
      const created = await bookingService.create({
        slotId: selectedSlot._id,
        vehicleNumber: vehicleNumber.trim().toUpperCase(),
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString()
      });

      const bookingId = created?.booking?._id || created?._id;
      toast.success('Parking slot locked for 10 minutes! Please complete payment.');
      nav(`/payment/${bookingId}`);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to reserve spot. Please retry.';
      setError(msg);
      toast.error(msg);
      fetchSlotAvailability();
    } finally {
      setBookingLoading(false);
    }
  };

  if (loadingArea) {
    return (
      <div className="py-12 max-w-5xl mx-auto space-y-4 px-4">
        <div className="h-64 bg-slate-100 rounded-3xl animate-pulse" />
        <div className="h-32 bg-slate-100 rounded-3xl animate-pulse" />
      </div>
    );
  }

  if (!area) {
    return (
      <div className="py-16 text-center max-w-lg mx-auto space-y-4 px-4">
        <h2 className="text-xl font-bold text-slate-800">Parking Facility Not Found</h2>
        <Link to="/parking" className="inline-block text-indigo-700 font-bold text-sm underline">
          ← Back to map discovery
        </Link>
      </div>
    );
  }

  const images = Array.isArray(area.images) && area.images.length > 0
    ? area.images
    : DEFAULT_IMAGES;

  const navUrl = area.latitude && area.longitude
    ? `https://www.google.com/maps/dir/?api=1&destination=${area.latitude},${area.longitude}`
    : '#';

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 px-4 sm:px-6 pt-4">
      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* Image Gallery Hero Header (Matching Picture 2) */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      <div className="relative h-72 sm:h-96 w-full rounded-3xl overflow-hidden bg-slate-900 shadow-lg">
        <img
          src={images[activeImageIndex]}
          alt={area.name}
          className="w-full h-full object-cover transition-all duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />

        {/* Top Buttons on Hero */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
          <Link
            to="/parking"
            className="w-10 h-10 rounded-full bg-white/95 backdrop-blur text-slate-800 shadow-lg flex items-center justify-center hover:bg-white active:scale-95 transition"
            title="Back to Map"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSaved(!saved)}
              className="w-10 h-10 rounded-full bg-white/95 backdrop-blur text-slate-800 shadow-lg flex items-center justify-center hover:bg-white active:scale-95 transition"
              title="Save facility"
            >
              <Bookmark className={`w-5 h-5 ${saved ? 'fill-indigo-600 text-indigo-600' : ''}`} />
            </button>
            <button
              onClick={handleShare}
              className="w-10 h-10 rounded-full bg-white/95 backdrop-blur text-slate-800 shadow-lg flex items-center justify-center hover:bg-white active:scale-95 transition"
              title="Share"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Carousel arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={() => setActiveImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setActiveImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Image Counter Badge matching Picture 2: [camera] 1/3 */}
        <div className="absolute bottom-4 right-4 bg-black/70 backdrop-blur px-3 py-1 rounded-full text-white text-xs font-bold flex items-center gap-1.5 shadow-sm">
          <span>📷</span>
          <span>{activeImageIndex + 1}/{images.length}</span>
        </div>

        {/* Facility title on bottom left of hero */}
        <div className="absolute bottom-4 left-4 text-white">
          <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight drop-shadow-md">
            {area.name}
          </h1>
          <p className="text-xs sm:text-sm text-slate-200 drop-shadow-sm flex items-center gap-1 mt-0.5">
            <MapPin className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
            {area.address}, {area.city}
          </p>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* Facility Metadata & Badges Row */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1 text-amber-500 font-bold text-xs">
              <div className="flex text-amber-400">{'★'.repeat(5)}</div>
              <span className="text-slate-600">({area.ratingCount || 1} ratings)</span>
            </div>

            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Booked {area.bookedTimes || 2} times
            </span>

            <ConnectionIndicator />
          </div>

          <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs">
            <Navigation className="w-3.5 h-3.5" />
            <a
              href={navUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline flex items-center gap-1"
            >
              Get Directions on Google Maps →
            </a>
          </div>
        </div>

        <div className="bg-slate-50 px-5 py-3 rounded-2xl border border-slate-200/80 flex items-baseline gap-2">
          <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Rate:</span>
          <span className="text-2xl font-black text-indigo-700">₹{area.pricePerHour}</span>
          <span className="text-xs text-slate-500 font-medium">/ hour</span>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* Operator Notice Banner (Key Handover Notice matching Picture 2) */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      <div className="bg-amber-50/90 border border-amber-200/80 rounded-2xl p-4 flex items-center gap-3.5 shadow-2xs">
        <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
          <KeyRound className="w-6 h-6" />
        </div>
        <p className="text-xs sm:text-sm font-semibold text-slate-800 leading-snug">
          {area.operatorNotice || 'You may have to leave your car key with the parking operator at site'}
        </p>
      </div>

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* Main Reservation Split: Timing, Slot Grid & Checkout */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Timing & Slot Selection Grid */}
        <div className="lg:col-span-8 space-y-6">
          {/* "When do you want to park?" Card (Matching Picture 2) */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              When do you want to park?
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Parking Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full text-sm font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  In (Arrival)
                </label>
                <input
                  type="time"
                  value={startTimeStr}
                  onChange={(e) => setStartTimeStr(e.target.value)}
                  className="w-full text-sm font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Out (Departure)
                </label>
                <input
                  type="time"
                  value={endTimeStr}
                  onChange={(e) => setEndTimeStr(e.target.value)}
                  className="w-full text-sm font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>
            </div>

            {isOvernight && startTimeStr !== endTimeStr && (
              <div className="flex items-center gap-2 bg-indigo-50 text-indigo-800 text-xs font-semibold px-3.5 py-2 rounded-xl border border-indigo-100">
                <span>🌙</span>
                <span>
                  Overnight session: Departure is next day at {endDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({diffHours} {diffHours === 1 ? 'hour' : 'hours'})
                </span>
              </div>
            )}

            {startTimeStr === endTimeStr && (
              <p className="text-xs text-rose-600 font-semibold">
                ⚠️ Departure time must be after arrival time.
              </p>
            )}
          </div>

          {/* Slot Grid Selection */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Car className="w-4 h-4 text-indigo-600" />
                Select Specific Parking Slot
              </h2>
              <div className="flex items-center gap-2">
                {selectedSlot && (
                  <span className="text-xs font-bold text-purple-800 bg-purple-100 px-3 py-1 rounded-full">
                    Slot {selectedSlot.slotNumber} Selected
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => { fetchSlotAvailability(); setSlotConflictNotice(null); }}
                  className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-700 font-semibold"
                  title="Refresh slot availability"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh
                </button>
              </div>
            </div>

            {/* Conflict Warning */}
            {slotConflictNotice && (
              <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-semibold">
                <span>
                  ⚠️ Slot {slotConflictNotice.slotNumber} was just reserved by another user. Pick another slot.
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSlot(null);
                    setSlotConflictNotice(null);
                    fetchSlotAvailability();
                  }}
                  className="ml-2 text-amber-700 hover:underline font-bold whitespace-nowrap"
                >
                  Refresh Grid
                </button>
              </div>
            )}

            <SlotGrid
              slots={slots}
              selectedSlot={selectedSlot}
              onSelectSlot={(s) => {
                setSelectedSlot(s);
                setSlotConflictNotice(null);
              }}
              loading={loadingSlots}
            />
          </div>
        </div>

        {/* Right Column: Checkout Summary Card */}
        <div className="lg:col-span-4 sticky top-24">
          <form
            onSubmit={handleReserve}
            className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-lg space-y-6"
          >
            <h3 className="font-extrabold text-lg text-slate-900 border-b border-slate-100 pb-3">
              Booking Summary
            </h3>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                {error}
              </div>
            )}

            <div className="space-y-3 text-xs text-slate-600">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400 font-medium">Facility</span>
                <span className="font-bold text-slate-800 text-right">{area.name}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400 font-medium">Selected Slot</span>
                <span className="font-bold text-slate-800">
                  {selectedSlot ? `Slot ${selectedSlot.slotNumber} (${selectedSlot.type.toUpperCase()})` : 'Choose from grid'}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400 font-medium">Arrival</span>
                <span className="font-bold text-slate-800">{startDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400 font-medium">Departure</span>
                <span className="font-bold text-slate-800">
                  {endDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {isOvernight && <span className="text-[10px] text-indigo-600 font-extrabold ml-1.5">(Next Day)</span>}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400 font-medium">Duration</span>
                <span className="font-bold text-slate-800">{diffHours} hour{diffHours > 1 ? 's' : ''}</span>
              </div>
            </div>

            {/* Vehicle Number */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Vehicle Plate Number
              </label>
              <input
                type="text"
                required
                placeholder="e.g. MH01AB1234"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                className="w-full text-sm font-bold uppercase tracking-wider p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>

            {/* Total */}
            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-bold text-slate-900">Total Amount</span>
                <div className="text-right">
                  <span className="text-2xl font-black text-indigo-700">₹{estimatedAmount}</span>
                  <span className="text-[10px] text-slate-400 block">All taxes included</span>
                </div>
              </div>
            </div>

            {/* Action Button matching Picture 2 */}
            <button
              type="submit"
              disabled={bookingLoading || !selectedSlot || !!slotConflictNotice}
              className="w-full py-3.5 bg-[#5B21B6] hover:bg-[#4C1D95] active:bg-[#3B0764] disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-sm rounded-xl shadow-lg shadow-purple-900/20 transition-all hover:scale-[1.01]"
            >
              {bookingLoading ? (
                'Reserving Spot...'
              ) : !user ? (
                'Login and continue'
              ) : slotConflictNotice ? (
                'Choose Another Slot'
              ) : (
                'Reserve & Proceed to Payment'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
