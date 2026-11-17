// Screen 2: the merge flask (Matter.js rigid-body physics).
window.Game = (() => {
  const C = window.CONFIG, F = C.finalForm;
  const { Engine, Bodies, Body, Composite, Events } = Matter;
  const WW = 1000, WH = 1600;                 // fixed world size, scaled to the screen
  const N = C.tiers.length;
  const TOP = N - 2;                           // index of tier 11: two of them start the Final Form
  const FINAL = N - 1;                         // index of tier 12 (Patate caca), sprite only

  let cv, ctx, scale = 1, ox = 0, oy = 0;
  let engine, running = false, auto = true, speed = 1, dropT = 0, flashT = 0, last = 0, t = 0;
  let rings = [], best = 0, roundBest = 0, roundFresh = true;
  let ff = null;                               // Final Form sequence state (see startFinal)
  let floor = [], floorOpen = false;           // bowl's bottom-arc wall bodies
  const imgs = [];

  const S = () => Settings.get();
  const radius = tier => C.tiers[tier].radius * S().size;
  const isPiece = b => b.label === "piece";
  const pieces = () => Composite.allBodies(engine.world).filter(isPiece);
  const screenBottom = () => (innerHeight - oy) / scale;   // world y of the screen's bottom edge

  // ---------- assets ----------
  function loadImages() {
    C.tiers.forEach((tier, i) => {
      const im = new Image();
      im.onload = () => (imgs[i] = im);
      im.onerror = () => (imgs[i] = null);      // fallback circle is drawn
      im.src = tier.image;
    });
  }

  // ---------- world ----------
  function buildFlask() {
    const f = C.flask, th = 40, wall = { isStatic: true, friction: 0.02, restitution: 0.1, label: "wall" };
    const parts = [];
    const gap = Math.asin(f.neckHalfWidth / f.radius);
    const segs = 90;
    for (let i = 0; i < segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      // skip the opening at the top where the neck joins
      const d = Math.atan2(Math.sin(a + Math.PI / 2), Math.cos(a + Math.PI / 2));
      if (Math.abs(d) < gap) continue;
      const r = f.radius + th / 2, len = 2 * f.radius * Math.sin(Math.PI / segs) * 1.25;
      const p = Bodies.rectangle(f.cx + Math.cos(a) * r, f.cy + Math.sin(a) * r, th, len, { ...wall, angle: a });
      if (a > Math.PI * 0.02 && a < Math.PI * 0.98) floor.push(p);   // bottom arc: opens for the Final Form
      parts.push(p);
    }
    const joinY = f.cy - Math.sqrt(f.radius ** 2 - f.neckHalfWidth ** 2);
    // Neck walls extend far above the screen so popped potatoes can't escape the flask.
    const wallTop = f.top - 4000, neckH = joinY - wallTop + th;
    for (const s of [-1, 1])
      parts.push(Bodies.rectangle(f.cx + s * (f.neckHalfWidth + th / 2), wallTop + neckH / 2 - th / 2, th, neckH, wall));
    Composite.add(engine.world, parts);
  }

  function setFloor(open) {
    floorOpen = open;
    for (const p of floor) p.collisionFilter.mask = open ? 0 : 0xFFFFFFFF;
  }

  let curSize = 1;

  function makePiece(x, y, tier) {
    const s = S(), r = radius(tier);
    const b = Bodies.circle(x, y, r, {
      restitution: s.bounce, friction: s.friction, frictionStatic: s.friction * 2, frictionAir: s.drag,
      density: 0.001 * (radius(0) / r) ** C.lively.weight, label: "piece",
    });
    b.tier = tier; b.r = r; b.born = t; b.pop = 0;
    Composite.add(engine.world, b);
    if (tier > best) best = tier;
    return b;
  }

  // Only tier 1 (Patate à la moustache) is ever dropped: at the top of the neck,
  // x jitter of ±40% of the neck width (kept inside the walls), random spin.
  function spawn(xScreen) {
    const f = C.flask, rad = radius(0), lim = Math.max(0, f.neckHalfWidth - rad - 2);
    let x = xScreen === undefined
      ? f.cx + (Math.random() * 2 - 1) * 0.4 * 2 * f.neckHalfWidth
      : (xScreen - ox) / scale;
    x = Math.max(f.cx - lim, Math.min(f.cx + lim, x));
    const b = makePiece(x, f.top - rad, 0);
    Body.setAngularVelocity(b, (Math.random() - 0.5) * S().spin);
    if (roundFresh) { roundFresh = false; Announcer.intro(); }   // tier 1's name, once per round
  }

  // ---------- merging ----------
  const pending = [];
  function onCollide(e) {
    if (ff && ff.phase !== "charge") return;     // nothing merges once the reveal starts
    for (const p of e.pairs) {
      const a = p.bodyA, b = p.bodyB;
      if (!isPiece(a) || !isPiece(b) || a.tier !== b.tier) continue;
      if (a.merged || b.merged) continue;
      if (a.tier === TOP && ff) continue;        // one Final Form at a time
      a.merged = b.merged = true;
      pending.push([a, b]);
    }
  }

  function resolveMerges() {
    while (pending.length) {
      const [a, b] = pending.shift();
      // Contact point: on the line between the centres, a.r/(a.r+b.r) of the way (equal radii → midpoint).
      const k = a.r / (a.r + b.r);
      const x = a.position.x + (b.position.x - a.position.x) * k, y = a.position.y + (b.position.y - a.position.y) * k;
      if (a.tier === TOP) { if (!ff) startFinal(a, b, x, y); continue; }
      Composite.remove(engine.world, [a, b]);
      const tier = a.tier + 1;
      const f = C.flask, nr = radius(tier), bowlTop = f.cy - f.radius + nr + 4;
      const tooWide = nr > f.neckHalfWidth - 2 && y < bowlTop;
      const n = makePiece(tooWide ? f.cx : x, tooWide ? bowlTop : y, tier);
      Body.setVelocity(n, { x: (a.velocity.x + b.velocity.x) / 2, y: (a.velocity.y + b.velocity.y) / 2 - S().pop });
      Body.setAngle(n, (a.angle + b.angle) / 2);
      n.pop = 1;
      rings.push({ x, y, r: n.r, life: 0, dur: 0.5 });
      const isRecord = tier > roundBest;
      if (isRecord) roundBest = tier;
      Announcer.merge(tier + 1, isRecord);       // 1-indexed; the announcer decides if/when
    }
  }

  // ---------- Final Form ----------
  // Two tier-11s touched. Runs in real time (not sped up), in phases:
  //   charge: both frozen, drops paused, screen dims, 3 shockwave rings.
  //   grow  : the pair becomes Patate caca, scaling up past the flask; other
  //           potatoes get pushed outward.
  //   burst : the bowl's bottom arc opens, everything falls off the screen
  //           while "Patate caca" plays. Then the flask resets.
  let finals = 0, overflows = 0;
  function startFinal(a, b, x, y) {
    finals++;
    for (const p of [a, b]) { Body.setStatic(p, true); p.frozen = true; }
    ff = { phase: "charge", t: 0, x, y, a, b, r: a.r, angle: (a.angle + b.angle) / 2, vy: 0 };
    for (let k = 0; k < 3; k++) rings.push({ x, y, r: a.r * 0.6, life: -k * 0.3, dur: 0.9, shock: true });
    if (FINAL > best) best = FINAL;
  }

  const ease = k => 1 - (1 - k) ** 3;

  function updateFinal(dt) {
    ff.t += dt;
    if (ff.phase === "charge") {
      ff.angle += dt * 0.6 * Math.sin(ff.t * 40);   // a little shiver
      if (ff.t < F.charge) return;
      Composite.remove(engine.world, [ff.a, ff.b]);
      ff.phase = "grow"; ff.t = 0; ff.r0 = ff.r;
      banner("FINAL FORM!");
      rings.push({ x: ff.x, y: ff.y, r: ff.r, life: 0, dur: 0.6 });
    } else if (ff.phase === "grow") {
      const k = Math.min(1, ff.t / F.grow);
      ff.r = ff.r0 + (F.size * C.flask.radius - ff.r0) * ease(k);
      for (const p of pieces()) {
        const dx = p.position.x - ff.x, dy = p.position.y - ff.y, d = Math.hypot(dx, dy) || 1;
        Body.setVelocity(p, { x: p.velocity.x + dx / d * F.push * dt * 10, y: p.velocity.y + dy / d * F.push * dt * 10 });
      }
      if (k < 1) return;
      ff.phase = "burst"; ff.t = 0; ff.vy = -F.hop;
      setFloor(true);
      Announcer.finalForm();
    } else {
      ff.vy += F.fallG * dt; ff.y += ff.vy * dt;
      ff.angle += dt * 0.25;
      const im = imgs[FINAL], top = ff.r * (C.sprite.size / 2 + C.tiers[FINAL].offY) / C.sprite.body;
      const gone = ff.y - (im ? top : ff.r) > screenBottom() && pieces().length === 0;
      if (gone || ff.t > F.maxBurst) endFinal();
    }
  }

  function endFinal() {
    if (!ff) return;
    for (const p of [ff.a, ff.b]) if (Composite.get(engine.world, p.id, "body")) Composite.remove(engine.world, p);
    ff = null;
    setFloor(false);
    banner(null);
    clear();
    dropT = 0.3;
    if (Settings.vary) Settings.randomize();
  }

  // ---------- overflow ----------
  let overT = 0;
  function overflow() {
    overflows++;
    flashT = 2;
    banner("OVERFLOW!");
    setTimeout(() => banner(null), 1600);
    setTimeout(() => { clear(); if (Settings.vary) Settings.randomize(); }, 900);
  }

  function banner(text) {
    const el = document.getElementById("banner");
    if (text) el.textContent = text;
    el.classList.toggle("show", !!text);
  }

  // Push slider changes into the running world (and onto pieces already in the flask).
  function applySettings(s) {
    if (!engine) return;
    engine.gravity.y = s.gravity;
    const k = s.size / curSize; curSize = s.size;
    for (const b of pieces()) {
      b.restitution = s.bounce; b.friction = s.friction; b.frictionStatic = s.friction * 2; b.frictionAir = s.drag;
      if (k !== 1) { Body.scale(b, k, k); b.r *= k; }
    }
  }

  // Empty the flask and start a new round.
  function clear() {
    Announcer.newRound();
    pieces().forEach(b => Composite.remove(engine.world, b));
    pending.length = 0;
    roundBest = 0; roundFresh = true;
  }

  // ---------- render ----------
  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
    scale = Math.min(innerWidth / WW, (innerHeight - 110) / WH);
    ox = (innerWidth - WW * scale) / 2; oy = 40 + (innerHeight - 110 - WH * scale) / 2;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawFlask() {
    const f = C.flask, gap = Math.asin(f.neckHalfWidth / f.radius);
    const joinY = f.cy - Math.sqrt(f.radius ** 2 - f.neckHalfWidth ** 2);
    ctx.beginPath();
    ctx.moveTo(f.cx - f.neckHalfWidth, f.top - 60);
    ctx.lineTo(f.cx - f.neckHalfWidth, joinY);
    if (floorOpen) {
      // burst open: only the upper arcs remain
      ctx.arc(f.cx, f.cy, f.radius, -Math.PI / 2 - gap, -Math.PI * 1.02, true);
      ctx.moveTo(f.cx + f.radius * Math.cos(Math.PI * 0.02), f.cy + f.radius * Math.sin(Math.PI * 0.02));
      ctx.arc(f.cx, f.cy, f.radius, Math.PI * 0.02, -Math.PI / 2 + gap, true);
    } else {
      ctx.arc(f.cx, f.cy, f.radius, -Math.PI / 2 - gap, -Math.PI / 2 + gap, true);
    }
    ctx.lineTo(f.cx + f.neckHalfWidth, f.top - 60);
    ctx.strokeStyle = "rgba(200,210,255,.35)"; ctx.lineWidth = 5; ctx.stroke();
    if (!floorOpen && ctx.createConicGradient) {
      const g = ctx.createConicGradient(t * 0.6, f.cx, f.cy);
      ["#ff4d6d", "#ffb347", "#fff275", "#5cff9d", "#4dd2ff", "#a77bff", "#ff4d6d"]
        .forEach((c, i, a) => g.addColorStop(i / (a.length - 1), c));
      ctx.save();
      ctx.beginPath(); ctx.arc(f.cx, f.cy, f.radius, Math.PI * 0.06, Math.PI * 0.94);
      ctx.strokeStyle = g; ctx.lineWidth = 7; ctx.shadowColor = "#8cf"; ctx.shadowBlur = 30; ctx.stroke();
      ctx.restore();
    }
  }

  // Draw tier `tier` with body radius r centred at (x,y). The sprite's body
  // circle (C.sprite.body px) is scaled to r; offY shifts the image up so the
  // body, not the image, is centred on the physics circle.
  function drawSprite(tier, r, x, y, angle, glow) {
    const im = imgs[tier];
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    if (glow) { ctx.shadowColor = "#fd5"; ctx.shadowBlur = glow; }
    if (im) {
      const k = r / C.sprite.body, w = im.width * k, h = im.height * k;
      ctx.drawImage(im, -w / 2, -h / 2 - C.tiers[tier].offY * k, w, h);
    } else {
      drawFallback(tier, r);
    }
    ctx.restore();
  }

  const drawPiece = b => drawSprite(b.tier, b.r * (1 + 0.25 * b.pop), b.position.x, b.position.y, b.angle);

  // If a sprite fails to load: potato-coloured circle, tier number, short name.
  function drawFallback(tier, r) {
    const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
    g.addColorStop(0, "#e9c78f"); g.addColorStop(1, "#b0844a");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = Math.max(2, r * 0.05); ctx.strokeStyle = "#7a5530"; ctx.stroke();
    ctx.fillStyle = "#3b2612"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = `800 ${r * 0.62}px system-ui`;
    ctx.fillText(tier + 1, 0, -r * 0.14);
    const label = C.tiers[tier].short;
    ctx.font = `700 ${r * 0.3}px system-ui`;
    const w = ctx.measureText(label).width, fit = Math.min(1, (r * 1.6) / w);
    ctx.font = `700 ${r * 0.3 * fit}px system-ui`;
    ctx.fillText(label, 0, r * 0.42);
  }

  function drawRings(dt) {
    for (const r of rings) {
      r.life += dt; if (r.life < 0) continue;
      const p = r.life / r.dur; if (p > 1) continue;
      ctx.strokeStyle = r.shock ? `rgba(255,220,140,${(1 - p) * 0.9})` : `rgba(255,255,255,${(1 - p) * 0.85})`;
      ctx.lineWidth = r.shock ? 16 * (1 - p) + 4 : 6 * (1 - p) + 2;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r * (1 + p * (r.shock ? 7 : 0.9)), 0, 7); ctx.stroke();
    }
    rings = rings.filter(r => r.life < r.dur);
  }

  // How dark the Final Form makes everything behind the frozen pair (0..1).
  function dimAmount() {
    if (!ff) return 0;
    if (ff.phase === "charge") return 0.6 * Math.min(1, ff.t / 0.15);
    if (ff.phase === "grow") return 0.6 - 0.35 * (ff.t / F.grow);
    return 0.25 * Math.max(0, 1 - ff.t / 0.6);
  }

  // Keeps the flask lively so the pile doesn't lock up (forces reset after
  // every Engine.update). Tuning lives in CONFIG.lively.
  //   Same-tier pull: two potatoes of the same tier attract, up to `attract` ×
  //     gravity. Bigger tiers pull harder and from further away, so big
  //     duplicates find each other across the pile.
  //   Jiggle: potatoes that have come to rest get the odd random hop; bigger
  //     tiers hop more often, so the bottom of the pile keeps moving.
  function liven() {
    if (ff && ff.phase !== "charge") return;
    const s = S(), L = C.lively, g = engine.gravity.y * engine.gravity.scale;
    const byTier = new Map();
    for (const b of pieces()) {
      if (b.frozen || b.merged) continue;
      if (!byTier.has(b.tier)) byTier.set(b.tier, []);
      byTier.get(b.tier).push(b);
      if (s.jiggle > 0 && b.speed < 0.8 && t - b.born > 0.5 && Math.random() < L.jiggleRate * (1 + L.jiggleGrowth * b.tier)) {
        const k = s.jiggle * L.jiggleKick;
        Body.setVelocity(b, { x: b.velocity.x + (Math.random() * 2 - 1) * k, y: b.velocity.y - (0.5 + Math.random()) * k });
        Body.setAngularVelocity(b, b.angularVelocity + (Math.random() - 0.5) * 0.1 * s.jiggle);
      }
    }
    if (s.attract <= 0) return;
    for (const [tier, group] of byTier) {
      const boost = 1 + L.pullGrowth * tier, reach = L.pullRange + L.pullReach * tier;
      for (let i = 0; i < group.length; i++) for (let j = i + 1; j < group.length; j++) {
        const a = group[i], b = group[j];
        const dx = b.position.x - a.position.x, dy = b.position.y - a.position.y, d = Math.hypot(dx, dy) || 1;
        const range = (a.r + b.r) * reach;
        if (d > range) continue;
        const f = s.attract * g * boost * (0.5 + 0.5 * (1 - d / range));   // stronger when close, never zero in range
        const fx = dx / d * f, fy = dy / d * f;
        Body.applyForce(a, a.position, { x: fx * a.mass, y: fy * a.mass });
        Body.applyForce(b, b.position, { x: -fx * b.mass, y: -fy * b.mass });
      }
    }
  }

  function step(dt) {
    const steps = Math.ceil(dt * 1000 / 16.667);   // Matter is happiest at ≤ 60 Hz steps
    for (let k = 0; k < steps; k++) { liven(); Engine.update(engine, dt * 1000 / steps); resolveMerges(); }
  }

  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.033, (now - last) / 1000 || 0.016); last = now;
    if (ff) {
      // The Final Form is a cutscene: real time, regardless of the 2×/4× speed.
      t += dt; step(dt); updateFinal(dt);
    } else {
      for (let i = 0; i < speed && !ff; i++) {
        t += dt;
        if (auto && flashT <= 0) { dropT -= dt; if (dropT <= 0) { spawn(); dropT = S().dropEvery; } }
        if (flashT > 0) flashT -= dt;
        step(dt);
      }
    }
    const ps = pieces(), bottom = screenBottom();
    for (const b of ps) {
      b.pop = Math.max(0, b.pop - dt * 4 * speed);
      if (b.position.y - b.r > Math.max(WH, bottom)) Composite.remove(engine.world, b);
    }
    // Overflow: something has been sitting above the neck's rim for a while → reset the flask.
    const stuck = !ff && flashT <= 0 && ps.some(b => b.position.y < C.flask.top + b.r * 0.5 && b.speed < 1.5 && t - b.born > 1);
    overT = stuck ? overT + dt * speed : 0;
    if (overT > 2.5) { overT = 0; overflow(); }

    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, innerWidth, innerHeight);
    ctx.save(); ctx.translate(ox, oy); ctx.scale(scale, scale);
    if (flashT > 0) {
      const f = C.flask, g = ctx.createRadialGradient(f.cx, f.cy, 0, f.cx, f.cy, f.radius * 1.7);
      g.addColorStop(0, `rgba(255,200,80,${Math.min(1, flashT / 1.5) * 0.3})`); g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, WW, WH);
    }
    drawFlask();
    ps.filter(b => !b.frozen).sort((a, b) => a.tier - b.tier).forEach(drawPiece);
    const dim = dimAmount();
    if (dim > 0) { ctx.fillStyle = `rgba(0,0,0,${dim})`; ctx.fillRect(-WW, -WH, WW * 3, WH * 4); }
    if (ff && ff.phase === "charge") {
      const glow = 30 + 30 * Math.sin(ff.t * 18);
      for (const p of [ff.a, ff.b]) drawSprite(p.tier, p.r, p.position.x, p.position.y, p.angle + ff.angle * 0.1, glow);
    }
    drawRings(ff ? dt : dt * speed);
    if (ff && ff.phase !== "charge") drawSprite(FINAL, ff.r, ff.x, ff.y, ff.angle, 60 + 20 * Math.sin(t * 6));
    ctx.restore();
    Announcer.tick();
    document.getElementById("best").textContent = `${best + 1}/${N}`;
    requestAnimationFrame(frame);
  }

  // ---------- public ----------
  function init() {
    cv = document.getElementById("game"); ctx = cv.getContext("2d");
    engine = Engine.create({ positionIterations: 10, velocityIterations: 8 });
    buildFlask();
    curSize = S().size;
    Settings.onChange(applySettings);
    Events.on(engine, "collisionStart", onCollide);
    Events.on(engine, "collisionActive", onCollide);   // catches pieces already resting together
    loadImages();
    addEventListener("resize", resize);
    cv.addEventListener("pointerdown", e => { Sound.ac(); if (flashT <= 0 && !ff) spawn(e.clientX); });
  }
  function start() { resize(); running = true; last = performance.now(); requestAnimationFrame(frame); }
  function stop() { running = false; endFinal(); Announcer.stop(); }
  return {
    init, start, stop,
    pieces,
    reset() { endFinal(); Announcer.stop(); clear(); best = 0; rings = []; },
    // Debug: two tier-n potatoes, just touching, in the bowl (n is 1-indexed).
    debugPair(n) { const f = C.flask, r = radius(n - 1) * 0.98; makePiece(f.cx - r, f.cy, n - 1); makePiece(f.cx + r, f.cy, n - 1); },
    get finalPhase() { return ff ? ff.phase : null; },
    toggleAuto() { auto = !auto; return auto; },
    cycleSpeed() { speed = speed === 1 ? 2 : speed === 2 ? 4 : 1; return speed; },
    // Debug/tests: any game speed, and run stats.
    setSpeed(n) { speed = n; },
    get stats() { return { t: Math.round(t), best: best + 1, roundBest: roundBest + 1, finals, overflows }; },
  };
})();
