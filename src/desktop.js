// Desktop-only integration (Tauri): tray icon and menu, closing to the tray,
// and staying in the tray after starting at login. Does nothing in a browser.
import { useEffect, useRef, useState } from 'react';
import { isTauri } from './storage/backends';
import trayUrl from './assets/tray.png';
import { progressIcon } from './trayProgressIcon';

const TRAY_ID = 'breath-compass';

// Tray icons: by default a progress meter for today's goal (the logo's
// drops fill up, see trayProgressIcon.js); otherwise tray.png (made from the
// logo by `npm run icons`), cropped to the logo itself so it's as big as the
// other tray icons. During a session it's in color; otherwise in the style
// chosen in Settings → Desktop (see TRAY_STYLES). A hand-made
// src/assets/tray-active.png or tray-inactive.png replaces either one.
const trayOverrides = Object.fromEntries(
  Object.entries(
    import.meta.glob('./assets/tray-{active,inactive}.png', { eager: true, query: '?url', import: 'default' })
  ).map(([path, url]) => [path.match(/tray-(\w+)\.png$/)[1], url])
);

// The tray icon when no session is running: one color (keeps the shape,
// drops the logo's colors), or null for the logo in color
export const TRAY_STYLES = ['grey', 'white', 'dark', 'color'];
const TRAY_TINTS = { grey: '#a8a8a8', white: '#ffffff', dark: '#2e2e2e', color: null };

const loadIcon = async (url) => new Uint8Array(await (await fetch(url)).arrayBuffer());

const toPng = async (canvas) => {
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  return new Uint8Array(await blob.arrayBuffer());
};

// Empty space left around the cropped logo, as a share of its size on each
// side: tray icons usually have a little air around them
const TRAY_PADDING = 0.1;

// The image cropped to what's drawn (a square around the non-transparent
// pixels, plus TRAY_PADDING), on a canvas
const croppedCanvas = async (url) => {
  const image = await createImageBitmap(await (await fetch(url)).blob());
  const source = document.createElement('canvas');
  source.width = image.width;
  source.height = image.height;
  source.getContext('2d').drawImage(image, 0, 0);
  const { data, width, height } = source.getContext('2d').getImageData(0, 0, image.width, image.height);
  let [left, top, right, bottom] = [width, height, -1, -1];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 8) {
        left = Math.min(left, x); right = Math.max(right, x);
        top = Math.min(top, y); bottom = Math.max(bottom, y);
      }
    }
  }
  if (right < 0) return source; // nothing drawn
  const content = Math.max(right - left, bottom - top) + 1;
  const size = Math.round(content * (1 + 2 * TRAY_PADDING));
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const offsetX = left - (size - (right - left + 1)) / 2;
  const offsetY = top - (size - (bottom - top + 1)) / 2;
  canvas.getContext('2d').drawImage(source, -offsetX, -offsetY);
  return canvas;
};

