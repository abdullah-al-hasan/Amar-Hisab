import React, { useState } from 'react';
import { X, Mail, Lock, User, Eye, EyeOff, Loader2, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { AppUser } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
  onGoogleAuth: (isRegistering?: boolean) => Promise<AppUser | null>;
  onEmailLogin: (email: string, pass: string) => Promise<AppUser | null>;
  onEmailRegister: (name: string, email: string, pass: string) => Promise<AppUser | null>;
  isLoadingAuth?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  onGoogleAuth,
  onEmailLogin,
  onEmailRegister,
  isLoadingAuth = false,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync mode if initialMode changes when opened
  React.useEffect(() => {
    setMode(initialMode);
    setError(null);
  }, [initialMode, isOpen]);

  if (!isOpen) return null;

  const handleGoogleClick = async () => {
    setError(null);
    try {
      const isRegistering = mode === 'register';
      const u = await onGoogleAuth(isRegistering);
      if (u) {
        onClose();
      }
    } catch (err: any) {
      setError(err?.message || 'গুগল দিয়ে প্রবেশ করতে সমস্যা হয়েছে');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('ইমেইল ঠিকানা লিখুন');
      return;
    }

    if (!password) {
      setError('পাসওয়ার্ড লিখুন');
      return;
    }

    if (mode === 'register') {
      if (!name.trim()) {
        setError('আপনার পুরো নাম লিখুন');
        return;
      }
      if (password.length < 6) {
        setError('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে');
        return;
      }
      if (password !== confirmPassword) {
        setError('পাসওয়ার্ড দুটি মেলেনি');
        return;
      }

      setIsSubmitting(true);
      try {
        const u = await onEmailRegister(name.trim(), trimmedEmail, password);
        if (u) {
          onClose();
        }
      } catch (err: any) {
        setError(err?.message || 'অ্যাকাউন্ট তৈরি করতে সমস্যা হয়েছে');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Login Mode
      setIsSubmitting(true);
      try {
        const u = await onEmailLogin(trimmedEmail, password);
        if (u) {
          onClose();
        }
      } catch (err: any) {
        setError(err?.message || 'লগইন করতে সমস্যা হয়েছে');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const switchMode = (newMode: 'login' | 'register') => {
    setMode(newMode);
    setError(null);
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#111726] w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200/80 dark:border-slate-800 animate-in slide-in-from-bottom duration-200 max-h-[92vh] flex flex-col transition-colors">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              {mode === 'login' ? 'লগইন করুন' : 'একাউন্ট করুন'}
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              {mode === 'login' 
                ? 'আপনার সংরক্ষিত হিসাবে প্রবেশ করতে লগইন করুন' 
                : 'আপনার হিসাব আজীবনের জন্য সুরক্ষিত রাখতে নতুন অ্যাকাউন্ট খুলুন'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto py-3 space-y-4 pr-0.5">
          {/* Option 1: Google Auth Button */}
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={handleGoogleClick}
              disabled={isLoadingAuth || isSubmitting}
              className="w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white hover:bg-slate-50 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-bold flex items-center justify-center gap-2.5 cursor-pointer transition-all shadow-2xs active:scale-[0.99] disabled:opacity-50"
            >
              {isLoadingAuth ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-600 dark:text-slate-300" />
                  <span>সংযোগ হচ্ছে...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>{mode === 'login' ? 'গুগল দিয়ে লগইন করুন' : 'গুগল দিয়ে একাউন্ট করুন'}</span>
                </>
              )}
            </button>
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
            <span className="bg-white dark:bg-[#111726] px-3 text-[10.5px] text-slate-400 font-medium whitespace-nowrap">
              {mode === 'login' ? 'অথবা ইমেইল দিয়ে লগইন করুন' : 'অথবা ইমেইল দিয়ে একাউন্ট করুন'}
            </span>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex flex-col gap-1.5 text-rose-700 dark:text-rose-300 text-xs font-medium animate-in fade-in">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
              {mode === 'login' && error.includes('একাউন্ট') && (
                <button
                  type="button"
                  onClick={() => switchMode('register')}
                  className="self-start mt-1 text-[11px] font-bold text-rose-800 dark:text-rose-200 underline hover:no-underline cursor-pointer"
                >
                  এখনই একাউন্ট তৈরি করতে এখানে ক্লিক করুন →
                </button>
              )}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'register' && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>আপনার নাম *</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="যেমন: আব্দুল্লাহ আল হাসান"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/60 text-slate-900 dark:text-slate-100 text-xs font-semibold outline-none focus:border-slate-500 focus:bg-white dark:focus:bg-slate-900 transition-colors"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>ইমেইল ঠিকানা *</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="yourname@gmail.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/60 text-slate-900 dark:text-slate-100 text-xs font-semibold outline-none focus:border-slate-500 focus:bg-white dark:focus:bg-slate-900 transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>পাসওয়ার্ড *</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="কমপক্ষে ৬ অক্ষর বা সংখ্যা"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/60 text-slate-900 dark:text-slate-100 text-xs font-semibold outline-none focus:border-slate-500 focus:bg-white dark:focus:bg-slate-900 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {mode === 'register' && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>পাসওয়ার্ড নিশ্চিত করুন *</span>
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="পুনরায় পাসওয়ার্ড লিখুন"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/60 text-slate-900 dark:text-slate-100 text-xs font-semibold outline-none focus:border-slate-500 focus:bg-white dark:focus:bg-slate-900 transition-colors"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || isLoadingAuth}
              className="w-full py-2.5 mt-2 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold shadow-sm cursor-pointer flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50 transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{mode === 'login' ? 'লগইন হচ্ছে...' : 'একাউন্ট তৈরি হচ্ছে...'}</span>
                </>
              ) : (
                <>
                  <span>{mode === 'login' ? 'লগইন করুন' : 'একাউন্ট তৈরি করুন'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Mode Switcher Toggle Footer */}
          <div className="text-center pt-2">
            {mode === 'login' ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                অ্যাকাউন্ট নেই?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('register')}
                  className="text-slate-900 dark:text-slate-100 font-bold hover:underline cursor-pointer"
                >
                  একাউন্ট করুন
                </button>
              </p>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                ইতিমধ্যে অ্যাকাউন্ট আছে?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="text-slate-900 dark:text-slate-100 font-bold hover:underline cursor-pointer"
                >
                  লগইন করুন
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
