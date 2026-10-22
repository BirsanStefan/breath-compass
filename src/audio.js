import {
  BELL_PHASES,
  CUSTOM_BELL_MAX_SECONDS,
  DEFAULT_BELLS,
  GENERATED_BELL_SETS,
  parseGeneratedBellRef,
  playClosingChime,
  playGeneratedBell
} from './bellSounds';
import { PREVIEW_BREATHS, createBreathVoice, parseBreathSoundRef } from './breathSounds';

// ==================== AUDIO SERVICE ====================
// A tiny silent WAV, played once from a tap to unlock audio on mobile browsers
const createSilentWavUrl = () => {
  const samples = 800; // 0.1 s at 8 kHz, 8-bit mono
  const buffer = new ArrayBuffer(44 + samples);
  const view = new DataView(buffer);
  const text = (offset, value) => [...value].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
  text(0, 'RIFF');
  view.setUint32(4, 36 + samples, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true);   // fmt chunk size
  view.setUint16(20, 1, true);    // PCM
  view.setUint16(22, 1, true);    // mono
  view.setUint32(24, 8000, true); // sample rate
  view.setUint32(28, 8000, true); // byte rate
  view.setUint16(32, 1, true);    // block align
  view.setUint16(34, 8, true);    // bits per sample
  text(36, 'data');
  view.setUint32(40, samples, true);
  new Uint8Array(buffer, 44).fill(128); // 8-bit silence
  return URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
};

// Level of each kind of sound (0–1), relative to the main volume slider.
// Kept per device, in device.json as "soundLevels".
export const DEFAULT_SOUND_LEVELS = { music: 0.6, ticks: 1, bells: 1 };

export const soundLevels = (device) => ({ ...DEFAULT_SOUND_LEVELS, ...device?.soundLevels });

export class AudioService {
  // Seconds over which music fades out before the session ends
  static MUSIC_FADE_SECONDS = 10;
  // Seconds over which the end of a track blends into its start when it loops
  static MUSIC_CROSSFADE_SECONDS = 4;

  constructor() {
    this.audioContext = null;
    this.masterGain = null;
    this.bellGain = null;
    this.tickGain = null;
    this.levels = { ...DEFAULT_SOUND_LEVELS };
    this.noiseBuffer = null;
    this.volume = 1;
    this.muted = false;
    this.bells = DEFAULT_BELLS; // which bells play (see bellSounds.js)
    this.resolveSoundUrl = null;
    this.customBuffers = {};    // the custom bells that are sound files, per phase
    this.decodedSounds = new Map(); // sound reference -> decoded buffer
    this.customLoadId = 0;
    this.bellNodes = [];
    this.tickNodes = [];
    this.keepAlive = null;    // see _startKeepAlive()
    this.isPlaying = false;
    this.music = null;        // the playing track, see startMusic()
    this.musicElements = [];  // the two music elements, reused for every track (see unlock())
    this.silentUrl = null;
    this.musicFade = 1;
    this.breath = null;        // a sound that follows the breath, while one plays (see breathSounds.js)
    this.breathPlan = null;    // the current phase, for it to follow
    this.breathPreview = null;
  }

