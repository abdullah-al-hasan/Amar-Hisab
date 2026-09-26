import React, { useState, useMemo } from 'react';
import { 
  Search, X, Trash2, Edit2
} from 'lucide-react';
import { Account, Transaction, Person } from '../types';
import { formatMoney, formatBanglaDate, toBanglaDigits } from '../utils/accounting';
import { getLocalToday } from '../utils/storage';

interface TransactionsViewProps {
  transactions: Transaction[];
  accounts: Account[];
  persons: Person[];
  onOpenQuickAdd?: () => void;
  onEditTransaction: (txn: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  transactions,
  accounts,
  persons,
  onEditTransaction,
  onDeleteTransaction,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('month'); // default 'month'
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const accMap = useMemo(() => new Map(accounts.map(a => [a.id, a.name])), [accounts]);
  const personMap = useMemo(() => new Map(persons.map(p => [p.id, p.name])), [persons]);

  // Filter logic: Default is running month, grouped/ordered date by date
  const filteredTransactions = useMemo(() => {
    const today = getLocalToday();
    const currentMonth = today.slice(0, 7);

    // Helper to calculate past date ISO strings
    const getPastDate = (days: number) => {
      const d = new Date();
      d.setDate(d.getDate() - days);
      return d.toISOString().slice(0, 10);
    };

    const sevenDaysAgo = getPastDate(7);
    const thirtyDaysAgo = getPastDate(30);
    const ninetyDaysAgo = getPastDate(90);

    return transactions.filter(t => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const personName = t.personId ? (personMap.get(t.personId) || '') : '';
        const accName = accMap.get(t.accountId) || '';
        const toAccName = t.toAccountId ? (accMap.get(t.toAccountId) || '') : '';
        const searchable = `${t.categoryName} ${t.note || ''} ${accName} ${toAccName} ${personName} ${t.amount}`.toLowerCase();
        if (!searchable.includes(q)) return false;
      }

      // 2. Type Filter
      if (selectedType !== 'all') {
        if (selectedType === 'income' && t.type !== 'income') return false;
        if (selectedType === 'expense' && t.type !== 'expense') return false;
        if (selectedType === 'transfer' && t.type !== 'transfer') return false;
        if (selectedType === 'debt' && !['loan_given', 'loan_repaid', 'loan_borrowed', 'borrow_repaid'].includes(t.type)) return false;
      }

      // 3. Date Filter (Default is 'month' - Current Month)
      if (selectedDateFilter === 'month' && !t.date.startsWith(currentMonth)) return false;
      if (selectedDateFilter === 'today' && t.date !== today) return false;
      if (selectedDateFilter === '7days' && (t.date < sevenDaysAgo || t.date > today)) return false;
      if (selectedDateFilter === '30days' && (t.date < thirtyDaysAgo || t.date > today)) return false;
      if (selectedDateFilter === '90days' && (t.date < ninetyDaysAgo || t.date > today)) return false;
      if (selectedDateFilter === 'custom') {
        if (fromDate && t.date < fromDate) return false;
        if (toDate && t.date > toDate) return false;
      }

      // 4. Account Filter
      if (selectedAccount !== 'all') {
        if (t.accountId !== selectedAccount && t.toAccountId !== selectedAccount) return false;
      }

      return true;
    }).sort((a, b) => {
      const cmp = b.date.localeCompare(a.date);
      if (cmp !== 0) return cmp;
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [
    transactions, searchQuery, selectedType, selectedDateFilter,
    fromDate, toDate, selectedAccount, accMap, personMap
  ]);

  // Group filtered transactions by date
  const groupedTransactions = useMemo(() => {
    const groups: { date: string; items: Transaction[] }[] = [];
    let currentDate = '';
    let currentGroup: Transaction[] = [];

    for (const t of filteredTransactions) {
      if (t.date !== currentDate) {
        if (currentGroup.length > 0) {
          groups.push({ date: currentDate, items: currentGroup });
        }
        currentDate = t.date;
        currentGroup = [t];
      } else {
        currentGroup.push(t);
      }
    }
    if (currentGroup.length > 0) {
      groups.push({ date: currentDate, items: currentGroup });
    }

    return groups;
  }, [filteredTransactions]);

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedType('all');
    setSelectedDateFilter('month');
    setFromDate('');
    setToDate('');
    setSelectedAccount('all');
  };

  const getTransactionBadge = (t: Transaction) => {
    switch (t.type) {
      case 'expense':
        return { text: 'ব্যয়', color: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400' };
      case 'income':
        return { text: 'আয়', color: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400' };
      case 'transfer':
        return { text: 'ট্রান্সফার', color: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300' };
      case 'loan_given':
        return { text: 'ধার দিলাম', color: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300' };
      case 'loan_repaid':
        return { text: 'ধার ফেরত', color: 'bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300' };
      case 'loan_borrowed':
        return { text: 'ধার নিলাম', color: 'bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300' };
      case 'borrow_repaid':
        return { text: 'ধার শোধ', color: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300' };
      default:
        return { text: 'লেনদেন', color: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300' };
    }
  };

  const getAmountDisplay = (t: Transaction) => {
    const isIncome = t.type === 'income' || t.type === 'loan_repaid' || t.type === 'loan_borrowed';
    const isExpense = t.type === 'expense' || t.type === 'loan_given' || t.type === 'borrow_repaid';

    if (isIncome) {
      return {
        prefix: '+',
        colorClass: 'text-emerald-600 dark:text-emerald-400',
      };
    }
    if (isExpense) {
      return {
        prefix: '-',
        colorClass: 'text-rose-600 dark:text-rose-400',
      };
    }
    return {
      prefix: '',
      colorClass: 'text-blue-600 dark:text-blue-400',
    };
  };

  const getRelativeBanglaDateHeader = (dateStr: string) => {
    const today = getLocalToday();
    const [y, m, d] = today.split('-').map(Number);
    const yesterdayObj = new Date(y, m - 1, d - 1);
    const yesterdayStr = `${yesterdayObj.getFullYear()}-${String(yesterdayObj.getMonth() + 1).padStart(2, '0')}-${String(yesterdayObj.getDate()).padStart(2, '0')}`;

    const formattedDate = formatBanglaDate(dateStr);
    if (dateStr === today) {
      return { main: 'আজ', sub: formattedDate };
    }
    if (dateStr === yesterdayStr) {
      return { main: 'গতকাল', sub: formattedDate };
    }
    return { main: formattedDate, sub: null };
  };

  return (
    <div className="space-y-4 pb-20 fade-in">
      {/* 1. Search & Filter Card (Clean Minimalist Surface) */}
      <section className="bg-white dark:bg-[#111726] rounded-3xl p-4 sm:p-5 border border-slate-200/70 dark:border-slate-800/80 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-3.5 transition-colors">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="txns-search-input"
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="নোট, ক্যাটাগরি, ব্যক্তি বা টাকার পরিমাণ..."
            className="w-full pl-9.5 pr-8 py-2.5 rounded-2xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 text-xs font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none focus:border-slate-400 dark:focus:border-slate-600 focus:bg-white dark:focus:bg-slate-900 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Type Filter Chips (Minimal Segmented Control) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {[
            { key: 'all', label: 'সব' },
            { key: 'income', label: 'আয়' },
            { key: 'expense', label: 'ব্যয়' },
            { key: 'transfer', label: 'ট্রান্সফার' },
            { key: 'debt', label: 'ধার-দেনা' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setSelectedType(f.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedType === f.key
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm'
                  : 'bg-slate-100/80 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Account & Date Range Filter Row */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div>
            <select
              value={selectedAccount}
              onChange={e => setSelectedAccount(e.target.value)}
              className="w-full px-2.5 py-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 text-xs font-medium text-slate-700 dark:text-slate-200 outline-none"
            >
              <option value="all" className="dark:bg-[#111726]">সব অ্যাকাউন্ট</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id} className="dark:bg-[#111726]">{acc.name}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedDateFilter}
              onChange={e => setSelectedDateFilter(e.target.value)}
              className="w-full px-2.5 py-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 text-xs font-medium text-slate-700 dark:text-slate-200 outline-none"
            >
              <option value="month" className="dark:bg-[#111726]">চলতি মাস</option>
              <option value="today" className="dark:bg-[#111726]">আজ</option>
              <option value="7days" className="dark:bg-[#111726]">বিগত ৭ দিন</option>
              <option value="30days" className="dark:bg-[#111726]">বিগত ৩০ দিন</option>
              <option value="90days" className="dark:bg-[#111726]">বিগত ৯০ দিন</option>
              <option value="custom" className="dark:bg-[#111726]">কাস্টম তারিখ</option>
              <option value="all" className="dark:bg-[#111726]">সব তারিখ</option>
            </select>
          </div>
        </div>

        {/* Custom Date Range Selectors */}
        {selectedDateFilter === 'custom' && (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div>
              <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1 block">শুরুর তারিখ</label>
              <input
                type="date"
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-900 dark:text-slate-100 text-xs font-medium"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1 block">শেষ তারিখ</label>
              <input
                type="date"
                value={toDate}
                onChange={e => setToDate(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-900 dark:text-slate-100 text-xs font-medium"
              />
            </div>
          </div>
        )}

        {/* Summary of Filtered Items (Clean without balances) */}
        <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="text-slate-500 dark:text-slate-400 font-medium">
            মোট <span className="font-bold text-slate-800 dark:text-slate-200">{toBanglaDigits(filteredTransactions.length)}</span> টি লেনদেন
          </div>

          <button
            onClick={clearAllFilters}
            className="text-[11px] text-slate-600 dark:text-slate-400 font-medium hover:text-slate-900 dark:hover:text-slate-200 cursor-pointer"
          >
            রিসেট
          </button>
        </div>
      </section>

      {/* 2. Transactions List (Grouped by Date, No Leading Icons) */}
      <section className="bg-white dark:bg-[#111726] rounded-3xl p-4 sm:p-5 border border-slate-200/70 dark:border-slate-800/80 shadow-[0_2px_12px_rgba(0,0,0,0.02)] transition-colors">
        {groupedTransactions.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mx-auto text-xl">
              📝
            </div>
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300">কোনো লেনদেন পাওয়া যায়নি</div>
            <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs mx-auto">
              অনুসন্ধান শর্ত পরিবর্তন করুন অথবা ফিল্টার রিসেট করুন
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedTransactions.map((group) => {
              const dateHeader = getRelativeBanglaDateHeader(group.date);

              return (
                <div key={group.date} className="pt-2 first:pt-0">
                  {/* Date Header */}
                  <div className="flex items-center gap-2 pb-1.5 mb-1 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                      <span>{dateHeader.main}</span>
                      {dateHeader.sub && (
                        <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">
                          • {dateHeader.sub}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Transactions under this Date */}
                  <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {group.items.map((t) => {
                      const badge = getTransactionBadge(t);
                      const { prefix, colorClass } = getAmountDisplay(t);
                      const accName = accMap.get(t.accountId) || 'অ্যাকাউন্ট';
                      const toAccName = t.toAccountId ? accMap.get(t.toAccountId) : null;
                      const personName = t.personId ? personMap.get(t.personId) : null;

                      return (
                        <div
                          key={t.id}
                          className="py-2.5 px-0.5 transition-all group"
                        >
                          <div className="flex items-start justify-between gap-3">
                            {/* Left content (No icon in front) */}
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                                  {t.categoryName}
                                </span>
                                <span className={`text-[9.5px] font-medium px-2 py-0.2 rounded-full ${badge.color}`}>
                                  {badge.text}
                                </span>
                                {personName && (
                                  <span className="text-[9.5px] font-medium px-2 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                    {personName}
                                  </span>
                                )}
                              </div>

                              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                                <span>
                                  {toAccName ? `${accName} ➔ ${toAccName}` : accName}
                                </span>
                                {t.fee ? (
                                  <span className="text-slate-500 font-medium privacy-blur">
                                    (ফি: ৳{formatMoney(t.fee)})
                                  </span>
                                ) : null}
                                {t.note && (
                                  <>
                                    <span className="text-slate-300 dark:text-slate-600">•</span>
                                    <span className="text-slate-700 dark:text-slate-300 font-medium">
                                      "{t.note}"
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Right content: Color-coded amount and actions */}
                            <div className="text-right shrink-0">
                              <div className={`text-sm font-bold ${colorClass} privacy-blur`}>
                                {prefix}৳{formatMoney(t.amount)}
                              </div>

                              {/* Action buttons */}
                              <div className="flex items-center justify-end gap-1 mt-1 opacity-80 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => onEditTransaction(t)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                  title="সম্পাদনা করুন"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={() => setConfirmDeleteId(t.id)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                  title="মুছে ফেলুন"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Inline Confirmation dialog if delete is requested */}
                          {confirmDeleteId === t.id && (
                            <div className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 p-2.5 rounded-xl flex items-center justify-between gap-2">
                              <span className="text-[11px] font-medium text-slate-800 dark:text-slate-200">
                                <span className="privacy-blur font-bold">৳{formatMoney(t.amount)}</span> এর এই লেনদেনটি কি মুছে ফেলবেন?
                              </span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  onClick={() => {
                                    onDeleteTransaction(t.id);
                                    setConfirmDeleteId(null);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-[10px] font-semibold hover:bg-rose-700 cursor-pointer"
                                >
                                  মুছুন
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="px-2 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-medium hover:bg-slate-300 dark:hover:bg-slate-600 cursor-pointer"
                                >
                                  বাতিল
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
