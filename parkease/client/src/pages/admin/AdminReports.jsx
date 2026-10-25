import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { adminService } from '../../services/adminService';
import { useToast } from '../../context/ToastContext';
import {
  BarChart3,
  Download,
  TrendingUp,
  DollarSign,
  Calendar,
  CheckCircle2,
  RefreshCw,
  FileSpreadsheet
} from 'lucide-react';

export default function AdminReports() {
  const toast = useToast();
  const [stats, setStats] = useState(null);       // from /admin/stats
  const [bookings, setBookings] = useState([]);    // from /admin/bookings
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      // Run both requests concurrently
      const [statsRes, bookingsRes] = await Promise.all([
        adminService.getMetrics(),    // returns axios response → .data has raw stats object
        adminService.getBookings()    // returns axios response → .data is bookings array
      ]);

      // Stats payload shape from adminController.stats:
      setStats(statsRes?.data || statsRes || null);

      // Bookings array
      const bData = Array.isArray(bookingsRes) ? bookingsRes : (bookingsRes?.data || []);
      setBookings(Array.isArray(bData) ? bData : (bData?.bookings || []));
    } catch (err) {
      toast.error('Failed to load reporting data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const exportCSV = () => {
    if (!bookings.length) {
      toast.error('No booking records available to export');
      return;
    }

    const headers = [
      'Booking ID',
      'Customer Name',
      'Customer Email',
      'Facility',
      'Slot',
      'Vehicle Plate',
      'Start Time',
      'End Time',
      'Amount (INR)',
      'Status',
      'Created At'
    ];

    const rows = bookings.map(b => [
      b._id,
      `"${b.user?.name || 'N/A'}"`,
      b.user?.email || 'N/A',
      `"${b.area?.name || 'N/A'}"`,
      b.slot?.slotNumber || 'N/A',
      b.vehicleNumber || 'N/A',
      b.startTime ? new Date(b.startTime).toISOString() : '',
      b.endTime ? new Date(b.endTime).toISOString() : '',
      b.amount || 0,
      b.status || 'unknown',
      b.createdAt ? new Date(b.createdAt).toISOString() : ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `parkease_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV Report exported successfully');
  };

  // Derive per-area revenue from the perArea aggregate in stats
  const perArea = stats?.perArea || [];

  const total = stats?.bookings || 0;

  return (
    <AdminLayout
      title="Analytics & Financial Reports"
      subtitle="Financial performance, occupancy metrics, and transaction audit logs."
    >
      {/* Header Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Audit Trail</span>
          <p className="text-sm text-slate-600">Export verified parking transactions for accounting.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={exportCSV}
            disabled={loading || !bookings.length}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-sm font-semibold rounded-xl shadow-sm transition-all"
          >
            <Download className="w-4 h-4" />
            Export CSV Sheet
          </button>
        </div>
      </div>

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gross Revenue</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            ₹{stats?.revenue?.toLocaleString('en-IN') || 0}
          </div>
          <div className="text-xs text-slate-500 mt-2">
            From paid transactions
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Bookings</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {total}
          </div>
          <div className="text-xs text-slate-500 mt-2">
            <span className="text-blue-600 font-semibold">{stats?.confirmed || 0}</span> confirmed
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed Trips</span>
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {stats?.completed || 0}
          </div>
          <div className="text-xs text-slate-500 mt-2">Successfully checked out</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Slots</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {stats?.slots || 0}
          </div>
          <div className="text-xs text-slate-500 mt-2">
            Across {stats?.areas || 0} facilities
          </div>
        </div>
      </div>

      {/* Booking Pipeline + Facility Revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Status Distribution */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
          <h3 className="font-bold text-slate-900 text-base mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-600" /> Booking Pipeline Breakdown
          </h3>
          <div className="space-y-4">
            {[
              { label: 'Confirmed / Active', count: stats?.confirmed || 0, color: 'bg-emerald-500' },
              { label: 'Completed', count: stats?.completed || 0, color: 'bg-teal-500' },
              { label: 'Awaiting Payment', count: (total - (stats?.confirmed || 0) - (stats?.completed || 0) - (stats?.cancelled || 0)), color: 'bg-amber-500' },
              { label: 'Cancelled', count: stats?.cancelled || 0, color: 'bg-rose-500' }
            ].map(({ label, count, color }) => (
              <div key={label}>
                <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                  <span className="flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
                    {label}
                  </span>
                  <span>{count}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className={`${color} h-2 rounded-full transition-all duration-500`}
                    style={{ width: `${total > 0 ? Math.min(100, (count / total) * 100) : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Per-Area Booking Distribution */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
          <h3 className="font-bold text-slate-900 text-base mb-4 flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Per-Facility Booking Count
          </h3>
          {perArea.length > 0 ? (
            <div className="space-y-3">
              {perArea.map((fa, idx) => (
                <div key={fa._id || idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-slate-900 text-sm">{fa.name || 'Unknown Area'}</h4>
                    <span className="text-xs text-slate-500">{fa.count} bookings handled</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-slate-500 text-sm">
              No per-facility data available yet.
            </div>
          )}
        </div>
      </div>

      {/* Raw Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Recent Financial Ledger</h3>
            <p className="text-xs text-slate-500">Live transaction log with customer & payment status</p>
          </div>
          <span className="text-xs font-mono text-slate-500">{bookings.length} records</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3.5">Booking ID</th>
                  <th className="px-5 py-3.5">Customer</th>
                  <th className="px-5 py-3.5">Facility</th>
                  <th className="px-5 py-3.5">Amount</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bookings.slice(0, 20).map(b => (
                  <tr key={b._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-xs font-medium text-slate-900">
                      #{b._id.slice(-8)}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-900 text-xs">
                      {b.user?.name || 'Driver'}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-600">
                      {b.area?.name || 'Main Parking'}
                    </td>
                    <td className="px-5 py-3.5 font-bold font-mono text-xs text-emerald-600">
                      ₹{b.amount || 0}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium capitalize ${
                        b.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700' :
                        b.status === 'completed' ? 'bg-teal-50 text-teal-700' :
                        b.status === 'cancelled' ? 'bg-rose-50 text-rose-700' :
                        'bg-amber-50 text-amber-700'
                      }`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-500 font-mono">
                      {b.createdAt ? new Date(b.createdAt).toLocaleDateString('en-IN') : 'N/A'}
                    </td>
                  </tr>
                ))}
                {bookings.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-500">
                      No booking records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
