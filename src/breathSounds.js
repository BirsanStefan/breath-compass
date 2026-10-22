// ==================== SOUNDS THAT FOLLOW THE BREATH ====================
// Generated textures, chosen like music ("breath:ocean"), that rise as you
// breathe in and settle as you breathe out, following the lung level the
// circle shows (0 empty – 1 full, see session/breath.js). Each phase also has
// its own sound (a chord, a layer), so a phase change is heard at once, even
// without the bells and ticks.
//
// A texture is a set of Web Audio nodes plus "targets": parameters (a filter's
// cutoff, a layer's volume) and how each maps a lung level to a value. The
// voice schedules every target along the planned breath, ahead of time.
import { lerp } from './session/breath';

export const BREATH_SOUNDS = ['ocean', 'pad'];

const REF_PREFIX = 'breath:';
export const breathSoundRef = (type) => REF_PREFIX + type;
export const parseBreathSoundRef = (ref) => {
  if (typeof ref !== 'string' || !ref.startsWith(REF_PREFIX)) return null;
  const type = ref.slice(REF_PREFIX.length);
  return BREATH_SOUNDS.includes(type) ? type : null;
};
export const BREATH_SOUND_REFS = BREATH_SOUNDS.map(breathSoundRef);

// From one level to another, exponentially (how pitch and brightness are heard)
const expMap = (low, high) => (level) => low * (high / low) ** level;

// ---------- Noise (made once per audio context) ----------
const NOISE_SECONDS = 12; // long enough that its repeats aren't heard
const noiseCache = new WeakMap();

const noiseBuffers = (ctx) => {
  if (noiseCache.has(ctx)) return noiseCache.get(ctx);
  const length = Math.floor(ctx.sampleRate * NOISE_SECONDS);
  const white = ctx.createBuffer(2, length, ctx.sampleRate);
  const brown = ctx.createBuffer(2, length, ctx.sampleRate);
  // Different noise left and right: a wide, natural stereo image
  for (let channel = 0; channel < 2; channel++) {
    const w = white.getChannelData(channel);
    const b = brown.getChannelData(channel);
    let last = 0;
    for (let i = 0; i < length; i++) {
      const value = Math.random() * 2 - 1;
      w[i] = value * 0.5;
      // Brown noise: white noise, integrated — the deep rumble of the sea
      last = (last + 0.02 * value) / 1.02;
      b[i] = last * 3.5;
    }
  }
  const buffers = { white, brown };
  noiseCache.set(ctx, buffers);
  return buffers;
};

const loopingNoise = (ctx, buffer) => {
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  return source;
};

// A slow wobble added to a parameter (`depth` either side of its value)
const lfo = (ctx, param, { rate, depth }) => {
  const osc = ctx.createOscillator();
  osc.frequency.value = rate;
  const gain = ctx.createGain();
  gain.gain.value = depth;
  osc.connect(gain);
  gain.connect(param);
  return osc;
};

// A layer that belongs to one phase: the voice turns it up during that phase
// and down in the others, crossfading at the boundary, so each phase has its
// own sound and a phase change is heard at once (not only the slow rise or fall)
const phaseLayer = (ctx, destination) => {
  const layer = ctx.createGain();
  layer.gain.value = 0;
  layer.connect(destination);
  return layer;
};

const fixedGain = (ctx, value, destination) => {
  const gain = ctx.createGain();
  gain.gain.value = value;
  gain.connect(destination);
  return gain;
};

const filter = (ctx, type, frequency, q, destination) => {
  const node = ctx.createBiquadFilter();
  node.type = type;
  node.frequency.value = frequency;
  node.Q.value = q;
  node.connect(destination);
  return node;
};

