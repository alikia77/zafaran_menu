# Zafaran (زعفران) — luxury QR menu · project memory for Claude

Read this file first. It is the complete hand-off of a long design/build collaboration:
the goal, how the owner wants to work, every design rule learned the hard way, the
architecture, the asset pipeline, what is done, and what is next.

---

## 1. What this is

A **mobile-first, Persian (RTL) QR-code menu** for a high-end restaurant that serves Iranian food,
fast food (pizza, burgers, pasta, sandwiches) and drinks. Guests scan the QR on their table and get:
an entry splash → a home page → a cinematic chapter-by-chapter menu → dish detail with add-ons →
cart/rounds/bill split → table services (call waiter, extras) → a members' circle (محفل).

- **«زعفران» is a temporary brand name.** Logo, final brand colours, real dish list and prices are still open.
- It is being built **for a client (کارفرما)** who reviews it from a public link.
- Single static page today; everything server-side is simulated in the front end and kept
  behind small functions so a real backend (waiter app, cash desk, kitchen) can plug in later.

### Live links
- GitHub repo (built site on `main`, served by GitHub Pages): https://github.com/alikia77/zafaran_menu
  → https://alikia77.github.io/zafaran_menu/  (Pages: Settings → Pages → Deploy from branch `main` / root)
- Claude artifact preview (same build): https://claude.ai/artifact/PFMcSFs8833sE36Uv4mWhu

---

## 2. How the owner wants to work (follow these)

- **Language:** reply in **Persian, casual, short and simple**. He has no patience for long write-ups.
  Say what changed in a few bullets; no recaps of process.
- **Autonomy:** fetch/install what you need from GitHub yourself, without asking (npm/PyPI may be blocked
  in some sandboxes; GitHub releases usually work).
- **Taste bar:** must feel like a **top international luxury brand** — minimal, elegant, Apple-style
  liquid glass, warm gold accents on near-black. **Never childish, cartoonish or 2D-clip-art.**
  Real photography for food, ingredients and drinks.
- **Design skills to apply:** ui-ux-pro-max, design-taste-frontend (Taste Skill), impeccable, apple-design,
  emil-design-eng, animate, motion-framer, gsap-scrolltrigger, review-animations/animation-performance,
  mobile-native.
- He **generates food images himself** with Nano Banana / ChatGPT and drops them in
  `C:\Users\mohammadamin\Downloads\غذا\` (sub-folders `جدید`, `لیوان خالی`). You cut them out and place them.
  When you need a new image (e.g. an empty glass), **give him a precise prompt** instead of faking it.
- He tests on a **real phone** — things that look fine in desktop Chrome can break there (GPU, spacing).
  Always test at 360/390/412/430 px widths.
- Keep animations rich (he loves them) but **zero lag**: no waiting, no late pops, no blur jumps.
- Ask before big irreversible changes; otherwise just do it and report briefly.

---

## 3. Hard-won design & engineering rules

**Visual**
- Dark ground (`#0b0a09`-ish), ivory sheet on home, champagne gold (`#e6cc8e` / `#cfb37a` / `#b8914a`).
- Glass: `.lg` elements via `Z.glass(el)`; pills/buttons use backdrop blur + 0.5px light hairline.
- Spacing must be symmetric: icon buttons in a bar share the pill's height and centre line (46px);
  a pill with a round icon keeps ~equal visual inset on both ends.
