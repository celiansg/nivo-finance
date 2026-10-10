import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <HashRouter>
    <AuthProvider>
      <App />
    </AuthProvider>
  </HashRouter>,
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    const baseUrl = import.meta.env.BASE_URL;
    const serviceWorkerUrl = new URL(`${baseUrl}sw.js`, window.location.href);
    const scope = new URL(baseUrl, window.location.href).pathname;

    navigator.serviceWorker.register(serviceWorkerUrl, { scope }).catch(() => {
      // A service worker is an enhancement. The app remains fully usable when it cannot register.
    });
  });
}
