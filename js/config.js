// ============================================================
//  Everything you'll want to tweak lives in this file.
// ============================================================

window.CONFIG = {
  // One entry per tier, smallest → biggest.
  //   image : your sprite (PNG with transparency works best). Missing files
  //           fall back to a numbered placeholder circle.
  //   radius: collision radius in world units (the world is 1000 units wide).
  //   scale : how big the image is drawn relative to the circle (use >1 if
  //           your art has hats/arms sticking out past the round body).
  //   word  : what the player records for "something merged INTO this tier".
  //           Tier 1 only ever spawns (never merges into), so it has no word.
  tiers: [
    { image: "assets/tiers/1.png", radius: 32,  scale: 1.15 },
    { image: "assets/tiers/2.png", radius: 42,  scale: 1.15, word: "Pop!" },
    { image: "assets/tiers/3.png", radius: 55,  scale: 1.15, word: "Again!" },
    { image: "assets/tiers/4.png", radius: 70,  scale: 1.2,  word: "Bigger!" },
    { image: "assets/tiers/5.png", radius: 88,  scale: 1.2,  word: "Stronger!" },
    { image: "assets/tiers/6.png", radius: 108, scale: 1.25, word: "Huge!" },
    { image: "assets/tiers/7.png", radius: 132, scale: 1.25, word: "Massive!" },
    { image: "assets/tiers/8.png", radius: 160, scale: 1.3,  word: "Legendary!" },
  ],

  // Played when two top-tier pieces collide.
  final: { word: "FINAL FORM!", image: "assets/tiers/final.png" },

  // Playback speed of the recordings. Merging into tier 2 plays at
  // rateStart, merging into the top tier plays at rateEnd, and the final
  // form plays at finalRate. Lower = slower + deeper.
  audio: { rateStart: 1.0, rateEnd: 0.55, finalRate: 0.4, maxVoices: 8 },

  // Which tiers can be dropped in, with relative odds.
  spawn: { weights: [55, 30, 15], autoDropEvery: 0.55 },

  // Flask shape, in world units (world = 1000 × 1600).
  flask: { cx: 500, cy: 980, radius: 470, neckHalfWidth: 80, top: 80 },

  physics: { gravity: 1.4, restitution: 0.15, friction: 0.05 },
};
