// Screen 2: the merge flask (Matter.js rigid-body physics).
window.Game = (() => {
  const C = window.CONFIG;
  const { Engine, Bodies, Body, Composite, Events } = Matter;
  const WW = 1000, WH = 1600;                 // fixed world size, scaled to the screen
  const MAX = C.tiers.length - 1;              // index of top tier

  let cv, ctx, scale = 1, ox = 0, oy = 0;
  let engine, running = false, auto = true, speed = 1, dropT = 0, flashT = 0, last = 0, t = 0;
  let rings = [], best = 0;
  const imgs = [];

  // ---------- assets ----------
  function loadImages() {
    C.tiers.forEach((tier, i) => {
      const im = new Image();
      im.onload = () => (imgs[i] = im);
      im.onerror = () => (imgs[i] = null);      // placeholder will be drawn
      im.src = tier.image;
    });
  }

  // ---------- world ----------
  function buildFlask() {
    const f = C.flask, th = 40, wall = { isStatic: true, friction: 0.02, restitution: 0.1, label: "wall" };
    const parts = [];
    const gap = Math.asin(f.neckHalfWidth / f.radius);
    const N = 90;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      // skip the opening at the top where the neck joins
      const d = Math.atan2(Math.sin(a + Math.PI / 2), Math.cos(a + Math.PI / 2));
      if (Math.abs(d) < gap) continue;
      const r = f.radius + th / 2, len = 2 * f.radius * Math.sin(Math.PI / N) * 1.25;
      parts.push(Bodies.rectangle(f.cx + Math.cos(a) * r, f.cy + Math.sin(a) * r, th, len, { ...wall, angle: a }));
    }
    const joinY = f.cy - Math.sqrt(f.radius ** 2 - f.neckHalfWidth ** 2);
    const neckH = joinY - f.top + th;
    for (const s of [-1, 1])
      parts.push(Bodies.rectangle(f.cx + s * (f.neckHalfWidth + th / 2), f.top + neckH / 2 - th / 2, th, neckH, wall));
    Composite.add(engine.world, parts);
  }

  function makePiece(x, y, tier) {
    const tc = C.tiers[tier];
    const b = Bodies.circle(x, y, tc.radius, {
      restitution: C.physics.restitution, friction: C.physics.friction, frictionAir: 0.004,
      density: 0.001, label: "piece",
    });
    b.tier = tier; b.born = t; b.pop = 0;
    Composite.add(engine.world, b);
    if (tier > best) best = tier;
    return b;
  }

  function spawn(xScreen) {
    const w = C.spawn.weights, total = w.reduce((a, b) => a + b, 0);
    let r = Math.random() * total, tier = 0;
    while (r > w[tier]) { r -= w[tier]; tier++; }
    const f = C.flask, rad = C.tiers[tier].radius, lim = f.neckHalfWidth - rad - 2;
    let x = xScreen === undefined ? f.cx + (Math.random() - 0.5) * lim : (xScreen - ox) / scale;
    x = Math.max(f.cx - lim, Math.min(f.cx + lim, x));
    const b = makePiece(x, f.top - rad, tier);
    Body.setAngularVelocity(b, (Math.random() - 0.5) * 0.1);
  }

  // ---------- merging ----------
  const pending = [];
  function onCollide(e) {
    for (const p of e.pairs) {
      const a = p.bodyA, b = p.bodyB;
      if (a.label !== "piece" || b.label !== "piece" || a.tier !== b.tier) continue;
      if (a.merged || b.merged) continue;
      a.merged = b.merged = true;
      pending.push([a, b]);
    }
  }

  function resolveMerges() {
    while (pending.length) {
      const [a, b] = pending.shift();
      Composite.remove(engine.world, [a, b]);
      const x = (a.position.x + b.position.x) / 2, y = (a.position.y + b.position.y) / 2;
      if (a.tier === MAX) { finalForm(x, y); continue; }
      const n = makePiece(x, y, a.tier + 1);
      Body.setVelocity(n, { x: (a.velocity.x + b.velocity.x) / 2, y: (a.velocity.y + b.velocity.y) / 2 - 1 });
      Body.setAngle(n, (a.angle + b.angle) / 2);
      n.pop = 1;
      rings.push({ x, y, r: C.tiers[a.tier + 1].radius, life: 0, dur: 0.6 });
      Sound.play("t" + (a.tier + 2));            // tiers are 1-indexed for sounds
    }
  }

  function finalForm(x, y) {
    flashT = 3;
    Sound.play("final");
    for (let k = 0; k < 5; k++) rings.push({ x, y, r: 160, life: -k * 0.15, dur: 1.4, big: true });
    const banner = document.getElementById("banner");
    banner.classList.add("show");
    setTimeout(() => banner.classList.remove("show"), 2400);
    setTimeout(clear, 2200);
  }

  function clear() {
    Composite.allBodies(engine.world).filter(b => b.label === "piece").forEach(b => Composite.remove(engine.world, b));
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
    ctx.arc(f.cx, f.cy, f.radius, -Math.PI / 2 - gap, -Math.PI / 2 + gap, true);
    ctx.lineTo(f.cx + f.neckHalfWidth, f.top - 60);
    ctx.strokeStyle = "rgba(200,210,255,.35)"; ctx.lineWidth = 5; ctx.stroke();
    if (ctx.createConicGradient) {
      const g = ctx.createConicGradient(t * 0.6, f.cx, f.cy);
      ["#ff4d6d", "#ffb347", "#fff275", "#5cff9d", "#4dd2ff", "#a77bff", "#ff4d6d"]
        .forEach((c, i, a) => g.addColorStop(i / (a.length - 1), c));
      ctx.save();
      ctx.beginPath(); ctx.arc(f.cx, f.cy, f.radius, Math.PI * 0.06, Math.PI * 0.94);
      ctx.strokeStyle = g; ctx.lineWidth = 7; ctx.shadowColor = "#8cf"; ctx.shadowBlur = 30; ctx.stroke();
      ctx.restore();
    }
  }

  function drawPiece(b) {
    const tc = C.tiers[b.tier], im = imgs[b.tier];
    const pop = 1 + 0.25 * b.pop;                 // little squash on spawn-from-merge
    const s = tc.radius * tc.scale * pop;
    ctx.save();
    ctx.translate(b.position.x, b.position.y);
    ctx.rotate(b.angle);
    if (b.tier === MAX) { ctx.shadowColor = "#fd5"; ctx.shadowBlur = 40 + 15 * Math.sin(t * 4); }
    if (im) {
      const k = Math.min(2 * s / im.width, 2 * s / im.height);
      ctx.drawImage(im, -im.width * k / 2, -im.height * k / 2, im.width * k, im.height * k);
    } else {
      ctx.fillStyle = `hsl(${30 + b.tier * 40},75%,55%)`;
      ctx.beginPath(); ctx.arc(0, 0, tc.radius * pop, 0, 7); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#000a"; ctx.font = `bold ${tc.radius}px system-ui`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(b.tier + 1, 0, 2);
    }
    ctx.restore();
  }

  function drawRings(dt) {
    for (const r of rings) {
      r.life += dt; if (r.life < 0) continue;
      const p = r.life / r.dur; if (p > 1) continue;
      ctx.strokeStyle = `rgba(255,${r.big ? 210 : 240},${r.big ? 120 : 255},${(1 - p) * 0.7})`;
      ctx.lineWidth = r.big ? 14 : 6;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r * (1 + p * (r.big ? 6 : 1.6)), 0, 7); ctx.stroke();
    }
    rings = rings.filter(r => r.life < r.dur);
  }

  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.033, (now - last) / 1000 || 0.016); last = now;
    for (let i = 0; i < speed; i++) {
      t += dt;
      if (auto && flashT <= 0) { dropT -= dt; if (dropT <= 0) { spawn(); dropT = C.spawn.autoDropEvery; } }
      if (flashT > 0) flashT -= dt;
      Engine.update(engine, dt * 1000);
      resolveMerges();
    }
    const pieces = Composite.allBodies(engine.world).filter(b => b.label === "piece");
    for (const b of pieces) {
      b.pop = Math.max(0, b.pop - dt * 4 * speed);
      if (b.position.y > WH + 300) Composite.remove(engine.world, b);
    }

    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, innerWidth, innerHeight);
    ctx.save(); ctx.translate(ox, oy); ctx.scale(scale, scale);
    if (flashT > 0) {
      const f = C.flask, g = ctx.createRadialGradient(f.cx, f.cy, 0, f.cx, f.cy, f.radius * 1.7);
      g.addColorStop(0, `rgba(255,200,80,${Math.min(1, flashT / 1.5) * 0.3})`); g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, WW, WH);
    }
    drawFlask();
    pieces.sort((a, b) => a.tier - b.tier).forEach(drawPiece);
    drawRings(dt * speed);
    ctx.restore();
    document.getElementById("best").textContent = `${best + 1}/${C.tiers.length}`;
    requestAnimationFrame(frame);
  }

  // ---------- public ----------
  function init() {
    cv = document.getElementById("game"); ctx = cv.getContext("2d");
    engine = Engine.create({ positionIterations: 10, velocityIterations: 8 });
    engine.gravity.y = C.physics.gravity;
    buildFlask();
    Events.on(engine, "collisionStart", onCollide);
    Events.on(engine, "collisionActive", onCollide);   // catches pieces already resting together
    loadImages();
    addEventListener("resize", resize);
    cv.addEventListener("pointerdown", e => { Sound.ac(); if (flashT <= 0) spawn(e.clientX); });
  }
  function start() { resize(); running = true; last = performance.now(); requestAnimationFrame(frame); }
  function stop() { running = false; }
  return {
    init, start, stop,
    reset() { clear(); best = 0; rings = []; },
    toggleAuto() { auto = !auto; return auto; },
    cycleSpeed() { speed = speed === 1 ? 2 : speed === 2 ? 4 : 1; return speed; },
  };
})();
