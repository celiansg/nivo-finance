import { useEffect, useState } from 'react';
import { useFinance } from '../hooks/useFinance';
import { Card, Icon } from '../components/ui';
import { TransactionList } from '../components/TransactionList';
import type { EditorRequest } from '../components/Editor';
export function Transactions({ edit }: { edit: (r: EditorRequest) => void }) {
  const { data, money } = useFinance();
  const [query, setQuery] = useState(''),
    [type, setType] = useState(''),
    [account, setAccount] = useState(''),
    [category, setCategory] = useState(''),
    [start, setStart] = useState(''),
    [end, setEnd] = useState(''),
    [sort, setSort] = useState('date-desc'),
    [filtersOpen, setFiltersOpen] = useState(false),
    [visibleCount, setVisibleCount] = useState(25);
  const activeFilters = [type, account, category, start, end].filter(Boolean).length;
  const resetFilters = () => {
    setType('');
    setAccount('');
    setCategory('');
    setStart('');
    setEnd('');
  };
  const rows = data.transactions
    .filter(
      (t) =>
        (!query || `${t.description} ${t.note}`.toLowerCase().includes(query.toLowerCase())) &&
        (!type || t.type === type) &&
        (!account || t.account_id === account || t.to_account_id === account) &&
        (!category || t.category_id === category) &&
        (!start || t.date >= start) &&
        (!end || t.date <= end),
    )
    .sort((a, b) =>
      sort === 'amount-desc'
        ? b.amount - a.amount
        : sort === 'amount-asc'
          ? a.amount - b.amount
          : sort === 'date-asc'
            ? a.date.localeCompare(b.date)
            : b.date.localeCompare(a.date),
    );
  useEffect(() => setVisibleCount(25), [query, type, account, category, start, end, sort]);
  const visibleRows = rows.slice(0, visibleCount);
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Transactions</h1>
          <p>Chaque mouvement, à sa place.</p>
        </div>
        <button className="button primary" onClick={() => edit({ table: 'transactions' })}>
          <Icon name="Plus" />
          Nouvelle transaction
        </button>
      </div>
      <Card>
        <div className="filters">
          <div className="filter-primary">
            <label className="search">
              <Icon name="Search" size={18} />
              <input
                placeholder="Rechercher une transaction"
                aria-label="Rechercher une transaction"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <button
              className={`button filter-toggle ${filtersOpen ? 'active' : ''}`}
              onClick={() => setFiltersOpen((open) => !open)}
              aria-expanded={filtersOpen}
              aria-controls="transaction-filters"
            >
              <Icon name="SlidersHorizontal" size={18} />
              Filtres
              {activeFilters > 0 && <span>{activeFilters}</span>}
            </button>
            <select
              aria-label="Trier les transactions"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="date-desc">Plus récentes</option>
              <option value="date-asc">Plus anciennes</option>
              <option value="amount-desc">Montant décroissant</option>
              <option value="amount-asc">Montant croissant</option>
            </select>
          </div>
          {filtersOpen && (
            <div className="advanced-filters" id="transaction-filters">
              <label>
                Type
                <select value={type} onChange={(e) => setType(e.target.value)}>
                  <option value="">Tous les types</option>
                  <option value="expense">Dépenses</option>
                  <option value="income">Revenus</option>
                  <option value="transfer">Transferts</option>
                </select>
              </label>
              <label>
                Compte
                <select value={account} onChange={(e) => setAccount(e.target.value)}>
                  <option value="">Tous les comptes</option>
                  {data.accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Catégorie
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="">Toutes les catégories</option>
                  {data.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="date-filter">
                Du
                <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
              </label>
              <label className="date-filter">
                Au
                <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
              </label>
              {activeFilters > 0 && (
                <button className="clear-filters" onClick={resetFilters}>
                  Effacer les filtres
                </button>
              )}
            </div>
          )}
        </div>
        <div className="list-summary">
          <span>
            {rows.length} transaction{rows.length > 1 ? 's' : ''}
          </span>
          <span>
            Dépenses :{' '}
            <b>
              {money(rows.filter((t) => t.type === 'expense').reduce((a, t) => a + t.amount, 0))}
            </b>
          </span>
        </div>
        <TransactionList
          rows={visibleRows}
          groupByMonth={sort === 'date-desc' || sort === 'date-asc'}
          onEdit={(record) => edit({ table: 'transactions', record })}
        />
        {visibleRows.length < rows.length && (
          <button
            className="button load-more"
            onClick={() => setVisibleCount((count) => count + 25)}
          >
            Afficher 25 transactions supplémentaires
          </button>
        )}
        <button className="button add-inline" onClick={() => edit({ table: 'transactions' })}>
          <Icon name="Plus" />
          Ajouter une transaction
        </button>
      </Card>
    </>
  );
}
