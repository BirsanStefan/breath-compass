import { describe, expect, it } from 'vitest';
import { BREATH_SOUND_REFS, breathSoundRef, easeOutSine, levelInPlan, parseBreathSoundRef } from './breathSounds';

describe('breath sound references', () => {
  it('round-trips a type', () => {
    expect(parseBreathSoundRef(breathSoundRef('ocean'))).toBe('ocean');
    expect(BREATH_SOUND_REFS).toEqual(['breath:ocean', 'breath:pad']);
  });

  it('rejects files and unknown types', () => {
    expect(parseBreathSoundRef('blackbird-forest.mp3')).toBeNull();
    expect(parseBreathSoundRef('breath:rain')).toBeNull();
    expect(parseBreathSoundRef(undefined)).toBeNull();
  });
});

describe('levelInPlan', () => {
  // In for 4 s from t=10, hold 2 s, out for 6 s
  const plan = [
    { type: 'inhale', from: 0, to: 1, start: 10, duration: 4 },
    { type: 'hold', from: 1, to: 1, start: 14, duration: 2 },
    { type: 'exhale', from: 1, to: 0, start: 16, duration: 6 }
  ];

  it('moves at once at the start of a phase, then eases into its target', () => {
    expect(levelInPlan(plan, 10)).toBe(0);
    expect(levelInPlan(plan, 11)).toBeCloseTo(easeOutSine(0.25));
    expect(levelInPlan(plan, 11)).toBeGreaterThan(0.35); // a quarter in, over a third of the way
    expect(levelInPlan(plan, 14)).toBe(1);
    expect(levelInPlan(plan, 15)).toBe(1);
    expect(levelInPlan(plan, 19)).toBeCloseTo(1 - easeOutSine(0.5));
  });

  it('stays at the start before the plan, and where it ended after it', () => {
    expect(levelInPlan(plan, 5)).toBe(0);
    expect(levelInPlan(plan, 30)).toBe(0);
    expect(levelInPlan([{ from: 0, to: 1, start: 0, duration: 4 }], 9)).toBe(1);
  });

  it('is silent-level (0) with no plan', () => {
    expect(levelInPlan([], 3)).toBe(0);
  });
});
