import api from '../api';

export const slotService = {
  // Get all slots for an area with dynamic availability flag
  async getByArea(areaId, start = null, end = null) {
    let url = `/slots/area/${areaId}`;
    if (start && end) {
      const s = start instanceof Date ? start.toISOString() : start;
      const e = end instanceof Date ? end.toISOString() : end;
      url += `?start=${encodeURIComponent(s)}&end=${encodeURIComponent(e)}`;
    }
    const res = await api.get(url);
    return res.data;
  },

  // Admin: Create slot
  async create(data) {
    const res = await api.post('/slots', data);
    return res.data;
  },

  // Admin: Toggle active state or update
  async update(id, data) {
    const res = await api.put(`/slots/${id}`, data);
    return res.data;
  },

  // Admin: Delete slot
  async remove(id) {
    const res = await api.delete(`/slots/${id}`);
    return res.data;
  }
};
