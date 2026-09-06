import { Fragment } from 'react';
import type { Transaction } from '../types';
import { useFinance } from '../hooks/useFinance';
import { Badge, Empty } from './ui';
import { shortDate } from '../utils/finance';
export function TransactionList({
  rows,
  onEdit,
  groupByMonth = false,
}: {
  rows: Transaction[];
  onEdit?: (t: Transaction) => void;
  groupByMonth?: boolean;
}) {
  const { data, money } = useFinance();
  if (!rows.length) return <Empty text="Aucune transaction pour le moment." />;
  let previousMonth = '';
  return (
    <div className="transaction-list">
      {rows.map((t) => {
        const cat = data.categories.find((c) => c.id === t.category_id);
        const month = new Date(`${t.date}T12:00:00`).toLocaleDateString('fr-FR', {
          month: 'long',
          year: 'numeric',
        });
        const showMonth = groupByMonth && month !== previousMonth;
        previousMonth = month;
        return (
          <Fragment key={t.id}>
            {showMonth && <h3 className="transaction-month">{month}</h3>}
            <button className="transaction-row" onClick={() => onEdit?.(t)} disabled={!onEdit}>
              <Badge
                icon={t.type === 'transfer' ? 'ArrowLeftRight' : cat?.icon}
                color={t.type === 'income' ? '#36A888' : cat?.color}
              />
              <span className="transaction-label">
                <strong>{t.description}</strong>
                <small>
                  {cat?.name ?? 'Transfert'}{' '}
                  <span>· {data.accounts.find((a) => a.id === t.account_id)?.name}</span>
                </small>
              </span>
              <span className="transaction-value">
                <strong className={t.type === 'income' ? 'positive' : ''}>
                  {t.type === 'income' ? '+' : t.type === 'expense' ? '−' : ''}
                  {money(t.amount)}
                </strong>
                <small>{shortDate(t.date)}</small>
              </span>
            </button>
          </Fragment>
        );
      })}
    </div>
  );
}
