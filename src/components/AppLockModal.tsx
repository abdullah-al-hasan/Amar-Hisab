import React, { useState } from 'react';
import { 
  X, Lock, KeyRound, Check, ShieldCheck, AlertCircle, 
  CheckCircle2, RefreshCw, Eye, EyeOff, ShieldAlert
} from 'lucide-react';
import { toBanglaDigits } from '../utils/accounting';

interface AppLockModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLockEnabled: boolean;
  hasPin: boolean;
  isLoggedIn: boolean;
  onSavePin: (pin: string) => void;
  onDisableLock: () => void;
  onResetPin: () => void;
  onLockNow: () => void;
  onOpenAuth?: (mode: 'login' | 'register') => void;
}

export const AppLockModal: React.FC<AppLockModalProps> = ({
  isOpen,
  onClose,
  isLockEnabled,
  hasPin,
  isLoggedIn,
  onSavePin,
  onDisableLock,
  onResetPin,
  onLockNow,
  onOpenAuth,
}) => {
  const [isSettingPin, setIsSettingPin] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinConfirmInput, setPinConfirmInput] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const isLockActive = Boolean(isLoggedIn && isLockEnabled && hasPin);

  const requireLogin = (): boolean => {
    if (!isLoggedIn) {
      setStatusMessage({
        type: 'error',
        text: 'অ্যাপ লক ব্যবহার করতে প্রথমে অ্যাপে লগইন অথবা একাউন্ট করুন।',
      });
      return false;
    }
    return true;
  };

  const handleToggleLock = () => {
    if (!requireLogin()) return;

    if (isLockEnabled && hasPin) {
      onDisableLock();
      setStatusMessage({
        type: 'success',
        text: 'অ্যাপ লক সাময়িকভাবে বন্ধ করা হয়েছে।',
      });
      setTimeout(() => setStatusMessage(null), 3500);
    } else {
      setIsSettingPin(true);
      setPinInput('');
      setPinConfirmInput('');
      setPinError('');
    }
  };

  const handleSavePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requireLogin()) return;

    const cleanPin = pinInput.trim();
    const cleanConfirm = pinConfirmInput.trim();

    if (!/^\d{4}$/.test(cleanPin)) {
      setPinError('পিন কোডটি অবশ্যই ঠিক ৪টি সংখ্যার হতে হবে');
      return;
    }

    if (cleanPin !== cleanConfirm) {
      setPinError('পিন কোড দুটি মেলেনি। আবার টাইপ করুন।');
      return;
    }

    onSavePin(cleanPin);
    setIsSettingPin(false);
    setPinInput('');
    setPinConfirmInput('');
    setPinError('');
    setStatusMessage({
      type: 'success',
      text: '৪-সংখ্যার পিন সফলভাবে সংরক্ষিত এবং অ্যাপ লক সক্রিয় হয়েছে!',
    });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleResetPinClick = () => {
    if (!requireLogin()) return;
    if (window.confirm('আপনি কি নিশ্চিতভাবে পিন সুরক্ষা রিসেট করতে চান?')) {
      onResetPin();
      setIsSettingPin(false);
      setPinInput('');
      setPinConfirmInput('');
      setStatusMessage({
        type: 'success',
        text: 'পিন কোড সফলভাবে রিসেট করা হয়েছে।',
      });
      setTimeout(() => setStatusMessage(null), 3500);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-[#111726] w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200/80 dark:border-slate-800 animate-in slide-in-from-bottom duration-200 max-h-[92vh] flex flex-col transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-slate-700">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
                অ্যাপ লক
              </h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                ৪-সংখ্যার পিন সুরক্ষা দিয়ে আর্থিক তথ্য সুরক্ষিত রাখুন
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-0.5">

          {/* Guest Warning Banner if not logged in */}
          {!isLoggedIn && (
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-center justify-between gap-3 text-amber-900 dark:text-amber-200 animate-in fade-in">
              <div className="flex items-start gap-2.5 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="block font-bold">অ্যাপ লকে লগইন প্রয়োজন</span>
                  <span className="text-[11px] font-normal text-amber-700 dark:text-amber-300">
                    লগইন ছাড়া অ্যাপ লক কার্যকর করা যাবে না। পিন সুরক্ষার জন্য একাউন্ট করুন।
                  </span>
                </div>
              </div>
              {onOpenAuth && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAuth('login');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0 cursor-pointer shadow-xs transition-colors"
                >
                  লগইন করুন
                </button>
              )}
            </div>
          )}

          {/* Status Message Banner */}
          {statusMessage && (
            <div
              className={`p-3.5 rounded-2xl flex items-start gap-2.5 text-xs font-medium animate-in fade-in ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-900/60'
                  : 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-900/60'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 leading-relaxed">{statusMessage.text}</div>
              <button
                type="button"
                onClick={() => setStatusMessage(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* 1. Main Toggle Card */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                অ্যাপ ওপেন করতে ৪-সংখ্যার গোপন পিন কোড ব্যবহার করুন। পিন ছাড়া কেউ আপনার আর্থিক তথ্য দেখতে পারবে না।
              </p>

              {/* Toggle Switch */}
              <button
                type="button"
                onClick={handleToggleLock}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isLockActive ? 'bg-slate-900 dark:bg-slate-100' : 'bg-slate-200 dark:bg-slate-700'
                }`}
                role="switch"
                aria-checked={isLockActive}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full shadow-md ring-0 transition duration-200 ease-in-out ${
                    isLockActive ? 'translate-x-5 bg-white dark:bg-slate-900' : 'translate-x-0 bg-white'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* 2. PIN Setup / Change Form */}
          {isSettingPin && (
            <form onSubmit={handleSavePinSubmit} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-700/80 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200/60 dark:border-slate-700/60">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                  <span>{hasPin ? 'নতুন পিন কোড নির্ধারণ করুন' : '৪-সংখ্যার পিন কোড দিন'}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsSettingPin(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                    ৪-সংখ্যার পিন *
                  </label>
                  <div className="relative">
                    <input
                      type={showPin ? 'text' : 'password'}
                      pattern="\d{4}"
                      maxLength={4}
                      inputMode="numeric"
                      required
                      value={pinInput}
                      onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="****"
                      className="w-full px-3 py-2 pr-9 text-center text-sm font-black tracking-widest rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:border-slate-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1"
                    >
                      {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                    পিন পুনরায় লিখুন *
                  </label>
                  <input
                    type={showPin ? 'text' : 'password'}
                    pattern="\d{4}"
                    maxLength={4}
                    inputMode="numeric"
                    required
                    value={pinConfirmInput}
                    onChange={(e) => setPinConfirmInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="****"
                    className="w-full px-3 py-2 text-center text-sm font-black tracking-widest rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:border-slate-500"
                  />
                </div>
              </div>

              {pinError && (
                <div className="text-[11px] text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1.5 pt-0.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{pinError}</span>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsSettingPin(false)}
                  className="flex-1 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>পিন সেট করুন</span>
                </button>
              </div>
            </form>
          )}

          {/* 3. Quick Action Buttons when Active */}
          {isLockActive && !isSettingPin && (
            <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-800 space-y-3">
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                <span>পিন সুরক্ষার নিয়ন্ত্রণসমূহ</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {/* Lock Now Button */}
                <button
                  type="button"
                  onClick={() => {
                    onLockNow();
                    onClose();
                  }}
                  className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-[0.98] transition-all"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>এখনই লক করুন</span>
                </button>

                {/* Change PIN Button */}
                <button
                  type="button"
                  onClick={() => {
                    setIsSettingPin(true);
                    setPinInput('');
                    setPinConfirmInput('');
                    setPinError('');
                  }}
                  className="py-2.5 px-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs active:scale-[0.98] transition-all"
                >
                  <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                  <span>পিন পরিবর্তন</span>
                </button>

                {/* Reset PIN Button */}
                <button
                  type="button"
                  onClick={handleResetPinClick}
                  className="py-2.5 px-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs active:scale-[0.98] transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>রিসেট করুন</span>
                </button>
              </div>
            </div>
          )}

          {/* 4. Security Highlights & FAQ (Like BackupSystemModal) */}
          <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-800/80 space-y-2.5">
            <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold text-xs">
              <ShieldAlert className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              <span>নিরাপত্তা সংক্রান্ত তথ্যাবলি</span>
            </div>
            <ul className="text-[11px] text-slate-600 dark:text-slate-400 space-y-2 list-disc pl-4 leading-relaxed">
              <li>
                <strong>ব্যক্তিগত গোপনীয়তা:</strong> কেউ আপনার ফোন হাতে নিলেও গোপন ৪-সংখ্যার পিন কোড ছাড়া কোনো হিসাব, ওয়ালেট ব্যালেন্স বা লেনদেন দেখা যাবে না।
              </li>
              <li>
                <strong>স্মার্ট লক সিস্টেম:</strong> অ্যাপ মিনিমাইজ করে পুনরায় ওপেন করলে স্বয়ংক্রিয়ভাবে পিন ভেরিফিকেশন স্ক্রিন প্রদর্শিত হবে।
              </li>
              <li>
                <strong>অফলাইন সুরক্ষা:</strong> ইন্টারনেট সংযোগ না থাকলেও ডিভাইসের নিজস্ব মেমোরিতে এনক্রিপ্ট আকারে পিন সুরক্ষা কাজ করবে।
              </li>
            </ul>
          </div>

        </div>
      </div>
    </div>
  );
};
