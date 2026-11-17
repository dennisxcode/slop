// The announcer: the only thing that plays voice clips during the game.
//
// One clip at a time, never overlapping. After a clip ends the channel rests
// for `breath` before the next one. All timing is real time (the audio clock),
// so the 2×/4× game speed doesn't shorten clips or gaps.
//
//   Merge events {tier, time, isNewRecord} pile up while the channel is busy.
//   When it's free again, ONE is picked and every other one is thrown away:
//     1. a new record wins (lowest unheard record first, so records are
//        announced in the order they happened). Records never expire, so every
//        new best of the round is heard.
//     2. otherwise the highest tier among events younger than `eventLife`,
//        ties going to the most recent.
//   Intro      : tier 1's name, once at the start of each round.
//   Final Form : drops everything, cuts the current clip and plays
//                "Patate caca" at the slowest speed. Nothing else plays until
//                it has finished.
window.Announcer = (() => {
  const C = window.CONFIG, N = C.tiers.length;
  const S = () => Settings.get();

  let cur = null;          // { kind: "intro"|"merge"|"record"|"final", tier, h (Sound handle) }
  let events = [];         // pending merges: { tier, time, isNewRecord }
  let intro = false;       // round intro waiting for the channel
  let lastEnd = -Infinity; // audio-clock time the channel last went quiet
  const listeners = [];    // debug/test hooks: fn(event)

  const now = () => Sound.now();
  const emit = e => listeners.forEach(fn => fn(e));

  // A clip occupies the channel for its real length (duration ÷ rate).
  function busy(t = now()) {
    if (cur && t >= cur.h.end) {
      lastEnd = cur.h.end;
      emit({ type: "end", kind: cur.kind, tier: cur.tier, t: cur.h.end });
      cur = null;
    }
    return !!cur;
  }

  function play(kind, tier, when) {
    const rate = kind === "final" ? Sound.finalRate() : kind === "record" ? Sound.recordRate(tier) : Sound.rateFor(tier);
    const h = Sound.start(Sound.key(tier), rate, when);
    if (!h) return false;
    cur = { kind, tier, h };
    emit({ type: "start", kind, tier, rate, t: h.start, end: h.end });
    return true;
  }

  // Fade the current clip out; returns the time the channel is actually free.
  function cut() {
    const t = now();
    if (!busy(t)) return t;
    cur.h.stop(t, C.announcer.fadeOut);
    emit({ type: "cut", kind: cur.kind, tier: cur.tier, t, end: cur.h.end });
    const free = cur.h.end;
    lastEnd = free; cur = null;
    return free;
  }

  function discard(list, reason) { list.forEach(e => emit({ type: "discard", reason, ...e })); }

  // A merge just made `tier` (1-indexed). isNewRecord: the round's new best.
  function merge(tier, isNewRecord) {
    const t = now();
    // While the Final Form plays, events still queue (the next round may already
    // be merging); they're picked once it has finished.
    const e = { tier, time: t, isNewRecord: !!isNewRecord };
    events.push(e);
    emit({ type: "event", ...e });
  }

  // Pick one pending event (see top of file) and throw the rest away.
  function pick(t) {
    const life = S().eventLife;
    const records = events.filter(e => e.isNewRecord).sort((a, b) => a.tier - b.tier);
    if (records.length) {
      const e = records[0];
      discard(events.filter(x => !x.isNewRecord), "lost to record");
      events = records.slice(1);                             // unheard records wait their turn
      return e;
    }
    const fresh = events.filter(e => t - e.time < life);
    discard(events.filter(e => t - e.time >= life), "expired");
    fresh.sort((a, b) => b.tier - a.tier || b.time - a.time);
    discard(fresh.slice(1), "lost to " + (fresh[0] && fresh[0].tier));
    events = [];
    return fresh[0] || null;
  }

  // Called every animation frame by the game.
  function tick() {
    const t = now();
    if (busy(t) || t < lastEnd + S().breath) return;
    if (intro) { intro = false; play("intro", 1, t); return; }
    if (!events.length) return;
    const e = pick(t);
    if (e) play(e.isNewRecord ? "record" : "merge", e.tier, t);
  }

  // Round start: the first drop is falling into an empty flask.
  function introNow() { Sound.ac(); intro = true; }

  function finalForm() {
    Sound.ac();
    discard(events, "final form");
    events = []; intro = false;
    play("final", N, cut());
  }

  // New round (flask cleared): forget anything waiting. A clip that's
  // already playing (e.g. the Final Form) finishes normally.
  function newRound() { discard(events, "new round"); events = []; intro = false; }

  // Leaving the game: silence everything.
  function stop() { cut(); newRound(); }

  return {
    merge, intro: introNow, finalForm, tick, newRound, stop,
    on: fn => listeners.push(fn),
    get playing() { return busy() ? cur.kind : null; },
  };
})();
