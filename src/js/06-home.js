/* ============================================================
   Home — a quick way in, not a second menu:
   hero slides → the full-menu entry → the chapters → weekly offers
   → the most-loved dish of each chapter → tonight → our story
   (GSAP Flip card stack) → the atelier at the very end.
   ============================================================ */
(() => {
  const { $, $$, fa, toman, icon, byId } = Z;

  /* ---------- hero slides ---------- */
  const slidesEl = $('#heroSlides'), copy = $('#heroCopy'), dots = $('#heroDots');
  slidesEl.innerHTML = HERO.map((h, i) => `<div class="slide${i ? '' : ' on'}"><img alt="" ${i ? 'loading="lazy"' : 'fetchpriority="high"'} decoding="async" src="${Z.photo(h.photo, 'h') || ''}" style="background-image:url(${Z.lq(h.photo, 'h')})"></div>`).join('');
  dots.innerHTML = HERO.map((_, i) => `<button aria-label="اسلاید ${fa(i + 1)}" class="${i ? '' : 'on'}"></button>`).join('');
  let cur = 0, timer = 0;
  function copyHtml(h) {
    const it = byId[h.dish];
    return `<div class="kicker">${h.kicker}</div><h1><span class="l1">${h.l1}</span><span class="l2">${h.l2}</span></h1><p class="sub">${h.sub}</p>
      <div class="dish"><button class="hero-cta" data-hero-dish>${icon('back')}<span><b>${it.name}</b>${Z.priceEl(it, 'num hp')}</span></button></div>`;
  }
  function showCopy(h, first) {
    copy.innerHTML = copyHtml(h);
    if (!Z.hasGsap) return;
    const parts = [copy.querySelector('.kicker'), copy.querySelector('.l1'), copy.querySelector('.l2'), copy.querySelector('.sub')];
    const d = first ? 0.25 : 0;
    gsap.fromTo(parts, { y: 22, opacity: 0 }, { y: 0, opacity: 1, duration: first ? 1.3 : 0.95, ease: 'expo.out', stagger: 0.07, delay: d });
    // the glass pill never changes its own opacity (that makes the backdrop blur pop in at the end);
    // it is unveiled with a clip instead, and only its contents fade
    const pill = copy.querySelector('.hero-cta');
    gsap.fromTo(pill, { clipPath: 'inset(0% 0% 0% 100% round 999px)' }, { clipPath: 'inset(0% 0% 0% 0% round 999px)', duration: 1.1, ease: 'expo.inOut', delay: d + 0.2, clearProps: 'clipPath' });
    gsap.fromTo(pill.children, { opacity: 0, x: 10 }, { opacity: 1, x: 0, duration: 0.8, ease: 'expo.out', stagger: 0.08, delay: d + 0.55 });
  }
  function go(i, dir = 1) {
    if (i === cur) return;
    const slides = $$('.slide', slidesEl), from = slides[cur], to = slides[(i + HERO.length) % HERO.length];
    cur = (i + HERO.length) % HERO.length;
    $$('button', dots).forEach((b, k) => b.classList.toggle('on', k === cur));
    if (Z.hasGsap) {
      const pill = copy.querySelector('.hero-cta'); if (pill) gsap.to(pill, { clipPath: 'inset(0% 100% 0% 0% round 999px)', duration: 0.35, ease: 'power2.in' });
      gsap.to([...copy.children].filter((c) => !c.classList.contains('dish')), { y: -14, opacity: 0, duration: 0.35, ease: 'power2.in', stagger: 0.03, onComplete: () => showCopy(HERO[cur]) });
      to.classList.add('on'); gsap.set(to, { zIndex: 2 }); gsap.set(from, { zIndex: 1 });
      gsap.fromTo(to, { clipPath: dir > 0 ? 'inset(0 100% 0 0)' : 'inset(0 0 0 100%)' }, { clipPath: 'inset(0 0% 0 0%)', duration: 1.1, ease: 'expo.inOut', onComplete: () => { from.classList.remove('on'); gsap.set(to, { clearProps: 'clipPath' }); } });
      kenBurns(to);
    } else { from.classList.remove('on'); to.classList.add('on'); showCopy(HERO[cur]); }
    restart();
  }
  function kenBurns(slide) { if (!Z.hasGsap || Z.reduce) return; const img = slide.querySelector('img'); gsap.fromTo(img, { scale: 1.14, xPercent: 2 }, { scale: 1.02, xPercent: 0, duration: 8, ease: 'none' }); }
  const restart = () => { clearTimeout(timer); timer = setTimeout(() => go(cur + 1), 6500); };
  dots.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) go([...dots.children].indexOf(b), [...dots.children].indexOf(b) > cur ? 1 : -1); });
  let sx = null;
  $('#hero').addEventListener('pointerdown', (e) => { if (e.target.closest('button')) return; sx = [e.clientX, e.clientY]; });
  $('#hero').addEventListener('pointerup', (e) => { if (!sx) return; const dx = e.clientX - sx[0], dy = e.clientY - sx[1]; sx = null; if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) go(cur + (dx > 0 ? 1 : -1), dx > 0 ? 1 : -1); });
  copy.addEventListener('click', (e) => { if (e.target.closest('[data-hero-dish]')) Z.openDetail(byId[HERO[cur].dish], $('.slide.on img', slidesEl)); });
  Z.glass($('#openSearch2'), { drag: true });


  /* ---------- dish cards (used by the most-loved rail) ---------- */
  Z.card = (it, kicker) => `<button class="card" data-id="${it.id}"><div class="ph"><img alt="${it.name}" data-dish="${it.id}"><span class="dots3" data-quick="${it.id}" role="button" aria-label="افزودن ${it.name}">${icon('plus')}</span>${kicker ? `<span class="ck">${kicker}</span>` : ''}</div>
    <div class="tx"><span class="nm">${it.name}</span><span class="sb">${it.desc}</span>${Z.priceEl(it, 'pr num')}</div></button>`;

  /* ---------- most loved: a few best dishes per family ---------- */
  const LOVED = [
    { id: 'iran', name: 'ایرانی', ids: ['soltani', 'koobideh', 'ghormeh', 'zereshk', 'kashk-bademjan', 'barg'] },
    { id: 'fast', name: 'فست‌فود', ids: ['pizza-special', 'burger-double', 'lasagna', 'pizza-margherita', 'fries-special'] },
    { id: 'drink', name: 'نوشیدنی', ids: ['tea-saffron', 'mojito', 'doogh', 'lemonade', 'latte'] },
    { id: 'sweet', name: 'دسر', ids: ['sholeh-zard', 'bastani', 'baklava', 'tiramisu'] },
  ];
  const rail = $('#homeRail'), lt = $('#lovedTabs');
  lt.insertAdjacentHTML('beforeend', LOVED.map((g, i) => `<button role="tab" data-g="${g.id}" class="${i ? '' : 'on'}">${g.name}</button>`).join(''));
  const pill = lt.querySelector('.lt-pill');
  const movePill = () => { const on = lt.querySelector('button.on'); if (!on) return; pill.style.width = on.offsetWidth + 'px'; pill.style.transform = `translateX(${on.offsetLeft - pill.offsetLeft}px)`; };
  function fillLoved(gid, animate) {
    const g = LOVED.find((x) => x.id === gid);
    const put = () => {
      rail.innerHTML = g.ids.map((id) => byId[id]).filter(Boolean).map((it) => Z.card(it, Z.catById[it.cat].name)).join('');
      rail.scrollLeft = 0;
      $$('img[data-dish]', rail).forEach((img) => Z.setDishImg(img, byId[img.dataset.dish], 'c'));
      Z.applyStock && Z.applyStock();
      if (animate && Z.hasGsap) gsap.from(rail.children, { x: -40, opacity: 0, duration: 0.8, ease: 'expo.out', stagger: 0.05 });
    };
    if (animate && Z.hasGsap && rail.children.length) gsap.to(rail.children, { x: 24, opacity: 0, duration: 0.2, ease: 'power2.in', stagger: 0.02, onComplete: put }); else put();
  }
  lt.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b || b.classList.contains('on')) return; $$('button', lt).forEach((x) => x.classList.toggle('on', x === b)); movePill(); fillLoved(b.dataset.g, true); Z.haptic(5); });
  fillLoved('iran'); requestAnimationFrame(movePill); addEventListener('resize', movePill); document.fonts && document.fonts.ready.then(movePill);
  rail.addEventListener('click', (e) => { const k = e.target.closest('.ck'); if (k) { e.stopPropagation(); Z.go('menu', { chapter: byId[k.closest('.card').dataset.id].cat }); } }, true);

  // any dish card anywhere: tap opens, the + quick-adds
  document.addEventListener('click', (e) => {
    const q = e.target.closest('[data-quick]');
    if (q) { e.stopPropagation(); const it = byId[q.dataset.quick]; Z.quickAdd(it, q.closest('.card, .zz-item, .mz, .hcard, .fl, .bowl-item, .s-row, .fav, .shop-item')?.querySelector('img') || q); return; }
    const c = e.target.closest('.card[data-id], .fav[data-id]'); if (c) Z.openDetail(byId[c.dataset.id], c.querySelector('img'));
  });
  Z.quickAdd = (it, img) => {
    if (it.builder && it.cat === 'pizza') { Z.openBuilder(it, img); return; }
    if (!Z.addLine(it)) return; Z.flyTo(img, $('#navPlus')); Z.toast(`${it.name} اضافه شد`, 'bag');
  };

  /* ---------- chapter tiles: wide tiles placed so every row is full ---------- */
  const WIDE = new Set([0, 3, 8, 11]);
  $('#chTiles').innerHTML = CATEGORIES.map((c, i) => {
    const n = ITEMS.filter((x) => x.cat === c.id).length, key = 'ch-' + c.id;
    return `<button class="ch-tile${WIDE.has(i) ? ' wide' : ''}" data-ch="${c.id}" style="--acc:${c.accent}"><img alt="" loading="lazy" decoding="async" src="p/t/${key}.webp" style="background-image:url(${Z.lq(key, 'h')})">
      <span class="t"><span class="k">${c.kicker}</span><b>${c.name}</b><span class="num">${fa(n)} انتخاب</span></span><span class="go">${icon('back')}</span></button>`;
  }).join('');
  $('#chTiles').addEventListener('click', (e) => { const t = e.target.closest('[data-ch]'); if (t) Z.go('menu', { chapter: t.dataset.ch }); });

  /* ---------- our story: the card stack (GsapFlipCard) ---------- */
  const flip = $('#flip');
  flip.insertAdjacentHTML('afterbegin', KITCHEN.map((k, i) => `<button class="fc" data-i="${i}" aria-label="${k.alt}"><img alt="${k.alt}" loading="lazy" decoding="async" src="${Z.photo(k.photo, 'hs') || ''}" data-full="${Z.photo(k.photo, 'h') || ''}" style="background-image:url(${Z.lq(k.photo, 'h')})"></button>`).join(''));
  const cards = $$('.fc', flip);
  let open = false, active = 0, capSplit = null;
  function layout() {
    const W = flip.clientWidth, H = flip.clientHeight, n = cards.length;
    cards.forEach((c, i) => {
      let s;
      if (!open) {
        const k = i - (n - 1) / 2, w = Math.min(170, W * 0.46), h = w * 1.3;
        s = { left: W / 2 - w / 2 + k * 18, top: H / 2 - h / 2 - 8 + Math.abs(k) * 6, width: w, height: h, borderRadius: 22, rotation: k * 6, zIndex: i + 1 };
      } else if (i === active) s = { left: 14, top: 14, width: W - 28, height: Math.min(236, H * 0.53), borderRadius: 22, rotation: 0, zIndex: 20 };
      else { const j = cards.filter((_, x) => x !== active).indexOf(c); s = { left: 22 + j * 52, top: H - 18 - 44, width: 44, height: 44, borderRadius: 13, rotation: 0, zIndex: 10 + j }; }
      gsap.set(c, { left: s.left, top: s.top, width: s.width, height: s.height, borderRadius: s.borderRadius, rotation: s.rotation, zIndex: s.zIndex });
    });
  }
  function caption() {
    const k = KITCHEN[active];
    const im = cards[active].querySelector('img'); if (im.dataset.full && im.src.indexOf('/hs/') > -1) im.src = im.dataset.full;
    $('#flipTitle').textContent = k.title;
    $('#flipMeta').textContent = k.when;
    $('#flipCounter').innerHTML = `<b>${fa(active + 1)}</b> از ${fa(cards.length)}`;
    const cap = $('#flipCap');
    if (capSplit) { capSplit.revert(); capSplit = null; }
    cap.textContent = k.caption;
    if (window.SplitText && !Z.reduce) { capSplit = new SplitText(cap, { type: 'words' }); gsap.from(capSplit.words, { opacity: 0, y: 8, duration: 0.6, ease: 'power3.out', stagger: 0.03, delay: 0.35 }); }
  }
  function animateTo(fn) {
    if (!Z.hasGsap || !window.Flip) { fn(); layout(); return; }
    const st = Flip.getState(cards, { props: 'borderRadius' });
    fn(); layout();
    Flip.from(st, { duration: 0.85, ease: 'expo.inOut', absolute: true, stagger: 0.025 });
  }
  flip.addEventListener('click', (e) => {
    const c = e.target.closest('.fc'); if (!c) return; const i = +c.dataset.i;
    Z.haptic(6);
    if (!open) animateTo(() => { open = true; active = i; flip.classList.add('open'); caption(); });
    else if (i === active) animateTo(() => { open = false; flip.classList.remove('open'); });
    else animateTo(() => { active = i; caption(); });
  });
  if (Z.hasGsap) { layout(); addEventListener('resize', layout); }

  /* ---------- favourites count ---------- */
  const favCount = () => { const n = Z.favs.size, c = $('#favCount'); c.textContent = fa(n); c.classList.toggle('on', n > 0); };
  favCount(); document.addEventListener('favs', favCount);
  $('#toFavs').addEventListener('click', () => Z.go('favs'));

  /* ---------- entrance (after the splash) ---------- */
  document.addEventListener('entered', () => {
    showCopy(HERO[0], true); kenBurns($('.slide.on', slidesEl)); restart();
    if (!Z.hasGsap) return;
    gsap.fromTo('.topbar > *', { y: -18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: 'expo.out', stagger: 0.06, delay: 0.3, clearProps: 'transform,opacity' });
    gsap.fromTo('.sheet-home', { y: 80 }, { y: 0, duration: 1.2, ease: 'expo.out', delay: 0.35, clearProps: 'transform' });
    gsap.fromTo('#nav', { y: 120 }, { y: 0, duration: 1.1, ease: 'expo.out', delay: 0.6, clearProps: 'transform' });
    gsap.fromTo('.nav-menu .nm-disc', { scale: 0.6, rotation: -45 }, { scale: 1, rotation: 0, duration: 1.1, ease: 'expo.out', delay: 0.9, clearProps: 'transform' });
    if (window.ScrollTrigger) {
      gsap.to('#heroSlides', { yPercent: 18, scale: 1.06, ease: 'none', scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true } });
    }
    // warm the cache for the menu while the guest looks at the home page
    const idle = window.requestIdleCallback || ((f) => setTimeout(f, 1200));
    const warm = () => { const q = ITEMS.map((it) => Z.dishSrc(it, 'rs')).filter(Boolean); let n = 0; const next = () => { const u = q[n++]; if (!u) return; const im = new Image(); im.decoding = 'async'; im.onload = im.onerror = () => idle(next); im.src = u; }; next(); next(); next(); };
    const after = () => setTimeout(() => idle(warm), 700);
    document.readyState === 'complete' ? after() : addEventListener('load', after, { once: true });
  });
})();
