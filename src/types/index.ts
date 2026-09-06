export type AccountType = 'current' | 'savings' | 'cash' | 'investment' | 'other';
export type TransactionType = 'expense' | 'income' | 'transfer';
export type Frequency = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
export interface Base {
  id: string;
  created_at: string;
}
export interface Account extends Base {
  name: string;
  type: AccountType;
  balance: number;
  color: string;
  icon: string;
  description: string;
}
export interface Transaction extends Base {
  amount: number;
  type: TransactionType;
  category_id: string | null;
  account_id: string;
  to_account_id: string | null;
  source_event_id?: string | null;
  date: string;
  time: string;
  description: string;
  note: string;
}
export interface Category extends Base {
  name: string;
  icon: string;
  color: string;
}
export interface Subscription extends Base {
  name: string;
  amount: number;
  frequency: Frequency;
  interval_days: number;
  next_date: string;
  category_id: string | null;
  account_id: string;
  icon: string;
  color: string;
  active: boolean;
}
export interface Recurring extends Base {
  name: string;
  amount: number;
  type: TransactionType;
  frequency: Frequency;
  interval_days: number;
  next_date: string;
  account_id: string;
  to_account_id: string | null;
  category_id: string | null;
  active: boolean;
}
export interface Budget extends Base {
  month: string;
  amount: number;
}
export interface BudgetCategory extends Base {
  budget_id: string;
  category_id: string;
  amount: number;
}
export interface Goal extends Base {
  name: string;
  amount: number;
  target_date: string | null;
  color: string;
  icon: string;
}
export interface GoalTransaction extends Base {
  goal_id: string;
  amount: number;
  date: string;
  note: string;
}
export interface Settings extends Base {
  name: string;
  currency: string;
  theme: 'light' | 'dark' | 'system';
  budget_day: number;
}
export interface Tables {
  accounts: Account;
  transactions: Transaction;
  categories: Category;
  subscriptions: Subscription;
  recurring_transactions: Recurring;
  budgets: Budget;
  budget_categories: BudgetCategory;
  savings_goals: Goal;
  goal_transactions: GoalTransaction;
  settings: Settings;
}
export type Table = keyof Tables;
export type Data = { [K in Table]: Tables[K][] };
export const TABLES: Table[] = [
  'accounts',
  'categories',
  'transactions',
  'subscriptions',
  'recurring_transactions',
  'budgets',
  'budget_categories',
  'savings_goals',
  'goal_transactions',
  'settings',
];
export const APP_NAME = 'Nivo';
export const emptyData = (): Data => ({
  accounts: [],
  transactions: [],
  categories: [],
  subscriptions: [],
  recurring_transactions: [],
  budgets: [],
  budget_categories: [],
  savings_goals: [],
  goal_transactions: [],
  settings: [],
});
