import React, { Fragment, useEffect, useRef, useState } from 'react';
import { useAppData } from './AppData';
import { useTranslation } from './i18n';
import { stopPreview } from './soundPreview';
import { autostart } from './desktop';
import { GuideSettings } from './Guide';
import { GeneralSettings } from './settings/GeneralSettings';
import { BellSettings, SoundLevelSettings, SoundSettings } from './settings/SoundSettings';
import { DesktopSettings, ReminderSettings } from './settings/DesktopSettings';
import { PrivacySettings, SessionHistorySettings, DataFolderSettings, ResetSettings } from './settings/DataSettings';
import { ExerciseSettings } from './settings/ExerciseSettings';
import { AboutSettings } from './settings/AboutSettings';

// Wide screens: tabs above the content. Phones: a list of the tabs; choosing
// one shows only that tab, with a way back to the list.
// initialTab: the tab to open on (e.g. 'exercises', from the exercise list's note)
const SettingsView = ({ initialTab }) => {
  const { t } = useTranslation();
  const { dataFolder } = useAppData();
  const [tab, setTab] = useState(initialTab ?? 'general');
  const [tabOpen, setTabOpen] = useState(Boolean(initialTab)); // phones: a tab is shown instead of the list
  const viewRef = useRef(null);
  // Bumped when the data is replaced (reset, other folder) so the sections
  // re-read it; the data folder section keeps its own state (its message)
  const [dataVersion, setDataVersion] = useState(0);

  // Leaving Settings stops any preview
  useEffect(() => stopPreview, []);
  const refresh = () => setDataVersion((n) => n + 1);

  // Opens Settings → Guide at a section ('phases', 'exercises', 'safety')
  const [guideFocus, setGuideFocus] = useState(null);
  const showGuide = (section) => {
    openTab('guide');
    setGuideFocus((focus) => ({ section, n: (focus?.n ?? 0) + 1 }));
  };

  const tabs = [
    { id: 'general', label: t('settings.general'), hint: t('settings.tabHints.general') },
    { id: 'sound', label: t('settings.sound'), hint: t('settings.tabHints.sound') },
    { id: 'exercises', label: t('settings.exercises'), hint: t('settings.tabHints.exercises') },
    { id: 'guide', label: t('guide.tab'), hint: t('guide.tabHint') },
    autostart.available() && { id: 'desktop', label: t('desktop.title'), hint: t('settings.tabHints.desktop') },
    { id: 'data', label: t('settings.data'), hint: t(dataFolder ? 'settings.tabHints.data' : 'settings.tabHints.dataWeb') },
    { id: 'about', label: t('about.title'), hint: t('about.tabHint') }
  ].filter(Boolean);
  const current = tabs.find((item) => item.id === tab) ?? tabs[0];

  const content = {
    general: <GeneralSettings />,
    sound: <><BellSettings /><SoundLevelSettings /><SoundSettings /></>,
    exercises: <ExerciseSettings onShowGuide={showGuide} />,
    guide: <GuideSettings focus={guideFocus} />,
    desktop: <><DesktopSettings /><ReminderSettings /></>,
    data: <ResetSettings onReset={refresh} />,
    about: <AboutSettings onShowGuide={showGuide} />
  };

  const openTab = (id) => {
    stopPreview();
    setTab(id);
    setTabOpen(true);
    if (viewRef.current) viewRef.current.scrollTop = 0;
  };

  return (
    <div ref={viewRef} className={`settings-view ${tabOpen ? 'tab-open' : ''}`}>
      <div className="settings-content">
        <h2 className="settings-title">{t('settings.title')}</h2>

        <div className="settings-tabs" role="tablist" aria-label={t('settings.title')}>
          {tabs.map((item) => (
            <button
              key={item.id}
              role="tab"
              id={`settings-tab-${item.id}`}
              aria-selected={item.id === current.id}
              aria-controls={`settings-panel-${item.id}`}
              className={`settings-tab ${item.id === current.id ? 'active' : ''}`}
              onClick={() => openTab(item.id)}
            >
              <span className="settings-tab-label">{item.label}</span>
              <span className="settings-tab-hint">{item.hint}</span>
            </button>
          ))}
        </div>

        <div className="settings-panels">
          <button className="settings-back" onClick={() => setTabOpen(false)}>
            ‹ {t('settings.title')}
          </button>
          <h2 className="settings-panel-title">{current.label}</h2>
          {/* Every tab stays mounted, so switching keeps unsaved edits */}
          {tabs.map((item) => (
            <div
              key={item.id}
              role="tabpanel"
              id={`settings-panel-${item.id}`}
              aria-labelledby={`settings-tab-${item.id}`}
              hidden={item.id !== current.id}
            >
              {item.id === 'data' && (
                <>
                  <PrivacySettings />
                  <SessionHistorySettings key={dataVersion} />
                  <DataFolderSettings onChanged={refresh} />
                </>
              )}
              <Fragment key={dataVersion}>{content[item.id]}</Fragment>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
