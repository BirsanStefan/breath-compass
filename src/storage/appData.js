// Loading and saving the app's settings and exercises on top of a storage backend.
// The bundled JSON files are only defaults: exercises are copied into the data
// folder on first run, and from then on the data folder is the source of truth.
import defaultSettings from '../data/settings.json';
import defaultExercisesData from '../data/exercises.json';
import { lookup, resolveLocale } from '../locales';

const FORMAT_VERSION = 1;

const DEVICE_FILE = 'device.json';
const SETTINGS_FILE = 'settings.json';
const EXERCISES_FILE = 'exercises.json';

const DEFAULT_DEVICE = { volume: 1 };

// Sessions shorter than this aren't recorded (a quick start-and-stop)
export const MIN_SESSION_SECONDS = 60;

// Random id; crypto.randomUUID is missing on plain-http pages, so build it by hand
const randomHex = (bytes) =>
  Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (b) => b.toString(16).padStart(2, '0')).join('');

const newId = () => {
  const h = randomHex(16);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
};

// The built-ins as the app defines them (with their category and levels), and
// as they're stored in the data folder (without: those always come from the app)
const builtInExercises = defaultExercisesData.exercises;
const storedForm = ({ category, levels, ...exercise }) => exercise;
export const defaultExercises = builtInExercises.map(storedForm);

// ---------- Built-in exercises ----------
// The built-in exercises are fixed: their name, description and phases always
// come from the app (so "Clear Mind" means the same everywhere, stays
// translated, and gets improvements in app updates). Only these can change;
// for anything else, duplicate the exercise.
const BUILT_IN_EDITABLE = ['cycles', 'backgroundSound', 'hidden', 'level'];

const builtInById = new Map(builtInExercises.map((exercise) => [exercise.id, exercise]));
export const isBuiltIn = (exercise) => builtInById.has(exercise?.id);

// ---------- Categories, levels, badges ----------
// Built-ins are "beginner" (no holds) or "advanced" (with breath holds; shown
// only once you turn them on in Settings → Exercises). Your own are "custom",
// always shown (each can be hidden on its own).
export const exerciseCategory = (exercise) => builtInById.get(exercise?.id)?.category ?? 'custom';

// Shown in the exercise list and the name strip?
export const isShown = (exercise, settings) =>
  !exercise.hidden && (exerciseCategory(exercise) !== 'advanced' || Boolean(settings?.showAdvanced));

// An advanced built-in comes in levels: the same pattern with longer holds or
// exhales, e.g. Clear Mind 1:0:3:0, 1:0:4:0, 1:0:5:0. The level is yours to
// choose (like the length and music); null for exercises without levels.
export const exerciseLevels = (exercise) => builtInById.get(exercise?.id)?.levels ?? null;

// The level to start with (marked in the editor): the built-in's default
export const suggestedLevel = (exercise) => builtInById.get(exercise?.id)?.level ?? 0;

// The stored level, if valid; else the level the stored phases match (data from
// before levels existed keeps its pattern); else the built-in's default
const levelFor = (stored, builtIn) => {
  const { levels } = builtIn;
  if (Number.isInteger(stored.level) && stored.level >= 0 && stored.level < levels.length) return stored.level;
  const matching = levels.findIndex((phases) => JSON.stringify(phases) === JSON.stringify(stored.phases));
  return matching >= 0 ? matching : builtIn.level;
};

// Labels for an exercise in lists ("Advanced", "Custom", "Hidden"), as keys
// under badges.* in the locales. Beginner is the default and gets none. Add new
// ones here.
export const exerciseBadges = (exercise) => {
  const badges = [];
  const category = exerciseCategory(exercise);
  if (category !== 'beginner') badges.push(category);
  if (exercise.hidden) badges.push('hidden');
  return badges;
};

// A built-in exercise's name or description in `locale`; undefined for your own
export const builtInText = (exercise, field, locale) => {
  const builtIn = builtInById.get(exercise?.id);
  if (!builtIn || (field !== 'name' && field !== 'description')) return undefined;
  const group = field === 'name' ? 'names' : 'descriptions';
  return lookup(`exercises.${group}.${builtIn.id}`, locale) ?? builtIn[field];
};

// exercises.json format: 2 = built-ins are fixed (and can be hidden, not deleted)
const EXERCISES_FORMAT_VERSION = 2;

