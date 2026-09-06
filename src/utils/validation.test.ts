import { describe, it, expect } from 'vitest';
import { emptyData, type GoalTransaction } from '../types';
import { validateChange } from './validation';
describe('Allocations aux objectifs', () => {
  const d = emptyData();
  d.savings_goals = [
    {
      id: 'g',
      created_at: '2026-01-01',
      name: 'Voyage',
      amount: 2000,
      target_date: null,
      color: '#000000',
      icon: 'Plane',
    },
  ];
  const deposit: GoalTransaction = {
    id: 'in',
    created_at: '2026-01-01',
    goal_id: 'g',
    amount: 500,
    date: '2026-01-01',
    note: '',
  };
  d.goal_transactions = [deposit, { ...deposit, id: 'out', amount: -200 }];
  it('interdit de supprimer un dépôt nécessaire à un retrait', () => {
    expect(() => validateChange(d, 'goal_transactions', undefined, 'in')).toThrow('négatif');
  });
  it('autorise la correction d’un retrait', () => {
    expect(() =>
      validateChange(d, 'goal_transactions', { ...deposit, id: 'out', amount: -400 }),
    ).not.toThrow();
  });
  it('interdit un retrait supérieur au montant disponible', () => {
    expect(() =>
      validateChange(d, 'goal_transactions', { ...deposit, id: 'out', amount: -600 }),
    ).toThrow('négatif');
  });
});
