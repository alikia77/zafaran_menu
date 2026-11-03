/* ============================================================
   Entry: photo behind a dark veil, saffron threads drifting,
   the crocus mark draws itself, the name rises letter by letter.
   Enter → the veil lifts and the home hero takes over.
   ============================================================ */
(() => {
  const { $, fa } = Z;
  const el = $('#splash');
  document.body.classList.add('locked');
  $('#splashTable').textContent = fa(Z.table);
  const hr = new Date().getHours();
  $('#splashHello').textContent = hr < 5 ? 'شب بخیر' : hr < 11 ? 'صبح بخیر' : hr < 16 ? 'ظهر بخیر' : hr < 20 ? 'عصر بخیر' : 'شب بخیر';
  const bgSrc = Z.photo('splash', 'h');
  const bg = $('#splashBg');
  // the blurred preview shows at once; the full photo fades in over it
  bg.style.backgroundImage = `url(${Z.lq('splash', 'h')})`; bg.style.opacity = 0.9;
  if (bgSrc) { const im = new Image(); im.fetchPriority = 'high'; im.decoding = 'async'; im.onload = () => { bg.style.backgroundImage = `url(${bgSrc})`; if (Z.hasGsap) gsap.fromTo(bg, { opacity: 0.6 }, { opacity: 1, scale: 1.02, duration: 1.8, ease: 'power2.out' }); else bg.style.opacity = 1; }; im.src = bgSrc; }

  /* saffron threads & gold dust */
  const cv = $('#splashFx'), ctx = cv.getContext('2d');
  let W, H, dpr = Math.min(2, devicePixelRatio || 1), parts = [], alive = true, last = performance.now();
  const size = () => { W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; };
  size(); addEventListener('resize', size);
  for (let i = 0; i < 28; i++) parts.push({ x: Math.random(), y: Math.random(), z: 0.3 + Math.random() * 0.9, a: Math.random() * 6.28, s: Math.random(), thread: Math.random() < 0.3 });
  function frame(t) {
    if (!alive) return;
    const dt = Math.min(0.05, (t - last) / 1000); last = t;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    for (const p of parts) {
      p.y -= dt * 0.012 * p.z; p.x += Math.sin(t / 2400 + p.a) * dt * 0.004; p.a += dt * 0.3 * (p.s - 0.5);
      if (p.y < -0.05) { p.y = 1.05; p.x = Math.random(); }
      const x = p.x * W, y = p.y * H, fade = Math.min(1, p.y * 3, (1 - p.y) * 3);
      if (p.thread) { ctx.save(); ctx.translate(x, y); ctx.rotate(p.a); ctx.strokeStyle = `rgba(214,72,28,${0.55 * fade})`; ctx.lineWidth = 1.4 * p.z; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-7 * p.z, 0); ctx.quadraticCurveTo(0, -3 * p.z, 8 * p.z, 1); ctx.stroke(); ctx.restore(); }
      else { ctx.fillStyle = `rgba(236,210,154,${0.5 * fade * p.z})`; ctx.beginPath(); ctx.arc(x, y, 1.1 * p.z, 0, 6.28); ctx.fill(); }
    }
    requestAnimationFrame(frame);
  }
  if (!Z.reduce) requestAnimationFrame(frame);

  /* intro */
  if (Z.hasGsap) {
    const tl = gsap.timeline({ delay: 0.15 });
    tl.to('.splash .mark path', { strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut', stagger: 0.12 });
    // the name is one joined Persian word: animate it whole (splitting would break the letter joins and the gold clip)
    tl.fromTo('#splashWord', { y: 34, opacity: 0, scale: 0.96 }, { y: 0, opacity: 1, scale: 1, duration: 1.4, ease: 'expo.out' }, 0.45);
    tl.from('#splashTag', { y: 14, opacity: 0, duration: 0.9, ease: 'power3.out' }, 0.85)
      .from('.sp-top > *', { y: -12, opacity: 0, duration: 0.8, ease: 'power3.out', stagger: 0.08 }, 0.9)
      .fromTo('#splashHello', { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }, 1.3)
      .fromTo('#enterBtn', { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, ease: 'expo.out', clearProps: 'transform' }, 1.08)
      .from('#enterBtn .en-a', { x: 18, opacity: 0, duration: 0.9, ease: 'expo.out' }, 1.35)
      .from('#splashHint', { opacity: 0, duration: 1 }, 1.4);
  }

  function enter() {
    if (el.dataset.gone) return; el.dataset.gone = 1; Z.haptic(10);
    const fin = () => { alive = false; el.hidden = true; document.body.classList.remove('locked'); };
    document.dispatchEvent(new CustomEvent('entered'));
    if (!Z.hasGsap) return fin();
    const tl = gsap.timeline({ onComplete: fin });
    tl.to('.splash .inner, .sp-foot, .sp-top', { y: -40, opacity: 0, duration: 0.6, ease: 'power3.in', stagger: 0.04 })
      .to(bg, { scale: 1.25, duration: 1.1, ease: 'power2.inOut' }, 0)
      .to(el, { clipPath: 'inset(0 0 100% 0 round 0 0 40px 40px)', duration: 0.95, ease: 'expo.inOut' }, 0.25);
  }
  $('#enterBtn').addEventListener('click', enter);
})();
