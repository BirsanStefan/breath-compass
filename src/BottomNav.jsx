import React from 'react';
import { useTranslation } from './i18n';
import { BreatheIcon, ExercisesIcon, SettingsIcon, StatsIcon } from './icons';

// ==================== BOTTOM BAR ====================
// Phones only (see responsive.css): the app's four places within thumb's
// reach, in place of the header's buttons. Hidden while a session runs, so
// nothing but the exercise is on screen.

const TABS = [
  { place: 'breathe', Icon: BreatheIcon },
  { place: 'exercises', Icon: ExercisesIcon },
  { place: 'stats', Icon: StatsIcon },
  { place: 'settings', Icon: SettingsIcon }
];

// current: the place shown now; onGo(place) shows another
export const BottomNav = ({ current, hidden, onGo }) => {
  const { t } = useTranslation();
  const labels = {
    breathe: t('nav.breathe'),
    exercises: t('nav.exercises'),
    stats: t('nav.stats'),
    settings: t('nav.settings')
  };

  return (
    <nav className={`bottom-nav${hidden ? ' hidden' : ''}`} inert={hidden ? '' : undefined}>
      {TABS.map(({ place, Icon }) => (
        <button
          key={place}
          type="button"
          className={`bottom-nav-tab${current === place ? ' active' : ''}`}
          aria-current={current === place ? 'page' : undefined}
          onClick={() => onGo(place)}
        >
          <Icon className="bottom-nav-icon" />
          <span className="bottom-nav-label">{labels[place]}</span>
        </button>
      ))}
    </nav>
  );
};