- Dishes are **true cut-outs** (no circular frames) with a soft shadow layer; cards are low glass.
- Text never touches edges; Persian copy is short, warm and respectful (e.g. «سر میز ۷، مهمان آشنای ما هستید»).
- The staff view of a guest (allergy, level, notes…) is **never shown to the guest**.
- «باشگاه بانو» (ladies' Wednesdays) follows the **salutation** chosen at sign-up
  (خانم / آقا / فقط با نام). A member who chose «آقا» never sees anything about it.

**Performance / bugs to never reintroduce**
- **No CSS/GSAP `filter` animations** (blur/brightness) on photos — on some Windows/Android GPUs they posterise
  images (yellow speckled stews). Animate only transform + opacity. Avoid full-screen `mix-blend-mode` layers.
- **Use `gsap.fromTo(... clearProps)`, not `gsap.from`**, for entrance tweens that can run twice — `from` can
  get stuck at the start value (topbar icons were stuck 18px high).
- An element with `backdrop-filter` must **not fade its own opacity** (blur pops in at the end). Reveal it
  with `clip-path`, fade only its children (see hero pill in `06-home.js`).
- Menu and every view except home **always open scrolled to the top** (`history.scrollRestoration='manual'`).
- Images: small cut-out (`p/rs`) shows instantly, sharp one (`p/r`) is decoded off-screen and swapped
  (`Z.setDishImg`); home pre-warms small images after load. Lazy images 1200px before the viewport.
- Libraries are **self-hosted in `lib/`** (cdnjs is unreliable for Iranian users).
- Reduced-motion is respected everywhere.

---

## 4. Code map

```
build.py            assemble dist/ (single index.html + lib/ + p/)
src/head.html       meta, theme colour
src/fonts.css       embedded Persian font (large)
src/style.css       all styles; later "v6…v19" blocks at the bottom override earlier ones
src/body.html       markup + SVG icon sprite (<symbol id="i-…">), sheets, views
src/inline0.js      PHOTOS map (which photo kinds exist), LQIP data URIs, PHOTO_KIND, scrollRestoration
src/painter.js      legacy procedural painter (fallback art), also runs in a worker
src/js/*.js         concatenated in filename order into one script (global namespace Z)
tools/shot.js       Playwright screenshot runner (390×844)
pipeline/           Python image pipeline (cut-outs, headers, glasses, toppings)
```

**Modules (`src/js`)**
| file | role |
|---|---|
| 00-data.js | EXTRAS (add-ons per category), CATEGORIES (12 chapters + layout), ITEMS (~65 dishes, sample prices in Toman), HERO, KITCHEN story, ING map |
| 01-core.js | helpers (`Z.fa`, `Z.toman`, `Z.icon`), glass, photo resolver `Z.photo/dishSrc/lq/ingSrc`, `Z.setDishImg` (progressive), toasts, sheets, `Z.table` (from URL `?t=`) |
| 015-system.js | "server-owned" logic: PLANS (ladies Wed 15% / green Mon 20%), `Z.dealFor`, prices, `Z.bill` (discount → VAT 10% → tip), member store (`Z.member`, `signIn/out`), `Z.hidesPlan`, rounds `Z.sendRound` (simulated kitchen stages, each round carries `guest` + `table`) |
| 02-fx.js | chapter weather canvas (gold dust, embers, steam, saffron, bubbles); `Z.landLight` SVG flourish when a plate lands |
| 03-cart.js | basket, rounds, bill, دنگ (3 split modes), `Z.addToBill` for paid table extras |
| 04-drinks.js | `PhotoDrink`: real photos poured from an **empty-glass ghost** (`p/g`) masked by the glass interior (`p/gm`), stream, froth, fizz, steam; `Z.makeBar` (cold shelf, glasses dissolve full→empty while sliding, pour when resting), `Z.makeTea` (hot drinks pour when seen) |
| 05-splash.js | entry splash, «ورود به منو» |
| 06-home.js / 065-home-reveal.js | hero slides + glass dish pill, loved rail, chapter tiles (`p/t` thumbs), story flip, scroll reveals, soft image arrival |
| 07-menu.js | chapters & layouts: zigzag (kebab/polo), bowls (stews, scroll-scrubbed + SVG steam), mezze, board (pizza), stack (burger carousel), rail (pasta twirl / sandwiches levitating), bar, tea, float (desserts) |
| 08-detail.js | dish detail: flying plate, intro/customise tabs, real ingredient photo chips (`p/i`), burger builder from **photographed layers** (`p/bl`) |
| 09-builder.js / 091-toppings.js | pizza builder: photo chips (`p/tc`), **vector SVG topping pieces** (`Z.topSVG`, seeded, lit) that drop and settle |
| 10-game.js | waiting game |
| 11-shell.js | views/nav, search, drawer, **table service** (requests with stages ثبت شد→دیده شد→در راه→رسید, cancel, pickers for packaging & paid extras; floor staff simulated by timers), booking, status, table page |
| 12-club.js | offers rail, deal sheet, tonight card, atelier shop, survey |
| 13-circle.js | محفل: sign-up (phone → OTP → name, birthday, allergy, salutation), member card + QR overlay, presence/incognito toggle, gifts, prefs, visits, **«نامه‌ای به زعفران»** (letter + wax seal; stored in `localStorage['zf-letters']`), `staffTicket()` (kept for staff app, not rendered), today's-deal popup |

**Data stored in the browser (demo):** `zf-member`, `zf-letters`, favourites, demo switches.
**Integration seams for a backend:** `Z.sendRound`, `Z.addToBill`, table-service `addReq/advance/cancelReq`
(11-shell.js), `Z.signIn` / OTP, `staffTicket(m)`, letters, `Z.OUT` stock, `PLANS`.

---

## 5. Assets (`p/`)

| folder | content |
|---|---|
| r / rs / c | dish cut-outs 760px / 380px / dark card composites |
| h / hs | vertical chapter headers & hero/editorial photos (960×1760) / small |
| t | light chapter-tile thumbnails for home |
| i | real macro photos of ingredients (add-on chips) |
| bl | burger layers sliced from our burger photo (bun, lettuce, tomato, onion, patties) |
| tp / tc | (old) photo topping patches / topping chip photos |
| g / gm | drinks: empty-glass ghost aligned to each drink photo / glass-interior mask |

Photo existence is declared in `src/inline0.js` (`PHOTOS`, `LQIP`); update it when adding images.

---

## 6. Image pipeline (`pipeline/scripts`)

- `matte.py` — ISNet ONNX matte (`isnet-general-use.onnx`, from github.com/danielgatis/rembg releases v0.0.0; ~178 MB).
- `recut2.py` — production cut-outs: round plates get a **RANSAC ellipse rim refined along 720 rays**
  (perfect anti-aliased edge); free shapes use the AI matte + guided filter; colour decontamination.
  Dark plates on light studio backgrounds are segmented by colour. `strips.py` rebuilds the strips tray geometrically.
- `headers.py` — composes vertical chapter headers from cut-outs on dark warm grounds.
- `reg2.py` — registers a real **empty glass** photo onto each drink photo (row-width profile match),
  writes `p/g` (ghost) and `p/gm` (interior mask; cups/saucers stay photographic). `pipeline/empty-glasses/` holds the sources.
- `blayers.py` (burger layers), `tops.py`, `process*.py`, `mattes.py` (batch alpha), `sources.json` / `map.json` (dish → source file).
- Original generated images live on the owner's PC: `Downloads\غذا\` (+ `جدید`, `لیوان خالی`).
- Needs: Python 3, numpy, Pillow, opencv-python, scipy, onnxruntime.

---

## 7. Build, test, deploy

```bash
python3 build.py                     # -> dist/
cd dist && python3 -m http.server 8765
node tools/shot.js "" '[{"click":"#enterBtn","wait":1500,"name":"home"}]'   # needs playwright; writes shots/
```
Deploy: copy `dist/` contents to the root of `alikia77/zafaran_menu` (`main`) and push; Pages serves it.
Keep `.nojekyll`.

---

## 8. Status & next steps

Done (v19): everything in §4, real photos for all 65 dishes, real-pour drinks, vector toppings,
photographed burger builder, table service with live stages, member recognition, ladies perks by salutation,
letters with wax seal, GitHub Pages deploy.

Next (owner's roadmap):
1. **Staff app + cash desk** connected to this menu: see guests by table («میز ۷ محمد است با این ویژگی‌ها»),
   accept/close table requests, receive letters, kitchen rounds. Reuse `staffTicket()` and the seams above.
2. Real backend (orders, OTP SMS, payment gateway, stock).
3. Light theme + desktop/responsive.
4. Real brand name/logo/colours; real dish list & prices.
5. Small leftovers: empty-glass photo for the chocolate shake (currently synthetic), optional extra
   table-service items, decide whether to keep the member QR at all (owner unsure).

Open questions: brand identity, final menu & prices, payment gateway, SMS panel, ladies/green-day details.
