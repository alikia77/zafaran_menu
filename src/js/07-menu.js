/* ============================================================
   Menu — reference 2. Every category is a chapter with its own
   ground colour, light, weather and choreography:
   kebab  · zigzag plates thrown in with a spice cloud, embers
   stew   · bowls rise through steam
   polo   · zigzag plates that keep turning with the scroll, saffron
   mezze  · plates dealt onto the table like cards
   pizza  · the wooden board carousel (video 2)
   burger · one burger at a time, dropped onto the stage
   pasta  · a rail where the plates twirl as you swipe
   bar    · a lit shelf of real glasses that slosh (drinks)
   tea    · the tea house, poured as you arrive
   dessert· cards floating on petals
   ============================================================ */
(() => {
  const { $, $$, fa, toman, icon, byId } = Z;
  const host = $('#chapters');
  let built = false, chapterST = [];
  const tagHtml = (it) => it.tags.map((t) => `<span class="tag ${t}">${icon(t === 'signature' ? 'crown' : t === 'spicy' ? 'flame' : 'leaf')}${TAG_LABEL[t]}</span>`).join('');
  const buy = (it, small) => `<div class="buy">${Z.priceEl(it)}<button class="add" data-quick="${it.id}" aria-label="افزودن ${it.name}">${icon('plus')}</button></div>`;
  const GARNISH = { kebab: ['mint', 'herb', 'mint'], polo: ['barberry', 'mint', 'barberry'] };
  const SCRIPT = { kebab: 'نوش جان', pizza: 'داغِ داغ', cold: 'گوارای وجود', dessert: 'شیرینِ آخر شب' };
  const REVEAL = { kebab: 'rise', stew: 'clear', polo: 'bloom', starter: 'wipe', pizza: 'zoom', burger: 'drop', pasta: 'slide', sandwich: 'wipe', salad: 'clear', cold: 'tide', hot: 'clear', dessert: 'bloom' };

  // three soft wisps of steam (SVG, animated in CSS only while the bowl is on screen)
  const STEAM = `<svg class="steam" viewBox="0 0 120 160" aria-hidden="true"><defs><linearGradient id="stmG" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#fff6e8" stop-opacity="0"/><stop offset=".35" stop-color="#fff6e8" stop-opacity=".55"/><stop offset="1" stop-color="#fff6e8" stop-opacity="0"/></linearGradient><filter id="stmB"><feGaussianBlur stdDeviation="2.2"/></filter></defs>${[0, 1, 2].map((k) => `<path class="w w${k}" d="M${40 + k * 20} 160 C ${28 + k * 20} 128, ${54 + k * 20} 108, ${40 + k * 20} 80 S ${30 + k * 20} 34, ${46 + k * 20} 0" fill="none" stroke="url(#stmG)" stroke-width="${7 - k}" stroke-linecap="round" filter="url(#stmB)"/>`).join('')}</svg>`;
  /* ---------- markup per layout ---------- */
  const L = {
    zigzag(c, items) {
      return `<div class="zz ${c.variant || ''}">${items.map((it, i) => `<article class="zz-item ${i % 2 ? 'l' : 'r'}" data-id="${it.id}">
        <div class="plate"><canvas class="dust"></canvas><img class="pimg" data-dish="${it.id}" alt="${it.name}">
</div>
        <div class="txt"><div class="tags">${tagHtml(it)}</div><h3>${it.name}</h3><p class="d">${it.desc}</p>${buy(it)}</div></article>`).join('')}</div>`;
    },
    bowls(c, items) { return `<div class="bowls">${items.map((it) => `<article class="bowl-item" data-id="${it.id}"><div class="plate"><span class="ring"></span><span class="ring r2"></span>${STEAM}<img class="pimg" data-dish="${it.id}" alt="${it.name}"></div><div class="tags">${tagHtml(it)}</div><h3>${it.name}</h3><p class="d">${it.desc}</p>${buy(it)}</article>`).join('')}</div>`; },
    mezze(c, items) { return `<div class="mezze">${items.map((it) => `<article class="mz" data-id="${it.id}"><div class="plate"><img class="pimg" data-dish="${it.id}" alt="${it.name}"></div><h3>${it.name}</h3><p class="d">${it.desc}</p>${buy(it)}</article>`).join('')}</div>`; },
    board(c, items) {
      return `<div class="board-wrap" data-cat="${c.id}"><div class="board-stage"><div class="pz-side prev"><img alt=""></div><div class="pz-side next"><img alt=""></div>
        <div class="board"><img class="wood" alt="" data-wood><div class="pz"><img alt=""></div></div></div>
        <div class="board-cap"><div class="tags"></div><h3></h3><p class="d"></p><div class="row"><span class="price num"></span><button class="btn-ghost" data-build>${icon('sliders')}بساز و تغییر بده</button><button class="add" data-badd aria-label="افزودن">${icon('plus')}</button></div></div>
        <div class="board-dots">${items.map(() => '<i></i>').join('')}</div></div>`;
    },
    stack(c, items) {
      return `<div class="stack-stage"><div class="stack-pin"><div class="stack-glow"></div>
        <div class="stack" role="group" aria-roledescription="carousel">${items.map((it, i) => `<img class="layer" data-dish="${it.id}" data-k="r" alt="${it.name}" style="z-index:${i + 1}">`).join('')}<span class="stack-floor"></span></div>
        <button class="stack-arw prev" data-snav="1" aria-label="قبلی">${icon('back')}</button><button class="stack-arw next" data-snav="-1" aria-label="بعدی">${icon('fwd')}</button>
        <div class="stack-cap"><span class="lbl num"></span><h3></h3><p class="d"></p><div class="row"><span class="price num"></span><button class="btn-ghost" data-bcustom>${icon('sliders')}گوشت و لایه‌ها</button><button class="add" data-sadd aria-label="افزودن">${icon('plus')}</button></div></div>
        <div class="stack-thumbs">${items.map((it, i) => `<button class="st-th" data-sk="${i}" aria-label="${it.name}"><img data-dish="${it.id}" data-k="rs" alt=""><span>${it.name.replace('همبرگر ', '').replace('برگر ', '')}</span></button>`).join('')}</div></div></div>`;
    },
    rail(c, items) { return `<div class="hrail ${c.variant || ''}">${items.map((it) => `<article class="hcard" data-id="${it.id}"><div class="plate"><img class="pimg" data-dish="${it.id}" alt="${it.name}"></div><h3>${it.name}</h3><p class="d">${it.desc}</p>${buy(it)}</article>`).join('')}</div>`; },
    bar(c, items) {
      return `<div class="bar"><div class="bar-shelf"><canvas></canvas><div class="bar-light"></div></div><div class="bar-cap"><h3></h3><p class="d"></p><div class="row"><span class="price num"></span><button class="add" data-baradd aria-label="افزودن">${icon('plus')}</button></div></div>
        <div class="bar-list">${items.map((it, i) => `<button class="bar-row" data-i="${i}"><span class="sw" style="background:radial-gradient(circle at 40% 35%, ${(Z.DRINK_SPECS[it.id] || {}).liquid || '#888'}, ${it.glow} 80%)">${Z.dishSrc(it, 'r') ? `<img alt="" loading="lazy" src="${Z.dishSrc(it, 'r')}">` : ''}</span><span><span class="nm">${it.name}</span><br><span class="ds">${it.desc}</span></span>${Z.priceEl(it)}</button>`).join('')}</div></div>`;
    },
    tea(c, items) { return `<div class="tea-row">${items.map((it) => `<article class="tea" data-id="${it.id}"><canvas></canvas><h3>${it.name}</h3>${Z.priceEl(it)}<button class="add" data-quick="${it.id}" aria-label="افزودن ${it.name}">${icon('plus')}</button></article>`).join('')}</div><p class="tea-note">${icon('clock')}هر فنجان همان لحظه آماده می‌شود؛ چای در قوری دم می‌کشد و قهوه از دانه‌ی تازه‌آسیاب.</p>`; },
    float(c, items) { return `<div class="float-grid">${items.map((it) => `<article class="fl" data-id="${it.id}"><div class="plate"><img class="pimg" data-dish="${it.id}" alt="${it.name}"></div><h3>${it.name}</h3>${buy(it)}</article>`).join('')}</div>`; },
  };

  function build() {
    if (built) return; built = true;
    $('#mvCount').textContent = `${fa(ITEMS.length)} انتخاب`;
    // chapter chips
    $('#chScroll').insertAdjacentHTML('beforeend', CATEGORIES.map((c) => `<button class="ch-chip" data-ch="${c.id}">${c.name}</button>`).join(''));
    host.innerHTML = CATEGORIES.map((c, n) => {
      const items = ITEMS.filter((i) => i.cat === c.id);
      const min = Math.min(...items.map((i) => i.price));
      return `<section class="chapter lay-${c.layout}" id="ch-${c.id}" data-ch="${c.id}" style="--ch-bg:${c.bg};--ch-accent:${c.accent};--ch-glow:${c.glow}">
        <header class="ch-open" data-reveal="${REVEAL[c.id]}"><div class="bg"><img alt="" loading="lazy" src="${Z.photo('ch-' + c.id, 'h') || ''}"></div>
          <div class="no num">${fa(String(n + 1).padStart(2, '0'))} — ${c.kicker}</div><h2>${c.name}</h2><p>${c.line}</p>
          <div class="meta"><span><b class="num">${fa(items.length)}</b> انتخاب</span><span>از <b class="num">${toman(min)}</b> تومان</span></div></header>
        ${L[c.layout](c, items)}
      </section>`;
    }).join('');
    // pictures
    $$('img[data-dish]', host).forEach((img) => Z.setDishImg(img, byId[img.dataset.dish], img.dataset.k || 'r'));
    $$('img[data-ing]', host).forEach((img) => Z.drawn('ing-' + img.dataset.ing, 160).then((u) => (img.src = u)));
    $$('img[data-wood]', host).forEach((img) => Z.drawn('wood', 900).then((u) => (img.src = u)));
    $('#bookCard img').src = Z.photo('book', 'h') || '';
    CATEGORIES.forEach((c) => { const sec = $('#ch-' + c.id); if (c.layout === 'board') board(sec, c); if (c.layout === 'stack') stack(sec, c); if (c.layout === 'bar') bar(sec, c); if (c.layout === 'tea') $$('.tea canvas', sec).forEach((cv) => Z.makeTea(cv, byId[cv.parentElement.dataset.id])); if (c.layout === 'rail' && c.variant === 'twirl') twirl(sec); });
    Z.fx.mount($('#menu'));
    choreograph(); Z.applyStock();
  }

  /* ---------- pizza board (video 2) ---------- */
  function board(sec, c) {
    const items = ITEMS.filter((i) => i.cat === c.id);
    const stage = $('.board-stage', sec), pz = $('.pz', sec), pzImg = $('.pz img', sec), cap = $('.board-cap', sec);
    const prev = $('.pz-side.prev img', sec), next = $('.pz-side.next img', sec);
    let i = 0, busy = false;
    const set = (img, it) => { img.src = Z.dishSrc(it, 'r') || ''; img.alt = it.name; };
    function paint() {
      const it = items[i]; set(pzImg, it); set(prev, items[(i - 1 + items.length) % items.length]); set(next, items[(i + 1) % items.length]);
      $('h3', cap).textContent = it.name; $('.d', cap).textContent = it.desc; Z.setPrice($('.price', cap), it); $('.tags', cap).innerHTML = tagHtml(it);
      $$('.board-dots i', sec).forEach((d, k) => d.classList.toggle('on', k === i));
    }
    function go(d) {
      if (busy) return; busy = true; Z.haptic(6);
      cap.classList.add('swap');
      const done = () => { i = (i + d + items.length) % items.length; paint(); cap.classList.remove('swap'); };
      if (!Z.hasGsap) { done(); busy = false; return; }
      // the pizza spins off the board one way; the next one spins on from the other side
      gsap.timeline({ onComplete: () => (busy = false) })
        .to(pz, { xPercent: d > 0 ? -130 : 130, rotation: d > 0 ? -140 : 140, scale: 0.7, duration: 0.42, ease: 'power3.in' })
        .add(done)
        .fromTo(pz, { xPercent: d > 0 ? 130 : -130, rotation: d > 0 ? 140 : -140, scale: 0.7 }, { xPercent: 0, rotation: 0, scale: 1, duration: 0.75, ease: 'back.out(1.25)' });
    }
    paint();
    let sx = null;
    stage.addEventListener('pointerdown', (e) => { sx = { x: e.clientX, y: e.clientY, t: performance.now(), rot: 0 }; });
    stage.addEventListener('pointermove', (e) => { if (!sx || busy) return; const dx = e.clientX - sx.x; if (Math.abs(dx) > Math.abs(e.clientY - sx.y) && Math.abs(dx) > 6) { gsap.set(pz, { rotation: dx * 0.5, x: dx * 0.25 }); sx.rot = dx; } });
    const up = (e) => {
      if (!sx) return; const dx = e.clientX - sx.x, quick = performance.now() - sx.t < 300; const s = sx; sx = null;
      if (Math.abs(dx) > 50) { gsap.set(pz, { x: 0 }); go(dx > 0 ? 1 : -1); }
      else { if (s.rot) gsap.to(pz, { rotation: 0, x: 0, duration: 0.6, ease: 'elastic.out(1,0.5)' }); else if (quick && e.target.closest('.board')) Z.openDetail(items[i], pzImg); }
    };
    stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', () => (sx = null));
    $('[data-build]', sec).addEventListener('click', () => Z.openBuilder(items[i], pzImg));
    $('[data-badd]', sec).addEventListener('click', () => Z.openBuilder(items[i], pzImg));
    // idle: the pizza turns slowly on the board, like on a display stand
    if (Z.hasGsap && !Z.reduce) gsap.to($('.pz img', sec), { rotation: 360, duration: 60, ease: 'none', repeat: -1 });
  }

  /* ---------- burgers: one at a time, dropped onto the stage ---------- */
  function stack(sec, c) {
    const items = ITEMS.filter((i) => i.cat === c.id), layers = $$('.stack .layer', sec), cap = $('.stack-cap', sec);
    let cur = -1;
    function show(k) {
      if (k === cur) return; const prev = cur; cur = k; const it = items[k];
      $('.lbl', cap).textContent = `${fa(k + 1)} از ${fa(items.length)} · ${it.tags.includes('signature') ? 'پیشنهاد سرآشپز' : 'گریل'}`;
      $('h3', cap).textContent = it.name; $('.d', cap).textContent = it.desc; Z.setPrice($('.price', cap), it);
      $$('.st-th', sec).forEach((d, x) => d.classList.toggle('on', x === k));
      if (!Z.hasGsap) { layers.forEach((l, x) => (l.style.opacity = x === k ? 1 : 0)); return; }
      gsap.fromTo(cap.children, { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'expo.out', stagger: 0.04, overwrite: true });
      layers.forEach((l, x) => {
        if (x === k) gsap.fromTo(l, { yPercent: prev < k ? -120 : 60, rotation: prev < k ? -10 : 6, scale: 0.86, opacity: 0 }, { yPercent: 0, rotation: 0, scale: 1, opacity: 1, duration: 0.9, ease: 'bounce.out', overwrite: true, onStart: () => Z.haptic(5) });
        else if (x === prev) gsap.to(l, { yPercent: prev < k ? 50 : -110, scale: 0.8, rotation: prev < k ? 8 : -8, opacity: 0, duration: 0.5, ease: 'power3.in', overwrite: true });
        else gsap.set(l, { opacity: 0 });
      });
    }
    show(0);
    // pick freely: thumbnails, arrows or a horizontal swipe on the stage — no forced scrolling
    const go = (k) => { k = (k + items.length) % items.length; if (k !== cur) show(k); };
    $$('.st-th', sec).forEach((b) => b.addEventListener('click', () => go(+b.dataset.sk)));
    $$('[data-snav]', sec).forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); go(cur - +b.dataset.snav); }));
    let sw = null; const st = $('.stack', sec);
    st.addEventListener('pointerdown', (e) => (sw = { x: e.clientX, y: e.clientY, moved: false }));
    st.addEventListener('pointermove', (e) => { if (sw && Math.abs(e.clientX - sw.x) > 12 && Math.abs(e.clientX - sw.x) > Math.abs(e.clientY - sw.y)) sw.moved = true; });
    st.addEventListener('pointerup', (e) => { if (sw && sw.moved) { go(cur + (e.clientX > sw.x ? 1 : -1)); sw.skip = true; } setTimeout(() => (sw = null)); });
    $('[data-sadd]', sec).addEventListener('click', () => { if (!Z.addLine(items[cur])) return; Z.flyTo(layers[cur], $('#navPlus')); Z.toast(`${items[cur].name} اضافه شد`, 'bag'); });
    $('[data-bcustom]', sec).addEventListener('click', () => Z.openDetail(items[cur], layers[cur], { tab: 'custom' }));
    $('.stack', sec).addEventListener('click', () => { if (sw && sw.skip) return; Z.openDetail(items[cur], layers[cur]); });
  }

  /* ---------- the bar: cold drinks on a lit shelf ---------- */
  function bar(sec, c) {
    const items = ITEMS.filter((i) => i.cat === c.id), cap = $('.bar-cap', sec), rows = $$('.bar-row', sec);
    let cur = 0;
    const paint = (k) => { cur = k; const it = items[k]; cap.classList.add('swap'); setTimeout(() => { $('h3', cap).textContent = it.name; $('.d', cap).textContent = it.desc; Z.setPrice($('.price', cap), it); cap.classList.remove('swap'); }, 160); rows.forEach((r, x) => r.classList.toggle('on', x === k)); sec.style.setProperty('--bar-glow', it.glow); };
    paint(0);
    const shelf = Z.makeBar($('.bar-shelf canvas', sec), items, paint);
    rows.forEach((r) => r.addEventListener('click', () => { shelf.go(+r.dataset.i); $('.bar-shelf', sec).scrollIntoView({ behavior: 'smooth', block: 'center' }); }));
    $('[data-baradd]', sec).addEventListener('click', () => { if (!Z.addLine(items[cur])) return; Z.flyTo($('.bar-shelf canvas', sec), $('#navPlus'), Z.dishSrc(items[cur], 'r')); Z.toast(`${items[cur].name} اضافه شد`, 'bag'); });
  }

  /* ---------- pasta: plates twirl as the rail moves ---------- */
  function twirl(sec) {
    const rail = $('.hrail', sec), plates = $$('.pimg', sec);
    rail.addEventListener('scroll', () => { const x = rail.scrollLeft; plates.forEach((p, i) => (p.style.transform = `rotate(${x * 0.35 + i * 30}deg)`)); }, { passive: true });
  }

  /* ---------- choreography (ScrollTrigger) ---------- */
  function choreograph() {
    const view = $('#menu');
    if (!Z.hasGsap || !window.ScrollTrigger) { $$('.zz-item, .bowl-item, .mz, .fl, .hcard', host).forEach((x) => (x.style.opacity = 1)); return; }
    // chapter worlds: ground colour, chip, weather
    CATEGORIES.forEach((c, n) => {
      const sec = $('#ch-' + c.id);
      chapterST.push(ScrollTrigger.create({ trigger: sec, start: 'top 55%', end: 'bottom 55%', onToggle: (st) => { if (st.isActive) enterChapter(c, n); } }));
      // opening: each chapter arrives differently
      const open = $('.ch-open', sec), img = $('.bg img', open), h2 = $('h2', open), rest = [$('.no', open), $('p', open), $('.meta', open)];
      const kind = open.dataset.reveal;
      const tl = gsap.timeline({ scrollTrigger: { trigger: open, start: 'top 96%', once: true } });
      let words = [h2];
      if (window.SplitText) words = new SplitText(h2, { type: 'words' }).words;
      if (kind === 'rise') tl.from(img, { scale: 1.35, duration: 1.8, ease: 'expo.out' }).from(words, { yPercent: 90, opacity: 0, duration: 1.1, ease: 'expo.out', stagger: 0.08 }, 0.15);
      else if (kind === 'clear') tl.from(img, { scale: 1.15, duration: 2, ease: 'power2.out' }).from(words, { opacity: 0, duration: 1.4, ease: 'power2.out' }, 0.2);
      else if (kind === 'bloom') tl.fromTo(open.querySelector('.bg'), { clipPath: 'circle(8% at 50% 60%)' }, { clipPath: 'circle(85% at 50% 60%)', duration: 1.6, ease: 'expo.inOut' }).from(words, { scale: 0.7, opacity: 0, duration: 1, ease: 'back.out(1.6)', stagger: 0.06 }, 0.6);
      else if (kind === 'wipe') tl.fromTo(open.querySelector('.bg'), { clipPath: 'inset(0 0 0 100%)' }, { clipPath: 'inset(0 0 0 0%)', duration: 1.3, ease: 'expo.inOut' }).from(words, { xPercent: -30, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.06 }, 0.5);
      else if (kind === 'zoom') tl.from(img, { scale: 0.6, rotation: -14, borderRadius: '50%', duration: 1.6, ease: 'expo.out' }).from(words, { y: 40, opacity: 0, duration: 1, ease: 'expo.out' }, 0.3);
      else if (kind === 'drop') tl.from(words, { yPercent: -160, opacity: 0, duration: 1.1, ease: 'bounce.out', stagger: 0.1 }).from(img, { yPercent: -12, opacity: 0, duration: 1.4, ease: 'power3.out' }, 0);
      else if (kind === 'slide') tl.from(img, { xPercent: 40, opacity: 0, duration: 1.4, ease: 'expo.out' }).from(words, { xPercent: 40, opacity: 0, duration: 1, ease: 'expo.out' }, 0.2);
      else if (kind === 'tide') tl.fromTo(open.querySelector('.bg'), { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: 1.5, ease: 'expo.inOut' }).from(words, { y: 50, opacity: 0, duration: 1.1, ease: 'expo.out' }, 0.6);
      tl.from(rest, { y: 18, opacity: 0, duration: 0.9, ease: 'expo.out', stagger: 0.08 }, '-=0.8');
      gsap.to(img, { yPercent: -14, ease: 'none', scrollTrigger: { trigger: open, start: 'top bottom', end: 'bottom top', scrub: true } });
    });

    // zigzag: plates thrown in from the side, landing in a spice cloud
    $$('.zz-item', host).forEach((it) => {
      const plate = $('.plate', it), img = $('.pimg', plate), txt = $('.txt', it), left = it.classList.contains('l');
      const cat = Z.catById[it.closest('.chapter').dataset.ch];
      const tl = gsap.timeline({ scrollTrigger: { trigger: it, start: 'top 96%', once: true } });
      tl.from(plate, { xPercent: left ? -120 : 120, rotation: left ? -160 : 160, scale: 0.55, duration: 0.9, ease: 'expo.out' })
        .add(() => Z.landLight(plate, { tone: cat.accent && /^#[0-9a-f]{6}$/i.test(cat.accent) ? '#e8c98a' : '#e8c98a', saffron: cat.id === 'kebab' || cat.id === 'polo' }), 0.42)
        .from(txt.children, { y: 22, opacity: 0, duration: 0.8, ease: 'expo.out', stagger: 0.07 }, 0.3)
        .from($$('.garnish', plate), { scale: 0, rotation: 90, duration: 0.8, ease: 'back.out(2)', stagger: 0.1 }, 0.6);
      $$('.garnish', plate).forEach((g, k) => gsap.to(g, { y: k ? 8 : -10, rotation: k ? -12 : 14, duration: 2.4 + k, ease: 'sine.inOut', yoyo: true, repeat: -1 }));
      if (it.closest('.zz').classList.contains('spin')) gsap.to(img, { rotation: left ? 240 : -240, ease: 'none', scrollTrigger: { trigger: it, start: 'top bottom', end: 'bottom top', scrub: 0.6 } });
      else gsap.to(img, { rotation: left ? 30 : -30, ease: 'none', scrollTrigger: { trigger: it, start: 'top bottom', end: 'bottom top', scrub: 1 } });
    });
    // stews: each bowl rises and turns with your scroll (never plays off-screen, never waits),
    // the gold rings pulse as it reaches the centre, and steam curls above it while in view
    $$('.bowl-item', host).forEach((b, i) => {
      const img = $('.pimg', b), plate = $('.plate', b);
      gsap.fromTo(img, { y: 90, scale: 0.74, rotation: i % 2 ? 28 : -28 }, { y: 0, scale: 1, rotation: 0, ease: 'none', scrollTrigger: { trigger: plate, start: 'top bottom', end: 'center 58%', scrub: 0.5 } });
      gsap.fromTo([...b.children].slice(1), { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'expo.out', stagger: 0.05, scrollTrigger: { trigger: b, start: 'top 80%', toggleActions: 'play none none reverse' } });
      const rings = gsap.timeline({ paused: true }).fromTo($$('.ring', b), { scale: 0.8, opacity: 0.75 }, { scale: 1.28, opacity: 0, duration: 1.8, ease: 'power2.out', stagger: 0.3 });
      ScrollTrigger.create({ trigger: plate, start: 'center 62%', onEnter: () => rings.restart(), onEnterBack: () => rings.restart(), onToggle: (st) => plate.classList.toggle('steaming', st.isActive), end: 'bottom top' });
    });
    // mezze: dealt onto the table
    ScrollTrigger.batch($$('.mz', host), { start: 'top 96%', once: true, onEnter: (els) => gsap.from(els, { y: 70, rotation: () => gsap.utils.random(-25, 25), scale: 0.8, opacity: 0, duration: 0.95, ease: 'back.out(1.4)', stagger: 0.09 }) });
    // rails: slide in from the edge
    $$('.hrail', host).forEach((r) => gsap.from(r.children, { x: -120, opacity: 0, duration: 1.1, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: r, start: 'top 96%', once: true } }));
    // pizza board: lands with a turn
    $$('.board', host).forEach((b) => gsap.from(b, { scale: 0.5, rotation: -90, opacity: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: b, start: 'top 96%', once: true } }));
    // bar: the shelf light switches on
    $$('.bar-shelf', host).forEach((s) => gsap.from(s, { opacity: 0, duration: 0.7, ease: 'power2.out', scrollTrigger: { trigger: s, start: 'top 96%', once: true } }));
    ScrollTrigger.batch($$('.bar-row', host), { start: 'top 92%', once: true, onEnter: (els) => gsap.from(els, { x: 40, opacity: 0, duration: 0.7, ease: 'expo.out', stagger: 0.05 }) });
    ScrollTrigger.batch($$('.tea', host), { start: 'top 96%', once: true, onEnter: (els) => gsap.from(els, { y: 40, opacity: 0, duration: 0.9, ease: 'expo.out', stagger: 0.1 }) });
    // desserts float
    $$('.fl', host).forEach((f, i) => {
      gsap.from(f, { y: 80, opacity: 0, scale: 0.9, duration: 1.2, ease: 'expo.out', delay: (i % 2) * 0.12, scrollTrigger: { trigger: f, start: 'top 92%', once: true } });
      gsap.to($('.plate', f), { y: i % 2 ? 7 : -7, rotation: i % 2 ? -3 : 3, duration: 3 + (i % 3) * 0.6, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    });
    // script lines write themselves
    $$('.script-line', host).forEach((s) => gsap.from(s, { clipPath: 'inset(0 0 0 100%)', opacity: 0, duration: 1.6, ease: 'power2.inOut', scrollTrigger: { trigger: s, start: 'top 90%', once: true } }));
    $$('.event, .book', view).forEach((e) => gsap.from(e, { y: 50, opacity: 0, scale: 0.97, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: e, start: 'top 90%', once: true } }));
    gsap.from('.mv-head > *', { y: 24, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.08 });
    // ambient weather follows scroll speed a little
    ScrollTrigger.create({ trigger: host, start: 'top bottom', end: 'bottom top', onUpdate: (st) => Z.fx.nudge(st.getVelocity()) });
  }

  /* ---------- entering a chapter: a new world ---------- */
  let curCh = null;
  function enterChapter(c, n) {
    if (curCh === c.id) return; curCh = c.id;
    const view = $('#menu');
    if (Z.hasGsap) gsap.to(view, { backgroundColor: c.bg, duration: 0.9, ease: 'power2.out' }); else view.style.backgroundColor = c.bg;
    view.style.setProperty('--ch-accent', c.accent);
    document.querySelector('meta[name=theme-color]')?.setAttribute('content', c.bg);
    Z.fx.set(c.fx);
    $$('.ch-chip').forEach((b) => b.classList.toggle('on', b.dataset.ch === c.id));
    movePill(true);
  }
  // the gold pill lives inside the active chip and is Flip-animated between chips (robust in RTL scrollers)
  function movePill(scroll) {
    const on = $('.ch-chip.on'), pill = $('#chPill'), sc = $('#chScroll'); if (!on) return;
    if (pill.parentElement !== on) {
      const st = window.Flip && pill.parentElement.classList.contains('ch-chip') ? Flip.getState(pill) : null;
      on.prepend(pill);
      if (st) Flip.from(st, { duration: 0.55, ease: 'expo.out' });
    }
    if (scroll) sc.scrollTo({ left: on.offsetLeft - sc.clientWidth / 2 + on.offsetWidth / 2, behavior: 'smooth' });
  }
  $('#chScroll').addEventListener('click', (e) => { const b = e.target.closest('.ch-chip'); if (b) Z.scrollToChapter(b.dataset.ch); });
  Z.scrollToChapter = (id, instant) => {
    const sec = $('#ch-' + id); if (!sec) return;
    const y = sec.getBoundingClientRect().top + scrollY - 66;
    scrollTo({ top: y, behavior: instant || Z.reduce ? 'instant' : 'smooth' });
  };

  // items tap → detail (everything with data-id inside chapters)
  host.addEventListener('click', (e) => {
    if (e.target.closest('[data-quick], button')) return;
    const a = e.target.closest('[data-id]'); if (!a) return;
    const it = byId[a.dataset.id];
    Z.openDetail(it, a.querySelector('img.pimg, canvas'));
  });
  $('#openBook').addEventListener('click', () => Z.openBook());

  Z.menuShown = (opts = {}) => {
    const first = !built; build(); Z.glass($('#chNav'));
    Z.fx.run(true);
    requestAnimationFrame(() => {
      if (window.ScrollTrigger) ScrollTrigger.refresh();
      if (opts.chapter) Z.scrollToChapter(opts.chapter, first);
      else { const top = () => scrollTo({ top: 0, behavior: 'instant' }); top(); enterChapter(CATEGORIES[0], 0); requestAnimationFrame(top); setTimeout(top, 120); setTimeout(top, 400); }
      movePill();
    });
  };
  Z.menuHidden = () => Z.fx.run(false);
})();
