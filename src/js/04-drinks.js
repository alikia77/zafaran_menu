/* ============================================================
   Drinks: side-view glasses drawn live (liquid, bubbles, ice,
   condensation, backlight). Cold drinks sit on a lit bar shelf;
   hot drinks live in a tea house where the tea is poured.
   ============================================================ */
(() => {
  const { clamp, lerp } = Z;
  const TAU = Math.PI * 2;

  // glass silhouettes, side view, in a 200 × 300 box (y down)
  const SHAPES = {
    highball: { top: 52, bottom: 288, wTop: 74, wBot: 64, base: 14, rim: 8 },
    tumbler: { top: 120, bottom: 288, wTop: 82, wBot: 70, base: 18, rim: 9 },
    hurricane: { top: 40, bottom: 288, curve: true, base: 12, rim: 8 },
    istikan: { top: 120, bottom: 270, waist: true, base: 10, rim: 7 },
    cup: { top: 168, bottom: 268, wTop: 86, wBot: 62, opaque: true, handle: true },
    smallcup: { top: 198, bottom: 266, wTop: 62, wBot: 46, opaque: true, handle: true },
    mug: { top: 90, bottom: 284, wTop: 66, wBot: 62, base: 16, rim: 8, handle: true },
  };
  function halfWidth(s, y) { // half width of the glass at height y
    const t = (y - s.top) / (s.bottom - s.top);
    if (s.curve) return 40 + 32 * Math.sin(Math.PI * clamp(t * 1.05, 0, 1)) - 10 * t;
    if (s.waist) return 46 - 18 * Math.sin(Math.PI * clamp(t * 0.85 + 0.1, 0, 1)) + 6 * t;
    return lerp(s.wTop, s.wBot, t);
  }
  function glassPath(ctx, s, inset = 0) {
    ctx.beginPath();
    for (let y = s.top; y <= s.bottom; y += 3) ctx.lineTo(100 + halfWidth(s, y) - inset, y);
    const hb = halfWidth(s, s.bottom) - inset;
    ctx.quadraticCurveTo(100 + hb, s.bottom + 8, 100, s.bottom + 8);
    ctx.quadraticCurveTo(100 - hb, s.bottom + 8, 100 - hb, s.bottom);
    for (let y = s.bottom; y >= s.top; y -= 3) ctx.lineTo(100 - halfWidth(s, y) + inset, y);
    ctx.closePath();
  }

  /* ---------- one drink, drawn every frame ---------- */
  class Drink {
    constructor(spec, seed = 1) {
      this.s = spec; this.shape = SHAPES[spec.glass];
      const R = Painter.T.rng(seed);
      this.bubbles = Array.from({ length: spec.bubbles || 0 }, () => ({ x: R() * 2 - 1, y: R(), r: 0.8 + R() * 2.4, v: 0.15 + R() * 0.4, w: R() * TAU }));
      this.ice = Array.from({ length: spec.ice || 0 }, (_, i) => ({ x: (i - (spec.ice - 1) / 2) * 34 + R() * 10, r: R() * 0.6 - 0.3, s: 26 + R() * 8, ph: R() * TAU }));
      this.drops = Array.from({ length: spec.cold ? 70 : 0 }, () => ({ x: R() * 2 - 1, y: R(), r: 0.6 + R() * 1.8 }));
      this.level = 0; this.target = spec.level ?? 0.86; this.slosh = 0; this.t = 0;
      this.pour = 0; this.color = spec.liquid; this.color2 = spec.liquid2 || spec.liquid;
      this.mix = 0; this.steam = spec.hot ? Array.from({ length: 4 }, (_, i) => ({ ph: i * 1.6, x: (i - 1.5) * 16 })) : [];
    }
    fill(instant) { if (instant) { this.level = this.target; this.pour = 0; } else { this.level = 0; this.pour = 1; } }
    step(dt) {
      this.t += dt;
      if (this.pour > 0) { this.level = Math.min(this.target, this.level + dt * 0.55); if (this.level >= this.target) this.pour = Math.max(0, this.pour - dt * 2.5); }
      this.slosh *= Math.pow(0.12, dt);
      for (const b of this.bubbles) { b.y -= b.v * dt * 0.35; if (b.y < 0) { b.y = 1; b.x = Math.random() * 2 - 1; } }
    }
    draw(ctx, x, y, scale, alpha = 1) {
      const s = this.shape, sp = this.s;
      ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.translate(-100, -300); ctx.globalAlpha = alpha;
      const surf = lerp(s.bottom, s.top + (s.rim || 0) + 6, this.level);
      // backlight
      if (!s.opaque) { const bg = ctx.createRadialGradient(100, 190, 10, 100, 190, 150); bg.addColorStop(0, sp.glow + '55'); bg.addColorStop(1, sp.glow + '00'); ctx.fillStyle = bg; ctx.fillRect(-60, 20, 320, 320); }
      // shadow on the shelf
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.beginPath(); ctx.ellipse(100, s.bottom + 10, halfWidth(s, s.bottom) + 14, 8, 0, 0, TAU); ctx.fill();
      if (s.handle) this.handle(ctx, s);
      if (s.opaque) { this.cupBody(ctx, s, surf); ctx.restore(); return; }
      // glass back wall
      glassPath(ctx, s); ctx.fillStyle = 'rgba(255,255,255,0.045)'; ctx.fill();
      // liquid
      ctx.save(); glassPath(ctx, s, 4); ctx.clip();
      const amp = 2.5 + this.slosh * 14, k = 0.045;
      ctx.beginPath(); ctx.moveTo(0, 400);
      for (let xx = 0; xx <= 200; xx += 4) ctx.lineTo(xx, surf + Math.sin(xx * k + this.t * 3.2) * amp + (xx - 100) * this.slosh * 0.25);
      ctx.lineTo(200, 400); ctx.closePath();
      const col = this.mix > 0 ? mixHex(this.color, this.color2, this.mix) : this.color;
      const lg = ctx.createLinearGradient(0, surf, 0, s.bottom);
      lg.addColorStop(0, lighten(col, 0.28)); lg.addColorStop(0.35, col); lg.addColorStop(1, darken(col, 0.42));
      ctx.fillStyle = lg; ctx.fill();
      // refraction: darker at the walls, a bright core
      const rg = ctx.createLinearGradient(20, 0, 180, 0);
      rg.addColorStop(0, 'rgba(0,0,0,0.38)'); rg.addColorStop(0.28, 'rgba(255,255,255,0.06)'); rg.addColorStop(0.5, 'rgba(255,255,255,0.12)'); rg.addColorStop(0.8, 'rgba(0,0,0,0.05)'); rg.addColorStop(1, 'rgba(0,0,0,0.45)');
      ctx.fillStyle = rg; ctx.fillRect(0, surf - 20, 200, 320);
      if (sp.layers) for (const L of sp.layers) { ctx.fillStyle = L.c; ctx.fillRect(0, lerp(surf, s.bottom, L.from), 200, (s.bottom - surf) * (L.to - L.from) + 2); }
      if (sp.flecks) { ctx.fillStyle = sp.flecks; for (let i = 0; i < 40; i++) { const fx = 40 + ((i * 53) % 120), fy = surf + 10 + ((i * 37) % Math.max(10, s.bottom - surf - 10)); ctx.globalAlpha = alpha * 0.7; ctx.fillRect(fx + Math.sin(this.t + i) * 2, fy, 2.2, 1.4); } ctx.globalAlpha = alpha; }
      // bubbles
      for (const b of this.bubbles) {
        const by = lerp(surf + 6, s.bottom - 4, b.y), hw = halfWidth(s, by) - 10, bx = 100 + b.x * hw + Math.sin(this.t * 2 + b.w) * 2;
        if (by < surf + 3) continue;
        ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(bx, by, b.r, 0, TAU); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.arc(bx - b.r * 0.3, by - b.r * 0.3, b.r * 0.35, 0, TAU); ctx.fill();
      }
      // surface line + meniscus
      ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1.4; ctx.beginPath();
      for (let xx = 0; xx <= 200; xx += 4) ctx.lineTo(xx, surf + Math.sin(xx * k + this.t * 3.2) * amp + (xx - 100) * this.slosh * 0.25 + 0.5);
      ctx.stroke();
      if (sp.foam) { ctx.fillStyle = sp.foam; ctx.beginPath(); for (let xx = 0; xx <= 200; xx += 4) ctx.lineTo(xx, surf - 2 + Math.sin(xx * 0.2 + this.t) * 1.5); ctx.lineTo(200, surf + 10); ctx.lineTo(0, surf + 10); ctx.fill(); }
      ctx.restore();
      // ice cubes bobbing at the surface
      for (const c of this.ice) {
        if (this.level < 0.25) continue;
        const iy = surf - c.s * 0.35 + Math.sin(this.t * 1.6 + c.ph) * 2.5, ix = 100 + c.x;
        ctx.save(); ctx.translate(ix, iy); ctx.rotate(c.r + Math.sin(this.t + c.ph) * 0.05);
        ctx.fillStyle = 'rgba(235,245,255,0.20)'; roundRect(ctx, -c.s / 2, -c.s / 2, c.s, c.s, 6); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1.2; ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.45)'; roundRect(ctx, -c.s / 2 + 4, -c.s / 2 + 4, c.s * 0.4, 5, 2.5); ctx.fill();
        ctx.restore();
      }
      // pour stream
      if (this.pour > 0.02) {
        const g = ctx.createLinearGradient(0, -20, 0, surf); g.addColorStop(0, col + '00'); g.addColorStop(0.3, col); g.addColorStop(1, col);
        ctx.fillStyle = g; const w = 7 * this.pour; ctx.fillRect(100 - w / 2 + Math.sin(this.t * 20) * 0.6, -20, w, surf + 20);
      }
      // garnish behind the front wall
      if (sp.straw) { ctx.save(); ctx.translate(100, s.top); ctx.rotate(0.28); const sg = ctx.createLinearGradient(-5, 0, 5, 0); sg.addColorStop(0, sp.straw); sg.addColorStop(0.5, lighten(sp.straw, 0.4)); sg.addColorStop(1, darken(sp.straw, 0.3)); ctx.fillStyle = sg; ctx.fillRect(-5, -70, 10, 230); ctx.restore(); }
      if (sp.cream) { ctx.save(); ctx.fillStyle = '#fbf6ee'; ctx.beginPath(); ctx.moveTo(100 - halfWidth(s, s.top + 6), s.top + 8); for (let i = 0; i <= 6; i++) { const a = i / 6; ctx.quadraticCurveTo(lerp(30, 170, a) - 6, s.top - 26 - Math.sin(a * Math.PI) * 30, lerp(30, 170, a), s.top + 2); } ctx.closePath(); ctx.fill(); ctx.strokeStyle = 'rgba(160,140,120,0.4)'; ctx.stroke(); ctx.fillStyle = '#4a2410'; for (let i = 0; i < 18; i++) ctx.fillRect(60 + (i * 41) % 80, s.top - 30 + (i * 17) % 26, 4, 2); ctx.restore(); }
      // front glass: highlights, thickness, base
      glassPath(ctx, s);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.6; ctx.stroke();
      const hl = ctx.createLinearGradient(100 - halfWidth(s, 160), 0, 100 + halfWidth(s, 160), 0);
      hl.addColorStop(0, 'rgba(255,255,255,0.0)'); hl.addColorStop(0.08, 'rgba(255,255,255,0.42)'); hl.addColorStop(0.16, 'rgba(255,255,255,0.06)'); hl.addColorStop(0.82, 'rgba(255,255,255,0.0)'); hl.addColorStop(0.9, 'rgba(255,255,255,0.18)'); hl.addColorStop(1, 'rgba(255,255,255,0.0)');
      ctx.save(); glassPath(ctx, s); ctx.clip(); ctx.fillStyle = hl; ctx.fillRect(0, 0, 200, 320);
      // condensation
      for (const d of this.drops) { const dy = lerp(Math.max(surf, s.top + 20), s.bottom, d.y), dx = 100 + d.x * (halfWidth(s, dy) - 6); ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.beginPath(); ctx.arc(dx, dy, d.r, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.arc(dx - d.r * 0.3, dy - d.r * 0.3, d.r * 0.3, 0, TAU); ctx.fill(); }
      ctx.restore();
      // thick base
      const hb = halfWidth(s, s.bottom); const bg2 = ctx.createLinearGradient(0, s.bottom - (s.base || 10), 0, s.bottom + 8);
      bg2.addColorStop(0, 'rgba(255,255,255,0.05)'); bg2.addColorStop(1, 'rgba(255,255,255,0.28)');
      ctx.fillStyle = bg2; ctx.beginPath(); ctx.ellipse(100, s.bottom - (s.base || 10) / 2 + 2, hb - 3, (s.base || 10) / 2 + 4, 0, 0, TAU); ctx.fill();
      // rim ellipse
      const ht = halfWidth(s, s.top); ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(100, s.top, ht, 6, 0, 0, TAU); ctx.stroke();
      // garnish on the rim
      if (sp.lemon) wheel(ctx, 100 + ht - 6, s.top + 2, 22, sp.lemon);
      if (sp.mint) mint(ctx, 100 - ht * 0.3, s.top - 10);
      ctx.restore();
    }
    handle(ctx, s) {
      ctx.save(); ctx.strokeStyle = this.s.cup || 'rgba(255,255,255,0.35)'; ctx.lineWidth = this.shape.opaque ? 10 : 6;
      const y0 = s.top + (s.bottom - s.top) * 0.25, y1 = s.top + (s.bottom - s.top) * 0.7, hw = halfWidth(s, y0);
      ctx.beginPath(); ctx.moveTo(100 + hw - 2, y0); ctx.bezierCurveTo(100 + hw + 40, y0 - 4, 100 + hw + 40, y1 + 4, 100 + hw - 4, y1); ctx.stroke(); ctx.restore();
    }
    cupBody(ctx, s, surf) {
      // saucer
      const sc = this.s.cup || '#efe9df';
      ctx.fillStyle = darken(sc, 0.2); ctx.beginPath(); ctx.ellipse(100, s.bottom + 4, 92, 12, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = sc; ctx.beginPath(); ctx.ellipse(100, s.bottom, 90, 10, 0, 0, TAU); ctx.fill();
      // body
      glassPath(ctx, s);
      const g = ctx.createLinearGradient(100 - 90, 0, 100 + 90, 0);
      g.addColorStop(0, darken(sc, 0.35)); g.addColorStop(0.3, lighten(sc, 0.15)); g.addColorStop(0.55, sc); g.addColorStop(1, darken(sc, 0.4));
      ctx.fillStyle = g; ctx.fill();
      // gold band
      ctx.strokeStyle = '#c9a45c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(100, s.top + 10, halfWidth(s, s.top + 10) - 1, 4, 0, 0, Math.PI); ctx.stroke();
      // liquid top (ellipse)
      const ht = halfWidth(s, s.top);
      ctx.fillStyle = darken(sc, 0.15); ctx.beginPath(); ctx.ellipse(100, s.top, ht, 9, 0, 0, TAU); ctx.fill();
      if (this.level > 0.05) { const cg = ctx.createRadialGradient(92, s.top - 2, 2, 100, s.top, ht); cg.addColorStop(0, lighten(this.color, 0.4)); cg.addColorStop(0.6, this.color); cg.addColorStop(1, darken(this.color, 0.4)); ctx.fillStyle = cg; ctx.beginPath(); ctx.ellipse(100, s.top + 1, (ht - 5) * Math.min(1, this.level * 1.2), 7 * Math.min(1, this.level * 1.2), 0, 0, TAU); ctx.fill();
        if (this.s.art && this.level > 0.6) { ctx.fillStyle = 'rgba(255,250,240,0.9)'; ctx.beginPath(); ctx.ellipse(100, s.top + 1, ht * 0.32, 3.4, 0, 0, TAU); ctx.fill(); } }
      if (this.pour > 0.02) { ctx.fillStyle = this.color; const w = 5 * this.pour; ctx.fillRect(100 - w / 2, -20, w, s.top + 20); }
      this.drawSteam(ctx, s.top);
    }
    drawSteam(ctx, top) {
      for (const st of this.steam) {
        const t = (this.t * 0.35 + st.ph) % 1;
        ctx.save(); ctx.globalAlpha *= (1 - t) * Math.min(1, t * 4) * 0.5;
        ctx.strokeStyle = 'rgba(255,250,240,0.9)'; ctx.lineWidth = 6 * (1 - t) + 1; ctx.lineCap = 'round'; ctx.filter = 'blur(3px)';
        ctx.beginPath(); for (let k = 0; k <= 10; k++) { const yy = top - 10 - t * 90 - k * 6; ctx.lineTo(100 + st.x + Math.sin(yy * 0.06 + this.t * 1.4 + st.ph) * 8, yy); } ctx.stroke();
        ctx.restore();
      }
    }
  }
  function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function wheel(ctx, x, y, r, c) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(-0.4);
    ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.95, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fbf7e0'; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.86, r * 0.82, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = lighten(c, 0.35); for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r * 0.78, a + 0.06, a + 0.7); ctx.closePath(); ctx.fill(); }
    ctx.restore();
  }
  function mint(ctx, x, y) {
    for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.5; ctx.save(); ctx.translate(x + Math.cos(a) * 10, y + Math.sin(a) * 10); ctx.rotate(a); const g = ctx.createLinearGradient(-10, 0, 14, 0); g.addColorStop(0, '#2f6a22'); g.addColorStop(1, '#6fb04a'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(6, 0, 12, 6, 0, 0, TAU); ctx.fill(); ctx.restore(); }
  }
  function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function toHex([r, g, b]) { return '#' + [r, g, b].map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join(''); }
  function lighten(h, a) { return toHex(hexRgb(h).map((v) => v + (255 - v) * a)); }
  function darken(h, a) { return toHex(hexRgb(h).map((v) => v * (1 - a))); }
  function mixHex(a, b, t) { const A = hexRgb(a), B = hexRgb(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)); }

  const SPECS = {
    doogh: { glass: 'highball', liquid: '#e9ece3', glow: '#9aa88a', flecks: '#4f7a2a', ice: 2, mint: true, cold: true, bubbles: 6 },
    lemonade: { glass: 'highball', liquid: '#f2dc6a', glow: '#e6c34a', ice: 3, lemon: '#f0d02a', straw: '#e8d23a', cold: true, bubbles: 26 },
    mojito: { glass: 'highball', liquid: '#cfe8a8', glow: '#7ab84a', ice: 3, lemon: '#7fb83a', mint: true, straw: '#1d1d1d', cold: true, bubbles: 34 },
    sekanjabin: { glass: 'tumbler', liquid: '#d6cf72', glow: '#a8b84a', ice: 2, mint: true, cold: true, flecks: '#9ec46a', bubbles: 8 },
    shake: { glass: 'hurricane', liquid: '#6a3a1e', glow: '#b06a3a', cream: true, straw: '#f2ece2', bubbles: 0, cold: true, level: 0.8 },
    cola: { glass: 'highball', liquid: '#3a1408', glow: '#c0583a', ice: 3, lemon: '#e8d34a', foam: 'rgba(220,180,140,0.55)', bubbles: 40, cold: true },
    water: { glass: 'tumbler', liquid: '#a8c8d8', glow: '#6aa0c0', ice: 2, lemon: '#e8d34a', bubbles: 30, cold: true, level: 0.8 },
    tea: { glass: 'istikan', liquid: '#9a2c08', glow: '#e05a1a', hot: true, level: 0.82 },
    'tea-saffron': { glass: 'istikan', liquid: '#d8620e', glow: '#ffae3a', hot: true, level: 0.82 },
    'tea-borage': { glass: 'istikan', liquid: '#5a3a9a', liquid2: '#d0487a', glow: '#8a5ad8', hot: true, level: 0.82 },
    espresso: { glass: 'smallcup', liquid: '#5a2c10', cup: '#1a1816', hot: true, level: 0.8 },
    cappuccino: { glass: 'cup', liquid: '#c08a5a', cup: '#efe9df', hot: true, art: true, level: 0.9 },
    latte: { glass: 'mug', liquid: '#d8b48a', glow: '#c08a5a', hot: true, foam: 'rgba(250,244,232,0.95)', layers: [{ c: 'rgba(250,244,232,0.85)', from: 0, to: 0.18 }, { c: 'rgba(80,40,16,0.85)', from: 0.72, to: 1 }], level: 0.9 },
  };

  /* ---------- photographed drinks, poured for real ----------
     Each drink is two layers of the same photograph: an empty-glass
     version (p/g, glints and rim only) and the finished drink (p/r).
     The finished photo is revealed under a moving liquid surface, with
     a falling stream, a meniscus line, froth, fizz and steam. */
  // lb/lt: liquid bottom/top as fractions of the photo; sx: centre of the glass (the stream lands
  // there); mask: the glass interior (p/gm) the liquid is confined to, so garnish, saucers and
  // bottles never take part in the pour
  const POUR = {
    doogh: { lb: .90, lt: .20, c: '#ece7da', froth: '#ffffff', sx: .499, mask: 1 },
    lemonade: { lb: .92, lt: .20, c: '#eec12d', fizz: 1, sx: .439, mask: 1 },
    mojito: { lb: .92, lt: .20, c: '#d4d79a', fizz: 1, sx: .499, mask: 1 },
    sekanjabin: { lb: .92, lt: .20, c: '#cfad18', fizz: 1, sx: .5, mask: 1 },
    shake: { lb: .86, lt: .27, c: '#8a5236', froth: '#d9b9a0', thick: 1, sx: .495, mask: 1 },
    cola: { lb: .93, lt: .10, c: '#5a1a08', froth: '#c99a72', fizz: 1.6, sx: .499, mask: 1 },
    tea: { lb: .835, lt: .18, c: '#8a1c0e', hot: 1, sx: .501, mask: 1 },
    'tea-saffron': { lb: .835, lt: .17, c: '#f2a10e', hot: 1, sx: .501, mask: 1 },
    'tea-borage': { lb: .83, lt: .18, c: '#7a0a2a', hot: 1, sx: .501, mask: 1 },
    espresso: { lb: .70, lt: .22, c: '#2a1206', froth: '#b5773e', hot: 1, sx: .507, thick: 1, mask: 1 },
    latte: { lb: .77, lt: .07, c: '#c99a68', froth: '#f3e4cb', hot: 1, sx: .499, thick: 1, mask: 1 },
    water: { lb: .82, lt: .58, c: '#e9f1f3', sx: .633, mask: 1, still: 0 },
    // an opaque cup: the coffee surface rises and widens inside the rim
    cappuccino: { cup: { cx: .495, cy: .274, rx: .316, ry: .148 }, lb: .42, lt: .13, c: '#6b4126', froth: '#e9d2b4', hot: 1, sx: .5, thick: 1 },
  };
  const imgCache = {};
  const loadImg = (src) => imgCache[src] || (imgCache[src] = new Promise((res) => { const i = new Image(); i.decoding = 'async'; i.onload = () => res(i); i.onerror = () => res(null); i.src = src; }));

  // the visible extent of a cut-out (alpha bbox, as fractions of the image), so every glass
  // can be stood on the bar at its true height instead of by its square frame
  function measure(img) {
    try {
      const n = 96, c = document.createElement('canvas'); c.width = c.height = n; const x = c.getContext('2d', { willReadFrequently: true });
      x.drawImage(img, 0, 0, n, n); const d = x.getImageData(0, 0, n, n).data;
      let x0 = n, y0 = n, x1 = 0, y1 = 0;
      for (let y = 0; y < n; y++) for (let i = 0; i < n; i++) if (d[(y * n + i) * 4 + 3] > 40) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      return x1 > x0 ? { x0: x0 / n, y0: y0 / n, x1: (x1 + 1) / n, y1: (y1 + 1) / n } : { x0: 0, y0: 0, x1: 1, y1: 1 };
    } catch (e) { return { x0: 0, y0: 0, x1: 1, y1: 1 }; }
  }
  // how tall each vessel stands relative to a tall highball
  const STAND = { cola: 0.62, water: 0.86, doogh: 0.92, shake: 0.96, lemonade: 1, mojito: 1, sekanjabin: 1, tea: 0.78, 'tea-saffron': 0.78, 'tea-borage': 0.78, espresso: 0.62, latte: 0.82, cappuccino: 0.66 };
  class PhotoDrink {
    constructor(it) {
      this.it = it; this.g = POUR[it.id] || null; this.t = Math.random() * 10;
      this.level = 1; this.pour = 0; this.crown = 1; this.agit = 0; this.tilt = 0; this.mix = 0; this.ready = false;
      this.state = this.g ? 'idle' : 'full'; this.show = 1;   // idle: waiting to be poured; show: 0 = empty glass … 1 = full
      this.bub = Array.from({ length: this.g && this.g.fizz ? Math.round(26 * this.g.fizz) : 0 }, () => ({ x: Math.random(), y: Math.random(), r: 0.5 + Math.random() * 1.3, v: 0.05 + Math.random() * 0.12, w: Math.random() * 6 }));
      this.off = document.createElement('canvas'); this.ox = this.off.getContext('2d');
      const full = Z.dishSrc(it, 'r');
      Promise.all([loadImg(full), this.g ? loadImg(`p/g/${it.id}.webp`) : null, this.g && this.g.mask ? loadImg(`p/gm/${it.id}.webp`) : null]).then(([f, e, m]) => { this.full = f; this.empty = e; this.mask = m; if (f) this.bb = measure(f); this.ready = !!f; if (!e) this.state = 'full'; });
    }
    fill(instant) {
      if (instant || !this.g || !this.empty) { this.state = 'full'; this.level = 1; this.pour = 0; this.crown = 1; this.agit = 0; return; }
      this.state = 'pour'; this.level = 0; this.pour = 1; this.crown = 0; this.agit = 1; this.t0 = this.t;
    }
    // ready to be poured again; until then it is shown as full or empty depending on `show`
    reset() { if (this.g && this.empty && this.state !== 'pour') { this.state = 'idle'; this.level = 1; this.crown = 1; this.pour = 0; this.agit = 0; } }
    step(dt) {
      this.t += dt;
      if (this.pour > 0) {
        // fast at first, easing as the glass fills (like a real pour slowing near the rim)
        const rate = (this.g.thick ? 0.34 : 0.48) * (1.15 - this.level * 0.55);
        this.level = Math.min(1, this.level + dt * rate);
        if (this.level >= 1) this.pour = Math.max(0, this.pour - dt * 3);
        this.agit = Math.min(1, this.agit + dt * 2);
      } else this.agit *= Math.pow(0.25, dt);
      if (this.level >= 1) this.crown = Math.min(1, this.crown + dt * 1.1);
      if (this.state === 'pour' && this.level >= 1 && this.crown >= 1 && this.agit < 0.01) this.state = 'full';
      this.tilt *= Math.pow(0.15, dt);
      for (const b of this.bub) { b.y -= b.v * dt; if (b.y < 0) { b.y = 1; b.x = Math.random(); } }
    }
    // draw with the image's bottom-centre at (cx, by), D px square
    paint(ctx, cx, by, D, alpha = 1) {
      if (!this.ready) return;
      const x0 = cx - D / 2, y0 = by - D, g = this.g;
      ctx.save(); ctx.globalAlpha *= alpha;
      if (!g || !this.empty || this.state === 'full') { this.drawFull(ctx, x0, y0, D); ctx.restore(); return; }
      if (this.state === 'idle') {   // a soft dissolve between the full and the empty glass
        const sh = this.show * this.show * (3 - 2 * this.show), base = ctx.globalAlpha;
        if (sh < 1) { ctx.globalAlpha = base * (1 - sh); ctx.drawImage(this.empty, x0, y0, D, D); }
        if (sh > 0) { ctx.globalAlpha = base * sh; this.drawFull(ctx, x0, y0, D); }
        ctx.restore(); return;
      }
      ctx.drawImage(this.empty, x0, y0, D, D);
      // liquid layer, composed off-screen so every mark stays inside the glass
      const N = Math.ceil(D * Math.min(2, devicePixelRatio || 1)), o = this.off, ox = this.ox, k = N / D;
      if (o.width !== N) { o.width = N; o.height = N; }
      ox.setTransform(1, 0, 0, 1, 0, 0); ox.clearRect(0, 0, N, N);
      const sY = (g.lb - (g.lb - g.lt) * this.level) * N, t = this.t, A = (0.004 + 0.012 * this.agit) * N;
      const wave = (x) => sY + Math.sin(x / N * 13 + t * 5.2) * A * 0.6 + Math.sin(x / N * 29 - t * 7.7) * A * 0.35 + (x / N - 0.5) * this.tilt * N * 0.08;
      if (this.mix) ox.filter = `hue-rotate(${-this.mix * 40}deg) saturate(${1 + this.mix * 0.3}) brightness(${1 + this.mix * 0.18})`;
      ox.drawImage(this.full, 0, 0, N, N); ox.filter = 'none';
      ox.globalCompositeOperation = 'destination-in';
      if (g.cup) { const lv = this.level, q = g.cup; ox.beginPath(); ox.ellipse(q.cx * N, (q.cy + (1 - lv) * q.ry * 0.9) * N, q.rx * N * (0.62 + 0.38 * lv), q.ry * N * (0.62 + 0.38 * lv), 0, 0, TAU); ox.fillStyle = '#000'; ox.fill(); }
      else { ox.beginPath(); ox.moveTo(0, N); for (let x = 0; x <= N; x += 6) ox.lineTo(x, wave(x)); ox.lineTo(N, N); ox.closePath(); ox.fillStyle = '#000'; ox.fill(); }
      if (this.mask) ox.drawImage(this.mask, 0, 0, N, N);   // the liquid lives only inside the glass
      ox.globalCompositeOperation = 'source-atop';
      // froth / bright band right under the surface while it is moving
      const fb = ox.createLinearGradient(0, sY - A, 0, sY + N * 0.05);
      const fc = g.froth || '#ffffff', fa = (g.froth ? 0.55 : 0.18) * this.agit * (1 - this.crown);
      fb.addColorStop(0, hexA(fc, fa)); fb.addColorStop(1, hexA(fc, 0)); ox.fillStyle = fb; ox.fillRect(0, sY - A * 2, N, N * 0.07);
      // meniscus glint
      ox.strokeStyle = `rgba(255,248,232,${0.25 + 0.35 * this.agit})`; ox.lineWidth = 1.2 * k;
      if (!g.cup) { ox.beginPath(); for (let x = 0; x <= N; x += 6) x ? ox.lineTo(x, wave(x)) : ox.moveTo(x, wave(x)); ox.stroke(); }
      // fizz
      if (this.bub.length) { ox.fillStyle = 'rgba(255,255,255,0.55)'; for (const b of this.bub) { const by2 = sY + (g.lb * N - sY) * b.y, bx = ((g.sx || 0.5) - 0.13 + b.x * 0.26) * N + Math.sin(t * 3 + b.w) * 2 * k; if (by2 > sY + 2) { ox.beginPath(); ox.arc(bx, by2, b.r * k, 0, TAU); ox.fill(); } } }
      ox.globalCompositeOperation = 'source-over';
      ctx.drawImage(o, x0, y0, D, D);
      // garnish, ice and crema arrive as the pour finishes
      if (this.crown > 0) { ctx.globalAlpha = alpha * (this.crown * this.crown * (3 - 2 * this.crown)); this.drawFull(ctx, x0, y0, D); ctx.globalAlpha = alpha; }
      // the falling stream
      if (this.pour > 0 && this.level < 1.01) {
        const sx = x0 + (g.sx || 0.5) * D + Math.sin(t * 9) * D * 0.002, top = -2, bot = y0 + sY / k;
        const w = D * (g.thick ? 0.03 : 0.018) * Math.min(1, this.pour) * (1 - Math.max(0, this.level - 0.9) * 6);
        if (w > 0.3) {
          const sg = ctx.createLinearGradient(sx - w, 0, sx + w, 0);
          sg.addColorStop(0, hexA(g.c, 0.0)); sg.addColorStop(0.25, hexA(g.c, 0.9)); sg.addColorStop(0.5, hexA(lighten(g.c, 0.35), 0.95)); sg.addColorStop(0.75, hexA(g.c, 0.9)); sg.addColorStop(1, hexA(g.c, 0));
          ctx.fillStyle = sg; ctx.beginPath(); ctx.moveTo(sx - w * 0.7, top); ctx.lineTo(sx + w * 0.7, top);
          ctx.quadraticCurveTo(sx + w * 0.5, (top + bot) / 2, sx + w * 0.45, bot); ctx.lineTo(sx - w * 0.45, bot); ctx.quadraticCurveTo(sx - w * 0.5, (top + bot) / 2, sx - w * 0.7, top); ctx.fill();
          ctx.strokeStyle = 'rgba(255,250,240,0.55)'; ctx.lineWidth = Math.max(0.6, w * 0.12); ctx.beginPath(); ctx.moveTo(sx - w * 0.15, top); ctx.lineTo(sx - w * 0.12, bot); ctx.stroke();
          // splash ring where it lands
          ctx.strokeStyle = `rgba(255,248,236,${0.35 * this.pour})`; ctx.lineWidth = 0.8; const rr = w * (1.6 + Math.sin(t * 14) * 0.3);
          ctx.beginPath(); ctx.ellipse(sx, bot, rr, rr * 0.25, 0, 0, TAU); ctx.stroke();
        }
      }
      ctx.restore();
    }
    drawFull(ctx, x0, y0, D) {
      if (this.mix && 'filter' in ctx) { ctx.filter = `hue-rotate(${-this.mix * 40}deg) saturate(${1 + this.mix * 0.3}) brightness(${1 + this.mix * 0.18})`; ctx.drawImage(this.full, x0, y0, D, D); ctx.filter = 'none'; }
      else ctx.drawImage(this.full, x0, y0, D, D);
    }
    // stand the drink on a surface: content bottom at baseY, content height h px (capped by width wMax)
    place(cx, baseY, h, wMax) {
      const b = this.bb || { x0: 0, y0: 0, x1: 1, y1: 1 }, ch = b.y1 - b.y0, cw = b.x1 - b.x0;
      let D = h / ch; if (cw * D > wMax) D = wMax / cw;
      const mid = this.g && this.g.sx && !this.g.cup && this.it.id !== 'water' ? this.g.sx : (b.x0 + b.x1) / 2;   // centre on the glass, not on a garnish hanging off it
      return { D, cx: cx + (0.5 - mid) * D, by: baseY + (1 - b.y1) * D, top: baseY - ch * D };
    }
    // a few slow wisps of steam above the rim
    steam(ctx, cx, rimY, D, alpha = 1) {
      if (!this.g || !this.g.hot) return;
      const t = this.t, warm = Math.min(1, this.level * 1.2);
      ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const ph = i * 2.1, base = cx + (i - 1) * D * 0.07, len = D * (0.32 + 0.06 * i);
        for (const [lw, a] of [[D * 0.07, 0.025], [D * 0.035, 0.04], [D * 0.012, 0.05]]) {
          ctx.strokeStyle = `rgba(255,246,232,${a * warm * alpha})`; ctx.lineWidth = lw; ctx.beginPath();
          for (let j = 0; j <= 14; j++) {
            const f = j / 14, y = rimY - f * len, x = base + Math.sin(f * 4.2 + t * 0.9 + ph) * D * 0.035 * (0.3 + f) + Math.sin(t * 0.4 + ph) * D * 0.02 * f;
            j ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
          }
          ctx.globalAlpha = 1; ctx.stroke();
        }
      }
      ctx.restore();
    }
  }
  function hexA(h, a) { const [r, g, b] = hexRgb(h); return `rgba(${r},${g},${b},${a})`; }
  Z.PhotoDrink = PhotoDrink; Z.POUR = POUR;

  Z.DRINK_SPECS = SPECS;
  Z.Drink = Drink;

  /* ---------- the bar shelf (cold drinks, photographed) ---------- */
  Z.makeBar = (canvas, items, onChange) => {
    const ctx = canvas.getContext('2d');
    const drinks = items.map((it) => new PhotoDrink(it));
    let pos = 0, target = 0, vel = 0, W = 0, H = 0, dpr = Math.min(2, devicePixelRatio || 1), alive = false, last = 0, drag = null, current = -1;
    const size = () => { W = canvas.clientWidth; H = canvas.clientHeight; canvas.width = W * dpr; canvas.height = H * dpr; };
    size(); addEventListener('resize', size);
    function frame(t) {
      if (!alive) return;
      const dt = Math.min(0.05, (t - last) / 1000 || 0.016); last = t;
      if (!drag) { const k = 120, c = 22; vel += (-(pos - target) * k - vel * c) * dt; pos += vel * dt; }
      const idx = Math.round(pos);
      if (idx !== current && idx >= 0 && idx < drinks.length) { current = idx; onChange && onChange(idx); }
      // pour only once the glass has come to rest in front of the guest
      // each glass dissolves from full to empty as it slides to the centre, and is poured once it rests
      drinks.forEach((d, i) => {
        const a = Math.abs(i - pos);
        if (d.state === 'full' && a > 0.75) d.reset();
        if (d.state === 'idle') d.show = Math.min(1, Math.max(0, (a - 0.06) / 0.55));
      });
      const cd = drinks[current];
      if (cd && !drag && cd.state === 'idle' && cd.ready && Math.abs(vel) < 0.08 && Math.abs(pos - current) < 0.03) cd.fill(Z.reduce);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      // a polished stone bar top: a thin lit edge and a soft dark reflection plane
      const shelfY = H * 0.84;
      const sg = ctx.createLinearGradient(0, shelfY, 0, H); sg.addColorStop(0, 'rgba(255,255,255,0.03)'); sg.addColorStop(0.5, 'rgba(0,0,0,0.25)'); sg.addColorStop(1, 'rgba(0,0,0,0.5)');
      ctx.fillStyle = sg; ctx.fillRect(0, shelfY, W, H - shelfY);
      const lg = ctx.createLinearGradient(0, 0, W, 0); lg.addColorStop(0, 'rgba(230,205,150,0)'); lg.addColorStop(0.5, 'rgba(230,205,150,0.45)'); lg.addColorStop(1, 'rgba(230,205,150,0)');
      ctx.fillStyle = lg; ctx.fillRect(0, shelfY, W, 1);
      const order = drinks.map((d, i) => i).sort((a, b) => Math.abs(b - pos) - Math.abs(a - pos));
      const D0 = Math.min(W * 0.92, H * 0.98);
      for (const i of order) {
        const d = drinks[i], off = i - pos, a = Math.abs(off);
        if (a > 2.4) continue;
        d.step(dt);
        if (drag || Math.abs(vel) > 0.05) d.tilt = Math.max(-1, Math.min(1, d.tilt + vel * dt * -0.8));
        const k = 1 - Math.min(a, 1.5) * 0.3, x = W / 2 - off * W * 0.4, al = 1 - Math.min(a, 2) * 0.38;
        const P = d.place(x, shelfY, shelfY * 0.86 * k * (STAND[d.it.id] || 0.9), W * 0.62 * k), D = P.D;
        // contact shadow
        const sh = ctx.createRadialGradient(x, shelfY, 0, x, shelfY, D * 0.28); sh.addColorStop(0, `rgba(0,0,0,${0.55 * al})`); sh.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = sh; ctx.beginPath(); ctx.ellipse(x, shelfY + 2, D * 0.24, D * 0.03, 0, 0, TAU); ctx.fill();
        d.paint(ctx, P.cx, P.by, D, al);
        // reflection on the bar top, fading out
        ctx.save(); ctx.beginPath(); ctx.rect(0, shelfY, W, H - shelfY); ctx.clip();
        ctx.translate(0, shelfY * 2); ctx.scale(1, -1); ctx.globalAlpha = 0.14 * (1 - Math.min(a, 1)); if (d.ready) ctx.drawImage(d.full, P.cx - D / 2, P.by - D, D, D); ctx.restore();
      }
      requestAnimationFrame(frame);
    }
    new IntersectionObserver(([e]) => { alive = e.isIntersecting; if (alive) { last = performance.now(); requestAnimationFrame(frame); } }).observe(canvas);
    canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, p: pos, t: performance.now(), decided: false, h: false, hist: [[e.clientX, performance.now()]] }; });
    canvas.addEventListener('pointermove', (e) => {
      if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.decided && Math.hypot(dx, dy) > 8) { drag.decided = true; drag.h = Math.abs(dx) > Math.abs(dy); if (drag.h) canvas.setPointerCapture(e.pointerId); }
      if (!drag.h) return;
      const np = drag.p + dx / (W * 0.4); vel = (np - pos) / 0.016; pos = clamp(np, -0.4, drinks.length - 0.6);
      drag.hist.push([e.clientX, performance.now()]); if (drag.hist.length > 5) drag.hist.shift();
    });
    const up = () => {
      if (!drag) return; const d = drag; drag = null;
      if (!d.decided) { if (performance.now() - d.t < 400) Z.openDetail && Z.openDetail(items[current], canvas, { drink: true }); return; }
      const [a, b] = [d.hist[0], d.hist[d.hist.length - 1]]; const v = ((b[0] - a[0]) / Math.max(1, b[1] - a[1])) * 1000 / (W * 0.4);
      target = clamp(Math.round(pos + v * 0.2), 0, drinks.length - 1); vel = v; Z.haptic(6);
    };
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
    return { go(i) { target = clamp(i, 0, drinks.length - 1); }, get current() { return current; } };
  };

  /* ---------- tea house: each hot drink is poured when it comes into view ---------- */
  Z.makeTea = (canvas, it) => {
    const ctx = canvas.getContext('2d'); const d = new PhotoDrink(it);
    let W = 0, H = 0, dpr = Math.min(2, devicePixelRatio || 1), alive = false, last = 0, poured = false, seen = false, seenAt = 0;
    const size = () => { W = canvas.clientWidth; H = canvas.clientHeight; canvas.width = W * dpr; canvas.height = H * dpr; };
    size(); addEventListener('resize', size);
    d.show = 0;
    function frame(t) {
      if (!alive) return; const dt = Math.min(0.05, (t - last) / 1000 || 0.016); last = t;
      d.step(dt);
      if (seen && !poured && d.ready && t > seenAt) { poured = true; d.fill(Z.reduce); }
      if (d.mixing) d.mix = Math.min(1, d.mix + dt * 0.6); else d.mix = Math.max(0, d.mix - dt * 0.8);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      const P = d.place(W / 2, H * 0.97, H * 0.86 * (STAND[it.id] || 0.8) / 0.82 * 0.82, W * 0.98), D = P.D, by = P.by;
      // a warm pool of light under the glass
      const gl = ctx.createRadialGradient(W / 2, H * 0.8, 0, W / 2, H * 0.8, W * 0.6); gl.addColorStop(0, 'rgba(232,190,120,0.16)'); gl.addColorStop(1, 'rgba(232,190,120,0)'); ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H);
      d.paint(ctx, P.cx, by, D, 1);
      if (d.g) d.steam(ctx, P.cx, by - D * (1 - (d.g.lt || 0.15)) - D * 0.02, D, 1);
      requestAnimationFrame(frame);
    }
    new IntersectionObserver(([e]) => {
      alive = e.isIntersecting;
      if (alive) { if (!seen) { seen = true; seenAt = performance.now() + 150 + Math.random() * 350; } last = performance.now(); requestAnimationFrame(frame); }
    }, { threshold: 0.45 }).observe(canvas);
    return d;
  };
})();
