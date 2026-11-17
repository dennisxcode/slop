// Live-tweakable game settings: sliders, presets, randomizer, persistence.
window.Settings = (() => {
  // Every control. Add a row here and it shows up in the ⚙ panel automatically.
  // group: panel heading. voice: kept by presets/Randomize.
  const SCHEMA = [
    { key: "gravity",   label: "Gravity",        min: 0.1,  max: 4,    step: 0.05,  def: 1.0 },
    { key: "bounce",    label: "Bounciness",     min: 0,    max: 1,    step: 0.01,  def: 0.35 },
    { key: "friction",  label: "Friction",       min: 0,    max: 1,    step: 0.01,  def: 0.02 },
    { key: "drag",      label: "Air drag",       min: 0,    max: 0.05, step: 0.001, def: 0.002 },
    { key: "size",      label: "Potato size",    min: 0.6,  max: 1.4,  step: 0.01,  def: 1 },
    { key: "dropEvery", label: "Drop every (s)", min: 0.1,  max: 2,    step: 0.01,  def: 0.58 },
    { key: "spin",      label: "Spin on drop",   min: 0,    max: 1,    step: 0.01,  def: 0.1 },
    { key: "pop",       label: "Merge pop",      min: 0,    max: 15,   step: 0.5,   def: 2 },
    { key: "attract",   label: "Same-tier pull", min: 0,    max: 2,    step: 0.05,  def: 1 },
    { key: "jiggle",    label: "Jiggle",         min: 0,    max: 1,    step: 0.05,  def: 0.5 },
    { key: "slowdown",  label: "Top-tier voice speed", min: 0.4, max: 1, step: 0.01, def: 0.6, group: "Voice", voice: true },
    { key: "breath",    label: "Breath between clips (s)", min: 0.1, max: 1, step: 0.05, def: 0.25, group: "Voice", voice: true },
    { key: "eventLife", label: "Event lifetime (s)", min: 0.5, max: 4, step: 0.1, def: 2, group: "Voice", voice: true },
  ];

  // "Video" = the defaults above (matched to the reference video).
  const PRESETS = {
    "Video":      {},
    "Moon":       { gravity: 0.35, bounce: 0.35, drag: 0.001, pop: 3 },
    "Trampoline": { bounce: 0.92, friction: 0.01, pop: 4 },
    "Glue":       { bounce: 0, friction: 1, drag: 0.03, spin: 0, jiggle: 0 },
    "Ice":        { friction: 0, bounce: 0.1, drag: 0 },
    "Heavy":      { gravity: 3.2, bounce: 0.02, size: 1.25 },
    "Tiny":       { size: 0.65, dropEvery: 0.25 },
    "Chaos":      { gravity: 2.4, bounce: 0.7, spin: 0.9, pop: 10, dropEvery: 0.18 },
  };

  const defaults = () => Object.fromEntries(SCHEMA.map(s => [s.key, s.def]));
  let state = defaults(), vary = false;
  const listeners = [];
  const clamp = (s, v) => s.type === "bool" ? !!v : Math.min(s.max, Math.max(s.min, +(Math.round(v / s.step) * s.step).toFixed(4)));

  // Saved settings from an older version are partly reset: v2 keeps everything
  // but the voice speed (its curve changed); anything older starts fresh.
  const VERSION = 3;
  try {
    const saved = JSON.parse(localStorage.getItem("physics") || "null");
    if (saved) {
      const st = saved.state || {};
      const keep = saved.v === VERSION ? SCHEMA.map(s => s.key) : saved.v === 2 ? SCHEMA.map(s => s.key).filter(k => k !== "slowdown") : [];
      for (const k of keep) if (typeof st[k] === "number") state[k] = clamp(SCHEMA.find(s => s.key === k), st[k]);
      vary = !!saved.vary;
    }
    localStorage.removeItem("dropSound");
  } catch (e) {}

  function save() { try { localStorage.setItem("physics", JSON.stringify({ v: VERSION, state, vary })); } catch (e) {} }
  function emit() { save(); listeners.forEach(fn => fn(state)); }

  function randomize() {
    // Mostly sensible, occasionally wild: bias toward the default with a random pull to the edges.
    for (const s of SCHEMA) {
      if (s.voice) continue;                        // keep the voice settings the player chose
      const t = Math.random() ** 1.6 * (Math.random() < 0.5 ? -1 : 1);
      const v = t < 0 ? s.def + t * (s.def - s.min) : s.def + t * (s.max - s.def);
      state[s.key] = clamp(s, v);
    }
    emit();
  }

  return {
    SCHEMA, PRESETS,
    get: () => state,
    set(key, v) { const s = SCHEMA.find(x => x.key === key); state[key] = clamp(s, v); emit(); },
    preset(name) {
      const voice = Object.fromEntries(SCHEMA.filter(s => s.voice).map(s => [s.key, state[s.key]]));
      state = { ...defaults(), ...voice, ...PRESETS[name] }; emit();
    },
    reset() { state = defaults(); emit(); },
    randomize,
    get vary() { return vary; },
    set vary(v) { vary = v; save(); },
    onChange(fn) { listeners.push(fn); fn(state); },
  };
})();
