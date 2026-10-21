import { describe, expect, it } from 'vitest';
import { buildFinancialInsights, detectRecurringCandidates, simulateMonthlySavings } from './insights';
import type { Data } from '../types';

const base: Data = {
  accounts: [{ id: 'account', created_at: '2025-01-01T00:00:00.000Z', name: 'Courant', type: 'current', balance: 0, color: '#000', icon: 'Wallet', description: '' }],
  categories: [{ id: 'other', created_at: '2025-01-01T00:00:00.000Z', name: 'Autre', icon: 'Shapes', color: '#000' }],
  transactions: [],
  subscriptions: [],
  recurring_transactions: [],
  budgets: [],
  budget_categories: [],
  savings_goals: [],
  goal_transactions: [],
  settings: [{ id: 'preferences', created_at: '2025-01-01T00:00:00.000Z', name: '', currency: 'EUR', theme: 'light', budget_day: 1 }],
};

const transaction = (id: string, date: string, description: string, amount: number, type: 'expense' | 'income' = 'expense') => ({
  id,
  created_at: `${date}T12:00:00.000Z`,
  amount,
  type,
  category_id: 'other',
  account_id: 'account',
  to_account_id: null,
  date,
  time: '12:00',
  description,
  note: '',
});

describe('financial insights', () => {
  it('detects a stable merchant recurrence without counting rent or restaurants', () => {
    const data = {
      ...base,
      transactions: [
        transaction('1', '2026-01-12', 'Cloud Music', 9.99),
        transaction('2', '2026-02-12', 'Cloud Music', 9.99),
        transaction('3', '2026-03-12', 'Cloud Music', 9.99),
        transaction('4', '2026-01-05', 'Loyer', 780),
        transaction('5', '2026-02-05', 'Loyer', 780),
        transaction('6', '2026-01-18', 'Restaurant Le Parc', 24),
        transaction('7', '2026-02-18', 'Restaurant Le Parc', 24),
      ],
    };
    const candidates = detectRecurringCandidates(data, new Date('2026-03-20T12:00:00Z'));
    expect(candidates).toHaveLength(1);
    expect(candidates[0].name).toBe('Cloud Music');
    expect(candidates[0].monthlyAmount).toBe(9.99);
    expect(candidates[0].confidence).toBeGreaterThan(0.55);
  });

  it('calculates disposable money from known income, fixed charges, expenses and savings', () => {
    const data: Data = {
      ...base,
      transactions: [
        transaction('income', '2026-03-02', 'Salaire', 2000, 'income'),
        transaction('expense', '2026-03-08', 'Courses', 350),
      ],
      subscriptions: [{ id: 'sub', created_at: '2026-01-01T00:00:00.000Z', name: 'Cloud Music', amount: 10, frequency: 'monthly', interval_days: 1, next_date: '2026-04-12', category_id: 'other', account_id: 'account', icon: 'Repeat', color: '#000', active: true }],
      recurring_transactions: [{ id: 'save', created_at: '2026-01-01T00:00:00.000Z', name: 'Virement épargne', amount: 200, type: 'transfer', frequency: 'monthly', interval_days: 1, next_date: '2026-04-01', account_id: 'account', to_account_id: 'savings', category_id: null, active: true }],
    };
    const insights = buildFinancialInsights(data, new Date('2026-03-20T12:00:00Z'));
    expect(insights.income).toBe(2000);
    expect(insights.fixedExpenses).toBe(10);
    expect(insights.variableExpenses).toBe(350);
    expect(insights.plannedSavings).toBe(200);
    expect(insights.disposable).toBe(1440);
    expect(insights.disposableKnown).toBe(true);
  });

  it('keeps a savings scenario read-only and explains feasibility', () => {
    const insights = buildFinancialInsights(base, new Date('2026-03-20T12:00:00Z'));
    const scenario = simulateMonthlySavings({ ...insights, disposable: 250, disposableKnown: true }, 100);
    expect(scenario.feasible).toBe(true);
    expect(scenario.remainingDisposable).toBe(150);
    expect(scenario.annualImpact).toBe(1200);
  });
});
