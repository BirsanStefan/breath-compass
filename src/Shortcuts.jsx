import React, { useEffect, useRef } from 'react';
import { useTranslation } from './i18n';
import { useReturnFocus } from './focus';

// ==================== KEYBOARD SHORTCUTS ====================
// The full list, in a modal dialog opened with ? (or the hint at the bottom of
// the window). The keys themselves are handled in App.jsx.

const SHORTCUTS = [
  { keys: ['Space'], action: 'space' },
  { keys: ['Esc'], action: 'esc' },
  { keys: ['F'], action: 'f', fullscreenOnly: true },
  { keys: ['M'], action: 'm' },
  { keys: ['H'], action: 'h' },
  { keys: ['↑', '↓'], action: 'upDown' },
  { keys: ['←', '→'], action: 'leftRight' },
  { keys: ['?'], action: 'question' }
];

export const ShortcutsDialog = ({ open, onClose, fullscreenAvailable }) => {
  const { t } = useTranslation();
  const dialogRef = useRef(null);
  useReturnFocus(open);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // While open, the app's shortcuts are held back; ? closes it again (Esc
  // closes it natively)
  useEffect(() => {
    if (!open) return;
    const holdBackKeys = (e) => {
      if (e.key === 'Tab' || e.key === 'Enter') return;
      e.stopPropagation();
      if (e.key === '?') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', holdBackKeys, true);
    return () => window.removeEventListener('keydown', holdBackKeys, true);
  }, [open, onClose]);

  return (
    <dialog
      ref={dialogRef}
      className="guide-dialog shortcuts-dialog"
      aria-labelledby="shortcuts-dialog-title"
      onClose={onClose}
      onClick={(e) => e.target === dialogRef.current && onClose()}
    >
      <div className="guide-dialog-content">
        <div className="guide-dialog-header">
          <h2 id="shortcuts-dialog-title">{t('keyboard.title')}</h2>
          <button className="icon-btn" title={t('guide.close')} onClick={onClose}>✕</button>
        </div>
        <dl className="shortcuts-list">
          {SHORTCUTS.filter((shortcut) => fullscreenAvailable || !shortcut.fullscreenOnly).map((shortcut) => (
            <div key={shortcut.action}>
              <dt>{shortcut.keys.map((key) => <kbd key={key}>{key}</kbd>)}</dt>
              <dd>{t(`keyboard.actions.${shortcut.action}`)}</dd>
            </div>
          ))}
        </dl>
      </div>
    </dialog>
  );
};
