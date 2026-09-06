import type { Account, Data, Frequency, Recurring, Subscription, Transaction } from '../types';

export const iso = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const parseDate = (s: string) => new Date(`${s}T12:00:00`);

export const money = (n: number, currency = 'EUR') =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency, maximumFractionDigits: 2 }).format(
    n,
  );

export const shortDate = (s: string) =>
  parseDate(s).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

export const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function period(now = new Date(), day = 1) {
  const start = new Date(now.getFullYear(), now.getMonth() - (now.getDate() < day ? 1 : 0), day);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, day - 1);
  return { start: iso(start), end: iso(end) };
}

export function accountBalance(account: Account, transactions: Transaction[], until = iso()) {
  if (until < account.created_at.slice(0, 10)) return 0;
  return round(
    account.balance +
      transactions
        .filter((t) => t.date <= until)
        .reduce(
          (sum, t) =>
            sum +
            (t.account_id === account.id ? (t.type === 'income' ? t.amount : -t.amount) : 0) +
            (t.type === 'transfer' && t.to_account_id === account.id ? t.amount : 0),
          0,
        ),
  );
}

export function openingBalanceForTarget(
  account: Account,
  transactions: Transaction[],
  targetBalance: number,
  until = iso(),
) {
  const transactionEffect = accountBalance({ ...account, balance: 0 }, transactions, until);
  return round(targetBalance - transactionEffect);
}

export function advance(date: string, frequency: Frequency, interval = 1, step = 1) {
  const d = parseDate(date);
  if (frequency === 'monthly' || frequency === 'yearly') {
    const day = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + step * (frequency === 'yearly' ? 12 : 1));
    d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
  } else
    d.setDate(
      d.getDate() +
        step * (frequency === 'weekly' ? 7 : frequency === 'custom' ? Math.max(1, interval) : 1),
    );
  return iso(d);
}

export interface Event {
  id: string;
  date: string;
  name: string;
  amount: number;
  type: 'income' | 'expense' | 'transfer';
  account_id: string;
  to_account_id?: string | null;
  source: string;
}

export function occurrences(item: Subscription | Recurring, start: string, end: string): Event[] {
  if (!item.active) return [];
  const result: Event[] = [];
  let i = 0;
  let date = item.next_date;
  while (date <= end && i < 50000) {
    if (date >= start)
      result.push({
        id: `${item.id}-${date}`,
        date,
        name: item.name,
        amount: item.amount,
        type: 'type' in item ? item.type : 'expense',
        account_id: item.account_id,
        to_account_id: 'to_account_id' in item ? item.to_account_id : null,
        source: 'type' in item ? 'Récurrent' : 'Abonnement',
      });
    date = advance(item.next_date, item.frequency, item.interval_days, ++i);
  }
  return result;
}

export function events(data: Data, start: string, end: string): Event[] {
  return [
    ...data.subscriptions.flatMap((s) => occurrences(s, start, end)),
    ...data.recurring_transactions.flatMap((s) => occurrences(s, start, end)),
    ...data.transactions
      .filter((t) => t.date >= start && t.date <= end)
      .map((t) => ({
        id: t.id,
        date: t.date,
        name: t.description,
        amount: t.amount,
        type: t.type,
        account_id: t.account_id,
        to_account_id: t.to_account_id,
        source: 'Planifié',
      })),
  ]
    .filter(
      (e) => e.source === 'Planifié' || !data.transactions.some((t) => t.source_event_id === e.id),
    )
    .sort((a, b) => a.date.localeCompare(b.date));
}

export const monthlyCost = (s: Subscription) =>
  s.amount *
  (s.frequency === 'yearly'
    ? 1 / 12
    : s.frequency === 'weekly'
      ? 52 / 12
      : s.frequency === 'daily'
        ? 365 / 12
        : s.frequency === 'custom'
          ? 365 / Math.max(1, s.interval_days) / 12
          : 1);

export function summary(data: Data, now = new Date()) {
  const today = iso(now),
    p = period(now, data.settings[0]?.budget_day ?? 1);
  const tx = data.transactions.filter((t) => t.date >= p.start && t.date <= today);
  const income = round(tx.filter((t) => t.type === 'income').reduce((a, t) => a + t.amount, 0)),
    expense = round(tx.filter((t) => t.type === 'expense').reduce((a, t) => a + t.amount, 0));
  const balances = data.accounts.map((a) => ({
    ...a,
    current: accountBalance(a, data.transactions, today),
  }));
  const available = round(
    balances
      .filter((a) => ['current', 'cash', 'other'].includes(a.type))
      .reduce((a, b) => a + b.current, 0),
  );
  const savings = round(
    balances.filter((a) => a.type === 'savings').reduce((a, b) => a + b.current, 0),
  );
  const total = round(balances.reduce((a, b) => a + b.current, 0));
  const upcoming = events(data, today, p.end).filter(
    (e) => e.source !== 'Planifié' || e.date > today,
  );
  const liquid = new Set(
    balances.filter((a) => ['current', 'cash', 'other'].includes(a.type)).map((a) => a.id),
  );
  let planned = 0,
    expected = 0,
    savingPlan = 0;
  for (const e of upcoming) {
    if (e.type === 'expense' && liquid.has(e.account_id)) planned += e.amount;
    if (e.type === 'income' && liquid.has(e.account_id)) expected += e.amount;
    if (e.type === 'transfer') {
      if (liquid.has(e.account_id) && !liquid.has(e.to_account_id ?? '')) savingPlan += e.amount;
      if (!liquid.has(e.account_id) && liquid.has(e.to_account_id ?? '')) expected += e.amount;
    }
  }
  const remaining = round(available - planned - savingPlan);
  const days = Math.max(
    1,
    Math.round((parseDate(p.end).getTime() - parseDate(today).getTime()) / 86400000) + 1,
  );
  return {
    today,
    ...p,
    tx,
    balances,
    income,
    expense,
    total,
    available,
    savings,
    upcoming,
    planned: round(planned),
    expected: round(expected),
    savingPlan: round(savingPlan),
    remaining,
    daily: round(remaining / days),
    forecast: round(remaining + expected),
    days,
  };
}

export function history(data: Data, range: string, kind: 'total' | 'savings' = 'total') {
  const now = new Date();
  const earliest = [
    ...data.transactions.map((t) => t.date),
    ...data.accounts.map((a) => a.created_at.slice(0, 10)),
  ]
    .filter(Boolean)
    .reduce((a, date) => (date < a ? date : a), iso(now));
  const count =
    range === '7j'
      ? 7
      : range === '1m'
        ? 30
        : range === '3m'
          ? 90
          : range === '1a'
            ? 365
            : Math.max(30, Math.ceil((now.getTime() - parseDate(earliest).getTime()) / 86400000));
  const step = Math.max(1, Math.ceil(count / 40));
  const result = [];
  for (let i = count; i >= 0; i -= step) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const key = iso(date);
    result.push({
      date: shortDate(key),
      value: round(
        data.accounts
          .filter((a) => kind === 'total' || a.type === 'savings')
          .reduce((s, a) => s + accountBalance(a, data.transactions, key), 0),
      ),
    });
  }
  return result;
}

export function monthlySeries(data: Data) {
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - 5 + i);
    const month = iso(d).slice(0, 7);
    const tx = data.transactions.filter((t) => t.date.startsWith(month) && t.date <= iso());
    return {
      month: d.toLocaleDateString('fr-FR', { month: 'short' }),
      income: round(tx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)),
      expense: round(tx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)),
    };
  });
}
