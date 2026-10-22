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
  AlertTriangle,
  LocateFixed,
  Clock,
  Shield,
  Video,
  Zap,
  Check
} from 'lucide-react';

const AVAILABLE_AMENITIES = [
  { id: 'cctv', label: 'CCTV 24/7' },
  { id: 'covered', label: 'Covered Parking' },
  { id: 'security_guard', label: 'Security Guard' },
  { id: 'ev_charging', label: 'EV Charging' },
  { id: 'valet', label: 'Valet Service' },
  { id: 'disabled_access', label: 'Accessible / PwD' }
];

export default function AdminParking() {
  const toast = useToast();
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  // Modal states
  const emptyForm = {
    name: '',
    address: '',
    city: '',
    pricePerHour: 50,
    latitude: '',
    longitude: '',
    openingHours: '24/7',
    amenities: ['cctv', 'security_guard']
  };
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);

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
      pricePerHour: area.pricePerHour,
      latitude: area.latitude !== null && area.latitude !== undefined ? area.latitude : '',
      longitude: area.longitude !== null && area.longitude !== undefined ? area.longitude : '',
      openingHours: area.openingHours || '24/7',
      amenities: Array.isArray(area.amenities) ? area.amenities : []
    });
    setModalOpen(true);
  };

  const handleFetchCurrentLocation = () => {
    if (!navigator.geolocation) {
      return toast.error('Geolocation is not supported by your browser');
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setForm((prev) => ({
          ...prev,
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6))
        }));
        toast.success('Coordinates retrieved from current location');
      },
      (err) => {
        setLocating(false);
        toast.error(`Could not get location: ${err.message}`);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const toggleAmenity = (id) => {
    setForm((prev) => {
      const exists = prev.amenities.includes(id);
      return {
        ...prev,
        amenities: exists ? prev.amenities.filter((a) => a !== id) : [...prev.amenities, id]
      };
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.city.trim()) {
      return toast.error('Facility name and city are required');
    }

    // Validate coordinates if entered
    if (form.latitude !== '' || form.longitude !== '') {
      const lat = Number(form.latitude);
      const lng = Number(form.longitude);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        return toast.error('Latitude must be a valid number between -90 and 90');
      }
      if (isNaN(lng) || lng < -180 || lng > 180) {
        return toast.error('Longitude must be a valid number between -180 and 180');
      }
    }

    const payload = {
      ...form,
      latitude: form.latitude !== '' ? Number(form.latitude) : null,
      longitude: form.longitude !== '' ? Number(form.longitude) : null
    };

    setSaving(true);
    try {
      if (editingId) {
        await parkingService.update(editingId, payload);
        toast.success('Parking facility updated');
      } else {
        await parkingService.create(payload);
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
    <AdminLayout title="Parking Facilities" subtitle="Manage parking facilities, GPS coordinates, and hourly rates">
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
                    <th className="py-3.5 px-4">Map Coordinates</th>
                    <th className="py-3.5 px-4">Rate (₹/hr)</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAreas.map((area) => {
                    const hasCoordinates =
                      typeof area.latitude === 'number' && typeof area.longitude === 'number';

                    return (
                      <tr key={area._id} className="hover:bg-slate-50 transition">
                        <td className="py-3.5 px-4 font-bold text-slate-900">{area.name}</td>
                        <td className="py-3.5 px-4 text-slate-700 font-semibold">{area.city}</td>
                        <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">{area.address || '—'}</td>
                        <td className="py-3.5 px-4">
                          {hasCoordinates ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-mono bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md">
                              <MapPin className="w-3 h-3 text-emerald-600" />
                              {area.latitude.toFixed(4)}, {area.longitude.toFixed(4)}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-md">
                              No GPS
                            </span>
                          )}
                        </td>
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
                    );
                  })}
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
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95 my-8">
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
                <label className="block font-bold text-slate-700 uppercase mb-1">Facility Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Phoenix Mall Parking"
                  className="w-full text-sm p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="e.g. Mumbai, Pune"
                    className="w-full text-sm p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Price Per Hour (₹) *</label>
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
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Street Address</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="e.g. MG Road, Near Railway Station"
                  className="w-full text-sm p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Geographic Coordinates for Discovery Map */}
              <div className="p-3.5 bg-emerald-50/50 rounded-2xl border border-emerald-100/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Geographic Coordinates (Map Pin & Navigation)</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleFetchCurrentLocation}
                    disabled={locating}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-white border border-emerald-200 hover:bg-emerald-50 px-2 py-1 rounded-lg transition"
                  >
                    <LocateFixed className="w-3 h-3" />
                    {locating ? 'Locating...' : 'Use Current GPS'}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-600 text-[11px] mb-1">Latitude (-90 to 90)</label>
                    <input
                      type="number"
                      step="any"
                      min="-90"
                      max="90"
                      value={form.latitude}
                      onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                      placeholder="e.g. 18.9322"
                      className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 text-[11px] mb-1">Longitude (-180 to 180)</label>
                    <input
                      type="number"
                      step="any"
                      min="-180"
                      max="180"
                      value={form.longitude}
                      onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                      placeholder="e.g. 72.8317"
                      className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-500">
                  Allows customers to discover this parking facility on the interactive map and get turn-by-turn directions.
                </p>
              </div>

              {/* Operating Hours */}
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Operating Hours</label>
                <div className="relative">
                  <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={form.openingHours}
                    onChange={(e) => setForm({ ...form, openingHours: e.target.value })}
                    placeholder="e.g. 24/7 or 06:00 AM - 11:00 PM"
                    className="w-full text-xs pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Amenities */}
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1.5">Recorded Amenities</label>
                <div className="grid grid-cols-2 gap-2">
                  {AVAILABLE_AMENITIES.map((item) => {
                    const checked = form.amenities.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleAmenity(item.id)}
                        className={`flex items-center gap-2 p-2 rounded-xl border text-left transition ${
                          checked
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 font-medium'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center border ${
                            checked ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white'
                          }`}
                        >
                          {checked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span className="text-[11px]">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs transition"
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