// Music that earlier versions bundled and this one doesn't (its license didn't
// allow sharing it). A built-in exercise that still names one gets its new
// default music; your own exercises lose it (pick other music in Settings).
const REMOVED_SOUNDS = ['clear-mind.mp3', 'harmony.mp3', 'power.mp3', 'relax.mp3'];

const withoutRemovedSound = (exercise, builtIn) => {
  if (!REMOVED_SOUNDS.includes(exercise.backgroundSound)) return exercise;
  const { backgroundSound, ...rest } = exercise;
  return builtIn?.backgroundSound ? { ...rest, backgroundSound: builtIn.backgroundSound } : rest;
};

// Phases count as unchanged if they match any of the built-in's levels
const changedFromBuiltIn = (stored, builtIn) =>
  stored.name !== builtIn.name
  || stored.description !== builtIn.description
  || !(builtIn.levels ?? [builtIn.phases]).some((phases) => JSON.stringify(phases) === JSON.stringify(stored.phases));

// The stored list, with each built-in's fixed parts taken from the app.
// From an older file (version 1, when built-ins could be edited and deleted):
// a changed built-in becomes your own copy, "Clear Mind (edited)", next to the
// original; a deleted one comes back hidden. Built-ins missing from a newer
// file are new in this app version, and are added at the end.
const withBuiltIns = (stored, version, locale) => {
  const upgrading = version < EXERCISES_FORMAT_VERSION;
  const exercises = [];
  for (const storedExercise of stored) {
    const builtIn = builtInById.get(storedExercise.id);
    const exercise = withoutRemovedSound(storedExercise, builtIn);
    if (!builtIn) {
      exercises.push(exercise);
      continue;
    }
    if (upgrading && changedFromBuiltIn(exercise, builtIn)) {
      const name = exercise.name === builtIn.name ? builtInText(builtIn, 'name', locale) : exercise.name;
      const description = exercise.description === builtIn.description
        ? builtInText(builtIn, 'description', locale)
        : exercise.description;
      exercises.push({
        ...exercise,
        id: newExerciseId(),
        name: (lookup('settings.editedName', locale) ?? '{name}').replace('{name}', name),
        description
      });
    }
    const editable = Object.fromEntries(
      BUILT_IN_EDITABLE.filter((field) => field in exercise).map((field) => [field, exercise[field]])
    );
    const resolved = { ...storedForm(builtIn), backgroundSound: undefined, ...editable };
    if (builtIn.levels) {
      resolved.level = levelFor(exercise, builtIn);
      resolved.phases = builtIn.levels[resolved.level];
    }
    exercises.push(resolved);
  }
  for (const builtIn of defaultExercises) {
    if (!exercises.some((exercise) => exercise.id === builtIn.id)) {
      exercises.push(upgrading ? { ...builtIn, hidden: true } : builtIn);
    }
  }
  // No empty fields (a built-in without music stays without)
  return exercises.map((exercise) => JSON.parse(JSON.stringify(exercise)));
};

export const newExerciseId = () => `custom-${Date.now().toString(36)}-${randomHex(2)}`;

// Read a file, falling back to null if it's missing or unreadable.
// An unreadable file is reported and left untouched on disk.
const readSafely = async (store, name) => {
  try {
    return { value: await store.readJson(name), ok: true };
  } catch (e) {
    console.warn(`Could not read ${name}, using defaults:`, e);
    return { value: null, ok: false };
  }
};

const readDevice = async (backend) => {
  const { value } = await readSafely(backend.device, DEVICE_FILE);
  const device = { ...DEFAULT_DEVICE, ...value };

  // Each device gets a permanent id; it names this device's session file
  if (!device.deviceId) {
    device.deviceId = `${backend.kind === 'tauri' ? 'desktop' : 'web'}-${randomHex(4)}`;
    await saveDevice(backend, device).catch((e) => console.warn('Could not save device id:', e));
  }
  return device;
};

const readSettings = async (backend) => {
  const { value } = await readSafely(backend.data, SETTINGS_FILE);
  const { version, ...stored } = value || {};
  return { ...defaultSettings, ...stored };
};

