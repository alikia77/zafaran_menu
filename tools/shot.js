const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }); await ctx.addInitScript(() => { try { Object.defineProperty(Navigator.prototype, 'onLine', { get: () => true }); } catch (e) {} }); const p = await ctx.newPage(); const _unused = ({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type()==='error') errs.push(m.text()); });
  await p.goto('http://localhost:8765/' + (process.argv[2]||''), { waitUntil: 'load' });
  await p.waitForTimeout(3500);
  await p.screenshot({ path: 'shots/01-splash.png' });
  const steps = JSON.parse(process.argv[3] || '[]');
  for (const [i, s] of steps.entries()) {
    try { if (s.click) await p.click(s.click, { timeout: 3000 }); if (s.eval) await p.evaluate(s.eval); if (s.scroll) await p.mouse.wheel(0, s.scroll); } catch (e) { errs.push('step '+i+': '+e.message.split('\n')[0]); }
    await p.waitForTimeout(s.wait || 1800);
    await p.screenshot({ path: `shots/${String(i+2).padStart(2,'0')}-${s.name||'s'}.png` });
  }
  console.log('ERRORS:', JSON.stringify(errs.slice(0,15)));
  await b.close();
})();
