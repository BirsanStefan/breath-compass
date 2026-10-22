// Storage backends. Each backend exposes two stores with the same interface:
//   device — settings for this device only, never synced (data folder location, volume)
//   data   — the data folder, safe to sync between devices (e.g. with Syncthing)
//
// Store interface:
//   readText(name)       -> file contents, or null if the file doesn't exist
//   writeText(name, text) -> writes the whole file
//   readJson(name)       -> parsed object, or null if the file doesn't exist
//                           (throws if the file exists but can't be parsed)
//   writeJson(name, obj) -> writes the whole file
//   appendText(name, text) -> appends to a file, creating it (and its folder) if needed
//   listFiles(folder)    -> names of the files directly in a subfolder ([] if it doesn't exist)
//
// Desktop stores also handle binary files (imported sounds):
//   readBinary(name)     -> Uint8Array, or null if the file doesn't exist
//   writeBinary(name, bytes), remove(name)
//
// Names may include a subfolder, e.g. "sessions/desktop-1a2b3c4d.jsonl".

export const isTauri = () =>
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

// ==================== DESKTOP (TAURI) ====================
// Plain JSON files on disk
const createFileStore = async (dir) => {
  const fs = await import('@tauri-apps/plugin-fs');
  const { join, dirname } = await import('@tauri-apps/api/path');

  return {
    location: dir,

    async readText(name) {
      const file = await join(dir, name);
      if (!(await fs.exists(file))) return null;
      return fs.readTextFile(file);
    },

    // Write to a temp file and rename, so a sync tool never sees a half-written file
    async writeText(name, text) {
      const file = await join(dir, name);
      const tmp = `${file}.tmp`;
      await fs.mkdir(await dirname(file), { recursive: true });
      await fs.writeTextFile(tmp, text);
      await fs.rename(tmp, file);
    },

    async readJson(name) {
      const text = await this.readText(name);
      return text === null ? null : JSON.parse(text);
    },

    async writeJson(name, data) {
      await this.writeText(name, JSON.stringify(data, null, 2) + '\n');
    },

    async appendText(name, text) {
      const file = await join(dir, name);
      await fs.mkdir(await dirname(file), { recursive: true });
      await fs.writeTextFile(file, text, { append: true });
    },

    async listFiles(folder) {
      const path = await join(dir, folder);
      if (!(await fs.exists(path))) return [];
      const entries = await fs.readDir(path);
      return entries.filter((entry) => entry.isFile).map((entry) => entry.name);
    },

    async readBinary(name) {
      const file = await join(dir, name);
      if (!(await fs.exists(file))) return null;
      return fs.readFile(file);
    },

    async writeBinary(name, bytes) {
      const file = await join(dir, name);
      const tmp = `${file}.tmp`;
      await fs.mkdir(await dirname(file), { recursive: true });
      await fs.writeFile(tmp, bytes);
      await fs.rename(tmp, file);
    },

    async remove(name) {
      await fs.remove(await join(dir, name));
    }
  };
};

// Default data folder is a dedicated subfolder: the app data dir itself also
// holds the webview's caches, which must not be synced.
// `data` starts at the default folder; appData switches it to the user's folder.
const createTauriBackend = async () => {
  const { appConfigDir, appDataDir, join } = await import('@tauri-apps/api/path');
  const fs = await import('@tauri-apps/plugin-fs');
  const defaultDataFolder = await join(await appDataDir(), 'data');

  return {
    kind: 'tauri',
    defaultDataFolder,
    device: await createFileStore(await appConfigDir()),
    data: await createFileStore(defaultDataFolder),
    openDataFolder: (folder) => createFileStore(folder),
    folderExists: (folder) => fs.exists(folder),

    // Folder picker; the chosen folder (and everything in it) becomes accessible,
    // and the persisted-scope plugin remembers that across restarts
    async pickFolder() {
      const { open } = await import('@tauri-apps/plugin-dialog');
      return open({ directory: true, recursive: true });
    },

    // File picker for audio; returns { name, bytes } or null if cancelled
    async pickAudioFile(extensions) {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const { basename } = await import('@tauri-apps/api/path');
      const path = await open({ multiple: false, filters: [{ name: 'Audio', extensions }] });
      if (!path) return null;
      return { name: await basename(path), bytes: await fs.readFile(path) };
    },

    // "Save as" for an export; returns false if cancelled. The chosen file
    // becomes writable (the dialog adds it to the allowed paths).
    async saveTextFile(defaultName, text, { name, extensions }) {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const path = await save({ defaultPath: defaultName, filters: [{ name, extensions }] });
      if (!path) return false;
      await fs.writeTextFile(path, text);
      return true;
    }
  };
};

// ==================== BROWSER ====================
// localStorage; data stays in this browser only
const createLocalStorageStore = (prefix) => ({
  location: 'browser',

  async readText(name) {
    try {
      return window.localStorage.getItem(prefix + name);
    } catch (e) {
      return null; // storage blocked (private mode etc.)
    }
  },

  async writeText(name, text) {
    try {
      window.localStorage.setItem(prefix + name, text);
    } catch (e) {
      console.warn(`Could not save ${name} in browser storage:`, e);
    }
  },

  async readJson(name) {
    const text = await this.readText(name);
    return text === null ? null : JSON.parse(text);
  },

  async writeJson(name, data) {
    await this.writeText(name, JSON.stringify(data));
  },

  async appendText(name, text) {
    try {
      const existing = window.localStorage.getItem(prefix + name) || '';
      window.localStorage.setItem(prefix + name, existing + text);
    } catch (e) {
      console.warn(`Could not save ${name} in browser storage:`, e);
    }
  },

  async remove(name) {
    try {
      window.localStorage.removeItem(prefix + name);
    } catch (e) {
      console.warn(`Could not remove ${name} from browser storage:`, e);
    }
  },

  async listFiles(folder) {
    const start = `${prefix}${folder}/`;
    try {
      return Object.keys(window.localStorage)
        .filter((key) => key.startsWith(start) && !key.slice(start.length).includes('/'))
        .map((key) => key.slice(start.length));
    } catch (e) {
      return [];
    }
  }
});

const createBrowserBackend = async () => ({
  kind: 'browser',
  device: createLocalStorageStore('breath-compass:device:'),
  data: createLocalStorageStore('breath-compass:data:'),

  // An export: the browser downloads it (to its downloads folder, or asks)
  async saveTextFile(defaultName, text, { mimeType = 'text/plain' } = {}) {
    const url = URL.createObjectURL(new Blob([text], { type: `${mimeType};charset=utf-8` }));
    const link = document.createElement('a');
    link.href = url;
    link.download = defaultName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  }
});

export const createBackend = () => (isTauri() ? createTauriBackend() : createBrowserBackend());
