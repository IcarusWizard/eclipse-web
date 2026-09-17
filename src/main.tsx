import React, { Component, ErrorInfo, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-screen h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-100 p-6 text-center">
          <div className="bg-slate-900 border border-rose-600/50 p-6 rounded-2xl max-w-md shadow-2xl">
            <h2 className="text-xl font-bold text-rose-400 font-display mb-2">
              TACTICAL SYSTEM ALERT
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              An unexpected interface anomaly occurred:
            </p>
            <pre className="text-[11px] bg-slate-950 p-3 rounded text-rose-300 overflow-x-auto text-left mb-4 font-mono">
              {this.state.error?.message || 'Unknown Error'}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg uppercase tracking-wider"
            >
              Reboot Command Console
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
}
