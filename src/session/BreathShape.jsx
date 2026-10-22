import React from 'react';
import { cycleSegments, lerp, phaseKey } from './breath';

// An exercise's shape: one cycle drawn like the line view, small and still.
// Shown next to exercise names and in the editor. Decorative (the phases are
// also listed as text), so screen readers skip it. Its size comes from CSS:
// it stretches to fit, and the lines keep their width.
const VIEWBOX = { width: 100, height: 40 };
const PAD = 4;

export const BreathShape = ({ phases, className = '' }) => {
  if (!phases.length || phases.reduce((sum, phase) => sum + phase.duration, 0) <= 0) return null;
  const x = (fraction) => lerp(PAD, VIEWBOX.width - PAD, fraction);
  const y = (level) => lerp(VIEWBOX.height - PAD, PAD, level);

  return (
    <svg
      className={`breath-shape ${className}`}
      viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      {cycleSegments(phases).map((segment, i) => (
        <path
          key={i}
          d={`M ${x(segment.start)} ${y(segment.from)} L ${x(segment.end)} ${y(segment.to)}`}
          className={`line-segment phase-${phaseKey(segment.phase.type)}`}
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          fill="none"
        />
      ))}
    </svg>
  );
};
