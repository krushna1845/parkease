import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  return (
    <nav className="bg-blue-700 text-white px-6 py-3 flex gap-4 items-center">
      <Link to="/" className="font-bold text-lg mr-auto">ParkEase</Link>
      <Link to="/">Parking Areas</Link>
      {user && user.role === 'user' && <Link to="/bookings">My Bookings</Link>}
      {user && user.role === 'admin' && <Link to="/admin">Admin Panel</Link>}
      {user ? (
        <>
          <span className="text-sm opacity-80">{user.name}</span>
          <button onClick={() => { logout(); nav('/login'); }} className="bg-white text-blue-700 px-3 py-1 rounded">Logout</button>
        </>
      ) : (
        <><Link to="/login">Login</Link><Link to="/register">Register</Link></>
      )}
    </nav>
  );
}