// The cropped icon, in color or in one color, as PNG bytes
const trayIcon = async (url, tint = null) => {
  const canvas = await croppedCanvas(url);
  if (tint) {
    const context = canvas.getContext('2d');
    context.globalCompositeOperation = 'source-in'; // keeps the shape, replaces the colors
    context.fillStyle = tint;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
  return toPng(canvas);
};

// The icon for now: active (a session is running or paused), the style, and
// progress (the share of today's goal done, 0–1; null for the plain logo)
const iconFor = ({ active, style, progress }) => {
  const override = trayOverrides[active ? 'active' : 'inactive'];
  if (override) return loadIcon(override);
  const tint = active ? null : TRAY_TINTS[style] ?? TRAY_TINTS.grey;
  return progress === null ? trayIcon(trayUrl, tint) : progressIcon(progress, tint);
};

export const showMainWindow = async () => {
  if (!isTauri()) return;
  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  const window = getCurrentWindow();
  await window.unminimize();
  await window.show();
  await window.setFocus();
};

const quitApp = async () => {
  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  // Destroying the only window ends the app (a plain close would go to the tray)
  await getCurrentWindow().destroy();
};

// menu: {
//   status: a line at the top (today's progress), also the tooltip
//   labels: { show, pause, resume, stop, start, quit },
//   exercises: [{ label }],          // already translated, with duration
//   state: 'idle' | 'running' | 'paused'
// }
// actions: { startExercise(index), pause(), resume(), stop() } — the latest
// versions are always used, so they may change on every render.
// closeToTray: closing the window hides it instead of quitting.
// startHidden: after starting at login, stay in the tray.
// trayStyle: the icon when no session is running (one of TRAY_STYLES).
// trayProgress: the share of today's goal done (0–1), shown by the icon; null
// for the plain logo.
export const useDesktopIntegration = ({ menu, actions, closeToTray, startHidden, trayStyle, trayProgress }) => {
  const actionsRef = useRef(actions);
  actionsRef.current = actions;
  const closeToTrayRef = useRef(closeToTray);
  closeToTrayRef.current = closeToTray;
  const trayRef = useRef(null);
  const [trayReady, setTrayReady] = useState(false);
  const icon = { active: menu.state !== 'idle', style: trayStyle, progress: trayProgress };
  const iconRef = useRef(icon);
  iconRef.current = icon;

  // Tray icon (created once; reused across hot reloads during development)
  useEffect(() => {
    if (!isTauri()) return;
    let cancelled = false;
    (async () => {
      const { TrayIcon } = await import('@tauri-apps/api/tray');
      const tray = (await TrayIcon.getById(TRAY_ID)) ?? (await TrayIcon.new({
        id: TRAY_ID,
        icon: await iconFor(iconRef.current),
        tooltip: 'Breath Compass',
        // Right click opens the menu; a double click shows the window (Windows,
        // macOS — on Linux any click opens the menu, which starts with "Show")
        showMenuOnLeftClick: false,
        action: (event) => {
          if (event.type === 'DoubleClick') showMainWindow();
        }
      }));
      if (!cancelled) {
        trayRef.current = tray;
        setTrayReady(true);
      }
    })().catch((e) => console.warn('Tray icon unavailable:', e));
    return () => {
      cancelled = true;
    };
  }, []);

  // Menu: rebuilt only when what it shows changes
  const menuKey = JSON.stringify(menu);
  useEffect(() => {
    const tray = trayRef.current;
    if (!tray) return;
    (async () => {
      const { Menu, MenuItem, PredefinedMenuItem } = await import('@tauri-apps/api/menu');
      const { status, labels, exercises, state } = menu;
      const active = state !== 'idle';
      const separator = () => PredefinedMenuItem.new({ item: 'Separator' });
      const items = [
        ...(status ? [await MenuItem.new({ text: status, enabled: false }), await separator()] : []),
        await MenuItem.new({ text: labels.show, action: () => showMainWindow() }),
        await separator(),
        await MenuItem.new({
          text: state === 'paused' ? labels.resume : labels.pause,
          enabled: active,
          action: () => (state === 'paused' ? actionsRef.current.resume() : actionsRef.current.pause())
        }),
        await MenuItem.new({ text: labels.stop, enabled: active, action: () => actionsRef.current.stop() }),
        await separator(),
        ...(await Promise.all(exercises.map((exercise, index) => MenuItem.new({
          text: `${labels.start}: ${exercise.label}`,
          enabled: !active,
          action: () => actionsRef.current.startExercise(index)
        })))),
        await separator(),
        await MenuItem.new({ text: labels.quit, action: () => quitApp() })
      ];
      await tray.setMenu(await Menu.new({ items }));
      // Shown on hover on Windows and macOS (Linux trays have no tooltips)
      await tray.setTooltip(status ? `Breath Compass — ${status}` : 'Breath Compass');
    })().catch((e) => console.warn('Could not update the tray menu:', e));
  }, [menuKey, trayReady]);

  // The icon: redrawn only when it would look different (the progress
  // changes at most once a minute)
  const iconKey = JSON.stringify(icon);
  useEffect(() => {
    if (!trayReady) return;
    let cancelled = false;
    iconFor(icon)
      .then((bytes) => !cancelled && trayRef.current?.setIcon(bytes))
      .catch((e) => console.warn('Could not change the tray icon:', e));
    return () => {
      cancelled = true;
    };
  }, [iconKey, trayReady]);

  // Closing the window keeps the app running in the tray
  useEffect(() => {
    if (!isTauri()) return;
    let unlisten = null;
    (async () => {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const window = getCurrentWindow();
      unlisten = await window.onCloseRequested(async (event) => {
        if (!closeToTrayRef.current || !trayRef.current) return;
        event.preventDefault();
        await window.hide();
      });
    })();
    return () => unlisten?.();
  }, []);

  // Started at login: the window starts hidden (see lib.rs); show it unless
  // the user chose to stay in the tray
  useEffect(() => {
    if (!isTauri()) return;
    (async () => {
      const { invoke } = await import('@tauri-apps/api/core');
      if ((await invoke('started_at_login')) && !startHidden) showMainWindow();
    })().catch((e) => console.warn('Startup check failed:', e));
  }, []);
};

// ---------- Links ----------
// onClick for external links: the desktop app opens them in the system
// browser; in a browser the link just opens in a new tab
export const openExternal = (event) => {
  if (!isTauri()) return;
  event.preventDefault();
  const url = event.currentTarget.href;
  import('@tauri-apps/plugin-opener')
    .then(({ openUrl }) => openUrl(url))
    .catch((e) => console.warn('Could not open the link:', e));
};

// ---------- Autostart (start with the system) ----------
export const autostart = {
  available: isTauri,
  async isEnabled() {
    const { isEnabled } = await import('@tauri-apps/plugin-autostart');
    return isEnabled();
  },
  async set(enabled) {
    const { enable, disable } = await import('@tauri-apps/plugin-autostart');
    await (enabled ? enable() : disable());
  }
};
