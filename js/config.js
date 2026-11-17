// ============================================================
//  Content + defaults. Physics knobs live in js/settings.js
//  (and in the ⚙ panel in-game).
// ============================================================

window.CONFIG = (() => {
  // Flask shape, in world units (world = 1000 × 1600). R = bowl radius.
  const flask = { cx: 500, cy: 1005, radius: 480, neckHalfWidth: 80, top: 80 };
  const R = flask.radius;

  // One entry per tier, smallest → biggest. Only tier 1 is ever dropped; two
  // tier-N potatoes merge into tier N+1. Two tier-11s trigger the Final Form,
  // which shows tier 12 (Patate caca) as a sprite. It's never a physics body.
  //
  //   name : what the player records for this tier (shown on the record screen).
  //   short: label on the fallback circle if the sprite fails to load.
  //   offY : how far (in sprite pixels) the potato body's centre sits BELOW the
  //          image centre. The default sprites have it at (320,330) → 10.
  //
  // Art notes (every tier is a friendly, respectful character in the same style):
  //   6 kippah · 7 kufi · 8 turban (dastar) · 9 wheelchair.
  const tiers = [
    { name: "Patate à la moustache", short: "Moustache", offY: 10 },
    { name: "Bébé patate",           short: "Bébé",      offY: 10 },
    { name: "Patate poilue",         short: "Poilue",    offY: 10 },
    { name: "Patate mouton",         short: "Mouton",    offY: 10 },
    { name: "Patate soldat",         short: "Soldat",    offY: 10 },
    { name: "Patate juive",          short: "Juive",     offY: 10 },
    { name: "Patate musulmane",      short: "Musulmane", offY: 10 },
    { name: "Patate sikhe",          short: "Sikhe",     offY: 10 },
    { name: "Patate en fauteuil",    short: "Fauteuil",  offY: 10 },
    { name: "Patate chevalier",      short: "Chevalier", offY: 10 },
    { name: "Cosmo patate",          short: "Cosmo",     offY: 10 },
    { name: "Patate caca",           short: "Caca",      offY: 10 },
  ];

  // Sizes grow geometrically: radius(n) = 0.045·R · 1.244^(n−1), tier 11 ≈ 0.40·R.
  // (Tier 12 gets the same formula for completeness; the Final Form scales it
  // up to finalForm.size × the bowl's diameter.)
  tiers.forEach((t, i) => {
    t.radius = 0.045 * R * 1.244 ** i;
    t.image = `assets/tiers/${i + 1}.png`;
  });

  return {
    tiers, flask,

    // Sprite layout: square images, potato body = circle of `body` px radius.
    // Drawn scale = image half-width ÷ body radius = 320/195 ≈ 1.64.
    sprite: { size: 640, body: 195 },

    // Voice speed: 1.0× at tier 2, sliding smoothly (geometrically) to the
    // "Top-tier voice speed" slider at tier 11. Tier 1 (the round intro) plays
    // at introRate. New-record announcements play recordFactor× slower still.
    // Patate caca (the Final Form) plays at the slider value.
    audio: { introRate: 1.0, rateStart: 1.0, recordFactor: 0.85 },

    // Announcer (js/announcer.js) fixed timings, in real seconds.
    //   fadeOut: how fast the current clip fades when the Final Form cuts it.
    announcer: { fadeOut: 0.08 },

    // Final Form sequence (real seconds; game speed doesn't affect it).
    //   charge: dim + shockwaves before the reveal.  grow: caca scales up.
    //   size  : caca's final diameter ÷ the bowl's diameter.
    //   fallG / hop: scripted fall of the caca sprite (world units/s², /s).
    //   push  : outward impulse on other potatoes while it grows.
    //   maxBurst: safety cap on the fall phase.
    finalForm: { charge: 1.0, grow: 0.4, size: 1.3, fallG: 330, hop: 120, push: 9, maxBurst: 7 },
  };
})();
