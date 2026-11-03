
/* ============================================================
   Plate painter — core
   Everything is drawn in a 1000 × 1000 design space, scaled to
   the canvas. All randomness is seeded, so a dish always looks
   the same on every visit.
   ============================================================ */
const Painter = (() => {
  let S = 1; // device pixels per design unit (for shadows, which ignore transforms)

  /* ---------- seeded random ---------- */
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rng(seed) {
    let s = (seed >>> 0) || 1;
    const r = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    r.range = (a, b) => a + (b - a) * r();
    r.pick = (arr) => arr[Math.floor(r() * arr.length)];
    r.sign = () => (r() < 0.5 ? -1 : 1);
    // point inside a disc, uniform
    r.disc = (cx, cy, rad) => { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * rad; return [cx + Math.cos(a) * d, cy + Math.sin(a) * d]; };
    return r;
  }

  /* ---------- colour ---------- */
  function hexToRgb(hex) {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgba(hex, a = 1) { const [r, g, b] = hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; }
  function shade(hex, amt) { // amt -1..1, darken/lighten
    const [r, g, b] = hexToRgb(hex);
    const f = (c) => Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt);
    return `rgb(${f(r)},${f(g)},${f(b)})`;
  }
  function mix(a, b, t) {
    const A = hexToRgb(a), B = hexToRgb(b);
    return `rgb(${Math.round(A[0] + (B[0] - A[0]) * t)},${Math.round(A[1] + (B[1] - A[1]) * t)},${Math.round(A[2] + (B[2] - A[2]) * t)})`;
  }

  /* ---------- shapes ---------- */
  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(r, 0.01), 0, Math.PI * 2); }
  function ellipse(ctx, x, y, rx, ry, rot = 0) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(rx, .01), Math.max(ry, .01), rot, 0, Math.PI * 2); }
  // irregular organic circle
  function blob(ctx, x, y, r, R, amp = 0.08, lobes = 5) {
    const ph = [R() * 6.28, R() * 6.28, R() * 6.28], k = [lobes, lobes + 2, lobes + 5];
    const am = [amp, amp * 0.5, amp * 0.25].map(a => a * R.range(0.6, 1.2));
    ctx.beginPath();
    for (let i = 0; i <= 72; i++) {
      const t = (i / 72) * Math.PI * 2;
      let rr = r;
      for (let j = 0; j < 3; j++) rr += r * am[j] * Math.sin(k[j] * t + ph[j]);
      const px = x + Math.cos(t) * rr, py = y + Math.sin(t) * rr;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath();
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function leafPath(ctx, x, y, len, wid, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.beginPath(); ctx.moveTo(-len / 2, 0);
    ctx.quadraticCurveTo(0, -wid, len / 2, 0); ctx.quadraticCurveTo(0, wid, -len / 2, 0);
    ctx.restore();
  }

  /* ---------- light ---------- */
  function shadow(ctx, blur, dy = 0, a = 0.5, dx = 0) {
    ctx.shadowColor = `rgba(0,0,0,${a})`; ctx.shadowBlur = blur * S; ctx.shadowOffsetX = dx * S; ctx.shadowOffsetY = dy * S;
  }
  function noShadow(ctx) { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0; }
  // radial "lit from top-left" fill
  function litFill(ctx, x, y, r, light, base, dark) {
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.05, x, y, r * 1.05);
    g.addColorStop(0, light); g.addColorStop(0.55, base); g.addColorStop(1, dark);
    return g;
  }
  function gloss(ctx, x, y, rx, ry, a = 0.35, rot = -0.6) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry));
    g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ellipse(ctx, x, y, rx, ry, rot); ctx.fill();
  }
  // fine speckle texture inside the current clip
  function speckle(ctx, R, cx, cy, rad, n, colors, rMin, rMax, aMin = 0.1, aMax = 0.5) {
    for (let i = 0; i < n; i++) {
      const [x, y] = R.disc(cx, cy, rad);
      ctx.fillStyle = rgba(R.pick(colors), R.range(aMin, aMax));
      circle(ctx, x, y, R.range(rMin, rMax)); ctx.fill();
    }
  }
  function scatter(R, cx, cy, rad, n, minDist) { // rough poisson scatter
    const pts = []; let tries = 0;
    while (pts.length < n && tries < n * 40) {
      tries++;
      const p = R.disc(cx, cy, rad);
      if (pts.every(q => (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2 > minDist * minDist)) pts.push(p);
    }
    return pts;
  }

  /* ============================================================
     Vessels
     ============================================================ */
  const GOLD = ['#f3d79a', '#c99a45', '#8a6326'];

  function goldRing(ctx, x, y, r, w = 2.4) {
    const g = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
    g.addColorStop(0, GOLD[0]); g.addColorStop(0.45, GOLD[1]); g.addColorStop(0.7, GOLD[2]); g.addColorStop(1, GOLD[1]);
    ctx.strokeStyle = g; ctx.lineWidth = w; circle(ctx, x, y, r); ctx.stroke();
  }

  // the signature black stoneware plate
  function plate(ctx, R, o = {}) {
    const x = 500, y = 500, r = o.r || 470, well = r * 0.80;
    ctx.save(); shadow(ctx, 70, 34, 0.8); ctx.fillStyle = '#121214'; circle(ctx, x, y, r); ctx.fill(); ctx.restore();
    ctx.save(); circle(ctx, x, y, r); ctx.clip();
    ctx.fillStyle = litFill(ctx, x, y, r, '#2e2e33', '#19191c', '#0b0b0d'); ctx.fillRect(0, 0, 1000, 1000);
    speckle(ctx, R, x, y, r, 2600, ['#ffffff'], 0.6, 2.0, 0.02, 0.10);
    speckle(ctx, R, x, y, r, 1400, ['#000000'], 0.8, 2.6, 0.15, 0.4);
    // well: slightly darker, inner shadow at top-left
    const wg = ctx.createRadialGradient(x + well * 0.15, y + well * 0.2, well * 0.2, x, y, well);
    wg.addColorStop(0, 'rgba(255,255,255,0.025)'); wg.addColorStop(0.85, 'rgba(0,0,0,0.12)'); wg.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = wg; circle(ctx, x, y, well); ctx.fill();
    // rim light
    const lg = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
    lg.addColorStop(0, 'rgba(255,255,255,0.20)'); lg.addColorStop(0.35, 'rgba(255,255,255,0.03)');
    lg.addColorStop(0.7, 'rgba(255,255,255,0)'); lg.addColorStop(1, 'rgba(255,255,255,0.07)');
    ctx.strokeStyle = lg; ctx.lineWidth = (r - well) * 0.9; circle(ctx, x, y, (r + well) / 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 3; circle(ctx, x, y, well); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 2; circle(ctx, x, y, well + 4); ctx.stroke();
    ctx.restore();
    goldRing(ctx, x, y, r - 14, 2.6);
    return { x, y, well };
  }

  // deep bowl (stews, soups, yogurts)
  function bowl(ctx, R, o = {}) {
    const x = o.x || 500, y = o.y || 500, r = o.r || 430, inner = r * 0.84;
    ctx.save(); shadow(ctx, 60, 30, 0.8); ctx.fillStyle = '#121214'; circle(ctx, x, y, r); ctx.fill(); ctx.restore();
    ctx.save(); circle(ctx, x, y, r); ctx.clip();
    ctx.fillStyle = litFill(ctx, x, y, r, '#34343a', '#1a1a1e', '#0a0a0c'); ctx.fillRect(0, 0, 1000, 1000);
    speckle(ctx, R, x, y, r, 1800, ['#ffffff'], 0.6, 1.8, 0.02, 0.09);
    ctx.restore();
    goldRing(ctx, x, y, r - 9, 2.2);
    // inner wall
    ctx.save(); circle(ctx, x, y, inner); ctx.clip();
    const ig = ctx.createRadialGradient(x + inner * 0.25, y + inner * 0.3, inner * 0.3, x, y, inner);
    ig.addColorStop(0, '#1d1d21'); ig.addColorStop(1, '#060607');
    ctx.fillStyle = ig; ctx.fillRect(0, 0, 1000, 1000);
    ctx.restore();
    return { x, y, inner, food: inner * 0.93 };
  }
  // the food surface inside a bowl gets an inner shadow from the wall
  function bowlInnerShade(ctx, b) {
    ctx.save(); circle(ctx, b.x, b.y, b.food); ctx.clip();
    const g = ctx.createRadialGradient(b.x + b.food * 0.18, b.y + b.food * 0.22, b.food * 0.55, b.x, b.y, b.food * 1.02);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1000, 1000);
    ctx.restore();
  }

  // charred round wooden board (pizza)
  function board(ctx, R, o = {}) {
    const x = 500, y = 500, r = o.r || 485;
    ctx.save(); shadow(ctx, 60, 30, 0.8); ctx.fillStyle = '#2a1a10'; circle(ctx, x, y, r); ctx.fill(); ctx.restore();
    ctx.save(); circle(ctx, x, y, r); ctx.clip();
    ctx.fillStyle = litFill(ctx, x, y, r, '#5a3a24', '#3a2416', '#1a0f08'); ctx.fillRect(0, 0, 1000, 1000);
    // grain
    for (let i = 0; i < 140; i++) {
      const yy = R.range(0, 1000), amp = R.range(4, 14);
      ctx.strokeStyle = rgba(R() < 0.5 ? '#0d0704' : '#7a5236', R.range(0.06, 0.22));
      ctx.lineWidth = R.range(1, 4);
      ctx.beginPath();
      for (let xx = 0; xx <= 1000; xx += 40) { const yv = yy + Math.sin(xx / R.range(90, 160) + i) * amp; xx ? ctx.lineTo(xx, yv) : ctx.moveTo(xx, yv); }
      ctx.stroke();
    }
    // charred edge
    const cg = ctx.createRadialGradient(x, y, r * 0.8, x, y, r);
    cg.addColorStop(0, 'rgba(0,0,0,0)'); cg.addColorStop(1, 'rgba(0,0,0,0.7)');
    ctx.fillStyle = cg; ctx.fillRect(0, 0, 1000, 1000);
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,220,180,0.10)'; ctx.lineWidth = 3; circle(ctx, x, y, r - 4); ctx.stroke();
    return { x, y };
  }

  // dark slate, slightly rotated (burgers & sandwiches)
  function slate(ctx, R, o = {}) {
    ctx.save(); ctx.translate(500, 500); ctx.rotate(o.rot ?? -0.12);
    const w = o.w || 880, h = o.h || 720;
    ctx.save(); shadow(ctx, 60, 30, 0.85); ctx.fillStyle = '#1b1c1f'; roundRect(ctx, -w / 2, -h / 2, w, h, 26); ctx.fill(); ctx.restore();
    roundRect(ctx, -w / 2, -h / 2, w, h, 26); ctx.save(); ctx.clip();
    const g = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
    g.addColorStop(0, '#34363b'); g.addColorStop(0.5, '#222327'); g.addColorStop(1, '#141518');
    ctx.fillStyle = g; ctx.fillRect(-w / 2, -h / 2, w, h);
    for (let i = 0; i < 70; i++) {
      ctx.strokeStyle = rgba(R() < 0.5 ? '#000000' : '#ffffff', R.range(0.02, 0.07));
      ctx.lineWidth = R.range(1, 6);
      const yy = R.range(-h / 2, h / 2);
      ctx.beginPath(); ctx.moveTo(-w / 2, yy); ctx.bezierCurveTo(-w / 6, yy + R.range(-20, 20), w / 6, yy + R.range(-20, 20), w / 2, yy + R.range(-15, 15)); ctx.stroke();
    }
    speckle(ctx, R, 0, 0, w / 2, 900, ['#ffffff'], 0.6, 1.6, 0.02, 0.07);
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 2; roundRect(ctx, -w / 2 + 3, -h / 2 + 3, w - 6, h - 6, 24); ctx.stroke();
    ctx.restore();
  }

  // saucer for hot drinks
  function saucer(ctx, R, o = {}) {
    const x = 500, y = 500, r = o.r || 420;
    ctx.save(); shadow(ctx, 50, 26, 0.75); ctx.fillStyle = '#141416'; circle(ctx, x, y, r); ctx.fill(); ctx.restore();
    ctx.save(); circle(ctx, x, y, r); ctx.clip();
    ctx.fillStyle = litFill(ctx, x, y, r, '#2f2f34', '#18181b', '#0a0a0b'); ctx.fillRect(0, 0, 1000, 1000);
    speckle(ctx, R, x, y, r, 1400, ['#ffffff'], 0.6, 1.6, 0.02, 0.08);
    ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 3; circle(ctx, x, y, r * 0.66); ctx.stroke();
    ctx.restore();
    goldRing(ctx, x, y, r - 12, 2.2);
  }

  // felt coaster for cold drinks
  function coaster(ctx, R) {
    ctx.save(); shadow(ctx, 40, 20, 0.7); ctx.fillStyle = '#1e1a17'; circle(ctx, 500, 500, 430); ctx.fill(); ctx.restore();
    ctx.save(); circle(ctx, 500, 500, 430); ctx.clip();
    ctx.fillStyle = litFill(ctx, 500, 500, 430, '#3a332d', '#24201c', '#110f0d'); ctx.fillRect(0, 0, 1000, 1000);
    speckle(ctx, R, 500, 500, 430, 3000, ['#000000', '#5a4f45'], 0.6, 1.4, 0.1, 0.3);
    ctx.restore();
    goldRing(ctx, 500, 500, 412, 1.6);
  }

  /* ============================================================
     Shared garnish
     ============================================================ */
  function leaf(ctx, R, x, y, len, rot, col = '#3f7a2a') {
    ctx.save(); shadow(ctx, 6, 3, 0.45);
    const g = ctx.createLinearGradient(x - len / 2, y, x + len / 2, y);
    g.addColorStop(0, shade(col, -0.25)); g.addColorStop(0.5, shade(col, 0.15)); g.addColorStop(1, shade(col, -0.3));
    ctx.fillStyle = g; leafPath(ctx, x, y, len, len * 0.42, rot); ctx.fill(); ctx.restore();
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(-len / 2, 0); ctx.quadraticCurveTo(0, -len * 0.04, len / 2, 0); ctx.stroke();
    ctx.restore();
  }
  function sprig(ctx, R, x, y, n, len, col) { // herb sprig: leaves around a stem
    const base = R() * 6.28;
    for (let i = 0; i < n; i++) {
      const a = base + i * (6.28 / n) + R.range(-0.3, 0.3);
      leaf(ctx, R, x + Math.cos(a) * len * 0.45, y + Math.sin(a) * len * 0.45, len * R.range(0.8, 1.1), a, col);
    }
  }
  function flecks(ctx, R, cx, cy, rad, n, cols, size = 4, a = 0.85) {
    for (let i = 0; i < n; i++) {
      const [x, y] = R.disc(cx, cy, rad);
      ctx.fillStyle = rgba(R.pick(cols), a);
      ctx.save(); ctx.translate(x, y); ctx.rotate(R() * 6.28);
      ctx.fillRect(-size * R.range(0.4, 1), -size * R.range(0.2, 0.5), size * R.range(0.8, 2), size * R.range(0.4, 1));
      ctx.restore();
    }
  }
  function tomatoGrilled(ctx, R, x, y, r) {
    ctx.save(); shadow(ctx, 18, 10, 0.6);
    ctx.fillStyle = litFill(ctx, x, y, r, '#ff7a5a', '#c8261a', '#5e0d08'); blob(ctx, x, y, r, R, 0.05, 4); ctx.fill(); ctx.restore();
    ctx.save(); blob(ctx, x, y, r, R, 0.05, 4); ctx.clip();
    for (let i = 0; i < 9; i++) { ctx.fillStyle = rgba('#1a0603', R.range(0.25, 0.6)); blob(ctx, ...R.disc(x, y, r), R.range(r * 0.08, r * 0.25), R, 0.3, 3); ctx.fill(); }
    for (let i = 0; i < 6; i++) { ctx.strokeStyle = 'rgba(255,220,200,0.35)'; ctx.lineWidth = 1.6; ctx.beginPath(); const a = R() * 6.28; ctx.arc(x, y, r * R.range(0.4, 0.85), a, a + R.range(0.3, 0.9)); ctx.stroke(); }
    ctx.restore();
    gloss(ctx, x - r * 0.35, y - r * 0.4, r * 0.35, r * 0.18, 0.5);
    ctx.fillStyle = '#3d6b23';
    for (let i = 0; i < 5; i++) { ctx.save(); ctx.translate(x + r * 0.1, y - r * 0.05); ctx.rotate(i * 1.256); leafPath(ctx, r * 0.13, 0, r * 0.26, r * 0.08, 0); ctx.fill(); ctx.restore(); }
  }
  function limeHalf(ctx, R, x, y, r, col = '#7fb83a') {
    ctx.save(); shadow(ctx, 14, 8, 0.5); ctx.fillStyle = shade(col, -0.2); circle(ctx, x, y, r); ctx.fill(); ctx.restore();
    ctx.fillStyle = '#f2f6dc'; circle(ctx, x, y, r * 0.9); ctx.fill();
    ctx.fillStyle = litFill(ctx, x, y, r * 0.84, shade(col, 0.55), shade(col, 0.25), shade(col, -0.05)); circle(ctx, x, y, r * 0.84); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,240,0.8)'; ctx.lineWidth = r * 0.05;
    for (let i = 0; i < 9; i++) { const a = i / 9 * 6.28; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * r * 0.84, y + Math.sin(a) * r * 0.84); ctx.stroke(); }
    ctx.fillStyle = '#f7f9e6'; circle(ctx, x, y, r * 0.1); ctx.fill();
    gloss(ctx, x - r * 0.3, y - r * 0.35, r * 0.4, r * 0.2, 0.4);
  }
  function ramekin(ctx, R, x, y, r, sauce, opt = {}) {
    ctx.save(); shadow(ctx, 20, 12, 0.7); ctx.fillStyle = '#16161a'; circle(ctx, x, y, r); ctx.fill(); ctx.restore();
    ctx.fillStyle = litFill(ctx, x, y, r, '#3a3a40', '#1c1c20', '#0b0b0d'); circle(ctx, x, y, r); ctx.fill();
    goldRing(ctx, x, y, r - 4, 1.4);
    ctx.fillStyle = litFill(ctx, x, y, r * 0.78, shade(sauce, 0.25), sauce, shade(sauce, -0.45)); circle(ctx, x, y, r * 0.78); ctx.fill();
    if (opt.swirl) { ctx.strokeStyle = rgba(opt.swirl, 0.8); ctx.lineWidth = 3; ctx.beginPath(); for (let t = 0; t < 12; t += 0.2) ctx.lineTo(x + Math.cos(t) * t * r * 0.055, y + Math.sin(t) * t * r * 0.055); ctx.stroke(); }
    gloss(ctx, x - r * 0.25, y - r * 0.3, r * 0.3, r * 0.14, 0.45);
  }
  function friesPile(ctx, R, cx, cy, rad, n = 28, opt = {}) {
    for (let i = 0; i < n; i++) {
      const [x, y] = R.disc(cx, cy, rad);
      const len = R.range(90, 150), w = R.range(18, 24), a = R() * 3.14;
      ctx.save(); ctx.translate(x, y); ctx.rotate(a);
      shadow(ctx, 8, 5, 0.5);
      const g = ctx.createLinearGradient(0, -w / 2, 0, w / 2);
      g.addColorStop(0, '#ffd88a'); g.addColorStop(0.5, '#e9a93a'); g.addColorStop(1, '#a8651a');
      ctx.fillStyle = g; roundRect(ctx, -len / 2, -w / 2, len, w, 6); ctx.fill(); noShadow(ctx);
      ctx.fillStyle = 'rgba(120,60,10,0.45)'; ctx.fillRect(len / 2 - 10, -w / 2 + 2, 8, w - 4); ctx.fillRect(-len / 2 + 2, -w / 2 + 2, 6, w - 4);
      ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(-len / 2 + 8, -w / 2 + 3, len - 16, 3);
      ctx.restore();
    }
    if (opt.salt) speckle(ctx, R, cx, cy, rad, 120, ['#ffffff'], 0.8, 1.8, 0.4, 0.8);
  }

  /* ============================================================
     Registry & render
     ============================================================ */
  const recipes = {};
  function register(name, fn) { recipes[name] = fn; }

  function render(canvas, recipe, opts = {}) {
    const size = canvas.width;
    const ctx = canvas.getContext('2d');
    S = size / 1000;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, size, size);
    ctx.setTransform(S, 0, 0, S, 0, 0);
    const R = rng(hash(recipe + (opts.seed || '')));
    const fn = recipes[recipe] || recipes.fallback;
    try { fn(ctx, R, opts); } catch (e) { console.warn('paint failed', recipe, e); }
    noShadow(ctx);
    return canvas;
  }

  // shared toolbox for the dish files
  const T = { hash, rng, rgba, shade, mix, circle, ellipse, blob, roundRect, leafPath, shadow, noShadow, litFill, gloss,
    speckle, scatter, plate, bowl, bowlInnerShade, board, slate, saucer, coaster, goldRing, leaf, sprig, flecks,
    tomatoGrilled, limeHalf, ramekin, friesPile };

  return { register, render, T, recipes };
})();

