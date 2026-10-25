import api from '../api';

export const paymentService = {
  // Create payment order on server
  async createOrder(bookingId) {
    const res = await api.post(`/payments/${bookingId}/order`);
    return res.data;
  },

  // Verify Razorpay payment signature on server
  async verifyPayment(bookingId, verificationData) {
    const res = await api.post(`/payments/${bookingId}/verify`, verificationData);
    return res.data;
  },

  // Fallback / instant simulated payment
  async simulatedPay(bookingId, method = 'upi', extraData = {}) {
    const res = await api.post(`/payments/${bookingId}/pay`, { method, ...extraData });
    return res.data;
  },

  // Pay with UPI (QR scan or UPI ID)
  async payWithUpi(bookingId, { upiId, transactionId } = {}) {
    const res = await api.post(`/payments/${bookingId}/pay`, {
      method: 'upi',
      upiId,
      transactionId: transactionId || ('UPI' + Date.now() + Math.floor(1000 + Math.random() * 9000))
    });
    return res.data;
  },

  // Load official Razorpay checkout.js script dynamically
  loadRazorpayScript() {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        return resolve(true);
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }
};
