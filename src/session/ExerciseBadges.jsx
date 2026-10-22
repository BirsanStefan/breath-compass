import React from 'react';
import { useTranslation } from '../i18n';
import { exerciseBadges } from '../storage/appData';

// An exercise's badges ("Advanced · Hidden"), as a small label above its
// name: on a line of their own, so they never push the name or details aside.
// Nothing for exercises without badges.
export const ExerciseBadges = ({ exercise }) => {
  const { t } = useTranslation();
  const badges = exerciseBadges(exercise);
  if (badges.length === 0) return null;
  return (
    <span className="exercise-badges">
      {badges.map((badge) => t(`badges.${badge}`)).join(' · ')}
    </span>
  );
};
