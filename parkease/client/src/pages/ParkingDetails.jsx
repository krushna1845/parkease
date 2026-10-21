import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  MapPin,
  Calendar,
  Clock,
  Car,
  Shield,
  Video,
  AlertCircle,
  CheckCircle2,
  Lock,
  ArrowLeft,
  Info
} from 'lucide-react';
import { parkingService } from '../services/parkingService';
import { slotService } from '../services/slotService';
import { bookingService } from '../services/bookingService';
import { useAuth } from '../AuthContext';
import { useToast } from '../context/ToastContext';
import SlotGrid from '../components/SlotGrid';

export default function ParkingDetails() {
  const { id } = useParams();
  const nav = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const toast = useToast();

  const [area, setArea] = useState(null);
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);

  // Time & date selection defaults (1 hour in future to 3 hours in future)
  const defaultStart = new Date(Date.now() + 3600 * 1000);
  const defaultEnd = new Date(Date.now() + 3 * 3600 * 1000);

  const [date, setDate] = useState(() => defaultStart.toISOString().split('T')[0]);
  const [startTimeStr, setStartTimeStr] = useState(() => {
    return defaultStart.toTimeString().substring(0, 5);
  });
  const [endTimeStr, setEndTimeStr] = useState(() => {
    return defaultEnd.toTimeString().substring(0, 5);
  });

  const [vehicleNumber, setVehicleNumber] = useState('');
  const [loadingArea, setLoadingArea] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [error, setError] = useState('');

  // Compute actual start and end Date objects
  const startDateTime = new Date(`${date}T${startTimeStr}:00`);
  const endDateTime = new Date(`${date}T${endTimeStr}:00`);
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
      return;
    }
    setLoadingSlots(true);
    slotService
      .getByArea(id, startDateTime, endDateTime)
      .then((data) => {
        setSlots(data);
        // Clear selected slot if it became unavailable
        if (selectedSlot && !data.find((s) => s._id === selectedSlot._id && s.available)) {
          setSelectedSlot(null);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingSlots(false));
  };

  useEffect(() => {
    fetchSlotAvailability();
  }, [id, date, startTimeStr, endTimeStr]);

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
      const res = await bookingService.create({
        slotId: selectedSlot._id,
        vehicleNumber: vehicleNumber.trim().toUpperCase(),
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString()
      });

      toast.success('Slot temporarily locked! Please proceed to payment.');
      nav(`/my-bookings`);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to reserve spot. Please retry.';
      setError(msg);
      toast.error(msg);
      // Refresh slots
      fetchSlotAvailability();
    } finally {
      setBookingLoading(false);
    }
  };

  if (loadingArea) {
    return (
      <div className="py-12 max-w-5xl mx-auto space-y-4">
        <div className="h-64 bg-slate-100 rounded-2xl animate-pulse" />
        <div className="h-32 bg-slate-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!area) {
    return (
      <div className="py-16 text-center max-w-lg mx-auto space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">Parking Facility Not Found</h2>
        <Link to="/parking" className="inline-block text-emerald-700 font-bold text-sm underline">
          ← Back to all facilities
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      {/* Back button */}
      <Link
        to="/parking"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-emerald-700 transition"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Search Results
      </Link>

      {/* Facility Header */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row justify-between gap-6">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" /> Verified Smart Parking Facility
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">{area.name}</h1>
          <p className="text-sm text-slate-500 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-emerald-600 shrink-0" /> {area.address}, {area.city}
          </p>

          <div className="flex flex-wrap gap-2 pt-2 text-xs font-semibold text-slate-600">
            <span className="bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg flex items-center gap-1">
              <Video className="w-3.5 h-3.5 text-emerald-600" /> 24/7 CCTV Surveillance
            </span>
            <span className="bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-emerald-600" /> On-site Attendant
            </span>
            <span className="bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-emerald-600" /> Atomic Slot Locking
            </span>
          </div>
        </div>

        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 flex flex-col justify-between shrink-0 min-w-[220px]">
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">Standard Rate</span>
            <span className="text-3xl font-black text-emerald-700">₹{area.pricePerHour}</span>
            <span className="text-xs text-slate-500 font-medium"> / hour</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">10-minute hold window applies on booking</p>
        </div>
      </div>

      {/* Main Reservation Split: Slot Selection & Booking Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Timing Selection & Slot Grid */}
        <div className="lg:col-span-8 space-y-6">
          {/* Time Picker Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              1. Choose Date & Parking Interval
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
                  className="w-full text-sm font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Arrival Time
                </label>
                <input
                  type="time"
                  value={startTimeStr}
                  onChange={(e) => setStartTimeStr(e.target.value)}
                  className="w-full text-sm font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Departure Time
                </label>
                <input
                  type="time"
                  value={endTimeStr}
                  onChange={(e) => setEndTimeStr(e.target.value)}
                  className="w-full text-sm font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>
            </div>

            {endDateTime <= startDateTime && (
              <p className="text-xs text-rose-600 font-semibold">
                ⚠️ Departure time must be after arrival time.
              </p>
            )}
          </div>

          {/* Slot Grid Selection Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Car className="w-4 h-4 text-emerald-600" />
                2. Select Your Specific Spot
              </h2>
              {selectedSlot && (
                <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
                  Spot {selectedSlot.slotNumber} Selected
                </span>
              )}
            </div>

            <SlotGrid
              slots={slots}
              selectedSlot={selectedSlot}
              onSelectSlot={(s) => setSelectedSlot(s)}
              loading={loadingSlots}
            />
          </div>
        </div>

        {/* Right: Reservation Checkout Summary Card */}
        <div className="lg:col-span-4 sticky top-24">
          <form
            onSubmit={handleReserve}
            className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-lg shadow-slate-200/60 space-y-6"
          >
            <h3 className="font-extrabold text-lg text-slate-900 border-b border-slate-100 pb-3">
              Reservation Summary
            </h3>

            {/* Error banner */}
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                {error}
              </div>
            )}

            {/* Details breakdown */}
            <div className="space-y-3 text-xs text-slate-600">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400 font-medium">Location</span>
                <span className="font-bold text-slate-800 text-right">{area.name}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400 font-medium">Selected Slot</span>
                <span className="font-bold text-slate-800">
                  {selectedSlot ? `Slot ${selectedSlot.slotNumber} (${selectedSlot.type.toUpperCase()})` : 'None chosen yet'}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400 font-medium">Arrival</span>
                <span className="font-bold text-slate-800">{startDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400 font-medium">Departure</span>
                <span className="font-bold text-slate-800">{endDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400 font-medium">Total Duration</span>
                <span className="font-bold text-slate-800">{diffHours} hour{diffHours > 1 ? 's' : ''}</span>
              </div>
            </div>

            {/* Vehicle Number Input */}
            <div className="space-y-1 pt-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Vehicle Plate Number
              </label>
              <input
                type="text"
                required
                placeholder="e.g. MH12AB1234"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                className="w-full text-sm font-bold uppercase tracking-wider p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>

            {/* Price Total */}
            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-bold text-slate-900">Total Price</span>
                <div className="text-right">
                  <span className="text-2xl font-black text-emerald-700">₹{estimatedAmount}</span>
                  <span className="text-[10px] text-slate-400 block">Inclusive of all taxes</span>
                </div>
              </div>
            </div>

            {/* Reserve Action Button */}
            <button
              type="submit"
              disabled={bookingLoading || !selectedSlot}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-sm rounded-xl shadow-md shadow-emerald-700/20 transition-all hover:scale-[1.01]"
            >
              {bookingLoading ? (
                'Locking Spot...'
              ) : !user ? (
                'Sign In to Reserve Spot'
              ) : (
                'Reserve & Proceed'
              )}
            </button>

            <p className="text-[11px] text-slate-400 text-center leading-normal">
              🔒 Free cancellation available until your arrival time. Slot is locked for 10 min for payment.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
