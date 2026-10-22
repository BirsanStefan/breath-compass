// Phase bells: the sound at the start of each phase. One choice for every
// exercise, saved in settings.json as "bells": { set, custom }.
//   classic (Bells), chimes, bowl, wood — generated here with Web Audio
//   none — no bell
//   custom — a sound per phase: any generated bell (see generatedBellRef) or
//            an imported sound
export const BELL_SETS = ['classic', 'chimes', 'bowl', 'wood', 'none', 'custom'];
export const GENERATED_BELL_SETS = ['classic', 'chimes', 'bowl', 'wood'];
export const BELL_PHASES = ['inhale', 'hold', 'exhale', 'sustain'];

export const DEFAULT_BELLS = { set: 'classic', custom: {} };

// A generated bell as a custom bell's sound: "bell:<set>:<phase>", e.g.
// "bell:bowl:sustain" is the singing bowl's sustain pitch
const BELL_REF_PREFIX = 'bell:';
export const generatedBellRef = (set, phaseType) => `${BELL_REF_PREFIX}${set}:${phaseType}`;
export const parseGeneratedBellRef = (ref) => {
  if (typeof ref !== 'string' || !ref.startsWith(BELL_REF_PREFIX)) return null;
  const [set, phaseType] = ref.slice(BELL_REF_PREFIX.length).split(':');
  return GENERATED_BELL_SETS.includes(set) && BELL_PHASES.includes(phaseType) ? { set, phaseType } : null;
};

// Every generated bell, in the order Custom lists them
export const GENERATED_BELL_REFS = GENERATED_BELL_SETS.flatMap((set) =>
  BELL_PHASES.map((phaseType) => generatedBellRef(set, phaseType)));

// Earlier versions bundled the Bells set as mp3 files; a custom bell that
// picked one of them now gets the generated bell for that phase
const OLD_BELL_FILES = {
  'inhale.mp3': 'inhale', 'hold.mp3': 'hold', 'exhale.mp3': 'exhale', 'sustain.mp3': 'sustain'
};

export const bellSettings = (settings) => {
  const custom = { ...settings?.bells?.custom };
  for (const [phaseType, ref] of Object.entries(custom)) {
    if (OLD_BELL_FILES[ref]) custom[phaseType] = generatedBellRef('classic', OLD_BELL_FILES[ref]);
  }
  return { ...DEFAULT_BELLS, ...settings?.bells, custom };
};

// A custom sound longer than this fades out (bells overlap from phase to phase)
export const CUSTOM_BELL_MAX_SECONDS = 3;

// Pitch per phase (Hz): the top of the breath (hold) highest, the bottom
// (sustain) lowest, so the phases can be told apart with eyes closed
// (Bells: D5, G5, A4, D4 — the two low ones a fifth apart, so exhale and
// sustain don't sound alike)
const PITCH = {
  classic: { inhale: 587.3, hold: 784, exhale: 440, sustain: 293.7 },
  chimes: { inhale: 1046.5, hold: 1318.5, exhale: 784, sustain: 523.3 },
  bowl: { inhale: 392, hold: 523.3, exhale: 329.6, sustain: 261.6 },
  wood: { inhale: 1150, hold: 1450, exhale: 880, sustain: 700 }
};

// A sine with an exponential decay; returns the oscillator
const partial = (ctx, destination, time, { frequency, gain, attack, decay, detune = 0 }) => {
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(frequency, time);
  osc.detune.setValueAtTime(detune, time);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, time);
  env.gain.exponentialRampToValueAtTime(gain, time + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, time + attack + decay);
  osc.connect(env);
  env.connect(destination);
  osc.start(time);
  osc.stop(time + attack + decay + 0.05);
  return osc;
};

// A short filtered noise burst: the strike of a mallet or clapper
const strike = (ctx, destination, time, noiseBuffer, { frequency, q, gain, decay }) => {
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(frequency, time);
  filter.Q.setValueAtTime(q, time);
  const env = ctx.createGain();
  env.gain.setValueAtTime(gain, time);
  env.gain.exponentialRampToValueAtTime(0.0001, time + decay);
  source.connect(filter);
  filter.connect(env);
  env.connect(destination);
  source.start(time);
  source.stop(time + decay + 0.01);
  return source;
};

