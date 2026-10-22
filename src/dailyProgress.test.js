import { describe, expect, it } from 'vitest';
import { dropFills, goalProgress } from './dailyProgress';

describe("today's progress", () => {
  it('counts whole minutes towards the goal', () => {
    expect(goalProgress(0, 20)).toEqual({ minutes: 0, goal: 20, fraction: 0, met: false });
    expect(goalProgress(299, 20)).toMatchObject({ minutes: 4, fraction: 0.2 });
    expect(goalProgress(300, 20)).toMatchObject({ minutes: 5, fraction: 0.25 });
  });

  it('is full once the goal is met, and stays full past it', () => {
    expect(goalProgress(20 * 60, 20)).toMatchObject({ fraction: 1, met: true });
    expect(goalProgress(45 * 60, 20)).toMatchObject({ minutes: 45, fraction: 1, met: true });
  });
});

describe('the tray icon drops', () => {
  it('are all empty at the start of the day', () => {
    expect(dropFills(0)).toEqual([0, 0, 0, 0]);
  });

  it('fill a quarter of the goal each, in turn', () => {
    expect(dropFills(0.25)).toEqual([1, 0, 0, 0]); // 5 of 20 min
    expect(dropFills(0.6)).toEqual([1, 1, expect.closeTo(0.4), 0]); // 12 of 20 min
    expect(dropFills(1)).toEqual([1, 1, 1, 1]);
  });

  it('show every minute, even before the first drop is full', () => {
    expect(dropFills(goalProgress(3 * 60, 20).fraction)).toEqual([expect.closeTo(0.6), 0, 0, 0]);
  });
});
