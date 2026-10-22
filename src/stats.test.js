import { describe, expect, it } from 'vitest';
import { computeStats, dayKey, sessionsToCsv, startOfWeek } from './stats';

// Times are local (the tests run in Europe/Bucharest, see vite.config.js)
const at = (text) => new Date(text);
const session = (startedAt, minutes, extra = {}) => ({
  startedAt: at(startedAt).toISOString(),
  seconds: minutes * 60,
  exerciseId: 'clear-mind',
  exerciseName: 'Clear Mind',
  deviceId: 'desktop-1',
  ...extra
});

describe('weeks and days', () => {
  it('runs in a time zone with daylight saving (or the tests below prove little)', () => {
    expect(at('2027-01-15T12:00').getTimezoneOffset()).toBe(-120);
    expect(at('2027-07-15T12:00').getTimezoneOffset()).toBe(-180);
  });

  it('starts the week on Monday', () => {
    expect(dayKey(startOfWeek(at('2027-01-31T10:00')))).toBe('2027-01-25'); // a Sunday
    expect(dayKey(startOfWeek(at('2027-01-25T00:05')))).toBe('2027-01-25'); // the Monday itself
  });

  it('counts a session on the local day it started', () => {
    const stats = computeStats([session('2027-01-24T23:50', 10)], at('2027-01-25T12:00'));
    const days = Object.fromEntries(stats.last30.map((day) => [dayKey(day.date), day.seconds]));
    expect(days['2027-01-24']).toBe(600);
    expect(days['2027-01-25']).toBe(0);
  });
});

describe('summaries', () => {
  it('adds up this week, this month and all time', () => {
    const stats = computeStats(
      [session('2026-12-30T08:00', 10), session('2027-01-20T08:00', 5), session('2027-01-26T08:00', 7)],
      at('2027-01-27T12:00')
    );
    expect(stats.week).toEqual({ sessions: 1, minutes: 7 });
    expect(stats.month).toEqual({ sessions: 2, minutes: 12 });
    expect(stats.allTime).toEqual({ sessions: 3, minutes: 22 });
  });

  it('groups by exercise, most minutes first, with the latest name', () => {
    const stats = computeStats([
      session('2027-01-20T08:00', 3, { exerciseId: 'a', exerciseName: 'Old name' }),
      session('2027-01-21T08:00', 3, { exerciseId: 'a', exerciseName: 'New name' }),
      session('2027-01-21T09:00', 10, { exerciseId: 'b', exerciseName: 'B' })
    ], at('2027-01-22T12:00'));
    expect(stats.byExercise.map((group) => [group.exerciseName, group.minutes])).toEqual([['B', 10], ['New name', 6]]);
  });

  it('counts devices', () => {
    const stats = computeStats([
      session('2027-01-20T08:00', 5),
      session('2027-01-20T09:00', 5, { deviceId: 'web-2' })
    ], at('2027-01-22T12:00'));
    expect(stats.devices).toBe(2);
  });

  it('has no daily statistics without sessions', () => {
    const stats = computeStats([], at('2027-01-22T12:00'));
    expect(stats.allTime).toEqual({ sessions: 0, minutes: 0 });
    expect(stats.streak).toBeUndefined();
  });
});

describe('the daily goal', () => {
  const now = at('2027-01-25T12:00');

  it('is met by several sessions on one day', () => {
    const stats = computeStats([session('2027-01-25T08:00', 2), session('2027-01-25T09:00', 3)], now, 5);
    expect(stats.last30.at(-1).met).toBe(true);
  });

  it('is not met just below it', () => {
    const stats = computeStats([{ ...session('2027-01-25T08:00', 5), seconds: 299 }], now, 5);
    expect(stats.last30.at(-1).met).toBe(false);
  });

  it('shows the last 30 days, today last', () => {
    const stats = computeStats([session('2027-01-25T08:00', 5)], now);
    expect(stats.last30).toHaveLength(30);
    expect(dayKey(stats.last30[0].date)).toBe('2026-12-27');
    expect(dayKey(stats.last30.at(-1).date)).toBe('2027-01-25');
  });
});

