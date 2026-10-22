import React, { useEffect, useState } from 'react';
import { useAppData } from '../AppData';
import { useTranslation } from '../i18n';
import { Toggle } from './controls';

// Settings → Data and privacy: what's stored, session history, data folder, reset

// ==================== PRIVACY ====================
// What the app stores and where; it sends nothing anywhere
export const PrivacySettings = () => {
  const { t } = useTranslation();
  const { dataFolder } = useAppData();
  const desktop = Boolean(dataFolder);
  const items = ['exercises', 'sessions', 'device', desktop && 'sounds'].filter(Boolean);

  return (
    <section className="settings-section privacy">
      <h3>{t('privacy.title')}</h3>
      <p className="privacy-lead">{t('privacy.lead')}</p>
      <h4 className="level-group">{t('privacy.storedTitle')}</h4>
      <ul className="guide-list">
        {items.map((item) => <li key={item}>{t(`privacy.stored.${item}`)}</li>)}
      </ul>
      <p>{t(desktop ? 'privacy.whereDesktop' : 'privacy.whereWeb')}</p>
      <p>{t(desktop ? 'privacy.syncDesktop' : 'privacy.hostWeb')}</p>
      <h4 className="level-group">{t('privacy.noCloudTitle')}</h4>
      <p>{t(desktop ? 'privacy.noCloud' : 'privacy.noCloudWeb')}</p>
      <p>{t(desktop ? 'privacy.backup' : 'privacy.backupWeb')}</p>
      <p className="settings-hint">{t('privacy.links')} {t('privacy.source')}</p>
    </section>
  );
};

// ==================== SESSION HISTORY ====================
export const SessionHistorySettings = () => {
  const { t } = useTranslation();
  const { device, updateDevice, getSessions, deleteSessions, dataFolder } = useAppData();
  const [count, setCount] = useState(null); // sessions saved, null while counting
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState(null); // { text, error }

  const recount = () => getSessions().then((sessions) => setCount(sessions.length)).catch(() => setCount(null));
  useEffect(() => {
    recount();
  }, []);

  const handleDelete = async () => {
    setConfirming(false);
    try {
      await deleteSessions();
      setMessage({ text: t('history.deleted') });
    } catch (e) {
      setMessage({ text: t('history.deleteError').replace('{error}', String(e?.message ?? e)), error: true });
    }
    recount();
  };

  return (
    <section className="settings-section">
      <h3>{t('history.title')}</h3>
      <Toggle
        checked={device.recordSessions !== false}
        onChange={(checked) => updateDevice({ recordSessions: checked })}
      >
        {t('history.keep')}
      </Toggle>
      <p className="settings-hint toggle-hint">{t('history.keepHint')}</p>

      <p className="history-count">
        {count === null ? '\u00a0' : t('history.count').replace('{n}', count)}
      </p>
      {confirming ? (
        <div className="confirm-inline">
          <span>{t(dataFolder ? 'history.confirmSynced' : 'history.confirm')}</span>
          <button className="btn btn-stop" onClick={handleDelete}>{t('history.confirmDelete')}</button>
          <button className="btn btn-secondary" onClick={() => setConfirming(false)}>{t('settings.cancel')}</button>
        </div>
      ) : (
        <button className="btn btn-outline-danger" disabled={!count} onClick={() => { setMessage(null); setConfirming(true); }}>
          {t('history.delete')}
        </button>
      )}
      {message && <p className={message.error ? 'settings-warning' : 'settings-success'}>{message.text}</p>}
    </section>
  );
};

// ==================== DATA FOLDER (desktop only) ====================
export const DataFolderSettings = ({ onChanged }) => {
  const { t } = useTranslation();
  const { dataFolder } = useAppData();
  const [message, setMessage] = useState(null); // { text, error }
  const [busy, setBusy] = useState(false);

  if (!dataFolder) return null;

  const run = async (action) => {
    setBusy(true);
    setMessage(null);
    try {
      const result = await action();
      if (result) {
        const key = result.found ? 'folderFound' : result.copied > 0 ? 'folderCopied' : 'folderSwitched';
        setMessage({ text: t(`settings.${key}`) });
        onChanged();
      }
    } catch (e) {
      setMessage({ text: t('settings.folderError').replace('{error}', String(e?.message ?? e)), error: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="settings-section">
      <h3>{t('settings.dataFolder')}</h3>
      <div className="data-folder-path">
        <code>{dataFolder.location}</code>
        {dataFolder.isDefault && <span className="data-folder-tag">{t('settings.dataFolderDefault')}</span>}
      </div>
      {dataFolder.missing && (
        <p className="settings-warning">
          {t('settings.folderMissing').replace('{path}', dataFolder.missing)}
        </p>
      )}
      <p className="settings-hint">{t('settings.dataFolderHint')}</p>
      <div className="editor-actions">
        <button className="btn btn-secondary" disabled={busy} onClick={() => run(dataFolder.choose)}>
          {t('settings.chooseFolder')}
        </button>
        {!dataFolder.isDefault && (
          <button className="btn btn-secondary" disabled={busy} onClick={() => run(dataFolder.useDefault)}>
            {t('settings.useDefaultFolder')}
          </button>
        )}
      </div>
      {message && (
        <p className={message.error ? 'settings-warning' : 'settings-success'}>{message.text}</p>
      )}
    </section>
  );
};

// ==================== RESET ====================
export const ResetSettings = ({ onReset }) => {
  const { t } = useTranslation();
  const { resetToDefaults } = useAppData();
  const [confirming, setConfirming] = useState(false);

  return (
    <section className="settings-section">
      <h3>{t('settings.resetTitle')}</h3>
      <p className="settings-hint">{t('settings.resetHint')}</p>
      {confirming ? (
        <div className="confirm-inline">
          <button
            className="btn btn-stop"
            onClick={() => {
              resetToDefaults();
              onReset();
            }}
          >
            {t('settings.confirmReset')}
          </button>
          <button className="btn btn-secondary" onClick={() => setConfirming(false)}>
            {t('settings.cancel')}
          </button>
        </div>
      ) : (
        <button className="btn btn-outline-danger" onClick={() => setConfirming(true)}>
          {t('settings.reset')}
        </button>
      )}
    </section>
  );
};
