import type { FinancialInsights } from '../../utils/insights';

export type InsightKind = 'overview' | 'subscriptions' | 'spending' | 'goal';

export type ConversationMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  sources?: string[];
  insightKind?: InsightKind;
};

export type AssistantMoney = (amount: number) => string;

export type InsightProps = {
  insights: FinancialInsights;
  money: AssistantMoney;
  currency: string;
};
