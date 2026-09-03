'use client';

import React, { useState } from 'react';
import { ShieldCheck, Lock, Eye, EyeOff, AlertCircle, Check, X } from 'lucide-react';

interface SuperAdminAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticated: () => void;
}

export const SuperAdminAuthModal: React.FC<SuperAdminAuthModalProps> = ({
  isOpen,
  onClose,
  onAuthenticated
}) => {
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  // Master PIN: Configurable via NEXT_PUBLIC_ADMIN_PIN or default 'ums2026'
  const MASTER_PIN = process.env.NEXT_PUBLIC_ADMIN_PIN || 'ums2026';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    setTimeout(() => {
      if (pin.trim() === MASTER_PIN) {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('superadmin_auth', 'true');
        }
        onAuthenticated();
        onClose();
        setPin('');
      } else {
        setError('PIN Super Admin salah. Silakan periksa kembali.');
      }
      setLoading(false);
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 text-white">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon & Title */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mb-3 shadow-lg shadow-amber-500/10">
            <Lock className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-black text-slate-100">
            Login Super Admin
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">
            Masukkan Master PIN Panitia untuk mengakses pengaturan turnamen, tipe kompetisi, dan daftar tim.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Master PIN / Passcode
            </label>
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                value={pin}
                onChange={e => setPin(e.target.value)}
                placeholder="Masukkan PIN (Default: ums2026)"
                autoFocus
                required
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 outline-none transition-colors pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-300"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              Default PIN panitia: <strong className="text-slate-400">ums2026</strong>
            </p>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || !pin}
              className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/20 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{loading ? 'Memverifikasi...' : 'Buka Panel Super Admin'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
