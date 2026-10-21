import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Empty, Icon, Progress, SectionTitle } from '../components/ui';
import type { EditorRequest } from '../components/Editor';
import { useFinance } from '../hooks/useFinance';
import { buildFinancialInsights, simulateMonthlySavings, type RecurringCandidate } from '../utils/insights';
import { shortDate } from '../utils/finance';
import type { Tables } from '../types';

type Tab = 'overview' | 'subscriptions' | 'goals';

export function ManageMoney({ edit }: { edit: (request: EditorRequest) => void }) {
  const { data, money, save, notify } = useFinance();
  const [tab, setTab] = useState<Tab>('overview');
  const [ignored, setIgnored] = useState<string[]>([]);
  const [scenarioAmount, setScenarioAmount] = useState('100');
  const [savingCandidate, setSavingCandidate] = useState<string | null>(null);
  const insights = useMemo(() => buildFinancialInsights(data), [data]);
  const candidates = insights.candidates.filter((candidate) => !ignored.includes(candidate.id));
  const scenario = simulateMonthlySavings(insights, Number(scenarioAmount.replace(',', '.')) || 0);
  const currency = data.settings[0]?.currency ?? 'EUR';

  async function confirmCandidate(candidate: RecurringCandidate) {
    const account = data.accounts[0];
    if (!account) {
      notify('Ajoutez d’abord un compte pour enregistrer cet abonnement.');
      return;
    }
    setSavingCandidate(candidate.id);
    try {
      const category = data.categories.find((item) => item.id === candidate.categoryId);
      const subscription: Tables['subscriptions'] = {
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        name: candidate.name,
        amount: candidate.amount,
        frequency: candidate.frequency,
        interval_days: candidate.intervalDays,
        next_date: candidate.nextDate,
        category_id: candidate.categoryId,
        account_id: account.id,
        icon: category?.icon ?? 'Repeat',
        color: category?.color ?? '#7C3AED',
        active: true,
      };
      await save('subscriptions', subscription);
      setIgnored((current) => [...current, candidate.id]);
      notify(`${candidate.name} ajouté à vos abonnements`);
    } catch (cause) {
      notify(cause instanceof Error ? cause.message : 'Impossible d’enregistrer cet abonnement.');
    } finally {
      setSavingCandidate(null);
    }
  }

  return (
    <>
      <div className="page-heading manage-money-heading">
        <div>
          <span className="eyebrow"><Icon name="ChartNoAxesCombined" size={15} /> VOTRE PILOTAGE</span>
          <h1>Gérer mon argent</h1>
          <p>Ce mois-ci, voici ce qui compte vraiment.</p>
        </div>
        <button className="button primary" onClick={() => edit({ table: 'transactions' })}>
          <Icon name="Plus" size={17} /> Ajouter une opération
        </button>
      </div>

      <div className="manage-tabs" role="tablist" aria-label="Sections de gestion financière">
        {([['overview', 'Vue d’ensemble'], ['subscriptions', 'Abonnements'], ['goals', 'Objectifs']] as const).map(([value, label]) => (
          <button key={value} role="tab" aria-selected={tab === value} className={tab === value ? 'active' : ''} onClick={() => setTab(value)}>
            {label}
          </button>
        ))}
      </div>

      {insights.dataCompleteness === 'empty' && (
        <Card className="manage-empty-card">
          <Icon name="Sparkles" size={24} />
          <div><strong>Votre première vue financière est prête à construire.</strong><p>Ajoutez un compte et quelques opérations pour que Nivo calcule votre reste à vivre.</p></div>
          <Link className="button primary" to="/comptes">Ajouter un compte</Link>
        </Card>
      )}

      {tab === 'overview' && (
        <>
          <div className="manage-hero-grid">
            <Card className="manage-disposable-card">
              <div className="manage-card-kicker"><span>Disponible à dépenser</span><Icon name="Wallet" size={18} /></div>
              {insights.disposableKnown ? <strong className={insights.disposable < 0 ? 'negative' : ''}>{money(insights.disposable)}</strong> : <strong className="unknown-value">À préciser</strong>}
              <p>{insights.disposableKnown ? 'Revenus connus − charges fixes − dépenses du mois − épargne planifiée.' : 'Ajoutez un revenu ou un salaire récurrent pour obtenir un calcul fiable.'}</p>
              <div className="manage-breakdown">
                <span><small>Revenus</small><b>{money(insights.income || insights.incomeExpected)}</b></span>
                <span><small>Charges fixes</small><b>{money(insights.fixedExpenses)}</b></span>
                <span><small>Dépenses variables</small><b>{money(insights.variableExpenses)}</b></span>
              </div>
            </Card>
            <Card className="manage-scenario-card">
              <div className="manage-card-kicker"><span>Tester une épargne</span><Icon name="PiggyBank" size={18} /></div>
              <p>Que se passe-t-il si vous mettez de côté chaque mois :</p>
              <label className="manage-scenario-input"><input type="number" min="0" step="1" value={scenarioAmount} onChange={(event) => setScenarioAmount(event.target.value)} /><span>{currency} / mois</span></label>
              <div className={`manage-scenario-result ${scenario.feasible ? 'is-feasible' : 'is-not-feasible'}`}>
                <span><Icon name={scenario.feasible ? 'CircleCheck' : 'Bell'} size={16} /> {scenario.feasible ? 'Scénario soutenable' : 'À ajuster'}</span>
                <b>{money(scenario.annualImpact)} / an</b>
              </div>
              <small className="form-hint">Reste estimé après épargne : {insights.disposableKnown ? money(scenario.remainingDisposable) : 'données insuffisantes'}.</small>
            </Card>
          </div>

          <div className="manage-insight-grid">
            <Card>
              <SectionTitle title="Abonnements à vérifier"><button className="text-button" onClick={() => setTab('subscriptions')}>Voir tout <Icon name="ChevronRight" size={14} /></button></SectionTitle>
              {candidates.slice(0, 3).map((candidate) => <CandidateRow key={candidate.id} candidate={candidate} money={money} onConfirm={() => void confirmCandidate(candidate)} onIgnore={() => setIgnored((current) => [...current, candidate.id])} saving={savingCandidate === candidate.id} />)}
              {!candidates.length && <Empty text="Aucune récurrence à vérifier pour le moment." />}
            </Card>
            <Card>
              <SectionTitle title="Vos objectifs"><button className="text-button" onClick={() => setTab('goals')}>Voir tout <Icon name="ChevronRight" size={14} /></button></SectionTitle>
              {insights.goals.slice(0, 2).map((goal) => <GoalRow key={goal.id} goal={goal} money={money} />)}
              {!insights.goals.length && <Empty text="Créez un objectif pour donner une direction à votre épargne." action={() => edit({ table: 'savings_goals' })} />}
            </Card>
          </div>
        </>
      )}

      {tab === 'subscriptions' && (
        <Card>
          <SectionTitle title="Détections depuis vos transactions"><span className="data-source-chip"><Icon name="ShieldCheck" size={14} /> Données Nivo</span></SectionTitle>
          <p className="manage-section-intro">Nivo repère des montants similaires à intervalles réguliers. Rien n’est créé sans votre confirmation.</p>
          <div className="manage-subscription-summary"><span><b>{money(insights.knownSubscriptionsMonthly)}</b><small>déjà confirmé / mois</small></span><span><b>{money(insights.knownSubscriptionsAnnual)}</b><small>équivalent annuel</small></span><Link className="button" to="/abonnements">Gérer mes abonnements</Link></div>
          {candidates.map((candidate) => <CandidateRow key={candidate.id} candidate={candidate} money={money} onConfirm={() => void confirmCandidate(candidate)} onIgnore={() => setIgnored((current) => [...current, candidate.id])} saving={savingCandidate === candidate.id} />)}
          {!candidates.length && <Empty text="Aucune détection en attente. Nivo a besoin de plusieurs opérations comparables." />}
          <div className="manage-source-note"><Icon name="Mail" size={17} /><span><strong>Détection par e-mail</strong><small>Connexion Gmail volontaire, OAuth et autorisations à configurer. Cette fonctionnalité n’est pas activée et aucune messagerie n’est lue.</small></span><button className="button" disabled>Bientôt disponible</button></div>
        </Card>
      )}

      {tab === 'goals' && (
        <Card>
          <SectionTitle title="Objectifs d’épargne"><button className="button primary" onClick={() => edit({ table: 'savings_goals' })}><Icon name="Plus" size={16} /> Nouvel objectif</button></SectionTitle>
          <p className="manage-section-intro">Les montants sont calculés à partir de vos allocations. Une simulation ne modifie jamais vos données.</p>
          <div className="manage-goal-list">{insights.goals.map((goal) => <GoalRow key={goal.id} goal={goal} money={money} detailed />)}</div>
          {!insights.goals.length && <Empty text="Aucun objectif défini." action={() => edit({ table: 'savings_goals' })} />}
        </Card>
      )}
    </>
  );
}

