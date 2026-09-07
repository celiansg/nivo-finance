import { describe, it, expect } from 'vitest';
import { emptyData, type Account, type Recurring, type Transaction } from '../types';
import {
  accountBalance,
  advance,
  dueIncomePostings,
  history,
  monthlyCost,
  occurrences,
  openingBalanceForTarget,
  period,
  summary,
} from './finance';
const base = { id: 'a', created_at: '2026-01-01' };
const account: Account = {
  ...base,
  name: 'Courant',
  type: 'current',
  balance: 1000,
  color: '#000000',
  icon: 'Wallet',
  description: '',
};
const tx: Transaction = {
  ...base,
  id: 't',
  amount: 300,
  type: 'transfer',
  category_id: '',
  account_id: 'a',
  to_account_id: 'b',
  date: '2026-09-05',
  time: '',
  description: 'Épargne',
  note: '',
};
const recurring: Recurring = {
  ...base,
  id: 'rent',
  name: 'Loyer',
  amount: 100,
  type: 'expense',
  frequency: 'monthly',
  interval_days: 1,
  next_date: '2026-01-31',
  account_id: 'a',
  to_account_id: null,
  category_id: '',
  active: true,
};
describe('Transferts et soldes', () => {
  it('préserve le patrimoine et exclut les transferts des dépenses', () => {
    const d = emptyData();
    d.accounts = [account, { ...account, id: 'b', type: 'savings', balance: 200 }];
    d.transactions = [tx];
    const s = summary(d, new Date(2026, 8, 5));
    expect(s.available).toBe(700);
    expect(s.savings).toBe(500);
    expect(s.total).toBe(1200);
    expect(s.income).toBe(0);
    expect(s.expense).toBe(0);
  });
  it('ne comptabilise pas une transaction future', () => {
    expect(accountBalance(account, [{ ...tx, date: '2026-10-01' }], '2026-09-05')).toBe(1000);
  });
  it('ne montre pas le solde initial avant la création du compte', () => {
    const recent = { ...account, created_at: '2026-09-03T10:00:00.000Z' };
    expect(accountBalance(recent, [], '2026-09-02')).toBe(0);
    expect(accountBalance(recent, [], '2026-09-03')).toBe(1000);
    const d = emptyData();
    d.accounts = [recent];
    expect(history(d, '7j')[0].value).toBe(0);
  });
  it('annule l’effet d’une opération supprimée et remplace celui d’une opération modifiée', () => {
    expect(accountBalance(account, [])).toBe(1000);
    expect(accountBalance(account, [{ ...tx, amount: 50 }], '2026-09-05')).toBe(950);
  });
  it('convertit un nouveau solde actuel en solde de départ', () => {
    const expense = { ...tx, type: 'expense' as const, amount: 100, to_account_id: null };
    expect(openingBalanceForTarget(account, [expense], 1500, '2026-09-05')).toBe(1600);
    expect(accountBalance({ ...account, balance: 1600 }, [expense], '2026-09-05')).toBe(1500);
  });
});
describe('Calendrier', () => {
  it('conserve le jour d’ancrage après février', () => {
    const rows = occurrences(recurring, '2026-01-01', '2026-04-30');
    expect(rows.map((e) => e.date)).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
    ]);
  });
  it('gère une année bissextile', () => {
    expect(advance('2024-02-29', 'yearly')).toBe('2025-02-28');
    expect(advance('2024-02-29', 'yearly', 1, 4)).toBe('2028-02-29');
  });
  it('gère les rythmes personnalisés et inactifs', () => {
    expect(
      occurrences(
        { ...recurring, next_date: '2026-09-01', frequency: 'custom', interval_days: 10 },
        '2026-09-01',
        '2026-09-30',
      ),
    ).toHaveLength(3);
    expect(occurrences({ ...recurring, active: false }, '2026-01-01', '2026-12-31')).toEqual([]);
  });
  it('calcule la période budgétaire avant son jour de début', () => {
    expect(period(new Date(2026, 8, 5), 10)).toEqual({ start: '2026-08-10', end: '2026-09-09' });
  });
  it('prépare le salaire dû et avance sa prochaine date', () => {
    const d = emptyData();
    d.recurring_transactions = [
      { ...recurring, id: 'salary', name: 'Salaire', type: 'income', next_date: '2026-09-05' },
    ];
    const plan = dueIncomePostings(d, '2026-09-05', '2026-09-05T08:00:00.000Z');
    expect(plan.transactions).toMatchObject([
      {
        id: 'salary-2026-09-05',
        source_event_id: 'salary-2026-09-05',
        amount: 100,
        type: 'income',
        date: '2026-09-05',
      },
    ]);
    expect(plan.updates[0].next_date).toBe('2026-10-05');
  });
  it('ne recrée pas un salaire déjà ajouté', () => {
    const d = emptyData();
    d.recurring_transactions = [
      { ...recurring, id: 'salary', type: 'income', next_date: '2026-09-05' },
    ];
    d.transactions = [
      {
        ...tx,
        id: 'salary-2026-09-05',
        type: 'income',
        source_event_id: 'salary-2026-09-05',
      },
    ];
    const plan = dueIncomePostings(d, '2026-09-05');
    expect(plan.transactions).toEqual([]);
    expect(plan.updates[0].next_date).toBe('2026-10-05');
  });
});
describe('Prévisions', () => {
  it('inclut les échéances du jour', () => {
    const d = emptyData();
    d.accounts = [account];
    d.recurring_transactions = [{ ...recurring, next_date: '2026-09-05' }];
    expect(summary(d, new Date(2026, 8, 5)).remaining).toBe(900);
  });
  it('ne compte pas deux fois une échéance réglée', () => {
    const d = emptyData();
    d.accounts = [account];
    d.recurring_transactions = [{ ...recurring, next_date: '2026-09-05' }];
    d.transactions = [
      {
        ...tx,
        type: 'expense',
        amount: 100,
        to_account_id: null,
        source_event_id: 'rent-2026-09-05',
      },
    ];
    const s = summary(d, new Date(2026, 8, 5));
    expect(s.available).toBe(900);
    expect(s.planned).toBe(0);
    expect(s.remaining).toBe(900);
  });
  it('soustrait les dépenses et l’épargne mais réserve les revenus attendus à la prévision', () => {
    const d = emptyData();
    d.accounts = [account, { ...account, id: 'b', type: 'savings', balance: 200 }];
    d.recurring_transactions = [
      { ...recurring, next_date: '2026-09-10' },
      {
        ...recurring,
        id: 'save',
        type: 'transfer',
        amount: 200,
        to_account_id: 'b',
        next_date: '2026-09-20',
      },
      { ...recurring, id: 'salary', type: 'income', amount: 500, next_date: '2026-09-25' },
    ];
    const s = summary(d, new Date(2026, 8, 5));
    expect(s.remaining).toBe(700);
    expect(s.forecast).toBe(1200);
    expect(s.days).toBe(26);
    expect(s.daily).toBe(26.92);
  });
  it('ne soustrait pas les dépenses d’un compte d’épargne au disponible', () => {
    const d = emptyData();
    d.accounts = [account];
    d.recurring_transactions = [{ ...recurring, account_id: 'b', next_date: '2026-09-10' }];
    expect(summary(d, new Date(2026, 8, 5)).remaining).toBe(1000);
  });
  it('annualise les abonnements annuels sans les multiplier par douze', () => {
    expect(
      monthlyCost({
        ...recurring,
        frequency: 'yearly',
        amount: 120,
        icon: 'Repeat',
        color: '#fff',
      }),
    ).toBe(10);
  });
});
