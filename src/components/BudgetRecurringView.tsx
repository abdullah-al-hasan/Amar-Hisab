import React, { useState, useMemo } from 'react';
import { 
  Plus, AlertTriangle, 
  Trash2, X 
} from 'lucide-react';
import { Category, Budget, RecurringTransaction, Transaction, Account } from '../types';
import { formatMoney, toBanglaDigits, formatBanglaMonthYear } from '../utils/accounting';
import { getLocalToday, generateId } from '../utils/storage';

interface BudgetRecurringViewProps {
  categories: Category[];
  budgets: Budget[];
  recurring?: RecurringTransaction[];
  transactions: Transaction[];
  accounts?: Account[];
  onSaveBudget: (budget: Budget) => void;
  onDeleteBudget: (id: string) => void;
  onSaveRecurring?: (rec: RecurringTransaction) => void;
  onDeleteRecurring?: (id: string) => void;
  onExecuteRecurring?: (rec: RecurringTransaction) => void;
}

export const BudgetRecurringView: React.FC<BudgetRecurringViewProps> = ({
  categories,
  budgets,
  transactions,
  onSaveBudget,
  onDeleteBudget,
}) => {
  const [currentMonth, setCurrentMonth] = useState(getLocalToday().slice(0, 7));

  // Budget Bottom Sheet State
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [budgetCategory, setBudgetCategory] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('');

  // Compute category spending for the selected month
  const categorySpending = useMemo(() => {
    const map = new Map<string, number>();
    transactions.forEach(t => {
      if (t.type === 'expense' && t.date.startsWith(currentMonth)) {
        const current = map.get(t.categoryName) || 0;
        map.set(t.categoryName, current + Number(t.amount || 0));
      }
    });
    return map;
  }, [transactions, currentMonth]);

  // Filter budgets for current month
  const currentMonthBudgets = useMemo(() => {
    return budgets.filter(b => b.month === currentMonth);
  }, [budgets, currentMonth]);

  // Total budget & total spent this month
  const { totalBudgetMonth, totalSpentMonth } = useMemo(() => {
    const totalB = currentMonthBudgets.reduce((acc, curr) => acc + curr.amount, 0);
    const totalS = currentMonthBudgets.reduce((acc, curr) => {
      const spent = categorySpending.get(curr.categoryName) || 0;
      return acc + spent;
    }, 0);
    return { totalBudgetMonth: totalB, totalSpentMonth: totalS };
  }, [currentMonthBudgets, categorySpending]);

  // Identify all overspent budgets for current month
  const { overspentBudgets, totalOverspent } = useMemo(() => {
    const exceededList = currentMonthBudgets
      .map(b => {
        const spent = categorySpending.get(b.categoryName) || 0;
        const overspent = spent - b.amount;
        const percent = Math.round((spent / b.amount) * 100);
        return {
          id: b.id,
          categoryName: b.categoryName,
          budgetAmount: b.amount,
          spent,
          overspent,
          percent,
        };
      })
      .filter(item => item.overspent > 0)
      .sort((a, b) => b.overspent - a.overspent);

    const sumOverspent = exceededList.reduce((acc, curr) => acc + curr.overspent, 0);

    return { overspentBudgets: exceededList, totalOverspent: sumOverspent };
  }, [currentMonthBudgets, categorySpending]);

  const expenseCategories = useMemo(() => {
    return categories.filter(c => c.type === 'expense' && !c.isArchived);
  }, [categories]);

  const handleSaveBudgetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(budgetAmount);
    if (!budgetCategory || amt <= 0) return;

    const existing = currentMonthBudgets.find(b => b.categoryName === budgetCategory);
    onSaveBudget({
      id: existing ? existing.id : generateId('bgt'),
      categoryName: budgetCategory,
      month: currentMonth,
      amount: amt,
    });

    setShowBudgetModal(false);
    setBudgetCategory('');
    setBudgetAmount('');
  };

  return (
    <div className="space-y-4 pb-24 fade-in">
      {/* 1. Month Selector & Action Bar */}
      <div className="bg-white dark:bg-[#111726] rounded-3xl p-4 sm:p-5 border border-slate-200/70 dark:border-slate-800/80 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex items-center justify-between gap-3 transition-colors">
        <div className="flex items-center gap-2">
          <div className="relative flex items-center bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-xl px-3 py-1.5 cursor-pointer">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              {formatBanglaMonthYear(currentMonth)}
            </span>
            <input
              type="month"
              value={currentMonth}
              onChange={e => {
                if (e.target.value) setCurrentMonth(e.target.value);
              }}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              title="বাজেটের মাস পরিবর্তন করুন"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setBudgetCategory(expenseCategories[0]?.name || 'খাবার / রেস্তোরাঁ');
            setBudgetAmount('');
            setShowBudgetModal(true);
          }}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-semibold shadow-xs cursor-pointer transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>বাজেট যোগ</span>
        </button>
      </div>

      {/* Month Overspend Warning Alert */}
      {overspentBudgets.length > 0 && (
        <div 
          id="budget-overspend-warning-alert"
          className="bg-rose-50/85 dark:bg-rose-950/25 rounded-3xl p-4 sm:p-5 border border-rose-200/80 dark:border-rose-900/60 shadow-[0_2px_12px_rgba(244,63,94,0.06)] space-y-2 transition-colors"
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-300 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <h4 className="text-xs font-bold text-rose-950 dark:text-rose-100">
                  বাজেট অতিরিক্ত ব্যয় সতর্কতা ({toBanglaDigits(overspentBudgets.length)}টি খাতে)
                </h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-200/70 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200">
                  সীমা অতিক্রম
                </span>
              </div>
              <p className="text-[11px] text-rose-700/90 dark:text-rose-300/80 mt-0.5 font-medium leading-relaxed">
                এই মাসে {overspentBudgets.map(b => b.categoryName).join(', ')} খাতে নির্ধারিত বাজেটের চেয়ে বেশি ব্যয় হয়েছে। মোট অতিরিক্ত খরচ: <strong className="font-bold">৳{formatMoney(totalOverspent)}</strong>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Budget List */}
      {currentMonthBudgets.length === 0 ? (
        <div className="bg-white dark:bg-[#111726] rounded-3xl p-8 sm:p-10 border border-slate-200/70 dark:border-slate-800/80 shadow-[0_2px_12px_rgba(0,0,0,0.02)] text-center space-y-2.5 transition-colors">
          <div className="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 flex items-center justify-center mx-auto text-lg">
            🎯
          </div>
          <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
            এই মাসে কোনো বাজেট নির্ধারণ করা নেই
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs mx-auto">
            খাবার, কেনাকাটা কিংবা অন্যান্য ব্যয়ের জন্য মাসিক খরচের সীমা নির্ধারণ করে হিসাবি হোন।
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Overall Month Summary Banner */}
          <div className="bg-slate-50/80 dark:bg-slate-900/60 rounded-2xl p-3.5 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium block">মোট বাজেট বরাদ্দ</span>
              <span className="font-bold text-slate-900 dark:text-slate-100 text-sm privacy-blur">৳{formatMoney(totalBudgetMonth)}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium block">মোট বাজেটভুক্ত খরচ</span>
              <span className={`font-bold text-sm privacy-blur ${totalSpentMonth > totalBudgetMonth ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'}`}>
                ৳{formatMoney(totalSpentMonth)}
              </span>
            </div>
          </div>

          {currentMonthBudgets.map(b => {
            const spent = categorySpending.get(b.categoryName) || 0;
            const remaining = b.amount - spent;
            const percent = Math.min(Math.round((spent / b.amount) * 100), 100);
            const exactPercent = Math.round((spent / b.amount) * 100);
            const isExceeded = spent > b.amount;
            const isNearLimit = !isExceeded && exactPercent >= 85;

            return (
              <div
                key={b.id}
                className={`bg-white dark:bg-[#111726] rounded-3xl p-4 sm:p-5 border shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-3 transition-colors ${
                  isExceeded
                    ? 'border-rose-300 dark:border-rose-900/80 bg-rose-50/20 dark:bg-rose-950/10'
                    : isNearLimit
                    ? 'border-amber-300 dark:border-amber-900/80 bg-amber-50/20 dark:bg-amber-950/10'
                    : 'border-slate-200/70 dark:border-slate-800/80'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {b.categoryName}
                      </h4>
                      {isExceeded && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-900/60 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800/80 shrink-0">
                          <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400 shrink-0" />
                          বাজেট অতিক্রম
                        </span>
                      )}
                      {isNearLimit && (
                        <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800 shrink-0">
                          সীমার কাছাকাছি
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                      বাজেট: <span className="font-semibold text-slate-700 dark:text-slate-300 privacy-blur">৳{formatMoney(b.amount)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className={`text-xs font-bold privacy-blur ${isExceeded ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'}`}>
                        ব্যয়: ৳{formatMoney(spent)}
                      </div>
                      <div className={`text-[10px] font-semibold privacy-blur ${isExceeded ? 'text-rose-600 dark:text-rose-400' : isNearLimit ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                        {isExceeded ? `অতিরিক্ত ৳${formatMoney(Math.abs(remaining))}` : `বাকি ৳${formatMoney(remaining)}`}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onDeleteBudget(b.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition-colors"
                      title="বাজেট মুছুন"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Progress Bar & Warning Indicator */}
                <div>
                  <div className="flex justify-between items-center text-[10px] font-medium mb-1.5">
                    <span className={isExceeded ? 'text-rose-600 dark:text-rose-400 font-bold' : isNearLimit ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-slate-500 dark:text-slate-400'}>
                      {toBanglaDigits(exactPercent)}% ব্যবহৃত
                    </span>
                    {isExceeded ? (
                      <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1 text-[10px]">
                        <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />
                        বাজেটের চেয়ে ৳{formatMoney(Math.abs(remaining))} অতিরিক্ত!
                      </span>
                    ) : isNearLimit ? (
                      <span className="text-amber-600 dark:text-amber-400 font-semibold">
                        বাজেট প্রায় শেষ
                      </span>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500">
                        বাকি ৳{formatMoney(remaining)}
                      </span>
                    )}
                  </div>
                  <div className={`h-2 rounded-full overflow-hidden relative ${
                    isExceeded 
                      ? 'bg-rose-100 dark:bg-rose-950/60 border border-rose-200/60 dark:border-rose-900/40' 
                      : 'bg-slate-100 dark:bg-slate-800'
                  }`}>
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isExceeded ? 'bg-rose-500 dark:bg-rose-600' : isNearLimit ? 'bg-amber-500' : 'bg-slate-900 dark:bg-slate-100'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 
        MODALS / BOTTOM SHEETS
      */}

      {/* Bottom Sheet: Add Budget */}
      {showBudgetModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white dark:bg-[#111726] w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200/80 dark:border-slate-800 animate-in slide-in-from-bottom duration-200 transition-colors">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">মাসিক বাজেট নির্ধারণ</h3>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  {formatBanglaMonthYear(currentMonth)} মাসের জন্য
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setShowBudgetModal(false)} 
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBudgetSubmit} className="space-y-3.5 mt-4">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">ক্যাটাগরি</label>
                <select
                  value={budgetCategory}
                  onChange={e => setBudgetCategory(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 text-slate-900 dark:text-slate-100 text-xs font-medium outline-none focus:border-slate-400 dark:focus:border-slate-600"
                >
                  {expenseCategories.map(c => (
                    <option key={c.id} value={c.name} className="dark:bg-[#111726]">{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">বাজেট সীমা (৳) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  autoFocus
                  value={budgetAmount}
                  onChange={e => setBudgetAmount(e.target.value)}
                  placeholder="যেমন: ৫০০০"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 text-base font-bold text-slate-900 dark:text-slate-100 outline-none focus:border-slate-400 dark:focus:border-slate-600"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowBudgetModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer transition-colors"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-semibold shadow-sm cursor-pointer transition-colors"
                >
                  সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
