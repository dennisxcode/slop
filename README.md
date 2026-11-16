# Final Form

A merge game where *you* are the sound effects. Before playing, you record a word
for every merge tier. In the game, every time two matching pieces merge, your word
plays back — and the bigger the form, the slower and deeper it sounds.

## How it works

1. **Record screen**: one row per word. You can't continue until every word is
   recorded (● record / ▶ listen / ⇪ upload a file instead). Recordings are saved
   in the browser (IndexedDB), so a reload keeps them.
2. **Game screen**: pieces drop into a glowing flask (Matter.js physics). Two of
   the same tier merge into the next. Two top-tier pieces trigger **FINAL FORM**.

## Add your art

Drop PNGs into `assets/tiers/` named `1.png` … `8.png` (smallest → biggest).
Square images with transparent backgrounds work best. Any missing image shows a
numbered placeholder circle.

## Customize

Everything is in [`js/config.js`](js/config.js):

| Setting | What it does |
|---|---|
| `tiers[].word` | The word recorded for merging *into* that tier |
| `tiers[].radius` / `scale` | Collision size / how big the art is drawn |
| `final.word` | Word for the final-form merge |
| `audio.rateStart` → `rateEnd` | Playback speed from tier 2 → top tier |
| `audio.finalRate` | Speed of the final-form word |
| `spawn.weights` | Odds of dropping tier 1 / 2 / 3 |
| `physics` | Gravity, bounciness, friction |

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
js/config.js        all the knobs
js/recorder.js      record screen + gating
js/audio.js         decoding, silence trimming, tier-based slowdown
js/storage.js       IndexedDB persistence for recordings
js/game.js          Matter.js world, merging, rendering
js/main.js          screen wiring
js/vendor/          matter.min.js (0.20.0)
assets/tiers/       your sprites
```
