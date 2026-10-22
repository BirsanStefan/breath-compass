import React, { useState, useEffect, useRef } from 'react';
import './styles/index.css';
import { useAppData } from './AppData';
import { defaultExercises, isShown } from './storage/appData';
import { isTauri } from './storage/backends';
import { useTranslation } from './i18n';
import { audio } from './audio';
import { bellSettings } from './bellSounds';
import { SafetyDialog, PhasesDialog } from './Guide';
import { ShortcutsDialog } from './Shortcuts';
import { useReminders, reminderSettings } from './reminders';
import { useFullscreen, useIdle } from './focus';
import SettingsView from './SettingsView';
import { formatDuration } from './format';
import { DEFAULT_DAILY_GOAL, computeStats } from './stats';
import { cyclesForMinutes, exerciseSeconds } from './exerciseDraft';
import StatsView from './StatsView';
import LanguageMenu from './LanguageMenu';
import { useWakeLock } from './useWakeLock';
import { useTheme, usePalette } from './theme';
import { useDesktopIntegration, showMainWindow } from './desktop';
import { goalProgress, useTodaySeconds } from './dailyProgress';
import { useDailyUpdateCheck } from './updates';
import { useBreathingSession } from './session/useBreathingSession';
import { SessionView } from './session/SessionView';
import { ExerciseList } from './session/ExerciseList';
import { BottomNav } from './BottomNav';
import { ExercisesIcon, SettingsIcon, StatsIcon } from './icons';
import logoUrl from '../assets/logo.svg';

