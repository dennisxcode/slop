// Decodes recordings, trims silence and knows each tier's playback speed.
// In-game playback is decided by js/announcer.js; this file only starts clips.
window.Sound = (() => {
  const C = window.CONFIG;
  let ctx = null, out = null;
  const buffers = {};     // key -> AudioBuffer   (keys: "n1".."n12", one per tier name)

  function ac() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      // A gentle limiter so the loudest top-tier clips never clip.
      out = ctx.createDynamicsCompressor();
      out.threshold.value = -6; out.knee.value = 6; out.ratio.value = 12; out.attack.value = 0.003; out.release.value = 0.15;
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
    if (e - s < 256) { s = 0; e = d.length; }
    const o = ctx.createBuffer(b.numberOfChannels, e - s, b.sampleRate);
    const k = peak > 0 ? C.audio.normalize / peak : 1;     // level every take to the same peak
    for (let c = 0; c < b.numberOfChannels; c++) o.copyToChannel(b.getChannelData(c).slice(s, e).map(v => v * k), c);
    return o;
  }

  async function load(key, blob) {
    ac();
    const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
    buffers[key] = trim(buf);
    return buffers[key];
  }

  const key = n => "n" + n;     // n = tier number, 1-indexed

  // Speed (and pitch) for tier n's name: introRate for tier 1, 1.0× at tier 2,
  // easing down to the "Top-tier voice speed" slider at tier 11 (and above).
  const topTier = () => C.tiers.length - 1;
  const progress = n => Math.min(1, Math.max(0, (n - 2) / (topTier() - 2)));
  function rateFor(n) {
    const a = C.audio, end = Settings.get().slowdown;
    if (n <= 1) return a.introRate;
    return a.rateStart + (end - a.rateStart) * progress(n) ** a.curve;
  }
  const finalRate = () => Settings.get().slowdown;

  // Volume for tier n: gainStart at tier 1 rising evenly to gainEnd at tier 11+.
  function gainFor(n) {
    const a = C.audio, k = Math.min(1, Math.max(0, (n - 1) / (topTier() - 1)));
    return a.gainStart + (a.gainEnd - a.gainStart) * k;
  }

  // Start clip k at `rate`, `when` seconds on the audio clock. Returns a handle with
  // its real end time (duration ÷ rate) and a stop(at, fade) that fades it out.
  function start(k, rate, when = 0, vol = 1) {
    const b = buffers[k];
    if (!b) return null;
    ac();
    const at = Math.max(ctx.currentTime, when);
    const src = ctx.createBufferSource(), gain = ctx.createGain();
    src.buffer = b;
    src.playbackRate.value = rate;
    gain.gain.value = vol;
    src.connect(gain); gain.connect(out);
    src.start(at);
    return {
      key: k, start: at, end: at + b.duration / rate,
      stop(t, fade) {
        gain.gain.setValueAtTime(vol, t);
        gain.gain.linearRampToValueAtTime(0, t + fade);
        try { src.stop(t + fade); } catch (e) {}
        this.end = Math.min(this.end, t + fade);
      },
    };
  }

  // Record-screen preview: one at a time, cuts the previous preview.
  let preview = null;
  function play(k, rate, vol = 1) {
    if (!ctx) return;
    if (preview && preview.end > ctx.currentTime) preview.stop(ctx.currentTime, 0.03);
    preview = start(k, rate, 0, vol);
  }

  return {
    ac, load, key, rateFor, finalRate, gainFor, start, play,
    now: () => (ctx ? ctx.currentTime : 0),
    has: k => !!buffers[k], drop: k => delete buffers[k],
  };
})();
