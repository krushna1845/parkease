import React, { useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { bookingService } from '../../services/bookingService';
import { useToast } from '../../context/ToastContext';
import StatusBadge from '../../components/StatusBadge';
import {
  QrCode,
  Search,
  CheckCircle2,
  LogOut,
  Clock,
  MapPin,
  User,
  Car,
  AlertCircle,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';

export default function AdminVerify() {
  const toast = useToast();
  const [ticketInput, setTicketInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [ticketData, setTicketData] = useState(null);   // the booking object
  const [validity, setValidity] = useState(null);        // { valid, validityState, message }
  const [actionLoading, setActionLoading] = useState(false);

  const handleVerify = async (e) => {
    if (e) e.preventDefault();
    const raw = ticketInput.trim();
    if (!raw) {
      toast.error('Please enter a Booking ID or paste a raw QR payload');
      return;
    }

    setLoading(true);
    setTicketData(null);
    setValidity(null);

    try {
      let bookingId = raw;
      // If raw JSON QR payload was pasted
      if (raw.startsWith('{')) {
        try {
          const parsed = JSON.parse(raw);
          bookingId = parsed.bookingId || parsed._id || parsed.id || raw;
        } catch {
          // keep raw as-is
        }
      }

      // POST /api/bookings/verify → { valid, validityState, message, booking, payment }
      const res = await bookingService.verifyTicket(bookingId);
      const data = res.data;

      if (data && data.booking) {
        setTicketData(data.booking);
        setValidity({ valid: data.valid, validityState: data.validityState, message: data.message });
        toast.success('Ticket located — details loaded');
      } else {
        toast.error('Booking not found');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid or non-existent ticket');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!ticketData) return;
    setActionLoading(true);
    try {
      const res = await bookingService.checkIn(ticketData._id);
      const updated = res.data?.booking || res.data;
      if (updated) {
        setTicketData(updated);
        setValidity((v) => ({ ...v, validityState: 'checked_in', message: 'Check-in successful' }));
        toast.success('Vehicle successfully checked in!');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to check in vehicle');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!ticketData) return;
    setActionLoading(true);
    try {
      const res = await bookingService.checkOut(ticketData._id);
      const updated = res.data?.booking || res.data;
      if (updated) {
        setTicketData(updated);
        setValidity((v) => ({ ...v, validityState: 'completed', message: 'Check-out complete' }));
        toast.success('Vehicle checked out! Booking marked completed.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to check out vehicle');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString('en-IN', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const validityColor = (state) => {
    if (state === 'active_now' || state === 'upcoming') return 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white';
    if (state === 'checked_in') return 'bg-gradient-to-r from-blue-600 to-blue-700 text-white';
    if (state === 'completed') return 'bg-slate-800 text-white';
    return 'bg-amber-600 text-white'; // cancelled / unpaid / invalid
  };

  const canCheckIn = ticketData && !ticketData.isCheckedIn && ticketData.status === 'confirmed';
  const canCheckOut = ticketData && ticketData.isCheckedIn && !ticketData.checkedOutAt;

  return (
    <AdminLayout
      title="Ticket Terminal & Scanner"
      subtitle="Lookup reservation passes, verify QR barcodes, and track vehicle gate check-ins."
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Scanner / Lookup Column */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Gate Pass Scanner</h3>
                <p className="text-xs text-slate-500">Scan QR barcode or enter 24-character ID</p>
              </div>
            </div>

            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Booking ID or QR Raw Payload
                </label>
                <textarea
                  rows={3}
                  value={ticketInput}
                  onChange={(e) => setTicketInput(e.target.value)}
                  placeholder="e.g. 660f1b2c45e89a0012f34567 or paste JSON payload…"
                  className="w-full text-sm font-mono px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder-slate-400 resize-none"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-sm font-semibold rounded-xl shadow-sm transition-all"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  {loading ? 'Searching…' : 'Scan / Lookup'}
                </button>
                <button
                  type="button"
                  onClick={() => { setTicketInput(''); setTicketData(null); setValidity(null); }}
                  className="px-4 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-100 text-sm font-semibold rounded-xl transition-all"
                >
                  Clear
                </button>
              </div>
            </form>
          </div>

          {/* Validity banner */}
          {validity && (
            <div className={`rounded-2xl p-4 flex items-start gap-3 ${validity.valid ? 'bg-emerald-50 border border-emerald-200' : 'bg-rose-50 border border-rose-200'}`}>
              {validity.valid
                ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                : <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />}
              <div>
                <p className={`text-sm font-bold ${validity.valid ? 'text-emerald-900' : 'text-rose-900'}`}>
                  {validity.valid ? 'Ticket Valid' : 'Ticket Invalid'}
                </p>
                <p className={`text-xs mt-0.5 ${validity.valid ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {validity.message}
                </p>
              </div>
            </div>
          )}

          {/* Quick Terminal Guide */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Terminal Operations
            </h4>
            <ul className="text-xs text-slate-600 space-y-2 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                <span><strong>Check-in</strong> is available for confirmed passes within 30 min of reservation start.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                <span><strong>Check-out</strong> frees up the physical spot and marks the reservation completed.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                <span>Cancelled or unpaid passes will trigger an invalidation alert.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Verification Result Column */}
        <div className="lg:col-span-7">
          {ticketData ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              {/* Header Banner */}
              <div className={`p-6 border-b ${validityColor(validity?.validityState)}`}>
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div>
                    <span className="text-xs uppercase tracking-widest font-semibold opacity-80">Verified Entry Pass</span>
                    <h2 className="text-lg font-bold font-mono tracking-wider mt-1 break-all">
                      #{ticketData._id}
                    </h2>
                  </div>
                  <StatusBadge status={ticketData.status} />
                </div>
              </div>

              {/* Pass Details */}
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" /> Facility & Spot
                    </div>
                    <div className="font-bold text-slate-900 text-base">
                      {ticketData.area?.name || 'Main Parking Area'}
                    </div>
                    <div className="inline-block mt-2 font-mono font-bold text-xs px-2.5 py-1 rounded bg-emerald-100 text-emerald-800">
                      Slot: {ticketData.slot?.slotNumber || 'Assigned'}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                      <Car className="w-3.5 h-3.5 text-blue-600" /> Vehicle Plate
                    </div>
                    <div className="font-mono font-bold text-slate-900 text-lg uppercase tracking-wider">
                      {ticketData.vehicleNumber || 'N/A'}
                    </div>
                    <div className="text-xs text-slate-500 mt-1 capitalize">
                      Type: {ticketData.slot?.type || ticketData.slot?.vehicleType || 'Car'}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                      <User className="w-3.5 h-3.5 text-slate-600" /> Customer
                    </div>
                    <div className="font-semibold text-slate-900 text-sm">
                      {ticketData.user?.name || 'Registered Driver'}
                    </div>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">
                      {ticketData.user?.email || 'N/A'}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                      <Clock className="w-3.5 h-3.5 text-amber-600" /> Reserved Interval
                    </div>
                    <div className="text-xs font-medium text-slate-900">
                      In: {formatDateTime(ticketData.startTime)}
                    </div>
                    <div className="text-xs font-medium text-slate-900 mt-0.5">
                      Out: {formatDateTime(ticketData.endTime)}
                    </div>
                  </div>
                </div>

                {/* Gate Status Row */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span className="text-xs text-slate-500 block">Gate Status</span>
                    <span className="text-sm font-bold text-slate-900">
                      {ticketData.checkedOutAt ? (
                        <span className="text-slate-600">Checked Out ({formatDateTime(ticketData.checkedOutAt)})</span>
                      ) : ticketData.isCheckedIn ? (
                        <span className="text-emerald-600">Currently Parked (In: {formatDateTime(ticketData.checkedInAt)})</span>
                      ) : (
                        <span className="text-amber-600">Awaiting Entry</span>
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Total Amount</span>
                    <span className="text-lg font-bold text-emerald-600">
                      ₹{ticketData.amount || 0}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 flex flex-wrap gap-3">
                  {canCheckIn && (
                    <button
                      onClick={handleCheckIn}
                      disabled={actionLoading}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-semibold text-sm shadow-sm transition-all"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {actionLoading ? 'Processing…' : 'Authorize Check-In (Enter)'}
                    </button>
                  )}

                  {canCheckOut && (
                    <button
                      onClick={handleCheckOut}
                      disabled={actionLoading}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-500 text-white font-semibold text-sm shadow-sm transition-all"
                    >
                      <LogOut className="w-4 h-4" />
                      {actionLoading ? 'Processing…' : 'Complete Check-Out (Exit)'}
                    </button>
                  )}

                  {ticketData.checkedOutAt && (
                    <div className="w-full text-center py-2 text-sm text-slate-500 font-medium bg-slate-100 rounded-xl">
                      This reservation has already completed gate check-out.
                    </div>
                  )}

                  {!canCheckIn && !canCheckOut && !ticketData.checkedOutAt && ticketData.status !== 'confirmed' && (
                    <div className="w-full text-center py-2 text-sm text-amber-700 font-medium bg-amber-50 border border-amber-200 rounded-xl">
                      No gate actions available — ticket is {ticketData.status}.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
                <QrCode className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-slate-900 text-lg">Awaiting Gate Pass</h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1">
                Scan or paste a customer QR barcode or Booking ID in the scanner terminal to inspect details.
              </p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
