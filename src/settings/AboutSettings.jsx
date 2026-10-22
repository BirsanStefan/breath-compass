import React from 'react';
import { useAppData } from '../AppData';
import { useTranslation } from '../i18n';
import { openExternal } from '../desktop';
import { version } from '../../package.json';
import { REPO_URL } from '../project';
import { checkForUpdate, isNewer, useUpdateState } from '../updates';
import { isTauri } from '../storage/backends';
import logoUrl from '../../assets/logo.svg';
import { Toggle } from './controls';

// Settings → About: version, update check, links and sources
// Desktop: the update check's setting and result (see updates.js)
const UpdateCheck = () => {
  const { t, locale } = useTranslation();
  const { device, updateDevice } = useAppData();
  const update = useUpdateState();
  const enabled = device.checkUpdates ?? true;
  const available = update.latest && isNewer(update.latest.version, version);
  const checkedAt = update.checkedAt
    ? new Date(update.checkedAt).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })
    : null;

  let status = null;
  if (update.status === 'checking') status = t('about.updates.checking');
  else if (update.status === 'error') status = t('about.updates.error');
  else if (!available && checkedAt) status = t('about.updates.current').replace('{date}', checkedAt);

  return (
    <div className="about-updates">
      {available && (
        <p className="about-update-available" role="status">
          {t('about.updates.available').replace('{version}', update.latest.version)}{' '}
          <ExternalLink href={update.latest.url}>{t('about.updates.download')}</ExternalLink>
        </p>
      )}
      <div className="about-update-row">
        <Toggle checked={enabled} onChange={(checked) => updateDevice({ checkUpdates: checked })}>
          {t('about.updates.toggle')}
        </Toggle>
        <button
          type="button"
          className="btn btn-secondary btn-small"
          onClick={checkForUpdate}
          disabled={update.status === 'checking'}
        >
          {t('about.updates.checkNow')}
        </button>
      </div>
      <p className="settings-hint toggle-hint">
        {t('about.updates.hint')}
        {status && <><br /><span aria-live="polite">{status}</span></>}
      </p>
    </div>
  );
};

// Reading on breathing exercises; titles stay in their original language
const SOURCES = [
  { key: 'nhs', title: 'Breathing exercises for stress', publisher: 'NHS', url: 'https://www.nhs.uk/mental-health/self-help/guides-tools-and-activities/breathing-exercises-for-stress/' },
  { key: 'harvard', title: 'Relaxation techniques: Breath control helps quell errant stress response', publisher: 'Harvard Health Publishing', url: 'https://www.health.harvard.edu/mind-and-mood/relaxation-techniques-breath-control-helps-quell-errant-stress-response' },
  { key: 'zaccaro', title: 'How Breath-Control Can Change Your Life: A Systematic Review on Psycho-Physiological Correlates of Slow Breathing', publisher: 'Zaccaro et al., Frontiers in Human Neuroscience, 2018', url: 'https://doi.org/10.3389/fnhum.2018.00353' },
  { key: 'fincham', title: 'Effect of breathwork on stress and mental health: A meta-analysis of randomised-controlled trials', publisher: 'Fincham et al., Scientific Reports, 2023', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9828383/' },
  { key: 'balban', title: 'Brief structured respiration practices enhance mood and reduce physiological arousal', publisher: 'Balban et al., Cell Reports Medicine, 2023', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9873947/' }
];

const ExternalLink = ({ href, children }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" onClick={openExternal}>{children}</a>
);

export const AboutSettings = ({ onShowGuide }) => {
  const { t } = useTranslation();

  return (
    <>
      <section className="settings-section about-app">
        <img src={logoUrl} className="about-logo" alt="" />
        <div>
          <h3 className="about-name">{t('app.title')}</h3>
          <p className="about-version">{t('about.version').replace('{version}', version)}</p>
          <p>{t('about.description')}</p>
          <p className="about-links">
            <ExternalLink href={REPO_URL}>{t('about.sourceCode')}</ExternalLink>
            <ExternalLink href={`${REPO_URL}/issues`}>{t('about.issues')}</ExternalLink>
          </p>
          {isTauri() && <UpdateCheck />}
        </div>
      </section>

      <section className="settings-section about-text">
        <h3>{t('about.storyTitle')}</h3>
        <p>{t('about.inspiration')}</p>
        <p>{t('about.claude')}</p>
        <p>
          {t('about.credits')}{' '}
          <ExternalLink href={`${REPO_URL}/blob/main/CREDITS.md`}>{t('about.creditsLink')}</ExternalLink>
        </p>
        <p>{t('about.privacy')}</p>
      </section>

      <section className="settings-section about-text">
        <h3>{t('about.learnTitle')}</h3>
        <p>{t('about.learnIntro')}</p>
        <ul className="about-sources">
          {SOURCES.map((source) => (
            <li key={source.key}>
              <ExternalLink href={source.url}>{source.title}</ExternalLink>
              <span>{source.publisher}</span>
            </li>
          ))}
        </ul>
        <p>
          {t('about.patterns')}{' '}
          <ExternalLink href={`${REPO_URL}#breathing-patterns`}>{t('about.patternsLink')}</ExternalLink>
        </p>
        <p className="settings-hint">
          {t('about.safety')}{' '}
          <button type="button" className="btn-link guide-link" onClick={() => onShowGuide('safety')}>
            {t('guide.open')}
          </button>
        </p>
      </section>
    </>
  );
};
