import { useState } from 'react';
import { useFinance } from '../hooks/useFinance';
import { history, shortDate, summary } from '../utils/finance';
import { Badge, Card, Icon, Progress, SectionTitle, Empty } from '../components/ui';
import { EvolutionChart } from '../components/Charts';
import type { EditorRequest } from '../components/Editor';
export function Savings({ edit }: { edit: (r: EditorRequest) => void }) {
  const { data, money } = useFinance();
  const s = summary(data);
  const [range, setRange] = useState('3m');
  const allocated = data.goal_transactions.reduce((a, t) => a + t.amount, 0);
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Épargne & projets</h1>
          <p>Donnez une direction à votre argent.</p>
        </div>
        <button className="button primary" onClick={() => edit({ table: 'savings_goals' })}>
          <Icon name="Plus" />
          Nouvel objectif
        </button>
      </div>
      <Card className="spaced-bottom">
        <SectionTitle title="Épargne totale">
          <div className="segmented">
            {['1m', '3m', '1a', 'Tout'].map((r) => (
              <button key={r} onClick={() => setRange(r)} className={r === range ? 'active' : ''}>
                {r}
              </button>
            ))}
          </div>
        </SectionTitle>
        <strong className="large-number">{money(s.savings)}</strong>
        <p className="muted">
          {money(allocated)} alloués aux projets · {money(s.savings - allocated)} non alloués
        </p>
        <EvolutionChart data={history(data, range, 'savings')} />
      </Card>
      <SectionTitle title="Vos prochains grands oui">
        <button className="button" onClick={() => edit({ table: 'savings_goals' })}>
          <Icon name="Plus" />
          Ajouter
        </button>
      </SectionTitle>
      <div className="cards-grid">
        {data.savings_goals.map((g) => {
          const current = data.goal_transactions
            .filter((t) => t.goal_id === g.id)
            .reduce((a, t) => a + t.amount, 0);
          return (
            <Card key={g.id} className="goal-card">
              <div className="section-title">
                <Badge icon={g.icon} color={g.color} />
                <button
                  className="icon-button"
                  aria-label={`Modifier ${g.name}`}
                  onClick={() => edit({ table: 'savings_goals', record: g })}
                >
                  <Icon name="Ellipsis" />
                </button>
              </div>
              <h2>{g.name}</h2>
              <strong className="large-number">{money(current)}</strong>
              <div className="goal-detail">
                <span>sur {money(g.amount)}</span>
                <b>{Math.round((current / g.amount) * 100)} %</b>
              </div>
              <Progress value={(current / g.amount) * 100} color={g.color} />
              <p className="muted spaced">
                {g.target_date
                  ? `Objectif : ${shortDate(g.target_date)} ${g.target_date.slice(0, 4)}`
                  : 'À votre rythme'}
              </p>
              <button
                className="button spaced"
                onClick={() => edit({ table: 'goal_transactions', defaults: { goal_id: g.id } })}
              >
                <Icon name="Plus" size={16} />
                Ajouter / retirer
              </button>
            </Card>
          );
        })}
      </div>
      {!data.savings_goals.length && (
        <Empty
          text="Un voyage, un projet, une tranquillité d’esprit…"
          action={() => edit({ table: 'savings_goals' })}
        />
      )}
      <Card>
        <SectionTitle title="Allocations aux objectifs" />
        {data.goal_transactions.map((t) => (
          <button
            key={t.id}
            className="subscription-row"
            onClick={() => edit({ table: 'goal_transactions', record: t })}
          >
            <span className="grow">
              {data.savings_goals.find((g) => g.id === t.goal_id)?.name}
              <small>
                {shortDate(t.date)} · {t.note || 'Allocation'}
              </small>
            </span>
            <b>
              {t.amount > 0 ? '+' : ''}
              {money(t.amount)}
            </b>
            <Icon name="ChevronRight" size={16} />
          </button>
        ))}
        <p className="muted spaced">
          Les allocations organisent votre épargne. Elles ne modifient pas les soldes des comptes.
        </p>
      </Card>
    </>
  );
}