function CandidateRow({ candidate, money, onConfirm, onIgnore, saving }: { candidate: RecurringCandidate; money: (amount: number) => string; onConfirm: () => void; onIgnore: () => void; saving: boolean }) {
  return <div className="manage-candidate-row"><span className="manage-candidate-icon"><Icon name="Repeat" size={18} /></span><span className="manage-candidate-main"><strong>{candidate.name}</strong><small>{money(candidate.amount)} · {candidate.occurrences} occurrences · {Math.round(candidate.confidence * 100)} % de confiance</small><em>{candidate.reason}</em></span><span className="manage-candidate-cost"><b>{money(candidate.monthlyAmount)}</b><small>/ mois</small></span><button className="button compact" disabled={saving} onClick={onConfirm}>{saving ? '…' : 'Confirmer'}</button><button className="icon-button" aria-label={`Ignorer ${candidate.name}`} onClick={onIgnore}><Icon name="X" size={16} /></button></div>;
}

function GoalRow({ goal, money, detailed = false }: { goal: ReturnType<typeof buildFinancialInsights>['goals'][number]; money: (amount: number) => string; detailed?: boolean }) {
  const progress = goal.amount ? Math.min(100, (goal.saved / goal.amount) * 100) : 0;
  return <div className={`manage-goal-row ${detailed ? 'detailed' : ''}`}><div className="manage-goal-heading"><span className="manage-goal-icon"><Icon name={goal.icon} size={17} /></span><span><strong>{goal.name}</strong><small>{goal.target_date ? `Échéance ${shortDate(goal.target_date)}` : 'Sans date cible'}</small></span><b>{money(goal.saved)} <small>/ {money(goal.amount)}</small></b></div><Progress value={progress} color={goal.color} /><div className="manage-goal-meta"><span>{Math.round(progress)} % atteint</span>{goal.monthlyRequired !== null ? <span>{money(goal.monthlyRequired)} / mois nécessaires {goal.feasible === false ? '· à ajuster' : ''}</span> : <span>Ajoutez une date cible pour simuler</span>}</div></div>;
}

