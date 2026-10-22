// Full screen and focus mode: the window (desktop app) or page (browser) in
// full screen, and the controls fading out while the mouse rests.
import { useEffect, useRef, useState } from 'react';
import { isTauri } from './storage/backends';

const browserFullscreenAvailable = () =>
  typeof document !== 'undefined' && Boolean(document.fullscreenEnabled);

// { available, active, toggle(), exit() }. Follows changes made outside the
// app too (the window manager, the browser's own Esc).
export const useFullscreen = () => {
  const desktop = isTauri();
  const available = desktop || browserFullscreenAvailable();
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (desktop) {
      let unlisten = null;
      let cancelled = false;
      (async () => {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        const window = getCurrentWindow();
        const sync = async () => {
          const fullscreen = await window.isFullscreen();
          if (!cancelled) setActive(fullscreen);
        };
        await sync();
        unlisten = await window.onResized(sync);
      })().catch((e) => console.warn('Full screen unavailable:', e));
      return () => {
        cancelled = true;
        unlisten?.();
      };
    }
    if (!available) return;
    const sync = () => setActive(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);

  const set = async (fullscreen) => {
    try {
      if (desktop) {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        await getCurrentWindow().setFullscreen(fullscreen);
        setActive(fullscreen);
      } else if (fullscreen) {
        await document.documentElement.requestFullscreen();
      } else if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch (e) {
      console.warn('Could not change full screen:', e);
    }
  };

  return {
    available,
    active,
    toggle: () => set(!active),
    exit: () => set(false)
  };
};

// For drawers and dialogs: when `open` turns false, focus goes back to what
// had it when it turned true (the button that opened it). Call it before the
// hook that moves focus inside.
export const useReturnFocus = (open) => {
  const openerRef = useRef(null);
  useEffect(() => {
    if (open) {
      openerRef.current = document.activeElement;
      return;
    }
    const opener = openerRef.current;
    openerRef.current = null;
    if (opener && opener !== document.body && opener.isConnected) opener.focus({ preventScroll: true });
  }, [open]);
};

// Controls that keep everything visible while the pointer rests on them
const KEEP_VISIBLE = '.controls, .session-length, .volume-control, .focus-toggle, .app-header, .exercise-title';

// True once the mouse has rested for `delay` ms while `enabled`. Moving the
// mouse, touching the screen or pressing a key shows everything again.
export const useIdle = (enabled, delay = 3000) => {
  const [idle, setIdle] = useState(false);
  const timerRef = useRef(null);
  const overControlRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      setIdle(false);
      return;
    }
    const restart = () => {
      setIdle(false);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        if (!overControlRef.current) setIdle(true);
      }, delay);
    };
    const onPointer = (e) => {
      overControlRef.current = Boolean(e.target?.closest?.(KEEP_VISIBLE));
      restart();
    };
    restart();
    window.addEventListener('pointermove', onPointer);
    window.addEventListener('pointerdown', onPointer);
    window.addEventListener('keydown', restart);
    window.addEventListener('wheel', restart, { passive: true });
    return () => {
      clearTimeout(timerRef.current);
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('keydown', restart);
      window.removeEventListener('wheel', restart);
    };
  }, [enabled, delay]);

  return idle;
};
