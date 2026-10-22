// Daily reminders (desktop): a system notification at the chosen times, but
// only while today's breathing is below the daily goal. Entirely local: the
// app checks the clock while it runs (also when it's only in the tray), so
// nothing is scheduled with the system and nothing reminds you while the app
// isn't running. Saved per device (device.json "reminders"), so synced
// computers don't all remind you at once.
import { useEffect, useRef } from 'react';
import { isTauri } from './storage/backends';
import { dayKey } from './stats';

export const DEFAULT_REMINDERS = { enabled: false, times: ['09:00', '18:00'] };

const CHECK_EVERY_MS = 30 * 1000;
// A reminder missed by more than this (the computer was asleep, the app
// started later) is skipped rather than shown late
const LATE_LIMIT_MINUTES = 15;

export const isValidTime = (time) => /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
const minutesOf = (time) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));

// "9:5" or "9:05" -> "09:05"; null if it isn't a time
export const normalizeTime = (text) => {
  const match = /^\s*(\d{1,2})[:.](\d{2})\s*$/.exec(text ?? '');
  if (!match) return null;
  const time = `${match[1].padStart(2, '0')}:${match[2]}`;
  return isValidTime(time) ? time : null;
};

export const reminderSettings = (device) => ({
  ...DEFAULT_REMINDERS,
  ...device?.reminders,
  times: (device?.reminders?.times ?? DEFAULT_REMINDERS.times).filter(isValidTime)
});

// Asks for permission where the system needs it (macOS); true if allowed
export const ensureNotificationPermission = async () => {
  const { isPermissionGranted, requestPermission } = await import('@tauri-apps/plugin-notification');
  if (await isPermissionGranted()) return true;
  return (await requestPermission()) === 'granted';
};

export const showNotification = async (title, body) => {
  if (!(await ensureNotificationPermission())) return false;
  const { sendNotification } = await import('@tauri-apps/plugin-notification');
  sendNotification({ title, body });
  return true;
};

// Seconds breathed today (sessions count on the day they started)
export const secondsToday = (sessions, now) => {
  const today = dayKey(now);
  return sessions
    .filter((session) => dayKey(new Date(session.startedAt)) === today)
    .reduce((sum, session) => sum + session.seconds, 0);
};

// The reminder times due now: reached in the last LATE_LIMIT_MINUTES, and not
// handled yet. handled holds "2027-01-25 09:00" keys.
export const dueReminders = (times, now, handled) => {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return times.filter((time) => {
    const late = nowMinutes - minutesOf(time);
    return late >= 0 && late <= LATE_LIMIT_MINUTES && !handled.has(reminderKey(now, time));
  });
};

// The times already past today: a time added (or reminders turned on) after
// it has passed waits until tomorrow, instead of firing right away
export const passedToday = (times, now) => {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return times.filter((time) => minutesOf(time) <= nowMinutes);
};

export const reminderKey = (now, time) => `${dayKey(now)} ${time}`;

// reminders: { enabled, times }; goalMinutes: the daily goal
// busy: a session is running or paused (no reminder then)
// getSessions: reads the recorded sessions
// texts(doneMinutes, goalMinutes) -> { title, body }
export const useReminders = ({ reminders, goalMinutes, busy, getSessions, texts }) => {
  const latest = useRef({});
  latest.current = { reminders, goalMinutes, busy, getSessions, texts };
  // "2027-01-25 09:00" for every reminder already handled
  const handledRef = useRef(new Set());
  const timesKey = reminders.enabled ? reminders.times.join(',') : '';

  // Times already past when they're added wait until tomorrow. Only for
  // changes: when the app starts, a reminder from the last few minutes still shows.
  const firstRunRef = useRef(true);
  useEffect(() => {
    if (firstRunRef.current) {
      firstRunRef.current = false;
      return;
    }
    const now = new Date();
    for (const time of passedToday(reminders.times, now)) handledRef.current.add(reminderKey(now, time));
  }, [timesKey]);

  useEffect(() => {
    if (!isTauri() || !timesKey) return;
    const check = async () => {
      const { reminders: current, goalMinutes: goal, busy: inSession, getSessions: read, texts: makeTexts } = latest.current;
      const now = new Date();
      const due = dueReminders(current.times, now, handledRef.current);
      if (due.length === 0) return;
      due.forEach((time) => handledRef.current.add(reminderKey(now, time)));
      if (inSession) return; // already breathing
      const doneSeconds = secondsToday(await read(), now);
      if (doneSeconds >= goal * 60) return; // today's goal is met
      const { title, body } = makeTexts(Math.floor(doneSeconds / 60), goal);
      await showNotification(title, body);
    };
    check().catch((e) => console.warn('Reminder check failed:', e));
    const timer = setInterval(() => check().catch((e) => console.warn('Reminder check failed:', e)), CHECK_EVERY_MS);
    return () => clearInterval(timer);
  }, [timesKey]);
};
