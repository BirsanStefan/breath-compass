import React, { useState } from 'react';
import { useAppData } from '../AppData';
import { useTranslation } from '../i18n';
import { THEMES, PALETTES } from '../theme';
import { LIMITS, parseIntInRange } from '../exerciseDraft';
import { Segmented } from './controls';

// Settings → General: preparation time, theme, session view, phase colors
const SESSION_VIEWS = ['detailed', 'minimal', 'line'];


export const GeneralSettings = () => {
  const { t } = useTranslation();
  const { settings, updateSettings, device, updateDevice } = useAppData();
  const themePreference = device.theme ?? 'system';
  const [prepInput, setPrepInput] = useState(String(settings.preparationTime ?? 0));

  const handlePrepChange = (value) => {
    setPrepInput(value);
    const seconds = parseIntInRange(value, LIMITS.preparationTime);
    if (seconds !== null) updateSettings({ preparationTime: seconds });
  };

  const prepValid = parseIntInRange(prepInput, LIMITS.preparationTime) !== null;

  return (
    <section className="settings-section">
      <label className="settings-field settings-field-inline">
        <span>{t('settings.preparationTime')}</span>
        <input
          type="number"
          min={LIMITS.preparationTime.min}
          max={LIMITS.preparationTime.max}
          value={prepInput}
          className={prepValid ? '' : 'invalid'}
          onChange={(e) => handlePrepChange(e.target.value)}
        />
        <span className="settings-unit">{t('settings.seconds')}</span>
      </label>
      <p className="settings-hint">{t('settings.preparationHint')}</p>

      <div className="settings-field settings-field-inline">
        <span>{t('theme.label')}</span>
        <Segmented
          label={t('theme.label')}
          options={THEMES}
          value={themePreference}
          optionLabel={(option) => t(`theme.${option}`)}
          onChange={(option) => updateDevice({ theme: option })}
        />
      </div>
      <p className="settings-hint">{t('theme.hint')}</p>

      <div className="settings-field settings-field-inline">
        <span>{t('settings.sessionView')}</span>
        <Segmented
          label={t('settings.sessionView')}
          options={SESSION_VIEWS}
          value={device.sessionView ?? 'detailed'}
          optionLabel={(option) => t(`settings.sessionViews.${option}`)}
          onChange={(option) => updateDevice({ sessionView: option })}
        />
      </div>
      <p className="settings-hint">{t('settings.sessionViewHint')}</p>

      <div className="settings-field settings-field-inline">
        <span>{t('settings.palette')}</span>
        <Segmented
          label={t('settings.palette')}
          options={PALETTES}
          value={device.palette ?? 'default'}
          optionLabel={(option) => (
            <>
              <span className="palette-dots" data-palette={option} aria-hidden="true"><i /><i /><i /><i /></span>
              {t(`settings.palettes.${option}`)}
            </>
          )}
          onChange={(option) => updateDevice({ palette: option })}
        />
      </div>
      <p className="settings-hint">{t('settings.paletteHint')}</p>
    </section>
  );
};
