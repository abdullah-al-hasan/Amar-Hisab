import { Account, Transaction, Person, LedgerEntry, PersonSummary } from '../types';
import { sortAccounts } from './storage';

export function formatMoney(amount: number | undefined | null, showDecimal = false): string {
  const n = Number(amount || 0);
  return n.toLocaleString('bn-BD', {
    minimumFractionDigits: showDecimal ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

export function formatEnglishMoney(amount: number | undefined | null): string {
  const n = Number(amount || 0);
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

// Calculate individual account balance based on complete transaction history
export function calculateAccountBalance(account: Account, transactions: Transaction[]): number {
  let balance = Number(account.openingBalance || 0);

  for (const t of transactions) {
    const amt = Number(t.amount || 0);
    const fee = Number(t.fee || 0);

    if (t.type === 'income' && t.accountId === account.id) {
      balance += amt;
    } else if (t.type === 'expense' && t.accountId === account.id) {
      balance -= amt;
    } else if (t.type === 'transfer') {
      if (t.accountId === account.id) {
        balance -= (amt + fee);
      }
      if (t.toAccountId === account.id) {
        balance += amt;
      }
    } else if (t.type === 'loan_given' && t.accountId === account.id) {
      balance -= amt;
    } else if (t.type === 'loan_repaid' && t.accountId === account.id) {
      balance += amt;
    } else if (t.type === 'loan_borrowed' && t.accountId === account.id) {
      balance += amt;
    } else if (t.type === 'borrow_repaid' && t.accountId === account.id) {
      balance -= amt;
    }
  }

  return balance;
}

// Calculate person running ledger entries
export function calculatePersonLedger(
  personId: string,
  transactions: Transaction[],
  accounts: Account[]
): { entries: LedgerEntry[]; summary: PersonSummary } {
  const accMap = new Map(accounts.map(a => [a.id, a.name]));

  // Filter transactions for this person and sort chronologically
  const personTxns = transactions
    .filter(t => t.personId === personId)
    .sort((a, b) => {
      const dateCmp = a.date.localeCompare(b.date);
      if (dateCmp !== 0) return dateCmp;
      return a.createdAt.localeCompare(b.createdAt);
    });

  let runningBalance = 0; // >0 = User is owed money (Receivable), <0 = User owes money (Payable)
  let totalGiven = 0;
  let totalReceived = 0;
  let givenCount = 0;
  let receivedCount = 0;

  const entries: LedgerEntry[] = personTxns.map(t => {
    const amt = Number(t.amount || 0);
    let given = 0;
    let received = 0;
    let description = '';

    switch (t.type) {
      case 'loan_given':
        description = 'ধার দিলাম';
        given = amt;
        runningBalance += amt;
        totalGiven += amt;
        givenCount += 1;
        break;
      case 'loan_repaid':
        description = 'ধার ফেরত পেলাম';
        received = amt;
        runningBalance -= amt;
        totalReceived += amt;
        receivedCount += 1;
        break;
      case 'loan_borrowed':
        description = 'ধার নিলাম';
        received = amt;
        runningBalance -= amt;
        totalReceived += amt;
        receivedCount += 1;
        break;
      case 'borrow_repaid':
        description = 'ধার ফেরত দিলাম';
        given = amt;
        runningBalance += amt;
        totalGiven += amt;
        givenCount += 1;
        break;
      default:
        description = t.categoryName || 'লেনদেন';
    }

    return {
      id: t.id,
      date: t.date,
      dueDate: t.dueDate,
      description,
      transactionType: t.type,
      given,
      received,
      balance: runningBalance,
      accountName: accMap.get(t.accountId) || 'ক্যাশ',
      note: t.note,
      transactionId: t.id,
    };
  });

  const firstTxn = personTxns[0];
  const lastTxn = personTxns[personTxns.length - 1];

  // Find latest specified dueDate from active debt transactions
  const latestDueDateTxn = [...personTxns].reverse().find(t => t.dueDate);
  const derivedDueDate = latestDueDateTxn?.dueDate;

  let status: 'receivable' | 'payable' | 'settled' = 'settled';
  if (runningBalance > 0.001) status = 'receivable';
  else if (runningBalance < -0.001) status = 'payable';

  return {
    entries,
    summary: {
      person: { id: personId, name: '', createdAt: '', updatedAt: '' },
      netBalance: runningBalance,
      totalGiven,
      totalReceived,
      transactionCount: personTxns.length,
      givenCount,
      receivedCount,
      initialDate: firstTxn?.date,
      lastDate: lastTxn?.date,
      dueDate: derivedDueDate,
      status,
    },
  };
}

// Calculate total receivables and payables across all persons
export function calculateDebtSummaries(persons: Person[], transactions: Transaction[], accounts: Account[]): {
  totalReceivable: number;
  totalPayable: number;
  personSummaries: PersonSummary[];
} {
  let totalReceivable = 0;
  let totalPayable = 0;

  const personSummaries: PersonSummary[] = persons.map(person => {
    const { summary } = calculatePersonLedger(person.id, transactions, accounts);
    summary.person = person;
    if (!summary.dueDate && person.dueDate) {
      summary.dueDate = person.dueDate;
    }

    if (summary.netBalance > 0.001) {
      totalReceivable += summary.netBalance;
    } else if (summary.netBalance < -0.001) {
      totalPayable += Math.abs(summary.netBalance);
    }

    return summary;
  });

  // Sort: active receivables & payables first
  personSummaries.sort((a, b) => {
    const absA = Math.abs(a.netBalance);
    const absB = Math.abs(b.netBalance);
    return absB - absA;
  });

  return {
    totalReceivable,
    totalPayable,
    personSummaries,
  };
}

// Calculate Net Worth and Master Financial Overview
export function calculateFinancialMetrics(
  accounts: Account[],
  transactions: Transaction[],
  persons: Person[],
  monthFilter?: string // YYYY-MM
) {
  // 1. Account balances (ordered by Cash -> Mobile Banking -> Bank -> Other)
  const sortedAccounts = sortAccounts(accounts);
  const accountBalances = sortedAccounts.map(acc => ({
    account: acc,
    balance: calculateAccountBalance(acc, transactions),
  }));

  const totalLiquidAssets = accountBalances.reduce((sum, item) => sum + item.balance, 0);

  // 2. Debt / Ledger metrics
  const { totalReceivable, totalPayable, personSummaries } = calculateDebtSummaries(persons, transactions, accounts);

  // 3. Net Worth = (Liquid assets in accounts + Receivables) - Payables
  const totalAssets = totalLiquidAssets + totalReceivable;
  const totalLiabilities = totalPayable;
  const netWorth = totalAssets - totalLiabilities;

  // 4. Inflow & Outflow for specific period (e.g. this month)
  let totalIncome = 0;
  let totalExpense = 0;

  for (const t of transactions) {
    if (monthFilter && !t.date.startsWith(monthFilter)) {
      continue;
    }
    const amt = Number(t.amount || 0);
    if (t.type === 'income') {
      totalIncome += amt;
    } else if (t.type === 'expense') {
      totalExpense += amt;
    }
  }

  const netCashFlow = totalIncome - totalExpense;

  return {
    accountBalances,
    totalLiquidAssets,
    totalReceivable,
    totalPayable,
    totalAssets,
    totalLiabilities,
    netWorth,
    totalIncome,
    totalExpense,
    netCashFlow,
    personSummaries,
  };
}

export const BANGLA_MONTH_NAMES = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

const BANGLA_DIGITS: { [key: string]: string } = {
  '0': '০',
  '1': '১',
  '2': '২',
  '3': '৩',
  '4': '৪',
  '5': '৫',
  '6': '৬',
  '7': '৭',
  '8': '৮',
  '9': '৯',
};

export function toBanglaDigits(val: number | string | undefined | null): string {
  if (val === undefined || val === null) return '';
  return String(val).replace(/[0-9]/g, digit => BANGLA_DIGITS[digit] || digit);
}

export function formatBanglaMonthYear(monthStr: string): string {
  if (!monthStr) return '';
  try {
    const [y, m] = monthStr.split('-');
    const monthIdx = parseInt(m, 10) - 1;
    const monthName = BANGLA_MONTH_NAMES[monthIdx] || m;
    const yearBn = toBanglaDigits(y);
    return `${monthName} ${yearBn}`;
  } catch {
    return monthStr;
  }
}

export function formatBanglaDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const [y, m, d] = dateStr.split('-');
    const monthIdx = parseInt(m, 10) - 1;
    const dayBn = toBanglaDigits(parseInt(d, 10));
    const yearBn = toBanglaDigits(y);
    return `${dayBn} ${BANGLA_MONTH_NAMES[monthIdx] || m} ${yearBn}`;
  } catch {
    return dateStr;
  }
}
