import React, { useState } from 'react';
import { useAppData } from '../AppData';
import { useTranslation } from '../i18n';
import { backgroundSoundFiles } from '../sounds';
import { USER_SOUND_PREFIX, suggestedLevel } from '../storage/appData';
import { stopPreview } from '../soundPreview';
import { BREATH_SOUND_REFS } from '../breathSounds';
import { PHASE_TYPES, LIMITS, parseIntInRange, cyclesForMinutes, moveItem, withLevel } from '../exerciseDraft';
import { formatDuration, levelLabels, levelNames } from '../format';
import { BreathShape } from '../session/BreathShape';
import { PreviewButton, Segmented } from './controls';

// A built-in exercise (builtIn) shows its name, description and phases
// read-only: only its length and music can change; duplicate it for the rest.
// It can be hidden instead of deleted.
export const ExerciseEditor = ({
  draft, isDirty, isNew, builtIn, levels, hidden, canDelete, canHide, errors,
  onChange, onSave, onCancel, onDelete, onDuplicate, onToggleHidden, onShowGuide
}) => {
  const { t, soundName } = useTranslation();
  const { soundLibrary } = useAppData();
  const userSoundRefs = (soundLibrary?.files ?? []).map((file) => USER_SOUND_PREFIX + file);
  // Desktop: import a sound right here, and use it for this exercise (the
  // draft stays as it is; it's added to "Your sounds" in Settings → Sound too)
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState(null);
  const importMusic = async () => {
    setImporting(true);
    setImportError(null);
    try {
      const name = await soundLibrary.importSound();
      if (name) {
        stopPreview();
        setField('backgroundSound', USER_SOUND_PREFIX + name);
      }
    } catch (e) {
      setImportError(t('settings.soundError').replace('{error}', String(e?.message ?? e)));
    } finally {
      setImporting(false);
    }
  };
  const knownSound = !draft.backgroundSound
    || BREATH_SOUND_REFS.includes(draft.backgroundSound)
    || backgroundSoundFiles.includes(draft.backgroundSound)
    || userSoundRefs.includes(draft.backgroundSound);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const setField = (field, value) => onChange({ ...draft, [field]: value });
  const setPhases = (phases) => onChange({ ...draft, phases });
  const setPhase = (index, patch) =>
    setPhases(draft.phases.map((phase, i) => (i === index ? { ...phase, ...patch } : phase)));

  // Live total, using only the values that are currently valid
  const cycles = parseIntInRange(draft.cycles, LIMITS.cycles);
  const durations = draft.phases.map((phase) => parseIntInRange(phase.duration, LIMITS.duration));
  const durationsValid = durations.every((d) => d !== null);
  const total = cycles !== null && durationsValid
    ? formatDuration(cycles * durations.reduce((sum, d) => sum + d, 0))
    : '—';

  // Minutes: typing sets the cycles to the closest match. While not being
  // typed in, it shows the length the cycles give.
  const [minutesInput, setMinutesInput] = useState(null);
  const derivedMinutes = cycles !== null && durationsValid
    ? String(Math.max(1, Math.round((cycles * durations.reduce((sum, d) => sum + d, 0)) / 60)))
    : '';
  const minutes = parseIntInRange(minutesInput ?? derivedMinutes, LIMITS.minutes);
  const setMinutes = (value) => {
    setMinutesInput(value);
    const n = parseIntInRange(value, LIMITS.minutes);
    if (n !== null && durationsValid) {
      setField('cycles', String(cyclesForMinutes(durations.map((duration) => ({ duration })), n)));
    }
  };

  return (
    <div className="exercise-editor">
      {builtIn && <p className="settings-hint built-in-note">{t('settings.builtInNote')}</p>}
      {/* Making an exercise (new, or a duplicate): the pattern is the user's
          choice and responsibility */}
      {isNew && (
        <p className="settings-hint built-in-note custom-exercise-note">
          {t('settings.customExerciseNote')}{' '}
          <button type="button" className="btn-link guide-link" onClick={() => onShowGuide('safety')}>
            {t('guide.open')}
          </button>
        </p>
      )}

      <label className="settings-field">
        <span>{t('settings.name')}</span>
        <input type="text" value={draft.name} disabled={builtIn} onChange={(e) => setField('name', e.target.value)} />
      </label>

      <label className="settings-field">
        <span>{t('settings.description')}</span>
        <input type="text" value={draft.description} disabled={builtIn} onChange={(e) => setField('description', e.target.value)} />
      </label>

      <div className="settings-row">
        <label className="settings-field">
          <span>{t('settings.cycles')}</span>
          <input
            type="number"
            min={LIMITS.cycles.min}
            max={LIMITS.cycles.max}
            value={draft.cycles}
            className={cycles === null ? 'invalid' : ''}
            onChange={(e) => setField('cycles', e.target.value)}
          />
        </label>
        <label className="settings-field" title={t('settings.minutesHint')}>
          <span>{t('settings.minutes')}</span>
          <input
            type="number"
            min={LIMITS.minutes.min}
            max={LIMITS.minutes.max}
            value={minutesInput ?? derivedMinutes}
            className={minutesInput !== null && minutes === null ? 'invalid' : ''}
            disabled={!durationsValid}
            onFocus={() => setMinutesInput(derivedMinutes)}
            onBlur={() => setMinutesInput(null)}
            onChange={(e) => setMinutes(e.target.value)}
          />
        </label>
        <div className="settings-field">
          <span>{t('settings.totalDuration')}</span>
          <div className="settings-value">{total}</div>
        </div>
      </div>

      <div className="settings-field">
        <span>{t('settings.music')}</span>
        <div className="music-picker">
          <select
            aria-label={t('settings.music')}
            value={draft.backgroundSound}
            onChange={(e) => {
              stopPreview();
              setField('backgroundSound', e.target.value);
            }}
          >
            <option value="">{t('settings.noMusic')}</option>
            <optgroup label={t('settings.breathSounds')}>
              {BREATH_SOUND_REFS.map((ref) => (
                <option key={ref} value={ref}>{soundName(ref)}</option>
              ))}
            </optgroup>
            <optgroup label={t('settings.builtInSounds')}>
              {backgroundSoundFiles.map((file) => (
                <option key={file} value={file}>{soundName(file)}</option>
              ))}
            </optgroup>
            {userSoundRefs.length > 0 && (
              <optgroup label={t('settings.yourSounds')}>
                {userSoundRefs.map((ref) => (
                  <option key={ref} value={ref}>{soundName(ref)}</option>
                ))}
              </optgroup>
            )}
            {/* Keep a sound that isn't available here visible instead of silently dropping it
                (e.g. imported on another device and not synced yet) */}
            {!knownSound && (
              <option value={draft.backgroundSound}>
                {soundName(draft.backgroundSound)} {t('settings.missingSound')}
              </option>
            )}
          </select>
          <PreviewButton soundRef={knownSound ? draft.backgroundSound : ''} />
        </div>
        {soundLibrary && (
          <button type="button" className="btn-link import-music" disabled={importing} onClick={importMusic}>
            {t('settings.importOwnMusic')}
          </button>
        )}
        {importError && <p className="settings-warning">{importError}</p>}
      </div>

      {/* An advanced built-in's level: the same pattern, with longer holds or
          exhales; the length in minutes stays */}
      {levels && (
        <div className="settings-field">
          <span>{t('settings.level')}</span>
          {/* "Standard" over its seconds or ratio; the hint names the one to start with */}
          <Segmented
            className="level-picker"
            label={t('settings.level')}
            options={levels.map((_, i) => i)}
            value={draft.level}
            optionLabel={(i) => (
              <>
                <span className="level-name">{t(`settings.levelNames.${levelNames(levels.length)[i]}`)}</span>
                <span className="level-pattern">{levelLabels(levels)[i]}</span>
              </>
            )}
            onChange={(i) => onChange(withLevel(draft, i, levels))}
          />
          <p className="settings-hint">
            {t('settings.levelHint').replace(
              '{level}',
              t(`settings.levelNames.${levelNames(levels.length)[suggestedLevel(draft)]}`)
            )}
          </p>
        </div>
      )}

      <div className="settings-field">
        <span className="settings-label-row">
          {t('settings.phases')}
          <button type="button" className="btn-link guide-link" onClick={() => onShowGuide('phases')}>
            {t('guide.whatPhases')}
          </button>
        </span>
        {/* Live, from the phases whose durations are valid so far */}
        <BreathShape
          phases={draft.phases
            .map((phase, index) => ({ type: phase.type, duration: durations[index] }))
            .filter((phase) => phase.duration !== null)}
          className="editor-shape"
        />
        <div className="phase-list">
          {draft.phases.map((phase, index) => (
            <div key={index} className="phase-row">
              <span className="phase-number">{index + 1}</span>
              <select
                aria-label={t('settings.phaseType')}
                value={phase.type}
                disabled={builtIn}
                onChange={(e) => setPhase(index, { type: e.target.value })}
              >
                {PHASE_TYPES.map((type) => (
                  <option key={type} value={type}>{t(`phases.${type}`)}</option>
                ))}
              </select>
              <input
                type="number"
                aria-label={t('settings.duration')}
                min={LIMITS.duration.min}
                max={LIMITS.duration.max}
                value={phase.duration}
                disabled={builtIn}
                className={durations[index] === null ? 'invalid' : ''}
                onChange={(e) => setPhase(index, { duration: e.target.value })}
              />
              <span className="settings-unit">s</span>
              {!builtIn && <div className="icon-buttons">
                <button
                  className="icon-btn"
                  title={t('settings.moveUp')}
                  disabled={index === 0}
                  onClick={() => setPhases(moveItem(draft.phases, index, -1))}
                >↑</button>
                <button
                  className="icon-btn"
                  title={t('settings.moveDown')}
                  disabled={index === draft.phases.length - 1}
                  onClick={() => setPhases(moveItem(draft.phases, index, 1))}
                >↓</button>
                <button
                  className="icon-btn danger"
                  title={t('settings.removePhase')}
                  disabled={draft.phases.length === 1}
                  onClick={() => setPhases(draft.phases.filter((_, i) => i !== index))}
                >✕</button>
              </div>}
            </div>
          ))}
          {!builtIn && (
            <button
              className="btn-link"
              onClick={() => setPhases([...draft.phases, { type: 'inhale', duration: '4' }])}
            >
              + {t('settings.addPhase')}
            </button>
          )}
        </div>
      </div>

      {errors.length > 0 && (
        <ul className="settings-errors">
          {errors.map((error) => <li key={error}>{error}</li>)}
        </ul>
      )}

      <div className="editor-actions">
        <button className="btn btn-start" disabled={!isDirty} onClick={onSave}>
          {t('settings.save')}
        </button>
        <button className="btn btn-secondary" disabled={!isDirty} onClick={onCancel}>
          {t('settings.cancel')}
        </button>
        <div className="editor-actions-spacer" />
        {!isNew && (
          <button className="btn btn-secondary" disabled={isDirty} onClick={onDuplicate}>
            {t('settings.duplicate')}
          </button>
        )}
        {builtIn && (
          <button className="btn btn-secondary" disabled={isDirty || (!hidden && !canHide)} onClick={onToggleHidden}>
            {t(hidden ? 'settings.show' : 'settings.hide')}
          </button>
        )}
        {!isNew && !builtIn && canDelete && (
          confirmingDelete ? (
            <div className="confirm-inline">
              <span>{t('settings.deleteQuestion')}</span>
              <button className="btn btn-stop" onClick={onDelete}>{t('settings.confirmDelete')}</button>
              <button className="btn btn-secondary" onClick={() => setConfirmingDelete(false)}>
                {t('settings.cancel')}
              </button>
            </div>
          ) : (
            <button className="btn btn-outline-danger" onClick={() => setConfirmingDelete(true)}>
              {t('settings.delete')}
            </button>
          )
        )}
      </div>
    </div>
  );
};