// Struck bell, with the partials of a tuned bell: the hum an octave below,
// the prime, a minor-third "tierce" (what makes a bell sound like a bell),
// the quint, the nominal an octave above and a few higher ones. The low
// partials ring longest, so the sound mellows as it fades; a second prime,
// slightly detuned, gives the slow shimmer of a real bell. About 3 seconds.
const bell = (ctx, destination, time, f, noiseBuffer) => [
  partial(ctx, destination, time, { frequency: f * 0.5, gain: 0.07, attack: 0.004, decay: 3.2 }),
  partial(ctx, destination, time, { frequency: f, gain: 0.17, attack: 0.002, decay: 2.8 }),
  partial(ctx, destination, time, { frequency: f, gain: 0.07, attack: 0.002, decay: 2.6, detune: 4 }),
  partial(ctx, destination, time, { frequency: f * 1.19, gain: 0.07, attack: 0.002, decay: 1.9 }),
  partial(ctx, destination, time, { frequency: f * 1.5, gain: 0.04, attack: 0.002, decay: 1.4 }),
  partial(ctx, destination, time, { frequency: f * 2, gain: 0.09, attack: 0.002, decay: 1.6 }),
  partial(ctx, destination, time, { frequency: f * 2.52, gain: 0.035, attack: 0.002, decay: 0.9 }),
  partial(ctx, destination, time, { frequency: f * 3.01, gain: 0.02, attack: 0.002, decay: 0.6 }),
  partial(ctx, destination, time, { frequency: f * 4.1, gain: 0.012, attack: 0.002, decay: 0.35 }),
  strike(ctx, destination, time, noiseBuffer, { frequency: f * 4, q: 1.5, gain: 0.06, decay: 0.025 })
];

// Bright metallic chime: inharmonic partials, a couple of seconds long
const chime = (ctx, destination, time, f) => [
  partial(ctx, destination, time, { frequency: f, gain: 0.32, attack: 0.004, decay: 2.2 }),
  partial(ctx, destination, time, { frequency: f * 2.76, gain: 0.09, attack: 0.004, decay: 1.2 }),
  partial(ctx, destination, time, { frequency: f * 5.4, gain: 0.035, attack: 0.004, decay: 0.6 })
];

// Singing bowl: low, soft attack, long ring; two slightly detuned fundamentals
// make the slow "beating" of a real bowl
const bowl = (ctx, destination, time, f) => [
  partial(ctx, destination, time, { frequency: f, gain: 0.26, attack: 0.03, decay: 4.5 }),
  partial(ctx, destination, time, { frequency: f, gain: 0.18, attack: 0.03, decay: 4.2, detune: 7 }),
  partial(ctx, destination, time, { frequency: f * 2.71, gain: 0.08, attack: 0.03, decay: 2.8 }),
  partial(ctx, destination, time, { frequency: f * 5.1, gain: 0.025, attack: 0.03, decay: 1.4 })
];

// Wood block: a short knock — a quickly falling tone plus a filtered click
const wood = (ctx, destination, time, f, noiseBuffer) => {
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(f, time);
  osc.frequency.exponentialRampToValueAtTime(f * 0.82, time + 0.08);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, time);
  env.gain.exponentialRampToValueAtTime(0.5, time + 0.002);
  env.gain.exponentialRampToValueAtTime(0.0001, time + 0.16);
  osc.connect(env);
  env.connect(destination);
  osc.start(time);
  osc.stop(time + 0.2);

  const click = ctx.createBufferSource();
  click.buffer = noiseBuffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(f * 2, time);
  filter.Q.setValueAtTime(3, time);
  const clickEnv = ctx.createGain();
  clickEnv.gain.setValueAtTime(0.25, time);
  clickEnv.gain.exponentialRampToValueAtTime(0.0001, time + 0.02);
  click.connect(filter);
  filter.connect(clickEnv);
  clickEnv.connect(destination);
  click.start(time);
  click.stop(time + 0.03);
  return [osc, click];
};

const SYNTHS = { classic: bell, chimes: chime, bowl, wood };

// Plays a generated bell at `time`; returns the nodes (so they can be stopped)
export const playGeneratedBell = (set, ctx, destination, time, phaseType, noiseBuffer) => {
  const pitches = PITCH[set];
  const frequency = pitches[phaseType] ?? pitches.sustain;
  return SYNTHS[set](ctx, destination, time, frequency, noiseBuffer);
};

// Closing chime when an exercise ends: three soft, rising bowl-like notes,
// unlike any phase bell. Returns the nodes.
export const playClosingChime = (ctx, destination, time) =>
  [523.3, 659.3, 784].flatMap((frequency, i) => {
    const start = time + i * 0.45;
    return [
      partial(ctx, destination, start, { frequency, gain: 0.2, attack: 0.02, decay: 3.2 }),
      partial(ctx, destination, start, { frequency, gain: 0.1, attack: 0.02, decay: 3, detune: 6 }),
      partial(ctx, destination, start, { frequency: frequency * 2.71, gain: 0.04, attack: 0.02, decay: 1.6 })
    ];
  });
