import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { ProtectedRoute, PublicOnlyRoute } from './components/ProtectedRoute';
import { GlassFilter } from './components/ui';

const Login = lazy(() => import('./pages/Login').then((module) => ({ default: module.Login })));
const PrivateApp = lazy(() => import('./PrivateApp'));

export default function App() {
  return (
    <>
      <GlassFilter />
      <Suspense
        fallback={
          <div className="loading-page">
            <div className="skeleton" />
            <p>Chargement sécurisé…</p>
          </div>
        }
      >
        <Routes>
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <Login />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <PrivateApp />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Suspense>
    </>
  );
}
