import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  MapPin,
  Calendar,
  Clock,
  Car,
  Bike,
  ShieldCheck,
  QrCode,
  Zap,
  ArrowRight,
  ChevronDown,
  Sparkles,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { parkingService } from '../services/parkingService';
import ParkingCard from '../components/ParkingCard';

export default function Home() {
  const nav = useNavigate();
  const [featuredAreas, setFeaturedAreas] = useState([]);
  const [loadingAreas, setLoadingAreas] = useState(true);

  // Search parameters
  const [searchLocation, setSearchLocation] = useState('');
  const [vehicleType, setVehicleType] = useState('car');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [duration, setDuration] = useState('2');

  // FAQ open/close state
  const [openFaq, setOpenFaq] = useState(0);

  useEffect(() => {
    parkingService
      .getAll()
      .then((data) => setFeaturedAreas(data.slice(0, 4)))
      .catch(() => setFeaturedAreas([]))
      .finally(() => setLoadingAreas(false));
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchLocation.trim()) params.append('q', searchLocation.trim());
    if (vehicleType) params.append('type', vehicleType);
    if (date) params.append('date', date);
    if (duration) params.append('duration', duration);
    nav(`/parking?${params.toString()}`);
  };

  const faqs = [
    {
      q: 'How does real-time parking slot locking work?',
      a: 'When you select a slot and click Reserve, ParkEase immediately applies an atomic hold on the slot for 10 minutes. This guarantees nobody else can book your spot while you complete your payment.'
    },
    {
      q: 'How do I enter and exit the parking garage?',
      a: 'After payment, a secure digital QR ticket is instantly generated on your dashboard. Simply present the QR code at the entrance scanner, where our automated verification validates your reservation.'
    },
    {
      q: 'Can I cancel my reservation and get a refund?',
      a: 'Yes. You can cancel any confirmed booking from your My Bookings dashboard prior to your scheduled start time. The payment will be automatically marked as refunded.'
    },
    {
      q: 'What payment methods are supported?',
      a: 'We support UPI, Credit/Debit Cards, Net Banking, and Razorpay test mode with instant confirmation.'
    }
  ];

  return (
    <div className="space-y-20 pb-16">
      {/* Hero Section */}
      <section className="relative pt-12 pb-16 md:pt-20 md:pb-24 overflow-hidden">
        {/* Subtle decorative background gradient */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-emerald-50/70 to-transparent pointer-events-none -z-10 rounded-3xl" />

        <div className="max-w-5xl mx-auto px-4 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/80 border border-emerald-200 text-emerald-800 text-xs font-bold tracking-wide uppercase shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            Smart City Parking Platform
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.15]">
            Find your spot. <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">
              Park with ease.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Eliminate parking anxiety. Discover verified parking facilities, reserve guaranteed slots in real time, and access with instant digital QR tickets.
          </p>

          {/* Interactive Search Bar Widget */}
          <div className="pt-6 max-w-4xl mx-auto">
            <form
              onSubmit={handleSearchSubmit}
              className="bg-white p-4 sm:p-5 rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-200/90 text-left grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
            >
              {/* Location Input */}
              <div className="space-y-1 sm:col-span-2 lg:col-span-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" /> Destination
                </label>
                <input
                  type="text"
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                  placeholder="Mall, City, Area (e.g. Pune)"
                  className="w-full text-sm font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                />
              </div>

              {/* Date Input */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" /> Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full text-sm font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                />
              </div>

              {/* Duration Input */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-emerald-600" /> Duration
                </label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full text-sm font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                >
                  <option value="1">1 hour</option>
                  <option value="2">2 hours</option>
                  <option value="4">4 hours</option>
                  <option value="8">8 hours</option>
                  <option value="24">Full day (24h)</option>
                </select>
              </div>

              {/* Search Button */}
              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full h-[46px] bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-700/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                >
                  <Search className="w-4 h-4" />
                  Search Parking
                </button>
              </div>
            </form>

            {/* Quick popular tags */}
            <div className="mt-3 flex items-center justify-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-slate-400">Popular:</span>
              <button
                type="button"
                onClick={() => {
                  setSearchLocation('Central');
                  nav('/parking?q=Central');
                }}
                className="hover:text-emerald-700 hover:underline"
              >
                Central Mall
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => {
                  setSearchLocation('Pune');
                  nav('/parking?q=Pune');
                }}
                className="hover:text-emerald-700 hover:underline"
              >
                Pune City
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => {
                  setSearchLocation('Tech');
                  nav('/parking?q=Tech');
                }}
                className="hover:text-emerald-700 hover:underline"
              >
                Tech Park
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Parking Facilities */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-widest">
              Verified Locations
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
              Popular Parking Areas
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Top-rated facilities with real-time slot tracking and automated entry.
            </p>
          </div>
          <Link
            to="/parking"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-700 hover:text-emerald-800 transition"
          >
            Explore all areas <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {loadingAreas ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-72 bg-slate-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : featuredAreas.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredAreas.map((area, idx) => (
              <ParkingCard key={area._id} area={area} index={idx} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-8">
            <Car className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-700 font-bold">No parking facilities loaded yet</p>
            <p className="text-xs text-slate-500 mt-1">Make sure the backend server is running and seeded.</p>
          </div>
        )}
      </section>

      {/* How It Works Section */}
      <section className="bg-slate-900 text-white py-20 rounded-3xl max-w-7xl mx-auto px-6 sm:px-10 lg:px-12">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
            Streamlined Experience
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            How ParkEase Works in 4 Steps
          </h2>
          <p className="text-slate-400 text-sm">
            From search to parking spot in under two minutes.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-black text-xl">
              1
            </div>
            <h3 className="text-lg font-bold">Search Location</h3>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
              Find verified parking garages near your destination with clear hourly pricing and amenity tags.
            </p>
          </div>

          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-black text-xl">
              2
            </div>
            <h3 className="text-lg font-bold">Pick Your Slot</h3>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
              View dynamic slot availability for your chosen time interval and select an exact car or bike bay.
            </p>
          </div>

          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-black text-xl">
              3
            </div>
            <h3 className="text-lg font-bold">10-Minute Hold & Pay</h3>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
              Your chosen slot is temporarily locked for 10 minutes so no other driver can take it while you pay.
            </p>
          </div>

          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-black text-xl">
              4
            </div>
            <h3 className="text-lg font-bold">Scan Digital QR</h3>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
              Drive in, present your cryptographic QR ticket at the gate terminal for instantaneous verification.
            </p>
          </div>
        </div>
      </section>

      {/* Core Platform Advantages */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
          <span className="text-xs font-bold text-emerald-700 uppercase tracking-widest">
            Why Drivers Choose Us
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Built for Reliability & Peace of Mind
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Guaranteed Slot Protection</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Our backend uses strict mutual-exclusion locking to prevent double-booking. Once confirmed, your space is 100% reserved.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <QrCode className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Contactless QR Entry</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              No paper slips or lost tickets. Your booking code is stored securely on your phone with single-use check-in enforcement.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Easy Cancellation Policy</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Plans change. Cancel your booking any time prior to the arrival window with simulated instant refund processing.
            </p>
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section className="max-w-4xl mx-auto px-4 space-y-6">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold text-emerald-700 uppercase tracking-widest">
            Got Questions?
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3 pt-4">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs transition"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-slate-900 text-sm hover:text-emerald-700"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-600 border-t border-slate-100 leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Final CTA Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-emerald-700 to-teal-700 text-white rounded-3xl p-8 sm:p-12 text-center space-y-6 shadow-xl shadow-emerald-900/10">
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Ready to park stress-free today?
          </h2>
          <p className="text-emerald-100 text-sm max-w-xl mx-auto">
            Book your parking spot in seconds and join thousands of drivers who never waste time circling for a spot.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/parking"
              className="bg-white text-emerald-900 hover:bg-emerald-50 px-6 py-3 rounded-xl font-extrabold text-sm shadow-md transition-all hover:scale-105"
            >
              Find Available Parking
            </Link>
            <Link
              to="/register"
              className="bg-emerald-800/60 hover:bg-emerald-800 text-white border border-emerald-400/30 px-6 py-3 rounded-xl font-bold text-sm transition"
            >
              Create Free Account
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
