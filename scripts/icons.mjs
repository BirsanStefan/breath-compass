// Regenerates every icon. Usage: npm run icons
//   assets/app-icon.svg        desktop app icon, Linux and Windows (the drops on a disc)
//   assets/app-icon-macos.svg  desktop app icon, macOS (the drops on Apple's rounded tile)
//   assets/logo.svg            the bare logo (transparent background): the web
//                              icons and the tray icon (the header shows it directly)
import { execSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ICONS = 'src-tauri/icons';

// Renders an SVG into every size `tauri icon` makes, in a folder of its own
const render = (svg, out) => execSync(`npx tauri icon ${svg} -o ${out}`, { stdio: 'inherit' });

render('assets/app-icon.svg', ICONS);
// Mobile icons aren't used (no Android / iOS app)
rmSync(`${ICONS}/android`, { recursive: true, force: true });
rmSync(`${ICONS}/ios`, { recursive: true, force: true });

const temp = mkdtempSync(join(tmpdir(), 'breath-compass-icons-'));
try {
  const mac = join(temp, 'macos');
  const logo = join(temp, 'logo');
  render('assets/app-icon-macos.svg', mac);
  render('assets/logo.svg', logo);

  const copies = [
    [`${mac}/icon.icns`, `${ICONS}/icon.icns`],      // macOS app icon
    ['assets/logo.svg', 'public/icon.svg'],           // web: favicon
    [`${logo}/icon.png`, 'public/icon-512.png'],      // web: home screen
    [`${logo}/128x128@2x.png`, 'public/icon-256.png'],
    [`${logo}/128x128.png`, 'src/assets/tray.png']    // tray (cropped and tinted at runtime)
  ];
  for (const [from, to] of copies) {
    copyFileSync(from, to);
    console.log(`${from} -> ${to}`);
  }
} finally {
  rmSync(temp, { recursive: true, force: true });
}
