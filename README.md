# Final Form

A merge game where *you* are the sound effects. Before playing, you record a word
for every merge tier. In the game, every time two matching pieces merge, your word
plays back — and the bigger the form, the slower and deeper it sounds.

## How it works

1. **Record screen**: one slot per merge (tiers 2–8 + Final Form). Each slot has a
   prompt — a word, a noise, a fake burp… Tap the prompt to write your own, or 🎲
   for a random one. You can't continue until every slot is recorded
   (● record / ▶ listen / ⇪ upload a file instead). Recordings and prompts are
   saved in the browser, so a reload keeps them.
2. **Game screen**: potatoes drop into a glowing flask (Matter.js physics). Two of
   the same tier merge into the next. Two top-tier potatoes trigger **FINAL FORM**.
   If the flask fills up to the rim it resets with **OVERFLOW!**
3. **⚙ Physics panel** (in-game, changes apply live): gravity, bounciness,
   friction, air drag, potato size, drop rate, spin, merge pop and voice slowdown.
   Presets (Moon, Trampoline, Glue, Ice, Heavy, Tiny, Chaos), 🎲 Randomize, and an
   option to get new random physics after every Final Form.

## The potatoes

`assets/tiers/1.png` … `8.png`: plain → sprout → student → DJ → cowboy → viking →
king → cosmic. They're generated from code: edit `tools/make_potatoes.py`, then

```bash
python3 tools/make_potatoes.py && python3 tools/render_pngs.py
```

Or just replace the PNGs with your own art (square, transparent background), and
adjust `scale` in `js/config.js` so the body lines up with the collision circle.

## Customize

Everything is in [`js/config.js`](js/config.js):

| Setting | What it does |
|---|---|
| `tiers[].prompt` | Default prompt for merging *into* that tier |
| `promptPool` / `finalPool` | What 🎲 picks from |
| `tiers[].radius` / `scale` | Collision size / how big the art is drawn |
| `final.prompt` | Default prompt for the final-form merge |
| `audio.rateStart` / `finalFactor` | Tier-2 speed / how much slower the final form is than the top tier |
| `spawn.weights` | Odds of dropping tier 1 / 2 / 3 |

Physics sliders and presets are defined in [`js/settings.js`](js/settings.js) —
add a row to `SCHEMA` or an entry to `PRESETS` and it appears in the panel.

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
js/config.js        tiers, prompts, flask shape
js/settings.js      physics sliders, presets, randomizer
js/recorder.js      record screen + gating
js/audio.js         decoding, silence trimming, tier-based slowdown
js/storage.js       IndexedDB persistence for recordings
js/game.js          Matter.js world, merging, rendering
js/main.js          screen wiring
js/vendor/          matter.min.js (0.20.0)
assets/tiers/       potato sprites (+ src/ SVGs)
tools/              sprite generator + renderer
```
