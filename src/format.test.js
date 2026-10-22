import { describe, expect, it } from 'vitest';
import { formatClock, formatDuration, levelLabels, levelNames, phaseRatio, phaseSummary } from './format';

describe('formatDuration', () => {
  it.each([
    [0, '0 s'],
    [45, '45 s'],
    [60, '1 min'],
    [270, '4 min 30 s'],
    [3600, '60 min']
  ])('%i seconds -> %s', (seconds, text) => {
    expect(formatDuration(seconds)).toBe(text);
  });
});

describe('formatClock', () => {
  it.each([
    [0, '0:00'],
    [42, '0:42'],
    [540, '9:00'],
    [3900, '1:05:00'],
    [41.6, '0:42'],
    [-5, '0:00']
  ])('%d seconds -> %s', (seconds, text) => {
    expect(formatClock(seconds)).toBe(text);
  });
});

describe('phaseRatio', () => {
  const phases = (...list) => list.map(([type, duration]) => ({ type, duration }));

  it('reduces to the smallest whole numbers', () => {
    expect(phaseRatio(phases(['inhale', 3], ['exhale', 12]))).toBe('1:0:4:0');
    expect(phaseRatio(phases(['inhale', 4], ['hold', 4], ['exhale', 4], ['sustain', 4]))).toBe('1:1:1:1');
    expect(phaseRatio(phases(['inhale', 4], ['hold', 7], ['exhale', 8]))).toBe('4:7:8:0');
  });

  it('adds up phases of the same type', () => {
    expect(phaseRatio(phases(['inhale', 2], ['inhale', 2], ['exhale', 8]))).toBe('1:0:2:0');
  });

  it('copes with no phases', () => {
    expect(phaseRatio([])).toBe('0:0:0:0');
  });
});

describe('levelLabels', () => {
  const phases = (...list) => list.map(([type, duration]) => ({ type, duration }));

  it('names levels by their ratio', () => {
    expect(levelLabels([phases(['inhale', 3], ['exhale', 9]), phases(['inhale', 3], ['exhale', 12])]))
      .toEqual(['1:0:3:0', '1:0:4:0']);
  });

  it('names levels by their seconds when they share a ratio', () => {
    const square = (s) => phases(['inhale', s], ['hold', s], ['exhale', s], ['sustain', s]);
    expect(levelLabels([square(3), square(4)])).toEqual(['3-3-3-3', '4-4-4-4']);
  });
});

describe('levelNames', () => {
  it('names two or three levels', () => {
    expect(levelNames(2)).toEqual(['gentle', 'extended']);
    expect(levelNames(3)).toEqual(['gentle', 'standard', 'extended']);
  });
});

describe('phaseSummary', () => {
  const name = (type) => type[0].toUpperCase() + type.slice(1);

  it('lists each phase with its seconds, in order', () => {
    const phases = [
      { type: 'inhale', duration: 4 },
      { type: 'hold', duration: 7 },
      { type: 'exhale', duration: 8 }
    ];
    expect(phaseSummary(phases, name)).toBe('Inhale 4 · Hold 7 · Exhale 8');
  });

  it('keeps repeated phases separate', () => {
    const phases = [
      { type: 'inhale', duration: 3 },
      { type: 'inhale', duration: 1 },
      { type: 'exhale', duration: 6 }
    ];
    expect(phaseSummary(phases, name)).toBe('Inhale 3 · Inhale 1 · Exhale 6');
  });
});
