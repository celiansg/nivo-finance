import { useState, type FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Icon } from '../components/ui';
import { NivoLogo } from '../components/BrandLogo';

function friendlyError(cause: unknown) {
  const code =
    typeof cause === 'object' && cause && 'code' in cause ? String(cause.code) : 'auth/unknown';
  if (code === 'auth/invalid-email') return 'Cette adresse e-mail semble incorrecte.';
  if (code === 'auth/operation-not-allowed') {
    return 'La connexion e-mail/mot de passe doit être activée dans Firebase Authentication.';
  }
  if (code === 'auth/too-many-requests') return 'Trop de tentatives. Réessayez un peu plus tard.';
  if (code === 'auth/network-request-failed') return 'Connexion impossible. Vérifiez votre réseau.';
  return 'Adresse ou mot de passe incorrect.';
}

export function Login() {
  const { login, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState<'error' | 'success'>('error');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    setMessageTone('error');
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
    setMessageTone('error');
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
      </div>
      <main className="auth-form">
        <div>
          <p className="eyebrow">ESPACE PRIVÉ</p>
          <h1>Bon retour sur Nivo.</h1>
          <p className="muted spaced">
            Connectez-vous pour retrouver vos finances.
          </p>
          <form onSubmit={submit}>
            <label className="field">
              <span>Adresse e-mail</span>
              <span className="input-with-icon">
                <Icon name="Mail" size={19} />
                <input
                  type="email"
                  name="email"
                  inputMode="email"
                  autoComplete="username"
                  placeholder="vous@exemple.fr"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </span>
            </label>
            <label className="field">
              <span>Mot de passe</span>
              <span className="password-field input-with-icon">
                <Icon name="LockKeyhole" size={19} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="current-password"
                  placeholder="Votre mot de passe"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <button
                  type="button"
                  className="password-toggle"
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((visible) => !visible)}
                  disabled={busy}
                >
                  <Icon name={showPassword ? 'EyeOff' : 'Eye'} size={18} />
                </button>
              </span>
            </label>
            <button type="button" className="forgot-password" disabled={busy} onClick={requestReset}>
              Mot de passe oublié ?
            </button>
            {message && (
              <p
                role={messageTone === 'success' ? 'status' : 'alert'}
                aria-live="polite"
                className={`form-hint ${messageTone === 'success' ? 'success-text' : 'error-text'}`}
              >
                {message}
              </p>
            )}
            <button className="button primary login-button" disabled={busy}>
              {busy ? 'Connexion…' : 'Se connecter'}
              {!busy && <Icon name="ArrowRight" size={17} />}
            </button>
          </form>
          <p className="auth-switch private-access-note">
            Accès privé · votre utilisateur est créé depuis Firebase Authentication.
          </p>
          <p className="auth-security">
            <Icon name="LockKeyhole" size={14} /> Connexion protégée par Firebase Authentication.
          </p>
        </div>
      </main>
    </div>
  );
}
