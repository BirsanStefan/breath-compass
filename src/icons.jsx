// Small shared icons (stroke = currentColor)
// Question mark: what the phases mean
export const QuestionIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5.6 6.4a4.4 4.4 0 1 1 6.3 3.9c-1.2.6-1.9 1.5-1.9 2.8v.6" />
    <path d="M10 17.2v.1" />
  </svg>
);

// Info: the safety notes
export const InfoIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
    <circle cx="8" cy="8" r="6.3" />
    <path d="M8 7.2v3.8M8 5v.1" />
  </svg>
);

// Pencil: a value you set yourself, click to change it
export const PencilIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M13.5 3.5l3 3L7 16H4v-3z" />
    <path d="M11.5 5.5l3 3" />
  </svg>
);

export const SpeakerIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 8h3l4-3.5v11L6 12H3z" />
  </svg>
);

export const SpeakerLoudIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 8h3l4-3.5v11L6 12H3z" />
    <path d="M13 7.5a3.5 3.5 0 0 1 0 5M15.5 5a7 7 0 0 1 0 10" />
  </svg>
);

export const SpeakerMutedIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 8h3l4-3.5v11L6 12H3z" />
    <path d="M13 8l4 4M17 8l-4 4" />
  </svg>
);

// Session controls (filled)
export const PlayIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" />
  </svg>
);

export const PauseIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <rect x="6" y="5" width="4" height="14" rx="1" />
    <rect x="14" y="5" width="4" height="14" rx="1" />
  </svg>
);

export const AgainIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" />
    <path d="M4.5 4.5v4h4" />
  </svg>
);

export const ListIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
    <path d="M9 6.5h11M9 12h11M9 17.5h11" />
    <path d="M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01" strokeWidth="3" />
  </svg>
);

export const StopIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </svg>
);

// Chevrons: the previous and next exercise
export const ChevronLeftIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 4.5L6.5 10l5.5 5.5" />
  </svg>
);

export const ChevronRightIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M8 4.5l5.5 5.5L8 15.5" />
  </svg>
);

// The app's places, in the header (wide screens) and the bottom bar (phones)
// Breathe: the breathing circle, simplified
export const BreatheIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="4.2" />
  </svg>
);

export const ExercisesIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <path d="M3 4.5h12M3 9h12M3 13.5h12" />
  </svg>
);

export const StatsIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 18 18" fill="currentColor" aria-hidden="true">
    <rect x="2" y="9" width="3.5" height="7" rx="1" />
    <rect x="7.25" y="4" width="3.5" height="12" rx="1" />
    <rect x="12.5" y="7" width="3.5" height="9" rx="1" />
  </svg>
);

export const SettingsIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
    <path d="M10.3 2.8h3.4l.5 2.6 1.9 1.1 2.5-.9 1.7 2.9-2 1.8v2.2l2 1.8-1.7 2.9-2.5-.9-1.9 1.1-.5 2.6h-3.4l-.5-2.6-1.9-1.1-2.5.9-1.7-2.9 2-1.8v-2.2l-2-1.8 1.7-2.9 2.5.9 1.9-1.1z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
