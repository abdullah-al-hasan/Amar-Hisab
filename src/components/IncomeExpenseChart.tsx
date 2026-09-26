import React, { useState, useMemo, useEffect } from 'react';
import { TrendingUp, TrendingDown, Scale, Calendar, BarChart2 } from 'lucide-react';
import { Transaction } from '../types';
import { formatMoney } from '../utils/accounting';

interface IncomeExpenseChartProps {
  transactions: Transaction[];
  selectedMonth: string; // YYYY-MM
}

type TimeFrame = 'day' | 'week' | 'month';

interface ChartDataPoint {
  label: string;
  subLabel?: string;
  income: number;
  expense: number;
  diff: number; // income - expense
  isHigher: 'income' | 'expense' | 'equal';
}

const BANGLA_MONTHS = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

export const IncomeExpenseChart: React.FC<IncomeExpenseChartProps> = ({
  transactions,
  selectedMonth,
}) => {
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('day');

  // Compute dataset based on selected timeFrame
  const { dataPoints, totalIncome, totalExpense } = useMemo(() => {
    let pts: ChartDataPoint[] = [];
    let sumInc = 0;
    let sumExp = 0;

    if (timeFrame === 'day') {
      // Daily breakdown for the selected month
      const [yearStr, monthStr] = selectedMonth.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      // Number of days in selected month
      const daysInMonth = new Date(year, month, 0).getDate();

      const dailyMap = new Map<number, { income: number; expense: number }>();
      for (let d = 1; d <= daysInMonth; d++) {
        dailyMap.set(d, { income: 0, expense: 0 });
      }

      transactions.forEach(t => {
        if (t.date.startsWith(selectedMonth)) {
          const dayNum = parseInt(t.date.split('-')[2], 10);
          const amt = Number(t.amount || 0);
          const current = dailyMap.get(dayNum) || { income: 0, expense: 0 };
          if (t.type === 'income') {
            current.income += amt;
            sumInc += amt;
          } else if (t.type === 'expense') {
            current.expense += amt;
            sumExp += amt;
          }
          dailyMap.set(dayNum, current);
        }
      });

      pts = Array.from(dailyMap.entries()).map(([day, val]) => {
        const diff = val.income - val.expense;
        const isHigher = val.income > val.expense ? 'income' : val.expense > val.income ? 'expense' : 'equal';
        const monthBn = BANGLA_MONTHS[month - 1] || '';
        return {
          label: `${formatMoney(day)}`,
          subLabel: `${formatMoney(day)} ${monthBn}`,
          income: val.income,
          expense: val.expense,
          diff,
          isHigher,
        };
      });
    } else if (timeFrame === 'week') {
      // Weekly breakdown for the selected month (Weeks 1 to 5)
      const weekDefs = [
        { name: 'সপ্তাহ ১', range: '১-৭ তারিখ', start: 1, end: 7 },
        { name: 'সপ্তাহ ২', range: '৮-১৪ তারিখ', start: 8, end: 14 },
        { name: 'সপ্তাহ ৩', range: '১৫-২১ তারিখ', start: 15, end: 21 },
        { name: 'সপ্তাহ ৪', range: '২২-২৮ তারিখ', start: 22, end: 28 },
        { name: 'সপ্তাহ ৫', range: '২৯-শেষ তারিখ', start: 29, end: 31 },
      ];

      const weekMap = new Map<number, { income: number; expense: number }>();
      weekDefs.forEach((_, idx) => weekMap.set(idx, { income: 0, expense: 0 }));

      transactions.forEach(t => {
        if (t.date.startsWith(selectedMonth)) {
          const dayNum = parseInt(t.date.split('-')[2], 10);
          const amt = Number(t.amount || 0);
          let weekIdx = 0;
          if (dayNum >= 1 && dayNum <= 7) weekIdx = 0;
          else if (dayNum >= 8 && dayNum <= 14) weekIdx = 1;
          else if (dayNum >= 15 && dayNum <= 21) weekIdx = 2;
          else if (dayNum >= 22 && dayNum <= 28) weekIdx = 3;
          else weekIdx = 4;

          const current = weekMap.get(weekIdx) || { income: 0, expense: 0 };
          if (t.type === 'income') {
            current.income += amt;
            sumInc += amt;
          } else if (t.type === 'expense') {
            current.expense += amt;
            sumExp += amt;
          }
          weekMap.set(weekIdx, current);
        }
      });

      pts = weekDefs.map((def, idx) => {
        const val = weekMap.get(idx) || { income: 0, expense: 0 };
        const diff = val.income - val.expense;
        const isHigher = val.income > val.expense ? 'income' : val.expense > val.income ? 'expense' : 'equal';
        return {
          label: def.name,
          subLabel: `${def.name} (${def.range})`,
          income: val.income,
          expense: val.expense,
          diff,
          isHigher,
        };
      });
    } else {
      // Monthly breakdown: last 6 months leading up to selected month
      const [currYearStr, currMonthStr] = selectedMonth.split('-');
      const currYear = parseInt(currYearStr, 10);
      const currMonth = parseInt(currMonthStr, 10);

      const monthsList: { key: string; label: string }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(currYear, currMonth - 1 - i, 1);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const key = `${y}-${m}`;
        const label = BANGLA_MONTHS[d.getMonth()] || key;
        monthsList.push({ key, label });
      }

      const monthMap = new Map<string, { income: number; expense: number }>();
      monthsList.forEach(m => monthMap.set(m.key, { income: 0, expense: 0 }));

      transactions.forEach(t => {
        const ym = t.date.slice(0, 7);
        if (monthMap.has(ym)) {
          const amt = Number(t.amount || 0);
          const current = monthMap.get(ym)!;
          if (t.type === 'income') {
            current.income += amt;
            sumInc += amt;
          } else if (t.type === 'expense') {
            current.expense += amt;
            sumExp += amt;
          }
        }
      });

      pts = monthsList.map(m => {
        const val = monthMap.get(m.key) || { income: 0, expense: 0 };
        const diff = val.income - val.expense;
        const isHigher = val.income > val.expense ? 'income' : val.expense > val.income ? 'expense' : 'equal';
        return {
          label: m.label,
          subLabel: `${m.label} ${m.key.slice(0, 4)}`,
          income: val.income,
          expense: val.expense,
          diff,
          isHigher,
        };
      });
    }

    return { dataPoints: pts, totalIncome: sumInc, totalExpense: sumExp };
  }, [transactions, selectedMonth, timeFrame]);

  // Overall verdict for the active timeFrame
  const netDiff = totalIncome - totalExpense;
  const isOverallHigher =
    totalIncome > totalExpense ? 'income' : totalExpense > totalIncome ? 'expense' : 'equal';

  // Find max value across dataset to scale bar heights
  const maxVal = useMemo(() => {
    let max = 0;
    dataPoints.forEach(p => {
      if (p.income > max) max = p.income;
      if (p.expense > max) max = p.expense;
    });
    return max > 0 ? max : 1000;
  }, [dataPoints]);

  return (
    <section className="bg-white dark:bg-[#111726] rounded-3xl p-4 sm:p-5 border border-slate-200/70 dark:border-slate-800/80 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-4 transition-colors">
      {/* 1. Header & Controls: নামের সামনেই দিন, সপ্তাহ, মাস এটা থাকবে */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
          আয় বনাম খরচ
        </h3>

        {/* TimeFrame Toggle Buttons */}
        <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-900/80 rounded-2xl border border-slate-200/70 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setTimeFrame('day')}
            className={`px-3 py-1 rounded-xl text-xs font-semibold cursor-pointer transition-all duration-200 ${
              timeFrame === 'day'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            দিন
          </button>
          <button
            type="button"
            onClick={() => setTimeFrame('week')}
            className={`px-3 py-1 rounded-xl text-xs font-semibold cursor-pointer transition-all duration-200 ${
              timeFrame === 'week'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            সপ্তাহ
          </button>
          <button
            type="button"
            onClick={() => setTimeFrame('month')}
            className={`px-3 py-1 rounded-xl text-xs font-semibold cursor-pointer transition-all duration-200 ${
              timeFrame === 'month'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            মাস
          </button>
        </div>
      </div>

      {/* 2. Bar Chart Area */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-md bg-emerald-500 inline-block"></span>
              <span className="font-medium text-slate-700 dark:text-slate-300">আয়</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-md bg-rose-500 inline-block"></span>
              <span className="font-medium text-slate-700 dark:text-slate-300">ব্যয়</span>
            </div>
          </div>
          <span className="text-[10px]">
            বারের উচ্চতা আনুপাতিক
          </span>
        </div>

        {/* Scrollable Container for chart */}
        <div className="relative pt-6 pb-2 px-2 bg-slate-50/60 dark:bg-slate-900/40 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 overflow-x-auto">
          {/* Chart Bars */}
          <div
            className={`flex items-end gap-2 sm:gap-3 min-h-[160px] pb-6 pt-6 ${
              timeFrame === 'day' ? 'min-w-[640px]' : 'w-full justify-around'
            }`}
          >
            {dataPoints.map((point, index) => {
              const incomeHeight = maxVal > 0 && point.income > 0
                ? Math.max(8, Math.round((point.income / maxVal) * 110))
                : 2;
              const expenseHeight = maxVal > 0 && point.expense > 0
                ? Math.max(8, Math.round((point.expense / maxVal) * 110))
                : 2;

              const isZero = point.income === 0 && point.expense === 0;

              return (
                <div
                  key={index}
                  className="flex-1 flex flex-col items-center justify-end group relative"
                >
                  {/* Status Indicator Dot on Top */}
                  {!isZero && (
                    <div className="mb-1">
                      <span
                        className={`inline-block w-1.5 h-1.5 rounded-full ${
                          point.isHigher === 'income'
                            ? 'bg-emerald-500'
                            : point.isHigher === 'expense'
                            ? 'bg-rose-500'
                            : 'bg-slate-400'
                        }`}
                        title={
                          point.isHigher === 'income'
                            ? 'আয় বেশি'
                            : point.isHigher === 'expense'
                            ? 'খরচ বেশি'
                            : 'সমান'
                        }
                      />
                    </div>
                  )}

                  {/* Dual comparative bars */}
                  <div className="flex items-end gap-1 w-full justify-center h-[120px]">
                    {/* Income Bar */}
                    <div
                      className={`w-2.5 sm:w-3.5 rounded-t-md transition-all duration-300 ${
                        point.income > 0
                          ? 'bg-emerald-500 hover:bg-emerald-600 shadow-xs'
                          : 'bg-slate-200/50 dark:bg-slate-800/40'
                      }`}
                      style={{ height: `${incomeHeight}px` }}
                      title={`আয়: ৳${formatMoney(point.income)}`}
                    />

                    {/* Expense Bar */}
                    <div
                      className={`w-2.5 sm:w-3.5 rounded-t-md transition-all duration-300 ${
                        point.expense > 0
                          ? 'bg-rose-500 hover:bg-rose-600 shadow-xs'
                          : 'bg-slate-200/50 dark:bg-slate-800/40'
                      }`}
                      style={{ height: `${expenseHeight}px` }}
                      title={`খরচ: ৳${formatMoney(point.expense)}`}
                    />
                  </div>

                  {/* Axis Label */}
                  <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-2 truncate max-w-[60px] text-center">
                    {point.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
