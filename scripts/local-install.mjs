// Linux: run the desktop app straight from this folder, without installing a
// package. Builds the app (the interface is built into the program) and adds
// it to the applications menu, pointing here. Run it again after pulling or
// changing code to update; the menu entry keeps working.
//
// Usage:
//   npm run local            build, and add/refresh the menu entry
//   npm run local -- --remove   remove the menu entry (the build stays)
//
// Moving or deleting this folder (or `cargo clean`) breaks the entry; run
// this again from the new place.
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const binary = join(root, 'src-tauri/target/release/breath-compass');
const icon = join(root, 'src-tauri/icons/icon.png');
const applications = join(process.env.XDG_DATA_HOME || join(homedir(), '.local/share'), 'applications');
const entry = join(applications, 'breath-compass.desktop');

const refreshMenu = () => {
  try {
    execSync(`update-desktop-database "${applications}"`, { stdio: 'ignore' });
  } catch {
    // not installed everywhere; desktops pick up the change anyway
  }
};

if (process.platform !== 'linux') {
  console.error('This is for Linux. On Windows and macOS, use the installers (npm run tauri:build).');
  process.exit(1);
}

if (process.argv.includes('--remove')) {
  rmSync(entry, { force: true });
  refreshMenu();
  console.log(`Removed ${entry}`);
  process.exit(0);
}

// The program only, no .deb/.rpm (about a minute after the first build)
execSync('npx tauri build --no-bundle', { cwd: root, stdio: 'inherit' });
if (!existsSync(binary)) {
  console.error(`Build finished, but ${binary} is missing.`);
  process.exit(1);
}

mkdirSync(applications, { recursive: true });
// StartupWMClass matches the window to this entry (its icon in the dock)
writeFileSync(entry, `[Desktop Entry]
Type=Application
Name=Breath Compass
Comment=Guided breathing exercises
Exec="${binary}"
Icon=${icon}
StartupWMClass=breath-compass
Categories=Utility;
Terminal=false
`);
refreshMenu();
console.log(`\nMenu entry: ${entry}\nIt runs ${binary}`);
