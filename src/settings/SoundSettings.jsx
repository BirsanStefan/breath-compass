import React, { useState } from 'react';
import { useAppData } from '../AppData';
import { useTranslation } from '../i18n';
import { backgroundSoundFiles } from '../sounds';
import { USER_SOUND_PREFIX } from '../storage/appData';
import { stopPreview, setPreviewVolume } from '../soundPreview';
import { audio, soundLevels } from '../audio';
import { SpeakerLoudIcon, SpeakerMutedIcon } from '../icons';
import {
  BELL_SETS,
  BELL_PHASES,
  GENERATED_BELL_SETS,
  bellSettings,
  generatedBellRef,
  parseGeneratedBellRef
} from '../bellSounds';
import { masterLevel, PreviewButton, PlayButton, Toggle } from './controls';

// Settings → Sound: phase bells, sound levels and imported sounds

// ==================== PHASE BELLS ====================
export const BellSettings = () => {
  const { t, soundName } = useTranslation();
  const { settings, updateSettings, soundLibrary } = useAppData();
  const bells = bellSettings(settings);
  const userSoundRefs = (soundLibrary?.files ?? []).map((file) => USER_SOUND_PREFIX + file);

  const setCustom = (phaseType, ref) =>
    updateSettings({ bells: { ...bells, custom: { ...bells.custom, [phaseType]: ref } } });

  return (
    <section className="settings-section">
      <h3>{t('settings.bells')}</h3>
      <div className="settings-field bell-picker">
        <div className="music-picker">
          <select
            aria-label={t('settings.bells')}
            value={bells.set}
            onChange={(e) => updateSettings({ bells: { ...bells, set: e.target.value } })}
          >
            {BELL_SETS.map((set) => (
              <option key={set} value={set}>{t(`settings.bellSets.${set}`)}</option>
            ))}
          </select>
          <PlayButton disabled={bells.set === 'none'} onClick={() => audio.previewBellSet()} />
        </div>
      </div>
      <p className="settings-hint">{t('settings.bellsHint')}</p>

      <div className="closing-sound">
        <Toggle
          checked={settings.closingSound !== false}
          onChange={(checked) => updateSettings({ closingSound: checked })}
        >
          {t('settings.closingSound')}
        </Toggle>
        <PlayButton onClick={() => { audio.unlock(); audio.playClosing(); }} />
      </div>

      {bells.set === 'custom' && (
        <>
          <div className="custom-bells">
            {BELL_PHASES.map((phaseType) => {
              const ref = bells.custom[phaseType] ?? '';
              const known = !ref || parseGeneratedBellRef(ref) || userSoundRefs.includes(ref);
              return (
                <div key={phaseType} className="custom-bell-row">
                  <span>{t(`phases.${phaseType}`)}</span>
                  <select
                    aria-label={t(`phases.${phaseType}`)}
                    value={ref}
                    onChange={(e) => setCustom(phaseType, e.target.value)}
                  >
                    <option value="">{t('settings.noBell')}</option>
                    {GENERATED_BELL_SETS.map((set) => (
                      <optgroup key={set} label={t(`settings.bellSets.${set}`)}>
                        {BELL_PHASES.map((bellPhase) => (
                          <option key={bellPhase} value={generatedBellRef(set, bellPhase)}>
                            {t(`settings.bellSets.${set}`)} · {t(`phases.${bellPhase}`)}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                    {userSoundRefs.length > 0 && (
                      <optgroup label={t('settings.yourSounds')}>
                        {userSoundRefs.map((userRef) => (
                          <option key={userRef} value={userRef}>{soundName(userRef)}</option>
                        ))}
                      </optgroup>
                    )}
                    {!known && <option value={ref}>{soundName(ref)} {t('settings.missingSound')}</option>}
                  </select>
                  <PlayButton disabled={!ref || !known} onClick={() => audio.previewBell(phaseType)} />
                </div>
              );
            })}
          </div>
          <p className="settings-hint">{t(soundLibrary ? 'settings.customBellsHint' : 'settings.customBellsHintWeb')}</p>
        </>
      )}
    </section>
  );
};

// ==================== SOUND LEVELS ====================
const LEVELS = [
  { key: 'music', label: 'settings.music' },
  { key: 'ticks', label: 'settings.levelTicks' },
  { key: 'bells', label: 'settings.levelBells' }
];

// Plays a sample of a kind of sound at its current level
const LevelPreview = ({ kind }) => {
  const { t } = useTranslation();
  if (kind === 'music') {
    // Any built-in track will do
    return <PreviewButton soundRef={backgroundSoundFiles[0] ?? ''} />;
  }
  return (
    <button
      type="button"
      className="icon-btn preview-btn"
      title={t('settings.preview')}
      onClick={() => (kind === 'bells' ? audio.previewBell() : audio.previewTicks())}
    >
      <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M5 3.5v9l7.5-4.5z" /></svg>
    </button>
  );
};

export const SoundLevelSettings = () => {
  const { t } = useTranslation();
  const { device, updateDevice } = useAppData();
  const levels = soundLevels(device);
  const volume = device.volume ?? 1;
  const muted = Boolean(device.muted);
  const volumePercent = Math.round(volume * 100);

  const setLevel = (key, value) => {
    updateDevice({ soundLevels: { ...levels, [key]: value } });
    if (key === 'music') setPreviewVolume(masterLevel(device) * value);
  };

  // Same as the slider on the main screen: moving it also unmutes
  const setVolume = (value) => {
    updateDevice({ volume: value, muted: false });
    setPreviewVolume(value * levels.music);
  };

  const toggleMute = () => {
    updateDevice({ muted: !muted });
    setPreviewVolume(muted ? volume * levels.music : 0);
  };

  return (
    <section className="settings-section">
      <h3>{t('settings.volumeTitle')}</h3>
      <div className={`level-row level-master ${muted ? 'muted' : ''}`}>
        <span className="level-label">{t('settings.masterVolume')}</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          className="volume-slider level-slider"
          aria-label={t('settings.masterVolume')}
          style={{ '--fill': `${volumePercent}%` }}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
        />
        <span className="level-value">{muted ? t('settings.muted') : `${volumePercent}%`}</span>
        <button
          type="button"
          className={`icon-btn mute-toggle ${muted ? 'active' : ''}`}
          aria-pressed={muted}
          title={muted ? t('settings.unmute') : t('settings.mute')}
          aria-label={muted ? t('settings.unmute') : t('settings.mute')}
          onClick={toggleMute}
        >
          {muted ? <SpeakerMutedIcon /> : <SpeakerLoudIcon />}
        </button>
      </div>

      <h4 className="level-group">{t('settings.levelsGroup')}</h4>
      <div className="level-list">
        {LEVELS.map(({ key, label }) => {
          const percent = Math.round(levels[key] * 100);
          return (
            <div key={key} className="level-row">
              <span className="level-label">{t(label)}</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={levels[key]}
                className="volume-slider level-slider"
                aria-label={t(label)}
                style={{ '--fill': `${percent}%` }}
                onChange={(e) => setLevel(key, parseFloat(e.target.value))}
              />
              <span className="level-value">{percent}%</span>
              <LevelPreview kind={key} />
            </div>
          );
        })}
      </div>
      <p className="settings-hint">{t('settings.levelsHint')}</p>
    </section>
  );
};

// ==================== IMPORTED SOUNDS (desktop only) ====================
export const SoundSettings = () => {
  const { t, exerciseText, soundName } = useTranslation();
  const { soundLibrary, exercises } = useAppData();
  const [message, setMessage] = useState(null); // { text, error }
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(null); // file name awaiting delete confirmation

  if (!soundLibrary) return null;

  const usersOf = (file) =>
    exercises.filter((exercise) => exercise.backgroundSound === USER_SOUND_PREFIX + file);

  const handleImport = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const name = await soundLibrary.importSound();
      if (name) setMessage({ text: t('settings.soundImported').replace('{name}', name) });
    } catch (e) {
      setMessage({ text: t('settings.soundError').replace('{error}', String(e?.message ?? e)), error: true });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (file) => {
    setConfirming(null);
    stopPreview();
    setMessage(null);
    try {
      await soundLibrary.deleteSound(file);
    } catch (e) {
      setMessage({ text: String(e?.message ?? e), error: true });
    }
  };

  return (
    <section className="settings-section">
      <div className="settings-section-header">
        <h3>{t('settings.sounds')}</h3>
        <button className="btn btn-secondary btn-small" disabled={busy} onClick={handleImport}>
          {t('settings.importSound')}
        </button>
      </div>
      <p className="settings-hint">{t('settings.soundsHint')}</p>

      {soundLibrary.files.length === 0 ? (
        <p className="settings-hint">{t('settings.noSounds')}</p>
      ) : (
        <ul className="sound-list">
          {soundLibrary.files.map((file) => {
            const users = usersOf(file);
            return (
              <li key={file} className="sound-row">
                <div className="sound-info">
                  <span className="sound-name" title={file}>{soundName(USER_SOUND_PREFIX + file)}</span>
                  {users.length > 0 && (
                    <span className="sound-users">
                      {t('settings.soundInUse').replace('{names}', users.map((e) => exerciseText(e, 'name')).join(', '))}
                    </span>
                  )}
                </div>
                {confirming === file ? (
                  <div className="confirm-inline">
                    <span>{t('settings.deleteSoundQuestion')}</span>
                    <button className="btn btn-stop btn-small" onClick={() => handleDelete(file)}>
                      {t('settings.confirmDelete')}
                    </button>
                    <button className="btn btn-secondary btn-small" onClick={() => setConfirming(null)}>
                      {t('settings.cancel')}
                    </button>
                  </div>
                ) : (
                  <div className="icon-buttons">
                    <PreviewButton soundRef={USER_SOUND_PREFIX + file} />
                    {/* A sound an exercise uses can't be deleted; pick other music there first */}
                    <button
                      className="icon-btn danger"
                      title={t('settings.delete')}
                      disabled={users.length > 0}
                      onClick={() => setConfirming(file)}
                    >✕</button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {message && (
        <p className={message.error ? 'settings-warning' : 'settings-success'}>{message.text}</p>
      )}
    </section>
  );
};
