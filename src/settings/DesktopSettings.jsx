import React, { useEffect, useState } from 'react';
import { useAppData } from '../AppData';
import { useTranslation } from '../i18n';
import { autostart, TRAY_STYLES } from '../desktop';
import { reminderSettings, normalizeTime, ensureNotificationPermission, showNotification } from '../reminders';
import { DAILY_GOALS, DEFAULT_DAILY_GOAL } from '../stats';
import { Segmented, Toggle } from './controls';

// Settings → Desktop app (desktop only): tray, start with the system, daily reminders
export const DesktopSettings = () => {
  const { t } = useTranslation();
  const { device, updateDevice } = useAppData();
  // Starting with the system is stored by the OS, not in our files
  const [autostartOn, setAutostartOn] = useState(null); // null while checking
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!autostart.available()) return;
    autostart.isEnabled().then(setAutostartOn).catch(() => setAutostartOn(false));
  }, []);

  if (!autostart.available()) return null;

  const handleAutostart = async (enabled) => {
    setError(null);
    try {
      await autostart.set(enabled);
      setAutostartOn(enabled);
    } catch (e) {
      setError(t('desktop.autostartError').replace('{error}', String(e?.message ?? e)));
    }
  };

  return (
    <section className="settings-section">
      <div className="toggle-list">
        <Toggle checked={Boolean(autostartOn)} disabled={autostartOn === null} onChange={handleAutostart}>
          {t('desktop.autostart')}
        </Toggle>
        <div>
          <Toggle
            checked={Boolean(device.startMinimized)}
            disabled={!autostartOn}
            onChange={(checked) => updateDevice({ startMinimized: checked })}
          >
            {t('desktop.startMinimized')}
          </Toggle>
          <p className="settings-hint toggle-hint">{t('desktop.startMinimizedHint')}</p>
        </div>
        <div>
          <Toggle
            checked={device.closeToTray ?? true}
            onChange={(checked) => updateDevice({ closeToTray: checked })}
          >
            {t('desktop.closeToTray')}
          </Toggle>
          <p className="settings-hint toggle-hint">{t('desktop.closeToTrayHint')}</p>
        </div>
      </div>

      <div className="settings-field settings-field-inline tray-style">
        <span>{t('desktop.trayIcon')}</span>
        <Segmented
          label={t('desktop.trayIcon')}
          options={TRAY_STYLES}
          value={device.trayIcon ?? 'grey'}
          optionLabel={(option) => t(`desktop.trayIcons.${option}`)}
          onChange={(option) => updateDevice({ trayIcon: option })}
        />
      </div>
      <p className="settings-hint">{t('desktop.trayIconHint')}</p>
      <div className="toggle-list tray-progress">
        <div>
          <Toggle
            checked={device.trayProgress ?? true}
            onChange={(checked) => updateDevice({ trayProgress: checked })}
          >
            {t('desktop.trayProgress')}
          </Toggle>
          <p className="settings-hint toggle-hint">{t('desktop.trayProgressHint')}</p>
        </div>
      </div>
      {error && <p className="settings-warning">{error}</p>}
    </section>
  );
};

// A time of day ("09:30"). Applied when complete and valid (on leaving the
// field or Enter); anything else goes back to the last good value.
const TimeInput = ({ value, onChange, label }) => {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const commit = (text) => {
    const time = normalizeTime(text);
    if (!time) setDraft(value);
    else if (time !== value) onChange(time);
  };
  return (
    <input
      type="time"
      className="time-input"
      value={draft}
      aria-label={label}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={(e) => commit(e.target.value)}
      onKeyDown={(e) => e.key === 'Enter' && commit(e.target.value)}
    />
  );
};

// Settings → Desktop: daily reminders (see reminders.js)
export const ReminderSettings = () => {
  const { t } = useTranslation();
  const { device, updateDevice, settings, updateSettings } = useAppData();
  const [newTime, setNewTime] = useState('12:00');
  const [message, setMessage] = useState(null); // { text, kind: 'warning' | 'success' }
  if (!autostart.available()) return null; // desktop app only

  const reminders = reminderSettings(device);
  const goal = settings.dailyGoal ?? DEFAULT_DAILY_GOAL;
  const save = (patch) => updateDevice({ reminders: { ...reminders, ...patch } });
  const setTimes = (times) => save({ times: [...new Set(times)].sort() });

  const allowed = async () => {
    const ok = await ensureNotificationPermission().catch(() => false);
    if (!ok) setMessage({ kind: 'warning', text: t('reminders.denied') });
    return ok;
  };

  const handleEnable = async (enabled) => {
    setMessage(null);
    if (enabled && !(await allowed())) return;
    save({ enabled });
  };

  const handleTest = async () => {
    setMessage(null);
    try {
      if (await showNotification(t('reminders.title'), t('reminders.testBody'))) {
        setMessage({ kind: 'success', text: t('reminders.testSent') });
      } else {
        setMessage({ kind: 'warning', text: t('reminders.denied') });
      }
    } catch (e) {
      setMessage({ kind: 'warning', text: t('reminders.error').replace('{error}', String(e?.message ?? e)) });
    }
  };

  return (
    <section className="settings-section reminders">
      <h3>{t('reminders.heading')}</h3>
      <div>
        <Toggle checked={reminders.enabled} onChange={handleEnable}>{t('reminders.enable')}</Toggle>
        <p className="settings-hint toggle-hint">{t('reminders.hint').replace('{goal}', goal)}</p>
      </div>

      <div className={`reminder-times ${reminders.enabled ? '' : 'off'}`}>
        <span className="reminder-times-label">{t('reminders.times')}</span>
        {reminders.times.length === 0 && <p className="settings-hint">{t('reminders.noTimes')}</p>}
        {reminders.times.map((time) => (
          <div className="reminder-time" key={time}>
            <TimeInput
              value={time}
              label={t('reminders.timeLabel')}
              onChange={(changed) => setTimes(reminders.times.map((other) => (other === time ? changed : other)))}
            />
            <button
              type="button"
              className="icon-btn danger"
              title={t('reminders.remove')}
              aria-label={`${t('reminders.remove')} ${time}`}
              onClick={() => setTimes(reminders.times.filter((other) => other !== time))}
            >
              ✕
            </button>
          </div>
        ))}
        <div className="reminder-time reminder-add">
          <TimeInput value={newTime} label={t('reminders.newTimeLabel')} onChange={setNewTime} />
          <button type="button" className="btn btn-secondary btn-small" onClick={() => setTimes([...reminders.times, newTime])}>
            {t('reminders.add')}
          </button>
        </div>
      </div>

      <div className="settings-field settings-field-inline">
        <span>{t('stats.goal')}</span>
        <select value={goal} onChange={(e) => updateSettings({ dailyGoal: Number(e.target.value) })}>
          {DAILY_GOALS.map((minutes) => (
            <option key={minutes} value={minutes}>{minutes} min</option>
          ))}
        </select>
      </div>
      <p className="settings-hint">{t('reminders.goalHint')}</p>

      <div className="reminder-test">
        <button type="button" className="btn btn-secondary btn-small" onClick={handleTest}>{t('reminders.test')}</button>
        {message && (
          <span className={message.kind === 'success' ? 'settings-success' : 'settings-warning'} role="status">{message.text}</span>
        )}
      </div>
    </section>
  );
};
