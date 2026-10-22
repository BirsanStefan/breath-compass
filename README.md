# Breath Compass

A guided breathing app for the desktop (Linux, Windows, macOS) and the web.
Pick an exercise, press Start, and follow the circle: it grows as you breathe in,
holds, and shrinks as you breathe out, with a bell at each phase, a soft tick every
second and optional background music.

Inspired by the [Prana Breath](https://play.google.com/store/search?q=prana%20breath&c=apps)
app for Android, which isn't available on the desktop. This is an independent
project, not affiliated with it. Coded with Claude, Anthropic's AI assistant.

## Features

- **Visual guide** — an outer ring shows the exercise's phases in proportion to
  their length; the inner circle grows on inhale, shrinks on exhale and stays still while
  you hold, in the current phase's color, with the seconds counting down inside
  and the next phase just below. Two other views can be chosen in
  **Settings → General**: *Minimal* (just the circle and the seconds) and *Line*
  (each cycle drawn as a line that rises with the inhale and falls with the exhale).
- **Sound** — a bell for each phase, a quiet tick every second, and optional
  background music that loops for as long as the session lasts and fades out as it
  ends — or a sound that follows your breath (it rises as you breathe in and
  settles as you breathe out). Each has its own volume
  level in **Settings → Sound**, where you can also pick the phase bells: bells,
  soft chimes, singing bowl, wood block, none, or your own sound for each phase.
- **Guide** — what each phase means, how the built-in exercises work (with their
  ratios and easier or harder versions) and safety notes, in **Settings → Guide**.
  The safety notes are also a click away: bottom right of the session screen
  (while no exercise runs; Stop takes that spot during one) and at the bottom of
  the exercise list.
- **Session length in minutes** — pick 5, 10 or 15 minutes (or any other number)
  under the progress bar before starting; the exercise's cycles are set to the
  closest match. The exercise editor takes minutes too.
- **A real ending** — when an exercise finishes: a soft closing chime (can be
  turned off), one line of summary (time breathed, today against your daily goal,
  your streak) and a button for the next exercise; the circle starts it again.
- **Your own exercises** — add, edit, reorder or delete exercises: phases
  (inhale, hold, exhale, sustain), their durations, number of cycles and music.
  The built-in exercises stay as they are, so a name always means the same
  pattern: you can change their length and music, hide them, or duplicate one
  as the starting point for a variation ("Clear Mind (copy)").
- **Your own sounds** (desktop) — import mp3, m4a, ogg, wav or flac files as
  background music: in **Settings → Sound**, or with **Import your own…** right under
  an exercise's music menu, which also picks it for that exercise.
- **Statistics** — sessions and minutes this week, this month and all time, and per
  exercise. Only breathing time counts: not the preparation countdown, not pauses.
  With a daily goal (5 minutes by default): the current and longest streak of days
  that met it, how many days met it since you started, and a chart of the last 30
  days. Every session can be exported as a CSV file.
- **Sync between devices** (desktop) — keep your data in a folder synced with
  Syncthing, Nextcloud, Dropbox… and every device shares the same exercises and
  combined statistics. No account or server needed.
- **Preparation countdown** — a few seconds to settle in after pressing Start.
- **Languages** — English, French, Portuguese (Brazilian), Romanian and Spanish;
  more are easy to add (see below).
- **Dark and light theme** — follows the operating system by default.
- **Phase colors** — the default pastels, a softer (less saturated) version of
  them, a vivid set, or a set that stays distinct with color blindness.
- **Daily reminders** (desktop) — a notification at times you choose, shown only
  while today's goal isn't met yet. Entirely local: the app checks the clock while it
  runs (also from the tray), so nothing reminds you while it's closed. Clicking a
  reminder opens the app (on Windows while it's on screen, not from the Action
  Center, and only in the installed app).
- **Tray icon** (desktop) — start any exercise, pause, stop or quit from the tray
  menu; the app can start with the system, minimized in the tray. The icon is a
  quiet reminder of today's goal: the logo's four drops fill up as you breathe
  (a quarter of the goal each), and the menu starts with "Today: 8 of 20 min".
- **Focus mode and full screen** — during a session, once the mouse rests, everything
  but the breathing visual and the progress fades out; moving the mouse brings it
  back. The ⤢ button (or F) goes full screen.
- **Keyboard** — Space starts / pauses / resumes, Esc stops (or leaves full screen),
  F switches full screen, M mutes, ↑ ↓ change the volume, ← → switch exercise
  (when not breathing) and ? shows the full list.
- **Gentle endings** — on Stop and at the end, the music fades out while the
  circle settles back and the ring's progress fades; a ringing bell rings out.
- **Accessibility** — screen readers announce each phase as it starts ("Inhale",
  "Exhale"…), plus "Get ready", "Paused" and the end. With the system's "reduce
  motion" setting the breathing still moves, but nothing else slides or zooms. Dialogs keep keyboard focus inside while open, the
  exercise list takes it when it opens (the header stays usable next to it), and
  both give it back when closed. Grey texts meet WCAG AA contrast.
- **On phones** (web version) — the screen stays on during a session, and the page
  can be added to the home screen.

## Breathing patterns

Nine exercises are built in: four for beginners, without breath holds (*Gentle
Start*, *Coherent Breathing*, *Calm Exhale*, *Cyclic Sigh*), and five advanced ones
that come in levels (*Clear Mind*, *Power*, *Harmony*, *Square Breathing*, *Relax*),
shown once turned on in **Settings → Exercises**. Most follow the well-known patterns
below; any that isn't built in can be added there as your own exercise (durations in
seconds):

