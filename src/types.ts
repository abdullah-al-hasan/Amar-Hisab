export type AccountType = 'cash' | 'mfs' | 'bank' | 'other';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  openingBalance: number;
  color?: string;
  icon?: string;
  isDefault?: boolean;
  isArchived?: boolean;
  createdAt: string;
}

export type TransactionType =
  | 'expense'        // ব্যয়
  | 'income'         // আয়
  | 'transfer'       // অ্যাকাউন্ট ট্রান্সফার
  | 'loan_given'     // ধার দিলাম (Receivable বৃদ্ধি, Account হ্রাস)
  | 'loan_repaid'    // ধার ফেরত পেলাম (Receivable হ্রাস, Account বৃদ্ধি)
  | 'loan_borrowed'  // ধার নিলাম (Payable বৃদ্ধি, Account বৃদ্ধি)
  | 'borrow_repaid'; // ধার ফেরত দিলাম (Payable হ্রাস, Account হ্রাস)

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  categoryId?: string;
  categoryName: string;
  accountId: string;          // Source account or primary account
  toAccountId?: string;        // Destination account for transfers
  personId?: string;           // Linked person for debt/loan transactions
  date: string;                // YYYY-MM-DD
  dueDate?: string;            // YYYY-MM-DD (ফেরত দেওয়ার/পাওয়ার নির্ধারিত তারিখ)
  note?: string;
  fee?: number;                // Optional fee for transfers/cashouts
  createdAt: string;
  updatedAt: string;
}

export interface Person {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  dueDate?: string;            // Default / last agreed due date
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  type: 'expense' | 'income';
  icon?: string;
  isDefault?: boolean;
  isArchived?: boolean;
}

export interface Budget {
  id: string;
  categoryName: string;
  month: string; // YYYY-MM
  amount: number;
}

export type FrequencyType = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface RecurringTransaction {
  id: string;
  title: string;
  type: 'expense' | 'income';
  amount: number;
  categoryName: string;
  accountId: string;
  frequency: FrequencyType;
  nextDueDate: string; // YYYY-MM-DD
  isActive: boolean;
  note?: string;
}

export interface LedgerEntry {
  id: string;
  date: string;
  dueDate?: string;
  description: string;
  transactionType: TransactionType;
  given: number;     // আমি দিয়েছি
  received: number;  // আমি পেয়েছি
  balance: number;   // Running balance (>0 = পাব, <0 = দেব)
  accountName: string;
  note?: string;
  transactionId: string;
}

export interface PersonSummary {
  person: Person;
  netBalance: number; // >0 means user will receive, <0 means user owes
  totalGiven: number;
  totalReceived: number;
  transactionCount: number;
  givenCount: number;      // কতবার ধার দিয়েছি বা ঋণ শোধ করেছি
  receivedCount: number;   // কতবার ধার নিয়েছি বা ফেরত পেয়েছি
  lastDate?: string;
  initialDate?: string;    // প্রথম ধার দেওয়া/নেওয়ার তারিখ
  dueDate?: string;        // ফেরত পাওয়ার/দেওয়ার নির্ধারিত তারিখ
  status: 'receivable' | 'payable' | 'settled';
}

export interface AppData {
  version: number;
  accounts: Account[];
  transactions: Transaction[];
  persons: Person[];
  categories: Category[];
  budgets: Budget[];
  recurring: RecurringTransaction[];
  exportedAt?: string;
}

export interface UserProfile {
  name: string;
  tagline?: string;
  avatarIcon?: string;
  photoURL?: string;
  phone?: string;
  email?: string;
  password?: string;
}

export interface FeedbackData {
  id: string;
  rating: number;
  category: 'feature' | 'bug' | 'suggestion' | 'praise';
  message: string;
  contact?: string;
  createdAt: string;
}

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
}

export interface DriveAccount {
  email: string;
  displayName?: string | null;
  photoURL?: string | null;
  accessToken: string;
  connectedAt: string;
}