/* ============================================================
   Persian dishes
   ============================================================ */
(() => {
  const { register } = Painter;
  const { rgba, shade, mix, circle, ellipse, blob, roundRect, leafPath, shadow, noShadow, litFill, gloss,
    speckle, scatter, plate, bowl, bowlInnerShade, leaf, sprig, flecks, tomatoGrilled, limeHalf } = Painter.T;

  /* ---------- rice ---------- */
  function rice(ctx, R, cx, cy, rad, o = {}) {
    const capX = cx - rad * 0.12, capY = cy - rad * 0.18, capR = rad * (o.cap ?? 0.42);
    ctx.save(); shadow(ctx, 30, 16, 0.65); ctx.fillStyle = '#cfc2a4'; blob(ctx, cx, cy, rad, R, 0.045, 4); ctx.fill(); ctx.restore();
    ctx.save(); blob(ctx, cx, cy, rad, R, 0.045, 4); ctx.clip();
    const baseLight = o.tint ? shade(o.tint, 0.45) : '#fffaf0';
    const baseMid = o.tint ? o.tint : '#e4d9bf';
    ctx.fillStyle = litFill(ctx, cx, cy, rad, baseLight, baseMid, '#8c7d5e'); ctx.fillRect(0, 0, 1000, 1000);
    const n = Math.floor(rad * rad * 0.032);
    const grains = [];
    for (let i = 0; i < n; i++) grains.push(R.disc(cx, cy, rad * 1.02));
    grains.sort((a, b) => a[1] - b[1]);
    for (const [x, y] of grains) {
      const t = ((x - cx) * 0.55 + (y - cy) * 0.85) / rad; // light falls off toward bottom-right
      const edge = Math.hypot(x - cx, y - cy) / rad;
      let col = o.tint ? mix(o.tint, '#fff6e6', R.range(0.1, 0.55)) : mix('#f8f2e4', '#e9dcc0', R());
      if (o.saffron) {
        const d = Math.hypot(x - capX, y - capY) / capR;
        if (d < 0.75 + R() * 0.45) col = mix('#ffd35e', '#e57a0a', Math.min(1, R() * 0.6 + d * 0.45));
      }
      if (o.green && R() < o.green) col = mix('#6f9a3a', '#c9d9a0', R());
      const amt = -0.32 * Math.max(0, t) - 0.25 * Math.max(0, edge - 0.75) + 0.06 * Math.max(0, -t);
      ctx.fillStyle = shadeCss(col, amt);
      ellipse(ctx, x, y, 9, 2.8, R() * 3.14); ctx.fill();
      ctx.strokeStyle = 'rgba(80,60,30,0.16)'; ctx.lineWidth = 0.8; ctx.stroke();
    }
    if (o.barberry) {
      for (const [x, y] of scatter(R, capX + rad * 0.1, capY + rad * 0.12, capR * 1.15, o.barberry, 15)) {
        ctx.save(); shadow(ctx, 4, 2, 0.5);
        ctx.fillStyle = litFill(ctx, x, y, 8, '#ff6a6a', '#c3121e', '#5a0408'); ellipse(ctx, x, y, 8.5, 6.5, R() * 3); ctx.fill(); ctx.restore();
        ctx.fillStyle = 'rgba(255,255,255,0.7)'; circle(ctx, x - 2.5, y - 2.5, 1.8); ctx.fill();
      }
      for (let i = 0; i < 22; i++) { const [x, y] = R.disc(capX, capY, capR * 1.1); ctx.fillStyle = R() < 0.5 ? '#7fae3c' : '#f1e3c4'; ctx.save(); ctx.translate(x, y); ctx.rotate(R() * 3); roundRect(ctx, -9, -2.5, 18, 5, 2.5); ctx.fill(); ctx.restore(); }
    }
    if (o.fava) {
      for (const [x, y] of scatter(R, cx, cy, rad * 0.9, o.fava, 26)) {
        ctx.save(); shadow(ctx, 4, 2, 0.4); ctx.fillStyle = litFill(ctx, x, y, 14, '#e9f0b0', '#b9c96a', '#6c7a2c'); ellipse(ctx, x, y, 14, 10, R() * 3); ctx.fill(); ctx.restore();
      }
      flecks(ctx, R, cx, cy, rad * 0.95, 260, ['#4f7a24', '#7aa63a', '#3a5c18'], 4.5);
    }
    if (o.beans) {
      for (let i = 0; i < o.beans; i++) { const [x, y] = R.disc(cx, cy, rad * 0.9); ctx.save(); ctx.translate(x, y); ctx.rotate(R() * 3); ctx.fillStyle = litFill(ctx, 0, 0, 18, '#a7cf6a', '#5f8f2a', '#2c4a10'); roundRect(ctx, -18, -6, 36, 12, 6); ctx.fill(); ctx.restore(); }
      for (let i = 0; i < o.beans * 0.6; i++) { const [x, y] = R.disc(cx, cy, rad * 0.9); ctx.fillStyle = litFill(ctx, x, y, 12, '#9b5a3a', '#5a2a14', '#2a1006'); blob(ctx, x, y, R.range(8, 13), R, 0.2, 3); ctx.fill(); }
    }
    if (o.herbs) flecks(ctx, R, cx, cy, rad, o.herbs, ['#3c6a1e', '#5b8a2a', '#2a4a12', '#86ad4a'], 5);
    ctx.restore();
    gloss(ctx, cx - rad * 0.35, cy - rad * 0.4, rad * 0.45, rad * 0.25, 0.18);
  }
  function shadeCss(rgb, amt) { // shade a "rgb(r,g,b)" string or hex
    if (rgb[0] === '#') return shade(rgb, amt);
    const m = rgb.match(/\d+/g).map(Number);
    const f = (c) => Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt);
    return `rgb(${f(m[0])},${f(m[1])},${f(m[2])})`;
  }
  function butter(ctx, R, x, y, s) {
    ctx.save(); shadow(ctx, 8, 4, 0.4); ctx.fillStyle = litFill(ctx, x, y, s, '#fff9d6', '#f6e39a', '#cdb15a');
    ctx.translate(x, y); ctx.rotate(R.range(-0.4, 0.4)); roundRect(ctx, -s / 2, -s / 2, s, s, s * 0.22); ctx.fill(); ctx.restore();
    gloss(ctx, x - s * 0.15, y - s * 0.2, s * 0.25, s * 0.1, 0.6);
  }
  function sumac(ctx, R, x, y, r) { speckle(ctx, R, x, y, r, 140, ['#6a0f12', '#8e1f1c', '#4a0a0c'], 1, 3, 0.6, 0.95); }
  function onionRings(ctx, R, x, y, n) {
    for (let i = 0; i < n; i++) {
      const rx = R.range(28, 44), px = x + R.range(-40, 40), py = y + R.range(-30, 30);
      ctx.strokeStyle = 'rgba(244,236,246,0.92)'; ctx.lineWidth = 6; ellipse(ctx, px, py, rx, rx * 0.8, R() * 3); ctx.stroke();
      ctx.strokeStyle = 'rgba(160,80,150,0.55)'; ctx.lineWidth = 2; ellipse(ctx, px, py, rx + 3, rx * 0.8 + 3, R() * 3); ctx.stroke();
    }
  }

  /* ---------- skewers ---------- */
  function skewerFrame(ctx, x1, y1, x2, y2, draw) {
    const a = Math.atan2(y2 - y1, x2 - x1), L = Math.hypot(x2 - x1, y2 - y1);
    ctx.save(); ctx.translate(x1, y1); ctx.rotate(a); draw(L); ctx.restore();
  }
  function steel(ctx, L, w = 14) {
    ctx.save(); shadow(ctx, 8, 5, 0.6);
    const g = ctx.createLinearGradient(0, -w / 2, 0, w / 2);
    g.addColorStop(0, '#e9ecef'); g.addColorStop(0.5, '#8e959c'); g.addColorStop(1, '#3d4247');
    ctx.fillStyle = g; ctx.fillRect(-70, -w / 2, L + 110, w); ctx.restore();
    ctx.fillStyle = '#c9a25a'; roundRect(ctx, -96, -w * 0.9, 34, w * 1.8, 6); ctx.fill();
  }
  function meatPath(ctx, L, halfW) {
    ctx.beginPath();
    for (let x = 0; x <= L; x += 4) ctx.lineTo(x, -halfW(x));
    for (let x = L; x >= 0; x -= 4) ctx.lineTo(x, halfW(x));
    ctx.closePath();
  }
  function koobideh(ctx, R, x1, y1, x2, y2, o = {}) {
    const w = o.w || 84, light = o.light || 0;
    skewerFrame(ctx, x1, y1, x2, y2, (L) => {
      steel(ctx, L);
      const taper = (x) => Math.sqrt(Math.max(0, 1 - Math.pow(2 * x / L - 1, 10)));
      const halfW = (x) => (w / 2) * taper(x) * (1 - 0.1 * (0.5 + 0.5 * Math.cos(2 * Math.PI * x / 46)));
      ctx.save(); shadow(ctx, 18, 12, 0.7);
      const g = ctx.createLinearGradient(0, -w / 2, 0, w / 2);
      const c = (h) => shade(h, light);
      g.addColorStop(0, c('#3a1a0a')); g.addColorStop(0.22, c('#8a4a22')); g.addColorStop(0.42, c('#ae6630'));
      g.addColorStop(0.7, c('#7a3d18')); g.addColorStop(1, c('#241005'));
      ctx.fillStyle = g; meatPath(ctx, L, halfW); ctx.fill(); ctx.restore();
      ctx.save(); meatPath(ctx, L, halfW); ctx.clip();
      for (let x = 23; x < L; x += 46) {
        ctx.fillStyle = 'rgba(35,12,4,0.55)'; ctx.fillRect(x - 6, -w, 9, w * 2);
        ctx.fillStyle = 'rgba(255,190,140,0.13)'; ctx.fillRect(x + 4, -w, 7, w * 2);
      }
      for (let i = 0; i < 26; i++) { ctx.fillStyle = rgba('#140702', R.range(0.2, 0.55)); blob(ctx, R.range(0, L), R.range(-w / 2, w / 2), R.range(4, 14), R, 0.3, 3); ctx.fill(); }
      ctx.strokeStyle = 'rgba(20,6,2,0.35)'; ctx.lineWidth = 9;
      for (let x = -40; x < L; x += 74) { ctx.beginPath(); ctx.moveTo(x, -w); ctx.lineTo(x + 50, w); ctx.stroke(); }
      speckle(ctx, R, L / 2, 0, L / 2, 220, ['#ffd9b0'], 0.8, 2, 0.15, 0.5);
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,214,170,0.22)'; ctx.lineWidth = 2.4;
      ctx.beginPath(); for (let x = 10; x < L - 10; x += 4) ctx.lineTo(x, -halfW(x) * 0.62); ctx.stroke();
    });
  }
  function barg(ctx, R, x1, y1, x2, y2, o = {}) {
    const w = o.w || 120;
    skewerFrame(ctx, x1, y1, x2, y2, (L) => {
      steel(ctx, L, 12);
      const ph = R() * 6, ph2 = R() * 6;
      const halfW = (x) => (w / 2) * Math.sqrt(Math.max(0, 1 - Math.pow(2 * x / L - 1, 6))) * (1 + 0.08 * Math.sin(x / 38 + ph) + 0.05 * Math.sin(x / 13 + ph2));
      ctx.save(); shadow(ctx, 18, 12, 0.7);
      const base = o.color || '#8f4a28';
      const g = ctx.createLinearGradient(0, -w / 2, 0, w / 2);
      g.addColorStop(0, shade(base, -0.6)); g.addColorStop(0.3, shade(base, 0.08)); g.addColorStop(0.55, shade(base, 0.18)); g.addColorStop(1, shade(base, -0.65));
      ctx.fillStyle = g; meatPath(ctx, L, halfW); ctx.fill(); ctx.restore();
      ctx.save(); meatPath(ctx, L, halfW); ctx.clip();
      for (let i = 0; i < 70; i++) { ctx.strokeStyle = rgba('#2a0f05', R.range(0.08, 0.25)); ctx.lineWidth = R.range(1, 3); const yy = R.range(-w / 2, w / 2); ctx.beginPath(); ctx.moveTo(R.range(0, L * 0.3), yy); ctx.bezierCurveTo(L * 0.3, yy + R.range(-8, 8), L * 0.6, yy + R.range(-8, 8), R.range(L * 0.7, L), yy + R.range(-6, 6)); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(20,6,2,0.42)'; ctx.lineWidth = 12;
      for (let x = -60; x < L; x += 82) { ctx.beginPath(); ctx.moveTo(x, -w); ctx.lineTo(x + 70, w); ctx.stroke(); }
      for (let i = 0; i < 20; i++) { ctx.fillStyle = rgba('#120501', R.range(0.25, 0.6)); blob(ctx, R.range(0, L), R.range(-w / 2, w / 2), R.range(5, 16), R, 0.3, 3); ctx.fill(); }
      if (o.herbs) flecks(ctx, R, L / 2, 0, L / 2, 120, ['#3c5a18', '#5a7a26'], 5);
      if (o.pom) for (let i = 0; i < 26; i++) { const x = R.range(20, L - 20), y = R.range(-w / 3, w / 3); ctx.fillStyle = litFill(ctx, x, y, 7, '#ff6f7a', '#b2101e', '#4a0206'); ellipse(ctx, x, y, 7, 5, R() * 3); ctx.fill(); }
      speckle(ctx, R, L / 2, 0, L / 2, 200, ['#ffd2a8'], 0.8, 2, 0.12, 0.4);
      ctx.restore();
    });
  }
  function chunk(ctx, R, x, y, s, kind) {
    const pal = kind === 'chicken' ? ['#ffd06a', '#e58b2a', '#7d360c'] : ['#b06a40', '#7a3a1c', '#2c1006'];
    ctx.save(); shadow(ctx, 14, 9, 0.65); ctx.fillStyle = litFill(ctx, x, y, s, ...pal); blob(ctx, x, y, s, R, 0.12, 4); ctx.fill(); ctx.restore();
    ctx.save(); blob(ctx, x, y, s, R, 0.12, 4); ctx.clip();
    for (let i = 0; i < 7; i++) { ctx.fillStyle = rgba('#1a0702', R.range(0.25, 0.6)); blob(ctx, ...R.disc(x, y, s), R.range(3, 9), R, 0.3, 3); ctx.fill(); }
    const g = ctx.createRadialGradient(x, y, s * 0.6, x, y, s * 1.1); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(40,12,0,0.6)');
    ctx.fillStyle = g; ctx.fillRect(x - s * 1.2, y - s * 1.2, s * 2.4, s * 2.4);
    ctx.restore();
    gloss(ctx, x - s * 0.3, y - s * 0.35, s * 0.4, s * 0.2, kind === 'chicken' ? 0.4 : 0.28);
  }
  function chunkSkewer(ctx, R, x1, y1, x2, y2, kinds) {
    skewerFrame(ctx, x1, y1, x2, y2, (L) => {
      steel(ctx, L, 12);
      const n = kinds.length, step = L / n;
      for (let i = 0; i < n; i++) chunk(ctx, R, step * (i + 0.5), R.range(-5, 5), R.range(44, 50), kinds[i]);
    });
  }

  /* ---------- proteins ---------- */
  function chickenLeg(ctx, R, x, y, s, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.save(); shadow(ctx, 22, 14, 0.7);
    ctx.fillStyle = '#efe4cc'; roundRect(ctx, s * 0.55, -s * 0.11, s * 0.75, s * 0.22, s * 0.1); ctx.fill();
    ctx.fillStyle = litFill(ctx, s * 1.3, 0, s * 0.18, '#ffffff', '#ece0c6', '#b8a684'); circle(ctx, s * 1.32, -s * 0.07, s * 0.13); ctx.fill(); circle(ctx, s * 1.32, s * 0.08, s * 0.13); ctx.fill();
    ctx.fillStyle = litFill(ctx, 0, 0, s, '#ffd27a', '#e3902e', '#7a3a0e');
    ctx.beginPath(); ctx.moveTo(s * 0.65, -s * 0.16);
    ctx.bezierCurveTo(s * 0.2, -s * 0.7, -s * 0.9, -s * 0.65, -s * 0.85, 0);
    ctx.bezierCurveTo(-s * 0.9, s * 0.62, s * 0.2, s * 0.72, s * 0.65, s * 0.16); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.moveTo(s * 0.65, -s * 0.16);
    ctx.bezierCurveTo(s * 0.2, -s * 0.7, -s * 0.9, -s * 0.65, -s * 0.85, 0);
    ctx.bezierCurveTo(-s * 0.9, s * 0.62, s * 0.2, s * 0.72, s * 0.65, s * 0.16); ctx.closePath(); ctx.clip();
    for (let i = 0; i < 40; i++) { ctx.fillStyle = rgba(R() < 0.6 ? '#7a2e06' : '#ffe0a0', R.range(0.15, 0.45)); blob(ctx, R.range(-s * 0.8, s * 0.6), R.range(-s * 0.6, s * 0.6), R.range(3, 10), R, 0.3, 3); ctx.fill(); }
    ctx.restore();
    gloss(ctx, -s * 0.3, -s * 0.3, s * 0.45, s * 0.18, 0.45, -0.3);
    ctx.restore();
  }
  function lambShank(ctx, R, x, y, s) {
    ctx.save(); shadow(ctx, 10, 0, 0.3);
    ctx.fillStyle = litFill(ctx, x, y + s * 0.1, s * 1.3, '#7a3216', '#4a1a08', '#1e0802'); blob(ctx, x + s * 0.05, y + s * 0.1, s * 1.15, R, 0.1, 3); ctx.fill(); ctx.restore();
    gloss(ctx, x - s * 0.4, y - s * 0.2, s * 0.6, s * 0.2, 0.25);
    ctx.save(); shadow(ctx, 24, 14, 0.7);
    ctx.fillStyle = litFill(ctx, x, y, s * 0.8, '#a2562c', '#6a2e12', '#2a0e04'); blob(ctx, x, y, s * 0.78, R, 0.1, 4); ctx.fill(); ctx.restore();
    ctx.save(); blob(ctx, x, y, s * 0.78, R, 0.1, 4); ctx.clip();
    for (let i = 0; i < 40; i++) { ctx.strokeStyle = rgba('#1c0702', R.range(0.15, 0.35)); ctx.lineWidth = R.range(1.5, 4); const a = R() * 6.28; ctx.beginPath(); ctx.arc(x + s * 0.1, y + s * 0.1, R.range(s * 0.2, s * 0.8), a, a + R.range(0.3, 1.2)); ctx.stroke(); }
    ctx.restore();
    // bone
    ctx.save(); shadow(ctx, 12, 8, 0.6);
    ctx.fillStyle = litFill(ctx, x - s * 0.45, y - s * 0.5, s * 0.3, '#fffaf0', '#e8dcc0', '#9c8a66'); ellipse(ctx, x - s * 0.42, y - s * 0.45, s * 0.26, s * 0.22, 0.4); ctx.fill(); ctx.restore();
    ctx.fillStyle = litFill(ctx, x - s * 0.42, y - s * 0.45, s * 0.14, '#c0563a', '#7a2a18', '#3a0e06'); ellipse(ctx, x - s * 0.42, y - s * 0.45, s * 0.12, s * 0.1, 0.4); ctx.fill();
    gloss(ctx, x - s * 0.1, y - s * 0.15, s * 0.35, s * 0.12, 0.4);
  }
  function chops(ctx, R, cx, cy) {
    const defs = [[cx - 120, cy - 40, -0.5, false], [cx + 20, cy - 70, -0.15, true], [cx + 110, cy + 60, 0.35, false]];
    for (const [x, y, rot, cut] of defs) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
      ctx.save(); shadow(ctx, 14, 8, 0.6);
      const bg = ctx.createLinearGradient(0, -12, 0, 12); bg.addColorStop(0, '#fff8ea'); bg.addColorStop(1, '#a8946e');
      ctx.fillStyle = bg; roundRect(ctx, 40, -160, 26, 150, 12); ctx.fill();
      ctx.fillStyle = '#3a2410'; roundRect(ctx, 40, -165, 26, 22, 10); ctx.fill();
      ctx.restore();
      ctx.save(); shadow(ctx, 22, 14, 0.7);
      ctx.fillStyle = litFill(ctx, 0, 30, 110, '#a8603a', '#6a2e12', '#200802'); blob(ctx, 0, 40, 100, R, 0.08, 3); ctx.fill(); ctx.restore();
      if (cut) {
        ctx.fillStyle = litFill(ctx, -10, 40, 80, '#f0a3a0', '#c9566a', '#7a2a2a'); blob(ctx, -5, 42, 76, R, 0.06, 3); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.18)'; for (let i = 0; i < 14; i++) { ctx.fillRect(R.range(-60, 50), R.range(0, 90), R.range(10, 26), 1.5); }
      } else {
        ctx.save(); blob(ctx, 0, 40, 100, R, 0.08, 3); ctx.clip();
        ctx.strokeStyle = 'rgba(15,4,0,0.45)'; ctx.lineWidth = 12;
        for (let k = -150; k < 150; k += 46) { ctx.beginPath(); ctx.moveTo(k, -60); ctx.lineTo(k + 120, 160); ctx.stroke(); }
        ctx.restore();
        gloss(ctx, -30, 10, 50, 18, 0.3);
      }
      ctx.restore();
    }
    // rosemary
    for (let i = 0; i < 2; i++) {
      const sx = cx - 180 + i * 260, sy = cy + 150 - i * 290, a = R.range(-0.6, 0.6);
      for (let k = 0; k < 18; k++) { const t = k / 18; leaf(ctx, R, sx + Math.cos(a) * t * 150 + (k % 2 ? 9 : -9), sy + Math.sin(a) * t * 150, 34, a + (k % 2 ? 0.8 : -0.8), '#2f5a2a'); }
    }
  }

  /* ---------- stews ---------- */
  function stewBase(ctx, R, b, cols, o = {}) {
    ctx.save(); ctx.fillStyle = litFill(ctx, b.x, b.y, b.food, cols[0], cols[1], cols[2]); circle(ctx, b.x, b.y, b.food); ctx.fill();
    circle(ctx, b.x, b.y, b.food); ctx.clip();
    speckle(ctx, R, b.x, b.y, b.food, o.texture || 1600, cols.slice(3), 2, 7, 0.2, 0.6);
    if (o.oil) for (let i = 0; i < o.oil; i++) {
      const [x, y] = R.disc(b.x, b.y, b.food * 0.95), r = R.range(3, 14);
      ctx.fillStyle = rgba(o.oilCol || '#d98b1e', R.range(0.25, 0.55)); circle(ctx, x, y, r); ctx.fill();
      ctx.fillStyle = 'rgba(255,240,200,0.5)'; circle(ctx, x - r * 0.3, y - r * 0.3, r * 0.3); ctx.fill();
    }
    ctx.restore();
  }
  function kidneyBean(ctx, R, x, y) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(R() * 6.28); shadow(ctx, 5, 3, 0.5);
    ctx.fillStyle = litFill(ctx, 0, 0, 16, '#a2463a', '#5e1d16', '#250806');
    ctx.beginPath(); ctx.ellipse(0, 0, 17, 10, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    ctx.fillStyle = 'rgba(255,220,210,0.45)'; ellipse(ctx, x - 4, y - 3, 5, 2, 0.3); ctx.fill();
  }
  function meatCube(ctx, R, x, y, s = 22) {
    ctx.save(); shadow(ctx, 6, 4, 0.55); ctx.fillStyle = litFill(ctx, x, y, s, '#b27a52', '#7a4a2a', '#3a1c0a');
    ctx.translate(x, y); ctx.rotate(R() * 3); roundRect(ctx, -s, -s * 0.8, s * 2, s * 1.6, s * 0.4); ctx.fill(); ctx.restore();
    ctx.strokeStyle = 'rgba(20,6,0,0.4)'; ctx.lineWidth = 1.5; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(x - s * 0.7, y - s * 0.4 + i * s * 0.35); ctx.lineTo(x + s * 0.7, y - s * 0.3 + i * s * 0.35); ctx.stroke(); }
  }
  function driedLime(ctx, R, x, y, r) {
    ctx.save(); shadow(ctx, 8, 5, 0.6); ctx.fillStyle = litFill(ctx, x, y, r, '#8a6a3a', '#4a3416', '#1a1006'); blob(ctx, x, y, r, R, 0.08, 6); ctx.fill(); ctx.restore();
    ctx.strokeStyle = 'rgba(15,8,0,0.6)'; ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) { ctx.beginPath(); const a = R() * 6.28; ctx.arc(x, y, r * R.range(0.3, 0.9), a, a + 0.8); ctx.stroke(); }
    gloss(ctx, x - r * 0.3, y - r * 0.35, r * 0.3, r * 0.14, 0.35);
  }
  function walnut(ctx, R, x, y, s) {
    ctx.save(); shadow(ctx, 5, 3, 0.5); ctx.fillStyle = litFill(ctx, x, y, s, '#d9b07a', '#9a6a36', '#4a2c10'); blob(ctx, x, y, s, R, 0.22, 4); ctx.fill(); ctx.restore();
    ctx.strokeStyle = 'rgba(60,30,8,0.6)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x - s * 0.6, y); ctx.bezierCurveTo(x - s * 0.2, y - s * 0.5, x + s * 0.2, y + s * 0.5, x + s * 0.6, y); ctx.stroke();
  }
  function pomSeeds(ctx, R, cx, cy, rad, n) {
    for (let i = 0; i < n; i++) {
      const [x, y] = R.disc(cx, cy, rad);
      ctx.save(); shadow(ctx, 4, 2, 0.5); ctx.fillStyle = litFill(ctx, x, y, 9, '#ff7d8a', '#c4122a', '#55030c'); ellipse(ctx, x, y, 9.5, 7, R() * 3); ctx.fill(); ctx.restore();
      ctx.fillStyle = 'rgba(255,255,255,0.75)'; circle(ctx, x - 3, y - 3, 2); ctx.fill();
    }
  }
  function strawFries(ctx, R, cx, cy, rad, n) {
    for (let i = 0; i < n; i++) {
      const [x, y] = R.disc(cx, cy, rad); ctx.save(); ctx.translate(x, y); ctx.rotate(R() * 3.14); shadow(ctx, 4, 3, 0.5);
      const g = ctx.createLinearGradient(0, -4, 0, 4); g.addColorStop(0, '#ffe39a'); g.addColorStop(1, '#c98422');
      ctx.fillStyle = g; roundRect(ctx, -R.range(30, 46), -6, R.range(60, 92), 12, 5); ctx.fill(); ctx.restore();
    }
  }
  function eggplantHalf(ctx, R, x, y, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); shadow(ctx, 12, 8, 0.6);
    ctx.fillStyle = '#2a0f2a'; ellipse(ctx, 0, 0, 110, 40); ctx.fill(); noShadow(ctx);
    ctx.fillStyle = litFill(ctx, 0, 0, 100, '#e7b86a', '#b07a32', '#5a3510'); ellipse(ctx, 0, 0, 100, 32); ctx.fill();
    ctx.strokeStyle = 'rgba(90,50,10,0.5)'; ctx.lineWidth = 1.5; for (let i = -80; i < 90; i += 16) { ctx.beginPath(); ctx.moveTo(i, -20); ctx.lineTo(i + 10, 20); ctx.stroke(); }
    ctx.fillStyle = '#3a5a1a'; roundRect(ctx, -132, -12, 30, 24, 8); ctx.fill();
    gloss(ctx, -20, -12, 60, 9, 0.4, 0);
    ctx.restore();
  }

  function stewBowl(ctx, R, kind) {
    const b = bowl(ctx, R);
    if (kind === 'ghormeh') {
      stewBase(ctx, R, b, ['#5d6e2a', '#33421a', '#151c08', '#1f2a0a', '#4a5c1e', '#6e7f32', '#2a3810'], { texture: 2600, oil: 70, oilCol: '#c9861a' });
      for (let i = 0; i < 26; i++) kidneyBean(ctx, R, ...R.disc(b.x, b.y, b.food * 0.82));
      for (let i = 0; i < 12; i++) meatCube(ctx, R, ...R.disc(b.x, b.y, b.food * 0.75), R.range(18, 24));
      driedLime(ctx, R, b.x + 70, b.y - 60, 34); driedLime(ctx, R, b.x - 110, b.y + 90, 28);
      flecks(ctx, R, b.x, b.y, b.food * 0.9, 160, ['#1a2a06', '#3a5014'], 5);
    } else if (kind === 'gheymeh') {
      stewBase(ctx, R, b, ['#d8742a', '#a2400f', '#4a1604', '#7a2a08', '#c45a1a', '#e08a3a'], { texture: 2000, oil: 90, oilCol: '#f0a030' });
      for (let i = 0; i < 70; i++) { const [x, y] = R.disc(b.x, b.y, b.food * 0.85); ctx.fillStyle = litFill(ctx, x, y, 8, '#ffe28a', '#e3a93a', '#8a5a10'); circle(ctx, x, y, R.range(6, 8.5)); ctx.fill(); }
      for (let i = 0; i < 9; i++) meatCube(ctx, R, ...R.disc(b.x, b.y, b.food * 0.75), 20);
      driedLime(ctx, R, b.x - 90, b.y - 70, 30);
      strawFries(ctx, R, b.x + 30, b.y + 10, b.food * 0.45, 48);
    } else if (kind === 'fesenjan') {
      stewBase(ctx, R, b, ['#6e3a26', '#3c1810', '#120503', '#2a0e08', '#5a2a1a', '#7a4430'], { texture: 2200, oil: 60, oilCol: '#9a4a28' });
      for (let i = 0; i < 6; i++) chunk(ctx, R, ...R.disc(b.x, b.y, b.food * 0.6), R.range(34, 42), 'beef');
      for (let i = 0; i < 18; i++) walnut(ctx, R, ...R.disc(b.x, b.y, b.food * 0.85), R.range(12, 18));
      pomSeeds(ctx, R, b.x, b.y, b.food * 0.8, 70);
    } else if (kind === 'bademjan') {
      stewBase(ctx, R, b, ['#d0682a', '#9a3a10', '#3e1204', '#7a2a08', '#c45a1a'], { texture: 1800, oil: 80, oilCol: '#f0a030' });
      for (let i = 0; i < 50; i++) { const [x, y] = R.disc(b.x, b.y, b.food * 0.85); ctx.fillStyle = litFill(ctx, x, y, 8, '#ffe28a', '#e3a93a', '#8a5a10'); circle(ctx, x, y, 7); ctx.fill(); }
      eggplantHalf(ctx, R, b.x - 40, b.y - 60, -0.4); eggplantHalf(ctx, R, b.x + 40, b.y + 40, -0.4);
      tomatoGrilled(ctx, R, b.x + 130, b.y - 120, 40); tomatoGrilled(ctx, R, b.x - 150, b.y + 110, 36);
    }
    bowlInnerShade(ctx, b);
    gloss(ctx, b.x - b.food * 0.35, b.y - b.food * 0.45, b.food * 0.5, b.food * 0.12, 0.16);
  }

  /* ============================================================
     Dish recipes
     ============================================================ */
  register('fallback', (ctx, R) => { plate(ctx, R); });

  register('koobideh', (ctx, R) => {
    plate(ctx, R);
    rice(ctx, R, 370, 560, 205, { saffron: true });
    butter(ctx, R, 345, 520, 46);
    koobideh(ctx, R, 560, 205, 700, 800);
    koobideh(ctx, R, 650, 190, 790, 760);
    tomatoGrilled(ctx, R, 300, 300, 58);
    sumac(ctx, R, 420, 690, 30);
    sprig(ctx, R, 250, 760, 6, 48, '#3f6e2a');
    onionRings(ctx, R, 520, 840, 3);
  });
  register('barg', (ctx, R) => {
    plate(ctx, R);
    rice(ctx, R, 360, 570, 205, { saffron: true });
    butter(ctx, R, 340, 530, 46);
    barg(ctx, R, 560, 200, 720, 810);
    tomatoGrilled(ctx, R, 300, 300, 56);
    sumac(ctx, R, 640, 520, 40);
    sprig(ctx, R, 800, 700, 6, 46, '#3f6e2a');
  });
  register('joojeh', (ctx, R) => {
    plate(ctx, R);
    rice(ctx, R, 360, 570, 205, { saffron: true });
    chunkSkewer(ctx, R, 580, 210, 720, 800, ['chicken', 'chicken', 'chicken', 'chicken', 'chicken', 'chicken', 'chicken']);
    tomatoGrilled(ctx, R, 300, 300, 56);
    limeHalf(ctx, R, 800, 360, 42, '#9bc23a');
    sprig(ctx, R, 250, 770, 6, 46, '#3f6e2a');
  });
  register('bakhtiari', (ctx, R) => {
    plate(ctx, R);
    rice(ctx, R, 360, 570, 205, { saffron: true });
    chunkSkewer(ctx, R, 560, 200, 700, 800, ['chicken', 'beef', 'chicken', 'beef', 'chicken', 'beef', 'chicken']);
    chunkSkewer(ctx, R, 660, 190, 800, 770, ['beef', 'chicken', 'beef', 'chicken', 'beef', 'chicken']);
    tomatoGrilled(ctx, R, 300, 300, 56);
  });
  register('soltani', (ctx, R) => {
    plate(ctx, R);
    rice(ctx, R, 350, 580, 200, { saffron: true });
    butter(ctx, R, 330, 540, 44);
    barg(ctx, R, 540, 210, 680, 810, { w: 110 });
    koobideh(ctx, R, 680, 190, 810, 750, { w: 66 });
    tomatoGrilled(ctx, R, 290, 300, 56);
  });
  register('shishlik', (ctx, R) => {
    plate(ctx, R);
    rice(ctx, R, 330, 620, 175, { saffron: true, cap: 0.5 });
    chops(ctx, R, 590, 470);
    tomatoGrilled(ctx, R, 300, 330, 50);
    limeHalf(ctx, R, 700, 760, 40, '#9bc23a');
  });
  register('loghmeh', (ctx, R) => {
    plate(ctx, R);
    rice(ctx, R, 360, 570, 200, { saffron: true });
    koobideh(ctx, R, 580, 230, 690, 760, { w: 56, light: 0.12 });
    koobideh(ctx, R, 660, 220, 770, 740, { w: 56, light: 0.12 });
    koobideh(ctx, R, 740, 250, 830, 690, { w: 56, light: 0.12 });
    tomatoGrilled(ctx, R, 300, 300, 54);
  });
  register('torsh', (ctx, R) => {
    plate(ctx, R);
    rice(ctx, R, 360, 570, 200, { saffron: true });
    barg(ctx, R, 560, 210, 720, 810, { color: '#6e2a1c', herbs: true, pom: true });
    pomSeeds(ctx, R, 640, 820, 40, 14);
    for (let i = 0; i < 6; i++) walnut(ctx, R, ...R.disc(300, 300, 50), 15);
  });

  register('ghormeh', (ctx, R) => stewBowl(ctx, R, 'ghormeh'));
  register('gheymeh', (ctx, R) => stewBowl(ctx, R, 'gheymeh'));
  register('fesenjan', (ctx, R) => stewBowl(ctx, R, 'fesenjan'));
  register('gheymeh-bademjan', (ctx, R) => stewBowl(ctx, R, 'bademjan'));

  register('zereshk', (ctx, R) => {
    plate(ctx, R);
    rice(ctx, R, 420, 520, 250, { saffron: true, barberry: 90, cap: 0.55 });
    chickenLeg(ctx, R, 640, 700, 150, -0.9);
    sprig(ctx, R, 250, 760, 6, 44, '#3f6e2a');
  });
  register('baghali', (ctx, R) => {
    plate(ctx, R);
    rice(ctx, R, 400, 520, 245, { saffron: true, fava: 40, green: 0.28, cap: 0.3 });
    lambShank(ctx, R, 650, 650, 150);
  });
  register('lubia', (ctx, R) => {
    plate(ctx, R);
    rice(ctx, R, 500, 500, 290, { tint: '#d9804a', beans: 34, cap: 0 });
    for (let i = 0; i < 2; i++) sprig(ctx, R, 300 + i * 420, 300 + i * 410, 5, 40, '#3f6e2a');
  });
  register('tahchin', (ctx, R) => {
    plate(ctx, R);
    const pos = [[400, 400], [600, 400], [400, 600], [600, 600]];
    for (const [x, y] of pos) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(R.range(-0.08, 0.08)); shadow(ctx, 18, 12, 0.7);
      ctx.fillStyle = litFill(ctx, 0, 0, 110, '#ffd36a', '#e08a1a', '#7a3a06'); roundRect(ctx, -92, -92, 184, 184, 22); ctx.fill(); noShadow(ctx);
      ctx.save(); roundRect(ctx, -92, -92, 184, 184, 22); ctx.clip();
      for (let i = 0; i < 260; i++) { ctx.fillStyle = rgba(R() < 0.5 ? '#ffe9a8' : '#a2520e', R.range(0.3, 0.7)); ellipse(ctx, R.range(-92, 92), R.range(-92, 92), 8, 2.6, R() * 3); ctx.fill(); }
      const eg = ctx.createRadialGradient(0, 0, 50, 0, 0, 140); eg.addColorStop(0, 'rgba(0,0,0,0)'); eg.addColorStop(1, 'rgba(70,25,0,0.6)');
      ctx.fillStyle = eg; ctx.fillRect(-100, -100, 200, 200); ctx.restore();
      ctx.restore();
    }
    for (let i = 0; i < 46; i++) { const [x, y] = R.disc(500, 500, 190); ctx.fillStyle = litFill(ctx, x, y, 8, '#ff6a6a', '#c3121e', '#5a0408'); ellipse(ctx, x, y, 8, 6, R() * 3); ctx.fill(); }
    for (let i = 0; i < 30; i++) { const [x, y] = R.disc(500, 500, 190); ctx.fillStyle = '#7fae3c'; ctx.save(); ctx.translate(x, y); ctx.rotate(R() * 3); roundRect(ctx, -9, -2.5, 18, 5, 2.5); ctx.fill(); ctx.restore(); }
  });
  register('sabzi-mahi', (ctx, R) => {
    plate(ctx, R);
    rice(ctx, R, 380, 560, 220, { green: 0.55, herbs: 380, cap: 0 });
    ctx.save(); ctx.translate(640, 480); ctx.rotate(-1.1);
    for (let k = 0; k < 2; k++) {
      ctx.save(); ctx.translate(k * 40 - 20, k * 130 - 60); shadow(ctx, 22, 14, 0.7);
      ctx.fillStyle = litFill(ctx, 0, 0, 190, '#ffd27a', '#d98a2a', '#6a3008'); blob(ctx, 0, 0, 1, R, 0, 1);
      ctx.beginPath(); ctx.ellipse(0, 0, 180, 62, 0, 0, Math.PI * 2); ctx.fill(); noShadow(ctx);
      ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, 180, 62, 0, 0, Math.PI * 2); ctx.clip();
      speckle(ctx, R, 0, 0, 180, 500, ['#7a3a08', '#ffe6b0', '#a85a12'], 2, 5, 0.3, 0.7);
      ctx.restore(); gloss(ctx, -40, -22, 80, 14, 0.35, 0);
      ctx.restore();
    }
    ctx.restore();
    limeHalf(ctx, R, 800, 300, 46, '#e8d34a');
    limeHalf(ctx, R, 270, 280, 40, '#e8d34a');
  });

  /* ---------- starters ---------- */
  function yogurt(ctx, R, b, opt = {}) {
    ctx.fillStyle = litFill(ctx, b.x, b.y, b.food, '#ffffff', '#efeae0', '#b9b1a2'); circle(ctx, b.x, b.y, b.food); ctx.fill();
    ctx.save(); circle(ctx, b.x, b.y, b.food); ctx.clip();
    for (let i = 0; i < 14; i++) { ctx.strokeStyle = 'rgba(150,140,120,0.18)'; ctx.lineWidth = 6; ctx.beginPath(); const a = R() * 6.28; ctx.arc(b.x + R.range(-40, 40), b.y + R.range(-40, 40), R.range(60, b.food), a, a + R.range(0.5, 1.6)); ctx.stroke(); }
    ctx.restore();
  }
  function cubes(ctx, R, cx, cy, rad, n, pal, s = 18) {
    for (let i = 0; i < n; i++) {
      const [x, y] = R.disc(cx, cy, rad); ctx.save(); ctx.translate(x, y); ctx.rotate(R() * 3); shadow(ctx, 4, 3, 0.4);
      ctx.fillStyle = litFill(ctx, 0, 0, s, pal[0], pal[1], pal[2]); roundRect(ctx, -s / 2, -s / 2, s * R.range(0.9, 1.2), s * R.range(0.9, 1.2), 4); ctx.fill(); noShadow(ctx);
      if (pal[3]) { ctx.fillStyle = pal[3]; roundRect(ctx, -s / 2, -s / 2, s, s * 0.28, 3); ctx.fill(); }
      ctx.restore();
    }
  }
  function roses(ctx, R, cx, cy, rad, n) { for (let i = 0; i < n; i++) { const [x, y] = R.disc(cx, cy, rad); ctx.fillStyle = rgba(R.pick(['#b8233a', '#d84a5e', '#8a1428']), 0.9); leafPath(ctx, x, y, R.range(14, 22), 8, R() * 6); ctx.fill(); } }

  register('shirazi', (ctx, R) => {
    const b = bowl(ctx, R);
    ctx.fillStyle = '#2a1e12'; circle(ctx, b.x, b.y, b.food); ctx.fill();
    cubes(ctx, R, b.x, b.y, b.food * 0.9, 120, ['#ff8a70', '#d0281a', '#6a0a04'], 28);
    cubes(ctx, R, b.x, b.y, b.food * 0.9, 120, ['#e9f5c8', '#a6c96a', '#4f7a24', '#3f6a1a'], 28);
    cubes(ctx, R, b.x, b.y, b.food * 0.9, 60, ['#ffffff', '#f2e9f2', '#b9a8c2'], 20);
    flecks(ctx, R, b.x, b.y, b.food * 0.85, 140, ['#2f5a1a', '#4a7a26'], 4);
    bowlInnerShade(ctx, b);
    gloss(ctx, b.x - 90, b.y - 110, 120, 30, 0.12);
  });
  register('mast-khiar', (ctx, R) => {
    const b = bowl(ctx, R); yogurt(ctx, R, b);
    cubes(ctx, R, b.x, b.y, b.food * 0.6, 28, ['#e9f5c8', '#a6c96a', '#4f7a24', '#3f6a1a'], 15);
    flecks(ctx, R, b.x, b.y, b.food * 0.8, 160, ['#4a6a26', '#6a8a3a'], 3.5);
    roses(ctx, R, b.x + 40, b.y - 30, 70, 22);
    for (let i = 0; i < 6; i++) walnut(ctx, R, ...R.disc(b.x - 60, b.y + 60, 60), 13);
    bowlInnerShade(ctx, b);
  });
  register('mast-musir', (ctx, R) => {
    const b = bowl(ctx, R); yogurt(ctx, R, b);
    for (let i = 0; i < 90; i++) { const [x, y] = R.disc(b.x, b.y, b.food * 0.85); ctx.fillStyle = rgba(R.pick(['#5a4a5a', '#7a6a72', '#3a2e38']), 0.85); blob(ctx, x, y, R.range(3, 7), R, 0.3, 3); ctx.fill(); }
    flecks(ctx, R, b.x, b.y, 60, 60, ['#4a6a26'], 3);
    bowlInnerShade(ctx, b);
  });
  register('kashk-bademjan', (ctx, R) => {
    const b = bowl(ctx, R);
    stewBase(ctx, R, b, ['#c9a070', '#8a6038', '#3a2410', '#6a4420', '#b08050', '#dcbf90'], { texture: 2400 });
    ctx.strokeStyle = 'rgba(250,245,232,0.95)'; ctx.lineWidth = 16; ctx.lineCap = 'round';
    ctx.beginPath(); for (let t = 0; t < 14; t += 0.1) ctx.lineTo(b.x + Math.cos(t) * t * 14, b.y + Math.sin(t) * t * 14); ctx.stroke();
    ctx.strokeStyle = 'rgba(40,70,20,0.9)'; ctx.lineWidth = 6;
    ctx.beginPath(); for (let t = 0.5; t < 14; t += 0.1) ctx.lineTo(b.x + Math.cos(t + 0.4) * t * 15, b.y + Math.sin(t + 0.4) * t * 15); ctx.stroke();
    strawFries(ctx, R, b.x, b.y, b.food * 0.4, 0);
    for (let i = 0; i < 40; i++) { const [x, y] = R.disc(b.x, b.y, b.food * 0.75); ctx.fillStyle = rgba(R.pick(['#c87a28', '#8a4a10', '#e8a040']), 0.95); blob(ctx, x, y, R.range(4, 9), R, 0.4, 3); ctx.fill(); }
    for (let i = 0; i < 10; i++) walnut(ctx, R, ...R.disc(b.x, b.y, b.food * 0.6), 14);
    bowlInnerShade(ctx, b);
  });
  register('mirza', (ctx, R) => {
    const b = bowl(ctx, R);
    stewBase(ctx, R, b, ['#d6874a', '#9a4e1e', '#3e1a06', '#6a2e0e', '#c87a3a', '#e8b060'], { texture: 2400, oil: 50 });
    for (let i = 0; i < 30; i++) { const [x, y] = R.disc(b.x, b.y, b.food * 0.8); ctx.fillStyle = rgba(R.pick(['#ffe27a', '#f6f0d8']), 0.9); blob(ctx, x, y, R.range(6, 11), R, 0.3, 3); ctx.fill(); }
    sprig(ctx, R, b.x + 60, b.y - 50, 6, 46, '#3f6e2a');
    bowlInnerShade(ctx, b);
  });
  register('soup-jo', (ctx, R) => {
    const b = bowl(ctx, R);
    stewBase(ctx, R, b, ['#f2dcae', '#d2ad74', '#7a5a30', '#c8a068', '#efd9a8'], { texture: 900, oil: 40, oilCol: '#e8a040' });
    for (let i = 0; i < 160; i++) { const [x, y] = R.disc(b.x, b.y, b.food * 0.88); ctx.fillStyle = rgba('#fff4dc', 0.75); ellipse(ctx, x, y, 6, 4, R() * 3); ctx.fill(); }
    cubes(ctx, R, b.x, b.y, b.food * 0.8, 26, ['#ffb06a', '#e4701a', '#8a3a06'], 12);
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 7; ctx.beginPath(); for (let t = 0; t < 10; t += 0.1) ctx.lineTo(b.x + 40 + Math.cos(t) * t * 9, b.y - 30 + Math.sin(t) * t * 9); ctx.stroke();
    flecks(ctx, R, b.x, b.y, b.food * 0.6, 90, ['#2f5a1a', '#4a7a26'], 4);
    limeHalf(ctx, R, b.x - 120, b.y + 100, 40, '#9bc23a');
    bowlInnerShade(ctx, b);
  });
  register('ash-reshteh', (ctx, R) => {
    const b = bowl(ctx, R);
    stewBase(ctx, R, b, ['#7a7a42', '#4a4a20', '#1a1a08', '#5a5a2a', '#8a8a4a', '#3a4010'], { texture: 2600 });
    ctx.save(); circle(ctx, b.x, b.y, b.food); ctx.clip();
    for (let i = 0; i < 40; i++) { ctx.strokeStyle = rgba('#d8c89a', 0.7); ctx.lineWidth = 6; ctx.beginPath(); const [x, y] = R.disc(b.x, b.y, b.food); ctx.moveTo(x, y); ctx.bezierCurveTo(x + R.range(-90, 90), y + R.range(-90, 90), x + R.range(-90, 90), y + R.range(-90, 90), x + R.range(-120, 120), y + R.range(-120, 120)); ctx.stroke(); }
    ctx.restore();
    for (let i = 0; i < 14; i++) kidneyBean(ctx, R, ...R.disc(b.x, b.y, b.food * 0.8));
    // the classic garnish: kashk, fried mint oil, fried onions
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(250,246,236,0.95)'; ctx.lineWidth = 18; ctx.beginPath(); ctx.arc(b.x, b.y, b.food * 0.5, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(30,60,14,0.95)'; ctx.lineWidth = 7;
    for (let k = 0; k < 8; k++) { const a = k / 8 * 6.28; ctx.beginPath(); ctx.moveTo(b.x + Math.cos(a) * b.food * 0.2, b.y + Math.sin(a) * b.food * 0.2); ctx.quadraticCurveTo(b.x + Math.cos(a + 0.4) * b.food * 0.5, b.y + Math.sin(a + 0.4) * b.food * 0.5, b.x + Math.cos(a) * b.food * 0.75, b.y + Math.sin(a) * b.food * 0.75); ctx.stroke(); }
    for (let i = 0; i < 60; i++) { const [x, y] = R.disc(b.x, b.y, b.food * 0.22); ctx.fillStyle = rgba(R.pick(['#c87a28', '#8a4a10', '#e8a040']), 0.95); blob(ctx, x, y, R.range(4, 9), R, 0.4, 3); ctx.fill(); }
    bowlInnerShade(ctx, b);
  });
  register('zeytoon', (ctx, R) => {
    const b = bowl(ctx, R, { r: 400 });
    ctx.fillStyle = '#2a1408'; circle(ctx, b.x, b.y, b.food); ctx.fill();
    for (const [x, y] of scatter(R, b.x, b.y, b.food * 0.8, 34, 50)) {
      ctx.save(); shadow(ctx, 8, 5, 0.6); ctx.fillStyle = litFill(ctx, x, y, 30, '#c4c84a', '#7f8a1e', '#3a3a08'); ellipse(ctx, x, y, 30, 23, R() * 3); ctx.fill(); ctx.restore();
      ctx.fillStyle = rgba('#3a1408', 0.55); blob(ctx, x + 4, y + 6, 16, R, 0.3, 3); ctx.fill();
      gloss(ctx, x - 8, y - 9, 10, 5, 0.6);
    }
    pomSeeds(ctx, R, b.x, b.y, b.food * 0.8, 30);
    flecks(ctx, R, b.x, b.y, b.food * 0.8, 120, ['#2f5a1a', '#4a7a26'], 4);
    bowlInnerShade(ctx, b);
  });

  Painter.T.rice = rice; Painter.T.walnut = walnut; Painter.T.pomSeeds = pomSeeds; Painter.T.chunk = chunk; Painter.T.cubes = cubes; Painter.T.roses = roses; Painter.T.stewBase = stewBase;
})();

