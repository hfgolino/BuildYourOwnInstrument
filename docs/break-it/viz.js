/*
 * Break It, Fix It: pictures of the evidence (SVG, no libraries).
 *   network   EGA network of the scale (partial correlations, Walktrap communities)
 *   semmap    the scale on the semantic map of the item bank (text-embedding-3-small, UMAP)
 *   heat      item correlation matrix
 *   scatter   person-level plots behind each number (test-retest, convergent, discriminant, criterion)
 *   groups    known-groups strips
 *   dist      score distribution with the SEM band
 *   dumbbell  every number on the board, before and after
 *   mini      the small bar inside each board tile
 */
(function (root) {
  "use strict";
  function make(ctx) {
    const { D, K, E, MAP, FHEX, fname, esc, f2 } = ctx;
    const INK = "#1d2840", INK2 = "#3a4660", MUTED = "#5b6880", RULE = "#d5dfea", ORANGE = "#e57200", BAD = "#b23a3a", GOOD = "#2e7d4f";
    const isCopy = (c) => c.startsWith("copy:");
    const info = (c) => K.info(c);
    const otherTrait = (sc, c) => info(c).t !== sc.trait;

    // labels: position on the scale; a near-copy takes its original's number with a prime
    function labels(sc) {
      const out = {}, pos = {};
      sc.items.forEach((x, i) => { if (!isCopy(x.c)) { out[x.c] = String(i + 1); pos[x.c] = i + 1; } });
      sc.items.forEach((x, i) => { if (isCopy(x.c)) { const b = K.baseCode(x.c); const primes = x.c.match(/copy:/g).length; out[x.c] = (pos[b] || i + 1) + "′".repeat(primes); } });
      return out;
    }
    function itemText(sc, c) {
      const L = labels(sc);
      if (isCopy(c)) return `Item ${L[c]}: a reworded copy of item ${L[K.baseCode(c)] || "?"} (“${info(c).s}”)`;
      return `Item ${L[c]}: “${info(c).s}”`;
    }
    function kindNote(sc, c) {
      const it = info(c);
      if (isCopy(c)) return "near-copy";
      if (it.mood) return "asks about today";
      if (it.t !== sc.trait) return `${it.t === "C" ? "Conscientiousness" : "Openness"} item`;
      return "";
    }

    // ---------------------------------------------------------------- node glyph
    function node(sc, c, x, y, lab, o) {
      o = o || {};
      const it = info(c), col = FHEX[it.f], r = o.r || 14;
      const ring = o.misfit ? `stroke="${ORANGE}" stroke-width="4"` : `stroke="#fff" stroke-width="2"`;
      let shape;
      if (otherTrait(sc, c)) shape = `<rect x="${x - r}" y="${y - r}" width="${2 * r}" height="${2 * r}" rx="4" fill="${col}" ${ring}/>`;
      else shape = `<circle cx="${x}" cy="${y}" r="${r}" fill="${isCopy(c) ? "#fff" : col}" ${isCopy(c) ? `stroke="${col}" stroke-width="3" stroke-dasharray="4 3"` : ring}/>`;
      const mood = it.mood ? `<circle cx="${x}" cy="${y}" r="${r + 5}" fill="none" stroke="#c9a227" stroke-width="2.5" stroke-dasharray="2 3"/>` : "";
      const txtCol = isCopy(c) ? col : "#fff";
      return `${mood}${shape}<text x="${x}" y="${y + 4}" text-anchor="middle" font-size="${lab.length > 2 ? 9.5 : 11}" font-weight="800" fill="${txtCol}" pointer-events="none">${lab}</text>`;
    }

    // ---------------------------------------------------------------- force layout (seeded, reuses earlier positions)
    function layout(sc, net, init, W, H) {
      const codes = sc.items.map((x) => x.c), n = codes.length;
      const rnd = E.mulberry32(E.fnv1a(codes.join(",")));
      const facs = [...new Set(sc.items.map((x) => info(x.c).f))].sort((a, b) => a - b);
      const anchors = {};
      facs.forEach((fi, k) => { const a = (2 * Math.PI * k) / facs.length - Math.PI / 2; anchors[fi] = [W / 2 + 0.3 * W * Math.cos(a), H / 2 + 0.3 * H * Math.sin(a)]; });
      const pos = codes.map((c) => {
        const p = init && (init[c] || init[K.baseCode(c)]);
        if (p) return [p[0] + (rnd() - 0.5) * 20, p[1] + (rnd() - 0.5) * 20];
        const a = anchors[info(c).f]; return [a[0] + (rnd() - 0.5) * 80, a[1] + (rnd() - 0.5) * 80];
      });
      const k = Math.sqrt((W * H) / n) * 0.55, iters = init ? 220 : 400;
      for (let it = 0; it < iters; it++) {
        const disp = pos.map(() => [0, 0]), temp = (init ? 14 : 30) * (1 - it / iters) + 0.5;
        for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
          const dx = pos[i][0] - pos[j][0], dy = pos[i][1] - pos[j][1];
          const d = Math.max(0.01, Math.hypot(dx, dy));
          const w = Math.abs(net[i][j]);
          const f = ((k * k) / d - (w > 0 ? (d * d / k) * (0.6 + 5 * w) : 0)) / d;
          disp[i][0] += dx * f; disp[i][1] += dy * f; disp[j][0] -= dx * f; disp[j][1] -= dy * f;
        }
        for (let i = 0; i < n; i++) {
          disp[i][0] += (W / 2 - pos[i][0]) * 0.02; disp[i][1] += (H / 2 - pos[i][1]) * 0.02;
          const d = Math.max(0.01, Math.hypot(disp[i][0], disp[i][1]));
          pos[i][0] += (disp[i][0] / d) * Math.min(d, temp); pos[i][1] += (disp[i][1] / d) * Math.min(d, temp);
        }
      }
      const xs = pos.map((p) => p[0]), ys = pos.map((p) => p[1]);
      const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      return pos.map(([x, y]) => [56 + ((x - x0) / (x1 - x0 || 1)) * (W - 112), 56 + ((y - y0) / (y1 - y0 || 1)) * (H - 100)]);
    }
    function hull(points) {
      const p = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      if (p.length < 3) return p;
      const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
      const lo = [], up = [];
      for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
      for (const q of p.slice().reverse()) { while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
      return lo.slice(0, -1).concat(up.slice(0, -1));
    }

    // ---------------------------------------------------------------- EGA network
    function network(svg, sc, ev, o) {
      o = o || {};
      if (!svg || !ev.structure) return {};
      const W = 560, H = 430, st = ev.structure, codes = sc.items.map((x) => x.c), net = st.network, wc = st.wc;
      const pos = layout(sc, net, o.init, W, H);
      const facs = [...new Set(sc.items.map((x) => x.f))];
      let g = `<rect width="${W}" height="${H}" fill="#fff"/>`;
      const comms = [...new Set(wc.filter((x) => x != null))];
      comms.forEach((cm) => {
        const pts = codes.map((_, i) => (wc[i] === cm ? pos[i] : null)).filter(Boolean);
        const homeF = facs.find((fi) => st.home && st.home[fi] === cm && !(st.merged || []).includes(fi));
        const color = homeF != null ? FHEX[homeF] : "#8b97aa";
        const h = hull(pts);
        const d = h.length === 1 ? `M${h[0][0]},${h[0][1]}l0.1,0` : "M" + h.map((q) => q.join(",")).join("L") + "Z";
        g += `<path d="${d}" fill="${color}" fill-opacity="0.11" stroke="${color}" stroke-opacity="0.17" stroke-width="54" stroke-linejoin="round" stroke-linecap="round"/>`;
        const cx = pts.reduce((s, q) => s + q[0], 0) / pts.length, top = Math.min(...pts.map((q) => q[1]));
        g += `<text x="${Math.min(W - 60, Math.max(60, cx))}" y="${Math.max(14, top - 30)}" text-anchor="middle" font-size="12" font-weight="700" fill="${INK2}">Community ${cm}${homeF != null ? " · " + fname(homeF) : ""}</text>`;
      });
      for (let i = 0; i < codes.length; i++) for (let j = i + 1; j < codes.length; j++) {
        const w = net[i][j]; if (!w) continue;
        g += `<line class="edge" data-a="${i}" data-b="${j}" x1="${pos[i][0]}" y1="${pos[i][1]}" x2="${pos[j][0]}" y2="${pos[j][1]}" stroke="${w > 0 ? INK2 : BAD}" stroke-opacity="${Math.min(0.85, 0.22 + Math.abs(w) * 1.6)}" stroke-width="${0.6 + Math.abs(w) * 10}"><title>items ${labels(sc)[codes[i]]} and ${labels(sc)[codes[j]]}: partial r = ${f2(w)}</title></line>`;
      }
      const L = labels(sc);
      codes.forEach((c, i) => {
        g += `<g class="vnode" data-i="${i}" tabindex="0" role="button" aria-label="${esc(itemText(sc, c))}">${node(sc, c, pos[i][0], pos[i][1], L[c], { misfit: !st.fit[i] })}<title>${esc(itemText(sc, c))}${st.fit[i] ? "" : " (outside its facet's community)"}</title></g>`;
      });
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
      svg.innerHTML = g;
      const cap = o.caption;
      const show = (i) => {
        svg.querySelectorAll(".edge").forEach((e) => { const on = +e.dataset.a === i || +e.dataset.b === i; e.style.opacity = i == null || on ? "" : "0.08"; });
        if (cap && i != null) {
          const c = codes[i], nb = codes.map((_, j) => [j, net[i][j]]).filter(([j, w]) => j !== i && w).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 3);
          const kn = kindNote(sc, c);
          cap.innerHTML = `<b>${esc(itemText(sc, c))}</b><br><span class="tag" style="--fc:${FHEX[info(c).f]}"><span class="swatch"></span>${fname(info(c).f)}</span>${kn ? ` <span class="chip">${kn}</span>` : ""} · Community ${wc[i] == null ? "none" : wc[i]}${st.fit[i] ? " (with its facet)" : ` <b style="color:${ORANGE}">(not with its facet)</b>`}
            <br><span class="small">Strongest links: ${nb.length ? nb.map(([j, w]) => `item ${L[codes[j]]} (${f2(w)})`).join(", ") : "none"}</span>`;
        }
      };
      svg.querySelectorAll(".vnode").forEach((nd) => {
        const i = +nd.dataset.i;
        nd.addEventListener("mouseenter", () => show(i)); nd.addEventListener("focus", () => show(i));
        nd.addEventListener("click", () => show(i));
        nd.addEventListener("mouseleave", () => svg.querySelectorAll(".edge").forEach((e) => { e.style.opacity = ""; }));
      });
      const out = {}; codes.forEach((c, i) => { out[c] = pos[i]; });
      return out;
    }

    // ---------------------------------------------------------------- semantic map
    function semmap(svg, sc, o) {
      o = o || {};
      if (!svg || !MAP) return;
      const W = 560, H = 400, pad = 26;
      const sx = (x) => pad + x * (W - 2 * pad), sy = (y) => pad + 18 + y * (H - 2 * pad - 18);
      const L = labels(sc);
      let g = `<rect width="${W}" height="${H}" fill="#fbfcfe"/>`;
      // the whole bank, faint, tinted by facet
      D.items.forEach((it) => { const p = MAP[it.id]; if (p) g += `<circle cx="${sx(p[0])}" cy="${sy(p[1])}" r="2.6" fill="${FHEX[it.f]}" fill-opacity="0.16"/>`; });
      // facet names at the center of their bank items
      for (let fi = 0; fi < 6; fi++) {
        const ps = D.items.filter((it) => it.f === fi && MAP[it.id]).map((it) => MAP[it.id]);
        const cx = ps.reduce((s, p) => s + p[0], 0) / ps.length, top = Math.min(...ps.map((p) => p[1]));
        g += `<text x="${Math.min(W - 70, Math.max(70, sx(cx)))}" y="${sy(top) - 7}" text-anchor="middle" font-size="11.5" font-weight="700" fill="${FHEX[fi]}" pointer-events="none">${fname(fi)} (${fi < 3 ? "C" : "O"})</text>`;
      }
      // removed items (in the comparison scale but not in this one)
      (o.removed || []).forEach((c) => { const p = MAP[K.baseCode(c)]; if (!p || isCopy(c)) return; g += `<circle cx="${sx(p[0])}" cy="${sy(p[1])}" r="11" fill="none" stroke="#8b97aa" stroke-width="2" stroke-dasharray="3 3"><title>removed: “${esc(info(c).s)}”</title></circle>`; });
      const placed = [];
      sc.items.forEach((x) => {
        const c = x.c, p = MAP[K.baseCode(c)];
        if (!p) return;
        let X = sx(p[0]), Y = sy(p[1]);
        if (isCopy(c)) { const n = c.match(/copy:/g).length; const X2 = X + 15 * n, Y2 = Y + 13 * n; g += `<line x1="${X}" y1="${Y}" x2="${X2}" y2="${Y2}" stroke="${FHEX[info(c).f]}" stroke-width="1.5"/>`; X = X2; Y = Y2; }
        placed.push([c, X, Y]);
      });
      // nudge overlapping markers apart; a thin line keeps each one tied to its true position
      const home = placed.map((p) => [p[1], p[2]]);
      for (let it = 0; it < 60; it++) for (let a = 0; a < placed.length; a++) for (let b = a + 1; b < placed.length; b++) {
        const dx = placed[b][1] - placed[a][1], dy = placed[b][2] - placed[a][2], d = Math.hypot(dx, dy) || 0.01;
        if (d < 22) { const m = (22 - d) / 2, ux = dx / d || 0.7, uy = dy / d || 0.7; placed[a][1] -= ux * m; placed[a][2] -= uy * m; placed[b][1] += ux * m; placed[b][2] += uy * m; }
      }
      placed.forEach((p, i) => { if (Math.hypot(p[1] - home[i][0], p[2] - home[i][1]) > 5) g += `<line x1="${home[i][0]}" y1="${home[i][1]}" x2="${p[1]}" y2="${p[2]}" stroke="#5b6880" stroke-width="1"/><circle cx="${home[i][0]}" cy="${home[i][1]}" r="2" fill="#5b6880"/>`; });
      placed.forEach(([c, X, Y]) => { g += `<g class="vnode" tabindex="0" role="img" aria-label="${esc(itemText(sc, c))}">${node(sc, c, X, Y, L[c], { r: 11 })}<title>${esc(itemText(sc, c))}</title></g>`; });
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
      svg.innerHTML = g;
      if (o.tray) {
        const moods = sc.items.filter((x) => !MAP[K.baseCode(x.c)]);
        o.tray.innerHTML = moods.length ? `<b>Not on the map:</b> ${moods.map((x) => `item ${L[x.c]} (“${esc(info(x.c).s)}”)`).join("; ")}. These mood items were written for this lab and were never embedded, so they have no position.` : "";
      }
    }

    // ---------------------------------------------------------------- correlation heat map
    function heat(svg, sc, ev) {
      if (!svg || !ev.structure) return;
      const R = ev.structure.R, codes = sc.items.map((x) => x.c), Lb = labels(sc);
      const idx = codes.map((c, i) => i);
      const key = (i) => { const c = codes[i], b = K.baseCode(c), bi = codes.indexOf(b); const it = info(c); return [it.t === sc.trait ? 0 : 1, sc.items[i].f, bi >= 0 ? bi : i, isCopy(c) ? 1 : 0]; };
      idx.sort((a, b) => { const A = key(a), B = key(b); for (let t = 0; t < 4; t++) if (A[t] !== B[t]) return A[t] - B[t]; return 0; });
      const n = idx.length, W = 560, Lm = 34, cell = (W - Lm - 8) / n;
      let g = `<rect width="${W}" height="${W}" fill="#fff"/>`;
      idx.forEach((i, a) => {
        const col = FHEX[info(codes[i]).f];
        g += `<text x="${Lm - 5}" y="${Lm + a * cell + cell / 2 + 4}" text-anchor="end" font-size="11" font-weight="700" fill="${col}">${Lb[codes[i]]}</text>`;
        g += `<text x="${Lm + a * cell + cell / 2}" y="${Lm - 8}" text-anchor="middle" font-size="11" font-weight="700" fill="${col}">${Lb[codes[i]]}</text>`;
        idx.forEach((j, b) => {
          const r = R[i][j], v = a === b ? 0 : Math.max(0, r);
          const fill = a === b ? "#e7edf4" : `rgba(30,78,134,${Math.min(1, Math.pow(v, 1.7)).toFixed(3)})`;
          g += `<rect x="${Lm + b * cell}" y="${Lm + a * cell}" width="${cell - 1}" height="${cell - 1}" fill="${fill}"><title>items ${Lb[codes[i]]} and ${Lb[codes[j]]}: r = ${f2(r)}</title></rect>`;
          if (a !== b && cell > 26) g += `<text x="${Lm + b * cell + cell / 2}" y="${Lm + a * cell + cell / 2 + 3}" text-anchor="middle" font-size="9" fill="${v > 0.6 ? "#fff" : INK2}" pointer-events="none">${f2(r)}</text>`;
        });
      });
      svg.setAttribute("viewBox", `0 0 ${W} ${W}`);
      svg.innerHTML = g;
    }

    // ---------------------------------------------------------------- person-level plots
    const W2 = 340, H2 = 260, M = { l: 46, r: 12, t: 30, b: 40 };
    function axes(x0, x1, y0, y1, xlab, ylab) {
      const sx = (v) => M.l + ((v - x0) / (x1 - x0 || 1)) * (W2 - M.l - M.r);
      const sy = (v) => H2 - M.b - ((v - y0) / (y1 - y0 || 1)) * (H2 - M.t - M.b);
      const ticks = (a, b) => { const st = niceStep((b - a) / 4); const out = []; for (let v = Math.ceil(a / st) * st; v <= b + 1e-9; v += st) out.push(+v.toFixed(6)); return out; };
      let g = `<rect width="${W2}" height="${H2}" fill="#fff"/>`;
      ticks(x0, x1).forEach((v) => { g += `<line x1="${sx(v)}" x2="${sx(v)}" y1="${M.t}" y2="${H2 - M.b}" stroke="#eef2f6"/><text x="${sx(v)}" y="${H2 - M.b + 14}" text-anchor="middle" font-size="10" fill="${MUTED}">${fmtTick(v)}</text>`; });
      ticks(y0, y1).forEach((v) => { g += `<line x1="${M.l}" x2="${W2 - M.r}" y1="${sy(v)}" y2="${sy(v)}" stroke="#eef2f6"/><text x="${M.l - 5}" y="${sy(v) + 3}" text-anchor="end" font-size="10" fill="${MUTED}">${fmtTick(v)}</text>`; });
      g += `<text x="${(M.l + W2 - M.r) / 2}" y="${H2 - 6}" text-anchor="middle" font-size="11" fill="${INK2}">${esc(xlab)}</text>`;
      g += `<text transform="translate(12,${(M.t + H2 - M.b) / 2}) rotate(-90)" text-anchor="middle" font-size="11" fill="${INK2}">${esc(ylab)}</text>`;
      return { g, sx, sy };
    }
    function niceStep(x) { const p = Math.pow(10, Math.floor(Math.log10(x || 1))), m = x / p; return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p; }
    function fmtTick(v) { return Math.abs(v) >= 10 || Number.isInteger(v) ? String(Math.round(v)) : v.toFixed(1); }
    function range(a, padf) { let lo = Math.min(...a), hi = Math.max(...a); const p = (hi - lo || 1) * (padf || 0.04); return [lo - p, hi + p]; }
    function jitter(seed, n, amt) { const r = E.mulberry32(seed); return Array.from({ length: n }, () => (r() - 0.5) * amt); }
    function fitLine(x, y) { const mx = E.mean(x), my = E.mean(y); let sxy = 0, sxx = 0; x.forEach((v, i) => { sxy += (v - mx) * (y[i] - my); sxx += (v - mx) ** 2; }); const b = sxy / (sxx || 1); return [b, my - b * mx]; }

    /* o: { x, y, xlab, ylab, title, r, color, show (bool mask), rug (bool mask: drawn on the x axis only), cut (x value), fixX, fixY } */
    function scatter(svg, o) {
      if (!svg) return;
      const n = o.x.length, show = o.show || o.x.map(() => true);
      const xi = o.x.map((_, i) => i).filter((i) => show[i]);
      const [x0, x1] = o.fixX || range(o.x), [y0, y1] = o.fixY || range(o.y.filter((v, i) => show[i]));
      const A = axes(x0, x1, y0, y1, o.xlab, o.ylab);
      let g = A.g;
      const jx = jitter(E.fnv1a(o.title || "x"), n, (x1 - x0) / 60), jy = jitter(E.fnv1a((o.title || "y") + "y"), n, (y1 - y0) / 80);
      if (o.rug) o.x.forEach((v, i) => { if (o.rug[i]) g += `<line x1="${A.sx(v + jx[i])}" x2="${A.sx(v + jx[i])}" y1="${H2 - M.b - 7}" y2="${H2 - M.b}" stroke="#9aa6ba" stroke-width="1.2"/>`; });
      if (o.cut != null) g += `<line x1="${A.sx(o.cut)}" x2="${A.sx(o.cut)}" y1="${M.t}" y2="${H2 - M.b}" stroke="${ORANGE}" stroke-width="2" stroke-dasharray="5 4"/><text x="${A.sx(o.cut) - 5}" y="${M.t + 11}" text-anchor="end" font-size="10.5" font-weight="700" fill="${ORANGE}">hired →</text><text x="${A.sx(o.cut) - 5}" y="${H2 - M.b - 16}" text-anchor="end" font-size="10" fill="${MUTED}">not hired: no outcome ▾</text>`;
      xi.forEach((i) => { g += `<circle cx="${A.sx(o.x[i] + jx[i])}" cy="${A.sy(o.y[i] + jy[i])}" r="2.8" fill="${o.color || "#1e4e86"}" fill-opacity="0.45"/>`; });
      if (xi.length > 2) {
        const [b, a] = fitLine(xi.map((i) => o.x[i]), xi.map((i) => o.y[i]));
        const xa = Math.min(...xi.map((i) => o.x[i])), xb = Math.max(...xi.map((i) => o.x[i]));
        g += `<line x1="${A.sx(xa)}" y1="${A.sy(a + b * xa)}" x2="${A.sx(xb)}" y2="${A.sy(a + b * xb)}" stroke="${INK}" stroke-width="2.5"/>`;
      }
      g += `<text x="${M.l}" y="18" font-size="12.5" font-weight="800" fill="${INK}">${esc(o.title || "")}</text>`;
      if (o.r != null) g += `<text x="${W2 - M.r}" y="18" text-anchor="end" font-size="12.5" font-weight="800" fill="${INK}">r = ${isFinite(o.r) ? f2(o.r) : "–"}${o.n ? ` (n = ${o.n})` : ""}</text>`;
      svg.setAttribute("viewBox", `0 0 ${W2} ${H2}`);
      svg.innerHTML = g;
    }
    function groups(svg, o) {
      if (!svg) return;
      const [x0, x1] = range(o.x, 0.04);
      const sx = (v) => M.l + 60 + ((v - x0) / (x1 - x0 || 1)) * (W2 - M.l - 60 - M.r);
      const jy = jitter(E.fnv1a("g" + o.title), o.x.length, 30), jx = jitter(E.fnv1a("gx" + o.title), o.x.length, (x1 - x0) / 60);
      let g = `<rect width="${W2}" height="${H2}" fill="#fff"/><text x="${M.l}" y="18" font-size="12.5" font-weight="800" fill="${INK}">${esc(o.title)}</text><text x="${W2 - M.r}" y="18" text-anchor="end" font-size="12.5" font-weight="800" fill="${INK}">d = ${f2(o.d)}</text>`;
      [[true, 95, o.labels[0], "#2f8f5f"], [false, 175, o.labels[1], "#7a58b0"]].forEach(([gv, y, lab, col]) => {
        const xs = o.x.filter((_, i) => o.grp[i] === gv);
        o.x.forEach((v, i) => { if (o.grp[i] === gv) g += `<circle cx="${sx(v + jx[i])}" cy="${y + jy[i]}" r="2.6" fill="${col}" fill-opacity="0.45"/>`; });
        const m = E.mean(xs);
        g += `<line x1="${sx(m)}" x2="${sx(m)}" y1="${y - 26}" y2="${y + 26}" stroke="${INK}" stroke-width="3"/><text x="${M.l + 52}" y="${y - 4}" text-anchor="end" font-size="11" font-weight="700" fill="${col}">${esc(lab)}</text><text x="${M.l + 52}" y="${y + 10}" text-anchor="end" font-size="10" fill="${MUTED}">n = ${xs.length}</text>`;
      });
      g += `<text x="${(M.l + W2) / 2 + 30}" y="${H2 - 8}" text-anchor="middle" font-size="11" fill="${INK2}">${esc(o.xlab)}</text>`;
      svg.setAttribute("viewBox", `0 0 ${W2} ${H2}`);
      svg.innerHTML = g;
    }
    function dist(svg, o) {
      if (!svg) return;
      const lo = o.min, hi = o.max, nb = hi - lo + 1, bw = nb > 50 ? Math.ceil(nb / 40) : 1;
      const bins = new Array(Math.ceil(nb / bw)).fill(0);
      o.x.forEach((v) => { bins[Math.floor((v - lo) / bw)]++; });
      const A = axes(lo - 0.5, hi + 0.5, 0, Math.max(...bins) * 1.12, o.xlab, "people");
      let g = A.g;
      bins.forEach((c, b) => { if (c) g += `<rect x="${A.sx(lo + b * bw - 0.5) + 0.5}" y="${A.sy(c)}" width="${Math.max(1, A.sx(lo + (b + 1) * bw - 0.5) - A.sx(lo + b * bw - 0.5) - 1)}" height="${A.sy(0) - A.sy(c)}" fill="#1e4e86" fill-opacity="0.55"/>`; });
      const mid = Math.round(E.mean(o.x)), y = M.t + 12;
      const a = Math.max(lo, mid - 1.96 * o.sem), b = Math.min(hi, mid + 1.96 * o.sem);
      g += `<rect x="${A.sx(a)}" y="${y - 7}" width="${A.sx(b) - A.sx(a)}" height="14" rx="7" fill="${ORANGE}" fill-opacity="0.28"/><circle cx="${A.sx(mid)}" cy="${y}" r="5" fill="${ORANGE}"/>`;
      g += `<text x="${W2 - M.r}" y="18" text-anchor="end" font-size="12.5" font-weight="800" fill="${INK}">SEM = ${o.sem.toFixed(1)} (${o.semPct.toFixed(1)}%)</text><text x="${M.l}" y="18" font-size="12.5" font-weight="800" fill="${INK}">${esc(o.title)}</text>`;
      svg.setAttribute("viewBox", `0 0 ${W2} ${H2}`);
      svg.innerHTML = g;
      return `A person with an observed score of ${mid} has a true score somewhere between about ${Math.round(a)} and ${Math.round(b)} (95% band, ± 1.96 SEM).`;
    }

    // ---------------------------------------------------------------- every number, before and after
    const AX = { alpha: [0, 1, [0.7, 0.8]], retest: [0, 1, [0.7, 0.8]], sem: [0, 16, []], content: [0, 3, []], structure: [0, 1, [0.9]], conv: [0, 1, []], disc: [0, 1, []], crit: [0, 1, []], known: [0, 1.5, [0.5]] };
    function mini(g, v) {
      const [a, b, marks] = AX[g];
      if (!isFinite(v)) return "";
      const W = 200, x = (t) => 4 + ((Math.max(a, Math.min(b, t)) - a) / (b - a)) * (W - 8);
      return `<svg class="mini" viewBox="0 0 ${W} 14" aria-hidden="true"><rect x="4" y="5" width="${W - 8}" height="4" rx="2" fill="#e2e8f0"/><rect x="4" y="5" width="${x(v) - 4}" height="4" rx="2" fill="#7f93ad"/>${marks.map((m) => `<line x1="${x(m)}" x2="${x(m)}" y1="1" y2="13" stroke="${BAD}" stroke-width="1" stroke-dasharray="2 2"/>`).join("")}<circle cx="${x(v)}" cy="7" r="5" fill="${INK}"/></svg>`;
    }
    function dumbbell(svg, rows) {
      if (!svg) return;
      const W = 620, L = 150, R = 420, rh = 34, H = rows.length * rh + 34;
      let g = `<rect width="${W}" height="${H}" fill="#fff"/><text x="${L}" y="16" font-size="11" fill="${MUTED}">○ before   ● after   (each row has its own scale; dashed: common benchmarks)</text>`;
      rows.forEach((r, k) => {
        const y = 40 + k * rh, [a, b, marks] = AX[r.g], x = (t) => L + ((Math.max(a, Math.min(b, t)) - a) / (b - a)) * (R - L);
        if (r.focus) g += `<rect x="4" y="${y - 15}" width="${W - 8}" height="30" rx="6" fill="#fdf0e1"/>`;
        g += `<text x="${L - 12}" y="${y + 4}" text-anchor="end" font-size="12" font-weight="${r.focus ? 800 : 600}" fill="${INK}">${esc(r.name)}</text>`;
        g += `<line x1="${L}" x2="${R}" y1="${y}" y2="${y}" stroke="#e2e8f0" stroke-width="5" stroke-linecap="round"/>`;
        marks.forEach((m) => { g += `<line x1="${x(m)}" x2="${x(m)}" y1="${y - 9}" y2="${y + 9}" stroke="${BAD}" stroke-dasharray="2 2"/>`; });
        if (!isFinite(r.a) || !isFinite(r.b)) { g += `<text x="${L + 6}" y="${y + 4}" font-size="11" fill="${MUTED}">${!isFinite(r.b) ? "not available after this change" : "–"}</text>`; return; }
        const col = r.focus ? ORANGE : "#4b5d7a";
        g += `<line x1="${x(r.a)}" x2="${x(r.b)}" y1="${y}" y2="${y}" stroke="${col}" stroke-width="4"/>`;
        g += `<circle cx="${x(r.a)}" cy="${y}" r="6.5" fill="#fff" stroke="${col}" stroke-width="2.5"><title>before: ${r.ta}</title></circle><circle cx="${x(r.b)}" cy="${y}" r="6.5" fill="${col}"><title>after: ${r.tb}</title></circle>`;
        g += `<text x="${R + 10}" y="${y + 4}" font-size="11.5" fill="${INK2}">${r.ta} → <tspan font-weight="800">${r.tb}</tspan></text>`;
        if (r.ok != null) g += `<text x="${W - 8}" y="${y + 4}" text-anchor="end" font-size="13" font-weight="800" fill="${r.ok ? GOOD : BAD}">${r.ok ? "✓" : "✗"}</text>`;
      });
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
      svg.innerHTML = g;
    }
    return { network, semmap, heat, scatter, groups, dist, dumbbell, mini, labels, AX };
  }
  root.BreakViz = { make };
})(typeof window !== "undefined" ? window : globalThis);
