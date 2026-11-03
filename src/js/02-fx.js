/* ============================================================
   Ambient effects: one fixed canvas over the menu whose weather
   changes with the chapter — embers over the grill, steam over
   the stews, saffron threads, flour over the oven, bubbles at the
   bar, petals for dessert. Crossfades when the chapter changes.
   ============================================================ */
(() => {
  const TAU = Math.PI * 2;
  const cv = document.createElement('canvas'); cv.className = 'fx-layer'; cv.setAttribute('aria-hidden', 'true');
  const ctx = cv.getContext('2d');
  let W = 0, H = 0, dpr = Math.min(2, devicePixelRatio || 1), type = 'none', next = null, mix = 1, parts = [], alive = false, last = 0, vy = 0;
  const size = () => { W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; };
  const rnd = (a, b) => a + Math.random() * (b - a);

  // a refined palette of weathers: fine embers, slow smoke, a few saffron threads,
  // champagne bubbles and out-of-focus gold dust, all lit as if by one warm lamp
  const glowDot = (x, y, r, rgb, a) => { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(0.45, `rgba(${rgb},${a * 0.35})`); g.addColorStop(1, `rgba(${rgb},0)`); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); };
  const KINDS = {
    embers: { n: 16, make: () => ({ x: rnd(0, 1), y: rnd(0.5, 1.2), r: rnd(0.6, 1.4), vy: rnd(0.03, 0.07), sw: rnd(0.4, 1.2), ph: rnd(0, TAU) }),
      step(p, dt, t) { p.y -= p.vy * dt; p.x += Math.sin(t * p.sw + p.ph) * 0.0004; return p.y > -0.05; },
      draw(p, t) { const fl = 0.6 + 0.4 * Math.sin(t * 5 + p.ph * 3), fade = Math.min(1, p.y * 2.2); glowDot(p.x * W, p.y * H, p.r * 5, '255,196,120', 0.55 * fl * fade); ctx.fillStyle = `rgba(255,236,200,${0.9 * fl * fade})`; ctx.beginPath(); ctx.arc(p.x * W, p.y * H, p.r * 0.6, 0, TAU); ctx.fill(); } },
    steam: { n: 6, make: () => ({ x: rnd(0.15, 0.85), y: rnd(0.75, 1.3), r: rnd(70, 140), vy: rnd(0.012, 0.024), ph: rnd(0, TAU), a: rnd(0.018, 0.035) }),
      step(p, dt) { p.y -= p.vy * dt; p.r += dt * 6; return p.y > -0.25; },
      draw(p, t) { const x = (p.x + Math.sin(t * 0.25 + p.ph) * 0.05) * W, y = p.y * H; const fade = Math.min(1, (p.y + 0.25) * 1.6); glowDot(x, y, p.r, '255,246,232', p.a * fade); } },
    saffron: { n: 7, make: () => ({ x: rnd(0, 1), y: rnd(-0.2, 1), vy: rnd(0.01, 0.022), a: rnd(0, TAU), va: rnd(-0.6, 0.6), s: rnd(0.7, 1.1) }),
      step(p, dt, t) { p.y += p.vy * dt; p.a += p.va * dt; p.x += Math.sin(t * 0.5 + p.a) * 0.0003; return p.y < 1.08; },
      draw(p) { ctx.save(); ctx.translate(p.x * W, p.y * H); ctx.rotate(p.a); const g = ctx.createLinearGradient(-9 * p.s, 0, 9 * p.s, 0); g.addColorStop(0, 'rgba(150,30,14,0.0)'); g.addColorStop(0.35, 'rgba(176,40,16,0.75)'); g.addColorStop(1, 'rgba(236,150,60,0.85)'); ctx.strokeStyle = g; ctx.lineWidth = 1.1 * p.s; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-9 * p.s, 0); ctx.bezierCurveTo(-3 * p.s, -3 * p.s, 3 * p.s, 2 * p.s, 9 * p.s, -1 * p.s); ctx.stroke(); ctx.restore(); } },
    gold: { n: 26, make: () => ({ x: rnd(0, 1), y: rnd(0, 1), r: Math.random() < 0.18 ? rnd(8, 18) : rnd(0.5, 1.4), vx: rnd(-0.004, 0.004), vy: rnd(-0.008, -0.002), ph: rnd(0, TAU) }),
      step(p, dt) { p.x += p.vx * dt; p.y += p.vy * dt; if (p.x < -0.05) p.x = 1.05; if (p.x > 1.05) p.x = -0.05; if (p.y < -0.05) p.y = 1.05; return true; },
      draw(p, t) { const tw = 0.5 + 0.5 * Math.sin(t * 0.9 + p.ph); if (p.r > 4) glowDot(p.x * W, p.y * H, p.r, '236,214,166', 0.05 + 0.04 * tw); else { glowDot(p.x * W, p.y * H, p.r * 4, '240,222,180', 0.35 * tw); } } },
    flour: { n: 34, make: () => ({ x: rnd(0, 1), y: rnd(-1, 1), r: rnd(0.3, 1.1), vy: rnd(0.006, 0.016), ph: rnd(0, TAU) }),
      step(p, dt, t) { p.y += p.vy * dt; p.x += Math.sin(t * 0.4 + p.ph) * 0.0002; return p.y < 1.05; },
      draw(p, t) { ctx.fillStyle = `rgba(255,250,240,${0.12 + 0.18 * (0.5 + 0.5 * Math.sin(t + p.ph))})`; ctx.beginPath(); ctx.arc(p.x * W, p.y * H, p.r, 0, TAU); ctx.fill(); } },
    bubbles: { n: 30, make: () => ({ x: Math.round(rnd(1, 9)) / 10 + rnd(-0.015, 0.015), y: rnd(0.7, 1.3), r: rnd(0.6, 1.8), vy: rnd(0.05, 0.11), ph: rnd(0, TAU) }),
      step(p, dt, t) { p.y -= p.vy * dt; p.x += Math.sin(t * 3 + p.ph) * 0.00012; return p.y > -0.05; },
      draw(p) { const x = p.x * W, y = p.y * H; ctx.strokeStyle = 'rgba(240,236,220,0.35)'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.arc(x, y, p.r, 0, TAU); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.arc(x - p.r * 0.35, y - p.r * 0.35, p.r * 0.3, 0, TAU); ctx.fill(); } },
  };
  KINDS.sparks = KINDS.embers; KINDS.dust = KINDS.gold; KINDS.petals = KINDS.gold; KINDS.leaves = KINDS.gold;
  function seed(k) { const K = KINDS[k]; return K ? Array.from({ length: K.n }, () => { const p = K.make(); p.k = k; return p; }) : []; }
  function frame(t) {
    if (!alive) return;
    const dt = Math.min(0.05, (t - last) / 1000 || 0.016); last = t; const ts = t / 1000;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    if (next !== null) { mix -= dt * 1.6; if (mix <= 0) { type = next; next = null; parts = seed(type); mix = 0; } }
    else if (mix < 1) mix = Math.min(1, mix + dt * 1.2);
    ctx.globalAlpha = Math.max(0, mix);
    const K = KINDS[type];
    if (K) for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      p.y += vy * 0.00008; // a touch of scroll parallax
      if (!K.step(p, dt, ts)) { const n = K.make(); n.k = type; if (K === KINDS.embers || K === KINDS.sparks || K === KINDS.bubbles || K === KINDS.steam) n.y = rnd(1.02, 1.25); else n.y = rnd(-0.15, -0.02); parts[i] = n; continue; }
      K.draw(p, ts);
    }
    ctx.globalAlpha = 1; vy *= 0.9;
    requestAnimationFrame(frame);
  }
  Z.fx = {
    mount(parent) { parent.prepend(cv); size(); addEventListener('resize', size); },
    set(k) { if (Z.reduce) k = 'none'; if (k === type && next === null) return; next = k; },
    run(on) { if (on === alive) return; alive = on; if (on) { size(); last = performance.now(); requestAnimationFrame(frame); } else ctx.clearRect(0, 0, cv.width, cv.height); },
    nudge(v) { vy = v; },
  };

  /* a one-off dust burst when a plate lands (reference 2's flour/spice clouds) */
  Z.burst = (canvas, color = '#e8d8b8', n = 34) => {
    if (Z.reduce || !canvas) return;
    const c = canvas.getContext('2d'); const w = (canvas.width = canvas.clientWidth * dpr), h = (canvas.height = canvas.clientHeight * dpr);
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
    const ps = Array.from({ length: n }, () => { const a = rnd(0, TAU), sp = rnd(0.12, 0.5); return { x: 0.5 + Math.cos(a) * 0.28, y: 0.5 + Math.sin(a) * 0.28, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 0.05, r: rnd(1, 5) * dpr, a: rnd(0.3, 0.8) }; });
    const puffs = Array.from({ length: 7 }, () => { const a = rnd(0, TAU); return { x: 0.5 + Math.cos(a) * 0.3, y: 0.5 + Math.sin(a) * 0.3, vx: Math.cos(a) * 0.08, vy: Math.sin(a) * 0.08, r: rnd(0.08, 0.14) }; });
    canvas.style.opacity = 1; let t0 = performance.now(), lt = t0;
    (function f(t) {
      const e = (t - t0) / 1000, dt = Math.min(0.05, (t - lt) / 1000); lt = t;
      c.clearRect(0, 0, w, h);
      const fade = Math.max(0, 1 - e / 1.5);
      for (const p of puffs) { p.x += p.vx * dt; p.y += p.vy * dt; p.r += dt * 0.05; const gg = c.createRadialGradient(p.x * w, p.y * h, 0, p.x * w, p.y * h, p.r * w); gg.addColorStop(0, `rgba(${r},${g},${b},${0.22 * fade})`); gg.addColorStop(1, `rgba(${r},${g},${b},0)`); c.fillStyle = gg; c.beginPath(); c.arc(p.x * w, p.y * h, p.r * w, 0, TAU); c.fill(); }
      for (const p of ps) { p.vx *= 0.96; p.vy = p.vy * 0.96 + 0.25 * dt; p.x += p.vx * dt; p.y += p.vy * dt; c.fillStyle = `rgba(${r},${g},${b},${p.a * fade})`; c.beginPath(); c.arc(p.x * w, p.y * h, p.r, 0, TAU); c.fill(); }
      if (e < 1.5) requestAnimationFrame(f); else c.clearRect(0, 0, w, h);
    })(t0);
  };
})();

