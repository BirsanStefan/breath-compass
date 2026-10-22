// Today's progress towards the daily goal, kept current while the app runs:
// for the tray icon (its drops fill up) and the tray menu's status line.
import { useEffect, useRef, useState } from 'react';
import { dayKey } from './stats';
import { secondsToday } from './reminders';
import { MIN_SESSION_SECONDS } from './storage/appData';

const REFRESH_EVERY_MS = 60 * 1000;

// Whole minutes towards the goal, and the share of it done (0–1). Like the
// statistics, a minute counts once it's complete.
export const goalProgress = (seconds, goalMinutes) => {
  const minutes = Math.floor(seconds / 60);
  return { minutes, goal: goalMinutes, fraction: Math.min(1, minutes / goalMinutes), met: minutes >= goalMinutes };
};

// How full each of the logo's four drops is (0–1), for a share of the goal:
// a quarter each, in turn
export const dropFills = (fraction) =>
  [0, 1, 2, 3].map((i) => Math.min(1, Math.max(0, fraction * 4 - i)));

// Seconds breathed today: the recorded sessions (all devices), plus the
// session running now (liveSeconds). A session that just ended counts right
// away, before its record is saved and read back; with the session history
// off it's never saved, and counts until the app closes.
// Call sessionEnded(summary, saved) from the session's end, with saved the
// promise of recording it (true once it's in the history).
export const useTodaySeconds = ({ getSessions, liveSeconds, enabled }) => {
  const [stored, setStored] = useState(0);
  // Ended sessions not read back from the history yet: [{ day, seconds }]
  const [pending, setPending] = useState([]);
  const [refresh, setRefresh] = useState(0);
  const getSessionsRef = useRef(getSessions);
  getSessionsRef.current = getSessions;

  // Read the history now, every minute (also catches midnight and sessions
  // synced from other devices) and when the window comes back
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const read = () =>
      getSessionsRef.current()
        .then((sessions) => !cancelled && setStored(secondsToday(sessions, new Date())))
        .catch((e) => console.warn('Could not read today’s sessions:', e));
    read();
    const timer = setInterval(read, REFRESH_EVERY_MS);
    window.addEventListener('focus', read);
    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener('focus', read);
    };
  }, [enabled, refresh]);

  const sessionEnded = (summary, saved) => {
    if (summary.seconds < MIN_SESSION_SECONDS) return; // not recorded, doesn't count (as in Statistics)
    const entry = { day: dayKey(new Date(summary.startedAt)), seconds: summary.seconds };
    setPending((list) => [...list, entry]);
    saved.then((wasSaved) => {
      if (!wasSaved) return; // stays pending: it's only in memory
      // Read back from the history, then stop counting it twice
      getSessionsRef.current().then((sessions) => {
        setStored(secondsToday(sessions, new Date()));
        setPending((list) => list.filter((item) => item !== entry));
      }).catch(() => setRefresh((n) => n + 1));
    });
  };

  const today = dayKey(new Date());
  const pendingToday = pending.filter((item) => item.day === today).reduce((sum, item) => sum + item.seconds, 0);
  return { seconds: stored + pendingToday + liveSeconds, sessionEnded };
};
