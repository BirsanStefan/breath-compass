import React, { useEffect, useRef } from 'react';
import { useTranslation } from '../i18n';
import { InfoIcon } from '../icons';
import { useReturnFocus } from '../focus';
import { formatDuration } from '../format';
import { exerciseSeconds } from '../exerciseDraft';
import { BreathShape } from './BreathShape';
import { ExerciseBadges } from './ExerciseBadges';

// Exercise list: a drawer over the session view (slides in from the right on
// desktop, full screen on phones). While open, the selected exercise has focus.
// advancedOff: advanced exercises aren't turned on; a note says where to do it
export const ExerciseList = ({ exercises, selectedIndex, open, onSelect, onClose, onShowSafety, advancedOff, onShowAdvancedSetting }) => {
  const { t, exerciseText } = useTranslation();
  const listRef = useRef(null);
  const itemRefs = useRef([]);
  useReturnFocus(open);

  // Focus the selected exercise and scroll the list (only the list) to show it.
  // Not scrollIntoView: that also scrolls the session view sideways while the
  // drawer is still sliding in from off-screen.
  useEffect(() => {
    const list = listRef.current;
    const item = itemRefs.current[selectedIndex];
    if (!open || !list || !item) return;
    item.focus({ preventScroll: true });
    const margin = 16;
    const top = item.offsetTop;
    const bottom = top + item.offsetHeight;
    if (top < list.scrollTop) {
      list.scrollTop = top - margin;
    } else if (bottom > list.scrollTop + list.clientHeight) {
      list.scrollTop = bottom - list.clientHeight + margin;
    }
  }, [open, selectedIndex]);

  return (
    <>
      <div className={`exercise-backdrop ${open ? 'open' : ''}`} onClick={onClose} />
      {/* While open, the session view behind it is inert (see the app), but
          the header stays usable. Closed, it's inert itself (out of the Tab order).
          Not visibility: hidden — that lags a moment behind opening, and its
          items couldn't take focus right away. */}
      <aside
        ref={listRef}
        className={`exercise-list ${open ? 'open' : ''}`}
        role="dialog"
        aria-label={t('exercises.sectionTitle')}
        aria-hidden={!open}
        inert={open ? undefined : ''}
      >
        <div className="exercise-list-header">
          <h2>{t('exercises.sectionTitle')}</h2>
          <button className="icon-btn exercise-list-close" title={t('exercises.close')} onClick={onClose}>
            ✕
          </button>
        </div>
        {exercises.map((exercise, index) => (
          <div
            key={exercise.id}
            ref={(el) => (itemRefs.current[index] = el)}
            role="button"
            tabIndex={open ? 0 : -1}
            className={`exercise-item ${index === selectedIndex ? 'selected' : ''}`}
            onClick={() => onSelect(index)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSelect(index);
            }}
          >
            <ExerciseBadges exercise={exercise} />
            <div className="exercise-item-title">
              <div className="exercise-name">{exerciseText(exercise, 'name')}</div>
              <BreathShape phases={exercise.phases} className="exercise-shape" />
            </div>
            <div className="exercise-description">{exerciseText(exercise, 'description')}</div>
            <div className="exercise-phases">
              {exercise.phases.map((phase) => `${t(`phases.${phase.type}`)} ${phase.duration}s`).join(' · ')}
            </div>
            <div className="exercise-meta">
              {exercise.cycles} {t('exercises.cycles')} • {formatDuration(exerciseSeconds(exercise))}
            </div>
          </div>
        ))}
        {advancedOff && (
          <p className="exercise-list-note">
            {t('exercises.advancedNote')}{' '}
            <button type="button" className="btn-link" tabIndex={open ? 0 : -1} onClick={onShowAdvancedSetting}>
              {t('exercises.advancedNoteLink')}
            </button>
          </p>
        )}
        <button type="button" className="safety-link" tabIndex={open ? 0 : -1} onClick={onShowSafety}>
          <InfoIcon />
          {t('guide.open')}
        </button>
      </aside>
    </>
  );
};
