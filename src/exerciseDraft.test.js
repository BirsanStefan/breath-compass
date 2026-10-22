import { describe, expect, it } from 'vitest';
import { cyclesForMinutes, exerciseSeconds, fromDraft, LIMITS, moveItem, parseIntInRange, toDraft, withLevel } from './exerciseDraft';

// Stands in for useTranslation's exerciseText: built-in "clear-mind" is
// translated, everything else shows its own text
const exerciseText = (exercise, field) =>
  exercise.id === 'clear-mind' && field === 'name' ? 'Minte Clară' : exercise[field] ?? '';

const clearMind = {
  id: 'clear-mind',
  name: 'Clear Mind',
  description: 'Extended exhale',
  cycles: 36,
  backgroundSound: 'clear-mind.mp3',
  phases: [{ type: 'inhale', duration: 3 }, { type: 'exhale', duration: 12 }]
};

describe('parseIntInRange', () => {
  const { duration } = LIMITS; // 1–600

  it('accepts whole numbers in range, as text or numbers', () => {
    expect(parseIntInRange('4', duration)).toBe(4);
    expect(parseIntInRange(600, duration)).toBe(600);
    expect(parseIntInRange(' 12 ', duration)).toBe(12);
  });

  it.each(['', '  ', '0', '601', '4.5', '-3', 'abc', '1e3'])('rejects %j', (value) => {
    expect(parseIntInRange(value, duration)).toBeNull();
  });
});

describe('lengths', () => {
  it('works out an exercise in seconds', () => {
    expect(exerciseSeconds(clearMind)).toBe(36 * 15);
  });

  it('picks the cycles closest to a length in minutes', () => {
    expect(cyclesForMinutes(clearMind.phases, 9)).toBe(36); // 15 s cycles
    expect(cyclesForMinutes([{ duration: 7 }], 1)).toBe(9); // 60 / 7 = 8.6
  });

  it('keeps the cycles within limits', () => {
    expect(cyclesForMinutes([{ duration: 600 }], 1)).toBe(LIMITS.cycles.min);
    expect(cyclesForMinutes([{ duration: 1 }], 240)).toBe(LIMITS.cycles.max);
  });
});

describe('the editor draft', () => {
  it('shows a built-in exercise translated, numbers as text', () => {
    expect(toDraft(clearMind, exerciseText)).toEqual({
      id: 'clear-mind',
      name: 'Minte Clară',
      description: 'Extended exhale',
      cycles: '36',
      backgroundSound: 'clear-mind.mp3',
      phases: [{ type: 'inhale', duration: '3' }, { type: 'exhale', duration: '12' }]
    });
  });

  it('saves back to the same exercise, keeping untouched text untranslated', () => {
    const draft = toDraft(clearMind, exerciseText);
    expect(fromDraft(draft, clearMind, exerciseText)).toEqual({ exercise: clearMind });
  });

  it('saves edits, trimmed', () => {
    const draft = { ...toDraft(clearMind, exerciseText), name: '  Calm  ', cycles: '10', backgroundSound: '' };
    const { exercise } = fromDraft(draft, clearMind, exerciseText);
    expect(exercise.name).toBe('Calm');
    expect(exercise.cycles).toBe(10);
    expect(exercise).not.toHaveProperty('backgroundSound');
  });

  it('keeps fields it does not edit (like hidden)', () => {
    const hidden = { ...clearMind, hidden: true };
    expect(fromDraft(toDraft(hidden, exerciseText), hidden, exerciseText).exercise.hidden).toBe(true);
  });

  it('reports every problem at once', () => {
    const draft = { id: 'x', name: ' ', description: '', cycles: '0', backgroundSound: '', phases: [{ type: 'inhale', duration: '' }] };
    expect(fromDraft(draft, null, exerciseText).errors).toEqual(['nameRequired', 'cyclesInvalid', 'durationInvalid']);
    expect(fromDraft({ ...draft, name: 'A', cycles: '5', phases: [] }, null, exerciseText).errors).toEqual(['phasesRequired']);
  });
});

describe('moveItem', () => {
  it('swaps with the neighbour, and ignores moves past the ends', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c']);
    expect(moveItem(['a', 'b', 'c'], 2, -1)).toEqual(['a', 'c', 'b']);
    expect(moveItem(['a', 'b'], 0, -1)).toEqual(['a', 'b']);
  });
});

describe('withLevel', () => {
  const levels = [
    [{ type: 'inhale', duration: 3 }, { type: 'exhale', duration: 9 }],
    [{ type: 'inhale', duration: 3 }, { type: 'exhale', duration: 15 }]
  ];
  const draft = { cycles: '25', level: 0, phases: [{ type: 'inhale', duration: '3' }, { type: 'exhale', duration: '9' }] };

  it('takes the level’s phases and keeps the length in minutes', () => {
    const next = withLevel(draft, 1, levels);
    expect(next.level).toBe(1);
    expect(next.phases).toEqual([{ type: 'inhale', duration: '3' }, { type: 'exhale', duration: '15' }]);
    expect(next.cycles).toBe('17'); // 5 min: 25 × 12 s ≈ 17 × 18 s
  });

  it('saves the level with the exercise', () => {
    const { exercise } = fromDraft({ ...withLevel(draft, 1, levels), id: 'clear-mind', name: 'Clear Mind', description: '' }, null, () => '');
    expect(exercise.level).toBe(1);
  });
});
