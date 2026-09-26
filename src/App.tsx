/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AppData, Transaction, Person, Account, Category, Budget, RecurringTransaction, TransactionType } from './types';
import { loadInitialData, saveData, getLocalToday, generateId, DEFAULT_ACCOUNTS, DEFAULT_CATEGORIES, sortAccounts } from './utils/storage';
import { calculateFinancialMetrics, toBanglaDigits } from './utils/accounting';
import { Header } from './components/Header';
import { BottomNav, NavTab } from './components/BottomNav';
import { DashboardView } from './components/DashboardView';
import { TransactionsView } from './components/TransactionsView';
import { LedgerView } from './components/LedgerView';
import { BudgetRecurringView } from './components/BudgetRecurringView';
import { ReportsView } from './components/ReportsView';
import { QuickAddModal } from './components/QuickAddModal';
import { AccountModal } from './components/AccountModal';
import { SettingsModal } from './components/SettingsModal';
import { TrialLimitModal } from './components/TrialLimitModal';
import { AuthModal } from './components/AuthModal';
import { useGoogleAuth } from './hooks/useGoogleAuth';
import { useSecurityAndProfile } from './hooks/useSecurityAndProfile';
import { PinLockScreen } from './components/PinLockScreen';
import { EditProfileModal } from './components/EditProfileModal';
import { SendFeedbackModal } from './components/SendFeedbackModal';
import { BackupSystemModal } from './components/BackupSystemModal';
import { AppLockModal } from './components/AppLockModal';
import { AboutAppModal } from './components/AboutAppModal';
import { CheckCircle2 } from 'lucide-react';
import { getAutoBackupConfig, saveAutoBackupConfig, shouldPerformAutoBackup } from './utils/autoBackup';
import { saveAppDataToSupabase, loadAppDataFromSupabase } from './services/supabaseData';

const TRIAL_TRANSACTION_LIMIT = 10;

