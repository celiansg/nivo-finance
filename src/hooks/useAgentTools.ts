import { useEffect } from 'react';
import { summary } from '../utils/finance';
import { useFinance } from './useFinance';
import type { EditorRequest } from '../components/Editor';
import { useAuth } from '../contexts/AuthContext';
interface ToolContext {
  registerTool(
    tool: {
      name: string;
      description: string;
      inputSchema: object;
      annotations?: { readOnlyHint: boolean };
      execute: (input: unknown) => unknown;
    },
    options: { signal: AbortSignal },
  ): void | Promise<void>;
}
export function useAgentTools(edit: (r: EditorRequest) => void) {
  const { data } = useFinance();
  const { user } = useAuth();
  useEffect(() => {
    const context = (document as Document & { modelContext?: ToolContext }).modelContext;
    if (!context?.registerTool || !user) return;
    const controller = new AbortController();
    const register = (tool: Parameters<ToolContext['registerTool']>[0]) => {
      try {
        void Promise.resolve(context.registerTool(tool, { signal: controller.signal })).catch(
          () => {},
        );
      } catch {
        /* Optional browser API; UI remains available. */
      }
    };
    register({
      name: 'read_financial_summary',
      description:
        'Read the signed-in user’s current financial totals, available balance, and forecast.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true },
      execute: () => {
        const s = summary(data);
        return {
          mode: 'personal',
          currency: data.settings[0]?.currency ?? 'EUR',
          total: s.total,
          available: s.available,
          savings: s.savings,
          expense: s.expense,
          income: s.income,
          remaining: s.remaining,
          daily: s.daily,
          forecast: s.forecast,
        };
      },
    });
    register({
      name: 'start_transaction_creation',
      description:
        'Open a transaction form for the user to review and save. Does not create or save a transaction.',
      inputSchema: {
        type: 'object',
        properties: { type: { type: 'string', enum: ['expense', 'income', 'transfer'] } },
        required: ['type'],
        additionalProperties: false,
      },
      execute: (input) => {
        if (
          !input ||
          typeof input !== 'object' ||
          !('type' in input) ||
          !['expense', 'income', 'transfer'].includes(String(input.type))
        )
          throw new Error('Invalid transaction type');
        edit({ table: 'transactions', defaults: { type: String(input.type) } });
        return { status: 'form_opened', saved: false };
      },
    });
    return () => controller.abort();
  }, [data, user, edit]);
}
