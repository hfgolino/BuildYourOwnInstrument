/*
 * Break It, Fix It: evidence calculations (no interface code).
 * Works in the browser (window.BreakCore) and in Node (module.exports).
 * Needs Engine (../engine.js) and the data object (data.js).
 */
(function (root) {
  "use strict";
  function make(D, E) {
    const ITEM = {};
    D.items.forEach((it, i) => { it.idx = i; ITEM[it.id] = it; });
    const N = D.indecisive.length;
    const IND = Array.from(D.indecisive, (c) => c === "1");

    // ---------------------------------------------------------------- responses
    function categorize(L, k, ind) {
      let c = Math.min(k, Math.max(1, Math.floor((120 + (L - 2) * (k - 1)) / 80)));
      if (k % 2 === 1 && ind && Math.abs((L - 2) * (k - 1) + 40 - 40 * k) <= 80) c = (k + 1) / 2;
      return c;
    }
    const cache = new Map();
    function levels(code, occ) {
      const key = "L|" + occ + "|" + code;
      if (cache.has(key)) return cache.get(key);
      let a;
      if (code.startsWith("copy:")) {
        // a reworded near-copy: the original answer, nudged by up to 3 levels (seeded, integer-only)
        const base = levels(code.slice(5), occ), rnd = E.mulberry32(E.fnv1a(code + "|" + occ));
        a = base.map((L) => Math.min(84, Math.max(0, L + Math.floor(rnd() * 7) - 3)));
      } else {
        const s = D.L[occ][ITEM[code].idx];
        a = Array.from(s, (ch) => ch.charCodeAt(0) - 35);
      }
      cache.set(key, a);
      return a;
    }
    function col(code, occ, k) {
      const key = "C|" + occ + "|" + k + "|" + code;
      if (!cache.has(key)) cache.set(key, levels(code, occ).map((L, i) => categorize(L, k, IND[i])));
      return cache.get(key);
    }
    const baseCode = (c) => c.replace(/^(copy:)+/, "");
    const info = (c) => ITEM[baseCode(c)];

    // ---------------------------------------------------------------- statistics
    const sum = (cols) => cols[0].map((_, i) => cols.reduce((s, c) => s + c[i], 0));
    function cohenD(x, g) {
      const a = x.filter((_, i) => g[i]), b = x.filter((_, i) => !g[i]);
      const ma = E.mean(a), mb = E.mean(b), va = E.variance(a), vb = E.variance(b);
      const sp = Math.sqrt(((a.length - 1) * va + (b.length - 1) * vb) / (a.length + b.length - 2));
      return (ma - mb) / sp;
    }

    /*
     * scale = { trait: "C"|"O", fmt: 2..6, items: [{c: code, f: facet index}],
     *           sample: "T1"|"APP", retest: "T2"|"T2D", hire: null | fraction hired }
     */
    function evidence(scale, opts) {
      opts = opts || {};
      const k = scale.fmt, occ1 = scale.sample || "T1", occ2 = scale.retest || "T2";
      const codes = scale.items.map((x) => x.c);
      const cols = codes.map((c) => col(c, occ1, k));
      const tot = sum(cols);
      const rel = E.reliability(cols);
      const facAlpha = {};
      D.traits[scale.trait].forEach((fn) => {
        const fi = D.facets.indexOf(fn);
        const fc = scale.items.filter((x) => x.f === fi).map((x) => col(x.c, occ1, k));
        facAlpha[fi] = fc.length >= 2 ? E.alpha(fc) : NaN;
      });
      // applicants answered once, so there is no retest in the hiring scenario
      const retest = occ1 === "APP" ? NaN : E.cor(tot, sum(codes.map((c) => col(c, occ2 === "T2D" ? "T2D" : "T2", k))));
      const sd = Math.sqrt(E.variance(tot));
      const sem = sd * Math.sqrt(Math.max(0, 1 - rel.alpha));
      const range = codes.length * (k - 1);
      // content: facets of the scale's trait with at least 2 items; items from the other trait
      const own = D.traits[scale.trait].map((fn) => D.facets.indexOf(fn));
      const covered = own.filter((fi) => scale.items.filter((x) => x.f === fi && info(x.c).t === scale.trait).length >= 2).length;
      const offTrait = scale.items.filter((x) => info(x.c).t !== scale.trait).length;
      const mood = scale.items.filter((x) => info(x.c).mood).length;
      // structure
      let structure = null;
      if (!opts.skipEGA) {
        const g = E.ega(cols);
        const m = E.structuralMatch(g.wc, scale.items.map((x) => x.f));
        structure = { nDim: g.nDim, nFit: m.nFit, k: codes.length, wc: g.wc, network: g.network, R: g.R, merged: m.merged, fit: m.fit, home: m.home };
      }
      // convergent / discriminant / criterion / known groups
      const other = scale.trait === "C" ? "O" : "C";
      const conv = E.cor(tot, D.peer[scale.trait]);
      const otherTot = sum(D.other[other].map((c) => col(c, "T1", 5)));
      const disc = E.cor(tot, otherTot);
      const crit = D.crit[scale.trait];
      let critR, critN = N;
      if (scale.hire) {
        const order = tot.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
        const hired = order.slice(0, Math.round(N * scale.hire)).map((x) => x[1]);
        critR = E.cor(hired.map((i) => tot[i]), hired.map((i) => crit[i])); critN = hired.length;
      } else critR = E.cor(tot, crit);
      const grp = Array.from(D.grp[scale.trait], (ch) => ch === "1");
      const known = cohenD(tot, grp);
      return {
        k: codes.length, fmt: k, alpha: rel.alpha, splitHalf: rel.spearmanBrown, avgR: rel.avgR, facAlpha,
        retest, retestKind: occ2, sem, semPct: (100 * sem) / range, range, mean: E.mean(tot), sd,
        covered, offTrait, mood, structure, conv, disc, crit: critR, critN, known,
      };
    }


    // ---------------------------------------------------------------- person-level vectors for the plots
    function vectors(scale) {
      const k = scale.fmt, occ1 = scale.sample || "T1", occ2 = scale.retest === "T2D" ? "T2D" : "T2";
      const codes = scale.items.map((x) => x.c);
      const tot = sum(codes.map((c) => col(c, occ1, k)));
      const honest = occ1 === "T1" ? tot : sum(codes.map((c) => col(c, "T1", k)));
      const retest = occ1 === "APP" ? null : sum(codes.map((c) => col(c, occ2, k)));
      const other = scale.trait === "C" ? "O" : "C";
      const otherTot = sum(D.other[other].map((c) => col(c, "T1", 5)));
      let hired = null;
      if (scale.hire) {
        const order = tot.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
        hired = new Array(N).fill(false);
        order.slice(0, Math.round(N * scale.hire)).forEach((x) => { hired[x[1]] = true; });
      }
      return { tot, honest, retest, retestKind: occ2, peer: D.peer[scale.trait], crit: D.crit[scale.trait], otherTot,
        grp: Array.from(D.grp[scale.trait], (ch) => ch === "1"), hired, min: codes.length, max: codes.length * k };
    }

    // ---------------------------------------------------------------- the six sabotages and their repairs
    function byFacet(scale) {
      const out = {};
      scale.items.forEach((x) => { (out[x.f] = out[x.f] || []).push(x); });
      return out;
    }
    const clone = (s) => JSON.parse(JSON.stringify(s));
    const otherTrait = (t) => (t === "C" ? "O" : "C");
    const dropFacet = (t) => D.facets.indexOf(t === "C" ? "perseverance" : "aesthetics");
    function picks(scale) {
      // one item per facet plus the second item of the first facet (deterministic)
      const bf = byFacet(scale), fs = D.traits[scale.trait].map((fn) => D.facets.indexOf(fn));
      const out = fs.map((fi) => bf[fi] && bf[fi][0]).filter(Boolean);
      if (bf[fs[0]] && bf[fs[0]][1]) out.push(bf[fs[0]][1]);
      return out.slice(0, 4);
    }
    function extraItems(scale, n) {
      // the next strongest clear items of the scale's facets that are not on the scale yet
      const used = new Set(scale.items.map((x) => baseCode(x.c)));
      const pool = D.std[scale.trait].concat(D.other[scale.trait]).filter((c) => !used.has(c));
      const fs = D.traits[scale.trait].map((fn) => D.facets.indexOf(fn)), out = [];
      let i = 0;
      while (out.length < n && i < 50) { const fi = fs[i % 3]; const c = pool.find((x) => ITEM[x].f === fi && !out.some((o) => o.c === x)); if (c) out.push({ c, f: fi }); i++; }
      return out;
    }
    const SAB = {
      pad: (b) => { const s = clone(b); picks(b).forEach((x) => s.items.push({ c: "copy:" + x.c, f: x.f })); return s; },
      mood: (b) => {
        const s = clone(b), used = {};
        picks(b).forEach((x) => {
          const j = (used[x.f] = (used[x.f] || 0) + 1) - 1;
          const m = D.moods[x.f][j % D.moods[x.f].length];
          const pos = s.items.findIndex((y) => y.c === x.c);
          s.items[pos] = { c: m, f: x.f };
        });
        return s;
      },
      tf: (b) => Object.assign(clone(b), { fmt: 2 }),
      mix: (b) => { const s = clone(b), o = otherTrait(b.trait); [0, 4, 8, 1].forEach((j) => { const c = D.std[o][j]; s.items.push({ c, f: ITEM[c].f }); }); return s; },
      hire: (b) => Object.assign(clone(b), { sample: "APP", hire: 0.3 }),
      drop: (b) => { const s = clone(b), fi = dropFacet(b.trait); s.items = s.items.filter((x) => x.f !== fi); return s; },
    };
    const FIX = {
      pad: { a: (b) => clone(b), b: (b, s) => clone(s), c: (b, s) => { const t = clone(s); picks(b).forEach((x) => t.items.push({ c: "copy:copy:" + x.c, f: x.f })); return t; } },
      mood: { a: (b) => clone(b), b: (b, s) => Object.assign(clone(s), { retest: "T2D" }),
              c: (b, s) => { const t = clone(s); D.traits[b.trait].map((fn) => D.facets.indexOf(fn)).forEach((fi) => D.moods[fi].forEach((m) => { if (!t.items.some((y) => y.c === m)) { const pos = t.items.findIndex((y) => y.f === fi && !ITEM[baseCode(y.c)].mood); if (pos >= 0) t.items[pos] = { c: m, f: fi }; } })); return t; } },
      tf: { a: (b) => clone(b), b: (b, s) => { const t = clone(s); extraItems(b, 6).forEach((x) => t.items.push(x)); return t; }, c: (b, s) => Object.assign(clone(s), { retest: "T2D" }) },
      mix: { a: (b) => clone(b), b: (b, s) => clone(s), c: (b, s) => clone(s) },
      hire: { a: (b) => clone(b), b: (b, s) => Object.assign(clone(s), { hire: 0.15 }), c: (b, s) => { const t = clone(s); extraItems(b, 4).forEach((x) => t.items.push(x)); return t; } },
      drop: { a: (b) => clone(b), b: (b, s) => clone(s), c: (b, s) => { const t = clone(s); extraItems(b, 6).filter((x) => x.f !== dropFacet(b.trait)).slice(0, 4).forEach((x) => t.items.push(x)); return t; } },
    };
    // ---------------------------------------------------------------- scoring a prediction
    // Judged on the rounded values students see. "same" if the change is at or below the
    // first tolerance, a clear direction at or above the second; in between, both are accepted.
    const TOL = { alpha: [0.02, 0.04, 2], retest: [0.02, 0.04, 2], conv: [0.02, 0.04, 2], disc: [0.02, 0.04, 2], crit: [0.02, 0.04, 2],
      known: [0.08, 0.15, 2], sem: [0.5, 1.0, 1], structure: [0.09, 0.15, 3], content: [0, 0.5, 0] };
    function gv(g, e) {
      if (g === "sem") return e.semPct;
      if (g === "content") return e.covered;
      if (g === "structure") return e.structure ? e.structure.nFit / e.structure.k : NaN;
      return e[g];
    }
    function direction(g, e0, e1) {
      const [same, clear, dp] = TOL[g], f = Math.pow(10, dp);
      const a = Math.round(gv(g, e0) * f) / f, b = Math.round(gv(g, e1) * f) / f;
      if (!isFinite(a) || !isFinite(b)) return "na";
      const d = Math.round((b - a) * f) / f;
      if (Math.abs(d) <= same) return "same";
      if (Math.abs(d) >= clear) return d > 0 ? "up" : "down";
      return d > 0 ? "up-ish" : "down-ish";
    }
    function truth(g, e0, e1) {
      const d = direction(g, e0, e1);
      return d === "up-ish" ? ["up", "same"] : d === "down-ish" ? ["down", "same"] : [d];
    }
    return { ITEM, N, col, levels, categorize, evidence, vectors, SAB, FIX, picks, extraItems, dropFacet, baseCode, info, gv, direction, truth };
  }
  const api = { make };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.BreakCore = api;
})(typeof window !== "undefined" ? window : globalThis);