| Pattern | Phases | About |
|---|---|---|
| Box breathing | inhale 4 · hold 4 · exhale 4 · sustain 4 | Equal sides; built in as *Square Breathing*. |
| Resonance (coherent) breathing | inhale 5 · exhale 5 (or 6 · 6) | About six breaths a minute, the slow pace most studies look at; built in as *Coherent Breathing* (5 · 5). |
| Extended exhale | inhale 4 · exhale 8 | Breathing out for longer than in is calming; *Calm Exhale*, *Clear Mind* and *Relax* work this way. |
| 4-7-8 | inhale 4 · hold 7 · exhale 8 | Popularised by Dr Andrew Weil for winding down and falling asleep. |
| Cyclic sighing | inhale 3 · inhale 1 · exhale 6 | A full breath in through the nose, a short second sip on top, then a long breath out through the mouth. Five minutes a day lifted mood in the Balban et al. study below. Built in as *Cyclic Sigh*. |

**This app is not a medical device and isn't medical advice.** Start gently: if you
feel dizzy or unwell, stop and breathe normally. Never practise while driving or in
water. If you are pregnant, or have a heart, lung or eye condition, epilepsy, or a
mental health condition such as panic disorder or PTSD, ask your doctor first,
especially about long breath holds. The full safety notes are in **Settings → Guide**.

### Learn more

