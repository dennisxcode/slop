// Decodes recordings, trims silence and knows each tier's playback speed.
// In-game playback is decided by js/announcer.js; this file only starts clips.
window.Sound = (() => {
  const C = window.CONFIG;
  let ctx = null, out = null;
  const buffers = {};     // key -> AudioBuffer   (keys: "n1".."n12", one per tier name)

  function ac() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      out = ctx.createGain();
      out.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  // Cut silence off both ends so the word lands exactly on the merge.
  function trim(b) {
    const d = b.getChannelData(0);
    let peak = 0; for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]));
    const th = Math.max(0.01, peak * 0.08);
    let s = 0, e = d.length - 1;
    while (s < e && Math.abs(d[s]) < th) s++;
    while (e > s && Math.abs(d[e]) < th) e--;
    s = Math.max(0, s - Math.floor(b.sampleRate * 0.015));
    e = Math.min(d.length, e + Math.floor(b.sampleRate * 0.08));
    if (e - s < 256) return b;
    const o = ctx.createBuffer(b.numberOfChannels, e - s, b.sampleRate);
    for (let c = 0; c < b.numberOfChannels; c++) o.copyToChannel(b.getChannelData(c).slice(s, e), c);
    return o;
  }

  async function load(key, blob) {
    ac();
    const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
    buffers[key] = trim(buf);
    return buffers[key];
  }

  const key = n => "n" + n;     // n = tier number, 1-indexed

  // Speed for tier n's name: introRate for tier 1 (the round intro), then 1.0×
  // at tier 2 sliding geometrically to the "Top-tier voice speed" slider at
  // tier 11. Tier 12 (the Final Form) plays at the slider value too.
  function rateFor(n) {
    const a = C.audio, top = C.tiers.length - 1, end = Settings.get().slowdown;
    if (n <= 1) return a.introRate;
    const k = Math.min(1, (n - 2) / (top - 2));
    return a.rateStart * (end / a.rateStart) ** k;
  }
  const recordRate = n => rateFor(n) * C.audio.recordFactor;
  const finalRate = () => Settings.get().slowdown;

  // Start clip k at `rate`, `when` seconds on the audio clock. Returns a handle with
  // its real end time (duration ÷ rate) and a stop(at, fade) that fades it out.
  function start(k, rate, when = 0) {
    const b = buffers[k];
    if (!b) return null;
    ac();
    const at = Math.max(ctx.currentTime, when);
    const src = ctx.createBufferSource(), gain = ctx.createGain();
    src.buffer = b;
    src.playbackRate.value = rate;
    src.connect(gain); gain.connect(out);
    src.start(at);
    return {
      key: k, start: at, end: at + b.duration / rate,
      stop(t, fade) {
        gain.gain.setValueAtTime(1, t);
        gain.gain.linearRampToValueAtTime(0, t + fade);
        try { src.stop(t + fade); } catch (e) {}
        this.end = Math.min(this.end, t + fade);
      },
    };
  }

  // Record-screen preview: one at a time, cuts the previous preview.
  let preview = null;
  function play(k, rate) {
    if (!ctx) return;
    if (preview && preview.end > ctx.currentTime) preview.stop(ctx.currentTime, 0.03);
    preview = start(k, rate);
  }

  return {
    ac, load, key, rateFor, recordRate, finalRate, start, play,
    now: () => (ctx ? ctx.currentTime : 0),
    has: k => !!buffers[k], drop: k => delete buffers[k],
  };
})();
