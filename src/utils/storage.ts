import { Account, Category, Person, Transaction, Budget, RecurringTransaction, AppData, AccountType } from '../types';

export const ACCOUNT_TYPE_PRIORITY: Record<AccountType, number> = {
  cash: 1,  // নগদ ক্যাশ
  mfs: 2,   // মোবাইল ব্যাংকিং (বিকাশ, নগদ, রকেট ইত্যাদি)
  bank: 3,  // ব্যাংক একাউন্ট
  other: 4, // অন্যান্য
};

export function sortAccounts(accounts: Account[]): Account[] {
  return [...accounts].sort((a, b) => {
    const pA = ACCOUNT_TYPE_PRIORITY[a.type] ?? 99;
    const pB = ACCOUNT_TYPE_PRIORITY[b.type] ?? 99;
    if (pA !== pB) return pA - pB;
    return (a.createdAt || '').localeCompare(b.createdAt || '');
  });
}

export const DEFAULT_ACCOUNTS: Account[] = [
  {
    id: 'acc_cash',
    name: 'নগদ ক্যাশ',
    type: 'cash',
    openingBalance: 0,
    color: '#10b981', // emerald
    icon: 'Wallet',
    isDefault: true,
    isArchived: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'acc_bkash',
    name: 'বিকাশ',
    type: 'mfs',
    openingBalance: 0,
    color: '#e11d48', // rose/pink
    icon: 'Smartphone',
    isDefault: true,
    isArchived: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'acc_nagad',
    name: 'নগদ',
    type: 'mfs',
    openingBalance: 0,
    color: '#f97316', // orange
    icon: 'Smartphone',
    isDefault: true,
    isArchived: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'acc_bank',
    name: 'ব্যাংক অ্যাকাউন্ট',
    type: 'bank',
    openingBalance: 0,
    color: '#3b82f6', // blue
    icon: 'Building2',
    isDefault: true,
    isArchived: false,
    createdAt: new Date().toISOString(),
  },
];

export const DEFAULT_CATEGORIES: Category[] = [
  // Expense
  { id: 'cat_exp_1', name: 'খাবার / রেস্তোরাঁ', type: 'expense', icon: 'UtensilsCrossed', isDefault: true },
  { id: 'cat_exp_2', name: 'বাজারসদাই', type: 'expense', icon: 'ShoppingBag', isDefault: true },
  { id: 'cat_exp_3', name: 'যাতায়াত / ভাড়া', type: 'expense', icon: 'Car', isDefault: true },
  { id: 'cat_exp_4', name: 'বাসা ভাড়া', type: 'expense', icon: 'Home', isDefault: true },
  { id: 'cat_exp_5', name: 'ইউটিলিটি বিল', type: 'expense', icon: 'Zap', isDefault: true },
  { id: 'cat_exp_6', name: 'কেনাকাটা / শপিং', type: 'expense', icon: 'ShoppingBag', isDefault: true },
  { id: 'cat_exp_7', name: 'চিকিৎসা ও ওষুধ', type: 'expense', icon: 'HeartPulse', isDefault: true },
  { id: 'cat_exp_8', name: 'শিক্ষা', type: 'expense', icon: 'GraduationCap', isDefault: true },
  { id: 'cat_exp_9', name: 'বিনোদন', type: 'expense', icon: 'Film', isDefault: true },
  { id: 'cat_exp_10', name: 'মোবাইল রিচার্জ ও ইন্টারনেট', type: 'expense', icon: 'Wifi', isDefault: true },
  { id: 'cat_exp_11', name: 'অন্যান্য ব্যয়', type: 'expense', icon: 'MoreHorizontal', isDefault: true },
  
  // Income
  { id: 'cat_inc_1', name: 'বেতন', type: 'income', icon: 'Briefcase', isDefault: true },
  { id: 'cat_inc_2', name: 'ফ্রিল্যান্সিং', type: 'income', icon: 'Laptop', isDefault: true },
  { id: 'cat_inc_3', name: 'ব্যবসায়িক লাভ', type: 'income', icon: 'TrendingUp', isDefault: true },
  { id: 'cat_inc_4', name: 'উপহার / বোনাস', type: 'income', icon: 'Gift', isDefault: true },
  { id: 'cat_inc_5', name: 'ভাড়া আয়', type: 'income', icon: 'KeyRound', isDefault: true },
  { id: 'cat_inc_6', name: 'অন্যান্য আয়', type: 'income', icon: 'Coins', isDefault: true },
];

const STORAGE_KEY = 'takar_khata_master_v3';

