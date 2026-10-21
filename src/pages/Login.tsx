import { useState, type FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Icon } from '../components/ui';
import { NivoLogo, NivoMark } from '../components/BrandLogo';

function friendlyError(cause: unknown) {
  const code =
    typeof cause === 'object' && cause && 'code' in cause ? String(cause.code) : 'auth/unknown';
  if (code === 'auth/invalid-email') return 'Cette adresse e-mail semble incorrecte.';
  if (code === 'auth/email-already-in-use') return 'Un compte existe déjà avec cette adresse.';
  if (code === 'auth/weak-password') return 'Choisissez un mot de passe plus robuste.';
  if (code === 'auth/operation-not-allowed') {
    return 'La création de compte e-mail doit être activée dans Firebase.';
  }
  if (code === 'auth/too-many-requests') return 'Trop de tentatives. Réessayez un peu plus tard.';
  if (code === 'auth/network-request-failed') return 'Connexion impossible. Vérifiez votre réseau.';
  return 'Adresse ou mot de passe incorrect.';
}

export function Login() {
  const { login, createAccount, resetPassword } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState<'error' | 'success'>('error');

  function switchMode(nextMode: 'login' | 'signup') {
    setMode(nextMode);
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setMessage('');
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    setMessageTone('error');
    try {
      if (mode === 'signup') {
        if (
          password.length < 10 ||
          !/[a-z]/.test(password) ||
          !/[A-Z]/.test(password) ||
          !/[0-9]/.test(password)
        ) {
          setMessage(
            'Choisissez un mot de passe d’au moins 10 caractères, avec une majuscule, une minuscule et un chiffre.',
          );
          return;
        }
        if (password !== confirmPassword) {
          setMessage('Les deux mots de passe ne correspondent pas.');
          return;
        }
        await createAccount(email, password);
        setMode('login');
        setPassword('');
        setConfirmPassword('');
        setMessageTone('success');
        setMessage('Compte créé. Vérifiez votre adresse e-mail avant de vous connecter.');
      } else {
        await login(email, password);
      }
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
        <div className="auth-orbit">
          <NivoMark size={124} />
        </div>
      </div>
      <main className="auth-form">
        <div>
          <p className="eyebrow">ESPACE PRIVÉ</p>
          <h1>{mode === 'login' ? 'Bon retour sur Nivo.' : 'Créez votre espace privé.'}</h1>
          <p className="muted spaced">
            {mode === 'login'
              ? 'Connectez-vous pour retrouver vos finances.'
              : 'Un compte personnel pour garder vos finances sous contrôle.'}
          </p>
          <form onSubmit={submit}>
            <label className="field">
              <span>Adresse e-mail</span>
              <input
                type="email"
                inputMode="email"
                autoComplete={mode === 'login' ? 'username' : 'email'}
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label className="field">
              <span>Mot de passe</span>
              <span className="password-field">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
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
            {mode === 'signup' && (
              <>
                <p className="password-hint">
                  10 caractères minimum, avec une majuscule, une minuscule et un chiffre.
                </p>
                <label className="field">
                  <span>Confirmer le mot de passe</span>
                  <span className="password-field">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                    />
                  </span>
                </label>
              </>
            )}
            {mode === 'login' && (
              <button
                type="button"
                className="forgot-password"
                disabled={busy}
                onClick={requestReset}
              >
                Mot de passe oublié ?
              </button>
            )}
            {message && (
              <p
                role="status"
                className={`form-hint ${messageTone === 'success' ? 'success-text' : 'error-text'}`}
              >
                {message}
              </p>
            )}
            <button className="button primary login-button" disabled={busy}>
              {busy
                ? mode === 'login'
                  ? 'Connexion…'
                  : 'Création…'
                : mode === 'login'
                  ? 'Se connecter'
                  : 'Créer mon compte'}
              {!busy && <Icon name="ArrowRight" size={17} />}
            </button>
          </form>
          <p className="auth-switch">
            {mode === 'login' ? 'Vous n’avez pas encore de compte ?' : 'Vous avez déjà un compte ?'}{' '}
            <button
              type="button"
              className="text-button"
              onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
              disabled={busy}
            >
              {mode === 'login' ? 'Créer un compte' : 'Se connecter'}
            </button>
          </p>
          <p className="auth-security">
            <Icon name="LockKeyhole" size={14} /> Connexion protégée par Firebase Authentication.
          </p>
        </div>
      </main>
    </div>
  );
}
