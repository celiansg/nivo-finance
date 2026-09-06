import type { Data, Table, Tables } from '../types';
/** Apply integrity checks before writing personal data to Firestore. */
export function validateChange(
  data: Data,
  table: Table,
  record?: Tables[Table],
  deletingId?: string,
) {
  if (
    record &&
    'amount' in record &&
    (!Number.isFinite(record.amount) ||
      (table === 'goal_transactions' ? record.amount === 0 : record.amount <= 0))
  ) {
    throw new Error('Indiquez un montant valide.');
  }
  if (record && 'name' in record && table !== 'settings' && !record.name.trim())
    throw new Error('Le nom ne peut pas être vide.');
  if (table === 'transactions' && record) {
    const t = record as Tables['transactions'];
    if (!t.description.trim()) throw new Error('Ajoutez un libellé.');
    if (
      t.source_event_id &&
      data.transactions.some((r) => r.id !== t.id && r.source_event_id === t.source_event_id)
    )
      throw new Error('Cette échéance a déjà été enregistrée.');
  }
  if (table === 'goal_transactions') {
    const id = deletingId ?? record?.id;
    const rows = data.goal_transactions.filter((t) => t.id !== id);
    if (record) rows.push(record as Tables['goal_transactions']);
    for (const g of data.savings_goals) {
      if (rows.filter((t) => t.goal_id === g.id).reduce((sum, t) => sum + t.amount, 0) < -0.001) {
        throw new Error(
          'Cette modification rendrait le montant de l’objectif négatif. Corrigez d’abord ses retraits.',
        );
      }
    }
  }
}
