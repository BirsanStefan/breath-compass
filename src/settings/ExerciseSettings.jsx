import React, { Fragment, useEffect, useState } from 'react';
import { useAppData } from '../AppData';
import { useTranslation } from '../i18n';
import { exerciseSeconds, toDraft, fromDraft, moveItem } from '../exerciseDraft';
import { isBuiltIn, newExerciseId, exerciseCategory, exerciseLevels, isShown } from '../storage/appData';
import { formatDuration } from '../format';
import { SafetyDialog } from '../Guide';
import { BreathShape } from '../session/BreathShape';
import { ExerciseBadges } from '../session/ExerciseBadges';
import { Toggle } from './controls';
import { ExerciseEditor } from './ExerciseEditor';

// Settings → Exercises: the list of exercises and the editor for the one chosen
export const ExerciseSettings = ({ onShowGuide }) => {
  const { t, exerciseText } = useTranslation();
  const { exercises, updateExercises, settings, updateSettings } = useAppData();
  // Turning on advanced exercises shows the safety notes first, to confirm
  const [confirmingAdvanced, setConfirmingAdvanced] = useState(false);
  // The list here: everything you can use, hidden ones included; advanced
  // exercises only while they're turned on
  const listed = exercises.filter((exercise) => exerciseCategory(exercise) !== 'advanced' || settings.showAdvanced);

  const [selectedId, setSelectedId] = useState(listed[0]?.id);
  // { draft, baseline, isNew, after } — baseline is the draft as it was when
  // editing started; after: a duplicate goes right after this exercise (id)
  const [editing, setEditing] = useState(() => {
    if (!listed[0]) return null;
    const draft = toDraft(listed[0], exerciseText);
    return { draft, baseline: draft, isNew: false };
  });
  const [errors, setErrors] = useState([]);

  const startEditing = (exercise, isNew = false, after = null) => {
    const draft = toDraft(exercise, exerciseText);
    setSelectedId(exercise.id);
    setEditing({ draft, baseline: draft, isNew, after });
    setErrors([]);
  };

  const isDirty = editing
    ? editing.isNew || JSON.stringify(editing.draft) !== JSON.stringify(editing.baseline)
    : false;

  const original = exercises.find((exercise) => exercise.id === selectedId) || null;

  // Advanced exercises turned off while one is open: open the first listed instead
  useEffect(() => {
    if (editing && !editing.isNew && !listed.some((exercise) => exercise.id === selectedId) && listed[0]) {
      startEditing(listed[0]);
    }
  }, [settings.showAdvanced]);

  const handleNew = () => {
    startEditing({
      id: newExerciseId(),
      name: t('settings.newExerciseName'),
      description: '',
      cycles: 10,
      phases: [
        { type: 'inhale', duration: 4 },
        { type: 'exhale', duration: 4 }
      ]
    }, true);
  };

  const handleSave = () => {
    const result = fromDraft(editing.draft, editing.isNew ? null : original, exerciseText);
    if (result.errors) {
      setErrors(result.errors.map((key) => t(`settings.errors.${key}`)));
      return;
    }
    const saved = result.exercise;
    const afterIndex = exercises.findIndex((exercise) => exercise.id === editing.after);
    updateExercises(
      !editing.isNew
        ? exercises.map((exercise) => (exercise.id === saved.id ? saved : exercise))
        : afterIndex >= 0
          ? [...exercises.slice(0, afterIndex + 1), saved, ...exercises.slice(afterIndex + 1)]
          : [...exercises, saved]
    );
    // Re-baseline from the saved values so the form shows them as stored
    const draft = toDraft(saved, exerciseText);
    setEditing({ draft, baseline: draft, isNew: false });
    setErrors([]);
  };

  const handleCancel = () => {
    if (editing.isNew || !original) {
      // A cancelled duplicate goes back to what it was a copy of
      const source = exercises.find((exercise) => exercise.id === editing.after) ?? listed[0];
      if (source) startEditing(source);
      else setEditing(null);
    } else {
      startEditing(original);
    }
  };

  const handleDelete = () => {
    const remaining = exercises.filter((exercise) => exercise.id !== selectedId);
    if (remaining.length === 0) return;
    updateExercises(remaining);
    startEditing(listed.find((exercise) => exercise.id !== selectedId) ?? remaining[0]);
  };

  // A new, unsaved copy to change: "Clear Mind (copy)"
  const handleDuplicate = () => {
    const { level, ...copy } = original; // your copy has its own phases, no levels
    startEditing({
      ...copy,
      id: newExerciseId(),
      name: t('settings.copyName').replace('{name}', exerciseText(original, 'name')),
      description: exerciseText(original, 'description')
    }, true, original.id);
  };

  const handleToggleHidden = () => {
    updateExercises(exercises.map((exercise) => {
      if (exercise.id !== selectedId) return exercise;
      const { hidden, ...shown } = exercise;
      return hidden ? shown : { ...exercise, hidden: true };
    }));
  };

  // Moves past its neighbour in this list (exercises left out of it, like
  // advanced ones while off, keep their places around it)
  const handleMove = (index, offset) => {
    const neighbour = listed[index + offset];
    if (!neighbour) return;
    const from = exercises.indexOf(listed[index]);
    const to = exercises.indexOf(neighbour);
    updateExercises(moveItem(exercises, from, to - from));
  };

  // A new exercise, while unsaved: in the list where it will go
  const afterExisting = exercises.some((exercise) => exercise.id === editing?.after);
  const unsavedItem = editing?.isNew && (
    <li className="settings-exercise-item selected">
      <div className="settings-exercise-select">
        <span className="settings-exercise-name">{editing.draft.name || '—'}</span>
        <span className="settings-exercise-meta">{t('settings.unsaved')}</span>
      </div>
    </li>
  );
  // At least one exercise always stays in the list
  const visibleCount = exercises.filter((exercise) => isShown(exercise, settings)).length;

  return (
    <section className="settings-section">
      <div className="settings-section-header">
        <button className="btn btn-start btn-small" disabled={isDirty} onClick={handleNew}>
          + {t('settings.newExercise')}
        </button>
      </div>

      <Toggle
        checked={Boolean(settings.showAdvanced)}
        onChange={(on) => (on ? setConfirmingAdvanced(true) : updateSettings({ showAdvanced: false }))}
      >
        {t('settings.showAdvanced')}
      </Toggle>
      <p className="settings-hint toggle-hint">{t('settings.showAdvancedHint')}</p>
      <SafetyDialog
        open={confirmingAdvanced}
        onClose={() => setConfirmingAdvanced(false)}
        onConfirm={() => {
          updateSettings({ showAdvanced: true });
          setConfirmingAdvanced(false);
        }}
      />

      <div className="exercise-settings">
        <ul className="settings-exercise-list">
          {listed.map((exercise, index) => {
            const selected = exercise.id === selectedId && !editing?.isNew;
            return (
              <Fragment key={exercise.id}>
                <li
                  className={`settings-exercise-item ${selected ? 'selected' : ''} ${isDirty && !selected ? 'disabled' : ''} ${exercise.hidden ? 'hidden-exercise' : ''}`}
                >
                  <button
                    className="settings-exercise-select"
                    disabled={isDirty && !selected}
                    onClick={() => !selected && startEditing(exercise)}
                  >
                    <ExerciseBadges exercise={exercise} />
                    <span className="settings-exercise-name">{exerciseText(exercise, 'name')}</span>
                    <span className="settings-exercise-details">
                      <span className="settings-exercise-meta">
                        {formatDuration(exerciseSeconds(exercise))} · {exercise.cycles} × {exercise.phases.length} {t('exercises.phases')}
                      </span>
                      <BreathShape phases={exercise.phases} className="exercise-shape" />
                    </span>
                  </button>
                  {/* Only on the selected exercise: the one being worked on */}
                  {selected && <div className="icon-buttons">
                    <button
                      className="icon-btn"
                      title={t('settings.moveUp')}
                      disabled={index === 0 || isDirty}
                      onClick={() => handleMove(index, -1)}
                    >↑</button>
                    <button
                      className="icon-btn"
                      title={t('settings.moveDown')}
                      disabled={index === listed.length - 1 || isDirty}
                      onClick={() => handleMove(index, 1)}
                    >↓</button>
                  </div>}
                </li>
                {editing?.isNew && editing.after === exercise.id && unsavedItem}
              </Fragment>
            );
          })}
          {editing?.isNew && !afterExisting && unsavedItem}
        </ul>

        {editing && (
          <ExerciseEditor
            onShowGuide={onShowGuide}
            key={editing.draft.id}
            draft={editing.draft}
            isDirty={isDirty}
            isNew={editing.isNew}
            builtIn={!editing.isNew && isBuiltIn(original)}
            levels={!editing.isNew ? exerciseLevels(original) : null}
            hidden={Boolean(original?.hidden)}
            canDelete={original?.hidden || visibleCount > 1}
            canHide={visibleCount > 1}
            errors={errors}
            onChange={(draft) => setEditing({ ...editing, draft })}
            onSave={handleSave}
            onCancel={handleCancel}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
            onToggleHidden={handleToggleHidden}
          />
        )}
      </div>
    </section>
  );
};
