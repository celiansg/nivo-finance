import { lazy, Suspense, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Editor, QuickAdd, type EditorRequest } from './components/Editor';
import { useAgentTools } from './hooks/useAgentTools';
import { FinanceProvider, useFinance } from './hooks/useFinance';
import { Layout } from './layouts/Layout';

const Dashboard = lazy(() =>
  import('./pages/Dashboard').then((module) => ({ default: module.Dashboard })),
);
const Transactions = lazy(() =>
  import('./pages/Transactions').then((module) => ({ default: module.Transactions })),
);
const Accounts = lazy(() =>
  import('./pages/Accounts').then((module) => ({ default: module.Accounts })),
);
const Subscriptions = lazy(() =>
  import('./pages/Subscriptions').then((module) => ({ default: module.Subscriptions })),
);
const Budget = lazy(() => import('./pages/Budget').then((module) => ({ default: module.Budget })));
const Savings = lazy(() =>
  import('./pages/Savings').then((module) => ({ default: module.Savings })),
);
const Analytics = lazy(() =>
  import('./pages/Analytics').then((module) => ({ default: module.Analytics })),
);
const Calendar = lazy(() =>
  import('./pages/Calendar').then((module) => ({ default: module.Calendar })),
);
const Settings = lazy(() =>
  import('./pages/Settings').then((module) => ({ default: module.Settings })),
);

function RouteLoading() {
  return <div className="route-loading" aria-label="Chargement de la page" />;
}

function PrivateApplication() {
  const { loading, error, reload, data } = useFinance();
  const [quick, setQuick] = useState(false);
  const [editor, setEditor] = useState<EditorRequest | null>(null);
  const location = useLocation();
  const edit = (request: EditorRequest) => {
    setQuick(false);
    setEditor(request);
  };
  useAgentTools(edit);

  if (loading && !data.settings.length)
    return (
      <div className="loading-page">
        <div className="skeleton" />
        <p>Votre espace se prépare…</p>
      </div>
    );

  return (
    <Layout onAdd={() => setQuick(true)}>
      {error && (
        <div className="error" role="alert">
          {error}
          <button className="button" onClick={() => void reload()}>
            Réessayer
          </button>
        </div>
      )}
      <div key={location.pathname} className="page-transition">
        <Suspense fallback={<RouteLoading />}>
          <Routes>
            <Route path="/" element={<Dashboard onAdd={() => setQuick(true)} />} />
            <Route path="/transactions" element={<Transactions edit={edit} />} />
            <Route path="/comptes" element={<Accounts edit={edit} />} />
            <Route path="/budget" element={<Budget edit={edit} />} />
            <Route path="/abonnements" element={<Subscriptions edit={edit} />} />
            <Route path="/epargne" element={<Savings edit={edit} />} />
            <Route path="/statistiques" element={<Analytics />} />
            <Route path="/calendrier" element={<Calendar edit={edit} />} />
            <Route path="/reglages" element={<Settings edit={edit} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </div>
      {quick && <QuickAdd onClose={() => setQuick(false)} onSelect={edit} />}
      {editor && <Editor request={editor} onClose={() => setEditor(null)} />}
    </Layout>
  );
}

export default function PrivateApp() {
  return (
    <FinanceProvider>
      <PrivateApplication />
    </FinanceProvider>
  );
}