// The app: header, and the session, statistics or settings screen below it.
// The session screen's parts are in session/.
const App = () => {
  const { t, locale, exerciseText } = useTranslation();
  const {
    exercises: allExercises,
    settings,
    device,
    updateDevice,
    updateExercises,
    recordSession,
    getSessions,
    resolveSoundUrl,
    soundLibrary,
    reload
  } = useAppData();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [view, setView] = useState('session'); // session, stats, settings
  const [exercisesOpen, setExercisesOpen] = useState(true); // the list greets you on start
  const [safetyOpen, setSafetyOpen] = useState(false);
  const [phasesOpen, setPhasesOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const fullscreen = useFullscreen();

  // Hidden exercises, advanced ones until they're turned on (Settings →
  // Exercises) and those without phases (they can't run) are left out; there's
  // never none
  const runnable = allExercises.filter((exercise) => isShown(exercise, settings) && exercise.phases?.length > 0);
  const exercises = runnable.length > 0 ? runnable : defaultExercises;
  // The list may shrink after a reload
  const exerciseIndex = Math.min(selectedIndex, exercises.length - 1);

  // The summary shown when an exercise finishes: { seconds, day }. day (today's
  // seconds, this session included, the daily goal and the current streak) is
  // filled in once the session is saved; it stays null when the history is off.
  const [completion, setCompletion] = useState(null);

  // Set below: today's progress (tray icon and status line)
  const todayRef = useRef(null);

  const handleSessionEnd = (summary) => {
    const saved = recordSession(summary);
    todayRef.current?.sessionEnded(summary, saved);
    if (!summary.completed) return;
    setCompletion({ seconds: summary.seconds, day: null });
    const goal = settings.dailyGoal ?? DEFAULT_DAILY_GOAL;
    saved.then(async (wasSaved) => {
      if (!wasSaved) return;
      const stats = computeStats(await getSessions(), new Date(), goal);
      const day = { seconds: stats.last30?.at(-1).seconds ?? 0, goal, streak: stats.streak?.current ?? 0 };
      setCompletion((current) => current && { ...current, day });
    });
  };

  const session = useBreathingSession(exercises[exerciseIndex], {
    onComplete: () => {},
    preparationTime: settings.preparationTime ?? 0,
    onSessionEnd: handleSessionEnd,
    resolveSoundUrl,
    closingSound: settings.closingSound !== false
  });

  // This device's volume and mute (changed here or in Settings)
  useEffect(() => {
    session.setVolume(device.volume);
  }, [device.volume]);

  useEffect(() => {
    audio.setMuted(Boolean(device.muted));
  }, [device.muted]);

  // Music, tick and bell levels (changed in Settings)
  useEffect(() => {
    audio.setLevels(device.soundLevels);
  }, [device.soundLevels]);

  // Which bells play at the start of each phase (Settings → Sound). Reapplied
  // when the choice changes or imported sounds come and go (e.g. synced in)
  const bells = bellSettings(settings);
  const resolveSoundUrlRef = useRef(resolveSoundUrl);
  resolveSoundUrlRef.current = resolveSoundUrl;
  const bellsKey = JSON.stringify(bells);
  const userSoundsKey = (soundLibrary?.files ?? []).join('|');
  useEffect(() => {
    audio.setBells(bells, (ref) => resolveSoundUrlRef.current(ref));
  }, [bellsKey, userSoundsKey]);

  // Moving the volume also unmutes
  const handleVolumeChange = (value) => {
    updateDevice({ volume: value, muted: false });
  };

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (view !== 'session') return;
      // Typing in a field (the custom session length) isn't a shortcut
      if (e.target.closest?.('input, textarea, select')) return;
      // While the list is open, Esc only closes it (and Space does nothing)
      if (exercisesOpen) {
        if (e.code === 'Escape') {
          e.preventDefault();
          setExercisesOpen(false);
        }
        return;
      }
      // In full screen, Esc leaves full screen first; F switches it
      if (e.code === 'Escape' && fullscreen.active) {
        e.preventDefault();
        fullscreen.exit();
        return;
      }
      const plainKey = !e.ctrlKey && !e.metaKey && !e.altKey;
      if (e.code === 'KeyF' && fullscreen.available && plainKey) {
        e.preventDefault();
        fullscreen.toggle();
        return;
      }
      if (e.code === 'KeyH' && plainKey) {
        e.preventDefault();
        setPhasesOpen(true);
        return;
      }
      if (e.code === 'KeyM' && plainKey) {
        e.preventDefault();
        updateDevice({ muted: !device.muted });
        return;
      }
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setShortcutsOpen(true);
        return;
      }
      // Volume in steps of 5%
      if ((e.code === 'ArrowUp' || e.code === 'ArrowDown') && plainKey) {
        e.preventDefault();
        const step = e.code === 'ArrowUp' ? 0.05 : -0.05;
        handleVolumeChange(Math.round(Math.min(1, Math.max(0, (device.volume ?? 1) + step)) * 100) / 100);
        return;
      }
      // Previous / next exercise, only while not breathing
      if ((e.code === 'ArrowLeft' || e.code === 'ArrowRight') && plainKey) {
        if (session.sessionState === 'running' || session.sessionState === 'paused') return;
        e.preventDefault();
        const offset = e.code === 'ArrowRight' ? 1 : -1;
        setSelectedIndex((exerciseIndex + offset + exercises.length) % exercises.length);
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        if (session.sessionState === 'idle' || session.sessionState === 'completed') {
          session.start();
        } else if (session.sessionState === 'running') {
          session.pause();
        } else if (session.sessionState === 'paused') {
          session.resume();
        }
      } else if (e.code === 'Escape') {
        e.preventDefault();
        if (session.sessionState !== 'idle') {
          session.stop();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [session.sessionState, session, view, exercisesOpen, fullscreen.active, device.volume, device.muted, exerciseIndex, exercises.length]);

  const isSessionActive = session.sessionState === 'running' || session.sessionState === 'paused';
  // Focus mode: while breathing (and always in full screen) everything but the
  // visual and the progress fades out once the mouse rests
  const chromeHidden = useIdle(
    (session.sessionState === 'running' || (fullscreen.active && session.sessionState !== 'completed')) &&
      view === 'session' && !exercisesOpen && !safetyOpen && !phasesOpen && !shortcutsOpen
  );
  useWakeLock(session.sessionState === 'running');
  const theme = useTheme(device.theme);
  usePalette(device.palette);

  // ---------- Tray (desktop app) ----------
  // Starting an exercise from the tray: bring up the window, select it, start.
  // A different exercise is started once it's selected (selecting resets the
  // session, see the effect below).
  const pendingStartRef = useRef(null);

  // Selects an exercise and starts it (from the tray, or "Next" after a session)
  const startExercise = (index) => {
    if (isSessionActive) return;
    setView('session');
    setExercisesOpen(false);
    if (index === exerciseIndex) {
      session.start();
    } else {
      pendingStartRef.current = exercises[index].id;
      setSelectedIndex(index);
    }
  };

  const startExerciseFromTray = (index) => {
    if (isSessionActive) return;
    showMainWindow();
    startExercise(index);
  };

  const nextIndex = (exerciseIndex + 1) % exercises.length;

  useEffect(() => {
    if (pendingStartRef.current && pendingStartRef.current === exercises[exerciseIndex]?.id) {
      pendingStartRef.current = null;
      session.start();
    }
  }, [exerciseIndex]);

  // Today's progress towards the daily goal, live during a session: the tray
  // icon fills up, and the tray menu starts with a status line (desktop)
  const goalMinutes = settings.dailyGoal ?? DEFAULT_DAILY_GOAL;
  const today = useTodaySeconds({ getSessions, liveSeconds: session.breathedSeconds, enabled: isTauri() });
  todayRef.current = today;
  const progress = goalProgress(today.seconds, goalMinutes);
  const progressText = (progress.met ? t('tray.statusMet') : t('tray.status'))
    .replace('{done}', progress.minutes)
    .replace('{goal}', goalMinutes);
  const trayStatus = isSessionActive
    ? `${exerciseText(exercises[exerciseIndex], 'name')} · ${progressText}`
    : progressText;

  useDesktopIntegration({
    menu: {
      status: trayStatus,
      labels: {
        show: t('tray.show'),
        pause: t('session.pause'),
        resume: t('session.resume'),
        stop: t('session.stop'),
        start: t('tray.start'),
        quit: t('tray.quit')
      },
      exercises: exercises.map((exercise) => ({
        label: `${exerciseText(exercise, 'name')} (${formatDuration(exerciseSeconds(exercise))})`
      })),
      state: session.sessionState === 'running' ? 'running' : session.sessionState === 'paused' ? 'paused' : 'idle'
    },
    actions: {
      startExercise: startExerciseFromTray,
      pause: session.pause,
      resume: session.resume,
      stop: session.stop
    },
    closeToTray: device.closeToTray ?? true,
    startHidden: device.startMinimized ?? false,
    trayStyle: device.trayIcon ?? 'grey',
    trayProgress: device.trayProgress === false ? null : progress.fraction
  });

  // Desktop: asks GitHub once a day whether a newer version exists (shown in
  // Settings → About)
  useDailyUpdateCheck(device.checkUpdates ?? true);

  // Daily reminders (desktop): only while today's goal isn't met
  useReminders({
    reminders: reminderSettings(device),
    goalMinutes,
    busy: isSessionActive,
    getSessions,
    texts: (done, goal) => ({
      title: t('reminders.title'),
      body: (done > 0 ? t('reminders.bodySome') : t('reminders.bodyNone')).replace('{done}', done).replace('{goal}', goal)
    })
  });

  // The header's list, statistics and settings buttons wait while a session
  // runs or is paused, and their tooltip says so. Not `disabled`: some
  // browsers show no tooltip on a disabled button.
  const untilStopped = (title, onClick) => (isSessionActive
    ? { title: `${title} — ${t('session.stopToUse')}`, 'aria-disabled': true }
    : { title, onClick });

  // The Settings tab to open on (null: its first)
  const [settingsTab, setSettingsTab] = useState(null);

  const toggleView = (target) => {
    setSettingsTab(null);
    setExercisesOpen(false);
    setView((current) => (current === target ? 'session' : target));
  };

  // From any view, the list button shows the session view with the list
  const toggleExercises = () => {
    if (view !== 'session') {
      setView('session');
      setExercisesOpen(true);
    } else {
      setExercisesOpen((open) => !open);
    }
  };

  // The bottom bar (phones): go to a place, rather than toggle it
  const currentPlace = view !== 'session' ? view : (exercisesOpen ? 'exercises' : 'breathe');
  const goTo = (place) => {
    setSettingsTab(null);
    setExercisesOpen(place === 'exercises');
    setView(place === 'stats' || place === 'settings' ? place : 'session');
  };

  // The list never covers a running session
  useEffect(() => {
    if (isSessionActive) setExercisesOpen(false);
  }, [isSessionActive]);

  // Pick up changes synced from other devices when the window regains focus,
  // but never in the middle of a session
  useEffect(() => {
    if (isSessionActive) return;
    const handleFocus = () => reload();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isSessionActive, reload]);

  return (
    <div className={`app ${fullscreen.active ? 'fullscreen' : ''} ${chromeHidden ? 'chrome-hidden' : ''} ${session.sessionState === 'completed' ? 'session-completed' : ''}`}>
      {/* Stays usable while the exercise list is open: its buttons switch
          views (closing the list) or the theme */}
      <header className="app-header">
        {/* The name goes back to the breathing screen, from anywhere */}
        <h1>
          <button type="button" className="app-home" title={t('nav.breathe')} onClick={() => goTo('breathe')}>
            <img src={logoUrl} className="app-logo" alt="" />
            {t('app.title')}
          </button>
        </h1>
        <div className="header-actions">
          <LanguageMenu />
          <button
            className="header-btn theme-toggle"
            title={theme === 'dark' ? t('theme.toLight') : t('theme.toDark')}
            onClick={() => updateDevice({ theme: theme === 'dark' ? 'light' : 'dark' })}
          >
            {theme === 'dark' ? (
              <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
                <circle cx="9" cy="9" r="3.2" />
                <path d="M9 1.8v1.6M9 14.6v1.6M1.8 9h1.6M14.6 9h1.6M3.9 3.9l1.1 1.1M13 13l1.1 1.1M3.9 14.1L5 13M13 5l1.1-1.1" />
              </svg>
            ) : (
              <svg viewBox="0 0 18 18" fill="currentColor" aria-hidden="true">
                <path d="M14.5 11.6A6.2 6.2 0 0 1 6.4 3.5a6.2 6.2 0 1 0 8.1 8.1z" />
              </svg>
            )}
          </button>
          {/* The places: on phones the bottom bar has them instead */}
          <button
            className={`header-btn header-place ${view === 'session' && exercisesOpen ? 'active' : ''}`}
            aria-expanded={view === 'session' && exercisesOpen}
            {...untilStopped(t('exercises.sectionTitle'), toggleExercises)}
          >
            <ExercisesIcon />
          </button>
          {/* Each button opens its view; pressing it again (✕) goes back */}
          <button
            className={`header-btn header-place ${view === 'stats' ? 'active' : ''}`}
            {...untilStopped(view === 'stats' ? t('settings.back') : t('stats.open'), () => toggleView('stats'))}
          >
            {view === 'stats' ? '✕' : <StatsIcon />}
          </button>
          <button
            className={`header-btn header-place ${view === 'settings' ? 'active' : ''}`}
            {...untilStopped(view === 'settings' ? t('settings.back') : t('settings.title'), () => toggleView('settings'))}
          >
            {view === 'settings' ? '✕' : <SettingsIcon />}
          </button>
        </div>
      </header>

      {view === 'settings' && (
        <div className="app-body">
          <SettingsView initialTab={settingsTab} />
        </div>
      )}
      {view === 'stats' && (
        <div className="app-body">
          <StatsView />
        </div>
      )}
      {view === 'session' && (
        <div className="app-body">
          <SessionView
            exercise={exercises[exerciseIndex]}
            exercises={exercises}
            exerciseIndex={exerciseIndex}
            onSelectExercise={setSelectedIndex}
            session={session}
            visual={device.sessionView ?? 'detailed'}
            volume={device.volume}
            muted={Boolean(device.muted)}
            onToggleMute={() => updateDevice({ muted: !device.muted })}
            onStart={session.start}
            onPause={session.pause}
            onResume={session.resume}
            onStop={session.stop}
            onVolumeChange={handleVolumeChange}
            onChangeExercise={isSessionActive ? null : () => setExercisesOpen(true)}
            fullscreen={fullscreen}
            completion={session.sessionState === 'completed' ? completion : null}
            nextExercise={exercises.length > 1 ? exercises[nextIndex] : null}
            onNext={() => startExercise(nextIndex)}
            inert={exercisesOpen}
            onShowShortcuts={() => setShortcutsOpen(true)}
            onShowSafety={() => setSafetyOpen(true)}
            onShowPhases={() => setPhasesOpen(true)}
            onLengthChange={(minutes) => updateExercises(exercises.map((exercise, i) => (
              i === exerciseIndex ? { ...exercise, cycles: cyclesForMinutes(exercise.phases, minutes) } : exercise
            )))}
          />

          <ExerciseList
            exercises={exercises}
            selectedIndex={exerciseIndex}
            open={exercisesOpen}
            onSelect={(index) => {
              setSelectedIndex(index);
              setExercisesOpen(false);
              window.scrollTo({ top: 0 });
            }}
            onClose={() => setExercisesOpen(false)}
            onShowSafety={() => setSafetyOpen(true)}
            advancedOff={!settings.showAdvanced}
            onShowAdvancedSetting={() => {
              setExercisesOpen(false);
              setSettingsTab('exercises');
              setView('settings');
            }}
          />
        </div>
      )}
      <BottomNav current={currentPlace} hidden={isSessionActive} onGo={goTo} />
      <SafetyDialog open={safetyOpen} onClose={() => setSafetyOpen(false)} />
      <PhasesDialog open={phasesOpen} onClose={() => setPhasesOpen(false)} />
      <ShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} fullscreenAvailable={fullscreen.available} />
    </div>
  );
};

export default App;
