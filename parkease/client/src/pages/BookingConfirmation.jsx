import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { bookingService } from '../services/bookingService';
import StatusBadge from '../components/StatusBadge';
import {
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  Car,
  QrCode,
  Download,
  Printer,
  ArrowRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

export default function BookingConfirmation() {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    bookingService
      .getById(id)
      .then((data) => {
        setBooking(data.booking);
        setPayment(data.payment);
      })
      .catch((err) => setError(err.response?.data?.message || 'Unable to load booking details'))
      .finally(() => setLoading(false));
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-16 space-y-4">
        <div className="h-64 bg-slate-100 rounded-3xl animate-pulse" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">Booking Pass Not Found</h2>
        <p className="text-xs text-slate-500">{error || 'Unable to retrieve reservation pass.'}</p>
        <Link to="/my-bookings" className="inline-block text-xs font-bold text-emerald-700 underline">
          ← View My Reservations
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-8 pb-20 print:p-0">
      {/* Top success badge */}
      <div className="text-center space-y-2 print:hidden">
        <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <span className="text-xs font-bold text-emerald-700 uppercase tracking-widest block">
          Reservation Confirmed
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Your Spot is Ready & Locked
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
          Present the digital pass below at the facility entry barrier or to the parking attendant.
        </p>
      </div>

      {/* Main Digital Pass Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden print:border-none print:shadow-none">
        {/* Pass Header */}
        <div className="bg-slate-900 text-white p-6 sm:p-8 flex items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block">
              Digital Parking Pass
            </span>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight mt-1">{booking.area?.name}</h2>
            <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" /> {booking.area?.address}, {booking.area?.city}
            </p>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Booking Ref</span>
            <span className="text-xs sm:text-sm font-mono font-bold text-emerald-300">
              {booking._id.substring(booking._id.length - 8).toUpperCase()}
            </span>
          </div>
        </div>

        {/* Pass Body with QR Code and Timing */}
        <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-12 gap-8 items-center border-b border-dashed border-slate-200">
          {/* QR Code */}
          <div className="md:col-span-5 flex flex-col items-center text-center space-y-2">
            <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-inner">
              {booking.qrCode ? (
                <img src={booking.qrCode} alt="Entry Pass QR" className="w-48 h-48 object-contain" />
              ) : (
                <div className="w-48 h-48 bg-slate-100 flex items-center justify-center text-slate-400 text-xs">
                  Pending Payment
                </div>
              )}
            </div>
            <span className="text-[11px] font-mono text-slate-500 font-semibold">
              Scan at entry terminal
            </span>
          </div>

          {/* Details Column */}
          <div className="md:col-span-7 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Slot Number</span>
                <span className="text-xl font-black text-slate-900">{booking.slot?.slotNumber}</span>
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                  {booking.slot?.type} Space
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Vehicle Plate</span>
                <span className="text-xl font-black text-slate-900 font-mono">{booking.vehicleNumber}</span>
                <span className="text-[10px] text-slate-500 block font-semibold">Registered Driver</span>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div className="flex justify-between">
                <span className="text-slate-400">Arrival:</span>
                <span className="font-bold text-slate-800">
                  {new Date(booking.startTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Departure:</span>
                <span className="font-bold text-slate-800">
                  {new Date(booking.endTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-200/60 pt-1.5">
                <span className="text-slate-400">Total Paid:</span>
                <span className="font-extrabold text-emerald-700 text-sm">₹{booking.amount}</span>
              </div>
              {payment && (
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Txn Ref:</span>
                  <span className="font-mono">{payment.transactionId}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-slate-500">Pass Status:</span>
              <StatusBadge status={booking.status} />
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="p-6 sm:p-8 bg-slate-50/70 space-y-3 text-xs text-slate-600">
          <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" /> Entry Instructions
          </h4>
          <ol className="list-decimal list-inside space-y-1.5 leading-relaxed text-slate-500">
            <li>Drive to <strong>{booking.area?.name}</strong> at least 5 minutes before scheduled arrival.</li>
            <li>Present this QR pass to the scanner at the automated barrier or parking guard.</li>
            <li>Park inside designated <strong>Slot {booking.slot?.slotNumber}</strong>.</li>
            <li>In case of scanner failure, provide your Booking ID <code className="font-mono bg-white px-1 py-0.5 rounded border">{booking._id}</code>.</li>
          </ol>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl shadow-2xs transition"
          >
            <Printer className="w-3.5 h-3.5" /> Print Pass
          </button>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/my-bookings"
            className="text-xs font-bold text-emerald-700 hover:underline"
          >
            Go to My Bookings
          </Link>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 px-4 py-2 rounded-xl transition"
          >
            Dashboard <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
