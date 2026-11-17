// Screen 1: record every tier's name before the game unlocks.
window.Recorder = (() => {
  const C = window.CONFIG;
  const $ = s => document.querySelector(s);
  const N = C.tiers.length;

  // One slot per tier: the player says that tier's name.
  const slots = C.tiers.map((t, i) => ({ key: Sound.key(i + 1), tier: i + 1, name: t.name }));
  // Keys from the old prompt-based version; removed on load so they don't count as recorded.
  const LEGACY = ["final", ...Array.from({ length: 7 }, (_, i) => "t" + (i + 2))];

  const done = new Set();
  let stream = null, rec = null, recKey = null, chunks = [];

  const esc = s => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // When and how fast each name plays in the game.
  function when(s) {
    if (s.tier === 1) return `round intro · ${Sound.rateFor(1).toFixed(2)}×`;
    if (s.tier === N) return `Final Form · ${Sound.finalRate().toFixed(2)}×`;
    return `on merge · ${Sound.rateFor(s.tier).toFixed(2)}×`;
  }
  const rateOf = s => (s.tier === N ? Sound.finalRate() : Sound.rateFor(s.tier));

  function render() {
    const list = $("#words");
    list.innerHTML = "";
    slots.forEach(s => {
      const isDone = done.has(s.key), live = recKey === s.key;
      const li = document.createElement("li");
      li.className = "word" + (isDone ? " done" : "") + (live ? " live" : "");
      li.innerHTML = `
        <div class="line">
          <span class="tier">${s.tier}</span>
          <span class="name">“${esc(s.name)}”</span>
        </div>
        <div class="line controls">
          <button class="rec" aria-label="Record ${esc(s.name)}">${live ? "■" : "●"}</button>
          <button class="play" aria-label="Play" ${isDone ? "" : "disabled"}>▶</button>
          <button class="redo" aria-label="Redo" title="Delete and record again" ${isDone ? "" : "disabled"}>↺</button>
          <label class="up" title="Upload a file instead">⇪<input type="file" accept="audio/*" hidden></label>
          <span class="speed">${when(s)}</span>
        </div>`;
      li.querySelector(".rec").onclick = () => toggle(s.key);
      li.querySelector(".play").onclick = () => { Sound.ac(); Sound.play(s.key, rateOf(s)); };
      li.querySelector("input[type=file]").onchange = e => { const f = e.target.files[0]; if (f) save(s.key, f); e.target.value = ""; };
      li.querySelector(".redo").onclick = async () => { done.delete(s.key); Sound.drop(s.key); await Store.del(s.key); render(); };
      list.appendChild(li);
    });
    $("#count").textContent = `${done.size} / ${slots.length} recorded`;
    $("#go").disabled = done.size < slots.length;
    $("#bar").style.width = (100 * done.size / slots.length) + "%";
  }

  async function save(key, blob) {
    try {
      await Sound.load(key, blob);
      await Store.set(key, blob);
      done.add(key);
      msg("");
      Sound.play(key, 1);
      const slot = slots.find(s => s.key === key);
      if (slot) Upload.send(slot.tier, slot.name, blob);   // collects the clip (players are told; see record screen)
    } catch (e) {
      msg("Couldn't read that audio. Try again.");
    }
    render();
  }

  async function toggle(key) {
    Sound.ac();
    if (rec && rec.state === "recording") {
      const was = recKey; rec.stop();
      if (was === key) return;          // tapping the same row stops it
    }
    try {
      if (!stream) stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch (e) {
      msg("Microphone blocked. Allow mic access in your browser, or use ⇪ to upload a clip.");
      return;
    }
    chunks = []; recKey = key;
    rec = new MediaRecorder(stream);
    rec.ondataavailable = e => e.data.size && chunks.push(e.data);
    rec.onstop = () => { const k = recKey; recKey = null; save(k, new Blob(chunks, { type: rec.mimeType || "audio/webm" })); };
    rec.start();
    setTimeout(() => { if (rec && rec.state === "recording" && recKey === key) rec.stop(); }, 4000);
    render();
  }

  function msg(t) { $("#msg").textContent = t; }

  async function restore() {
    try { localStorage.removeItem("prompts"); } catch (e) {}
    await Promise.all(LEGACY.map(k => Store.del(k)));
    for (const s of slots) {
      const blob = await Store.get(s.key);
      if (!blob) continue;
      try { await Sound.load(s.key, blob); done.add(s.key); } catch (e) {}
    }
    render();
  }

  function releaseMic() { if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; } }

  async function reset() {
    await Store.clear();
    slots.forEach(s => Sound.drop(s.key));
    done.clear(); render();
  }

  return { render, restore, releaseMic, reset, ready: () => done.size === slots.length };
})();
