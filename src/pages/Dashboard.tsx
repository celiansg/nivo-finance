import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFinance } from '../hooks/useFinance';
import { history, shortDate, summary } from '../utils/finance';
import { Badge, Card, Empty, Icon, Progress, SectionTitle } from '../components/ui';
import { ChartEmpty, EvolutionChart } from '../components/Charts';
import { TransactionList } from '../components/TransactionList';
export function Dashboard({ onAdd }: { onAdd: () => void }) {
  const { data, money } = useFinance();
  const s = summary(data);
  const [range, setRange] = useState('3m');
  const budget = data.budgets.find((b) => b.month === s.start);
  const progress = budget ? (s.expense / budget.amount) * 100 : 0;
  const setupSteps = [
    {
      label: 'Ajouter vos comptes',
      detail: 'Votre patrimoine de départ',
      done: data.accounts.length > 0,
      to: '/comptes',
    },
    {
      label: 'Saisir une transaction',
      detail: 'Pour démarrer votre historique',
      done: data.transactions.length > 0,
      action: onAdd,
    },
    {
      label: 'Définir votre budget',
      detail: 'Votre limite mensuelle',
      done: data.budgets.length > 0,
      to: '/budget',
    },
    {
      label: 'Planifier vos échéances',
      detail: 'Revenus et dépenses récurrents',
      done: data.subscriptions.length + data.recurring_transactions.length > 0,
      to: '/calendrier',
    },
  ];
  const completedSteps = setupSteps.filter((step) => step.done).length;
  const [setupOpen, setSetupOpen] = useState(
    () => window.matchMedia('(min-width: 768px)').matches || completedSteps === 0,
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            BONJOUR{data.settings[0]?.name ? `, ${data.settings[0].name.toUpperCase()}` : ''}
          </p>
          <h1>
            Gérez votre argent <span className="title-accent">en toute sérénité.</span>
          </h1>
          <p>Un seul espace. Une vision complète.</p>
        </div>
        <button className="button primary" onClick={onAdd}>
          <Icon name="Plus" size={18} /> Ajouter une transaction
        </button>
      </div>
      <div className="overview-grid">
        <Card className="wealth-card">
          <div className="wealth-top">
            <span>Patrimoine total</span>
            <Icon name="Layers" size={24} />
          </div>
          <div className="wealth-amount">{money(s.total)}</div>
          <span className="wealth-change">
            <Icon name="TrendingUp" size={15} />
            {s.income - s.expense >= 0 ? '+' : ''}
            {money(s.income - s.expense)} <span>sur la période</span>
          </span>
          <svg className="wealth-sparkline" viewBox="0 0 440 120" aria-hidden="true">
            <defs>
              <linearGradient id="wealth-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="white" stopOpacity="0.24" />
                <stop offset="1" stopColor="white" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              className="wealth-area"
              d="M0 101 C55 98 66 75 114 80 C160 85 166 56 220 63 C273 70 285 89 327 72 C371 55 386 26 440 16 L440 120 L0 120 Z"
            />
            <path
              className="wealth-line"
              d="M0 101 C55 98 66 75 114 80 C160 85 166 56 220 63 C273 70 285 89 327 72 C371 55 386 26 440 16"
            />
            <circle cx="440" cy="16" r="5" />
          </svg>
          <div className="wealth-bottom">
            <span>
              <i /> Tous vos comptes réunis
            </span>
            <Link to="/comptes">
              Voir les comptes <Icon name="ArrowUpRight" size={16} />
            </Link>
          </div>
        </Card>
        <div className="metric-grid">
          {[
            {
              label: 'Disponible',
              value: s.available,
              icon: 'Wallet',
              color: '#0A84FF',
              detail: 'Pour votre quotidien',
            },
            {
              label: 'Épargne',
              value: s.savings,
              icon: 'PiggyBank',
              color: '#9075DB',
              detail: 'Vos projets prennent forme',
            },
            {
              label: 'Dépenses du mois',
              value: s.expense,
              icon: 'ArrowUpRight',
              color: '#D58A64',
              detail: 'Hors transferts entre comptes',
            },
            {
              label: 'Revenus du mois',
              value: s.income,
              icon: 'ArrowDownLeft',
              color: '#38A68B',
              detail: 'Entrées enregistrées',
            },
          ].map((m) => (
            <Card className="metric" key={m.label}>
              <div>
                <span>{m.label}</span>
                <Badge icon={m.icon} color={m.color} />
              </div>
              <strong>{money(m.value)}</strong>
              <small>{m.detail}</small>
            </Card>
          ))}
        </div>
      </div>
      {completedSteps < setupSteps.length && (
        <Card className="onboarding-card">
          <div className={`onboarding-heading ${setupOpen ? '' : 'compact'}`}>
            <div>
              <span className="eyebrow">PREMIERS REPÈRES</span>
              <h2>Configurez votre espace à votre rythme</h2>
            </div>
            <div className="onboarding-controls">
              <span className="setup-progress">
                {completedSteps} sur {setupSteps.length}
              </span>
              <button
                className="icon-button"
                aria-label={
                  setupOpen
                    ? 'Replier le parcours de démarrage'
                    : 'Afficher le parcours de démarrage'
                }
                aria-expanded={setupOpen}
                onClick={() => setSetupOpen((open) => !open)}
              >
                <Icon name={setupOpen ? 'ChevronUp' : 'ChevronDown'} size={19} />
              </button>
            </div>
          </div>
          {setupOpen && (
            <div className="setup-steps">
              {setupSteps.map((step) => {
                const content = (
                  <>
                    <span className={`setup-icon ${step.done ? 'done' : ''}`}>
                      <Icon name={step.done ? 'CircleCheck' : 'ArrowRight'} size={18} />
                    </span>
                    <span>
                      <strong>{step.label}</strong>
                      <small>{step.done ? 'Terminé' : step.detail}</small>
                    </span>
                  </>
                );
                return step.action ? (
                  <button key={step.label} className="setup-step" onClick={step.action}>
                    {content}
                  </button>
                ) : (
                  <Link key={step.label} className="setup-step" to={step.to!}>
                    {content}
                  </Link>
                );
              })}
            </div>
          )}
        </Card>
      )}
      <div className="dashboard-grid">
        <Card className="evolution">
          <SectionTitle title="Évolution du patrimoine">
            <span className="legend-dot">Tous les comptes</span>
          </SectionTitle>
          <div className="chart-toolbar">
            <div>
              <strong>{money(s.total)}</strong>
              <small>Une vue d’ensemble de votre argent</small>
            </div>
            <div className="segmented">
              {['7j', '1m', '3m', '1a', 'Tout'].map((r) => (
                <button key={r} onClick={() => setRange(r)} className={r === range ? 'active' : ''}>
                  {r}
                </button>
              ))}
            </div>
          </div>
          {data.transactions.length ? (
            <EvolutionChart
              data={history(data, range)}
              ariaLabel={`Évolution de votre patrimoine sur la période ${range}`}
            />
          ) : (
            <ChartEmpty />
          )}
        </Card>
        <Card className="living-card">
          <div className="section-title">
            <h2>Votre reste à vivre</h2>
            <Icon name="Sun" />
          </div>
          <p>Jusqu’au {shortDate(s.end)}</p>
          <strong className="living-amount">{money(s.remaining)}</strong>
          <div className="daily">
            <Icon name="Sparkles" size={17} />
            <span>
              <b>{money(s.daily)}</b> / jour
            </span>
          </div>
          <div className="breakdown">
            <div>
              <span>Solde disponible</span>
              <b>{money(s.available)}</b>
            </div>
            <div>
              <span>Dépenses à venir</span>
              <b>−{money(s.planned)}</b>
            </div>
            <div>
              <span>Épargne programmée</span>
              <b>−{money(s.savingPlan)}</b>
            </div>
          </div>
          <Link to="/calendrier">
            Voir mes prévisions <Icon name="ArrowRight" size={16} />
          </Link>
        </Card>
        <Card>
          <SectionTitle title="Dernières transactions">
            <Link to="/transactions">
              Tout voir <Icon name="ArrowUpRight" size={15} />
            </Link>
          </SectionTitle>
          <TransactionList
            rows={[...data.transactions]
              .filter((t) => t.date <= s.today)
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 5)}
          />
        </Card>
        <Card className="budget-summary">
          <SectionTitle title="Budget mensuel">
            <Link to="/budget" aria-label="Voir le budget mensuel">
              <Icon name="ArrowUpRight" />
            </Link>
          </SectionTitle>
          <div
            className="budget-circle"
            style={{
              background: `conic-gradient(var(--blue) ${Math.min(progress, 100)}%, var(--line) 0)`,
            }}
          >
            <div>
              <strong>
                {Math.round(progress)}
                <small>%</small>
              </strong>
              <span>du budget utilisé</span>
            </div>
          </div>
          <div className="budget-caption">
            <b>{money(s.expense)}</b>
            <span>sur {money(budget?.amount ?? 0)}</span>
          </div>
          <Progress value={progress} />
          <p className="muted">
            {budget
              ? `${money(budget.amount - s.expense)} de marge sur cette période`
              : 'Définissez votre premier budget'}
          </p>
        </Card>
        <Card>
          <SectionTitle title="Vos prochains prélèvements">
            <Link to="/abonnements">
              Tout voir <Icon name="ArrowUpRight" size={15} />
            </Link>
          </SectionTitle>
          {s.upcoming.length ? (
            s.upcoming.slice(0, 3).map((e) => (
              <div className="simple-row" key={e.id}>
                <span className="date-tile">
                  <b>{e.date.slice(8)}</b>
                  <small>{shortDate(e.date).split(' ').slice(1).join(' ')}</small>
                </span>
                <span className="grow">
                  <strong>{e.name}</strong>
                  <small>{e.source}</small>
                </span>
                <b>
                  {e.type === 'income' ? '+' : '−'}
                  {money(e.amount)}
                </b>
              </div>
            ))
          ) : (
            <Empty text="Aucun prélèvement prévu sur cette période." />
          )}
        </Card>
        <Card>
          <SectionTitle title="Un pas vers vos projets">
            <Link to="/epargne" aria-label="Voir les objectifs d’épargne">
              <Icon name="ArrowUpRight" />
            </Link>
          </SectionTitle>
          {data.savings_goals.slice(0, 2).map((g) => {
            const n = data.goal_transactions
              .filter((t) => t.goal_id === g.id)
              .reduce((a, t) => a + t.amount, 0);
            return (
              <div className="mini-goal" key={g.id}>
                <div className="simple-row">
                  <Badge icon={g.icon} color={g.color} />
                  <span className="grow">
                    <strong>{g.name}</strong>
                    <small>
                      {money(n)} <span>sur {money(g.amount)}</span>
                    </small>
                  </span>
                  <b>{Math.round((n / g.amount) * 100)} %</b>
                </div>
                <Progress value={(n / g.amount) * 100} color={g.color} />
              </div>
            );
          })}
          {!data.savings_goals.length && <Empty text="Quel sera votre prochain projet ?" />}
        </Card>
      </div>
    </>
  );
}
