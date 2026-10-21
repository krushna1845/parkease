import { Link } from 'react-router-dom';
import { Car, ShieldCheck, Clock, MapPin, Mail, Phone, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-800">
          {/* Brand info */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center text-slate-950 font-bold">
                <Car className="w-5 h-5 text-slate-950" />
              </div>
              <span className="font-extrabold text-2xl tracking-tight text-white">
                Park<span className="text-emerald-400">Ease</span>
              </span>
            </Link>
            <p className="text-slate-400 text-sm max-w-sm leading-relaxed">
              Find, reserve, and park seamlessly. ParkEase eliminates parking frustration with real-time slot availability, instant reservations, and secure QR-code tickets.
            </p>
            <div className="flex gap-4 pt-2 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Secure Payments
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-400" /> Real-time Sync
              </span>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-white font-semibold text-sm tracking-wider uppercase mb-4">Discovery</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/parking" className="hover:text-emerald-400 transition">
                  Find Parking
                </Link>
              </li>
              <li>
                <Link to="/how-it-works" className="hover:text-emerald-400 transition">
                  How It Works
                </Link>
              </li>
              <li>
                <Link to="/parking" className="hover:text-emerald-400 transition">
                  Popular Locations
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-emerald-400 transition">
                  Create Account
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-white font-semibold text-sm tracking-wider uppercase mb-4">Platform</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/about" className="hover:text-emerald-400 transition">
                  About ParkEase
                </Link>
              </li>
              <li>
                <Link to="/help" className="hover:text-emerald-400 transition">
                  Help & FAQs
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-emerald-400 transition">
                  User Dashboard
                </Link>
              </li>
              <li>
                <Link to="/admin" className="hover:text-emerald-400 transition">
                  Admin Terminal
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact / Service */}
          <div>
            <h4 className="text-white font-semibold text-sm tracking-wider uppercase mb-4">Support</h4>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Central Business District, Smart Hub</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>support@parkease.local</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>+91 (020) 8000-PARK</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} ParkEase Platform. All rights reserved.</p>
          <div className="flex gap-6">
            <span className="hover:text-slate-400 cursor-pointer">Privacy Policy</span>
            <span className="hover:text-slate-400 cursor-pointer">Terms of Service</span>
            <span className="hover:text-slate-400 cursor-pointer">Cancellation Policy</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
