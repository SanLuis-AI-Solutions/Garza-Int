import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App';
import './theme.css';

const sentryDsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
const sentryTracesSampleRateRaw = import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE as string | undefined;
const sentryTracesSampleRate = sentryTracesSampleRateRaw ? Number(sentryTracesSampleRateRaw) : 0;

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: (import.meta.env.VITE_APP_ENV as string | undefined) ?? (import.meta.env.PROD ? 'production' : 'preview'),
    tracesSampleRate: Number.isFinite(sentryTracesSampleRate) ? sentryTracesSampleRate : 0,
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    {sentryDsn ? (
      <Sentry.ErrorBoundary
        fallback={
          <div className="min-h-screen flex items-center justify-center px-6">
            <div className="gi-card p-8 max-w-xl w-full">
              <h1 className="text-xl font-bold gi-serif">Something went wrong</h1>
              <p className="mt-2 text-sm gi-muted">
                The app crashed unexpectedly. Please refresh. If it keeps happening, use Export Report and send it to support.
              </p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-6 gi-btn gi-btn-primary px-4 py-2.5 text-sm font-semibold"
              >
                Refresh
              </button>
            </div>
          </div>
        }
      >
        <App />
      </Sentry.ErrorBoundary>
    ) : (
      <App />
    )}
  </React.StrictMode>
);
