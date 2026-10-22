import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The hook's timing without rendering: state setters do nothing (the hook
// keeps what the timer needs in refs), effects don't run, and the clock,
// animation frames and timeouts are driven by hand.
vi.mock('react', () => ({
  useState: (value) => [value, () => {}],
  useRef: (value) => ({ current: value }),
  useEffect: () => {}
}));

const audio = vi.hoisted(() => ({
  unlock: () => {},
  stop: () => {},
  stopMusic: () => {},
  pauseMusic: () => {},
  resumeMusic: () => {},
  startMusic: () => {},
  updateMusicFade: () => {},
  playClosing: () => {},
  breathPhase: () => {},
  playTone: null // a spy, per test
}));
vi.mock('../audio', () => ({ audio }));

const { useBreathingSession } = await import('./useBreathingSession');

const box = {
  id: 'box',
  name: 'Box',
  cycles: 2,
  phases: [
    { type: 'inhale', duration: 4 },
    { type: 'hold', duration: 4 },
    { type: 'exhale', duration: 4 },
    { type: 'sustain', duration: 4 }
  ]
}; // 32 seconds

let clock;
let ends;
const run = (options = {}) => useBreathingSession(box, {
  onComplete: () => {},
  onSessionEnd: (summary) => ends.push({ ...summary, at: clock }),
  ...options
});

// Lets `ms` pass and runs the pending timer step once, the way a hidden
// window's throttled timers do (animation frames never come)
const step = async (ms) => {
  clock += ms;
  vi.advanceTimersByTime(250);
};

beforeEach(() => {
  clock = 0;
  ends = [];
  audio.playTone = vi.fn();
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  vi.spyOn(performance, 'now').mockImplementation(() => clock);
  vi.stubGlobal('requestAnimationFrame', () => 0);
  vi.stubGlobal('cancelAnimationFrame', () => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('session timing', () => {
  it('keeps to the exercise length when timer steps come late', async () => {
    const session = run();
    session.start();
    while (ends.length === 0 && clock < 60000) await step(1100);
    expect(ends[0].completed).toBe(true);
    expect(ends[0].seconds).toBe(32);
    // Done at the first step after 32 s, not a late step per phase later
    expect(ends[0].at).toBeLessThan(32000 + 1100);
    // Every phase is heard, each from its own start
    expect(audio.playTone).toHaveBeenCalledTimes(8);
  });

  it('catches up on several phases in one late step, playing only the current one', async () => {
    const session = run();
    session.start();
    await step(9000); // into the third phase (exhale), 1 s in
    expect(audio.playTone).toHaveBeenCalledTimes(1);
    const [type, duration, { elapsed, bell }] = audio.playTone.mock.calls[0];
    expect([type, duration, bell]).toEqual(['exhale', 4, true]);
    expect(elapsed).toBeCloseTo(1);
    await step(30000);
    expect(ends[0].completed).toBe(true);
  });

  it('starts breathing exactly when the preparation ends', async () => {
    const session = run({ preparationTime: 3 });
    session.start();
    await step(2000);
    expect(audio.playTone).not.toHaveBeenCalled();
    await step(1500);
    const [type, , { elapsed }] = audio.playTone.mock.calls[0];
    expect(type).toBe('inhale');
    expect(elapsed).toBeCloseTo(0.5);
  });

  it('resumes the phase where it was, without its bell', async () => {
    const session = run();
    session.start();
    await step(2500);
    session.pause();
    clock += 60000;
    session.resume();
    const [type, , { elapsed, bell }] = audio.playTone.mock.calls.at(-1);
    expect([type, bell]).toEqual(['inhale', false]);
    expect(elapsed).toBeCloseTo(2.5);
  });

  it('ignores pause unless running', () => {
    const session = run();
    session.pause(); // e.g. from the tray, after the session ended
    session.resume();
    expect(audio.playTone).not.toHaveBeenCalled();
  });
});
