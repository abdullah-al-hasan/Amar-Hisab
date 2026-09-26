import React, { useState } from 'react';
import { 
  BarChart3, ArrowLeftRight, WalletCards, Plus, 
  TrendingDown, TrendingUp, Handshake 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TransactionType } from '../types';

export type NavTab = 'dashboard' | 'transactions' | 'ledger' | 'budget' | 'reports';

export interface BottomNavProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenAction: (type: TransactionType, allowedTypes: TransactionType[]) => void;
  onOpenQuickAdd?: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ 
  currentTab, 
  onSelectTab, 
  onOpenAction,
  onOpenQuickAdd 
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleAction = (type: TransactionType, allowedTypes: TransactionType[]) => {
    setIsMenuOpen(false);
    onOpenAction(type, allowedTypes);
  };

  return (
    <>
      {/* Circular / Rounded Action Popup Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* Backdrop Blur Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 z-40 bg-slate-950/40 dark:bg-slate-950/70 backdrop-blur-xs"
            />

            {/* Floating Rounded Popup Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 16 }}
              transition={{ type: 'spring', damping: 25, stiffness: 380 }}
              className="fixed bottom-[74px] left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-sm pointer-events-auto"
            >
              <div className="bg-white/95 dark:bg-[#111726]/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 shadow-[0_16px_40px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                <div className="text-center mb-3">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    নতুন হিসাব যোগ করুন
                  </div>
                  <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                    লেনদেনের ধরন নির্বাচন করুন
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center">
                  {/* 1. আয় */}
                  <button
                    id="fab-action-income"
                    onClick={() => handleAction('income', ['income'])}
                    className="flex flex-col items-center justify-center group active:scale-95 transition-transform cursor-pointer"
                  >
                    <div className="w-13 h-13 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-900/60 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-sm group-hover:shadow transition-all">
                      <TrendingUp className="w-5 h-5 stroke-[2.2]" />
                    </div>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 mt-1.5">আয়</span>
                  </button>

                  {/* 2. ব্যয় */}
                  <button
                    id="fab-action-expense"
                    onClick={() => handleAction('expense', ['expense'])}
                    className="flex flex-col items-center justify-center group active:scale-95 transition-transform cursor-pointer"
                  >
                    <div className="w-13 h-13 rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200/80 dark:border-rose-900/60 group-hover:bg-rose-100 dark:group-hover:bg-rose-900/80 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-sm group-hover:shadow transition-all">
                      <TrendingDown className="w-5 h-5 stroke-[2.2]" />
                    </div>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 mt-1.5">ব্যয়</span>
                  </button>

                  {/* 3. ট্রান্সফার */}
                  <button
                    id="fab-action-transfer"
                    onClick={() => handleAction('transfer', ['transfer'])}
                    className="flex flex-col items-center justify-center group active:scale-95 transition-transform cursor-pointer"
                  >
                    <div className="w-13 h-13 rounded-full bg-sky-50 dark:bg-sky-950/60 border border-sky-200/80 dark:border-sky-900/60 group-hover:bg-sky-100 dark:group-hover:bg-sky-900/80 text-sky-600 dark:text-sky-400 flex items-center justify-center shadow-sm group-hover:shadow transition-all">
                      <ArrowLeftRight className="w-5 h-5 stroke-[2.2]" />
                    </div>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 mt-1.5">ট্রান্সফার</span>
                  </button>

                  {/* 4. ধার-দেনা */}
                  <button
                    id="fab-action-loan"
                    onClick={() => handleAction('loan_given', ['loan_given', 'loan_repaid', 'loan_borrowed', 'borrow_repaid'])}
                    className="flex flex-col items-center justify-center group active:scale-95 transition-transform cursor-pointer"
                  >
                    <div className="w-13 h-13 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-900/60 group-hover:bg-amber-100 dark:group-hover:bg-amber-900/80 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-sm group-hover:shadow transition-all">
                      <Handshake className="w-5 h-5 stroke-[2.2]" />
                    </div>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 mt-1.5">ধার-দেনা</span>
                  </button>
                </div>
              </div>

              {/* Pointer triangle indicator pointing to the center FAB */}
              <div className="flex justify-center -mt-1.5">
                <div className="w-3.5 h-3.5 rotate-45 bg-white dark:bg-[#111726] border-r border-b border-slate-200/80 dark:border-slate-800" />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-[#090d16]/95 backdrop-blur-lg border-t border-slate-200/70 dark:border-slate-800/80 py-1.5 px-3 max-w-2xl mx-auto transition-colors">
        <div className="flex items-center justify-around relative">
          {/* Tab 1: Reports */}
          <button
            id="nav-tab-reports"
            onClick={() => onSelectTab('reports')}
            className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer ${
              currentTab === 'reports'
                ? 'text-slate-900 dark:text-white font-bold'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium'
            }`}
          >
            <div className="p-1">
              <BarChart3 className="w-5 h-5 stroke-[2]" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">রিপোর্ট</span>
          </button>

          {/* Tab 2: Transactions -> লেনদেন */}
          <button
            id="nav-tab-transactions"
            onClick={() => onSelectTab('transactions')}
            className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer ${
              currentTab === 'transactions'
                ? 'text-slate-900 dark:text-white font-bold'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium'
            }`}
          >
            <div className="p-1">
              <ArrowLeftRight className="w-5 h-5 stroke-[2]" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">লেনদেন</span>
          </button>

          {/* Center Floating Action Button: Quick Add with Toggle Animation */}
          <div className="flex-1 flex flex-col items-center justify-center -mt-5 relative z-50">
            <button
              id="nav-quick-add-fab"
              onClick={() => setIsMenuOpen(prev => !prev)}
              className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ring-4 ring-white dark:ring-[#090d16] cursor-pointer ${
                isMenuOpen
                  ? 'bg-rose-500 hover:bg-rose-600 text-white rotate-45 scale-105'
                  : 'bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 hover:scale-105 active:scale-95 rotate-0'
              }`}
              aria-label={isMenuOpen ? "মেনু বন্ধ করুন" : "টাকা যোগ করুন"}
              title="নতুন লেনদেন বা লেজার এন্ট্রি"
            >
              <Plus className="w-6 h-6 stroke-[2.5]" />
            </button>
            <span className={`text-[9.5px] font-semibold mt-1 transition-colors ${
              isMenuOpen 
                ? 'text-rose-600 dark:text-rose-400' 
                : 'text-slate-700 dark:text-slate-300'
            }`}>
              {isMenuOpen ? 'বন্ধ করুন' : 'যোগ করুন'}
            </span>
          </div>

          {/* Tab 3: Ledger -> ধার-দেনা (ব্যক্তিভিত্তিক হিসাব) */}
          <button
            id="nav-tab-ledger"
            onClick={() => onSelectTab('ledger')}
            className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer ${
              currentTab === 'ledger'
                ? 'text-slate-900 dark:text-white font-bold'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium'
            }`}
          >
            <div className="p-1">
              <Handshake className="w-5 h-5 stroke-[2]" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">ধার-দেনা</span>
          </button>

          {/* Tab 4: Budget & Recurring */}
          <button
            id="nav-tab-budget"
            onClick={() => onSelectTab('budget')}
            className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer ${
              currentTab === 'budget'
                ? 'text-slate-900 dark:text-white font-bold'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium'
            }`}
          >
            <div className="p-1">
              <WalletCards className="w-5 h-5 stroke-[2]" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">বাজেট</span>
          </button>
        </div>
      </nav>
    </>
  );
};
