// Screen 1: record every prompt before the game unlocks.
window.Recorder = (() => {
  const C = window.CONFIG;
  const $ = s => document.querySelector(s);

  // Slots: one per tier that can be merged into, plus the final form.
  const slots = [];
  C.tiers.forEach((t, i) => { if (t.prompt) slots.push({ key: "t" + (i + 1), tier: i + 1, def: t.prompt, pool: C.promptPool }); });
  slots.push({ key: "final", tier: "★", def: C.final.prompt, pool: C.finalPool });

  // Player-chosen prompt text, remembered per browser.
  let prompts = {};
  try { prompts = JSON.parse(localStorage.getItem("prompts") || "{}"); } catch (e) {}
  const promptOf = s => prompts[s.key] || s.def;
  function savePrompts() { try { localStorage.setItem("prompts", JSON.stringify(prompts)); } catch (e) {} }

  const done = new Set();
  let stream = null, rec = null, recKey = null, chunks = [];

  function reroll(slot) {
    const used = new Set(slots.map(promptOf));
    const options = slot.pool.filter(p => !used.has(p));
    const list = options.length ? options : slot.pool;
    prompts[slot.key] = list[Math.floor(Math.random() * list.length)];
    savePrompts();
  }

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
          <input class="prompt" value="" maxlength="60" aria-label="What to record" ${isDone ? "readonly" : ""}>
          <button class="dice" title="${isDone ? "Re-record to change" : "New random prompt"}" ${isDone ? "disabled" : ""}>🎲</button>
        </div>
        <div class="line controls">
          <button class="rec" aria-label="Record">${live ? "■" : "●"}</button>
          <button class="play" aria-label="Play" ${isDone ? "" : "disabled"}>▶</button>
          <label class="up" title="Upload a file instead">⇪<input type="file" accept="audio/*" hidden></label>
          ${isDone ? '<button class="redo">Redo</button>' : ""}
          <span class="speed">plays at ${Sound.rateFor(s.key).toFixed(2)}×</span>
        </div>`;
      const input = li.querySelector(".prompt");
      input.value = promptOf(s);
      input.onchange = () => { prompts[s.key] = input.value.trim() || s.def; savePrompts(); };
      li.querySelector(".dice").onclick = () => { reroll(s); render(); };
      li.querySelector(".rec").onclick = () => toggle(s.key);
      li.querySelector(".play").onclick = () => { Sound.ac(); Sound.play(s.key); };
      li.querySelector("input[type=file]").onchange = e => { const f = e.target.files[0]; if (f) save(s.key, f); e.target.value = ""; };
      const redo = li.querySelector(".redo");
      if (redo) redo.onclick = async () => { done.delete(s.key); Sound.drop(s.key); await Store.del(s.key); render(); };
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
    for (const s of slots) {
      const blob = await Store.get(s.key);
      if (!blob) continue;
      try { await Sound.load(s.key, blob); done.add(s.key); } catch (e) {}
    }
    render();
  }

  function shuffleUnrecorded() { slots.filter(s => !done.has(s.key)).forEach(reroll); render(); }
  function releaseMic() { if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; } }

  async function reset() {
    await Store.clear();
    slots.forEach(s => Sound.drop(s.key));
    done.clear(); render();
  }

  return { render, restore, releaseMic, reset, shuffleUnrecorded, ready: () => done.size === slots.length };
})();
