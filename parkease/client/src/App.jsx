import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Areas from './pages/Areas';
import AreaSlots from './pages/AreaSlots';
import MyBookings from './pages/MyBookings';
import Admin from './pages/Admin';

// Route guard: redirects if not logged in / not admin
function Guard({ admin, children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  if (admin && user.role !== 'admin') return <Navigate to="/" />;
  return children;
}

export default function App() {
  return (
    <>
      <Navbar />
      <div className="max-w-5xl mx-auto p-4">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<Areas />} />
          <Route path="/area/:id" element={<Guard><AreaSlots /></Guard>} />
          <Route path="/bookings" element={<Guard><MyBookings /></Guard>} />
          <Route path="/admin" element={<Guard admin><Admin /></Guard>} />
        </Routes>
      </div>
    </>
  );
}
