import { useState, useEffect, useMemo } from 'react';
import { adminService } from '../../services/adminService';
import { useToast } from '../../context/ToastContext';
import AdminLayout from '../../components/AdminLayout';
import StatusBadge from '../../components/StatusBadge';
import {
  BookMarked,
  Search,
  Filter,
  Calendar,
  Clock,
  Car,
  User,
  Eye,
  X
} from 'lucide-react';

export default function AdminBookings() {
  const toast = useToast();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Detail modal
  const [detailModal, setDetailModal] = useState(null);

  const loadBookings = () => {
    setLoading(true);
    adminService
      .getBookings()
      .then((data) => setBookings(data))
      .catch(() => toast.error('Failed to load bookings'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        b.user?.name?.toLowerCase().includes(q) ||
        b.user?.email?.toLowerCase().includes(q) ||
        b.vehicleNumber?.toLowerCase().includes(q) ||
        b.area?.name?.toLowerCase().includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [bookings, statusFilter, search]);

  return (
    <AdminLayout title="Customer Bookings" subtitle="Complete registry of parking reservations, states, and payments">
      <div className="space-y-6">
        {/* Search & Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search user, email, vehicle, facility..."
              className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-bold text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Statuses ({bookings.length})</option>
              <option value="confirmed">Confirmed</option>
              <option value="pending_payment">Awaiting Payment</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Bookings Table */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-8 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filteredBookings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-3.5 px-4">Driver</th>
                    <th className="py-3.5 px-4">Facility & Slot</th>
                    <th className="py-3.5 px-4">Vehicle</th>
                    <th className="py-3.5 px-4">Reserved Interval</th>
                    <th className="py-3.5 px-4">Amount</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBookings.map((b) => (
                    <tr key={b._id} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 block">{b.user?.name || 'Driver'}</span>
                        <span className="text-[11px] text-slate-400">{b.user?.email}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-800 block">{b.area?.name}</span>
                        <span className="text-[11px] text-slate-500 font-semibold">Slot {b.slot?.slotNumber}</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">{b.vehicleNumber}</td>
                      <td className="py-3.5 px-4 text-slate-600">
                        <div>{new Date(b.startTime).toLocaleDateString([], { month: 'short', day: 'numeric' })}</div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                          {new Date(b.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-extrabold text-emerald-700 text-sm">₹{b.amount}</td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={b.status} />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setDetailModal(b)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 space-y-2">
              <BookMarked className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-slate-700 font-bold text-sm">No bookings matched criteria</p>
              <p className="text-xs text-slate-400">Try clearing search filters.</p>
            </div>
          )}
        </div>
      </div>

      {/* Booking Detail Modal */}
      {detailModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                  Reservation Record
                </span>
                <h3 className="font-extrabold text-slate-900 text-base">{detailModal._id}</h3>
              </div>
              <button onClick={() => setDetailModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Customer</span>
                  <span className="font-bold text-slate-800 text-sm block">{detailModal.user?.name}</span>
                  <span className="text-slate-500 text-[11px]">{detailModal.user?.email}</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Vehicle</span>
                  <span className="font-mono font-bold text-slate-900 text-sm block">{detailModal.vehicleNumber}</span>
                  <span className="text-slate-500 text-[11px]">Slot {detailModal.slot?.slotNumber}</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Facility:</span>
                  <span className="font-bold text-slate-800">{detailModal.area?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Arrival Time:</span>
                  <span className="font-semibold text-slate-700">{new Date(detailModal.startTime).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Departure Time:</span>
                  <span className="font-semibold text-slate-700">{new Date(detailModal.endTime).toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200/60 pt-1.5">
                  <span className="text-slate-400">Amount Charged:</span>
                  <span className="font-extrabold text-emerald-700 text-sm">₹{detailModal.amount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Status:</span>
                  <StatusBadge status={detailModal.status} />
                </div>
              </div>

              {detailModal.isCheckedIn && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 font-medium">
                  Vehicle checked in at {detailModal.checkedInAt ? new Date(detailModal.checkedInAt).toLocaleString() : 'Active session'}
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setDetailModal(null)}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                Close Record
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
