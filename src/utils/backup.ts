import { emptyData, TABLES, type Data, type Table, type Tables } from '../types';
import { validateChange } from './validation';

type UnknownRecord = Record<string, unknown>;

const fields: Record<Table, string[]> = {
  accounts: ['id', 'created_at', 'name', 'type', 'balance', 'color', 'icon', 'description'],
  transactions: [
    'id',
    'created_at',
    'amount',
    'type',
    'category_id',
    'account_id',
    'to_account_id',
    'date',
    'time',
    'description',
    'note',
  ],
  categories: ['id', 'created_at', 'name', 'icon', 'color'],
  subscriptions: [
    'id',
    'created_at',
    'name',
    'amount',
    'frequency',
    'interval_days',
    'next_date',
    'category_id',
    'account_id',
    'icon',
    'color',
    'active',
  ],
  recurring_transactions: [
    'id',
    'created_at',
    'name',
    'amount',
    'type',
    'frequency',
    'interval_days',
    'next_date',
    'account_id',
    'to_account_id',
    'category_id',
    'active',
  ],
  budgets: ['id', 'created_at', 'month', 'amount'],
  budget_categories: ['id', 'created_at', 'budget_id', 'category_id', 'amount'],
  savings_goals: ['id', 'created_at', 'name', 'amount', 'target_date', 'color', 'icon'],
  goal_transactions: ['id', 'created_at', 'goal_id', 'amount', 'date', 'note'],
  settings: ['id', 'created_at', 'name', 'currency', 'theme', 'budget_day'],
};

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateShape(table: Table, row: UnknownRecord) {
  if (!fields[table].every((key) => key in row))
    throw new Error(`Un élément de « ${table} » est incomplet.`);
  if (
    Object.keys(row).some(
      (key) =>
        !fields[table].includes(key) && !(table === 'transactions' && key === 'source_event_id'),
    )
  )
    throw new Error(`Un élément de « ${table} » contient un champ inconnu.`);
  for (const key of Object.keys(row)) {
    const value = row[key];
    if (typeof value === 'object' && value !== null)
      throw new Error(`Un élément de « ${table} » contient une valeur invalide.`);
  }
  const numeric = ['amount', 'balance', 'interval_days', 'budget_day'];
  const nullable = ['category_id', 'to_account_id', 'target_date', 'source_event_id'];
  for (const key of fields[table]) {
    if (numeric.includes(key) && typeof row[key] !== 'number')
      throw new Error(`Le champ « ${key} » de « ${table} » doit être un nombre.`);
    if (key === 'active' && typeof row[key] !== 'boolean')
      throw new Error(`Le champ « active » de « ${table} » doit être vrai ou faux.`);
    if (
      !numeric.includes(key) &&
      key !== 'active' &&
      !(nullable.includes(key) && row[key] === null) &&
      typeof row[key] !== 'string'
    )
      throw new Error(`Le champ « ${key} » de « ${table} » doit être un texte.`);
  }
  if (
    'type' in row &&
    ![
      'current',
      'savings',
      'cash',
      'investment',
      'other',
      'expense',
      'income',
      'transfer',
    ].includes(String(row.type))
  )
    throw new Error(`Le type d’un élément de « ${table} » est invalide.`);
  if (
    'frequency' in row &&
    !['daily', 'weekly', 'monthly', 'yearly', 'custom'].includes(String(row.frequency))
  )
    throw new Error(`La fréquence d’un élément de « ${table} » est invalide.`);
  if (table === 'settings') {
    if (!['light', 'dark', 'system'].includes(String(row.theme)))
      throw new Error('Le thème de la sauvegarde est invalide.');
    if (
      !Number.isInteger(row.budget_day) ||
      Number(row.budget_day) < 1 ||
      Number(row.budget_day) > 28
    )
      throw new Error('Le jour budgétaire de la sauvegarde est invalide.');
  }
}

function validateReferences(data: Data) {
  const ids = <K extends Table>(table: K) => new Set(data[table].map((row) => row.id));
  const accounts = ids('accounts');
  const categories = ids('categories');
  const budgets = ids('budgets');
  const goals = ids('savings_goals');
  for (const row of [...data.transactions, ...data.subscriptions, ...data.recurring_transactions]) {
    if (!accounts.has(row.account_id)) throw new Error('Une opération utilise un compte absent.');
    if (row.category_id && !categories.has(row.category_id))
      throw new Error('Une opération utilise une catégorie absente.');
    if ('to_account_id' in row && row.to_account_id && !accounts.has(row.to_account_id))
      throw new Error('Un transfert utilise un compte destinataire absent.');
  }
  for (const row of data.budget_categories)
    if (!budgets.has(row.budget_id) || !categories.has(row.category_id))
      throw new Error('Un budget par catégorie possède une référence absente.');
  for (const row of data.goal_transactions)
    if (!goals.has(row.goal_id)) throw new Error('Une allocation utilise un objectif absent.');
}

export function parseFinanceBackup(text: string): Data {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Ce fichier ne contient pas un JSON valide.');
  }
  if (!isRecord(parsed)) throw new Error('Le format de la sauvegarde est invalide.');
  const source = isRecord(parsed.data) ? parsed.data : parsed;
  const result = emptyData();
  let count = 0;

  for (const table of TABLES) {
    const rows = source[table];
    if (!Array.isArray(rows)) throw new Error(`La collection « ${table} » est absente.`);
    const ids = new Set<string>();
    const clean = rows.map((row) => {
      if (!isRecord(row) || typeof row.id !== 'string' || typeof row.created_at !== 'string')
        throw new Error(`Un élément de « ${table} » est incomplet.`);
      validateShape(table, row);
      if (!row.id || ids.has(row.id))
        throw new Error(`Un identifiant de « ${table} » est invalide.`);
      ids.add(row.id);
      count += 1;
      return { ...row } as unknown as Tables[typeof table];
    });
    Object.assign(result, { [table]: clean });
  }

  if (count > 10_000) throw new Error('Cette sauvegarde contient trop d’éléments.');
  if (result.settings.length > 1) throw new Error('La sauvegarde contient plusieurs réglages.');
  if (result.settings[0]) result.settings[0].id = 'preferences';
  for (const table of TABLES)
    for (const record of result[table]) validateChange(result, table as Table, record);
  validateReferences(result);
  return result;
}

export function backupCount(data: Data) {
  return TABLES.reduce((sum, table) => sum + data[table].length, 0);
}
