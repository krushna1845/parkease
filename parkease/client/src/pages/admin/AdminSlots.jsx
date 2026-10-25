import { useState, useEffect } from 'react';
import { parkingService } from '../../services/parkingService';
import { slotService } from '../../services/slotService';
import { useToast } from '../../context/ToastContext';
import { useSocket } from '../../context/SocketContext';
import AdminLayout from '../../components/AdminLayout';
import {
  ParkingSquare,
  Car,
  Bike,
  Plus,
  Trash2,
  Power,
  Search,
  Filter,
  X,
  AlertTriangle,
  Building2
} from 'lucide-react';

export default function AdminSlots() {
  const toast = useToast();
  const { subscribeToArea, unsubscribeFromArea, on } = useSocket();
  const [areas, setAreas] = useState([]);
  const [selectedAreaId, setSelectedAreaId] = useState('');
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [slotTypeFilter, setSlotTypeFilter] = useState('all');

  // Create slot modal
  const [createModal, setCreateModal] = useState(false);
  const [form, setForm] = useState({ slotNumber: '', type: 'car' });
  const [creating, setCreating] = useState(false);

  // Delete modal
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Load facilities first
  useEffect(() => {
    parkingService
      .getAll()
      .then((data) => {
        setAreas(data);
        if (data.length > 0) setSelectedAreaId(data[0]._id);
      })
      .catch(() => toast.error('Failed to load facilities'));
  }, []);

  // Load slots when selected area changes
  const loadSlots = () => {
    if (!selectedAreaId) return;
    setLoading(true);
    slotService
      .getByArea(selectedAreaId)
      .then((data) => setSlots(data))
      .catch(() => toast.error('Failed to load slots'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSlots();
    if (selectedAreaId) {
      subscribeToArea(selectedAreaId);
    }

    const unsubSlot = on('slot:updated', (payload) => {
      if (payload.areaId === selectedAreaId) {
        setSlots((prev) =>
          prev.map((s) => {
            if (s._id === payload.slotId) {
              return {
                ...s,
                isActive: payload.status !== 'out_of_service'
              };
            }
            return s;
          })
        );
      }
    });

    const unsubReconnect = on('reconnected', () => {
      if (selectedAreaId) {
        subscribeToArea(selectedAreaId);
        loadSlots();
      }
    });

    return () => {
      if (selectedAreaId) {
        unsubscribeFromArea(selectedAreaId);
      }
      unsubSlot();
      unsubReconnect();
    };
  }, [selectedAreaId, subscribeToArea, unsubscribeFromArea, on]);

  const handleToggleActive = async (slot) => {
    try {
      await slotService.update(slot._id, { isActive: !slot.isActive });
      toast.success(`Slot ${slot.slotNumber} is now ${!slot.isActive ? 'active' : 'under maintenance'}`);
      loadSlots();
    } catch (err) {
      toast.error('Failed to update slot status');
    }
  };

  const handleCreateSlot = async (e) => {
    e.preventDefault();
    if (!form.slotNumber.trim()) return toast.error('Slot number is required');

    setCreating(true);
    try {
      await slotService.create({
        area: selectedAreaId,
        slotNumber: form.slotNumber.trim().toUpperCase(),
        type: form.type
      });
      toast.success(`Slot ${form.slotNumber} created`);
      setCreateModal(false);
      setForm({ slotNumber: '', type: 'car' });
      loadSlots();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create slot');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteSlot = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await slotService.remove(deleteId);
      toast.success('Slot removed from inventory');
      setDeleteId(null);
      loadSlots();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cannot delete slot with active bookings');
    } finally {
      setDeleting(false);
    }
  };

  const filteredSlots = slots.filter((s) => {
    if (slotTypeFilter === 'all') return true;
    return s.type === slotTypeFilter;
  });

  return (
    <AdminLayout title="Slot Inventory" subtitle="Manage individual car and bike parking bays per facility">
      <div className="space-y-6">
        {/* Facility Selector & Controls */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-slate-700">Facility:</span>
            </div>
            <select
              value={selectedAreaId}
              onChange={(e) => setSelectedAreaId(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 max-w-xs"
            >
              {areas.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.name} ({a.city})
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1.5 ml-2">
              <span className="text-xs font-semibold text-slate-500">Filter:</span>
              <select
                value={slotTypeFilter}
                onChange={(e) => setSlotTypeFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-700"
              >
                <option value="all">All Types</option>
                <option value="car">Car Bays Only</option>
                <option value="bike">Bike Bays Only</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            disabled={!selectedAreaId}
            onClick={() => setCreateModal(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition"
          >
            <Plus className="w-4 h-4" /> Add Slot to Facility
          </button>
        </div>

        {/* Slot Grid / Cards */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-slate-900 text-sm">
              Configured Slots ({filteredSlots.length})
            </h3>
            <div className="flex items-center gap-4 text-xs">
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Active
              </span>
              <span className="inline-flex items-center gap-1 font-semibold text-rose-500">
                <span className="w-2 h-2 rounded-full bg-rose-400" /> Maintenance
              </span>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="h-28 bg-slate-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : filteredSlots.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {filteredSlots.map((s) => (
                <div
                  key={s._id}
                  className={`p-3.5 rounded-2xl border flex flex-col justify-between space-y-3 transition ${
                    s.isActive
                      ? 'bg-white border-slate-200/90 hover:border-emerald-300'
                      : 'bg-rose-50/50 border-rose-200 opacity-80'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    {s.type === 'bike' ? (
                      <Bike className="w-4 h-4 text-slate-400" />
                    ) : (
                      <Car className="w-4 h-4 text-slate-400" />
                    )}
                    <span className="text-[10px] uppercase font-bold text-slate-400">{s.type}</span>
                  </div>

                  <div className="text-center">
                    <span className="text-xl font-black text-slate-900 block">{s.slotNumber}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-1 ${
                        s.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {s.isActive ? 'Active' : 'Offline'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(s)}
                      className={`text-[11px] font-bold ${
                        s.isActive ? 'text-amber-600 hover:underline' : 'text-emerald-700 hover:underline'
                      }`}
                    >
                      {s.isActive ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteId(s._id)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                      title="Delete Slot"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 space-y-2">
              <ParkingSquare className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-slate-700 font-bold text-sm">No slots created for this facility</p>
              <p className="text-xs text-slate-400">Click "Add Slot to Facility" to populate this parking area.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Slot Modal */}
      {createModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base">Add New Parking Slot</h3>
              <button onClick={() => setCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSlot} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Slot Identifier</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. A-101, B2"
                  value={form.slotNumber}
                  onChange={(e) => setForm({ ...form, slotNumber: e.target.value })}
                  className="w-full text-sm font-bold uppercase p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Vehicle Bay Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full text-sm font-bold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="car">Car (Standard)</option>
                  <option value="bike">Bike / Two-Wheeler</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs"
                >
                  {creating ? 'Adding...' : 'Add Slot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Slot Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>

            <div className="space-y-1">
              <h3 className="font-bold text-slate-900 text-base">Delete Parking Slot?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                This will permanently delete this slot from the facility inventory. The server will reject deletion if active confirmed bookings exist for this slot.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteSlot}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs"
              >
                {deleting ? 'Deleting...' : 'Delete Slot'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
