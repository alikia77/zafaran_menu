/* ============================================================
   Home: photographs that arrive softly (blurred preview → sharp,
   never a pixelated jump) and sections that reveal themselves
   as you scroll: titles rise out of a mask, a gold hairline draws
   beneath them, cards open like curtains while their photo
   settles from a slight zoom.
   ============================================================ */
(() => {
  const { $, $$ } = Z;
  const home = $('#home');

  /* ---------- soft image arrival ---------- */
  function soften(root) {
    $$('img', root).forEach((img) => {
      if (img.dataset.lz || img.closest('#heroSlides')) return;
      img.dataset.lz = 1;
      const done = () => { img.classList.add('in'); setTimeout(() => (img.style.backgroundImage = ''), 900); };
      if (img.complete && img.naturalWidth) { img.classList.add('in', 'now'); return; }
      img.classList.add('lz');
      img.addEventListener('load', done, { once: true });
      img.addEventListener('error', () => img.classList.add('in'), { once: true });
    });
  }
  soften(home);
  // cards that are rendered later (loved tabs, offers, atelier) get the same treatment
  new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => n.nodeType === 1 && soften(n)))).observe(home, { childList: true, subtree: true });

  // images just below the fold start downloading early, so they're ready when scrolled to
  const near = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.loading = 'eager'; near.unobserve(e.target); } }), { rootMargin: '900px 0px' });
  const watchLazy = () => $$('img[loading="lazy"]', home).forEach((i) => near.observe(i));

  /* ---------- scroll reveals ---------- */
  function reveal() {
    if (!Z.hasGsap || !window.ScrollTrigger || Z.reduce) return;
    const ST = (trigger, start = 'top 88%') => ({ trigger, start, once: true });
    // section titles: words rise from behind a mask, then a gold hairline draws in
    $$('.sheet-home .sec-h h3, .sheet-home .st-head h3', home).forEach((h) => {
      h.classList.add('rv-title');
      let words = [h];
      if (window.SplitText) words = new SplitText(h, { type: 'words', wordsClass: 'rv-w' }).words;
      gsap.timeline({ scrollTrigger: ST(h, 'top 92%') })
        .from(words, { yPercent: 110, opacity: 0, rotate: 3, duration: 1.1, ease: 'expo.out', stagger: 0.06 })
        .fromTo(h, { '--rule': 0 }, { '--rule': 1, duration: 1.2, ease: 'expo.inOut' }, 0.15);
    });
    $$('.sheet-home .lead, .sheet-home .sec-link, .loved-tabs', home).forEach((el) => gsap.from(el, { y: 16, opacity: 0, duration: 1, ease: 'expo.out', scrollTrigger: ST(el, 'top 94%') }));
    // curtain cards: clip opens upward, the photo settles from a gentle zoom
    const curtain = (cards, trigger, opts = {}) => {
      if (!cards.length) return;
      const imgs = cards.map((c) => c.querySelector('img')).filter(Boolean);
      const tl = gsap.timeline({ scrollTrigger: ST(trigger, opts.start || 'top 86%') });
      tl.fromTo(cards, { clipPath: 'inset(100% 0% 0% 0% round 24px)', y: 30 }, { clipPath: 'inset(0% 0% 0% 0% round 24px)', y: 0, duration: 1.25, ease: 'expo.out', stagger: opts.stagger || 0.08, clearProps: 'clipPath' }, 0);
      if (imgs.length) tl.fromTo(imgs, { scale: 1.18 }, { scale: 1, duration: 1.8, ease: 'expo.out', stagger: opts.stagger || 0.08, clearProps: 'scale' }, 0);
      const txt = cards.flatMap((c) => [...c.querySelectorAll('.t, h4, h3, .nm, .pr, .si-tx > *, .of-tx > *')]);
      if (txt.length) tl.from(txt, { y: 14, opacity: 0, duration: 0.9, ease: 'expo.out', stagger: 0.02 }, 0.35);
    };
    curtain($$('#chTiles .ch-tile', home), '#chTiles', { stagger: { each: 0.07, grid: 'auto', from: 'start' } });
    const rails = () => { curtain($$('#homeRail .card', home).slice(0, 3), '#homeRail', { stagger: 0.09 }); curtain($$('#offers .offer-card', home).slice(0, 2), '#offers', { stagger: 0.1 }); };
    rails();
    curtain($$('#tonight', home), '#tonight');
    curtain($$('.flip', home), '.flip', { start: 'top 84%' });
    curtain($$('#atelier .at-hero', home), '#atelier .at-hero');
    curtain($$('#shop .shop-item', home), '#shop', { stagger: { each: 0.08, grid: 'auto' } });
    // the footer wordmark writes itself in
    const fw = $('.sheet-home .foot .w', home); if (fw) gsap.from(fw, { opacity: 0, letterSpacing: '0.4em', duration: 1.6, ease: 'expo.out', scrollTrigger: ST(fw, 'top 96%') });
  }

  document.addEventListener('entered', () => { soften(home); watchLazy(); requestAnimationFrame(() => setTimeout(reveal, 60)); }, { once: true });
})();
