// Every mp3 in /sounds, keyed by file name (e.g. "blackbird-forest.mp3" -> bundled URL)
export const soundFiles = Object.fromEntries(
  Object.entries(
    import.meta.glob('../sounds/*.mp3', { eager: true, query: '?url', import: 'default' })
  ).map(([path, url]) => [path.split('/').pop(), url])
);

// Files that can be chosen as an exercise's background music
export const backgroundSoundFiles = Object.keys(soundFiles).sort();