const readExercises = async (backend, settings) => {
  const { value, ok } = await readSafely(backend.data, EXERCISES_FILE);
  const stored = value?.exercises;
  if (Array.isArray(stored) && stored.length > 0) {
    const version = value.version ?? 1;
    const exercises = withBuiltIns(stored, version, resolveLocale(settings.locale));
    if (version < EXERCISES_FORMAT_VERSION) {
      await saveExercises(backend, exercises).catch((e) => console.warn('Could not save the updated exercises:', e));
    }
    return exercises;
  }

  // First run: seed the data folder with the built-in exercises
  if (ok && value === null) {
    await saveExercises(backend, defaultExercises);
  }
  return defaultExercises;
};

const sessionsFile = (deviceId) => `sessions/${deviceId}.jsonl`;

// ---------- Imported sounds (desktop only) ----------
// Stored in the data folder's sounds/ subfolder, so they sync with everything else.
// An exercise refers to one as "user:<file name>"; bundled sounds use the plain file name.
export const USER_SOUND_PREFIX = 'user:';
export const AUDIO_EXTENSIONS = ['mp3', 'm4a', 'ogg', 'wav', 'flac'];
const SOUNDS_FOLDER = 'sounds';

const extensionOf = (name) => name.split('.').pop().toLowerCase();

// Sync-tool leftovers (Syncthing conflict copies, temp files) are never real files
const isSyncLeftover = (name) =>
  name.startsWith('.') || name.startsWith('~') || name.includes('.sync-conflict-') || name.endsWith('.tmp');

const isUserSoundFile = (name) => !isSyncLeftover(name) && AUDIO_EXTENSIONS.includes(extensionOf(name));

const supportsUserSounds = (backend) => Boolean(backend.data.readBinary);

export const listUserSounds = async (backend) =>
  supportsUserSounds(backend)
    ? (await backend.data.listFiles(SOUNDS_FOLDER)).filter(isUserSoundFile).sort((a, b) => a.localeCompare(b))
    : [];

// "rain.mp3" -> "rain (2).mp3" if "rain.mp3" is taken
const uniqueName = (name, taken) => {
  if (!taken.includes(name)) return name;
  const dot = name.lastIndexOf('.');
  const base = name.slice(0, dot);
  const ext = name.slice(dot);
  let n = 2;
  while (taken.includes(`${base} (${n})${ext}`)) n++;
  return `${base} (${n})${ext}`;
};

// Asks for a file and copies it in; returns the stored file name, or null if cancelled
export const importUserSound = async (backend) => {
  const picked = await backend.pickAudioFile(AUDIO_EXTENSIONS);
  if (!picked) return null;
  // Hidden (dot) names would be skipped by the file listing and by sync tools
  const cleaned = picked.name.replace(/^[.\s]+/, '') || `sound.${extensionOf(picked.name)}`;
  const name = uniqueName(cleaned, await listUserSounds(backend));
  await backend.data.writeBinary(`${SOUNDS_FOLDER}/${name}`, picked.bytes);
  return name;
};

export const deleteUserSound = (backend, name) => backend.data.remove(`${SOUNDS_FOLDER}/${name}`);

export const readUserSound = (backend, name) => backend.data.readBinary(`${SOUNDS_FOLDER}/${name}`);

// One session per line; unreadable lines (e.g. cut off mid-sync) are skipped
const parseSessionLines = (text) =>
  text.split('\n').flatMap((line) => {
    if (!line.trim()) return [];
    try {
      return [JSON.parse(line)];
    } catch (e) {
      return [];
    }
  });

// Point backend.data at the device's chosen folder. If that folder is gone
// (deleted, or a drive that isn't mounted), stay on the default folder for
// this run rather than creating files in the wrong place.
const openConfiguredFolder = async (backend, device) => {
  if (!device.dataFolder || !backend.openDataFolder) return { dataFolderMissing: false };
  if (!(await backend.folderExists(device.dataFolder))) {
    console.warn(`Data folder not found, using the default: ${device.dataFolder}`);
    return { dataFolderMissing: true };
  }
  backend.data = await backend.openDataFolder(device.dataFolder);
  return { dataFolderMissing: false };
};

export const loadAppData = async (backend) => {
  const device = await readDevice(backend);
  const { dataFolderMissing } = await openConfiguredFolder(backend, device);
  const settings = await readSettings(backend);
  return {
    device,
    dataFolderMissing,
    settings,
    exercises: await readExercises(backend, settings),
    userSounds: await listUserSounds(backend)
  };
};

