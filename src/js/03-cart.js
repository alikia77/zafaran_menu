/* ============================================================
   Cart, rounds, the table bill and دنگ.
   The basket is what is not sent yet; every send becomes a round
   that the kitchen follows live. The bill covers all rounds:
   items → Monday plan → VAT → tip, then split three ways
   (each their own, equal, custom amounts) with a payment link + QR
   per share, pay at the desk, or «به حساب من» for credit members.
   ============================================================ */
(() => {
  const { $, $$, fa, toman, icon, byId } = Z;
  const COLORS = ['#e8c37a', '#9fd0a8', '#f0a58c', '#a9c4f2', '#d9a8e8', '#f2d77a', '#8fd6d0', '#f2a8c2'];
  const S = (Z.cart = { lines: new Map(), sent: [], people: [], mode: 'own', custom: {}, tip: 0, paid: new Map(), seq: 0, note: '' });

  /* ---------- lines ---------- */
  Z.extraPrice = (it, added) => { const ex = (EXTRAS[it.cat] || { add: [] }).add; return [...added].reduce((s, n) => s + ((ex.find((x) => x[0] === n) || [0, 0])[1]), 0); };
  Z.addLine = (it, { qty = 1, removed = [], added = [], custom = null, noDeal = false } = {}) => {
    if (Z.isOut(it)) { Z.toast(`${it.name} امشب تمام شده`, 'close'); return false; }
    const key = custom ? 'c' + ++S.seq : [it.id, [...removed].sort().join('|'), [...added].sort().join('|')].join('#');
    const unit = custom ? custom.price : it.price + Z.extraPrice(it, added);
    const line = S.lines.get(key) || { key, id: it.id, qty: 0, removed: [...removed], added: [...added], custom, unit, who: new Set(), noDeal };
    line.qty += qty;
    if (!line.who.size && S.people.length === 1) line.who.add(S.people[0].id);
    S.lines.set(key, line);
    badge(true); Z.haptic(12);
    return true;
  };
  // table extras (bread, herbs, sauces) go straight onto the bill once the waiter brings them
  Z.addToBill = (it, qty = 1) => {
    const ln = S.sent.find((l) => l.id === it.id && !l.custom);
    if (ln) ln.qty += qty; else S.sent.push({ key: 'x' + ++S.seq, id: it.id, qty, removed: [], added: [], custom: null, unit: it.price, who: new Set(S.people.length === 1 ? [S.people[0].id] : []), noDeal: true });
    badge(true);
  };
  const basket = () => [...S.lines.values()];
  const all = () => [...S.sent, ...S.lines.values()];
  const count = () => basket().reduce((n, l) => n + l.qty, 0);
  Z.tableLines = all;
  function badge(bump) {
    const n = count();
    $$('.cart-badge').forEach((b) => { b.textContent = fa(n); b.classList.toggle('on', n > 0); });
    if (bump && window.gsap) { const p = $('#navPlus'); p.classList.remove('bump'); void p.offsetWidth; setTimeout(() => p.classList.add('bump'), 560); }
  }
  Z.cartBadge = badge;

  /* ---------- people ---------- */
  function addPerson(name) {
    name = (name || '').trim(); if (!name) return;
    const id = 'p' + (S.people.length + 1) + (Date.now() % 1000);
    S.people.push({ id, name, color: COLORS[S.people.length % COLORS.length] });
    render(); Z.haptic(8);
  }
  Z.ensureMe = () => { if (Z.member && !S.people.some((p) => p.me)) { S.people.unshift({ id: 'me', name: Z.member.name, color: COLORS[0], me: true }); S.people.forEach((p, i) => (p.color = COLORS[i % COLORS.length])); } };

  function shares() {
    const lines = all(), B = Z.bill(lines, S.tip);
    const res = S.people.map((p) => ({ p, amount: 0, items: [] }));
    let unassigned = 0;
    if (!S.people.length) return { res, B, unassigned };
    if (S.mode === 'equal') { res.forEach((r) => { r.amount = B.total / S.people.length; r.items = ['سهم مساوی']; }); return { res, B, unassigned }; }
    if (S.mode === 'custom') {
      res.forEach((r) => { r.amount = +S.custom[r.p.id] || 0; r.items = ['مبلغ دلخواه']; });
      unassigned = Math.max(0, B.total - res.reduce((s, r) => s + r.amount, 0));
      return { res, B, unassigned };
    }
    // each their own: what they ordered, after the plan discount, plus their part of VAT and tip
    const k = B.net ? B.total / B.net : 1;
    lines.forEach((l) => {
      const who = [...l.who].filter((id) => S.people.some((p) => p.id === id));
      const amt = Z.lineNet(l) * k;
      if (!who.length) { unassigned += amt; return; }
      who.forEach((id) => { const r = res.find((x) => x.p.id === id); r.amount += amt / who.length; r.items.push(byId[l.id].name + (who.length > 1 ? ` (÷${fa(who.length)})` : '')); });
    });
    return { res, B, unassigned };
  }

  /* ---------- bill block (shared by both tabs) ---------- */
  function billHtml(B, opts = {}) {
    const rows = [`<div class="b-row"><span>جمع اقلام</span><span class="num">${toman(B.sub)}</span></div>`];
    B.used.forEach((v, id) => { const p = Z.planById[id]; rows.push(`<div class="b-row deal" style="--dc:${p.color}"><span><i></i>${p.name} (${fa(p.pct)}٪)</span><span class="num">−${toman(v)}</span></div>`); });
    rows.push(`<div class="b-row"><span>مالیات بر ارزش افزوده ${fa(Z.VAT)}٪</span><span class="num">${toman(B.vat)}</span></div>`);
    if (B.tip) rows.push(`<div class="b-row"><span>انعام</span><span class="num">${toman(B.tip)}</span></div>`);
    let h = `<div class="bill">${rows.join('')}<div class="sum"><span>${opts.label || 'قابل پرداخت'}</span><b class="num">${toman(B.total)} <small>تومان</small></b></div></div>`;
    if (B.disc) h += `<div class="save-note">${icon('spark')}امروز <b class="num">${toman(B.disc)}</b> تومان صرفه‌جویی کردید.</div>`;
    else if (B.locked) h += `<button class="save-note lock" data-club>${icon('crown')}با ورود به باشگاه، <b class="num">${toman(B.locked)}</b> تومان از همین سفارش کم می‌شود.</button>`;
    return h;
  }

  /* ---------- render ---------- */
  let tab = 'order';
  function render() {
    const body = $('#cartBody');
    const n = count(), sentN = S.sent.reduce((s, l) => s + l.qty, 0);
    $('#cartLead').textContent = `میز ${fa(Z.table)}` + (n ? ` · ${fa(n)} قلم در سبد` : '') + (sentN ? ` · ${fa(sentN)} قلم فرستاده‌شده` : '');
    setSeg();
    if (!S.lines.size && !S.sent.length) { body.innerHTML = `<div class="empty">${icon('bag')}<div>هنوز چیزی انتخاب نکرده‌اید.</div><div style="font-size:13px;color:var(--ink-3)">با دکمه‌ی + کنار هر غذا، آن را به سفارش میز اضافه کنید.</div></div>`; return; }
    if (tab === 'order') renderOrder(body); else renderSplit(body);
    $$('img[data-line]', body).forEach((img) => { const l = all().find((x) => x.key === img.dataset.line); if (!l) return; const it = byId[l.id]; const src = it.ing ? Z.ingSrc(it.ing) : Z.dishSrc(it, 'r'); if (src) img.src = src; else Z.drawn(it.recipe || l.id).then((u) => (img.src = u)); });
  }
  const modsOf = (l) => l.custom ? l.custom.label : [...l.removed.map((r) => 'بدون ' + r), ...l.added].join('، ');
  function lineHtml(l, step) {
    const it = byId[l.id], d = Z.dealFor(it, l), mods = modsOf(l), amt = l.unit * l.qty;
    const price = d && !d.locked ? `<span class="was">${toman(amt)}</span>${toman(amt * (1 - d.pct / 100))}` : toman(amt);
    return `<div class="line" data-k="${l.key}"><img data-line="${l.key}" alt=""><div><div class="nm">${it.name}</div>${mods ? `<div class="md">${mods}</div>` : ''}<div class="pr num">${price} تومان</div></div>
      ${step ? '' : `<div class="stepper"><button data-d="1" aria-label="یکی بیشتر">${icon('plus')}</button><span class="n num">${fa(l.qty)}</span><button data-d="-1" aria-label="یکی کمتر">${icon('minus')}</button></div>`}</div>`;
  }
  function renderOrder(body) {
    let h = '';
    if (S.lines.size) {
      h += basket().map((l) => lineHtml(l)).join('');
      h += `<label class="k-note">${icon('chef')}<input id="kNote" placeholder="یادداشت برای آشپزخانه (مثلاً تند نباشد)" value="${S.note.replace(/"/g, '&quot;')}"></label>`;
      if (Z.member && Z.member.allergy) h += `<div class="allergy">${icon('hand')}حساسیت شما به <b>${Z.member.allergy}</b> روی فیش آشپزخانه چاپ می‌شود.</div>`;
      h += billHtml(Z.bill(basket()), { label: 'جمع این دور' });
      if (Z.presence && Z.presence()) h += `<p class="as-guest">${icon('crown')}<span>به نام <b>${Z.member.title || Z.member.name}</b> · میز <span class="num">${fa(Z.table)}</span>${Z.member.allergy ? ` · گارسون از حساسیت به <b>${Z.member.allergy}</b> باخبر است` : ''}</span></p>`;
      h += `<div class="cta-col"><button class="btn-gold" id="sendOrder">${icon('send')}${S.sent.length ? `ارسال دور ${Z.ord(Z.rounds.length + 1)} به آشپزخانه` : 'ارسال سفارش'}</button>
        ${S.sent.length ? '' : '<p class="fine">اولین سفارش میز، بعد از تأیید گارسون به آشپزخانه می‌رود.</p>'}</div>`;
    }
    if (Z.rounds.length) {
      h += `<p class="ing-title" style="margin-top:18px">فرستاده‌شده</p>` + Z.rounds.map((r) => {
        const st = Z.STEPS[r.step];
        return `<button class="round" data-status><span class="rn num">دور ${Z.ord(r.n)}</span><span class="rl">${r.lines.map((l) => byId[l.id].name + (l.qty > 1 ? ' ×' + fa(l.qty) : '')).join('، ')}</span><span class="rs s${r.step}"><i></i>${st[1]}</span></button>`;
      }).join('');
      h += `<button class="btn-ghost wide" id="toSplit">${icon('split')}صورتحساب میز و دنگ</button>`;
    } else if (S.lines.size) h += `<button class="btn-ghost wide" id="toSplit">${icon('split')}تقسیم صورتحساب بین نفرات</button>`;
    body.innerHTML = h;
  }
  function renderSplit(body) {
    const { res, B, unassigned } = shares();
    const lines = all();
    let h = `<div class="people">${S.people.map((p) => `<span class="person" style="--pc:${p.color}"><i>${p.name.slice(0, 1)}</i>${p.name}${p.me ? ' (شما)' : ''}</span>`).join('')}</div>
      <div class="add-person"><input id="pName" placeholder="نام نفر (مثلاً زهرا)" enterkeyhint="done" autocomplete="off"><button class="btn-gold" id="pAdd" style="height:44px;padding:0 16px">${icon('plus')}افزودن</button></div>
      <div class="seg2" id="modeSeg"><span class="thumb"></span>${[['own', 'هر کس سهم خودش'], ['equal', 'مساوی'], ['custom', 'مبلغ دلخواه']].map(([m, t]) => `<button data-m="${m}" class="${S.mode === m ? 'on' : ''}">${t}</button>`).join('')}</div>`;
    if (S.mode === 'own') {
      h += `<p class="ing-title">هر غذا را به کسی که خورده بدهید. غذای مشترک بین چند نفر تقسیم می‌شود.</p>`;
      lines.forEach((l) => {
        const it = byId[l.id];
        h += `<div class="line" style="grid-template-columns:52px 1fr"><img data-line="${l.key}" alt="" style="width:52px;height:52px"><div><div class="nm">${it.name}${l.qty > 1 ? ' × ' + fa(l.qty) : ''}${l.round ? `<span class="rtag num">دور ${Z.ord(l.round)}</span>` : '<span class="rtag new">ارسال نشده</span>'}</div><div class="pr num">${toman(Z.lineNet(l))} تومان</div>
          <div class="who" data-k="${l.key}">${S.people.map((p) => `<button style="--pc:${p.color}" data-p="${p.id}" class="${l.who.has(p.id) ? 'on' : ''}">${p.name}</button>`).join('') || '<span style="font-size:12px;color:var(--ink-3)">اول نفرات میز را اضافه کنید</span>'}</div></div></div>`;
      });
    }
    h += `<p class="ing-title" style="margin-top:12px">انعام برای گارسون</p><div class="tips">${[0, 5, 10, 15].map((t) => `<button data-tip="${t}" class="${S.tip === t ? 'on' : ''}">${t ? fa(t) + '٪' : 'بدون انعام'}</button>`).join('')}</div>`;
    h += billHtml(B);
    if (S.people.length) {
      h += `<div class="shares">${res.map((r) => {
        const paid = S.paid.get(r.p.id);
        const amt = S.mode === 'custom' && !paid ? `<input class="cust num" data-cust="${r.p.id}" inputmode="numeric" placeholder="مبلغ" value="${S.custom[r.p.id] ? fa(S.custom[r.p.id]).replace(/٬/g, '') : ''}">` : `<div class="amt num">${toman(r.amount)}</div>`;
        return `<div class="share ${paid ? 'paid' : ''}" style="--pc:${r.p.color}"><i>${r.p.name.slice(0, 1)}</i><div><div class="nm">${r.p.name}</div><div class="its">${paid ? paid : r.items.join('، ') || 'هنوز غذایی ندارد'}</div></div>${amt}<button class="pay" data-pay="${r.p.id}" ${paid ? 'disabled' : ''}>${paid ? icon('check') : 'پرداخت'}</button></div>`;
      }).join('')}</div>`;
    } else h += `<p class="fine">نفرات میز را اضافه کنید تا سهم هر نفر جدا حساب شود.</p>`;
    if (unassigned > 1000) h += `<div class="warn-note num">${toman(unassigned)} تومان هنوز به کسی داده نشده.</div>`;
    body.innerHTML = h;
    moveThumb($('#modeSeg'));
    const inp = $('#pName');
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { addPerson(inp.value); setTimeout(() => $('#pName')?.focus(), 30); } });
  }
  function moveThumb(seg) {
    if (!seg) return;
    const on = seg.querySelector('button.on'), th = seg.querySelector('.thumb'); if (!on) return;
    th.style.width = on.offsetWidth + 'px'; th.style.transform = `translateX(${on.offsetLeft - 4}px)`; th.style.left = '4px';
  }
  function setSeg() { const seg = $('#cartSeg'); $$('button', seg).forEach((b) => b.classList.toggle('on', b.dataset.t === tab)); requestAnimationFrame(() => moveThumb(seg)); }

  /* ---------- send a round ---------- */
  function send() {
    const lines = basket().map((l) => ({ ...l, round: Z.rounds.length + 1, key: 'r' + (Z.rounds.length + 1) + ':' + l.key, who: new Set(l.who) }));
    if (!lines.length) return;
    const r = Z.sendRound(lines); r.note = S.note;
    S.sent.push(...lines); S.lines.clear(); S.note = '';
    badge(); Z.haptic(16);
    Z.closeSheet($('#cartSheet')); setTimeout(() => Z.openStatus(), 380);
  }

  /* ---------- events ---------- */
  const toDigits = (s) => +String(s).replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[^\d]/g, '') || 0;
  document.addEventListener('input', (e) => {
    if (e.target.id === 'kNote') S.note = e.target.value;
    const c = e.target.closest('[data-cust]'); if (c) { S.custom[c.dataset.cust] = toDigits(c.value); const { unassigned } = shares(); const w = $('.warn-note'); if (w) w.textContent = `${toman(unassigned)} تومان هنوز به کسی داده نشده.`; }
  });
  document.addEventListener('change', (e) => { if (e.target.closest('[data-cust]')) render(); });
  document.addEventListener('click', (e) => {
    const sheet = e.target.closest('#cartSheet'); if (!sheet) return;
    const t = e.target;
    const segB = t.closest('#cartSeg button'); if (segB) { tab = segB.dataset.t; render(); return; }
    const d = t.closest('[data-d]'); if (d) { const l = S.lines.get(d.closest('[data-k]').dataset.k); l.qty += +d.dataset.d; if (l.qty <= 0) S.lines.delete(l.key); badge(); render(); Z.haptic(6); return; }
    if (t.closest('#toSplit')) { tab = 'split'; Z.ensureMe(); render(); return; }
    if (t.closest('#pAdd')) { addPerson($('#pName').value); return; }
    const m = t.closest('#modeSeg button'); if (m) { S.mode = m.dataset.m; render(); return; }
    const w = t.closest('.who button'); if (w) { const l = all().find((x) => x.key === w.parentElement.dataset.k); l.who.has(w.dataset.p) ? l.who.delete(w.dataset.p) : l.who.add(w.dataset.p); render(); Z.haptic(5); return; }
    const tp = t.closest('[data-tip]'); if (tp) { S.tip = +tp.dataset.tip; render(); return; }
    const pay = t.closest('[data-pay]'); if (pay) { openPay(pay.dataset.pay); return; }
    if (t.closest('[data-status]')) { Z.closeSheet($('#cartSheet')); setTimeout(() => Z.openStatus(), 380); return; }
    if (t.closest('[data-club]')) { Z.closeSheet($('#cartSheet')); setTimeout(() => Z.openClub(), 380); return; }
    if (t.closest('#sendOrder')) send();
  });
  document.addEventListener('rounds', () => { if (!$('#cartSheet').hidden && tab === 'order') render(); });
  document.addEventListener('deals', () => { if (!$('#cartSheet').hidden) render(); });

  /* ---------- pay one share ---------- */
  function openPay(pid) {
    const { res } = shares(); const r = res.find((x) => x.p.id === pid); if (!r) return;
    const amount = Math.round(r.amount / 1000) * 1000;
    if (amount <= 0) { Z.toast('اول مبلغ این نفر را بنویسید', 'hand'); return; }
    const offline = !navigator.onLine;
    // a placeholder address until the restaurant's payment gateway is connected
    const link = `https://pay.zafaran.ir/t${Z.table}-${S.people.indexOf(r.p) + 1}?amount=${amount}`;
    const el = $('#paySheet');
    $('#payWho').textContent = r.p.name;
    $('#payAmt').innerHTML = `${toman(amount)} <small>تومان</small>`;
    $('#payLink').textContent = link;
    let qrSvg = '';
    try { const q = qrcode(0, 'M'); q.addData(link); q.make(); qrSvg = q.createSvgTag({ cellSize: 6, margin: 0, scalable: true }); } catch (e) { qrSvg = '<div style="color:#111;font-size:12px;padding:20px">QR در دسترس نیست</div>'; }
    $('#payQr').innerHTML = offline ? '<div class="qr-off">اینترنت قطع است؛<br>لطفاً سر صندوق پرداخت کنید.</div>' : qrSvg;
    const cr = Z.member && Z.member.credit && r.p.me;
    $('#payAlt').innerHTML = `<button class="btn-ghost" data-alt="desk">${icon('receipt')}پرداخت سر صندوق</button>` + (cr ? `<button class="btn-ghost" data-alt="credit">${icon('crown')}به حساب من (دفتری)</button>` : '');
    el.dataset.pid = pid; el.dataset.amt = amount;
    Z.openSheet(el);
  }
  function markPaid(pid, how, amount) {
    S.paid.set(pid, how);
    Z.closeSheet($('#paySheet'));
    const p = S.people.find((x) => x.id === pid);
    if (p && p.me && Z.member) { const pts = Math.floor(amount / 10000); Z.addPoints(pts); setTimeout(() => Z.toast(`${fa(pts)} امتیاز به باشگاه اضافه شد`, 'crown'), 900); }
    else Z.toast(how, 'check');
    setTimeout(() => { render(); if (S.people.length && S.people.every((x) => S.paid.has(x.id))) setTimeout(() => { Z.closeSheet($('#cartSheet')); setTimeout(Z.openSurvey, 450); }, 900); }, 300);
  }
  document.addEventListener('click', (e) => {
    if (e.target.closest('#payCopy')) {
      const text = $('#payLink').textContent;
      const sel = () => { const r = document.createRange(); r.selectNodeContents($('#payLink')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); };
      try { navigator.clipboard.writeText(text).then(() => Z.toast('لینک پرداخت کپی شد'), sel); } catch (_) { sel(); }
    }
    const el = $('#paySheet');
    if (e.target.closest('#payDone')) markPaid(el.dataset.pid, 'پرداخت آنلاین', +el.dataset.amt);
    const alt = e.target.closest('[data-alt]');
    if (alt && alt.dataset.alt === 'desk') { Z.closeSheet(el); Z.toast('صندوق در جریان است؛ سر صندوق پرداخت کنید', 'receipt'); S.paid.set(el.dataset.pid, 'سر صندوق پرداخت می‌کند'); setTimeout(render, 300); }
    if (alt && alt.dataset.alt === 'credit') {
      const c = Z.member.credit, amt = +el.dataset.amt;
      if (c.balance + amt > c.limit) { Z.toast('از سقف حساب دفتری بیشتر می‌شود', 'hand'); return; }
      c.balance += amt; Z.store.set('zf-member', Z.member); markPaid(el.dataset.pid, 'به حساب دفتری اضافه شد', amt);
    }
  });

  Z.openCart = (t = 'order') => { tab = t; if (t === 'split') Z.ensureMe(); render(); Z.openSheet($('#cartSheet')); };
})();
