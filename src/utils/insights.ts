import type { Data, Frequency, Goal, Transaction } from '../types';
import { monthlyCost, parseDate, period, round } from './finance';

export type RecurringCandidate = {
  id: string;
  name: string;
  normalizedName: string;
  amount: number;
  monthlyAmount: number;
  annualAmount: number;
  frequency: Frequency;
  intervalDays: number;
  confidence: number;
  reason: string;
  occurrences: number;
  lastDate: string;
  nextDate: string;
  categoryId: string | null;
};

export type GoalInsight = Goal & {
  saved: number;
  remaining: number;
  monthlyRequired: number | null;
  feasible: boolean | null;
};

export type FinancialInsights = {
  start: string;
  end: string;
  today: string;
  income: number;
  incomeExpected: number;
  fixedExpenses: number;
  variableExpenses: number;
  plannedSavings: number;
  disposable: number;
  disposableKnown: boolean;
  dataCompleteness: 'empty' | 'partial' | 'ready';
  knownSubscriptionsMonthly: number;
  knownSubscriptionsAnnual: number;
  candidates: RecurringCandidate[];
  categorySpending: Array<{ categoryId: string | null; label: string; amount: number }>;
  goals: GoalInsight[];
};

export type AssistantAnswer = {
  text: string;
  sources: string[];
};

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\b\d{2,}\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const blockedWords = [
  'loyer',
  'electricite',
  'eau ',
  'gaz ',
  'impot',
  'taxe',
  'restaurant',
  'brasserie',
  'supermarche',
  'carrefour',
  'courses',
  'salaire',
  'virement',
  'retrait',
  'especes',
];

function daysBetween(a: string, b: string) {
  return Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / 86_400_000);
}

function dateAfter(date: string, days: number) {
  const next = parseDate(date);
  next.setDate(next.getDate() + Math.max(1, Math.round(days)));
  return next.toISOString().slice(0, 10);
}

function frequencyFor(intervalDays: number): Frequency {
  if (intervalDays <= 10) return 'weekly';
  if (intervalDays <= 45) return 'monthly';
  if (intervalDays >= 250) return 'yearly';
  return 'custom';
}

function normalizeMonthly(amount: number, frequency: Frequency, intervalDays: number) {
  if (frequency === 'yearly') return amount / 12;
  if (frequency === 'weekly') return (amount * 52) / 12;
  if (frequency === 'daily') return (amount * 365) / 12;
  if (frequency === 'custom') return (amount * 365) / Math.max(1, intervalDays) / 12;
  return amount;
}

function isBlockedMerchant(name: string) {
  const value = ` ${normalize(name)} `;
  return blockedWords.some((word) => value.includes(` ${word.trim()} `));
}

function candidateFromGroup(
  key: string,
  rows: Transaction[],
  categoryId: string | null,
): RecurringCandidate | null {
  if (rows.length < 2 || isBlockedMerchant(rows[0].description)) return null;
  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  const intervals = sorted.slice(1).map((row, index) => daysBetween(sorted[index].date, row.date));
  const average = intervals.reduce((sum, value) => sum + value, 0) / intervals.length;
  const spread = intervals.length > 1 ? Math.max(...intervals) - Math.min(...intervals) : 0;
  const amounts = sorted.map((row) => row.amount);
  const averageAmount = amounts.reduce((sum, value) => sum + value, 0) / amounts.length;
  const amountSpread = averageAmount ? (Math.max(...amounts) - Math.min(...amounts)) / averageAmount : 1;
  const cadenceFit = average >= 6 && average <= 430;
  if (!cadenceFit) return null;
  const frequency = frequencyFor(average);
  const amountFit = Math.max(0, 1 - Math.min(amountSpread, 1));
  const cadenceConfidence = Math.max(0, 1 - Math.min(spread / Math.max(average, 1), 1));
  const occurrenceConfidence = Math.min(1, 0.25 + sorted.length * 0.18);
  const confidence = round(Math.min(0.98, 0.35 + amountFit * 0.28 + cadenceConfidence * 0.22 + occurrenceConfidence * 0.15));
  const intervalDays = Math.max(1, Math.round(average));
  const monthlyAmount = round(normalizeMonthly(averageAmount, frequency, intervalDays));
  const lastDate = sorted.at(-1)!.date;
  const category = categoryId ?? null;
  return {
    id: `detected-${key}`,
    name: sorted.at(-1)!.description.trim(),
    normalizedName: key,
    amount: round(averageAmount),
    monthlyAmount,
    annualAmount: round(monthlyAmount * 12),
    frequency,
    intervalDays,
    confidence,
    reason:
      sorted.length >= 3
        ? `${sorted.length} opérations espacées d’environ ${intervalDays} jours, montant assez stable.`
        : `Deux opérations similaires espacées d’environ ${intervalDays} jours. À confirmer.`,
    occurrences: sorted.length,
    lastDate,
    nextDate: dateAfter(lastDate, intervalDays),
    categoryId: category,
  };
}

