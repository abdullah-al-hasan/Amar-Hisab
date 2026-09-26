import React from 'react';
import { X, Sparkles, Cloud, ShieldCheck, Database, LogIn, UserPlus } from 'lucide-react';
import { toBanglaDigits } from '../utils/accounting';

interface TrialLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
  currentCount?: number;
  maxLimit?: number;
}

export const TrialLimitModal: React.FC<TrialLimitModalProps> = ({
  isOpen,
  onClose,
  onOpenAuth,
  currentCount = 10,
  maxLimit = 10,
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-[#111726] w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border border-slate-200/80 dark:border-slate-800 animate-in slide-in-from-bottom duration-200 flex flex-col text-center relative transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Hero Icon */}
        <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-3.5">
          <Sparkles className="w-7 h-7" />
        </div>

        {/* Title & Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold mx-auto mb-2">
          <span>অ্যাপে ট্রায়াল দিন: {toBanglaDigits(currentCount)}/{toBanglaDigits(maxLimit)} টি লেনদেন পূর্ণ</span>
        </div>

        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug">
          আপনার হিসাব লিপিবদ্ধ করে সুরক্ষিত রাখতে অ্যাপে লগইন করুন অথবা একাউন্ট করুন
        </h3>

        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed max-w-sm mx-auto">
          আপনি গেস্ট হিসেবে {toBanglaDigits(maxLimit)}টি লেনদেনের ট্রায়াল সফলভাবে সম্পন্ন করেছেন। আপনার হিসাব আজীবনের জন্য সুরক্ষিত রাখতে ও সীমাহীন লেনদেন লিখতে লগইন বা একাউন্ট করুন।
        </p>

        {/* Highlighted Benefits */}
        <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl p-3.5 my-4 border border-slate-200/70 dark:border-slate-800 text-left space-y-2.5">
          <div className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300">
            <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
              <Database className="w-3.5 h-3.5" />
            </div>
            <span>আজীবন আনলিমিটেড লেনদেন ও হিসাব নিকাশ</span>
          </div>

          <div className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300">
            <div className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0">
              <Cloud className="w-3.5 h-3.5" />
            </div>
            <span>গুগল ড্রাইভ ও ক্লাউড ব্যাকআপের সুবিধা</span>
          </div>

          <div className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300">
            <div className="w-6 h-6 rounded-lg bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <span>গুগল অথবা ইমেইল-পাসওয়ার্ড দিয়ে যেকোনো সময় অ্যাক্সেস</span>
          </div>
        </div>

        {/* Existing Data Assurance */}
        <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-4">
          ✓ আপনার ইতিমধ্যে লেখা {toBanglaDigits(currentCount)}টি হিসাব সম্পূর্ণ সুরক্ষিত থাকবে।
        </p>

        {/* Action Buttons: লগইন করুন & একাউন্ট করুন */}
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAuth('login');
              }}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-sm active:scale-[0.98]"
            >
              <LogIn className="w-4 h-4" />
              <span>লগইন করুন</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAuth('register');
              }}
              className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-sm active:scale-[0.98]"
            >
              <UserPlus className="w-4 h-4 text-white" />
              <span>একাউন্ট করুন</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 text-xs font-medium cursor-pointer transition-colors"
          >
            পরে করব (ফিচারগুলো ঘুরে দেখুন)
          </button>
        </div>
      </div>
    </div>
  );
};
