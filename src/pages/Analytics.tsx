import { useFinance } from '../hooks/useFinance';
import { history, iso, monthlySeries, period, summary } from '../utils/finance';
import { Card, SectionTitle } from '../components/ui';
import { ChartEmpty, CompareChart, Donut, EvolutionChart } from '../components/Charts';
export function Analytics() {
  const { data, money } = useFinance();
  const s = summary(data);
  const series = monthlySeries(data);
  const categories = data.categories
    .map((c) => ({
      name: c.name,
      color: c.color,
      value: s.tx
        .filter((t) => t.type === 'expense' && t.category_id === c.id)
        .reduce((a, t) => a + t.amount, 0),
    }))
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value);
  const priorDate = new Date();
  priorDate.setMonth(priorDate.getMonth() - 1);
  const prior = period(priorDate, data.settings[0]?.budget_day ?? 1);
  const previous = data.transactions
    .filter((t) => t.type === 'expense' && t.date >= prior.start && t.date <= prior.end)
    .reduce((a, t) => a + t.amount, 0);
  const elapsed = Math.max(
    1,
    Math.round((new Date(iso()).getTime() - new Date(s.start).getTime()) / 86400000) + 1,
  );
  const rate = s.income ? ((s.income - s.expense) / s.income) * 100 : 0;
  const hasHistory = data.transactions.length > 0;
  const hasMonthlyActivity = series.some((month) => month.income > 0 || month.expense > 0);
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Vos finances, en perspective</h1>
          <p>Comprendre vos habitudes pour mieux choisir.</p>
        </div>
      </div>
      <div className="three-grid">
        <Card>
          <p className="muted">Dépense moyenne par jour</p>
          <strong className="large-number">{money(s.expense / elapsed)}</strong>
          <small className="muted">Sur la période en cours</small>
        </Card>
        <Card>
          <p className="muted">Capacité d’épargne</p>
          <strong className="large-number">{s.income ? `${Math.round(rate)} %` : '—'}</strong>
          <small className="muted">(Revenus − dépenses) / revenus</small>
        </Card>
        <Card>
          <p className="muted">Principale catégorie</p>
          <h2 className="spaced">{categories[0]?.name ?? 'Aucune dépense'}</h2>
          <p className="muted spaced">{money(categories[0]?.value ?? 0)}</p>
        </Card>
      </div>
      <div className="two-grid">
        <Card>
          <SectionTitle title="Revenus et dépenses" />
          <div className="chart-legend">
            <span>
              <i style={{ background: '#0A84FF' }} />
              Revenus
            </span>
            <span>
              <i style={{ background: '#B9CDF6' }} />
              Dépenses
            </span>
          </div>
          {hasMonthlyActivity ? (
            <CompareChart data={series} />
          ) : (
            <ChartEmpty
              title="Aucune période à comparer"
              text="Ajoutez un revenu ou une dépense pour commencer l’analyse."
            />
          )}
        </Card>
        <Card>
          <SectionTitle title="Où va votre argent ?" />
          {categories.length ? (
            <>
              <Donut data={categories} />
              <div className="category-legend">
                {categories.map((c) => (
                  <div key={c.name}>
                    <span>
                      <i style={{ background: c.color }} />
                      {c.name}
                    </span>
                    <b>{money(c.value)}</b>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="muted spaced">Vos premières dépenses apparaîtront ici.</p>
          )}
        </Card>
        <Card>
          <SectionTitle title="Votre patrimoine" />
          {hasHistory ? (
            <EvolutionChart
              data={history(data, '1a')}
              ariaLabel="Évolution du patrimoine sur un an"
            />
          ) : (
            <ChartEmpty />
          )}
        </Card>
        <Card>
          <SectionTitle title="Votre épargne" />
          {hasHistory ? (
            <EvolutionChart
              data={history(data, '1a', 'savings')}
              ariaLabel="Évolution de l’épargne sur un an"
            />
          ) : (
            <ChartEmpty
              title="Épargne sans historique"
              text="Les mouvements de vos comptes d’épargne apparaîtront ici."
            />
          )}
        </Card>
      </div>
      <Card className="insight-card">
        <h2>Ce que disent vos chiffres</h2>
        <p>
          {previous
            ? `Vos dépenses à ce jour représentent ${Math.round((s.expense / previous) * 100)} % du total de la période précédente (${money(previous)}).`
            : 'La comparaison apparaîtra après votre première période complète.'}
        </p>
        <p>
          {s.income
            ? `${money(s.income - s.expense)} de revenus n’ont pas été dépensés sur cette période.`
            : 'Ajoutez vos revenus pour calculer votre capacité d’épargne.'}
        </p>
        <p className="muted">
          Une période en cours est comparée à une période terminée. Les transferts entre comptes
          sont exclus.
        </p>
      </Card>
    </>
  );
}
