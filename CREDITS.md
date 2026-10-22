# Credits

Breath Compass's code is licensed under the [GNU GPL 3.0](LICENSE). The bundled
music, in `sounds/`, comes from other authors under its own licenses, listed here.

## Music

| File | Title | Author | Source | License |
|---|---|---|---|---|
| `sounds/synthwave-421k.mp3` | Synthwave 421k ("Calm Relax 1") | The Cynic Project — [cynicmusic.com](https://cynicmusic.com), [pixelsphere.org](https://pixelsphere.org) | [OpenGameArt.org](https://opengameart.org/content/calm-relax-1-synthwave-421k) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `sounds/blackbird-forest.mp3` | Blackbird in forest | carlito62 | [Freesound](https://freesound.org/s/176746/) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |

Both are in the public domain (CC0): they can be used, changed and shared without
asking and without credit. They're credited here anyway, as thanks, and so it's
clear where each file comes from.

Changes made for the app: *Synthwave 421k* was shortened to about 3 minutes and
re-encoded at 128 kbps; *Blackbird in forest* was converted from the original WAV
to a 96 kbps MP3, with its peak level lowered to −1 dB. In the app, both loop with
a short crossfade.

## Font

The app uses the [Ubuntu font](https://design.ubuntu.com/font) by Dalton Maag,
under the [Ubuntu Font Licence 1.0](https://ubuntu.com/legal/font-licence). It's
bundled with the app from the [@fontsource/ubuntu](https://fontsource.org/fonts/ubuntu)
package (Latin and Latin Extended letters, unchanged).

## Sounds made in code

The phase bells (bells, soft chimes, singing bowl, wood block), the ticks, the
closing chime and the sounds that follow the breath (Ocean breath, Breathing pad)
aren't recordings: they're generated with Web Audio in `src/bellSounds.js`,
`src/breathSounds.js` and `src/audio.js`, and are part of the app's code.

## Adding sounds

Only add sounds whose license allows sharing them in an open-source project:
[CC0](https://creativecommons.org/publicdomain/zero/1.0/),
[CC BY](https://creativecommons.org/licenses/by/4.0/) or
[CC BY-SA](https://creativecommons.org/licenses/by-sa/4.0/). Avoid "non-commercial"
(NC) and "no derivatives" (ND) licenses, and sites whose own license limits
redistributing the files. List every new file here, with its source and license.
