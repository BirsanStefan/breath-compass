import React, { useEffect, useRef, useState } from 'react';
import { useAppData } from './AppData';
import { localeOptions, useTranslation } from './i18n';

const GlobeIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <circle cx="10" cy="10" r="8" />
    <path d="M2 10h16M10 2c2.2 2.2 3.3 4.9 3.3 8s-1.1 5.8-3.3 8c-2.2-2.2-3.3-4.9-3.3-8S7.8 4.2 10 2z" />
  </svg>
);

const LanguageMenu = () => {
  const { t, locale } = useTranslation();
  const { updateSettings } = useAppData();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  // Close when clicking anywhere else
  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (!menuRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const current = localeOptions.find((option) => option.code === locale);

  const choose = (code) => {
    updateSettings({ locale: code });
    setOpen(false);
  };

  return (
    <div
      className="language-menu"
      ref={menuRef}
      // Keys used here (Space, Esc) must not reach the session shortcuts
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Escape') setOpen(false);
      }}
    >
      <button
        className={`language-button ${open ? 'open' : ''}`}
        title={t('language.choose')}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <GlobeIcon />
        <span>{current?.name ?? locale}</span>
        <span className="language-caret" aria-hidden="true">▾</span>
      </button>

      {open && (
        <ul className="language-list" role="listbox" aria-label={t('language.choose')}>
          {localeOptions.map((option) => (
            <li key={option.code}>
              <button
                role="option"
                aria-selected={option.code === locale}
                className={`language-item ${option.code === locale ? 'selected' : ''}`}
                lang={option.code}
                onClick={() => choose(option.code)}
              >
                <span className="language-radio" aria-hidden="true" />
                {option.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default LanguageMenu;
