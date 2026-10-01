import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Wallet, Plus, Edit2, Trash2, Tag, 
  Smartphone, Building2, Banknote,
  Download, Upload, ShieldCheck, RefreshCw, AlertCircle,
  Cloud, Lock, MessageSquare, Send, Heart, KeyRound,
  User, Loader2, LogOut, ArrowUpRight, ArrowDownLeft, ChevronRight,
  LogIn, UserPlus, BookOpen, Info
} from 'lucide-react';
import { Account, AccountType, Category, AppData } from '../types';
import { formatMoney, toBanglaDigits, BANGLA_MONTH_NAMES } from '../utils/accounting';
import { generateId, getLocalToday } from '../utils/storage';
import { useGoogleAuth } from '../hooks/useGoogleAuth';
import { useSecurityAndProfile } from '../hooks/useSecurityAndProfile';
import { AuthModal } from './AuthModal';
import { AboutAppModal } from './AboutAppModal';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  accountBalances: { account: Account; balance: number }[];
  categories: Category[];
  appData: AppData;
  onSaveAccount: (account: Account) => void;
  onDeleteAccount: (id: string) => void;
  onSaveCategory: (category: Category) => void;
  onDeleteCategory: (id: string) => void;
  onRestoreData: (data: AppData) => void;
  onResetAllData: () => void;
  googleAuth: ReturnType<typeof useGoogleAuth>;
  securityAndProfile: ReturnType<typeof useSecurityAndProfile>;
  onOpenFeedback: () => void;
  onOpenEditProfile: () => void;
  onOpenBackupSystem: () => void;
  onOpenAppLock: () => void;
  onOpenAboutApp?: () => void;
}

