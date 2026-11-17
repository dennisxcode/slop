// Decodes recordings and plays them slowed down by tier.
window.Sound = (() => {
  const C = window.CONFIG;
  let ctx = null, out = null, voices = 0;
  const buffers = {};     // key -> AudioBuffer   (keys: "t2".."t8", "final")
  const lastAt = {};

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

  // Tier n = the tier something merged INTO (2..N). "final" = final form.
  function rateFor(key) {
    const a = C.audio, N = C.tiers.length, end = Settings.get().slowdown;
    if (key === "final") return end * a.finalFactor;
    const n = +key.slice(1);
    return a.rateStart + (end - a.rateStart) * (n - 2) / Math.max(1, N - 2);
  }

  function play(key, rate = rateFor(key)) {
    const b = buffers[key];
    if (!b || !ctx) return;
    const now = ctx.currentTime;
    if (voices >= C.audio.maxVoices || (lastAt[key] && now - lastAt[key] < 0.07)) return;
    lastAt[key] = now; voices++;
    const src = ctx.createBufferSource();
    src.buffer = b;
    src.playbackRate.value = rate;
    src.connect(out);
    src.onended = () => voices--;
    src.start();
  }

  return { ac, load, play, rateFor, has: k => !!buffers[k], drop: k => delete buffers[k] };
})();
