// Live-tweakable game settings: sliders, presets, randomizer, persistence.
window.Settings = (() => {
  // Every slider. Add a row here and it shows up in the ⚙ panel automatically.
  const SCHEMA = [
    { key: "gravity",   label: "Gravity",        min: 0.1,  max: 4,    step: 0.05,  def: 1.4 },
    { key: "bounce",    label: "Bounciness",     min: 0,    max: 1,    step: 0.01,  def: 0.15 },
    { key: "friction",  label: "Friction",       min: 0,    max: 1,    step: 0.01,  def: 0.05 },
    { key: "drag",      label: "Air drag",       min: 0,    max: 0.05, step: 0.001, def: 0.004 },
    { key: "size",      label: "Potato size",    min: 0.6,  max: 1.4,  step: 0.01,  def: 1 },
    { key: "dropEvery", label: "Drop every (s)", min: 0.1,  max: 2,    step: 0.05,  def: 0.55 },
    { key: "spin",      label: "Spin on drop",   min: 0,    max: 1,    step: 0.01,  def: 0.1 },
    { key: "pop",       label: "Merge pop",      min: 0,    max: 15,   step: 0.5,   def: 1 },
    { key: "slowdown",  label: "Top-tier voice speed", min: 0.2, max: 1, step: 0.01, def: 0.55 },
  ];

  const PRESETS = {
    "Normal":     {},
    "Moon":       { gravity: 0.35, bounce: 0.35, drag: 0.001, pop: 3 },
    "Trampoline": { bounce: 0.92, friction: 0.01, pop: 4 },
    "Glue":       { bounce: 0, friction: 1, drag: 0.03, spin: 0 },
    "Ice":        { friction: 0, bounce: 0.1, drag: 0 },
    "Heavy":      { gravity: 3.2, bounce: 0.02, size: 1.25 },
    "Tiny":       { size: 0.65, dropEvery: 0.25 },
    "Chaos":      { gravity: 2.4, bounce: 0.7, spin: 0.9, pop: 10, dropEvery: 0.18 },
  };

  const defaults = () => Object.fromEntries(SCHEMA.map(s => [s.key, s.def]));
  let state = defaults(), vary = false;
  const listeners = [];

  try {
    const saved = JSON.parse(localStorage.getItem("physics") || "null");
    if (saved) { Object.assign(state, saved.state || {}); vary = !!saved.vary; }
  } catch (e) {}

  function save() { try { localStorage.setItem("physics", JSON.stringify({ state, vary })); } catch (e) {} }
  function emit() { save(); listeners.forEach(fn => fn(state)); }
  const clamp = (s, v) => Math.min(s.max, Math.max(s.min, +(Math.round(v / s.step) * s.step).toFixed(4)));

  function randomize() {
    // Mostly sensible, occasionally wild: bias toward the default with a random pull to the edges.
    for (const s of SCHEMA) {
      if (s.key === "slowdown") continue;          // keep the voice setting the player chose
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
    preset(name) { state = { ...defaults(), slowdown: state.slowdown, ...PRESETS[name] }; emit(); },
    reset() { state = defaults(); emit(); },
    randomize,
    get vary() { return vary; },
    set vary(v) { vary = v; save(); },
    onChange(fn) { listeners.push(fn); fn(state); },
  };
})();
