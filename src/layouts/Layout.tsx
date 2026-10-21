import { NavLink, useLocation } from 'react-router-dom';
import { useEffect, useState, type ReactNode } from 'react';
import { APP_NAME } from '../types';
import { useFinance } from '../hooks/useFinance';
import { useAuth } from '../contexts/AuthContext';
import { GlassLayers, Icon } from '../components/ui';
import { NivoLogo } from '../components/BrandLogo';
const primaryNav = [
  ['/', 'Accueil', 'LayoutDashboard'],
  ['/transactions', 'Transactions', 'ArrowLeftRight'],
  ['/comptes', 'Comptes', 'Wallet'],
  ['/budget', 'Budget', 'ChartNoAxesCombined'],
  ['/statistiques', 'Statistiques', 'ChartPie'],
];
const secondaryNav = [
  ['/abonnements', 'Abonnements', 'Repeat'],
  ['/epargne', 'Épargne', 'PiggyBank'],
  ['/calendrier', 'Calendrier', 'CalendarDays'],
  ['/assistant', 'Assistant', 'Sparkles'],
  ['/reglages', 'Réglages', 'Settings2'],
];
const allNav = [...primaryNav, ...secondaryNav];
export function Layout({ children, onAdd }: { children: ReactNode; onAdd: () => void }) {
  const { data, toast, syncState } = useFinance();
  const { user } = useAuth();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  useEffect(() => setMoreOpen(false), [location.pathname]);
  useEffect(() => {
    if (!moreOpen) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMoreOpen(false);
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [moreOpen]);
  const moreActive = secondaryNav.some(([path]) => path === location.pathname);
  const syncLabel = {
    connecting: 'Synchronisation…',
    synced: 'Données à jour',
    offline: 'Hors connexion',
    error: 'Synchronisation interrompue',
  }[syncState];
  return (
    <div className="app-layout">
      <aside className="sidebar glass-surface">
        <GlassLayers />
        <NavLink className="brand" to="/" aria-label="Accueil Nivo">
          <NivoLogo markSize={43} />
        </NavLink>
        <span className="nav-label">VOTRE ESPACE</span>
        <nav>
          {primaryNav.map(([path, label, icon]) => (
            <NavLink key={path} to={path} end>
              <Icon name={icon} />
              {label}
            </NavLink>
          ))}
          <details className="sidebar-more" open={moreActive}>
            <summary>
              <Icon name="Ellipsis" />
              Plus
              <Icon name="ChevronDown" size={15} />
            </summary>
            <div className="sidebar-more-links">
              {secondaryNav.map(([path, label, icon]) => (
                <NavLink key={path} to={path} end>
                  <Icon name={icon} />
                  {label}
                </NavLink>
              ))}
            </div>
          </details>
        </nav>
        <div className="sidebar-bottom">
          <div className="profile">
            <span>{(data.settings[0]?.name ?? user?.email ?? 'N').slice(0, 1).toUpperCase()}</span>
            <div>
              <strong>{data.settings[0]?.name ?? 'Mon profil'}</strong>
              <small>Compte personnel</small>
            </div>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar glass-surface">
          <GlassLayers />
          <span className="breadcrumb">
            Mon espace <Icon name="ChevronRight" size={14} />
            <b>{allNav.find((n) => n[0] === location.pathname)?.[1] ?? 'Accueil'}</b>
          </span>
          <span className="mobile-brand">
            <NivoLogo markSize={31} />
          </span>
          <div className="mobile-header-actions">
            <button
              type="button"
              className={moreOpen ? 'active' : ''}
              aria-label="Ouvrir le menu"
              aria-expanded={moreOpen}
              aria-controls="mobile-more-menu"
              onClick={() => setMoreOpen((open) => !open)}
            >
              <Icon name="Menu" size={18} />
            </button>
          </div>
          <div className="topbar-right">
            <span className={`sync-state ${syncState}`} role="status" aria-live="polite">
              <i />
              {syncLabel}
            </span>
          </div>
        </header>
        <main>{children}</main>
        <footer className="desktop-footer">
          {APP_NAME} Finance <span>Un regard serein sur votre argent.</span>
        </footer>
      </div>
      {moreOpen && (
        <>
          <button
            className="mobile-more-backdrop"
            aria-label="Fermer le menu"
            onClick={() => setMoreOpen(false)}
          />
          <nav
            className="mobile-more-menu glass-surface"
            id="mobile-more-menu"
            aria-label="Plus de pages"
          >
            <GlassLayers />
            <div className="mobile-more-heading">
              <span>
                <small>VOTRE ESPACE</small>
                <strong>Toutes les pages</strong>
              </span>
              <button
                className="icon-button"
                aria-label="Fermer"
                onClick={() => setMoreOpen(false)}
              >
                <Icon name="X" size={19} />
              </button>
            </div>
            <div className="mobile-more-grid">
              {secondaryNav.map(([path, label, icon]) => (
                <NavLink key={path} to={path}>
                  <Icon name={icon} />
                  <span>{label}</span>
                  <Icon name="ChevronRight" size={15} />
                </NavLink>
              ))}
            </div>
          </nav>
        </>
      )}
      <nav className="mobile-nav glass-surface" aria-label="Navigation principale">
        <GlassLayers />
        <NavLink to="/" end>
          <Icon name="House" />
          <span>Accueil</span>
        </NavLink>
        <NavLink to="/transactions">
          <Icon name="ArrowLeftRight" />
          <span>Opérations</span>
        </NavLink>
        <button className="add-mobile" onClick={onAdd} aria-label="Ajout rapide">
          <Icon name="Plus" size={26} />
        </button>
        <NavLink to="/statistiques">
          <Icon name="ChartNoAxesCombined" />
          <span>Stats</span>
        </NavLink>
        <button
          className={moreActive || moreOpen ? 'active' : ''}
          onClick={() => setMoreOpen((open) => !open)}
          aria-expanded={moreOpen}
          aria-controls="mobile-more-menu"
        >
          <Icon name="Menu" />
          <span>Plus</span>
        </button>
      </nav>
      {toast && (
        <div className="toast" role="status">
          <Icon name="CircleCheck" />
          {toast}
        </div>
      )}
    </div>
  );
}
