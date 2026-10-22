import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { createBackend } from './storage/backends';
import {
  loadAppData,
  reloadSyncedData,
  saveDevice,
  saveSettings,
  saveExercises,
  appendSession,
  switchDataFolder,
  loadSessions,
  deleteAllSessions,
  listUserSounds,
  importUserSound,
  deleteUserSound,
  readUserSound,
  USER_SOUND_PREFIX,
  defaultExercises
} from './storage/appData';
import { soundFiles } from './sounds';
import { parseBreathSoundRef } from './breathSounds';
import defaultSettings from './data/settings.json';

const AppDataContext = createContext(null);

// Device writes (e.g. dragging the volume slider) are batched
const DEVICE_SAVE_DELAY_MS = 400;

const logSaveError = (what) => (e) => console.warn(`Could not save ${what}:`, e);

const AUDIO_TYPES = { mp3: 'audio/mpeg', m4a: 'audio/mp4', ogg: 'audio/ogg', wav: 'audio/wav', flac: 'audio/flac' };

const toDataUrl = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(blob);
});

export const AppDataProvider = ({ children }) => {
  const [data, setData] = useState(null); // { device, settings, exercises }
  const backendRef = useRef(null);
  const dataRef = useRef(null);
  const deviceSaveTimerRef = useRef(null);
  const soundUrlCacheRef = useRef(new Map()); // sound file or imported sound path -> data: URL
  // Saves of synced files still being written, and how many were ever started:
  // a reload must not read a file mid-save and bring back the old values
  const pendingSavesRef = useRef(new Set());
  const saveCountRef = useRef(0);

  const trackSave = (promise, what) => {
    saveCountRef.current += 1;
    const tracked = promise.catch(logSaveError(what)).finally(() => pendingSavesRef.current.delete(tracked));
    pendingSavesRef.current.add(tracked);
  };

  dataRef.current = data;

  useEffect(() => {
    (async () => {
      try {
        backendRef.current = await createBackend();
        setData(await loadAppData(backendRef.current));
      } catch (e) {
        // Storage unavailable: run on built-in defaults without saving
        console.warn('Storage unavailable, using defaults:', e);
        setData({ device: { volume: 1 }, settings: defaultSettings, exercises: defaultExercises, userSounds: [] });
      }
    })();
    return () => clearTimeout(deviceSaveTimerRef.current);
  }, []);

  const updateSettings = (patch) => {
    const settings = { ...dataRef.current.settings, ...patch };
    setData({ ...dataRef.current, settings });
    if (backendRef.current) {
      trackSave(saveSettings(backendRef.current, settings), 'settings');
    }
  };

  const updateExercises = (exercises) => {
    setData({ ...dataRef.current, exercises });
    if (backendRef.current) {
      trackSave(saveExercises(backendRef.current, exercises), 'exercises');
    }
  };

  // Built-in exercises and default settings; this device's settings and the
  // session history are kept
  const resetToDefaults = () => {
    const settings = { ...defaultSettings, locale: dataRef.current.settings.locale };
    setData({ ...dataRef.current, settings, exercises: defaultExercises });
    if (backendRef.current) {
      trackSave(saveSettings(backendRef.current, settings), 'settings');
      trackSave(saveExercises(backendRef.current, defaultExercises), 'exercises');
    }
  };

  const updateDevice = (patch) => {
    const device = { ...dataRef.current.device, ...patch };
    setData({ ...dataRef.current, device });
    clearTimeout(deviceSaveTimerRef.current);
    // Save whatever is current when the timer fires, not this snapshot
    deviceSaveTimerRef.current = setTimeout(() => {
      if (backendRef.current) {
        saveDevice(backendRef.current, dataRef.current.device).catch(logSaveError('device settings'));
      }
    }, DEVICE_SAVE_DELAY_MS);
  };

  // Not saved when this device's "Keep a session history" is off
  const recordSession = (summary) => {
    if (!backendRef.current || dataRef.current.device.recordSessions === false) return Promise.resolve(false);
    return appendSession(backendRef.current, dataRef.current.device.deviceId, summary)
      .then(() => true)
      .catch((e) => {
        logSaveError('session')(e);
        return false;
      });
  };

  const deleteSessions = async () => {
    if (!backendRef.current) return 0;
    return deleteAllSessions(backendRef.current);
  };

  // All devices' sessions, read fresh each time (other devices may have synced new ones)
  const getSessions = async () => {
    if (!backendRef.current) return [];
    try {
      return await loadSessions(backendRef.current);
    } catch (e) {
      console.warn('Could not read sessions:', e);
      return [];
    }
  };

  // ---------- Data folder (desktop only) ----------
  // Returns { found, copied } on success, null if the dialog was cancelled; throws on failure
  const changeDataFolder = async (folder) => {
    const backend = backendRef.current;
    const result = await switchDataFolder(backend, dataRef.current.device, folder);
    const fresh = await reloadSyncedData(backend);
    setData({ ...dataRef.current, ...fresh, device: result.device, dataFolderMissing: false });
    return result;
  };

  const chooseDataFolder = async () => {
    const folder = await backendRef.current.pickFolder();
    return folder ? changeDataFolder(folder) : null;
  };

  const resetDataFolder = () => changeDataFolder(null);

  const dataFolder = backendRef.current?.openDataFolder
    ? {
        location: backendRef.current.data.location,
        isDefault: !data?.device.dataFolder || data?.dataFolderMissing,
        missing: data?.dataFolderMissing ? data.device.dataFolder : null,
        choose: chooseDataFolder,
        useDefault: resetDataFolder
      }
    : null; // browser: data stays in browser storage

  // ---------- Imported sounds (desktop only) ----------
  // Returns the stored file name, or null if the dialog was cancelled; throws on failure
  const importSound = async () => {
    const backend = backendRef.current;
    const name = await importUserSound(backend);
    if (name) setData({ ...dataRef.current, userSounds: await listUserSounds(backend) });
    return name;
  };

  const deleteSound = async (name) => {
    const backend = backendRef.current;
    await deleteUserSound(backend, name);
    setData({ ...dataRef.current, userSounds: await listUserSounds(backend) });
  };

  // A playable URL for an exercise's backgroundSound, or null if there is none.
  // Imported files are read once and played from memory. So are the built-in
  // ones in the desktop app: its release build serves files through its own
  // tauri:// scheme, which the Linux webview's media player can't stream
  // (music stayed silent). They play from data: URLs, because blob: URLs play
  // there with short gaps and skips.
  const resolveSoundUrl = async (ref) => {
    if (!ref) return null;
    if (parseBreathSoundRef(ref)) return ref; // generated: no file (see breathSounds.js)
    const backend = backendRef.current;
    const cache = soundUrlCacheRef.current;
    if (!ref.startsWith(USER_SOUND_PREFIX)) {
      const url = soundFiles[ref];
      if (!url || backend?.kind !== 'tauri') return url ?? null;
      if (!cache.has(url)) {
        const blob = await (await fetch(url)).blob();
        cache.set(url, await toDataUrl(new Blob([blob], { type: 'audio/mpeg' })));
      }
      return cache.get(url);
    }

    const name = ref.slice(USER_SOUND_PREFIX.length);
    const key = `${backend.data.location}/${name}`;
    if (!cache.has(key)) {
      const bytes = await readUserSound(backend, name);
      if (!bytes) return null; // not here (yet) — e.g. still syncing from another device
      const type = AUDIO_TYPES[name.split('.').pop().toLowerCase()] ?? 'audio/mpeg';
      cache.set(key, await toDataUrl(new Blob([bytes], { type })));
    }
    return cache.get(key);
  };

  const soundLibrary = backendRef.current?.pickAudioFile
    ? { files: data?.userSounds ?? [], importSound, deleteSound }
    : null; // browser: not available

  // Pick up changes synced from other devices. Unchanged values keep their
  // identity, so nothing re-renders (or resets) when the files are the same.
  // Runs on window focus — which also comes right after choosing from a
  // dropdown on some systems — so it first lets this app's own saves finish,
  // and drops what it read if another save started meanwhile.
  const reload = async () => {
    if (!backendRef.current) return;
    try {
      await Promise.all([...pendingSavesRef.current]);
      const savesBefore = saveCountRef.current;
      const fresh = await reloadSyncedData(backendRef.current);
      if (saveCountRef.current !== savesBefore) return;
      const current = dataRef.current;
      const settingsChanged = JSON.stringify(fresh.settings) !== JSON.stringify(current.settings);
      const exercisesChanged = JSON.stringify(fresh.exercises) !== JSON.stringify(current.exercises);
      const soundsChanged = JSON.stringify(fresh.userSounds) !== JSON.stringify(current.userSounds);
      if (settingsChanged || exercisesChanged || soundsChanged) {
        setData({
          ...current,
          settings: settingsChanged ? fresh.settings : current.settings,
          exercises: exercisesChanged ? fresh.exercises : current.exercises,
          userSounds: soundsChanged ? fresh.userSounds : current.userSounds
        });
      }
    } catch (e) {
      console.warn('Could not reload data:', e);
    }
  };

  if (!data) return null; // loading takes a few milliseconds

  return (
    <AppDataContext.Provider value={{
      ...data,
      updateSettings,
      updateExercises,
      resetToDefaults,
      updateDevice,
      recordSession,
      getSessions,
      deleteSessions,
      // saveTextFile(name, text, { name, extensions, mimeType }): an export,
      // via a save dialog (desktop) or a download (web); false if cancelled
      saveTextFile: (...args) => backendRef.current.saveTextFile(...args),
      reload,
      dataFolder,
      soundLibrary,
      resolveSoundUrl
    }}>
      {children}
    </AppDataContext.Provider>
  );
};

export const useAppData = () => useContext(AppDataContext);
