import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Cloud, Download, Upload, AlertCircle, CheckCircle2, 
  ShieldCheck, HelpCircle, ChevronDown, ChevronUp, ChevronRight,
  Loader2, Database, Clock, Check, RefreshCw, Server
} from 'lucide-react';
import { useGoogleAuth } from '../hooks/useGoogleAuth';
import { AppData } from '../types';
import { toBanglaDigits, BANGLA_MONTH_NAMES } from '../utils/accounting';
import { getLocalToday } from '../utils/storage';
import { 
  AutoBackupConfig, 
  AutoBackupFrequency, 
  getAutoBackupConfig, 
  saveAutoBackupConfig 
} from '../utils/autoBackup';
import { saveAppDataToSupabase, loadAppDataFromSupabase } from '../services/supabaseData';

interface BackupSystemModalProps {
  isOpen: boolean;
  onClose: () => void;
  googleAuth: ReturnType<typeof useGoogleAuth>;
  appData: AppData;
  onRestoreData: (data: AppData) => void;
  onOpenAuth?: (mode: 'login' | 'register') => void;
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

export const BackupSystemModal: React.FC<BackupSystemModalProps> = ({
  isOpen,
  onClose,
  googleAuth,
  appData,
  onRestoreData,
  onOpenAuth,
}) => {
  const {
    driveAccount,
    isDriveConnected,
    connectDrive,
    disconnectDrive,
    driveMeta,
    isLoadingAuth,
    isCheckingDrive,
    isBackingUp,
    driveError,
    performDriveBackup,
    appUser,
  } = googleAuth;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);
  const [showGoogleDrive, setShowGoogleDrive] = useState(true);
  const [showFaq, setShowFaq] = useState(false);
  const [modalStatus, setModalStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Auto-backup configuration state (daily / weekly / monthly)
  const [autoBackupConfig, setAutoBackupConfig] = useState<AutoBackupConfig>(() => getAutoBackupConfig());

  if (!isOpen) return null;

  // REQUIREMENT 3: ব্যাকআপ সিস্টেম লগইন ছাড়া কাজ করবে না। তবে লগইন ছাড়া এর ফাংশন দেখা যাবে।
  const requireLogin = (actionName: string): boolean => {
    if (!appUser) {
      setModalStatus({
        type: 'error',
        text: `${actionName} ব্যবহারের পূর্বে অ্যাপে লগইন অথবা একাউন্ট করুন।`,
      });
      return false;
    }
    return true;
  };

  const handleFrequencyChange = (freq: AutoBackupFrequency) => {
    if (!requireLogin('স্বয়ংক্রিয় ব্যাকআপ শিডিউল')) return;
    const updated: AutoBackupConfig = { ...autoBackupConfig, frequency: freq, enabled: true };
    setAutoBackupConfig(updated);
    saveAutoBackupConfig(updated);
    const banglaFreq = freq === 'daily' ? 'প্রতিদিন' : freq === 'weekly' ? 'সাপ্তাহিক' : 'মাসিক';
    setModalStatus({
      type: 'success',
      text: `স্বয়ংক্রিয় ব্যাকআপ শিডিউল "${banglaFreq}" হিসেবে সেট করা হয়েছে।`,
    });
    setTimeout(() => setModalStatus(null), 3500);
  };

  const handleToggleAutoBackup = () => {
    if (!requireLogin('স্বয়ংক্রিয় ব্যাকআপ চালু/বন্ধ')) return;
    const nextEnabled = !autoBackupConfig.enabled;
    const updated: AutoBackupConfig = { ...autoBackupConfig, enabled: nextEnabled };
    setAutoBackupConfig(updated);
    saveAutoBackupConfig(updated);
    setModalStatus({
      type: 'success',
      text: nextEnabled ? 'স্বয়ংক্রিয় ব্যাকআপ চালু করা হয়েছে।' : 'স্বয়ংক্রিয় ব্যাকআপ সাময়িক বন্ধ করা হয়েছে।',
    });
    setTimeout(() => setModalStatus(null), 3500);
  };

  // 1. Google Drive Handlers
  const handleDriveBackupClick = () => {
    if (!requireLogin('গুগল ড্রাইভে ব্যাকআপ')) return;
    if (driveMeta?.exists) {
      setShowOverwriteConfirm(true);
    } else {
      executeDriveBackup();
    }
  };

  const executeDriveBackup = async () => {
    if (!requireLogin('গুগল ড্রাইভে ব্যাকআপ')) return;
    setShowOverwriteConfirm(false);
    setModalStatus(null);
    try {
      const meta = await performDriveBackup(appData);
      // update auto-backup timestamp
      const cfg = { ...autoBackupConfig, lastAutoBackup: meta.modifiedTime || new Date().toISOString() };
      setAutoBackupConfig(cfg);
      saveAutoBackupConfig(cfg);

      setModalStatus({
        type: 'success',
        text: `গুগল ড্রাইভে ব্যাকআপ সফলভাবে সংরক্ষিত হয়েছে! (${formatBytes(meta.size)})`,
      });
      setTimeout(() => setModalStatus(null), 6000);
    } catch (err: any) {
      setModalStatus({
        type: 'error',
        text: err.message || 'গুগল ড্রাইভে ব্যাকআপ নিতে সমস্যা হয়েছে।',
      });
    }
  };

  // 2. Offline Backup Handlers (Export & Import)
  const handleExportOfflineBackup = () => {
    if (!requireLogin('অফলাইন ব্যাকআপ ফাইল ডাউনলোড')) return;
    try {
      const exportObject = {
        app: 'Amar-Hisab',
        version: appData.version || 3,
        exportedAt: new Date().toISOString(),
        date: getLocalToday(),
        data: appData,
      };
      const jsonStr = JSON.stringify(exportObject, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `amar-hisab-backup-${getLocalToday()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setModalStatus({
        type: 'success',
        text: 'অফলাইন ব্যাকআপ ফাইল সফলভাবে ডাউনলোড হয়েছে!',
      });
      setTimeout(() => setModalStatus(null), 5000);
    } catch {
      setModalStatus({
        type: 'error',
        text: 'ব্যাকআপ ফাইল ডাউনলোডে সমস্যা হয়েছে।',
      });
    }
  };

  const handleOfflineFileRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!requireLogin('ব্যাকআপ ফাইল থেকে রিস্টোর')) {
      if (e.target) e.target.value = '';
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        const dataToRestore = parsed.data || parsed;
        if (!dataToRestore.transactions || !dataToRestore.accounts) {
          throw new Error('অবৈধ ব্যাকআপ ফাইল ফরম্যাট');
        }
        onRestoreData(dataToRestore);
        setModalStatus({
          type: 'success',
          text: `অফলাইন ব্যাকআপ ফাইল সফলভাবে রিস্টোর হয়েছে! (${toBanglaDigits(dataToRestore.transactions.length)}টি লেনদেন)`,
        });
        setTimeout(() => setModalStatus(null), 5000);
      } catch (err: any) {
        setModalStatus({
          type: 'error',
          text: err.message || 'ব্যাকআপ ফাইল পড়তে ব্যর্থ হয়েছে।',
        });
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
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
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
                ব্যাকআপ সিস্টেম
              </h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                আপনার সমস্ত হিসাব সুরক্ষিত রাখুন
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
          
          {/* Guest User Warning Banner */}
          {!appUser && (
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-center justify-between gap-3 text-amber-900 dark:text-amber-200 animate-in fade-in">
              <div className="flex items-start gap-2.5 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="block font-bold">ব্যাকআপ সিস্টেমে লগইন প্রয়োজন</span>
                  <span className="text-[11px] font-normal text-amber-700 dark:text-amber-300">
                    লগইন ছাড়া ব্যাকআপ বা রিস্টোর কার্যকর হবে না। আপনার হিসাব সুরক্ষিত রাখতে একাউন্ট করুন।
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

          {/* Status Alert Banner */}
          {modalStatus && (
            <div
              className={`p-3.5 rounded-2xl flex items-start gap-2.5 text-xs font-medium animate-in fade-in ${
                modalStatus.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-900/60'
                  : 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-900/60'
              }`}
            >
              {modalStatus.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 leading-relaxed">{modalStatus.text}</div>
              <button
                type="button"
                onClick={() => setModalStatus(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Drive Error Banner */}
          {driveError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 flex items-start gap-2 text-rose-800 dark:text-rose-200 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{driveError}</div>
            </div>
          )}

          {/* ১. গুগল ড্রাইভ ব্যাকআপ (FAQ-এর মতো ড্রপডাউন/অ্যাকর্ডিয়ন স্টাইল) */}
          <div className="border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowGoogleDrive(!showGoogleDrive)}
              className="w-full p-3.5 bg-slate-50/70 dark:bg-slate-900/40 flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer hover:bg-slate-100/70 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Cloud className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>গুগল ড্রাইভ ব্যাকআপ</span>
              </div>

              <div className="flex items-center gap-2">
                {driveAccount && (
                  <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                    কানেক্টেড
                  </span>
                )}
                {showGoogleDrive ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </div>
            </button>

            {showGoogleDrive && (
              <div className="p-3.5 sm:p-4 bg-white dark:bg-slate-900/20 space-y-3.5">
                {!driveAccount ? (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!requireLogin('গুগল ড্রাইভ সংযোগ')) return;
                        connectDrive();
                      }}
                      disabled={isLoadingAuth}
                      className="w-full p-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center gap-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 transition-all cursor-pointer shadow-xs active:scale-[0.98]"
                    >
                      {isLoadingAuth ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                          <span>গুগল অ্যাকাউন্ট সংযুক্ত হচ্ছে...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                          </svg>
                          <span>গুগল ড্রাইভ ব্যাকআপ সংযুক্ত করুন</span>
                        </>
                      )}
                    </button>
                    {appUser?.email && (
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center leading-relaxed">
                        লগইন করা ইমেইল ({appUser.email}) অথবা আপনার পছন্দের যেকোনো গুগল অ্যাকাউন্ট ব্যাকআপের জন্য বেছে নিতে পারেন।
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    {/* ৩.১ কোন গুগল একাউন্ট থেকে ব্যাকআপ নেওয়া হয়েছে */}
                    <div className="bg-slate-50/80 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/70 dark:border-slate-700/70">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium block">
                            গুগল ড্রাইভ ব্যাকআপ একাউন্ট
                          </span>
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate block">
                            {driveAccount.email}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={disconnectDrive}
                          className="text-[10px] text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 font-semibold px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer transition-colors"
                          title="ড্রাইভ একাউন্ট পরিবর্তন বা বিচ্ছিন্ন করুন"
                        >
                          পরিবর্তন
                        </button>
                      </div>

                      {driveMeta?.userEmail && driveMeta.userEmail !== driveAccount.email && (
                        <div className="text-[10px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1.5 rounded-lg border border-amber-200/70 dark:border-amber-900/40 leading-relaxed mt-2">
                          ড্রাইভে বিদ্যমান পূর্বের ব্যাকআপটি <strong>{driveMeta.userEmail}</strong> একাউন্ট থেকে নেওয়া হয়েছিল।
                        </div>
                      )}
                    </div>

                    {/* ৩.২ শেষ কবে গুগল একাউন্টে ব্যাকআপ দেয়া হয়েছে */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-start gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center shrink-0 mt-0.5">
                          <Clock className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 block mb-0.5 font-medium">
                            সর্বশেষ গুগল ব্যাকআপ
                          </span>
                          <span className="font-bold text-slate-800 dark:text-slate-200 leading-tight block text-xs">
                            {isCheckingDrive ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
                            ) : driveMeta?.exists && driveMeta?.modifiedTime ? (
                              formatBanglaDateTime(driveMeta.modifiedTime)
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500 font-normal">এখনও কোনো ব্যাকআপ দেওয়া হয়নি</span>
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-start gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center shrink-0 mt-0.5">
                          <Database className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 block mb-0.5 font-medium">
                            ব্যাকআপ সাইজ
                          </span>
                          <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
                            {isCheckingDrive ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
                            ) : driveMeta?.exists ? (
                              `${formatBytes(driveMeta.size)} (JSON)`
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500 font-normal">০ KB</span>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* ৩.৩ অটোমেটিক ব্যাকআপ কবে হবে (প্রতিদিন / সাপ্তাহিক / মাসিক) সিলেক্ট করার অপশন */}
                    <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center shrink-0">
                            <RefreshCw className="w-3 h-3" />
                          </div>
                          <div>
                            <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                              অটোমেটিক ব্যাকআপ
                            </h5>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">
                              {autoBackupConfig.enabled
                                ? autoBackupConfig.frequency === 'daily'
                                  ? 'প্রতিদিন আপনার হিসাব স্বয়ংক্রিয় ব্যাকআপ নিবে'
                                  : autoBackupConfig.frequency === 'weekly'
                                  ? 'সাপ্তাহিক আপনার হিসাব স্বয়ংক্রিয় ব্যাকআপ নিবে'
                                  : 'মাসিক আপনার হিসাব স্বয়ংক্রিয় ব্যাকআপ নিবে'
                                : 'স্বয়ংক্রিয় ব্যাকআপ বন্ধ রয়েছে'}
                            </p>
                          </div>
                        </div>

                        {/* On/Off Switch */}
                        <button
                          type="button"
                          onClick={handleToggleAutoBackup}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            autoBackupConfig.enabled ? 'bg-slate-900 dark:bg-slate-100' : 'bg-slate-300 dark:bg-slate-700'
                          }`}
                          title={autoBackupConfig.enabled ? 'স্বয়ংক্রিয় ব্যাকআপ চালু রয়েছে' : 'স্বয়ংক্রিয় ব্যাকআপ বন্ধ'}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full shadow-lg ring-0 transition duration-200 ease-in-out ${
                              autoBackupConfig.enabled ? 'translate-x-4 bg-white dark:bg-slate-900' : 'translate-x-0 bg-white'
                            }`}
                          />
                        </button>
                      </div>

                      {/* 3 Frequency Selection Options */}
                      <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-200/60 dark:bg-slate-900/60 rounded-xl">
                        <button
                          type="button"
                          disabled={!autoBackupConfig.enabled}
                          onClick={() => handleFrequencyChange('daily')}
                          className={`py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                            autoBackupConfig.frequency === 'daily' && autoBackupConfig.enabled
                              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed'
                          }`}
                        >
                          {autoBackupConfig.frequency === 'daily' && autoBackupConfig.enabled && (
                            <Check className="w-3 h-3 text-slate-900 dark:text-white shrink-0" />
                          )}
                          <span>প্রতিদিন</span>
                        </button>

                        <button
                          type="button"
                          disabled={!autoBackupConfig.enabled}
                          onClick={() => handleFrequencyChange('weekly')}
                          className={`py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                            autoBackupConfig.frequency === 'weekly' && autoBackupConfig.enabled
                              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed'
                          }`}
                        >
                          {autoBackupConfig.frequency === 'weekly' && autoBackupConfig.enabled && (
                            <Check className="w-3 h-3 text-slate-900 dark:text-white shrink-0" />
                          )}
                          <span>সাপ্তাহিক</span>
                        </button>

                        <button
                          type="button"
                          disabled={!autoBackupConfig.enabled}
                          onClick={() => handleFrequencyChange('monthly')}
                          className={`py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                            autoBackupConfig.frequency === 'monthly' && autoBackupConfig.enabled
                              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed'
                          }`}
                        >
                          {autoBackupConfig.frequency === 'monthly' && autoBackupConfig.enabled && (
                            <Check className="w-3 h-3 text-slate-900 dark:text-white shrink-0" />
                          )}
                          <span>মাসিক</span>
                        </button>
                      </div>
                    </div>

                    {/* Google Drive Action Button (ব্যাকআপ নিন) */}
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={handleDriveBackupClick}
                        disabled={isBackingUp}
                        className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-all active:scale-[0.98]"
                      >
                        {isBackingUp ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>ব্যাকআপ নেওয়া হচ্ছে...</span>
                          </>
                        ) : (
                          <>
                            <Cloud className="w-4 h-4" />
                            <span>ব্যাকআপ নিন</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Overwrite Confirmation Dialog */}
                    {showOverwriteConfirm && (
                      <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 space-y-3 animate-in fade-in">
                        <div className="flex items-start gap-2.5">
                          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <h4 className="text-xs font-bold text-amber-950 dark:text-amber-200">
                              পূর্ববর্তী ব্যাকআপ ফাইল প্রতিস্থাপন করবেন?
                            </h4>
                            <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-1 leading-relaxed">
                              আপনার গুগল ড্রাইভে ইতোমধ্যেই একটি ব্যাকআপ ফাইল রয়েছে। আপনি কি বর্তমান ডিভাইসের সর্বশেষ ডাটা দিয়ে ড্রাইভে থাকা পূর্ববর্তী ব্যাকআপটি প্রতিস্থাপন করতে চান?
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setShowOverwriteConfirm(false)}
                            className="flex-1 py-2 rounded-xl border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-medium hover:bg-amber-100/60 cursor-pointer"
                          >
                            বাতিল
                          </button>
                          <button
                            type="button"
                            onClick={executeDriveBackup}
                            className="flex-1 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                          >
                            হ্যাঁ, ব্যাকআপ আপডেট করুন
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* ২. অফলাইন ব্যাকআপ বাটনসমূহ (টাইটেল বাদ দেওয়া হয়েছে, লেখা বামে এবং আইকন ডানে) */}
          <div className="space-y-2.5">
            {/* অফলাইন ব্যাকআপ ফাইল ডাউনলোড করুন */}
            <button
              type="button"
              onClick={handleExportOfflineBackup}
              className="w-full p-3.5 rounded-2xl bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 flex items-center justify-between text-slate-800 dark:text-slate-200 transition-all cursor-pointer group shadow-2xs active:scale-[0.99]"
            >
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                অফলাইন ব্যাকআপ ফাইল ডাউনলোড করুন
              </span>
              <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 border border-slate-200/80 dark:border-slate-700 group-hover:scale-105 transition-transform">
                <Download className="w-4 h-4" />
              </div>
            </button>

            {/* অফলাইন ব্যাকআপ ফাইল রিস্টোর করুন */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleOfflineFileRestore}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => {
                if (!requireLogin('অফলাইন ফাইল রিস্টোর')) return;
                fileInputRef.current?.click();
              }}
              className="w-full p-3.5 rounded-2xl bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 flex items-center justify-between text-slate-800 dark:text-slate-200 transition-all cursor-pointer group shadow-2xs active:scale-[0.99]"
            >
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                অফলাইন ব্যাকআপ ফাইল রিস্টোর করুন
              </span>
              <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 border border-slate-200/80 dark:border-slate-700 group-hover:scale-105 transition-transform">
                <Upload className="w-4 h-4" />
              </div>
            </button>
          </div>

          {/* ৩. হোয়াটসঅ্যাপের মতো নিরাপদ ব্যাকআপ সুবিধা */}
          <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold text-xs">
              <ShieldCheck className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              <span>হোয়াটসঅ্যাপের মতো নিরাপদ ব্যাকআপ সুবিধা</span>
            </div>
            <ul className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1.5 list-disc pl-4 leading-relaxed">
              <li>
                <strong>অফলাইন-ফার্স্ট:</strong> হিসাব মূলত আপনার নিজস্ব ডিভাইসে জমা থাকে, যা ইন্টারনেট ছাড়াও দ্রুত কাজ করে।
              </li>
              <li>
                <strong>গোপন ড্রাইভ ফোল্ডার:</strong> ব্যাকআপ ফাইলটি আপনার গুগল ড্রাইভের সুরক্ষিত <code className="text-[10px] bg-slate-200/70 dark:bg-slate-800 px-1 py-0.5 rounded text-slate-700 dark:text-slate-300">appDataFolder</code>-এ সেভ হয়, অন্য কেউ দেখতে পারে না।
              </li>
              <li>
                <strong>ডিভাইস বদলানো সহজ:</strong> ফোন হারালে বা পরিবর্তন করলে নতুন ডিভাইসে ড্রাইভ অথবা ফাইল রিস্টোর দিলেই সব হিসাব পাওয়া যাবে।
              </li>
            </ul>
          </div>

          {/* ৪. সচরাচর জিজ্ঞাসা (FAQ) */}
          <div className="border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowFaq(!showFaq)}
              className="w-full p-3.5 bg-slate-50/70 dark:bg-slate-900/40 flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer hover:bg-slate-100/70 transition-colors"
            >
              <div className="flex items-center gap-2">
                <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                <span>সচরাচর জিজ্ঞাসা (FAQ)</span>
              </div>
              {showFaq ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {showFaq && (
              <div className="p-3.5 bg-white dark:bg-slate-900/20 text-[11px] text-slate-600 dark:text-slate-400 space-y-3 divide-y divide-slate-100 dark:divide-slate-800">
                <div className="space-y-1">
                  <p className="font-bold text-slate-800 dark:text-slate-200">কখন ব্যাকআপ নেওয়া উচিত?</p>
                  <p className="leading-relaxed">
                    গুরুত্বপূর্ণ কোনো হিসাব লেখার পর বা প্রতি সপ্তাহের শেষে একবার ড্রাইভে অথবা অফলাইন ফাইল ডাউনলোড করে রাখা ভালো।
                  </p>
                </div>
                <div className="pt-2 space-y-1">
                  <p className="font-bold text-slate-800 dark:text-slate-200">আমার তথ্য কি নিরাপদ?</p>
                  <p className="leading-relaxed">
                    হ্যাঁ, আপনার কোনো তথ্য আমাদের সার্ভারে সংরক্ষিত হয় না। এটি শুধুমাত্র আপনার নিজস্ব ডিভাইসে এবং আপনার গুগল ড্রাইভে সংরক্ষিত থাকে।
                  </p>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};

