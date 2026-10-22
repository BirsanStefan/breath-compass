import { describe, expect, it } from 'vitest';
import { GENERATED_BELL_REFS, bellSettings, generatedBellRef, parseGeneratedBellRef } from './bellSounds';

describe('generated bell references', () => {
  it('round-trips a set and phase', () => {
    expect(parseGeneratedBellRef(generatedBellRef('bowl', 'sustain'))).toEqual({ set: 'bowl', phaseType: 'sustain' });
  });

  it('lists every generated set for every phase', () => {
    expect(GENERATED_BELL_REFS).toHaveLength(16);
    expect(GENERATED_BELL_REFS).toContain('bell:classic:inhale');
  });

  it('rejects imported sounds and unknown sets or phases', () => {
    expect(parseGeneratedBellRef('user:gong.mp3')).toBeNull();
    expect(parseGeneratedBellRef('bell:gong:inhale')).toBeNull();
    expect(parseGeneratedBellRef('bell:bowl:breathe')).toBeNull();
    expect(parseGeneratedBellRef(undefined)).toBeNull();
  });
});

describe('bellSettings', () => {
  it('defaults to the Bells set', () => {
    expect(bellSettings({})).toEqual({ set: 'classic', custom: {} });
  });

  it('turns custom bells that picked an old bundled mp3 into the generated bell', () => {
    const bells = bellSettings({
      bells: { set: 'custom', custom: { inhale: 'hold.mp3', exhale: 'user:gong.mp3', sustain: 'bell:wood:sustain' } }
    });
    expect(bells.custom).toEqual({
      inhale: 'bell:classic:hold',
      exhale: 'user:gong.mp3',
      sustain: 'bell:wood:sustain'
    });
  });
});
