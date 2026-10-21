import api from '../api';

export const adminService = {
  // Get dashboard metrics (maps to /admin/stats backend endpoint)
  async getMetrics() {
    const res = await api.get('/admin/stats');
    return res;
  },

  // Alias kept for backward compat
  async getStats() {
    const res = await api.get('/admin/stats');
    return res.data;
  },

  // Get all bookings (optional query params forwarded)
  async getBookings(params = {}) {
    const query = new URLSearchParams();
    if (params.limit) query.set('limit', params.limit);
    if (params.page) query.set('page', params.page);
    if (params.status) query.set('status', params.status);
    const qs = query.toString();
    const res = await api.get(qs ? `/admin/bookings?${qs}` : '/admin/bookings');
    return res;
  },

  // Get all payment records
  async getPayments() {
    const res = await api.get('/admin/payments');
    return res;
  },

  // Get all registered users
  async getUsers() {
    const res = await api.get('/admin/users');
    return res.data;
  },

  // Delete non-admin user
  async deleteUser(userId) {
    const res = await api.delete(`/admin/users/${userId}`);
    return res.data;
  }
};
