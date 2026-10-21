import api from '../api';

export const parkingService = {
  // Search or list parking areas
  async getAll(query = '') {
    const res = await api.get(query ? `/areas?q=${encodeURIComponent(query)}` : '/areas');
    return res.data;
  },

  // Get single parking area details
  async getById(id) {
    const res = await api.get(`/areas/${id}`);
    return res.data;
  },

  // Admin: Create parking area
  async create(data) {
    const res = await api.post('/areas', data);
    return res.data;
  },

  // Admin: Update parking area
  async update(id, data) {
    const res = await api.put(`/areas/${id}`, data);
    return res.data;
  },

  // Admin: Delete parking area
  async remove(id) {
    const res = await api.delete(`/areas/${id}`);
    return res.data;
  }
};
