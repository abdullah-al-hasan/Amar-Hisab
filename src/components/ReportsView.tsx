import React, { useState, useMemo, useRef } from 'react';
import { 
  Download, ArrowDownLeft, ArrowUpRight, 
  Wallet, Building2, Smartphone, ChevronLeft, ChevronRight,
  Loader2
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Account, Transaction, Person } from '../types';
import { 
  calculateFinancialMetrics, 
  formatMoney, 
  toBanglaDigits,
  formatBanglaDate, 
  formatBanglaMonthYear,
  BANGLA_MONTH_NAMES 
} from '../utils/accounting';
import { getLocalToday } from '../utils/storage';
import { IncomeExpenseChart } from './IncomeExpenseChart';

interface ReportsViewProps {
  transactions: Transaction[];
  accounts: Account[];
  persons: Person[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  transactions,
  accounts,
  persons,
}) => {
  const [selectedMonth, setSelectedMonth] = useState(getLocalToday().slice(0, 7));
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Month navigation handlers (Bengali friendly)
  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    const newMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(newMonth);
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const nextDate = new Date(y, m, 1);
    const newMonth = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(newMonth);
  };

  // Compute master financial metrics for selected month
  const metrics = useMemo(() => {
    return calculateFinancialMetrics(accounts, transactions, persons, selectedMonth);
  }, [accounts, transactions, persons, selectedMonth]);

  // খরচের খাত বিশ্লেষণ (কোন খাতে কতটি খরচ, কত টাকা, কত পার্সেন্ট)
  const expenseBreakdown = useMemo(() => {
    const map = new Map<string, { count: number; amount: number }>();
    let totalExp = 0;

    transactions.forEach(t => {
      if (t.type === 'expense' && t.date.startsWith(selectedMonth)) {
        const amt = Number(t.amount || 0);
        totalExp += amt;
        const current = map.get(t.categoryName) || { count: 0, amount: 0 };
        current.count += 1;
        current.amount += amt;
        map.set(t.categoryName, current);
      }
    });

    const list = Array.from(map.entries())
      .map(([name, data]) => ({
        name,
        count: data.count,
        amount: data.amount,
        percentage: totalExp > 0 ? Number(((data.amount / totalExp) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    return { 
      list, 
      totalExp, 
      totalCount: list.reduce((sum, item) => sum + item.count, 0) 
    };
  }, [transactions, selectedMonth]);

  // আয়ের উৎস বিশ্লেষণ (কোন উৎসে কতটি আয়, কত টাকা, কত পার্সেন্ট)
  const incomeBreakdown = useMemo(() => {
    const map = new Map<string, { count: number; amount: number }>();
    let totalInc = 0;

    transactions.forEach(t => {
      if (t.type === 'income' && t.date.startsWith(selectedMonth)) {
        const amt = Number(t.amount || 0);
        totalInc += amt;
        const current = map.get(t.categoryName) || { count: 0, amount: 0 };
        current.count += 1;
        current.amount += amt;
        map.set(t.categoryName, current);
      }
    });

    const list = Array.from(map.entries())
      .map(([name, data]) => ({
        name,
        count: data.count,
        amount: data.amount,
        percentage: totalInc > 0 ? Number(((data.amount / totalInc) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    return { 
      list, 
      totalInc, 
      totalCount: list.reduce((sum, item) => sum + item.count, 0) 
    };
  }, [transactions, selectedMonth]);

  // সবচেয়ে বড় ৫টি খরচ (মোট খরচের কত পার্সেন্ট, খাত, বিবরণ ও ধাপে ধাপে পার্সেন্টেজ)
  const top5Expenses = useMemo(() => {
    const expenseTx = transactions.filter(
      t => t.type === 'expense' && t.date.startsWith(selectedMonth)
    );
    // Sort descending by amount
    const sorted = [...expenseTx].sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0));
    const top5 = sorted.slice(0, 5);

    const totalExpense = expenseTx.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const top5Sum = top5.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const top5Percentage = totalExpense > 0 ? Number(((top5Sum / totalExpense) * 100).toFixed(1)) : 0;

    const items = top5.map((t, idx) => {
      const amt = Number(t.amount || 0);
      const pct = totalExpense > 0 ? Number(((amt / totalExpense) * 100).toFixed(1)) : 0;
      const account = accounts.find(a => a.id === t.accountId);
      return {
        rank: idx + 1,
        transaction: t,
        amount: amt,
        percentage: pct,
        categoryName: t.categoryName,
        note: t.note,
        date: t.date,
        accountName: account?.name || 'অ্যাকাউন্ট',
      };
    });

    return {
      items,
      top5Sum,
      totalExpense,
      top5Percentage,
      totalExpenseCount: expenseTx.length,
      hasExpenses: items.length > 0,
    };
  }, [transactions, selectedMonth, accounts]);

  // Account-wise statement (Opening, Inflow, Outflow, Closing)
  const accountStatements = useMemo(() => {
    return accounts.map(acc => {
      let income = 0;
      let expense = 0;
      let transferIn = 0;
      let transferOut = 0;
      let debtIn = 0;
      let debtOut = 0;

      transactions.forEach(t => {
        if (!t.date.startsWith(selectedMonth)) return;
        const amt = Number(t.amount || 0);
        const fee = Number(t.fee || 0);

        if (t.type === 'income' && t.accountId === acc.id) income += amt;
        else if (t.type === 'expense' && t.accountId === acc.id) expense += amt;
        else if (t.type === 'transfer') {
          if (t.accountId === acc.id) transferOut += (amt + fee);
          if (t.toAccountId === acc.id) transferIn += amt;
        } else if (t.type === 'loan_given' && t.accountId === acc.id) debtOut += amt;
        else if (t.type === 'loan_repaid' && t.accountId === acc.id) debtIn += amt;
        else if (t.type === 'loan_borrowed' && t.accountId === acc.id) debtIn += amt;
        else if (t.type === 'borrow_repaid' && t.accountId === acc.id) debtOut += amt;
      });

      const totalInflow = income + transferIn + debtIn;
      const totalOutflow = expense + transferOut + debtOut;
      const netChange = totalInflow - totalOutflow;

      // Current balance till now
      const currentBalance = metrics.accountBalances.find(b => b.account.id === acc.id)?.balance || 0;

      return {
        account: acc,
        openingBalance: acc.openingBalance,
        totalInflow,
        totalOutflow,
        netChange,
        currentBalance,
      };
    });
  }, [accounts, transactions, selectedMonth, metrics.accountBalances]);

  // Weekly chart data for custom PDF export (বর্তমান মাসের আয়-ব্যয় চার্ট)
  const weeklyChartData = useMemo(() => {
    const weekDefs = [
      { name: '১-৭ তারিখ', start: 1, end: 7 },
      { name: '৮-১৪ তারিখ', start: 8, end: 14 },
      { name: '১৫-২১ তারিখ', start: 15, end: 21 },
      { name: '২২-২৮ তারিখ', start: 22, end: 28 },
      { name: '২৯-৩১ তারিখ', start: 29, end: 31 },
    ];

    let maxAmount = 1000;
    const weeks = weekDefs.map(w => {
      let inc = 0;
      let exp = 0;
      transactions.forEach(t => {
        if (t.date.startsWith(selectedMonth)) {
          const day = parseInt(t.date.split('-')[2], 10);
          if (day >= w.start && day <= w.end) {
            const amt = Number(t.amount || 0);
            if (t.type === 'income') inc += amt;
            else if (t.type === 'expense') exp += amt;
          }
        }
      });
      if (inc > maxAmount) maxAmount = inc;
      if (exp > maxAmount) maxAmount = exp;
      return { name: w.name, label: w.name, income: inc, expense: exp };
    });

    return { weeks, maxAmount };
  }, [transactions, selectedMonth]);

  // Income vs Expense percentage for PDF presentation
  const { pdfIncomePercent, pdfExpensePercent } = useMemo(() => {
    const totalFlow = metrics.totalIncome + metrics.totalExpense;
    if (totalFlow <= 0) return { pdfIncomePercent: 0, pdfExpensePercent: 0 };
    const incPct = Math.round((metrics.totalIncome / totalFlow) * 100);
    return { pdfIncomePercent: incPct, pdfExpensePercent: 100 - incPct };
  }, [metrics.totalIncome, metrics.totalExpense]);

  // Account type icon helper (Matching Home Menu Style)
  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'bank': return <Building2 className="w-4 h-4 text-blue-500" />;
      case 'mfs': return <Smartphone className="w-4 h-4 text-rose-500" />;
      default: return <Wallet className="w-4 h-4 text-emerald-500" />;
    }
  };

  const getAccountTypeLabel = (type: string) => {
    switch (type) {
      case 'bank': return 'ব্যাংক';
      case 'mfs': return 'মোবাইল ব্যাংকিং';
      default: return 'ক্যাশ';
    }
  };

  // Comprehensive Report Download Handler
  const handleDownloadFullReport = () => {
    const lines: string[] = [];
    
    // Header
    lines.push(`আমার হিসাব — পূর্ণাঙ্গ আর্থিক প্রতিবেদন (${selectedMonth})`);
    lines.push(`প্রতিবেদন তৈরির তারিখ:,${getLocalToday()}`);
    lines.push('');

    // ১. সার্বিক আর্থিক অবস্থা
    lines.push('--- ১. সার্বিক আর্থিক অবস্থা ---');
    lines.push(`মোট বর্তমান ব্যালেন্স (তরল সম্পদ):,৳${metrics.totalLiquidAssets}`);
    lines.push(`মোট পাওনা (আমি পাব):,৳${metrics.totalReceivable}`);
    lines.push(`মোট দেনা (আমি দেব):,৳${metrics.totalPayable}`);
    lines.push(`নিট সম্পদ:,৳${metrics.netWorth}`);
    lines.push('');

    // ২. মাসিক আর্থিক সারাংশ
    lines.push(`--- ২. মাসিক আর্থিক সারাংশ (${selectedMonth}) ---`);
    lines.push(`এই মাসের মোট আয়:,৳${metrics.totalIncome}`);
    lines.push(`এই মাসের মোট ব্যয়:,৳${metrics.totalExpense}`);
    lines.push(`নিট ক্যাশ ফ্লো:,৳${metrics.netCashFlow}`);
    lines.push('');

    // ৩. সকল ওয়ালেট বিবরণী
    lines.push('--- ৩. সকল ওয়ালেট বিবরণী ---');
    lines.push('ওয়ালেট নাম,ধরণ,প্রারম্ভিক ব্যালেন্স,এই মাসের ইনফ্লো,এই মাসের আউটফ্লো,বর্তমান স্থিতি');
    accountStatements.forEach(st => {
      lines.push(`"${st.account.name}",${getAccountTypeLabel(st.account.type)},৳${st.openingBalance},৳${st.totalInflow},৳${st.totalOutflow},৳${st.currentBalance}`);
    });
    lines.push('');

    // ৪. খরচের খাত
    lines.push('--- ৪. খরচের খাত ---');
    lines.push('খাতের নাম,খরচের সংখ্যা,টাকার পরিমাণ,মোট খরচের শতকরা হার (%)');
    expenseBreakdown.list.forEach(item => {
      lines.push(`"${item.name}",${item.count},৳${item.amount},${item.percentage}%`);
    });
    lines.push(`মোট ব্যয়:,,৳${expenseBreakdown.totalExp},100%`);
    lines.push('');

    // ৫. আয়ের উৎস
    lines.push('--- ৫. আয়ের উৎস ---');
    lines.push('উৎসের নাম,আয়ের সংখ্যা,টাকার পরিমাণ,মোট আয়ের শতকরা হার (%)');
    incomeBreakdown.list.forEach(item => {
      lines.push(`"${item.name}",${item.count},৳${item.amount},${item.percentage}%`);
    });
    lines.push(`মোট আয়:,,৳${incomeBreakdown.totalInc},100%`);
    lines.push('');

    // ৬. সবচেয়ে বড় ৫টি খরচ
    lines.push('--- ৬. সবচেয়ে বড় ৫টি খরচ ---');
    lines.push('ক্রমিক,খাত,বিবরণ/নোট,টাকার পরিমাণ,মোট খরচের %,তারিখ,ওয়ালেট');
    top5Expenses.items.forEach(item => {
      lines.push(`#${item.rank},"${item.categoryName}","${item.note || ''}",৳${item.amount},${item.percentage}%,${item.date},"${item.accountName}"`);
    });
    lines.push('');

    // ৭. বিস্তারিত লেনদেন তালিকা
    lines.push(`--- ৭. এই মাসের সকল লেনদেনের তালিকা (${selectedMonth}) ---`);
    lines.push('তারিখ,ধরণ,খাত/উৎস,পরিমাণ,ওয়ালেট,নোট/বিবরণ');
    const monthTx = transactions
      .filter(t => t.date.startsWith(selectedMonth))
      .sort((a, b) => b.date.localeCompare(a.date));
    monthTx.forEach(t => {
      const acc = accounts.find(a => a.id === t.accountId);
      const typeLabel = t.type === 'expense' ? 'খরচ' : t.type === 'income' ? 'আয়' : t.type === 'transfer' ? 'ট্রান্সফার' : 'ধার-দেনা';
      lines.push(`${t.date},${typeLabel},"${t.categoryName}",৳${t.amount},"${acc?.name || ''}","${t.note || ''}"`);
    });

    // UTF-8 BOM for Bangla characters compatibility in Excel
    const csvContent = '\uFEFF' + lines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `amar-hisab-report-${selectedMonth}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Real High-Quality Multi-Page A4 PDF Report Download Handler
  const handleDownloadPdfReport = async () => {
    if (!printRef.current) return;
    setIsGeneratingPdf(true);
    try {
      const container = printRef.current;
      const pageElements = container.querySelectorAll<HTMLElement>('.pdf-page-container');

      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      if (pageElements.length > 0) {
        for (let i = 0; i < pageElements.length; i++) {
          const pageEl = pageElements[i];
          const canvas = await html2canvas(pageEl, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false,
            windowWidth: 794,
          });

          const imgData = canvas.toDataURL('image/jpeg', 0.96);
          if (i > 0) {
            pdf.addPage();
          }
          pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
        }
      } else {
        const canvas = await html2canvas(container, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
          windowWidth: 794,
        });
        const imgData = canvas.toDataURL('image/jpeg', 0.96);
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      }

      const monthName = formatBanglaMonthYear(selectedMonth).replace(/\s+/g, '-');
      pdf.save(`আমার-হিসাব-প্রতিবেদন-${monthName}.pdf`);
    } catch (err) {
      console.error('PDF generation error:', err);
      // Fallback: download CSV report
      handleDownloadFullReport();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-4 pb-20 fade-in">
      {/* 
        ১. মোট বর্তমান ব্যালেন্স ও মোট পাওনা/দেনা
        - ব্যালেন্সের নিচে কোনো বাড়তি লেখা নেই
        - মোট পাওনা ও মোট দেনার নিচে বর্তমান মাসের আয় ও বর্তমান মাসের ব্যয়
      */}
      <section className="bg-white dark:bg-[#111726] rounded-3xl p-5 sm:p-6 border border-slate-200/70 dark:border-slate-800/80 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-4 transition-colors">
        {/* মোট বর্তমান ব্যালেন্স */}
        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              মোট বর্তমান ব্যালেন্স
            </span>
            <span className="text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium px-2.5 py-0.5 rounded-full">
              সকল ওয়ালেট
            </span>
          </div>

          <div className="mt-2 flex items-baseline gap-1.5 privacy-blur">
            <span className="text-slate-400 dark:text-slate-500 text-2xl font-bold">৳</span>
            <span className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              {formatMoney(metrics.totalLiquidAssets)}
            </span>
          </div>
        </div>

        {/* মোট পাওনা ও মোট দেনা */}
        <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800/80">
          <div className="bg-slate-50/70 dark:bg-slate-900/50 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/60 transition-colors">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
              <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              মোট পাওনা
            </div>
            <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-1 privacy-blur">
              +৳{formatMoney(metrics.totalReceivable)}
            </div>
          </div>

          <div className="bg-slate-50/70 dark:bg-slate-900/50 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/60 transition-colors">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              মোট দেনা
            </div>
            <div className="text-base font-bold text-rose-600 dark:text-rose-400 mt-1 privacy-blur">
              -৳{formatMoney(metrics.totalPayable)}
            </div>
          </div>
        </div>

        {/* ৪. মোট পাওনা ও মোট দেনার নিচে বর্তমান মাসের আয় ও বর্তমান মাসের ব্যয় */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <div className="bg-emerald-50/60 dark:bg-emerald-950/20 hover:bg-emerald-50/80 dark:hover:bg-emerald-950/30 p-3 rounded-2xl border border-emerald-100/70 dark:border-emerald-900/40 transition-colors">
            <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1">
              <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              বর্তমান মাসের আয়
            </div>
            <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-1 privacy-blur">
              +৳{formatMoney(metrics.totalIncome)}
            </div>
          </div>

          <div className="bg-rose-50/60 dark:bg-rose-950/20 hover:bg-rose-50/80 dark:hover:bg-rose-950/30 p-3 rounded-2xl border border-rose-100/70 dark:border-rose-900/40 transition-colors">
            <div className="text-[11px] text-rose-700 dark:text-rose-400 font-medium flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              বর্তমান মাসের ব্যয়
            </div>
            <div className="text-base font-bold text-rose-600 dark:text-rose-400 mt-1 privacy-blur">
              -৳{formatMoney(metrics.totalExpense)}
            </div>
          </div>
        </div>
      </section>

      {/* 
        ২. মাসের রিপোর্ট ও ডাউনলোড অপশন
        - আগে যেমন ছিল ঠিক তেমনই
        - মাস ও বছর ইংরেজিতে বদলে এখন বাংলায় শো হবে
        - রিপোর্ট ডাউনলোডে আগে এক্সেল ডাউনলোড হতো, এখন পিডিএফ ফরম্যাটে ডাউনলোড হবে
      */}
      <section className="bg-white dark:bg-[#111726] rounded-3xl p-4 sm:p-5 border border-slate-200/70 dark:border-slate-800/80 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-3 transition-colors">
        <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
          মাসের রিপোর্ট
        </h3>

        <div className="flex items-center justify-between gap-3">
          {/* মাসের ইনপুট: আগে ইংরেজিতে শো হতো, এখন একই ইনপুট ডিজাইনে বাংলায় শো হবে */}
          <div className="relative flex items-center bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-xl h-9 px-1.5 flex-1 sm:flex-initial">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors z-10 cursor-pointer"
              title="পূর্ববর্তী মাস"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <div className="relative px-2 flex items-center cursor-pointer">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 tracking-tight whitespace-nowrap">
                {formatBanglaMonthYear(selectedMonth)}
              </span>
              <input
                id="report-month-input"
                type="month"
                value={selectedMonth}
                onChange={e => {
                  if (e.target.value) setSelectedMonth(e.target.value);
                }}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                title="মাস ও বছর পরিবর্তন করুন"
              />
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors z-10 cursor-pointer"
              title="পরবর্তী মাস"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* কাস্টম পিডিএফ ডাউনলোড বাটন: আর্থিক সারাংশ, চার্ট ও ব্যালেন্স সহ ডাউনলোড */}
          <button
            type="button"
            onClick={handleDownloadPdfReport}
            disabled={isGeneratingPdf}
            className="h-9 px-3.5 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm shrink-0 disabled:opacity-70 active:scale-95"
            title="বর্তমান মাসের আর্থিক সারাংশ, আয়-ব্যয় চার্ট ও অ্যাকাউন্ট ব্যালেন্স সহ পিডিএফ ডাউনলোড করুন"
          >
            {isGeneratingPdf ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                <span>পিডিএফ তৈরি হচ্ছে...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span>রিপোর্ট ডাউনলোড</span>
              </>
            )}
          </button>
        </div>
      </section>

      {/* 
        ৩. মাসিক আর্থিক সারাংশ
        - বছর ও মাসের সংখ্যা সম্পূর্ণ বাংলায়
      */}
      <section className="bg-white dark:bg-[#111726] rounded-3xl p-4 sm:p-5 border border-slate-200/70 dark:border-slate-800/80 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-3 transition-colors">
        <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
          মাসিক আর্থিক সারাংশ ({formatBanglaMonthYear(selectedMonth)})
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-slate-50/70 dark:bg-slate-900/50 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 rounded-2xl p-3 border border-slate-100 dark:border-slate-800/60 transition-colors">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
              <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              মোট আয়
            </div>
            <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-1 privacy-blur">
              +৳{formatMoney(metrics.totalIncome)}
            </div>
          </div>

          <div className="bg-slate-50/70 dark:bg-slate-900/50 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 rounded-2xl p-3 border border-slate-100 dark:border-slate-800/60 transition-colors">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
              <ArrowUpRight className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              মোট ব্যয়
            </div>
            <div className="text-base font-bold text-rose-600 dark:text-rose-400 mt-1 privacy-blur">
              -৳{formatMoney(metrics.totalExpense)}
            </div>
          </div>

          {/* নিট ক্যাশ ফ্লো (আইকন ছাড়া) */}
          <div className="bg-slate-50/70 dark:bg-slate-900/50 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 rounded-2xl p-3 border border-slate-100 dark:border-slate-800/60 transition-colors">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              নিট ক্যাশ ফ্লো
            </div>
            <div className={`text-base font-bold mt-1 privacy-blur ${
              metrics.netCashFlow > 0 
                ? 'text-emerald-600 dark:text-emerald-400' 
                : metrics.netCashFlow < 0 
                ? 'text-rose-600 dark:text-rose-400' 
                : 'text-slate-900 dark:text-slate-100'
            }`}>
              {metrics.netCashFlow > 0 ? '+৳' : metrics.netCashFlow < 0 ? '-৳' : '৳'}{formatMoney(Math.abs(metrics.netCashFlow))}
            </div>
          </div>

          {/* নিট সম্পদ (আইকন ছাড়া) */}
          <div className="bg-slate-50/70 dark:bg-slate-900/50 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 rounded-2xl p-3 border border-slate-100 dark:border-slate-800/60 transition-colors">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              নিট সম্পদ
            </div>
            <div className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1 privacy-blur">
              ৳{formatMoney(metrics.netWorth)}
            </div>
          </div>
        </div>
      </section>

      {/* 
        ৪. সকল ওয়ালেট (অন্যান্য সেকশনের মতো মূল কার্ডের মধ্যে আবদ্ধ)
        - টাইটেলে কোনো আইকন নেই
        - হোম মেন্যুর মতো ছোট কার্ড করে ২টা ওয়ালেট পাশাপাশি (grid-cols-2)
        - বর্তমান ব্যালেন্স বামে এবং প্রারম্ভিক এমাউন্ট ডানে
      */}
      <section className="bg-white dark:bg-[#111726] rounded-3xl p-4 sm:p-5 border border-slate-200/70 dark:border-slate-800/80 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-3 transition-colors">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
            সকল ওয়ালেট
          </h3>
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            {formatMoney(accounts.length)}টি ওয়ালেট
          </span>
        </div>

        {/* ২টা ওয়ালেট পাশাপাশি গ্রিড */}
        <div className="grid grid-cols-2 gap-2.5">
          {accountStatements.map(st => (
            <div
              key={st.account.id}
              className="bg-slate-50/70 dark:bg-slate-900/50 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 border border-slate-100 dark:border-slate-800/60 rounded-2xl p-3 sm:p-3.5 transition-all space-y-2.5"
            >
              {/* Account header: icon & name */}
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200/50 dark:border-slate-700/50">
                  {getAccountIcon(st.account.type)}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                    {st.account.name}
                  </div>
                  <div className="text-[9.5px] text-slate-400 dark:text-slate-500">
                    {getAccountTypeLabel(st.account.type)}
                  </div>
                </div>
              </div>

              {/* Balance Row: ব্যালেন্স (বামে) এবং এমাউন্ট (ডানে) */}
              <div className="flex items-center justify-between gap-2 pt-0.5">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  ব্যালেন্স
                </span>
                <span className={`text-sm sm:text-base font-bold tracking-tight privacy-blur ${
                  st.currentBalance >= 0 ? 'text-slate-900 dark:text-slate-100' : 'text-rose-600 dark:text-rose-400'
                }`}>
                  ৳{formatMoney(st.currentBalance)}
                </span>
              </div>

              {/* Monthly Inflow & Outflow Mini Pills */}
              <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-slate-200/60 dark:border-slate-800/80">
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 privacy-blur">
                  +{formatMoney(st.totalInflow)}
                </span>
                <span className="font-semibold text-rose-600 dark:text-rose-400 privacy-blur">
                  -{formatMoney(st.totalOutflow)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 
        ৫. আয় বনাম খরচ
        - টাইটেল আইকন নেই
        - নামের সামনেই দিন, সপ্তাহ, মাস
        - এরপর চার্ট
        - বাড়তি কোনো লেখা নেই
      */}
      <IncomeExpenseChart
        transactions={transactions}
        selectedMonth={selectedMonth}
      />

      {/* 
        ৬. খরচের খাত
        - টাইটেল আইকন নেই
        - 'ভিত্তিক বিশ্লেষণ' লেখা নেই
        - নিচে কোনো বাড়তি লেখা নেই
      */}
      <section className="bg-white dark:bg-[#111726] rounded-3xl p-4 sm:p-5 border border-slate-200/70 dark:border-slate-800/80 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-3.5 transition-colors">
        <div className="flex items-center justify-between gap-1.5">
          <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
            খরচের খাত
          </h3>

          <div className="flex items-center gap-1.5">
            <span className="text-[10.5px] px-2.5 py-0.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/50 font-bold text-rose-700 dark:text-rose-300">
              মোট: <span className="privacy-blur font-bold">৳{formatMoney(expenseBreakdown.totalExp)}</span>
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">
              ({formatMoney(expenseBreakdown.totalCount)}টি)
            </span>
          </div>
        </div>

        {expenseBreakdown.list.length === 0 ? (
          <div className="text-center py-6 text-slate-400 dark:text-slate-500 text-xs">
            এই মাসে কোনো খরচ লিপিবদ্ধ করা হয়নি
          </div>
        ) : (
          <div className="space-y-3 divide-y divide-slate-100 dark:divide-slate-800/80">
            {expenseBreakdown.list.map(item => (
              <div key={item.name} className="pt-2.5 first:pt-0 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {item.name}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium">
                      {formatMoney(item.count)}টি
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10.5px] font-bold px-1.5 py-0.5 rounded-md bg-rose-100/70 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300">
                      {item.percentage}%
                    </span>
                    <span className="font-bold text-slate-900 dark:text-slate-100 text-xs privacy-blur">
                      ৳{formatMoney(item.amount)}
                    </span>
                  </div>
                </div>

                {/* Percentage Progress Bar */}
                <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800/90 overflow-hidden">
                  <div
                    className="h-full bg-rose-500 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(1, item.percentage))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 
        ৭. আয়ের উৎস
        - টাইটেল আইকন নেই
        - 'ভিত্তিক বিশ্লেষণ' লেখা নেই
        - নিচে কোনো বাড়তি লেখা নেই
      */}
      <section className="bg-white dark:bg-[#111726] rounded-3xl p-4 sm:p-5 border border-slate-200/70 dark:border-slate-800/80 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-3.5 transition-colors">
        <div className="flex items-center justify-between gap-1.5">
          <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
            আয়ের উৎস
          </h3>

          <div className="flex items-center gap-1.5">
            <span className="text-[10.5px] px-2.5 py-0.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900/50 font-bold text-emerald-700 dark:text-emerald-300">
              মোট: <span className="privacy-blur font-bold">৳{formatMoney(incomeBreakdown.totalInc)}</span>
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">
              ({formatMoney(incomeBreakdown.totalCount)}টি)
            </span>
          </div>
        </div>

        {incomeBreakdown.list.length === 0 ? (
          <div className="text-center py-6 text-slate-400 dark:text-slate-500 text-xs">
            এই মাসে কোনো আয় লিপিবদ্ধ করা হয়নি
          </div>
        ) : (
          <div className="space-y-3 divide-y divide-slate-100 dark:divide-slate-800/80">
            {incomeBreakdown.list.map(item => (
              <div key={item.name} className="pt-2.5 first:pt-0 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {item.name}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium">
                      {formatMoney(item.count)}টি
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10.5px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100/70 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
                      {item.percentage}%
                    </span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs privacy-blur">
                      +৳{formatMoney(item.amount)}
                    </span>
                  </div>
                </div>

                {/* Percentage Progress Bar */}
                <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800/90 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(1, item.percentage))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 
        ৮. সবচেয়ে বড় ৫টি খরচ
        - টাইটেল আইকন নেই
        - নিচে কোনো বাড়তি লেখা নেই
      */}
      <section className="bg-white dark:bg-[#111726] rounded-3xl p-4 sm:p-5 border border-slate-200/70 dark:border-slate-800/80 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-3.5 transition-colors">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
            সবচেয়ে বড় ৫টি খরচ
          </h3>

          {top5Expenses.hasExpenses && (
            <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/50">
              মোট খরচের {top5Expenses.top5Percentage}%
            </span>
          )}
        </div>

        {!top5Expenses.hasExpenses ? (
          <div className="text-center py-6 text-slate-400 dark:text-slate-500 text-xs">
            এই মাসে কোনো খরচ রেকর্ড করা হয়নি
          </div>
        ) : (
          <div className="space-y-3.5">
            {/* Top 5 Share Hero Meter */}
            <div className="p-3 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-amber-900 dark:text-amber-200">
                  শীর্ষ ৫টি খরচ মোট খরচের {top5Expenses.top5Percentage}%
                </span>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  <span className="privacy-blur">৳{formatMoney(top5Expenses.top5Sum)}</span> <span className="text-[10px] text-slate-400 font-normal">/ <span className="privacy-blur">৳{formatMoney(top5Expenses.totalExpense)}</span></span>
                </span>
              </div>

              {/* Distribution visual bar */}
              <div className="h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex">
                <div
                  className="h-full bg-amber-500 transition-all duration-300"
                  style={{ width: `${top5Expenses.top5Percentage}%` }}
                />
                <div
                  className="h-full bg-slate-300 dark:bg-slate-700 transition-all duration-300"
                  style={{ width: `${100 - top5Expenses.top5Percentage}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
                  শীর্ষ ৫টি ({top5Expenses.top5Percentage}%)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-slate-400 inline-block"></span>
                  অন্যান্য ({(100 - top5Expenses.top5Percentage).toFixed(1)}%)
                </span>
              </div>
            </div>

            {/* Step-by-Step Ranked List (ধাপে ধাপে শো হবে) */}
            <div className="space-y-2.5">
              {top5Expenses.items.map(item => (
                <div
                  key={item.transaction.id}
                  className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 space-y-2 hover:border-amber-300/80 dark:hover:border-amber-800/80 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      {/* Step Rank Badge */}
                      <span
                        className={`w-5 h-5 rounded-md text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5 ${
                          item.rank === 1
                            ? 'bg-amber-500 text-white'
                            : item.rank === 2
                            ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                            : item.rank === 3
                            ? 'bg-rose-500 text-white'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        #{formatMoney(item.rank)}
                      </span>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            {item.categoryName}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-rose-100/70 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 font-bold">
                            মোট খরচের {item.percentage}%
                          </span>
                        </div>

                        {item.note && (
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-1">
                            {item.note}
                          </p>
                        )}

                        <div className="flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                          <span>{formatBanglaDate(item.date)}</span>
                          <span>•</span>
                          <span>{item.accountName}</span>
                        </div>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="text-right shrink-0">
                      <div className="text-sm sm:text-base font-black text-rose-600 dark:text-rose-400 privacy-blur">
                        ৳{formatMoney(item.amount)}
                      </div>
                    </div>
                  </div>

                  {/* Relative Single Item Progress Bar */}
                  <div className="h-1 rounded-full bg-slate-200/80 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        item.rank === 1
                          ? 'bg-amber-500'
                          : item.rank === 2
                          ? 'bg-rose-500'
                          : 'bg-slate-700 dark:bg-slate-400'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(2, item.percentage))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 
        অফ-স্ক্রিন প্রিন্ট / পিডিএফ টেমপ্লেট
        - মিনিমাল, মার্জিত ও পরিচ্ছন্ন ডিজাইন (কোনো ভারী বক্স, কার্ড বা শেইপ ছাড়া)
        - লোগো বাদ দেওয়া হয়েছে
        - নিচে বামপাশে ফুটনোট: Amar Hisab developed by Abdullah Al Hasan
        - স্ট্যান্ডার্ড A4 পোর্ট্রেট সাইজ (৭৯৪ × ১১২৩ পিক্সেল)
      */}
      <div 
        ref={printRef}
        style={{
          position: 'fixed',
          left: '-9999px',
          top: '0',
          zIndex: -100,
        }}
      >
        <div 
          className="pdf-page-container"
          style={{
            width: '794px',
            height: '1123px',
            boxSizing: 'border-box',
            padding: '48px 52px 36px 52px',
            backgroundColor: '#ffffff',
            color: '#0f172a',
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            overflow: 'hidden'
          }}
        >
          <div>
            {/* ডকুমেন্ট হেডার (লোগো ছাড়া, একদম মিনিমাল) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1.5px solid #0f172a', paddingBottom: '12px', marginBottom: '22px' }}>
              <div>
                <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '900', color: '#0f172a', letterSpacing: '-0.4px', lineHeight: '1.2' }}>
                  আমার হিসাব
                </h1>
                <p style={{ margin: '3px 0 0 0', fontSize: '11px', color: '#64748b', fontWeight: '500' }}>
                  মাসিক আর্থিক বিবরণী • {formatBanglaMonthYear(selectedMonth)}
                </p>
              </div>

              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: 0, fontSize: '10.5px', color: '#64748b' }}>
                  তারিখ: {formatBanglaDate(getLocalToday())}
                </p>
              </div>
            </div>

            {/* ১. আর্থিক সারসংক্ষেপ (মিনিমাল টেক্সট গ্রিড, কোনো বক্স বা শেপ ছাড়া) */}
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '11px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.6px' }}>
                ১. আর্থিক সারসংক্ষেপ
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
                <div>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>মোট বর্তমান ব্যালেন্স</div>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>
                    ৳{formatMoney(metrics.totalLiquidAssets)}
                  </div>
                  <div style={{ fontSize: '9.5px', color: '#94a3b8', marginTop: '2px' }}>
                    নিট সম্পদ: ৳{formatMoney(metrics.netWorth)}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>চলতি মাসের মোট আয়</div>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: '#16a34a', marginTop: '2px' }}>
                    +৳{formatMoney(metrics.totalIncome)}
                  </div>
                  <div style={{ fontSize: '9.5px', color: '#94a3b8', marginTop: '2px' }}>
                    মোট পাওনা: +৳{formatMoney(metrics.totalReceivable)}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>চলতি মাসের মোট ব্যয়</div>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: '#e11d48', marginTop: '2px' }}>
                    -৳{formatMoney(metrics.totalExpense)}
                  </div>
                  <div style={{ fontSize: '9.5px', color: '#94a3b8', marginTop: '2px' }}>
                    মোট দেনা: -৳{formatMoney(metrics.totalPayable)}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>নিট ক্যাশ ফ্লো</div>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: metrics.netCashFlow >= 0 ? '#16a34a' : '#e11d48', marginTop: '2px' }}>
                    {metrics.netCashFlow >= 0 ? '+৳' : '-৳'}{formatMoney(Math.abs(metrics.netCashFlow))}
                  </div>
                  <div style={{ fontSize: '9.5px', color: '#94a3b8', marginTop: '2px' }}>
                    {metrics.netCashFlow >= 0 ? 'উদ্বৃত্ত সঞ্চয়' : 'মাসিক ঘাটতি'}
                  </div>
                </div>
              </div>
            </div>

            {/* ২. অ্যাকাউন্ট ও ওয়ালেট স্থিতি */}
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '11px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.6px' }}>
                ২. অ্যাকাউন্ট ও ওয়ালেট স্থিতি
              </h2>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1.5px solid #0f172a' }}>
                    <th style={{ padding: '6px 0', fontWeight: '700', color: '#475569' }}>ওয়ালেট / ব্যাংক</th>
                    <th style={{ padding: '6px 0', fontWeight: '700', color: '#475569' }}>ধরণ</th>
                    <th style={{ padding: '6px 0', fontWeight: '700', color: '#475569', textAlign: 'right' }}>চলতি মাসে জমা (+)</th>
                    <th style={{ padding: '6px 0', fontWeight: '700', color: '#475569', textAlign: 'right' }}>চলতি মাসে খরচ (-)</th>
                    <th style={{ padding: '6px 0', fontWeight: '700', color: '#475569', textAlign: 'right' }}>ব্যালেন্স</th>
                  </tr>
                </thead>
                <tbody>
                  {accountStatements.map((stmt) => (
                    <tr key={stmt.account.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '5px 0', fontWeight: '600' }}>{stmt.account.name}</td>
                      <td style={{ padding: '5px 0', color: '#64748b' }}>
                        {stmt.account.type === 'cash' ? 'ক্যাশ' : stmt.account.type === 'bank' ? 'ব্যাংক' : 'মোবাইল ব্যাংকিং'}
                      </td>
                      <td style={{ padding: '5px 0', textAlign: 'right', color: '#16a34a' }}>+৳{formatMoney(stmt.totalInflow)}</td>
                      <td style={{ padding: '5px 0', textAlign: 'right', color: '#e11d48' }}>-৳{formatMoney(stmt.totalOutflow)}</td>
                      <td style={{ padding: '5px 0', textAlign: 'right', fontWeight: '700', color: '#0f172a' }}>৳{formatMoney(stmt.currentBalance)}</td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: '1.5px solid #0f172a' }}>
                    <td colSpan={4} style={{ padding: '6px 0', fontWeight: '700', textAlign: 'right', color: '#0f172a' }}>
                      মোট বর্তমান তরল ব্যালেন্স:
                    </td>
                    <td style={{ padding: '6px 0', fontWeight: '800', textAlign: 'right', color: '#0f172a' }}>
                      ৳{formatMoney(metrics.totalLiquidAssets)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* ৩. প্রধান ব্যয়ের খাতসমূহ */}
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '11px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.6px' }}>
                ৩. প্রধান ব্যয়ের খাতসমূহ
              </h2>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1.5px solid #0f172a' }}>
                    <th style={{ padding: '6px 0', fontWeight: '700', color: '#475569', width: '32px' }}>ক্রম</th>
                    <th style={{ padding: '6px 0', fontWeight: '700', color: '#475569' }}>খাতের নাম</th>
                    <th style={{ padding: '6px 0', fontWeight: '700', color: '#475569', textAlign: 'center' }}>লেনদেন সংখ্যা</th>
                    <th style={{ padding: '6px 0', fontWeight: '700', color: '#475569', textAlign: 'right' }}>মোট ব্যয়</th>
                    <th style={{ padding: '6px 0', fontWeight: '700', color: '#475569', textAlign: 'right' }}>শতকরা হার</th>
                  </tr>
                </thead>
                <tbody>
                  {expenseBreakdown.list.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '8px 0', color: '#94a3b8', textAlign: 'center' }}>
                        এই মাসে কোনো ব্যয়ের তথ্য নেই
                      </td>
                    </tr>
                  ) : (
                    expenseBreakdown.list.slice(0, 5).map((item, idx) => (
                      <tr key={item.name} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '5px 0', color: '#64748b' }}>{toBanglaDigits(idx + 1)}</td>
                        <td style={{ padding: '5px 0', fontWeight: '600' }}>{item.name}</td>
                        <td style={{ padding: '5px 0', textAlign: 'center', color: '#64748b' }}>{toBanglaDigits(item.count)} টি</td>
                        <td style={{ padding: '5px 0', textAlign: 'right', fontWeight: '700', color: '#e11d48' }}>৳{formatMoney(item.amount)}</td>
                        <td style={{ padding: '5px 0', textAlign: 'right', color: '#64748b' }}>{toBanglaDigits(item.percentage)}%</td>
                      </tr>
                    ))
                  )}
                  {expenseBreakdown.list.length > 0 && (
                    <tr style={{ borderTop: '1.5px solid #0f172a' }}>
                      <td colSpan={3} style={{ padding: '6px 0', fontWeight: '700', textAlign: 'right', color: '#0f172a' }}>
                        মোট ব্যয়:
                      </td>
                      <td style={{ padding: '6px 0', fontWeight: '800', textAlign: 'right', color: '#e11d48' }}>
                        ৳{formatMoney(expenseBreakdown.totalExp)}
                      </td>
                      <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: '700', color: '#64748b' }}>১০০%</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* ৪. শীর্ষ বড় খরচসমূহ */}
            <div style={{ marginBottom: '14px' }}>
              <h2 style={{ fontSize: '11px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.6px' }}>
                ৪. শীর্ষ বড় খরচসমূহ
              </h2>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1.5px solid #0f172a' }}>
                    <th style={{ padding: '6px 0', fontWeight: '700', color: '#475569', width: '32px' }}>ক্রম</th>
                    <th style={{ padding: '6px 0', fontWeight: '700', color: '#475569' }}>খাত ও নোট</th>
                    <th style={{ padding: '6px 0', fontWeight: '700', color: '#475569' }}>তারিখ</th>
                    <th style={{ padding: '6px 0', fontWeight: '700', color: '#475569' }}>ওয়ালেট</th>
                    <th style={{ padding: '6px 0', fontWeight: '700', color: '#475569', textAlign: 'right' }}>টাকার পরিমাণ</th>
                    <th style={{ padding: '6px 0', fontWeight: '700', color: '#475569', textAlign: 'right' }}>মোট ব্যয়ের %</th>
                  </tr>
                </thead>
                <tbody>
                  {top5Expenses.items.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '8px 0', color: '#94a3b8', textAlign: 'center' }}>
                        কোনো খরচের রেকর্ড নেই
                      </td>
                    </tr>
                  ) : (
                    top5Expenses.items.map((item) => (
                      <tr key={item.transaction.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '5px 0', color: '#64748b' }}>{toBanglaDigits(item.rank)}</td>
                        <td style={{ padding: '5px 0' }}>
                          <span style={{ fontWeight: '600' }}>{item.categoryName}</span>
                          {item.note && <span style={{ color: '#64748b', marginLeft: '6px' }}>• "{item.note}"</span>}
                        </td>
                        <td style={{ padding: '5px 0', color: '#64748b' }}>{formatBanglaDate(item.date)}</td>
                        <td style={{ padding: '5px 0', color: '#64748b' }}>{item.accountName}</td>
                        <td style={{ padding: '5px 0', textAlign: 'right', fontWeight: '700', color: '#e11d48' }}>৳{formatMoney(item.amount)}</td>
                        <td style={{ padding: '5px 0', textAlign: 'right', color: '#64748b' }}>{toBanglaDigits(item.percentage)}%</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ফুটার (ফুটনোট স্টাইল: Amar Hisab developed by Abdullah Al Hasan) */}
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '10px', color: '#64748b', fontStyle: 'italic', letterSpacing: '0.2px' }}>
              Amar Hisab developed by Abdullah Al Hasan
            </div>
            <div style={{ fontSize: '9.5px', color: '#94a3b8' }}>
              পৃষ্ঠা ১ / ১
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