// ---------- Ocean breath ----------
// The wave itself, in every phase, rolls in and brightens with the lung level
// and draws back as it falls. Each phase adds its own sound:
//   inhale  — a soft rush of air as the wave gathers
//   hold    — spray at the crest: a high, fizzing shimmer
//   exhale  — water drawing back over sand: a hiss that fades with the breath
//   sustain — the quiet between waves: a deep rumble with a slow, faint pulse
const ocean = (ctx, output) => {
  const { white, brown } = noiseBuffers(ctx);
  const sources = [];
  const noise = (buffer, destination) => {
    const source = loopingNoise(ctx, buffer);
    source.connect(destination);
    sources.push(source);
  };

  const swell = fixedGain(ctx, 0, output);
  const lowpass = filter(ctx, 'lowpass', 240, 0.5, swell);
  noise(brown, lowpass);

  const layers = {
    inhale: phaseLayer(ctx, output),
    hold: phaseLayer(ctx, output),
    exhale: phaseLayer(ctx, output),
    sustain: phaseLayer(ctx, output)
  };

  const rush = fixedGain(ctx, 0, fixedGain(ctx, 0.5, layers.inhale));
  noise(white, filter(ctx, 'bandpass', 1100, 0.9, rush));

  const spray = fixedGain(ctx, 0.6, fixedGain(ctx, 0.22, layers.hold));
  noise(white, filter(ctx, 'highpass', 5200, 0.7, spray));
  sources.push(lfo(ctx, spray.gain, { rate: 6.5, depth: 0.35 })); // the fizz

  const hiss = fixedGain(ctx, 0, fixedGain(ctx, 0.4, layers.exhale));
  noise(white, filter(ctx, 'bandpass', 3400, 0.8, hiss));

  const pulse = fixedGain(ctx, 0.7, fixedGain(ctx, 0.3, layers.sustain));
  noise(brown, filter(ctx, 'lowpass', 150, 0.6, pulse));
  sources.push(lfo(ctx, pulse.gain, { rate: 0.3, depth: 0.15 }));

  sources.push(
    lfo(ctx, lowpass.frequency, { rate: 0.11, depth: 60 }),
    lfo(ctx, swell.gain, { rate: 0.07, depth: 0.05 })
  );
  return {
    sources,
    layers,
    targets: [
      { param: lowpass.frequency, map: expMap(240, 1700) },
      { param: swell.gain, map: (level) => 0.35 + 0.65 * level },
      { param: rush.gain, map: (level) => 0.3 + 0.7 * level },
      { param: hiss.gain, map: (level) => level }
    ],
    // Overall level, so it sits about as loud as the bundled music
    gain: 0.38
  };
};

// ---------- Breathing pad ----------
// A warm, soft pad with a chord for each phase — a chord change is heard at
// once, even softly — that opens up with the inhale (brighter, an octave above
// coming in) and settles back with the exhale:
//   inhale  — D add9: open, rising
//   hold    — D sus4: a suspended chord, held, a gentle tension
//   exhale  — G major 7: the release
//   sustain — a low open fifth: empty and still
const PAD_CHORDS = {
  inhale: [146.83, 220, 329.63, 369.99],
  hold: [146.83, 220, 293.66, 392],
  exhale: [98, 146.83, 246.94, 369.99],
  sustain: [73.42, 110, 146.83]
};
const PAD_PAN = [-0.5, 0.35, -0.2, 0.55];
const PAD_TOP = [587.33, 880]; // the octave that opens at the top of the breath

const pad = (ctx, output) => {
  const swell = fixedGain(ctx, 0, output);
  const lowpass = filter(ctx, 'lowpass', 380, 0.7, swell);
  const sources = [];

  const layers = {};
  for (const [phase, notes] of Object.entries(PAD_CHORDS)) {
    layers[phase] = phaseLayer(ctx, lowpass);
    notes.forEach((frequency, i) => {
      const panner = ctx.createStereoPanner();
      panner.pan.value = PAD_PAN[i];
      panner.connect(layers[phase]);
      // Two slightly detuned voices per note: the gentle movement of a pad
      for (const detune of [-7, 7]) {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = frequency;
        osc.detune.value = detune;
        osc.connect(fixedGain(ctx, 0.11, panner));
        sources.push(osc);
      }
    });
  }

  const top = fixedGain(ctx, 0, output);
  PAD_TOP.forEach((frequency, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = frequency;
    osc.detune.value = i ? 4 : -4;
    osc.connect(fixedGain(ctx, 0.12, top));
    sources.push(osc);
  });

  sources.push(lfo(ctx, lowpass.frequency, { rate: 0.09, depth: 70 }));
  return {
    sources,
    layers,
    targets: [
      { param: lowpass.frequency, map: expMap(380, 2300) },
      { param: swell.gain, map: (level) => 0.5 + 0.5 * level },
      { param: top.gain, map: (level) => level ** 1.5 }
    ],
    gain: 0.54
  };
};

const TEXTURES = { ocean, pad };

