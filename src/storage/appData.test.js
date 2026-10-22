import { afterEach, describe, expect, it, vi } from 'vitest';
import { defaultExercises, exerciseBadges, exerciseCategory, isShown, loadAppData, reloadSyncedData } from './appData';
import { bellSettings, DEFAULT_BELLS } from '../bellSounds';
import { reminderSettings, DEFAULT_REMINDERS } from '../reminders';

// A storage backend in memory, with the same interface as the real ones
// (see backends.js): `files` is { 'device:device.json': {...}, 'data:exercises.json': {...} }
const memoryStore = (files, prefix) => ({
  location: `memory-${prefix}`,
  async readText(name) {
    const value = files[`${prefix}:${name}`];
    return value === undefined ? null : typeof value === 'string' ? value : JSON.stringify(value);
  },
  async writeText(name, text) {
    files[`${prefix}:${name}`] = text;
  },
  async readJson(name) {
    const text = await this.readText(name);
    return text === null ? null : JSON.parse(text);
  },
  async writeJson(name, data) {
    files[`${prefix}:${name}`] = JSON.parse(JSON.stringify(data));
  },
  async appendText(name, text) {
    files[`${prefix}:${name}`] = (files[`${prefix}:${name}`] ?? '') + text;
  },
  async remove(name) {
    delete files[`${prefix}:${name}`];
  },
  async listFiles(folder) {
    const start = `${prefix}:${folder}/`;
    return Object.keys(files).filter((key) => key.startsWith(start)).map((key) => key.slice(start.length));
  }
});

const memoryBackend = (files = {}) => ({
  kind: 'memory',
  files,
  device: memoryStore(files, 'device'),
  data: memoryStore(files, 'data')
});

// For files that are broken on purpose: the app warns, the test checks it did
const expectWarning = () => vi.spyOn(console, 'warn').mockImplementation(() => {});
afterEach(() => vi.restoreAllMocks());

const builtIn = (id) => defaultExercises.find((exercise) => exercise.id === id);

describe('first run', () => {
  it('starts with the defaults and saves the built-in exercises', async () => {
    const backend = memoryBackend();
    const data = await loadAppData(backend);
    expect(data.settings.preparationTime).toBe(5);
    expect(data.exercises).toEqual(defaultExercises);
    expect(backend.files['data:exercises.json']).toEqual({ version: 2, exercises: defaultExercises });
  });

  it('gives the device a permanent id', async () => {
    const backend = memoryBackend();
    const { device } = await loadAppData(backend);
    expect(device.deviceId).toMatch(/^web-[0-9a-f]{8}$/);
    expect((await loadAppData(backend)).device.deviceId).toBe(device.deviceId);
  });
});

describe('settings', () => {
  it('fills in what the file leaves out', async () => {
    const backend = memoryBackend({ 'data:settings.json': { version: 1, locale: 'ro' } });
    const { settings } = await loadAppData(backend);
    expect(settings).toMatchObject({ locale: 'ro', preparationTime: 5 });
    expect(settings).not.toHaveProperty('version');
  });

  it('keeps device settings apart from synced settings', async () => {
    const backend = memoryBackend({
      'device:device.json': { volume: 0.4, deviceId: 'desktop-1' },
      'data:settings.json': { version: 1, volume: 0.9, preparationTime: 10 }
    });
    const { device, settings } = await loadAppData(backend);
    expect(device.volume).toBe(0.4);
    expect(settings.preparationTime).toBe(10);
    expect(device).not.toHaveProperty('preparationTime');
  });

  it('uses the defaults for an unreadable file, and leaves it alone', async () => {
    const warn = expectWarning();
    const backend = memoryBackend({ 'data:settings.json': '{ broken' });
    const { settings } = await loadAppData(backend);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('settings.json'), expect.anything());
    expect(settings.preparationTime).toBe(5);
    expect(backend.files['data:settings.json']).toBe('{ broken');
  });

  it('merges bells and reminders with their defaults', () => {
    expect(bellSettings({})).toEqual(DEFAULT_BELLS);
    expect(bellSettings({ bells: { set: 'custom', custom: { inhale: 'x.mp3' } } }))
      .toEqual({ set: 'custom', custom: { inhale: 'x.mp3' } });
    expect(reminderSettings(undefined)).toEqual(DEFAULT_REMINDERS);
    expect(reminderSettings({ reminders: { enabled: true, times: ['07:30', '25:00', 'soon'] } }))
      .toEqual({ enabled: true, times: ['07:30'] });
  });
});

