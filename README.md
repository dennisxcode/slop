# Final Form

A potato merge game where *you* are the sound effects. Before playing, you record
yourself saying the name of each of the 12 potatoes. In the game, every merge plays
the new potato's name, and the bigger the potato, the slower and deeper it sounds.

## How it works

1. **Record screen**: 12 rows, one per potato, each with ● record / ▶ listen /
   ↺ redo / ⇪ upload a file instead. **Let's merge** stays locked until all 12
   names are recorded. Recordings are saved in the browser (IndexedDB), so a
   reload keeps them.
2. **Game screen** (Matter.js physics): a *Patate à la moustache* (tier 1) drops
   into the flask every 0.58 s, at the top of the neck with a little sideways
   jitter and spin. Only tier 1 ever drops. Two of the same tier merge into the
   next one at their contact point, with a white ring. Sizes grow
   geometrically: radius = 0.045 · R · 1.244^(n−1), where R is the bowl
   radius, so tier 11 is about 0.40 · R.
3. **The announcer** (`js/announcer.js`) plays every voice clip:
   - One clip at a time, never overlapping, with a short **breath** (0.25 s)
     between clips.
   - Every merge creates an event. When the channel is free, it picks **one**
     and throws the rest away: a new best for the round wins (records never
     expire and play in the order they happened), then the highest tier among
     events younger than the **event lifetime** (2 s), then the most recent.
   - Tier 1's name plays once per round, as the intro, when the first potato
     drops into an empty flask. Drops are never voiced after that.
   - Speed slides from 1.0× at tier 2 down to the **Top-tier voice speed**
     slider at tier 11. New-best announcements play another 0.85× slower.
     Timing is real time, so 2×/4× game speed doesn't shorten clips or gaps.
   - Silence is trimmed off every clip.
4. **Final Form** (two Cosmo patates touch): both freeze and drops pause. The
   screen dims for 1 s while three shockwaves pulse out. Then *Patate caca*
   grows to 1.3× the bowl's size, pushing everything outward, the bottom of
   the bowl bursts, and everything falls off the screen. Meanwhile "Patate
   caca" plays at the slowest speed and cuts off anything else. Then the flask
   resets and drops resume. The sequence runs in real time, whatever the game
   speed.
5. If the flask fills up to the rim, it resets with **OVERFLOW!**
6. **⚙ panel** (in-game, applies live): gravity, bounciness, friction, air
   drag, potato size, drop rate, spin, merge pop, plus **Voice** (top-tier
   speed, breath, event lifetime). Presets: **Video** (the default, tuned to
   the reference video), Moon, Trampoline, Glue, Ice, Heavy, Tiny, Chaos.
   There's also 🎲 Randomize and an option to get new random physics after
   every Final Form.

## The potatoes

| # | Name | # | Name |
|---|---|---|---|
| 1 | Patate à la moustache | 7 | Patate musulmane |
| 2 | Bébé patate | 8 | Patate sikhe |
| 3 | Patate poilue | 9 | Patate en fauteuil |
| 4 | Patate mouton | 10 | Patate chevalier |
| 5 | Patate soldat | 11 | Cosmo patate |
| 6 | Patate juive | 12 | Patate caca |

Sprites are `assets/tiers/1.png` … `12.png` (640×640, SVG sources in
`assets/tiers/src/`). Each potato's body is a circle of radius 195 px centred at
(320, 330). The game scales that circle to the collision radius and shifts the
image up by `offY` (10 px) so the body, not the image, sits on the physics
circle. If a sprite fails to load, a numbered potato-coloured circle is drawn.
Art notes are in [`js/config.js`](js/config.js).

## Customize

Everything is in [`js/config.js`](js/config.js):

| Setting | What it does |
|---|---|
| `tiers[].name` | What the player records for that tier |
| `tiers[].short` | Label on the fallback circle |
| `tiers[].offY` | Sprite body-centre offset, in sprite pixels |
| `sprite` | Sprite size and body radius (sets the drawn scale) |
| `audio.introRate` / `rateStart` | Speed of the tier-1 intro / the tier-2 name |
| `audio.recordFactor` | Extra slowdown for new-best announcements |
| `announcer.fadeOut` | Fade when the Final Form cuts the current clip |
| `finalForm` | Final Form timings, size, fall speed and push |
| `flask` | Flask shape (R = `flask.radius`; tier sizes derive from it) |

Physics sliders and presets are defined in [`js/settings.js`](js/settings.js).
Add a row to `SCHEMA` or an entry to `PRESETS` and it appears in the panel.

## Run it locally

The mic only works over `https://` or `localhost`, so use a local server rather
than opening the file directly:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Deploy (GitHub Pages)

Settings → Pages → Source: *Deploy from a branch* → `main` / root. No build step.

## Files

```
index.html          two screens: record + play
css/style.css
js/config.js        tiers (names, sizes, art notes), audio, Final Form, flask
js/settings.js      physics sliders, presets, randomizer
js/recorder.js      record screen + gating
js/audio.js         decoding, silence trimming, tier-based speed
js/announcer.js     one-voice-at-a-time announcer (what plays, and when)
js/storage.js       IndexedDB persistence for recordings
js/game.js          Matter.js world, merging, Final Form sequence, rendering
js/main.js          screen wiring
js/vendor/          matter.min.js (0.20.0)
assets/tiers/       potato sprites 1.png … 12.png (+ src/ SVGs)
```
