/* ============================================================
   Topping pieces, drawn as vector art — each one a little
   different (seeded), lit from the top-left like the pizza photo,
   with its own soft contact shadow. Returned as SVG data URLs so
   they stay razor-sharp at any size and cost nothing to decode.
   ============================================================ */
(() => {
  const rng = (s) => () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  const f = (n) => n.toFixed(1);
  // a closed, gently irregular blob around (cx, cy)
  function blob(R, cx, cy, r, n = 14, jit = 0.08, sx = 1, sy = 1) {
    const pts = [];
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, rr = r * (1 + (R() * 2 - 1) * jit); pts.push([cx + Math.cos(a) * rr * sx, cy + Math.sin(a) * rr * sy]); }
    let d = `M${f((pts[0][0] + pts[n - 1][0]) / 2)} ${f((pts[0][1] + pts[n - 1][1]) / 2)}`;
    for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n]; d += ` Q${f(p[0])} ${f(p[1])} ${f((p[0] + q[0]) / 2)} ${f((p[1] + q[1]) / 2)}`; }
    return d + 'Z';
  }
  const shadow = (id, rx = 40, ry = 40, cx = 52, cy = 55, a = 0.45) => `<radialGradient id="${id}s"><stop offset=".55" stop-color="#2a0f04" stop-opacity="${a}"/><stop offset="1" stop-color="#2a0f04" stop-opacity="0"/></radialGradient><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#${id}s)"/>`;
  // fine organic grain, clipped to a shape — gives meat, mushroom and cured slices a real surface
  const grain = (id, d, a = 0.22, fq = 1.1, col = '#000') => `<filter id="${id}n" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="${fq}" numOctaves="2" seed="${(id.length * 7) % 97}"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 ${a * 3} -${a}"/></filter><clipPath id="${id}q"><path d="${d}"/></clipPath><g clip-path="url(#${id}q)"><rect width="100" height="100" filter="url(#${id}n)" fill="${col}"/></g>`;
  const gloss = (cx, cy, rx, ry, a = 0.35, rot = -30) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" transform="rotate(${rot} ${cx} ${cy})" fill="#fff" opacity="${a}"/>`;

  const ART = {
    pepperoni(R, id) {
      const edge = blob(R, 50, 50, 41, 18, 0.05);
      let specks = '';
      for (let i = 0; i < 16; i++) { const a = R() * 6.28, d = R() * 30; specks += `<ellipse cx="${f(50 + Math.cos(a) * d)}" cy="${f(50 + Math.sin(a) * d)}" rx="${f(1.4 + R() * 2.4)}" ry="${f(1 + R() * 1.6)}" fill="#f3b48e" opacity="${f(0.35 + R() * 0.35)}" transform="rotate(${f(R() * 180)} 50 50)"/>`; }
      for (let i = 0; i < 5; i++) { const a = R() * 6.28, d = 30 + R() * 8; specks += `<circle cx="${f(50 + Math.cos(a) * d)}" cy="${f(50 + Math.sin(a) * d)}" r="${f(1.5 + R() * 2.5)}" fill="#3d0d05" opacity=".45"/>`; }
      return `<defs><radialGradient id="${id}g" cx=".42" cy=".38" r=".7"><stop offset="0" stop-color="#c8401f"/><stop offset=".55" stop-color="#a42a14"/><stop offset=".82" stop-color="#7a1a0a"/><stop offset=".93" stop-color="#4e0f05"/><stop offset="1" stop-color="#3a0a04"/></radialGradient>
        <radialGradient id="${id}c" cx=".5" cy=".5" r=".5"><stop offset=".72" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#3a0803" stop-opacity=".55"/></radialGradient></defs>
        ${shadow(id, 46, 44)}<path d="${edge}" fill="url(#${id}g)"/>${specks}${grain(id, edge, 0.3, 1.3)}<path d="${edge}" fill="url(#${id}c)"/>
        <path d="${edge}" fill="none" stroke="#4a0b05" stroke-opacity=".5" stroke-width="1.2"/>${gloss(38, 34, 13, 4, 0.16)}${gloss(62, 64, 5, 2, 0.1, 20)}`;
    },
    mushroom(R, id) {
      const w = 34 + R() * 6;
      const cap = `M${50 - w} 52 C${50 - w} ${f(20 - R() * 6)} ${50 + w} ${f(20 - R() * 6)} ${50 + w} 52 C${50 + w * 0.7} 56 ${50 + w * 0.45} 55 ${50 + 12} 55 L${f(50 + 10 + R() * 2)} 82 Q50 88 ${f(50 - 10 - R() * 2)} 82 L${50 - 12} 55 C${50 - w * 0.45} 55 ${50 - w * 0.7} 56 ${50 - w} 52Z`;
      let gills = ''; for (let i = 0; i < 9; i++) { const x = 50 - w * 0.8 + (i / 8) * w * 1.6; gills += `<path d="M${f(x)} 52 Q${f(50 + (x - 50) * 0.5)} 46 ${f(50 + (x - 50) * 0.2)} 40" stroke="#b39673" stroke-opacity=".35" stroke-width=".8" fill="none"/>`; }
      return `<defs><linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3e7d2"/><stop offset=".6" stop-color="#e2cfae"/><stop offset="1" stop-color="#c7aa82"/></linearGradient></defs>
        ${shadow(id, 44, 38, 52, 58)}<path d="${cap}" fill="url(#${id}g)" stroke="#7a5631" stroke-width="2.6" stroke-linejoin="round"/>${gills}${grain(id, cap, 0.18, 0.9, '#5a3a1c')}
        <path d="${cap}" fill="none" stroke="#a97b4a" stroke-opacity=".5" stroke-width="1"/>${gloss(40, 34, 12, 4, 0.4)}`;
    },
    olive(R, id) {
      const ro = 30 + R() * 3, ri = 11 + R() * 2;
      return `<defs><radialGradient id="${id}g" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#4a3e33"/><stop offset=".7" stop-color="#211a15"/><stop offset="1" stop-color="#0f0b09"/></radialGradient></defs>
        ${shadow(id, 36, 36)}<path fill-rule="evenodd" fill="url(#${id}g)" d="${blob(R, 50, 50, ro, 12, 0.04, 1, 0.92)} ${blob(R, 51, 50, ri, 10, 0.06)}"/>
        <path d="M${f(50 - ro * 0.7)} ${f(50 - ro * 0.45)} A${ro} ${ro} 0 0 1 ${f(50 + ro * 0.35)} ${f(50 - ro * 0.85)}" stroke="#fff" stroke-opacity=".35" stroke-width="2.2" fill="none" stroke-linecap="round"/>
        <circle cx="51" cy="50" r="${f(ri + 1)}" fill="none" stroke="#5b4c3e" stroke-opacity=".6" stroke-width="1"/>`;
    },
    pepper(R, id) {
      const a0 = -150 + R() * 40, sweep = 70 + R() * 30, r = 34, th = 9 + R() * 2;
      const P = (ang, rr) => [50 + Math.cos((ang * Math.PI) / 180) * rr, 58 + Math.sin((ang * Math.PI) / 180) * rr];
      const [x1, y1] = P(a0, r + th / 2), [x2, y2] = P(a0 + sweep, r + th / 2), [x3, y3] = P(a0 + sweep, r - th / 2), [x4, y4] = P(a0, r - th / 2);
      const d = `M${f(x1)} ${f(y1)} A${r + th / 2} ${r + th / 2} 0 0 1 ${f(x2)} ${f(y2)} Q${f((x2 + x3) / 2 + 3)} ${f((y2 + y3) / 2)} ${f(x3)} ${f(y3)} A${r - th / 2} ${r - th / 2} 0 0 0 ${f(x4)} ${f(y4)} Q${f((x1 + x4) / 2 - 3)} ${f((y1 + y4) / 2)} ${f(x1)} ${f(y1)}Z`;
      const [gx1, gy1] = P(a0 + 6, r + th * 0.25), [gx2, gy2] = P(a0 + sweep - 8, r + th * 0.25);
      return `<defs><linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6cbf3a"/><stop offset=".5" stop-color="#3b8a1f"/><stop offset="1" stop-color="#245e12"/></linearGradient></defs>
        <path d="${d}" fill="#2a0f04" opacity=".28" transform="translate(2 3)"/><path d="${d}" fill="url(#${id}g)" stroke="#1d4a0e" stroke-width=".8"/>
        <path d="M${f(gx1)} ${f(gy1)} A${r + th * 0.25} ${r + th * 0.25} 0 0 1 ${f(gx2)} ${f(gy2)}" stroke="#d9f5b0" stroke-opacity=".55" stroke-width="1.4" fill="none" stroke-linecap="round"/>`;
    },
    onion(R, id) {
      const rings = 1 + (R() < 0.5 ? 1 : 0); let s = '';
      for (let i = 0; i < rings; i++) {
        const rr = 34 - i * 9, ox = (R() - 0.5) * 4, oy = (R() - 0.5) * 4, cut = R() * 80;
        s += `<circle cx="${f(50 + ox)}" cy="${f(50 + oy)}" r="${rr}" fill="none" stroke="#7d3a77" stroke-width="5.5" stroke-dasharray="${f(rr * 6.28 - cut)} ${f(cut)}" opacity=".9"/>
          <circle cx="${f(50 + ox)}" cy="${f(50 + oy)}" r="${rr}" fill="none" stroke="#f1e2ee" stroke-width="3" stroke-dasharray="${f(rr * 6.28 - cut)} ${f(cut)}" opacity=".85"/>
          <circle cx="${f(50 + ox)}" cy="${f(50 + oy)}" r="${rr - 1}" fill="none" stroke="#fff" stroke-width=".8" stroke-dasharray="${f(rr * 6.28 * 0.25)} ${f(rr * 6.28)}" opacity=".7"/>`;
      }
      return `<g transform="rotate(${f(R() * 360)} 50 50)"><circle cx="52" cy="53" r="34" fill="none" stroke="#2a0f04" stroke-opacity=".18" stroke-width="7"/>${s}</g>`;
    },
    corn(R, id) {
      let s = `<defs><radialGradient id="${id}g" cx=".4" cy=".3" r=".75"><stop offset="0" stop-color="#ffe98a"/><stop offset=".55" stop-color="#f4c531"/><stop offset="1" stop-color="#c98d0f"/></radialGradient></defs>`;
      const n = 3 + Math.floor(R() * 2);
      for (let i = 0; i < n; i++) {
        const cx = 30 + R() * 40, cy = 30 + R() * 40, rot = R() * 180;
        s += `<g transform="rotate(${f(rot)} ${f(cx)} ${f(cy)})"><ellipse cx="${f(cx + 1.5)}" cy="${f(cy + 2)}" rx="10" ry="8" fill="#2a0f04" opacity=".22"/>
          <path d="M${f(cx - 9)} ${f(cy - 4)} Q${f(cx)} ${f(cy - 11)} ${f(cx + 9)} ${f(cy - 4)} Q${f(cx + 10)} ${f(cy + 6)} ${f(cx)} ${f(cy + 8)} Q${f(cx - 10)} ${f(cy + 6)} ${f(cx - 9)} ${f(cy - 4)}Z" fill="url(#${id}g)" stroke="#b07a0c" stroke-width=".7"/>
          ${gloss(cx - 3, cy - 3, 4, 1.8, 0.6)}</g>`;
      }
      return s;
    },
    jalapeno(R, id) {
      let seeds = ''; for (let i = 0; i < 6; i++) { const a = (i / 6) * 6.28 + R(); seeds += `<ellipse cx="${f(50 + Math.cos(a) * 9)}" cy="${f(50 + Math.sin(a) * 9)}" rx="2.6" ry="1.6" fill="#f4ecc9" transform="rotate(${f((a * 180) / Math.PI)} ${f(50 + Math.cos(a) * 9)} ${f(50 + Math.sin(a) * 9)})"/>`; }
      return `<defs><radialGradient id="${id}f" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#e9f0c2"/><stop offset="1" stop-color="#b9cf7a"/></radialGradient></defs>
        ${shadow(id, 34, 34)}<path d="${blob(R, 50, 50, 28, 10, 0.06)}" fill="#2f6b17"/><path d="${blob(R, 50, 50, 23, 10, 0.07)}" fill="url(#${id}f)"/>
        <path d="${blob(R, 50, 50, 14, 8, 0.1)}" fill="#cfe08f" opacity=".8"/>${seeds}${gloss(40, 35, 9, 3, 0.45)}`;
    },
    tomato(R, id) {
      let ch = ''; const n = 3 + Math.floor(R() * 2);
      for (let i = 0; i < n; i++) { const a = (i / n) * 6.28 + 0.4; const cx = 50 + Math.cos(a) * 17, cy = 50 + Math.sin(a) * 17;
        ch += `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="11" ry="7.5" transform="rotate(${f((a * 180) / Math.PI)} ${f(cx)} ${f(cy)})" fill="#f2836a" opacity=".9"/>`;
        for (let k = 0; k < 3; k++) ch += `<ellipse cx="${f(cx + (R() - 0.5) * 8)}" cy="${f(cy + (R() - 0.5) * 5)}" rx="1.8" ry="1.2" fill="#fbe3a6"/>`; }
      return `<defs><radialGradient id="${id}g" cx=".45" cy=".4" r=".7"><stop offset="0" stop-color="#ef4b35"/><stop offset="1" stop-color="#b3200f"/></radialGradient></defs>
        ${shadow(id, 42, 42)}<path d="${blob(R, 50, 50, 37, 16, 0.03)}" fill="url(#${id}g)"/><circle cx="50" cy="50" r="31" fill="#d9381f"/>${ch}<circle cx="50" cy="50" r="6" fill="#f3a08a"/>${gloss(38, 32, 13, 4.5, 0.32)}`;
    },
    basil(R, id) {
      const L = 38 + R() * 6, W = 17 + R() * 4;
      const d = `M50 ${50 + L / 2} C${50 - W} ${50 + L * 0.25} ${50 - W} ${50 - L * 0.3} 50 ${50 - L / 2} C${50 + W} ${50 - L * 0.3} ${50 + W} ${50 + L * 0.25} 50 ${50 + L / 2}Z`;
      let veins = ''; for (let i = 1; i < 5; i++) { const y = 50 + L / 2 - (i / 5) * L; veins += `<path d="M50 ${f(y)} Q${f(50 - W * 0.5)} ${f(y - 4)} ${f(50 - W * 0.75)} ${f(y - 9)} M50 ${f(y)} Q${f(50 + W * 0.5)} ${f(y - 4)} ${f(50 + W * 0.75)} ${f(y - 9)}" stroke="#9fd17a" stroke-opacity=".45" stroke-width=".8" fill="none"/>`; }
      return `<defs><linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5aa83a"/><stop offset=".6" stop-color="#2f7a1f"/><stop offset="1" stop-color="#1c5212"/></linearGradient></defs>
        <g transform="rotate(${f(R() * 360)} 50 50)"><path d="${d}" fill="#2a0f04" opacity=".25" transform="translate(2 3)"/><path d="${d}" fill="url(#${id}g)"/>
        <path d="M50 ${50 + L / 2 + 4} L50 ${50 - L / 2 + 4}" stroke="#a8d98a" stroke-opacity=".6" stroke-width="1.1"/>${veins}${gloss(44, 40, 6, 12, 0.22, 0)}</g>`;
    },
    chicken(R, id) {
      const e = blob(R, 50, 50, 30, 11, 0.18, 1.15, 0.85);
      let marks = ''; for (let i = 0; i < 3; i++) { const y = 38 + i * 11 + (R() - 0.5) * 3; marks += `<path d="M${f(28 + R() * 4)} ${f(y)} L${f(70 + R() * 4)} ${f(y - 6)}" stroke="#5a2f10" stroke-opacity=".55" stroke-width="2.6" stroke-linecap="round"/>`; }
      return `<defs><radialGradient id="${id}g" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#f6dcae"/><stop offset=".6" stop-color="#dfae6a"/><stop offset="1" stop-color="#a86d2c"/></radialGradient><clipPath id="${id}k"><path d="${e}"/></clipPath></defs>
        ${shadow(id, 38, 32, 52, 56)}<path d="${e}" fill="url(#${id}g)"/><g clip-path="url(#${id}k)">${marks}</g>${grain(id, e, 0.25, 1.4, '#5a2f10')}${gloss(40, 38, 10, 3.5, 0.35)}`;
    },
    beef(R, id) {
      let s = `<defs><radialGradient id="${id}g" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#8a4a2a"/><stop offset=".6" stop-color="#5a2a14"/><stop offset="1" stop-color="#341609"/></radialGradient></defs>`;
      const n = 3 + Math.floor(R() * 3);
      for (let i = 0; i < n; i++) { const cx = 32 + R() * 36, cy = 32 + R() * 36, r = 9 + R() * 7; const d = blob(R, cx, cy, r, 9, 0.28);
        s += `<path d="${d}" fill="#2a0f04" opacity=".25" transform="translate(1.5 2.5)"/><path d="${d}" fill="url(#${id}g)"/>` + grain(id + i, d, 0.35, 1.6);
        for (let k = 0; k < 4; k++) s += `<circle cx="${f(cx + (R() - 0.5) * r)}" cy="${f(cy + (R() - 0.5) * r)}" r="${f(0.8 + R())}" fill="#b0714a" opacity=".6"/>`; }
      return s;
    },
    extraCheese(R, id) {
      const d = blob(R, 50, 50, 38, 16, 0.16);
      let brown = ''; for (let i = 0; i < 4; i++) brown += `<ellipse cx="${f(35 + R() * 30)}" cy="${f(35 + R() * 30)}" rx="${f(3 + R() * 4)}" ry="${f(2 + R() * 3)}" fill="#d9a04a" opacity="${f(0.25 + R() * 0.3)}"/>`;
      return `<defs><radialGradient id="${id}g" cx=".45" cy=".4" r=".6"><stop offset="0" stop-color="#fffaf0"/><stop offset=".7" stop-color="#f6ead2" stop-opacity=".95"/><stop offset="1" stop-color="#f0dcb4" stop-opacity=".55"/></radialGradient></defs>
        <path d="${d}" fill="url(#${id}g)"/>${brown}${gloss(42, 38, 14, 5, 0.5)}`;
    },
  };
  let uid = 0;
  const cache = {};
  Z.topSVG = (k, seed) => {
    const key = k + ':' + seed; if (cache[key]) return cache[key];
    const fn = ART[k] || ART.pepperoni, id = 't' + ++uid;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${fn(rng(seed * 7919 + 13), id)}</svg>`;
    return (cache[key] = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
  };
  // piece size as a share of the pizza diameter, and how many land per tap
  Z.TOP_LOOK = { pepperoni: [0.16, 7], mushroom: [0.14, 8], olive: [0.085, 10], pepper: [0.15, 8], onion: [0.15, 6], corn: [0.1, 9], jalapeno: [0.09, 9], tomato: [0.14, 6], basil: [0.17, 6], chicken: [0.12, 8], beef: [0.1, 9], extraCheese: [0.2, 7] };
})();
