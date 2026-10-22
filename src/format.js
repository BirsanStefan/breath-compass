import { PHASE_TYPES } from './exerciseDraft';

// Display formatting for durations and phase ratios

// "9 min", "4 min 30 s", "45 s"
export const formatDuration = (totalSeconds) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds} s`;
  return seconds === 0 ? `${minutes} min` : `${minutes} min ${seconds} s`;
};

// Countdown clock: "9:00", "0:42", "1:05:00"
export const formatClock = (totalSeconds) => {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = String(seconds % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
};

// "Inhale 4 · Hold 7 · Exhale 8": each phase in order with its seconds;
// phaseName turns a phase type into its (translated) name
export const phaseSummary = (phases, phaseName) =>
  phases.map((phase) => `${phaseName(phase.type)} ${phase.duration}`).join(' · ');

const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));

// "1:0:4:0" (inhale : hold : exhale : sustain), from the phases' durations
export const phaseRatio = (phases) => {
  const totals = Object.fromEntries(PHASE_TYPES.map((type) => [type, 0]));
  phases.forEach((phase) => {
    if (phase.type in totals) totals[phase.type] += phase.duration;
  });
  const divisor = PHASE_TYPES.map((type) => totals[type]).filter(Boolean).reduce(gcd, 0) || 1;
  return PHASE_TYPES.map((type) => totals[type] / divisor).join(':');
};

// A name for each level of an exercise: its ratio ("1:0:4:0"), or, when the
// levels share a ratio (Square Breathing: 3 s, 4 s, 5 s each), its seconds ("4-4-4-4")
export const levelLabels = (levels) => {
  const ratios = levels.map(phaseRatio);
  if (new Set(ratios).size === ratios.length) return ratios;
  return levels.map((phases) => phases.map((phase) => phase.duration).join('-'));
};

// The levels' names, as keys under settings.levelNames: two levels are
// Gentle and Extended, three add Standard in between
export const levelNames = (count) =>
  (count === 2 ? ['gentle', 'extended'] : ['gentle', 'standard', 'extended']);
