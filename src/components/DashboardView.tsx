import React, { useMemo } from 'react';
import { 
  TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft, 
  ArrowLeftRight, Wallet, WalletCards, Building2, Smartphone, Plus, 
  ChevronRight, AlertCircle, AlertTriangle
} from 'lucide-react';
import { Account, Transaction, TransactionType, Person, Budget, Category } from '../types';
import { calculateFinancialMetrics, formatMoney } from '../utils/accounting';
import { getLocalToday } from '../utils/storage';

interface DashboardViewProps {
  accounts: Account[];
  transactions: Transaction[];
  persons: Person[];
  budgets?: Budget[];
  categories?: Category[];
  onOpenQuickAdd?: (type?: TransactionType, personId?: string, accountId?: string, allowedTypes?: TransactionType[]) => void;
  onOpenTransfer?: () => void;
  onOpenAccountModal: (acc?: Account) => void;
  onSelectPerson: (person: Person) => void;
  onSelectTab: (tab: any) => void;
  onEditTransaction: (txn: Transaction) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  accounts,
  transactions,
  persons,
  budgets = [],
  categories = [],
  onOpenQuickAdd,
  onOpenTransfer,
  onOpenAccountModal,
  onSelectPerson,
  onSelectTab,
  onEditTransaction,
}) => {
  const currentMonth = getLocalToday().slice(0, 7);
  const metrics = calculateFinancialMetrics(accounts, transactions, persons, currentMonth);

  // Calculate budget spending and detect overspent categories for current month
  const { allMonthBudgets, overspentBudgets, totalOverspent } = useMemo(() => {
    const monthBudgets = budgets.filter(b => b.month === currentMonth);
    const spendingMap = new Map<string, number>();

    transactions.forEach(t => {
      if (t.type === 'expense' && t.date.startsWith(currentMonth)) {
        const cur = spendingMap.get(t.categoryName) || 0;
        spendingMap.set(t.categoryName, cur + Number(t.amount || 0));
      }
    });

    const budgetStats = monthBudgets.map(b => {
      const spent = spendingMap.get(b.categoryName) || 0;
      const overspent = spent - b.amount;
      const remaining = b.amount - spent;
      const percent = b.amount > 0 ? Math.round((spent / b.amount) * 100) : 0;
      const isExceeded = spent > b.amount;
      const isNearLimit = !isExceeded && percent >= 80;
      return {
        id: b.id,
        categoryName: b.categoryName,
        budgetAmount: b.amount,
        spent,
        overspent: Math.max(0, overspent),
        remaining,
        percent,
        barPercent: Math.min(100, percent),
        isExceeded,
        isNearLimit,
      };
    });

    // Sort: overspent categories first (highest overspend first), then near limit, then highest percent
    budgetStats.sort((a, b) => {
      if (a.isExceeded && !b.isExceeded) return -1;
      if (!a.isExceeded && b.isExceeded) return 1;
      if (a.isExceeded && b.isExceeded) return b.overspent - a.overspent;
      return b.percent - a.percent;
    });

    const exceededList = budgetStats.filter(item => item.isExceeded);
    const sumOverspent = exceededList.reduce((acc, curr) => acc + curr.overspent, 0);

    return { allMonthBudgets: budgetStats, overspentBudgets: exceededList, totalOverspent: sumOverspent };
  }, [budgets, transactions, currentMonth]);

  // Set of overspent category names for quick lookup in recent transactions
  const overspentCategorySet = useMemo(() => {
    return new Set(overspentBudgets.map(b => b.categoryName));
  }, [overspentBudgets]);

  // Recent 5 transactions
  const recentTransactions = [...transactions]
    .sort((a, b) => {
      const cmp = b.date.localeCompare(a.date);
      if (cmp !== 0) return cmp;
      return b.createdAt.localeCompare(a.createdAt);
    })
    .slice(0, 5);

  const accMap = new Map(accounts.map(a => [a.id, a]));

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'bank': return <Building2 className="w-4 h-4 text-blue-500" />;
      case 'mfs': return <Smartphone className="w-4 h-4 text-rose-500" />;
      default: return <Wallet className="w-4 h-4 text-emerald-500" />;
    }
  };

  return (
    <div className="space-y-4 pb-20 fade-in">
      {/* 1. Master Financial Overview (Clean Minimalist White/Dark Canvas) */}
      <section className="bg-white dark:bg-[#111726] rounded-3xl p-5 sm:p-6 border border-slate-200/70 dark:border-slate-800/80 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-4 transition-colors">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              মোট বর্তমান ব্যালেন্স
            </span>
            <span className="text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium px-2.5 py-0.5 rounded-full">
              সকল অ্যাকাউন্ট
            </span>
          </div>

          <div className="mt-2 flex items-baseline gap-1.5 privacy-blur">
            <span className="text-slate-400 dark:text-slate-500 text-2xl font-bold">৳</span>
            <span className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              {formatMoney(metrics.totalLiquidAssets)}
            </span>
          </div>

          <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 flex flex-wrap items-center gap-1.5">
            <span>নগদ ও অ্যাকাউন্টে জমানো মোট টাকা</span>
            {(metrics.totalReceivable > 0 || metrics.totalPayable > 0) && (
              <span className="text-slate-600 dark:text-slate-400 font-medium">
                • পাওনা ও দেনা বাদে নিট: <span className="privacy-blur font-bold">৳{formatMoney(metrics.netWorth)}</span>
              </span>
            )}
          </div>
        </div>

        {/* Month Cashflow Cards (Subtle, Muted Modern Style) */}
        <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800/80">
          <div className="bg-slate-50/70 dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-900/80 rounded-2xl p-3 border border-slate-100 dark:border-slate-800/60 transition-colors">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
              <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              এই মাসের মোট আয়
            </div>
            <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-1 privacy-blur">
              +৳{formatMoney(metrics.totalIncome)}
            </div>
          </div>

          <div className="bg-slate-50/70 dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-900/80 rounded-2xl p-3 border border-slate-100 dark:border-slate-800/60 transition-colors">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
              <ArrowUpRight className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              এই মাসের মোট ব্যয়
            </div>
            <div className="text-base font-bold text-rose-600 dark:text-rose-400 mt-1 privacy-blur">
              -৳{formatMoney(metrics.totalExpense)}
            </div>
          </div>
        </div>

        {/* Debt Position Minimalist Row */}
        {(metrics.totalReceivable > 0 || metrics.totalPayable > 0) && (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div 
              onClick={() => onSelectTab('ledger')}
              className="bg-slate-50/70 dark:bg-slate-900/50 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 px-3 py-2 rounded-xl border border-slate-100 dark:border-slate-800/60 flex items-center justify-between cursor-pointer transition-colors"
            >
              <div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">আমি পাব</div>
                <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 privacy-blur">৳{formatMoney(metrics.totalReceivable)}</div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            </div>

            <div 
              onClick={() => onSelectTab('ledger')}
              className="bg-slate-50/70 dark:bg-slate-900/50 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 px-3 py-2 rounded-xl border border-slate-100 dark:border-slate-800/60 flex items-center justify-between cursor-pointer transition-colors"
            >
              <div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">আমি দেব</div>
                <div className="text-xs font-bold text-rose-700 dark:text-rose-400 privacy-blur">৳{formatMoney(metrics.totalPayable)}</div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            </div>
          </div>
        )}
      </section>

      {/* ⚠️ VISUAL WARNING SYSTEM: Budget Exceeded Alert Banner */}
      {overspentBudgets.length > 0 && (
        <section 
          id="dash-budget-warning-banner"
          className="rounded-3xl p-4 sm:p-5 border border-rose-200/90 dark:border-rose-900/70 bg-rose-50/85 dark:bg-rose-950/30 shadow-[0_2px_12px_rgba(244,63,94,0.06)] space-y-3 transition-colors"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-300 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-rose-950 dark:text-rose-100 flex items-center gap-1.5">
                  বাজেট অতিক্রম সতর্কতা
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-200/80 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 border border-rose-300/50 dark:border-rose-800">
                    {overspentBudgets.length}টি খাতে সীমা অতিক্রম
                  </span>
                </h3>
                <div className="text-[11px] text-rose-700/90 dark:text-rose-300/80 mt-0.5 font-medium">
                  এই মাসে মোট অতিরিক্ত ব্যয়: <span className="font-bold text-rose-800 dark:text-rose-200 privacy-blur">৳{formatMoney(totalOverspent)}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onSelectTab('budget')}
              className="text-xs font-semibold text-rose-700 dark:text-rose-300 hover:text-rose-900 dark:hover:text-rose-100 flex items-center gap-0.5 px-2.5 py-1.5 rounded-xl bg-rose-100/80 dark:bg-rose-900/50 hover:bg-rose-200/80 dark:hover:bg-rose-900/70 transition-colors cursor-pointer shrink-0"
            >
              বাজেট দেখুন
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* List of overspent categories with clear red warning indicators */}
          <div className="space-y-2 pt-1">
            {overspentBudgets.slice(0, 3).map(item => (
              <div 
                key={item.id}
                onClick={() => onSelectTab('budget')}
                className="p-3 rounded-2xl bg-white/90 dark:bg-[#111726]/90 border border-rose-200 dark:border-rose-900/50 space-y-2 cursor-pointer hover:bg-white dark:hover:bg-[#111726] transition-colors"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 animate-pulse"></span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">{item.categoryName}</span>
                    <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-900/60 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800 shrink-0">
                      <AlertTriangle className="w-2.5 h-2.5 text-rose-600 dark:text-rose-400 shrink-0" />
                      বাজেট অতিক্রম
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                      বাজেট <span className="privacy-blur font-medium">৳{formatMoney(item.budgetAmount)}</span>
                    </span>
                    <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 privacy-blur">
                      +৳{formatMoney(item.overspent)} ({item.percent}%)
                    </span>
                  </div>
                </div>

                {/* Progress bar in red alerting immediately */}
                <div className="h-2 rounded-full bg-rose-100 dark:bg-rose-950/60 overflow-hidden relative">
                  <div 
                    className="h-full bg-rose-500 dark:bg-rose-600 rounded-full transition-all duration-300 shadow-[0_0_6px_rgba(244,63,94,0.4)]"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 2. Account Balances Grid */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Wallet className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            অ্যাকাউন্ট ব্যালেন্স
          </div>
          <button
            id="dash-add-account-btn"
            onClick={() => onOpenAccountModal()}
            className="text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            নতুন অ্যাকাউন্ট
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {metrics.accountBalances.map(({ account, balance }) => (
            <div
              key={account.id}
              onClick={() => onOpenAccountModal(account)}
              className="bg-white dark:bg-[#111726] hover:bg-slate-50/80 dark:hover:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800/80 rounded-2xl p-3.5 shadow-sm transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                  {getAccountIcon(account.type)}
                </div>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {account.name}
                </span>
              </div>

              <div className="mt-3">
                <div className={`text-base font-bold tracking-tight privacy-blur ${balance >= 0 ? 'text-slate-900 dark:text-slate-100' : 'text-rose-600 dark:text-rose-400'}`}>
                  ৳{formatMoney(balance)}
                </div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                  প্রারম্ভিক: <span className="privacy-blur font-medium">৳{formatMoney(account.openingBalance)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Monthly Budget Progress & Visual Warning Section */}
      {allMonthBudgets.length > 0 && (
        <section 
          id="dash-budget-progress-section"
          className={`rounded-3xl p-4 sm:p-5 border shadow-sm space-y-3.5 transition-colors ${
            overspentBudgets.length > 0
              ? 'bg-rose-50/20 dark:bg-rose-950/15 border-rose-200/80 dark:border-rose-900/50'
              : 'bg-white dark:bg-[#111726] border-slate-200/70 dark:border-slate-800/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                overspentBudgets.length > 0
                  ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}>
                <WalletCards className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  মাসিক বাজেট অগ্রগতি
                </h3>
                {overspentBudgets.length > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-900/60 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400 shrink-0" />
                    {overspentBudgets.length}টি খাতে বাজেট অতিক্রম
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => onSelectTab('budget')}
              className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-0.5 cursor-pointer"
            >
              সব বাজেট ({allMonthBudgets.length})
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {allMonthBudgets.slice(0, 4).map(item => (
              <div
                key={item.id}
                onClick={() => onSelectTab('budget')}
                className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                  item.isExceeded
                    ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-300/80 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                    : item.isNearLimit
                    ? 'bg-amber-50/30 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-900/50 hover:bg-amber-50/50'
                    : 'bg-slate-50/60 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800/60 hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
                }`}
              >
                {/* Header row */}
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {item.categoryName}
                    </span>
                    {item.isExceeded ? (
                      <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-900/60 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800 shrink-0">
                        <AlertTriangle className="w-2.5 h-2.5 text-rose-600 dark:text-rose-400 shrink-0" />
                        বাজেট অতিক্রম
                      </span>
                    ) : item.isNearLimit ? (
                      <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800 shrink-0">
                        সীমার কাছাকাছি
                      </span>
                    ) : null}
                  </div>

                  <div className="text-right shrink-0">
                    <span className={`text-xs font-bold privacy-blur ${
                      item.isExceeded ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'
                    }`}>
                      ৳{formatMoney(item.spent)}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                      {' '}/ <span className="privacy-blur font-medium">৳{formatMoney(item.budgetAmount)}</span>
                    </span>
                  </div>
                </div>

                {/* Warning detail text row */}
                <div className="flex items-center justify-between text-[10px] mb-1.5">
                  <span className={`font-semibold ${
                    item.isExceeded
                      ? 'text-rose-600 dark:text-rose-400 font-bold'
                      : item.isNearLimit
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}>
                    {item.percent}% ব্যয় হয়েছে
                  </span>

                  {item.isExceeded ? (
                    <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />
                      বাজেটের চেয়ে <span className="privacy-blur">+৳{formatMoney(item.overspent)}</span> অতিরিক্ত!
                    </span>
                  ) : item.isNearLimit ? (
                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                      বাকি <span className="privacy-blur font-medium">৳{formatMoney(item.remaining)}</span>
                    </span>
                  ) : (
                    <span className="text-slate-400 dark:text-slate-500 font-medium">
                      বাকি <span className="privacy-blur font-medium">৳{formatMoney(item.remaining)}</span>
                    </span>
                  )}
                </div>

                {/* Progress bar with color shift to red when exceeded */}
                <div className={`h-2 rounded-full overflow-hidden relative ${
                  item.isExceeded
                    ? 'bg-rose-100 dark:bg-rose-950/60 border border-rose-200/60 dark:border-rose-900/40'
                    : 'bg-slate-200/70 dark:bg-slate-800'
                }`}>
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      item.isExceeded
                        ? 'bg-rose-500 dark:bg-rose-600 shadow-[0_0_8px_rgba(244,63,94,0.4)]'
                        : item.isNearLimit
                        ? 'bg-amber-500'
                        : 'bg-slate-900 dark:bg-slate-100'
                    }`}
                    style={{ width: `${item.barPercent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 5. Person Ledger Highlights */}
      {metrics.personSummaries.length > 0 && (
        <section className="bg-white dark:bg-[#111726] rounded-3xl p-4 border border-slate-200/70 dark:border-slate-800/80 shadow-sm space-y-3 transition-colors">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">পাওনা ও দেনার হিসাব</h3>
            <button
              onClick={() => onSelectTab('ledger')}
              className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-0.5 cursor-pointer"
            >
              সব দেখুন
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {metrics.personSummaries.slice(0, 3).map(summary => (
              <div
                key={summary.person.id}
                onClick={() => onSelectPerson(summary.person)}
                className="flex items-center justify-between py-2.5 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 rounded-xl px-1.5 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-xs shrink-0">
                    {summary.person.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {summary.person.name}
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500">
                      {summary.transactionCount} টি এন্ট্রি
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className={`text-xs font-bold privacy-blur ${
                    summary.status === 'receivable' ? 'text-emerald-700 dark:text-emerald-400' :
                    summary.status === 'payable' ? 'text-rose-700 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'
                  }`}>
                    {summary.status === 'receivable' ? '+ ' : summary.status === 'payable' ? '- ' : ''}
                    ৳{formatMoney(Math.abs(summary.netBalance))}
                  </div>
                  <span className={`inline-block text-[9.5px] font-medium px-2 py-0.2 rounded-full mt-0.5 ${
                    summary.status === 'receivable' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300' :
                    summary.status === 'payable' ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}>
                    {summary.status === 'receivable' ? 'আমি পাব' : summary.status === 'payable' ? 'আমি দেব' : 'পরিশোধিত'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 5. Recent Transactions (Mobbin Flush List Style) */}
      <section className="bg-white dark:bg-[#111726] rounded-3xl p-4 border border-slate-200/70 dark:border-slate-800/80 shadow-sm space-y-3 transition-colors">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">সাম্প্রতিক লেনদেন</h3>
          <button
            onClick={() => onSelectTab('transactions')}
            className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-0.5 cursor-pointer"
          >
            সব লেনদেন ({transactions.length})
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="text-center py-8 text-slate-400 dark:text-slate-500">
            <AlertCircle className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-1" />
            <div className="text-xs font-medium">এখনও কোনো লেনদেন নেই</div>
            <button
              onClick={() => onOpenQuickAdd?.('expense')}
              className="mt-3 px-3.5 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-medium shadow-sm cursor-pointer"
            >
              প্রথম লেনদেন যোগ করুন
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {recentTransactions.map(t => {
              const isIncome = t.type === 'income' || t.type === 'loan_repaid' || t.type === 'loan_borrowed';
              const isExpense = t.type === 'expense' || t.type === 'loan_given' || t.type === 'borrow_repaid';
              const acc = accMap.get(t.accountId);
              const isCategoryOverspent = isExpense && overspentCategorySet.has(t.categoryName);

              return (
                <div
                  key={t.id}
                  onClick={() => onEditTransaction(t)}
                  className="flex items-center justify-between py-2.5 px-1 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 rounded-xl transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                      isIncome ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400' :
                      isExpense ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}>
                      {isIncome ? '↓' : isExpense ? '↑' : '⇄'}
                    </div>

                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate flex items-center gap-1.5">
                        <span>{t.categoryName}</span>
                        {isCategoryOverspent && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 shrink-0">
                            <AlertTriangle className="w-2.5 h-2.5 text-rose-600 dark:text-rose-400 shrink-0" />
                            বাজেট অতিরিক্ত
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                        {t.date} • {acc?.name || 'ক্যাশ'}{t.note ? ` • ${t.note}` : ''}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className={`text-sm font-bold privacy-blur ${
                      isIncome ? 'text-emerald-700 dark:text-emerald-400' :
                      isExpense ? 'text-slate-900 dark:text-slate-100' : 'text-slate-700 dark:text-slate-300'
                    }`}>
                      {isIncome ? '+' : isExpense ? '-' : ''}৳{formatMoney(t.amount)}
                    </div>
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
