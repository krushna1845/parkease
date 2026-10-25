import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import Navbar from './components/Navbar';

// Public Pages
import Home from './pages/Home';
import FindParking from './pages/FindParking';
import ParkingDetails from './pages/ParkingDetails';
import HowItWorks from './pages/HowItWorks';
import About from './pages/About';
import Help from './pages/Help';
import Login from './pages/Login';
import Register from './pages/Register';
import NotFound from './pages/NotFound';

// User Protected Pages
import Dashboard from './pages/Dashboard';
import MyBookings from './pages/MyBookings';
import Payment from './pages/Payment';
import BookingConfirmation from './pages/BookingConfirmation';
import Profile from './pages/Profile';

// Admin Protected Pages
import AdminOverview from './pages/admin/AdminOverview';
import AdminParking from './pages/admin/AdminParking';
import AdminSlots from './pages/admin/AdminSlots';
import AdminBookings from './pages/admin/AdminBookings';
import AdminVerify from './pages/admin/AdminVerify';
import AdminReports from './pages/admin/AdminReports';

// Smooth scroll restoration on route changes
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}

// Protected Route Guard
function Guard({ admin, children }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-500">Authenticating session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (admin && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default function App() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <>
      <ScrollToTop />
      {!isAdminRoute && <Navbar />}
      <Routes>
        {/* Public Discovery & Informational Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/parking" element={<FindParking />} />
        <Route path="/parking/:id" element={<ParkingDetails />} />
        <Route path="/area/:id" element={<Navigate to="/parking" replace />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/about" element={<About />} />
        <Route path="/help" element={<Help />} />

        {/* Auth Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* User Driver Routes */}
        <Route path="/dashboard" element={<Guard><Dashboard /></Guard>} />
        <Route path="/my-bookings" element={<Guard><MyBookings /></Guard>} />
        <Route path="/bookings" element={<Navigate to="/my-bookings" replace />} />
        <Route path="/payment/:id" element={<Guard><Payment /></Guard>} />
        <Route path="/checkout/:id" element={<Guard><Payment /></Guard>} />
        <Route path="/booking-confirmation/:id" element={<Guard><BookingConfirmation /></Guard>} />
        <Route path="/profile" element={<Guard><Profile /></Guard>} />

        {/* Admin Management Routes */}
        <Route path="/admin" element={<Guard admin><AdminOverview /></Guard>} />
        <Route path="/admin/parking" element={<Guard admin><AdminParking /></Guard>} />
        <Route path="/admin/slots" element={<Guard admin><AdminSlots /></Guard>} />
        <Route path="/admin/bookings" element={<Guard admin><AdminBookings /></Guard>} />
        <Route path="/admin/verify" element={<Guard admin><AdminVerify /></Guard>} />
        <Route path="/verify" element={<Navigate to="/admin/verify" replace />} />
        <Route path="/admin/reports" element={<Guard admin><AdminReports /></Guard>} />

        {/* 404 Catch-All */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
