import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import AdminLayout from '../../components/AdminLayout';
import { useSocket } from '../../context/SocketContext';
import {
  Users,
  Building2,
  ParkingSquare,
  BookMarked,
  CheckCircle2,
  Clock,
  XCircle,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  CheckCheck
} from 'lucide-react';

export default function AdminOverview() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { subscribeToAdmin, on } = useSocket();

  const fetchStats = useCallback(() => {
    adminService
      .getStats()
      .then((data) => setStats(data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchStats();
    subscribeToAdmin();

    const unsubStats = on('admin:stats:updated', () => {
      fetchStats();
    });

    const unsubReconnect = on('reconnected', () => {
      subscribeToAdmin();
      fetchStats();
    });

    return () => {
      unsubStats();
      unsubReconnect();
    };
  }, [fetchStats, subscribeToAdmin, on]);

  if (loading) {
    return (
      <AdminLayout title="Dashboard Overview" subtitle="Real-time facility occupancy and revenue analytics">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-28 bg-white rounded-2xl border border-slate-100" />
          ))}
        </div>
      </AdminLayout>
    );
  }

  const statCards = [
    { label: 'Registered Drivers', val: stats?.users ?? 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Parking Facilities', val: stats?.areas ?? 0, icon: Building2, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Total Slot Inventory', val: stats?.slots ?? 0, icon: ParkingSquare, color: 'text-teal-600', bg: 'bg-teal-50' },
    { label: 'Total Reservations', val: stats?.bookings ?? 0, icon: BookMarked, color: 'text-slate-700', bg: 'bg-slate-100' },
    { label: 'Confirmed / Active', val: stats?.confirmed ?? 0, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Completed Sessions', val: stats?.completed ?? 0, icon: CheckCheck, color: 'text-cyan-600', bg: 'bg-cyan-50' },
    { label: 'Cancelled Bookings', val: stats?.cancelled ?? 0, icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50' },
    { label: 'Gross Revenue', val: `₹${stats?.revenue ?? 0}`, icon: TrendingUp, color: 'text-emerald-700', bg: 'bg-emerald-100/60' },
  ];

  return (
    <AdminLayout title="Platform Overview" subtitle="Real-time facility metrics, revenue, and inventory distribution">
      <div className="space-y-8">
        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {statCards.map((c, i) => {
            const Icon = c.icon;
            return (
              <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-bold uppercase tracking-wider">{c.label}</span>
                  <div className={`w-8 h-8 rounded-lg ${c.bg} ${c.color} flex items-center justify-center`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-black text-slate-900">{c.val}</p>
              </div>
            );
          })}
        </div>

        {/* Breakdown by Parking Facility */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-base text-slate-900">Reservations per Facility</h3>
              <p className="text-xs text-slate-500">Facility traffic and successful bookings distribution</p>
            </div>
            <Link to="/admin/parking" className="text-xs font-bold text-emerald-700 hover:underline">
              Manage Facilities →
            </Link>
          </div>

          {stats?.perArea && stats.perArea.length > 0 ? (
            <div className="space-y-3 pt-2">
              {stats.perArea.map((a) => (
                <div key={a._id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{a.name || 'Parking Area'}</p>
                      <p className="text-[11px] text-slate-400">ID: {a._id}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-extrabold text-slate-900">{a.count}</span>
                    <span className="text-xs text-slate-400 block">confirmed sessions</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-xs text-slate-400">
              No confirmed bookings recorded yet across facilities.
            </div>
          )}
        </div>

        {/* Quick Administration Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            to="/admin/parking"
            className="p-5 bg-white rounded-2xl border border-slate-200/90 hover:border-emerald-500 hover:shadow-xs transition group block"
          >
            <span className="text-xs font-bold text-emerald-700 group-hover:underline">Facilities →</span>
            <p className="text-sm font-bold text-slate-900 mt-1">Add or Edit Parking Areas</p>
            <p className="text-xs text-slate-500 mt-1">Configure pricing rates, cities, and addresses.</p>
          </Link>

          <Link
            to="/admin/slots"
            className="p-5 bg-white rounded-2xl border border-slate-200/90 hover:border-emerald-500 hover:shadow-xs transition group block"
          >
            <span className="text-xs font-bold text-emerald-700 group-hover:underline">Inventory →</span>
            <p className="text-sm font-bold text-slate-900 mt-1">Manage Slot Inventory</p>
            <p className="text-xs text-slate-500 mt-1">Add car/bike slots and toggle maintenance state.</p>
          </Link>

          <Link
            to="/admin/verify"
            className="p-5 bg-white rounded-2xl border border-slate-200/90 hover:border-emerald-500 hover:shadow-xs transition group block"
          >
            <span className="text-xs font-bold text-emerald-700 group-hover:underline">Terminal →</span>
            <p className="text-sm font-bold text-slate-900 mt-1">Entry QR Verification</p>
            <p className="text-xs text-slate-500 mt-1">Validate tickets and execute vehicle check-in.</p>
          </Link>
        </div>
      </div>
    </AdminLayout>
  );
}
