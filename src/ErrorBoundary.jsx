import React from 'react';
import { locales } from './i18n';
import { audio } from './audio';
import { openExternal } from './desktop';
import { REPO_URL } from './project';
import './ErrorBoundary.css';

// ==================== CRASH SCREEN ====================
// If drawing the app fails, this replaces the blank page with a short message
// and a Reload button. It sits outside the data and language providers (they
// could be what failed), so it reads its texts straight from the language
// files, in the language the app was showing (<html lang>, set by the app).
// Only errors while drawing are caught; a failing click or save is not a crash
// and doesn't come here.

const ISSUES_URL = `${REPO_URL}/issues`;

const text = (key) => {
  const locale = document.documentElement.lang;
  return locales[locale]?.crash?.[key] ?? locales.en.crash[key];
};

export class ErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('The app crashed:', error, info?.componentStack);
    // A session may have been running: don't leave ticks or music playing
    // behind the crash screen
    try {
      audio.stop();
      audio.stopMusic();
    } catch {
      // the audio may be what failed
    }
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const details = `${error.name ?? 'Error'}: ${error.message ?? String(error)}\n${error.stack ?? ''}`.trim();
    return (
      <div className="crash" role="alert">
        <h1>{text('title')}</h1>
        <p>{text('text')}</p>
        <button type="button" className="crash-reload" onClick={() => window.location.reload()} autoFocus>
          {text('reload')}
        </button>
        <details>
          <summary>{text('details')}</summary>
          <pre>{details}</pre>
          <p>
            <a href={ISSUES_URL} target="_blank" rel="noopener noreferrer" onClick={openExternal}>
              {text('report')}
            </a>
          </p>
        </details>
      </div>
    );
  }
}