/* ============================================================
   Fast food: pizza, burger, pasta, sandwiches, salads
   ============================================================ */
(() => {
  const { register } = Painter;
  const { rgba, shade, circle, ellipse, blob, roundRect, leafPath, shadow, noShadow, litFill, gloss, speckle,
    scatter, plate, bowl, bowlInnerShade, board, slate, leaf, sprig, flecks, ramekin, friesPile, limeHalf, chunk, cubes } = Painter.T;

  /* ---------- pizza ---------- */
  function pizzaBase(ctx, R, cx, cy, r, o = {}) {
    ctx.save(); shadow(ctx, 30, 16, 0.75);
    ctx.fillStyle = litFill(ctx, cx, cy, r, '#f6cd7c', '#d48d3a', '#7a4210'); blob(ctx, cx, cy, r, R, 0.012, 7); ctx.fill(); ctx.restore();
    ctx.save(); blob(ctx, cx, cy, r, R, 0.012, 7); ctx.clip();
    // leopard spotting on the crust
    for (let i = 0; i < 90; i++) { const a = R() * 6.28, d = r * R.range(0.86, 1); ctx.fillStyle = rgba('#2a1206', R.range(0.2, 0.6)); blob(ctx, cx + Math.cos(a) * d, cy + Math.sin(a) * d, R.range(3, 10), R, 0.3, 3); ctx.fill(); }
    speckle(ctx, R, cx, cy, r, 400, ['#fff3dc'], 0.8, 2.2, 0.2, 0.6);
    ctx.restore();
    const sr = r * 0.86;
    ctx.fillStyle = litFill(ctx, cx, cy, sr, '#e8583a', '#b52c18', '#5a0e04'); blob(ctx, cx, cy, sr, R, 0.02, 6); ctx.fill();
    if (o.cheese !== false) {
      const cr = r * 0.83;
      ctx.save(); blob(ctx, cx, cy, cr, R, 0.035, 9); ctx.clip();
      ctx.fillStyle = litFill(ctx, cx, cy, cr, '#fff1b6', '#f2cf72', '#b8862a'); ctx.fillRect(0, 0, 1000, 1000);
      for (let i = 0; i < 70; i++) { const [x, y] = R.disc(cx, cy, cr); ctx.fillStyle = rgba('#fff8d8', R.range(0.3, 0.7)); blob(ctx, x, y, R.range(10, 28), R, 0.25, 3); ctx.fill(); }
      for (let i = 0; i < 55; i++) { const [x, y] = R.disc(cx, cy, cr); ctx.fillStyle = rgba(R() < 0.5 ? '#c8822a' : '#a85a14', R.range(0.25, 0.6)); blob(ctx, x, y, R.range(5, 16), R, 0.3, 3); ctx.fill(); }
      for (let i = 0; i < 22; i++) { const [x, y] = R.disc(cx, cy, cr); ctx.fillStyle = rgba('#b52c18', 0.55); blob(ctx, x, y, R.range(4, 12), R, 0.3, 3); ctx.fill(); }
      ctx.restore();
    }
    return { cx, cy, r, inner: r * 0.78 };
  }
  function pizzaCuts(ctx, cx, cy, r, n = 8) {
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2 + 0.2;
      ctx.strokeStyle = 'rgba(70,24,0,0.35)'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,240,200,0.12)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx + 3, cy + 3); ctx.lineTo(cx + Math.cos(a) * r + 3, cy + Math.sin(a) * r + 3); ctx.stroke();
    }
  }
  const TOP = {
    pepperoni(ctx, R, x, y, s = 36) {
      ctx.save(); shadow(ctx, 6, 3, 0.45); ctx.fillStyle = litFill(ctx, x, y, s, '#e85c40', '#a8241a', '#4a0a06'); blob(ctx, x, y, s, R, 0.04, 5); ctx.fill(); ctx.restore();
      ctx.strokeStyle = 'rgba(60,8,4,0.6)'; ctx.lineWidth = 3; blob(ctx, x, y, s * 0.95, R, 0.04, 5); ctx.stroke();
      speckle(ctx, R, x, y, s * 0.8, 14, ['#ffd0a0', '#5a0a04'], 1.2, 3, 0.3, 0.7);
      gloss(ctx, x - s * 0.3, y - s * 0.3, s * 0.4, s * 0.15, 0.45);
    },
    mushroom(ctx, R, x, y, s = 30) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(R() * 6.28); shadow(ctx, 5, 3, 0.4);
      ctx.fillStyle = litFill(ctx, 0, 0, s, '#f6ead2', '#d2b48c', '#7a5a36');
      ctx.beginPath(); ctx.arc(0, 0, s, Math.PI, 0); ctx.lineTo(s * 0.35, 0); ctx.lineTo(s * 0.3, s * 0.9); ctx.lineTo(-s * 0.3, s * 0.9); ctx.lineTo(-s * 0.35, 0); ctx.closePath(); ctx.fill(); noShadow(ctx);
      ctx.strokeStyle = 'rgba(110,70,30,0.55)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, s * 0.82, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
      ctx.restore();
    },
    olive(ctx, R, x, y, s = 13) { ctx.save(); shadow(ctx, 3, 2, 0.4); ctx.strokeStyle = '#141014'; ctx.lineWidth = s * 0.6; circle(ctx, x, y, s * 0.7); ctx.stroke(); ctx.restore(); ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, s * 0.95, 3.6, 4.6); ctx.stroke(); },
    pepper(ctx, R, x, y, s = 34) { ctx.save(); ctx.translate(x, y); ctx.rotate(R() * 6.28); shadow(ctx, 4, 2, 0.4); ctx.strokeStyle = R() < 0.7 ? '#3f8a2a' : '#c8281a'; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(0, 0, s, 0.2, 1.9); ctx.stroke(); ctx.restore(); },
    onion(ctx, R, x, y, s = 30) { ctx.save(); ctx.translate(x, y); ctx.rotate(R() * 6.28); ctx.strokeStyle = 'rgba(176,96,170,0.85)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, s, 0.3, 2.4); ctx.stroke(); ctx.strokeStyle = 'rgba(250,240,250,0.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, s - 5, 0.3, 2.4); ctx.stroke(); ctx.restore(); },
    corn(ctx, R, x, y) { ctx.fillStyle = litFill(ctx, x, y, 8, '#fff09a', '#f2c230', '#9a6a08'); roundRect(ctx, x - 7, y - 6, 14, 12, 5); ctx.fill(); },
    basil(ctx, R, x, y, s = 46) { leaf(ctx, R, x, y, s, R() * 6.28, '#2f7a2a'); },
    chicken(ctx, R, x, y, s = 24) { chunk(ctx, R, x, y, s, 'chicken'); },
    beef(ctx, R, x, y, s = 13) { for (let i = 0; i < 3; i++) { ctx.fillStyle = litFill(ctx, x, y, s, '#9a5a36', '#5e2e14', '#1e0a02'); blob(ctx, x + R.range(-12, 12), y + R.range(-12, 12), s * R.range(0.6, 1), R, 0.3, 3); ctx.fill(); } },
    ham(ctx, R, x, y, s = 34) { ctx.save(); ctx.translate(x, y); ctx.rotate(R() * 6.28); shadow(ctx, 4, 2, 0.35); ctx.fillStyle = litFill(ctx, 0, 0, s, '#ffc4c4', '#e88a8e', '#a04a52'); roundRect(ctx, -s / 2, -s / 2, s, s, 6); ctx.fill(); ctx.restore(); },
    tomato(ctx, R, x, y, s = 40) {
      ctx.save(); shadow(ctx, 5, 3, 0.4); ctx.fillStyle = litFill(ctx, x, y, s, '#ff7a5a', '#d22a1a', '#7a0a04'); circle(ctx, x, y, s); ctx.fill(); ctx.restore();
      ctx.fillStyle = 'rgba(255,170,120,0.8)'; for (let i = 0; i < 5; i++) { const a = i / 5 * 6.28; ellipse(ctx, x + Math.cos(a) * s * 0.5, y + Math.sin(a) * s * 0.5, s * 0.22, s * 0.13, a); ctx.fill(); }
    },
    mozzarella(ctx, R, x, y, s = 40) { ctx.save(); shadow(ctx, 6, 3, 0.3); ctx.fillStyle = litFill(ctx, x, y, s, '#ffffff', '#f6f0e0', '#cfc2a0'); blob(ctx, x, y, s, R, 0.12, 4); ctx.fill(); ctx.restore(); ctx.fillStyle = rgba('#c88a2a', 0.35); blob(ctx, x + 5, y + 5, s * 0.3, R, 0.3, 3); ctx.fill(); },
    sausage(ctx, R, x, y, s = 30) { ctx.save(); shadow(ctx, 5, 3, 0.4); ctx.fillStyle = litFill(ctx, x, y, s, '#ffb0a0', '#d8706a', '#7a3030'); circle(ctx, x, y, s); ctx.fill(); ctx.restore(); speckle(ctx, R, x, y, s * 0.8, 10, ['#ffffff'], 1.5, 3, 0.4, 0.8); },
    jalapeno(ctx, R, x, y, s = 16) { ctx.strokeStyle = '#3a7a1a'; ctx.lineWidth = s * 0.4; circle(ctx, x, y, s * 0.8); ctx.stroke(); ctx.fillStyle = '#d8e8a0'; circle(ctx, x, y, s * 0.55); ctx.fill(); speckle(ctx, R, x, y, s * 0.4, 6, ['#fff8d8'], 1.5, 2.2, 0.8, 1); },
    extraCheese(ctx, R, x, y, s = 34) { ctx.fillStyle = rgba('#fff4c0', 0.85); blob(ctx, x, y, s, R, 0.3, 3); ctx.fill(); ctx.fillStyle = rgba('#c8862a', 0.3); blob(ctx, x + 6, y + 4, s * 0.4, R, 0.3, 3); ctx.fill(); },
  };
  const PIZZAS = {
    'pizza-pepperoni': { pepperoni: 20, basil: 3 },
    'pizza-special': { pepperoni: 9, mushroom: 9, pepper: 8, olive: 10, beef: 8, onion: 5 },
    'pizza-margherita': { cheese: false, mozzarella: 9, tomato: 7, basil: 8 },
    'pizza-beef': { beef: 18, mushroom: 12, onion: 4 },
    'pizza-chicken': { chicken: 12, mushroom: 10, corn: 22, pepper: 4 },
    'pizza-veggie': { mushroom: 8, pepper: 12, olive: 10, corn: 24, onion: 6, tomato: 4 },
  };
  function pizza(ctx, R, cx, cy, r, spec) {
    const base = pizzaBase(ctx, R, cx, cy, r, { cheese: spec.cheese !== false });
    const order = ['beef', 'corn', 'onion', 'pepper', 'tomato', 'mozzarella', 'ham', 'sausage', 'chicken', 'mushroom', 'pepperoni', 'olive', 'jalapeno', 'basil'];
    for (const k of order) {
      const n = spec[k]; if (!n || typeof n !== 'number') continue;
      for (const [x, y] of scatter(R, cx, cy, base.inner, n, k === 'corn' ? 18 : 42)) TOP[k](ctx, R, x, y);
    }
    pizzaCuts(ctx, cx, cy, r * 0.97);
    return base;
  }
  for (const [name, spec] of Object.entries(PIZZAS)) {
    register(name, (ctx, R) => { board(ctx, R); pizza(ctx, R, 500, 500, 400, spec); });
  }
  // the bare base, for the pizza builder
  register('pizza-base', (ctx, R) => { board(ctx, R); pizzaBase(ctx, R, 500, 500, 400); pizzaCuts(ctx, 500, 500, 388); });

  /* ---------- burger ---------- */
  function bun(ctx, R, x, y, r, seeds = 70) {
    ctx.save(); shadow(ctx, 30, 18, 0.75); ctx.fillStyle = litFill(ctx, x, y, r, '#ffd48a', '#d4852e', '#6e300a'); blob(ctx, x, y, r, R, 0.02, 5); ctx.fill(); ctx.restore();
    ctx.save(); blob(ctx, x, y, r, R, 0.02, 5); ctx.clip();
    const g = ctx.createRadialGradient(x, y, r * 0.75, x, y, r); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(60,20,0,0.5)'); ctx.fillStyle = g; ctx.fillRect(0, 0, 1000, 1000);
    for (const [sx, sy] of scatter(R, x, y, r * 0.8, seeds, 22)) {
      ctx.save(); shadow(ctx, 2, 1.5, 0.45); ctx.fillStyle = litFill(ctx, sx, sy, 6, '#fffaea', '#efe0bc', '#b49a6a'); ellipse(ctx, sx, sy, 6.5, 3.6, R() * 3.14); ctx.fill(); ctx.restore();
    }
    ctx.restore();
    gloss(ctx, x - r * 0.3, y - r * 0.35, r * 0.5, r * 0.28, 0.32);
  }
  function burger(ctx, R, spec) {
    const x = 420, y = 470, r = 225;
    if (spec.chicken) { ctx.save(); shadow(ctx, 16, 10, 0.6); ctx.fillStyle = litFill(ctx, x, y, r + 40, '#ffd27a', '#d48a2a', '#6a3008'); blob(ctx, x + 10, y + 6, r + 34, R, 0.08, 7); ctx.fill(); ctx.restore(); speckle(ctx, R, x, y, r + 34, 400, ['#ffe9b0', '#8a4a10'], 2, 5, 0.3, 0.7); }
    else {
      const layers = spec.double ? 2 : 1;
      for (let i = 0; i < layers; i++) { ctx.save(); shadow(ctx, 14, 8, 0.6); ctx.fillStyle = litFill(ctx, x, y, r + 30, '#7a4426', '#4a2212', '#1a0802'); blob(ctx, x + 14 - i * 22, y + 10 + i * 14, r + 24, R, 0.05, 6); ctx.fill(); ctx.restore(); }
    }
    // lettuce frill
    ctx.save(); shadow(ctx, 8, 4, 0.5); ctx.fillStyle = litFill(ctx, x, y, r + 34, '#c6ec7a', '#6aa82a', '#2a5a0a'); blob(ctx, x - 8, y + 4, r + 18, R, 0.05, 15); ctx.fill(); ctx.restore();
    if (spec.cheese) for (const a of [0.4, 2.2, 3.9]) {
      ctx.save(); ctx.translate(x + Math.cos(a) * r * 0.92, y + Math.sin(a) * r * 0.92); ctx.rotate(a + 0.785); shadow(ctx, 6, 3, 0.4);
      ctx.fillStyle = litFill(ctx, 0, 0, 40, '#ffd060', '#f2a51a', '#b8680a'); roundRect(ctx, -34, -34, 68, 68, 10); ctx.fill(); ctx.restore();
    }
    if (spec.mushroom) for (let i = 0; i < 5; i++) { const a = i * 1.25 + 0.3; TOP.mushroom(ctx, R, x + Math.cos(a) * (r + 10), y + Math.sin(a) * (r + 10), 30); }
    bun(ctx, R, x, y, r);
    friesPile(ctx, R, 740, 700, 110, 22, { salt: true });
    ramekin(ctx, R, 770, 300, 70, '#b8200e');
    for (let i = 0; i < 3; i++) { const px = 210 + i * 46, py = 780 - i * 14; ctx.save(); shadow(ctx, 6, 3, 0.4); ctx.fillStyle = litFill(ctx, px, py, 26, '#c6d87a', '#7a9a2a', '#3a4a0a'); circle(ctx, px, py, 26); ctx.fill(); ctx.restore(); speckle(ctx, R, px, py, 16, 10, ['#f0f4c8'], 1.5, 2.5, 0.7, 1); }
  }
  const BURGERS = { 'burger-classic': {}, 'burger-cheese': { cheese: true }, 'burger-double': { double: true, cheese: true }, 'burger-mushroom': { mushroom: true, cheese: true }, 'burger-chicken': { chicken: true } };
  for (const [name, spec] of Object.entries(BURGERS)) register(name, (ctx, R) => { slate(ctx, R); burger(ctx, R, spec); });

  /* ---------- pasta ---------- */
  function noodles(ctx, R, cx, cy, rad, n, w, col) {
    ctx.save(); shadow(ctx, 28, 16, 0.7); ctx.fillStyle = shade(col, -0.38); blob(ctx, cx, cy, rad, R, 0.06, 4); ctx.fill(); ctx.restore();
    ctx.save(); blob(ctx, cx, cy, rad, R, 0.06, 4); ctx.clip();
    ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const r0 = R.range(rad * 0.08, rad * 1.05), a0 = R() * 6.28, sweep = R.range(0.9, 2.6) * R.sign(), drift = R.range(-0.25, 0.25) * rad;
      const ox = cx + R.range(-rad * 0.08, rad * 0.08), oy = cy + R.range(-rad * 0.08, rad * 0.08);
      const pts = []; for (let t = 0; t <= 1.0001; t += 0.04) { const a = a0 + sweep * t, rr = r0 + drift * t; pts.push([ox + Math.cos(a) * rr, oy + Math.sin(a) * rr]); }
      const path = () => { ctx.beginPath(); pts.forEach(([px, py], k) => k ? ctx.lineTo(px, py) : ctx.moveTo(px, py)); };
      const lit = 0.18 - 0.24 * (r0 / rad);
      ctx.strokeStyle = 'rgba(40,20,0,0.32)'; ctx.lineWidth = w + 3; path(); ctx.stroke();
      ctx.strokeStyle = shade(col, Math.max(-0.4, lit + R.range(-0.08, 0.06))); ctx.lineWidth = w; path(); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,240,0.4)'; ctx.lineWidth = Math.max(1.2, w * 0.22); ctx.save(); ctx.translate(-w * 0.18, -w * 0.18); path(); ctx.stroke(); ctx.restore();
    }
    const g = ctx.createRadialGradient(cx, cy, rad * 0.5, cx, cy, rad); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1000, 1000);
    ctx.restore();
    gloss(ctx, cx - rad * 0.3, cy - rad * 0.35, rad * 0.4, rad * 0.16, 0.2);
  }
  function parmesan(ctx, R, cx, cy, rad, n) { for (let i = 0; i < n; i++) { const [x, y] = R.disc(cx, cy, rad); ctx.save(); ctx.translate(x, y); ctx.rotate(R() * 3); shadow(ctx, 3, 2, 0.35); ctx.fillStyle = litFill(ctx, 0, 0, 16, '#fffbe8', '#f2e6bc', '#c9b480'); ctx.beginPath(); ctx.moveTo(-16, -4); ctx.lineTo(14, -8); ctx.lineTo(18, 4); ctx.lineTo(-12, 7); ctx.closePath(); ctx.fill(); ctx.restore(); } }
  function pepperDots(ctx, R, cx, cy, rad, n) { speckle(ctx, R, cx, cy, rad, n, ['#1a1410'], 1.2, 2.6, 0.6, 0.95); }

  register('pasta-alfredo', (ctx, R) => {
    plate(ctx, R);
    noodles(ctx, R, 500, 500, 280, 150, 17, '#f3e1ae');
    for (let i = 0; i < 7; i++) { const [x, y] = R.disc(500, 500, 150); ctx.save(); ctx.translate(x, y); ctx.rotate(R() * 3); shadow(ctx, 10, 6, 0.6); ctx.fillStyle = litFill(ctx, 0, 0, 50, '#ffe6a8', '#e0a050', '#8a4a10'); roundRect(ctx, -46, -18, 92, 36, 14); ctx.fill(); noShadow(ctx); ctx.strokeStyle = 'rgba(90,40,0,0.5)'; ctx.lineWidth = 5; for (let k = -30; k < 40; k += 22) { ctx.beginPath(); ctx.moveTo(k, -18); ctx.lineTo(k + 10, 18); ctx.stroke(); } ctx.restore(); }
    parmesan(ctx, R, 500, 500, 200, 14); flecks(ctx, R, 500, 500, 230, 110, ['#2f6a1a', '#4a8a26'], 4); pepperDots(ctx, R, 500, 500, 240, 90);
  });
  register('pasta-bolognese', (ctx, R) => {
    plate(ctx, R);
    noodles(ctx, R, 500, 500, 280, 260, 8, '#f2d690');
    ctx.save(); shadow(ctx, 20, 10, 0.6); ctx.fillStyle = litFill(ctx, 490, 480, 150, '#c24a26', '#8a2a12', '#3a0c04'); blob(ctx, 490, 480, 140, R, 0.12, 5); ctx.fill(); ctx.restore();
    ctx.save(); blob(ctx, 490, 480, 140, R, 0.12, 5); ctx.clip();
    for (let i = 0; i < 160; i++) { const [x, y] = R.disc(490, 480, 140); ctx.fillStyle = rgba(R.pick(['#5a2010', '#a8442a', '#3a1006', '#c86a3a']), 0.85); blob(ctx, x, y, R.range(4, 10), R, 0.35, 3); ctx.fill(); }
    ctx.restore(); gloss(ctx, 440, 430, 60, 18, 0.25);
    parmesan(ctx, R, 490, 470, 120, 10); leaf(ctx, R, 540, 420, 70, -0.6, '#2f7a2a'); leaf(ctx, R, 570, 450, 56, 0.4, '#2f7a2a');
  });
  register('pasta-penne', (ctx, R) => {
    plate(ctx, R);
    ctx.save(); shadow(ctx, 24, 14, 0.6); ctx.fillStyle = litFill(ctx, 500, 500, 280, '#d8582a', '#a8300e', '#4a0e02'); blob(ctx, 500, 500, 270, R, 0.08, 5); ctx.fill(); ctx.restore();
    for (const [x, y] of scatter(R, 500, 500, 235, 95, 30)) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(R() * 3.14); shadow(ctx, 8, 5, 0.6);
      ctx.fillStyle = litFill(ctx, 0, 0, 40, '#ff8a5a', '#cf4a22', '#6a1a06'); ctx.beginPath(); ctx.moveTo(-46, -16); ctx.lineTo(36, -16); ctx.lineTo(48, 16); ctx.lineTo(-34, 16); ctx.closePath(); ctx.fill(); noShadow(ctx);
      ctx.strokeStyle = 'rgba(80,10,0,0.35)'; ctx.lineWidth = 2; for (let k = -26; k < 34; k += 9) { ctx.beginPath(); ctx.moveTo(k, -13); ctx.lineTo(k + 6, 13); ctx.stroke(); }
      ctx.fillStyle = '#5a1606'; ellipse(ctx, 35, 0, 5, 12); ctx.fill();
      ctx.restore();
    }
    speckle(ctx, R, 500, 500, 240, 90, ['#a80e06', '#e83a1a'], 1.5, 3.5, 0.7, 1);
    parmesan(ctx, R, 500, 500, 200, 12); flecks(ctx, R, 500, 500, 220, 90, ['#2f6a1a', '#4a8a26'], 4);
  });
  register('lasagna', (ctx, R) => {
    plate(ctx, R);
    ctx.save(); ctx.translate(500, 500); ctx.rotate(-0.18);
    ctx.save(); shadow(ctx, 30, 18, 0.75); ctx.fillStyle = '#b8401a'; roundRect(ctx, -200, -170, 400, 340, 30); ctx.fill(); ctx.restore();
    roundRect(ctx, -190, -160, 380, 320, 28); ctx.save(); ctx.clip();
    ctx.fillStyle = litFill(ctx, 0, 0, 260, '#ffd47a', '#e2a040', '#8a4a10'); ctx.fillRect(-200, -170, 400, 340);
    for (let i = 0; i < 70; i++) { ctx.fillStyle = rgba(R.pick(['#a0561a', '#7a3a0a', '#c87a2a']), R.range(0.35, 0.8)); blob(ctx, R.range(-190, 190), R.range(-160, 160), R.range(6, 22), R, 0.3, 3); ctx.fill(); }
    for (let i = 0; i < 40; i++) { ctx.fillStyle = rgba('#fff6d0', R.range(0.3, 0.6)); blob(ctx, R.range(-190, 190), R.range(-160, 160), R.range(6, 16), R, 0.3, 3); ctx.fill(); }
    ctx.restore();
    ctx.fillStyle = rgba('#a8240e', 0.85); for (let i = 0; i < 8; i++) { blob(ctx, R.range(-200, 200) * (R() < 0.5 ? 1 : 1), (R() < 0.5 ? -1 : 1) * 170, R.range(16, 30), R, 0.3, 3); ctx.fill(); }
    ctx.restore();
    leaf(ctx, R, 470, 470, 80, -0.5, '#2f7a2a'); leaf(ctx, R, 520, 500, 64, 0.6, '#2f7a2a');
  });

  /* ---------- sandwiches & sides ---------- */
  register('hotdog', (ctx, R) => {
    slate(ctx, R);
    ctx.save(); ctx.translate(470, 420); ctx.rotate(-0.35);
    ctx.save(); shadow(ctx, 26, 16, 0.75); ctx.fillStyle = litFill(ctx, 0, 0, 320, '#ffd48a', '#d4852e', '#6e300a'); ellipse(ctx, 0, 0, 300, 96); ctx.fill(); ctx.restore();
    ctx.fillStyle = '#f6e6c4'; ellipse(ctx, 0, 0, 280, 58); ctx.fill();
    ctx.save(); shadow(ctx, 10, 6, 0.6); const sg = ctx.createLinearGradient(0, -34, 0, 34); sg.addColorStop(0, '#5a1a0a'); sg.addColorStop(0.4, '#b0482a'); sg.addColorStop(1, '#3a0e04'); ctx.fillStyle = sg; roundRect(ctx, -310, -34, 620, 68, 34); ctx.fill(); ctx.restore();
    ctx.strokeStyle = 'rgba(25,6,0,0.55)'; ctx.lineWidth = 8; for (let k = -260; k < 280; k += 60) { ctx.beginPath(); ctx.moveTo(k, -30); ctx.lineTo(k + 26, 30); ctx.stroke(); }
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = '#f2c020'; ctx.lineWidth = 9; ctx.beginPath(); for (let k = -250; k <= 250; k += 25) ctx.lineTo(k, (k / 25) % 2 ? -20 : 20); ctx.stroke();
    ctx.strokeStyle = '#c4220e'; ctx.lineWidth = 9; ctx.beginPath(); for (let k = -238; k <= 262; k += 25) ctx.lineTo(k, (k / 25 + 0.5) % 2 > 1 ? -14 : 14); ctx.stroke();
    cubes(ctx, R, 0, 0, 0, 0, ['#c6d87a', '#7a9a2a', '#3a4a0a'], 10);
    for (let i = 0; i < 30; i++) { ctx.fillStyle = rgba(R.pick(['#9ab84a', '#f2ecf2']), 0.95); roundRect(ctx, R.range(-240, 240), R.range(-30, 24), 9, 9, 2); ctx.fill(); }
    ctx.restore();
    friesPile(ctx, R, 650, 720, 120, 24, { salt: true });
    ramekin(ctx, R, 270, 720, 72, '#f2c020');
  });
  register('strips', (ctx, R) => {
    slate(ctx, R);
    for (let i = 0; i < 5; i++) {
      const x = 330 + i * 70, y = 440 + (i % 2) * 40, rot = -0.9 + i * 0.12;
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot); shadow(ctx, 16, 10, 0.7);
      ctx.fillStyle = litFill(ctx, 0, 0, 160, '#ffd88a', '#d48a2a', '#6a3008'); blob(ctx, 0, 0, 1, R, 0, 1);
      ctx.beginPath(); ctx.ellipse(0, 0, 160, 46, 0, 0, Math.PI * 2); ctx.fill(); noShadow(ctx);
      ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, 160, 46, 0, 0, Math.PI * 2); ctx.clip(); speckle(ctx, R, 0, 0, 160, 260, ['#7a3a08', '#ffe9b0', '#a85a12'], 2, 5.5, 0.35, 0.8); ctx.restore();
      ctx.restore();
    }
    ramekin(ctx, R, 760, 320, 74, '#f4efe2', { swirl: '#7aa83a' });
    friesPile(ctx, R, 640, 740, 110, 20, { salt: true });
    limeHalf(ctx, R, 250, 760, 44, '#e8d34a');
  });
  register('fries', (ctx, R) => {
    plate(ctx, R);
    friesPile(ctx, R, 470, 520, 220, 60, { salt: true });
    ramekin(ctx, R, 720, 300, 80, '#b8200e');
  });
  register('fries-special', (ctx, R) => {
    plate(ctx, R);
    friesPile(ctx, R, 500, 500, 230, 60);
    ctx.lineCap = 'round';
    for (let i = 0; i < 9; i++) { ctx.strokeStyle = rgba('#ffc43a', 0.95); ctx.lineWidth = 16; ctx.beginPath(); const [x, y] = R.disc(500, 500, 180); ctx.moveTo(x, y); ctx.bezierCurveTo(x + R.range(-90, 90), y + R.range(-60, 60), x + R.range(-90, 90), y + R.range(-60, 60), x + R.range(-140, 140), y + R.range(-80, 80)); ctx.stroke(); }
    for (let i = 0; i < 12; i++) TOP.mushroom(ctx, R, ...R.disc(500, 500, 190), 24);
    flecks(ctx, R, 500, 500, 220, 120, ['#2f6a1a', '#4a8a26'], 4);
  });

  /* ---------- salads ---------- */
  function romaine(ctx, R, x, y, len, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); shadow(ctx, 10, 6, 0.5);
    const g = ctx.createLinearGradient(0, -len * 0.25, 0, len * 0.25); g.addColorStop(0, '#2a6a14'); g.addColorStop(0.5, '#8ec04a'); g.addColorStop(1, '#2a5a10');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-len / 2, 0);
    for (let t = 0; t <= 1; t += 0.05) ctx.lineTo(-len / 2 + t * len, -len * 0.2 * Math.sin(t * Math.PI) - Math.sin(t * 40) * 5);
    for (let t = 1; t >= 0; t -= 0.05) ctx.lineTo(-len / 2 + t * len, len * 0.2 * Math.sin(t * Math.PI) + Math.sin(t * 37) * 5);
    ctx.fill(); noShadow(ctx);
    ctx.strokeStyle = 'rgba(240,250,210,0.75)'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(-len / 2, 0); ctx.lineTo(len / 2, 0); ctx.stroke();
    ctx.restore();
  }
  register('caesar', (ctx, R) => {
    const b = bowl(ctx, R);
    ctx.fillStyle = '#1e3a0e'; circle(ctx, b.x, b.y, b.food); ctx.fill();
    for (let i = 0; i < 16; i++) romaine(ctx, R, ...R.disc(b.x, b.y, b.food * 0.6), R.range(160, 230), R() * 3.14);
    for (let i = 0; i < 6; i++) { const [x, y] = R.disc(b.x, b.y, b.food * 0.55); ctx.save(); ctx.translate(x, y); ctx.rotate(R() * 3); shadow(ctx, 10, 6, 0.5); ctx.fillStyle = litFill(ctx, 0, 0, 50, '#ffe6a8', '#e0a050', '#8a4a10'); roundRect(ctx, -46, -18, 92, 36, 14); ctx.fill(); noShadow(ctx); ctx.strokeStyle = 'rgba(90,40,0,0.5)'; ctx.lineWidth = 5; for (let k = -30; k < 40; k += 22) { ctx.beginPath(); ctx.moveTo(k, -18); ctx.lineTo(k + 10, 18); ctx.stroke(); } ctx.restore(); }
    cubes(ctx, R, b.x, b.y, b.food * 0.75, 20, ['#ffe39a', '#d89a3a', '#7a4a10'], 22);
    parmesan(ctx, R, b.x, b.y, b.food * 0.8, 18);
    ctx.lineCap = 'round'; for (let i = 0; i < 5; i++) { ctx.strokeStyle = 'rgba(250,244,226,0.85)'; ctx.lineWidth = 7; ctx.beginPath(); const [x, y] = R.disc(b.x, b.y, b.food * 0.6); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + R.range(-80, 80), y + R.range(-80, 80), x + R.range(-120, 120), y + R.range(-120, 120)); ctx.stroke(); }
    pepperDots(ctx, R, b.x, b.y, b.food * 0.8, 70);
    bowlInnerShade(ctx, b);
  });
  register('salad-fasl', (ctx, R) => {
    const b = bowl(ctx, R);
    ctx.fillStyle = '#1e3a0e'; circle(ctx, b.x, b.y, b.food); ctx.fill();
    for (let i = 0; i < 18; i++) romaine(ctx, R, ...R.disc(b.x, b.y, b.food * 0.6), R.range(130, 200), R() * 3.14);
    for (let i = 0; i < 40; i++) { ctx.strokeStyle = rgba(R() < 0.5 ? '#f08a2a' : '#8a2a6a', 0.95); ctx.lineWidth = 5; ctx.lineCap = 'round'; const [x, y] = R.disc(b.x, b.y, b.food * 0.75); const a = R() * 6.28; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * 40, y + Math.sin(a) * 40); ctx.stroke(); }
    for (const [x, y] of scatter(R, b.x, b.y, b.food * 0.7, 8, 70)) TOP.tomato(ctx, R, x, y, 30);
    for (const [x, y] of scatter(R, b.x, b.y, b.food * 0.75, 8, 70)) { ctx.save(); shadow(ctx, 5, 3, 0.4); ctx.fillStyle = '#3a6a1a'; circle(ctx, x, y, 28); ctx.fill(); ctx.restore(); ctx.fillStyle = litFill(ctx, x, y, 25, '#f4fadc', '#cfe39a', '#8aa84a'); circle(ctx, x, y, 24); ctx.fill(); speckle(ctx, R, x, y, 12, 8, ['#e8f0c0'], 1.5, 2.5, 0.8, 1); }
    for (let i = 0; i < 30; i++) TOP.corn(ctx, R, ...R.disc(b.x, b.y, b.food * 0.7));
    bowlInnerShade(ctx, b);
  });

  Painter.T.pizzaBase = pizzaBase; Painter.T.pizzaTop = TOP; Painter.T.pizzaCuts = pizzaCuts; Painter.T.bun = bun;
})();

