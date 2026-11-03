/* ============================================================
   System layer — the parts the restaurant server will own later:
   today's plans (Pink / Green Monday), the signed-in member and
   the club, live stock ("تمام شد"), the shop, the bill maths
   (discount → VAT → tip) and the live state of each order round.
   For now everything runs in the page with sample data.
   ============================================================ */
const SHOP = [
  { id: 'shop-saffron', cat: 'shop', name: 'زعفران سرگل قائنات', desc: 'یک مثقال، در شیشه‌ی دربسته؛ همان که هر صبح دم می‌کنیم', price: 1290000, tags: [], photo: 'shop-saffron', glow: '#c8341a', unit: 'شیشه', note: 'برداشت ۱۴۰۵' },
  { id: 'shop-rice', cat: 'shop', name: 'برنج طارم هاشمی', desc: 'دانه‌بلند و معطر، یک سال کهنه؛ کیسه‌ی کتان ۵ کیلویی', price: 1450000, tags: [], photo: 'shop-rice', glow: '#e8c98a', unit: 'کیسه', note: 'مزرعه‌ی آمل' },
  { id: 'shop-sauce', cat: 'shop', name: 'سس انار و گردوی دست‌ساز', desc: 'پایه‌ی فسنجان ما؛ رب انار ترش، گردوی برشته، بدون نگهدارنده', price: 480000, tags: [], photo: 'shop-sauce', glow: '#5a1a1e', unit: 'شیشه', note: 'هر هفته، تازه' },
  { id: 'shop-torshi', cat: 'shop', name: 'ترشی هفت‌بیجار خانگی', desc: 'هفت سبزی و صیفی در سرکه‌ی انگور، شش هفته خوابیده', price: 390000, tags: [], photo: 'shop-torshi', glow: '#7a3a1a', unit: 'شیشه', note: 'دستور مادربزرگ' },
];

// the two Monday plans; who: 'all' or a member group
const PLANS = [
  { id: 'ladies', name: 'چهارشنبه‌های بانو', today: 'چهارشنبه‌ی بانو', short: 'بانو', color: '#e6b8a6', ink: '#3a1d15', days: [3], pct: 15, who: 'ladies',
    scope: 'همه‌ی غذاها و دسرها، بجز نوشیدنی', line: 'یک شب در هفته برای بانوان عضو باشگاه', photo: 'ch-dessert', on: (it) => !['cold', 'hot', 'shop'].includes(it.cat) },
  { id: 'green', name: 'روزهای سبز', today: 'روز سبز', short: 'سبز', color: '#a9cf9a', ink: '#11260d', days: [1], pct: 20, who: 'all',
    scope: 'غذاهای گیاهی و سالادها', line: 'دوشنبه‌ها، برای همه‌ی مهمان‌ها', photo: 'ch-salad', on: (it) => it.cat !== 'shop' && (it.tags.includes('veg') || it.cat === 'salad') },
];

const LEVELS = {
  bronze: { name: 'برنزی', c1: '#e7b38a', c2: '#8a5634', next: 'silver', at: 0 },
  silver: { name: 'نقره‌ای', c1: '#eef1f4', c2: '#8d96a0', next: 'gold', at: 3000 },
  gold: { name: 'طلایی', c1: '#f6dea3', c2: '#a87c2e', next: null, at: 8000 },
};

// tonight's programme by weekday (0 = Sunday … 4 = Thursday)
const NIGHTS = {
  1: { t: 'شب آواز و تار', who: 'گروه نوای مهر', at: '۲۱:۰۰', p: 'event-music' },
  4: { t: 'شب موسیقی سنتی', who: 'سه‌تار و تنبک زنده', at: '۲۰:۳۰', p: 'event-music' },
  5: { t: 'میز سرآشپز', who: 'منوی هفت‌مرحله‌ای، ظرفیت ۱۲ نفر', at: '۲۰:۰۰', p: 'event-chef' },
};

