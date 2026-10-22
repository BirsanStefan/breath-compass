// Shared by the breathing visuals (circle and line) and the session: phase
// colors, how full the lungs are over a cycle, and easing.

// On Stop and at the end the music fades out while the visual settles back to
// rest, over the same time (the CSS transitions on .settling match it)
export const SETTLE_SECONDS = 1.5;

export const KNOWN_PHASES = ['inhale', 'hold', 'exhale', 'sustain'];
export const phaseKey = (type) => (KNOWN_PHASES.includes(type) ? type : 'sustain');

export const lerp = (a, b, t) => a + (b - a) * t;
// Ease in-out so the circle starts and ends each breath softly
export const easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;

// The color for now: the current phase's (the first phase's when not
// breathing), as --phase-color, read by --circle-color. One color at a time,
// so it always means its phase; CSS crossfades it when the phase changes.
export const phaseColorVars = (phases, phaseIndex, breathing) => ({
  '--phase-color': `var(--phase-${phaseKey((breathing ? phases[phaseIndex] : phases[0]).type)})`
});

// How full the lungs are (0–1) at the start and end of each phase. An inhale
// ends at the top and an exhale at the bottom; hold and sustain keep the level
// they start at. Inhales in a row share the climb by their durations (and
// exhales the fall): a cyclic sigh's in 3 s + in 1 s fills to 75%, then tops up.
export const phaseLevels = (phases, start) => {
  const levels = [];
  let level = start;
  for (let i = 0; i < phases.length; i++) {
    const { type } = phases[i];
    if (type !== 'inhale' && type !== 'exhale') {
      levels.push([level, level]);
      continue;
    }
    // The run of phases of this type starting here
    let end = i;
    while (end + 1 < phases.length && phases[end + 1].type === type) end++;
    const run = phases.slice(i, end + 1);
    const total = run.reduce((sum, phase) => sum + phase.duration, 0);
    const from = level;
    const target = type === 'inhale' ? 1 : 0;
    let elapsed = 0;
    for (const phase of run) {
      const before = level;
      elapsed += phase.duration;
      level = total > 0 ? from + (target - from) * (elapsed / total) : target;
      levels.push([before, level]);
    }
    level = target; // exactly, whatever the rounding
    levels[levels.length - 1][1] = target;
    i = end;
  }
  return levels;
};

export const cycleLevels = (phases) => {
  // Start each cycle at the level the previous one ends at
  const first = phaseLevels(phases, 0);
  return phaseLevels(phases, first[first.length - 1][1]);
};

// One cycle as line segments, the way the line view draws it: start and end
// as a fraction of the cycle (0–1, each phase as wide as it is long), and the
// lung level (0–1) at each end
export const cycleSegments = (phases) => {
  const total = phases.reduce((sum, phase) => sum + phase.duration, 0);
  const levels = cycleLevels(phases);
  let elapsed = 0;
  return phases.map((phase, i) => {
    const start = elapsed / total;
    elapsed += phase.duration;
    return { phase, start, end: elapsed / total, from: levels[i][0], to: levels[i][1] };
  });
};