describe('streaks', () => {
  const daily = (days, minutes = 5) => days.map((day) => session(`${day}T08:00`, minutes));

  it('counts the current streak, still alive while today is not done yet', () => {
    const sessions = daily(['2027-01-22', '2027-01-23', '2027-01-24']);
    expect(computeStats(sessions, at('2027-01-25T12:00')).streak.current).toBe(3);
  });

  it('includes today once it is done', () => {
    const sessions = daily(['2027-01-24', '2027-01-25']);
    expect(computeStats(sessions, at('2027-01-25T20:00')).streak.current).toBe(2);
  });

  it('ends after a missed day', () => {
    const sessions = daily(['2027-01-21', '2027-01-22']);
    expect(computeStats(sessions, at('2027-01-25T12:00')).streak.current).toBe(0);
  });

  it('only counts days that met the goal', () => {
    const sessions = [...daily(['2027-01-23', '2027-01-24']), session('2027-01-22T08:00', 2)];
    expect(computeStats(sessions, at('2027-01-25T12:00'), 5).streak.current).toBe(2);
  });

  it('remembers the longest streak', () => {
    const sessions = daily(['2027-01-01', '2027-01-02', '2027-01-03', '2027-01-04', '2027-01-10', '2027-01-11']);
    expect(computeStats(sessions, at('2027-01-12T12:00')).streak).toEqual({ current: 2, longest: 4 });
  });

  // The clocks go forward on 28 March 2027 (a 23-hour day) and back on
  // 31 October 2027 (25 hours): a streak runs through both
  it('runs through the daylight saving changes', () => {
    const spring = daily(['2027-03-27', '2027-03-28', '2027-03-29']);
    expect(computeStats(spring, at('2027-03-29T20:00')).streak.current).toBe(3);
    const autumn = daily(['2027-10-30', '2027-10-31', '2027-11-01']);
    expect(computeStats(autumn, at('2027-11-01T20:00')).streak.current).toBe(3);
  });
});

describe('days since the first session', () => {
  it('counts every day from the first one to today, and those that met the goal', () => {
    const sessions = [session('2027-01-20T08:00', 5), session('2027-01-22T08:00', 6), session('2027-01-23T08:00', 1)];
    const { since } = computeStats(sessions, at('2027-01-25T12:00'), 5);
    expect(dayKey(since.firstDay)).toBe('2027-01-20');
    expect(since.days).toBe(6);
    expect(since.goalDays).toBe(2);
  });

  it('is one day on the very first day', () => {
    const { since } = computeStats([session('2027-01-25T08:00', 5)], at('2027-01-25T09:00'));
    expect(since).toMatchObject({ days: 1, goalDays: 1 });
  });
});

describe('CSV export', () => {
  const full = (startedAt, extra) => session(startedAt, 4.5, {
    cyclesCompleted: 18,
    cyclesPlanned: 20,
    completed: false,
    endedAt: at(startedAt).toISOString(),
    ...extra
  });

  it('has a header and one row per session, oldest first', () => {
    const csv = sessionsToCsv([full('2027-01-25T09:30'), full('2027-01-24T08:05')]);
    const lines = csv.split('\r\n');
    expect(lines[0]).toBe('date,time,exercise,minutes,seconds,cycles_completed,cycles_planned,completed,started_at,ended_at,exercise_id,device_id');
    expect(lines[1].startsWith('2027-01-24,08:05,Clear Mind,4.5,270,18,20,no,')).toBe(true);
    expect(lines[2].startsWith('2027-01-25,09:30,')).toBe(true);
    expect(csv.endsWith('\r\n')).toBe(true);
  });

  it('quotes names with commas, quotes or line breaks', () => {
    const csv = sessionsToCsv([full('2027-01-25T09:30', { exerciseName: 'Calm, "slow"\nbreath' })]);
    expect(csv).toContain(',"Calm, ""slow""\nbreath",');
  });

  it('leaves missing values empty', () => {
    const csv = sessionsToCsv([full('2027-01-25T09:30', { cyclesPlanned: undefined, deviceId: null })]);
    const row = csv.split('\r\n')[1].split(',');
    expect(row[6]).toBe('');
    expect(row.at(-1)).toBe('');
  });
});
