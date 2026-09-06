import { useFinance } from '../hooks/useFinance';
import { summary } from '../utils/finance';
import { Badge, Card, Icon, Progress, SectionTitle, Empty } from '../components/ui';
import type { EditorRequest } from '../components/Editor';
export function Budget({ edit }: { edit: (r: EditorRequest) => void }) {
  const { data, money } = useFinance();
  const s = summary(data);
  const budget = data.budgets.find((b) => b.month === s.start);
  const percent = budget ? (s.expense / budget.amount) * 100 : 0;
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Votre budget</h1>
          <p>Gardez le cap, sans vous priver de l’essentiel.</p>
        </div>
        <button
          className="button primary"
          onClick={() => edit({ table: 'budgets', record: budget, defaults: { month: s.start } })}
        >
          <Icon name="SlidersHorizontal" />
          Définir mon budget
        </button>
      </div>
      <Card className="budget-hero">
        <p className="muted">
          Période du {s.start} au {s.end}
        </p>
        <div className="section-title">
          <strong className="large-number">
            {money(s.expense)} <small>sur {money(budget?.amount ?? 0)}</small>
          </strong>
          <span className="pill">{Math.round(percent)} %</span>
        </div>
        <Progress value={percent} />
        <p className="muted spaced">
          {budget
            ? percent > 100
              ? `Budget dépassé de ${money(s.expense - budget.amount)}`
              : percent > 85
                ? 'Vous approchez de votre limite.'
                : `${money(budget.amount - s.expense)} encore disponibles dans votre budget.`
            : 'Définissez un montant pour suivre votre budget.'}
        </p>
        <button
          className="button spaced"
          onClick={() => edit({ table: 'budgets', record: budget, defaults: { month: s.start } })}
        >
          {budget ? 'Modifier le budget' : 'Créer mon budget'}
        </button>
      </Card>
      <SectionTitle title="Par catégorie">
        <button
          className="button"
          disabled={!budget}
          onClick={() =>
            edit({ table: 'budget_categories', defaults: { budget_id: budget?.id ?? '' } })
          }
        >
          <Icon name="Plus" size={16} />
          Ajouter une catégorie
        </button>
      </SectionTitle>
      <div className="cards-grid">
        {data.budget_categories
          .filter((b) => b.budget_id === budget?.id)
          .map((b) => {
            const cat = data.categories.find((c) => c.id === b.category_id);
            const spent = s.tx
              .filter((t) => t.type === 'expense' && t.category_id === b.category_id)
              .reduce((a, t) => a + t.amount, 0);
            const pct = (spent / b.amount) * 100;
            return (
              <Card key={b.id}>
                <div className="section-title">
                  <Badge icon={cat?.icon} color={cat?.color} />
                  <button
                    className="icon-button"
                    aria-label={`Modifier le budget ${cat?.name}`}
                    onClick={() => edit({ table: 'budget_categories', record: b })}
                  >
                    <Icon name="Ellipsis" />
                  </button>
                </div>
                <h2>{cat?.name}</h2>
                <div className="budget-amount">
                  <b>{money(spent)}</b>
                  <span> / {money(b.amount)}</span>
                </div>
                <Progress value={pct} />
                <p className="muted spaced">
                  {pct > 100
                    ? 'Budget dépassé'
                    : pct > 85
                      ? 'Proche de la limite'
                      : 'Vous gardez le cap'}{' '}
                  · {Math.round(pct)} %
                </p>
              </Card>
            );
          })}
      </div>
      {!budget && <Empty text="Votre premier budget vous attend." />}
    </>
  );
}
