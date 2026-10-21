import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { reportClientError } from './utils/errorReporting';
import App from './App';
import './styles.css';

window.addEventListener('error', (event) => {
  reportClientError({ source: 'window-error', message: event.message, stack: event.error?.stack });
});
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
  reportClientError({ source: 'unhandled-rejection', message: reason.message, stack: reason.stack });
});

createRoot(document.getElementById('root')!).render(
  <AppErrorBoundary>
    <HashRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </HashRouter>
  </AppErrorBoundary>,
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    const baseUrl = import.meta.env.BASE_URL;
    const serviceWorkerUrl = new URL(`${baseUrl}sw.js`, window.location.href);
    const scope = new URL(baseUrl, window.location.href).pathname;

    navigator.serviceWorker
      .register(serviceWorkerUrl, { scope, updateViaCache: 'none' })
      .then((registration) => registration.update())
      .catch(() => {
        // A service worker is an enhancement. The app remains fully usable when it cannot register.
      });
  });
}
