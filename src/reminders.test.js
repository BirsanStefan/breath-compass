import { describe, expect, it } from 'vitest';
import { dueReminders, isValidTime, normalizeTime, passedToday, reminderKey, secondsToday } from './reminders';

const at = (text) => new Date(text); // local time

describe('reminder times', () => {
  it.each([
    ['9:05', '09:05'],
    ['09:05', '09:05'],
    ['9.30', '09:30'],
    [' 18:00 ', '18:00'],
    ['23:59', '23:59']
  ])('reads %j as %s', (text, time) => {
    expect(normalizeTime(text)).toBe(time);
  });

  it.each(['', '9', '24:00', '12:60', '9:5', 'noon', null, undefined])('rejects %j', (text) => {
    expect(normalizeTime(text)).toBeNull();
  });

  it('only accepts stored times as HH:MM', () => {
    expect(isValidTime('07:30')).toBe(true);
    expect(isValidTime('7:30')).toBe(false);
  });
});

describe('which reminders are due', () => {
  const times = ['09:00', '18:00'];

  it('is due from its minute until 15 minutes late', () => {
    expect(dueReminders(times, at('2027-01-25T08:59'), new Set())).toEqual([]);
    expect(dueReminders(times, at('2027-01-25T09:00'), new Set())).toEqual(['09:00']);
    expect(dueReminders(times, at('2027-01-25T09:15'), new Set())).toEqual(['09:00']);
  });

  it('skips a reminder missed by more than 15 minutes (asleep, started late)', () => {
    expect(dueReminders(times, at('2027-01-25T09:16'), new Set())).toEqual([]);
  });

  it('shows each reminder once a day', () => {
    const handled = new Set([reminderKey(at('2027-01-25T09:00'), '09:00')]);
    expect(dueReminders(times, at('2027-01-25T09:05'), handled)).toEqual([]);
    expect(dueReminders(times, at('2027-01-26T09:05'), handled)).toEqual(['09:00']);
  });

  it('lets a time added after it has passed wait until tomorrow', () => {
    expect(passedToday(['07:00', '12:00', '12:01'], at('2027-01-25T12:00'))).toEqual(['07:00', '12:00']);
  });
});

describe('time breathed today', () => {
  it('counts only sessions that started today', () => {
    const sessions = [
      { startedAt: at('2027-01-24T23:55').toISOString(), seconds: 600 },
      { startedAt: at('2027-01-25T07:00').toISOString(), seconds: 120 },
      { startedAt: at('2027-01-25T08:00').toISOString(), seconds: 180 }
    ];
    expect(secondsToday(sessions, at('2027-01-25T09:00'))).toBe(300);
  });
});
