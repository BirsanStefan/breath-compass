// ==================== UPDATE CHECK ====================
// Desktop app only (the web version is always the latest). When the app
// starts, and once a day while it runs, it asks GitHub for the latest
// published release; if that's newer than this version, Settings → About says
// so, with a link to the release page. Nothing is downloaded or installed, and
// nothing about the user is sent: it's one plain request to GitHub's public
// API. It can be turned off (device setting checkUpdates, on by default).
//
// The time of the last check and what it found are kept in localStorage, so
// restarting the app doesn't check again before a day has passed.
import { useEffect, useState } from 'react';
import { REPO } from './project';
import { isTauri } from './storage/backends';
import { version as currentVersion } from '../package.json';

const LATEST_RELEASE_API = `https://api.github.com/repos/${REPO}/releases/latest`;
const CHECK_EVERY = 24 * 60 * 60 * 1000;
const STORAGE_KEY = 'breath-compass-update-check';

// "v1.2.0" → [1, 2, 0]; null for anything else (a pre-release such as
// "1.2.0-beta" is never offered)
export const parseVersion = (text) => {
  const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(String(text ?? '').trim());
  return match ? match.slice(1).map(Number) : null;
};

export const isNewer = (candidate, current) => {
  const a = parseVersion(candidate);
  const b = parseVersion(current);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] > b[i];
  }
  return false;
};

// The latest published release ({ version, url }), or null when there is none
// yet. Drafts and pre-releases are never "latest" on GitHub.
export const fetchLatestRelease = async (fetchImpl = fetch) => {
  const response = await fetchImpl(LATEST_RELEASE_API, {
    headers: { Accept: 'application/vnd.github+json' },
    cache: 'no-store'
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`GitHub answered ${response.status}`);
  const release = await response.json();
  return { version: String(release.tag_name ?? '').replace(/^v/, ''), url: release.html_url };
};

// What a check found, as Settings shows it
export const updateStatus = (latest) =>
  latest && isNewer(latest.version, currentVersion) ? 'available' : 'current';

const readSaved = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? null;
  } catch {
    return null;
  }
};

const save = (record) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Not kept: the next start just checks again
  }
};

// ---------- Shared state ----------
// One check for the whole app: App runs the daily timer, Settings shows the
// result and has "Check now"
// state: { status: 'idle' | 'checking' | 'current' | 'available' | 'error', latest, checkedAt, error }
const fromSaved = (saved) =>
  saved?.checkedAt ? { status: updateStatus(saved.latest), latest: saved.latest ?? null, checkedAt: saved.checkedAt, error: null } : null;

let state = fromSaved(readSaved()) ?? { status: 'idle', latest: null, checkedAt: null, error: null };
const listeners = new Set();
const setState = (next) => {
  state = next;
  listeners.forEach((listener) => listener(state));
};

export const checkForUpdate = async () => {
  if (state.status === 'checking') return;
  setState({ ...state, status: 'checking', error: null });
  try {
    const latest = await fetchLatestRelease();
    const checkedAt = Date.now();
    save({ checkedAt, latest });
    setState({ status: updateStatus(latest), latest, checkedAt, error: null });
  } catch (error) {
    console.warn('Update check failed:', error);
    setState({ ...state, status: 'error', error: String(error?.message ?? error) });
  }
};

export const useUpdateState = () => {
  const [current, setCurrent] = useState(state);
  useEffect(() => {
    listeners.add(setCurrent);
    setCurrent(state);
    return () => listeners.delete(setCurrent);
  }, []);
  return current;
};

// App: checks at start and then once a day while enabled. Looks every hour
// whether a day has passed (rather than one 24-hour timer), so a computer
// that slept through the night still checks soon after waking.
export const useDailyUpdateCheck = (enabled) => {
  useEffect(() => {
    if (!isTauri() || !enabled) return;
    // A failed check (offline) leaves checkedAt as it was, so it's retried
    // on the next hourly look
    const checkIfDue = () => {
      if (state.checkedAt && Date.now() - state.checkedAt < CHECK_EVERY) return;
      checkForUpdate();
    };
    checkIfDue();
    const timer = setInterval(checkIfDue, 60 * 60 * 1000);
    return () => clearInterval(timer);
  }, [enabled]);
};

export { currentVersion };
