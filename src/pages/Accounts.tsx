import { useFinance } from '../hooks/useFinance';
import { summary } from '../utils/finance';
import { Badge, Card, Icon, Empty } from '../components/ui';
import type { EditorRequest } from '../components/Editor';
export function Accounts({ edit }: { edit: (r: EditorRequest) => void }) {
  const { data, money } = useFinance();
  const s = summary(data);
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Vos comptes</h1>
          <p>Un seul espace. Une vision complète.</p>
        </div>
        <button className="button primary" onClick={() => edit({ table: 'accounts' })}>
          <Icon name="Plus" />
          Nouveau compte
        </button>
      </div>
      <div className="summary-banner">
        <span>Patrimoine total</span>
        <strong>{money(s.total)}</strong>
        <small>{data.accounts.length} comptes réunis</small>
      </div>
      <div className="cards-grid">
        {s.balances.map((a) => (
          <Card className="account-card" key={a.id}>
            <div className="section-title">
              <Badge icon={a.icon} color={a.color} />
              <button
                className="button account-edit-button"
                aria-label={`Modifier ${a.name}`}
                onClick={() =>
                  edit({ table: 'accounts', record: data.accounts.find((x) => x.id === a.id) })
                }
              >
                <Icon name="Pencil" size={15} />
                Modifier
              </button>
            </div>
            <p className="muted">
              {
                {
                  current: 'Compte courant',
                  savings: 'Épargne',
                  investment: 'Investissements',
                  cash: 'Espèces',
                  other: 'Autre',
                }[a.type]
              }
            </p>
            <h2>{a.name}</h2>
            <strong className="large-number">{money(a.current)}</strong>
            <p className="muted">{a.description}</p>
            <span className="account-mini-bars" aria-hidden="true">
              {[32, 48, 62, 78, 96].map((height) => (
                <i key={height} style={{ height: `${height}%`, background: a.color }} />
              ))}
            </span>
            <div className="account-line" style={{ background: a.color }} />
          </Card>
        ))}
        <button className="add-card" onClick={() => edit({ table: 'accounts' })}>
          <Icon name="Plus" size={28} />
          <span>Nouveau compte</span>
        </button>
      </div>
      {data.accounts.length > 1 && (
        <button
          className="button"
          onClick={() => edit({ table: 'transactions', defaults: { type: 'transfer' } })}
        >
          <Icon name="ArrowLeftRight" />
          Transférer entre mes comptes
        </button>
      )}
      {!data.accounts.length && (
        <Empty text="Ajoutez un compte pour commencer à suivre votre argent." />
      )}
    </>
  );
}