// ---------- The voice ----------
// A plan is a list of segments { type, from, to, start, duration } in
// audio-clock seconds: the phase type, and the lung level from start to end.
// Between and after them the level stays where the last one ended.

// Each move starts at once and eases into its target (the ear needs a clear
// start; the circle's ease-in-out would leave the first second almost still)
export const easeOutSine = (t) => Math.sin((t * Math.PI) / 2);

const segmentAt = (plan, time) => {
  for (const segment of plan) {
    if (time < segment.start + segment.duration) return segment;
  }
  return plan[plan.length - 1];
};

export const levelInPlan = (plan, time) => {
  if (plan.length === 0) return 0;
  const segment = segmentAt(plan, time);
  if (time <= segment.start) return segment.from;
  if (time >= segment.start + segment.duration) return segment.to;
  return lerp(segment.from, segment.to, easeOutSine((time - segment.start) / segment.duration));
};

// Points per second along an eased segment (ramps between them)
const STEPS_PER_SECOND = 8;
// How quickly a phase's layer comes in (and the others go): about 0.3 s
const LAYER_TIME_CONSTANT = 0.09;

// A playing texture. `destination` gets its sound; follow(plan) replaces the
// planned breath (from now on), hold() keeps the current level and phase.
export const createBreathVoice = (type, ctx, destination) => {
  const output = ctx.createGain();
  output.connect(destination);
  const texture = TEXTURES[type](ctx, output);
  output.gain.value = texture.gain;
  let plan = [];

  const schedule = () => {
    const now = ctx.currentTime;
    const level = levelInPlan(plan, now);
    const upcoming = plan.filter((segment) => segment.start + segment.duration > now);
    for (const { param, map } of texture.targets) {
      // Start over from the level now: an earlier plan is dropped entirely, so
      // a pause or a new phase never jumps
      param.cancelScheduledValues(0);
      param.setValueAtTime(map(level), now);
      for (const segment of upcoming) {
        const end = segment.start + segment.duration;
        const from = Math.max(segment.start, now);
        const steps = Math.max(1, Math.ceil((end - from) * STEPS_PER_SECOND));
        for (let i = 1; i <= steps; i++) {
          const time = from + ((end - from) * i) / steps;
          param.linearRampToValueAtTime(map(levelInPlan([segment], time)), time);
        }
      }
    }
    // Layers: the phase playing now, then each upcoming one at its start.
    // Changes already under way are kept (only later ones are replaced).
    const current = segmentAt(plan, now);
    for (const [phase, layer] of Object.entries(texture.layers)) {
      layer.gain.cancelScheduledValues(now);
      layer.gain.setTargetAtTime(current?.type === phase ? 1 : 0, now, LAYER_TIME_CONSTANT);
      for (const segment of upcoming) {
        if (segment.start <= now) continue;
        layer.gain.setTargetAtTime(segment.type === phase ? 1 : 0, segment.start, LAYER_TIME_CONSTANT);
      }
    }
  };

  const voice = {
    follow(newPlan) {
      plan = newPlan;
      schedule();
    },
    hold() {
      const now = ctx.currentTime;
      const level = levelInPlan(plan, now);
      plan = [{ type: segmentAt(plan, now)?.type ?? 'sustain', from: level, to: level, start: now, duration: 0 }];
      schedule();
    },
    level: () => levelInPlan(plan, ctx.currentTime),
    phase: () => segmentAt(plan, ctx.currentTime)?.type,
    stop(time = ctx.currentTime) {
      texture.sources.forEach((source) => source.stop(time));
      setTimeout(() => output.disconnect(), Math.max(0, (time - ctx.currentTime) * 1000) + 100);
    }
  };

  // At rest until the first phase
  voice.follow([{ type: 'sustain', from: 0, to: 0, start: ctx.currentTime, duration: 0 }]);
  texture.sources.forEach((source) => source.start());
  return voice;
};

// Sample breaths for the preview in Settings: every phase, twice through
export const PREVIEW_BREATHS = [
  { type: 'inhale', from: 0, to: 1, duration: 4 },
  { type: 'hold', from: 1, to: 1, duration: 2 },
  { type: 'exhale', from: 1, to: 0, duration: 5 },
  { type: 'sustain', from: 0, to: 0, duration: 2 },
  { type: 'inhale', from: 0, to: 1, duration: 4 },
  { type: 'hold', from: 1, to: 1, duration: 2 },
  { type: 'exhale', from: 1, to: 0, duration: 5 }
];