describe('exercises', () => {
  const custom = { id: 'mine', name: 'My Box', description: '', cycles: 5, phases: [{ type: 'inhale', duration: 4 }] };

  it('keeps your own exercises as they are, in your order', async () => {
    const stored = [custom, ...defaultExercises];
    const backend = memoryBackend({ 'data:exercises.json': { version: 2, exercises: stored } });
    expect((await loadAppData(backend)).exercises).toEqual(stored);
  });

  it('takes built-in names, descriptions and phases from the app', async () => {
    const changed = { ...builtIn('power'), name: 'Mine now', phases: [{ type: 'hold', duration: 99 }] };
    const backend = memoryBackend({ 'data:exercises.json': { version: 2, exercises: [changed] } });
    const { exercises } = await loadAppData(backend);
    expect(exercises.find((exercise) => exercise.id === 'power')).toEqual(builtIn('power'));
    expect(exercises.filter((exercise) => exercise.id === 'power')).toHaveLength(1);
  });

  it("keeps a built-in's cycles, music and hidden", async () => {
    const changed = { ...builtIn('harmony'), cycles: 7, backgroundSound: 'user:rain.mp3', hidden: true };
    const noMusic = { ...builtIn('clear-mind') };
    delete noMusic.backgroundSound;
    const backend = memoryBackend({ 'data:exercises.json': { version: 2, exercises: [changed, noMusic] } });
    const { exercises } = await loadAppData(backend);
    expect(exercises.find((exercise) => exercise.id === 'harmony')).toMatchObject({ cycles: 7, backgroundSound: 'user:rain.mp3', hidden: true });
    expect(exercises.find((exercise) => exercise.id === 'clear-mind')).not.toHaveProperty('backgroundSound');
  });

  it('replaces music earlier versions bundled: built-ins get their new default, your own lose it', async () => {
    const oldRelax = { ...builtIn('relax'), backgroundSound: 'relax.mp3' };
    const oldPower = { ...builtIn('power'), backgroundSound: 'power.mp3' };
    const mine = { ...custom, backgroundSound: 'harmony.mp3' };
    const backend = memoryBackend({ 'data:exercises.json': { version: 2, exercises: [oldRelax, oldPower, mine] } });
    const { exercises } = await loadAppData(backend);
    const byId = (id) => exercises.find((exercise) => exercise.id === id);
    expect(byId('relax').backgroundSound).toBe('blackbird-forest.mp3');
    expect(byId('power').backgroundSound).toBe('breath:pad');
    expect(byId('mine')).not.toHaveProperty('backgroundSound');
  });

  it('adds built-ins that are new in this version, visible, at the end', async () => {
    const backend = memoryBackend({ 'data:exercises.json': { version: 2, exercises: [custom, builtIn('power')] } });
    const { exercises } = await loadAppData(backend);
    expect(exercises.map((exercise) => exercise.id)).toEqual([
      'mine', 'power', 'gentle-start', 'coherent', 'calm-exhale', 'cyclic-sigh', 'clear-mind', 'harmony', 'square-breathing', 'relax'
    ]);
    expect(exercises.some((exercise) => exercise.hidden)).toBe(false);
  });

  it('falls back to the built-ins for an unreadable file, and leaves it alone', async () => {
    const warn = expectWarning();
    const backend = memoryBackend({ 'data:exercises.json': 'not json' });
    expect((await loadAppData(backend)).exercises).toEqual(defaultExercises);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('exercises.json'), expect.anything());
    expect(backend.files['data:exercises.json']).toBe('not json');
  });

  it('picks up changes from another device on reload', async () => {
    const backend = memoryBackend();
    await loadAppData(backend);
    backend.files['data:exercises.json'] = { version: 2, exercises: [custom] };
    const { exercises } = await reloadSyncedData(backend);
    expect(exercises[0]).toEqual(custom);
  });
});

