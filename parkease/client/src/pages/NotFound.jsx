import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Compass, Home, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-sm border border-emerald-100">
            <Compass className="w-10 h-10 animate-pulse" />
          </div>
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-600">404 Error</span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-2 mb-3">
            Spot Not Found
          </h1>
          <p className="text-slate-600 text-sm leading-relaxed mb-8">
            The page you're searching for might have been relocated, unlisted, or expired from our parking index.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm transition-all"
            >
              <Home className="w-4 h-4" />
              <span>Back to Home</span>
            </Link>
            <Link
              to="/parking"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-white text-slate-700 font-semibold text-sm transition-all"
            >
              <Search className="w-4 h-4" />
              <span>Find Parking</span>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
