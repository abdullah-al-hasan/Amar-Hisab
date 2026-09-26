import React, { useState, useEffect } from 'react';
import { 
  X, Wallet, Building2, Smartphone, Plus, 
  ArrowLeftRight, Trash2, Check, AlertCircle 
} from 'lucide-react';
import { Account, AccountType } from '../types';
import { formatMoney } from '../utils/accounting';
import { generateId } from '../utils/storage';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingAccount?: Account | null;
  currentBalance?: number;
  onSaveAccount: (account: Account) => void;
  onDeleteAccount: (id: string) => void;
  onOpenTransfer: () => void;
  onAddFundsToAccount: (accountId: string) => void;
}

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  editingAccount,
  currentBalance = 0,
  onSaveAccount,
  onDeleteAccount,
  onOpenTransfer,
  onAddFundsToAccount,
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('cash');
  const [openingBalance, setOpeningBalance] = useState('');

  useEffect(() => {
    if (editingAccount) {
      setName(editingAccount.name);
      setType(editingAccount.type);
      setOpeningBalance(editingAccount.openingBalance.toString());
    } else {
      setName('');
      setType('cash');
      setOpeningBalance('0');
    }
  }, [editingAccount, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const opBal = editingAccount 
      ? editingAccount.openingBalance 
      : (parseFloat(openingBalance) || 0);

    onSaveAccount({
      id: editingAccount ? editingAccount.id : generateId('acc'),
      name: name.trim(),
      type,
      openingBalance: opBal,
      isDefault: editingAccount ? editingAccount.isDefault : false,
      createdAt: editingAccount ? editingAccount.createdAt : new Date().toISOString(),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#111726] w-full max-w-md rounded-3xl p-5 shadow-2xl border border-slate-200/80 dark:border-slate-800 animate-in fade-in transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              {editingAccount ? 'অ্যাকাউন্ট বিবরণ ও সম্পাদনা' : 'নতুন অ্যাকাউন্ট তৈরি করুন'}
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              {editingAccount ? 'নাম ও ধরন পরিবর্তন করুন বা টাকা যুক্ত করুন' : 'ক্যাশ, মোবাইল ওয়ালেট বা ব্যাংক অ্যাকাউন্ট যুক্ত করুন'}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Balance Display if editing */}
        {editingAccount && (
          <div className="mt-3 p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                বর্তমান ব্যালেন্স
              </div>
              <div className={`text-xl font-black mt-0.5 privacy-blur ${currentBalance >= 0 ? 'text-slate-900 dark:text-slate-100' : 'text-rose-600 dark:text-rose-400'}`}>
                ৳{formatMoney(currentBalance)}
              </div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                টাকা বাড়াতে 'টাকা যোগ' চাপুন
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                onAddFundsToAccount(editingAccount.id);
              }}
              className="px-3 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-semibold active:scale-95 transition-all flex items-center gap-1 cursor-pointer shrink-0"
              title="এই অ্যাকাউন্টে টাকা যোগ করুন"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>টাকা যোগ</span>
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 mt-3">
          <div>
            <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">অ্যাকাউন্টের নাম *</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="যেমন: রকেট / ব্র্যাক ব্যাংক / অফিস ক্যাশ"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 text-slate-900 dark:text-slate-100 text-xs font-medium focus:border-slate-900 dark:focus:border-slate-600 outline-none transition-colors"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">অ্যাকাউন্টের ধরন</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'cash', label: 'নগদ ক্যাশ', icon: <Wallet className="w-4 h-4" /> },
                { key: 'mfs', label: 'মোবাইল ব্যাংকিং', icon: <Smartphone className="w-4 h-4" /> },
                { key: 'bank', label: 'ব্যাংক', icon: <Building2 className="w-4 h-4" /> },
              ].map(opt => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setType(opt.key as any)}
                  className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 text-xs font-semibold transition-all cursor-pointer ${
                    type === opt.key
                      ? 'border-slate-900 dark:border-slate-100 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs'
                      : 'border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <span className={type === opt.key ? 'text-white dark:text-slate-900' : 'text-slate-600 dark:text-slate-400'}>{opt.icon}</span>
                  <span className="text-[10.5px]">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Opening balance only when CREATING new account */}
          {!editingAccount ? (
            <div>
              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                প্রারম্ভিক ব্যালেন্স (৳)
              </label>
              <input
                type="number"
                step="0.01"
                value={openingBalance}
                onChange={e => setOpeningBalance(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 text-sm font-bold text-slate-900 dark:text-slate-100 outline-none focus:border-slate-900 dark:focus:border-slate-600 transition-colors"
              />
              <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">
                খাতা শুরুর সময় অ্যাকাউন্টে যত টাকা ছিল
              </span>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">প্রারম্ভিক ব্যালেন্স:</span>
              <span className="font-bold text-slate-900 dark:text-slate-100 privacy-blur">৳{formatMoney(editingAccount.openingBalance)}</span>
            </div>
          )}

          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
            >
              বাতিল
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-semibold cursor-pointer transition-colors shadow-xs"
            >
              সংরক্ষণ করুন
            </button>
          </div>

          {editingAccount && !editingAccount.isDefault && (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <span className="text-[10px] text-slate-400 dark:text-slate-500">এই অ্যাকাউন্টটি সরাতে চান?</span>
              <button
                type="button"
                onClick={() => {
                  if (confirm(`সত্যিই কি "${editingAccount.name}" অ্যাকাউন্টটি মুছে ফেলবেন?`)) {
                    onDeleteAccount(editingAccount.id);
                    onClose();
                  }
                }}
                className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                অ্যাকাউন্ট মুছুন
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
