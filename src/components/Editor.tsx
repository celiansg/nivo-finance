import { useState, type FormEvent } from 'react';
import type { Table, Tables, TransactionType } from '../types';
import { useFinance } from '../hooks/useFinance';
import { accountBalance, iso, openingBalanceForTarget } from '../utils/finance';
import { Icon, Modal } from './ui';
export type EditorRequest = {
  table: Table;
  record?: Tables[Table];
  defaults?: Record<string, string | number | boolean | null>;
};
type Field = {
  key: string;
  label: string;
  type?: string;
  options?: [string, string][];
  required?: boolean;
  min?: number;
  max?: number;
};
const frequencies: [string, string][] = [
  ['daily', 'Quotidien'],
  ['weekly', 'Hebdomadaire'],
  ['monthly', 'Mensuel'],
  ['yearly', 'Annuel'],
  ['custom', 'Personnalisé (jours)'],
];
const types: [string, string][] = [
  ['expense', 'Dépense'],
  ['income', 'Revenu'],
  ['transfer', 'Transfert'],
];
const titles: Record<Table, string> = {
  accounts: 'un compte',
  transactions: 'une transaction',
  categories: 'une catégorie',
  subscriptions: 'un abonnement',
  recurring_transactions: 'une opération récurrente',
  budgets: 'un budget',
  budget_categories: 'un budget de catégorie',
  savings_goals: 'un objectif',
  goal_transactions: 'une allocation',
  settings: 'les réglages',
};
export function Editor({ request, onClose }: { request: EditorRequest; onClose: () => void }) {
  const { data, save, remove } = useFinance();
  const { table, record, defaults } = request;
  const initial: Record<string, unknown> = {
    name: '',
    amount: '',
    balance: 0,
    type: table === 'accounts' ? 'current' : 'expense',
    category_id: data.categories[0]?.id ?? '',
    account_id: data.accounts[0]?.id ?? '',
    to_account_id: null,
    date: iso(),
    time: '',
    description: '',
    note: '',
    color: '#0A84FF',
    icon: table === 'savings_goals' ? 'Sparkles' : 'Wallet',
    frequency: 'monthly',
    interval_days: 1,
    next_date: iso(),
    active: true,
    month: iso().slice(0, 7) + '-01',
    target_date: '',
    goal_id: data.savings_goals[0]?.id ?? '',
    budget_id: data.budgets[0]?.id ?? '',
    ...defaults,
    ...record,
  };
  if (table === 'accounts' && record)
    initial.balance = accountBalance(record as Tables['accounts'], data.transactions);
  const [values, setValues] = useState(initial),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [confirmDelete, setConfirmDelete] = useState(false);
  const option = (rows: { id: string; name: string }[]): [string, string][] =>
    rows.map((r) => [r.id, r.name]);
  const account: Field = {
    key: 'account_id',
    label: 'Compte',
    options: option(data.accounts),
    required: true,
  };
  const category: Field = {
    key: 'category_id',
    label: 'Catégorie',
    options: option(data.categories),
    required: true,
  };
  const amount: Field = {
    key: 'amount',
    label: table === 'goal_transactions' ? 'Montant (+ ajouter / − retirer)' : 'Montant',
    type: 'number',
    min: table === 'goal_transactions' ? undefined : 0.01,
    required: true,
  };
  const name: Field = { key: 'name', label: 'Nom', required: true };
  const color: Field = { key: 'color', label: 'Couleur', type: 'color' };
  const icon: Field = {
    key: 'icon',
    label: 'Icône',
    options: [
      'Wallet',
      'PiggyBank',
      'Banknote',
      'Landmark',
      'Plane',
      'Laptop',
      'House',
      'Music2',
      'Play',
      'Cloud',
      'Heart',
      'ShoppingBasket',
      'Utensils',
      'Car',
      'Gift',
      'Sparkles',
      'BriefcaseBusiness',
      'Repeat',
      'Shapes',
    ].map((n, i) => [
      n,
      [
        'Portefeuille',
        'Tirelire',
        'Billets',
        'Banque',
        'Voyage',
        'Ordinateur',
        'Maison',
        'Musique',
        'Vidéo',
        'Nuage',
        'Cœur',
        'Courses',
        'Restaurant',
        'Voiture',
        'Cadeau',
        'Étoiles',
        'Travail',
        'Récurrence',
        'Autre',
      ][i],
    ]),
  };
  const type: Field = { key: 'type', label: 'Type', options: types, required: true };
  const destination: Field = {
    key: 'to_account_id',
    label: 'Compte destinataire',
    options: option(data.accounts.filter((a) => a.id !== values.account_id)),
    required: true,
  };
  const recurrence: Field[] = [
    { key: 'frequency', label: 'Fréquence', options: frequencies, required: true },
    ...(values.frequency === 'custom'
      ? [
          {
            key: 'interval_days',
            label: 'Tous les … jours',
            type: 'number',
            min: 1,
            max: 3650,
            required: true,
          },
        ]
      : []),
    { key: 'next_date', label: 'Prochaine échéance', type: 'date', required: true },
    { key: 'active', label: 'Actif', type: 'checkbox' },
  ];
  const fields: Record<Table, Field[]> = {
    accounts: [
      name,
      {
        key: 'type',
        label: 'Type',
        options: [
          ['current', 'Compte courant'],
          ['savings', 'Épargne / Livret'],
          ['cash', 'Espèces'],
          ['investment', 'Investissements'],
          ['other', 'Autre'],
        ],
      },
      {
        key: 'balance',
        label: record ? 'Solde actuel' : 'Solde de départ',
        type: 'number',
        required: true,
      },
      color,
      icon,
      { key: 'description', label: 'Description' },
    ],
    transactions: [
      type,
      amount,
      { key: 'description', label: 'Libellé', required: true },
      account,
      ...(values.type === 'transfer' ? [destination] : [category]),
      { key: 'date', label: 'Date', type: 'date', required: true },
      { key: 'time', label: 'Heure (facultatif)', type: 'time' },
      { key: 'note', label: 'Note', type: 'textarea' },
    ],
    categories: [name, icon, color],
    subscriptions: [name, amount, account, category, ...recurrence, icon, color],
    recurring_transactions: [
      name,
      type,
      amount,
      account,
      ...(values.type === 'transfer' ? [destination] : [category]),
      ...recurrence,
    ],
    budgets: [
      { key: 'month', label: 'Début de la période budgétaire', type: 'date', required: true },
      amount,
    ],
    budget_categories: [
      {
        key: 'budget_id',
        label: 'Budget',
        options: data.budgets.map((b) => [b.id, b.month]),
        required: true,
      },
      category,
      amount,
    ],
    savings_goals: [
      name,
      amount,
      { key: 'target_date', label: 'Date cible (facultatif)', type: 'date' },
      icon,
      color,
    ],
    goal_transactions: [
      { key: 'goal_id', label: 'Objectif', options: option(data.savings_goals), required: true },
      amount,
      { key: 'date', label: 'Date', type: 'date', required: true },
      { key: 'note', label: 'Note' },
    ],
    settings: [],
  };
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const payload: Record<string, unknown> = {
        id: record?.id ?? crypto.randomUUID(),
        created_at: record?.created_at ?? new Date().toISOString(),
      };
      for (const field of fields[table])
        payload[field.key] =
          field.type === 'number' ? Number(values[field.key]) : values[field.key];
      if ('amount' in payload && (!Number.isFinite(payload.amount) || Number(payload.amount) === 0))
        throw new Error('Indiquez un montant valide.');
      if (table === 'accounts' && record)
        payload.balance = openingBalanceForTarget(
          record as Tables['accounts'],
          data.transactions,
          Number(payload.balance),
        );
      if (
        (table === 'transactions' || table === 'recurring_transactions') &&
        values.type === 'transfer' &&
        values.account_id === values.to_account_id
      )
        throw new Error('Choisissez deux comptes différents.');
      if (table === 'transactions') {
        payload.source_event_id = values.source_event_id ?? null;
        payload.to_account_id = values.type === 'transfer' ? values.to_account_id : null;
        payload.category_id = values.type === 'transfer' ? null : values.category_id;
      }
      if (table === 'recurring_transactions') {
        payload.to_account_id = values.type === 'transfer' ? values.to_account_id : null;
        payload.category_id = values.type === 'transfer' ? null : values.category_id;
      }
      if (table === 'subscriptions' || table === 'recurring_transactions')
        payload.interval_days = values.frequency === 'custom' ? Number(values.interval_days) : 1;
      if (table === 'savings_goals' && !payload.target_date) payload.target_date = null;
      if (table === 'goal_transactions') {
        const existing = data.goal_transactions
          .filter((t) => t.goal_id === values.goal_id && t.id !== record?.id)
          .reduce((a, t) => a + t.amount, 0);
        if (existing + Number(payload.amount) < 0)
          throw new Error('Le retrait dépasse le montant alloué à cet objectif.');
      }
      if (
        table === 'budgets' &&
        data.budgets.some((b) => b.month === values.month && b.id !== record?.id)
      )
        throw new Error('Un budget existe déjà pour cette période.');
      if (
        table === 'budget_categories' &&
        data.budget_categories.some(
          (b) =>
            b.budget_id === values.budget_id &&
            b.category_id === values.category_id &&
            b.id !== record?.id,
        )
      )
        throw new Error('Cette catégorie possède déjà un budget.');
      await save(table, payload as unknown as Tables[typeof table]);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible.');
    } finally {
      setBusy(false);
    }
  }
  async function destroy() {
    setBusy(true);
    setError('');
    try {
      await remove(table, record!.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Suppression impossible.');
      setBusy(false);
      setConfirmDelete(false);
    }
  }
  return (
    <Modal
      title={`${record ? 'Modifier' : 'Ajouter'} ${titles[table]}`}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      {confirmDelete ? (
        <div>
          <p>
            Supprimer définitivement cet élément
            {table === 'savings_goals' ? ' et ses allocations' : ''} ?
          </p>
          <div className="form-actions">
            <button className="button" onClick={() => setConfirmDelete(false)}>
              Annuler
            </button>
            <button className="button danger" disabled={busy} onClick={destroy}>
              Confirmer la suppression
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit}>
          <div className="form-grid">
            {fields[table].map((f) => (
              <label className={f.type === 'textarea' ? 'field full' : 'field'} key={f.key}>
                <span>{f.label}</span>
                {f.options ? (
                  <select
                    required={f.required}
                    value={String(values[f.key] ?? '')}
                    onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                  >
                    <option value="" disabled>
                      Choisir…
                    </option>
                    {f.options.map(([v, label]) => (
                      <option value={v} key={v}>
                        {label}
                      </option>
                    ))}
                  </select>
                ) : f.type === 'textarea' ? (
                  <textarea
                    maxLength={2000}
                    value={String(values[f.key] ?? '')}
                    onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                  />
                ) : f.type === 'checkbox' ? (
                  <input
                    type="checkbox"
                    checked={!!values[f.key]}
                    onChange={(e) => setValues({ ...values, [f.key]: e.target.checked })}
                  />
                ) : (
                  <input
                    required={f.required}
                    type={f.type ?? 'text'}
                    inputMode={f.type === 'number' ? 'decimal' : undefined}
                    min={f.min}
                    max={f.max}
                    step={f.key === 'interval_days' ? 1 : f.type === 'number' ? 0.01 : undefined}
                    maxLength={200}
                    value={String(values[f.key] ?? '')}
                    onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                  />
                )}
              </label>
            ))}
          </div>
          {table === 'goal_transactions' && (
            <p className="form-hint">
              Une allocation réserve une partie de votre épargne à un projet. Elle ne déplace pas
              d’argent entre comptes.
            </p>
          )}
          {(table === 'subscriptions' || table === 'recurring_transactions') && (
            <p className="form-hint">
              Les échéances alimentent les prévisions. Elles ne créent pas de débit réel
              automatiquement.
            </p>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="form-actions">
            {record && (
              <button
                type="button"
                className="icon-button danger-text"
                aria-label="Supprimer"
                onClick={() => setConfirmDelete(true)}
              >
                <Icon name="Trash2" />
              </button>
            )}
            <button type="button" className="button" onClick={onClose} disabled={busy}>
              Annuler
            </button>
            <button type="submit" className="button primary" disabled={busy}>
              {busy ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
export function QuickAdd({
  onSelect,
  onClose,
}: {
  onSelect: (r: EditorRequest) => void;
  onClose: () => void;
}) {
  return (
    <Modal title="Que souhaitez-vous ajouter ?" onClose={onClose}>
      <div className="quick-actions">
        {[
          ['expense', 'Une dépense', 'ArrowUpRight'],
          ['income', 'Un revenu', 'ArrowDownLeft'],
          ['transfer', 'Un transfert', 'ArrowLeftRight'],
          ['subscription', 'Un abonnement', 'Repeat'],
        ].map(([type, label, icon]) => (
          <button
            key={type}
            onClick={() =>
              onSelect({
                table: type === 'subscription' ? 'subscriptions' : 'transactions',
                defaults: type === 'subscription' ? {} : { type: type as TransactionType },
              })
            }
          >
            <Icon name={icon} />
            <span>{label}</span>
            <Icon name="ChevronRight" size={17} />
          </button>
        ))}
      </div>
    </Modal>
  );
}
