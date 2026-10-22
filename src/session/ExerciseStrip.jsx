import React, { useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from '../i18n';
import { phaseSummary } from '../format';
import { ChevronLeftIcon, ChevronRightIcon } from '../icons';

// How far apart two indexes are going round: 1 = next, -1 = previous, 0 = further
const stepBetween = (from, to, count) => {
  if (to === (from + 1) % count) return 1;
  if (to === (from - 1 + count) % count) return -1;
  return 0;
};

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// The exercise's name between its neighbours (the previous and next exercise,
// dimmed, either side) and its phases underneath: "Inhale 5 · Exhale 5".
// Clicking a neighbour (or the arrow keys, or a swipe on a phone) brings it to
// the middle; clicking the name opens the exercise list. While a session runs
// (locked) the neighbours fade out and the name stays put.
// phases: the current exercise's, at its chosen level
export const ExerciseStrip = ({ exercises, index, phases, locked, onSelect, onOpenList }) => {
  const { t, exerciseText } = useTranslation();
  const rowRef = useRef(null);
  const shownIndex = useRef(index);
  const swipe = useRef(null);

  const count = exercises.length;
  const prevIndex = count > 2 ? (index - 1 + count) % count : null;
  const nextIndex = count > 1 ? (index + 1) % count : null;
  const name = (i) => exerciseText(exercises[i], 'name');
  const names = exercises.map((exercise) => exerciseText(exercise, 'name')).join('\n');

  // When the neighbours' names don't fit beside this name, only their chevrons
  // show. The widest row seen so far is remembered (until the names change), so
  // the names don't come and go while you step through the exercises.
  const [compact, setCompact] = useState(false);
  const widestRow = useRef(0);
  useLayoutEffect(() => {
    widestRow.current = 0;
  }, [names]);
  useLayoutEffect(() => {
    const row = rowRef.current;
    if (!row || typeof ResizeObserver === 'undefined') return undefined;
    const fit = () => {
      const middle = Math.max(
        row.querySelector('.exercise-title-btn').scrollWidth,
        row.querySelector('.exercise-phases').scrollWidth
      );
      let side = 0;
      row.querySelectorAll('.strip-neighbour').forEach((button) => {
        const label = button.querySelector('.strip-name');
        const style = getComputedStyle(button);
        // the button's width with its whole name showing, less the margin it reaches past the edge by
        const spacing = label.clientWidth === 0 ? 0.3 * parseFloat(style.fontSize) : 0;
        const full = button.offsetWidth + label.scrollWidth - label.clientWidth + spacing;
        side = Math.max(side, full + parseFloat(style.marginLeft) + parseFloat(style.marginRight));
      });
      const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
      widestRow.current = Math.max(widestRow.current, middle + 2 * (gap + side));
      setCompact(row.clientWidth < widestRow.current);
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(row);
    document.fonts?.ready.then(fit);
    return () => observer.disconnect();
  }, [index, names, phases]);

  // Slide in from the side it came from
  useLayoutEffect(() => {
    const from = shownIndex.current;
    shownIndex.current = index;
    if (from === index || !rowRef.current?.animate || prefersReducedMotion()) return;
    const step = stepBetween(from, index, count);
    rowRef.current.animate(
      [
        { transform: `translateX(${step * 2}rem)`, opacity: 0 },
        { transform: 'translateX(0)', opacity: 1 }
      ],
      { duration: 260, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)' }
    );
  }, [index, count]);

  const select = (i) => {
    if (!locked && i !== null) onSelect(i);
  };

  // Touch only: a horizontal swipe switches, like the arrow keys
  const onPointerDown = (e) => {
    if (e.pointerType === 'touch') swipe.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e) => {
    const start = swipe.current;
    swipe.current = null;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      select(dx < 0 ? nextIndex : (prevIndex ?? nextIndex));
    }
  };

  const neighbour = (i, side) => {
    if (i === null) return <span aria-hidden="true" />;
    const label = t(side === 'prev' ? 'exercises.previous' : 'exercises.next').replace('{name}', name(i));
    return (
      <button
        type="button"
        className={`strip-neighbour strip-${side}`}
        aria-label={label}
        title={label}
        disabled={locked}
        onClick={() => select(i)}
      >
        {side === 'prev' && <ChevronLeftIcon className="strip-chevron" />}
        <span className="strip-name">{name(i)}</span>
        {side === 'next' && <ChevronRightIcon className="strip-chevron" />}
      </button>
    );
  };

  return (
    <div
      className={`exercise-strip${locked ? ' locked' : ''}${compact ? ' compact' : ''}`}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => { swipe.current = null; }}
    >
      <div className="exercise-strip-row" ref={rowRef}>
        {neighbour(prevIndex, 'prev')}
        <h2 className="exercise-title">
          <button
            type="button"
            className="exercise-title-btn"
            title={locked ? undefined : t('exercises.change')}
            aria-label={locked ? undefined : `${name(index)}, ${t('exercises.change')}`}
            disabled={locked}
            onClick={onOpenList}
          >
            <span className="exercise-title-text">{name(index)}</span>
          </button>
        </h2>
        {neighbour(nextIndex, 'next')}
        <p className="exercise-phases">{phaseSummary(phases, (type) => t(`phases.${type}`))}</p>
      </div>
    </div>
  );
};