(() => {
  const { $, $$, fa, toman, icon } = Z;
  SHOP.forEach((it) => (Z.byId[it.id] = it));
  const store = { get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
  Z.store = store;

  // pictures for shop goods: their own photo, or a drawn still life
  const baseSrc = Z.dishSrc;
  Z.dishSrc = (it, kind = 'r') => (it.cat === 'shop' ? (it.photo ? Z.photo(it.photo, 'h') : null) : baseSrc(it, kind));

  /* ---------- day (with a preview switch for Mondays) ---------- */
  Z.demoMonday = store.get('zf-demo-all', false);
  // preview switch: every plan behaves as if today were its day
  Z.dow = () => new Date().getDay();
  Z.planToday = (p) => Z.demoMonday || p.days.includes(Z.dow());
  Z.setDemoMonday = (on) => { Z.demoMonday = on; store.set('zf-demo-all', on); Z.emit('deals'); };
  Z.emit = (name) => document.dispatchEvent(new CustomEvent(name));
  const ORD = ['', 'اول', 'دوم', 'سوم', 'چهارم', 'پنجم', 'ششم', 'هفتم', 'هشتم', 'نهم', 'دهم'];
  Z.ord = (n) => ORD[n] || fa(n);

  /* ---------- the member ---------- */
  const SAMPLE = { salute: 'خانم', title: 'مریم خانم', seat: 'میز ۱۲ · کنار پنجره', spice: 'ملایم', relation: 'آشنای مدیر', visits: [['۲۲ مهر', 4, 3480000], ['۸ مهر', 2, 1960000], ['۱۷ شهریور', 6, 5210000]], birthday: '۱۲ آبان', name: 'مریم', handle: '@maryam', phone: '۰۹۱۲ ••• ۴۵۶۷', level: 'gold', points: 8460, groups: ['ladies'], since: '۱۴۰۲',
    credit: { limit: 20000000, balance: 3560000, due: '۳۰ آبان' }, allergy: 'بادام‌زمینی',
    usual: [['koobideh', 2], ['doogh', 2], ['shirazi', 1]],
    offers: [{ i: 'cake', t: 'هفته‌ی تولد شما', d: 'دسر تولد مهمان ما؛ از ۹ تا ۱۵ آبان', tag: 'سورپرایز' }, { i: 'chef', t: 'خوش‌آمد سرآشپز', d: 'پیش‌غذای فصل، در دیدار بعدی شما', tag: 'هدیه' }, { i: 'music', t: 'دعوت به شب موسیقی', d: 'دو صندلی ردیف اول، پیش از اعلام عمومی', tag: 'دعوت‌نامه' }] };
  Z.member = store.get('zf-member', null);
  Z.signIn = (m) => { Z.member = m; store.set('zf-member', m); Z.emit('member'); Z.emit('deals'); };
  Z.signOut = () => { Z.member = null; store.set('zf-member', null); Z.emit('member'); Z.emit('deals'); };
  Z.sampleMember = () => JSON.parse(JSON.stringify(SAMPLE));
  Z.newMember = (name, phone) => ({ name, title: name, handle: '', phone, level: 'bronze', points: 50, groups: [], since: '۱۴۰۵', credit: null, allergy: '', seat: '', spice: 'ملایم', relation: '', visits: [], birthday: '', usual: [], offers: [{ i: 'gift', t: 'هدیه‌ی خوش‌آمد', d: 'چای زعفرانی مهمان ما، در همین دیدار', tag: 'هدیه' }] });
  Z.addPoints = (n) => { if (!Z.member || n <= 0) return; Z.member.points += n; store.set('zf-member', Z.member); Z.emit('member'); };

  /* ---------- deals ---------- */
  // the best single plan for one dish (plans never stack)
  Z.dealFor = (it, line) => {
    if (!it || (line && line.noDeal)) return null;
    const d = Z.dow(); let best = null;
    for (const p of PLANS) {
      if (!Z.planToday(p) || !p.on(it) || Z.hidesPlan(p)) continue;
      const locked = !(p.who === 'all' || (Z.member && Z.member.groups.includes(p.who)));
      const c = { plan: p, pct: p.pct, locked };
      if (!best || (best.locked && !c.locked) || (best.locked === c.locked && c.pct > best.pct)) best = c;
    }
    return best;
  };
  // the ladies' Wednesdays follow the guest's salutation, chosen once at sign-up; a gentleman never sees them
  Z.hidesPlan = (p) => p.who === 'ladies' && !!Z.member && Z.member.salute === 'آقا';
  Z.activePlans = () => PLANS.filter((p) => Z.planToday(p) && !Z.hidesPlan(p));
  Z.priceInner = (it) => {
    if (Z.isOut(it)) return `<span class="was">${toman(it.price)}</span><em class="out-tag">تمام شد</em>`;
    const d = Z.dealFor(it);
    if (d && !d.locked) return `<span class="was">${toman(it.price)}</span>${toman(it.price * (1 - d.pct / 100))}<small>تومان</small><em class="deal-tag" style="--dc:${d.plan.color};--di:${d.plan.ink}">${fa(d.pct)}٪</em>`;
    if (d) return `${toman(it.price)}<small>تومان</small><em class="deal-tag lock" style="--dc:${d.plan.color}">${fa(d.pct)}٪ ${d.plan.short}</em>`;
    return `${toman(it.price)}<small>تومان</small>`;
  };
  Z.priceEl = (it, cls = 'price num') => `<span class="${cls}" data-price-of="${it.id}">${Z.priceInner(it)}</span>`;
  Z.setPrice = (el, it) => { if (!el) return; el.dataset.priceOf = it.id; el.innerHTML = Z.priceInner(it); };
  Z.refreshPrices = () => $$('[data-price-of]').forEach((el) => { const it = Z.byId[el.dataset.priceOf]; if (it) el.innerHTML = Z.priceInner(it); });

  /* ---------- the bill: items → plan discount → VAT 10% → tip ---------- */
  Z.VAT = 10;
  Z.bill = (lines, tipPct = 0) => {
    let sub = 0, disc = 0, locked = 0; const used = new Map();
    lines.forEach((l) => {
      const it = Z.byId[l.id], amt = l.unit * l.qty; sub += amt;
      const d = Z.dealFor(it, l); if (!d) return;
      const off = Math.round((amt * d.pct) / 100);
      if (d.locked) locked += off; else { disc += off; used.set(d.plan.id, (used.get(d.plan.id) || 0) + off); }
    });
    const net = sub - disc, vat = Math.round((net * Z.VAT) / 100), tip = Math.round((net * tipPct) / 100);
    return { sub, disc, used, locked, net, vat, tip, total: net + vat + tip };
  };
  Z.lineNet = (l) => { const d = Z.dealFor(Z.byId[l.id], l); const amt = l.unit * l.qty; return d && !d.locked ? amt * (1 - d.pct / 100) : amt; };
  Z.planById = Object.fromEntries(PLANS.map((p) => [p.id, p]));

  /* ---------- live stock ---------- */
  Z.OUT = new Set(['shishlik', 'cheesecake']);
  Z.isOut = (it) => !!it && Z.OUT.has(it.id);
  Z.applyStock = () => {
    $$('[data-quick]').forEach((b) => {
      const out = Z.OUT.has(b.dataset.quick);
      b.classList.toggle('off', out);
      const host = b.closest('.card, .zz-item, .mz, .hcard, .fl, .bowl-item, .fav, .tea, .shop-item');
      host && host.classList.toggle('is-out', out);
    });
    Z.refreshPrices();
  };
  Z.markOut = (id) => { Z.OUT.add(id); Z.applyStock(); Z.emit('stock'); };

  /* ---------- live order rounds ----------
     sent → waiting for the waiter (first QR round) → accepted → cooking → ready → served.
     The server will push these; here a timeline plays them at demo speed. */
  const STEPS = [
    ['sent', 'سفارش رسید', 'منتظر تأیید گارسون'],
    ['ok', 'گارسون تأیید کرد', 'سارا سفارش را برای آشپزخانه فرستاد'],
    ['cook', 'در حال آماده‌سازی', ''],
    ['ready', 'آماده است', 'در راه میز شما'],
    ['served', 'سر میز رسید', 'نوش جان'],
  ];
  Z.STEPS = STEPS;
  Z.rounds = [];
  const STATION = { kebab: 'ایستگاه کباب', stew: 'آشپزخانه‌ی گرم', polo: 'آشپزخانه‌ی گرم', starter: 'سالاد و مخلفات', pizza: 'تنور', burger: 'گریل', pasta: 'آشپزخانه‌ی گرم', sandwich: 'گریل', salad: 'سالاد و مخلفات', cold: 'بار', hot: 'بار', dessert: 'بار', shop: 'صندوق' };
  Z.stationOf = (it) => STATION[it.cat] || 'آشپزخانه';
  Z.sendRound = (lines) => {
    const n = Z.rounds.length + 1;
    const g = Z.presence && Z.presence() ? { name: Z.member.title || Z.member.name, level: Z.member.level, allergy: Z.member.allergy || '', spice: Z.member.spice || '' } : null;
    const r = { n, at: Date.now(), step: 0, lines, guest: g, table: Z.table, needsOk: n === 1, stations: [...new Set(lines.map((l) => Z.stationOf(Z.byId[l.id])))] };
    Z.rounds.push(r);
    const cook = Math.max(...lines.map((l) => Z.byId[l.id].time || 5));
    // demo pacing: seconds instead of minutes
    const plan = r.needsOk ? [6, 10, 14 + cook, 22 + cook] : [1, 4, 8 + cook, 16 + cook];
    plan.forEach((s, i) => setTimeout(() => { r.step = i + 1; Z.emit('rounds'); if (i + 1 === 1) Z.toast(`دور ${Z.ord(n)} تأیید شد`, 'check'); if (i + 1 === 3) Z.toast(`دور ${Z.ord(n)} آماده است`, 'bell'); }, s * 1000));
    Z.emit('rounds');
    return r;
  };
  Z.etaMin = () => { const r = Z.rounds[Z.rounds.length - 1]; if (!r) return 0; return Math.max(1, Math.round(Math.max(...r.lines.map((l) => Z.byId[l.id].time || 5)) - (Date.now() - r.at) / 60000)); };

  /* ---------- offline: the restaurant server keeps the menu up ---------- */
  const net = () => { const off = !navigator.onLine; document.body.classList.toggle('offline', off); const b = $('#netBar'); if (b) b.hidden = !off; };
  addEventListener('online', net); addEventListener('offline', net);
  document.addEventListener('DOMContentLoaded', net); setTimeout(net, 0);
})();
