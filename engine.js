/*
 * Construct Lab psychometrics engine (no dependencies).
 *
 *   - descriptive item statistics (facility, SD, corrected item-total r)
 *   - internal consistency: Cronbach's alpha, alpha-if-item-deleted,
 *     split-half (odd/even) with Spearman-Brown, average inter-item r
 *   - EGA: EBICglasso network (as in EGAnet::EBICglasso.qgraph: 100 lambdas,
 *     lambda.min.ratio = .1, gamma = .5, unpenalized diagonal) + Walktrap
 *     community detection (port of igraph's cluster_walktrap, steps = 4),
 *     singleton communities set to NA (EGAnet default)
 *   - small utilities: seeded PRNG (mulberry32), FNV-1a hash
 *
 * Works in the browser (window.Engine) and in Node (module.exports).
 * Validated against EGAnet 2.5.0 and psych in tools/validate_engine.R.
 */
(function (root) {
  "use strict";

  // ------------------------------------------------------------ utilities
  function fnv1a(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffle(arr, rnd) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  const mean = (x) => x.reduce((s, v) => s + v, 0) / x.length;
  function variance(x) {
    const m = mean(x);
    let s = 0;
    for (const v of x) s += (v - m) * (v - m);
    return s / (x.length - 1);
  }
  function cor(x, y) {
    const n = x.length, mx = mean(x), my = mean(y);
    let sxy = 0, sxx = 0, syy = 0;
    for (let i = 0; i < n; i++) {
      const a = x[i] - mx, b = y[i] - my;
      sxy += a * b; sxx += a * a; syy += b * b;
    }
    return sxx === 0 || syy === 0 ? NaN : sxy / Math.sqrt(sxx * syy);
  }
  function corMatrix(cols) {
    const p = cols.length, R = [];
    for (let i = 0; i < p; i++) R.push(new Array(p).fill(0));
    for (let i = 0; i < p; i++) {
      R[i][i] = 1;
      for (let j = i + 1; j < p; j++) R[i][j] = R[j][i] = cor(cols[i], cols[j]);
    }
    return R;
  }
  function rowSums(cols, skip) {
    const n = cols[0].length, out = new Array(n).fill(0);
    cols.forEach((c, k) => { if (k !== skip) for (let i = 0; i < n; i++) out[i] += c[i]; });
    return out;
  }

  // ------------------------------------------------------------ reliability
  function alpha(cols) {
    const k = cols.length;
    if (k < 2) return NaN;
    const sumVar = cols.reduce((s, c) => s + variance(c), 0);
    const totVar = variance(rowSums(cols));
    return (k / (k - 1)) * (1 - sumVar / totVar);
  }
  function splitHalf(cols) {
    // odd/even halves in the order given, Spearman-Brown corrected (Rust et al., p. 34)
    if (cols.length < 2) return { r: NaN, sb: NaN };
    const odd = cols.filter((_, i) => i % 2 === 0), even = cols.filter((_, i) => i % 2 === 1);
    const r = cor(rowSums(odd), rowSums(even));
    return { r, sb: (2 * r) / (1 + r) };
  }
  function avgInterItem(R) {
    let s = 0, n = 0;
    for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length; j++) { s += R[i][j]; n++; }
    return n ? s / n : NaN;
  }
  function reliability(cols) {
    const R = corMatrix(cols);
    const sh = splitHalf(cols);
    return { k: cols.length, alpha: alpha(cols), splitHalf: sh.r, spearmanBrown: sh.sb, avgR: avgInterItem(R) };
  }
  function itemAnalysis(cols) {
    // per item: facility (mean), SD, corrected item-total r, alpha if deleted
    const total = rowSums(cols);
    return cols.map((c, k) => {
      const rest = total.map((t, i) => t - c[i]);
      const others = cols.filter((_, j) => j !== k);
      return {
        mean: mean(c), sd: Math.sqrt(variance(c)),
        citc: cor(c, rest),
        alphaIfDeleted: others.length >= 2 ? alpha(others) : NaN,
      };
    });
  }

  // ------------------------------------------------------------ glasso
  // Friedman, Hastie & Tibshirani (2008) block coordinate descent, unpenalized diagonal.
  function glasso(S, rho, warm) {
    const p = S.length;
    const W = warm ? warm.W.map((r) => r.slice()) : S.map((r) => r.slice());
    const B = warm ? warm.B.map((r) => r.slice()) : Array.from({ length: p }, () => new Array(p).fill(0));
    let shr = 0;
    for (let i = 0; i < p; i++) for (let j = 0; j < p; j++) if (i !== j) shr += Math.abs(S[i][j]);
    shr = shr / (p * (p - 1)) || 1;
    const thr = 1e-4 * shr;
    for (let i = 0; i < p; i++) W[i][i] = S[i][i];
    for (let iter = 0; iter < 200; iter++) {
      let dlx = 0;
      for (let j = 0; j < p; j++) {
        // lasso: min 1/2 b' W11 b - s12' b + rho |b|_1, b indexed over k != j (stored in B[j])
        const b = B[j];
        for (let inner = 0; inner < 1000; inner++) {
          let dmax = 0;
          for (let k = 0; k < p; k++) {
            if (k === j) continue;
            let r = S[k][j];
            for (let l = 0; l < p; l++) if (l !== j && l !== k) r -= W[k][l] * b[l];
            const a = Math.abs(r) - rho;
            const nb = a > 0 ? Math.sign(r) * a / W[k][k] : 0;
            const d = nb - b[k];
            if (d !== 0) { b[k] = nb; dmax = Math.max(dmax, Math.abs(d)); }
          }
          if (dmax < thr) break;
        }
        // w12 = W11 b
        for (let k = 0; k < p; k++) {
          if (k === j) continue;
          let s = 0;
          for (let l = 0; l < p; l++) if (l !== j) s += W[k][l] * b[l];
          dlx += Math.abs(s - W[k][j]);
          W[k][j] = W[j][k] = s;
        }
      }
      if (dlx / p < thr) break;
    }
    // precision matrix
    const K = Array.from({ length: p }, () => new Array(p).fill(0));
    for (let j = 0; j < p; j++) {
      let s = 0;
      for (let k = 0; k < p; k++) if (k !== j) s += W[k][j] * B[j][k];
      const t = 1 / (W[j][j] - s);
      K[j][j] = t;
      for (let k = 0; k < p; k++) if (k !== j) K[k][j] = -B[j][k] * t;
    }
    return { W, B, K };
  }
  function logdet(M) {
    // Cholesky-free LU log|det| for small matrices
    const n = M.length, A = M.map((r) => r.slice());
    let ld = 0;
    for (let c = 0; c < n; c++) {
      let piv = c;
      for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
      if (A[piv][c] === 0) return -Infinity;
      if (piv !== c) { const t = A[piv]; A[piv] = A[c]; A[c] = t; }
      ld += Math.log(Math.abs(A[c][c]));
      for (let r = c + 1; r < n; r++) {
        const f = A[r][c] / A[c][c];
        for (let k = c; k < n; k++) A[r][k] -= f * A[c][k];
      }
    }
    return ld;
  }
  function ebicGlasso(S, n, opts) {
    opts = opts || {};
    const gamma = opts.gamma ?? 0.5, nlambda = opts.nlambda ?? 100, ratio = opts.lambdaMinRatio ?? 0.1;
    const p = S.length;
    let lmax = 0;
    for (let i = 0; i < p; i++) for (let j = 0; j < p; j++) if (i !== j) lmax = Math.max(lmax, Math.abs(S[i][j]));
    const lmin = ratio * lmax;
    const lambdas = [];
    for (let i = 0; i < nlambda; i++) lambdas.push(Math.exp(Math.log(lmin) + (i * (Math.log(lmax) - Math.log(lmin))) / (nlambda - 1)));
    let best = null, warm = null;
    // path from the largest lambda down (warm starts)
    const fits = new Array(nlambda);
    for (let i = nlambda - 1; i >= 0; i--) {
      const fit = glasso(S, lambdas[i], warm);
      warm = fit; fits[i] = fit;
    }
    for (let i = 0; i < nlambda; i++) {
      const K = fits[i].K;
      let tr = 0;
      for (let a = 0; a < p; a++) for (let b = 0; b < p; b++) tr += S[a][b] * K[b][a];
      const lik = (n / 2) * (logdet(K) - tr);
      let nz = 0;
      for (let a = 0; a < p; a++) for (let b = 0; b < p; b++) if (K[a][b] !== 0) nz++;
      const E = nz * 0.5;
      const ebic = -2 * lik + E * Math.log(n) + 4 * E * gamma * Math.log(p);
      if (!best || ebic < best.ebic) best = { ebic, lambda: lambdas[i], K, index: i };
    }
    // partial correlations, symmetric (upper triangle, as Matrix::forceSymmetric)
    const K = best.K, P = Array.from({ length: p }, () => new Array(p).fill(0));
    for (let a = 0; a < p; a++) for (let b = a + 1; b < p; b++) {
      const v = -K[a][b] / Math.sqrt(K[a][a] * K[b][b]);
      P[a][b] = P[b][a] = Math.abs(v) < 1e-12 ? 0 : v;
    }
    return { network: P, lambda: best.lambda, ebic: best.ebic };
  }

  // ------------------------------------------------------------ walktrap
  // Port of igraph's walktrap (Pons & Latapy, 2006): self-loop of mean edge weight,
  // random walks of length t, Ward-like merging on delta-sigma with lazy exact
  // updates, membership at the maximum modularity.
  function walktrap(Wm, steps) {
    steps = steps || 4;
    const n = Wm.length;
    const adj = Array.from({ length: n }, () => []);
    let Gtotal = 0;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const w = Math.abs(Wm[i][j]);
      if (w > 0) { adj[i].push([j, w]); adj[j].push([i, w]); Gtotal += w; }
    }
    const d = new Array(n);
    const nbrs = new Array(n);
    for (let i = 0; i < n; i++) {
      const deg = adj[i].length;
      const tw = adj[i].reduce((s, e) => s + e[1], 0);
      const loop = deg === 0 ? 1 : tw / deg;
      nbrs[i] = [[i, loop]].concat(adj[i]).sort((a, b) => a[0] - b[0]);
      d[i] = tw + loop;
    }
    function walk(members) {
      let v = new Array(n).fill(0);
      members.forEach((m) => { v[m] = 1 / members.length; });
      for (let t = 0; t < steps; t++) {
        const nv = new Array(n).fill(0);
        for (let i = 0; i < n; i++) if (v[i] !== 0) {
          const pr = v[i] / d[i];
          for (const [j, w] of nbrs[i]) nv[j] += pr * w;
        }
        v = nv;
      }
      return v.map((x, i) => x / Math.sqrt(d[i]));
    }
    const comm = [];   // {members, size, P, tot, inw, alive}
    for (let i = 0; i < n; i++) {
      comm.push({ members: [i], size: 1, P: null, tot: adj[i].reduce((s, e) => s + e[1] / 2, 0), inw: 0, alive: true });
    }
    const getP = (c) => (comm[c].P || (comm[c].P = walk(comm[c].members)));
    function dsExact(c1, c2) {
      const P1 = getP(c1), P2 = getP(c2);
      let s = 0;
      for (let i = 0; i < n; i++) { const z = P1[i] - P2[i]; s += z * z; }
      return (s * comm[c1].size * comm[c2].size) / (comm[c1].size + comm[c2].size);
    }
    // neighbor map: key "a|b" (a<b) -> {a,b,ds,exact,w}
    const N = new Map();
    const key = (a, b) => (a < b ? a + "|" + b : b + "|" + a);
    for (let i = 0; i < n; i++) for (const [j, w] of adj[i]) if (i < j) {
      N.set(key(i, j), { a: i, b: j, ds: -1 / Math.min(nbrs[i].length, nbrs[j].length), exact: false, w });
    }
    const modularity = () => {
      let Q = 0;
      for (const c of comm) if (c.alive) Q += c.inw - (c.tot * c.tot) / Gtotal;
      return Q / Gtotal;
    };
    function first() {
      let best = null;
      for (const nb of N.values()) if (!best || nb.ds < best.ds) best = nb;
      return best;
    }
    if (N.size === 0) return { membership: new Array(n).fill(null), modularity: NaN };
    let nb = first();
    while (!nb.exact) { nb.ds = dsExact(nb.a, nb.b); nb.exact = true; nb = first(); }
    const merges = [], Qs = [modularity()];
    while (N.size) {
      nb = first();
      while (!nb.exact) { nb.ds = dsExact(nb.a, nb.b); nb.exact = true; nb = first(); }
      const c1 = nb.a, c2 = nb.b, ds12 = nb.ds;
      N.delete(key(c1, c2));
      const id = comm.length;
      const s1 = comm[c1].size, s2 = comm[c2].size;
      let P = null;
      if (comm[c1].P && comm[c2].P) {
        const w1 = s1 / (s1 + s2), w2 = s2 / (s1 + s2);
        P = comm[c1].P.map((x, i) => x * w1 + comm[c2].P[i] * w2);
      }
      comm.push({
        members: comm[c1].members.concat(comm[c2].members), size: s1 + s2, P,
        tot: comm[c1].tot + comm[c2].tot, inw: comm[c1].inw + comm[c2].inw + nb.w, alive: true,
      });
      comm[c1].alive = comm[c2].alive = false; comm[c1].P = comm[c2].P = null;
      // collect neighbors of c1 and c2
      const n1 = new Map(), n2 = new Map();
      for (const [k, v] of N) {
        if (v.a === c1 || v.b === c1) { n1.set(v.a === c1 ? v.b : v.a, v); N.delete(k); }
        else if (v.a === c2 || v.b === c2) { n2.set(v.a === c2 ? v.b : v.a, v); N.delete(k); }
      }
      const all = new Set([...n1.keys(), ...n2.keys()]);
      for (const c3 of all) {
        const s3 = comm[c3].size;
        const e1 = n1.get(c3), e2 = n2.get(c3);
        let ds, exact, w;
        if (e1 && e2) {
          ds = ((s1 + s3) * e1.ds + (s2 + s3) * e2.ds - s3 * ds12) / (s1 + s2 + s3);
          exact = e1.exact && e2.exact; w = e1.w + e2.w;
        } else if (e1) {
          ds = ((s1 + s3) * e1.ds + s2 * ds12) / (s1 + s2 + s3); exact = false; w = e1.w;
        } else {
          ds = (s1 * ds12 + (s2 + s3) * e2.ds) / (s1 + s2 + s3); exact = false; w = e2.w;
        }
        N.set(key(c3, id), { a: Math.min(c3, id), b: Math.max(c3, id), ds, exact, w });
      }
      merges.push([c1, c2]);
      Qs.push(modularity());
    }
    // membership at the first maximum of modularity
    let m = 0;
    for (let i = 1; i < Qs.length; i++) if (Qs[i] > Qs[m]) m = i;
    const parent = Array.from({ length: n }, (_, i) => i);
    const uf = (x) => (parent[x] === x ? x : (parent[x] = uf(parent[x])));
    // replay the first m merges on the original vertices
    const rep = comm.map((c) => c.members[0]);
    for (let i = 0; i < m; i++) {
      const [a, b] = merges[i];
      parent[uf(rep[b])] = uf(rep[a]);
    }
    const lab = new Map(), membership = new Array(n);
    for (let i = 0; i < n; i++) {
      const r = uf(i);
      if (!lab.has(r)) lab.set(r, lab.size + 1);
      membership[i] = lab.get(r);
    }
    return { membership, modularity: Qs[m] };
  }

  function ega(cols, opts) {
    opts = opts || {};
    const n = cols[0].length, R = corMatrix(cols);
    // EGAnet's glasso_wrapper: if any node is disconnected, lower gamma (.50 -> .25 -> 0)
    let gamma = opts.gamma ?? 0.5, net;
    while (true) {
      net = ebicGlasso(R, n, Object.assign({}, opts, { gamma }));
      const disconnected = net.network.some((r) => r.every((v) => v === 0));
      if (disconnected && gamma > 0) gamma -= 0.25; else break;
    }
    const p = R.length;
    const strength = net.network.map((r) => r.reduce((s, v) => s + Math.abs(v), 0));
    let wt = walktrap(net.network, opts.steps || 4);
    let wc = wt.membership.map((m, i) => (strength[i] === 0 ? null : m));
    // singleton communities -> NA (EGAnet allow.singleton = FALSE)
    const freq = {};
    wc.forEach((m) => { if (m != null) freq[m] = (freq[m] || 0) + 1; });
    wc = wc.map((m) => (m != null && freq[m] === 1 ? null : m));
    // re-index in order of appearance
    const map = new Map();
    wc = wc.map((m) => { if (m == null) return null; if (!map.has(m)) map.set(m, map.size + 1); return map.get(m); });
    return { R, network: net.network, lambda: net.lambda, gamma, wc, nDim: map.size, modularity: wt.modularity };
  }

  // structural match: communities vs intended facets
  function structuralMatch(wc, facets) {
    // home community of each facet = community holding most of its items (ties: lowest id)
    const facs = [...new Set(facets)];
    const home = {};
    facs.forEach((f) => {
      const cnt = {};
      wc.forEach((c, i) => { if (facets[i] === f && c != null) cnt[c] = (cnt[c] || 0) + 1; });
      const ks = Object.keys(cnt).map(Number).sort((a, b) => cnt[b] - cnt[a] || a - b);
      home[f] = ks.length ? ks[0] : null;
    });
    const owners = {};
    facs.forEach((f) => { if (home[f] != null) (owners[home[f]] = owners[home[f]] || []).push(f); });
    const merged = Object.values(owners).filter((o) => o.length > 1).flat();
    const fit = wc.map((c, i) => c != null && c === home[facets[i]] && !merged.includes(facets[i]));
    return { home, merged, fit, nFit: fit.filter(Boolean).length };
  }

  // adjusted Rand index (for the instructor console / validation)
  function ari(a, b) {
    const idx = a.map((_, i) => i).filter((i) => a[i] != null && b[i] != null);
    const A = idx.map((i) => a[i]), B = idx.map((i) => b[i]);
    const n = A.length, tab = {}, ra = {}, rb = {};
    A.forEach((x, i) => { const k = x + "|" + B[i]; tab[k] = (tab[k] || 0) + 1; ra[x] = (ra[x] || 0) + 1; rb[B[i]] = (rb[B[i]] || 0) + 1; });
    const c2 = (x) => (x * (x - 1)) / 2;
    const sij = Object.values(tab).reduce((s, v) => s + c2(v), 0);
    const sa = Object.values(ra).reduce((s, v) => s + c2(v), 0), sb = Object.values(rb).reduce((s, v) => s + c2(v), 0);
    const exp = (sa * sb) / c2(n), mx = (sa + sb) / 2;
    return mx === exp ? 1 : (sij - exp) / (mx - exp);
  }

  const Engine = { fnv1a, mulberry32, shuffle, mean, variance, cor, corMatrix, alpha, splitHalf, avgInterItem,
    reliability, itemAnalysis, glasso, ebicGlasso, walktrap, ega, structuralMatch, ari };
  if (typeof module !== "undefined" && module.exports) module.exports = Engine;
  else root.Engine = Engine;
})(typeof window !== "undefined" ? window : globalThis);
