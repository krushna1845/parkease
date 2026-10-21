import { CheckCircle2, Clock, XCircle, CheckCheck } from 'lucide-react';

export default function StatusBadge({ status, size = 'sm' }) {
  const s = String(status || '').toLowerCase();

  const configs = {
    confirmed: {
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      label: 'Confirmed',
      icon: CheckCircle2,
    },
    pending_payment: {
      bg: 'bg-amber-50 text-amber-700 border-amber-200',
      label: 'Awaiting Payment',
      icon: Clock,
    },
    completed: {
      bg: 'bg-slate-100 text-slate-700 border-slate-200',
      label: 'Completed',
      icon: CheckCheck,
    },
    cancelled: {
      bg: 'bg-rose-50 text-rose-700 border-rose-200',
      label: 'Cancelled',
      icon: XCircle,
    },
  };

  const current = configs[s] || {
    bg: 'bg-slate-100 text-slate-600 border-slate-200',
    label: s ? s.replace('_', ' ') : 'Unknown',
    icon: Clock,
  };

  const Icon = current.icon;
  const padding = size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold rounded-full border ${current.bg} ${padding}`}>
      <Icon className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
      <span className="capitalize">{current.label}</span>
    </span>
  );
}
