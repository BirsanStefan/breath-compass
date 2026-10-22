import React from 'react';
import { useTranslation, usePlural } from '../i18n';
import { formatDuration } from '../format';
import { goalProgress } from '../dailyProgress';

// One line after an exercise: how long you breathed, where today stands
// against the daily goal ("Daily goal reached ✓" once met) and the streak
// (from 2 days). completion: { seconds, day } from App; day (null until the
// session is saved, and with the history off) is { seconds, goal, streak }.
export const CompletionSummary = ({ completion }) => {
  const { t } = useTranslation();
  const plural = usePlural();
  if (!completion) return null;
  const { day } = completion;
  const today = day && goalProgress(day.seconds, day.goal);

  return (
    <p className="completion">
      <span>
        <strong>{formatDuration(completion.seconds)}</strong> {t('session.breathed')}
      </span>
      {today && (today.met ? (
        <span className="completion-goal">✓ {t('session.goalReached')}</span>
      ) : (
        <span>
          <strong>{t('session.goalOf').replace('{done}', today.minutes).replace('{goal}', today.goal)}</strong> {t('session.today')}
        </span>
      ))}
      {day?.streak >= 2 && (
        <span>
          <strong>{day.streak}</strong> {plural('session.streakDays', day.streak)}
        </span>
      )}
    </p>
  );
};
