/* ============================================================
   Pizza builder — video 2. The pizza sits on an oak board; swipe or
   use the arrows to change it. S / M / L scales the pizza and the
   price. Toppings are dragged onto the pizza (or tapped) and land
   as scattered pieces. Add to order: the box base slides under,
   the lid closes, and the box flies into the bag.
   ============================================================ */
(() => {
  const { $, $$, fa, toman, icon, byId } = Z;
  const el = $('#builder'), pizza = $('#bPizza'), bits = $('#bBits'), boardEl = $('#bBoard');
  const PIZZAS = ITEMS.filter((i) => i.cat === 'pizza');
  const SIZES = { S: { scale: 0.8, k: 0.78, label: 'کوچک · ۲۵ سانت' }, M: { scale: 0.91, k: 1, label: 'متوسط · ۳۰ سانت' }, L: { scale: 1, k: 1.3, label: 'بزرگ · ۳۵ سانت' } };
  const TOPS = [
    ['extraCheese', 'پنیر اضافه', 90000, 'cheese'], ['mushroom', 'قارچ', 60000], ['pepperoni', 'پپرونی', 80000], ['olive', 'زیتون', 40000], ['pepper', 'فلفل دلمه', 35000],
    ['onion', 'پیاز', 25000], ['corn', 'ذرت', 30000], ['jalapeno', 'هالوپینو', 45000], ['tomato', 'گوجه', 30000], ['basil', 'ریحان', 20000], ['chicken', 'مرغ', 110000], ['beef', 'گوشت', 120000],
  ];
  let cur = 0, size = 'M', counts = {}, busy = false;
  Z.glass($('#builder .d-bar .lg'));

  $('#bTops').innerHTML = TOPS.map(([k, n, p]) => `<button class="top" data-k="${k}"><span class="th"><img alt="" data-top="${k}"></span><span class="n num"></span><span>${n}</span><span class="p num">+${toman(p)}</span></button>`).join('');
  // toppings are real pieces lifted from our own pizza photographs (p/tp)
  const TR = {"pepperoni": 0.052, "mushroom": 0.052, "olive": 0.036, "pepper": 0.028, "onion": 0.05, "corn": 0.03, "jalapeno": 0.026, "tomato": 0.042, "basil": 0.05, "chicken": 0.05, "beef": 0.045, "extraCheese": 0.075};
  $$('#bTops img[data-top]').forEach((im) => { im.decoding = 'async'; im.src = `p/tc/${im.dataset.top}.webp`; });
  Z.drawn('wood', 1000).then((u) => ($('#bWood').src = u));

  const total = () => { const p = PIZZAS[cur]; let s = p.price * SIZES[size].k; for (const [k, n] of Object.entries(counts)) s += (TOPS.find((t) => t[0] === k)[2]) * n * SIZES[size].k; return Math.round(s / 1000) * 1000; };
  function paintPrice() {
    $('#bPrice').innerHTML = `${toman(total())} <small>تومان</small>`;
    $('#bAddLbl').innerHTML = `${icon('box')}در جعبه بگذار · <span class="num">${toman(total())}</span>`;
    $$('#bTops .top').forEach((b) => { const n = counts[b.dataset.k] || 0; b.classList.toggle('on', n > 0); b.querySelector('.n').textContent = n > 1 ? '×' + fa(n) : fa(n); });
  }
  function paintPizza() {
    const p = PIZZAS[cur];
    $('#bPizzaImg').src = Z.dishSrc(p, 'r') || ''; $('#bPizzaImg').alt = p.name;
    $('#bName').innerHTML = `<h3>${p.name}</h3><p>${p.desc}</p><span class="sz">${SIZES[size].label}</span>`;
    paintPrice();
  }
  function setSize(s, anim = true) {
    size = s; $$('#bSizes .size').forEach((b) => b.classList.toggle('on', b.dataset.s === s));
    if (Z.hasGsap) gsap.to(pizza, { scale: SIZES[s].scale, duration: anim ? 0.7 : 0, ease: 'elastic.out(1, 0.55)' }); else pizza.style.transform = `scale(${SIZES[s].scale})`;
    $('#bName .sz') && ($('#bName .sz').textContent = SIZES[s].label);
    paintPrice(); Z.haptic(6);
    if (anim && Z.hasGsap) gsap.fromTo('#bPrice', { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'expo.out' });
  }

  /* ---------- toppings land as scattered pieces ---------- */
  function drop(k, at) { // at: point in pizza space 0..1, or null = scatter everywhere
    const [size, cnt] = Z.TOP_LOOK[k] || [0.12, 8];
    const n = at ? Math.max(4, Math.round(cnt * 0.75)) : cnt; const pieces = [];
    // even, natural coverage: a sunflower spiral with a little jitter instead of pure randomness
    const base = Math.random() * Math.PI * 2;
    for (let i = 0; i < n; i++) {
      let x, y;
      if (at) { const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * 0.17; x = at[0] + Math.cos(a) * d; y = at[1] + Math.sin(a) * d; }
      else { const a = base + i * 2.39996, d = Math.sqrt((i + 0.5) / n) * 0.34 + (Math.random() - 0.5) * 0.04; x = 0.5 + Math.cos(a) * d; y = 0.5 + Math.sin(a) * d; }
      const dd = Math.hypot(x - 0.5, y - 0.5); if (dd > 0.38) { x = 0.5 + (x - 0.5) * 0.38 / dd; y = 0.5 + (y - 0.5) * 0.38 / dd; }
      const sz = size * 100 * (0.88 + Math.random() * 0.24);
      const b = document.createElement('div'); b.className = 'bit vec'; b.dataset.k = k;
      b.style.cssText = `left:${x * 100}%;top:${y * 100}%;width:${sz}%;height:${sz}%;margin:${-sz / 2}% 0 0 ${-sz / 2}%`;
      const im = new Image(); im.alt = ''; im.decoding = 'sync'; im.src = Z.topSVG(k, (Math.random() * 1e6) | 0); b.append(im);
      bits.append(b); pieces.push(b);
    }
    if (Z.hasGsap && !Z.reduce) pieces.forEach((b, i) => {
      const rot = Math.random() * 360;
      gsap.timeline({ delay: i * 0.045 })
        .fromTo(b, { yPercent: -260 - Math.random() * 120, xPercent: (Math.random() - 0.5) * 120, rotation: rot - 140 + Math.random() * 80, scale: 1.5, opacity: 0 },
          { yPercent: 0, xPercent: 0, rotation: rot, scale: 1, opacity: 1, duration: 0.62, ease: 'power3.in' })
        .to(b, { scaleX: 1.08, scaleY: 0.9, duration: 0.09, ease: 'power1.out' })
        .to(b, { scaleX: 1, scaleY: 1, duration: 0.5, ease: 'elastic.out(1, 0.45)' });
    });
    counts[k] = (counts[k] || 0) + 1; paintPrice(); Z.haptic(10);
    if (Z.hasGsap) gsap.fromTo(pizza, { y: 0 }, { y: 3, duration: 0.12, delay: 0.6, yoyo: true, repeat: 1, ease: 'power1.inOut' });
  }
  function takeOff(k) {
    const list = $$(`.bit[data-k="${k}"]`, bits).slice(-9);
    list.forEach((b, i) => Z.hasGsap ? gsap.to(b, { y: -60, opacity: 0, scale: 0.4, rotation: '+=120', duration: 0.4, delay: i * 0.02, ease: 'power2.in', onComplete: () => b.remove() }) : b.remove());
    counts[k] = Math.max(0, (counts[k] || 0) - 1); if (!counts[k]) delete counts[k]; paintPrice(); Z.haptic(6);
  }

  // drag a topping from the tray onto the pizza; a quick tap scatters it everywhere
  let drag = null;
  const ghost = document.createElement('div'); ghost.className = 'drag-ghost'; ghost.innerHTML = '<img alt="">'; ghost.hidden = true; document.body.append(ghost);
  $('#bTops').addEventListener('pointerdown', (e) => {
    const b = e.target.closest('.top'); if (!b) return;
    if (e.target.closest('.n') && counts[b.dataset.k]) { takeOff(b.dataset.k); return; }
    drag = { b, k: b.dataset.k, x: e.clientX, y: e.clientY, t: performance.now(), on: false, id: e.pointerId };
  });
  addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.on) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx) * 0.8) { drag.on = true; drag.b.setPointerCapture?.(e.pointerId); ghost.querySelector('img').src = drag.b.querySelector('img').src; ghost.hidden = false; Z.haptic(6); if (Z.hasGsap) gsap.fromTo(ghost, { scale: 0.6 }, { scale: 1.3, duration: 0.3, ease: 'back.out(2)' }); }
      else if (Math.abs(dx) > 12) { drag = null; return; } // the tray is scrolling
    }
    if (drag.on) { e.preventDefault(); ghost.style.left = e.clientX + 'px'; ghost.style.top = e.clientY + 'px'; const r = pizza.getBoundingClientRect(); const over = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2)) < r.width / 2; boardEl.classList.toggle('target', over); }
  }, { passive: false });
  addEventListener('pointerup', (e) => {
    if (!drag || e.pointerId !== drag.id) return; const d = drag; drag = null; boardEl.classList.remove('target');
    if (!d.on) { if (performance.now() - d.t < 450 && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 10) { if ((counts[d.k] || 0) >= 3) { Z.toast('بیشتر از سه بار نمی‌شود', 'hand'); return; } flyFromTray(d.b, () => drop(d.k, null)); } return; }
    ghost.hidden = true;
    const r = pizza.getBoundingClientRect(); const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
    if (Math.hypot(px - 0.5, py - 0.5) < 0.5) { if ((counts[d.k] || 0) >= 3) { Z.toast('بیشتر از سه بار نمی‌شود', 'hand'); return; } drop(d.k, [px, py]); }
  });
  function flyFromTray(btn, cb) {
    const im = btn.querySelector('img'); if (!Z.hasGsap || Z.reduce) return cb();
    const a = im.getBoundingClientRect(), r = pizza.getBoundingClientRect(); const f = im.cloneNode(); f.className = 'ing-flyer';
    f.style.cssText = `left:${a.left}px;top:${a.top}px;width:${a.width}px;height:${a.height}px`; document.body.append(f);
    gsap.to(f, { x: r.left + r.width / 2 - (a.left + a.width / 2), y: r.top + r.height / 2 - (a.top + a.height / 2), scale: 1.6, rotation: 200, duration: 0.5, ease: 'power3.in', onComplete: () => { f.remove(); cb(); } });
  }

  /* ---------- change pizza: swipe on the board ---------- */
  function go(d) {
    if (busy) return; busy = true; Z.haptic(6);
    const swap = () => { cur = (cur + d + PIZZAS.length) % PIZZAS.length; bits.innerHTML = ''; counts = {}; paintPizza(); };
    if (!Z.hasGsap) { swap(); busy = false; return; }
    gsap.timeline({ onComplete: () => (busy = false) })
      .to(pizza, { xPercent: d > 0 ? -140 : 140, rotation: d > 0 ? -160 : 160, duration: 0.42, ease: 'power3.in' })
      .add(swap)
      .fromTo(pizza, { xPercent: d > 0 ? 140 : -140, rotation: d > 0 ? 160 : -160 }, { xPercent: 0, rotation: 0, duration: 0.8, ease: 'back.out(1.2)' })
      .fromTo('#bName > *', { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.05, ease: 'expo.out' }, '-=0.5');
  }
  let sw = null;
  $('#bStage').addEventListener('pointerdown', (e) => { if (e.target.closest('button')) return; sw = [e.clientX, e.clientY]; });
  $('#bStage').addEventListener('pointerup', (e) => { if (!sw) return; const dx = e.clientX - sw[0], dy = e.clientY - sw[1]; sw = null; if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) go(dx > 0 ? 1 : -1); });
  $('#bPrev').addEventListener('click', () => go(1)); $('#bNext').addEventListener('click', () => go(-1));
  $('#bSizes').addEventListener('click', (e) => { const b = e.target.closest('.size'); if (b && b.dataset.s !== size) setSize(b.dataset.s); });
  $('#bReset').addEventListener('click', () => { Object.keys(counts).forEach((k) => { while (counts[k]) takeOff(k); }); });

  /* ---------- into the box, into the bag ---------- */
  $('#bAdd').addEventListener('click', () => {
    if ($('#bAdd').classList.contains('done')) return;
    const p = PIZZAS[cur];
    const tops = Object.entries(counts).map(([k, n]) => TOPS.find((t) => t[0] === k)[1] + (n > 1 ? ' ×' + fa(n) : ''));
    Z.addLine(p, { custom: { price: total(), label: [SIZES[size].label, ...tops].join('، ') } });
    $('#bAdd').classList.add('done'); Z.haptic(14);
    const box = $('#bBox'), lid = box.querySelector('.lid');
    const fin = () => { $('#bAdd').classList.remove('done'); bits.innerHTML = ''; counts = {}; paintPrice(); if (Z.hasGsap) gsap.set([box, lid, boardEl, pizza], { clearProps: 'all' }); setSize(size, false); };
    if (!Z.hasGsap || Z.reduce) { Z.toast('پیتزا در سبد است', 'bag'); setTimeout(fin, 900); return; }
    const cart = $('#bCart').getBoundingClientRect(), br = boardEl.getBoundingClientRect();
    gsap.timeline({ onComplete: () => { Z.toast(`${p.name} در سبد است`, 'bag'); Z.cartBadge(true); gsap.fromTo('#bCart', { scale: 1.4 }, { scale: 1, duration: 0.6, ease: 'elastic.out(1,0.4)' }); setTimeout(fin, 250); } })
      .set(box, { opacity: 1 })
      .fromTo(box.querySelector('.base'), { scale: 1.2, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: 'power2.out' })
      .to(pizza, { scale: SIZES[size].scale * 0.86, duration: 0.3, ease: 'power2.inOut' }, 0)
      .fromTo(lid, { rotationX: -120 }, { rotationX: 0, duration: 0.55, ease: 'power3.in' }, 0.3)
      .to(lid, { rotationX: 4, duration: 0.08, yoyo: true, repeat: 1 })
      .to(boardEl, { x: cart.left + cart.width / 2 - (br.left + br.width / 2), y: cart.top + cart.height / 2 - (br.top + br.height / 2), scale: 0.08, rotation: 25, duration: 0.85, ease: 'power3.inOut' }, '+=0.15')
      .set(boardEl, { opacity: 0 })
      .set([boardEl], { x: 0, y: 0, scale: 0.6, rotation: 0 })
      .set(box, { opacity: 0 }).set(lid, { rotationX: -120 })
      .to(boardEl, { opacity: 1, scale: 1, duration: 0.7, ease: 'back.out(1.6)' });
  });

  /* ---------- open / close ---------- */
  Z.openBuilder = (item, fromEl) => {
    cur = Math.max(0, PIZZAS.indexOf(item)); counts = {}; bits.innerHTML = ''; size = 'M';
    el.hidden = false; document.body.style.overflow = 'hidden'; $('#bPanel').scrollTop = 0;
    paintPizza(); setSize('M', false); Z.cartBadge();
    if (!Z.hasGsap) return;
    gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.35 });
    gsap.fromTo(boardEl, { scale: 0.4, rotation: -120, opacity: 0 }, { scale: 1, rotation: 0, opacity: 1, duration: 1.1, ease: 'expo.out' });
    gsap.fromTo(pizza, { rotation: 200 }, { rotation: 0, duration: 1.4, ease: 'expo.out' });
    gsap.fromTo(['#bName', '#bSizes', '#bPrice', '.tops-title'], { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'expo.out', stagger: 0.06, delay: 0.25 });
    gsap.fromTo('#bTops .top', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: 'back.out(1.6)', stagger: 0.035, delay: 0.45 });
    gsap.fromTo('#builder .d-bar', { y: 120 }, { y: 0, duration: 0.9, ease: 'expo.out', delay: 0.4 });
    // first visit: a hint that toppings can be dragged
    if (!Z._bHint) { Z._bHint = 1; const t = $('#bTops .top'); gsap.fromTo(t, { y: 0 }, { y: -18, duration: 0.35, yoyo: true, repeat: 3, ease: 'power2.out', delay: 1.4 }); }
  };
  const close = () => { if (Z.hasGsap) gsap.to(el, { opacity: 0, duration: 0.3, onComplete: () => { el.hidden = true; gsap.set(el, { clearProps: 'opacity' }); document.body.style.overflow = ''; } }); else { el.hidden = true; document.body.style.overflow = ''; } };
  $('#bClose').addEventListener('click', close);
  $('#bCart').addEventListener('click', () => { close(); setTimeout(() => Z.openCart(), 320); });
})();
