import { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import {
  LayoutDashboard,
  Building2,
  ParkingSquare,
  BookMarked,
  QrCode,
  FileBarChart,
  LogOut,
  ExternalLink,
  Menu,
  X,
  Car,
  ShieldCheck,
  ArrowLeft
} from 'lucide-react';
import ConnectionIndicator from './ConnectionIndicator';

export default function AdminLayout({ children, title, subtitle }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [mobileSidebar, setMobileSidebar] = useState(false);

  const navItems = [
    { to: '/admin', label: 'Dashboard Overview', icon: LayoutDashboard, end: true },
    { to: '/admin/parking', label: 'Parking Areas', icon: Building2 },
    { to: '/admin/slots', label: 'Slot Inventory', icon: ParkingSquare },
    { to: '/admin/bookings', label: 'Customer Bookings', icon: BookMarked },
    { to: '/admin/verify', label: 'Ticket Terminal & Entry', icon: QrCode },
    { to: '/admin/reports', label: 'Revenue & Reports', icon: FileBarChart },
  ];

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
      isActive
        ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-700/20'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile Top Bar */}
      <div className="md:hidden bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800 sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <button
            onClick={() => nav(-1)}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
            title="Go Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => setMobileSidebar(!mobileSidebar)}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
          >
            {mobileSidebar ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <span className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> ParkEase Admin
          </span>
        </div>
        <Link to="/" className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
          Exit <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      {/* Sidebar Desktop & Mobile overlay */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-30 h-screen w-64 bg-white border-r border-slate-200 flex flex-col justify-between p-4 transition-transform duration-200 ${
          mobileSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div>
          {/* Logo brand */}
          <div className="flex items-center justify-between pb-6 border-b border-slate-100 px-2">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold">
                <Car className="w-4 h-4" />
              </div>
              <div>
                <span className="font-black text-lg tracking-tight text-slate-900">
                  Park<span className="text-emerald-600">Admin</span>
                </span>
                <span className="block text-[10px] text-emerald-700 font-bold uppercase tracking-wider">
                  Management Console
                </span>
              </div>
            </Link>
            <button
              onClick={() => setMobileSidebar(false)}
              className="md:hidden text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="mt-5 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setMobileSidebar(false)}
                  className={linkClass}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* User profile & exit */}
        <div className="pt-4 border-t border-slate-100 space-y-2">
          <Link
            to="/"
            className="flex items-center justify-between px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-emerald-700 hover:bg-slate-50 rounded-xl transition"
          >
            <span className="flex items-center gap-2">
              <ExternalLink className="w-3.5 h-3.5" /> Back to Public Site
            </span>
          </Link>

          <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <p className="text-xs font-bold text-slate-900 truncate">{user?.name || 'Administrator'}</p>
              <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
            </div>
            <button
              onClick={() => {
                logout();
                nav('/login');
              }}
              title="Sign out"
              className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-white transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 flex flex-col min-h-screen">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-5 hidden md:flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <button
              onClick={() => nav(-1)}
              type="button"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition"
              title="Go Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{title}</h1>
              {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ConnectionIndicator />
            <Link
              to="/"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 px-3 py-1.5 rounded-xl hover:bg-slate-50 transition"
            >
              Open Website
            </Link>
          </div>
        </header>

        {/* Content Container */}
        <div className="p-4 sm:p-6 lg:p-8 flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}
