
export type TransactionType = 'expense' | 'income' | 'return';

export interface Transaction {
  id: string;
  name: string;
  amount: number;
  category: string;
  subCategory?: string;
  account: string;
  type: TransactionType;
  date: string; // ISO string
  budgetMonth: string; // YYYY-MM
  isRecurring: boolean;
}

export interface RecurringTransaction {
  id: string;
  name: string;
  amount: number;
  category: string;
  subCategory?: string;
  account: string;
  type: TransactionType;
  dayOfMonth: number;
  frequency: 'monthly' | 'weekly';
}

export interface CategoryItem {
  name: string;
  subCategories: string[];
}

export interface BudgetSettings {
  expenseCategories: CategoryItem[];
  incomeCategories: CategoryItem[];
  accounts: string[];
  budgets: Record<string, number>;
  initialBalances: Record<string, number>;
}

export interface MonthSummary {
  income: number;
  expenses: number;
  balance: number;
}
