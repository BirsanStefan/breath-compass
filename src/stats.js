// Statistics over recorded sessions (pure functions, no React or storage).
// Weeks start on Monday; all dates are in local time.

export const startOfWeek = (now) => {
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const daysSinceMonday = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - daysSinceMonday);
  return date;
};

export const startOfMonth = (now) => new Date(now.getFullYear(), now.getMonth(), 1);

const summarize = (sessions) => ({
  sessions: sessions.length,
  minutes: Math.round(sessions.reduce((sum, session) => sum + session.seconds, 0) / 60)
});

// ---------- Days ----------
// A day counts towards the goal (and the streaks) when its sessions add up
// to at least the daily goal. A session belongs to the day it started on.
export const DEFAULT_DAILY_GOAL = 5; // minutes
export const DAILY_GOALS = [1, 3, 5, 10, 15, 20, 30, 45, 60];

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const addDays = (date, days) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
export const dayKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

// Map "2027-01-25" -> seconds breathed that day
const secondsPerDay = (sessions) => {
  const days = new Map();
  for (const session of sessions) {
    const key = dayKey(new Date(session.startedAt));
    days.set(key, (days.get(key) ?? 0) + session.seconds);
  }
  return days;
};

// last30: one entry per day, oldest first, today last
// streak: { current, longest } in days that met the goal. The current streak
//   still counts while today isn't done yet (it ends only after a missed day).
// since: { firstDay, days, goalDays }: from the first session to today
const dailyStats = (sessions, now, goalMinutes) => {
  const perDay = secondsPerDay(sessions);
  const goalSeconds = goalMinutes * 60;
  const met = (date) => (perDay.get(dayKey(date)) ?? 0) >= goalSeconds;
  const today = startOfDay(now);

  const last30 = Array.from({ length: 30 }, (_, i) => {
    const date = addDays(today, i - 29);
    const seconds = perDay.get(dayKey(date)) ?? 0;
    return { date, seconds, met: seconds >= goalSeconds };
  });

  let current = 0;
  for (let date = met(today) ? today : addDays(today, -1); met(date); date = addDays(date, -1)) current++;

  const firstDay = startOfDay(new Date(Math.min(...sessions.map((session) => new Date(session.startedAt)))));
  let longest = 0;
  let run = 0;
  let goalDays = 0;
  let days = 0;
  for (let date = firstDay; date <= today; date = addDays(date, 1)) {
    days++;
    if (met(date)) {
      goalDays++;
      longest = Math.max(longest, ++run);
    } else {
      run = 0;
    }
  }

  return { last30, streak: { current, longest }, since: { firstDay, days, goalDays } };
};

export const computeStats = (sessions, now = new Date(), goalMinutes = DEFAULT_DAILY_GOAL) => {
  const since = (from) => sessions.filter((session) => new Date(session.startedAt) >= from);

  // Per exercise, all time; the name from the most recent session is kept
  // for exercises that have since been deleted
  const groups = new Map();
  for (const session of sessions) {
    const group = groups.get(session.exerciseId) ?? { exerciseId: session.exerciseId, sessions: [] };
    group.exerciseName = session.exerciseName;
    group.sessions.push(session);
    groups.set(session.exerciseId, group);
  }
  const byExercise = [...groups.values()]
    .map(({ exerciseId, exerciseName, sessions: list }) => ({ exerciseId, exerciseName, ...summarize(list) }))
    .sort((a, b) => b.minutes - a.minutes || b.sessions - a.sessions);

  return {
    week: summarize(since(startOfWeek(now))),
    month: summarize(since(startOfMonth(now))),
    allTime: summarize(sessions),
    byExercise,
    devices: new Set(sessions.map((session) => session.deviceId)).size,
    ...(sessions.length > 0 ? dailyStats(sessions, now, goalMinutes) : {})
  };
};

// ---------- CSV export ----------
// Every session, oldest first, one per row. Dates and times as local time
// (for reading and spreadsheets) and as ISO timestamps (exact, with time zone).
const CSV_COLUMNS = [
  ['date', (s) => dayKey(new Date(s.startedAt))],
  ['time', (s) => new Date(s.startedAt).toTimeString().slice(0, 5)],
  ['exercise', (s) => s.exerciseName],
  ['minutes', (s) => (s.seconds / 60).toFixed(1)],
  ['seconds', (s) => s.seconds],
  ['cycles_completed', (s) => s.cyclesCompleted],
  ['cycles_planned', (s) => s.cyclesPlanned],
  ['completed', (s) => (s.completed ? 'yes' : 'no')],
  ['started_at', (s) => s.startedAt],
  ['ended_at', (s) => s.endedAt],
  ['exercise_id', (s) => s.exerciseId],
  ['device_id', (s) => s.deviceId]
];

const csvField = (value) => {
  const text = value === undefined || value === null ? '' : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const sessionsToCsv = (sessions) => {
  const rows = [...sessions]
    .sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt))
    .map((session) => CSV_COLUMNS.map(([, value]) => csvField(value(session))).join(','));
  return [CSV_COLUMNS.map(([name]) => name).join(','), ...rows].join('\r\n') + '\r\n';
};