export default function App() {
  const [data, setData] = useState<AppData>(() => loadInitialData());
  const [currentTab, setCurrentTab] = useState<NavTab>('reports');
  const googleAuth = useGoogleAuth();
  const security = useSecurityAndProfile(googleAuth.appUser);

  // Trial Limit State
  const [isTrialLimitOpen, setIsTrialLimitOpen] = useState(false);
  const isTrialLimitReached = !googleAuth.isAppLoggedIn && data.transactions.length >= TRIAL_TRANSACTION_LIMIT;

  // Global Auth Modal State (for login & register from trial modal or elsewhere)
  const [isGlobalAuthModalOpen, setIsGlobalAuthModalOpen] = useState(false);
  const [globalAuthModalMode, setGlobalAuthModalMode] = useState<'login' | 'register'>('login');

  const handleOpenGlobalAuth = (mode: 'login' | 'register') => {
    setGlobalAuthModalMode(mode);
    setIsGlobalAuthModalOpen(true);
  };

  // New Modals for Edit Profile, Feedback, Backup System, App Lock, and About App
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isBackupSystemOpen, setIsBackupSystemOpen] = useState(false);
  const [isAppLockOpen, setIsAppLockOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('hishab_theme');
      if (savedTheme === 'dark' || savedTheme === 'light') return savedTheme;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('hishab_theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  // Modals state
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddType, setQuickAddType] = useState<TransactionType>('expense');
  const [quickAddPersonId, setQuickAddPersonId] = useState<string | undefined>(undefined);
  const [quickAddAccountId, setQuickAddAccountId] = useState<string | undefined>(undefined);
  const [quickAddAllowedTypes, setQuickAddAllowedTypes] = useState<TransactionType[] | undefined>(undefined);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2400);
  }, []);

  // Update storage whenever data changes
  const updateData = useCallback((updater: (prev: AppData) => AppData) => {
    setData(prev => {
      const next = updater(prev);
      saveData(next);
      return next;
    });
  }, []);

  // Auto-sync with Supabase on login
  useEffect(() => {
    const currentUid = googleAuth.appUser?.uid;
    if (currentUid) {
      loadAppDataFromSupabase(currentUid).then(res => {
        if (res.data && res.data.transactions && res.data.accounts) {
          setData(prev => {
            if (prev.transactions.length <= res.data!.transactions.length) {
              saveData(res.data!);
              return res.data!;
            }
            return prev;
          });
        } else if (data.transactions.length > 0) {
          saveAppDataToSupabase(currentUid, data);
        }
      }).catch(err => {
        console.warn('Initial Supabase sync check:', err);
      });
    }
  }, [googleAuth.appUser?.uid]);

  // Background Google Drive Auto-Backup when scheduled (daily / weekly / monthly)
  useEffect(() => {
    // Only run auto-backup for logged in users
    if (!googleAuth.isAppLoggedIn || !googleAuth.driveAccount?.accessToken || googleAuth.isBackingUp || googleAuth.isLoadingAuth) {
      return;
    }
    const config = getAutoBackupConfig();
    const isDue = shouldPerformAutoBackup(config, googleAuth.driveMeta?.modifiedTime);
    if (isDue) {
      googleAuth.performDriveBackup(data).then(meta => {
        const updatedConfig = {
          ...config,
          lastAutoBackup: meta.modifiedTime || new Date().toISOString(),
        };
        saveAutoBackupConfig(updatedConfig);
      }).catch(err => {
        console.warn('Scheduled auto backup skipped:', err);
      });
    }
  }, [googleAuth.isAppLoggedIn, googleAuth.driveAccount, googleAuth.driveMeta?.modifiedTime]);

  // 1. Transaction Handlers
  const handleSaveTransaction = (txnData: Partial<Transaction>) => {
    const isEdit = Boolean(txnData.id);
    if (!isEdit && isTrialLimitReached) {
      setIsTrialLimitOpen(true);
      return;
    }

    updateData(prev => {
      let updatedTransactions: Transaction[];

      if (isEdit) {
        updatedTransactions = prev.transactions.map(t => {
          if (t.id === txnData.id) {
            return {
              ...t,
              ...txnData,
              updatedAt: new Date().toISOString(),
            } as Transaction;
          }
          return t;
        });
        showToast('লেনদেন সফলভাবে আপডেট করা হয়েছে');
      } else {
        const newTxn: Transaction = {
          id: generateId('txn'),
          type: txnData.type || 'expense',
          amount: txnData.amount || 0,
          categoryName: txnData.categoryName || 'অন্যান্য',
          accountId: txnData.accountId || prev.accounts[0].id,
          toAccountId: txnData.toAccountId,
          personId: txnData.personId,
          date: txnData.date || getLocalToday(),
          note: txnData.note,
          fee: txnData.fee,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        updatedTransactions = [newTxn, ...prev.transactions];
        showToast('নতুন লেনদেন খাতায় যুক্ত হয়েছে');
      }

      return {
        ...prev,
        transactions: updatedTransactions,
      };
    });

    setEditingTransaction(null);
  };

  const handleDeleteTransaction = (id: string) => {
    updateData(prev => ({
      ...prev,
      transactions: prev.transactions.filter(t => t.id !== id),
    }));
    showToast('লেনদেন মুছে ফেলা হয়েছে');
  };

  // 2. Person Handlers
  const handleSavePerson = (pData: Partial<Person>): Person => {
    let savedPerson: Person;

    updateData(prev => {
      const isEdit = Boolean(pData.id);
      if (isEdit) {
        const updated = prev.persons.map(p => {
          if (p.id === pData.id) {
            savedPerson = {
              ...p,
              ...pData,
              updatedAt: new Date().toISOString(),
            } as Person;
            return savedPerson;
          }
          return p;
        });
        showToast('ব্যক্তির প্রোফাইল আপডেট হয়েছে');
        return { ...prev, persons: updated };
      } else {
        savedPerson = {
          id: generateId('person'),
          name: pData.name || 'বেনামী',
          phone: pData.phone,
          email: pData.email,
          address: pData.address,
          note: pData.note,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        showToast('নতুন ব্যক্তি খতিয়ানে যুক্ত হয়েছে');
        return {
          ...prev,
          persons: [...prev.persons, savedPerson],
        };
      }
    });

    return savedPerson!;
  };

  const handleDeletePerson = (id: string) => {
    if (data.transactions.some(t => t.personId === id)) {
      showToast('লেনদেন থাকায় এই ব্যক্তিকে ডিলিট করা যাবে না');
      return;
    }
    updateData(prev => ({
      ...prev,
      persons: prev.persons.filter(p => p.id !== id),
    }));
    showToast('ব্যক্তি সফলভাবে মুছে ফেলা হয়েছে');
  };

  // 3. Account Handlers
  const handleSaveAccount = (account: Account) => {
    updateData(prev => {
      const exists = prev.accounts.some(a => a.id === account.id);
      let updated: Account[];
      if (exists) {
        updated = prev.accounts.map(a => a.id === account.id ? account : a);
        showToast('অ্যাকাউন্ট আপডেট হয়েছে');
      } else {
        updated = [...prev.accounts, account];
        showToast('নতুন অ্যাকাউন্ট তৈরি হয়েছে');
      }
      return { ...prev, accounts: sortAccounts(updated) };
    });
  };

  const handleDeleteAccount = (id: string) => {
    updateData(prev => ({
      ...prev,
      accounts: prev.accounts.filter(a => a.id !== id),
    }));
    showToast('অ্যাকাউন্ট সরানো হয়েছে');
  };

  // 4. Budget Handlers
  const handleSaveBudget = (budget: Budget) => {
    updateData(prev => {
      const filtered = prev.budgets.filter(b => b.id !== budget.id && !(b.categoryName === budget.categoryName && b.month === budget.month));
      showToast('বাজেট সংরক্ষিত হয়েছে');
      return {
        ...prev,
        budgets: [...filtered, budget],
      };
    });
  };

  const handleDeleteBudget = (id: string) => {
    updateData(prev => ({
      ...prev,
      budgets: prev.budgets.filter(b => b.id !== id),
    }));
    showToast('বাজেট মুছে ফেলা হয়েছে');
  };

  // 5. Recurring Handlers
  const handleSaveRecurring = (rec: RecurringTransaction) => {
    updateData(prev => ({
      ...prev,
      recurring: [...prev.recurring.filter(r => r.id !== rec.id), rec],
    }));
    showToast('নিয়মিত লেনদেন সংরক্ষিত হয়েছে');
  };

  const handleDeleteRecurring = (id: string) => {
    updateData(prev => ({
      ...prev,
      recurring: prev.recurring.filter(r => r.id !== id),
    }));
    showToast('আইটেম মুছে ফেলা হয়েছে');
  };

  const handleExecuteRecurring = (rec: RecurringTransaction) => {
    // 1. Add as transaction
    handleSaveTransaction({
      type: rec.type,
      amount: rec.amount,
      categoryName: rec.categoryName,
      accountId: rec.accountId,
      date: getLocalToday(),
      note: `নিয়মিত বিল: ${rec.title}`,
    });

    // 2. Advance next due date
    const d = new Date(rec.nextDueDate || getLocalToday());
    if (rec.frequency === 'monthly') {
      d.setMonth(d.getMonth() + 1);
    } else if (rec.frequency === 'weekly') {
      d.setDate(d.getDate() + 7);
    } else if (rec.frequency === 'daily') {
      d.setDate(d.getDate() + 1);
    } else if (rec.frequency === 'yearly') {
      d.setFullYear(d.getFullYear() + 1);
    }

    const nextDate = d.toISOString().slice(0, 10);
    updateData(prev => ({
      ...prev,
      recurring: prev.recurring.map(r => r.id === rec.id ? { ...r, nextDueDate: nextDate } : r),
    }));
  };

  // 6. Category Handlers
  const handleSaveCategory = (cat: Category) => {
    updateData(prev => ({
      ...prev,
      categories: [...prev.categories, cat],
    }));
    showToast('ক্যাটাগরি তৈরি হয়েছে');
  };

  const handleDeleteCategory = (id: string) => {
    updateData(prev => ({
      ...prev,
      categories: prev.categories.filter(c => c.id !== id),
    }));
    showToast('ক্যাটাগরি মুছে ফেলা হয়েছে');
  };

  // 7. Backup & Restore
  const handleRestoreData = (restored: AppData) => {
    updateData(() => restored);
    showToast('ব্যাকআপ সফলভাবে রিস্টোর হয়েছে');
  };

  const handleResetAllData = () => {
    const cleanState: AppData = {
      version: 3,
      accounts: DEFAULT_ACCOUNTS.map(a => ({ ...a, openingBalance: 0 })),
      transactions: [],
      persons: [],
      categories: DEFAULT_CATEGORIES,
      budgets: [],
      recurring: [],
    };
    updateData(() => cleanState);
    showToast('সব ডেটা রিসেট করা হয়েছে');
  };

  // Helper: Download offline JSON backup file
  const downloadOfflineBackup = (appData: AppData) => {
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
    } catch (err) {
      console.error('Download offline backup failed:', err);
    }
  };

  // Logout with Auto-Backup (Requirement 2):
  // ব্যাকআপ সিস্টেমে গুগল অ্যাকাউন্ট কানেক্ট থাকলে স্বয়ংক্রিয়ভাবে ড্রাইভে আপলোড,
  // কানেক্ট না থাকলে স্বয়ংক্রিয়ভাবে ডাটা ফাইল ডাউনলোড হয়ে লগআউট।
  const handleLogoutWithAutoBackup = async () => {
    try {
      // 1. Always sync to Supabase if logged in
      if (googleAuth.appUser?.uid) {
        try {
          await saveAppDataToSupabase(googleAuth.appUser.uid, data);
        } catch (supaErr) {
          console.warn('Supabase backup before logout:', supaErr);
        }
      }

      // 2. Google Drive / Offline Download
      if (googleAuth.isDriveConnected) {
        try {
          const meta = await googleAuth.performDriveBackup(data);
          const cfg = { ...getAutoBackupConfig(), lastAutoBackup: meta?.modifiedTime || new Date().toISOString() };
          saveAutoBackupConfig(cfg);
          showToast('ডাটা ক্লাউডে সুরক্ষিত রেখে সফলভাবে লগআউট করা হয়েছে');
        } catch (cloudErr) {
          console.error('Drive backup failed during logout, falling back to download:', cloudErr);
          downloadOfflineBackup(data);
          showToast('ক্লাউড ব্যাকআপে ত্রুটি হওয়ায় ব্যাকআপ ডাউনলোড করে লগআউট সম্পন্ন হয়েছে');
        }
      } else {
        downloadOfflineBackup(data);
        showToast('ডাটা ব্যাকআপ ডাউনলোড করে সফলভাবে লগআউট করা হয়েছে');
      }
    } finally {
      await googleAuth.logoutApp();
    }
  };

  // Calculate metrics for account balances
  const metrics = useMemo(() => {
    const currentMonth = getLocalToday().slice(0, 7);
    return calculateFinancialMetrics(data.accounts, data.transactions, data.persons, currentMonth);
  }, [data.accounts, data.transactions, data.persons]);

  // Quick Open Modal Helpers
  const openQuickAddWith = (
    type: TransactionType = 'expense', 
    personId?: string, 
    accountId?: string,
    allowedTypes?: TransactionType[]
  ) => {
    if (isTrialLimitReached) {
      setIsTrialLimitOpen(true);
      return;
    }
    setEditingTransaction(null);
    setQuickAddType(type);
    setQuickAddPersonId(personId);
    setQuickAddAccountId(accountId);
    setQuickAddAllowedTypes(allowedTypes);
    setIsQuickAddOpen(true);
  };

  const openTransferModal = () => {
    if (isTrialLimitReached) {
      setIsTrialLimitOpen(true);
      return;
    }
    setEditingTransaction(null);
    setQuickAddType('transfer');
    setQuickAddAllowedTypes(['transfer']);
    setIsQuickAddOpen(true);
  };

  const openEditTransaction = (t: Transaction) => {
    setEditingTransaction(t);
    if (['loan_given', 'loan_repaid', 'loan_borrowed', 'borrow_repaid'].includes(t.type)) {
      setQuickAddAllowedTypes(['loan_given', 'loan_repaid', 'loan_borrowed', 'borrow_repaid']);
    } else {
      setQuickAddAllowedTypes([t.type]);
    }
    setIsQuickAddOpen(true);
  };

  const openAccountModal = (acc?: Account) => {
    setEditingAccount(acc || null);
    setIsAccountModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col selection:bg-slate-900 selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-60 px-4 py-2.5 rounded-2xl bg-slate-900/95 backdrop-blur-md text-white text-xs font-medium shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Container Wrapper */}
      <div className={`w-full max-w-2xl mx-auto min-h-screen bg-[#FBFBFC] dark:bg-[#0b0f19] shadow-sm flex flex-col relative border-x border-slate-200/60 dark:border-slate-800/80 transition-colors ${security.privacyBlur ? 'privacy-mode' : ''}`}>
        {/* Top Header */}
        <Header
          onOpenSettings={() => setIsSettingsOpen(true)}
          user={googleAuth.user}
          profile={security.profile}
          privacyBlur={security.privacyBlur}
          onTogglePrivacyBlur={security.togglePrivacyBlur}
          isAppLockEnabled={security.isLockActive}
          onLockNow={security.lockNow}
        />

        {/* Content Area */}
        <main className="flex-1 p-3.5 sm:p-4">
          {currentTab === 'dashboard' && (
            <DashboardView
              accounts={data.accounts}
              transactions={data.transactions}
              persons={data.persons}
              budgets={data.budgets}
              categories={data.categories}
              onOpenQuickAdd={openQuickAddWith}
              onOpenTransfer={openTransferModal}
              onOpenAccountModal={openAccountModal}
              onSelectPerson={person => {
                setSelectedPerson(person);
                setCurrentTab('ledger');
              }}
              onSelectTab={setCurrentTab}
              onEditTransaction={openEditTransaction}
            />
          )}

          {currentTab === 'transactions' && (
            <TransactionsView
              transactions={data.transactions}
              accounts={data.accounts}
              persons={data.persons}
              onOpenQuickAdd={() => openQuickAddWith('income', undefined, undefined, ['income', 'expense', 'transfer', 'loan_given', 'loan_repaid', 'loan_borrowed', 'borrow_repaid'])}
              onEditTransaction={openEditTransaction}
              onDeleteTransaction={handleDeleteTransaction}
            />
          )}

          {currentTab === 'ledger' && (
            <LedgerView
              persons={data.persons}
              transactions={data.transactions}
              accounts={data.accounts}
              selectedPerson={selectedPerson}
              onSelectPerson={setSelectedPerson}
              onSavePerson={handleSavePerson}
              onDeletePerson={handleDeletePerson}
              onOpenQuickAdd={(type, personId) => 
                openQuickAddWith(type, personId, undefined, [type])
              }
            />
          )}

          {currentTab === 'budget' && (
            <BudgetRecurringView
              categories={data.categories}
              budgets={data.budgets}
              recurring={data.recurring}
              transactions={data.transactions}
              accounts={data.accounts}
              onSaveBudget={handleSaveBudget}
              onDeleteBudget={handleDeleteBudget}
              onSaveRecurring={handleSaveRecurring}
              onDeleteRecurring={handleDeleteRecurring}
              onExecuteRecurring={handleExecuteRecurring}
            />
          )}

          {currentTab === 'reports' && (
            <ReportsView
              transactions={data.transactions}
              accounts={data.accounts}
              persons={data.persons}
            />
          )}
        </main>

        {/* Bottom Navigation */}
        <BottomNav
          currentTab={currentTab}
          onSelectTab={tab => {
            setCurrentTab(tab);
            if (tab !== 'ledger') {
              setSelectedPerson(null);
            }
          }}
          onOpenAction={(type, allowedTypes) => {
            openQuickAddWith(type, undefined, undefined, allowedTypes);
          }}
          onOpenQuickAdd={() => openQuickAddWith('income', undefined, undefined, ['income', 'expense', 'transfer', 'loan_given', 'loan_repaid', 'loan_borrowed', 'borrow_repaid'])}
        />
      </div>

      {/* Quick Add Modal */}
      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => {
          setIsQuickAddOpen(false);
          setEditingTransaction(null);
          setQuickAddAccountId(undefined);
          setQuickAddAllowedTypes(undefined);
          setQuickAddPersonId(undefined);
        }}
        initialType={quickAddType}
        initialPersonId={quickAddPersonId}
        initialAccountId={quickAddAccountId}
        allowedTypes={quickAddAllowedTypes}
        editingTransaction={editingTransaction}
        accounts={data.accounts}
        categories={data.categories}
        persons={data.persons}
        onSaveTransaction={handleSaveTransaction}
        onSavePerson={handleSavePerson}
        onSaveCategory={handleSaveCategory}
      />

      {/* Account Modal */}
      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => {
          setIsAccountModalOpen(false);
          setEditingAccount(null);
        }}
        editingAccount={editingAccount}
        currentBalance={editingAccount ? (metrics.accountBalances.find(ab => ab.account.id === editingAccount.id)?.balance ?? editingAccount.openingBalance) : 0}
        onSaveAccount={handleSaveAccount}
        onDeleteAccount={handleDeleteAccount}
        onOpenTransfer={openTransferModal}
        onAddFundsToAccount={(accId) => {
          openQuickAddWith('income', undefined, accId, ['income']);
        }}
      />

      {/* Settings Modal (Wallets, Categories, Security & Backup) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        accounts={data.accounts}
        accountBalances={metrics.accountBalances}
        categories={data.categories}
        appData={data}
        onSaveAccount={handleSaveAccount}
        onDeleteAccount={handleDeleteAccount}
        onSaveCategory={handleSaveCategory}
        onDeleteCategory={handleDeleteCategory}
        onRestoreData={handleRestoreData}
        onResetAllData={handleResetAllData}
        googleAuth={googleAuth}
        securityAndProfile={security}
        onOpenFeedback={() => setIsFeedbackOpen(true)}
        onOpenEditProfile={() => setIsEditProfileOpen(true)}
        onOpenBackupSystem={() => setIsBackupSystemOpen(true)}
        onOpenAppLock={() => setIsAppLockOpen(true)}
        onOpenAboutApp={() => setIsAboutOpen(true)}
      />

      {/* About App Modal */}
      <AboutAppModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
      />

      {/* Edit Profile Modal (with Logout option) */}
      <EditProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        currentProfile={security.profile}
        onSaveProfile={security.saveProfile}
        googleUser={googleAuth.appUser}
        isLoggedIn={googleAuth.isAppLoggedIn}
        isDriveConnected={googleAuth.isDriveConnected}
        onLogout={handleLogoutWithAutoBackup}
      />

      {/* Send Feedback Modal */}
      <SendFeedbackModal
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
        userEmail={security.profile.email || googleAuth.user?.email || ''}
        userName={security.profile.name || googleAuth.user?.displayName || ''}
      />

      {/* App Lock Dedicated Modal (Requirement 3) */}
      <AppLockModal
        isOpen={isAppLockOpen}
        onClose={() => setIsAppLockOpen(false)}
        isLockEnabled={security.isLockEnabled}
        hasPin={security.hasPin}
        isLoggedIn={googleAuth.isAppLoggedIn}
        onSavePin={security.savePin}
        onDisableLock={security.disableLock}
        onResetPin={security.resetPin}
        onLockNow={security.lockNow}
        onOpenAuth={handleOpenGlobalAuth}
      />

      {/* Backup System Dedicated Modal */}
      <BackupSystemModal
        isOpen={isBackupSystemOpen}
        onClose={() => setIsBackupSystemOpen(false)}
        googleAuth={googleAuth}
        appData={data}
        onRestoreData={handleRestoreData}
        onOpenAuth={handleOpenGlobalAuth}
      />

      {/* Trial Limit Modal */}
      <TrialLimitModal
        isOpen={isTrialLimitOpen}
        onClose={() => setIsTrialLimitOpen(false)}
        onOpenAuth={handleOpenGlobalAuth}
        currentCount={data.transactions.length}
        maxLimit={TRIAL_TRANSACTION_LIMIT}
      />

      {/* Global Auth Modal (Login / Register) */}
      <AuthModal
        isOpen={isGlobalAuthModalOpen}
        onClose={() => setIsGlobalAuthModalOpen(false)}
        initialMode={globalAuthModalMode}
        onGoogleAuth={async (isRegistering) => {
          const user = await googleAuth.loginApp(isRegistering);
          if (user) {
            showToast(`স্বাগতম ${user.displayName || ''}! হিসাব সফলভাবে সংযুক্ত হয়েছে`);
          }
          return user;
        }}
        onEmailLogin={async (email, pass) => {
          const user = await googleAuth.loginWithEmailPassword(email, pass);
          if (user) {
            showToast(`স্বাগতম ${user.displayName || ''}! লগইন সম্পন্ন হয়েছে`);
          }
          return user;
        }}
        onEmailRegister={async (name, email, pass) => {
          const user = await googleAuth.registerWithEmailPassword(name, email, pass);
          if (user) {
            showToast(`স্বাগতম ${user.displayName || ''}! একাউন্ট তৈরি সফল হয়েছে`);
          }
          return user;
        }}
        isLoadingAuth={googleAuth.isLoadingAuth}
      />

      {/* Pin Lock Screen Overlay (WhatsApp style app lock) - Only for logged in users */}
      {security.isLocked && googleAuth.isAppLoggedIn && (
        <PinLockScreen
          onUnlock={security.unlockApp}
          onResetPin={security.resetPin}
          appName="আমার হিসাব"
        />
      )}
    </div>
  );
}
