/* ============================================================
   محفل زعفران — the guest circle. A page of its own: invitation and
   sign-up for new guests; for members, the card the staff scan, what
   the staff see, their surprises, standing order, house account and
   preferences. Plus the once-a-day popup when a discount day is on.
   ============================================================ */
(() => {
  const { $, $$, fa, toman, icon, byId } = Z;
  const el = $('#circleBody');
  let step = 'phone', phone = '', saved = false;
  const toLatin = (s) => String(s).replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[^\d]/g, '');
  const save = () => Z.store.set('zf-member', Z.member);
  const mark = `<svg class="cc-mark" viewBox="0 0 120 56" aria-hidden="true"><path d="M60 54C60 40 60 30 60 22"/><path d="M60 30C50 26 42 16 44 4C54 8 60 18 60 30"/><path d="M60 30C70 26 78 16 76 4C66 8 60 18 60 30"/><path d="M60 36C46 38 34 30 30 20C42 18 54 24 60 36"/><path d="M60 36C74 38 86 30 90 20C78 18 66 24 60 36"/></svg>`;

  function guest() {
    const form = step === 'phone'
      ? `<label class="cc-field"><span>شماره‌ی موبایل</span><input id="ccPhone" inputmode="tel" autocomplete="tel" placeholder="۰۹۱۲ ۰۰۰ ۰۰۰۰" dir="ltr" value="${phone}"></label>
         <button class="btn-gold cc-go" id="ccSend">دریافت کد ورود</button><button class="cc-link" id="ccSample">دیدن محفل با حساب نمونه</button>`
      : step === 'code'
        ? `<p class="cc-note">کد چهاررقمی به <b class="num" dir="ltr">${phone}</b> پیامک شد.</p><div class="otp cc-otp" id="ccOtp">${[0, 1, 2, 3].map(() => '<input maxlength="1" inputmode="numeric" aria-label="رقم کد">').join('')}</div>
           <p class="cc-note s">نسخه‌ی نمایشی: هر چهار رقمی را بزنید.</p><button class="cc-link" id="ccBack">تغییر شماره</button>`
        : `<label class="cc-field"><span>نام شما</span><input id="ccName" autocomplete="given-name" placeholder="مثلاً زهرا"></label>
           <label class="cc-field"><span>روز تولد (اختیاری)</span><input id="ccBirth" placeholder="مثلاً ۱۲ آبان"></label>
           <label class="cc-field"><span>حساسیت غذایی (اختیاری)</span><input id="ccAllergy" placeholder="مثلاً بادام‌زمینی"></label>
           <p class="cc-label">چطور خطابتان کنیم؟</p><div class="cc-chips cc-salute" id="ccSalute">${['خانم', 'آقا', 'فقط با نام'].map((x, i) => `<button class="${i === 2 ? 'on' : ''}">${x}</button>`).join('')}</div>
           <button class="btn-gold cc-go" id="ccJoin">ورود به محفل</button>`;
    return `<section class="cc-hero">${mark}<h1>محفل زعفران</h1><p>برای مهمان‌هایی که برمی‌گردند. شما را به اسم می‌شناسیم، میزتان را یادمان می‌ماند و گاهی غافلگیرتان می‌کنیم.</p></section>
      <section class="cc-perks">
        <div><span class="cc-ic">${icon('key')}</span><b>شناخته می‌شوید</b><span>از لحظه‌ی نشستن، گارسون اسم، میز دلخواه و حساسیت‌های شما را می‌داند.</span></div>
        <div><span class="cc-ic">${icon('gift')}</span><b>سورپرایزهای محفل</b><span>دسر تولد، هدیه‌ی سرآشپز و دعوت به شب‌های موسیقی پیش از همه.</span></div>
        <div><span class="cc-ic">${icon('crown')}</span><b>امتیاز و تخفیف اختصاصی</b><span>با هر دیدار امتیاز می‌گیرید و تخفیف‌های مخصوص اعضا برایتان فعال می‌شود.</span></div>
      </section>
      <section class="cc-join"><h2>${step === 'name' ? 'خوش آمدید' : 'عضویت، با یک شماره'}</h2>${form}</section>`;
  }


  /* ---------- being recognised at the table ----------
     Ordering from this phone already tells us the table (from the QR on it) and who you are,
     so the floor sees you by name automatically. The card's code is only for the cash desk
     or the front door: paying at the counter, takeaway, or a table where you didn't order. */
  Z.presence = () => !!Z.member && !Z.member.incognito;
  function presenceHtml(m) {
    const on = !m.incognito;
    return `<div class="cc-pres ${on ? 'on' : ''}">
      <span class="pr-dot"></span>
      <span class="pr-tx"><b>${on ? `سر میز <span class="num">${fa(Z.table)}</span>، مهمان آشنای ما هستید` : 'امشب، بی‌نام'}</b><span>${on ? 'گارسون و صندوق شما را به نام می‌شناسند و سلیقه‌تان را به خاطر دارند.' : 'امشب ناشناس می‌مانید. هر وقت خواستید، با یک لمس دوباره به نام شما خوش‌آمد می‌گوییم.'}</span></span>
      <label class="pr-sw" aria-label="نمایش به کارکنان"><input type="checkbox" id="ccPresence" ${on ? 'checked' : ''}><span class="sw"></span></label>
    </div>`;
  }
  function staffTicket(m) {
    const L = LEVELS[m.level], rounds = Z.rounds ? Z.rounds.length : 0;
    return `<div class="st-ticket">
      <div class="stt-h"><span class="stt-table">میز <b class="num">${fa(Z.table)}</b></span><span class="stt-live">${icon('clock')}<span class="num">${new Date().getHours().toString().replace(/\d/g, (c) => '۰۱۲۳۴۵۶۷۸۹'[c])}:${new Date().getMinutes().toString().padStart(2, '0').replace(/\d/g, (c) => '۰۱۲۳۴۵۶۷۸۹'[c])}</span></span></div>
      <div class="stt-who"><span class="stt-av" style="--m1:${L.c1};--m2:${L.c2}">${(m.title || m.name).trim().slice(0, 1)}</span><span><b>${m.title || m.name}</b><span>عضو ${L.name} · ${fa(m.visits ? m.visits.length + 1 : 1)}مین دیدار</span></span></div>
      ${m.allergy ? `<div class="stt-alert">${icon('hand')}حساسیت: <b>${m.allergy}</b></div>` : ''}
      <ul class="stt-facts">
        <li><span>تندی</span><b>${m.spice || 'ملایم'}</b></li>
        <li><span>میز دلخواه</span><b>${m.seat || '—'}</b></li>
        <li><span>پرداخت</span><b class="${m.credit ? 'gold' : ''}">${m.credit ? 'حساب ویژه' : 'معمولی'}</b></li>
        <li><span>سفارش امشب</span><b>${rounds ? fa(rounds) + ' دور' : 'هنوز نه'}</b></li>
      </ul>
      ${m.relation ? `<p class="stt-note">${icon('star')}${m.relation}</p>` : ''}
    </div>`;
  }
  function showQr() {
    const m = Z.member; if (!m) return;
    let ov = document.getElementById('qrOv');
    if (!ov) { ov = document.createElement('div'); ov.id = 'qrOv'; ov.className = 'qr-ov'; document.body.append(ov); ov.addEventListener('click', () => { ov.classList.remove('on'); setTimeout(() => (ov.hidden = true), 300); }); }
    let svg = ''; try { const q = qrcode(0, 'M'); q.addData('ZF-' + (m.handle || m.phone)); q.make(); svg = q.createSvgTag({ cellSize: 6, margin: 0, scalable: true }); } catch (e) {}
    ov.innerHTML = `<div class="qr-card"><span class="qr-k">محفل زعفران · ${LEVELS[m.level].name}</span><b>${m.title || m.name}</b><div class="qr-code">${svg}</div><p>این کد را سر صندوق یا در ورودی نشان دهید.<br>برای بستن، هر جا را لمس کنید.</p></div>`;
    ov.hidden = false; requestAnimationFrame(() => ov.classList.add('on'));
  }

  function member(m) {
    const L = LEVELS[m.level], N = L.next && LEVELS[L.next];
    const prog = N ? Math.min(100, (m.points / N.at) * 100) : 100;
    const lady = m.groups.includes('ladies');
    let h = `<section class="cc-hi"><p class="cc-hello">خوش برگشتید</p><h1>${m.title || m.name}</h1><p class="cc-tier">عضو ${L.name} محفل · از <span class="num">${m.since}</span></p></section>
      <div class="cc-card-wrap"><div class="mcard cc-mcard" id="ccCard" style="--m1:${L.c1};--m2:${L.c2}"><div class="mc-top"><span class="mc-brand">محفل زعفران</span><span class="mc-lvl">${L.name}</span></div>
        <div class="mc-name">${m.name}<small dir="ltr">${m.handle || m.phone || ''}</small></div>
        <div class="mc-bot"><div><span class="k">امتیاز</span><b class="num">${fa(m.points)}</b></div><div><span class="k">عضو از</span><b class="num">${m.since}</b></div><div class="mc-qr" id="ccQr"></div></div></div>
        ${presenceHtml(m)}</div>
      <section class="cc-sec"><div class="cc-prog"><div class="lvl-bar"><span style="width:${prog}%"></span></div><span>${N ? `${fa(Math.max(0, N.at - m.points))} امتیاز تا ${N.name}` : 'بالاترین سطح محفل'}</span></div></section>`;
    const gifts = [...(m.offers || []), ...(lady ? [{ i: 'crown', tag: 'بانو', t: 'چهارشنبه‌های بانو', d: 'هر چهارشنبه، ۱۵٪ روی همه‌ی غذاها و دسرها؛ مخصوص شما.' }] : [])];
    if (gifts.length) h += `<section class="cc-sec"><h3>سورپرایزهای شما</h3><div class="cc-gifts">${gifts.map((o) => `<article class="cc-gift">${icon(o.i)}<span class="g-tag">${o.tag || 'هدیه'}</span><b>${o.t}</b><span>${o.d}</span></article>`).join('')}</div></section>`;
    // staff view (staffTicket) is kept for the waiter app and cash desk, not shown to the guest
    if (m.usual && m.usual.length) h += `<section class="cc-sec"><h3>سفارش همیشگی</h3><button class="cc-usual" id="ccUsual"><span>${m.usual.map(([id, q]) => `<b>${byId[id].name}${q > 1 ? ' <i class="num">×' + fa(q) + '</i>' : ''}</b>`).join('')}</span><span class="btn-lux sm">${icon('repeat')}همان همیشگی</span></button></section>`;
    if (m.credit) {
      const c = m.credit;
      h += `<section class="cc-sec"><h3>حساب مهمان ویژه</h3><div class="cc-acct"><div class="a-row"><span>مانده</span><b class="num">${toman(c.balance)}<small>تومان</small></b></div>
        <div class="lvl-bar warm"><span style="width:${Math.min(100, (c.balance / c.limit) * 100)}%"></span></div>
        <div class="a-row s"><span class="num">سقف ${toman(c.limit)}</span><span>تسویه تا ${c.due}</span></div>
        <button class="btn-lux wide" id="ccSettle">${icon('card')}تسویه با لینک پرداخت</button></div></section>`;
    }
    h += `<section class="cc-sec"><h3>سلیقه‌ی شما</h3>
      <p class="cc-label">میز دلخواه</p><div class="cc-chips" data-pref="seat">${['کنار پنجره', 'گوشه‌ی دنج', 'نزدیک موسیقی', 'حیاط'].map((x) => `<button class="${(m.seat || '').includes(x) ? 'on' : ''}">${x}</button>`).join('')}</div>
      <p class="cc-label">تندی غذا</p><div class="cc-chips" data-pref="spice">${['بدون تندی', 'ملایم', 'تند'].map((x) => `<button class="${m.spice === x ? 'on' : ''}">${x}</button>`).join('')}</div>
      <label class="cc-field"><span>حساسیت غذایی</span><input id="ccAllergy2" value="${m.allergy || ''}" placeholder="ندارم"></label></section>`;
    if (m.visits && m.visits.length) h += `<section class="cc-sec"><h3>دیدارهای اخیر</h3><ul class="cc-visits">${m.visits.map(([d, n, t]) => `<li><span>${d}</span><span class="num">${fa(n)} نفر</span><b class="num">${toman(t)}</b></li>`).join('')}</ul></section>`;
    return h;
  }


  /* ---------- «نامه‌ای به زعفران»: a private letter to the owner and the chef ---------- */
  const TOPICS = ['طعم‌ها', 'پذیرایی', 'فضا و موسیقی', 'یک ایده برای ما'];
  let lt = { topic: null, sent: false };
  function letterHtml() {
    const m = Z.member;
    if (lt.sent) return `<section class="cc-sec lt-sec" id="ltSec"><div class="lt-done"><span class="lt-seal">${SEAL}</span><h3>نامه‌ی شما رسید</h3><p>هر نامه را خودمان می‌خوانیم؛ مدیر و سرآشپز.${m ? ' اگر لازم باشد، با شما تماس می‌گیریم.' : ''} از همراهی‌تان سپاسگزاریم.</p><button class="cc-link" id="ltAgain">نوشتن نامه‌ای دیگر</button></div></section>`;
    return `<section class="cc-sec lt-sec" id="ltSec">
      <div class="lt-head"><span class="lt-kicker">مستقیم به دست مدیر و سرآشپز</span><h3>نامه‌ای به زعفران</h3><p class="cc-sub">از شبی که گذراندید بنویسید؛ هر چه دوست داشتید، هر چه می‌توانست بهتر باشد، یا ایده‌ای که دوست دارید روی میزمان ببینید.</p></div>
      <div class="lt-paper">
        <div class="lt-to">به زعفران،</div>
        <div class="lt-topics" role="group" aria-label="درباره‌ی">${TOPICS.map((t) => `<button class="${lt.topic === t ? 'on' : ''}">${t}</button>`).join('')}</div>
        <textarea id="ltText" rows="5" placeholder="بنویسید…"></textarea>
        <div class="lt-sign"><span>با احترام،</span><b>${m ? m.name : 'یک مهمان'}</b></div>
      </div>
      ${m ? `<label class="demo-sw lt-call"><input type="checkbox" id="ltCall"><span class="sw"></span><span>مایلم درباره‌ی این نامه با من تماس بگیرند</span></label>` : ''}
      <button class="lt-send" id="ltSend"><span class="lt-seal sm">${SEAL_SM}</span>مهر و ارسال نامه</button>
    </section>`;
  }
  // a wax seal in saffron red with the house mark pressed into it
  // a pressed wax seal in deep saffron-red: a poured, irregular rim, a debossed field with a beaded
  // border and the house name around it, and the crocus mark picked out in gold leaf
  const sealSvg = (full) => { const u = full ? 'L' : 'S'; return `<svg viewBox="0 0 120 120" aria-hidden="true"><defs>
    <radialGradient id="wx${u}" cx=".36" cy=".3" r=".8"><stop offset="0" stop-color="#b93222"/><stop offset=".5" stop-color="#8a1a10"/><stop offset="1" stop-color="#4a0a05"/></radialGradient>
    <radialGradient id="wf${u}" cx=".6" cy=".65" r=".7"><stop offset="0" stop-color="#9c2416"/><stop offset="1" stop-color="#6e130b"/></radialGradient>
    <linearGradient id="au${u}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff1c8"/><stop offset=".35" stop-color="#e8c06a"/><stop offset=".7" stop-color="#b8862f"/><stop offset="1" stop-color="#f3d78e"/></linearGradient>
    <filter id="ed${u}" x="-15%" y="-15%" width="130%" height="130%"><feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="3" seed="11"/><feDisplacementMap in="SourceGraphic" scale="${full ? 9 : 6}"/></filter>
    <filter id="lt${u}" x="-15%" y="-15%" width="130%" height="130%"><feGaussianBlur in="SourceAlpha" stdDeviation="2.2" result="b"/>
      <feSpecularLighting in="b" surfaceScale="4" specularConstant="1" specularExponent="22" lighting-color="#ffd8c4" result="s"><feDistantLight azimuth="230" elevation="40"/></feSpecularLighting>
      <feComposite in="s" in2="SourceAlpha" operator="in" result="s2"/><feComposite in="SourceGraphic" in2="s2" operator="arithmetic" k2="1" k3=".5"/></filter>
    <filter id="in${u}" x="-10%" y="-10%" width="120%" height="120%"><feOffset dx="1.4" dy="1.6" in="SourceAlpha" result="o"/><feGaussianBlur in="o" stdDeviation="1.4" result="ob"/><feComposite in="SourceAlpha" in2="ob" operator="out" result="ring"/><feFlood flood-color="#2a0402" flood-opacity=".75"/><feComposite in2="ring" operator="in" result="sh"/><feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="sh"/></feMerge></filter>
    <filter id="em${u}"><feOffset dx="-.6" dy="-.6" in="SourceAlpha" result="a"/><feFlood flood-color="#fff6dc" flood-opacity=".7"/><feComposite in2="a" operator="in" result="hi"/><feOffset dx=".9" dy="1.1" in="SourceAlpha" result="b"/><feFlood flood-color="#3a0a04" flood-opacity=".8"/><feComposite in2="b" operator="in" result="lo"/><feMerge><feMergeNode in="lo"/><feMergeNode in="hi"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    ${full ? `<path id="tp${u}" d="M60 60m-29 0a29 29 0 1 1 58 0a29 29 0 1 1-58 0"/>` : ''}
  </defs>
  <g filter="url(#lt${u})"><g filter="url(#ed${u})"><circle cx="60" cy="60" r="50" fill="url(#wx${u})"/><ellipse cx="104" cy="74" rx="7" ry="5" fill="url(#wx${u})"/><ellipse cx="22" cy="96" rx="5" ry="4" fill="url(#wx${u})"/></g></g>
  <circle cx="60" cy="60" r="38" fill="url(#wf${u})" filter="url(#in${u})"/>
  <g fill="#c8463a" opacity=".55">${Array.from({ length: full ? 48 : 30 }, (_, i) => { const a = (i / (full ? 48 : 30)) * Math.PI * 2; return `<circle cx="${(60 + Math.cos(a) * 35.2).toFixed(2)}" cy="${(60 + Math.sin(a) * 35.2).toFixed(2)}" r="${full ? 0.9 : 1.2}"/>`; }).join('')}</g>
  ${full ? `<text direction="ltr" unicode-bidi="bidi-override" text-anchor="start" font-family="Georgia, 'Times New Roman', serif" font-size="5.6" font-weight="700" fill="url(#au${u})" filter="url(#em${u})"><textPath href="#tp${u}" startOffset="0" textLength="180" lengthAdjust="spacing">ZAFARAN · MMIII · ZAFARAN · MMIII ·</textPath></text>` : ''}
  <g transform="translate(60 ${full ? 61 : 61}) scale(${full ? 0.92 : 1.3})" filter="url(#em${u})" fill="url(#au${u})">
    <path d="M0-6c-3.2-3.6-3.6-8.6 0-14.6 3.6 6 3.2 11 0 14.6Z"/>
    <path d="M-1.2-4.6c-3.6-.2-8.6-2.8-10.4-9.6 5.4.4 9 3.6 10.4 9.6Z"/>
    <path d="M1.2-4.6c3.6-.2 8.6-2.8 10.4-9.6-5.4.4-9 3.6-10.4 9.6Z"/>
    <path d="M-5.6-4.8c1.6 3.6 3.4 5.4 5.6 5.8 2.2-.4 4-2.2 5.6-5.8-1.8 1-3.6 1.4-5.6 1.4s-3.8-.4-5.6-1.4Z"/>
    <g fill="none" stroke="url(#au${u})" stroke-width="1.1" stroke-linecap="round"><path d="M0-3.6C-.6-9-2.2-14-5-17.6"/><path d="M0-3.6C.6-9 2.2-14 5-17.6"/><path d="M0-3.6V-18.8"/></g>
    <path d="M-.6 1h1.2v14h-1.2Z"/>
    <path d="M0 15c-2.6-2.6-6.2-4.6-9-4.8 1.6 2.8 4.8 4.6 9 4.8Z"/><path d="M0 15c2.6-2.6 6.2-4.6 9-4.8-1.6 2.8-4.8 4.6-9 4.8Z"/>
  </g>
  <ellipse cx="38" cy="30" rx="13" ry="5" fill="#fff" opacity=".13" transform="rotate(-32 38 30)"/>
  </svg>`; };
  const SEAL = sealSvg(true), SEAL_SM = sealSvg(false);

  Z.renderCircle = (animate) => {
    el.innerHTML = `<div class="cc">${Z.member ? member(Z.member) : guest()}${letterHtml()}${Z.member ? '<button class="cc-link out" id="ccOut">خروج از حساب</button>' : ''}</div>`;
    if (Z.member) { try { const q = qrcode(0, 'L'); q.addData('ZF-' + (Z.member.handle || Z.member.phone)); q.make(); $('#ccQr').innerHTML = q.createSvgTag({ cellSize: 3, margin: 0, scalable: true }); } catch (e) {} Z.glass($('#ccCard')); }
    if (step === 'code' && !Z.member) setTimeout(() => $('#ccOtp input')?.focus(), 300);
    if (animate && Z.hasGsap) {
      gsap.fromTo('.cc > *', { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: 'expo.out', stagger: 0.06, clearProps: 'transform,opacity' });
      if (Z.member) gsap.fromTo('#ccCard', { rotateX: 22, y: 30 }, { rotateX: 0, y: 0, duration: 1.2, ease: 'expo.out' });
    }
  };
  Z.openClub = () => Z.go('circle');

  el.addEventListener('click', (e) => {
    const t = e.target;
    if (t.closest('#ccSend')) { phone = $('#ccPhone').value.trim(); if (toLatin(phone).length < 10) { Z.toast('شماره‌ی موبایل را کامل بنویسید', 'hand'); return; } step = 'code'; Z.renderCircle(); return; }
    if (t.closest('#ccBack')) { step = 'phone'; Z.renderCircle(); return; }
    if (t.closest('#ccSample')) { Z.signIn(Z.sampleMember()); Z.toast('خوش برگشتید، مریم خانم', 'crown'); return; }
    if (t.closest('#ccJoin')) {
      const n = $('#ccName').value.trim(); if (!n) { Z.toast('اسم‌تان را بنویسید', 'hand'); return; }
      const m = Z.newMember(n, phone); m.birthday = $('#ccBirth').value.trim(); m.allergy = $('#ccAllergy').value.trim(); const sal = $('#ccSalute .on')?.textContent || 'فقط با نام'; m.salute = sal; if (sal !== 'فقط با نام') m.title = `${n} ${sal}`; if (sal === 'خانم') m.groups.push('ladies');
      step = 'phone'; Z.signIn(m); Z.toast(`به محفل خوش آمدید، ${n}`, 'crown'); return;
    }
    const tp = t.closest('.lt-topics button');
    if (tp) { lt.topic = lt.topic === tp.textContent ? null : tp.textContent; $$('.lt-topics button').forEach((b) => b.classList.toggle('on', b.textContent === lt.topic)); Z.haptic(5); return; }
    if (t.closest('#ltAgain')) { lt = { topic: null, sent: false }; $('#ltSec').outerHTML = letterHtml(); return; }
    if (t.closest('#ltSend')) {
      const txt = $('#ltText').value.trim(); if (txt.length < 3) { Z.toast('چند کلمه بنویسید', 'hand'); $('#ltText').focus(); return; }
      try { const box = JSON.parse(localStorage.getItem('zf-letters') || '[]'); box.push({ at: Date.now(), topic: lt.topic, text: txt, call: !!$('#ltCall')?.checked, who: Z.member ? Z.member.name : null, table: Z.table }); localStorage.setItem('zf-letters', JSON.stringify(box)); } catch (e) {}
      Z.haptic(14);
      const done = () => { lt.sent = true; const sec = $('#ltSec'); sec.outerHTML = letterHtml(); if (Z.hasGsap) { gsap.from('#ltSec .lt-seal', { scale: 2.4, rotation: -40, opacity: 0, duration: 0.9, ease: 'back.out(1.6)' }); gsap.from('#ltSec .lt-done > :not(.lt-seal)', { y: 14, opacity: 0, duration: 0.8, ease: 'expo.out', stagger: 0.07, delay: 0.25 }); } };
      if (!Z.hasGsap || Z.reduce) return done();
      // the paper folds like a letter and slips away, then the seal is pressed
      gsap.timeline({ onComplete: done })
        .to('#ltSec .lt-paper', { scaleY: 0.12, transformOrigin: '50% 0%', duration: 0.55, ease: 'power3.inOut' })
        .to('#ltSec .lt-paper, #ltSec .lt-send, #ltSec .lt-call', { y: -30, opacity: 0, duration: 0.4, ease: 'power2.in' }, '-=0.1');
      return;
    }
    if (t.closest('#ccQrBig') || t.closest('#ccQr')) { showQr(); return; }
    if (t.closest('#ccOut')) { Z.signOut(); step = 'phone'; return; }
    if (t.closest('#ccUsual')) { Z.member.usual.forEach(([id, q]) => Z.addLine(byId[id], { qty: q })); Z.toast('سفارش همیشگی به سبد اضافه شد', 'bag'); return; }
    if (t.closest('#ccSettle')) { Z.toast('لینک تسویه برای شماره‌ی شما پیامک شد', 'send'); return; }
    const sc = t.closest('#ccSalute button'); if (sc) { $$('#ccSalute button').forEach((b) => b.classList.toggle('on', b === sc)); Z.haptic(5); return; }
    const chip = t.closest('.cc-chips button');
    if (chip) { const k = chip.parentElement.dataset.pref; $$('button', chip.parentElement).forEach((b) => b.classList.toggle('on', b === chip)); Z.member[k] = k === 'seat' ? chip.textContent : chip.textContent; save(); Z.haptic(5); return; }
  });
  el.addEventListener('input', (e) => {
    const o = e.target.closest('#ccOtp input');
    if (o) { o.value = toLatin(o.value).slice(-1); const ins = $$('#ccOtp input'); const i = ins.indexOf(o); if (o.value && ins[i + 1]) ins[i + 1].focus(); if (ins.every((x) => x.value)) { step = 'name'; setTimeout(() => Z.renderCircle(), 250); } }
    if (e.target.id === 'ccAllergy2' && Z.member) { Z.member.allergy = e.target.value.trim(); save(); }
  });
  el.addEventListener('change', (e) => {
    if (e.target.id === 'ccPresence' && Z.member) { Z.member.incognito = !e.target.checked; save(); Z.renderCircle(); Z.toast(e.target.checked ? 'کارکنان شما را با نام می‌شناسند' : 'حضور ناشناس فعال شد', e.target.checked ? 'crown' : 'user'); return; }
    if (false && e.target.id === 'ccLady2' && Z.member) { const g = Z.member.groups; e.target.checked ? g.includes('ladies') || g.push('ladies') : g.splice(g.indexOf('ladies'), 1); save(); Z.emit('deals'); }
  });
  document.addEventListener('member', () => { if (!$('#circle').hidden) Z.renderCircle(true); });

  /* ---------- the popup on a discount day, once a day, when the menu opens ---------- */
  const pop = $('#todayPop');
  const todayKey = () => 'zf-pop-' + new Date().toDateString();
  const FA_DAYS = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'];
  Z.showTodayPop = (force) => {
    const plans = Z.activePlans(); if (!plans.length) return;
    if (!force && Z.store.get(todayKey(), false)) return;
    Z.store.set(todayKey(), true);
    const p = plans.find((x) => x.who === 'all' || (Z.member && Z.member.groups.includes(x.who))) || plans[0];
    const mine = p.who === 'all' || (Z.member && Z.member.groups.includes(p.who));
    $('#tpBody').innerHTML = `<div class="tp-ph" style="--dc:${p.color}"><img alt="" src="${Z.photo(p.photo, 'hs') || ''}" style="background-image:url(${Z.lq(p.photo, 'h')})"><span class="tp-day">امروز ${FA_DAYS[new Date().getDay()]} است</span></div>
      <div class="tp-tx" style="--dc:${p.color}"><span class="tp-pct num">${fa(p.pct)}<small>٪</small></span><h2 id="tpTitle">${p.name}</h2><p>${p.scope}${plans.length > 1 ? ' · و ' + plans.filter((x) => x !== p).map((x) => x.name).join('، ') : ''}</p>
      <p class="tp-who">${mine ? 'تخفیف روی قیمت‌های منو اعمال شده است.' : 'برای بانوان عضو محفل. با عضویت، همین امروز فعال می‌شود.'}</p>
      <div class="tp-act"><button class="btn-gold" data-tp="close">دیدن منو</button>${mine ? '' : '<button class="btn-lux" data-tp="join">عضویت در محفل</button>'}</div></div>`;
    pop.hidden = false; document.body.style.overflow = 'hidden';
    if (Z.hasGsap) { gsap.fromTo($('.scrim', pop), { opacity: 0 }, { opacity: 1, duration: 0.4 }); gsap.fromTo('.tp-card', { y: 40, scale: 0.94, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.9, ease: 'expo.out' }); gsap.from('.tp-tx > *', { y: 14, opacity: 0, duration: 0.7, ease: 'expo.out', stagger: 0.05, delay: 0.15 }); }
    else $('.scrim', pop).style.opacity = 1;
  };
  const closePop = (cb) => { const fin = () => { pop.hidden = true; document.body.style.overflow = ''; cb && cb(); }; if (Z.hasGsap) { gsap.to('.tp-card', { y: 30, opacity: 0, duration: 0.3, ease: 'power2.in' }); gsap.to($('.scrim', pop), { opacity: 0, duration: 0.3, onComplete: fin }); } else fin(); };
  pop.addEventListener('click', (e) => { const b = e.target.closest('[data-tp]'); if (e.target.matches('.scrim') || (b && b.dataset.tp === 'close')) closePop(); else if (b && b.dataset.tp === 'join') closePop(() => Z.go('circle')); });
  const shown = Z.menuShown;
  Z.menuShown = (opts) => { shown(opts); setTimeout(() => Z.showTodayPop(), 900); };
})();
