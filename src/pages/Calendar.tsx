import { useState } from 'react';
import { useFinance } from '../hooks/useFinance';
import { events, iso, shortDate, summary } from '../utils/finance';
import { Badge, Card, Icon, SectionTitle, Empty } from '../components/ui';
import type { EditorRequest } from '../components/Editor';
export function Calendar({ edit }: { edit: (r: EditorRequest) => void }) {
  const { data, money } = useFinance();
  const [month, setMonth] = useState(
      () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    ),
    [selected, setSelected] = useState(iso());
  const start = iso(month),
    end = iso(new Date(month.getFullYear(), month.getMonth() + 1, 0));
  const entries = events(data, start, end);
  const offset = (month.getDay() + 6) % 7;
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const s = summary(data);
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Un temps d’avance</h1>
          <p>Vos échéances et votre fin de mois, en un regard.</p>
        </div>
        <button
          className="button primary"
          onClick={() => edit({ table: 'recurring_transactions' })}
        >
          <Icon name="Plus" />
          Opération récurrente
        </button>
      </div>
      <div className="forecast-banner">
        <div>
          <span>Disponible estimé au {shortDate(s.end)}</span>
          <strong>{money(s.forecast)}</strong>
          <small>Prévision basée sur les opérations enregistrées</small>
        </div>
        <div className="forecast-details">
          <span>
            Disponible <b>{money(s.available)}</b>
          </span>
          <span>
            Revenus attendus <b>+{money(s.expected)}</b>
          </span>
          <span>
            Dépenses & abonnements <b>−{money(s.planned)}</b>
          </span>
          <span>
            Épargne programmée <b>−{money(s.savingPlan)}</b>
          </span>
        </div>
      </div>
      <div className="two-grid calendar-layout">
        <Card>
          <SectionTitle
            title={month.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
          >
            <div>
              <button
                className="icon-button"
                aria-label="Mois précédent"
                onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
              >
                <Icon name="ChevronLeft" />
              </button>
              <button
                className="icon-button"
                aria-label="Mois suivant"
                onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
              >
                <Icon name="ChevronRight" />
              </button>
            </div>
          </SectionTitle>
          <div className="calendar-grid">
            {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
              <span className="weekday" key={i}>
                {d}
              </span>
            ))}
            {Array.from({ length: offset }, (_, i) => (
              <span key={`blank${i}`} />
            ))}
            {Array.from({ length: days }, (_, i) => {
              const date = iso(new Date(month.getFullYear(), month.getMonth(), i + 1));
              const daily = entries.filter((e) => e.date === date);
              return (
                <button
                  key={date}
                  onClick={() => setSelected(date)}
                  className={`${date === selected ? 'selected' : ''} ${date === iso() ? 'is-today' : ''}`}
                >
                  <span>{i + 1}</span>
                  <div className="day-dots">
                    {daily.slice(0, 3).map((e) => (
                      <i key={e.id} className={e.type} />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
        <Card>
          <SectionTitle title={shortDate(selected)} />
          {entries
            .filter((e) => e.date === selected)
            .map((e) => (
              <div className="simple-row" key={e.id}>
                <Badge
                  icon={
                    e.type === 'income'
                      ? 'ArrowDownLeft'
                      : e.type === 'transfer'
                        ? 'ArrowLeftRight'
                        : 'Repeat'
                  }
                />
                <span className="grow">
                  <strong>{e.name}</strong>
                  <small>{e.source}</small>
                </span>
                <b className={e.type === 'income' ? 'positive' : ''}>
                  {e.type === 'income' ? '+' : '−'}
                  {money(e.amount)}
                </b>
                {e.source !== 'Planifié' && e.date <= iso() && (
                  <button
                    className="icon-button"
                    aria-label={`Enregistrer le paiement ${e.name}`}
                    title="Enregistrer le paiement"
                    onClick={() => {
                      const origin = [...data.subscriptions, ...data.recurring_transactions].find(
                        (r) => e.id.startsWith(`${r.id}-`),
                      );
                      edit({
                        table: 'transactions',
                        defaults: {
                          description: e.name,
                          amount: e.amount,
                          type: e.type,
                          account_id: e.account_id,
                          to_account_id: e.to_account_id ?? null,
                          category_id: origin?.category_id ?? data.categories[0]?.id ?? null,
                          date: e.date,
                          source_event_id: e.id,
                        },
                      });
                    }}
                  >
                    <Icon name="CircleCheck" size={18} />
                  </button>
                )}
              </div>
            ))}
          {!entries.some((e) => e.date === selected) && <Empty text="Rien de prévu ce jour-là." />}
          <p className="muted spaced">
            Les revenus récurrents sont ajoutés automatiquement à leur date. Pour les dépenses et
            les transferts, utilisez la coche après le paiement afin d’éviter les doublons.
          </p>
        </Card>
      </div>
      <Card>
        <SectionTitle title="Opérations récurrentes">
          <button className="button" onClick={() => edit({ table: 'recurring_transactions' })}>
            <Icon name="Plus" size={16} />
            Ajouter
          </button>
        </SectionTitle>
        {data.recurring_transactions.map((r) => (
          <button
            className="subscription-row"
            key={r.id}
            onClick={() => edit({ table: 'recurring_transactions', record: r })}
          >
            <Badge
              icon={
                r.type === 'income'
                  ? 'BriefcaseBusiness'
                  : r.type === 'transfer'
                    ? 'PiggyBank'
                    : 'Repeat'
              }
            />
            <span className="grow">
              <strong>{r.name}</strong>
              <small>
                {r.active ? 'Actif' : 'En pause'} ·{' '}
                {
                  {
                    daily: 'Quotidien',
                    weekly: 'Hebdomadaire',
                    monthly: 'Mensuel',
                    yearly: 'Annuel',
                    custom: `Tous les ${r.interval_days} jours`,
                  }[r.frequency]
                }
              </small>
            </span>
            <b>
              {r.type === 'income' ? '+' : '−'}
              {money(r.amount)}
            </b>
            <Icon name="ChevronRight" size={16} />
          </button>
        ))}
        {!data.recurring_transactions.length && (
          <Empty text="Ajoutez votre loyer, votre salaire ou votre épargne programmée." />
        )}
      </Card>
    </>
  );
}
