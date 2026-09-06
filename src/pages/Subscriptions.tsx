import { useFinance } from '../hooks/useFinance';
import { monthlyCost, shortDate, iso, occurrences, advance } from '../utils/finance';
import { Badge, Card, Icon, SectionTitle, Empty } from '../components/ui';
import type { EditorRequest } from '../components/Editor';
export function Subscriptions({ edit }: { edit: (r: EditorRequest) => void }) {
  const { data, money } = useFinance();
  const monthly = data.subscriptions
    .filter((s) => s.active)
    .reduce((a, s) => a + monthlyCost(s), 0);
  const next = data.subscriptions
    .flatMap((s) => occurrences(s, iso(), advance(iso(), 'yearly')))
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Abonnements</h1>
          <p>Les petites habitudes font les grands totaux.</p>
        </div>
        <button className="button primary" onClick={() => edit({ table: 'subscriptions' })}>
          <Icon name="Plus" />
          Nouvel abonnement
        </button>
      </div>
      <div className="three-grid">
        <Card>
          <p className="muted">Abonnements mensuels</p>
          <strong className="large-number">
            {money(monthly)}
            <small> / mois</small>
          </strong>
          <span className="muted">Équivalent mensualisé</span>
        </Card>
        <Card>
          <p className="muted">Sur une année</p>
          <strong className="large-number">{money(monthly * 12)}</strong>
          <span className="muted">
            {data.subscriptions.filter((s) => s.active).length} abonnements actifs
          </span>
        </Card>
        <Card>
          <p className="muted">Prochain prélèvement</p>
          <h2 className="spaced">{next?.name ?? 'Aucun prélèvement'}</h2>
          <span className="muted">
            {next ? `${shortDate(next.date)} · ${money(next.amount)}` : 'Votre agenda est libre'}
          </span>
        </Card>
      </div>
      <Card>
        <SectionTitle title="Mes abonnements">
          <button className="button" onClick={() => edit({ table: 'subscriptions' })}>
            <Icon name="Plus" size={16} />
            Ajouter
          </button>
        </SectionTitle>
        {data.subscriptions.map((s) => (
          <button
            className="subscription-row"
            key={s.id}
            onClick={() => edit({ table: 'subscriptions', record: s })}
          >
            <Badge icon={s.icon} color={s.color} />
            <span className="grow">
              <strong>{s.name}</strong>
              <small>
                {
                  {
                    daily: 'Quotidien',
                    weekly: 'Hebdomadaire',
                    monthly: 'Mensuel',
                    yearly: 'Annuel',
                    custom: `Tous les ${s.interval_days} jours`,
                  }[s.frequency]
                }{' '}
                · {s.active ? `Échéance de référence : ${shortDate(s.next_date)}` : 'En pause'}
              </small>
            </span>
            <b>{money(s.amount)}</b>
            <Icon name="ChevronRight" size={18} />
          </button>
        ))}
        {!data.subscriptions.length && <Empty text="Aucun abonnement enregistré." />}
      </Card>
    </>
  );
}
