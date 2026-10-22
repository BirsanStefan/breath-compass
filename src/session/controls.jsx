import React, { useEffect, useState } from 'react';
import { useTranslation } from '../i18n';
import { PlayIcon, PauseIcon, PencilIcon, AgainIcon } from '../icons';
import { LIMITS, cyclesForMinutes, exerciseSeconds, parseIntInRange } from '../exerciseDraft';

// Small pieces of the session screen: the progress bar, the session length
// picker, the play/pause button over a breathing visual, round control buttons.

// Progress Bar Component
export const ProgressBar = ({ progress, label, value, className = '' }) => {
  return (
    <div className={`progress-container ${className}`}>
      {label && (
        <div className="progress-label">
          <span>{label}</span>
          {value && <span className="progress-value">{value}</span>}
        </div>
      )}
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </div>
  );
};

// Session length on the main screen: 5 / 10 / 15 minutes or a custom number.
// Picking one sets the exercise's cycles to the closest match.
const LENGTH_PRESETS = [5, 10, 15];

export const SessionLength = ({ exercise, onChange, hidden = false }) => {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState('');
  useEffect(() => {
    if (hidden) setEditing(false);
  }, [hidden]);
  const minutesLabel = (n) => t('session.minutes').replace('{n}', n);
  const preset = LENGTH_PRESETS.find((m) => cyclesForMinutes(exercise.phases, m) === exercise.cycles);
  const minutes = Math.max(1, Math.round(exerciseSeconds(exercise) / 60));

  const commit = () => {
    const n = parseIntInRange(input, LIMITS.minutes);
    if (n !== null) onChange(n);
    setEditing(false);
  };

  return (
    <div className={`session-length ${hidden ? 'concealed' : ''}`} role="group" aria-label={t('session.length')}>
      {LENGTH_PRESETS.map((m) => (
        <button
          key={m}
          type="button"
          className={preset === m ? 'active' : ''}
          aria-pressed={preset === m}
          onClick={() => onChange(m)}
        >
          {minutesLabel(m)}
        </button>
      ))}
      {editing ? (
        <label className="session-length-custom session-length-own">
          <input
            type="number"
            min={LIMITS.minutes.min}
            max={LIMITS.minutes.max}
            value={input}
            autoFocus
            aria-label={t('session.customLength')}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setInput(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
              if (e.key === 'Escape') setEditing(false);
            }}
          />
          <span>{t('session.min')}</span>
        </label>
      ) : (
        // Your own length: "Other length" until you set one, then "9 min ✎"
        // (the pencil marks it as yours, and that it can be changed)
        <button
          type="button"
          className={`session-length-own${preset ? '' : ' active'}`}
          aria-pressed={!preset}
          aria-label={preset ? undefined : t('session.customLengthIs').replace('{time}', minutesLabel(minutes))}
          title={t('session.customLength')}
          onClick={() => {
            setInput(String(minutes));
            setEditing(true);
          }}
        >
          {preset ? t('session.custom') : (
            <>
              {minutesLabel(minutes)}
              <PencilIcon className="session-length-pencil" />
            </>
          )}
        </button>
      )}
    </div>
  );
};

// Play / pause button laid over a breathing visual. action: { kind, label, onClick }
// — 'play' shows ▶ (before starting, while paused); 'pause' shows ⏸ on hover;
// 'again' (after the end) a small ↻ under "Done"
const ACTION_ICONS = { play: PlayIcon, pause: PauseIcon, again: AgainIcon };
export const BreathAction = ({ action, className = '', style }) => (
  <button
    type="button"
    className={`breath-action ${action.kind} ${className}`}
    aria-label={action.label}
    title={action.label}
    style={style}
    onClick={action.onClick}
  >
    <span className="breath-action-icon">
      {React.createElement(ACTION_ICONS[action.kind])}
    </span>
  </button>
);
