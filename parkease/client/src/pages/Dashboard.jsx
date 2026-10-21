import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { bookingService } from '../services/bookingService';
import {
  Car,
  Calendar,
  Clock,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  MapPin
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';

export default function Dashboard() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    bookingService
      .getMyBookings()
      .then((data) => setBookings(Array.isArray(data) ? data : data.bookings || []))
      .catch(() => setBookings([]))
      .finally(() => setLoading(false));
  }, []);

  // Compute metrics from actual bookings
  const upcomingBookings = bookings.filter(
    (b) => b.status === 'confirmed' && new Date(b.endTime) > new Date()
  );
  const completedBookings = bookings.filter((b) => b.status === 'completed');
  const pendingBookings = bookings.filter((b) => b.status === 'pending_payment');
  const totalSpent = bookings
    .filter((b) => b.status === 'confirmed' || b.status === 'completed')
    .reduce((sum, b) => sum + (b.amount || 0), 0);

  const nextBooking = upcomingBookings[0] || null;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-emerald-950 text-white p-6 sm:p-10 rounded-3xl shadow-xl shadow-slate-900/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="space-y-2">
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" /> Driver Hub
          </span>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight">
            Welcome back, {user?.name || 'Driver'}!
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
            You have <strong className="text-white">{upcomingBookings.length}</strong> active upcoming reservation{upcomingBookings.length === 1 ? '' : 's'}. Access your digital QR ticket anytime below.
          </p>
        </div>

        <Link
          to="/parking"
          className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-5 py-3 rounded-xl font-extrabold text-sm shadow-md transition-all flex items-center gap-2 shrink-0 hover:scale-105"
        >
          Book Another Spot
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Bookings</span>
            <Calendar className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{bookings.length}</p>
          <span className="text-[11px] text-slate-400 font-medium">Lifetime reservations</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Upcoming</span>
            <Clock className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-700">{upcomingBookings.length}</p>
          <span className="text-[11px] text-slate-400 font-medium">Ready for check-in</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{completedBookings.length}</p>
          <span className="text-[11px] text-slate-400 font-medium">Past parking sessions</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Spent</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">₹{totalSpent}</p>
          <span className="text-[11px] text-slate-400 font-medium">Completed & active</span>
        </div>
      </div>

      {/* Spotlight: Next Upcoming Reservation */}
      {nextBooking && (
        <div className="bg-white rounded-3xl border border-emerald-300 p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full uppercase tracking-wider">
              ● Next Upcoming Parking Spot
            </span>
            <StatusBadge status={nextBooking.status} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
            <div className="md:col-span-2 space-y-1">
              <h2 className="text-xl font-bold text-slate-900">{nextBooking.area?.name}</h2>
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" /> {nextBooking.area?.city} • Slot{' '}
                <strong className="text-slate-800 font-extrabold">{nextBooking.slot?.slotNumber}</strong> (
                {nextBooking.slot?.type?.toUpperCase()})
              </p>
              <p className="text-xs text-slate-600 pt-2 font-mono">
                Vehicle: <strong>{nextBooking.vehicleNumber}</strong>
              </p>
            </div>

            <div className="text-xs text-slate-600 space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <p>
                <strong>Arrival:</strong> {new Date(nextBooking.startTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
              </p>
              <p>
                <strong>Departure:</strong> {new Date(nextBooking.endTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Link
                to={`/booking-confirmation/${nextBooking._id}`}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl text-center shadow-xs transition flex items-center justify-center gap-1.5"
              >
                <QrCode className="w-4 h-4" />
                View Entry Pass
              </Link>
              <Link
                to="/my-bookings"
                className="w-full py-2 text-xs font-semibold text-slate-600 text-center hover:text-slate-900"
              >
                All Bookings →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Recent Bookings Table / List */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-lg text-slate-900">Recent Booking History</h3>
          <Link to="/my-bookings" className="text-xs font-bold text-emerald-700 hover:underline">
            View All ({bookings.length})
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : bookings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-3">Facility & Slot</th>
                  <th className="py-3 px-3">Vehicle</th>
                  <th className="py-3 px-3">Time Period</th>
                  <th className="py-3 px-3">Amount</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bookings.slice(0, 5).map((b) => (
                  <tr key={b._id} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 px-3">
                      <span className="font-bold text-slate-800 block">{b.area?.name}</span>
                      <span className="text-[11px] text-slate-400">Slot {b.slot?.slotNumber}</span>
                    </td>
                    <td className="py-3.5 px-3 font-mono font-bold text-slate-700">{b.vehicleNumber}</td>
                    <td className="py-3.5 px-3 text-slate-600">
                      <div>{new Date(b.startTime).toLocaleDateString([], { month: 'short', day: 'numeric' })}</div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                        {new Date(b.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="py-3.5 px-3 font-extrabold text-slate-900">₹{b.amount}</td>
                    <td className="py-3.5 px-3">
                      <StatusBadge status={b.status} />
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      {b.status === 'confirmed' ? (
                        <Link
                          to={`/booking-confirmation/${b._id}`}
                          className="font-bold text-emerald-700 hover:underline"
                        >
                          View QR Pass
                        </Link>
                      ) : b.status === 'pending_payment' ? (
                        <Link to="/my-bookings" className="font-bold text-amber-600 hover:underline">
                          Pay Now
                        </Link>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 space-y-3">
            <Car className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-slate-700 font-bold text-sm">No reservations found yet</p>
            <p className="text-xs text-slate-400">Your future reservations and digital passes will show up here.</p>
            <Link
              to="/parking"
              className="inline-block mt-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl"
            >
              Find and Reserve Parking
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
