import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import api, { errMsg } from '../api';

export default function VerifyQR() {
  const nav = useNavigate();
  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleVerify = async (e) => {
    if (e) e.preventDefault();
    if (!inputVal.trim()) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await api.post('/bookings/verify', { qrData: inputVal.trim() });
      setResult(res.data);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setInputVal('');
    setResult(null);
    setError('');
  };

  const getStatusBadge = (state) => {
    switch (state) {
      case 'active_now':
        return <span className="bg-green-100 text-green-800 border border-green-300 font-semibold px-3 py-1 rounded-full text-sm">🟢 Active Now (Allowed Entry)</span>;
      case 'upcoming':
        return <span className="bg-blue-100 text-blue-800 border border-blue-300 font-semibold px-3 py-1 rounded-full text-sm">🔵 Upcoming Reservation</span>;
      case 'completed':
        return <span className="bg-gray-100 text-gray-800 border border-gray-300 font-semibold px-3 py-1 rounded-full text-sm">⚪ Completed / Expired</span>;
      case 'cancelled':
        return <span className="bg-red-100 text-red-800 border border-red-300 font-semibold px-3 py-1 rounded-full text-sm">🔴 Cancelled</span>;
      case 'unpaid':
        return <span className="bg-yellow-100 text-yellow-800 border border-yellow-300 font-semibold px-3 py-1 rounded-full text-sm">🟡 Unpaid</span>;
      default:
        return <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm">Unknown</span>;
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={() => nav(-1)}
            type="button"
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition"
            title="Go Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-800">QR Ticket Verification</h1>
        </div>
        <p className="text-gray-600 text-sm mb-6">
          Paste the booking QR JSON payload, raw text, or a 24-character Booking ID to verify parking ticket validity.
        </p>

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              QR Code Payload or Booking ID
            </label>
            <textarea
              rows={4}
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder='e.g. {"bookingId":"67b5e...","area":"Central Mall","slot":"A1",...} or raw Booking ID'
              className="w-full border border-gray-300 rounded p-3 font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading || !inputVal.trim()}
              className="bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-medium px-5 py-2 rounded transition-colors"
            >
              {loading ? 'Verifying...' : 'Verify Ticket'}
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded transition-colors"
            >
              Clear
            </button>
          </div>
        </form>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            <strong className="font-semibold">Verification Failed:</strong> {error}
          </div>
        )}
      </div>

      {result && result.booking && (
        <div className={`p-6 rounded-lg shadow border transition-all ${
          result.valid
            ? 'bg-emerald-50 border-emerald-300'
            : result.validityState === 'completed'
            ? 'bg-amber-50 border-amber-300'
            : 'bg-rose-50 border-rose-300'
        }`}>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 pb-4 mb-4">
            <div>
              <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Verification Status</span>
              <h2 className="text-xl font-bold text-gray-900 mt-1">{result.message}</h2>
            </div>
            <div>{getStatusBadge(result.validityState)}</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="bg-white/80 p-3 rounded border">
              <span className="text-xs text-gray-500 uppercase font-semibold">Vehicle Number</span>
              <p className="text-lg font-bold text-blue-800">{result.booking.vehicleNumber}</p>
            </div>

            <div className="bg-white/80 p-3 rounded border">
              <span className="text-xs text-gray-500 uppercase font-semibold">Slot & Area</span>
              <p className="text-base font-semibold text-gray-900">
                Slot {result.booking.slot?.slotNumber} ({result.booking.slot?.type})
              </p>
              <p className="text-xs text-gray-600">{result.booking.area?.name}, {result.booking.area?.city}</p>
            </div>

            <div className="bg-white/80 p-3 rounded border">
              <span className="text-xs text-gray-500 uppercase font-semibold">Reserved Timing</span>
              <p className="text-xs text-gray-800 mt-1">
                <strong>From:</strong> {new Date(result.booking.startTime).toLocaleString()}
              </p>
              <p className="text-xs text-gray-800">
                <strong>To:</strong> {new Date(result.booking.endTime).toLocaleString()}
              </p>
            </div>

            <div className="bg-white/80 p-3 rounded border">
              <span className="text-xs text-gray-500 uppercase font-semibold">User & Payment</span>
              <p className="text-xs text-gray-800 mt-1">
                <strong>Name:</strong> {result.booking.user?.name} ({result.booking.user?.email})
              </p>
              <p className="text-xs text-gray-800">
                <strong>Amount Paid:</strong> Rs {result.booking.amount}
              </p>
              {result.payment && (
                <p className="text-xs text-gray-500 mt-1">
                  Txn: {result.payment.transactionId} ({result.payment.method})
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap gap-3 items-center justify-between">
            <div className="flex gap-2">
              {result.canCheckIn && !result.booking.isCheckedIn && (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const res = await api.post(`/bookings/${result.booking._id}/checkin`);
                      setResult((prev) => ({
                        ...prev,
                        message: 'Vehicle checked in successfully',
                        validityState: 'checked_in',
                        canCheckIn: false,
                        booking: res.data.booking
                      }));
                    } catch (e) {
                      setError(errMsg(e));
                    }
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2 rounded text-sm transition-colors shadow-sm"
                >
                  ✓ Check In Vehicle
                </button>
              )}
              {result.booking.isCheckedIn && !result.booking.checkedOutAt && (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const res = await api.post(`/bookings/${result.booking._id}/checkout`);
                      setResult((prev) => ({
                        ...prev,
                        message: 'Vehicle checked out successfully',
                        validityState: 'completed',
                        booking: res.data.booking
                      }));
                    } catch (e) {
                      setError(errMsg(e));
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded text-sm transition-colors shadow-sm"
                >
                  ➜ Check Out Vehicle
                </button>
              )}
            </div>
            <div className="text-xs text-gray-500">
              <span>Booking ID: <code className="font-mono bg-white px-2 py-0.5 rounded border">{result.booking._id}</code></span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