export function detectRecurringCandidates(data: Data, now = new Date()) {
  const since = new Date(now.getFullYear(), now.getMonth() - 12, now.getDate())
    .toISOString()
    .slice(0, 10);
  const groups = new Map<string, Transaction[]>();
  for (const transaction of data.transactions) {
    if (transaction.type !== 'expense' || transaction.date < since) continue;
    const key = normalize(transaction.description);
    if (key.length < 3) continue;
    const rows = groups.get(key) ?? [];
    rows.push(transaction);
    groups.set(key, rows);
  }
  return [...groups.entries()]
    .map(([key, rows]) => candidateFromGroup(key, rows, rows[0].category_id))
    .filter((candidate): candidate is RecurringCandidate => Boolean(candidate))
    .filter((candidate) => candidate.confidence >= 0.55)
    .sort((a, b) => b.monthlyAmount - a.monthlyAmount);
}

function monthlyRecurringAmount(amount: number, frequency: Frequency, intervalDays: number) {
  return round(normalizeMonthly(amount, frequency, intervalDays));
}

function categoryLabel(data: Data, categoryId: string | null) {
  return data.categories.find((category) => category.id === categoryId)?.name ?? 'Sans catégorie';
}

function savedForGoal(data: Data, goalId: string) {
  return round(
    data.goal_transactions
      .filter((transaction) => transaction.goal_id === goalId)
      .reduce((sum, transaction) => sum + transaction.amount, 0),
  );
}

