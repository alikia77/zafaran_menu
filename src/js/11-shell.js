/* ============================================================
   Shell: views + bottom nav, search, drawer, waiter, booking,
   order status, favourites and the table page.
   ============================================================ */
(() => {
  const { $, $$, fa, toman, icon, byId } = Z;
  Z.glass($('#toast')); Z.glass($('#nav'));
  $$('.sheet').forEach(Z.wireSheet);

  /* ---------- views ---------- */
  let view = 'home';
  const scrollMem = {};
  Z.go = (v, opts = {}) => {
    if (v === view && !opts.chapter) { if (v !== 'home') scrollTo({ top: 0, behavior: 'smooth' }); return; }
    scrollMem[view] = scrollY;
    const from = $('#' + view), to = $('#' + v);
    if (view === 'menu') Z.menuHidden();
    view = v;
    $$('.nav-btn, .nav-menu').forEach((b) => b.classList.toggle('on', b.dataset.go === v));
    $('#nav').classList.toggle('on-dark', v !== 'home');
    document.querySelector('meta[name=theme-color]')?.setAttribute('content', '#0b0a09');
    from.hidden = true; to.hidden = false;
    if (v === 'favs') renderFavs();
    if (v === 'table') renderTable();
    if (v === 'circle' && Z.renderCircle) Z.renderCircle(true);
    // every page except home opens from its very top; home remembers where you were
    scrollTo({ top: opts.chapter || v !== 'home' ? 0 : scrollMem[v] || 0, behavior: 'instant' });
    if (v === 'menu') Z.menuShown(opts);
    else if (window.ScrollTrigger) requestAnimationFrame(() => ScrollTrigger.refresh());
    if (Z.hasGsap && !opts.chapter) gsap.fromTo(to, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5, ease: 'expo.out', clearProps: 'transform' });
    Z.haptic(5);
  };
  $('#nav').addEventListener('click', (e) => { const b = e.target.closest('[data-go]'); if (b) Z.go(b.dataset.go); });
  $('#navPlus').addEventListener('click', () => Z.openCart());

  /* ---------- search ---------- */
  const sEl = $('#search'), sIn = $('#sInput');
  Z.glass($('.s-field', sEl));
  const norm = (s) => s.replace(/[‌\s]/g, '').replace(/ي/g, 'ی').replace(/ك/g, 'ک');
  const CHIPS = ['کباب', 'پیتزا', 'تند', 'گیاهی', 'نوشیدنی سرد', 'چای', 'دسر'];
  $('#sChips').innerHTML = CHIPS.map((c) => `<button>${c}</button>`).join('');
  function results(q) {
    const n = norm(q); if (!n) return ITEMS.filter((i) => SIGNATURE.includes(i.id));
    return ITEMS.filter((i) => { const c = Z.catById[i.cat]; return norm(i.name + i.desc + c.name + i.tags.map((t) => TAG_LABEL[t]).join('')).includes(n); });
  }
  function renderSearch() {
    const q = sIn.value.trim(), list = results(q);
    $('#sRes').innerHTML = (q ? '' : '<p class="ing-title">پیشنهاد سرآشپز</p>') + (list.length ? list.map((it) => `<button class="s-row" data-id="${it.id}"><img alt="" data-dish="${it.id}"><span><span class="nm">${it.name}</span><br><span class="ct">${Z.catById[it.cat].name} · ${it.desc}</span></span>${Z.priceEl(it)}</button>`).join('') : `<div class="empty">${icon('search')}<div>چیزی با «${q}» پیدا نشد.</div></div>`);
    $$('#sRes img[data-dish]').forEach((im) => Z.setDishImg(im, byId[im.dataset.dish], 'r'));
  }
  Z.openSearch = () => {
    sEl.hidden = false; sIn.value = ''; renderSearch(); document.body.style.overflow = 'hidden';
    if (Z.hasGsap) { gsap.fromTo($('.scrim', sEl), { opacity: 0 }, { opacity: 1, duration: 0.3 }); gsap.fromTo('.s-top, .s-chips', { y: -20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'expo.out', stagger: 0.05 }); gsap.fromTo('#sRes > *', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'expo.out', stagger: 0.03, delay: 0.1 }); }
    else $('.scrim', sEl).style.opacity = 1;
    setTimeout(() => sIn.focus(), 120);
  };
  const closeSearch = () => { sEl.hidden = true; document.body.style.overflow = ''; };
  sIn.addEventListener('input', renderSearch);
  $('#sClose').addEventListener('click', closeSearch);
  $('#sChips').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; sIn.value = b.textContent; renderSearch(); });
  $('#sRes').addEventListener('click', (e) => { const r = e.target.closest('.s-row'); if (!r) return; const im = r.querySelector('img'); closeSearch(); Z.openDetail(byId[r.dataset.id], im); });
  sEl.addEventListener('click', (e) => { if (e.target.matches('.scrim')) closeSearch(); });
  $('#openSearch').addEventListener('click', Z.openSearch); $('#openSearch2').addEventListener('click', Z.openSearch);

  /* ---------- drawer ---------- */
  const dr = $('#drawer');
  $('#drawerLinks').innerHTML = [
    ['grid', 'همه‌ی منو', 'go:menu'], ['crown', 'باشگاه زعفران', 'club'], ['spark', 'پیشنهادهای ویژه', 'deals'], ['heart', 'علاقه‌مندی‌ها', 'go:favs'], ['table', `میز ${fa(Z.table)} · صورتحساب`, 'go:table'], ['bell', 'صدا زدن گارسون', 'waiter'],
    ['cal', 'رزرو میز', 'book'], ['play', 'بازی: پیتزا بپزید', 'game'], ['pin', 'خیابان ولیعصر، کوچه‌ی بهار', ''], ['phone', '۰۲۱ ۸۸۰۰ ۱۳۸۲', ''], ['insta', 'zafaran.restaurant', ''],
  ].map(([i, t, a]) => `<button class="dl" data-a="${a}">${icon(i)}${t}</button>`).join('');
  const openDrawer = () => { dr.hidden = false; if (Z.hasGsap) { gsap.fromTo($('.scrim', dr), { opacity: 0 }, { opacity: 1, duration: 0.3 }); gsap.fromTo('#drawerPane', { xPercent: 105 }, { xPercent: 0, duration: 0.6, ease: 'expo.out' }); gsap.fromTo('#drawerPane > *', { x: 30, opacity: 0 }, { x: 0, opacity: 1, duration: 0.6, ease: 'expo.out', stagger: 0.04, delay: 0.1 }); } else { $('.scrim', dr).style.opacity = 1; $('#drawerPane').style.transform = 'none'; } };
  const closeDrawer = (cb) => { if (!Z.hasGsap) { dr.hidden = true; cb && cb(); return; } gsap.to($('.scrim', dr), { opacity: 0, duration: 0.25 }); gsap.to('#drawerPane', { xPercent: 105, duration: 0.4, ease: 'power3.in', onComplete: () => { dr.hidden = true; cb && cb(); } }); };
  $('#openDrawer').addEventListener('click', openDrawer);
  dr.addEventListener('click', (e) => {
    if (e.target.matches('.scrim')) return closeDrawer();
    const b = e.target.closest('[data-a]'); if (!b || !b.dataset.a) return;
    const a = b.dataset.a;
    closeDrawer(() => { if (a.startsWith('go:')) Z.go(a.slice(3)); else if (a === 'waiter') openWaiter(); else if (a === 'book') Z.openBook(); else if (a === 'game') Z.openGame(); else if (a === 'club') Z.openClub(); else if (a === 'deals') Z.openDeals(); });
  });

  /* ---------- waiter ---------- */
  /* ---------- the table service: requests with a live status ----------
     Every request goes  ثبت شد → دیده شد → در راه → رسید.  The waiter closes it on delivery
     (in this demo the floor staff is simulated); a delivered request leaves the list on its own.
     Bread, herbs and sauces are small paid extras and land on the bill when they arrive. */
  const EXTRAS_T = [
    { id: 'x-sangak', name: 'نان سنگک تازه', price: 30000, cat: 'extra', ing: 'bread' },
    { id: 'x-lavash', name: 'نان لواش', price: 20000, cat: 'extra', ing: 'bread' },
    { id: 'x-herbs', name: 'سبزی خوردن', price: 45000, cat: 'extra', ing: 'herb' },
    { id: 'x-garlic', name: 'سس سیر', price: 25000, cat: 'extra', ing: 'sauce' },
    { id: 'x-house', name: 'سس مخصوص زعفران', price: 30000, cat: 'extra', ing: 'saffron' },
  ];
  EXTRAS_T.forEach((x) => (Z.byId[x.id] = x));
  const PACK = [
    { id: 'p-box', name: 'جعبه‌ی غذا', note: 'برای برنج و کباب' },
    { id: 'p-bowl', name: 'ظرف درب‌دار خورش', note: 'بدون نشتی' },
    { id: 'p-cup', name: 'لیوان درب‌دار', note: 'برای نوشیدنی' },
    { id: 'p-bag', name: 'کیسه‌ی کاغذی', note: 'با مهر زعفران' },
  ];
  const KINDS = {
    call: { i: 'waiter', t: 'صدا زدن گارسون' },
    pack: { i: 'takeaway', t: 'ظرف بسته‌بندی' },
    extra: { i: 'bread', t: 'نان و مخلفات' },
    cutlery: { i: 'cutlery', t: 'قاشق و دستمال' },
    chair: { i: 'highchair', t: 'صندلی کودک' },
    clean: { i: 'spark', t: 'تمیز کردن میز' },
  };
  const STAGES = ['ثبت شد', 'دیده شد', 'در راه', 'رسید'];
  const STAGE_SAY = ['درخواست شما ثبت شد', 'گارسون درخواست شما را دید', 'در راه میز شماست', 'رسید؛ نوش جان'];
  const reqs = []; let rid = 0, picker = null; const pick = {};
  const hhmm = (d) => [d.getHours(), d.getMinutes()].map((n) => String(n).padStart(2, '0').replace(/\d/g, (c) => '۰۱۲۳۴۵۶۷۸۹'[c])).join(':');
  const live = () => reqs.filter((r) => r.stage < 4);
  function addReq(kind, items) {
    const r = { id: ++rid, kind, items: items || null, at: new Date(), stage: 0, timers: [] };
    reqs.push(r);
    // simulated floor: seen → on the way → delivered (closed by the waiter) → leaves the list
    const plan = kind === 'call' ? [5, 11, 22] : [7, 16, 30];
    plan.forEach((sec, i) => r.timers.push(setTimeout(() => advance(r, i + 1), sec * 1000)));
    paintWaiter(); Z.haptic(12); Z.toast(`${KINDS[kind].t} · ${STAGE_SAY[0]}`, 'check');
  }
  function advance(r, st) {
    r.stage = st;
    if (st === 3) {   // delivered: the waiter closes it, extras go on the bill
      if (r.kind === 'extra') r.items.forEach(([id, q]) => Z.addToBill(Z.byId[id], q));
      r.timers.push(setTimeout(() => { r.stage = 4; paintWaiter(); }, 6000));
    }
    Z.toast(`${KINDS[r.kind].t} · ${STAGE_SAY[st]}`, st === 3 ? 'check' : st === 2 ? 'waiter' : 'clock');
    paintWaiter();
  }
  function cancelReq(id) { const r = reqs.find((x) => x.id === id); if (!r || r.stage >= 3) return; r.timers.forEach(clearTimeout); r.stage = 4; paintWaiter(); Z.haptic(6); Z.toast('درخواست لغو شد', 'close'); }
  const itemsLine = (r) => r.items ? r.items.map(([id, q]) => { const x = Z.byId[id] || PACK.find((p) => p.id === id); return `${x.name}${q > 1 ? ' ×' + fa(q) : ''}`; }).join('، ') : '';
  function reqCard(r) {
    const k = KINDS[r.kind], st = Math.min(r.stage, 3);
    return `<article class="rq ${st === 3 ? 'done' : ''}" data-rq="${r.id}">
      <div class="rq-top"><span class="rq-ic">${icon(st === 3 ? 'check' : k.i)}</span><span class="rq-tx"><b>${k.t}</b>${r.items ? `<span class="rq-items">${itemsLine(r)}</span>` : ''}</span>
        ${st < 3 ? `<button class="rq-x" data-cancel="${r.id}" aria-label="لغو">${icon('close')}</button>` : `<span class="rq-at num">${hhmm(r.at)}</span>`}</div>
      <ol class="rq-steps" style="--p:${st / 3}">${STAGES.map((s, i) => `<li class="${i <= st ? 'on' : ''} ${i === st ? 'now' : ''}"><i></i><span>${s}</span></li>`).join('')}</ol>
    </article>`;
  }
  const stepper = (id, q) => `<span class="pk-step"><button data-dec="${id}" aria-label="کمتر">${icon('minus')}</button><b class="num">${fa(q)}</b><button data-inc="${id}" aria-label="بیشتر">${icon('plus')}</button></span>`;
  function pickerHtml() {
    if (!picker) return '';
    const list = picker === 'pack' ? PACK : EXTRAS_T, sum = picker === 'extra' ? EXTRAS_T.reduce((s, x) => s + (pick[x.id] || 0) * x.price, 0) : 0, n = list.reduce((s, x) => s + (pick[x.id] || 0), 0);
    return `<div class="pk" id="wPick"><div class="pk-h"><b>${picker === 'pack' ? 'ظرف بسته‌بندی' : 'نان و مخلفات'}</b><span>${picker === 'pack' ? 'رایگان؛ تعداد هر کدام را بزنید' : 'به صورتحساب میز اضافه می‌شود'}</span></div>
      ${list.map((x) => `<div class="pk-row"><span class="pk-n"><b>${x.name}</b><span>${x.price ? toman(x.price) + ' تومان' : x.note}</span></span>${stepper(x.id, pick[x.id] || 0)}</div>`).join('')}
      <button class="btn-gold pk-go" id="wPickGo" ${n ? '' : 'disabled'}>${n ? `درخواست${sum ? ' · <span class="num">' + toman(sum) + '</span> تومان' : ''}` : 'چیزی انتخاب نشده'}</button></div>`;
  }
  function paintWaiter() {
    const L = live(), callLive = L.some((r) => r.kind === 'call' && r.stage < 3);
    let h = '';
    if (L.length) h += `<p class="w-more-t">درخواست‌های شما</p><div class="rq-list">${L.map(reqCard).join('')}</div>`;
    h += `<div class="w-main ${callLive ? 'sent' : ''}" ${callLive ? '' : 'data-k="call" role="button" tabindex="0"'}><span class="wm-ic">${icon(callLive ? 'check' : 'waiter')}</span><span class="wm-tx"><b>صدا زدن گارسون</b><span>${callLive ? 'درخواست شما ثبت شده است' : 'یک نفر تا یک دقیقه‌ی دیگر سر میز است'}</span></span></div>`;
    h += `<p class="w-more-t">چیز دیگری لازم دارید؟</p><div class="w-chips">${['pack', 'extra', 'cutlery', 'chair', 'clean'].map((k) => `<button class="w-chip ${picker === k ? 'open' : ''}" data-k="${k}">${icon(KINDS[k].i)}<span>${KINDS[k].t}</span>${k === 'pack' || k === 'extra' ? icon('chevd', 'i chev') : ''}</button>`).join('')}</div>${pickerHtml()}`;
    $('#waiterOpts').innerHTML = h;
    const btn = $('#openWaiter'); btn.classList.toggle('active', L.some((r) => r.stage < 3));
  }
  function openWaiter() { picker = null; paintWaiter(); Z.openSheet($('#waiterSheet')); }
  $('#waiterOpts').addEventListener('click', (e) => {
    const t = e.target;
    const c = t.closest('[data-cancel]'); if (c) { cancelReq(+c.dataset.cancel); return; }
    const inc = t.closest('[data-inc]'), dec = t.closest('[data-dec]');
    if (inc || dec) { const id = (inc || dec).dataset[inc ? 'inc' : 'dec']; pick[id] = Math.max(0, Math.min(9, (pick[id] || 0) + (inc ? 1 : -1))); $('#wPick').outerHTML = pickerHtml(); Z.haptic(4); return; }
    if (t.closest('#wPickGo')) { const list = picker === 'pack' ? PACK : EXTRAS_T; const items = list.filter((x) => pick[x.id]).map((x) => [x.id, pick[x.id]]); if (!items.length) return; list.forEach((x) => delete pick[x.id]); const k = picker; picker = null; addReq(k, items); return; }
    const b = t.closest('[data-k]'); if (!b) return; const k = b.dataset.k;
    if (k === 'pack' || k === 'extra') { picker = picker === k ? null : k; paintWaiter(); if (picker && Z.hasGsap) gsap.from('#wPick', { height: 0, opacity: 0, duration: 0.5, ease: 'expo.out', clearProps: 'height' }); Z.haptic(5); return; }
    if (live().some((r) => r.kind === k && r.stage < 3)) { Z.toast('این درخواست در جریان است', 'clock'); return; }
    addReq(k);
  });
  $('#openWaiter').addEventListener('click', openWaiter);
  document.addEventListener('entered', () => { const b = $('#openWaiter'); setTimeout(() => b.classList.add('tip'), 2200); setTimeout(() => b.classList.remove('tip'), 5600); }, { once: true });

  /* ---------- booking ---------- */
  Z.openBook = (ev) => {
    const days = []; const fmt = new Intl.DateTimeFormat('fa-IR', { weekday: 'short', day: 'numeric', month: 'short' });
    for (let i = 0; i < 7; i++) { const d = new Date(); d.setDate(d.getDate() + i); days.push(i === 0 ? 'امروز' : i === 1 ? 'فردا' : fmt.format(d)); }
    const times = ['۱۲:۳۰', '۱۴:۰۰', '۱۹:۳۰', '۲۰:۳۰', '۲۱:۳۰', '۲۲:۳۰'];
    $('#bookForm').innerHTML = `${ev ? `<div class="ev-chip">${icon('music')}${ev}</div>` : ''}
      <label>روز<div class="chips-line" data-g="day">${days.map((d, i) => `<button type="button" class="${i ? '' : 'on'}">${d}</button>`).join('')}</div></label>
      <label>ساعت<div class="chips-line" data-g="time">${times.map((t, i) => `<button type="button" class="${i === 3 ? 'on' : ''}">${t}</button>`).join('')}</div></label>
      <label>چند نفر<div class="stepper" style="align-self:start"><button type="button" data-pp="-1">${icon('minus')}</button><span class="n num" id="bkN">${fa(2)}</span><button type="button" data-pp="1">${icon('plus')}</button></div></label>
      <label>نام<input id="bkName" autocomplete="name" placeholder="نام و نام خانوادگی"></label>
      <label>شماره تماس<input id="bkPhone" inputmode="tel" autocomplete="tel" placeholder="۰۹۱۲…" dir="ltr" style="text-align:right"></label>
      <button class="btn-gold" id="bkGo" style="height:54px">${icon('check')}ثبت رزرو</button>`;
    Z.openSheet($('#bookSheet'));
  };
  let ppl = 2;
  $('#bookForm').addEventListener('click', (e) => {
    const c = e.target.closest('.chips-line button'); if (c) { $$('button', c.parentElement).forEach((b) => b.classList.toggle('on', b === c)); Z.haptic(4); return; }
    const p = e.target.closest('[data-pp]'); if (p) { ppl = Math.max(1, Math.min(20, ppl + +p.dataset.pp)); $('#bkN').textContent = fa(ppl); return; }
    if (e.target.closest('#bkGo')) {
      if (!$('#bkName').value.trim() || $('#bkPhone').value.replace(/\D/g, '').length < 8 && $('#bkPhone').value.replace(/[^۰-۹0-9]/g, '').length < 8) { Z.toast('نام و شماره را وارد کنید', 'hand'); return; }
      const d = $('[data-g=day] .on').textContent, t = $('[data-g=time] .on').textContent;
      Z.closeSheet($('#bookSheet')); Z.toast(`رزرو ${d} ساعت ${t} برای ${fa(ppl)} نفر ثبت شد`, 'cal');
    }
  });

  /* ---------- order status: live rounds ---------- */
  function renderStatus(anim) {
    const R = Z.rounds; if (!R.length) return;
    const r = R[R.length - 1];
    $('#statusLead').textContent = `میز ${fa(Z.table)} · ${r.step >= 3 ? 'آماده است' : 'حدود ' + fa(Z.etaMin()) + ' دقیقه'}`;
    $('#statusSteps').innerHTML = Z.STEPS.map(([k, t, s], i) => {
      if (i === 0 && !r.needsOk) s = 'مستقیم برای آشپزخانه رفت';
      if (k === 'cook') s = r.stations.join('، ');
      return `<div class="step ${i < r.step ? 'on' : i === r.step ? 'on now' : ''}"><i></i><span>${t}${s ? `<small>${s}</small>` : ''}</span></div>`;
    }).join('');
    $('#statusRounds').innerHTML = R.length > 1 ? R.slice(0, -1).reverse().map((x) => `<div class="round mini"><span class="rn num">دور ${Z.ord(x.n)}</span><span class="rl">${x.lines.map((l) => byId[l.id].name).join('، ')}</span><span class="rs s${x.step}"><i></i>${Z.STEPS[x.step][1]}</span></div>`).join('') : '';
    if (anim && Z.hasGsap) gsap.from('#statusSteps .step', { x: 30, opacity: 0, duration: 0.6, ease: 'expo.out', stagger: 0.08, delay: 0.2 });
  }
  Z.openStatus = () => { if (!Z.rounds.length) { Z.toast('اول سفارش را بفرستید', 'bag'); return; } renderStatus(true); Z.openSheet($('#statusSheet')); Z.ordered = true; };
  document.addEventListener('rounds', () => { if (!$('#statusSheet').hidden) renderStatus(false); if (view === 'table') renderTable(); });
  document.addEventListener('click', (e) => { if (e.target.closest('#statusGame, #openGame')) { if (!$('#statusSheet').hidden) Z.closeSheet($('#statusSheet')); setTimeout(Z.openGame, 200); } });

  /* ---------- favourites ---------- */
  function renderFavs() {
    const list = [...Z.favs].map((id) => byId[id]).filter(Boolean);
    $('#favGrid').innerHTML = list.length ? list.map((it) => `<button class="fav" data-id="${it.id}"><img alt="" data-dish="${it.id}"><span class="nm">${it.name}</span>${Z.priceEl(it)}<span class="add" data-quick="${it.id}" role="button" aria-label="افزودن">${icon('plus')}</span></button>`).join('')
      : `<div class="empty">${icon('heart')}<div>هنوز چیزی را نشان نکرده‌اید.</div><button class="btn-ghost" data-go2="menu">${icon('grid')}دیدن منو</button></div>`;
    $$('#favGrid img[data-dish]').forEach((im) => Z.setDishImg(im, byId[im.dataset.dish], 'r'));
    if (Z.hasGsap) gsap.from('#favGrid > *', { y: 30, opacity: 0, scale: 0.94, duration: 0.7, ease: 'expo.out', stagger: 0.05 });
  }
  document.addEventListener('favs', () => { if (view === 'favs') renderFavs(); });
  document.addEventListener('click', (e) => { const g = e.target.closest('[data-go2]'); if (g) Z.go(g.dataset.go2); });

  /* ---------- my table ---------- */
  function renderTable() {
    $('#tblNo').textContent = fa(Z.table);
    const basket = [...Z.cart.lines.values()], n = basket.reduce((s, l) => s + l.qty, 0);
    const lines = Z.tableLines(), B = Z.bill(lines, Z.cart.tip);
    const last = Z.rounds[Z.rounds.length - 1], m = Z.member;
    $('#tblBody').innerHTML = `
      <button class="tb-club ${m ? 'in' : ''}" data-tb="club" style="${m ? `--m1:${LEVELS[m.level].c1};--m2:${LEVELS[m.level].c2}` : ''}">${icon(m ? 'crown' : 'user')}<span><b>${m ? m.name + ' · ' + LEVELS[m.level].name : 'باشگاه زعفران'}</b><span>${m ? fa(m.points) + ' امتیاز' + (m.credit ? ' · حساب دفتری' : '') : 'با موبایل وارد شوید؛ امتیاز و تخفیف‌های اختصاصی'}</span></span>${icon('back')}</button>
      <button class="tb-card big" data-tb="cart"><span class="k">${n ? 'در سبد، ارسال‌نشده' : lines.length ? 'صورتحساب میز' : 'سفارش فعلی'}</span><b class="num">${n ? fa(n) + ' قلم' : lines.length ? toman(B.total) + ' تومان' : 'هنوز خالی است'}</b><span class="s">${icon('bag')}${n ? 'دیدن و ارسال به آشپزخانه' : lines.length ? 'با مالیات' + (B.disc ? ' و تخفیف دوشنبه' : '') : 'از منو انتخاب کنید'}</span></button>
      <div class="tb-grid">
        <button class="tb-card" data-tb="split">${icon('split')}<b>دنگ و پرداخت</b><span class="s">هر نفر سهم خودش، با لینک و QR</span></button>
        <button class="tb-card ${last ? 'live' : ''}" data-tb="status">${icon('clock')}<b>وضعیت سفارش</b><span class="s">${last ? 'دور ' + Z.ord(last.n) + ' · ' + Z.STEPS[last.step][1] : 'هنوز سفارشی نرفته'}</span></button>
        <button class="tb-card" data-tb="waiter">${icon('bell')}<b>گارسون</b><span class="s">آب، صورتحساب، تمیز کردن</span></button>
        <button class="tb-card" data-tb="game">${icon('play')}<b>بازی انتظار</b><span class="s">پیتزای خودتان را بپزید</span></button>
      </div>
      <div class="tb-wifi">${icon('wifi')}<span>وای‌فای مهمان</span><b class="num" dir="ltr">zafaran1382</b></div>`;
    if (Z.hasGsap) { gsap.killTweensOf('#tblBody *'); gsap.fromTo('#tblBody > :not(.tb-grid), .tb-grid > *', { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: 'expo.out', stagger: 0.05, clearProps: 'transform,opacity' }); }
  }
  Z.renderTable = () => { if (view === 'table') renderTable(); };
  $('#tblBody').addEventListener('click', (e) => {
    const b = e.target.closest('[data-tb]'); if (!b) return; const a = b.dataset.tb;
    if (a === 'cart') Z.openCart(); else if (a === 'split') Z.openCart('split'); else if (a === 'status') Z.openStatus(); else if (a === 'waiter') openWaiter(); else if (a === 'game') Z.openGame(); else if (a === 'club') Z.openClub();
  });

  /* ---------- keep the bag badge fresh ---------- */
  Z.cartBadge();
  addEventListener('keydown', (e) => { if (e.key !== 'Escape') return; if (!sEl.hidden) closeSearch(); else if (!$('#detail').hidden) Z.closeDetail(); else if (!$('#builder').hidden) $('#bClose').click(); else if (!$('#game').hidden) $('#gClose').click(); else $$('.sheet:not([hidden])').forEach(Z.closeSheet); });
})();
