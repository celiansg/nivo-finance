import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { auth } from './firebase';
import { db } from './firestore';
import { emptyData, TABLES, type Data, type Table, type Tables } from '../types';
import { dueIncomePostings } from '../utils/finance';

const collectionNames: Record<Table, string> = {
  accounts: 'accounts',
  transactions: 'transactions',
  categories: 'categories',
  subscriptions: 'subscriptions',
  recurring_transactions: 'recurringTransactions',
  budgets: 'budgets',
  budget_categories: 'budgetCategories',
  savings_goals: 'savingsGoals',
  goal_transactions: 'goalTransactions',
  settings: 'settings',
};

function currentUid() {
  const user = auth.currentUser;
  if (!user) throw new Error('Votre session a expiré. Reconnectez-vous.');
  return user.uid;
}

const userCollection = (table: Table) =>
  collection(db, 'users', currentUid(), collectionNames[table]);

const userDocument = (table: Table, id: string) =>
  doc(db, 'users', currentUid(), collectionNames[table], table === 'settings' ? 'preferences' : id);

const defaultCategories: Array<Pick<Tables['categories'], 'id' | 'name' | 'icon' | 'color'>> = [
  ['courses', 'Courses', 'ShoppingBasket', '#0A84FF'],
  ['restaurant', 'Restaurant', 'Utensils', '#F1A34B'],
  ['shopping', 'Shopping', 'ShoppingBag', '#B08AF5'],
  ['transport', 'Transport', 'TrainFront', '#48B5AA'],
  ['essence', 'Essence', 'Fuel', '#D19C65'],
  ['logement', 'Logement', 'House', '#7389B5'],
  ['factures', 'Factures', 'Zap', '#D7A34B'],
  ['abonnements', 'Abonnements', 'Repeat', '#8174CD'],
  ['loisirs', 'Loisirs', 'Ticket', '#DD8CAA'],
  ['voyages', 'Voyages', 'Plane', '#658CDE'],
  ['sante', 'Santé', 'Heart', '#CB8093'],
  ['sport', 'Sport', 'Dumbbell', '#48A890'],
  ['technologie', 'Technologie', 'Laptop', '#738AC9'],
  ['cadeaux', 'Cadeaux', 'Gift', '#B289C5'],
  ['salaire', 'Salaire', 'BriefcaseBusiness', '#3EAB8A'],
  ['revenus', 'Revenus', 'TrendingUp', '#3EAB8A'],
  ['epargne', 'Épargne', 'PiggyBank', '#8C7CEB'],
  ['autre', 'Autre', 'Shapes', '#8E9BAD'],
].map(([id, name, icon, color]) => ({ id, name, icon, color }));

export async function fetchData(): Promise<Data> {
  const result = emptyData();
  await Promise.all(
    TABLES.map(async (table) => {
      const snapshot = await getDocs(userCollection(table));
      Object.assign(result, {
        [table]: snapshot.docs.map((item) => item.data() as Tables[typeof table]),
      });
    }),
  );
  return result;
}

export async function ensureUserDefaults(data: Data) {
  const batch = writeBatch(db);
  let changed = false;
  if (!data.settings.length) {
    const settings: Tables['settings'] = {
      id: 'preferences',
      created_at: new Date().toISOString(),
      name: '',
      currency: 'EUR',
      theme: 'system',
      budget_day: 1,
    };
    batch.set(userDocument('settings', settings.id), settings);
    changed = true;
  }
  if (!data.categories.length) {
    for (const category of defaultCategories) {
      batch.set(userDocument('categories', category.id), {
        ...category,
        created_at: new Date().toISOString(),
      });
    }
    changed = true;
  }
  if (changed) await batch.commit();
}

export function subscribeData(
  onTable: <K extends Table>(table: K, rows: Tables[K][]) => void,
  onError: (error: Error) => void,
  onReady: (data: Data) => void,
): Unsubscribe {
  const loaded = new Set<Table>();
  const snapshotData = emptyData();
  const unsubscribers = TABLES.map((table) =>
    onSnapshot(
      userCollection(table),
      (snapshot) => {
        const rows = snapshot.docs.map((item) => item.data() as Tables[typeof table]);
        Object.assign(snapshotData, { [table]: rows });
        onTable(table, rows);
        loaded.add(table);
        if (loaded.size === TABLES.length) onReady(snapshotData);
      },
      (error) => onError(error),
    ),
  );
  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}

export async function saveRecord<K extends Table>(table: K, record: Tables[K]) {
  await setDoc(userDocument(table, record.id), record);
}

export async function postDueRecurringIncome(data: Data, today?: string) {
  const plan = dueIncomePostings(data, today);
  const writes: Array<{
    table: 'transactions' | 'recurring_transactions';
    record: Tables['transactions'] | Tables['recurring_transactions'];
  }> = [
    ...plan.transactions.map((record) => ({ table: 'transactions' as const, record })),
    ...plan.updates.map((record) => ({ table: 'recurring_transactions' as const, record })),
  ];

  for (let index = 0; index < writes.length; index += 450) {
    const batch = writeBatch(db);
    for (const { table, record } of writes.slice(index, index + 450))
      batch.set(userDocument(table, record.id), record);
    await batch.commit();
  }

  return plan.transactions.length;
}

export async function deleteRecord(table: Table, id: string) {
  await deleteDoc(userDocument(table, id));
}

export async function deleteRecords(records: Array<{ table: Table; id: string }>) {
  const batch = writeBatch(db);
  for (const record of records) batch.delete(userDocument(record.table, record.id));
  await batch.commit();
}

export async function restoreData(current: Data, next: Data) {
  const writes = TABLES.flatMap((table) => next[table].map((record) => ({ table, record })));
  const deletions = TABLES.flatMap((table) => {
    const retained = new Set(next[table].map((record) => record.id));
    return current[table]
      .filter((record) => !retained.has(record.id))
      .map((record) => ({ table, id: record.id }));
  });

  // Write the replacement first so a failed upload never erases the existing backup.
  for (let index = 0; index < writes.length; index += 450) {
    const batch = writeBatch(db);
    for (const { table, record } of writes.slice(index, index + 450))
      batch.set(userDocument(table, record.id), record);
    await batch.commit();
  }
  for (let index = 0; index < deletions.length; index += 450) {
    const batch = writeBatch(db);
    for (const { table, id } of deletions.slice(index, index + 450))
      batch.delete(userDocument(table, id));
    await batch.commit();
  }
  await ensureUserDefaults(next);
}
