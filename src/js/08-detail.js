/* ============================================================
   Dish detail — video 1. The plate travels from where you tapped
   to the side of the screen and keeps turning; tags line up beside
   it; a back arrow sits on its rim. Drag to turn it, hold to look
   closer, flick to the next dish. «سفارشی‌سازی» shows the
   ingredients with minus badges (they fly to the tray when taken
   off) and extras with plus badges (they drop onto the plate).
   Burgers get their own layer builder.
   ============================================================ */
(() => {
  const { $, $$, fa, toman, icon, byId } = Z;
  const el = $('#detail'), panel = $('#dPanel'), fly = $('#dFly'), img = $('#dImg'), plate = $('#dPlate');
  let it = null, list = [], idx = 0, qty = 1, removed = new Set(), added = new Set(), tab = 'intro', src = null, burger = null, note = '';
  Z.glass($('#dSeg')); Z.glass($('#dBar'));

  const BURGER = {
    meat: [['گوساله', 0], ['ترکیبی گوساله و گوسفند', 40000], ['مرغ گریل', -30000]],
    count: [[1, 0], [2, 240000], [3, 480000]],
    cook: [['مدیوم', 0], ['مدیوم‌ول', 0], ['ول‌دان', 0]],
    bread: [['بریوش', 0], ['سبوس‌دار', 0], ['کاهو، بدون نان', 0]],
  };
  const isBurger = () => it.cat === 'burger';
  const burgerExtra = () => burger ? BURGER.meat[burger.meat][1] + BURGER.count[burger.count][1] : 0;
  const unit = () => it.price + Z.extraPrice(it, added) + burgerExtra();

  /* ---------- content ---------- */
  function tagsHtml() {
    const t = [`<span class="tag">${icon('clock')}${fa(it.time)} دقیقه</span>`];
    t.push(it.hot ? `<span class="tag">${icon('flame')}داغ سرو می‌شود</span>` : it.cat === 'cold' ? `<span class="tag">${icon('drop')}خنک، با یخ</span>` : `<span class="tag">${icon('leaf')}تازه</span>`);
    it.tags.forEach((x) => t.push(`<span class="tag ${x}">${icon(x === 'signature' ? 'crown' : x === 'spicy' ? 'flame' : 'leaf')}${TAG_LABEL[x]}</span>`));
    return t.join('');
  }
  function intro() {
    const c = Z.catById[it.cat];
    return `<div class="d-kicker" style="color:${c.accent}">${c.kicker} · ${c.name}</div><h2>${it.name}</h2><p class="desc">${it.desc}</p>
      <div class="d-facts"><span>${icon('clock')}آماده در ${fa(it.time)} دقیقه</span><span>${icon('users')}برای ${it.price > 900000 ? 'دو' : 'یک'} نفر</span></div>
      ${Z.priceEl(it, 'd-price num')}
      <button class="d-custom-cta" data-gocustom>${icon('sliders')}${isBurger() ? 'گوشت، پخت و لایه‌ها را انتخاب کنید' : it.cat === 'pizza' ? 'اندازه و مواد پیتزا را خودتان بچینید' : 'کم و زیاد کردن مواد'}${icon('fwd')}</button>`;
  }
  function chip(name, kind, price) {
    const k = ING[name] || 'sauce';
    const st = kind === 'rm' ? (removed.has(name) ? 'off' : '') : added.has(name) ? 'on' : '';
    return `<button class="ing ${kind === 'add' ? 'plus' : ''} ${st}" data-${kind}="${name}"><span class="th"><img data-ingk="${k}" alt="" decoding="async"><span class="badge">${icon(kind === 'add' ? (added.has(name) ? 'check' : 'plus') : 'minus')}</span></span><span>${name}</span>${price ? `<span class="p num">+${toman(price)}</span>` : price === 0 && kind === 'add' ? '<span class="p">رایگان</span>' : ''}</button>`;
  }
  function custom() {
    const ex = EXTRAS[it.cat] || { remove: [], add: [] };
    let h = '';
    if (it.cat === 'pizza') h += `<button class="d-builder" data-builder><span class="db-ic">${icon('spark')}</span><span><b>روی تخته بچینید</b><span>اندازه را انتخاب کنید و مواد را روی پیتزا بکشید</span></span>${icon('fwd')}</button>`;
    if (isBurger()) h += burgerHtml();
    if (ex.remove.length) h += `<div><p class="ing-title">مواد این غذا · برای حذف بزنید</p><div class="ings">${ex.remove.map((n) => chip(n, 'rm')).join('')}</div></div>`;
    if (ex.add.length) h += `<div><p class="ing-title">اضافه کنید</p><div class="ings">${ex.add.map(([n, p]) => chip(n, 'add', p)).join('')}</div></div>`;
    h += `<label class="d-note"><span class="ing-title">توضیح برای آشپزخانه</span><textarea id="dNote" rows="2" placeholder="مثلاً: نمک کم، سس جدا">${note}</textarea></label>`;
    return h;
  }
  function burgerHtml() {
    const b = burger;
    const row = (key, title, fmt) => `<div class="opt-row"><span class="t">${title}</span><div class="choice" data-bk="${key}">${BURGER[key].map(([v, p], i) => `<button class="${b[key] === i ? 'on' : ''}" data-i="${i}">${fmt ? fmt(v) : v}${p > 0 ? ` <small class="num">+${toman(p)}</small>` : ''}</button>`).join('')}</div></div>`;
    return `<div class="burger-build"><div class="bstack" id="bStack">${layersHtml()}</div><div class="burger-opts">
      ${row('meat', 'گوشت')}${row('count', 'تعداد لایه‌ی گوشت', (v) => fa(v) + ' لایه')}${row('cook', 'میزان پخت')}${row('bread', 'نان')}</div></div>`;
  }
  // the burger is rebuilt from real photographed layers (p/bl), sliced from our own burger shot
  const BL = {"bun-top":{"x":0.0684,"y":0.1088,"w":0.8579,"h":0.2763,"seat":0.383,"top":0.1},"lettuce":{"x":0.0202,"y":0.3605,"w":0.9596,"h":0.1421,"seat":0.475,"top":0.35},"tomato":{"x":0.1649,"y":0.4588,"w":0.6781,"h":0.0754,"seat":0.53,"top":0.45},"onion":{"x":0.0868,"y":0.5088,"w":0.8272,"h":0.0711,"seat":0.575,"top":0.515},"patty":{"x":0.0851,"y":0.6035,"w":0.8509,"h":0.1439,"seat":0.735,"top":0.605},"patty-cheese":{"x":0.0811,"y":0.5736,"w":0.8423,"h":0.1568,"seat":0.728,"top":0.585},"patty-chicken":{"x":0.0204,"y":0.5004,"w":0.96,"h":0.2163,"seat":0.71,"top":0.51},"bun-bot":{"x":0.0772,"y":0.6982,"w":0.8439,"h":0.1921,"seat":0.89,"top":0.72}};
  function layerKeys() {
    const b = burger, wrap = b.bread === 2, cheese = added.has('پنیر چدار') || it.id === 'burger-cheese' || it.id === 'burger-double';
    const patty = b.meat === 2 ? 'patty-chicken' : cheese ? 'patty-cheese' : 'patty';
    const L = [wrap ? 'lettuce' : 'bun-bot'];
    for (let i = 0; i < BURGER.count[b.count][0]; i++) L.push(patty);
    if (!removed.has('پیاز')) L.push('onion');
    if (!removed.has('گوجه')) L.push('tomato');
    if (!removed.has('کاهو') && !wrap) L.push('lettuce');
    L.push(wrap ? 'lettuce' : 'bun-top');
    return L;
  }
  function layersHtml() {
    const W = 236, gap = 3, seen = {}, out = [];
    let seat = 1000;
    for (const k of layerKeys()) {
      const s = BL[k], n = (seen[k] = (seen[k] || 0) + 1);
      const top = seat - (s.seat - s.y) * W;
      out.push({ k, key: k + n, top, left: s.x * W, w: s.w * W, h: s.h * W });
      seat -= (s.seat - s.top) * W + gap;
    }
    const minT = Math.min(...out.map((o) => o.top)), maxB = Math.max(...out.map((o) => o.top + o.h));
    return `<div class="bl-stage" style="width:${W}px;height:${Math.round(maxB - minT)}px">${out.map((o) => `<img class="bl" data-key="${o.key}" src="p/bl/${o.k}.webp" alt="" style="left:${o.left.toFixed(1)}px;top:${(o.top - minT).toFixed(1)}px;width:${o.w.toFixed(1)}px">`).join('')}</div>`;
  }
  function renderStack() {
    const st = $('#bStack'); if (!st) return;
    const prev = {}; $$('.bl', st).forEach((e) => (prev[e.dataset.key] = e.offsetTop));
    const oldH = st.firstElementChild ? st.firstElementChild.offsetHeight : 0;
    st.innerHTML = layersHtml();
    if (!Z.hasGsap || Z.reduce) return;
    const stage = st.firstElementChild, newH = stage.offsetHeight; if (oldH) gsap.fromTo(stage, { height: oldH }, { height: newH, duration: 0.6, ease: 'expo.out' });
    const fresh = [];
    $$('.bl', st).forEach((e) => { if (e.dataset.key in prev) gsap.from(e, { y: prev[e.dataset.key] - e.offsetTop, duration: 0.6, ease: 'expo.out' }); else fresh.push(e); });
    gsap.from(fresh, { y: -70, opacity: 0, rotation: () => (Math.random() - 0.5) * 6, duration: 0.8, ease: 'bounce.out', stagger: 0.07 });
  }
  function paint(first) {
    $('#dTags').innerHTML = tagsHtml();
    $('#dIntro').innerHTML = intro();
    $('#dCustom').innerHTML = custom();
    $$('img[data-ingk]', el).forEach((im) => (im.src = Z.ingSrc(im.dataset.ingk)));
    $('#dGlow').style.background = Z.glow(it.glow, '22% 34%', '70% 55%', 'cc');
    $('#dFav').classList.toggle('on', Z.favs.has(it.id));
    $('#dFav use').setAttribute('href', '#i-heart');
    renderRemoved(); price();
    if (!first && Z.hasGsap) gsap.from([...$('#dIntro').children, ...$('#dTags').children], { y: 14, opacity: 0, duration: 0.6, ease: 'expo.out', stagger: 0.035 });
  }
  function price() {
    $('#dQty').textContent = fa(qty);
    const amt = unit() * qty, d = Z.dealFor(it);
    $('#dAdd').classList.toggle('sold', Z.isOut(it));
    $('#dAddLbl').innerHTML = Z.isOut(it) ? `${icon('clock')}امشب تمام شده` : `${icon('bag')}افزودن · <span class="num">${d && !d.locked ? `<span class="was">${toman(amt)}</span>` : ''}${toman(d && !d.locked ? amt * (1 - d.pct / 100) : amt)}</span>`;
  }
  function setTab(t, anim = true) {
    tab = t; el.classList.toggle('custom', t === 'custom');
    $$('#dSeg button').forEach((b) => b.classList.toggle('on', b.dataset.t === t));
    const seg = $('#dSeg .lg-body'), on = $('#dSeg button.on'), th = $('#dSeg .thumb');
    requestAnimationFrame(() => { th.style.width = on.offsetWidth + 'px'; th.style.transform = `translateX(${on.offsetLeft - 4}px)`; th.style.left = '4px'; });
    if (anim && Z.hasGsap) {
      gsap.from(t === 'custom' ? $$('#dCustom > *') : $$('#dIntro > *'), { y: 24, opacity: 0, duration: 0.6, ease: 'expo.out', stagger: 0.05 });
      // in customise mode the plate turns to show you the ingredients side
      gsap.to(fly, { rotation: t === 'custom' ? '+=120' : '-=120', duration: 1, ease: 'expo.out' });
    }
  }

  /* ---------- open / close ---------- */
  Z.openDetail = (item, fromEl, opts = {}) => {
    if (!item) return;
    it = item; src = fromEl || null; list = ITEMS.filter((x) => x.cat === it.cat); idx = list.indexOf(it);
    qty = 1; removed = new Set(); added = new Set(); note = ''; burger = isBurger() ? { meat: it.id === 'burger-chicken' ? 2 : 0, count: it.id === 'burger-double' ? 1 : 0, cook: 0, bread: 0 } : null;
    $('#dAdd').classList.remove('done');
    Z.setDishImg(img, it, 'r', true);
    el.hidden = false; document.body.style.overflow = 'hidden'; panel.scrollTop = 0;
    paint(true); setTab(opts.tab || 'intro', false);
    history.pushState({ d: 1 }, '');
    Z.haptic(8);
    if (!Z.hasGsap) { $('.scrim', el).style.opacity = 1; return; }
    gsap.killTweensOf(fly); gsap.set(fly, { opacity: 1, x: 0, y: 0, yPercent: 0, scale: 1 });
    gsap.set(panel, { opacity: 1 });
    gsap.fromTo($('.scrim', el), { opacity: 0 }, { opacity: 1, duration: 0.45, ease: 'power2.out' });
    gsap.fromTo('#dGlow', { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 1.4, ease: 'expo.out', delay: 0.15 });
    // shared-element flight: from the tapped picture to the plate's place
    const to = plate.getBoundingClientRect();
    const r = src && src.getBoundingClientRect ? src.getBoundingClientRect() : null;
    if (r && r.width) {
      const s = Math.max(r.width, r.height) / to.width;
      gsap.fromTo(fly, { x: r.left + r.width / 2 - (to.left + to.width / 2), y: r.top + r.height / 2 - (to.top + to.height / 2), scale: s, rotation: -70 }, { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1, duration: 1.05, ease: 'expo.inOut' });
    } else gsap.fromTo(fly, { scale: 0.6, rotation: -120, opacity: 0 }, { scale: 1, rotation: 0, opacity: 1, duration: 1, ease: 'expo.out' });
    gsap.fromTo('#dTags .tag', { x: 30, opacity: 0 }, { x: 0, opacity: 1, duration: 0.8, ease: 'expo.out', stagger: 0.07, delay: 0.55 });
    gsap.fromTo('#dBack', { scale: 0, rotation: -180 }, { scale: 1, rotation: 0, duration: 0.7, ease: 'back.out(1.8)', delay: 0.75 });
    gsap.fromTo(['.d-top', '#dIntro > *', '#dCustom > *'], { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'expo.out', stagger: 0.04, delay: 0.35 });
    gsap.fromTo('#detail .d-bar', { y: 120 }, { y: 0, duration: 0.9, ease: 'expo.out', delay: 0.4 });
    gsap.fromTo('#dHint', { opacity: 0 }, { opacity: 1, duration: 0.6, delay: 1.4 });
  };
  function close(viaHistory) {
    if (el.hidden) return;
    if (!viaHistory && history.state && history.state.d) { history.back(); return; }
    const fin = () => { el.hidden = true; if (!document.querySelector('.builder:not([hidden]), .sheet:not([hidden]), .game:not([hidden])')) document.body.style.overflow = ''; gsap.set && gsap.set([fly, panel, '#detail .d-bar'], { clearProps: 'all' }); };
    if (!Z.hasGsap) return fin();
    const to = plate.getBoundingClientRect(); const r = src && src.isConnected ? src.getBoundingClientRect() : null;
    const visible = r && r.width && r.bottom > 0 && r.top < innerHeight;
    gsap.to('#detail .d-bar', { y: 120, duration: 0.35, ease: 'power2.in' });
    gsap.to(['.d-top', '.d-body', '#dTags', '#dBack', '#dHint', '#dRemoved', '#dGlow'], { opacity: 0, duration: 0.25 });
    if (visible) gsap.to(fly, { x: r.left + r.width / 2 - (to.left + to.width / 2), y: r.top + r.height / 2 - (to.top + to.height / 2), scale: Math.max(r.width, r.height) / to.width, rotation: '-=70', duration: 0.7, ease: 'expo.inOut' });
    else gsap.to(fly, { scale: 0.7, opacity: 0, duration: 0.4 });
    gsap.to($('.scrim', el), { opacity: 0, duration: 0.5, delay: 0.25, ease: 'power2.inOut', onComplete: () => { gsap.set(['.d-top', '.d-body', '#dTags', '#dBack', '#dHint', '#dRemoved', '#dGlow'], { clearProps: 'opacity' }); fin(); } });
    gsap.to(fly, { opacity: 0, duration: 0.2, delay: 0.6 });
  }
  Z.closeDetail = close;
  addEventListener('popstate', () => { if (!el.hidden) close(true); });
  $('#dClose').addEventListener('click', () => close());
  $('#dBack').addEventListener('click', () => { setTab(tab === 'custom' ? 'intro' : 'custom'); panel.scrollTo({ top: tab === 'custom' ? $('#dCustom').offsetTop - 70 : 0, behavior: 'smooth' }); Z.haptic(6); });

  /* ---------- next / previous dish in the category (flick the plate) ---------- */
  function step(d) {
    if (list.length < 2) return;
    idx = (idx + d + list.length) % list.length; const nx = list[idx];
    Z.haptic(6);
    const swap = () => { it = nx; removed = new Set(); added = new Set(); qty = 1; burger = isBurger() ? { meat: it.id === 'burger-chicken' ? 2 : 0, count: it.id === 'burger-double' ? 1 : 0, cook: 0, bread: 0 } : null; Z.setDishImg(img, it, 'r', true); paint(); setTab(tab, false); };
    if (!Z.hasGsap) return swap();
    gsap.timeline()
      .to(fly, { yPercent: d > 0 ? -70 : 70, rotation: `+=${d > 0 ? -150 : 150}`, opacity: 0, scale: 0.8, duration: 0.38, ease: 'power3.in' })
      .add(swap)
      .fromTo(fly, { yPercent: d > 0 ? 70 : -70, opacity: 0, scale: 0.8 }, { yPercent: 0, opacity: 1, scale: 1, rotation: `+=${d > 0 ? -150 : 150}`, duration: 0.8, ease: 'expo.out' });
  }

  /* ---------- plate gestures: turn, hold to magnify, flick ---------- */
  let g = null;
  plate.addEventListener('pointerdown', (e) => {
    plate.setPointerCapture(e.pointerId);
    g = { x: e.clientX, y: e.clientY, t: performance.now(), rot: Z.hasGsap ? gsap.getProperty(fly, 'rotation') : 0, moved: false, loupe: false, last: [[e.clientX, e.clientY, performance.now()]] };
  });
  plate.addEventListener('pointermove', (e) => {
    if (!g) return;
    const dx = e.clientX - g.x, dy = e.clientY - g.y;
    if (Math.hypot(dx, dy) > 6) { g.moved = true; clearTimeout(g.hold); }
    if (g.moved && Z.hasGsap) gsap.set(fly, { rotation: g.rot + dy * 0.5 - dx * 0.3 });
    g.last.push([e.clientX, e.clientY, performance.now()]); if (g.last.length > 5) g.last.shift();
  });
  const up = () => {
    if (!g) return; clearTimeout(g.hold); const s = g; g = null;
    const a = s.last[0], b = s.last[s.last.length - 1], dt = Math.max(1, b[2] - a[2]);
    const vy = (b[1] - a[1]) / dt, vx = (b[0] - a[0]) / dt;
    if (Math.abs(vy) > 0.9 && Math.abs(vy) > Math.abs(vx)) { step(vy < 0 ? 1 : -1); return; }
    if (Math.abs(vx) > 0.9) { step(vx < 0 ? 1 : -1); return; }
    // a gentle spin-out with the finger's momentum
    if (s.moved && Z.hasGsap) gsap.to(fly, { rotation: `+=${(vy * 0.5 - vx * 0.3) * 240}`, duration: 1.4, ease: 'expo.out' });
  };
  plate.addEventListener('pointerup', up); plate.addEventListener('pointercancel', up);
  /* ---------- customise ---------- */
  function renderRemoved() {
    $('#dRemoved').innerHTML = [...removed].map((n) => `<button class="rm-chip" data-restore="${n}"><img data-ingk2="${ING[n] || 'sauce'}" alt="">بدون ${n}</button>`).join('');
    $$('img[data-ingk2]', el).forEach((im) => (im.src = Z.ingSrc(im.dataset.ingk2)));
  }
  function flyIng(fromImg, toRect, cb) {
    if (!fromImg || Z.reduce || !Z.hasGsap) return cb && cb();
    const a = fromImg.getBoundingClientRect(); const f = fromImg.cloneNode(); f.className = 'ing-flyer';
    f.style.cssText = `left:${a.left}px;top:${a.top}px;width:${a.width}px;height:${a.height}px`;
    document.body.append(f);
    gsap.to(f, { x: toRect.left + toRect.width / 2 - (a.left + a.width / 2), y: toRect.top + toRect.height / 2 - (a.top + a.height / 2), scale: toRect.s || 0.5, rotation: 220, duration: 0.75, ease: 'power3.inOut', onComplete: () => { f.remove(); cb && cb(); } });
  }
  el.addEventListener('click', (e) => {
    const t = e.target;
    const sb = t.closest('#dSeg button'); if (sb) { if (sb.dataset.t !== tab) setTab(sb.dataset.t); return; }
    if (t.closest('[data-gocustom]')) { setTab('custom'); panel.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    if (t.closest('[data-builder]')) { const i = it; close(); setTimeout(() => Z.openBuilder(i, null), 420); return; }
    const rm = t.closest('[data-rm]');
    if (rm) {
      const n = rm.dataset.rm;
      if (removed.has(n)) { removed.delete(n); rm.classList.remove('off'); renderRemoved(); }
      else { removed.add(n); rm.classList.add('off'); const tray = $('#dRemoved').getBoundingClientRect(); flyIng(rm.querySelector('img'), { left: tray.right - 40, top: tray.top, width: 30, height: 30, s: 0.45 }, renderRemoved); }
      if (burger) renderStack();
      Z.haptic(6); price(); return;
    }
    const ad = t.closest('[data-add]');
    if (ad) {
      const n = ad.dataset.add;
      if (added.has(n)) { added.delete(n); ad.classList.remove('on'); }
      else {
        added.add(n); ad.classList.add('on');
        const pr = img.getBoundingClientRect(); const cx = pr.left + pr.width * 0.62, cy = pr.top + pr.height * (0.35 + Math.random() * 0.3);
        flyIng(ad.querySelector('img'), { left: cx - 20, top: cy - 20, width: 40, height: 40, s: 0.8 }, () => { if (Z.hasGsap) gsap.fromTo(fly, { scale: 0.97 }, { scale: 1, duration: 0.6, ease: 'elastic.out(1,0.4)' }); });
      }
      ad.querySelector('.badge use').setAttribute('href', added.has(n) ? '#i-check' : '#i-plus');
      if (burger) renderStack();
      Z.haptic(6); price(); return;
    }
    const rs = t.closest('[data-restore]'); if (rs) { removed.delete(rs.dataset.restore); const c = $(`[data-rm="${rs.dataset.restore}"]`, el); c && c.classList.remove('off'); renderRemoved(); price(); if (burger) renderStack(); return; }
    const bc = t.closest('.choice[data-bk] button');
    if (bc) {
      const key = bc.parentElement.dataset.bk; burger[key] = +bc.dataset.i;
      $$('button', bc.parentElement).forEach((b) => b.classList.toggle('on', b === bc));
      renderStack();
      Z.haptic(6); price(); return;
    }
  });
  el.addEventListener('input', (e) => { if (e.target.id === 'dNote') note = e.target.value; });
  $('#dMinus').addEventListener('click', () => { qty = Math.max(1, qty - 1); price(); Z.haptic(5); });
  $('#dPlus').addEventListener('click', () => { qty = Math.min(20, qty + 1); price(); Z.haptic(5); if (Z.hasGsap) gsap.fromTo('#dQty', { y: -8, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35 }); });
  $('#dFav').addEventListener('click', () => { const on = Z.toggleFav(it.id); $('#dFav').classList.toggle('on', on); Z.haptic(8); if (Z.hasGsap) gsap.fromTo('#dFav svg', { scale: 0.6 }, { scale: 1, duration: 0.6, ease: 'elastic.out(1,0.4)' }); Z.toast(on ? 'به علاقه‌مندی‌ها اضافه شد' : 'از علاقه‌مندی‌ها برداشته شد', 'heart'); });
  $('#dAdd').addEventListener('click', () => {
    const btn = $('#dAdd'); if (btn.classList.contains('done')) return;
    if (Z.isOut(it)) { Z.toast(`${it.name} امشب تمام شده`, 'clock'); return; }
    const mods = [...[...removed].map((r) => 'بدون ' + r), ...added];
    if (burger || note) {
      const parts = burger ? [`${fa(BURGER.count[burger.count][0])} لایه ${BURGER.meat[burger.meat][0]}`, BURGER.cook[burger.cook][0], BURGER.bread[burger.bread][0]] : [];
      Z.addLine(it, { qty, removed, added, custom: { price: unit(), label: [...parts, ...mods, note && '«' + note + '»'].filter(Boolean).join('، ') } });
      const l = [...Z.cart.lines.values()].pop(); l.qty = qty; Z.cartBadge();
    } else Z.addLine(it, { qty, removed, added });
    btn.classList.add('done'); Z.haptic(14);
    setTimeout(() => { Z.flyTo(img, $('#navPlus')); close(); Z.toast(`${it.name} اضافه شد`, 'bag'); }, 550);
  });
})();
