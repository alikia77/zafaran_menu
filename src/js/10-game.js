/* ============================================================
   While you wait: bake a pizza in five gestures.
   stretch the dough → spread the sauce → sprinkle cheese →
   place toppings → hold it in the oven, take it out when golden.
   ============================================================ */
(() => {
  const { $, $$, fa, icon } = Z;
  const el = $('#game'), cv = $('#gCanvas'), ctx = cv.getContext('2d');
  const S = 800, C = 400, R_MAX = 300;
  const STEPS = [
    { t: 'خمیر را باز کنید', p: 'از وسط به بیرون بکشید تا خمیر به لبه‌ی تخته برسد.' },
    { t: 'سس گوجه', p: 'با انگشت روی خمیر بکشید و همه‌جا را سس بزنید.' },
    { t: 'پنیر موتزارلا', p: 'روی پیتزا بزنید یا بکشید تا پنیر بپاشد.' },
    { t: 'مواد را بچینید', p: 'یکی را انتخاب کنید و روی پیتزا بزنید.' },
    { t: 'در تنور', p: 'دکمه را نگه دارید. وقتی طلایی شد، رها کنید.' },
  ];
  let step = 0, r = 60, sauce, sctx, cheese = [], tops = [], pick = 'pepperoni', bake = 0, baking = false, done = false, wood = null, topImg = {}, grid, raf = 0, last = 0;
  Z.drawn('wood', 800).then((u) => { wood = new Image(); wood.src = u; });
  ['pepperoni', 'mushroom', 'olive', 'basil'].forEach((k) => Z.drawn('top-' + k, 160).then((u) => { const im = new Image(); im.src = u; topImg[k] = im; }));
  $('#gSteps').innerHTML = STEPS.map(() => '<i></i>').join('');

  function reset() {
    step = 0; r = 70; cheese = []; tops = []; bake = 0; baking = false; done = false;
    sauce = document.createElement('canvas'); sauce.width = sauce.height = S; sctx = sauce.getContext('2d');
    grid = new Uint8Array(40 * 40);
    say();
  }
  function meter(v) { $('#gMeter').style.width = Math.min(100, v * 100) + '%'; }
  function say() {
    const s = STEPS[step] || { t: 'پیتزای شما آماده است', p: '' };
    $$('#gSteps i').forEach((d, i) => d.classList.toggle('on', i <= step));
    $('#gTitle').textContent = s.t; $('#gText').textContent = s.p;
    let a = '';
    if (step === 3) a = ['pepperoni', 'mushroom', 'olive', 'basil'].map((k) => `<button class="choice-top ${k === pick ? 'on' : ''}" data-pick="${k}"><img alt="" src="${topImg[k] ? topImg[k].src : ''}"></button>`).join('') + `<button class="btn-gold" data-next>بعدی</button>`;
    if (step === 4) a = `<button class="oven-btn" id="oven">${icon('flame')}نگه دارید</button>`;
    if (done) a = `<button class="btn-ghost" data-again>${icon('rotate')}دوباره</button><button class="btn-gold" data-out>برگشت به منو</button>`;
    $('#gActions').innerHTML = a;
    meter(0);
    if (Z.hasGsap) gsap.fromTo(['#gTitle', '#gText'], { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'expo.out', stagger: 0.06 });
  }
  function next() { step++; Z.haptic(14); if (Z.hasGsap) gsap.fromTo(cv, { scale: 0.96 }, { scale: 1, duration: 0.7, ease: 'elastic.out(1,0.5)' }); say(); }

  /* ---------- drawing ---------- */
  function draw(t) {
    ctx.clearRect(0, 0, S, S);
    if (wood && wood.complete) ctx.drawImage(wood, 0, 0, S, S);
    // dough
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12;
    const dg = ctx.createRadialGradient(C - r * 0.3, C - r * 0.3, r * 0.1, C, C, r);
    const b = bake;
    dg.addColorStop(0, mixc('#f6e8cc', '#e9b46a', b)); dg.addColorStop(0.85, mixc('#efd9ae', '#c98a3c', b)); dg.addColorStop(1, mixc('#e2c48e', '#9a5a1e', Math.min(1, b * 1.2)));
    ctx.fillStyle = dg; ctx.beginPath(); ctx.arc(C, C, r, 0, 6.283); ctx.fill(); ctx.restore();
    // sauce (clipped inside the crust)
    ctx.save(); ctx.beginPath(); ctx.arc(C, C, r * 0.88, 0, 6.283); ctx.clip(); ctx.globalAlpha = 1 - b * 0.25; ctx.drawImage(sauce, 0, 0); ctx.restore();
    // cheese shreds, melting as it bakes
    for (const c of cheese) {
      ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.a);
      const melt = Math.min(1, b * 1.6);
      ctx.fillStyle = mixc('#fff6d0', '#f4c860', melt * 0.8); ctx.globalAlpha = 0.95;
      const w = 22 + melt * 18, h = 6 + melt * 10;
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-w / 2, -h / 2, w, h, h / 2) : ctx.rect(-w / 2, -h / 2, w, h); ctx.fill();
      if (melt > 0.6 && c.s > 0.7) { ctx.fillStyle = `rgba(150,80,20,${(melt - 0.6) * 0.8})`; ctx.beginPath(); ctx.arc(0, 0, 4, 0, 6.283); ctx.fill(); }
      ctx.restore();
    }
    for (const p of tops) { const im = topImg[p.k]; if (!im || !im.complete) continue; const s = p.k === 'basil' ? 70 : 54; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.scale(p.sc, p.sc); ctx.drawImage(im, -s / 2, -s / 2, s, s); ctx.restore(); }
    // oven light
    if (step === 4) { const g = ctx.createRadialGradient(C, C, 0, C, C, S * 0.7); g.addColorStop(0, `rgba(255,140,40,${baking ? 0.18 + Math.sin(t / 90) * 0.04 : 0.05})`); g.addColorStop(1, 'rgba(255,80,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, S, S); }
    if (step === 4 || done) { // bake ring: green window
      ctx.lineWidth = 10; ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.beginPath(); ctx.arc(C, C, 372, -Math.PI / 2, Math.PI * 1.5); ctx.stroke();
      ctx.strokeStyle = 'rgba(143,192,106,0.55)'; ctx.beginPath(); ctx.arc(C, C, 372, -Math.PI / 2 + 6.283 * 0.7, -Math.PI / 2 + 6.283 * 0.85); ctx.stroke();
      ctx.strokeStyle = bake > 0.92 ? '#5a2a10' : '#ecd29a'; ctx.beginPath(); ctx.arc(C, C, 372, -Math.PI / 2, -Math.PI / 2 + 6.283 * bake); ctx.stroke();
    }
  }
  function mixc(a, b, t) { const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); const A = p(a), B = p(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`; }
  function loop(t) {
    if (el.hidden) return; const dt = Math.min(0.05, (t - last) / 1000 || 0.016); last = t;
    if (step === 4 && baking) { bake = Math.min(1, bake + dt * 0.16); meter(bake); if (bake >= 1) release(); }
    draw(t); raf = requestAnimationFrame(loop);
  }

  /* ---------- input ---------- */
  const pt = (e) => { const b = cv.getBoundingClientRect(); return [((e.clientX - b.left) / b.width) * S, ((e.clientY - b.top) / b.height) * S]; };
  let down = null;
  cv.addEventListener('pointerdown', (e) => { cv.setPointerCapture(e.pointerId); const [x, y] = pt(e); down = { x, y, r0: r }; act(x, y, true); });
  cv.addEventListener('pointermove', (e) => { if (!down) return; const [x, y] = pt(e); act(x, y, false); });
  cv.addEventListener('pointerup', () => (down = null)); cv.addEventListener('pointercancel', () => (down = null));
  function act(x, y, first) {
    const d = Math.hypot(x - C, y - C);
    if (step === 0) {
      r = Math.max(r, Math.min(R_MAX, d + 10)); meter((r - 70) / (R_MAX - 80));
      if (r >= R_MAX - 6) { r = R_MAX; down = null; if (Z.hasGsap) gsap.fromTo({ v: 0 }, { v: 1 }, { duration: 0.6 }); next(); }
    } else if (step === 1) {
      if (d > r * 0.9) { down.lx = null; return; }
      // a continuous brush stroke between pointer samples, with a lighter wet sheen on top
      const lx = down.lx ?? x, ly = down.ly ?? y; down.lx = x; down.ly = y;
      sctx.lineCap = 'round'; sctx.lineJoin = 'round';
      sctx.strokeStyle = 'rgba(170,30,16,0.92)'; sctx.lineWidth = 64; sctx.beginPath(); sctx.moveTo(lx, ly); sctx.lineTo(x, y); sctx.stroke();
      sctx.strokeStyle = 'rgba(220,70,36,0.35)'; sctx.lineWidth = 26; sctx.beginPath(); sctx.moveTo(lx + 6, ly - 6); sctx.lineTo(x + 6, y - 6); sctx.stroke();
      // coverage on a coarse grid
      for (let k = 0; k <= 4; k++) for (let gx = -1; gx <= 1; gx++) for (let gy = -1; gy <= 1; gy++) { const px = x + (( down.px ?? x) - x) * k / 4, py = y + ((down.py ?? y) - y) * k / 4; const cx = Math.floor(px / 20) + gx, cy = Math.floor(py / 20) + gy; if (cx >= 0 && cy >= 0 && cx < 40 && cy < 40 && Math.hypot(cx * 20 + 10 - C, cy * 20 + 10 - C) < r * 0.86) grid[cy * 40 + cx] = 1; }
      let tot = 0, on = 0; for (let cy = 0; cy < 40; cy++) for (let cx = 0; cx < 40; cx++) if (Math.hypot(cx * 20 + 10 - C, cy * 20 + 10 - C) < r * 0.84) { tot++; on += grid[cy * 40 + cx]; }
      down.px = x; down.py = y;
      const cov = on / tot; meter(cov / 0.85); if (cov > 0.85) { down = null; next(); }
    } else if (step === 2) {
      if (d > r * 0.9) return;
      for (let i = 0; i < 5; i++) { const a = Math.random() * 6.283, s = Math.random() * 40; const cx = x + Math.cos(a) * s, cy = y + Math.sin(a) * s; if (Math.hypot(cx - C, cy - C) < r * 0.86) cheese.push({ x: cx, y: cy, a: Math.random() * 3, s: Math.random() }); }
      meter(cheese.length / 220); if (cheese.length > 220) { down = null; next(); }
    } else if (step === 3) {
      if (!first || d > r * 0.82) return;
      const p = { k: pick, x, y, a: Math.random() * 6.283, sc: 1.8 }; tops.push(p); Z.haptic(6);
      if (Z.hasGsap) gsap.to(p, { sc: 1, duration: 0.5, ease: 'bounce.out' }); else p.sc = 1;
      meter(tops.length / 10); if (tops.length >= 14) next();
    }
  }
  function release() {
    if (!baking) return; baking = false; done = true; const b = bake;
    const verdict = b < 0.55 ? ['خمیر هنوز خام است', 'کمی بیشتر صبر کنید؛ دوباره امتحان کنید.'] : b < 0.7 ? ['کمی کم‌پخت', 'نزدیک بود! طلایی‌تر بهتر است.'] : b <= 0.85 ? ['عالی، طلایی و ترد', 'مثل تنور هیزمی ما. غذای واقعی‌تان هم در راه است.'] : b < 0.95 ? ['کمی برشته', 'برای دوستداران لبه‌ی برشته، بد نیست.'] : ['سوخت!', 'تنور ما ۴۵۰ درجه است؛ دوباره امتحان کنید.'];
    step = 5; say(); $('#gTitle').textContent = verdict[0]; $('#gText').textContent = verdict[1]; meter(b); Z.haptic(b > 0.7 && b <= 0.85 ? 30 : 10);
    if (b > 0.7 && b <= 0.85 && Z.hasGsap) gsap.fromTo(cv, { rotation: 0 }, { rotation: 360, duration: 1.2, ease: 'expo.inOut' });
  }
  $('#gActions').addEventListener('click', (e) => {
    const p = e.target.closest('[data-pick]'); if (p) { pick = p.dataset.pick; $$('#gActions [data-pick]').forEach((b) => b.classList.toggle('on', b === p)); return; }
    if (e.target.closest('[data-next]')) { if (tops.length < 3) { Z.toast('حداقل سه تکه بچینید', 'hand'); return; } next(); return; }
    if (e.target.closest('[data-again]')) { reset(); return; }
    if (e.target.closest('[data-out]')) close();
  });
  $('#gActions').addEventListener('pointerdown', (e) => { if (e.target.closest('#oven') && step === 4) { baking = true; e.target.closest('#oven').classList.add('on'); Z.haptic(8); } });
  addEventListener('pointerup', () => { if (step === 4 && baking) release(); });

  Z.openGame = () => { el.hidden = false; document.body.style.overflow = 'hidden'; reset(); last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop); if (Z.hasGsap) gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.4 }); if (Z.hasGsap) gsap.fromTo(cv, { scale: 0.6, rotation: -90, opacity: 0 }, { scale: 1, rotation: 0, opacity: 1, duration: 1.1, ease: 'expo.out' }); };
  const close = () => { el.hidden = true; cancelAnimationFrame(raf); document.body.style.overflow = ''; };
  $('#gClose').addEventListener('click', close);
})();
