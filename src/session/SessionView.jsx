import React from 'react';
import { useTranslation } from '../i18n';
import { SpeakerIcon, SpeakerLoudIcon, SpeakerMutedIcon, PlayIcon, StopIcon, InfoIcon, QuestionIcon } from '../icons';
import { formatClock } from '../format';
import { BreathCircle } from './BreathCircle';
import { BreathLine } from './BreathLine';
import { ProgressBar, SessionLength } from './controls';
import { ExerciseStrip } from './ExerciseStrip';
import { CompletionSummary } from './CompletionSummary';

// Session View Component
// visual: 'detailed' | 'minimal' (circle) or 'line'
// exercises, exerciseIndex, onSelectExercise: for the strip of names (ExerciseStrip)
// onChangeExercise: opens the exercise list (null while a session runs)
// fullscreen: { available, active, toggle } (see focus.js)
// completion: the summary after finishing (see App and CompletionSummary), or null
export const SessionView = ({ exercise, exercises, exerciseIndex, onSelectExercise, session, visual, volume, muted, onStart, onPause, onResume, onStop, onVolumeChange, onToggleMute, onChangeExercise, fullscreen, completion, nextExercise, onNext, onLengthChange, onShowShortcuts, onShowSafety, onShowPhases, inert = false }) => {
  const { t, exerciseText } = useTranslation();
  const isActive = session.sessionState === 'running' || session.sessionState === 'paused';

  // Next phase wraps to the start of the next cycle; none after the very last phase
  const isLastPhaseOfCycle = session.currentPhaseIndex === exercise.phases.length - 1;
  const isLastCycle = session.currentCycle === session.totalCycles;
  const nextPhase = session.isPreparing
    ? exercise.phases[0]
    : isLastPhaseOfCycle
      ? (isLastCycle ? null : exercise.phases[0])
      : exercise.phases[session.currentPhaseIndex + 1];

  // What screen readers announce (see the live region below)
  const announcement = session.sessionState === 'completed'
    ? { key: 'done', text: t('session.exerciseComplete') }
    : session.sessionState === 'paused'
      ? { key: 'paused', text: t('session.paused') }
      : session.isPreparing
        ? { key: 'prepare', text: t('phases.prepare') }
        : session.sessionState === 'running'
          ? {
              key: `${session.currentCycle}-${session.currentPhaseIndex}`,
              text: t(`phases.${exercise.phases[session.currentPhaseIndex].type}`)
            }
          : { key: 'idle', text: '' };

  // Cycle count shown next to the session progress label
  const cyclesDone = isActive ? session.currentCycle : 0;

  // The visual itself starts, pauses and resumes
  const breathAction = {
    idle: { kind: 'play', label: t('session.start'), onClick: onStart },
    running: { kind: 'pause', label: t('session.pause'), onClick: onPause },
    paused: { kind: 'play', label: t('session.resume'), onClick: onResume },
    completed: { kind: 'again', label: t('session.again'), onClick: onStart }
  }[session.sessionState];

  return (
    <div className="session-view" inert={inert ? '' : undefined}>
      {/* For screen readers: each phase is announced as it starts (also useful
          with eyes closed). A new element per phase, so a phase repeated right
          after itself is announced again. */}
      <div className="visually-hidden" aria-live="polite" aria-atomic="true">
        <span key={announcement.key}>{announcement.text}</span>
      </div>
      {/* What the phases mean, top left (mirroring full screen); out of the way while breathing */}
      <button
        type="button"
        className={`focus-toggle guide-toggle${isActive ? ' concealed' : ''}`}
        title={`${t('guide.whatPhases')} (H)`}
        aria-label={t('guide.whatPhases')}
        tabIndex={isActive ? -1 : undefined}
        onClick={onShowPhases}
      >
        <QuestionIcon />
      </button>
      {fullscreen.available && (
        <button
          type="button"
          className="focus-toggle"
          title={fullscreen.active ? t('session.exitFullscreen') : t('session.fullscreen')}
          aria-label={fullscreen.active ? t('session.exitFullscreen') : t('session.fullscreen')}
          aria-pressed={fullscreen.active}
          onClick={fullscreen.toggle}
        >
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {fullscreen.active
              ? <path d="M8 3v5H3M12 3v5h5M8 17v-5H3M12 17v-5h5" />
              : <path d="M3 8V3h5M17 8V3h-5M3 12v5h5M17 12v5h-5" />}
          </svg>
        </button>
      )}
      <ExerciseStrip
        exercises={exercises}
        index={exerciseIndex}
        phases={exercise.phases}
        locked={!onChangeExercise}
        onSelect={onSelectExercise}
        onOpenList={onChangeExercise ?? undefined}
      />
      <div className="session-content">
        {visual === 'line' ? (
          <BreathLine
            phases={exercise.phases}
            phaseIndex={session.currentPhaseIndex}
            phaseProgress={session.phaseProgress}
            timeRemaining={session.isPreparing ? session.prepTimeRemaining : session.phaseTimeRemaining}
            isActive={isActive}
            isPreparing={session.isPreparing}
            action={breathAction}
          />
        ) : (
          <BreathCircle
            phases={exercise.phases}
            phaseIndex={session.currentPhaseIndex}
            phaseProgress={session.phaseProgress}
            timeRemaining={session.isPreparing ? session.prepTimeRemaining : session.phaseTimeRemaining}
            isActive={isActive}
            isPreparing={session.isPreparing}
            nextPhase={nextPhase}
            action={breathAction}
            minimal={visual === 'minimal'}
            completed={session.sessionState === 'completed'}
          />
        )}

        {/* Under the visual: the progress and session length, or once done the
            summary in their place. Both share one grid cell and the progress
            stays laid out (hidden), so the cell keeps its height and the
            visual above doesn't move when the exercise ends. */}
        <div className="session-below">
          <div className={`session-below-progress ${session.sessionState === 'completed' ? 'concealed' : ''}`}>
            <ProgressBar
              progress={session.sessionProgress}
              label={session.sessionState === 'idle'
                ? `${session.totalCycles} ${t('exercises.cycles')}`
                : t('session.cycleOf').replace('{n}', cyclesDone).replace('{total}', session.totalCycles)}
              value={session.sessionState === 'idle'
                ? formatClock(session.sessionTimeRemaining)
                : t('session.remaining').replace('{time}', formatClock(session.sessionTimeRemaining))}
              className="session-progress"
            />

            {/* Only before starting, but kept in place (hidden, not removed)
                during a session, so starting doesn't shift the circle */}
            {onLengthChange && (
              <SessionLength exercise={exercise} onChange={onLengthChange} hidden={session.sessionState !== 'idle'} />
            )}
          </div>

          {/* The circle (or line) starts, pauses, resumes and starts again once
              done; the summary shows then, with the next exercise */}
          {session.sessionState === 'completed' && (
            <div className="controls">
              <CompletionSummary completion={completion} />
              {nextExercise && (
                <div className="completion-actions">
                  <button type="button" className="control-btn control-btn-text" onClick={onNext}>
                    <PlayIcon />
                    {t('session.nextExercise').replace('{name}', exerciseText(nextExercise, 'name'))}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom bar: volume left, shortcuts in the middle, Stop right. Quiet,
            and what isn't needed goes first as the window narrows (see CSS) */}
        <div className="session-bar">
          <div className={`volume-control ${muted ? 'muted' : ''}`}>
            <button
              type="button"
              className="mute-btn"
              aria-pressed={muted}
              title={muted ? t('settings.unmute') : t('settings.mute')}
              aria-label={muted ? t('settings.unmute') : t('settings.mute')}
              onClick={onToggleMute}
            >
              {muted ? <SpeakerMutedIcon className="volume-icon" /> : <SpeakerIcon className="volume-icon" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              className="volume-slider"
              aria-label={t('session.volume')}
              // The track is filled up to the handle via this variable (see CSS)
              style={{ '--fill': `${Math.round(volume * 100)}%` }}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            />
            <SpeakerLoudIcon className="volume-icon" />
          </div>

          {/* Keyboard shortcuts; when room runs short only "?" stays, which lists them all */}
          <div className="keyboard-hints">
            <span>{t('keyboard.spaceTip')}</span>
            <span>{t('keyboard.escTip')}</span>
            {fullscreen.available && <span>{t('keyboard.fTip')}</span>}
            <button type="button" className="keyboard-hints-more" onClick={onShowShortcuts}>{t('keyboard.questionTip')}</button>
          </div>

          {/* Stop while an exercise runs; otherwise the safety notes, quietly
              (and only after a moment, so a quick second click on Stop
              doesn't open them) */}
          <div className="session-stop-slot">
            {isActive ? (
              <button type="button" className="session-stop" onClick={onStop}>
                <StopIcon />
                {t('session.stop')}
              </button>
            ) : (
              <button type="button" className="session-safety" onClick={onShowSafety}>
                <InfoIcon />
                {t('guide.open')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
