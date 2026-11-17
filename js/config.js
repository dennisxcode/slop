// ============================================================
//  Content + defaults. Physics knobs live in js/settings.js
//  (and in the ⚙ panel in-game).
// ============================================================

window.CONFIG = {
  // One entry per tier, smallest → biggest.
  //   image : sprite (PNG with transparency). Missing → numbered circle.
  //   radius: collision radius in world units (world is 1000 wide), before the size slider.
  //   scale : drawn image half-size ÷ radius. The bundled potatoes are 640px with
  //           a ~190px body, so 1.68 makes the body line up with the collision circle.
  //   prompt: default thing to record when something merges INTO this tier
  //           (tier 1 only spawns, so it has none). Players can edit or reroll these.
  tiers: [
    { image: "assets/tiers/1.png", radius: 32,  scale: 1.68 },
    { image: "assets/tiers/2.png", radius: 42,  scale: 1.68, prompt: "Make a “pop” with your mouth" },
    { image: "assets/tiers/3.png", radius: 55,  scale: 1.68, prompt: "Say “Patate!”" },
    { image: "assets/tiers/4.png", radius: 70,  scale: 1.68, prompt: "Beatbox one beat" },
    { image: "assets/tiers/5.png", radius: 88,  scale: 1.68, prompt: "Say “Yeehaw!”" },
    { image: "assets/tiers/6.png", radius: 108, scale: 1.68, prompt: "Battle cry!" },
    { image: "assets/tiers/7.png", radius: 132, scale: 1.68, prompt: "Say “Bow before me”" },
    { image: "assets/tiers/8.png", radius: 160, scale: 1.68, prompt: "Angelic “aaah” note" },
  ],

  final: { prompt: "Shout “FINAL FORM!”" },

  // What the 🎲 buttons pull from. Mix of words, noises and silly stuff.
  promptPool: [
    "Make a “pop” with your mouth", "Say “Patate!”", "Say “Frites!”", "Say “Mashed!”",
    "Fake a burp", "Do your best evil laugh", "Any animal noise", "Sing one high note",
    "Whisper “bigger…”", "Scream “NOOO”", "Say your name", "Make a “boing”",
    "Clap once", "Say “Level up!”", "Gasp dramatically", "Say “Oh no”",
    "Mouth drumroll", "A word in another language", "Snort", "Say “Yummy”",
    "Beatbox one beat", "Say “Bruh”", "Kiss sound", "Fake sneeze", "Say “Oui oui”",
    "Duck quack", "Cat meow", "Say “Easy”", "Tongue click", "Say “Wow”",
    "Robot voice: “upgrade”", "Movie-trailer voice: “potato”", "Squeak", "Say “Yeehaw!”",
  ],
  finalPool: [
    "Shout “FINAL FORM!”", "Movie-trailer voice: “final form”", "Victory song (2 s)",
    "Boss-battle roar", "Opera note", "Dramatic “IT'S OVER”",
  ],

  // Voice speed: tier 2 plays at rateStart. The top tier's speed is the
  // "Top-tier voice speed" slider; the final form plays a bit slower still.
  audio: { rateStart: 1.0, finalFactor: 0.73, maxVoices: 8 },

  // Which tiers can be dropped in, with relative odds.
  spawn: { weights: [55, 30, 15] },

  // Flask shape, in world units (world = 1000 × 1600).
  flask: { cx: 500, cy: 980, radius: 470, neckHalfWidth: 80, top: 80 },
};
