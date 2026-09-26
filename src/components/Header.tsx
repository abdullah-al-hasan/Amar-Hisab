import React from 'react';
import { Settings, Calendar, Eye, EyeOff, Lock } from 'lucide-react';
import { getLocalToday } from '../utils/storage';
import { formatBanglaDate } from '../utils/accounting';
import { UserProfile } from '../types';

interface HeaderProps {
  onOpenSettings: () => void;
  user?: {
    displayName?: string | null;
    photoURL?: string | null;
    email?: string | null;
  } | null;
  profile?: UserProfile;
  privacyBlur?: boolean;
  onTogglePrivacyBlur?: () => void;
  isAppLockEnabled?: boolean;
  onLockNow?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSettings,
  user,
  profile,
  privacyBlur = false,
  onTogglePrivacyBlur,
  isAppLockEnabled = false,
  onLockNow,
}) => {
  const todayBn = formatBanglaDate(getLocalToday());

  return (
    <header className="bg-white/90 dark:bg-[#090d16]/90 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/80 sticky top-0 z-30 transition-colors">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center font-bold text-lg shadow-sm transition-colors">
            ৳
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-tight tracking-tight">
              আমার হিসাব
            </h1>
            <div className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500 font-medium">
              <Calendar className="w-3 h-3 text-slate-400 dark:text-slate-500" />
              <span>{todayBn}</span>
            </div>
          </div>
        </div>

        {/* Controls: Privacy Blur + App Lock + Profile / Settings */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Quick Privacy Blur Toggle */}
          {onTogglePrivacyBlur && (
            <button
              type="button"
              onClick={onTogglePrivacyBlur}
              className={`p-2 rounded-xl border transition-all cursor-pointer shadow-2xs ${
                privacyBlur
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                  : 'bg-slate-50/70 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title={privacyBlur ? 'প্রাইভেসি ব্লার চালু আছে (ক্লিক করে আনব্লার করুন)' : 'প্রাইভেসি ব্লার চালু করুন (ব্যালেন্স গোপন রাখুন)'}
              aria-label="প্রাইভেসি ব্লার টগল"
            >
              {privacyBlur ? (
                <EyeOff className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          )}

          {/* Quick App Lock Now Button (if lock enabled) */}
          {isAppLockEnabled && onLockNow && (
            <button
              type="button"
              onClick={onLockNow}
              className="p-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all cursor-pointer shadow-2xs"
              title="অ্যাপ এখনই লক করুন"
              aria-label="অ্যাপ লক করুন"
            >
              <Lock className="w-4 h-4" />
            </button>
          )}

          {/* Settings Control */}
          <button
            id="header-settings-btn"
            onClick={onOpenSettings}
            className="p-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 hover:bg-slate-100 dark:bg-slate-900/60 dark:hover:bg-slate-800/80 transition-all cursor-pointer shadow-2xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
            aria-label="সেটিংস"
            title="সেটিংস"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
