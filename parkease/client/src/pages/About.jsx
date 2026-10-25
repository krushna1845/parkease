import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, MapPin, Award, Users, Car, Sparkles, ArrowLeft } from 'lucide-react';

export default function About() {
  const nav = useNavigate();
  return (
    <div className="max-w-5xl mx-auto space-y-12 py-12 pb-24">
      <div>
        <button
          onClick={() => nav(-1)}
          type="button"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-xl hover:bg-slate-50 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Go Back
        </button>
      </div>

      {/* Hero */}
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <span className="text-xs font-bold text-emerald-700 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
          About ParkEase
        </span>
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
          Pioneering Smart City Parking
        </h1>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          Urban congestion and parking stress consume over 15 minutes of every city trip. ParkEase was engineered to connect drivers directly with verified parking spaces in real time.
        </p>
      </div>

      {/* Mission cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-3xl border border-slate-200/90 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
            <Car className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Zero Circling</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Know exactly where you will park before you leave home. Save fuel, time, and carbon emissions.
          </p>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-200/90 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Verified Facilities</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Every garage and lot on ParkEase is verified for security, clear signage, CCTV monitoring, and automated access.
          </p>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-200/90 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
            <Sparkles className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Contactless QR</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            No coin kiosks, lost slips, or gate queues. Access facilities using cryptographic single-use QR tickets on your device.
          </p>
        </div>
      </div>

      {/* Technology Highlights */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-8 sm:p-12 space-y-6">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          Platform Architecture & Technology
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          ParkEase is built on a modern MERN stack with strict multi-user concurrency controls. Our scheduling engine calculates half-open intervals to ensure adjacent bookings never overlap while maximizing facility utilization.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-center">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <span className="block text-2xl font-black text-emerald-600">100%</span>
            <span className="text-xs text-slate-500 font-semibold">Conflict-Free Slots</span>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <span className="block text-2xl font-black text-emerald-600">&lt; 1 sec</span>
            <span className="text-xs text-slate-500 font-semibold">QR Verification</span>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <span className="block text-2xl font-black text-emerald-600">10 min</span>
            <span className="text-xs text-slate-500 font-semibold">Checkout Lock</span>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <span className="block text-2xl font-black text-emerald-600">256-bit</span>
            <span className="text-xs text-slate-500 font-semibold">HMAC Signatures</span>
          </div>
        </div>
      </div>
    </div>
  );
}
