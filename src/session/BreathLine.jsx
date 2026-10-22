import React from 'react';
import { useTranslation } from '../i18n';
import { BreathAction } from './controls';
import { cycleSegments, lerp, phaseColorVars, phaseKey } from './breath';

// Breath Line — one cycle drawn as a path, left to right in time: inhale rises
// to the top, hold stays there, exhale falls to the bottom, sustain stays
// there. Each phase is as wide as it is long and takes its phase's color. A dot
// and a cursor follow the breath; the part already breathed this cycle fades.
// Below the graph: the phase (or "Get ready") and its seconds left.
const LINE_VIEWBOX = { width: 480, height: 330 };
const LINE_PAD_X = 24;
const LINE_TOP = 30;
const LINE_BOTTOM = 245; // leaves room for the phase and seconds below
const LINE_STROKE = 10;

export const BreathLine = ({ phases, phaseIndex, phaseProgress, timeRemaining, isActive, isPreparing, action }) => {
  const { t } = useTranslation();
  const breathing = isActive && !isPreparing;
  const progress = Math.min(1, Math.max(0, phaseProgress / 100));
  // The dot, cursor and seconds take the color of the segment they're on
  const colorVars = phaseColorVars(phases, phaseIndex, breathing);

  const x = (fraction) => LINE_PAD_X + fraction * (LINE_VIEWBOX.width - 2 * LINE_PAD_X);
  const y = (level) => lerp(LINE_BOTTOM, LINE_TOP, level);

  const segments = cycleSegments(phases).map((segment, i) => {
    const { phase } = segment;
    const start = [x(segment.start), y(segment.from)];
    const end = [x(segment.end), y(segment.to)];
    let done = 0;
    if (breathing && i < phaseIndex) done = 1;
    else if (breathing && i === phaseIndex) done = progress;
    const split = [lerp(start[0], end[0], done), lerp(start[1], end[1], done)];
    return { phase, start, end, split, done };
  });

  // The dot: where the breath is now (the start of the cycle until breathing begins)
  const dot = breathing ? segments[phaseIndex].split : segments[0].start;
  const line = (from, to) => `M ${from[0]} ${from[1]} L ${to[0]} ${to[1]}`;

  // Positioned by transform, so after Stop or the end they glide back
  return (
    <div className={`breath-line ${breathing ? '' : 'settling'}`} style={colorVars}>
      <svg
        className="breath-line-graph"
        viewBox={`0 0 ${LINE_VIEWBOX.width} ${LINE_VIEWBOX.height}`}
      >
        <line x1={0} y1={LINE_TOP - 16} x2={0} y2={LINE_BOTTOM + 16} className="breath-line-cursor" style={{ transform: `translateX(${dot[0]}px)` }} />
        {segments.map(({ phase, start, end, split, done }, i) => {
          const segClass = `line-segment phase-${phaseKey(phase.type)}`;
          return (
            <g key={i}>
              {done > 0 && (
                <path d={line(start, split)} className={`${segClass} line-done`} strokeWidth={LINE_STROKE} strokeLinecap="round" fill="none" />
              )}
              {done < 1 && (
                <path d={line(split, end)} className={segClass} strokeWidth={LINE_STROKE} strokeLinecap="round" fill="none" />
              )}
            </g>
          );
        })}
        <circle cx={0} cy={0} r={LINE_STROKE * 1.1} className="breath-line-dot" style={{ transform: `translate(${dot[0]}px, ${dot[1]}px)` }} />
      </svg>
      {isActive && (
        <div className="breath-line-status">
          <span className="breath-line-phase">{t(`phases.${isPreparing ? 'prepare' : phases[phaseIndex].type}`)}</span>
          <span className="breath-line-seconds">{timeRemaining}</span>
        </div>
      )}
      {action && <BreathAction action={action} className="area" />}
    </div>
  );
};
