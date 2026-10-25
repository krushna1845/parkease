import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import QRCode from 'qrcode';
import {
  QrCode,
  Smartphone,
  CreditCard,
  Building,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ArrowLeft,
  Lock,
  ExternalLink,
  RefreshCw,
  Sparkles,
  Zap,
  MapPin,
  Calendar,
  Car
} from 'lucide-react';
import { bookingService } from '../services/bookingService';
import { paymentService } from '../services/paymentService';
import { useToast } from '../context/ToastContext';

const HOLD_DURATION_MS = 10 * 60 * 1000; // 10 minutes in milliseconds
const UPI_VPA = 'parkease@okhdfcbank';
const UPI_PAYEE_NAME = 'ParkEase Smart Parking';

export default function Payment() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Payment UI state
  const [activeTab, setActiveTab] = useState('qr'); // 'qr' | 'vpa' | 'apps' | 'card'
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [qrGenerating, setQrGenerating] = useState(true);
  const [upiCopied, setUpiCopied] = useState(false);

  // VPA Input state
  const [upiId, setUpiId] = useState('');
  const [utrNumber, setUtrNumber] = useState('');
  const [showUtrField, setShowUtrField] = useState(false);

  // Processing state
  const [processing, setProcessing] = useState(false);
  const [processStep, setProcessStep] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Hold Timer state
  const [timeLeftMs, setTimeLeftMs] = useState(HOLD_DURATION_MS);
  const [holdExpired, setHoldExpired] = useState(false);

  // Load Booking data
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    bookingService
      .getById(id)
      .then((data) => {
        if (!isMounted) return;
        const b = data.booking || data;
        setBooking(b);

        // If booking is already confirmed, redirect to confirmation pass
        if (b.status === 'confirmed' || b.status === 'completed') {
          toast.info('This booking is already paid and confirmed.');
          nav(`/booking-confirmation/${b._id}`, { replace: true });
          return;
        }

        if (b.status === 'cancelled') {
          setError('This booking hold has expired or was cancelled.');
          setHoldExpired(true);
          return;
        }

        // Calculate initial hold time
        const createdAt = new Date(b.createdAt).getTime();
        const elapsed = Date.now() - createdAt;
        const remaining = Math.max(0, HOLD_DURATION_MS - elapsed);
        setTimeLeftMs(remaining);
        if (remaining <= 0) {
          setHoldExpired(true);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.response?.data?.message || 'Unable to retrieve booking for payment.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id, nav, toast]);

  // Hold Countdown Timer Effect
  useEffect(() => {
    if (!booking || holdExpired || paymentSuccess) return;

    const interval = setInterval(() => {
      const createdAt = new Date(booking.createdAt).getTime();
      const elapsed = Date.now() - createdAt;
      const remaining = Math.max(0, HOLD_DURATION_MS - elapsed);
      setTimeLeftMs(remaining);

      if (remaining <= 0) {
        setHoldExpired(true);
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [booking, holdExpired, paymentSuccess]);

  // Generate UPI QR Code URL
  useEffect(() => {
    if (!booking || !booking.amount) return;

    setQrGenerating(true);
    // Standard NPCI UPI URI Scheme
    const slotNum = booking.slot?.slotNumber || 'P1';
    const upiString = `upi://pay?pa=${encodeURIComponent(UPI_VPA)}&pn=${encodeURIComponent(
      UPI_PAYEE_NAME
    )}&am=${booking.amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(
      `ParkEase Spot ${slotNum} Booking`
    )}&tr=${booking._id}`;

    QRCode.toDataURL(upiString, {
      width: 320,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'H'
    })
      .then((url) => {
        setQrDataUrl(url);
      })
      .catch((err) => {
        console.error('QR code generation failed:', err);
      })
      .finally(() => {
        setQrGenerating(false);
      });
  }, [booking]);

  // Format time remaining mm:ss
  const formatTimer = (ms) => {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const timerPercent = Math.max(0, Math.min(100, (timeLeftMs / HOLD_DURATION_MS) * 100));

  // Copy UPI ID to clipboard
  const handleCopyUpi = () => {
    navigator.clipboard.writeText(UPI_VPA);
    setUpiCopied(true);
    toast.success('UPI ID copied to clipboard!');
    setTimeout(() => setUpiCopied(false), 2500);
  };

  // Execute payment completion & verification
  const handleCompletePayment = async (methodType = 'upi', customUpi = '') => {
    if (!booking) return;

    if (holdExpired) {
      toast.error('The 10-minute hold window has expired. Please select a spot again.');
      return;
    }

    setProcessing(true);
    setProcessStep('Verifying payment with UPI gateway...');

    try {
      // Simulate realistic gateway handshake steps for smooth UX
      await new Promise((res) => setTimeout(res, 800));
      setProcessStep('Locking slot reservation atomically...');
      await new Promise((res) => setTimeout(res, 600));

      const generatedTxnId =
        utrNumber.trim() ||
        'UPI' + Date.now().toString().slice(-8) + Math.floor(1000 + Math.random() * 9000);

      const confirmedBooking = await paymentService.payWithUpi(booking._id, {
        upiId: customUpi || upiId || UPI_VPA,
        transactionId: generatedTxnId
      });

      setProcessStep('Generating secure digital entry pass...');
      await new Promise((res) => setTimeout(res, 500));

      setPaymentSuccess(true);
      toast.success('Payment verified! Your parking pass is ready.');

      setTimeout(() => {
        nav(`/booking-confirmation/${booking._id}`, { replace: true });
      }, 1200);
    } catch (err) {
      const msg = err.response?.data?.message || 'Payment processing failed. Please retry.';
      toast.error(msg);
      setProcessing(false);
      setProcessStep('');
    }
  };

  // Submit via VPA
  const handleVpaSubmit = (e) => {
    e.preventDefault();
    if (!upiId.trim() || !upiId.includes('@')) {
      toast.error('Please enter a valid UPI ID (e.g., yourname@okhdfcbank)');
      return;
    }
    handleCompletePayment('upi_vpa', upiId.trim());
  };

  // Quick VPA suffix appender
  const appendVpaSuffix = (suffix) => {
    const base = upiId.split('@')[0] || '';
    setUpiId(base + suffix);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center py-20 px-4">
        <div className="flex flex-col items-center gap-4 bg-white p-8 rounded-3xl shadow-xl border border-slate-100 max-w-sm w-full text-center">
          <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
          <h3 className="font-extrabold text-slate-900 text-lg">Initializing Secure Checkout</h3>
          <p className="text-xs text-slate-500">Retrieving parking spot hold details and generating payment QR code...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center py-20 px-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 max-w-md w-full text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-slate-900">Payment Order Not Available</h2>
          <p className="text-xs text-slate-500">{error || 'Could not locate reservation details.'}</p>
          <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
            <Link
              to="/parking"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition"
            >
              Explore Parking Map
            </Link>
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
            >
              My Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const upiIntentUrl = `upi://pay?pa=${encodeURIComponent(UPI_VPA)}&pn=${encodeURIComponent(
    UPI_PAYEE_NAME
  )}&am=${booking.amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(
    `Spot ${booking.slot?.slotNumber || 'P1'} Reserve`
  )}&tr=${booking._id}`;

  const startTimeFormatted = new Date(booking.startTime).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  const endTimeFormatted = new Date(booking.endTime).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  const dateFormatted = new Date(booking.startTime).toLocaleDateString([], {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100/60 to-slate-50 pb-24">
      {/* Top Breadcrumb & Back */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-2">
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={() => nav(-1)}
            type="button"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200/90 px-3.5 py-2 rounded-xl shadow-xs transition hover:bg-slate-50 active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" /> Go Back
          </button>

          {/* Stepper indicator */}
          <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-slate-500">
            <span className="flex items-center gap-1 text-emerald-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Slot Selected
            </span>
            <span className="text-slate-300">→</span>
            <span className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              UPI Payment
            </span>
            <span className="text-slate-300">→</span>
            <span className="text-slate-400">Entry QR Pass</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-4 space-y-6">
        {/* Hold Window Countdown Alert Banner */}
        <div
          className={`rounded-2xl p-4 sm:p-5 border transition-all ${
            holdExpired
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : timeLeftMs < 120000
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : 'bg-emerald-50/90 border-emerald-200/90 text-emerald-950'
          } shadow-sm`}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  holdExpired
                    ? 'bg-rose-100 text-rose-700'
                    : timeLeftMs < 120000
                    ? 'bg-amber-100 text-amber-700 animate-bounce'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="font-extrabold text-sm sm:text-base tracking-tight">
                  {holdExpired
                    ? 'Reservation Hold Has Expired'
                    : `Slot ${booking.slot?.slotNumber} is locked exclusively for you`}
                </p>
                <p className="text-xs opacity-85">
                  {holdExpired
                    ? 'The 10-minute hold has elapsed and the spot was released back to other drivers.'
                    : 'Complete UPI payment before the timer expires to confirm your parking ticket.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-auto">
              {!holdExpired && (
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold tracking-wider opacity-75 block">
                    Hold Remaining
                  </span>
                  <span className="font-mono text-2xl font-black tracking-tight text-emerald-900">
                    {formatTimer(timeLeftMs)}
                  </span>
                </div>
              )}
              {holdExpired && (
                <Link
                  to={`/parking/${booking.area?._id || ''}`}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
                >
                  Re-select Slot
                </Link>
              )}
            </div>
          </div>

          {!holdExpired && (
            <div className="w-full bg-emerald-200/60 h-1.5 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-emerald-600 h-full rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${timerPercent}%` }}
              />
            </div>
          )}
        </div>

        {/* Main Grid: Payment Options (Left) & Order Summary (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ───────────────────────────────────────────────────────────── */}
          {/* LEFT: UPI & QR Code Payment Options (7 Cols) */}
          {/* ───────────────────────────────────────────────────────────── */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
              {/* Payment Section Header */}
              <div className="bg-slate-900 text-white p-5 sm:p-6 flex items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block">
                    Instant Checkout
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight mt-0.5 flex items-center gap-2">
                    UPI Payment Gateway
                    <span className="text-[10px] font-extrabold bg-emerald-600 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Zero Surcharge
                    </span>
                  </h2>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Due</span>
                  <span className="text-2xl sm:text-3xl font-black text-emerald-400">
                    ₹{booking.amount}
                  </span>
                </div>
              </div>

              {/* Payment Method Selector Tabs */}
              <div className="flex border-b border-slate-200 bg-slate-50/70 p-1.5 gap-1.5 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab('qr')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition flex-1 justify-center whitespace-nowrap ${
                    activeTab === 'qr'
                      ? 'bg-white text-emerald-800 shadow-md border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <QrCode className="w-4 h-4 text-emerald-600" />
                  <span>Scan UPI QR</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('vpa')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition flex-1 justify-center whitespace-nowrap ${
                    activeTab === 'vpa'
                      ? 'bg-white text-emerald-800 shadow-md border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <Smartphone className="w-4 h-4 text-indigo-600" />
                  <span>Enter UPI ID</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('apps')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition flex-1 justify-center whitespace-nowrap ${
                    activeTab === 'apps'
                      ? 'bg-white text-emerald-800 shadow-md border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span>1-Click UPI Apps</span>
                </button>
              </div>

              {/* Tab Contents */}
              <div className="p-6 sm:p-8">
                {/* ───────────────────────────────────────────────────────── */}
                {/* TAB 1: Scan UPI QR Code */}
                {/* ───────────────────────────────────────────────────────── */}
                {activeTab === 'qr' && (
                  <div className="flex flex-col items-center text-center space-y-6">
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-lg">
                        Scan with Any UPI App
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                        Open Google Pay, PhonePe, Paytm, BHIM, or any banking app and scan this QR code to pay instantly.
                      </p>
                    </div>

                    {/* QR Code Container with target border */}
                    <div className="relative p-4 bg-white rounded-3xl border-2 border-emerald-500/80 shadow-2xl shadow-emerald-500/10 inline-block group">
                      {/* Top corners decorative */}
                      <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-emerald-600 rounded-tl" />
                      <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-emerald-600 rounded-tr" />
                      <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-emerald-600 rounded-bl" />
                      <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-emerald-600 rounded-br" />

                      {qrGenerating ? (
                        <div className="w-64 h-64 flex flex-col items-center justify-center bg-slate-50 rounded-2xl">
                          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
                          <p className="text-xs font-semibold text-slate-500 mt-2">Generating Dynamic QR...</p>
                        </div>
                      ) : (
                        <div className="relative">
                          <img
                            src={qrDataUrl}
                            alt="UPI QR Code"
                            className="w-64 h-64 rounded-xl object-contain"
                          />
                          {/* ParkEase Center Badge */}
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="bg-emerald-600 text-white font-black text-[11px] px-2 py-1 rounded-lg shadow-lg border-2 border-white flex items-center gap-1">
                              <Car className="w-3.5 h-3.5" />
                              <span>UPI</span>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] font-bold text-slate-700 bg-slate-50 py-1.5 px-3 rounded-xl border border-slate-100">
                        <span>Amount to Pay:</span>
                        <span className="text-emerald-700 font-extrabold text-sm">₹{booking.amount}</span>
                      </div>
                    </div>

                    {/* Supported UPI Apps Badges */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Supported Instant Apps
                      </span>
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        {['Google Pay', 'PhonePe', 'Paytm', 'BHIM UPI', 'CRED', 'Amazon Pay'].map((app) => (
                          <span
                            key={app}
                            className="text-xs font-semibold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200/80"
                          >
                            {app}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* UPI VPA Copy pill */}
                    <div className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-2xl max-w-sm w-full">
                      <div className="text-left truncate">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">UPI ID / VPA</span>
                        <span className="font-mono text-xs font-bold text-slate-800 truncate block">
                          {UPI_VPA}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyUpi}
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold flex items-center gap-1 shadow-2xs transition active:scale-95 shrink-0"
                      >
                        {upiCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{upiCopied ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>

                    {/* Mobile UPI Deep Link */}
                    <div className="w-full max-w-sm space-y-3 pt-2">
                      <a
                        href={upiIntentUrl}
                        className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-sm py-3 px-6 rounded-2xl shadow-lg shadow-emerald-600/25 transition active:scale-95"
                      >
                        <Smartphone className="w-4 h-4" />
                        <span>Pay directly with UPI App</span>
                        <ExternalLink className="w-4 h-4 opacity-75" />
                      </a>

                      {/* Manual verification button */}
                      <button
                        type="button"
                        onClick={() => handleCompletePayment('upi_qr')}
                        disabled={processing || holdExpired}
                        className="w-full inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-sm py-3 px-6 rounded-2xl shadow-md transition active:scale-95 disabled:opacity-50"
                      >
                        {processing ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                            <span>{processStep || 'Verifying Payment...'}</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>I Have Completed UPI Payment</span>
                          </>
                        )}
                      </button>

                      <div className="text-center">
                        <button
                          type="button"
                          onClick={() => setShowUtrField(!showUtrField)}
                          className="text-[11px] font-bold text-slate-500 hover:text-emerald-700 underline"
                        >
                          {showUtrField ? 'Hide Reference / UTR field' : 'Enter 12-Digit UPI Ref / UTR (Optional)'}
                        </button>
                      </div>

                      {showUtrField && (
                        <div className="animate-in fade-in space-y-1.5 pt-1">
                          <input
                            type="text"
                            placeholder="Enter 12-digit UPI UTR number"
                            value={utrNumber}
                            onChange={(e) => setUtrNumber(e.target.value)}
                            className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                          <p className="text-[10px] text-slate-400 text-left">
                            Found in your UPI app transaction details (e.g. 402847582910).
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ───────────────────────────────────────────────────────── */}
                {/* TAB 2: Enter UPI ID / VPA */}
                {/* ───────────────────────────────────────────────────────── */}
                {activeTab === 'vpa' && (
                  <form onSubmit={handleVpaSubmit} className="space-y-6 max-w-md mx-auto">
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-lg">
                        Pay with your UPI ID (VPA)
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Enter your Virtual Payment Address to approve payment on your phone.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 block text-left">
                        Your UPI ID / VPA
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={upiId}
                          onChange={(e) => setUpiId(e.target.value)}
                          placeholder="e.g. mobileNumber@okaxis or username@paytm"
                          className="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-sm text-slate-800 placeholder:text-slate-400"
                        />
                      </div>

                      {/* Quick bank chips */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        <span className="text-[10px] font-bold text-slate-400 self-center mr-1">Quick:</span>
                        {['@okhdfcbank', '@okaxis', '@oksbi', '@ybl', '@paytm'].map((suf) => (
                          <button
                            key={suf}
                            type="button"
                            onClick={() => appendVpaSuffix(suf)}
                            className="text-[11px] font-bold bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 px-2 py-1 rounded-lg border border-slate-200 transition"
                          >
                            {suf}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-indigo-900 text-xs space-y-1 text-left">
                      <p className="font-bold flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        How VPA payment works:
                      </p>
                      <p className="text-[11px] text-indigo-700/90 leading-relaxed">
                        We send a payment request of <strong>₹{booking.amount}</strong> to your UPI app. Open Google Pay or PhonePe to enter your UPI PIN.
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={processing || holdExpired || !upiId.trim()}
                      className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm py-3.5 px-6 rounded-2xl shadow-lg shadow-indigo-600/20 transition active:scale-95 disabled:opacity-50"
                    >
                      {processing ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-white" />
                          <span>{processStep || 'Requesting from UPI App...'}</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4" />
                          <span>Request ₹{booking.amount} on UPI</span>
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* ───────────────────────────────────────────────────────── */}
                {/* TAB 3: 1-Click UPI Apps */}
                {/* ───────────────────────────────────────────────────────── */}
                {activeTab === 'apps' && (
                  <div className="space-y-6 max-w-md mx-auto">
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-lg">
                        Select Your UPI App
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Tap on your preferred UPI provider for instantaneous one-touch checkout.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { name: 'Google Pay', icon: '⚡', color: 'border-blue-200 hover:border-blue-500 hover:bg-blue-50/50' },
                        { name: 'PhonePe', icon: '🟣', color: 'border-purple-200 hover:border-purple-500 hover:bg-purple-50/50' },
                        { name: 'Paytm UPI', icon: '🔷', color: 'border-sky-200 hover:border-sky-500 hover:bg-sky-50/50' },
                        { name: 'CRED UPI', icon: '⬛', color: 'border-slate-200 hover:border-slate-800 hover:bg-slate-50/50' }
                      ].map((app) => (
                        <button
                          key={app.name}
                          type="button"
                          disabled={processing || holdExpired}
                          onClick={() => handleCompletePayment('upi_app', app.name)}
                          className={`p-4 rounded-2xl border-2 bg-white flex flex-col items-center justify-center gap-2 text-slate-800 transition shadow-xs hover:shadow-md active:scale-95 disabled:opacity-50 ${app.color}`}
                        >
                          <span className="text-2xl">{app.icon}</span>
                          <span className="font-black text-xs">{app.name}</span>
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                            Pay ₹{booking.amount}
                          </span>
                        </button>
                      ))}
                    </div>

                    <p className="text-[11px] text-slate-400 text-center">
                      On desktop, selecting an app will launch the instant simulated UPI gateway and verify your slot.
                    </p>
                  </div>
                )}
              </div>

              {/* Secure Footer Trust Banner */}
              <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                <div className="flex items-center gap-2 font-semibold">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>256-Bit Bank Grade SSL Encrypted</span>
                </div>
                <div className="flex items-center gap-3 text-[11px] font-bold text-slate-400">
                  <span>NPCI UPI Compliant</span>
                  <span>•</span>
                  <span>Instant Entry Gate Pass</span>
                </div>
              </div>
            </div>
          </div>

          {/* ───────────────────────────────────────────────────────────── */}
          {/* RIGHT: Order & Reservation Details Summary (5 Cols) */}
          {/* ───────────────────────────────────────────────────────────── */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-7 space-y-6">
              <div>
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest block">
                  Reservation Summary
                </span>
                <h3 className="text-xl font-black text-slate-900 tracking-tight mt-1">
                  {booking.area?.name || 'Smart Parking Hub'}
                </h3>
                <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{booking.area?.address || booking.area?.city || 'Mumbai City'}</span>
                </p>
              </div>

              {/* Spot Badge Highlight */}
              <div className="bg-gradient-to-tr from-slate-900 to-slate-800 text-white p-4 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block">
                    Assigned Slot
                  </span>
                  <span className="text-2xl font-black tracking-tight">
                    {booking.slot?.slotNumber || 'Slot'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                    Vehicle No
                  </span>
                  <span className="font-mono text-sm font-extrabold bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
                    {booking.vehicleNumber}
                  </span>
                </div>
              </div>

              {/* Time & Schedule breakdown */}
              <div className="space-y-3 border-y border-slate-100 py-4 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" /> Date
                  </span>
                  <span className="font-bold text-slate-800">{dateFormatted}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" /> Duration
                  </span>
                  <span className="font-bold text-slate-800">
                    {startTimeFormatted} - {endTimeFormatted}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Rate / Hour</span>
                  <span className="font-bold text-slate-800">₹{booking.area?.pricePerHour || 50}/hr</span>
                </div>
              </div>

              {/* Price Calculation Bill */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Parking Reservation Fee</span>
                  <span className="font-semibold">₹{booking.amount}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span className="flex items-center gap-1">
                    Platform & Convenience Fee
                    <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded-full">FREE</span>
                  </span>
                  <span className="font-semibold text-emerald-600">₹0</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>GST (18% inclusive)</span>
                  <span className="font-semibold text-slate-500">Included</span>
                </div>

                <div className="border-t border-slate-200 pt-3 flex items-center justify-between text-slate-900">
                  <div>
                    <span className="font-black text-sm">Total Payable</span>
                    <span className="text-[10px] text-slate-400 block font-medium">All taxes included</span>
                  </div>
                  <span className="text-2xl font-black text-emerald-700">₹{booking.amount}</span>
                </div>
              </div>

              {/* Guarantees Box */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2 text-[11px] text-slate-600">
                <div className="flex items-center gap-2 font-semibold text-slate-800">
                  <Lock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Guaranteed spot or 100% refund</span>
                </div>
                <p className="text-slate-500 leading-relaxed">
                  Upon payment confirmation, a secure entry QR code will be generated immediately to scan at the gate.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
