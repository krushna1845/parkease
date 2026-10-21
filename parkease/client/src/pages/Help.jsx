import { useState } from 'react';
import { Search, HelpCircle, Mail, Phone, ChevronDown, CheckCircle2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export default function Help() {
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [sent, setSent] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });

  const faqs = [
    {
      cat: 'Booking & Reservations',
      q: 'How far in advance can I book a spot?',
      a: 'You can reserve a parking space up to 7 days in advance. Select any future date and arrival interval to see guaranteed spot availability.'
    },
    {
      cat: 'Booking & Reservations',
      q: 'Can two drivers book the same parking slot?',
      a: 'No. Our server serializes booking requests and performs atomic conflict detection before saving reservations. When you select a slot, it is locked exclusively for 10 minutes for your payment.'
    },
    {
      cat: 'Payments & Refunds',
      q: 'When is my card charged?',
      a: 'Charges are executed immediately upon order confirmation. If you cancel your reservation before the scheduled arrival time, a simulated refund is automatically generated.'
    },
    {
      cat: 'Payments & Refunds',
      q: 'What happens if my 10-minute hold expires before I pay?',
      a: 'If payment is not completed within 10 minutes, the hold expires so other drivers can reserve the space. If you pay late and the spot is still available, your reservation is reinstated.'
    },
    {
      cat: 'At the Facility',
      q: 'My QR code is not scanning. What should I do?',
      a: 'Ensure your phone brightness is at maximum. Parking attendants can also verify your reservation by manually entering your 24-character Booking ID into their terminal.'
    },
    {
      cat: 'At the Facility',
      q: 'Can I leave earlier or arrive later than my booked hours?',
      a: 'You can check in up to 30 minutes before your scheduled start time and exit anytime before your departure time.'
    }
  ];

  const filteredFaqs = faqs.filter(
    (f) =>
      f.q.toLowerCase().includes(query.toLowerCase()) ||
      f.a.toLowerCase().includes(query.toLowerCase()) ||
      f.cat.toLowerCase().includes(query.toLowerCase())
  );

  const handleSubmitContact = (e) => {
    e.preventDefault();
    setSent(true);
    toast.success('Your support request has been logged. Our helpdesk will respond shortly.');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-16 py-12 pb-24">
      {/* Search Header */}
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <span className="text-xs font-bold text-emerald-700 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
          Support Center
        </span>
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
          How can we help you?
        </h1>
        <p className="text-sm text-slate-600">
          Search our knowledge base or browse common inquiries below.
        </p>

        <div className="pt-2 relative max-w-lg mx-auto">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-4" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search FAQs (e.g. cancellation, QR code, payment)..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl shadow-xs text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* FAQ listing */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Frequently Asked Questions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredFaqs.map((faq, idx) => (
            <div
              key={idx}
              className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2 hover:border-emerald-200 transition"
            >
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded">
                {faq.cat}
              </span>
              <h3 className="font-bold text-slate-900 text-sm">{faq.q}</h3>
              <p className="text-xs text-slate-600 leading-relaxed pt-1">{faq.a}</p>
            </div>
          ))}
          {!filteredFaqs.length && (
            <div className="col-span-2 text-center py-8 text-sm text-slate-500">
              No articles matched "{query}". Try a different search term or send us a message below.
            </div>
          )}
        </div>
      </div>

      {/* Contact Form */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-8 sm:p-12 shadow-xs grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="space-y-4">
          <span className="text-xs font-bold text-emerald-700 uppercase tracking-widest">
            Contact Support
          </span>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Still need assistance?
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Our operations team monitors parking terminal issues, booking sync errors, and billing inquiries around the clock.
          </p>

          <div className="space-y-3 pt-4 text-xs font-semibold text-slate-700">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-emerald-600" /> support@parkease.local
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-emerald-600" /> +91 (020) 8000-PARK (8:00 AM – 10:00 PM)
            </div>
          </div>
        </div>

        <div>
          {sent ? (
            <div className="p-8 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h3 className="text-base font-bold text-emerald-900">Message Delivered</h3>
              <p className="text-xs text-emerald-700">
                Ticket #PE-{Math.floor(100000 + Math.random() * 900000)} has been created for your request.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmitContact} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Your Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Doe"
                  className="w-full text-sm p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@example.com"
                  className="w-full text-sm p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Inquiry / Issue</label>
                <textarea
                  rows={4}
                  required
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Describe your issue with booking reference if applicable..."
                  className="w-full text-sm p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-xs transition"
              >
                Submit Support Request
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
