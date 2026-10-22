import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioService } from './audio';

// A stand-in for an <audio> element: playback position and state only
class FakeElement {
  constructor(duration) {
    this.duration = duration;
    this.currentTime = 0;
    this.paused = true;
    this.volume = 1;
    this.src = '';
    this.onended = null;
  }
  play() { this.paused = false; return Promise.resolve(); }
  pause() { this.paused = true; }
  removeAttribute() { this.src = ''; }
  load() {}
  end() { this.currentTime = this.duration; this.paused = true; this.onended?.(); }
}

// Starts a track of `duration` seconds on a fresh service
const start = (duration) => {
  const service = new AudioService();
  const elements = [new FakeElement(duration), new FakeElement(duration)];
  service.musicElements = elements;
  service.startMusic('track.mp3');
  return { service, music: service.music, a: elements[0], b: elements[1] };
};

describe('music looping', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('plays the first element at full volume, the second ready but silent', () => {
    const { a, b } = start(120);
    expect(a.paused).toBe(false);
    expect(b.paused).toBe(true);
    expect(b.src).toBe('track.mp3');
    expect(a.volume).toBeCloseTo(0.6); // the default music level
    expect(b.volume).toBe(0);
  });

  it('starts the next pass from the beginning over the last 4 seconds, crossfading evenly', () => {
    const { service, music, a, b } = start(120);
    a.currentTime = 110;
    service._loopMusic();
    expect(b.paused).toBe(true); // not yet

    a.currentTime = 117;
    service._loopMusic();
    expect(b.paused).toBe(false);
    expect(b.currentTime).toBe(0);
    expect(music.crossfading).toBe(true);

    a.currentTime = 118; // halfway through the crossfade
    service._loopMusic();
    expect(music.mix[0]).toBeCloseTo(Math.SQRT1_2);
    expect(music.mix[1]).toBeCloseTo(Math.SQRT1_2);
    expect(music.mix[0] ** 2 + music.mix[1] ** 2).toBeCloseTo(1); // even loudness
  });

  it('hands over to the other element when the pass ends, and keeps alternating', () => {
    const { service, music, a, b } = start(120);
    a.currentTime = 117;
    service._loopMusic();
    a.end();
    expect(music.current).toBe(1);
    expect(music.mix).toEqual([0, 1]);
    expect(music.crossfading).toBe(false);
    expect(a.currentTime).toBe(0);

    b.currentTime = 117;
    service._loopMusic();
    expect(a.paused).toBe(false); // the third pass, on the first element again
    b.end();
    expect(music.current).toBe(0);
  });

  it('pauses and resumes both elements during a crossfade', () => {
    const { service, a, b } = start(120);
    a.currentTime = 117;
    service._loopMusic();
    service.pauseMusic();
    expect([a.paused, b.paused]).toEqual([true, true]);
    service.resumeMusic();
    expect([a.paused, b.paused]).toEqual([false, false]);
  });

  it('resumes only the playing element outside a crossfade', () => {
    const { service, a, b } = start(120);
    service.pauseMusic();
    service.resumeMusic();
    expect([a.paused, b.paused]).toEqual([false, true]);
  });

  it('shortens the crossfade for short sounds, and just starts over for very short ones', () => {
    const service = new AudioService();
    expect(service._crossfadeSeconds(120)).toBe(4);
    expect(service._crossfadeSeconds(8)).toBe(2);
    expect(service._crossfadeSeconds(0.5)).toBe(0);
    expect(service._crossfadeSeconds(NaN)).toBe(0); // length not known yet

    const { music, a, b } = start(0.5);
    a.end();
    expect(b.paused).toBe(false);
    expect(music.current).toBe(1);
  });

  it('fades out over the last 10 seconds of the session', () => {
    const { service, a } = start(120);
    service.updateMusicFade(5);
    expect(a.volume).toBeCloseTo(0.3);
    service.updateMusicFade(60);
    expect(a.volume).toBeCloseTo(0.6);
  });

  it('stops both elements and frees them for the next track', () => {
    const { service, a, b } = start(120);
    a.currentTime = 117;
    service._loopMusic();
    service.stopMusic();
    expect(service.music).toBeNull();
    expect([a.paused, b.paused, a.src, b.src]).toEqual([true, true, '', '']);
  });
});

describe('phase bell and ticks', () => {
  const service = () => {
    const s = new AudioService();
    s.initialize = () => {};
    s._startKeepAlive = () => {};
    s.scheduleBell = vi.fn();
    s.scheduleTick = vi.fn();
    return s;
  };

  it('rings the bell and ticks on each second of the phase', () => {
    const s = service();
    s.playTone('inhale', 4);
    expect(s.scheduleBell).toHaveBeenCalledWith('inhale', 0, 4);
    expect(s.scheduleTick.mock.calls.map(([offset]) => offset)).toEqual([1, 2, 3]);
  });

  it('resumes mid-phase on the phase\'s own seconds, without the bell', () => {
    const s = service();
    s.playTone('inhale', 4, { elapsed: 1.5, bell: false });
    expect(s.scheduleBell).not.toHaveBeenCalled();
    expect(s.scheduleTick.mock.calls.map(([offset]) => offset)).toEqual([0.5, 1.5]);
  });
});
