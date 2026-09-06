import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useFinance } from '../hooks/useFinance';
import { Icon } from './ui';

export function ChartEmpty({
  title = 'Historique à venir',
  text = 'Le graphique se dessinera dès votre première transaction.',
}: {
  title?: string;
  text?: string;
}) {
  return (
    <div className="chart chart-empty" role="status">
      <span className="chart-empty-icon">
        <Icon name="TrendingUp" size={22} />
      </span>
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}

export function EvolutionChart({
  data,
  ariaLabel = 'Évolution du solde au fil du temps',
}: {
  data: { date: string; value: number }[];
  ariaLabel?: string;
}) {
  const { money } = useFinance();
  return (
    <div className="chart" role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 20, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="blueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="3 5" />
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            minTickGap={40}
            tick={{ fill: 'var(--muted)', fontSize: 12 }}
          />
          <YAxis
            tickFormatter={(n) => `${Number(n) / 1000}k`}
            axisLine={false}
            tickLine={false}
            width={42}
            tick={{ fill: 'var(--muted)', fontSize: 12 }}
          />
          <Tooltip
            formatter={(v) => [money(Number(v)), 'Patrimoine']}
            contentStyle={{
              background: 'var(--card)',
              border: '1px solid var(--line)',
              borderRadius: 14,
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#7C3AED"
            strokeWidth={3}
            fill="url(#blueFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
export function CompareChart({
  data,
  ariaLabel = 'Comparaison mensuelle des revenus et des dépenses',
}: {
  data: { month: string; income: number; expense: number }[];
  ariaLabel?: string;
}) {
  const { money } = useFinance();
  return (
    <div className="chart" role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barGap={5}>
          <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="3 5" />
          <XAxis dataKey="month" axisLine={false} tickLine={false} />
          <YAxis
            width={45}
            tickFormatter={(v) => `${Number(v) / 1000}k`}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(v) => money(Number(v))}
            contentStyle={{ background: 'var(--card)', borderRadius: 14 }}
          />
          <Bar dataKey="income" name="Revenus" fill="#7C3AED" radius={[7, 7, 0, 0]} />
          <Bar dataKey="expense" name="Dépenses" fill="#D8C7FA" radius={[7, 7, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
export function Donut({ data }: { data: { name: string; value: number; color: string }[] }) {
  const { money } = useFinance();
  return (
    <div
      className="donut"
      role="img"
      aria-label={`Répartition des dépenses : ${data.map((item) => `${item.name}, ${money(item.value)}`).join(' ; ')}`}
    >
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            innerRadius={65}
            outerRadius={92}
            paddingAngle={4}
            stroke="none"
          >
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          <Tooltip formatter={(v) => money(Number(v))} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
