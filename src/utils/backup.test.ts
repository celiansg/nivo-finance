import { describe, expect, it } from 'vitest';
import { emptyData } from '../types';
import { backupCount, parseFinanceBackup } from './backup';

describe('Sauvegardes', () => {
  it('relit un export Nivo', () => {
    const data = emptyData();
    data.settings = [
      {
        id: 'ancien-id',
        created_at: '2026-01-01T00:00:00.000Z',
        name: 'Camille',
        currency: 'EUR',
        theme: 'system',
        budget_day: 1,
      },
    ];
    const restored = parseFinanceBackup(JSON.stringify({ exported_at: '2026-09-06', data }));
    expect(restored.settings[0].id).toBe('preferences');
    expect(backupCount(restored)).toBe(1);
  });

  it('refuse un fichier partiel', () => {
    expect(() => parseFinanceBackup('{"data":{"accounts":[]}}')).toThrow('absente');
  });
});
