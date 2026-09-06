import { useState, type FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { APP_NAME } from '../types';
import { GlassLayers, Icon } from '../components/ui';
import { NivoLogo, NivoMark } from '../components/BrandLogo';

function friendlyError(cause: unknown) {
  const code =
    typeof cause === 'object' && cause && 'code' in cause ? String(cause.code) : 'auth/unknown';
  if (code === 'auth/invalid-email') return 'Cette adresse e-mail semble incorrecte.';
  if (code === 'auth/too-many-requests') return 'Trop de tentatives. Réessayez un peu plus tard.';
  if (code === 'auth/network-request-failed') return 'Connexion impossible. Vérifiez votre réseau.';
  return 'Adresse ou mot de passe incorrect.';
}

export function Login() {
  const { login, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      await login(email, password);
    } catch (cause) {
      setMessage(friendlyError(cause));
    } finally {
      setBusy(false);
    }
  }

  async function requestReset() {
    if (!email.trim()) {
      setMessage('Saisissez d’abord votre adresse e-mail.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      await resetPassword(email);
      setMessage('Si cette adresse est reconnue, un lien de réinitialisation vient d’être envoyé.');
    } catch (cause) {
      setMessage(friendlyError(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-story">
        <div className="brand">
          <NivoLogo markSize={48} />
        </div>
        <h1>
          Votre argent.
          <br />
          Votre horizon.
        </h1>
        <p>
          Un espace personnel.
          <br />
          Rien qu’à vous.
        </p>
        <div className="auth-orbit">
          <NivoMark size={124} />
        </div>
      </div>
      <main className="auth-form glass-surface">
        <GlassLayers />
        <div>
          <p className="eyebrow">ESPACE PRIVÉ · {APP_NAME.toUpperCase()}</p>
          <h1>Heureux de vous retrouver.</h1>
          <p className="muted spaced">Connectez-vous pour retrouver vos finances.</p>
          <form onSubmit={submit}>
            <label className="field">
              <span>Adresse e-mail</span>
              <input
                type="email"
                inputMode="email"
                autoComplete="username"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label className="field">
              <span>Mot de passe</span>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <button
              type="button"
              className="forgot-password"
              disabled={busy}
              onClick={requestReset}
            >
              Mot de passe oublié ?
            </button>
            {message && (
              <p role="status" className="form-hint">
                {message}
              </p>
            )}
            <button className="button primary login-button" disabled={busy}>
              {busy ? 'Connexion…' : 'Se connecter'}
              {!busy && <Icon name="ArrowRight" size={17} />}
            </button>
          </form>
          <p className="auth-security">
            <Icon name="LockKeyhole" size={14} /> Accès réservé aux comptes créés dans Firebase.
          </p>
        </div>
      </main>
    </div>
  );
}
