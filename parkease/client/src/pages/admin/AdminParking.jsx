import { useState, useEffect } from 'react';
import { parkingService } from '../../services/parkingService';
import { useToast } from '../../context/ToastContext';
import AdminLayout from '../../components/AdminLayout';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  Search,
  MapPin,
  X,
  AlertTriangle
} from 'lucide-react';

export default function AdminParking() {
  const toast = useToast();
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  // Modal states
  const emptyForm = { name: '', address: '', city: '', pricePerHour: 50 };
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Delete confirm
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadAreas = () => {
    setLoading(true);
    parkingService
      .getAll()
      .then((data) => setAreas(data))
      .catch(() => toast.error('Failed to load parking facilities'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAreas();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (area) => {
    setEditingId(area._id);
    setForm({
      name: area.name,
      address: area.address || '',
      city: area.city,
      pricePerHour: area.pricePerHour
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.city.trim()) {
      return toast.error('Facility name and city are required');
    }

    setSaving(true);
    try {
      if (editingId) {
        await parkingService.update(editingId, form);
        toast.success('Parking facility updated');
      } else {
        await parkingService.create(form);
        toast.success('New parking facility created');
      }
      setModalOpen(false);
      loadAreas();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save facility');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await parkingService.remove(deleteId);
      toast.success('Parking area and associated slots deleted');
      setDeleteId(null);
      loadAreas();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cannot delete area with active bookings');
    } finally {
      setDeleting(false);
    }
  };

  const filteredAreas = areas.filter(
    (a) =>
      a.name.toLowerCase().includes(query.toLowerCase()) ||
      a.city.toLowerCase().includes(query.toLowerCase()) ||
      a.address?.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <AdminLayout title="Parking Facilities" subtitle="Manage parking facilities, locations, and hourly rates">
      <div className="space-y-6">
        {/* Top Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search facilities by name or city..."
              className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            />
          </div>

          <button
            type="button"
            onClick={openCreate}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
          >
            <Plus className="w-4 h-4" /> Add New Facility
          </button>
        </div>

        {/* Facilities Table */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-8 space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filteredAreas.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-3.5 px-4">Facility Name</th>
                    <th className="py-3.5 px-4">City</th>
                    <th className="py-3.5 px-4">Address</th>
                    <th className="py-3.5 px-4">Rate (₹/hr)</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAreas.map((area) => (
                    <tr key={area._id} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-900">{area.name}</td>
                      <td className="py-3.5 px-4 text-slate-700 font-semibold">{area.city}</td>
                      <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">{area.address || '—'}</td>
                      <td className="py-3.5 px-4 font-black text-emerald-700 text-sm">₹{area.pricePerHour}</td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => openEdit(area)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteId(area._id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 space-y-2">
              <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-slate-700 font-bold text-sm">No facilities found</p>
              <p className="text-xs text-slate-400">Click "Add New Facility" to register a new parking location.</p>
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base">
                {editingId ? 'Edit Parking Facility' : 'Create New Parking Facility'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Facility Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Phoenix Mall Parking"
                  className="w-full text-sm p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">City</label>
                <input
                  type="text"
                  required
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="e.g. Pune, Mumbai, Bangalore"
                  className="w-full text-sm p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Address</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="e.g. Viman Nagar, Sector 4"
                  className="w-full text-sm p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Price Per Hour (₹)</label>
                <input
                  type="number"
                  min="10"
                  max="1000"
                  required
                  value={form.pricePerHour}
                  onChange={(e) => setForm({ ...form, pricePerHour: Number(e.target.value) })}
                  className="w-full text-sm p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs"
                >
                  {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Facility'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>

            <div className="space-y-1">
              <h3 className="font-bold text-slate-900 text-base">Delete Facility?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                This will delete the parking facility and all associated parking slots. Deletion is automatically rejected if upcoming active bookings exist.
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
                onClick={handleDelete}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs"
              >
                {deleting ? 'Deleting...' : 'Delete Area'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
