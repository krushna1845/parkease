import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { bookingService } from '../services/bookingService';
import { paymentService } from '../services/paymentService';
import { useToast } from '../context/ToastContext';
import StatusBadge from '../components/StatusBadge';
import {
  Calendar,
  Clock,
  MapPin,
  Car,
  QrCode,
  CreditCard,
  XCircle,
  Search,
  ExternalLink,
  AlertTriangle,
  X
} from 'lucide-react';

export default function MyBookings() {
  const toast = useToast();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  // Payment method selection per booking
  const [paymentMethods, setPaymentMethods] = useState({});
  const [payingId, setPayingId] = useState(null);

  // Cancellation modal state
  const [cancelModalBooking, setCancelModalBooking] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  // QR Modal preview
  const [qrModalBooking, setQrModalBooking] = useState(null);

  const loadBookings = () => {
    setLoading(true);
    bookingService
      .getMyBookings()
      .then((data) => setBookings(Array.isArray(data) ? data : data.bookings || []))
      .catch(() => toast.error('Failed to load your reservations'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadBookings();
  }, []);

  // Filter bookings based on active tab and query
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      // Tab filter
      const status = String(b.status).toLowerCase();
      let matchesTab = true;
      if (activeTab === 'confirmed') matchesTab = status === 'confirmed';
      else if (activeTab === 'pending') matchesTab = status === 'pending_payment';
      else if (activeTab === 'completed') matchesTab = status === 'completed';
      else if (activeTab === 'cancelled') matchesTab = status === 'cancelled';

      // Search query
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        b.vehicleNumber?.toLowerCase().includes(q) ||
        b.area?.name?.toLowerCase().includes(q) ||
        b.slot?.slotNumber?.toLowerCase().includes(q);

      return matchesTab && matchesSearch;
    });
  }, [bookings, activeTab, searchQuery]);

  // Handle Payment (Razorpay checkout or instant simulated payment)
  const handlePay = async (booking) => {
    setPayingId(booking._id);
    const method = paymentMethods[booking._id] || 'upi';

    try {
      // Check if Razorpay test keys are active
      const order = await paymentService.createOrder(booking._id);

      // If Razorpay script loads and test keys are active
      const hasRazorpay = await paymentService.loadRazorpayScript();
      if (hasRazorpay && window.Razorpay && order.keyId && order.keyId !== 'rzp_test_placeholder') {
        const options = {
          key: order.keyId,
          amount: Math.round(order.amount * 100),
          currency: order.currency || 'INR',
          name: 'ParkEase Parking',
          description: `Spot ${booking.slot?.slotNumber} Reservation`,
          order_id: order.orderId,
          handler: async (response) => {
            try {
              await paymentService.verifyPayment(booking._id, response);
              toast.success('Payment confirmed! QR pass ready.');
              loadBookings();
            } catch (vErr) {
              toast.error('Payment signature verification failed.');
            }
          },
          prefill: {
            contact: '',
            email: ''
          },
          theme: { color: '#059669' }
        };
        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        // Fallback: Instant simulated payment
        await paymentService.simulatedPay(booking._id, method);
        toast.success(`Payment successful via ${method.toUpperCase()}! Spot confirmed.`);
        loadBookings();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment failed. Please retry.');
    } finally {
      setPayingId(null);
    }
  };

  // Handle Cancellation
  const confirmCancel = async () => {
    if (!cancelModalBooking) return;
    setCancelling(true);

    try {
      await bookingService.cancel(cancelModalBooking._id);
      toast.success('Booking cancelled and hold released.');
      setCancelModalBooking(null);
      loadBookings();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cancellation rejected');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            My Reservations
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            View booking status, access QR tickets, make payments, and manage reservations.
          </p>
        </div>

        <Link
          to="/parking"
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition"
        >
          + New Reservation
        </Link>
      </div>

      {/* Tabs & Search Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
            {[
              { id: 'all', label: 'All Bookings' },
              { id: 'confirmed', label: 'Confirmed / Active' },
              { id: 'pending', label: 'Awaiting Payment' },
              { id: 'completed', label: 'Completed' },
              { id: 'cancelled', label: 'Cancelled' }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  activeTab === tab.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search box */}
          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by vehicle or facility..."
              className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            />
          </div>
        </div>
      </div>

      {/* Bookings List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-40 bg-white rounded-2xl border border-slate-100 p-6 animate-pulse" />
          ))}
        </div>
      ) : filteredBookings.length > 0 ? (
        <div className="space-y-4">
          {filteredBookings.map((b) => {
            const isConfirmed = b.status === 'confirmed';
            const isPending = b.status === 'pending_payment';
            const isCanCancel = b.status !== 'cancelled' && b.status !== 'completed' && new Date(b.startTime) > new Date();

            return (
              <div
                key={b._id}
                className="bg-white rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow p-6 sm:p-7 flex flex-col md:flex-row justify-between gap-6"
              >
                {/* Left: Info */}
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <StatusBadge status={b.status} />
                    <span className="text-xs text-slate-400 font-mono">
                      Ref: <strong className="text-slate-700">{b._id}</strong>
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900">{b.area?.name}</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" /> {b.area?.city}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 text-xs">
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Assigned Slot</span>
                      <span className="font-extrabold text-slate-900 text-sm">
                        Slot {b.slot?.slotNumber} <span className="text-xs font-normal text-slate-500">({b.slot?.type})</span>
                      </span>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Vehicle Plate</span>
                      <span className="font-extrabold text-slate-900 font-mono text-sm">
                        {b.vehicleNumber}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 col-span-2 sm:col-span-1">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Amount Paid</span>
                      <span className="font-extrabold text-emerald-700 text-sm">₹{b.amount}</span>
                    </div>
                  </div>

                  <div className="text-xs text-slate-600 flex items-center gap-2 pt-1">
                    <Clock className="w-4 h-4 text-emerald-600" />
                    <span>
                      {new Date(b.startTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                      {' → '}
                      {new Date(b.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* Right: Actions & QR preview */}
                <div className="shrink-0 flex flex-col items-center md:items-end justify-between border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6 space-y-4 min-w-[200px]">
                  {/* QR Image or Payment controls */}
                  {b.qrCode && isConfirmed && (
                    <div className="flex flex-col items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setQrModalBooking(b)}
                        className="group relative block p-1 bg-white border border-slate-200 rounded-xl shadow-2xs hover:border-emerald-500 transition"
                      >
                        <img src={b.qrCode} alt="Ticket QR" className="w-24 h-24 object-contain rounded-lg" />
                        <span className="text-[10px] text-emerald-700 font-bold block text-center mt-1 group-hover:underline">
                          Enlarge Pass 🔍
                        </span>
                      </button>
                    </div>
                  )}

                  {isPending && (
                    <div className="w-full space-y-2 bg-amber-50/70 p-3 rounded-2xl border border-amber-200 text-center">
                      <p className="text-[11px] font-bold text-amber-800">
                        Slot held for 10 min
                      </p>
                      <select
                        value={paymentMethods[b._id] || 'upi'}
                        onChange={(e) => setPaymentMethods({ ...paymentMethods, [b._id]: e.target.value })}
                        className="w-full text-xs font-semibold p-1.5 bg-white border border-amber-200 rounded-lg text-slate-700 focus:outline-none"
                      >
                        <option value="upi">UPI / QR</option>
                        <option value="card">Credit / Debit Card</option>
                        <option value="netbanking">Net Banking</option>
                      </select>
                      <button
                        type="button"
                        disabled={payingId === b._id}
                        onClick={() => handlePay(b)}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition"
                      >
                        {payingId === b._id ? 'Processing...' : `Pay ₹${b.amount}`}
                      </button>
                    </div>
                  )}

                  {/* Links and cancel actions */}
                  <div className="flex items-center gap-3 pt-2 text-xs">
                    {isConfirmed && (
                      <Link
                        to={`/booking-confirmation/${b._id}`}
                        className="font-bold text-emerald-700 hover:underline flex items-center gap-1"
                      >
                        Full Ticket <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    )}

                    {isCanCancel && (
                      <button
                        type="button"
                        onClick={() => setCancelModalBooking(b)}
                        className="text-rose-600 hover:text-rose-700 font-semibold hover:underline"
                      >
                        Cancel Booking
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
          <Car className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No reservations found</h3>
          <p className="text-xs text-slate-400">
            {searchQuery ? `No bookings matched "${searchQuery}"` : 'You have no bookings under this status category.'}
          </p>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {cancelModalBooking && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl animate-in fade-in-50 zoom-in-95">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>

            <div className="space-y-1">
              <h3 className="font-bold text-slate-900 text-lg">Cancel Reservation?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Are you sure you want to cancel your reservation for <strong>{cancelModalBooking.area?.name}</strong> (Slot {cancelModalBooking.slot?.slotNumber})? The slot will be immediately released for other drivers.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCancelModalBooking(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50"
              >
                Keep Booking
              </button>
              <button
                type="button"
                disabled={cancelling}
                onClick={confirmCancel}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs"
              >
                {cancelling ? 'Cancelling...' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enlarged QR Modal */}
      {qrModalBooking && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl animate-in zoom-in-95 relative">
            <button
              onClick={() => setQrModalBooking(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="pt-2">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                Official Entry Pass
              </span>
              <h3 className="text-lg font-black text-slate-900 mt-2">{qrModalBooking.area?.name}</h3>
              <p className="text-xs text-slate-500">Slot {qrModalBooking.slot?.slotNumber} • {qrModalBooking.vehicleNumber}</p>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-inner inline-block mx-auto">
              <img src={qrModalBooking.qrCode} alt="QR Pass" className="w-52 h-52 object-contain" />
            </div>

            <p className="text-xs text-slate-500 leading-normal">
              Present this pass at the entrance scanner terminal. Single-use vehicle check-in enforced.
            </p>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setQrModalBooking(null)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                Close Pass
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
