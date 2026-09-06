import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useFinance } from '../hooks/useFinance';
import { useAuth } from '../contexts/AuthContext';
import { Card, Badge, Icon, SectionTitle } from '../components/ui';
import type { EditorRequest } from '../components/Editor';
import type { Settings as SettingsType } from '../types';
import type { Data } from '../types';
import { backupCount, parseFinanceBackup } from '../utils/backup';
import { period } from '../utils/finance';
export function Settings({ edit }: { edit: (r: EditorRequest) => void }) {
  const { data, save, restore, notify } = useFinance();
  const { user, logout } = useAuth();
  const initial = data.settings[0];
  const [name, setName] = useState(initial?.name ?? ''),
    [theme, setTheme] = useState<SettingsType['theme']>(initial?.theme ?? 'system'),
    [currency, setCurrency] = useState(initial?.currency ?? 'EUR'),
    [day, setDay] = useState(initial?.budget_day ?? 1),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [backup, setBackup] = useState<Data | null>(null),
    [backupName, setBackupName] = useState(''),
    [importBusy, setImportBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (initial && initial.budget_day !== day) {
        const oldStart = period(new Date(), initial.budget_day).start;
        const newStart = period(new Date(), day).start;
        const activeBudget = data.budgets.find((item) => item.month === oldStart);
        const targetExists = data.budgets.some((item) => item.month === newStart);
        if (activeBudget && !targetExists)
          await save('budgets', { ...activeBudget, month: newStart });
      }
      await save('settings', {
        id: 'preferences',
        created_at: initial?.created_at ?? new Date().toISOString(),
        name,
        currency,
        theme,
        budget_day: day,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Enregistrement impossible.');
    } finally {
      setBusy(false);
    }
  }
  function exportData() {
    const url = URL.createObjectURL(
      new Blob(
        [
          JSON.stringify(
            { version: 1, exported_at: new Date().toISOString(), mode: 'personal', data },
            null,
            2,
          ),
        ],
        { type: 'application/json' },
      ),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = `nivo-personnel-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify('Export téléchargé');
  }
  async function selectBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    try {
      setBackup(parseFinanceBackup(await file.text()));
      setBackupName(file.name);
    } catch (cause) {
      setBackup(null);
      setBackupName('');
      setError(cause instanceof Error ? cause.message : 'Lecture de la sauvegarde impossible.');
    }
  }
  async function importBackup() {
    if (!backup) return;
    setImportBusy(true);
    setError('');
    try {
      await restore(backup);
      setBackup(null);
      setBackupName('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Restauration impossible.');
    } finally {
      setImportBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>À votre image</h1>
          <p>Les petits réglages qui font la différence.</p>
        </div>
      </div>
      <div className="two-grid">
        <Card>
          <SectionTitle title="Préférences" />
          <form onSubmit={submit}>
            <div className="form-grid">
              <label className="field full">
                <span>Votre prénom</span>
                <input maxLength={50} value={name} onChange={(e) => setName(e.target.value)} />
              </label>
              <label className="field">
                <span>Apparence</span>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as SettingsType['theme'])}
                >
                  <option value="light">Clair</option>
                  <option value="dark">Sombre</option>
                  <option value="system">Système</option>
                </select>
              </label>
              <label className="field">
                <span>Devise d’affichage</span>
                <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                  <option>EUR</option>
                  <option>USD</option>
                  <option>GBP</option>
                  <option>CHF</option>
                </select>
              </label>
              <label className="field">
                <span>Début du mois budgétaire</span>
                <select value={day} onChange={(e) => setDay(Number(e.target.value))}>
                  {Array.from({ length: 28 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      Le {i + 1}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Langue</span>
                <input value="Français" readOnly />
              </label>
            </div>
            <p className="form-hint">
              La devise s’applique à tous les montants ; elle n’effectue pas de conversion de
              change.
            </p>
            {error && <p className="error">{error}</p>}
            <button className="button primary" disabled={busy}>
              {busy ? 'Enregistrement…' : 'Enregistrer les préférences'}
            </button>
          </form>
        </Card>
        <Card>
          <SectionTitle title="Votre espace" />
          <Badge icon="ShieldCheck" />
          <h2 className="spaced">Espace personnel synchronisé</h2>
          <p className="muted spaced">{user?.email}</p>
          <p className="muted spaced">
            Vos données sont enregistrées sous votre UID Firebase et synchronisées en temps réel.
          </p>
          <div className="stack-actions">
            <button className="button" onClick={exportData}>
              <Icon name="Download" />
              Exporter mes données JSON
            </button>
            <label className="button file-button">
              <Icon name="Upload" />
              Choisir une sauvegarde
              <input type="file" accept="application/json,.json" onChange={selectBackup} />
            </label>
            {backup && (
              <div className="restore-preview" role="status">
                <span>
                  <strong>{backupName}</strong>
                  <small>{backupCount(backup)} éléments prêts à être restaurés</small>
                </span>
                <button className="button primary" disabled={importBusy} onClick={importBackup}>
                  {importBusy ? 'Restauration…' : 'Restaurer cette sauvegarde'}
                </button>
                <button
                  className="icon-button"
                  aria-label="Annuler la restauration"
                  onClick={() => setBackup(null)}
                >
                  <Icon name="X" size={18} />
                </button>
              </div>
            )}
            <button
              className="button"
              onClick={async () => {
                try {
                  await logout();
                } catch (cause) {
                  setError(cause instanceof Error ? cause.message : 'Déconnexion impossible.');
                }
              }}
            >
              <Icon name="LogOut" />
              Se déconnecter
            </button>
          </div>
          <p className="form-hint spaced">
            La restauration remplace les données actuelles après votre validation. Exportez une
            copie avant de restaurer une ancienne sauvegarde.
          </p>
        </Card>
      </div>
      <Card>
        <SectionTitle title="Vos catégories">
          <button className="button" onClick={() => edit({ table: 'categories' })}>
            <Icon name="Plus" size={16} />
            Créer une catégorie
          </button>
        </SectionTitle>
        <div className="category-grid">
          {data.categories.map((c) => (
            <button key={c.id} onClick={() => edit({ table: 'categories', record: c })}>
              <Badge icon={c.icon} color={c.color} />
              <span>{c.name}</span>
              <Icon name="ChevronRight" size={14} />
            </button>
          ))}
        </div>
      </Card>
    </>
  );
}