export function buildFinancialInsights(data: Data, now = new Date()): FinancialInsights {
  const today = now.toISOString().slice(0, 10);
  const currentPeriod = period(now, 1);
  const transactions = data.transactions.filter(
    (transaction) => transaction.date >= currentPeriod.start && transaction.date <= today,
  );
  const income = round(
    transactions
      .filter((transaction) => transaction.type === 'income')
      .reduce((sum, transaction) => sum + transaction.amount, 0),
  );
  const expenseTransactions = transactions.filter((transaction) => transaction.type === 'expense');
  const incomeExpected = round(
    data.recurring_transactions
      .filter((item) => item.active && item.type === 'income')
      .reduce((sum, item) => sum + monthlyRecurringAmount(item.amount, item.frequency, item.interval_days), 0),
  );
  const knownSubscriptionsMonthly = round(
    data.subscriptions
      .filter((subscription) => subscription.active)
      .reduce((sum, subscription) => sum + monthlyCost(subscription), 0),
  );
  const knownSubscriptionsAnnual = round(knownSubscriptionsMonthly * 12);
  const knownNames = new Set(
    [...data.subscriptions, ...data.recurring_transactions].map((item) => normalize(item.name)),
  );
  const fixedRecurring = data.recurring_transactions
    .filter((item) => item.active && item.type === 'expense')
    .reduce((sum, item) => sum + monthlyRecurringAmount(item.amount, item.frequency, item.interval_days), 0);
  const fixedExpenses = round(knownSubscriptionsMonthly + fixedRecurring);
  const variableExpenses = round(
    expenseTransactions
      .filter((transaction) => !knownNames.has(normalize(transaction.description)))
      .reduce((sum, transaction) => sum + transaction.amount, 0),
  );
  const plannedSavings = round(
    data.recurring_transactions
      .filter((item) => item.active && item.type === 'transfer')
      .reduce((sum, item) => sum + monthlyRecurringAmount(item.amount, item.frequency, item.interval_days), 0),
  );
  const disposable = round((income || incomeExpected) - fixedExpenses - variableExpenses - plannedSavings);
  const hasIncome = income > 0 || incomeExpected > 0;
  const dataCompleteness = !data.accounts.length && !data.transactions.length
    ? 'empty'
    : hasIncome && (fixedExpenses > 0 || variableExpenses > 0)
      ? 'ready'
      : 'partial';
  const categoryTotals = new Map<string, number>();
  for (const transaction of expenseTransactions) {
    const key = transaction.category_id ?? 'uncategorized';
    categoryTotals.set(key, (categoryTotals.get(key) ?? 0) + transaction.amount);
  }
  const candidates = detectRecurringCandidates(data, now).filter(
    (candidate) => !knownNames.has(candidate.normalizedName),
  );
  const goals = data.savings_goals.map((goal) => {
    const saved = savedForGoal(data, goal.id);
    const remaining = round(Math.max(0, goal.amount - saved));
    const months = goal.target_date
      ? Math.max(1, (parseDate(goal.target_date).getTime() - parseDate(today).getTime()) / (30.44 * 86_400_000))
      : null;
    const monthlyRequired = months ? round(remaining / months) : null;
    return {
      ...goal,
      saved,
      remaining,
      monthlyRequired,
      feasible: monthlyRequired === null ? null : disposable >= monthlyRequired,
    };
  });
  return {
    start: currentPeriod.start,
    end: currentPeriod.end,
    today,
    income,
    incomeExpected,
    fixedExpenses,
    variableExpenses,
    plannedSavings,
    disposable,
    disposableKnown: hasIncome,
    dataCompleteness,
    knownSubscriptionsMonthly,
    knownSubscriptionsAnnual,
    candidates,
    categorySpending: [...categoryTotals.entries()]
      .map(([categoryId, amount]) => ({ categoryId: categoryId === 'uncategorized' ? null : categoryId, label: categoryLabel(data, categoryId === 'uncategorized' ? null : categoryId), amount: round(amount) }))
      .sort((a, b) => b.amount - a.amount),
    goals,
  };
}

export function simulateMonthlySavings(insights: FinancialInsights, amount: number) {
  const requested = Math.max(0, round(amount));
  return {
    amount: requested,
    remainingDisposable: round(insights.disposable - requested),
    feasible: insights.disposableKnown && insights.disposable >= requested,
    annualImpact: round(requested * 12),
  };
}

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);
}