// Switch to another data folder (null = the default one).
// Files the new folder doesn't have yet are copied over from the current one;
// nothing that already exists there is overwritten. So pointing a second
// device at an already-synced folder picks up the data that's there, and
// pointing the first device at an empty folder brings its data along.
export const switchDataFolder = async (backend, device, folder) => {
  const target = await backend.openDataFolder(folder ?? backend.defaultDataFolder);
  const source = backend.data;
  const found = (await target.readText(EXERCISES_FILE)) !== null;
  let copied = 0;

  if (target.location !== source.location) {
    for (const name of [SETTINGS_FILE, EXERCISES_FILE]) {
      if ((await target.readText(name)) !== null) continue;
      const text = await source.readText(name);
      if (text === null) continue;
      await target.writeText(name, text);
      copied++;
    }

    // Imported sounds the new folder doesn't have yet
    if (source.readBinary && target.readBinary) {
      const present = await target.listFiles(SOUNDS_FOLDER);
      for (const name of (await source.listFiles(SOUNDS_FOLDER)).filter(isUserSoundFile)) {
        if (present.includes(name)) continue;
        await target.writeBinary(`${SOUNDS_FOLDER}/${name}`, await source.readBinary(`${SOUNDS_FOLDER}/${name}`));
        copied++;
      }
    }

    // This device's sessions are merged (by id), so switching back and forth
    // between folders never leaves sessions behind
    const name = sessionsFile(device.deviceId);
    const sourceText = await source.readText(name);
    if (sourceText !== null) {
      const targetText = (await target.readText(name)) ?? '';
      const known = new Set(parseSessionLines(targetText).map((record) => record.id));
      const missing = sourceText
        .split('\n')
        .filter((line) => line.trim() && !known.has(parseSessionLines(line)[0]?.id));
      if (missing.length > 0) {
        const prefix = targetText && !targetText.endsWith('\n') ? '\n' : '';
        await target.writeText(name, targetText + prefix + missing.join('\n') + '\n');
        copied++;
      }
    }
  }

  backend.data = target;
  const updatedDevice = { ...device, dataFolder: folder };
  await saveDevice(backend, updatedDevice);
  return { device: updatedDevice, found, copied };
};

// Re-read only the synced files (another device may have changed them)
export const reloadSyncedData = async (backend) => {
  const settings = await readSettings(backend);
  return {
    settings,
    exercises: await readExercises(backend, settings),
    userSounds: await listUserSounds(backend)
  };
};

export const saveDevice = (backend, device) =>
  backend.device.writeJson(DEVICE_FILE, device);

export const saveSettings = (backend, settings) =>
  backend.data.writeJson(SETTINGS_FILE, { version: FORMAT_VERSION, ...settings });

export const saveExercises = (backend, exercises) =>
  backend.data.writeJson(EXERCISES_FILE, { version: EXERCISES_FORMAT_VERSION, exercises });

// Append one session to this device's own file (one JSON object per line).
// Only this device writes to the file, so syncing never causes conflicts.
export const appendSession = async (backend, deviceId, summary) => {
  if (summary.seconds < MIN_SESSION_SECONDS) return;
  const record = { version: FORMAT_VERSION, id: newId(), deviceId, ...summary };
  await backend.data.appendText(sessionsFile(deviceId), JSON.stringify(record) + '\n');
};

// Deletes every device's session files (sync leftovers too); returns how many
export const deleteAllSessions = async (backend) => {
  const files = await backend.data.listFiles('sessions');
  for (const file of files) {
    await backend.data.remove(`sessions/${file}`);
  }
  return files.length;
};

// Every device's sessions from the data folder, oldest first.
// Only regular session files are read: sync-tool leftovers (Syncthing conflict
// copies, temp files) are skipped, and a session that appears twice is counted once.
const isSessionFile = (name) => name.endsWith('.jsonl') && !isSyncLeftover(name);

export const loadSessions = async (backend) => {
  const files = (await backend.data.listFiles('sessions')).filter(isSessionFile);
  const byId = new Map();
  for (const file of files) {
    const text = await backend.data.readText(`sessions/${file}`);
    for (const record of parseSessionLines(text ?? '')) {
      if (record.id && Number.isFinite(record.seconds) && record.startedAt) byId.set(record.id, record);
    }
  }
  return [...byId.values()].sort((a, b) => a.startedAt.localeCompare(b.startedAt));
};
