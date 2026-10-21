import { Link } from 'react-router-dom';
import { Search, Calendar, CreditCard, QrCode, Shield, Clock, CheckCircle2, ArrowRight } from 'lucide-react';

export default function HowItWorks() {
  const steps = [
    {
      step: '01',
      title: 'Discover & Compare Facilities',
      desc: 'Browse verified parking locations across your city. Compare clear hourly pricing, distance to your destination, security amenities (CCTV, guards), and slot capacities in real time.',
      icon: Search
    },
    {
      step: '02',
      title: 'Pick Exact Spot & Time Interval',
      desc: 'Choose your arrival and departure times. Our interactive visual slot grid checks real-time half-open interval conflicts and allows you to pick an available car or bike space.',
      icon: Calendar
    },
    {
      step: '03',
      title: '10-Minute Hold & Secure Checkout',
      desc: 'Once selected, the backend applies an atomic mutex lock holding your slot for 10 minutes. Complete payment via UPI, Card, Net Banking, or Razorpay with server-side signature validation.',
      icon: CreditCard
    },
    {
      step: '04',
      title: 'Contactless Digital QR Check-In',
      desc: 'Access your secure QR ticket on your dashboard. Drive up to the garage entrance and present the code for instant attendant verification. Your vehicle is checked in seamlessly.',
      icon: QrCode
    }
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-16 py-12 pb-24">
      {/* Header */}
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <span className="text-xs font-bold text-emerald-700 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
          User Guide
        </span>
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
          How ParkEase Works
        </h1>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          Smart city parking without the stress. Everything from searching to digital check-in is automated, transparent, and protected.
        </p>
      </div>

      {/* Steps Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {steps.map((s, idx) => {
          const Icon = s.icon;
          return (
            <div
              key={idx}
              className="bg-white rounded-3xl border border-slate-200/90 p-8 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between"
            >
              <div className="absolute top-6 right-6 font-black text-4xl text-slate-100 select-none">
                {s.step}
              </div>

              <div className="space-y-4 relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">{s.title}</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{s.desc}</p>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-100 flex items-center gap-2 text-xs font-bold text-emerald-700">
                <CheckCircle2 className="w-4 h-4" /> Ready in real time
              </div>
            </div>
          );
        })}
      </div>

      {/* Guarantees Callout */}
      <div className="bg-slate-900 text-white rounded-3xl p-8 sm:p-12 space-y-6">
        <div className="max-w-2xl space-y-3">
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
            Our Commitment
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Guaranteed Parking or Full Refund
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
            Every booking is backed by our atomic concurrency engine. If you arrive and your reserved slot is obstructed, our automated system provides an alternate slot or immediate reimbursement.
          </p>
        </div>

        <div className="pt-4 flex flex-wrap gap-4">
          <Link
            to="/parking"
            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold text-sm px-6 py-3 rounded-xl transition"
          >
            Find a Spot Now <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