/* ============================================================
   Landing light — an SVG flourish when a plate settles:
   a hairline ring of light, fine gold sparks, drifting gold dust
   and (for the fire chapters) a few saffron threads. No cartoon
   puffs; everything is thin, warm and short-lived.
   ============================================================ */
(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const el = (n, a, p) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); p && p.append(e); return e; };
  const R = (a, b) => a + Math.random() * (b - a);
  let uid = 0;
  Z.landLight = (host, opts = {}) => {
    if (Z.reduce || !host || !window.gsap) return;
    const tone = opts.tone || '#e6c98a', saffron = !!opts.saffron, id = 'll' + ++uid;
    const svg = el('svg', { viewBox: '-80 -80 160 160', class: 'land-light', 'aria-hidden': 'true' });
    const defs = el('defs', {}, svg);
    const rg = el('radialGradient', { id: id + 'g' }, defs);
    el('stop', { offset: '0', 'stop-color': '#fff6dc', 'stop-opacity': '1' }, rg); el('stop', { offset: '.45', 'stop-color': tone, 'stop-opacity': '.9' }, rg); el('stop', { offset: '1', 'stop-color': tone, 'stop-opacity': '0' }, rg);
    const glow = el('radialGradient', { id: id + 'w' }, defs);
    el('stop', { offset: '0', 'stop-color': tone, 'stop-opacity': '.32' }, glow); el('stop', { offset: '1', 'stop-color': tone, 'stop-opacity': '0' }, glow);
    const lg = el('linearGradient', { id: id + 'l', x1: '0', x2: '1' }, defs);
    el('stop', { offset: '0', 'stop-color': tone, 'stop-opacity': '0' }, lg); el('stop', { offset: '1', 'stop-color': '#fff3d6', 'stop-opacity': '1' }, lg);
    const flash = el('circle', { r: 58, fill: `url(#${id}w)` }, svg);
    const ring = el('circle', { r: 50, fill: 'none', stroke: tone, 'stroke-width': '.5', opacity: '.9' }, svg);
    const ring2 = el('circle', { r: 50, fill: 'none', stroke: '#fff3d6', 'stroke-width': '.25', opacity: '.6' }, svg);
    host.append(svg);
    const tl = gsap.timeline({ onComplete: () => svg.remove() });
    tl.fromTo(flash, { scale: 0.7, opacity: 0, transformOrigin: '50% 50%' }, { scale: 1.15, opacity: 1, duration: 0.35, ease: 'power2.out' }).to(flash, { opacity: 0, duration: 1.1, ease: 'power2.in' }, 0.35)
      .fromTo(ring, { attr: { r: 47 }, opacity: 0.95 }, { attr: { r: 74 }, opacity: 0, duration: 1.3, ease: 'expo.out' }, 0.02)
      .fromTo(ring2, { attr: { r: 49 }, opacity: 0.7 }, { attr: { r: 64 }, opacity: 0, duration: 1.0, ease: 'expo.out' }, 0.12);
    // fine sparks: tapered hairlines that shoot out from the rim and burn off
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * 360 + R(-8, 8), len = R(5, 11);
      const g = el('g', { transform: `rotate(${a})` }, svg);
      const ln = el('line', { x1: 50, y1: 0, x2: 50 + len, y2: 0, stroke: `url(#${id}l)`, 'stroke-width': R(0.35, 0.8), 'stroke-linecap': 'round' }, g);
      const d = R(10, 22);
      tl.fromTo(ln, { attr: { x1: 48, x2: 48 + len }, opacity: 1 }, { attr: { x1: 50 + d, x2: 50 + d + len * 0.3 }, opacity: 0, duration: R(0.6, 1.0), ease: 'power3.out' }, R(0.02, 0.12));
    }
    // gold dust: tiny glowing specks that drift, twinkle and settle
    for (let i = 0; i < 26; i++) {
      const a = R(0, Math.PI * 2), r0 = R(44, 54), r1 = r0 + R(8, 26), s = R(0.5, 1.6);
      const c = el('circle', { cx: Math.cos(a) * r0, cy: Math.sin(a) * r0, r: s, fill: `url(#${id}g)` }, svg);
      tl.fromTo(c, { opacity: 0 }, { opacity: 1, duration: 0.15 }, R(0.05, 0.25))
        .to(c, { attr: { cx: Math.cos(a) * r1, cy: Math.sin(a) * r1 + R(4, 12) }, duration: R(1.2, 1.9), ease: 'power2.out' }, '<')
        .to(c, { opacity: 0, duration: R(0.5, 0.9), ease: 'power1.in' }, '>-0.6');
    }
    // saffron threads for the fire & rice chapters
    if (saffron) for (let i = 0; i < 7; i++) {
      const a = R(0, 360), p = el('path', { d: 'M-4 0 C-1.5 -1.2 1.5 1 4 -0.4', fill: 'none', stroke: i % 2 ? '#c0391b' : '#d9661f', 'stroke-width': '.7', 'stroke-linecap': 'round' }, svg);
      const r0 = 48, r1 = R(60, 72), rad = (a * Math.PI) / 180;
      gsap.set(p, { x: Math.cos(rad) * r0, y: Math.sin(rad) * r0, rotation: R(0, 360), opacity: 0 });
      tl.to(p, { opacity: 0.95, duration: 0.2 }, R(0.08, 0.2)).to(p, { x: Math.cos(rad) * r1, y: Math.sin(rad) * r1 + R(6, 16), rotation: `+=${R(-160, 160)}`, duration: R(1.4, 2), ease: 'power2.out' }, '<').to(p, { opacity: 0, duration: 0.6 }, '>-0.6');
    }
  };
})();
