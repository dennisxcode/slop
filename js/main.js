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
  $("#speed").onclick = e => { e.target.textContent = Game.cycleSpeed() + "×"; };
})();