function previousMonthKey(now: Date) {
  const date = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function answerFinancialQuestion(question: string, data: Data, now = new Date()): AssistantAnswer {
  const normalized = normalize(question);
  const insights = buildFinancialInsights(data, now);
  const currency = data.settings[0]?.currency ?? 'EUR';
  const amountMatch = normalized.match(/(\d+(?:[.,]\d+)?)/);
  const requestedAmount = amountMatch ? Number(amountMatch[1].replace(',', '.')) : 100;

  if (normalized.includes('econom') || normalized.includes('mettre de cote') || normalized.includes('epargne')) {
    const scenario = simulateMonthlySavings(insights, requestedAmount);
    if (!insights.disposableKnown)
      return { text: 'Je peux simuler cette économie dès que vous aurez enregistré un revenu ou un salaire récurrent. Pour l’instant, vos données ne permettent pas d’estimer un reste à vivre fiable.', sources: ['Revenus enregistrés', 'Opérations du mois'] };
    return {
      text: scenario.feasible
        ? `Oui. En mettant ${formatMoney(scenario.amount, currency)} de côté chaque mois, vous pourriez constituer ${formatMoney(scenario.annualImpact, currency)} sur un an. Il resterait environ ${formatMoney(scenario.remainingDisposable, currency)} de disponible ce mois-ci, selon les opérations connues.`
        : `Mettre ${formatMoney(scenario.amount, currency)} de côté réduirait votre disponible estimé à ${formatMoney(scenario.remainingDisposable, currency)}. Le scénario dépasse votre marge actuelle ; réduisez le montant ou vérifiez d’abord vos charges à venir.`,
      sources: ['Revenus du mois', 'Charges fixes', 'Dépenses variables', 'Épargne planifiée'],
    };
  }

  if (normalized.includes('abonnement') || normalized.includes('prelevement') || normalized.includes('recurr')) {
    const candidate = insights.candidates[0];
    return candidate
      ? { text: `J’ai repéré ${candidate.name} à environ ${formatMoney(candidate.monthlyAmount, currency)} par mois, sur ${candidate.occurrences} opérations comparables. Je ne l’ai pas créé automatiquement : vous pouvez le confirmer dans « Gérer mon argent ».`, sources: ['Transactions des 12 derniers mois'] }
      : { text: `Vos abonnements confirmés représentent ${formatMoney(insights.knownSubscriptionsMonthly, currency)} par mois, soit ${formatMoney(insights.knownSubscriptionsAnnual, currency)} par an. Je n’ai pas trouvé de nouvelle récurrence assez fiable à confirmer.`, sources: ['Abonnements confirmés', 'Transactions des 12 derniers mois'] };
  }

  if (normalized.includes('augmente') || normalized.includes('augment') || normalized.includes('depense')) {
    const previousMonth = previousMonthKey(now);
    const currentByCategory = new Map<string, number>();
    const previousByCategory = new Map<string, number>();
    const currentMonth = insights.start.slice(0, 7);
    for (const transaction of data.transactions) {
      if (transaction.type !== 'expense') continue;
      const key = transaction.category_id ?? 'uncategorized';
      if (transaction.date.startsWith(currentMonth)) currentByCategory.set(key, (currentByCategory.get(key) ?? 0) + transaction.amount);
      if (transaction.date.startsWith(previousMonth)) previousByCategory.set(key, (previousByCategory.get(key) ?? 0) + transaction.amount);
    }
    const increases = [...currentByCategory.entries()]
      .map(([categoryId, current]) => ({ categoryId, current, previous: previousByCategory.get(categoryId) ?? 0, label: categoryLabel(data, categoryId === 'uncategorized' ? null : categoryId) }))
      .filter((item) => item.current > item.previous + 0.01)
      .sort((a, b) => b.current - b.previous - (a.current - a.previous));
    const first = increases[0];
    return first
      ? { text: `${first.label} est la catégorie qui a le plus augmenté dans les données disponibles : ${formatMoney(first.current, currency)} ce mois-ci contre ${formatMoney(first.previous, currency)} le mois dernier, soit +${formatMoney(first.current - first.previous, currency)}.`, sources: ['Transactions du mois en cours', 'Transactions du mois précédent'] }
      : { text: 'Je ne vois pas encore d’augmentation nette par catégorie. Il faut au moins des opérations sur deux mois comparables pour établir cette comparaison.', sources: ['Transactions du mois en cours', 'Transactions du mois précédent'] };
  }

  if (normalized.includes('financer') || normalized.includes('achat') || normalized.includes('projet')) {
    const goal = insights.goals.find((item) => item.remaining > 0);
    return goal
      ? { text: `Pour financer « ${goal.name} », il reste ${formatMoney(goal.remaining, currency)} à réunir${goal.monthlyRequired ? `, soit environ ${formatMoney(goal.monthlyRequired, currency)} par mois` : ''}. Votre disponible estimé est de ${formatMoney(insights.disposable, currency)} ; utilisez une simulation avant de créer une allocation.`, sources: ['Objectifs d’épargne', 'Disponible calculé'] }
      : { text: insights.disposableKnown ? `Votre disponible estimé est de ${formatMoney(insights.disposable, currency)}. Créez un objectif avec une date cible pour tester le financement d’un achat sans modifier vos comptes. ` : 'Ajoutez un objectif et un revenu connu pour tester le financement d’un achat avec des chiffres fiables.', sources: ['Disponible calculé', 'Objectifs d’épargne'] };
  }

  return {
    text: insights.disposableKnown
      ? `D’après vos données, vous avez environ ${formatMoney(insights.disposable, currency)} de disponible après revenus, charges fixes, dépenses variables et épargne planifiée. Vous avez ${insights.candidates.length} récurrence${insights.candidates.length > 1 ? 's' : ''} à vérifier.`
      : 'Je peux répondre à vos questions sur vos dépenses, abonnements et objectifs dès que quelques opérations et un revenu sont enregistrés.',
    sources: ['Données personnelles Nivo', 'Calcul déterministe local'],
  };
}

export const normalizeMerchant = normalize;
