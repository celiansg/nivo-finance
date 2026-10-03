import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useFinance } from '../hooks/useFinance';
import { Card, Icon, SectionTitle } from '../components/ui';
import type { Category, TransactionType } from '../types';

type ExtractedTransaction = {
  date: string;
  description: string;
  amount: number;
  direction: 'expense' | 'income';
  category: string;
  confidence: number;
};

type ReviewTransaction = ExtractedTransaction & {
  categoryId: string | null;
  duplicate: boolean;
  selected: boolean;
};

type AnalysisResult = {
  transactions: ExtractedTransaction[];
  summary: string;
  warnings: string[];
};

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

function sameTransaction(
  candidate: ExtractedTransaction,
  existing: { date: string; amount: number; description: string },
) {
  if (candidate.date !== existing.date || Math.abs(candidate.amount - existing.amount) > 0.01)
    return false;
  const incoming = normalize(candidate.description);
  const saved = normalize(existing.description);
  return incoming === saved || incoming.includes(saved) || saved.includes(incoming);
}

function findCategory(name: string, categories: Category[]) {
  const normalized = normalize(name);
  return (
    categories.find((category) => normalize(category.name) === normalized) ??
    categories.find(
      (category) =>
        normalized.includes(normalize(category.name)) ||
        normalize(category.name).includes(normalized),
    ) ??
    categories.find((category) => category.id === 'autre') ??
    null
  );
}

function resizeImage(file: File) {
  return new Promise<{ image: string; mimeType: string }>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      const maxSide = 1800;
      const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d');
      if (!context) return reject(new Error('Impossible de préparer cette image.'));
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
      resolve({ image: dataUrl.split(',')[1] ?? '', mimeType: 'image/jpeg' });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Cette image ne peut pas être lue par le navigateur.'));
    };
    image.src = url;
  });
}

function amountLabel(amount: number, direction: 'expense' | 'income', currency: string) {
  const formatted = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
  return direction === 'expense' ? `−${formatted}` : `+${formatted}`;
}

