
import { BudgetSettings } from './types.js';

export const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Food', subCategories: ['Groceries', 'Dining Out', 'Snacks'] },
  { name: 'Rent', subCategories: [] },
  { name: 'Utilities', subCategories: ['Electricity', 'Water', 'Internet', 'Phone'] },
  { name: 'Transport', subCategories: ['Gas', 'Public Transport', 'Maintenance', 'Parking'] },
  { name: 'Entertainment', subCategories: ['Movies', 'Games', 'Subscriptions'] },
  { name: 'Health', subCategories: ['Medical', 'Pharmacy', 'Fitness'] },
  { name: 'Shopping', subCategories: ['Clothing', 'Electronics', 'Home'] },
  { name: 'Travel', subCategories: ['Flights', 'Hotels', 'Activities'] },
  { name: 'Other', subCategories: [] }
];

export const DEFAULT_INCOME_CATEGORIES = [
  { name: 'Salary', subCategories: [] },
  { name: 'Bonus', subCategories: [] },
  { name: 'Freelance', subCategories: [] },
  { name: 'Investment', subCategories: [] },
  { name: 'Gift', subCategories: [] },
  { name: 'Other', subCategories: [] }
];

export const DEFAULT_ACCOUNTS = ['Checking', 'Savings', 'Credit Card', 'Cash'];

export const INITIAL_SETTINGS: BudgetSettings = {
  expenseCategories: DEFAULT_EXPENSE_CATEGORIES,
  incomeCategories: DEFAULT_INCOME_CATEGORIES,
  accounts: DEFAULT_ACCOUNTS,
  budgets: {
    'Food': 500,
    'Rent': 1500,
    'Utilities': 200,
    'Transport': 150
  },
  initialBalances: {
    'Checking': 2500,
    'Savings': 10000,
    'Credit Card': 0,
    'Cash': 100
  }
};

export const CATEGORY_COLORS = [
  '#6366F1', '#10B981', '#EF4444', '#F59E0B', '#8B5CF6', '#3B82F6', '#EC4899', '#14B8A6',
  '#6D28D9', '#D97706', '#059669', '#DB2777', '#7C3AED', '#0284C7', '#CA8A04', '#BE185D'
];

export const getCategoryColor = (name: string): string => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % CATEGORY_COLORS.length;
  return CATEGORY_COLORS[index];
};