import { Component, type ErrorInfo, type ReactNode } from 'react';
import { reportClientError } from '../utils/errorReporting';

type Props = { children: ReactNode };
type State = { hasError: boolean };

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportClientError({
      source: 'react-error-boundary',
      message: error.message,
      stack: `${error.stack ?? ''}\n${info.componentStack}`,
    });
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <main className="loading-page" role="alert">
        <h1>Un problème est survenu.</h1>
        <p>Vos données restent enregistrées. Rechargez Nivo pour reprendre.</p>
        <button className="button primary" onClick={() => window.location.reload()}>
          Recharger l’application
        </button>
      </main>
    );
  }
}
