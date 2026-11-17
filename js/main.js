// Wires the two screens together.
(() => {
  const $ = s => document.querySelector(s);
  const show = id => document.querySelectorAll(".screen").forEach(s => s.classList.toggle("active", s.id === id));

  Game.init();
  Recorder.restore();

  $("#go").onclick = () => {
    if (!Recorder.ready()) return;
    Sound.ac();
    Recorder.releaseMic();
    show("play");
    Game.start();
  };
  $("#wipe").onclick = () => Recorder.reset();

  $("#back").onclick = () => { Game.stop(); show("record"); Recorder.render(); };
  $("#reset").onclick = () => Game.reset();
  $("#auto").onclick = e => { const on = Game.toggleAuto(); e.target.textContent = "Auto-drop: " + (on ? "on" : "off"); e.target.classList.toggle("on", on); };
  $("#shuffle").onclick = () => Recorder.shuffleUnrecorded();

  // ---- physics panel ----
  const sliders = $("#sliders"), presets = $("#presets");
  const fmt = (s, v) => s.step < 0.01 ? v.toFixed(3) : s.step < 1 ? v.toFixed(2) : String(v);
  Settings.SCHEMA.forEach(s => {
    const row = document.createElement("label");
    row.className = "slider";
    row.innerHTML = `<span>${s.label}</span><input type="range" min="${s.min}" max="${s.max}" step="${s.step}" data-key="${s.key}"><output></output>`;
    row.querySelector("input").oninput = e => Settings.set(s.key, +e.target.value);
    sliders.appendChild(row);
  });
  Object.keys(Settings.PRESETS).forEach(name => {
    const b = document.createElement("button");
    b.className = "chip"; b.textContent = name;
    b.onclick = () => Settings.preset(name);
    presets.appendChild(b);
  });
  Settings.onChange(st => {
    Settings.SCHEMA.forEach(s => {
      const input = sliders.querySelector(`[data-key="${s.key}"]`);
      input.value = st[s.key]; input.nextElementSibling.textContent = fmt(s, st[s.key]);
    });
  });
  $("#vary").checked = Settings.vary;
  $("#vary").onchange = e => (Settings.vary = e.target.checked);
  $("#rand").onclick = () => Settings.randomize();
  $("#physReset").onclick = () => Settings.reset();
  $("#physBtn").onclick = () => $("#phys").classList.toggle("open");
  $("#physClose").onclick = () => $("#phys").classList.remove("open");

  $("#speed").onclick = e => { e.target.textContent = Game.cycleSpeed() + "×"; };
})();
