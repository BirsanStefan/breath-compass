import { useEffect } from 'react';

// Keeps the screen on while `active` (e.g. on a phone during a session).
// The browser drops the lock whenever the page is hidden, so it's requested
// again when the page becomes visible. Does nothing where unsupported.
export const useWakeLock = (active) => {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;

    let lock = null;
    let released = false;

    const request = async () => {
      if (released || document.visibilityState !== 'visible') return;
      try {
        const granted = await navigator.wakeLock.request('screen');
        // The session may have ended while the request was pending
        if (released) granted.release().catch(() => {});
        else lock = granted;
      } catch (e) {
        // Refused (e.g. battery saver); the session works without it
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') request();
    };

    request();
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      released = true;
      document.removeEventListener('visibilitychange', handleVisibility);
      lock?.release().catch(() => {});
    };
  }, [active]);
};
