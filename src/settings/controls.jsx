import React from 'react';
import { useAppData } from '../AppData';
import { useTranslation } from '../i18n';
import { playPreview, stopPreview, usePreviewPlaying } from '../soundPreview';
import { soundLevels } from '../audio';

// Small controls shared by the settings tabs

// The main volume as heard: silent while muted
export const masterLevel = (device) => (device.muted ? 0 : device.volume ?? 1);

// Play / stop button for a background sound reference ("blackbird-forest.mp3", "user:rain.mp3")
export const PreviewButton = ({ soundRef }) => {
  const { t } = useTranslation();
  const { resolveSoundUrl, device } = useAppData();
  const playing = usePreviewPlaying() === soundRef && Boolean(soundRef);

  const toggle = async () => {
    if (playing) {
      stopPreview();
      return;
    }
    playPreview(soundRef, await resolveSoundUrl(soundRef), masterLevel(device) * soundLevels(device).music);
  };

  return (
    <button
      type="button"
      className={`icon-btn preview-btn ${playing ? 'playing' : ''}`}
      title={playing ? t('settings.stopPreview') : t('settings.preview')}
      disabled={!soundRef}
      onClick={toggle}
    >
      {playing ? (
        <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><rect x="4" y="4" width="8" height="8" rx="1" /></svg>
      ) : (
        <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M5 3.5v9l7.5-4.5z" /></svg>
      )}
    </button>
  );
};

// Play button for short sounds played through the audio service
export const PlayButton = ({ onClick, disabled }) => {
  const { t } = useTranslation();
  return (
    <button type="button" className="icon-btn preview-btn" title={t('settings.preview')} disabled={disabled} onClick={onClick}>
      <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M5 3.5v9l7.5-4.5z" /></svg>
    </button>
  );
};

// A row of mutually exclusive buttons
export const Segmented = ({ label, options, value, optionLabel, onChange, className = '' }) => (
  <div className={`segmented ${className}`} role="radiogroup" aria-label={label}>
    {options.map((option) => (
      <button
        key={option}
        role="radio"
        aria-checked={value === option}
        className={value === option ? 'active' : ''}
        onClick={() => onChange(option)}
      >
        {optionLabel(option)}
      </button>
    ))}
  </div>
);

export const Toggle = ({ checked, disabled, onChange, children }) => (
  <label className={`toggle ${disabled ? 'disabled' : ''}`}>
    <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
    <span className="toggle-switch" aria-hidden="true" />
    <span>{children}</span>
  </label>
);
