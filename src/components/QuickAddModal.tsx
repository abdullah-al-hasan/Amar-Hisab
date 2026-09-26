import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, TrendingDown, TrendingUp, ArrowLeftRight, 
  UserPlus, Plus, Tag, Check, Calendar, AlertCircle,
  User, ArrowUpRight, ArrowDownLeft
} from 'lucide-react';
import { Account, Transaction, Person, Category, TransactionType } from '../types';
import { getLocalToday, generateId } from '../utils/storage';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: TransactionType;
  initialPersonId?: string;
  initialAccountId?: string;
  allowedTypes?: TransactionType[];
  editingTransaction?: Transaction | null;
  accounts: Account[];
  categories: Category[];
  persons: Person[];
  onSaveTransaction: (txn: Partial<Transaction>) => void;
  onSavePerson: (p: Partial<Person>) => Person;
  onSaveCategory: (cat: Category) => void;
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({
  isOpen,
  onClose,
  initialType = 'expense',
  initialPersonId,
  initialAccountId,
  allowedTypes,
  editingTransaction,
  accounts,
  categories,
  persons,
  onSaveTransaction,
  onSavePerson,
  onSaveCategory,
}) => {
  const [type, setType] = useState<TransactionType>(initialType);
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [personId, setPersonId] = useState('');
  const [date, setDate] = useState(getLocalToday());
  const [note, setNote] = useState('');
  const [fee, setFee] = useState('');

  // Inline Quick Add Person Modal State
  const [showInlineAddPerson, setShowInlineAddPerson] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonPhone, setNewPersonPhone] = useState('');

  // Inline Quick Add Category Modal State
  const [showInlineAddCategory, setShowInlineAddCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  // Error message
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (editingTransaction) {
      setType(editingTransaction.type);
      setAmount(editingTransaction.amount.toString());
      setAccountId(editingTransaction.accountId);
      setToAccountId(editingTransaction.toAccountId || '');
      setCategoryName(editingTransaction.categoryName);
      setPersonId(editingTransaction.personId || '');
      setDate(editingTransaction.date);
      setNote(editingTransaction.note || '');
      setFee(editingTransaction.fee ? editingTransaction.fee.toString() : '');
    } else {
      let targetType = initialType;
      if (allowedTypes && allowedTypes.length > 0 && !allowedTypes.includes(targetType)) {
        targetType = allowedTypes[0];
      }
      setType(targetType);
      setAmount('');
      setAccountId(initialAccountId || accounts[0]?.id || 'acc_cash');
      setToAccountId(accounts.find(a => a.id !== (initialAccountId || accounts[0]?.id))?.id || accounts[1]?.id || accounts[0]?.id || 'acc_bkash');
      setPersonId(initialPersonId || (persons[0]?.id || ''));
      setDate(getLocalToday());
      setNote('');
      setFee('');

      // Default category
      const expCats = categories.filter(c => c.type === 'expense');
      const incCats = categories.filter(c => c.type === 'income');
      if (targetType === 'income') {
        setCategoryName(incCats[0]?.name || 'বেতন');
      } else if (targetType === 'expense') {
        setCategoryName(expCats[0]?.name || 'খাবার / রেস্তোরাঁ');
      } else if (targetType === 'loan_given') {
        setCategoryName('ধার দেওয়া');
      } else if (targetType === 'loan_repaid') {
        setCategoryName('ধার ফেরত প্রাপ্তি');
      } else if (targetType === 'loan_borrowed') {
        setCategoryName('ধার নেওয়া');
      } else if (targetType === 'borrow_repaid') {
        setCategoryName('ধার পরিশোধ');
      } else {
        setCategoryName('অ্যাকাউন্ট ট্রান্সফার');
      }
    }
    setErrorMessage('');
  }, [editingTransaction, initialType, initialPersonId, initialAccountId, allowedTypes, isOpen, accounts, categories, persons]);

  const isDebtType = ['loan_given', 'loan_repaid', 'loan_borrowed', 'borrow_repaid'].includes(type);
  const isTransfer = type === 'transfer';

  // Check if a person is pre-selected
  const fixedPerson = useMemo(() => {
    const targetId = initialPersonId || editingTransaction?.personId;
    if (!targetId) return null;
    return persons.find(p => p.id === targetId) || null;
  }, [initialPersonId, editingTransaction, persons]);

  const ALL_TYPES: { key: TransactionType; label: string }[] = [
    { key: 'income', label: 'আয়' },
    { key: 'expense', label: 'ব্যয়' },
    { key: 'transfer', label: 'ট্রান্সফার' },
    { key: 'loan_given', label: 'ধার দিলাম' },
    { key: 'loan_repaid', label: 'ফেরত পেলাম' },
    { key: 'loan_borrowed', label: 'ধার নিলাম' },
    { key: 'borrow_repaid', label: 'ধার শোধ' },
  ];

  const availableTypes = useMemo(() => {
    if (allowedTypes && allowedTypes.length > 0) {
      return ALL_TYPES.filter(item => allowedTypes.includes(item.key));
    }
    return ALL_TYPES;
  }, [allowedTypes]);

  const modalTitle = useMemo(() => {
    if (editingTransaction) {
      if (type === 'income') return 'আয় সম্পাদনা';
      if (type === 'expense') return 'ব্যয় সম্পাদনা';
      if (type === 'transfer') return 'ট্রান্সফার সম্পাদনা';
      if (type === 'loan_given') return 'ধার প্রদান সম্পাদনা';
      if (type === 'loan_repaid') return 'ধার ফেরত সম্পাদনা';
      if (type === 'loan_borrowed') return 'ধার নেওয়া সম্পাদনা';
      if (type === 'borrow_repaid') return 'ধার শোধ সম্পাদনা';
      return 'লেনদেন সম্পাদনা';
    }
    if (type === 'income') return 'আয়ের হিসাব যোগ করুন';
    if (type === 'expense') return 'ব্যয়ের হিসাব যোগ করুন';
    if (type === 'transfer') return 'অ্যাকাউন্ট ট্রান্সফার';
    if (type === 'loan_given') return 'ধার দিলাম (টাকা প্রদান)';
    if (type === 'loan_repaid') return 'ফেরত পেলাম / ফেরত নিন (টাকা গ্রহণ)';
    if (type === 'loan_borrowed') return 'ধার নিলাম (ঋণ গ্রহণ)';
    if (type === 'borrow_repaid') return 'শোধ দিলাম / পরিশোধ করুন (ঋণ পরিশোধ)';
    return 'হিসাব যোগ করুন';
  }, [editingTransaction, type]);

  const modalSubtitle = useMemo(() => {
    if (editingTransaction) {
      return 'পূর্বের লেনদেনের তথ্য পরিবর্তন করুন';
    }
    const pName = fixedPerson?.name;
    if (type === 'income') return 'উপার্জন বা জমার হিসাব লিপিবদ্ধ করুন';
    if (type === 'expense') return 'দৈনন্দিন ব্যয়ের হিসাব লিপিবদ্ধ করুন';
    if (type === 'transfer') return 'এক অ্যাকাউন্ট থেকে অন্য অ্যাকাউন্টে টাকা স্থানান্তর';
    if (type === 'loan_given') {
      return pName ? `${pName}-কে টাকা ধার দেওয়া হচ্ছে` : 'কাউকে টাকা ধার দেওয়ার হিসাব';
    }
    if (type === 'loan_repaid') {
      return pName ? `${pName}-এর কাছ থেকে ধারের টাকা ফেরত নেওয়া হচ্ছে` : 'পূর্বে দেওয়া ধারের টাকা ফেরত পাওয়ার হিসাব';
    }
    if (type === 'loan_borrowed') {
      return pName ? `${pName}-এর কাছ থেকে টাকা ঋণ বা ধার নেওয়া হচ্ছে` : 'কারও কাছ থেকে টাকা ধার নেওয়ার হিসাব';
    }
    if (type === 'borrow_repaid') {
      return pName ? `${pName}-কে পূর্বে নেওয়া ঋণের টাকা পরিশোধ করা হচ্ছে` : 'পূর্বে নেওয়া ঋণের টাকা পরিশোধের হিসাব';
    }
    return 'দৈনন্দিন হিসাব লিপিবদ্ধ করুন';
  }, [editingTransaction, type, fixedPerson]);

  const handleTypeChange = (newType: TransactionType) => {
    if (allowedTypes && allowedTypes.length > 0 && !allowedTypes.includes(newType)) {
      return;
    }
    setType(newType);
    if (newType === 'expense') {
      const first = categories.find(c => c.type === 'expense');
      setCategoryName(first?.name || 'খাবার / রেস্তোরাঁ');
    } else if (newType === 'income') {
      const first = categories.find(c => c.type === 'income');
      setCategoryName(first?.name || 'বেতন');
    } else if (newType === 'transfer') {
      setCategoryName('অ্যাকাউন্ট ট্রান্সফার');
    } else if (newType === 'loan_given') {
      setCategoryName('ধার দেওয়া');
    } else if (newType === 'loan_repaid') {
      setCategoryName('ধার ফেরত প্রাপ্তি');
    } else if (newType === 'loan_borrowed') {
      setCategoryName('ধার নেওয়া');
    } else if (newType === 'borrow_repaid') {
      setCategoryName('ধার পরিশোধ');
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage('অনুগ্রহ করে সঠিক টাকার পরিমাণ লিখুন (০-এর বেশি)');
      return;
    }

    if (isTransfer && accountId === toAccountId) {
      setErrorMessage('উৎস এবং গন্তব্য অ্যাকাউন্ট ভিন্ন হতে হবে');
      return;
    }

    if (isDebtType && !personId) {
      setErrorMessage('ধার-দেনার জন্য একজন ব্যক্তি নির্বাচন করুন');
      return;
    }

    onSaveTransaction({
      id: editingTransaction?.id,
      type,
      amount: parsedAmount,
      accountId,
      toAccountId: isTransfer ? toAccountId : undefined,
      categoryName,
      personId: isDebtType ? personId : undefined,
      date,
      note: note.trim() || undefined,
      fee: fee ? parseFloat(fee) : undefined,
    });

    onClose();
  };

  const handleCreateInlinePerson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPersonName.trim()) return;

    const created = onSavePerson({
      name: newPersonName.trim(),
      phone: newPersonPhone.trim() || undefined,
    });

    setPersonId(created.id);
    setShowInlineAddPerson(false);
    setNewPersonName('');
    setNewPersonPhone('');
  };

  const handleCreateInlineCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const newCat: Category = {
      id: generateId('cat'),
      name: newCatName.trim(),
      type: type === 'income' ? 'income' : 'expense',
      isDefault: false,
    };
    onSaveCategory(newCat);
    setCategoryName(newCat.name);
    setShowInlineAddCategory(false);
    setNewCatName('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white dark:bg-[#111726] w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 max-h-[92vh] overflow-y-auto shadow-xl border border-slate-200/80 dark:border-slate-800/80 animate-in fade-in transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {modalTitle}
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              {modalSubtitle}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Type Selector Grid (Clean Minimalist Segmented Tabs - only shown if multiple types available) */}
        {!editingTransaction && availableTypes.length > 1 && (
          <div className="mt-3.5 space-y-1.5">
            <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              {isDebtType ? 'ধার-দেনার ধরন' : 'লেনদেনের ধরন'}
            </div>
            <div className="flex flex-wrap gap-1.5 bg-slate-100/70 dark:bg-slate-900/70 p-1.5 rounded-2xl border border-slate-200/40 dark:border-slate-800/60">
              {availableTypes.map(item => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleTypeChange(item.key)}
                  className={`py-1.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    type === item.key
                      ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/60 dark:hover:bg-slate-800/60'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleFormSubmit} className="space-y-3.5 mt-3.5">
          {/* Amount Field (Touch Friendly & Large Minimalist Display) */}
          <div className="bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5">
            <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
              {type === 'loan_given' ? 'কত টাকা ধার দিচ্ছেন? (৳) *' :
               type === 'loan_repaid' ? 'কত টাকা ফেরত পেলেন? (৳) *' :
               type === 'loan_borrowed' ? 'কত টাকা ধার নিলেন? (৳) *' :
               type === 'borrow_repaid' ? 'কত টাকা শোধ দিচ্ছেন? (৳) *' :
               type === 'income' ? 'আয়ের পরিমাণ (৳) *' :
               type === 'expense' ? 'ব্যয়ের পরিমাণ (৳) *' :
               'স্থানান্তরের পরিমাণ (৳) *'}
            </label>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-slate-400 dark:text-slate-500">৳</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                autoFocus
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full text-3xl font-black text-slate-900 dark:text-slate-100 bg-transparent outline-none placeholder-slate-300 dark:placeholder-slate-700 tracking-tight"
              />
            </div>
          </div>

          {/* Account Selection */}
          {!isTransfer ? (
            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                {type === 'loan_given'
                  ? 'কোন ওয়ালেট/অ্যাকাউন্ট থেকে ধার দিচ্ছেন? *'
                  : type === 'loan_repaid'
                  ? 'ফেরত পাওয়া টাকা কোন ওয়ালেট/অ্যাকাউন্টে জমা হলো? *'
                  : type === 'loan_borrowed'
                  ? 'ধার নেওয়া টাকা কোন অ্যাকাউন্টে জমা হলো? *'
                  : type === 'borrow_repaid'
                  ? 'কোন ওয়ালেট/অ্যাকাউন্ট থেকে শোধ দিলেন? *'
                  : type === 'expense'
                  ? 'কোন অ্যাকাউন্ট থেকে টাকা গেল? *'
                  : 'কোন অ্যাকাউন্টে টাকা জমা হলো? *'}
              </label>
              <select
                value={accountId}
                onChange={e => setAccountId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 text-xs font-medium text-slate-800 dark:text-slate-200 outline-none focus:border-slate-400 dark:focus:border-slate-700 focus:bg-white dark:focus:bg-slate-900 transition-colors"
              >
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id} className="dark:bg-slate-900">{acc.name}</option>
                ))}
              </select>
            </div>
          ) : (
            /* Transfer: Source & Destination Accounts */
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">উৎস অ্যাকাউন্ট *</label>
                <select
                  value={accountId}
                  onChange={e => setAccountId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 text-xs font-medium text-slate-800 dark:text-slate-200 outline-none focus:border-slate-400 dark:focus:border-slate-700 focus:bg-white dark:focus:bg-slate-900 transition-colors"
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id} className="dark:bg-slate-900">{acc.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">গন্তব্য অ্যাকাউন্ট *</label>
                <select
                  value={toAccountId}
                  onChange={e => setToAccountId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 text-xs font-medium text-slate-800 dark:text-slate-200 outline-none focus:border-slate-400 dark:focus:border-slate-700 focus:bg-white dark:focus:bg-slate-900 transition-colors"
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id} className="dark:bg-slate-900">{acc.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Transfer Fee if applicable */}
          {isTransfer && (
            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                ট্রান্সফার ফি (ঐচ্ছিক ৳)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={fee}
                onChange={e => setFee(e.target.value)}
                placeholder="যেমন: ১৫.০০"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 text-xs font-medium text-slate-800 dark:text-slate-200 outline-none focus:border-slate-400 dark:focus:border-slate-700 focus:bg-white dark:focus:bg-slate-900 transition-colors placeholder-slate-400"
              />
            </div>
          )}

          {/* Person Selection if Debt/Loan */}
          {isDebtType && (
            <div>
              {fixedPerson ? (
                /* When person is already selected */
                <div className="bg-slate-50/80 dark:bg-slate-900/60 rounded-2xl p-3 border border-slate-200/80 dark:border-slate-800 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-xs shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">নির্বাচিত ব্যক্তি</div>
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100">{fixedPerson.name}</div>
                    {fixedPerson.phone && (
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">{fixedPerson.phone}</div>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      সংশ্লিষ্ট ব্যক্তি নির্বাচন করুন *
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowInlineAddPerson(true)}
                      className="text-[10px] font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 flex items-center gap-0.5 cursor-pointer"
                    >
                      <UserPlus className="w-3 h-3" />
                      + নতুন ব্যক্তি
                    </button>
                  </div>

                  <select
                    value={personId}
                    onChange={e => setPersonId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 text-xs font-medium text-slate-800 dark:text-slate-200 outline-none focus:border-slate-400 dark:focus:border-slate-700 focus:bg-white dark:focus:bg-slate-900 transition-colors"
                  >
                    <option value="" className="dark:bg-slate-900">-- ব্যক্তি নির্বাচন করুন --</option>
                    {persons.map(p => (
                      <option key={p.id} value={p.id} className="dark:bg-slate-900">{p.name}{p.phone ? ` (${p.phone})` : ''}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Category Selection if Expense/Income */}
          {!isDebtType && !isTransfer && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  ক্যাটাগরি *
                </label>
                <button
                  type="button"
                  onClick={() => setShowInlineAddCategory(true)}
                  className="text-[10px] font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 flex items-center gap-0.5 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  + নতুন ক্যাটাগরি
                </button>
              </div>

              <select
                value={categoryName}
                onChange={e => setCategoryName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 text-xs font-medium text-slate-800 dark:text-slate-200 outline-none focus:border-slate-400 dark:focus:border-slate-700 focus:bg-white dark:focus:bg-slate-900 transition-colors"
              >
                {categories
                  .filter(c => c.type === (type === 'income' ? 'income' : 'expense'))
                  .map(c => (
                    <option key={c.id} value={c.name} className="dark:bg-slate-900">{c.name}</option>
                  ))}
              </select>
            </div>
          )}

          {/* Date & Note Row */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">তারিখ *</label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 text-xs font-medium text-slate-800 dark:text-slate-200 outline-none focus:border-slate-400 dark:focus:border-slate-700 focus:bg-white dark:focus:bg-slate-900 transition-colors"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">নোট / বিবরণ</label>
              <input
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="ঐচ্ছিক (যেমন: বাজার)"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 text-xs font-medium text-slate-800 dark:text-slate-200 outline-none focus:border-slate-400 dark:focus:border-slate-700 focus:bg-white dark:focus:bg-slate-900 transition-colors placeholder-slate-400"
              />
            </div>
          </div>

          {/* Error display */}
          {errorMessage && (
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            id="quick-add-submit-btn"
            type="submit"
            className={`w-full py-3.5 rounded-2xl font-semibold text-sm shadow-sm transition-all cursor-pointer mt-2 text-white ${
              type === 'loan_given' ? 'bg-amber-600 hover:bg-amber-700 active:scale-[0.99]' :
              type === 'loan_repaid' ? 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99]' :
              type === 'loan_borrowed' ? 'bg-purple-600 hover:bg-purple-700 active:scale-[0.99]' :
              type === 'borrow_repaid' ? 'bg-rose-600 hover:bg-rose-700 active:scale-[0.99]' :
              'bg-slate-900 dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white active:scale-[0.99]'
            }`}
          >
            {editingTransaction ? 'পরিবর্তন সংরক্ষণ করুন' :
             type === 'loan_given' ? `${fixedPerson ? fixedPerson.name + '-কে ' : ''}ধার প্রদান সম্পন্ন করুন` :
             type === 'loan_repaid' ? 'ধার ফেরত জমা সম্পন্ন করুন' :
             type === 'loan_borrowed' ? 'ধার নেওয়া সম্পন্ন করুন' :
             type === 'borrow_repaid' ? 'ধার পরিশোধ সম্পন্ন করুন' :
             'লিপিবদ্ধ করুন'}
          </button>
        </form>

        {/* Modal: Inline Add Person */}
        {showInlineAddPerson && (
          <div className="fixed inset-0 z-60 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#111726] rounded-3xl p-5 w-full max-w-sm shadow-xl border border-slate-200/80 dark:border-slate-800 animate-in fade-in transition-colors">
              <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 dark:border-slate-800">
                <h4 className="font-semibold text-xs text-slate-900 dark:text-slate-100">নতুন ব্যক্তি যোগ</h4>
                <button onClick={() => setShowInlineAddPerson(false)} className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleCreateInlinePerson} className="space-y-3 mt-3">
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">নাম *</label>
                  <input
                    type="text"
                    required
                    value={newPersonName}
                    onChange={e => setNewPersonName(e.target.value)}
                    placeholder="যেমন: রহিম সাহেব"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-slate-100 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">মোবাইল নম্বর (ঐচ্ছিক)</label>
                  <input
                    type="tel"
                    value={newPersonPhone}
                    onChange={e => setNewPersonPhone(e.target.value)}
                    placeholder="017xxxxxxxx"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-slate-100 outline-none"
                  />
                </div>
                <button type="submit" className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 font-semibold text-xs cursor-pointer shadow-sm">
                  যোগ করুন
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Inline Add Category */}
        {showInlineAddCategory && (
          <div className="fixed inset-0 z-60 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#111726] rounded-3xl p-5 w-full max-w-sm shadow-xl border border-slate-200/80 dark:border-slate-800 animate-in fade-in transition-colors">
              <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 dark:border-slate-800">
                <h4 className="font-semibold text-xs text-slate-900 dark:text-slate-100">নতুন ক্যাটাগরি তৈরি</h4>
                <button onClick={() => setShowInlineAddCategory(false)} className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleCreateInlineCategory} className="space-y-3 mt-3">
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">ক্যাটাগরির নাম *</label>
                  <input
                    type="text"
                    required
                    value={newCatName}
                    onChange={e => setNewCatName(e.target.value)}
                    placeholder="যেমন: গিফট / উপহার"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-slate-100 outline-none"
                  />
                </div>
                <button type="submit" className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 font-semibold text-xs cursor-pointer shadow-sm">
                  সংরক্ষণ করুন
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
