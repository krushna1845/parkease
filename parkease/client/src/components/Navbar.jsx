import { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import {
  Car,
  Menu,
  X,
  User,
  LogOut,
  ShieldAlert,
  Calendar,
  LayoutDashboard,
  Search,
  ChevronDown,
  ArrowLeft
} from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
    setUserDropdownOpen(false);
  }, [location.pathname]);

  const navItemClass = ({ isActive }) =>
    `text-sm font-medium transition-colors hover:text-emerald-600 ${
      isActive ? 'text-emerald-700 font-semibold' : 'text-slate-600'
    }`;

  const mobileItemClass = ({ isActive }) =>
    `block px-3 py-2 rounded-lg text-base font-medium transition-colors ${
      isActive ? 'bg-emerald-50 text-emerald-800 font-semibold' : 'text-slate-700 hover:bg-slate-100'
    }`;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200/80 transition-shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            {location.pathname !== '/' && (
              <button
                onClick={() => {
                  if (window.history.length > 1) {
                    nav(-1);
                  } else {
                    nav('/');
                  }
                }}
                type="button"
                className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80 transition flex items-center justify-center mr-0.5"
                title="Go Back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-700 to-teal-500 flex items-center justify-center text-white shadow-sm shadow-emerald-600/20 group-hover:scale-105 transition-transform">
                <Car className="w-5 h-5" />
              </div>
              <div>
                <span className="font-extrabold text-xl tracking-tight text-slate-900 group-hover:text-emerald-800 transition-colors">
                  Park<span className="text-emerald-600">Ease</span>
                </span>
                <span className="hidden sm:inline-block text-[10px] tracking-wider uppercase font-semibold text-slate-400 block -mt-1">
                  Smart Reservations
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <NavLink to="/" end className={navItemClass}>
              Home
            </NavLink>
            <NavLink to="/parking" className={navItemClass}>
              Find Parking
            </NavLink>
            <NavLink to="/how-it-works" className={navItemClass}>
              How It Works
            </NavLink>
            <NavLink to="/about" className={navItemClass}>
              About
            </NavLink>
            <NavLink to="/help" className={navItemClass}>
              Help
            </NavLink>
          </nav>

          {/* User actions */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-full border border-slate-200 hover:border-slate-300 bg-white shadow-xs transition"
                >
                  <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center">
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span className="text-sm font-semibold text-slate-700 max-w-[120px] truncate">
                    {user.name}
                  </span>
                  {user.role === 'admin' && (
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      Admin
                    </span>
                  )}
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>

                {/* Dropdown Menu */}
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 text-sm">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="font-semibold text-slate-900 truncate">{user.name}</p>
                      <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    </div>

                    <div className="py-1">
                      <Link
                        to="/dashboard"
                        className="flex items-center gap-2.5 px-4 py-2 text-slate-700 hover:bg-slate-50 hover:text-emerald-700 transition"
                      >
                        <LayoutDashboard className="w-4 h-4 text-slate-400" />
                        Dashboard
                      </Link>
                      <Link
                        to="/my-bookings"
                        className="flex items-center gap-2.5 px-4 py-2 text-slate-700 hover:bg-slate-50 hover:text-emerald-700 transition"
                      >
                        <Calendar className="w-4 h-4 text-slate-400" />
                        My Bookings
                      </Link>
                      <Link
                        to="/profile"
                        className="flex items-center gap-2.5 px-4 py-2 text-slate-700 hover:bg-slate-50 hover:text-emerald-700 transition"
                      >
                        <User className="w-4 h-4 text-slate-400" />
                        Profile
                      </Link>

                      {user.role === 'admin' && (
                        <Link
                          to="/admin"
                          className="flex items-center gap-2.5 px-4 py-2 text-emerald-800 bg-emerald-50/60 hover:bg-emerald-50 font-medium transition"
                        >
                          <ShieldAlert className="w-4 h-4 text-emerald-600" />
                          Admin Console
                        </Link>
                      )}
                    </div>

                    <div className="pt-1 border-t border-slate-100">
                      <button
                        onClick={() => {
                          logout();
                          nav('/login');
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-rose-600 hover:bg-rose-50 transition"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm font-semibold text-slate-700 hover:text-emerald-700 px-3.5 py-2 transition"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 px-4 py-2 rounded-xl shadow-xs shadow-emerald-700/20 transition-all hover:-translate-y-0.5"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition"
              aria-label="Toggle navigation menu"
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-3 animate-in slide-in-from-top-2">
          <nav className="space-y-1">
            <NavLink to="/" end className={mobileItemClass}>
              Home
            </NavLink>
            <NavLink to="/parking" className={mobileItemClass}>
              Find Parking
            </NavLink>
            <NavLink to="/how-it-works" className={mobileItemClass}>
              How It Works
            </NavLink>
            <NavLink to="/about" className={mobileItemClass}>
              About
            </NavLink>
            <NavLink to="/help" className={mobileItemClass}>
              Help & Support
            </NavLink>

            {user && (
              <>
                <div className="pt-2 pb-1 border-t border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider px-3">
                  Account
                </div>
                <NavLink to="/dashboard" className={mobileItemClass}>
                  Dashboard
                </NavLink>
                <NavLink to="/my-bookings" className={mobileItemClass}>
                  My Bookings
                </NavLink>
                <NavLink to="/profile" className={mobileItemClass}>
                  Profile
                </NavLink>
                {user.role === 'admin' && (
                  <NavLink to="/admin" className={mobileItemClass}>
                    Admin Console
                  </NavLink>
                )}
              </>
            )}
          </nav>

          <div className="pt-3 border-t border-slate-200">
            {user ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-800">{user.name}</p>
                  <p className="text-xs text-slate-500">{user.email}</p>
                </div>
                <button
                  onClick={() => {
                    logout();
                    nav('/login');
                  }}
                  className="text-xs font-semibold text-rose-600 border border-rose-200 px-3 py-1.5 rounded-lg hover:bg-rose-50"
                >
                  Log Out
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/login"
                  className="w-full text-center py-2 text-sm font-semibold border border-slate-200 text-slate-700 rounded-xl"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="w-full text-center py-2 text-sm font-semibold bg-emerald-600 text-white rounded-xl shadow-xs"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
