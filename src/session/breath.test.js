import { describe, expect, it } from 'vitest';
import { cycleLevels, cycleSegments, easeInOutSine, phaseKey, phaseLevels } from './breath';

const phases = (...list) => list.map(([type, duration]) => ({ type, duration }));

describe('lung levels', () => {
  it('rises on inhale, stays on hold, falls on exhale, stays on sustain', () => {
    const box = phases(['inhale', 4], ['hold', 4], ['exhale', 4], ['sustain', 4]);
    expect(phaseLevels(box, 0)).toEqual([[0, 1], [1, 1], [1, 0], [0, 0]]);
  });

  it('starts each cycle where the previous one ended', () => {
    // Inhale and hold only: the breath never goes back down, so after the
    // first cycle it's flat at the top
    expect(cycleLevels(phases(['inhale', 4], ['hold', 4]))).toEqual([[1, 1], [1, 1]]);
    // Ends empty: every cycle starts from the bottom
    expect(cycleLevels(phases(['inhale', 3], ['exhale', 12]))).toEqual([[0, 1], [1, 0]]);
  });

  it('shares the climb between inhales in a row, by their durations (a cyclic sigh)', () => {
    expect(phaseLevels(phases(['inhale', 3], ['inhale', 1], ['exhale', 6]), 0)).toEqual([[0, 0.75], [0.75, 1], [1, 0]]);
    expect(phaseLevels(phases(['inhale', 2], ['inhale', 2], ['exhale', 4]), 0)).toEqual([[0, 0.5], [0.5, 1], [1, 0]]);
  });

  it('shares the fall between exhales in a row too', () => {
    expect(phaseLevels(phases(['inhale', 4], ['exhale', 2], ['exhale', 6]), 0)).toEqual([[0, 1], [1, 0.75], [0.75, 0]]);
  });
});

describe('cycle segments', () => {
  it('makes each phase as wide as it is long, covering the whole cycle', () => {
    const segments = cycleSegments(phases(['inhale', 3], ['hold', 12], ['exhale', 6], ['sustain', 3]));
    expect(segments.map(({ start, end }) => [start, end])).toEqual([[0, 3 / 24], [3 / 24, 15 / 24], [15 / 24, 21 / 24], [21 / 24, 1]]);
    expect(segments.map(({ from, to }) => [from, to])).toEqual([[0, 1], [1, 1], [1, 0], [0, 0]]);
  });

  it('joins up: each segment starts where the previous one ends', () => {
    const segments = cycleSegments(phases(['inhale', 4], ['exhale', 2], ['inhale', 1], ['hold', 5]));
    segments.slice(1).forEach((segment, i) => {
      expect(segment.start).toBe(segments[i].end);
      expect(segment.from).toBe(segments[i].to);
    });
  });
});

describe('helpers', () => {
  it('treats unknown phase types as sustain (for their color)', () => {
    expect(phaseKey('exhale')).toBe('exhale');
    expect(phaseKey('pause')).toBe('sustain');
  });

  it('eases from 0 to 1, symmetrically', () => {
    expect(easeInOutSine(0)).toBeCloseTo(0);
    expect(easeInOutSine(0.5)).toBeCloseTo(0.5);
    expect(easeInOutSine(1)).toBeCloseTo(1);
    expect(easeInOutSine(0.25) + easeInOutSine(0.75)).toBeCloseTo(1);
  });
});
