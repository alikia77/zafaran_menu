/* ============================================================
   Club, Monday plans, tonight's programme, the shop and the
   after-payment survey.
   ============================================================ */
(() => {
  const { $, $$, fa, toman, icon, byId } = Z;
  const pad2 = (v) => fa(v).padStart(2, '۰');
  const left = () => { const n = new Date(), end = new Date(n); end.setHours(23, 59, 59, 0); let s = Math.max(0, (end - n) / 1000 | 0); return `${pad2(s / 3600 | 0)}:${pad2((s % 3600) / 60 | 0)}:${pad2(s % 60)}`; };
  const daysToMonday = () => { const d = new Date().getDay(); return ((1 - d + 7) % 7) || 7; };

  const FA_DAYS = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'];
  const daysTo = (p) => { const d = new Date().getDay(); return Math.min(...p.days.map((x) => ((x - d + 7) % 7) || 7)); };
  const isMine = (p) => p.who === 'all' || (Z.member && Z.member.groups.includes(p.who));

  /* ---------- offers rail on the home page ---------- */
  const combo = { price: Math.round((byId.soltani.price + byId.doogh.price * 2 + byId.shirazi.price) * 0.85 / 1000) * 1000 };
  function renderOffers() {
    const el = $('#offers'); if (!el) return;
    el.innerHTML = PLANS.filter((p) => !Z.hidesPlan(p)).map((p) => {
      const live = Z.planToday(p), mine = isMine(p);
      const status = live ? `<span class="of-live"><i></i>امروز فعال · <b class="num" data-left>${left()}</b></span>` : `<span class="of-when">${FA_DAYS[p.days[0]]}‌ها · ${daysTo(p) === 1 ? 'فردا' : fa(daysTo(p)) + ' روز دیگر'}</span>`;
      return `<button class="offer-card" data-plan="${p.id}" style="--dc:${p.color};--di:${p.ink}"><img alt="" loading="lazy" decoding="async" src="${Z.photo(p.photo, 'hs') || ''}" style="background-image:url(${Z.lq(p.photo, 'h')})"><span class="of-veil"></span>
        ${status}<span class="of-pct num">${fa(p.pct)}<small>٪</small></span>
        <span class="of-tx"><b>${p.name}</b><span>${p.scope}</span><em>${p.who === 'all' ? p.line : mine ? 'شما عضو باشگاه بانو هستید' : p.line}</em></span></button>`;
    }).join('') + `<div class="offer-card chef" style="--dc:#e6d3a7;--di:#1a1307"><img alt="" loading="lazy" decoding="async" src="${Z.photo('hero-kebab', 'hs') || ''}" style="background-image:url(${Z.lq('hero-kebab', 'h')})"><span class="of-veil"></span>
        <span class="of-live"><i></i>فقط امشب · <b class="num" data-left>${left()}</b></span><span class="of-pct num">${fa(15)}<small>٪</small></span>
        <span class="of-tx"><b>سینی سلطانی دونفره</b><span>کباب سلطانی، دو دوغ محلی و سالاد شیرازی</span><button class="btn-lux sm" id="promoBtn"><span class="num">${toman(combo.price)}</span>${icon('plus')}</button></span></div>`;
  }
  document.addEventListener('click', (e) => {
    if (e.target.closest('#promoBtn')) { e.stopPropagation(); if (Z.addLine(byId.soltani, { custom: { price: combo.price, label: 'سینی دونفره: سلطانی، ۲ دوغ، سالاد شیرازی' }, noDeal: true })) { Z.flyTo(e.target.closest('.offer-card').querySelector('img'), $('#navPlus')); Z.toast('سینی سلطانی اضافه شد', 'bag'); } return; }
    if (e.target.closest('.offer-card[data-plan], .deal-bar, [data-deals]')) openDeals();
  });

  /* ---------- the slim bar in the menu: only on a day a plan runs ---------- */
  function dealBar(el) {
    if (!el) return;
    const plans = Z.activePlans();
    el.hidden = !plans.length; if (!plans.length) return;
    el.classList.add('live');
    const mine = plans.some((p) => p.who !== 'all' && isMine(p));
    el.innerHTML = `<span class="db-dots">${plans.map((p) => `<i style="--dc:${p.color}"></i>`).join('')}</span><span class="db-t"><b>امروز ${plans.map((p) => p.today).join(' و ')}</b><span>${plans.map((p) => `${p.short} ${fa(p.pct)}٪`).join(' · ')}${mine ? ' · روی قیمت‌های شما اعمال شده' : ''}</span></span><span class="db-clock num" data-left>${left()}</span>`;
  }
  function renderDealBars() { dealBar($('#dealMenu')); renderOffers(); }
  setInterval(() => $$('[data-left]').forEach((x) => (x.textContent = left())), 1000);

  function openDeals() {
    $('#dealBody').innerHTML = PLANS.filter((p) => !Z.hidesPlan(p)).map((p) => {
      const mine = isMine(p), live = Z.planToday(p);
      return `<div class="plan" style="--dc:${p.color};--di:${p.ink}"><div class="pl-pct num">${fa(p.pct)}٪</div><div><b>${p.name}</b><span>${p.scope}</span>
        <span class="pl-who">${p.who === 'all' ? 'برای همه‌ی مهمان‌ها' : mine ? 'شما عضو باشگاه بانو هستید' : 'برای بانوان عضو باشگاه'}</span></div>
        <span class="pl-st ${live ? 'on' : ''}">${live ? (mine ? 'فعال' : 'نیاز به عضویت') : FA_DAYS[p.days[0]] + '‌ها'}</span></div>`;
    }).join('') + (!Z.member ? `<button class="btn-lux wide" data-club>${icon('crown')}عضویت در باشگاه</button>` : '')
      + `<label class="demo-sw"><input type="checkbox" id="demoMon" ${Z.demoMonday ? 'checked' : ''}><span class="sw"></span><span>پیش‌نمایش همه‌ی روزها<small>فقط برای دیدن قیمت‌ها، تا مدیر روزها و درصدها را تأیید کند</small></span></label>`;
    Z.openSheet($('#dealSheet'));
  }
  Z.openDeals = openDeals;
  document.addEventListener('change', (e) => { if (e.target.id === 'demoMon') { Z.setDemoMonday(e.target.checked); Z.toast(e.target.checked ? 'قیمت‌ها با همه‌ی تخفیف‌ها' : 'قیمت‌های امروز', 'cal'); } });
  document.addEventListener('click', (e) => { if (e.target.closest('#dealSheet [data-club]')) { Z.closeSheet($('#dealSheet')); setTimeout(Z.openClub, 380); } });

  /* ---------- tonight ---------- */
  function renderTonight() {
    const d = new Date().getDay();
    let k = 0, ev = null; for (; k < 7; k++) { ev = NIGHTS[(d + k) % 7]; if (ev) break; }
    if (!ev) return;
    const when = k === 0 ? 'امشب در زعفران' : k === 1 ? 'فردا شب' : FA_DAYS[(d + k) % 7] + ' شب';
    const el = $('#tonight');
    el.dataset.ev = ev.t;
    el.innerHTML = `<div class="tn-img"><img alt="${ev.t}" loading="lazy" decoding="async" src="${Z.photo(ev.p, 'h') || ''}" style="background-image:url(${Z.lq(ev.p, 'h')})"></div>
      <div class="tn-tx"><span class="tn-live ${k ? '' : 'on'}"><i></i>${when}</span><b>${ev.t}</b><span class="tn-who">${ev.who}</span>
      <span class="tn-when num">${icon('clock')}ساعت ${ev.at} · ظرفیت محدود</span>
      <button class="btn-lux sm tn-cta">${icon('seat')}رزرو صندلی</button></div>`;
  }
  $('#tonight').addEventListener('click', (e) => { if (e.target.closest('.tn-cta')) Z.openBook($('#tonight').dataset.ev); });

  /* ---------- the atelier ---------- */
  function renderShop() {
    const hero = $('[data-photo-h="atelier"]'); if (hero) { hero.loading = 'lazy'; hero.decoding = 'async'; hero.style.backgroundImage = `url(${Z.lq('atelier', 'h')})`; hero.src = Z.photo('atelier', 'h'); }
    $('#shop').innerHTML = SHOP.map((it) => `<article class="shop-item"><div class="si-ph"><img alt="${it.name}" loading="lazy" decoding="async" src="${Z.photo(it.photo, 'hs')}" style="background-image:url(${Z.lq(it.photo, 'h')})"><span class="si-note">${it.note}</span></div>
      <div class="si-tx"><b>${it.name}</b><span>${it.desc}</span></div><div class="si-buy">${Z.priceEl(it, 'price num')}<button class="add" data-quick="${it.id}" aria-label="افزودن ${it.name}">${icon('plus')}</button></div></article>`).join('');
  }

  /* ---------- club ---------- */
  let step = 'phone', phone = '';
  const toLatin = (s) => String(s).replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[^\d]/g, '');
  function memberCard(m) {
    const L = LEVELS[m.level];
    return `<div class="mcard" id="mcard" style="--m1:${L.c1};--m2:${L.c2}"><div class="mc-top"><span class="mc-brand">زعفران</span><span class="mc-lvl">${L.name}</span></div>
      <div class="mc-name">${m.name}<small dir="ltr">${m.handle || ''}</small></div>
      <div class="mc-bot"><div><span class="k">امتیاز</span><b class="num">${fa(m.points)}</b></div><div><span class="k">عضو از</span><b class="num">${m.since}</b></div><div class="mc-qr" id="mcQr"></div></div></div>`;
  }
  function renderClub() {
    const b = $('#clubBody'), m = Z.member;
    if (!m) {
      const head = `<h2>باشگاه زعفران</h2><p class="lead">با شماره‌ی موبایل، بدون رمز.</p>
        <div class="perks">${[['spark', 'با هر ۱۰ هزار تومان یک امتیاز'], ['crown', 'تخفیف‌های اختصاصی مثل چهارشنبه‌های بانو'], ['gift', 'هدیه‌ی هفته‌ی تولد'], ['repeat', 'سفارش همیشگی با یک لمس']].map(([i, t]) => `<span>${icon(i)}${t}</span>`).join('')}</div>`;
      if (step === 'phone') b.innerHTML = head + `<div class="form"><label>شماره‌ی موبایل<input id="cPhone" inputmode="tel" autocomplete="tel" placeholder="۰۹۱۲ ۰۰۰ ۰۰۰۰" dir="ltr" value="${phone}"></label>
        <button class="btn-lux wide" id="cSend">${icon('send')}دریافت کد</button><button class="link-btn" id="cSample">ورود با حساب نمونه (برای دیدن امکانات)</button></div>`;
      else if (step === 'code') b.innerHTML = head + `<div class="form"><label>کد چهاررقمی به <span class="num" dir="ltr">${phone}</span> پیامک شد<div class="otp" id="cOtp">${[0, 1, 2, 3].map(() => '<input maxlength="1" inputmode="numeric">').join('')}</div></label>
        <p class="fine">نسخه‌ی نمایشی: هر چهار رقمی را بزنید.</p><button class="link-btn" id="cBack">تغییر شماره</button></div>`;
      else b.innerHTML = `<h2>خوش آمدید</h2><p class="lead">اسمتان را بنویسید تا منو با اسم خودتان سلام کند.</p><div class="form"><label>نام<input id="cName" autocomplete="given-name" placeholder="مثلاً زهرا"></label>
        <label>حساسیت غذایی (اختیاری)<input id="cAllergy" placeholder="مثلاً بادام‌زمینی"></label><label class="demo-sw"><input type="checkbox" id="cLady"><span class="sw"></span><span>عضویت در باشگاه بانو<small>چهارشنبه‌ها ۱۵٪ تخفیف</small></span></label><button class="btn-lux wide" id="cJoin">${icon('check')}عضو شوید</button></div>`;
      if (step === 'code') setTimeout(() => $('#cOtp input')?.focus(), 350);
      return;
    }
    const L = LEVELS[m.level], N = L.next && LEVELS[L.next];
    let h = `<div class="club-hi"><h2>سلام ${m.name}</h2><p class="lead">سطح ${L.name} · ${fa(m.points)} امتیاز</p></div>` + memberCard(m);
    if (N) h += `<div class="lvl-bar"><span style="width:${Math.min(100, (m.points / N.at) * 100)}%"></span></div><p class="fine">${fa(Math.max(0, N.at - m.points))} امتیاز تا سطح ${N.name}</p>`;
    else h += `<p class="fine">بالاترین سطح باشگاه. امتیازها را می‌شود با غذا یا اعتبار عوض کرد.</p>`;
    if (m.offers.length) h += `<p class="ing-title" style="margin-top:16px">مخصوص شما</p><div class="offers">${m.offers.map((o) => `<div class="offer">${icon(o.i)}<span><b>${o.t}</b><span>${o.d}</span></span></div>`).join('')}</div>`;
    if (m.groups.includes('ladies')) h += `<div class="offer pink">${icon('crown')}<span><b>باشگاه بانو</b><span>چهارشنبه‌ها ۱۵٪ روی همه‌ی غذاها و دسرها، بجز نوشیدنی</span></span></div>`;
    if (m.usual.length) h += `<p class="ing-title" style="margin-top:16px">سفارش همیشگی</p><button class="usual" id="cUsual">${icon('repeat')}<span><b>${m.usual.map(([id, q]) => byId[id].name + (q > 1 ? ' ×' + fa(q) : '')).join('، ')}</b><span>با یک لمس به سبد اضافه می‌شود</span></span></button>`;
    if (m.credit) {
      const c = m.credit, pct = Math.min(100, (c.balance / c.limit) * 100);
      h += `<p class="ing-title" style="margin-top:16px">حساب دفتری</p><div class="credit"><div class="cr-row"><span>مانده‌ی بدهی</span><b class="num">${toman(c.balance)} <small>تومان</small></b></div>
        <div class="lvl-bar warm"><span style="width:${pct}%"></span></div><div class="cr-row s"><span class="num">سقف ${toman(c.limit)}</span><span>موعد تسویه ${c.due}</span></div>
        <button class="btn-ghost wide" id="cSettle">${icon('card')}تسویه با لینک پرداخت</button></div>`;
    }
    h += `<div class="form" style="margin-top:16px"><label>حساسیت غذایی<input id="cAllergy2" value="${m.allergy || ''}" placeholder="ندارم"></label></div>
      <button class="link-btn danger" id="cOut">خروج از حساب</button>`;
    b.innerHTML = h;
    Z.glass($('#mcard'));
    try { const q = qrcode(0, 'L'); q.addData('ZF-' + (m.handle || m.phone)); q.make(); $('#mcQr').innerHTML = q.createSvgTag({ cellSize: 3, margin: 0, scalable: true }); } catch (e) {}
    if (Z.hasGsap) { gsap.fromTo('#mcard', { rotateX: 24, y: 30, opacity: 0 }, { rotateX: 0, y: 0, opacity: 1, duration: 1, ease: 'expo.out' }); gsap.from('#clubBody .offer, #clubBody .usual, #clubBody .credit', { y: 18, opacity: 0, duration: 0.7, ease: 'expo.out', stagger: 0.05, delay: 0.2 }); }
  }
  Z.openClub = () => { if (!Z.member) step = 'phone'; renderClub(); Z.openSheet($('#clubSheet')); };
  $('#clubSheet').addEventListener('click', (e) => {
    const t = e.target;
    if (t.closest('#cSend')) { phone = $('#cPhone').value.trim(); if (toLatin(phone).length < 10) { Z.toast('شماره‌ی موبایل را کامل بنویسید', 'hand'); return; } step = 'code'; renderClub(); return; }
    if (t.closest('#cBack')) { step = 'phone'; renderClub(); return; }
    if (t.closest('#cSample')) { Z.signIn(Z.sampleMember()); Z.toast('خوش آمدید مریم', 'crown'); return; }
    if (t.closest('#cJoin')) { const n = $('#cName').value.trim(); if (!n) { Z.toast('اسم را بنویسید', 'hand'); return; } const m = Z.newMember(n, phone); m.allergy = $('#cAllergy').value.trim(); if ($('#cLady') && $('#cLady').checked) m.groups.push('ladies'); Z.signIn(m); step = 'phone'; Z.toast(`خوش آمدید ${n}`, 'crown'); return; }
    if (t.closest('#cOut')) { Z.signOut(); step = 'phone'; return; }
    if (t.closest('#cUsual')) { Z.member.usual.forEach(([id, q]) => Z.addLine(byId[id], { qty: q })); Z.closeSheet($('#clubSheet')); Z.toast('سفارش همیشگی به سبد اضافه شد', 'bag'); return; }
    if (t.closest('#cSettle')) Z.toast('لینک تسویه برای شماره‌ی شما پیامک شد', 'send');
  });
  $('#clubSheet').addEventListener('input', (e) => {
    const o = e.target.closest('#cOtp input');
    if (o) { o.value = toLatin(o.value).slice(-1); const ins = $$('#cOtp input'); const i = ins.indexOf(o); if (o.value && ins[i + 1]) ins[i + 1].focus(); if (ins.every((x) => x.value)) { step = 'name'; setTimeout(renderClub, 250); } }
    if (e.target.id === 'cAllergy2' && Z.member) { Z.member.allergy = e.target.value.trim(); Z.store.set('zf-member', Z.member); }
  });

  /* ---------- after payment ---------- */
  let stars = 0, liked = new Set();
  Z.openSurvey = () => {
    stars = 0; liked = new Set();
    $('#surveyBody').innerHTML = `<div class="stars" id="svStars">${[1, 2, 3, 4, 5].map((n) => `<button data-star="${n}" aria-label="${fa(n)} ستاره">${icon('star')}</button>`).join('')}</div>
      <p class="ing-title">چه چیزی خوب بود؟</p><div class="chips-line" id="svChips">${['غذا', 'سرویس', 'سرعت', 'فضا', 'موسیقی', 'قیمت'].map((c) => `<button>${c}</button>`).join('')}</div>
      <div class="form" style="margin-top:12px"><label>حرفی برای مدیر؟<input id="svText" placeholder="اختیاری"></label><button class="btn-lux wide" id="svGo">${icon('send')}ارسال</button></div>`;
    Z.openSheet($('#surveySheet'));
  };
  $('#surveySheet').addEventListener('click', (e) => {
    const s = e.target.closest('[data-star]'); if (s) { stars = +s.dataset.star; $$('#svStars button').forEach((b, i) => b.classList.toggle('on', i < stars)); Z.haptic(6); if (Z.hasGsap) gsap.fromTo(s, { scale: 0.7 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' }); return; }
    const c = e.target.closest('#svChips button'); if (c) { c.classList.toggle('on'); return; }
    if (e.target.closest('#svGo')) { if (!stars) { Z.toast('یک ستاره تا پنج ستاره', 'star'); return; } Z.closeSheet($('#surveySheet')); if (Z.member) Z.addPoints(20); Z.toast(Z.member ? 'ممنون؛ ۲۰ امتیاز هدیه گرفتید' : 'ممنون که نوشتید', 'check'); }
  });

  /* ---------- the kitchen marks a dish as finished, live ---------- */
  let fired = false;
  document.addEventListener('entered', () => setTimeout(() => { if (fired) return; fired = true; Z.markOut('baghali'); Z.toast('باقالی‌پلو همین الان تمام شد', 'clock'); }, 120000));

  /* ---------- wiring ---------- */
  renderDealBars(); renderTonight(); renderShop();
  document.addEventListener('deals', () => { renderDealBars(); Z.refreshPrices(); Z.applyStock(); });
  document.addEventListener('member', () => { if (!$('#clubSheet').hidden) renderClub(); Z.renderTable && Z.renderTable(); renderDealBars(); });
  requestAnimationFrame(() => Z.applyStock());
  document.addEventListener('entered', () => setTimeout(Z.applyStock, 50));
})();