/* ============================================================
   Drinks & desserts
   ============================================================ */
(() => {
  const { register } = Painter;
  const { rgba, shade, circle, ellipse, blob, roundRect, leafPath, shadow, noShadow, litFill, gloss, speckle,
    scatter, plate, bowl, bowlInnerShade, saucer, coaster, goldRing, leaf, sprig, flecks, limeHalf, walnut, pomSeeds, roses } = Painter.T;

  /* ---------- cold glass, seen from above ---------- */
  function glass(ctx, R, o) {
    const x = 500, y = 500, r = o.r || 300;
    coaster(ctx, R);
    // glass wall shadow & body
    ctx.save(); shadow(ctx, 40, 24, 0.6); ctx.fillStyle = 'rgba(255,255,255,0.04)'; circle(ctx, x, y, r); ctx.fill(); ctx.restore();
    // liquid
    const lr = r * 0.9;
    ctx.save(); circle(ctx, x, y, lr); ctx.clip();
    const lg = ctx.createRadialGradient(x - lr * 0.3, y - lr * 0.3, lr * 0.05, x, y, lr);
    lg.addColorStop(0, shade(o.liquid, 0.35)); lg.addColorStop(0.6, o.liquid); lg.addColorStop(1, shade(o.liquid, -0.45));
    ctx.fillStyle = lg; ctx.fillRect(0, 0, 1000, 1000);
    if (o.flecks) flecks(ctx, R, x, y, lr * 0.9, o.flecks[1], o.flecks[0], 3.5, 0.8);
    if (o.bubbles) for (let i = 0; i < o.bubbles; i++) { const [bx, by] = R.disc(x, y, lr * 0.95), br = R.range(2, 7); ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1.2; circle(ctx, bx, by, br); ctx.stroke(); }
    if (o.foamRing) { ctx.strokeStyle = rgba(o.foamRing, 0.6); ctx.lineWidth = 16; circle(ctx, x, y, lr - 6); ctx.stroke(); speckle(ctx, R, x, y, lr, 300, [o.foamRing], 1, 4, 0.3, 0.8); }
    ctx.restore();
    // ice
    if (o.ice) for (const [ix, iy] of scatter(R, x, y, lr * 0.6, o.ice, 70)) {
      ctx.save(); ctx.translate(ix, iy); ctx.rotate(R() * 3);
      ctx.fillStyle = 'rgba(255,255,255,0.18)'; roundRect(ctx, -38, -38, 76, 76, 14); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2.5; roundRect(ctx, -38, -38, 76, 76, 14); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; roundRect(ctx, -30, -30, 30, 12, 6); ctx.fill();
      ctx.restore();
    }
    if (o.garnish) o.garnish(x, y, lr);
    // straw
    if (o.straw) {
      ctx.save(); shadow(ctx, 10, 6, 0.5); ctx.fillStyle = o.straw; circle(ctx, x + lr * 0.45, y - lr * 0.42, 15); ctx.fill(); ctx.restore();
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; circle(ctx, x + lr * 0.45, y - lr * 0.42, 9); ctx.fill();
    }
    // rim: bright glass edge
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = r * 0.1; circle(ctx, x, y, r * 0.95); ctx.stroke();
    const rg = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
    rg.addColorStop(0, 'rgba(255,255,255,0.9)'); rg.addColorStop(0.3, 'rgba(255,255,255,0.15)'); rg.addColorStop(0.7, 'rgba(255,255,255,0.05)'); rg.addColorStop(1, 'rgba(255,255,255,0.55)');
    ctx.strokeStyle = rg; ctx.lineWidth = 4; circle(ctx, x, y, r); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2; circle(ctx, x, y, r * 0.9); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(x, y, r * 0.95, 3.6, 4.3); ctx.stroke();
  }
  function lemonSlice(ctx, R, x, y, r, col = '#f2d12a') {
    ctx.save(); shadow(ctx, 8, 4, 0.4); ctx.fillStyle = col; circle(ctx, x, y, r); ctx.fill(); ctx.restore();
    ctx.fillStyle = '#fbf6dc'; circle(ctx, x, y, r * 0.9); ctx.fill();
    ctx.fillStyle = shade(col, 0.35); for (let i = 0; i < 10; i++) { const a = i / 10 * 6.28; ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, r * 0.82, a + 0.05, a + 0.58); ctx.closePath(); ctx.fill(); }
    gloss(ctx, x - r * 0.3, y - r * 0.3, r * 0.4, r * 0.15, 0.4);
  }
  function mint(ctx, R, x, y, n = 5) { for (let i = 0; i < n; i++) { const a = i / n * 6.28 + R(); leaf(ctx, R, x + Math.cos(a) * 26, y + Math.sin(a) * 26, R.range(50, 66), a, '#3f8a2a'); } }

  register('doogh', (ctx, R) => glass(ctx, R, { liquid: '#eef0e8', flecks: [['#4a6a2a', '#6a8a3a'], 180], ice: 2, garnish: (x, y) => mint(ctx, R, x - 60, y + 50, 6) }));
  register('cola', (ctx, R) => glass(ctx, R, { liquid: '#3a160a', ice: 3, bubbles: 60, foamRing: '#c89a6a', straw: '#e8e2d6', garnish: (x, y) => lemonSlice(ctx, R, x - 90, y + 90, 62) }));
  register('lemonade', (ctx, R) => glass(ctx, R, { liquid: '#f2e48a', ice: 3, bubbles: 40, straw: '#f2d12a', garnish: (x, y) => { lemonSlice(ctx, R, x - 70, y + 80, 64); mint(ctx, R, x + 90, y + 100, 4); } }));
  register('mojito', (ctx, R) => glass(ctx, R, { liquid: '#cfe6a0', ice: 4, bubbles: 50, straw: '#2a2a2a', garnish: (x, y) => { mint(ctx, R, x - 40, y - 20, 7); mint(ctx, R, x + 80, y + 90, 5); limeHalf(ctx, R, x - 110, y + 110, 50, '#7fb83a'); } }));
  register('sekanjabin', (ctx, R) => glass(ctx, R, { liquid: '#d8d27a', ice: 3, flecks: [['#a8c86a', '#c8e08a'], 220], garnish: (x, y) => { mint(ctx, R, x + 60, y + 70, 6); } }));
  register('water', (ctx, R) => glass(ctx, R, { liquid: '#2a3a44', ice: 2, bubbles: 90, garnish: (x, y) => lemonSlice(ctx, R, x + 80, y + 80, 52, '#e8d34a') }));
  register('shake', (ctx, R) => glass(ctx, R, { liquid: '#5a2e18', straw: '#f4efe2', garnish: (x, y, lr) => {
    ctx.save(); shadow(ctx, 16, 8, 0.5);
    for (let k = 0; k < 4; k++) { ctx.fillStyle = litFill(ctx, x, y, lr * 0.7, '#ffffff', '#f2ece0', '#c8bca4'); blob(ctx, x, y, lr * (0.7 - k * 0.15), R, 0.08, 8); ctx.fill(); }
    ctx.restore();
    for (let i = 0; i < 40; i++) { const [cx, cy] = R.disc(x, y, lr * 0.55); ctx.fillStyle = rgba('#3a1a0a', 0.9); ctx.save(); ctx.translate(cx, cy); ctx.rotate(R() * 3); ctx.fillRect(-8, -2, 16, 4); ctx.restore(); }
    ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(70,30,10,0.85)'; ctx.lineWidth = 6; ctx.beginPath(); for (let t = 0; t < 12; t += 0.1) ctx.lineTo(x + Math.cos(t) * t * 14, y + Math.sin(t) * t * 14); ctx.stroke();
  } }));

  /* ---------- hot drinks ---------- */
  function cup(ctx, R, r, liquidFn, o = {}) {
    const x = 500, y = 500;
    saucer(ctx, R);
    // handle
    ctx.save(); shadow(ctx, 14, 8, 0.6); ctx.strokeStyle = o.cupCol || '#141416'; ctx.lineWidth = 28; ctx.beginPath(); ctx.arc(x + r + 40, y + 20, 46, -1.3, 1.6); ctx.stroke(); ctx.restore();
    ctx.save(); shadow(ctx, 30, 16, 0.75); ctx.fillStyle = o.cupCol || '#141416'; circle(ctx, x, y, r); ctx.fill(); ctx.restore();
    ctx.fillStyle = litFill(ctx, x, y, r, o.cupCol ? shade(o.cupCol, 0.2) : '#3a3a40', o.cupCol || '#1a1a1d', '#08080a'); circle(ctx, x, y, r); ctx.fill();
    goldRing(ctx, x, y, r - 5, 3);
    const lr = r * 0.86;
    ctx.save(); circle(ctx, x, y, lr); ctx.clip(); liquidFn(x, y, lr); ctx.restore();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 6; circle(ctx, x, y, lr); ctx.stroke();
    if (o.spoon) { ctx.save(); ctx.translate(x - r - 70, y + 80); ctx.rotate(1.1); shadow(ctx, 8, 5, 0.5); const g = ctx.createLinearGradient(-10, 0, 10, 0); g.addColorStop(0, '#f0d79a'); g.addColorStop(1, '#8a6326'); ctx.fillStyle = g; roundRect(ctx, -7, -120, 14, 150, 7); ctx.fill(); ellipse(ctx, 0, 50, 26, 36); ctx.fill(); ctx.restore(); }
  }
  function crema(x, y, r, R, ctx, base, light) {
    const g = ctx.createRadialGradient(x - r * 0.2, y - r * 0.2, 0, x, y, r);
    g.addColorStop(0, light); g.addColorStop(0.7, base); g.addColorStop(1, shade(base, -0.5));
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1000, 1000);
    speckle(ctx, R, x, y, r, 500, [shade(base, -0.4), light], 1, 3.5, 0.25, 0.6);
  }
  function latteArt(ctx, R, x, y, r, kind) {
    ctx.fillStyle = 'rgba(255,250,240,0.95)';
    if (kind === 'heart') {
      ctx.beginPath(); ctx.moveTo(x, y + r * 0.45);
      ctx.bezierCurveTo(x - r * 0.75, y - r * 0.05, x - r * 0.45, y - r * 0.6, x, y - r * 0.25);
      ctx.bezierCurveTo(x + r * 0.45, y - r * 0.6, x + r * 0.75, y - r * 0.05, x, y + r * 0.45); ctx.fill();
    } else {
      for (let i = 0; i < 6; i++) { const yy = y + r * 0.4 - i * r * 0.14, w = r * (0.62 - i * 0.07); ellipse(ctx, x, yy, w, r * 0.07, 0); ctx.fill(); ctx.fillStyle = 'rgba(170,110,60,0.9)'; ellipse(ctx, x, yy + r * 0.03, w * 0.92, r * 0.03, 0); ctx.fill(); ctx.fillStyle = 'rgba(255,250,240,0.95)'; }
      ctx.strokeStyle = 'rgba(255,250,240,0.95)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x, y + r * 0.6); ctx.lineTo(x, y - r * 0.5); ctx.stroke();
    }
  }
  register('espresso', (ctx, R) => cup(ctx, R, 180, (x, y, r) => crema(x, y, r, R, ctx, '#a8622a', '#e8b878'), { spoon: true }));
  register('cappuccino', (ctx, R) => cup(ctx, R, 250, (x, y, r) => { crema(x, y, r, R, ctx, '#9a5a2a', '#d8a068'); latteArt(ctx, R, x, y, r, 'rosetta'); speckle(ctx, R, x, y, r, 160, ['#4a2210'], 1, 2.4, 0.5, 0.9); }));
  register('latte', (ctx, R) => cup(ctx, R, 260, (x, y, r) => { crema(x, y, r, R, ctx, '#b07040', '#e4b888'); latteArt(ctx, R, x, y + 10, r * 0.9, 'heart'); }, { cupCol: '#e9e4da' }));
  function teaGlass(ctx, R, liquid, extra) {
    const x = 500, y = 500;
    saucer(ctx, R);
    ctx.save(); shadow(ctx, 30, 16, 0.6); ctx.fillStyle = 'rgba(255,255,255,0.06)'; circle(ctx, x, y, 210); ctx.fill(); ctx.restore();
    ctx.save(); circle(ctx, x, y, 196); ctx.clip();
    const g = ctx.createRadialGradient(x - 60, y - 60, 10, x, y, 196);
    g.addColorStop(0, shade(liquid, 0.45)); g.addColorStop(0.6, liquid); g.addColorStop(1, shade(liquid, -0.55));
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1000, 1000);
    if (extra) extra(x, y);
    ctx.restore();
    const rg = ctx.createLinearGradient(x - 220, y - 220, x + 220, y + 220);
    rg.addColorStop(0, 'rgba(255,255,255,0.85)'); rg.addColorStop(0.4, 'rgba(255,255,255,0.1)'); rg.addColorStop(1, 'rgba(255,255,255,0.5)');
    ctx.strokeStyle = rg; ctx.lineWidth = 8; circle(ctx, x, y, 210); ctx.stroke();
    goldRing(ctx, x, y, 216, 3);
    ctx.strokeStyle = 'rgba(255,255,255,0.65)'; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(x, y, 196, 3.7, 4.4); ctx.stroke();
  }
  function nabat(ctx, R, x, y, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.save(); shadow(ctx, 8, 5, 0.5); ctx.fillStyle = '#c8a56a'; roundRect(ctx, -170, -5, 340, 10, 5); ctx.fill(); ctx.restore();
    for (let i = 0; i < 26; i++) { const cx = R.range(-60, 160), cy = R.range(-26, 26); ctx.save(); ctx.translate(cx, cy); ctx.rotate(R() * 3); shadow(ctx, 4, 2, 0.4); ctx.fillStyle = litFill(ctx, 0, 0, 20, '#fff4c8', '#f2c450', '#b07810'); ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(16, 0); ctx.lineTo(0, 18); ctx.lineTo(-14, 0); ctx.closePath(); ctx.fill(); ctx.restore(); }
    ctx.restore();
  }
  register('tea', (ctx, R) => { teaGlass(ctx, R, '#8a2a0a'); nabat(ctx, R, 520, 820, -0.25); });
  register('tea-saffron', (ctx, R) => { teaGlass(ctx, R, '#c8520a', (x, y) => { ctx.strokeStyle = '#a80e06'; ctx.lineWidth = 2.5; for (let i = 0; i < 12; i++) { const [sx, sy] = R.disc(x, y, 150); ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx + 10, sy + 6, sx + R.range(14, 26), sy + R.range(-10, 10)); ctx.stroke(); } }); nabat(ctx, R, 520, 820, -0.25); });
  register('tea-borage', (ctx, R) => { teaGlass(ctx, R, '#5a3a8a', (x, y) => { for (let i = 0; i < 7; i++) { const [fx, fy] = R.disc(x, y, 130); for (let p = 0; p < 5; p++) { const a = p / 5 * 6.28; ctx.fillStyle = rgba('#7a5ac8', 0.9); leafPath(ctx, fx + Math.cos(a) * 12, fy + Math.sin(a) * 12, 24, 12, a); ctx.fill(); } ctx.fillStyle = '#e8d8ff'; circle(ctx, fx, fy, 5); ctx.fill(); } }); lemonSlice(ctx, R, 800, 760, 50, '#e8d34a'); });

  /* ---------- desserts ---------- */
  register('sholeh-zard', (ctx, R) => {
    const b = bowl(ctx, R);
    ctx.fillStyle = litFill(ctx, b.x, b.y, b.food, '#ffe27a', '#f2b22a', '#a8680a'); circle(ctx, b.x, b.y, b.food); ctx.fill();
    ctx.save(); circle(ctx, b.x, b.y, b.food); ctx.clip();
    speckle(ctx, R, b.x, b.y, b.food, 600, ['#fff0a8', '#d8920a'], 2, 5, 0.2, 0.5);
    ctx.strokeStyle = 'rgba(120,50,10,0.9)'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    for (let k = -3; k <= 3; k++) { ctx.beginPath(); ctx.moveTo(b.x - 300, b.y + k * 70 - 300); ctx.lineTo(b.x + 300, b.y + k * 70 + 300); ctx.stroke(); ctx.beginPath(); ctx.moveTo(b.x + 300, b.y + k * 70 - 300); ctx.lineTo(b.x - 300, b.y + k * 70 + 300); ctx.stroke(); }
    ctx.restore();
    for (let i = 0; i < 20; i++) { const [x, y] = R.disc(b.x, b.y, 80); ctx.save(); ctx.translate(x, y); ctx.rotate(R() * 3); ctx.fillStyle = R() < 0.5 ? '#f6ecd4' : '#7fae3c'; roundRect(ctx, -11, -3, 22, 6, 3); ctx.fill(); ctx.restore(); }
    roses(ctx, R, b.x, b.y, 60, 8);
    bowlInnerShade(ctx, b);
    gloss(ctx, b.x - 100, b.y - 120, 140, 34, 0.25);
  });
  register('faloodeh', (ctx, R) => {
    const b = bowl(ctx, R);
    ctx.fillStyle = '#e8eef2'; circle(ctx, b.x, b.y, b.food); ctx.fill();
    ctx.save(); circle(ctx, b.x, b.y, b.food); ctx.clip(); ctx.lineCap = 'round';
    for (let i = 0; i < 220; i++) { ctx.strokeStyle = rgba(R() < 0.5 ? '#ffffff' : '#c8d4dc', 0.85); ctx.lineWidth = 3.5; ctx.beginPath(); const [x, y] = R.disc(b.x, b.y, b.food); ctx.moveTo(x, y); ctx.bezierCurveTo(x + R.range(-60, 60), y + R.range(-60, 60), x + R.range(-60, 60), y + R.range(-60, 60), x + R.range(-90, 90), y + R.range(-90, 90)); ctx.stroke(); }
    ctx.restore();
    ctx.save(); shadow(ctx, 6, 3, 0.4); ctx.fillStyle = rgba('#a8102a', 0.88); blob(ctx, b.x + 30, b.y - 20, 120, R, 0.25, 4); ctx.fill(); ctx.restore();
    gloss(ctx, b.x, b.y - 50, 70, 18, 0.4);
    limeHalf(ctx, R, b.x - 130, b.y + 110, 52, '#9bc23a');
    bowlInnerShade(ctx, b);
  });
  register('bastani', (ctx, R) => {
    const b = bowl(ctx, R);
    ctx.fillStyle = '#2a1a0a'; circle(ctx, b.x, b.y, b.food); ctx.fill();
    for (const [x, y] of [[b.x - 90, b.y + 60], [b.x + 90, b.y + 50], [b.x, b.y - 90]]) {
      ctx.save(); shadow(ctx, 20, 12, 0.6); ctx.fillStyle = litFill(ctx, x, y, 130, '#fff1a8', '#f2c44a', '#a8780a'); blob(ctx, x, y, 125, R, 0.06, 9); ctx.fill(); ctx.restore();
      ctx.save(); blob(ctx, x, y, 125, R, 0.06, 9); ctx.clip();
      for (let i = 0; i < 16; i++) { ctx.strokeStyle = rgba('#ffffff', 0.35); ctx.lineWidth = 3; ctx.beginPath(); const a = R() * 6.28; ctx.arc(x, y, R.range(30, 120), a, a + 0.9); ctx.stroke(); }
      for (let i = 0; i < 8; i++) { ctx.fillStyle = rgba('#fffaf0', 0.95); blob(ctx, ...R.disc(x, y, 90), R.range(8, 16), R, 0.3, 3); ctx.fill(); }
      ctx.restore();
    }
    for (let i = 0; i < 80; i++) { const [x, y] = R.disc(b.x, b.y, 220); ctx.fillStyle = rgba(R.pick(['#7fae3c', '#a8c85a', '#5a8a2a']), 0.95); blob(ctx, x, y, R.range(3, 6), R, 0.3, 3); ctx.fill(); }
    roses(ctx, R, b.x, b.y, 120, 10);
    bowlInnerShade(ctx, b);
  });
  register('tiramisu', (ctx, R) => {
    plate(ctx, R);
    ctx.save(); ctx.translate(500, 500); ctx.rotate(-0.25);
    ctx.save(); shadow(ctx, 30, 18, 0.75); ctx.fillStyle = '#f2e6cc'; roundRect(ctx, -170, -170, 340, 340, 22); ctx.fill(); ctx.restore();
    roundRect(ctx, -160, -160, 320, 320, 20); ctx.save(); ctx.clip();
    ctx.fillStyle = litFill(ctx, 0, 0, 230, '#8a5a3a', '#5a3218', '#2a1406'); ctx.fillRect(-170, -170, 340, 340);
    speckle(ctx, R, 0, 0, 230, 2400, ['#3a1a08', '#9a6a44', '#1a0a02'], 1, 3, 0.3, 0.8);
    ctx.restore();
    ctx.restore();
    for (let i = 0; i < 3; i++) { const x = 330 + i * 30, y = 760 - i * 20; ctx.save(); shadow(ctx, 6, 3, 0.5); ctx.fillStyle = litFill(ctx, x, y, 18, '#7a4a2a', '#3a1a08', '#120602'); ellipse(ctx, x, y, 18, 13, 0.5); ctx.fill(); ctx.restore(); ctx.strokeStyle = '#120602'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x - 14, y - 4); ctx.quadraticCurveTo(x, y + 4, x + 14, y - 2); ctx.stroke(); }
    sprig(ctx, R, 720, 280, 4, 40, '#3f8a2a');
  });
  register('cheesecake', (ctx, R) => {
    plate(ctx, R);
    ctx.save(); ctx.translate(500, 520); ctx.rotate(0.3);
    ctx.save(); shadow(ctx, 30, 18, 0.75);
    ctx.fillStyle = '#c8924a'; ctx.beginPath(); ctx.moveTo(-40, -260); ctx.arc(-40, -260, 470, 1.24, 1.9); ctx.closePath(); ctx.fill(); ctx.restore();
    ctx.fillStyle = litFill(ctx, -40, 0, 300, '#fffaf0', '#f4e8cc', '#c8b088'); ctx.beginPath(); ctx.moveTo(-40, -230); ctx.arc(-40, -260, 440, 1.25, 1.89); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.save(); shadow(ctx, 8, 4, 0.4); ctx.fillStyle = rgba('#9a0a2a', 0.9); blob(ctx, 500, 640, 110, R, 0.2, 5); ctx.fill(); ctx.restore();
    for (let i = 0; i < 7; i++) { const [x, y] = R.disc(500, 640, 90); ctx.save(); shadow(ctx, 6, 3, 0.5); ctx.fillStyle = litFill(ctx, x, y, 22, '#ff6a8a', '#b8102e', '#4a0210'); circle(ctx, x, y, 20); ctx.fill(); ctx.restore(); ctx.fillStyle = 'rgba(255,255,255,0.7)'; circle(ctx, x - 6, y - 6, 4); ctx.fill(); }
    sprig(ctx, R, 600, 720, 3, 38, '#3f8a2a');
  });
  register('baklava', (ctx, R) => {
    plate(ctx, R);
    const pts = [[380, 380], [560, 360], [460, 520], [640, 520], [360, 640], [540, 680]];
    for (const [x, y] of pts) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(0.6 + R.range(-0.05, 0.05)); shadow(ctx, 16, 10, 0.7);
      ctx.fillStyle = litFill(ctx, 0, 0, 110, '#ffd27a', '#d28a2a', '#6a3a08'); ctx.beginPath(); ctx.moveTo(0, -100); ctx.lineTo(70, 0); ctx.lineTo(0, 100); ctx.lineTo(-70, 0); ctx.closePath(); ctx.fill(); noShadow(ctx);
      ctx.strokeStyle = 'rgba(120,60,10,0.6)'; ctx.lineWidth = 2; for (let k = 1; k < 5; k++) { ctx.beginPath(); ctx.moveTo(0, -100 + k * 9); ctx.lineTo(70 - k * 6, 0); ctx.lineTo(0, 100 - k * 9); ctx.lineTo(-70 + k * 6, 0); ctx.closePath(); ctx.stroke(); }
      for (let i = 0; i < 30; i++) { ctx.fillStyle = rgba(R.pick(['#7fae3c', '#a8c85a', '#4a7a1a']), 0.95); blob(ctx, R.range(-20, 20), R.range(-30, 30), R.range(3, 6), R, 0.3, 3); ctx.fill(); }
      gloss(ctx, -15, -30, 26, 10, 0.45);
      ctx.restore();
    }
  });
})();