describe('upgrading an older exercises file (version 1)', () => {
  const upgrade = async (exercises, locale = 'en') => {
    const backend = memoryBackend({
      'data:exercises.json': { version: 1, exercises },
      'data:settings.json': { version: 1, locale }
    });
    const data = await loadAppData(backend);
    return { exercises: data.exercises, saved: backend.files['data:exercises.json'] };
  };

  it('turns a changed built-in into your own copy, next to the original', async () => {
    const edited = {
      ...builtIn('clear-mind'),
      cycles: 20,
      backgroundSound: 'user:rain.mp3',
      phases: [{ type: 'inhale', duration: 3 }, { type: 'exhale', duration: 8 }]
    };
    const { exercises } = await upgrade([edited, ...defaultExercises.slice(1)]);
    const [copy, original] = exercises;
    expect(copy).toMatchObject({ name: 'Clear Mind (edited)', cycles: 20, phases: edited.phases, backgroundSound: 'user:rain.mp3' });
    expect(copy.id).toMatch(/^custom-/);
    expect(original).toEqual({ ...builtIn('clear-mind'), cycles: 20, backgroundSound: 'user:rain.mp3' });
  });

  it('names the copy in your language, keeping text you wrote', async () => {
    const edited = { ...builtIn('clear-mind'), phases: [{ type: 'exhale', duration: 8 }] };
    const renamed = { ...builtIn('relax'), name: 'Sleepy' };
    const { exercises } = await upgrade([edited, renamed], 'ro');
    expect(exercises[0]).toMatchObject({ name: 'Minte clară (modificat)', description: 'Expirare prelungită pentru relaxare și claritate mentală' });
    expect(exercises.find((exercise) => exercise.name.startsWith('Sleepy'))?.name).toBe('Sleepy (modificat)');
  });

  it('brings deleted built-ins back hidden', async () => {
    const { exercises } = await upgrade([builtIn('relax')]);
    expect(exercises.map((exercise) => [exercise.id, Boolean(exercise.hidden)])).toEqual([
      ['relax', false], ['gentle-start', true], ['coherent', true], ['calm-exhale', true], ['cyclic-sigh', true],
      ['clear-mind', true], ['power', true], ['harmony', true], ['square-breathing', true]
    ]);
  });

  it('makes no copy when only cycles or music changed', async () => {
    const tuned = { ...builtIn('power'), cycles: 12 };
    delete tuned.backgroundSound;
    const { exercises } = await upgrade([tuned]);
    expect(exercises.filter((exercise) => !exercise.hidden)).toHaveLength(1);
    expect(exercises[0]).toMatchObject({ id: 'power', cycles: 12 });
    expect(exercises[0]).not.toHaveProperty('backgroundSound');
  });

  it('saves the result once, as version 2, so it never runs again', async () => {
    const edited = { ...builtIn('clear-mind'), phases: [{ type: 'exhale', duration: 8 }] };
    const backend = memoryBackend({ 'data:exercises.json': { version: 1, exercises: [edited] } });
    const first = await loadAppData(backend);
    expect(backend.files['data:exercises.json'].version).toBe(2);
    const second = await loadAppData(backend);
    expect(second.exercises).toEqual(first.exercises);
  });
});

describe('categories, levels and badges', () => {
  const load = async (stored) => (await loadAppData(memoryBackend({ 'data:exercises.json': { version: 2, exercises: stored } }))).exercises;
  const find = (exercises, id) => exercises.find((exercise) => exercise.id === id);

  it('sorts built-ins into beginner and advanced; your own are custom', () => {
    expect(exerciseCategory(builtIn('coherent'))).toBe('beginner');
    expect(exerciseCategory(builtIn('power'))).toBe('advanced');
    expect(exerciseCategory({ id: 'custom-1', phases: [] })).toBe('custom');
  });

  it('shows advanced exercises only once they are turned on, and never hidden ones', () => {
    expect(isShown(builtIn('power'), {})).toBe(false);
    expect(isShown(builtIn('power'), { showAdvanced: true })).toBe(true);
    expect(isShown({ ...builtIn('coherent'), hidden: true }, {})).toBe(false);
    expect(isShown({ id: 'custom-1', phases: [] }, {})).toBe(true);
  });

  it('labels advanced, custom and hidden exercises, not beginner ones', () => {
    expect(exerciseBadges(builtIn('coherent'))).toEqual([]);
    expect(exerciseBadges({ ...builtIn('power'), hidden: true })).toEqual(['advanced', 'hidden']);
    expect(exerciseBadges({ id: 'custom-1' })).toEqual(['custom']);
  });

  it('takes the phases from the chosen level', async () => {
    const exercises = await load([{ ...builtIn('power'), level: 2 }]);
    expect(find(exercises, 'power').phases.map((phase) => phase.duration)).toEqual([3, 12, 6]);
  });

  it('keeps the pattern of data from before levels: the level its phases match', async () => {
    const before = { ...builtIn('clear-mind'), phases: [{ type: 'inhale', duration: 3 }, { type: 'exhale', duration: 12 }] };
    delete before.level;
    const clearMind = find(await load([before]), 'clear-mind');
    expect(clearMind.level).toBe(1);
    expect(clearMind.phases[1].duration).toBe(12);
  });

  it('falls back to the default level for an unknown one', async () => {
    const square = find(await load([{ ...builtIn('square-breathing'), level: 9 }]), 'square-breathing');
    expect(square.level).toBe(1);
    expect(square.phases[0].duration).toBe(4);
  });

  it("doesn't store the levels in the data folder", () => {
    expect(defaultExercises.some((exercise) => 'levels' in exercise || 'category' in exercise)).toBe(false);
  });
});
