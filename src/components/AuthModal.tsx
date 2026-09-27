import React, { useState } from 'react';
import { X, Mail, Lock, User, Eye, EyeOff, Loader2, ArrowRight, CheckCircle2, AlertCircle, KeyRound } from 'lucide-react';
import { AppUser } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
  onGoogleAuth: (isRegistering?: boolean) => Promise<AppUser | null>;
  onEmailLogin: (email: string, pass: string) => Promise<AppUser | null>;
  onEmailRegister: (name: string, email: string, pass: string) => Promise<AppUser | null>;
  onForgotPassword?: (email: string, newPass: string) => Promise<void>;
  isLoadingAuth?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  onGoogleAuth,
  onEmailLogin,
  onEmailRegister,
  onForgotPassword,
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

  // Forgot password modal
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetNewPass, setResetNewPass] = useState('');
  const [confirmResetPass, setConfirmResetPass] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');

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

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess('');

    const targetEmail = (forgotEmail || email).trim();
    if (!targetEmail) {
      setResetError('অ্যাকাউন্টের ইমেইল ঠিকানা লিখুন');
      return;
    }
    if (resetNewPass.length < 6) {
      setResetError('নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে');
      return;
    }
    if (resetNewPass !== confirmResetPass) {
      setResetError('পাসওয়ার্ড দুটি মেলেনি');
      return;
    }

    if (onForgotPassword) {
      setIsResetting(true);
      try {
        await onForgotPassword(targetEmail, resetNewPass);
        setResetSuccess('পাসওয়ার্ড সফলভাবে রিসেট করা হয়েছে!');
        setTimeout(() => {
          setShowForgotModal(false);
          setResetSuccess('');
          setResetNewPass('');
          setConfirmResetPass('');
        }, 2200);
      } catch (err: any) {
        setResetError(err.message || 'পাসওয়ার্ড রিসেট করতে সমস্যা হয়েছে');
      } finally {
        setIsResetting(false);
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
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200/80 animate-in slide-in-from-bottom duration-200 max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              {mode === 'login' ? 'লগইন করুন' : 'একাউন্ট করুন'}
            </h3>
            <p className="text-[11px] text-slate-400">
              {mode === 'login' 
                ? 'আপনার সংরক্ষিত হিসাবে প্রবেশ করতে লগইন করুন' 
                : 'আপনার হিসাব আজীবনের জন্য সুরক্ষিত রাখতে নতুন অ্যাকাউন্ট খুলুন'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors"
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
              className="w-full py-2.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold flex items-center justify-center gap-2.5 cursor-pointer transition-all shadow-2xs active:scale-[0.99] disabled:opacity-50"
            >
              {isLoadingAuth ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
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
                  <span>
                    {mode === 'login' 
                      ? 'গুগল অ্যাকাউন্ট দিয়ে সরাসরি লগইন করুন' 
                      : 'গুগল অ্যাকাউন্ট দিয়ে সরাসরি একাউন্ট করুন'}
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-2">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-2.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">
              অথবা ইমেইল দিয়ে
            </span>
            <div className="border-t border-slate-200 w-full" />
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex flex-col gap-1.5 animate-in fade-in">
              <div className="flex items-start gap-2 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <span className="leading-snug">{error}</span>
              </div>
              {error.includes('একাউন্ট তৈরি করা হয়নি') && (
                <button
                  type="button"
                  onClick={() => switchMode('register')}
                  className="self-start mt-0.5 text-[11px] font-bold text-rose-800 underline hover:no-underline cursor-pointer"
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
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>আপনার নাম *</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="যেমন: আব্দুল্লাহ আল হাসান"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-xs font-semibold outline-none focus:border-slate-500 focus:bg-white"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>ইমেইল ঠিকানা *</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="yourname@gmail.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-xs font-semibold outline-none focus:border-slate-500 focus:bg-white"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>পাসওয়ার্ড *</span>
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(email);
                      setShowForgotModal(true);
                      setResetError('');
                      setResetSuccess('');
                    }}
                    className="text-[11px] text-slate-500 hover:text-emerald-600 font-semibold cursor-pointer"
                  >
                    পাসওয়ার্ড ভুলে গেছেন?
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="কমপক্ষে ৬ অক্ষর বা সংখ্যা"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-xs font-semibold outline-none focus:border-slate-500 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {mode === 'register' && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>পাসওয়ার্ড নিশ্চিত করুন *</span>
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="পুনরায় পাসওয়ার্ড লিখুন"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-xs font-semibold outline-none focus:border-slate-500 focus:bg-white"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || isLoadingAuth}
              className="w-full py-2.5 mt-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm cursor-pointer flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50 transition-all"
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
              <p className="text-xs text-slate-500">
                অ্যাকাউন্ট নেই?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('register')}
                  className="text-slate-900 font-bold hover:underline cursor-pointer"
                >
                  একাউন্ট করুন
                </button>
              </p>
            ) : (
              <p className="text-xs text-slate-500">
                ইতিমধ্যে অ্যাকাউন্ট আছে?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="text-slate-900 font-bold hover:underline cursor-pointer"
                >
                  লগইন করুন
                </button>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Forgot Password Dedicated Modal (Requirement 3: শুধু "পাসওয়ার্ড ভুলে গেছেন") */}
      {showForgotModal && (
        <div className="fixed inset-0 z-60 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <KeyRound className="w-4 h-4 text-emerald-600" />
                <span>পাসওয়ার্ড ভুলে গেছেন?</span>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              আপনার নিবন্ধিত ইমেইল ঠিকানা দিয়ে নতুন পাসওয়ার্ড সেট করুন।
            </p>

            <form onSubmit={handleForgotSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  অ্যাকাউন্টের ইমেইল
                </label>
                <input
                  type="email"
                  required
                  value={forgotEmail || email}
                  onChange={e => setForgotEmail(e.target.value)}
                  placeholder="yourname@gmail.com"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  নতুন পাসওয়ার্ড
                </label>
                <input
                  type="password"
                  required
                  value={resetNewPass}
                  onChange={e => setResetNewPass(e.target.value)}
                  placeholder="কমপক্ষে ৬ অক্ষর বা সংখ্যা"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  নতুন পাসওয়ার্ড নিশ্চিত করুন
                </label>
                <input
                  type="password"
                  required
                  value={confirmResetPass}
                  onChange={e => setConfirmResetPass(e.target.value)}
                  placeholder="পুনরায় নতুন পাসওয়ার্ড লিখুন"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold outline-none focus:border-emerald-500"
                />
              </div>

              {resetError && (
                <p className="text-[11px] font-semibold text-rose-500 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{resetError}</span>
                </p>
              )}

              {resetSuccess && (
                <p className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{resetSuccess}</span>
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  disabled={isResetting}
                  onClick={() => setShowForgotModal(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-100"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isResetting}
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5"
                >
                  {isResetting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>রিসেট হচ্ছে...</span>
                    </>
                  ) : (
                    <span>নতুন পাসওয়ার্ড সেট করুন</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
