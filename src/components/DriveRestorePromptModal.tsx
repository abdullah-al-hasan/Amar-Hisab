import React, { useState } from 'react';
import { Cloud, Download, Database, Clock, Loader2, X, CheckCircle2, ShieldCheck } from 'lucide-react';
import { DriveBackupMeta } from '../services/googleDrive';
import { toBanglaDigits, BANGLA_MONTH_NAMES } from '../utils/accounting';

interface DriveRestorePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  driveMeta: DriveBackupMeta | null;
  userEmail?: string | null;
  onConfirmRestore: () => Promise<void>;
}

function formatBanglaDateTime(isoStr?: string): string {
  if (!isoStr) return '';
  try {
    const date = new Date(isoStr);
    const day = date.getDate();
    const month = BANGLA_MONTH_NAMES[date.getMonth()];
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'বিকাল' : 'সকাল';
    hours = hours % 12 || 12;
    return `${toBanglaDigits(day)} ${month}, ${toBanglaDigits(year)} (${ampm} ${toBanglaDigits(hours)}:${toBanglaDigits(minutes)})`;
  } catch {
    return isoStr;
  }
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '০ KB';
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${toBanglaDigits(Math.round(kb))} KB`;
  }
  return `${toBanglaDigits((kb / 1024).toFixed(1))} MB`;
}

export const DriveRestorePromptModal: React.FC<DriveRestorePromptModalProps> = ({
  isOpen,
  onClose,
  driveMeta,
  userEmail,
  onConfirmRestore,
}) => {
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !driveMeta?.exists) return null;

  const handleRestore = async () => {
    setIsRestoring(true);
    setError(null);
    try {
      await onConfirmRestore();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'গুগল ড্রাইভ থেকে রিস্টোর করতে সমস্যা হয়েছে।');
      setIsRestoring(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-[#111726] w-full max-w-md rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200/80 dark:border-slate-800 animate-in zoom-in-95 duration-200 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Header Icon & Title */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200/70 dark:border-emerald-800/70 shadow-xs">
              <Cloud className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                গুগল ড্রাইভ ব্যাকআপ পাওয়া গেছে!
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                ডিভাইস পরিবর্তন বা নতুন করে ইনস্টল করায় আপনার হিসাব ফিরিয়ে নিন
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isRestoring}
            className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message */}
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          আপনার অ্যাকাউন্ট <span className="font-semibold text-slate-900 dark:text-slate-100">{userEmail || driveMeta.userEmail || ''}</span>-এ পূর্বে সংরক্ষিত ব্যাকআপ ফাইল পাওয়া গেছে। আপনি কি পূর্বের সমস্ত লেনদেন ও হিসাব এই ডিভাইসে রিস্টোর করতে চান?
        </p>

        {/* Backup Meta Info Card */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 space-y-2.5">
          {driveMeta.transactionCount !== undefined && driveMeta.transactionCount > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>সংরক্ষিত মোট লেনদেন:</span>
              </span>
              <span className="font-bold text-emerald-700 dark:text-emerald-400">
                {toBanglaDigits(driveMeta.transactionCount)} টি
              </span>
            </div>
          )}

          <div className={`flex items-center justify-between text-xs ${driveMeta.transactionCount ? 'pt-2 border-t border-slate-200/60 dark:border-slate-800' : ''}`}>
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
              <Database className="w-3.5 h-3.5 text-blue-500" />
              <span>ব্যাকআপ তথ্যের আকার:</span>
            </span>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {formatBytes(driveMeta.size)}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5 text-purple-500" />
              <span>সর্বশেষ আপলোড:</span>
            </span>
            <span className="font-bold text-slate-800 dark:text-slate-200 text-right">
              {formatBanglaDateTime(driveMeta.modifiedTime)}
            </span>
          </div>
        </div>

        {/* Info Note */}
        <div className="flex items-start gap-2 p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900/40 text-[11px] text-emerald-800 dark:text-emerald-300">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <span>রিস্টোর করলে আপনার পূর্বের সমস্ত লেনদেন, ওয়ালেট ও ক্যাটাগরি স্বয়ংক্রিয়ভাবে ফিরে আসবে।</span>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={isRestoring}
            className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors disabled:opacity-50"
          >
            পরে করব / এড়িয়ে যান
          </button>

          <button
            type="button"
            onClick={handleRestore}
            disabled={isRestoring}
            className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md cursor-pointer transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isRestoring ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>রিস্টোর হচ্ছে...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>রিস্টোর করুন</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
