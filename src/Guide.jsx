import React, { useEffect, useRef } from 'react';
import { useTranslation } from './i18n';
import { useReturnFocus } from './focus';
import { defaultExercises, exerciseLevels } from './storage/appData';
import { openExternal } from './desktop';
import { levelLabels, levelNames, phaseRatio } from './format';
import { PHASE_TYPES } from './exerciseDraft';

// ==================== GUIDE ====================
// What the phases mean, how the built-in exercises work, and safety notes.
// Shown in Settings → Guide; the phases and the safety notes also in dialogs
// opened from the session screen.

const ExternalLink = ({ href, children }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" onClick={openExternal}>{children}</a>
);

const SAFETY_SOURCES = [
  { key: 'nhs', title: 'Breathing exercises for stress', publisher: 'NHS', url: 'https://www.nhs.uk/mental-health/self-help/guides-tools-and-activities/breathing-exercises-for-stress/' },
  { key: 'nccih', title: 'Yoga: Effectiveness and Safety', publisher: 'NCCIH (U.S. National Institutes of Health)', url: 'https://www.nccih.nih.gov/health/yoga-what-you-need-to-know' },
  { key: 'fincham', title: 'Effect of breathwork on stress and mental health: A meta-analysis of randomised-controlled trials', publisher: 'Fincham et al., Scientific Reports, 2023', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9828383/' }
];

// The four phases, one paragraph each
export const PhasesGuide = () => {
  const { t } = useTranslation();
  return (
    <div className="guide-body">
      <p>{t('guide.phasesIntro')}</p>
      <dl className="guide-phases">
        {PHASE_TYPES.map((type) => (
          <div key={type} className={`guide-phase phase-${type}`}>
            <dt>{t(`phases.${type}`)}</dt>
            <dd>{t(`guide.phaseText.${type}`)}</dd>
          </div>
        ))}
      </dl>
      <p className="settings-hint">{t('guide.phasesTip')}</p>
    </div>
  );
};

// The built-in exercises as they come with the app (not as edited since)
export const ExercisesGuide = () => {
  const { t, exerciseText } = useTranslation();
  // "Gentle 3-3-3-3 · Standard 4-4-4-4 · Extended 5-5-5-5"
  const levelText = (levels) => {
    const patterns = levelLabels(levels);
    return levelNames(levels.length).map((name, i) => `${t(`settings.levelNames.${name}`)} ${patterns[i]}`).join(' · ');
  };
  return (
    <div className="guide-body">
      <p>{t('guide.ratiosIntro')}</p>
      <div className="guide-exercises">
        {defaultExercises.map((exercise) => (
          <article key={exercise.id} className="guide-exercise">
            <h4>
              {exerciseText(exercise, 'name')}
              <span className="guide-ratio">{phaseRatio(exercise.phases)}</span>
            </h4>
            <p className="guide-timing">
              {exercise.phases.map((phase) => `${t(`phases.${phase.type}`)} ${phase.duration}s`).join(' · ')}
            </p>
            <p>{t(`guide.exerciseText.${exercise.id}`)}</p>
            {/* Advanced exercises list their levels; the others how to vary them */}
            <p className="settings-hint">
              {exerciseLevels(exercise)
                ? `${t('guide.levels')} ${levelText(exerciseLevels(exercise))}`
                : t(`guide.exerciseTune.${exercise.id}`)}
            </p>
          </article>
        ))}
      </div>
      <p className="settings-hint">{t('guide.customNote')}</p>
    </div>
  );
};

// The disclaimer and safety notes, with sources
export const SafetyContent = () => {
  const { t } = useTranslation();
  const list = (key) => (
    <ul className="guide-list">
      {t(key).split('\n').map((line) => <li key={line}>{line}</li>)}
    </ul>
  );
  return (
    <div className="guide-body">
      <p className="guide-disclaimer">{t('guide.disclaimer')}</p>
      {list('guide.safetyRules')}
      <p>{t('guide.askDoctor')}</p>
      {list('guide.askDoctorList')}
      <p>{t('guide.emergency')}</p>
      <h4>{t('guide.readMore')}</h4>
      <ul className="about-sources">
        {SAFETY_SOURCES.map((source) => (
          <li key={source.key}>
            <ExternalLink href={source.url}>{source.title}</ExternalLink>
            <span>{source.publisher}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

// A part of the guide in a modal dialog. Esc and the close button close it;
// the app's own Esc handling (closing the list, stopping a session) and Space
// are held back while it's open.
// actions: buttons under the content (e.g. to confirm), optional
const GuideDialog = ({ open, onClose, id, title, actions, children }) => {
  const { t } = useTranslation();
  const dialogRef = useRef(null);
  useReturnFocus(open);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const holdBackKeys = (e) => {
      if (e.code === 'Escape' || e.code === 'Space') e.stopPropagation();
    };
    window.addEventListener('keydown', holdBackKeys, true);
    return () => window.removeEventListener('keydown', holdBackKeys, true);
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="guide-dialog"
      aria-labelledby={id}
      onClose={onClose}
      // A click on the backdrop (outside the content box) closes it
      onClick={(e) => e.target === dialogRef.current && onClose()}
    >
      <div className="guide-dialog-content">
        <div className="guide-dialog-header">
          <h2 id={id}>{title}</h2>
          <button className="icon-btn" title={t('guide.close')} onClick={onClose}>✕</button>
        </div>
        {children}
        {actions && <div className="guide-dialog-actions">{actions}</div>}
      </div>
    </dialog>
  );
};

// The safety notes (from the session screen's corner and the exercise list).
// With onConfirm, read before turning on advanced exercises: confirm or cancel.
export const SafetyDialog = ({ open, onClose, onConfirm }) => {
  const { t } = useTranslation();
  const actions = onConfirm && (
    <>
      <button type="button" className="btn btn-start" onClick={onConfirm}>{t('guide.confirmAdvanced')}</button>
      <button type="button" className="btn btn-secondary" onClick={onClose}>{t('guide.cancel')}</button>
    </>
  );
  return (
    <GuideDialog open={open} onClose={onClose} id="safety-dialog-title" title={t('guide.safetyTitle')} actions={actions}>
      <SafetyContent />
    </GuideDialog>
  );
};

// The four phases (the session screen's ? button, or the H key)
export const PhasesDialog = ({ open, onClose }) => {
  const { t } = useTranslation();
  return (
    <GuideDialog open={open} onClose={onClose} id="phases-dialog-title" title={t('guide.phasesTitle')}>
      <PhasesGuide />
    </GuideDialog>
  );
};

// Settings → Guide: the three parts as collapsible sections.
// focus: { section, n } — opens that section and scrolls to it (n changes on
// every request, so asking for the same section again works too)
export const GuideSettings = ({ focus }) => {
  const { t } = useTranslation();
  const [openSections, setOpenSections] = React.useState({ phases: true });
  const refs = useRef({});

  useEffect(() => {
    if (!focus?.section) return;
    setOpenSections((current) => ({ ...current, [focus.section]: true }));
    requestAnimationFrame(() => refs.current[focus.section]?.scrollIntoView({ block: 'start' }));
  }, [focus?.n]);

  const sections = [
    { id: 'phases', title: t('guide.phasesTitle'), content: <PhasesGuide /> },
    { id: 'exercises', title: t('guide.exercisesTitle'), content: <ExercisesGuide /> },
    { id: 'safety', title: t('guide.safetyTitle'), content: <SafetyContent /> }
  ];

  return (
    <div className="guide">
      {sections.map((section) => (
        <details
          key={section.id}
          ref={(el) => (refs.current[section.id] = el)}
          className="settings-section guide-section"
          open={Boolean(openSections[section.id])}
          onToggle={(e) => {
            const isOpen = e.currentTarget.open;
            setOpenSections((current) => (current[section.id] === isOpen ? current : { ...current, [section.id]: isOpen }));
          }}
        >
          <summary>{section.title}</summary>
          {section.content}
        </details>
      ))}
    </div>
  );
};
