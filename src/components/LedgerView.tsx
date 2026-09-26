import React, { useState, useMemo } from 'react';
import { 
  Users, UserPlus, Phone, Search, ArrowUpRight, ArrowDownLeft, 
  CheckCircle2, X, Plus, Clock, ChevronRight, Edit3, Trash2
} from 'lucide-react';
import { Account, Transaction, Person } from '../types';
import { calculateDebtSummaries, calculatePersonLedger, formatMoney, toBanglaDigits } from '../utils/accounting';

interface LedgerViewProps {
  persons: Person[];
  transactions: Transaction[];
  accounts: Account[];
  selectedPerson: Person | null;
  onSelectPerson: (p: Person | null) => void;
  onSavePerson: (p: Partial<Person>) => void;
  onDeletePerson: (id: string) => void;
  onOpenQuickAdd: (type: any, personId?: string) => void;
}

export const LedgerView: React.FC<LedgerViewProps> = ({
  persons,
  transactions,
  accounts,
  selectedPerson,
  onSelectPerson,
  onSavePerson,
  onDeletePerson,
  onOpenQuickAdd,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'receivable' | 'payable' | 'settled'>('all');
  const [showAddPersonModal, setShowAddPersonModal] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [confirmDeletePersonId, setConfirmDeletePersonId] = useState<string | null>(null);

  // Form states for new/edit person
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');

  // Summaries across all persons
  const { totalReceivable, totalPayable, personSummaries } = useMemo(() => {
    return calculateDebtSummaries(persons, transactions, accounts);
  }, [persons, transactions, accounts]);

  // Filtered person list
  const filteredPersonSummaries = useMemo(() => {
    return personSummaries.filter(item => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const searchable = `${item.person.name} ${item.person.phone || ''} ${item.person.note || ''}`.toLowerCase();
        if (!searchable.includes(q)) return false;
      }
      return true;
    });
  }, [personSummaries, statusFilter, searchQuery]);

  // Selected person ledger calculation
  const activeLedger = useMemo(() => {
    if (!selectedPerson) return null;
    return calculatePersonLedger(selectedPerson.id, transactions, accounts);
  }, [selectedPerson, transactions, accounts]);

  const openAddPerson = () => {
    setEditingPerson(null);
    setName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setNote('');
    setShowAddPersonModal(true);
  };

  const openEditPerson = (p: Person) => {
    setEditingPerson(p);
    setName(p.name);
    setPhone(p.phone || '');
    setEmail(p.email || '');
    setAddress(p.address || '');
    setNote(p.note || '');
    setShowAddPersonModal(true);
  };

  const handleSavePersonSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSavePerson({
      id: editingPerson ? editingPerson.id : undefined,
      name: name.trim(),
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      note: note.trim() || undefined,
    });

    setShowAddPersonModal(false);
  };

  return (
    <div className="space-y-4 pb-20 fade-in">
      {/* 1. Header Summary Cards (Minimalist Clean Surfaces) */}
      <section className="grid grid-cols-2 gap-3">
        <div className="bg-white dark:bg-[#111726] rounded-3xl p-4 sm:p-5 border border-slate-200/70 dark:border-slate-800/80 shadow-[0_2px_12px_rgba(0,0,0,0.02)] transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              আমি পাব
            </span>
            <span className="text-[9.5px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-semibold px-2 py-0.5 rounded-full">
              পাওনা
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 mt-2 privacy-blur">
            ৳{formatMoney(totalReceivable)}
          </div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
            অন্যদের কাছে মোট প্রাপ্য
          </div>
        </div>

        <div className="bg-white dark:bg-[#111726] rounded-3xl p-4 sm:p-5 border border-slate-200/70 dark:border-slate-800/80 shadow-[0_2px_12px_rgba(0,0,0,0.02)] transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              আমি দেব
            </span>
            <span className="text-[9.5px] bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 font-semibold px-2 py-0.5 rounded-full">
              দেনা
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 mt-2 privacy-blur">
            ৳{formatMoney(totalPayable)}
          </div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
            অন্যদেরকে মোট প্রদেয়
          </div>
        </div>
      </section>

      {/* 2. Person Search & Add Controls */}
      <section className="bg-white dark:bg-[#111726] rounded-3xl p-4 sm:p-5 border border-slate-200/70 dark:border-slate-800/80 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-3.5 transition-colors">
        <div className="flex items-center justify-between gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="ব্যক্তির নাম বা ফোন নম্বর খুঁজুন..."
              className="w-full pl-9.5 pr-3 py-2.5 rounded-2xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 text-xs font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none focus:border-slate-400 dark:focus:border-slate-600 focus:bg-white dark:focus:bg-slate-900 transition-all"
            />
          </div>

          <button
            id="ledger-add-person-btn"
            onClick={openAddPerson}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white active:scale-95 text-white dark:text-slate-900 text-xs font-semibold shadow-sm cursor-pointer whitespace-nowrap transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>ধার-দেনা</span>
          </button>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {[
            { key: 'all', label: `সব (${persons.length})` },
            { key: 'receivable', label: 'আমি পাব' },
            { key: 'payable', label: 'আমি দেব' },
            { key: 'settled', label: 'পরিশোধিত' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === tab.key
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm'
                  : 'bg-slate-100/80 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {/* 3. Persons Directory List */}
      <section className="bg-white dark:bg-[#111726] rounded-3xl p-4 sm:p-5 border border-slate-200/70 dark:border-slate-800/80 shadow-[0_2px_12px_rgba(0,0,0,0.02)] transition-colors">
        {filteredPersonSummaries.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300">কোনো ব্যক্তির হিসাব পাওয়া যায়নি</div>
            <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs mx-auto">
              কাউকে টাকা ধার দিলে বা কারও কাছ থেকে ধার নিলে এখানে তাঁর পূর্ণাঙ্গ লেজার তৈরি হবে।
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredPersonSummaries.map(item => {
              const isReceivable = item.status === 'receivable';
              const isPayable = item.status === 'payable';

              return (
                <div
                  key={item.person.id}
                  onClick={() => onSelectPerson(item.person)}
                  className="py-3 px-1 transition-all cursor-pointer hover:bg-slate-50/60 dark:hover:bg-slate-900/50 rounded-xl"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                        isReceivable ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400' :
                        isPayable ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}>
                        {item.person.name.charAt(0)}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {item.person.name}
                          </h4>
                          <span className={`text-[9px] font-medium px-2 py-0.2 rounded-full ${
                            isReceivable ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400' :
                            isPayable ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                          }`}>
                            {isReceivable ? 'আমি পাব' : isPayable ? 'আমি দেব' : 'পরিশোধিত'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                          {item.person.phone ? (
                            <span className="flex items-center gap-0.5 text-slate-500 dark:text-slate-400">
                              <Phone className="w-2.5 h-2.5" />
                              {item.person.phone}
                            </span>
                          ) : null}
                          <span>{item.transactionCount} টি লেনদেন</span>
                          {item.lastDate && <span>• শেষ: {item.lastDate}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className={`text-sm font-bold privacy-blur ${
                        isReceivable ? 'text-emerald-700 dark:text-emerald-400' :
                        isPayable ? 'text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'
                      }`}>
                        ৳{formatMoney(Math.abs(item.netBalance))}
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium flex items-center justify-end gap-0.5 mt-0.5">
                        লেজার
                        <ChevronRight className="w-3 h-3" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. Full Person Profile & Running Ledger Modal / Drawer */}
      {selectedPerson && activeLedger && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 dark:bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white dark:bg-[#111726] w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 max-h-[92vh] overflow-y-auto flex flex-col shadow-xl border border-slate-200/80 dark:border-slate-800 animate-in fade-in transition-colors">
            {/* Header */}
            <div className="flex items-start justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-base flex items-center justify-center shadow-sm">
                  {selectedPerson.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {selectedPerson.name}
                    </h3>
                    <button
                      onClick={() => openEditPerson(selectedPerson)}
                      className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 cursor-pointer"
                      title="প্রোফাইল সম্পাদনা"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-2 mt-0.5">
                    {selectedPerson.phone && (
                      <span className="flex items-center gap-1 font-medium text-slate-600 dark:text-slate-400">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {selectedPerson.phone}
                      </span>
                    )}
                    {selectedPerson.address && <span>• {selectedPerson.address}</span>}
                  </div>
                </div>
              </div>

              <button
                onClick={() => onSelectPerson(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Person Status Banner (Clean Card) */}
            <div className="mt-3.5 p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  {activeLedger.summary.status === 'receivable' ? 'বর্তমান মোট পাওনা (আমি পাব)' :
                   activeLedger.summary.status === 'payable' ? 'বর্তমান মোট দেনা (আমি দেব)' :
                   'হিসাব সম্পূর্ণ পরিশোধিত'}
                </span>
                <span className={`text-[9.5px] font-semibold px-2 py-0.5 rounded-full ${
                  activeLedger.summary.status === 'receivable' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400' :
                  activeLedger.summary.status === 'payable' ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400' :
                  'bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}>
                  {activeLedger.summary.status === 'receivable' ? 'পাওনা' :
                   activeLedger.summary.status === 'payable' ? 'দেনা' : 'পরিশোধিত'}
                </span>
              </div>
              <div className="text-2xl font-black mt-1 text-slate-900 dark:text-slate-100 privacy-blur">
                ৳{formatMoney(Math.abs(activeLedger.summary.netBalance))}
              </div>

              {/* Direct settlement action button if debt/loan is pending */}
              {activeLedger.summary.status === 'receivable' && (
                <div className="mt-2.5">
                  <button
                    onClick={() => onOpenQuickAdd('loan_repaid', selectedPerson.id)}
                    className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ArrowDownLeft className="w-4 h-4" />
                    <span>ফেরত নিন</span>
                  </button>
                </div>
              )}

              {activeLedger.summary.status === 'payable' && (
                <div className="mt-2.5">
                  <button
                    onClick={() => onOpenQuickAdd('borrow_repaid', selectedPerson.id)}
                    className="w-full py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    <span>পরিশোধ করুন</span>
                  </button>
                </div>
              )}

              {/* Summary stats: total given, received, frequency */}
              <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400">
                <div>মোট দিয়েছি: <span className="font-semibold text-slate-900 dark:text-slate-100 privacy-blur">৳{formatMoney(activeLedger.summary.totalGiven)}</span></div>
                <div>মোট পেয়েছি: <span className="font-semibold text-slate-900 dark:text-slate-100 privacy-blur">৳{formatMoney(activeLedger.summary.totalReceived)}</span></div>
              </div>

              {/* Advanced Debt Tracking Details: Dates, Days elapsed, Frequency */}
              {activeLedger.summary.transactionCount > 0 && (() => {
                const today = new Date();
                const initDateObj = activeLedger.summary.initialDate ? new Date(activeLedger.summary.initialDate) : null;
                const daysElapsed = initDateObj ? Math.max(0, Math.floor((today.getTime() - initDateObj.getTime()) / (1000 * 60 * 60 * 24))) : 0;
                
                return (
                  <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800 space-y-1 text-[10.5px] text-slate-500 dark:text-slate-400">
                    <div className="flex items-center justify-between">
                      <span>লেনদেনের পুনরাবৃত্তি (ফ্রিকোয়েন্সি):</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        মোট {toBanglaDigits(activeLedger.summary.transactionCount)} বার ({toBanglaDigits(activeLedger.summary.givenCount)} বার প্রদান, {toBanglaDigits(activeLedger.summary.receivedCount)} বার প্রাপ্তি)
                      </span>
                    </div>
                    {activeLedger.summary.initialDate && (
                      <div className="flex items-center justify-between">
                        <span>শুরুর তারিখ:</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {activeLedger.summary.initialDate} ({toBanglaDigits(daysElapsed)} দিন অতিবাহিত)
                        </span>
                      </div>
                    )}
                    {activeLedger.summary.lastDate && (
                      <div className="flex items-center justify-between">
                        <span>সর্বশেষ লেনদেন:</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {activeLedger.summary.lastDate}
                        </span>
                      </div>
                    )}
                    {activeLedger.summary.dueDate && (
                      <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 font-semibold">
                        <span>নির্ধারিত শেষ তারিখ:</span>
                        <span>{activeLedger.summary.dueDate}</span>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Quick Action Buttons for this person */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3.5">
              <button
                onClick={() => onOpenQuickAdd('loan_given', selectedPerson.id)}
                className="py-2 px-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-200/70 dark:border-slate-800 cursor-pointer flex flex-col items-center justify-center gap-1 transition-colors"
              >
                <ArrowUpRight className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>ধার দিলাম</span>
              </button>

              <button
                onClick={() => onOpenQuickAdd('loan_repaid', selectedPerson.id)}
                className="py-2 px-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-200/70 dark:border-slate-800 cursor-pointer flex flex-col items-center justify-center gap-1 transition-colors"
              >
                <ArrowDownLeft className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>ফেরত পেলাম</span>
              </button>

              <button
                onClick={() => onOpenQuickAdd('loan_borrowed', selectedPerson.id)}
                className="py-2 px-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-200/70 dark:border-slate-800 cursor-pointer flex flex-col items-center justify-center gap-1 transition-colors"
              >
                <ArrowDownLeft className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>ধার নিলাম</span>
              </button>

              <button
                onClick={() => onOpenQuickAdd('borrow_repaid', selectedPerson.id)}
                className="py-2 px-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-200/70 dark:border-slate-800 cursor-pointer flex flex-col items-center justify-center gap-1 transition-colors"
              >
                <ArrowUpRight className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                <span>শোধ দিলাম</span>
              </button>
            </div>

            {/* Running Ledger Section */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  চলমান লেনদেন
                </h4>
              </div>

              {activeLedger.entries.length === 0 ? (
                <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-xs bg-slate-50 dark:bg-slate-900/50 rounded-2xl">
                  এই ব্যক্তির সঙ্গে এখনও কোনো লেনদেন করা হয়নি
                </div>
              ) : (
                <div className="border border-slate-200/70 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 text-[10px] uppercase font-semibold border-b border-slate-200/70 dark:border-slate-800">
                      <tr>
                        <th className="py-2 px-2.5">তারিখ</th>
                        <th className="py-2 px-2.5">বিবরণ</th>
                        <th className="py-2 px-2 text-right">দিলাম</th>
                        <th className="py-2 px-2 text-right">পেলাম</th>
                        <th className="py-2 px-2.5 text-right font-bold">জের</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {activeLedger.entries.map((e, idx) => (
                        <tr key={e.id || idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors">
                          <td className="py-2.5 px-2.5 text-[10px] font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            {e.date}
                          </td>
                          <td className="py-2.5 px-2.5">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">{e.description}</div>
                            <div className="text-[9px] text-slate-400 dark:text-slate-500">{e.accountName}{e.note ? ` • ${e.note}` : ''}</div>
                          </td>
                          <td className="py-2.5 px-2 text-right font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            {e.given > 0 ? <span className="privacy-blur">৳{formatMoney(e.given)}</span> : '-'}
                          </td>
                          <td className="py-2.5 px-2 text-right font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                            {e.received > 0 ? <span className="privacy-blur">৳{formatMoney(e.received)}</span> : '-'}
                          </td>
                          <td className={`py-2.5 px-2.5 text-right font-bold whitespace-nowrap ${
                            e.balance > 0 ? 'text-emerald-700 dark:text-emerald-400' :
                            e.balance < 0 ? 'text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'
                          }`}>
                            <span className="privacy-blur">৳{formatMoney(Math.abs(e.balance))}</span>
                            <span className="text-[8px] ml-0.5 font-normal block text-slate-400 dark:text-slate-500">
                              {e.balance > 0 ? 'পাব' : e.balance < 0 ? 'দেব' : 'সমান'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Delete Person Action (Only allowed if no transactions exist) */}
            {activeLedger.summary.transactionCount === 0 && (
              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end items-center">
                {confirmDeletePersonId === selectedPerson.id ? (
                  <div className="w-full p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in">
                    <div className="text-xs text-rose-800 dark:text-rose-200 font-medium text-center sm:text-left">
                      সত্যিই কি <strong>"{selectedPerson.name}"</strong>-এর নাম ডিলিট করবেন?
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          const personId = selectedPerson.id;
                          setConfirmDeletePersonId(null);
                          onDeletePerson(personId);
                          onSelectPerson(null);
                        }}
                        className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                      >
                        হ্যাঁ, ডিলিট করুন
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeletePersonId(null)}
                        className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                      >
                        বাতিল
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDeletePersonId(selectedPerson.id)}
                    className="text-xs font-medium text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 px-3 py-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer flex items-center gap-1.5 transition-colors border border-rose-200/60 dark:border-rose-900/40"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>ব্যক্তির নাম ডিলিট করুন</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. Add / Edit Person Modal */}
      {showAddPersonModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111726] w-full max-w-md rounded-3xl p-5 sm:p-6 shadow-xl border border-slate-200/80 dark:border-slate-800 animate-in fade-in transition-colors">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                {editingPerson ? 'ব্যক্তি প্রোফাইল সম্পাদনা' : 'নতুন ব্যক্তি যোগ'}
              </h3>
              <button
                onClick={() => setShowAddPersonModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePersonSubmit} className="space-y-3 mt-3.5">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">ব্যক্তির নাম *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="যেমন: রহিম সাহেব"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 text-slate-900 dark:text-slate-100 text-xs font-medium focus:border-slate-400 dark:focus:border-slate-600 outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">মোবাইল নম্বর (ঐচ্ছিক)</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="যেমন: 017xxxxxxxx"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 text-slate-900 dark:text-slate-100 text-xs font-medium focus:border-slate-400 dark:focus:border-slate-600 outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">ঠিকানা (ঐচ্ছিক)</label>
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="যেমন: মিরপুর, ঢাকা"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 text-slate-900 dark:text-slate-100 text-xs font-medium focus:border-slate-400 dark:focus:border-slate-600 outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">নোট বা সম্পর্ক</label>
                <input
                  type="text"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="যেমন: সহকর্মী / বন্ধু"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 text-slate-900 dark:text-slate-100 text-xs font-medium focus:border-slate-400 dark:focus:border-slate-600 outline-none"
                />
              </div>

              <div className="pt-2 flex gap-2">
                {editingPerson && !transactions.some(t => t.personId === editingPerson.id) && (
                  <button
                    type="button"
                    onClick={() => {
                      const personId = editingPerson.id;
                      setShowAddPersonModal(false);
                      onDeletePerson(personId);
                      if (selectedPerson?.id === personId) {
                        onSelectPerson(null);
                      }
                    }}
                    className="py-2.5 px-3 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-medium cursor-pointer transition-colors flex items-center gap-1"
                    title="ব্যক্তি মুছে ফেলুন"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>ডিলিট</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowAddPersonModal(false)}
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
