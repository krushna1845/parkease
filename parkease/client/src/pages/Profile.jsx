import { useState } from 'react';
import { useAuth } from '../AuthContext';
import { useToast } from '../context/ToastContext';
import { User, Mail, Phone, Shield, Key, LogOut } from 'lucide-react';

export default function Profile() {
  const { user, logout } = useAuth();
  const toast = useToast();

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-8 pb-20">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Driver Profile</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Manage your personal information, contact credentials, and session settings.
        </p>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-black text-2xl flex items-center justify-center shadow-md shadow-emerald-700/20">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{user?.name}</h2>
            <p className="text-xs text-slate-500">{user?.email}</p>
            <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
              Role: {user?.role}
            </span>
          </div>
        </div>

        {/* Credentials Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
            <span className="text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-600" /> Account Name
            </span>
            <p className="font-bold text-slate-800 text-sm">{user?.name}</p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
            <span className="text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-emerald-600" /> Email Address
            </span>
            <p className="font-bold text-slate-800 text-sm">{user?.email}</p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
            <span className="text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-emerald-600" /> Phone Contact
            </span>
            <p className="font-bold text-slate-800 text-sm">{user?.phone || 'Not configured'}</p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
            <span className="text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-600" /> Security Status
            </span>
            <p className="font-bold text-emerald-700 text-sm">JWT Authenticated (Active)</p>
          </div>
        </div>

        {/* Account Actions */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-400">Need to change your vehicle or password? Contact admin support.</span>
          <button
            type="button"
            onClick={() => {
              logout();
              window.location.href = '/login';
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
