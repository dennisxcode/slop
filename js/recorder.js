// Screen 1: record every word before the game unlocks.
window.Recorder = (() => {
  const C = window.CONFIG;
  const $ = s => document.querySelector(s);

  // Build the list of words to record from the config.
  const items = [];
  C.tiers.forEach((t, i) => { if (t.word) items.push({ key: "t" + (i + 1), word: t.word, tier: i + 1 }); });
  if (C.final && C.final.word) items.push({ key: "final", word: C.final.word, tier: "★" });

  const done = new Set();
  let stream = null, rec = null, recKey = null, chunks = [];

  function render() {
    const list = $("#words");
    list.innerHTML = "";
    items.forEach(it => {
      const li = document.createElement("li");
      li.className = "word" + (done.has(it.key) ? " done" : "") + (recKey === it.key ? " live" : "");
      li.innerHTML = `
        <span class="tier">${it.tier}</span>
        <span class="text">“${it.word}”</span>
        <span class="speed">${Sound.rateFor(it.key).toFixed(2)}×</span>
        <button class="rec" aria-label="Record">${recKey === it.key ? "■" : "●"}</button>
        <button class="play" aria-label="Play" ${done.has(it.key) ? "" : "disabled"}>▶</button>
        <label class="up" title="Upload a file instead">⇪<input type="file" accept="audio/*" hidden></label>`;
      li.querySelector(".rec").onclick = () => toggle(it.key);
      li.querySelector(".play").onclick = () => { Sound.ac(); Sound.play(it.key); };
      li.querySelector("input").onchange = e => { const f = e.target.files[0]; if (f) save(it.key, f); e.target.value = ""; };
      list.appendChild(li);
    });
    $("#count").textContent = `${done.size} / ${items.length} recorded`;
    $("#go").disabled = done.size < items.length;
    $("#bar").style.width = (100 * done.size / items.length) + "%";
  }

  async function save(key, blob) {
    try {
      await Sound.load(key, blob);
      await Store.set(key, blob);
      done.add(key);
      msg("");
      Sound.play(key);
    } catch (e) {
      msg("Couldn't read that audio — try again.");
    }
    render();
  }

  async function toggle(key) {
    Sound.ac();
    if (rec && rec.state === "recording") {
      const was = recKey; rec.stop();
      if (was === key) return;          // tapping the same word stops it
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
    rec.onstop = () => {
      const k = recKey; recKey = null;
      save(k, new Blob(chunks, { type: rec.mimeType || "audio/webm" }));
    };
    rec.start();
    // Safety: auto-stop after 4 s so nobody records a podcast by accident.
    setTimeout(() => { if (rec && rec.state === "recording" && recKey === key) rec.stop(); }, 4000);
    render();
  }

  function msg(t) { $("#msg").textContent = t; }

  async function restore() {
    for (const it of items) {
      const blob = await Store.get(it.key);
      if (!blob) continue;
      try { await Sound.load(it.key, blob); done.add(it.key); } catch (e) {}
    }
    render();
  }

  function releaseMic() { if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; } }

  async function reset() {
    await Store.clear();
    items.forEach(it => Sound.drop(it.key));
    done.clear(); render();
  }

  return { render, restore, releaseMic, reset, ready: () => done.size === items.length };
})();
