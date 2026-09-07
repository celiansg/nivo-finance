import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { emptyData, type Data, type Table, type Tables } from '../types';
import {
  deleteRecord,
  deleteRecords,
  ensureUserDefaults,
  fetchData,
  postDueRecurringIncome,
  restoreData,
  saveRecord,
  subscribeData,
} from '../services/database';
import { money } from '../utils/finance';
import { validateChange } from '../utils/validation';
import { useAuth } from '../contexts/AuthContext';

type Store = {
  data: Data;
  loading: boolean;
  error: string;
  toast: string;
  syncState: 'connecting' | 'synced' | 'offline' | 'error';
  money: (n: number) => string;
  save: <K extends Table>(table: K, record: Tables[K]) => Promise<void>;
  remove: (table: Table, id: string) => Promise<void>;
  notify: (message: string) => void;
  reload: () => Promise<void>;
  restore: (next: Data) => Promise<void>;
};

const Context = createContext<Store | null>(null);

const dataError = (cause: unknown) => {
  const code = typeof cause === 'object' && cause && 'code' in cause ? String(cause.code) : '';
  if (code.includes('permission-denied'))
    return 'Accès refusé par Firebase. Publiez les règles Firestore fournies puis reconnectez-vous.';
  if (code.includes('unavailable')) return 'Firebase est momentanément inaccessible.';
  return cause instanceof Error ? cause.message : 'Chargement impossible.';
};

export function FinanceProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<Data>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [syncState, setSyncState] = useState<Store['syncState']>('connecting');
  const notify = (message: string) => setToast(message);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const reload = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    setSyncState(navigator.onLine ? 'connecting' : 'offline');
    try {
      const next = await fetchData();
      await ensureUserDefaults(next);
      setData(next);
      setSyncState('synced');
    } catch (cause) {
      setError(dataError(cause));
      setSyncState(navigator.onLine ? 'error' : 'offline');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleOffline = () => setSyncState('offline');
    const handleOnline = () => {
      setSyncState('connecting');
      if (!user) return;
      void fetchData()
        .then(() => {
          setError('');
          setSyncState('synced');
        })
        .catch((cause: unknown) => {
          setError(dataError(cause));
          setSyncState('error');
        });
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setData(emptyData());
      setLoading(false);
      setError('');
      setSyncState('connecting');
      return;
    }

    let initialized = false;
    setLoading(true);
    setError('');
    setSyncState(navigator.onLine ? 'connecting' : 'offline');
    const unsubscribe = subscribeData(
      (table, rows) => setData((previous) => ({ ...previous, [table]: rows })),
      (cause) => {
        setError(dataError(cause));
        setLoading(false);
        setSyncState(navigator.onLine ? 'error' : 'offline');
      },
      (initialData) => {
        setSyncState('synced');
        if (initialized) return;
        initialized = true;
        void ensureUserDefaults(initialData)
          .then(() => postDueRecurringIncome(initialData))
          .then((posted) => {
            if (posted)
              notify(
                posted === 1
                  ? 'Revenu récurrent ajouté automatiquement'
                  : `${posted} revenus récurrents ajoutés automatiquement`,
              );
          })
          .catch((cause: unknown) => setError(dataError(cause)))
          .finally(() => setLoading(false));
      },
    );
    return unsubscribe;
  }, [user?.uid, authLoading]);

  useEffect(() => {
    const theme = data.settings[0]?.theme ?? 'system';
    const media = matchMedia('(prefers-color-scheme: dark)');
    const apply = () =>
      (document.documentElement.dataset.theme =
        theme === 'system' ? (media.matches ? 'dark' : 'light') : theme);
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [data.settings]);

  async function save<K extends Table>(table: K, record: Tables[K]) {
    validateChange(data, table, record);
    setSyncState(navigator.onLine ? 'connecting' : 'offline');
    try {
      await saveRecord(table, record);
      let posted = 0;
      if (table === 'recurring_transactions') {
        const recurring = record as Tables['recurring_transactions'];
        if (recurring.type === 'income' && recurring.active)
          posted = await postDueRecurringIncome({
            ...data,
            recurring_transactions: [
              ...data.recurring_transactions.filter((item) => item.id !== recurring.id),
              recurring,
            ],
          });
      }
      setSyncState('synced');
      notify(posted ? 'Revenu ajouté automatiquement' : 'Modification enregistrée');
    } catch (cause) {
      setSyncState(navigator.onLine ? 'error' : 'offline');
      throw cause;
    }
  }

  async function remove(table: Table, id: string) {
    validateChange(data, table, undefined, id);
    if (
      table === 'accounts' &&
      [...data.transactions, ...data.subscriptions, ...data.recurring_transactions].some(
        (item) => item.account_id === id || ('to_account_id' in item && item.to_account_id === id),
      )
    )
      throw new Error(
        'Ce compte est utilisé. Supprimez ou réaffectez ses opérations avant de le supprimer.',
      );
    if (
      table === 'categories' &&
      [
        ...data.transactions,
        ...data.subscriptions,
        ...data.recurring_transactions,
        ...data.budget_categories,
      ].some((item) => item.category_id === id)
    )
      throw new Error('Cette catégorie est encore utilisée.');

    const children =
      table === 'savings_goals'
        ? data.goal_transactions
            .filter((item) => item.goal_id === id)
            .map((item) => ({ table: 'goal_transactions' as const, id: item.id }))
        : table === 'budgets'
          ? data.budget_categories
              .filter((item) => item.budget_id === id)
              .map((item) => ({ table: 'budget_categories' as const, id: item.id }))
          : [];

    setSyncState(navigator.onLine ? 'connecting' : 'offline');
    try {
      if (children.length) await deleteRecords([...children, { table, id }]);
      else await deleteRecord(table, id);
      setSyncState('synced');
      notify('Élément supprimé');
    } catch (cause) {
      setSyncState(navigator.onLine ? 'error' : 'offline');
      throw cause;
    }
  }

  async function restore(next: Data) {
    setSyncState(navigator.onLine ? 'connecting' : 'offline');
    try {
      await restoreData(data, next);
      setSyncState('synced');
      notify('Sauvegarde restaurée');
    } catch (cause) {
      setSyncState(navigator.onLine ? 'error' : 'offline');
      throw cause;
    }
  }

  return (
    <Context.Provider
      value={{
        data,
        loading,
        error,
        toast,
        syncState,
        money: (amount) => money(amount, data.settings[0]?.currency ?? 'EUR'),
        save,
        remove,
        notify,
        reload,
        restore,
      }}
    >
      {children}
    </Context.Provider>
  );
}

export function useFinance() {
  const value = useContext(Context);
  if (!value) throw new Error('FinanceProvider manquant');
  return value;
}