export function AIAssistant() {
  const { user } = useAuth();
  const { data, save, money, notify } = useFinance();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [accountId, setAccountId] = useState(data.accounts[0]?.id ?? '');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [reviewRows, setReviewRows] = useState<ReviewTransaction[]>([]);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!accountId && data.accounts[0]) setAccountId(data.accounts[0].id);
  }, [accountId, data.accounts]);

  const selectedCount = reviewRows.filter((row) => row.selected && !row.duplicate).length;
  const currency = data.settings[0]?.currency ?? 'EUR';
  const totalSelected = useMemo(
    () =>
      reviewRows
        .filter((row) => row.selected && !row.duplicate)
        .reduce(
          (total, row) => total + (row.direction === 'expense' ? -row.amount : row.amount),
          0,
        ),
    [reviewRows],
  );

  function chooseFile(next: File | undefined) {
    if (!next) return;
    setError('');
    setAnalysis(null);
    setReviewRows([]);
    if (!next.type.startsWith('image/')) {
      setFile(null);
      setPreview('');
      setError('Choisissez une image de relevé bancaire.');
      return;
    }
    if (next.size > 8_000_000) {
      setFile(null);
      setPreview('');
      setError('Cette image est trop volumineuse. Choisissez une capture de moins de 8 Mo.');
      return;
    }
    setFile(next);
    setPreview(URL.createObjectURL(next));
  }

  async function analyze() {
    if (!file) {
      setError('Ajoutez d’abord une capture de votre banque.');
      return;
    }
    if (!user) {
      setError('Votre session a expiré. Reconnectez-vous.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const prepared = await resizeImage(file);
      const token = await user.getIdToken();
      const response = await fetch('/api/analyze-expenses', {
        method: 'POST',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(prepared),
      });
      const payload = (await response.json()) as AnalysisResult & { error?: string };
      if (!response.ok) throw new Error(payload.error || 'Analyse impossible.');
      const extracted = Array.isArray(payload.transactions) ? payload.transactions : [];
      const rows = extracted.map((row) => {
        const category = findCategory(row.category, data.categories);
        const duplicate = data.transactions.some((existing) => sameTransaction(row, existing));
        return {
          ...row,
          categoryId: category?.id ?? null,
          duplicate,
          selected: !duplicate && row.confidence >= 0.65,
        };
      });
      setAnalysis({
        transactions: extracted,
        summary:
          payload.summary ||
          `${rows.length} opération${rows.length > 1 ? 's' : ''} détectée${rows.length > 1 ? 's' : ''}.`,
        warnings: Array.isArray(payload.warnings) ? payload.warnings : [],
      });
      setReviewRows(rows);
      if (!rows.length) setError('Aucune opération lisible n’a été détectée sur cette image.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Analyse impossible pour le moment.');
    } finally {
      setBusy(false);
    }
  }

  function toggleRow(index: number) {
    setReviewRows((rows) =>
      rows.map((row, rowIndex) =>
        rowIndex === index && !row.duplicate ? { ...row, selected: !row.selected } : row,
      ),
    );
  }

  async function importSelected() {
    if (!accountId) {
      setError('Choisissez le compte sur lequel enregistrer ces opérations.');
      return;
    }
    const account = data.accounts.find((item) => item.id === accountId);
    if (!account) return;
    const rows = reviewRows.filter((row) => row.selected && !row.duplicate);
    if (!rows.length) {
      setError('Sélectionnez au moins une opération à ajouter.');
      return;
    }
    setSaving(true);
    setError('');
    let imported = 0;
    try {
      for (const row of rows) {
        const sourceEventId = `ai-import-${row.date}-${row.amount.toFixed(2)}-${normalize(row.description).replace(/\s+/g, '-')}`;
        await save('transactions', {
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
          amount: row.amount,
          type: row.direction as TransactionType,
          category_id: row.categoryId,
          account_id: account.id,
          to_account_id: null,
          source_event_id: sourceEventId,
          date: row.date,
          time: '12:00',
          description: row.description,
          note: 'Importé depuis un relevé bancaire avec Nivo IA',
        });
        imported += 1;
      }
      notify(`${imported} opération${imported > 1 ? 's' : ''} ajoutée${imported > 1 ? 's' : ''}`);
      const importedIds = new Set(
        rows.map((row) => `${row.date}-${row.amount}-${row.description}`),
      );
      setReviewRows((current) =>
        current.map((row) =>
          importedIds.has(`${row.date}-${row.amount}-${row.description}`)
            ? { ...row, duplicate: true, selected: false }
            : row,
        ),
      );
    } catch (cause) {
      setError(
        imported
          ? `${imported} opération${imported > 1 ? 's ont' : ' a'} été ajoutée${imported > 1 ? 's' : ''}, mais la suite a échoué.`
          : cause instanceof Error
            ? cause.message
            : 'Import impossible.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            <Icon name="Sparkles" size={15} /> NIVO IA
          </span>
          <h1>Import intelligent</h1>
          <p>Transformez une capture bancaire en opérations prêtes à vérifier.</p>
        </div>
      </div>
      <div className="ai-import-grid">
        <Card className="ai-upload-card">
          <SectionTitle title="1. Ajoutez une capture" />
          <label className="ai-dropzone" htmlFor="bank-screenshot">
            {preview ? (
              <img src={preview} alt="Aperçu de la capture bancaire" />
            ) : (
              <>
                <span className="ai-upload-icon">
                  <Icon name="Upload" size={25} />
                </span>
                <strong>Déposez votre relevé ici</strong>
                <span>PNG, JPG, WebP ou HEIC · 8 Mo maximum</span>
              </>
            )}
            <input
              id="bank-screenshot"
              type="file"
              accept="image/*"
              onChange={(event) => chooseFile(event.target.files?.[0])}
            />
          </label>
          {file && <p className="ai-file-name">{file.name}</p>}
          <label className="field ai-account-field">
            <span>Compte à utiliser pour l’import</span>
            <select value={accountId} onChange={(event) => setAccountId(event.target.value)}>
              <option value="">Choisir un compte…</option>
              {data.accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </label>
          {!data.accounts.length && (
            <p className="form-hint">
              Créez d’abord un compte dans <Link to="/comptes">Comptes</Link>.
            </p>
          )}
          <button
            className="button primary ai-analyze-button"
            onClick={() => void analyze()}
            disabled={busy || !file}
          >
            <Icon name="Sparkles" size={17} />
            {busy ? 'Lecture de la capture…' : 'Analyser avec Nivo IA'}
          </button>
          <p className="form-hint">
            Les éléments détectés restent en attente tant que vous ne les avez pas confirmés.
          </p>
        </Card>
        <Card className="ai-privacy-card">
          <SectionTitle title="Vos données restent sous contrôle" />
          <div className="ai-privacy-item">
            <Icon name="ShieldCheck" />
            <span>
              <strong>Clé protégée</strong>
              <small>La clé IA reste côté serveur.</small>
            </span>
          </div>
          <div className="ai-privacy-item">
            <Icon name="Eye" />
            <span>
              <strong>Lecture ciblée</strong>
              <small>Nivo lit uniquement les opérations visibles.</small>
            </span>
          </div>
          <div className="ai-privacy-item">
            <Icon name="CircleCheck" />
            <span>
              <strong>Validation manuelle</strong>
              <small>Aucune dépense n’est créée sans votre accord.</small>
            </span>
          </div>
          <div className="ai-privacy-note">
            Pour votre sécurité, une capture partielle ne déclenche jamais la suppression
            d’opérations existantes.
          </div>
        </Card>
      </div>
      {error && (
        <div className="error ai-error" role="alert">
          {error}
        </div>
      )}
      {analysis && (
        <Card className="ai-results-card">
          <div className="ai-results-header">
            <div>
              <span className="eyebrow">
                <Icon name="CircleCheck" size={15} /> À VÉRIFIER
              </span>
              <h2>{analysis.summary}</h2>
            </div>
            <div className="ai-total">
              {totalSelected >= 0 ? '+' : ''}
              {money(totalSelected)}
            </div>
          </div>
          {analysis.warnings.length > 0 && (
            <div className="ai-warnings">
              <Icon name="Bell" size={17} />
              <span>{analysis.warnings.join(' ')}</span>
            </div>
          )}
          {reviewRows.length > 0 ? (
            <div className="ai-review-list">
              {reviewRows.map((row, index) => (
                <label
                  className={`ai-review-row ${row.duplicate ? 'is-duplicate' : ''}`}
                  key={`${row.date}-${row.description}-${index}`}
                >
                  <input
                    type="checkbox"
                    checked={row.selected}
                    disabled={row.duplicate}
                    onChange={() => toggleRow(index)}
                  />
                  <span className="ai-review-main">
                    <strong>{row.description}</strong>
                    <small>
                      {row.date} · {row.category}
                      {row.duplicate
                        ? ' · Déjà présente'
                        : row.confidence < 0.65
                          ? ' · À vérifier'
                          : ''}
                    </small>
                  </span>
                  <b className={row.direction === 'income' ? 'income' : 'expense'}>
                    {amountLabel(row.amount, row.direction, currency)}
                  </b>
                </label>
              ))}
            </div>
          ) : (
            <p className="empty">Aucune opération à importer.</p>
          )}
          <div className="ai-results-actions">
            <span>
              {selectedCount} sélectionnée{selectedCount > 1 ? 's' : ''} · Les opérations existantes
              sont ignorées
            </span>
            <button
              className="button primary"
              disabled={saving || selectedCount === 0}
              onClick={() => void importSelected()}
            >
              {saving
                ? 'Ajout en cours…'
                : `Ajouter ${selectedCount || ''} opération${selectedCount > 1 ? 's' : ''}`}
            </button>
          </div>
        </Card>
      )}
    </>
  );
}
