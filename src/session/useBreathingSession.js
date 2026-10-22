import { useState, useEffect, useRef } from 'react';
import { audio } from '../audio';
import { SETTLE_SECONDS, cycleLevels, phaseKey } from './breath';

// ==================== CUSTOM HOOK: BREATHING SESSION ====================
// Options:
//   onComplete()            — the exercise finished
//   preparationTime         — countdown seconds before breathing starts
//   onSessionEnd(summary)   — a session that got past the countdown was stopped or completed
//   resolveSoundUrl(ref)    — async; playable URL for the exercise's background sound
//   closingSound            — play the closing chime when the exercise finishes
export const useBreathingSession = (exercise, { onComplete, preparationTime = 0, onSessionEnd, resolveSoundUrl, closingSound = true }) => {
  const [sessionState, setSessionState] = useState('idle'); // idle, running, paused, completed
  const [currentCycle, setCurrentCycle] = useState(0);
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [phaseTimeRemaining, setPhaseTimeRemaining] = useState(0);
  const [phaseProgress, setPhaseProgress] = useState(0);
  const [sessionProgress, setSessionProgress] = useState(0);
  const [sessionTimeRemaining, setSessionTimeRemaining] = useState(null); // seconds; null = not started
  const [isPreparing, setIsPreparing] = useState(false);
  const [prepTimeRemaining, setPrepTimeRemaining] = useState(0);

  const audioServiceRef = useRef(audio);
  const startTimeRef = useRef(null);
  const pauseTimeRef = useRef(null);
  const timerRef = useRef(null); // pending timer step, see scheduleStep
  const startedAtRef = useRef(null); // wall-clock time breathing started (after preparation)
  const runIdRef = useRef(0); // bumped on start/stop so late async results from an old run are ignored
  const musicUrlRef = useRef(null); // undefined while the URL is still being resolved
  const musicStartedRef = useRef(false);

  // Use refs to store latest state values to avoid stale closures
  const sessionStateRef = useRef(sessionState);
  const currentCycleRef = useRef(currentCycle);
  const currentPhaseIndexRef = useRef(currentPhaseIndex);
  const isPreparingRef = useRef(false);

  // Keep refs in sync with state
  useEffect(() => {
    sessionStateRef.current = sessionState;
  }, [sessionState]);

  useEffect(() => {
    currentCycleRef.current = currentCycle;
  }, [currentCycle]);

  useEffect(() => {
    currentPhaseIndexRef.current = currentPhaseIndex;
  }, [currentPhaseIndex]);

  // Calculate total session duration
  const getTotalDuration = () => {
    if (!exercise) return 0;
    const cycleTime = exercise.phases.reduce((sum, phase) => sum + phase.duration, 0);
    return cycleTime * exercise.cycles;
  };

  // Seconds of the session left, given time spent in the current phase
  const getSessionRemaining = (phaseElapsed) => {
    const cycleTime = exercise.phases.reduce((sum, phase) => sum + phase.duration, 0);
    const doneInCycle = exercise.phases
      .slice(0, currentPhaseIndexRef.current)
      .reduce((sum, phase) => sum + phase.duration, 0);
    return getTotalDuration() - (currentCycleRef.current * cycleTime + doneInCycle + phaseElapsed);
  };

  // Report how much of the session was actually breathed (pauses and
  // preparation excluded). Must run before the session state is reset.
  const reportSessionEnd = (completed) => {
    if (!startedAtRef.current) return; // stopped during preparation
    let seconds = getTotalDuration();
    let cyclesCompleted = exercise.cycles;

    if (!completed) {
      const phase = getCurrentPhase();
      const clock = sessionStateRef.current === 'paused' ? pauseTimeRef.current : performance.now();
      const phaseElapsed = phase
        ? Math.min(Math.max(0, (clock - startTimeRef.current) / 1000), phase.duration)
        : 0;
      seconds = getTotalDuration() - getSessionRemaining(phaseElapsed);
      cyclesCompleted = currentCycleRef.current;
    }

    onSessionEnd?.({
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      startedAt: startedAtRef.current.toISOString(),
      endedAt: new Date().toISOString(),
      seconds: Math.round(seconds),
      cyclesCompleted,
      cyclesPlanned: exercise.cycles,
      completed
    });
    startedAtRef.current = null;
  };

  const getCurrentPhase = () => {
    if (!exercise || currentPhaseIndexRef.current >= exercise.phases.length) return null;
    return exercise.phases[currentPhaseIndexRef.current];
  };

  // Timer steps run on the next animation frame (smooth while visible) or after
  // a short timeout, whichever comes first: animation frames stop entirely
  // while the window is hidden (e.g. in the tray), the timeout keeps going.
  // Times are always measured, so a late step simply catches up.
  const scheduleStep = () => {
    const run = () => {
      cancelStep();
      tick();
    };
    timerRef.current = {
      frame: requestAnimationFrame(run),
      timeout: setTimeout(run, 250)
    };
  };

  const cancelStep = () => {
    if (!timerRef.current) return;
    cancelAnimationFrame(timerRef.current.frame);
    clearTimeout(timerRef.current.timeout);
    timerRef.current = null;
  };

  // Main timer loop
  const tick = () => {
    if (sessionStateRef.current !== 'running') return;

    const now = performance.now();

    // Preparation countdown: the session clock starts in the future
    if (now < startTimeRef.current) {
      setPrepTimeRemaining(Math.ceil((startTimeRef.current - now) / 1000));
      scheduleStep();
      return;
    }
    let phaseStarted = false;
    if (isPreparingRef.current) {
      isPreparingRef.current = false;
      setIsPreparing(false);
      startedAtRef.current = new Date();
      startMusicIfReady();
      phaseStarted = true;
    }

    let currentPhase = getCurrentPhase();

    if (!currentPhase) {
      stop();
      return;
    }

    // Move past every phase that has ended. Each starts when the one before was
    // due to end, so a late step (the window hidden, timers throttled) catches
    // up instead of making the session longer.
    while (now - startTimeRef.current >= currentPhase.duration * 1000) {
      if (!advancePhase()) return; // the exercise is complete
      currentPhase = getCurrentPhase();
      phaseStarted = true;
    }
    // Only the phase we're in now is heard, from where it is
    if (phaseStarted) playCurrentPhase(currentPhase);

    const elapsed = (now - startTimeRef.current) / 1000; // Convert to seconds
    // Cap elapsed time at phase duration to prevent overflow
    const phaseElapsed = Math.min(Math.max(0, elapsed), currentPhase.duration);
    const remaining = Math.max(0, Math.ceil(currentPhase.duration - elapsed));
    const progress = (phaseElapsed / currentPhase.duration) * 100;
    
    setPhaseTimeRemaining(remaining);
    setPhaseProgress(progress);

    // Calculate overall session progress
    const totalPhases = exercise.phases.length * exercise.cycles;
    const completedPhases = (currentCycleRef.current * exercise.phases.length) + currentPhaseIndexRef.current;
    const currentPhaseProgress = phaseElapsed / currentPhase.duration;
    const overallProgress = ((completedPhases + currentPhaseProgress) / totalPhases) * 100;
    setSessionProgress(overallProgress);
    const sessionRemaining = getSessionRemaining(phaseElapsed);
    setSessionTimeRemaining(Math.max(0, Math.ceil(sessionRemaining)));
    audioServiceRef.current.updateMusicFade(sessionRemaining);

    scheduleStep();
  };

  // The current phase has ended: on to the next one, which starts exactly when
  // this one was due to end. Returns false when that was the exercise's last.
  const advancePhase = () => {
    const endedPhase = getCurrentPhase();
    const nextPhaseIndex = currentPhaseIndexRef.current + 1;
    
    if (nextPhaseIndex >= exercise.phases.length) {
      // Cycle complete
      const nextCycle = currentCycleRef.current + 1;
      
      if (nextCycle >= exercise.cycles) {
        // Session complete
        reportSessionEnd(true);
        runIdRef.current++;
        sessionStateRef.current = 'completed';
        currentCycleRef.current = 0;
        currentPhaseIndexRef.current = 0;
        setSessionState('completed');
        setCurrentCycle(0);
        setCurrentPhaseIndex(0);
        setPhaseTimeRemaining(0);
        setPhaseProgress(0);
        setSessionProgress(100);
        setSessionTimeRemaining(0);
        audioServiceRef.current.stop();
        audioServiceRef.current.stopMusic(SETTLE_SECONDS);
        if (closingSound) audioServiceRef.current.playClosing();
        cancelStep();
        onComplete();
        return false;
      }

      currentCycleRef.current = nextCycle;
      currentPhaseIndexRef.current = 0;
      setCurrentCycle(nextCycle);
      setCurrentPhaseIndex(0);
    } else {
      currentPhaseIndexRef.current = nextPhaseIndex;
      setCurrentPhaseIndex(nextPhaseIndex);
    }
    startTimeRef.current += endedPhase.duration * 1000;
    return true;
  };

  // Music starts with the breathing (after the countdown), once its URL is known.
  // Resolving can outlast the countdown for a large imported file.
  const startMusicIfReady = () => {
    const url = musicUrlRef.current;
    if (!url || musicStartedRef.current || !startedAtRef.current) return;
    musicStartedRef.current = true;
    audioServiceRef.current.startMusic(url);
    if (sessionStateRef.current === 'paused') audioServiceRef.current.pauseMusic();
  };

  const prepareMusic = () => {
    const runId = ++runIdRef.current;
    musicUrlRef.current = undefined;
    musicStartedRef.current = false;
    Promise.resolve(resolveSoundUrl ? resolveSoundUrl(exercise.backgroundSound) : null)
      .catch((e) => {
        console.warn('Background music unavailable:', e);
        return null;
      })
      .then((url) => {
        if (runId !== runIdRef.current) return; // session was stopped or restarted meanwhile
        musicUrlRef.current = url;
        startMusicIfReady();
      });
  };

  // A phase's bell and ticks; a sound that follows the breath gets the lung
  // level's way through the phase (resuming mid-phase, part of it is gone)
  // bell: false when resuming (the phase didn't just start)
  const playCurrentPhase = (phase, { bell = true } = {}) => {
    if (phase) {
      const elapsed = Math.min(phase.duration, Math.max(0, (performance.now() - startTimeRef.current) / 1000));
      audioServiceRef.current.playTone(phase.type, phase.duration, { elapsed, bell });
      const [from, to] = cycleLevels(exercise.phases)[currentPhaseIndexRef.current];
      audioServiceRef.current.breathPhase(phaseKey(phase.type), from, to, phase.duration, elapsed);
    }
  };

  const start = () => {
    if (!exercise) return;

    audioServiceRef.current.unlock();
    sessionStateRef.current = 'running';
    currentCycleRef.current = 0;
    currentPhaseIndexRef.current = 0;
    setSessionState('running');
    setCurrentCycle(0);
    setCurrentPhaseIndex(0);
    setPhaseTimeRemaining(exercise.phases[0].duration);
    setPhaseProgress(0);
    setSessionProgress(0);
    setSessionTimeRemaining(null);

    prepareMusic();

    // Phase sounds and music start once the preparation countdown ends (see tick)
    const prepSeconds = preparationTime;
    isPreparingRef.current = true;
    setIsPreparing(prepSeconds > 0);
    setPrepTimeRemaining(prepSeconds);
    startTimeRef.current = performance.now() + prepSeconds * 1000;

    scheduleStep();
  };

  const pause = () => {
    if (sessionStateRef.current !== 'running') return;

    sessionStateRef.current = 'paused';
    setSessionState('paused');
    pauseTimeRef.current = performance.now();
    audioServiceRef.current.stop();
    audioServiceRef.current.pauseMusic();
    cancelStep();
  };

  const resume = () => {
    if (sessionStateRef.current !== 'paused') return;

    audioServiceRef.current.unlock();
    const pauseDuration = performance.now() - pauseTimeRef.current;
    startTimeRef.current += pauseDuration;
    sessionStateRef.current = 'running';
    setSessionState('running');

    if (!isPreparingRef.current) {
      playCurrentPhase(getCurrentPhase(), { bell: false });
      if (musicStartedRef.current) audioServiceRef.current.resumeMusic();
    }
    scheduleStep();
  };

  const stop = () => {
    reportSessionEnd(false);
    runIdRef.current++;
    sessionStateRef.current = 'idle';
    currentCycleRef.current = 0;
    currentPhaseIndexRef.current = 0;
    setSessionState('idle');
    setCurrentCycle(0);
    setCurrentPhaseIndex(0);
    setPhaseTimeRemaining(0);
    setPhaseProgress(0);
    setSessionProgress(0);
    setSessionTimeRemaining(null);
    isPreparingRef.current = false;
    setIsPreparing(false);
    audioServiceRef.current.stop();
    audioServiceRef.current.stopMusic(SETTLE_SECONDS);
    cancelStep();
  };

  // A session still going when the exercise changes (e.g. edits synced in from
  // another device) is recorded for the time breathed before the reset below.
  // This cleanup belongs to the render of the old exercise, so it reports that one.
  useEffect(() => () => reportSessionEnd(false), [exercise]);

  // Reset when exercise changes
  useEffect(() => {
    // Always stop and reset when exercise changes to ensure clean state
    startedAtRef.current = null;
    runIdRef.current++;
    sessionStateRef.current = 'idle';
    currentCycleRef.current = 0;
    currentPhaseIndexRef.current = 0;
    setSessionState('idle');
    setCurrentCycle(0);
    setCurrentPhaseIndex(0);
    setPhaseTimeRemaining(0);
    setPhaseProgress(0);
    setSessionProgress(0);
    setSessionTimeRemaining(null);
    isPreparingRef.current = false;
    setIsPreparing(false);
    audioServiceRef.current.stop();
    audioServiceRef.current.stopMusic();
    cancelStep();
  }, [exercise]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      audioServiceRef.current.stop();
      audioServiceRef.current.stopMusic();
      cancelStep();
    };
  }, []);

  const setVolume = (value) => {
    audioServiceRef.current.setVolume(value);
  };

  return {
    sessionState,
    currentCycle: currentCycle + 1, // Display as 1-indexed
    totalCycles: exercise?.cycles || 0,
    currentPhase: getCurrentPhase(),
    currentPhaseIndex,
    isPreparing,
    prepTimeRemaining,
    phaseTimeRemaining,
    phaseProgress,
    sessionProgress,
    // Before breathing starts (idle, countdown) this is the whole exercise
    sessionTimeRemaining: sessionTimeRemaining ?? getTotalDuration(),
    // Seconds breathed so far this session (0 before breathing starts and after the end)
    breathedSeconds: startedAtRef.current && sessionTimeRemaining !== null
      ? Math.max(0, getTotalDuration() - sessionTimeRemaining)
      : 0,
    start,
    pause,
    resume,
    stop,
    setVolume
  };
};
