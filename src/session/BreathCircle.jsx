import React, { useRef } from 'react';
import { useTranslation } from '../i18n';
import { BreathAction } from './controls';
import { cycleLevels, easeInOutSine, lerp, phaseColorVars, phaseKey } from './breath';

// Breath Circle Component — phase ring + breathing inner circle.
// Phase colors are CSS variables (--phase-inhale, …, see styles/theme.css):
// the ring segments use them, and the inner circle takes the current phase's
// color (crossfading at each change). Its size shows the breath; during a hold
// it simply stays still.
const BREATH_MIN_SCALE = 0.72;

// Ring geometry (SVG user units)
// Wide, short viewBox: side labels need horizontal room, top/bottom barely any
const RING_VIEWBOX = { x: -40, y: 35, width: 480, height: 330 };
const RING_CENTER = 200;
const RING_RADIUS = 130;
const RING_STROKE = 14;
const RING_GAP_DEG = 8; // gap between segments, accounts for round caps
const RING_LABEL_RADIUS = 150;
const INNER_MAX_DIAMETER = 2 * (RING_RADIUS - RING_STROKE / 2 - 8);

// Angle in degrees, clockwise from 12 o'clock
const polar = (angle, radius) => {
  const rad = (angle * Math.PI) / 180;
  return [RING_CENTER + radius * Math.sin(rad), RING_CENTER - radius * Math.cos(rad)];
};

const arcPath = (startAngle, endAngle) => {
  const [x1, y1] = polar(startAngle, RING_RADIUS);
  if (endAngle - startAngle < 0.01) return `M ${x1} ${y1} L ${x1} ${y1}`;
  const [x2, y2] = polar(endAngle, RING_RADIUS);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${RING_RADIUS} ${RING_RADIUS} 0 ${largeArc} 1 ${x2} ${y2}`;
};

// action: the inner circle is a button (see BreathAction); while it shows ▶
// the text is hidden, while breathing ⏸ takes the text's place on hover.
// minimal: no phase labels around the ring and no "Next" line.
export const BreathCircle = ({ phases, phaseIndex, phaseProgress, timeRemaining, isActive, isPreparing, nextPhase, action, minimal = false, completed = false }) => {
  const { t } = useTranslation();
  const phaseType = isPreparing ? 'prepare' : isActive ? phases[phaseIndex].type : completed ? 'done' : 'ready';
  const showRingProgress = isActive && !isPreparing;
  const phaseLabel = t(`phases.${phaseType}`);
  const p = easeInOutSine(Math.min(1, Math.max(0, phaseProgress / 100)));

  // Inner circle size follows how full the lungs are (see cycleLevels): an
  // inhale grows it to full size, an exhale shrinks it, hold and sustain keep it.
  // Small before breathing starts.
  // Small before breathing starts; during the countdown it eases to where the
  // first phase begins (small for an inhale).
  const breathing = isActive && !isPreparing;
  let level = 0;
  if (breathing) {
    const [fromLevel, toLevel] = cycleLevels(phases)[phaseIndex];
    level = lerp(fromLevel, toLevel, p);
  } else if (isPreparing) {
    level = cycleLevels(phases)[0][0];
  }
  const scale = lerp(BREATH_MIN_SCALE, 1, level);
  // Not breathing: size and color changes glide instead of jumping
  const settling = breathing ? '' : 'settling';

  const colorVars = phaseColorVars(phases, phaseIndex, breathing);

  // Outer ring: one segment per phase, proportional to its duration
  const total = phases.reduce((sum, phase) => sum + phase.duration, 0);
  const gap = phases.length > 1 ? RING_GAP_DEG : 0;
  let elapsed = 0;
  const segments = phases.map((phase, i) => {
    const start = (elapsed / total) * 360 + gap / 2;
    elapsed += phase.duration;
    const end = (elapsed / total) * 360 - gap / 2;

    let fill = 0;
    if (showRingProgress && i < phaseIndex) fill = 1;
    else if (showRingProgress && i === phaseIndex) fill = Math.min(1, phaseProgress / 100);

    return { phase, start, end, fill, mid: (start + end) / 2 };
  });

  // After Stop or the end, the ring's progress fades out instead of vanishing
  const lastFillsRef = useRef(null);
  if (showRingProgress) lastFillsRef.current = { phases, fills: segments.map((segment) => segment.fill) };
  const fadingFills = !showRingProgress && lastFillsRef.current?.phases === phases
    ? lastFillsRef.current.fills
    : null;

  return (
    <div className="breath-circle" style={colorVars}>
      <svg
        className="breath-ring"
        viewBox={`${RING_VIEWBOX.x} ${RING_VIEWBOX.y} ${RING_VIEWBOX.width} ${RING_VIEWBOX.height}`}
      >
        {segments.map(({ phase, start, end, fill, mid }, i) => {
          const segClass = `ring-segment phase-${phaseKey(phase.type)}`;
          const [lx, ly] = polar(mid, RING_LABEL_RADIUS);
          // Anchor side labels on their inner edge so they never overlap the ring
          const side = Math.sin((mid * Math.PI) / 180);
          const anchor = side > 0.3 ? 'start' : side < -0.3 ? 'end' : 'middle';
          return (
            <g key={i}>
              <path
                d={arcPath(start, end)}
                className={`${segClass} ring-track`}
                strokeWidth={RING_STROKE}
                strokeLinecap="round"
                fill="none"
              />
              {showRingProgress && i <= phaseIndex && (
                <path
                  d={arcPath(start, lerp(start, end, fill))}
                  className={segClass}
                  strokeWidth={RING_STROKE}
                  strokeLinecap="round"
                  fill="none"
                />
              )}
              {fadingFills?.[i] > 0 && (
                <path
                  d={arcPath(start, lerp(start, end, fadingFills[i]))}
                  className={`${segClass} ring-fading`}
                  strokeWidth={RING_STROKE}
                  strokeLinecap="round"
                  fill="none"
                />
              )}
              {!minimal && <text
                x={lx}
                y={ly}
                className="breath-ring-label"
                textAnchor={anchor}
                dominantBaseline="middle"
              >
                {t(`phases.${phase.type}`)} {phase.duration}
              </text>}
            </g>
          );
        })}
      </svg>

      <div
        className={`breath-inner ${settling}`}
        style={{
          width: `${(INNER_MAX_DIAMETER / RING_VIEWBOX.width) * 100}%`,
          transform: `translate(-50%, -50%) scale(${scale})`
        }}
      />

      {action && (
        <BreathAction
          action={action}
          className={settling}
          style={{
            width: `${(INNER_MAX_DIAMETER / RING_VIEWBOX.width) * 100}%`,
            transform: `translate(-50%, -50%) scale(${scale})`
          }}
        />
      )}

      <div className={`breath-text ${action?.kind === 'play' ? 'concealed' : ''}`}>
        <div className={`breath-phase ${phaseLabel.length > 9 ? 'long' : ''}`}>{phaseLabel}</div>
        {isActive && (
          <>
            <div className="breath-seconds">{timeRemaining}</div>
          </>
        )}
      </div>

      {/* Under the visual, not in the circle: it's secondary, and longer
          languages wouldn't fit inside a circle that keeps changing size */}
      {isActive && nextPhase && !minimal && (
        <div className="breath-next">
          {t('session.nextPhase')
            .replace('{phase}', t(`phases.${nextPhase.type}`).toLowerCase())
            .replace('{seconds}', nextPhase.duration)}
        </div>
      )}
    </div>
  );
};
