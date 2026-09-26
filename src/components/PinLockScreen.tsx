import React, { useState, useEffect } from 'react';
import { Lock, Delete, AlertCircle, ShieldAlert, KeyRound } from 'lucide-react';
import { toBanglaDigits } from '../utils/accounting';

interface PinLockScreenProps {
  onUnlock: (pin: string) => boolean;
  onResetPin: () => void;
  appName?: string;
}

export const PinLockScreen: React.FC<PinLockScreenProps> = ({
  onUnlock,
  onResetPin,
  appName = 'আমার হিসাব',
}) => {
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

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
  }, [pin]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/95 dark:bg-[#070b13]/98 backdrop-blur-xl flex flex-col items-center justify-between p-6 select-none animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="w-full flex justify-center pt-8">
        <div className="flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-white/10 dark:bg-white/5 border border-white/15 text-white flex items-center justify-center font-bold text-2xl shadow-xl mb-3">
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
                    ? 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)] scale-110'
                    : 'bg-white/20 border border-white/30'
                }`}
              />
            );
          })}
        </div>

        {/* Error message */}
        {errorMsg ? (
          <div className="flex items-center gap-1.5 text-rose-400 text-xs font-semibold animate-in fade-in">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{errorMsg}</span>
          </div>
        ) : (
          <div className="h-4" />
        )}
      </div>

      {/* Numeric Keypad */}
      <div className="w-full max-w-xs space-y-3 pb-6">
        <div className="grid grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(digit => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              className="h-14 rounded-2xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-white font-bold text-xl flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-xs border border-white/5"
            >
              {toBanglaDigits(digit)}
            </button>
          ))}

          {/* Bottom row: Clear, 0, Backspace */}
          <button
            type="button"
            onClick={handleClear}
            className="h-14 rounded-2xl bg-white/5 hover:bg-white/10 active:bg-white/20 text-slate-400 font-semibold text-xs flex items-center justify-center transition-all cursor-pointer border border-white/5"
          >
            মুছুন
          </button>

          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="h-14 rounded-2xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-white font-bold text-xl flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-xs border border-white/5"
          >
            ০
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
            onClick={() => setShowForgotModal(true)}
            className="text-xs text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer py-1 px-3 rounded-lg"
          >
            পিন কোড ভুলে গেছেন?
          </button>
        </div>
      </div>

      {/* Forgot PIN Confirmation Dialog */}
      {showForgotModal && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-2.5 text-amber-400">
              <ShieldAlert className="w-5 h-5" />
              <h3 className="font-bold text-sm text-white">পিন কোড রিসেট করবেন?</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              আপনি যদি পিন কোড ভুলে গিয়ে থাকেন, তবে পিন কোডটি রিসেট করে অ্যাপে প্রবেশ করতে পারেন। এতে আপনার কোনো আয়-ব্যয় বা হিসাবের ডেটা মুছে যাবে না।
            </p>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold hover:bg-slate-800 cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={() => {
                  onResetPin();
                  setShowForgotModal(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                পিন রিসেট করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
