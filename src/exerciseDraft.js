// Pure helpers for the exercise editor (no React, no storage).
// The editor works on a draft: text fields as typed, numbers as strings.
// It only becomes a real exercise (validated) on Save.

export const PHASE_TYPES = ['inhale', 'hold', 'exhale', 'sustain'];

export const LIMITS = {
  cycles: { min: 1, max: 999 },
  duration: { min: 1, max: 600 },
  preparationTime: { min: 0, max: 60 },
  minutes: { min: 1, max: 240 }
};

export const parseIntInRange = (value, { min, max }) => {
  if (String(value).trim() === '') return null; // Number('') would be 0
  const n = Number(value);
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
};

export const exerciseSeconds = (exercise) =>
  exercise.cycles * exercise.phases.reduce((sum, phase) => sum + phase.duration, 0);

export const cycleSeconds = (phases) => phases.reduce((sum, phase) => sum + phase.duration, 0);

// The number of cycles closest to a session of `minutes`
export const cyclesForMinutes = (phases, minutes) =>
  Math.min(LIMITS.cycles.max, Math.max(LIMITS.cycles.min, Math.round((minutes * 60) / cycleSeconds(phases))));

export const toDraft = (exercise, exerciseText) => ({
  id: exercise.id,
  name: exerciseText(exercise, 'name'),
  description: exerciseText(exercise, 'description'),
  cycles: String(exercise.cycles),
  backgroundSound: exercise.backgroundSound || '',
  phases: exercise.phases.map((phase) => ({ type: phase.type, duration: String(phase.duration) })),
  // A built-in's chosen level (see exerciseLevels); undefined without levels
  level: exercise.level
});

// The draft at another level: its phases, and the cycles for the same length
export const withLevel = (draft, level, levels) => {
  const phases = levels[level];
  const current = draft.phases.map((phase) => ({ type: phase.type, duration: Number(phase.duration) }));
  const minutes = Number(draft.cycles) * cycleSeconds(current) / 60;
  const cycles = Number.isFinite(minutes) && minutes > 0 ? cyclesForMinutes(phases, minutes) : Number(draft.cycles);
  return {
    ...draft,
    level,
    cycles: String(cycles),
    phases: phases.map((phase) => ({ type: phase.type, duration: String(phase.duration) }))
  };
};

// Returns { exercise } or { errors } (error keys under settings.errors).
// `original` is the saved exercise (null for a new one).
export const fromDraft = (draft, original, exerciseText) => {
  const errors = [];
  const name = draft.name.trim();
  const cycles = parseIntInRange(draft.cycles, LIMITS.cycles);
  const phases = draft.phases.map((phase) => ({
    type: phase.type,
    duration: parseIntInRange(phase.duration, LIMITS.duration)
  }));

  if (!name) errors.push('nameRequired');
  if (cycles === null) errors.push('cyclesInvalid');
  if (phases.length === 0) errors.push('phasesRequired');
  if (phases.some((phase) => phase.duration === null)) errors.push('durationInvalid');
  if (errors.length > 0) return { errors };

  // Untouched text of a built-in exercise keeps its original value, so it stays translated
  const keepIfUnchanged = (field, value) =>
    original && value === exerciseText(original, field) ? original[field] : value;

  const exercise = {
    ...original,
    id: draft.id,
    name: keepIfUnchanged('name', name),
    description: keepIfUnchanged('description', draft.description.trim()),
    cycles,
    phases
  };
  if (draft.backgroundSound) exercise.backgroundSound = draft.backgroundSound;
  else delete exercise.backgroundSound;
  if (draft.level !== undefined) exercise.level = draft.level;
  else delete exercise.level;

  return { exercise };
};

export const moveItem = (list, index, offset) => {
  const target = index + offset;
  if (target < 0 || target >= list.length) return list;
  const copy = [...list];
  [copy[index], copy[target]] = [copy[target], copy[index]];
  return copy;
};