  initialize() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = this._masterLevel();
      this.masterGain.connect(this.audioContext.destination);
      // Bells and ticks each go through their own level, then the main volume
      this.bellGain = this.audioContext.createGain();
      this.bellGain.gain.value = this.levels.bells;
      this.bellGain.connect(this.masterGain);
      this.tickGain = this.audioContext.createGain();
      this.tickGain.gain.value = this.levels.ticks;
      this.tickGain.connect(this.masterGain);
      this.noiseBuffer = this._createNoiseBuffer();
      this._loadCustomBells();
    }
  }

  // Call from a tap/click (Start, Resume). Mobile browsers only play audio that
  // was started by the user: this resumes the Web Audio context and "primes"
  // both music elements, so music can start later, after the countdown.
  unlock() {
    this.initialize();
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }
    if (this.musicElements.length === 0) {
      this.silentUrl = createSilentWavUrl();
      this.musicElements = [new Audio(), new Audio()];
      for (const element of this.musicElements) {
        element.src = this.silentUrl;
        element.play()
          .then(() => {
            if (element.src === this.silentUrl) element.pause();
          })
          .catch(() => {});
      }
    }
  }

  setVolume(value) {
    this.volume = value;
    this._applyMasterVolume();
  }

  setMuted(muted) {
    this.muted = muted;
    this._applyMasterVolume();
  }

  // The main volume, or silence while muted
  _masterLevel() {
    return this.muted ? 0 : this.volume;
  }

  _applyMasterVolume() {
    if (this.masterGain) {
      this.masterGain.gain.value = this._masterLevel();
    }
    this._applyMusicVolume();
  }

  // levels: { music, ticks, bells }, each 0–1 (missing ones keep their default)
  setLevels(levels) {
    this.levels = { ...DEFAULT_SOUND_LEVELS, ...levels };
    if (this.bellGain) this.bellGain.gain.value = this.levels.bells;
    if (this.tickGain) this.tickGain.gain.value = this.levels.ticks;
    this._applyMusicVolume();
  }

  // ---------- Background music ----------
  // Every track loops. Two elements take turns: over the last
  // MUSIC_CROSSFADE_SECONDS of a pass, the next pass starts from the beginning
  // on the other element and the two crossfade, so a track needs no exact
  // loop point (imported music included).
  // this.music: { elements, current (index of the element playing), mix (each
  // element's share of the volume, 0–1), crossfading, paused, timer }
  startMusic(url) {
    this.stopMusic();
    if (!url) return;
    const breathSound = parseBreathSoundRef(url);
    if (breathSound) {
      this._startBreathSound(breathSound);
      return;
    }
    if (this.musicElements.length === 0) this.musicElements = [new Audio(), new Audio()];
    const elements = this.musicElements;
    for (const element of elements) {
      element.src = url; // the second one loads now, ready for the first loop
      element.onended = () => this._musicEnded(element);
    }
    this.music = {
      elements,
      current: 0,
      mix: [1, 0],
      crossfading: false,
      paused: false,
      timer: setInterval(() => this._loopMusic(), 100)
    };
    this.musicFade = 1;
    this._applyMusicVolume();
    elements[0].play().catch((e) => console.warn('Background music failed to play:', e));
  }

  pauseMusic() {
    if (this.breath) {
      this.breath.paused = true;
      this.breath.voice.hold();
      this._applyMusicVolume();
      return;
    }
    if (!this.music) return;
    this.music.paused = true;
    this.music.elements.forEach((element) => element.pause());
  }

  resumeMusic() {
    if (this.breath) {
      this.breath.paused = false;
      this._applyMusicVolume();
      return;
    }
    const music = this.music;
    if (!music) return;
    music.paused = false;
    const playing = music.crossfading ? music.elements : [music.elements[music.current]];
    playing.forEach((element) =>
      element.play().catch((e) => console.warn('Background music failed to resume:', e)));
  }

  // How long the crossfade lasts for a track this long (shorter for short
  // sounds; 0 for very short ones, which then just start over)
  _crossfadeSeconds(duration) {
    if (!Number.isFinite(duration)) return 0;
    const seconds = Math.min(AudioService.MUSIC_CROSSFADE_SECONDS, duration / 4);
    return seconds >= 0.25 ? seconds : 0;
  }

  // Every 100 ms while music plays: starts the next pass near the end of this
  // one, and moves the crossfade along with the playing position (so a pause
  // simply holds it)
  _loopMusic() {
    const music = this.music;
    if (!music || music.paused) return;
    const current = music.elements[music.current];
    const next = music.elements[1 - music.current];
    const seconds = this._crossfadeSeconds(current.duration);
    if (!seconds) return;
    const remaining = current.duration - current.currentTime;
    if (!music.crossfading) {
      if (remaining > seconds) return;
      music.crossfading = true;
      next.currentTime = 0;
      next.play().catch((e) => console.warn('Background music failed to loop:', e));
    }
    // Equal-power curves: the overall loudness stays even through the blend
    const k = Math.min(1, Math.max(0, 1 - remaining / seconds));
    music.mix[music.current] = Math.cos((k * Math.PI) / 2);
    music.mix[1 - music.current] = Math.sin((k * Math.PI) / 2);
    this._applyMusicVolume();
  }

  // A pass ended: the other element carries on (it's already playing if the
  // crossfade ran; if not — a very short sound — it starts now)
  _musicEnded(element) {
    const music = this.music;
    if (!music || element !== music.elements[music.current]) return;
    const next = music.elements[1 - music.current];
    if (!music.crossfading) {
      next.currentTime = 0;
      next.play().catch((e) => console.warn('Background music failed to loop:', e));
    }
    element.currentTime = 0;
    music.current = 1 - music.current;
    music.mix[music.current] = 1;
    music.mix[1 - music.current] = 0;
    music.crossfading = false;
    this._applyMusicVolume();
  }

  // The elements themselves are kept for the next track (they stay unlocked)
  // fadeSeconds: fade out first (on Stop and at the end, with the visual)
  stopMusic(fadeSeconds = 0) {
    this._stopBreathSound(fadeSeconds);
    this._finishMusicFadeOut();
    const music = this.music;
    if (!music) return;
    this.music = null;
    clearInterval(music.timer);
    if (fadeSeconds <= 0 || music.paused) {
      this._releaseMusic(music.elements);
      return;
    }
    const fromFade = this.musicFade;
    const startedAt = performance.now();
    const step = () => {
      const k = Math.min(1, (performance.now() - startedAt) / (fadeSeconds * 1000));
      // follows volume and mute changes made during the fade
      music.elements.forEach((element, i) => {
        element.volume = this._musicVolume(music.mix[i] * fromFade * (1 - k) ** 2);
      });
      if (k >= 1) this._finishMusicFadeOut();
    };
    this.musicFadeOut = { elements: music.elements, timer: setInterval(step, 40) };
  }

  _finishMusicFadeOut() {
    if (!this.musicFadeOut) return;
    clearInterval(this.musicFadeOut.timer);
    this._releaseMusic(this.musicFadeOut.elements);
    this.musicFadeOut = null;
  }

  _releaseMusic(elements) {
    for (const element of elements) {
      element.onended = null;
      element.pause();
      element.removeAttribute('src');
      element.load();
    }
  }

  // Fade out over the last seconds of the session (music loops, so it's
  // always still playing when the session ends)
  updateMusicFade(sessionRemaining) {
    if (!this.music && !this.breath) return;
    this.musicFade = Math.min(1, Math.max(0, sessionRemaining / AudioService.MUSIC_FADE_SECONDS));
    this._applyMusicVolume();
  }

  // An element's volume for a share of the music (0–1)
  _musicVolume(share) {
    return Math.min(1, Math.max(0, this._masterLevel() * this.levels.music * share));
  }

  _applyMusicVolume() {
    this._applyBreathVolume();
    const music = this.music;
    if (!music) return;
    music.elements.forEach((element, i) => {
      element.volume = this._musicVolume(music.mix[i] * this.musicFade);
    });
  }

  // ---------- Sounds that follow the breath (breathSounds.js) ----------
  // Chosen like music, and controlled the same way (pause, fade at the end,
  // the music level); the session tells them each phase with breathPhase().
  _startBreathSound(type) {
    this.initialize();
    const output = this.audioContext.createGain();
    output.gain.value = 0;
    output.connect(this.masterGain);
    const voice = createBreathVoice(type, this.audioContext, output);
    this.breath = { voice, output, paused: false, target: null };
    if (this.breathPlan) voice.follow([this.breathPlan]);
    this.musicFade = 1;
    this._applyBreathVolume(0.7); // fades in over a couple of seconds
  }

  // A phase starts (or continues, after a pause): its type ('inhale', …), and
  // the lung level going from `from` to `to` (0–1) over `duration` seconds,
  // `elapsed` of them already gone
  breathPhase(type, from, to, duration, elapsed = 0) {
    if (!this.audioContext) return;
    this.breathPlan = { type, from, to, duration, start: this.audioContext.currentTime - elapsed };
    this.breath?.voice.follow([this.breathPlan]);
  }

  _stopBreathSound(fadeSeconds) {
    const breath = this.breath;
    if (!breath) return;
    this.breath = null;
    this.breathPlan = null;
    const now = this.audioContext.currentTime;
    breath.output.gain.cancelScheduledValues(0);
    breath.output.gain.setValueAtTime(breath.output.gain.value, now);
    breath.output.gain.linearRampToValueAtTime(0, now + Math.max(0.05, fadeSeconds));
    breath.voice.stop(now + Math.max(0.05, fadeSeconds) + 0.1);
  }

  // timeConstant: how quickly it follows (seconds); silent while paused
  _applyBreathVolume(timeConstant = 0.08) {
    const breath = this.breath;
    if (!breath) return;
    const target = breath.paused ? 0 : this.levels.music * this.musicFade;
    if (breath.target !== null && Math.abs(target - breath.target) < 0.002) return;
    breath.target = target;
    breath.output.gain.setTargetAtTime(target, this.audioContext.currentTime, timeConstant);
  }

  // Settings: a few sample breaths (in 4 s, out 6 s); onEnd when they're over
  previewBreathSound(type, onEnd) {
    this.stopBreathPreview();
    this.unlock();
    const ctx = this.audioContext;
    const output = ctx.createGain();
    output.gain.value = 0;
    output.connect(this.masterGain);
    const voice = createBreathVoice(type, ctx, output);
    let start = ctx.currentTime + 0.1;
    voice.follow(PREVIEW_BREATHS.map((breath) => {
      const segment = { ...breath, start };
      start += breath.duration;
      return segment;
    }));
    const total = start - ctx.currentTime;
    output.gain.setTargetAtTime(this.levels.music, ctx.currentTime, 0.3);
    output.gain.setTargetAtTime(0, ctx.currentTime + total - 1.2, 0.3);
    const timer = setTimeout(() => {
      this.stopBreathPreview();
      onEnd?.();
    }, total * 1000);
    this.breathPreview = { voice, output, timer };
  }

  stopBreathPreview() {
    const preview = this.breathPreview;
    if (!preview) return;
    this.breathPreview = null;
    clearTimeout(preview.timer);
    const now = this.audioContext.currentTime;
    preview.output.gain.cancelScheduledValues(0);
    preview.output.gain.setValueAtTime(preview.output.gain.value, now);
    preview.output.gain.linearRampToValueAtTime(0, now + 0.3);
    preview.voice.stop(now + 0.4);
  }

  // Pre-generate a short white noise buffer reused for every tick
  _createNoiseBuffer() {
    const sampleRate = this.audioContext.sampleRate;
    const length = Math.floor(sampleRate * 0.03); // 30ms
    const buffer = this.audioContext.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  // bells: { set, custom } (see bellSounds.js). resolveSoundUrl(ref) gives a
  // playable URL for a custom bell's sound reference.
  setBells(bells, resolveSoundUrl) {
    this.bells = bells;
    this.decodedSounds.clear(); // an imported file may have been replaced
    this.resolveSoundUrl = resolveSoundUrl;
    this._loadCustomBells();
  }

  // Decode the custom bells that are sound files (once the audio context
  // exists; generated ones need nothing); a newer call wins
  async _loadCustomBells() {
    const loadId = ++this.customLoadId;
    this.customBuffers = {};
    if (!this.audioContext || this.bells.set !== 'custom' || !this.resolveSoundUrl) return;
    const buffers = {};
    for (const phaseType of BELL_PHASES) {
      const ref = this.bells.custom?.[phaseType];
      if (!ref || parseGeneratedBellRef(ref)) continue;
      try {
        if (!this.decodedSounds.has(ref)) {
          const url = await this.resolveSoundUrl(ref);
          if (!url) continue; // e.g. not synced to this device yet
          const data = await (await fetch(url)).arrayBuffer();
          this.decodedSounds.set(ref, await this.audioContext.decodeAudioData(data));
        }
        buffers[phaseType] = this.decodedSounds.get(ref);
      } catch (e) {
        console.warn(`Failed to load the bell sound ${ref}:`, e);
      }
    }
    if (loadId === this.customLoadId) this.customBuffers = buffers;
  }

  _trackBellNode(node) {
    node.onended = () => {
      this.bellNodes = this.bellNodes.filter((other) => other !== node);
    };
    this.bellNodes.push(node);
  }

  // Schedule the phase's bell at a time offset from now. maxSeconds: how long
  // the phase lasts — a custom sound fades out by then (and after at most
  // CUSTOM_BELL_MAX_SECONDS); the other bells are short and ring out.
  scheduleBell(phaseType, offset = 0, maxSeconds = Infinity) {
    const { set } = this.bells;
    const time = this.audioContext.currentTime + offset;

    // A generated set, or a custom bell that picked a generated one
    const generated = GENERATED_BELL_SETS.includes(set) ? { set, phaseType }
      : set === 'custom' ? parseGeneratedBellRef(this.bells.custom?.[phaseType])
        : null;
    if (generated) {
      playGeneratedBell(generated.set, this.audioContext, this.bellGain, time, generated.phaseType, this.noiseBuffer)
        .forEach((node) => this._trackBellNode(node));
      return;
    }

    const buffer = set === 'custom' ? this.customBuffers[phaseType] : null; // null: 'none'
    if (!buffer) return;

    // An imported sound: fades out by the end of the phase, and after at most
    // CUSTOM_BELL_MAX_SECONDS
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    const length = Math.min(CUSTOM_BELL_MAX_SECONDS, maxSeconds);
    const fadeSeconds = Math.min(0.4, length / 2);
    const fade = this.audioContext.createGain();
    fade.gain.setValueAtTime(1, time + length - fadeSeconds);
    fade.gain.linearRampToValueAtTime(0, time + length);
    source.connect(fade);
    fade.connect(this.bellGain);
    source.start(time);
    source.stop(time + length + 0.05);
    this._trackBellNode(source);
  }

  // Schedule a mechanical watch tick at a given time offset from now
  scheduleTick(offset) {
    const now = this.audioContext.currentTime;
    const t = now + offset;

    // Click layer: bandpass-filtered noise burst (the sharp "tick" transient)
    const noise = this.audioContext.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const clickFilter = this.audioContext.createBiquadFilter();
    clickFilter.type = 'bandpass';
    clickFilter.frequency.setValueAtTime(3500, t);
    clickFilter.Q.setValueAtTime(1.2, t);

    const clickGain = this.audioContext.createGain();
    clickGain.gain.setValueAtTime(0.5, t);
    clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.018);

    noise.connect(clickFilter);
    clickFilter.connect(clickGain);
    clickGain.connect(this.tickGain);
    noise.start(t);
    noise.stop(t + 0.03);

    // Body layer: short low-mid sine for mechanical "weight"
    const thud = this.audioContext.createOscillator();
    thud.type = 'sine';
    thud.frequency.setValueAtTime(180, t);

    const thudGain = this.audioContext.createGain();
    thudGain.gain.setValueAtTime(0.04, t);
    thudGain.gain.exponentialRampToValueAtTime(0.001, t + 0.025);

    thud.connect(thudGain);
    thudGain.connect(this.tickGain);
    thud.start(t);
    thud.stop(t + 0.03);

    this.tickNodes.push(noise, thud);
  }

  // Play a phase bell then watch ticks every second for the phase duration
  // Previous ticks are cleared, but a previous bell is left to ring out.
  // elapsed: seconds of the phase already gone (resuming, or a late start); the
  // ticks stay on the phase's own seconds. bell: false leaves the bell out.
  playTone(phaseType, duration, { elapsed = 0, bell = true } = {}) {
    this._stopNodes(this.tickNodes);
    this.tickNodes = [];
    this.initialize();
    this._startKeepAlive();

    if (bell) this.scheduleBell(phaseType, 0, Math.max(0.1, duration - elapsed));
    for (let i = Math.floor(elapsed) + 1; i < duration; i++) {
      this.scheduleTick(i - elapsed);
    }

    this.isPlaying = true;
  }

  // ---------- Previews (Settings) — call from a click ----------
  previewBell(phaseType = 'inhale') {
    this.unlock();
    this.scheduleBell(phaseType, 0);
  }

  // When an exercise ends (at the bells' level)
  playClosing() {
    this.initialize();
    playClosingChime(this.audioContext, this.bellGain, this.audioContext.currentTime + 0.05)
      .forEach((node) => this._trackBellNode(node));
  }

  // All four phases' bells, one after another
  previewBellSet(spacing = 1.4) {
    this.unlock();
    BELL_PHASES.forEach((phaseType, i) => this.scheduleBell(phaseType, i * spacing, spacing));
  }

  previewTicks(count = 4) {
    this.unlock();
    for (let i = 0; i < count; i++) {
      this.scheduleTick(i);
    }
  }

  // Stops the ticks; a bell already ringing is left to ring out
  stop() {
    this._stopNodes(this.tickNodes);
    this.tickNodes = [];
    this.isPlaying = false;
    this._stopKeepAlive();
  }

  // The Linux webview (WebKitGTK) stops rendering Web Audio while nothing is
  // sounding at that moment, and sounds scheduled for later then never play:
  // the ticks fell silent once a short phase bell had rung out. A constant
  // signal far below hearing (about -100 dB) keeps it rendering for the session.
  _startKeepAlive() {
    if (this.keepAlive) return;
    const ctx = this.audioContext;
    let source;
    if (ctx.createConstantSource) {
      source = ctx.createConstantSource();
      source.offset.value = 1e-5;
      source.connect(ctx.destination);
    } else {
      source = ctx.createOscillator();
      const quiet = ctx.createGain();
      quiet.gain.value = 1e-5;
      source.connect(quiet);
      quiet.connect(ctx.destination);
    }
    source.start();
    this.keepAlive = source;
  }

  _stopKeepAlive() {
    if (!this.keepAlive) return;
    try {
      this.keepAlive.stop();
    } catch (e) {
      // already stopped
    }
    this.keepAlive.disconnect();
    this.keepAlive = null;
  }

  _stopNodes(nodes) {
    nodes.forEach((node) => {
      try {
        node.stop();
      } catch (e) {
        // Node may already be stopped
      }
    });
  }
}

// One audio service for the whole app: sessions and Settings previews share it,
// so a level changed in Settings applies right away, even mid-session
export const audio = new AudioService();