- [Breathing exercises for stress](https://www.nhs.uk/mental-health/self-help/guides-tools-and-activities/breathing-exercises-for-stress/) — NHS
- [Relaxation techniques: Breath control helps quell errant stress response](https://www.health.harvard.edu/mind-and-mood/relaxation-techniques-breath-control-helps-quell-errant-stress-response) — Harvard Health Publishing
- [How Breath-Control Can Change Your Life: A Systematic Review on Psycho-Physiological Correlates of Slow Breathing](https://doi.org/10.3389/fnhum.2018.00353) — Zaccaro et al., *Frontiers in Human Neuroscience*, 2018
- [Yoga: Effectiveness and Safety](https://www.nccih.nih.gov/health/yoga-what-you-need-to-know) — NCCIH (U.S. National Institutes of Health)
- [Effect of breathwork on stress and mental health: A meta-analysis of randomised-controlled trials](https://pmc.ncbi.nlm.nih.gov/articles/PMC9828383/) — Fincham et al., *Scientific Reports*, 2023 (small to moderate benefits for stress, anxiety and depression)
- [Brief structured respiration practices enhance mood and reduce physiological arousal](https://pmc.ncbi.nlm.nih.gov/articles/PMC9873947/) — Balban et al., *Cell Reports Medicine*, 2023

## Installing

Installers for every release are on the
[Releases page](https://github.com/BirsanStefan/breath-compass/releases):

| System | File | How |
|---|---|---|
| Debian, Ubuntu, Mint… | `.deb` | Open it with your software installer, or `sudo apt install ./Breath.Compass_*.deb` |
| Fedora, openSUSE… | `.rpm` | Open it with your software installer, or `sudo dnf install ./Breath.Compass-*.rpm` |
| Any Linux | `.AppImage` | Make it executable (`chmod +x`), then run it. No installing |
| Windows | `-setup.exe` | Run it. (The `.msi` does the same, for managed computers) |
| macOS | `.dmg` | `aarch64` for Apple Silicon (M1 and later), `x64` for Intel. Drag the app to Applications |

The installers aren't signed yet (signing costs money: an Apple developer account,
a Windows code-signing certificate), so the first launch warns:

- **Windows:** "Windows protected your PC" → **More info** → **Run anyway**.
- **macOS:** right-click the app → **Open** → **Open**. If macOS says the app "is
  damaged", run `xattr -cr "/Applications/Breath Compass.app"` once in Terminal.

**No music on Linux?** The bundled music tracks (MP3) are played by GStreamer, through
its "good" plugins. The `.deb` and `.rpm` install them automatically; the AppImage
doesn't carry them (they'd add tens of MB), and relies on the system's. Most desktop
distributions have them already, but if the music stays silent while the bells and
breath sounds play (those are generated, so they don't need it), install them:

- Debian, Ubuntu, Mint: `sudo apt install gstreamer1.0-plugins-good`
- Fedora: `sudo dnf install gstreamer1-plugins-good`
- openSUSE: `sudo zypper install gstreamer-plugins-good`
- Arch: `sudo pacman -S gst-plugins-good`

Warnings about a missing *WebVTT encoder* or *fakevideosink* when starting the app
from a terminal are harmless (they come from the optional `plugins-bad` set, for
video and subtitles, which the app doesn't use).

The app doesn't update itself. When a new version is out, **Settings → About** says
so (see [Privacy](#privacy)), with a link to its release page: download the new
installer and install it over the old one, the same way. Your data is kept.

### Making a release

`.github/workflows/release.yml` builds all the installers on GitHub. Set the version
in `package.json`, commit, then tag and push:

```bash
git tag v0.2.0
git push origin v0.2.0
```

The tag must match `package.json` (the build stops otherwise). After 15–20 minutes
a **draft** release appears with the installers attached; add notes and publish it.
For a test build without a tag: GitHub → Actions → Release → Run workflow.

Installed copies learn about the new version once it's **published** (drafts and
pre-releases are never offered): the update check reads GitHub's latest release,
from the repository set in `src/project.js`. Its tag must be a plain version such as
`v0.2.0`.

## Running it

You need [Node.js](https://nodejs.org/) (22.12 or newer). For the desktop app you also
need Rust and the system libraries Tauri uses — follow the
[Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for your system.

```bash
npm install
```

| Command | What it does |
|---|---|
| `npm run tauri:dev` | Run the desktop app, reloading on code changes |
| `npm run tauri:build` | Build installers for your system (in `src-tauri/target/release/bundle/`) |
| `npm run dev` | Run the web version at http://localhost:1420 |
| `npm run build` | Build the web version into `dist/` |
| `npm run local` | Linux: build the desktop app and add it to the applications menu, run from this folder (no package to install). Run it again to update; `npm run local -- --remove` removes the menu entry |
| `npm test` | Check the code for undefined names (`npm run lint`), then run the tests (a few seconds) |
| `npm run test:watch` | Run the tests again on every save, while you work |

### Tests

The tests cover the logic that can quietly go wrong while everything still
looks fine: statistics (days, streaks and the daylight-saving changes, CSV),
the exercise editor's checks, loading and upgrading the data files, the
lung levels behind the breathing line and shapes, reminders, phase ratios,
and the translations (every text the code uses exists, in every language,
with every plural form). They sit next to the code they test
(`src/stats.test.js` beside `src/stats.js`) and run with
[Vitest](https://vitest.dev) in Node, without a browser.

GitHub runs them on every push (`.github/workflows/tests.yml`), and the
release workflow runs them before building any installer.

Only one copy of the desktop app runs at a time, and a development copy counts too:
quit the app (tray → Quit) before `npm run tauri:dev`, or the new copy just brings up
the running one. "Start with the system" remembers the program that turned it on, so
turn it on from the copy you'll keep using, not from `tauri:dev`.

The version number lives in `package.json` (the desktop app reads it from there too)
and is shown in **Settings → About**.

### Hosting the web version

`npm run build` produces a static site in `dist/`. Copy it to any web server — a
NAS, GitHub Pages, Netlify… It works from any folder (e.g. `https://example.com/breath/`)
and needs no server-side code.

The web version keeps everything in the browser's own storage: it doesn't sync, and
clearing the browser's site data erases it. Importing your own sounds and choosing a
data folder are desktop-only.

## Privacy

Breath Compass doesn't collect or send any data: there's no account, no server, no
analytics and no tracking. Everything it stores stays on your device, as described
below. The only time the desktop app connects to the internet is to check for
updates: when it starts and once a day, it asks GitHub's public API whether a newer
release exists. Nothing about you or your data is sent (GitHub sees the request, as
it would any visit), and nothing is downloaded or installed: Settings → About shows
the new version with a link to its download page. Turn it off under **Check for
updates** in Settings → About. Links (such as the sources in the
Guide) open in your browser only when you click them. The web version runs entirely
in the browser; the server hosting it only delivers the page, like any website.

Online accounts and cloud sync aren't planned: there's no server behind the app, and
there won't be one. To use it on several devices, sync the data folder with a tool you
choose (Syncthing, Nextcloud, Dropbox, a NAS…), as described below. To back up your
data, copy the data folder.

In **Settings → Data and privacy** you can turn off the session history on a device
(sessions are then not saved, and Statistics don't change) and delete the saved
history. When the data folder is synced, deleting removes it on every device that
shares the folder.

## Your data and sync

The desktop app stores everything as plain files in its **data folder**. By default
that's the app's own folder:

- Linux: `~/.local/share/io.github.BirsanStefan.BreathCompass/data/`
- Windows: `%APPDATA%\io.github.BirsanStefan.BreathCompass\data\`
- macOS: `~/Library/Application Support/io.github.BirsanStefan.BreathCompass/data/`

In **Settings → Data and privacy** you can choose any other folder. To use the app on
several computers, choose a folder that a sync tool keeps in step (for example a
Syncthing folder) on each of them. When you switch folders, nothing in the new folder
is overwritten: if it already has data (synced from another device) the app uses it,
and if it's empty your current data is copied there.

```
data folder/
  settings.json          preparation time, language, phase bells
  exercises.json         your exercises
  sessions/
    desktop-1a2b3c4d.jsonl   one line per session; each device writes only its own file
  sounds/                your imported sounds
```

Because each device only ever appends to its own session file, syncing never
produces conflicts for your history. Statistics combine all devices' files, ignoring
sync-tool leftovers such as Syncthing's `.sync-conflict-` copies. If `settings.json`
or `exercises.json` is changed on two devices at the same time, the most recent save
wins.

The volume (and mute), the sound levels, the theme, the session view and phase colors, the desktop app options and the data folder
location are kept per device (in the app's config folder) and are never synced.

### Editing exercises by hand

Exercises are easiest to edit in **Settings**, but `exercises.json` is plain JSON and
can be edited directly (the app picks up changes when its window regains focus):

```json
{
  "version": 2,
  "exercises": [
    {
      "id": "box-breathing",
      "name": "Box Breathing",
      "description": "Equal duration for all phases",
      "cycles": 10,
      "backgroundSound": "blackbird-forest.mp3",
      "phases": [
        { "type": "inhale", "duration": 4 },
        { "type": "hold", "duration": 4 },
        { "type": "exhale", "duration": 4 },
        { "type": "sustain", "duration": 4 }
      ]
    }
  ]
}
```

| Field | Description |
|---|---|
| `id` | Unique, never shown. Statistics are grouped by it. |
| `name`, `description` | Shown in the list. |
| `cycles` | How many times the phases repeat (1–999). |
| `phases` | In order; `type` is `inhale`, `hold`, `exhale` or `sustain`, `duration` is in seconds (1–600). |
| `backgroundSound` | Optional. A bundled file name from `sounds/`, or `user:<file>` for a sound imported in Settings. |
| `hidden` | Optional. `true` leaves the exercise out of the list (built-in exercises are hidden rather than deleted). |
| `level` | Advanced built-ins only: which of their levels to breathe, from 0 (e.g. Clear Mind: 0 = 1:0:3:0, 1 = 1:0:4:0, 2 = 1:0:5:0). |

The built-in exercises always take their name, description and phases from the
app; only their `cycles`, `backgroundSound`, `hidden` and `level` are read from
the file. They're the beginner exercises (`gentle-start`, `coherent`,
`calm-exhale`, `cyclic-sigh`: no holds) and the advanced ones (`clear-mind`,
`power`, `harmony`, `square-breathing`, `relax`), which come in levels and are
shown only once turned on in Settings → Exercises (a setting, `showAdvanced`,
in `settings.json`). Exercises you add are always shown. A file
from an older version (`"version": 1`) is updated once: a built-in exercise
that was changed there becomes your own copy, "Clear Mind (edited)", and one
that was deleted comes back hidden.

If the file can't be read (for example after a typo), the app falls back to the
built-in exercises and leaves the file untouched so you can fix it.

## Adding a language

1. Copy `src/data/locales/en.json` to a new file named after the language code,
   e.g. `de.json`.
2. Set `"meta": { "name": "Deutsch" }` — the name shown in the language menu.
3. Translate the texts.

The language then appears in the menu automatically. Anything left untranslated
shows in English. `npm test` lists any text a translation is missing, and any
plural form its language needs (Intl.PluralRules: for example `one`, `few` and
`other` in Romanian; `one`, `many` and `other` in French, Spanish and Portuguese). On first start the app uses the system language when it's
available, and English otherwise.

## Contributing

Contributions are welcome, and not only code. Besides bug reports, fixes and new
features, you can help by:

- **Adding a language**, as described above.
- **Improving a translation.** The Spanish, French and Portuguese texts haven't been
  reviewed by native speakers yet; if something sounds unnatural, wrong or too long
  for the screen, please suggest a better wording.

Open an issue or a pull request on GitHub.

## Sounds

Every mp3 in `sounds/` can be chosen as an exercise's background music. Adding one
there makes it available after the next build. Two tracks are bundled, both in the
public domain (CC0): *Synthwave 421k* by The Cynic Project (Harmony's music) and
*Blackbird in forest* by carlito62 (Relax's). [CREDITS.md](CREDITS.md) lists where
each file comes from and which licenses new sounds may have.

Two more choices aren't files: **Ocean breath** and **Breathing pad**, under
"Follows your breath" in the music menu (Clear Mind's and Power's default), are
generated in `src/breathSounds.js`. They rise as you breathe in and settle as you
breathe out, following the lung level the circle shows, and each phase has a sound of
its own that comes in within about 0.3 s of the phase starting, so you can follow
the breath with your eyes closed, without bells, ticks or counting:

| Phase | Ocean breath | Breathing pad |
|---|---|---|
| Inhale | the wave rolls in and brightens, with a soft rush of air | D add9, opening up: brighter, an octave above coming in |
| Hold | spray at the crest: a high, fizzing shimmer | D sus4, a suspended chord: held, a gentle tension |
| Exhale | the wave draws back, water hissing over sand | G major 7, the release, settling back |
| Sustain | the quiet between waves: a deep rumble, a slow pulse | a low open fifth: empty and still |

Each rise or fall starts at once and eases into its target (the ear needs a clear
start more than the eye does). They pause and fade out like music, at the music
level. In Settings, ▶ plays every phase twice through.

Music loops for as long as the session lasts: over the last 4 seconds of the track,
the next pass starts from the beginning and the two crossfade, so a track doesn't
need an exact loop point. Imported music loops the same way. To keep the app small,
a track of 1–3 minutes is enough: MP3 at 96–128 kbps, 44.1 kHz, about 1 MB per
minute.

The phase bells aren't files. All four sets (bells, soft chimes, singing bowl, wood
block) are generated in `src/bellSounds.js` with Web Audio, where each set's pitch per
phase and sound can be tuned. Each phase has its own pitch, so you can follow along
with your eyes closed. The Bells set is built like a real tuned bell: a hum an octave
below, the minor-third "tierce" that makes a bell sound like a bell, and higher
partials that fade first. With **Custom** in **Settings → Sound**, each phase plays a
sound you pick: any of the generated bells, or one of your imported sounds; anything
longer than 3 seconds fades out.

In the music menu, a sound is shown by its name under `soundNames` in each language
file (e.g. `"blackbird-forest": "Blackbird in the forest"` for `blackbird-forest.mp3`). Sounds without
one — including sounds imported in Settings — show their file name, tidied up
(`ocean-waves.mp3` → "Ocean waves").

## Tray icon

The desktop app shows an icon in the system tray (on GNOME this needs the
[AppIndicator extension](https://extensions.gnome.org/extension/615/appindicator-support/),
which Ubuntu includes). Its menu shows the app, pauses or stops the current session,
starts any exercise, or quits. On Windows and macOS a double click also shows the app;
on Linux any click opens the menu.

The icon shows today's progress towards the daily goal (set in Statistics or
Settings → Desktop app → Daily reminders): the logo's four drops, dimmed, fill up
in turn, clockwise from the top right, a quarter of the goal each; the one being
filled fills gradually, so every minute shows. During a session it fills live, in
color. Sessions from other devices count once synced; the icon starts empty again
at midnight. The menu's first line says the same in words ("Today: 8 of 20 min"),
and so does the tooltip on Windows and macOS (Linux trays don't show tooltips).

In **Settings → Desktop app**: start with the system (off by default), start
minimized in the tray when doing so, and whether closing the window keeps the app in
the tray (on by default — then quit from the tray menu), the tray icon's look
when no exercise is running: grey (default), white, dark or in color, and whether
it shows today's progress (on by default; off, it's the plain logo). Only one copy of the app runs
at a time: launching it again brings up the open window.

## Logo and icons

The icons come from three SVG files in `assets/`:

| File | What it is | Used for |
|---|---|---|
| `logo.svg` | The bare logo: the four drops, transparent background | The header, the web icons (`public/icon.svg`, `icon-256.png`, `icon-512.png`) and the tray icon (`src/assets/tray.png`) |
| `app-icon.svg` | The drops on a light disc | The desktop app icon on Linux and Windows |
| `app-icon-macos.svg` | The drops on a rounded tile with a shadow, on Apple's icon grid (an 824 px tile with 185 px corners, centered on a 1024 px canvas) | The desktop app icon on macOS (`icon.icns`) |

The desktop icons sit on a backing shape, like most apps' icons, so they stand out on
light and dark backgrounds. After changing any of the three, run

```bash
npm run icons
```

It regenerates everything in `src-tauri/icons/` and the web and tray icons above.

The tray shows the logo in color during a session and, otherwise, in the style chosen
in Settings (grey by default). It's cropped to the logo's own edges, so it's as big as
the other tray icons. To use hand-made tray icons instead, add
`src/assets/tray-active.png` and/or `src/assets/tray-inactive.png` (square PNG); each
replaces its generated version.

## Project layout

```
src/
  main.jsx               entry point
  App.jsx                the app: header, and the session, statistics or settings screen
  session/               the session screen
    SessionView.jsx        the screen: exercise names, visual, progress, bottom bar
    ExerciseStrip.jsx      the exercise's name between the previous and next one
    CompletionSummary.jsx  the line after an exercise: time, today's goal, streak
    ExerciseBadges.jsx     "Advanced · Hidden" above an exercise's name in the lists
    useBreathingSession.js the session itself: timing, phases, sounds, music
    BreathCircle.jsx       the circle visual (phase ring + breathing circle)
    BreathLine.jsx         the line visual
    breath.js              shared by both: phase colors, lung levels, easing
    controls.jsx           progress bar, session length, the visual's play/pause/again
    ExerciseList.jsx       the exercise list (drawer)
  styles/                all styles, one file per part (index.css loads them in order)
  AppData.jsx            loads/saves settings, exercises, sessions, sounds
  storage/backends.js    file storage (desktop) and browser storage (web)
  storage/appData.js     data files, data-folder switching, session records
  SettingsView.jsx       settings screen (tabs; a list of tabs on phones)
  settings/              its tabs
    GeneralSettings.jsx    General: preparation time, theme, session view, colors
    SoundSettings.jsx      Sound: phase bells, sound levels, imported sounds
    ExerciseSettings.jsx   Exercises: the list, and the editor for the chosen one
    ExerciseEditor.jsx     the exercise editor
    DesktopSettings.jsx    Desktop app: tray, start with the system, reminders
    DataSettings.jsx       Data and privacy: history, data folder, reset
    AboutSettings.jsx      About: version, update check, links
    controls.jsx           small controls the tabs share (toggle, preview button…)
  Guide.jsx              Settings → Guide, and the phases and safety dialogs
  audio.js               bells, ticks and background music, with their levels
  bellSounds.js          phase bell sets, and the generated ones
  breathSounds.js        sounds that follow the breath (Ocean breath, Breathing pad)
  soundPreview.js        playing a sound from Settings
  exerciseDraft.js       exercise editor validation
  StatsView.jsx          statistics screen
  stats.js               statistics calculations
  LanguageMenu.jsx       language menu
  desktop.js             tray icon, closing to the tray, start with the system
  reminders.js           daily reminders (notifications while the goal isn't met)
  updates.js             the daily update check (asks GitHub for the latest release)
  project.js             the GitHub repository address (links, update check)
  focus.js               full screen, focus mode, returning focus after dialogs
  Shortcuts.jsx          the keyboard shortcuts dialog (?)
  ErrorBoundary.jsx      the "Something went wrong" screen instead of a blank page
  icons.jsx              small shared icons
  i18n.js                translations
  data/                  default exercises and settings, translations
assets/logo.svg          the logo (header, web and tray icons)
assets/app-icon.svg      desktop app icon, Linux and Windows
assets/app-icon-macos.svg  desktop app icon, macOS
                         (`npm run icons` makes every icon from these three)
assets/logo-white.svg    one-color version (not used by the app yet)
scripts/icons.mjs        the icon generator
scripts/local-install.mjs `npm run local` (Linux: run from this folder)
sounds/                  bundled music (credits in CREDITS.md)
src-tauri/               desktop app (Tauri)
```

## License

Copyright © 2026 Stefan Birsan

Breath Compass is free software: you can redistribute it and/or modify it under the
terms of the [GNU General Public License](LICENSE) as published by the Free Software
Foundation, either version 3 of the License, or (at your option) any later version.

In short: anyone may use, study, change and share it, including forking it into a
project of their own. Anyone who distributes the app, or a modified version of it,
must do so under the same license and make their source code available, so it can't
be turned into a closed product. It comes with no warranty.

Versions published before this change were released under the MIT License; those
copies remain available under MIT.
