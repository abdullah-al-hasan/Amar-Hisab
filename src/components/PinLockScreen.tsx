import React, { useState, useEffect } from 'react';
import { Lock, Delete, AlertCircle, ShieldAlert, KeyRound, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toBanglaDigits } from '../utils/accounting';

interface PinLockScreenProps {
  onUnlock: (pin: string) => boolean;
  onResetPin: () => void;
  appName?: string;
  userEmail?: string | null;
  onVerifyPasswordAndReset?: (password: string) => Promise<boolean>;
}

export const PinLockScreen: React.FC<PinLockScreenProps> = ({
  onUnlock,
  onResetPin,
  appName = 'আমার হিসাব',
  userEmail,
  onVerifyPasswordAndReset,
}) => {
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  // Security password verification state for resetting PIN
  const [accountPassword, setAccountPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetError, setResetError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Handle number click
  const handleDigit = (digit: string) => {
    if (pin.length < 4) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setErrorMsg('');

      if (nextPin.length === 4) {
        // Attempt unlock
        setTimeout(() => {
          const success = onUnlock(nextPin);
          if (!success) {
            setIsShaking(true);
            setErrorMsg('ভুল পিন কোড! পুনরায় চেষ্টা করুন');
            setTimeout(() => {
              setIsShaking(false);
              setPin('');
            }, 500);
          }
        }, 150);
      }
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setErrorMsg('');
  };

  const handleClear = () => {
    setPin('');
    setErrorMsg('');
  };

  // Physical keyboard listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showForgotModal) return;
      if (['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(e.key)) {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      } else if (e.key === 'Escape') {
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, showForgotModal]);

  const handleResetWithPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');

    if (!accountPassword.trim()) {
      setResetError('আপনার অ্যাকাউন্টের পাসওয়ার্ড লিখুন');
      return;
    }

    if (onVerifyPasswordAndReset) {
      setIsVerifying(true);
      try {
        const isValid = await onVerifyPasswordAndReset(accountPassword.trim());
        if (isValid) {
          onResetPin();
          setShowForgotModal(false);
          setAccountPassword('');
        } else {
          setResetError('ভুল পাসওয়ার্ড! সঠিক পাসওয়ার্ড ছাড়া পিন রিসেট করা সম্ভব নয়।');
        }
      } catch (err: any) {
        setResetError(err.message || 'পাসওয়ার্ড যাচাই করতে সমস্যা হয়েছে');
      } finally {
        setIsVerifying(false);
      }
    } else {
      // Direct reset if no custom verifier provided
      onResetPin();
      setShowForgotModal(false);
      setAccountPassword('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/95 backdrop-blur-xl flex flex-col items-center justify-between p-6 select-none animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="w-full flex justify-center pt-8">
        <div className="flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/15 text-white flex items-center justify-center font-bold text-2xl shadow-xl mb-3">
            ৳
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">{appName}</h1>
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>অ্যাপটি পিন দ্বারা সুরক্ষিত</span>
          </p>
        </div>
      </div>

      {/* Middle: PIN Dots & Error */}
      <div className="flex flex-col items-center space-y-4 my-auto">
        <p className="text-sm font-medium text-slate-300">
          আপনার ৪-সংখ্যার পিন কোড প্রবেশ করুন
        </p>

        {/* 4 Dots indicator with shake animation on error */}
        <div className={`flex items-center gap-4 ${isShaking ? 'animate-pin-shake' : ''}`}>
          {[0, 1, 2, 3].map(idx => {
            const isFilled = pin.length > idx;
            return (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  isFilled
                    ? 'bg-emerald-400 scale-125 shadow-[0_0_12px_rgba(52,211,153,0.6)]'
                    : 'bg-white/20 border border-white/30'
                }`}
              />
            );
          })}
        </div>

        {/* Error message */}
        {errorMsg ? (
          <p className="text-xs font-semibold text-rose-400 flex items-center gap-1.5 animate-in fade-in">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{errorMsg}</span>
          </p>
        ) : (
          <div className="h-4" />
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3 w-64 pt-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
            <button
              key={num}
              type="button"
              onClick={() => handleDigit(num)}
              className="h-14 rounded-2xl bg-white/5 hover:bg-white/10 active:bg-white/20 text-white font-bold text-xl flex items-center justify-center transition-all active:scale-95 cursor-pointer border border-white/5 shadow-xs"
            >
              {toBanglaDigits(num)}
            </button>
          ))}

          <button
            type="button"
            onClick={handleClear}
            className="h-14 rounded-2xl bg-white/5 hover:bg-white/10 active:bg-white/20 text-slate-300 text-xs font-bold flex items-center justify-center transition-all active:scale-95 cursor-pointer border border-white/5"
          >
            মুছুন
          </button>

          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="h-14 rounded-2xl bg-white/5 hover:bg-white/10 active:bg-white/20 text-white font-bold text-xl flex items-center justify-center transition-all active:scale-95 cursor-pointer border border-white/5 shadow-xs"
          >
            {toBanglaDigits('0')}
          </button>

          <button
            type="button"
            onClick={handleDelete}
            className="h-14 rounded-2xl bg-white/5 hover:bg-white/10 active:bg-white/20 text-slate-300 flex items-center justify-center transition-all active:scale-95 cursor-pointer border border-white/5"
            title="একটি সংখ্যা মুছুন"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Forgot PIN / Reset Link */}
        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={() => {
              setShowForgotModal(true);
              setResetError('');
              setAccountPassword('');
            }}
            className="text-xs text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer py-1 px-3 rounded-lg"
          >
            পিন কোড ভুলে গেছেন?
          </button>
        </div>
      </div>

      {/* Secure Forgot PIN Modal: Requires Account Password */}
      {showForgotModal && (
        <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-2.5 text-amber-400">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <h3 className="font-bold text-sm text-white">পিন কোড রিসেট সুরক্ষা</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              অননুমোদিত অ্যাক্সেস রোধ করতে পিন রিসেট করতে হলে আপনার অ্যাকাউন্টের পাসওয়ার্ড প্রয়োজন।
            </p>

            {userEmail && (
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300 flex items-center justify-between">
                <span className="text-slate-400">অ্যাকাউন্ট:</span>
                <span className="font-medium text-white truncate max-w-[180px]">{userEmail}</span>
              </div>
            )}

            <form onSubmit={handleResetWithPasswordSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>অ্যাকাউন্টের পাসওয়ার্ড</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={accountPassword}
                    onChange={e => {
                      setAccountPassword(e.target.value);
                      setResetError('');
                    }}
                    placeholder="আপনার পাসওয়ার্ড লিখুন"
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-700 bg-slate-800 text-white text-xs font-semibold outline-none focus:border-emerald-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {resetError && (
                <p className="text-[11px] font-semibold text-rose-400 flex items-center gap-1.5 animate-in fade-in">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{resetError}</span>
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  disabled={isVerifying}
                  onClick={() => setShowForgotModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold hover:bg-slate-800 cursor-pointer disabled:opacity-50"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isVerifying}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>যাচাই হচ্ছে...</span>
                    </>
                  ) : (
                    <span>যাচাই ও রিসেট</span>
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