// Helpers for formatted date and size
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

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  accounts,
  accountBalances,
  categories,
  appData,
  onSaveAccount,
  onDeleteAccount,
  onSaveCategory,
  onDeleteCategory,
  onRestoreData,
  onResetAllData,
  googleAuth,
  securityAndProfile,
  onOpenFeedback,
  onOpenEditProfile,
  onOpenBackupSystem,
  onOpenAppLock,
  onOpenAboutApp,
}) => {
  // 3 Unified Tabs: Profile (includes Backup & Security), Wallets, Categories
  const [activeTab, setActiveTab] = useState<'profile' | 'wallets' | 'categories'>('profile');

  // Wallet Create / Edit Form State
  const [showWalletForm, setShowWalletForm] = useState(false);
  const [editingWallet, setEditingWallet] = useState<Account | null>(null);
  const [walletName, setWalletName] = useState('');
  const [walletType, setWalletType] = useState<AccountType>('cash');
  const [walletOpeningBalance, setWalletOpeningBalance] = useState('0');

  // Category Create / Edit Form State
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [categoryType, setCategoryType] = useState<'expense' | 'income'>('expense');

  // Backup file input ref & status
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showResetFlow, setShowResetFlow] = useState(false);
  const [hasDownloadedBackupForReset, setHasDownloadedBackupForReset] = useState(false);

  // Login / Register Modal State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [isInternalAboutOpen, setIsInternalAboutOpen] = useState(false);

  const handleOpenAuthModal = (mode: 'login' | 'register') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const {
    appUser,
    isAppLoggedIn,
    loginApp,
    logoutApp,
    driveAccount,
    isDriveConnected,
    user,
    token,
    driveMeta,
    isLoadingAuth,
    isCheckingDrive,
    isBackingUp,
    isRestoring,
    authError,
    signIn,
    signOut,
    refreshDriveBackupMeta,
    performDriveBackup,
    performDriveRestore,
  } = googleAuth;

  const {
    profile,
    isLockEnabled,
    hasPin,
    savePin,
    disableLock,
    lockNow,
  } = securityAndProfile;

  const [imgError, setImgError] = useState(false);

  // Reset imgError when appUser or profile photo changes
  useEffect(() => {
    setImgError(false);
  }, [appUser?.photoURL, profile?.photoURL]);

  if (!isOpen) return null;

  // Open Wallet Form for Add
  const handleOpenAddWallet = () => {
    setEditingWallet(null);
    setWalletName('');
    setWalletType('cash');
    setWalletOpeningBalance('0');
    setShowWalletForm(true);
  };

  // Open Wallet Form for Edit
  const handleOpenEditWallet = (acc: Account) => {
    setEditingWallet(acc);
    setWalletName(acc.name);
    setWalletType(acc.type);
    setWalletOpeningBalance(String(acc.openingBalance || 0));
    setShowWalletForm(true);
  };

  const handleSaveWalletSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletName.trim()) return;

    if (editingWallet) {
      onSaveAccount({
        ...editingWallet,
        name: walletName.trim(),
        type: walletType,
      });
    } else {
      onSaveAccount({
        id: generateId('acc'),
        name: walletName.trim(),
        type: walletType,
        openingBalance: Number(walletOpeningBalance) || 0,
        createdAt: new Date().toISOString(),
      });
    }

    setShowWalletForm(false);
    setEditingWallet(null);
    setWalletName('');
    setWalletOpeningBalance('0');
  };

  // Open Category Form for Add
  const handleOpenAddCategory = () => {
    setCategoryName('');
    setCategoryType('expense');
    setShowCategoryForm(true);
  };

  const handleSaveCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) return;

    onSaveCategory({
      id: generateId('cat'),
      name: categoryName.trim(),
      type: categoryType,
      isDefault: false,
    });

    setShowCategoryForm(false);
    setCategoryName('');
  };

  // Export / Download Backup JSON
  const handleExportBackup = () => {
    try {
      const exportObject = {
        app: 'Amar-Hisab',
        version: appData.version || 3,
        exportedAt: new Date().toISOString(),
        date: getLocalToday(),
        data: appData,
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportObject, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `amar_hisab_backup_${getLocalToday()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setStatusMessage({
        type: 'success',
        text: 'ব্যাকআপ ফাইল সফলভাবে ডাউনলোড হয়েছে!',
      });
      setTimeout(() => setStatusMessage(null), 4000);
    } catch {
      setStatusMessage({
        type: 'error',
        text: 'ব্যাকআপ তৈরিতে সমস্যা হয়েছে। আবার চেষ্টা করুন।',
      });
    }
  };

  // Import / Restore Backup JSON
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        const restoredData: AppData = parsed.data || parsed;

        if (!restoredData || !Array.isArray(restoredData.accounts) || !Array.isArray(restoredData.transactions)) {
          throw new Error('অকার্যকর ব্যাকআপ ফাইল');
        }

        onRestoreData(restoredData);
        setStatusMessage({
          type: 'success',
          text: `লোকাল রিস্টোর সম্পন্ন হয়েছে! (${toBanglaDigits(restoredData.transactions.length)}টি লেনদেন উদ্ধার করা হয়েছে)`,
        });
        setTimeout(() => setStatusMessage(null), 5000);
      } catch {
        setStatusMessage({
          type: 'error',
          text: 'ভুল বা ক্ষতিগ্রস্ত ফাইল! সঠিক JSON ব্যাকআপ ফাইল নির্বাচন করুন।',
        });
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsText(file);
  };

  const displayName = profile?.name || user?.displayName || 'আমার হিসাব';
  const displayPhoto = profile?.photoURL || user?.photoURL;
  const displayAvatar = profile?.avatarIcon || '👤';

  const expenseCategories = categories.filter(c => c.type === 'expense' && !c.isArchived);
  const incomeCategories = categories.filter(c => c.type === 'income' && !c.isArchived);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white dark:bg-[#111726] w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200/80 dark:border-slate-800 animate-in slide-in-from-bottom duration-200 max-h-[92vh] flex flex-col transition-colors">
        
        {/* Top Header - Just "সেটিংস" */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">সেটিংস</h3>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher (3 Tabs: প্রোফাইল, ওয়ালেট, ক্যাটাগরি) */}
        <div className="bg-slate-100/80 dark:bg-slate-900/80 p-1 rounded-2xl grid grid-cols-3 gap-1 border border-slate-200/60 dark:border-slate-800 my-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveTab('profile');
              setShowWalletForm(false);
              setShowCategoryForm(false);
            }}
            className={`py-2 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-white dark:bg-[#111726] text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">প্রোফাইল</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('wallets');
              setShowWalletForm(false);
              setShowCategoryForm(false);
            }}
            className={`py-2 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
              activeTab === 'wallets'
                ? 'bg-white dark:bg-[#111726] text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Wallet className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">ওয়ালেট</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('categories');
              setShowWalletForm(false);
              setShowCategoryForm(false);
            }}
            className={`py-2 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
              activeTab === 'categories'
                ? 'bg-white dark:bg-[#111726] text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Tag className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">ক্যাটাগরি</span>
          </button>
        </div>

        {/* Scrollable Tab Content */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-0.5">
          {/* Status Toast / Alert */}
          {statusMessage && (
            <div
              className={`p-3 rounded-2xl text-xs font-semibold flex items-center gap-2 animate-in fade-in ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* TAB 1: PROFILE (Unified Profile, App Lock, Cloud & Offline Backup) */}
          {activeTab === 'profile' && (
            <div className="space-y-4 animate-in fade-in">
              {/* User Identity Banner (with Edit Profile Button) - Only shown when user is actually logged in! */}
              {appUser && (
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-50 to-slate-100/80 dark:from-slate-900/80 dark:to-slate-800/60 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {(appUser?.photoURL || profile?.photoURL) && !imgError ? (
                      <img
                        src={appUser?.photoURL || profile?.photoURL}
                        alt={displayName}
                        referrerPolicy="no-referrer"
                        crossOrigin="anonymous"
                        onError={() => setImgError(true)}
                        className="w-10 h-10 rounded-full border-2 border-emerald-500 object-cover shrink-0"
                      />
                    ) : profile?.avatarIcon ? (
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 flex items-center justify-center text-xl shrink-0 border border-slate-200 dark:border-slate-700 shadow-xs">
                        {displayAvatar}
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs border-2 border-emerald-500">
                        {appUser?.displayName ? appUser.displayName.slice(0, 1).toUpperCase() : (displayName ? displayName.slice(0, 1).toUpperCase() : 'আ')}
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {appUser?.displayName || displayName}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                        {appUser?.email || profile?.tagline || 'ব্যক্তিগত হিসাব'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Edit Profile Button */}
                    <button
                      type="button"
                      onClick={onOpenEditProfile}
                      className="px-2.5 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                      title="প্রোফাইল এডিট করুন"
                    >
                      <Edit2 className="w-3 h-3 text-slate-400" />
                      <span>এডিট</span>
                    </button>
                  </div>
                </div>
              )}

              {/* লগইন অপশন (যদি ইউজার লগইন না করে থাকে) */}
              {!appUser && (
                <div className="p-4 rounded-2xl bg-slate-900 dark:bg-slate-900/90 text-white border border-slate-800 space-y-3 shadow-md animate-in fade-in">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-semibold border border-slate-700">
                        <span>অ্যাপে ট্রায়াল: {toBanglaDigits(appData.transactions.length)}/১০ টি লেনদেন</span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        আপনার হিসাব লিপিবদ্ধ করে সুরক্ষিত রাখতে অ্যাপে লগইন করুন অথবা একাউন্ট করুন।
                      </p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>লেনদেন</span>
                      <span>{toBanglaDigits(appData.transactions.length)}/১০ টি</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${
                          appData.transactions.length >= 10 ? 'bg-amber-400' : 'bg-slate-300'
                        }`}
                        style={{ width: `${Math.min(100, (appData.transactions.length / 10) * 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleOpenAuthModal('login')}
                      className="w-full py-2.5 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-sm active:scale-[0.98]"
                    >
                      <LogIn className="w-4 h-4 text-slate-800" />
                      <span>লগইন করুন</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenAuthModal('register')}
                      className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-700 cursor-pointer transition-all shadow-sm active:scale-[0.98]"
                    >
                      <UserPlus className="w-4 h-4 text-slate-200" />
                      <span>একাউন্ট করুন</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 1. APP LOCK BUTTON (ক্লিক করলে ব্যাকআপ সিস্টেমের মত আলাদা ইন্টারফেস ওপেন হবে) */}
              <button
                type="button"
                onClick={onOpenAppLock}
                className="w-full p-3 rounded-2xl bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 flex items-center justify-between text-slate-800 dark:text-slate-200 transition-all cursor-pointer group shadow-2xs active:scale-[0.99]"
              >
                <div className="flex items-center gap-3 text-left">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center shrink-0">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <span>অ্যাপ লক</span>
                      {appUser ? (
                        isLockEnabled && hasPin ? (
                          <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold px-2 py-0.5 rounded-full">
                            সক্রিয়
                          </span>
                        ) : (
                          <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-medium px-2 py-0.5 rounded-full">
                            বন্ধ
                          </span>
                        )
                      ) : (
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium px-2 py-0.5 rounded-full">
                          লগইন প্রয়োজন
                        </span>
                      )}
                    </h4>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 truncate max-w-[240px]">
                      {isLockEnabled && hasPin ? '৪-সংখ্যার পিন সুরক্ষা সক্রিয় রয়েছে' : '৪-সংখ্যার পিন দিয়ে অ্যাপ সুরক্ষিত রাখুন'}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 group-hover:translate-x-0.5 transition-all" />
              </button>

              {/* 2. BACKUP SYSTEM BUTTON (ক্লিক করলে ব্যাকআপ সিস্টেমের নতুন ইন্টারফেস ওপেন হবে) */}
              <button
                type="button"
                onClick={onOpenBackupSystem}
                className="w-full p-3 rounded-2xl bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 flex items-center justify-between text-slate-800 dark:text-slate-200 transition-all cursor-pointer group shadow-2xs active:scale-[0.99]"
              >
                <div className="flex items-center gap-3 text-left">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center shrink-0">
                    <Cloud className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <span>ব্যাকআপ সিস্টেম</span>
                      {!appUser && (
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium px-2 py-0.5 rounded-full">
                          লগইন প্রয়োজন
                        </span>
                      )}
                    </h4>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 truncate max-w-[260px]">
                      {appUser?.email
                        ? `${appUser.email}${driveMeta?.exists && driveMeta.size ? ` • সাইজ: ${formatBytes(driveMeta.size)}` : ''}`
                        : 'স্বয়ংক্রিয় গুগল ড্রাইভ ও অফলাইন ব্যাকআপ'}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 group-hover:translate-x-0.5 transition-all" />
              </button>

              {/* 3. DANGER ZONE / RESET ALL DATA (আলাদা কার্ড) */}
              {!showResetFlow ? (
                <button
                  type="button"
                  onClick={() => {
                    setShowResetFlow(true);
                    setHasDownloadedBackupForReset(false);
                  }}
                  className="w-full p-3 rounded-2xl bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 flex items-center justify-between text-slate-800 dark:text-slate-200 transition-all cursor-pointer group shadow-2xs active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3 text-left">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center shrink-0">
                      <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        রিসেট করুন
                      </h4>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                        অ্যাপের সমস্ত ডাটা মুছে ফেলে নতুন করে শুরু করুন
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 group-hover:translate-x-0.5 transition-all" />
                </button>
              ) : (
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3 shadow-2xs animate-in fade-in">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {hasDownloadedBackupForReset 
                          ? 'ব্যাকআপ ফাইল ডাউনলোড সম্পন্ন হয়েছে' 
                          : 'সকল তথ্য ডিলিট করার পূর্বে ব্যাকআপ ফাইল ডাউনলোড করুন'}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                        {hasDownloadedBackupForReset 
                          ? 'আপনার তথ্য ব্যাকআপ হিসেবে সংরক্ষিত হয়েছে। এখন আপনি সকল তথ্য মুছে ফেলার অনুমতি দিতে পারেন।' 
                          : 'সকল তথ্য মুছে ফেলার পূর্বে আপনার ডেটার একটি ব্যাকআপ ফাইল ডাউনলোড করে রাখা আবশ্যক।'}
                      </p>
                    </div>
                  </div>

                  {!hasDownloadedBackupForReset ? (
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowResetFlow(false)}
                        className="flex-1 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        বাতিল
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleExportBackup();
                          setHasDownloadedBackupForReset(true);
                        }}
                        className="flex-1 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>ব্যাকআপ নিন</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowResetFlow(false)}
                        className="flex-1 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        বাতিল
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onResetAllData();
                          setShowResetFlow(false);
                          onClose();
                        }}
                        className="flex-1 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                      >
                        সকল তথ্য মুছুন
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* 4. About App Option (আমার হিসাব সম্পর্কে জানুন - রিকোয়ারমেন্ট অনুযায়ী) */}
              <button
                type="button"
                onClick={() => {
                  if (onOpenAboutApp) {
                    onOpenAboutApp();
                  } else {
                    setIsInternalAboutOpen(true);
                  }
                }}
                className="w-full p-3 rounded-2xl bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 flex items-center justify-between text-slate-800 dark:text-slate-200 transition-all cursor-pointer group shadow-2xs active:scale-[0.99]"
              >
                <div className="flex items-center gap-3 text-left">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center shrink-0">
                    <Info className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      আমার হিসাব সম্পর্কে জানুন
                    </h4>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                      অ্যাপের ধারণা, ফিচার, কার্যকারিতা ও ডেভেলপারের তথ্য
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 group-hover:translate-x-0.5 transition-all" />
              </button>

              {/* 5. Feedback Option (আপনার মতামত দিন) */}
              <button
                type="button"
                onClick={onOpenFeedback}
                className="w-full p-3 rounded-2xl bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 flex items-center justify-between text-slate-800 dark:text-slate-200 transition-all cursor-pointer group shadow-2xs active:scale-[0.99]"
              >
                <div className="flex items-center gap-3 text-left">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      আপনার মতামত দিন
                    </h4>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                      অ্যাপ সম্পর্কে আপনার মূল্যবান মতামত বা পরামর্শ লিখুন
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 group-hover:translate-x-0.5 transition-all" />
              </button>
            </div>
          )}

          {/* TAB 2: WALLETS MANAGEMENT */}
          {activeTab === 'wallets' && (
            <div className="space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  আপনার ওয়ালেট ও অ্যাকাউন্টসমূহ ({toBanglaDigits(accounts.length)})
                </span>
                <button
                  type="button"
                  onClick={handleOpenAddWallet}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-semibold shadow-xs cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>নতুন ওয়ালেট</span>
                </button>
              </div>

              {/* Wallet Add / Edit In-line Card */}
              {showWalletForm && (
                <form
                  onSubmit={handleSaveWalletSubmit}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 space-y-3 animate-in fade-in"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {editingWallet ? 'ওয়ালেটের নাম ও বিবরণ পরিবর্তন' : 'নতুন ওয়ালেট যোগ করুন'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowWalletForm(false)}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Wallet Type */}
                  <div className="grid grid-cols-3 gap-1.5 bg-white dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => setWalletType('cash')}
                      className={`py-1.5 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                        walletType === 'cash'
                          ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <Banknote className="w-3 h-3" />
                      ক্যাশ
                    </button>
                    <button
                      type="button"
                      onClick={() => setWalletType('mfs')}
                      className={`py-1.5 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                        walletType === 'mfs'
                          ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <Smartphone className="w-3 h-3" />
                      মোবাইল
                    </button>
                    <button
                      type="button"
                      onClick={() => setWalletType('bank')}
                      className={`py-1.5 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                        walletType === 'bank'
                          ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <Building2 className="w-3 h-3" />
                      ব্যাংক
                    </button>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      ওয়ালেটের নাম *
                    </label>
                    <input
                      type="text"
                      required
                      autoFocus
                      value={walletName}
                      onChange={e => setWalletName(e.target.value)}
                      placeholder="যেমন: বিকাশ পার্সোনাল, পকেট ক্যাশ, ব্র্যাক ব্যাংক"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-[#111726] text-slate-900 dark:text-slate-100 text-xs font-semibold outline-none focus:border-slate-500"
                    />
                  </div>

                  {!editingWallet && (
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                        শুরুর ব্যালেন্স (৳)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={walletOpeningBalance}
                        onChange={e => setWalletOpeningBalance(e.target.value)}
                        placeholder="0.00"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-[#111726] text-slate-900 dark:text-slate-100 text-xs font-semibold outline-none focus:border-slate-500"
                      />
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowWalletForm(false)}
                      className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      বাতিল
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold shadow-xs cursor-pointer"
                    >
                      {editingWallet ? 'নাম আপডেট করুন' : 'ওয়ালেট যুক্ত করুন'}
                    </button>
                  </div>
                </form>
              )}

              {/* Wallets List */}
              <div className="space-y-2">
                {accounts.map(acc => {
                  const bal = accountBalances.find(ab => ab.account.id === acc.id)?.balance ?? acc.openingBalance;
                  return (
                    <div
                      key={acc.id}
                      className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0">
                          {acc.type === 'bank' ? (
                            <Building2 className="w-4 h-4" />
                          ) : acc.type === 'mfs' ? (
                            <Smartphone className="w-4 h-4" />
                          ) : (
                            <Wallet className="w-4 h-4" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                            {acc.name}
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            ব্যালেন্স: <span className="font-semibold text-slate-800 dark:text-slate-200 privacy-blur">৳{formatMoney(bal)}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditWallet(acc)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-white dark:hover:bg-slate-800 cursor-pointer transition-colors"
                          title="এডিট করুন"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {accounts.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`আপনি কি "${acc.name}" ওয়ালেটটি মুছে ফেলতে চান?`)) {
                                onDeleteAccount(acc.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition-colors"
                            title="মুছে ফেলুন"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: CATEGORIES MANAGEMENT */}
          {activeTab === 'categories' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  ক্যাটাগরি ম্যানেজমেন্ট
                </span>
                <button
                  type="button"
                  onClick={handleOpenAddCategory}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-semibold shadow-xs cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>নতুন খাত</span>
                </button>
              </div>

              {/* Category Add In-line Card */}
              {showCategoryForm && (
                <form
                  onSubmit={handleSaveCategorySubmit}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 space-y-3 animate-in fade-in"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      নতুন লেনদেনের খাত যুক্ত করুন
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowCategoryForm(false)}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Type Selector */}
                  <div className="grid grid-cols-2 gap-1.5 bg-white dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => setCategoryType('expense')}
                      className={`py-1.5 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                        categoryType === 'expense'
                          ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <ArrowUpRight className="w-3 h-3 text-rose-500" />
                      ব্যয়
                    </button>
                    <button
                      type="button"
                      onClick={() => setCategoryType('income')}
                      className={`py-1.5 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                        categoryType === 'income'
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <ArrowDownLeft className="w-3 h-3 text-emerald-500" />
                      আয়
                    </button>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      খাতের নাম *
                    </label>
                    <input
                      type="text"
                      required
                      autoFocus
                      value={categoryName}
                      onChange={e => setCategoryName(e.target.value)}
                      placeholder="যেমন: মোবাইল রিচার্জ, নাস্তা, উপহার"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-[#111726] text-slate-900 dark:text-slate-100 text-xs font-semibold outline-none focus:border-slate-500"
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowCategoryForm(false)}
                      className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      বাতিল
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold shadow-xs cursor-pointer"
                    >
                      খাত যুক্ত করুন
                    </button>
                  </div>
                </form>
              )}

              {/* Expense Categories */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  ব্যয়ের খাতসমূহ ({toBanglaDigits(expenseCategories.length)})
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {expenseCategories.map(c => (
                    <div
                      key={c.id}
                      className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between text-xs"
                    >
                      <span className="font-medium text-slate-800 dark:text-slate-200 truncate pr-1">
                        {c.name}
                      </span>
                      {!c.isDefault && (
                        <button
                          type="button"
                          onClick={() => onDeleteCategory(c.id)}
                          className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1 cursor-pointer transition-colors"
                          title="মুছুন"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Income Categories */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  আয়ের খাতসমূহ ({toBanglaDigits(incomeCategories.length)})
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {incomeCategories.map(c => (
                    <div
                      key={c.id}
                      className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between text-xs"
                    >
                      <span className="font-medium text-slate-800 dark:text-slate-200 truncate pr-1">
                        {c.name}
                      </span>
                      {!c.isDefault && (
                        <button
                          type="button"
                          onClick={() => onDeleteCategory(c.id)}
                          className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1 cursor-pointer transition-colors"
                          title="মুছুন"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* About App Modal (যখন সেটিংস থেকে সরাসরি খোলা হয়) */}
      <AboutAppModal
        isOpen={isInternalAboutOpen}
        onClose={() => setIsInternalAboutOpen(false)}
      />

      {/* Login & Register Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
        onGoogleAuth={async (isRegistering) => {
          const user = await loginApp(isRegistering);
          if (user) {
            setStatusMessage({
              type: 'success',
              text: `স্বাগতম ${user.displayName || ''}! লগইন সম্পন্ন হয়েছে`,
            });
            setTimeout(() => setStatusMessage(null), 3000);
          }
          return user;
        }}
        onEmailLogin={googleAuth.loginWithEmailPassword}
        onEmailRegister={googleAuth.registerWithEmailPassword}
        isLoadingAuth={isLoadingAuth}
      />
    </div>
  );
};