export function getLocalToday(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function generateId(prefix = 'item'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
}

export function loadInitialData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.transactions) && Array.isArray(parsed.accounts)) {
        return {
          version: parsed.version || 3,
          accounts: sortAccounts(parsed.accounts.length ? parsed.accounts : DEFAULT_ACCOUNTS),
          transactions: parsed.transactions,
          persons: Array.isArray(parsed.persons) ? parsed.persons : [],
          categories: Array.isArray(parsed.categories) && parsed.categories.length ? parsed.categories : DEFAULT_CATEGORIES,
          budgets: Array.isArray(parsed.budgets) ? parsed.budgets : [],
          recurring: Array.isArray(parsed.recurring) ? parsed.recurring : [],
        };
      }
    }
  } catch (err) {
    console.error('Error loading master data:', err);
  }

  // Check legacy migration (tk_txns_v2 or tk_txns)
  return migrateFromLegacyData();
}

function migrateFromLegacyData(): AppData {
  const accounts: Account[] = [...DEFAULT_ACCOUNTS];
  const categories: Category[] = [...DEFAULT_CATEGORIES];
  const persons: Person[] = [];
  const transactions: Transaction[] = [];

  const accountIdMap: Record<string, string> = {
    'Cash': 'acc_cash',
    'নগদ': 'acc_cash',
    'bKash': 'acc_bkash',
    'বিকাশ': 'acc_bkash',
    'Nagad': 'acc_nagad',
    'Bank': 'acc_bank',
    'ব্যাংক': 'acc_bank',
  };

  try {
    // 1. Check legacy transactions
    const legacyTxnsRaw = localStorage.getItem('tk_txns_v2') || localStorage.getItem('tk_txns');
    if (legacyTxnsRaw) {
      const legacyTxns = JSON.parse(legacyTxnsRaw);
      if (Array.isArray(legacyTxns)) {
        legacyTxns.forEach((t: any) => {
          if (!t) return;
          const amt = Number(t.amount);
          if (isNaN(amt) || amt <= 0) return;
          
          const mappedAccount = accountIdMap[t.account] || 'acc_cash';
          const type = (t.type === 'Income' || t.type === 'income') ? 'income' : 'expense';

          transactions.push({
            id: t.id || generateId('txn'),
            type,
            amount: amt,
            categoryName: t.category || (type === 'income' ? 'অন্যান্য আয়' : 'অন্যান্য ব্যয়'),
            accountId: mappedAccount,
            date: t.date || getLocalToday(),
            note: t.note || '',
            createdAt: t.createdAt || new Date().toISOString(),
            updatedAt: t.updatedAt || new Date().toISOString(),
          });
        });
      }
    }

    // 2. Check legacy debts
    const legacyDebtsRaw = localStorage.getItem('tk_debts_v2') || localStorage.getItem('tk_debts');
    if (legacyDebtsRaw) {
      const legacyDebts = JSON.parse(legacyDebtsRaw);
      if (Array.isArray(legacyDebts)) {
        legacyDebts.forEach((d: any) => {
          if (!d || !d.person) return;
          const origAmt = Number(d.originalAmount || d.amount);
          if (isNaN(origAmt) || origAmt <= 0) return;

          let person = persons.find(p => p.name.trim().toLowerCase() === d.person.trim().toLowerCase());
          if (!person) {
            person = {
              id: generateId('person'),
              name: d.person.trim(),
              createdAt: d.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            persons.push(person);
          }

          const isReceivable = d.type === 'receivable' || d.type === 'আমি পাব';
          const txnType = isReceivable ? 'loan_given' : 'loan_borrowed';
          
          transactions.push({
            id: generateId('txn_debt'),
            type: txnType,
            amount: origAmt,
            categoryName: isReceivable ? 'ধার দেওয়া' : 'ধার নেওয়া',
            accountId: 'acc_cash',
            personId: person.id,
            date: (d.createdAt ? d.createdAt.slice(0, 10) : getLocalToday()),
            note: d.note || (isReceivable ? 'ধার দেওয়া হয়েছিল' : 'ধার নেওয়া হয়েছিল'),
            createdAt: d.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });

          // If there were payments recorded
          if (Array.isArray(d.payments)) {
            d.payments.forEach((p: any) => {
              const pAmt = Number(p.amount);
              if (pAmt > 0) {
                transactions.push({
                  id: p.id || generateId('txn_pay'),
                  type: isReceivable ? 'loan_repaid' : 'borrow_repaid',
                  amount: pAmt,
                  categoryName: isReceivable ? 'ধার ফেরত প্রাপ্তি' : 'ধার পরিশোধ',
                  accountId: 'acc_cash',
                  personId: person!.id,
                  date: p.date || getLocalToday(),
                  note: p.note || 'আংশিক/পূর্ণ পরিশোধ',
                  createdAt: p.date ? new Date(p.date).toISOString() : new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                });
              }
            });
          } else if (Number(d.paidAmount) > 0) {
            transactions.push({
              id: generateId('txn_pay'),
              type: isReceivable ? 'loan_repaid' : 'borrow_repaid',
              amount: Number(d.paidAmount),
              categoryName: isReceivable ? 'ধার ফেরত প্রাপ্তি' : 'ধার পরিশোধ',
              accountId: 'acc_cash',
              personId: person.id,
              date: getLocalToday(),
              note: 'আগের হিসাব অনুযায়ী পরিশোধ',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
        });
      }
    }
  } catch (err) {
    console.error('Error migrating legacy data:', err);
  }

  // If no transactions found, give a warm welcoming initial state
  if (transactions.length === 0) {
    accounts[0].openingBalance = 5000; // Cash ৳5,000
    accounts[1].openingBalance = 2500; // bKash ৳2,500
    accounts[3].openingBalance = 15000; // Bank ৳15,000

    const personRahim: Person = {
      id: generateId('person'),
      name: 'রহিম ভাই',
      phone: '01712345678',
      note: 'অফিস কলিগ',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    persons.push(personRahim);

    // Initial demo transactions to show how the system seamlessly computes everything
    transactions.push(
      {
        id: generateId('txn'),
        type: 'income',
        amount: 35000,
        categoryName: 'বেতন',
        accountId: 'acc_bank',
        date: getLocalToday(),
        note: 'চলতি মাসের বেতন জমা',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: generateId('txn'),
        type: 'transfer',
        amount: 3000,
        categoryName: 'অ্যাকাউন্ট ট্রান্সফার',
        accountId: 'acc_bank',
        toAccountId: 'acc_bkash',
        date: getLocalToday(),
        note: 'ব্যাংক থেকে বিকাশ রিচার্জ',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: generateId('txn'),
        type: 'expense',
        amount: 850,
        categoryName: 'বাজারসদাই',
        accountId: 'acc_cash',
        date: getLocalToday(),
        note: 'কাঁচাবাজার ও ফলমূল',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: generateId('txn'),
        type: 'loan_given',
        amount: 2000,
        categoryName: 'ধার দেওয়া',
        accountId: 'acc_cash',
        personId: personRahim.id,
        date: getLocalToday(),
        note: 'জরুরি প্রয়োজনে ধার দেওয়া হলো',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    );
  }

  const initialData: AppData = {
    version: 3,
    accounts,
    transactions,
    persons,
    categories,
    budgets: [
      { id: generateId('bgt'), categoryName: 'বাজারসদাই', month: getLocalToday().slice(0, 7), amount: 8000 },
      { id: generateId('bgt'), categoryName: 'খাবার / রেস্তোরাঁ', month: getLocalToday().slice(0, 7), amount: 4000 },
    ],
    recurring: [
      {
        id: generateId('rec'),
        title: 'ইন্টারনেট বিল',
        type: 'expense',
        amount: 800,
        categoryName: 'ইউটিলিটি বিল',
        accountId: 'acc_bkash',
        frequency: 'monthly',
        nextDueDate: getLocalToday(),
        isActive: true,
        note: 'প্রতি মাসের ৫ তারিখ ব্রডব্যান্ড ফি',
      },
    ],
  };

  saveData(initialData);
  return initialData;
}

export function saveData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save data to localStorage:', e);
  }
}

export function exportJSONBackup(data: AppData): void {
  const exportPayload: AppData = {
    ...data,
    exportedAt: new Date().toISOString(),
  };
  const jsonStr = JSON.stringify(exportPayload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `takar-khata-backup-${getLocalToday()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportTransactionsCSV(transactions: Transaction[], accounts: Account[]): void {
  const accMap = new Map(accounts.map(a => [a.id, a.name]));
  const typeMap: Record<string, string> = {
    expense: 'ব্যয়',
    income: 'আয়',
    transfer: 'ট্রান্সফার',
    loan_given: 'ধার দেওয়া',
    loan_repaid: 'ধার ফেরত পাওয়া',
    loan_borrowed: 'ধার নেওয়া',
    borrow_repaid: 'ধার শোধ দেওয়া',
  };

  const headers = ['তারিখ', 'লেনদেনের ধরন', 'ক্যাটাগরি', 'পরিমাণ (৳)', 'অ্যাকাউন্ট', 'নোট'];
  const rows = transactions.map(t => [
    t.date,
    typeMap[t.type] || t.type,
    t.categoryName,
    t.amount.toString(),
    accMap.get(t.accountId) || t.accountId,
    (t.note || '').replace(/"/g, '""'),
  ]);

  const csvContent = '\ufeff' + [
    headers.join(','),
    ...rows.map(r => r.map(c => `"${c}"`).join(',')),
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `takar-khata-transactions-${getLocalToday()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
