import { Link } from 'react-router-dom';
import { Icon, Progress } from '../ui';
import type { InsightKind, InsightProps } from './types';

export function FinanceInsightCard({ kind, insights, money }: InsightProps & { kind: InsightKind }) {
  if (kind === 'subscriptions') {
    return <div className="assistant-insight-card"><div className="assistant-insight-head"><span className="assistant-insight-icon"><Icon name="Repeat" size={17} /></span><span><strong>Abonnements et récurrences</strong><small>Depuis vos données Nivo</small></span></div><div className="assistant-insight-values"><b>{money(insights.knownSubscriptionsMonthly)}<small>/ mois confirmés</small></b><b>{insights.candidates.length}<small>à vérifier</small></b></div><Link to="/gerer-mon-argent" className="assistant-insight-link">Voir les détections <Icon name="ArrowUpRight" size={15} /></Link></div>;
  }
  if (kind === 'spending') {
    const max = insights.categorySpending[0]?.amount ?? 1;
    return <div className="assistant-insight-card"><div className="assistant-insight-head"><span className="assistant-insight-icon"><Icon name="ChartNoAxesCombined" size={17} /></span><span><strong>Répartition du mois</strong><small>{insights.start.slice(0, 7)} · dépenses enregistrées</small></span></div><div className="assistant-mini-bars">{insights.categorySpending.slice(0, 4).map((item) => <div key={item.categoryId ?? 'uncategorized'}><span><small>{item.label}</small><b>{money(item.amount)}</b></span><i><em style={{ width: `${Math.max(7, (item.amount / max) * 100)}%` }} /></i></div>)}</div><Link to="/transactions" className="assistant-insight-link">Voir les opérations <Icon name="ArrowUpRight" size={15} /></Link></div>;
  }
  if (kind === 'goal') {
    const goal = insights.goals[0];
    if (!goal) return null;
    const progress = goal.amount ? Math.min(100, (goal.saved / goal.amount) * 100) : 0;
    return <div className="assistant-insight-card"><div className="assistant-insight-head"><span className="assistant-insight-icon"><Icon name={goal.icon} size={17} /></span><span><strong>{goal.name}</strong><small>Objectif d’épargne</small></span><b>{Math.round(progress)} %</b></div><Progress value={progress} color={goal.color} /><div className="assistant-insight-meta"><span>{money(goal.saved)} épargnés</span><span>{money(goal.remaining)} restants</span></div><Link to="/epargne" className="assistant-insight-link">Ouvrir mes objectifs <Icon name="ArrowUpRight" size={15} /></Link></div>;
  }
  return <div className="assistant-insight-card"><div className="assistant-insight-head"><span className="assistant-insight-icon"><Icon name="Wallet" size={17} /></span><span><strong>Votre marge du mois</strong><small>Calculée sur les données connues</small></span></div><div className="assistant-insight-total">{insights.disposableKnown ? money(insights.disposable) : 'À préciser'}</div><div className="assistant-insight-breakdown"><span><small>Revenus</small><b>{money(insights.income || insights.incomeExpected)}</b></span><span><small>Charges fixes</small><b>{money(insights.fixedExpenses)}</b></span><span><small>Dépenses variables</small><b>{money(insights.variableExpenses)}</b></span></div><Link to="/gerer-mon-argent" className="assistant-insight-link">Ouvrir le pilotage <Icon name="ArrowUpRight" size={15} /></Link></div>;
}
