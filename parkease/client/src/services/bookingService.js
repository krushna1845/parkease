import api from '../api';

export const bookingService = {
  // Create a reservation in pending_payment state
  async create(data) {
    const res = await api.post('/bookings', data);
    return res.data;
  },

  // Get current user's bookings with optional pagination
  async getMyBookings(page = null, limit = 10) {
    const url = page ? `/bookings/my?page=${page}&limit=${limit}` : '/bookings/my';
    const res = await api.get(url);
    return res.data;
  },

  // Get single booking by ID with payment & slot details
  async getById(id) {
    const res = await api.get(`/bookings/${id}`);
    return res.data;
  },

  // Cancel booking
  async cancel(id) {
    const res = await api.put(`/bookings/${id}/cancel`);
    return res.data;
  },

  // Verify QR code or ticket by Booking ID (used in AdminVerify terminal)
  // POST /api/bookings/verify with { bookingId } in body
  async verifyTicket(bookingId) {
    const res = await api.post('/bookings/verify', { bookingId });
    return res;
  },

  // Verify QR payload (generic — supports { bookingId, ticketCode, qrData })
  async verify(payload) {
    const res = await api.post('/bookings/verify', payload);
    return res.data;
  },

  // Check in vehicle
  async checkIn(id) {
    const res = await api.post(`/bookings/${id}/checkin`);
    return res;
  },

  // Check out vehicle
  async checkOut(id) {
    const res = await api.post(`/bookings/${id}/checkout`);
    return res;
  }
};
