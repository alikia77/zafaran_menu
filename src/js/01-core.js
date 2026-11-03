/* ============================================================
   Core: helpers, liquid glass, photo + plate pipeline
   ============================================================ */
const Z = (window.Z = {});
(() => {
  const $ = (Z.$ = (s, r = document) => r.querySelector(s));
  Z.$$ = (s, r = document) => [...r.querySelectorAll(s)];
  const FA = new Intl.NumberFormat('fa-IR');
  Z.fa = (n) => FA.format(n);
  Z.toman = (n) => FA.format(Math.round(n / 1000) * 1000);
  Z.clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  Z.lerp = (a, b, t) => a + (b - a) * t;
  Z.reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  Z.haptic = (ms = 8) => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} };
  Z.icon = (id, cls = 'i') => `<svg class="${cls}" aria-hidden="true"><use href="#i-${id}"/></svg>`;
  Z.byId = Object.fromEntries(ITEMS.map((i) => [i.id, i]));
  Z.catById = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));
  Z.glow = (c, at = '50% 50%', size = '60% 50%', a = 'aa') => `radial-gradient(${size} at ${at}, ${c}${a} 0%, ${c}44 40%, transparent 72%)`;
  Z.hasGsap = typeof gsap !== 'undefined';
  if (Z.hasGsap) {
    const plugins = [window.ScrollTrigger, window.Flip, window.SplitText, window.Draggable, window.InertiaPlugin].filter(Boolean);
    gsap.registerPlugin(...plugins);
    if (Z.reduce) gsap.globalTimeline.timeScale(20);
  }

  /* ---------- liquid glass ----------
     Same three layers as the LiquidGlassCard component: a bend layer (backdrop blur pushed through
     an SVG turbulence displacement), a face layer (outer glow) and an edge layer (inner highlights).
     A specular sheen follows the finger; draggable ones stretch and spring back. */
  Z.glass = (el, opts = {}) => {
    if (el.dataset.lg) return el;
    el.dataset.lg = 1; el.classList.add('lg');
    const body = document.createElement('div'); body.className = 'lg-body';
    while (el.firstChild) body.append(el.firstChild);
    el.insertAdjacentHTML('afterbegin', '<span class="lg-bend"></span><span class="lg-face"></span><span class="lg-edge"></span>');
    el.append(body);
    const edge = el.querySelector('.lg-edge');
    const sheen = (e) => { const r = el.getBoundingClientRect(); edge.style.setProperty('--sx', ((e.clientX - r.left) / r.width) * 100 + '%'); };
    el.addEventListener('pointermove', sheen, { passive: true });
    el.addEventListener('pointerdown', sheen, { passive: true });
    if (opts.drag && Z.hasGsap && window.Draggable && !Z.reduce) {
      Draggable.create(el, { type: 'x,y', edgeResistance: 0.85, bounds: { minX: -26, maxX: 26, minY: -18, maxY: 18 },
        onPress() { gsap.to(el, { scale: 1.03, duration: 0.25, ease: 'power3.out' }); },
        onRelease() { gsap.to(el, { x: 0, y: 0, scale: 1, duration: 0.9, ease: 'elastic.out(1, 0.35)' }); } });
    }
    return el;
  };
  // a slow ambient sheen sweep keeps the glass alive even when nobody touches it
  if (!Z.reduce) {
    let t = 0;
    const tick = () => { t += 0.004; const x = 50 + Math.sin(t) * 40; document.documentElement.style.setProperty('--sheen', x + '%'); requestAnimationFrame(tick); };
  }

  /* ---------- photos ----------
     Real photographs (Unsplash, free licence) live next to the page in p/. Each dish has
     a card crop (p/c/<id>.webp), a round plate cut-out (p/r/<id>.webp) and sometimes a
     hero (p/h/<id>.webp). Dishes without a photo fall back to the drawn plate. */
  const P = window.PHOTOS || {};
  // kinds: r (round plate), rs (small plate), c (card), h (hero), hs (small hero)
  Z.photo = (key, kind = 'r') => { const base = kind[0]; return P[key] && P[key][base] ? `p/${kind}/${key}.webp` : null; };
  const LQ = window.LQIP || {};
  // a 20px blurred preview so nothing is ever an empty box while the real photo streams in
  Z.lq = (key, kind = 'r') => LQ[kind[0] + '/' + key] || '';
  Z.hasPhoto = (key) => !!P[key];

  /* ---------- drawn plates (fallback + builders) in background workers ---------- */
  const urls = new Map(), pending = new Map(), queue = [];
  const workers = [];
  (() => {
    try {
      const src = document.getElementById('painterSrc');
      if (!src || !window.Worker || !window.OffscreenCanvas) return;
      const tail = `\nonmessage = async (e) => { const { key, recipe, size, opts } = e.data; try { const c = new OffscreenCanvas(size, size); Painter.render(c, recipe, opts || {}); let blob; try { blob = await c.convertToBlob({ type: 'image/webp', quality: 0.9 }); } catch (_) { blob = await c.convertToBlob(); } postMessage({ key, blob }); } catch (err) { postMessage({ key, error: String(err) }); } };`;
      const url = URL.createObjectURL(new Blob([src.textContent + tail], { type: 'text/javascript' }));
      const n = Math.min(3, Math.max(1, (navigator.hardwareConcurrency || 2) - 1));
      for (let i = 0; i < n; i++) {
        const w = new Worker(url); w.job = null;
        w.onmessage = (e) => { const job = w.job; w.job = null; if (e.data.error || !e.data.blob) { queue.unshift(job); workers.length = 0; pump(); return; } done(job, URL.createObjectURL(e.data.blob)); pump(); };
        w.onerror = () => { if (w.job) queue.unshift(w.job); w.job = null; workers.length = 0; pump(); };
        workers.push(w);
      }
    } catch (e) { workers.length = 0; }
  })();
  let busy = false;
  const scratch = document.createElement('canvas');
  function done(job, u) { urls.set(job.key, u); pending.delete(job.key); job.resolve(u); }
  function pump() {
    if (workers.length) { for (const w of workers) { if (w.job || !queue.length) continue; const job = queue.shift(); w.job = job; w.postMessage({ key: job.key, recipe: job.recipe, size: job.size, opts: job.opts }); } return; }
    if (busy || !queue.length) return;
    busy = true; const job = queue.shift();
    scratch.width = scratch.height = job.size; Painter.render(scratch, job.recipe, job.opts || {});
    const fin = (u) => { done(job, u); busy = false; setTimeout(pump, 10); };
    try { scratch.toBlob((b) => fin(b ? URL.createObjectURL(b) : scratch.toDataURL()), 'image/webp', 0.9); } catch (e) { fin(scratch.toDataURL()); }
  }
  Z.drawn = (recipe, size = 720, opts = null, urgent = false) => {
    const key = recipe + '@' + size + (opts ? JSON.stringify(opts) : '');
    if (urls.has(key)) return Promise.resolve(urls.get(key));
    if (pending.has(key)) return pending.get(key);
    let resolve; const p = new Promise((r) => (resolve = r));
    pending.set(key, p);
    const job = { recipe, size, key, resolve, opts };
    urgent ? queue.unshift(job) : queue.push(job);
    pump();
    return p;
  };

  // one place that decides what picture a dish gets
  // real macro photographs of ingredients (p/i)
  const ING_PH = new Set(['almond', 'barberry', 'bread', 'butter', 'cheese', 'chicken', 'cinnamon', 'coffee', 'crouton', 'dough', 'fries', 'glass', 'herb', 'ice', 'icecream', 'jalapeno', 'kashk', 'lettuce', 'lime', 'meat', 'milk', 'mint', 'mushroom', 'nabat', 'olive', 'onion', 'onion-fried', 'parmesan', 'patty', 'pepper', 'pepper-black', 'pickle', 'pistachio', 'rice', 'rose', 'saffron', 'sauce', 'skewer', 'sugar', 'sumac', 'tahdig', 'tomato', 'walnut']);
  Z.ingSrc = (k) => `p/i/${ING_PH.has(k) ? k : 'sauce'}.webp`;
  Z.dishSrc = (it, kind = 'r') => Z.photo(it.photo || it.id, kind);
  const upgradeIO = 'IntersectionObserver' in window ? new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return; const img = e.target, want = img.dataset.want; upgradeIO.unobserve(img);
    if (!want || img.src.endsWith(want)) return;
    const big = new Image(); big.decoding = 'async'; big.src = want;
    (big.decode ? big.decode() : Promise.resolve()).then(() => { if (img.dataset.want === want) img.src = want; }, () => {});
  }), { rootMargin: '1200px 0px' }) : null;
  Z.setDishImg = (img, it, kind = 'r', urgent = false) => {
    const src = Z.dishSrc(it, kind);
    img.alt = it.name;
    const show = () => img.classList.add('ready');
    // the detail view: show the small cut-out (usually already cached from the list) at once,
    // then swap in the large one as soon as it has decoded — never an empty plate
    if (src && urgent && kind === 'r') {
      const small = Z.dishSrc(it, 'rs'); img.dataset.want = src; img.style.backgroundImage = '';
      const big = new Image(); big.decoding = 'async'; big.src = src;
      const swap = () => { if (img.dataset.want === src) { img.src = src; show(); } };
      if (big.complete) { img.src = src; show(); return img; }
      if (small) { img.src = small; show(); }
      (big.decode ? big.decode() : new Promise((r, j) => { big.onload = r; big.onerror = j; })).then(swap, () => { if (!small) { img.src = src; show(); } });
      return img;
    }
    // lists: the small cut-out (pre-warmed from the home page) shows at once; the sharp one
    // is fetched and decoded off-screen when the dish nears the viewport, then swapped in
    const small = kind === 'r' ? Z.dishSrc(it, 'rs') : null;
    if (src && small && !urgent && 'IntersectionObserver' in window) {
      img.decoding = 'async'; img.loading = 'eager'; img.dataset.want = src; img.src = small;
      img.complete ? show() : img.addEventListener('load', show, { once: true });
      upgradeIO.observe(img);
      return img;
    }
    if (src) { const lq = Z.lq(it.photo || it.id, kind); if (lq && !img.complete) img.style.backgroundImage = `url(${lq})`; img.loading = urgent ? 'eager' : 'lazy'; img.decoding = 'async'; img.onerror = () => { if (img.dataset.retry) return; img.dataset.retry = 1; setTimeout(() => (img.src = src + '?r=1'), 700); }; img.src = src; img.complete ? show() : img.addEventListener('load', () => { show(); img.style.backgroundImage = ''; }, { once: true }); }
    else Z.drawn(it.recipe || it.id, 720, null, urgent).then((u) => { img.src = u; img.addEventListener('load', show, { once: true }); });
    return img;
  };

  /* ---------- small UI services ---------- */
  let toastT = 0;
  Z.toast = (msg, icon = 'check') => {
    const t = $('#toast');
    t.querySelector('.lg-body').innerHTML = Z.icon(icon) + '<span></span>';
    t.querySelector('.lg-body span').textContent = msg;
    t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2300);
  };
  // fly an image (plate) into a target (the bag)
  Z.flyTo = (fromEl, toEl, src) => {
    if (!fromEl || Z.reduce) return Promise.resolve();
    const a = fromEl.getBoundingClientRect(), b = toEl.getBoundingClientRect();
    if (!a.width) return Promise.resolve();
    const f = document.createElement('div'); f.className = 'flyer';
    const size = Math.min(a.width, a.height);
    f.style.cssText = `left:${a.left + (a.width - size) / 2}px;top:${a.top + (a.height - size) / 2}px;width:${size}px;height:${size}px`;
    f.innerHTML = `<img src="${src || fromEl.currentSrc || fromEl.src}" alt="">`;
    document.body.append(f);
    const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
    const s = 30 / size;
    return new Promise((res) => {
      const anim = f.animate([
        { transform: 'translate(0,0) scale(1) rotate(0deg)', opacity: 1 },
        { transform: `translate(${dx * 0.42}px, ${Math.min(dy * 0.3, -40) - 110}px) scale(0.5) rotate(160deg)`, opacity: 1, offset: 0.45 },
        { transform: `translate(${dx}px, ${dy}px) scale(${s}) rotate(340deg)`, opacity: 0.9 },
      ], { duration: 760, easing: 'cubic-bezier(0.45, 0, 0.2, 1)' });
      anim.onfinish = () => { f.remove(); res(); };
    });
  };

  /* ---------- sheets (bottom), with drag-to-dismiss ---------- */
  Z.openSheet = (el) => {
    el.hidden = false;
    const body = el.querySelector('.body'), scrim = el.querySelector('.scrim');
    document.body.style.overflow = 'hidden';
    if (Z.hasGsap) { gsap.fromTo(scrim, { opacity: 0 }, { opacity: 1, duration: 0.3 }); gsap.fromTo(body, { yPercent: 100 }, { yPercent: 0, duration: 0.55, ease: 'expo.out' }); }
    else { scrim.style.opacity = 1; body.style.transform = 'none'; }
    Z.haptic(6);
  };
  Z.closeSheet = (el) => {
    if (el.hidden) return;
    const body = el.querySelector('.body'), scrim = el.querySelector('.scrim');
    const fin = () => { el.hidden = true; if (!document.querySelector('.detail:not([hidden]), .builder:not([hidden]), .sheet:not([hidden]), .game:not([hidden])')) document.body.style.overflow = ''; };
    if (Z.hasGsap) { gsap.to(scrim, { opacity: 0, duration: 0.25 }); gsap.to(body, { yPercent: 100, duration: 0.36, ease: 'power3.in', onComplete: fin }); }
    else fin();
  };
  Z.wireSheet = (el) => {
    el.addEventListener('click', (e) => { if (e.target.matches('.scrim')) Z.closeSheet(el); });
    const body = el.querySelector('.body'); let st = null;
    body.addEventListener('pointerdown', (e) => { if (body.scrollTop > 2 || e.target.closest('button, input, select, a, .who, code')) return; st = { y: e.clientY, t: performance.now(), dy: 0 }; });
    body.addEventListener('pointermove', (e) => { if (!st) return; st.dy = Math.max(0, e.clientY - st.y); if (st.dy > 4) body.style.transform = `translateY(${st.dy}px)`; });
    const up = () => { if (!st) return; const v = st.dy / (performance.now() - st.t); if (st.dy > 120 || v > 0.6) Z.closeSheet(el); else if (Z.hasGsap) gsap.to(body, { y: 0, yPercent: 0, duration: 0.5, ease: 'elastic.out(1,0.6)', clearProps: 'transform' }); else body.style.transform = ''; st = null; };
    body.addEventListener('pointerup', up); body.addEventListener('pointercancel', up);
  };

  /* ---------- favourites ---------- */
  Z.favs = new Set();
  try { (JSON.parse(localStorage.getItem('zf-favs') || '[]')).forEach((x) => Z.favs.add(x)); } catch (e) {}
  Z.toggleFav = (id) => {
    Z.favs.has(id) ? Z.favs.delete(id) : Z.favs.add(id);
    try { localStorage.setItem('zf-favs', JSON.stringify([...Z.favs])); } catch (e) {}
    document.dispatchEvent(new CustomEvent('favs'));
    return Z.favs.has(id);
  };

  /* ---------- table from the QR code (#t7 …) ---------- */
  const m = (location.hash || '').match(/t(\d{1,3})/);
  Z.table = m ? +m[1] : 7;
})();
