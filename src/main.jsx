import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AppDataProvider } from './AppData';
import { applyTheme, systemTheme } from './theme';
import { ErrorBoundary } from './ErrorBoundary';

// Until the saved preference has loaded, follow the OS (avoids a flash of the wrong theme)
applyTheme(systemTheme());

createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <AppDataProvider>
      <App />
    </AppDataProvider>
  </ErrorBoundary>
);