/* ============================================================
   Ingredient icons (customisation chips, pizza toppings, burger layers)
   Drawn centred in the 1000 design space on a transparent ground.
   ============================================================ */
(() => {
  const { register } = Painter;
  const T = Painter.T;
  const { rgba, shade, circle, ellipse, blob, roundRect, leafPath, shadow, noShadow, litFill, gloss, speckle, leaf, sprig, flecks, tomatoGrilled, limeHalf } = T;
  const top = () => T.pizzaTop;
  const C = 500;
  const ING = {
    sumac: (ctx, R) => { ctx.save(); shadow(ctx, 30, 16, 0.5); ctx.fillStyle = '#4a0a0c'; blob(ctx, C, C + 40, 300, R, 0.12, 6); ctx.fill(); ctx.restore(); speckle(ctx, R, C, C + 30, 300, 2600, ['#6a0f12', '#8e1f1c', '#4a0a0c', '#b03a2a'], 3, 9, 0.7, 1); },
    onion: (ctx, R) => { for (let i = 0; i < 4; i++) { const r = 330 - i * 70; ctx.strokeStyle = i % 2 ? 'rgba(176,96,170,0.9)' : 'rgba(250,240,250,0.95)'; ctx.lineWidth = 44; ctx.beginPath(); ctx.ellipse(C, C, r, r * 0.92, 0, 0, Math.PI * 2); ctx.stroke(); } gloss(ctx, C - 120, C - 140, 120, 40, 0.3); },
    'onion-fried': (ctx, R) => { for (let i = 0; i < 60; i++) { const [x, y] = R.disc(C, C, 300); ctx.fillStyle = rgba(R.pick(['#c87a28', '#8a4a10', '#e8a040']), 0.95); blob(ctx, x, y, R.range(24, 50), R, 0.4, 3); ctx.fill(); } },
    tomato: (ctx, R) => tomatoGrilled(ctx, R, C, C, 330),
    butter: (ctx, R) => { ctx.save(); shadow(ctx, 40, 20, 0.4); ctx.fillStyle = litFill(ctx, C, C, 360, '#fffbe0', '#f6e39a', '#c8a84a'); ctx.translate(C, C); ctx.rotate(-0.25); roundRect(ctx, -300, -220, 600, 440, 90); ctx.fill(); ctx.restore(); gloss(ctx, C - 80, C - 100, 180, 50, 0.6); },
    lime: (ctx, R) => { ctx.save(); shadow(ctx, 30, 16, 0.5); ctx.fillStyle = litFill(ctx, C, C, 330, '#a8865a', '#5a3e1a', '#1e1206'); blob(ctx, C, C, 320, R, 0.06, 7); ctx.fill(); ctx.restore(); ctx.strokeStyle = 'rgba(15,8,0,0.6)'; ctx.lineWidth = 12; for (let i = 0; i < 8; i++) { ctx.beginPath(); const a = R() * 6.28; ctx.arc(C, C, R.range(80, 300), a, a + 0.9); ctx.stroke(); } gloss(ctx, C - 110, C - 120, 120, 50, 0.35); },
    fries: (ctx, R) => T.friesPile(ctx, R, C, C, 240, 16),
    barberry: (ctx, R) => { for (let i = 0; i < 40; i++) { const [x, y] = R.disc(C, C, 300); ctx.save(); shadow(ctx, 10, 5, 0.5); ctx.fillStyle = litFill(ctx, x, y, 50, '#ff6a6a', '#c3121e', '#5a0408'); ellipse(ctx, x, y, 52, 40, R() * 3); ctx.fill(); ctx.restore(); ctx.fillStyle = 'rgba(255,255,255,0.7)'; circle(ctx, x - 14, y - 14, 10); ctx.fill(); } },
    pistachio: (ctx, R) => { for (let i = 0; i < 26; i++) { const [x, y] = R.disc(C, C, 280); ctx.save(); ctx.translate(x, y); ctx.rotate(R() * 3); ctx.fillStyle = R() < 0.6 ? '#7fae3c' : '#c9d88a'; roundRect(ctx, -80, -22, 160, 44, 22); ctx.fill(); ctx.restore(); } },
    almond: (ctx, R) => { for (let i = 0; i < 22; i++) { const [x, y] = R.disc(C, C, 280); ctx.save(); ctx.translate(x, y); ctx.rotate(R() * 3); ctx.fillStyle = '#f6ecd4'; roundRect(ctx, -90, -18, 180, 36, 18); ctx.fill(); ctx.restore(); } },
    mint: (ctx, R) => { for (let i = 0; i < 6; i++) leaf(ctx, R, C + Math.cos(i) * 140, C + Math.sin(i) * 140, 300, i, '#3f8a2a'); },
    herb: (ctx, R) => sprig(ctx, R, C, C, 8, 300, '#3f7a2a'),
    walnut: (ctx, R) => { for (let i = 0; i < 6; i++) T.walnut(ctx, R, ...R.disc(C, C, 220), R.range(110, 150)); },
    olive: (ctx, R) => { for (let i = 0; i < 4; i++) { const [x, y] = R.disc(C, C, 180); ctx.save(); shadow(ctx, 20, 10, 0.5); ctx.fillStyle = litFill(ctx, x, y, 170, '#5a6a2a', '#1a1a10', '#050505'); ellipse(ctx, x, y, 170, 130, R() * 3); ctx.fill(); ctx.restore(); gloss(ctx, x - 50, y - 50, 50, 22, 0.6); } },
    pepper: (ctx, R) => { for (let i = 0; i < 4; i++) { ctx.save(); ctx.translate(C, C); ctx.rotate(i * 1.5); shadow(ctx, 14, 8, 0.4); ctx.strokeStyle = i % 2 ? '#3f8a2a' : '#c8281a'; ctx.lineWidth = 70; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(0, 0, 220, 0.2, 1.6); ctx.stroke(); ctx.restore(); } },
    mushroom: (ctx, R) => { top().mushroom(ctx, R, C - 60, C - 40, 230); top().mushroom(ctx, R, C + 120, C + 130, 170); },
    pickle: (ctx, R) => { for (let i = 0; i < 4; i++) { const [x, y] = R.disc(C, C, 200); ctx.save(); shadow(ctx, 14, 8, 0.4); ctx.fillStyle = litFill(ctx, x, y, 150, '#c6d87a', '#7a9a2a', '#3a4a0a'); circle(ctx, x, y, 150); ctx.fill(); ctx.restore(); speckle(ctx, R, x, y, 90, 30, ['#f0f4c8'], 6, 12, 0.7, 1); } },
    lettuce: (ctx, R) => { ctx.save(); shadow(ctx, 20, 10, 0.4); ctx.fillStyle = litFill(ctx, C, C, 380, '#c6ec7a', '#6aa82a', '#2a5a0a'); blob(ctx, C, C, 330, R, 0.07, 16); ctx.fill(); ctx.restore(); ctx.strokeStyle = 'rgba(240,250,210,0.7)'; ctx.lineWidth = 14; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(C, C); ctx.lineTo(C + Math.cos(i) * 280, C + Math.sin(i) * 280); ctx.stroke(); } },
    sauce: (ctx, R) => T.ramekin(ctx, R, C, C, 330, '#d8a63a', { swirl: '#f4e8c0' }),
    parmesan: (ctx, R) => { for (let i = 0; i < 14; i++) { const [x, y] = R.disc(C, C, 260); ctx.save(); ctx.translate(x, y); ctx.rotate(R() * 3); shadow(ctx, 10, 6, 0.35); ctx.fillStyle = litFill(ctx, 0, 0, 90, '#fffbe8', '#f2e6bc', '#c9b480'); ctx.beginPath(); ctx.moveTo(-90, -24); ctx.lineTo(80, -40); ctx.lineTo(100, 20); ctx.lineTo(-70, 36); ctx.closePath(); ctx.fill(); ctx.restore(); } },
    'pepper-black': (ctx, R) => speckle(ctx, R, C, C, 280, 300, ['#1a1410', '#3a2e24'], 8, 18, 0.8, 1),
    crouton: (ctx, R) => T.cubes(ctx, R, C, C, 230, 8, ['#ffe39a', '#d89a3a', '#7a4a10'], 150),
    ice: (ctx, R) => { for (let i = 0; i < 3; i++) { const [x, y] = R.disc(C, C, 160); ctx.save(); ctx.translate(x, y); ctx.rotate(R() * 1); ctx.fillStyle = 'rgba(200,230,255,0.35)'; roundRect(ctx, -170, -170, 340, 340, 60); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 12; ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,0.6)'; roundRect(ctx, -130, -130, 140, 40, 20); ctx.fill(); ctx.restore(); } },
    nabat: (ctx, R) => { for (let i = 0; i < 22; i++) { const [x, y] = R.disc(C, C, 260); ctx.save(); ctx.translate(x, y); ctx.rotate(R() * 3); shadow(ctx, 10, 5, 0.4); ctx.fillStyle = litFill(ctx, 0, 0, 90, '#fff4c8', '#f2c450', '#b07810'); ctx.beginPath(); ctx.moveTo(0, -90); ctx.lineTo(80, 0); ctx.lineTo(0, 90); ctx.lineTo(-70, 0); ctx.closePath(); ctx.fill(); ctx.restore(); } },
    sugar: (ctx, R) => { for (let i = 0; i < 3; i++) { const [x, y] = R.disc(C, C, 150); ctx.save(); ctx.translate(x, y); ctx.rotate(R()); shadow(ctx, 14, 8, 0.4); ctx.fillStyle = litFill(ctx, 0, 0, 200, '#ffffff', '#f2eee6', '#c8c0b0'); roundRect(ctx, -150, -150, 300, 300, 30); ctx.fill(); ctx.restore(); } },
    cinnamon: (ctx, R) => { for (let i = 0; i < 3; i++) { ctx.save(); ctx.translate(C, C + (i - 1) * 130); ctx.rotate(-0.3); shadow(ctx, 14, 8, 0.4); const g = ctx.createLinearGradient(0, -50, 0, 50); g.addColorStop(0, '#c87a40'); g.addColorStop(1, '#5a2a10'); ctx.fillStyle = g; roundRect(ctx, -330, -50, 660, 100, 50); ctx.fill(); ctx.restore(); } },
    rose: (ctx, R) => T.roses(ctx, R, C, C, 260, 30),
    skewer: (ctx, R) => { ctx.save(); ctx.translate(C, C); ctx.rotate(-0.8); const g = ctx.createLinearGradient(0, -20, 0, 20); g.addColorStop(0, '#e9ecef'); g.addColorStop(1, '#3d4247'); ctx.fillStyle = g; ctx.fillRect(-420, -16, 840, 32); const mg = ctx.createLinearGradient(0, -90, 0, 90); mg.addColorStop(0, '#3a1a0a'); mg.addColorStop(0.4, '#ae6630'); mg.addColorStop(1, '#241005'); ctx.fillStyle = mg; roundRect(ctx, -300, -90, 600, 180, 90); ctx.fill(); ctx.fillStyle = 'rgba(30,10,2,0.5)'; for (let x = -260; x < 280; x += 70) ctx.fillRect(x, -90, 16, 180); ctx.restore(); },
    tahdig: (ctx, R) => { ctx.save(); shadow(ctx, 30, 14, 0.5); ctx.fillStyle = litFill(ctx, C, C, 360, '#ffd36a', '#e08a1a', '#7a3a06'); ctx.beginPath(); ctx.moveTo(C, C); ctx.arc(C, C, 340, -0.6, 1.2); ctx.closePath(); ctx.fill(); ctx.restore(); speckle(ctx, R, C + 120, C + 60, 200, 260, ['#ffe9a8', '#a2520e'], 4, 9, 0.4, 0.8); },
    saffron: (ctx, R) => { ctx.strokeStyle = '#c4220e'; ctx.lineWidth = 22; ctx.lineCap = 'round'; for (let i = 0; i < 14; i++) { const [x, y] = R.disc(C, C, 240); ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 60, y + 40, x + R.range(100, 160), y + R.range(-60, 60)); ctx.stroke(); } },
    meat: (ctx, R) => { for (let i = 0; i < 5; i++) T.chunk(ctx, R, ...R.disc(C, C, 200), R.range(110, 140), 'beef'); },
    chicken: (ctx, R) => { for (let i = 0; i < 5; i++) T.chunk(ctx, R, ...R.disc(C, C, 200), R.range(110, 140), 'chicken'); },
    rice: (ctx, R) => T.rice(ctx, R, C, C, 320, { saffron: true }),
    bread: (ctx, R) => { ctx.save(); shadow(ctx, 30, 14, 0.5); ctx.fillStyle = litFill(ctx, C, C, 380, '#f2c070', '#c07a30', '#5a2a08'); ctx.translate(C, C); ctx.rotate(-0.3); roundRect(ctx, -360, -220, 720, 440, 160); ctx.fill(); ctx.restore(); speckle(ctx, R, C, C, 280, 220, ['#3a1a08', '#fff0c8'], 5, 10, 0.4, 0.8); },
    kashk: (ctx, R) => T.ramekin(ctx, R, C, C, 330, '#f2ecdc'),
    cheese: (ctx, R) => { ctx.save(); shadow(ctx, 30, 16, 0.45); ctx.fillStyle = litFill(ctx, C, C, 380, '#ffe08a', '#f2a51a', '#b8680a'); ctx.translate(C, C); ctx.rotate(0.3); ctx.beginPath(); ctx.moveTo(-330, -260); ctx.lineTo(330, -260); ctx.lineTo(300, 120); ctx.quadraticCurveTo(200, 330, 120, 140); ctx.quadraticCurveTo(0, 300, -120, 160); ctx.lineTo(-330, 220); ctx.closePath(); ctx.fill(); ctx.restore(); gloss(ctx, C - 100, C - 140, 160, 50, 0.45); },
    jalapeno: (ctx, R) => { for (let i = 0; i < 4; i++) top().jalapeno(ctx, R, ...R.disc(C, C, 200), 140); },
    dough: (ctx, R) => { ctx.save(); shadow(ctx, 30, 14, 0.45); ctx.fillStyle = litFill(ctx, C, C, 380, '#fff4dc', '#f0dcb4', '#c8a878'); blob(ctx, C, C, 340, R, 0.03, 5); ctx.fill(); ctx.restore(); speckle(ctx, R, C, C, 320, 300, ['#ffffff'], 3, 7, 0.4, 0.9); },
    patty: (ctx, R) => { ctx.save(); shadow(ctx, 30, 16, 0.5); ctx.fillStyle = litFill(ctx, C, C, 380, '#8a4e2a', '#4a2212', '#1a0802'); blob(ctx, C, C, 350, R, 0.05, 7); ctx.fill(); ctx.restore(); ctx.strokeStyle = 'rgba(15,4,0,0.55)'; ctx.lineWidth = 40; for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(C - 320, C + k * 130 - 80); ctx.lineTo(C + 320, C + k * 130 + 80); ctx.stroke(); } speckle(ctx, R, C, C, 330, 300, ['#c88a5a', '#1a0802'], 4, 10, 0.3, 0.7); },
    glass: (ctx, R) => { ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 26; ctx.beginPath(); ctx.moveTo(C - 230, C - 330); ctx.lineTo(C - 180, C + 330); ctx.lineTo(C + 180, C + 330); ctx.lineTo(C + 230, C - 330); ctx.stroke(); ctx.fillStyle = 'rgba(240,210,90,0.85)'; ctx.beginPath(); ctx.moveTo(C - 215, C - 120); ctx.lineTo(C - 190, C + 316); ctx.lineTo(C + 190, C + 316); ctx.lineTo(C + 215, C - 120); ctx.closePath(); ctx.fill(); },
    milk: (ctx, R) => { ctx.save(); shadow(ctx, 30, 14, 0.4); ctx.fillStyle = litFill(ctx, C, C, 360, '#ffffff', '#efe9dc', '#bdb3a0'); roundRect(ctx, C - 200, C - 330, 400, 660, 60); ctx.fill(); ctx.restore(); ctx.fillStyle = '#7ab84a'; ctx.fillRect(C - 200, C - 80, 400, 120); },
    coffee: (ctx, R) => { for (let i = 0; i < 9; i++) { const [x, y] = R.disc(C, C, 230); ctx.save(); ctx.translate(x, y); ctx.rotate(R() * 3); shadow(ctx, 10, 6, 0.5); ctx.fillStyle = litFill(ctx, 0, 0, 100, '#8a5a3a', '#4a2410', '#1a0802'); ellipse(ctx, 0, 0, 100, 70); ctx.fill(); ctx.strokeStyle = '#1a0802'; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(-80, 0); ctx.quadraticCurveTo(0, 20, 80, 0); ctx.stroke(); ctx.restore(); } },
    icecream: (ctx, R) => { ctx.save(); shadow(ctx, 30, 16, 0.45); ctx.fillStyle = litFill(ctx, C, C, 380, '#fff1a8', '#f2c44a', '#a8780a'); blob(ctx, C, C, 330, R, 0.06, 9); ctx.fill(); ctx.restore(); speckle(ctx, R, C, C, 280, 80, ['#7fae3c'], 8, 16, 0.9, 1); },
  };
  for (const [k, fn] of Object.entries(ING)) register('ing-' + k, (ctx, R) => fn(ctx, R));
  // pizza toppings as big single pieces for the builder tray and the scattered bits
  const TOPS = ['pepperoni', 'mushroom', 'olive', 'pepper', 'onion', 'corn', 'basil', 'chicken', 'beef', 'tomato', 'mozzarella', 'jalapeno', 'extraCheese'];
  for (const k of TOPS) register('top-' + k, (ctx, R) => { const S = { pepperoni: 300, mushroom: 280, olive: 260, pepper: 260, onion: 260, corn: 0, basil: 520, chicken: 260, beef: 160, tomato: 330, mozzarella: 330, jalapeno: 240, extraCheese: 330 }[k];
    if (k === 'corn') { for (let i = 0; i < 9; i++) { const [x, y] = R.disc(C, C, 200); ctx.fillStyle = litFill(ctx, x, y, 70, '#fff09a', '#f2c230', '#9a6a08'); roundRect(ctx, x - 60, y - 50, 120, 100, 40); ctx.fill(); } return; }
    T.pizzaTop[k](ctx, R, C, C, S); });
})();
// a pale oak serving board (pizza builder), round with end-grain rings and knife marks
Painter.register('wood', (ctx, R) => {
  const { rgba, circle, shadow, litFill } = Painter.T; const x = 500, y = 500, r = 488;
  ctx.save(); shadow(ctx, 70, 40, 0.85); ctx.fillStyle = '#6a4626'; circle(ctx, x, y, r); ctx.fill(); ctx.restore();
  ctx.save(); circle(ctx, x, y, r); ctx.clip();
  ctx.fillStyle = litFill(ctx, x - 120, y - 160, r * 1.3, '#d6a874', '#a8743f', '#5a3616'); ctx.fillRect(0, 0, 1000, 1000);
  for (let i = 0; i < 220; i++) { const yy = R.range(-40, 1040), amp = R.range(3, 18); ctx.strokeStyle = rgba(R() < 0.6 ? '#5a3214' : '#f0c890', R.range(0.05, 0.2)); ctx.lineWidth = R.range(0.8, 3.5); ctx.beginPath();
    for (let xx = -20; xx <= 1020; xx += 30) { const yv = yy + Math.sin(xx / R.range(120, 220) + i * 0.7) * amp + Math.sin(xx / 37 + i) * 1.5; xx < 0 ? ctx.moveTo(xx, yv) : ctx.lineTo(xx, yv); } ctx.stroke(); }
  for (let i = 0; i < 5; i++) { const kx = R.range(200, 800), ky = R.range(200, 800); ctx.strokeStyle = 'rgba(70,36,12,0.25)'; ctx.lineWidth = 2; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.ellipse(kx, ky, 10 + k * 9, 5 + k * 5, 0.1, 0, 6.3); ctx.stroke(); } }
  ctx.strokeStyle = 'rgba(60,30,10,0.14)'; ctx.lineWidth = 1.5; for (let i = 0; i < 26; i++) { const a = R() * 6.28, d = R.range(40, 380), l = R.range(40, 140); ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * d, y + Math.sin(a) * d); ctx.lineTo(x + Math.cos(a) * d + Math.cos(a + 1.4) * l, y + Math.sin(a) * d + Math.sin(a + 1.4) * l); ctx.stroke(); }
  const cg = ctx.createRadialGradient(x, y, r * 0.86, x, y, r); cg.addColorStop(0, 'rgba(40,20,6,0)'); cg.addColorStop(1, 'rgba(40,20,6,0.55)'); ctx.fillStyle = cg; ctx.fillRect(0, 0, 1000, 1000);
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,236,200,0.35)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, r - 3, Math.PI * 1.05, Math.PI * 1.7); ctx.stroke();
});

