/* Break It, Fix It · a follow-up to the Construct Lab
   Research Methods & Data Analysis I · University of Virginia
   Everything runs in the browser. Nothing leaves the device until the ticket is uploaded. */
(function () {
  "use strict";
  const D = window.BREAK_DATA, E = window.Engine, K = window.BreakCore.make(D, E);
  const APP_VERSION = "1.1.0", SALT = "break-it|2026";
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const f2 = (x) => (x == null || !isFinite(x) ? "–" : x.toFixed(2).replace(/^(-?)0\./, "$1."));
  const words = (s) => (String(s || "").trim().match(/\S+/g) || []).length;
  const FHEX = ["#2a6fb0", "#b9861a", "#2f8f5f", "#7a58b0", "#c94f78", "#23898c"];
  const TRAIT = { C: "Conscientiousness", O: "Openness" };
  const FACET = { "self-efficacy": "Self-efficacy", "achievement-striving": "Achievement-striving", perseverance: "Perseverance",
    introspection: "Introspection", aesthetics: "Aesthetics", "abstract-thinking": "Abstract thinking" };
  const fname = (fi) => FACET[D.facets[fi]];
  const other = (t) => (t === "C" ? "O" : "C");
  const CRIT = { C: "percent of assignments turned in on time this semester", O: "arts and culture events attended this semester" };
  const GROUP = { C: ["keep a written planner", "do not"], O: ["have taken an art or music course", "have not"] };
  const MIN_WORDS = 30;
  const V = window.BreakViz.make({ D, K, E, MAP: window.BREAK_MAP, FHEX, fname: (fi) => FACET[D.facets[fi]], esc, f2 });
  // drawing jobs: views leave an empty <svg id> and a function; render() runs the functions after the HTML is in place
  const jobs = [];
  function vz(fn) { const id = "vz" + jobs.length; jobs.push([id, fn]); return id; }

  // ---------------------------------------------------------------- definitions (consulted from every screen)
  const DEFS = [
    ["Reliability", "How consistent the scores are when the measurement is repeated. Always ask: repeated over what? Over items (α), over occasions (test-retest), over raters, over forms."],
    ["Cronbach's alpha (α)", "Internal consistency: how much the items of a scale agree with each other on one occasion. α = k/(k − 1) × (1 − sum of the item variances / variance of the total score), where k is the number of items. It rises with more items and with items that repeat each other, so a high α does not show that the items measure one thing, or the right thing."],
    ["Test-retest reliability", "The correlation between the same people's total scores on two occasions. It repeats over time, not over items. A trait should give similar scores two weeks apart; a mood should not. α cannot tell the two apart."],
    ["Standard error of measurement (SEM)", "The typical distance between a person's observed score and their true score: SEM = SD × √(1 − α). Here it is shown in points and as a percentage of the possible score range, so scales of different lengths can be compared. Smaller is more precise."],
    ["Validity", "The degree to which evidence and theory support the interpretation of the scores for a proposed use (AERA, APA & NCME, 2014). Validity belongs to an interpretation and a use, not to the test, and it is built from several kinds of evidence."],
    ["Face validity", "Whether the people who take and use the test accept the items as appropriate for the purpose. It matters for cooperation, but it is not evidence about what the score measures (Rust et al., 2020, p. 43)."],
    ["Content validity", "Whether the items cover what the test specification says they should, and nothing else. On the board: how many facets of the trait still have at least two items, and whether items from outside the trait were added."],
    ["Structural validity (EGA)", "Evidence from the internal structure: do the items group the way the blueprint says? EGA estimates a network of partial correlations and finds communities of items. The board counts how many items sit in their own facet's community."],
    ["Convergent validity", "The score should correlate with other measures of the same trait. Here: a friend's rating of the person on the same trait."],
    ["Discriminant validity", "The score should correlate less with measures of different traits than with measures of the same trait. Here: the correlation with a separate 12-item measure of the other trait. Rust et al. call this divergent validity; together with convergent evidence it is called differential validity."],
    ["Criterion validity", "The score should relate to an outcome it is supposed to predict or accompany. Concurrent: outcome measured at the same time. Predictive: outcome measured later. Here: " + "Conscientiousness, " + CRIT.C + "; Openness, " + CRIT.O + "."],
    ["Known-groups validity", "Groups that should differ on the trait should get different scores. Shown as Cohen's d, the difference between the group means in standard deviation units. Here: Conscientiousness, students who keep a written planner vs. those who do not; Openness, students who have taken an art or music course vs. those who have not."],
    ["Range restriction", "When outcome data exist only for a selected group (for example, the people who were hired), the scores in that group vary less, and correlations with the outcome shrink, even for a good test."],
    ["Social desirability", "Answering in the way that looks good rather than the way that is accurate. It is common when something is at stake, like a job. It is systematic error: it does not lower α, but it changes what the score means."],
    ["Trait vs. state", "A trait is how a person usually is; a state is how they are right now. Items worded as states (\"Today I feel…\") can agree with each other on one day (high α) and still change from week to week (low test-retest)."],
    ["Spearman–Brown", "Predicts the reliability of a longer or shorter test made of comparable items: new reliability = m × r / (1 + (m − 1) × r), where r is the current reliability and m is how many times longer the test becomes. Longer tests are more reliable, if the new items measure the same thing."],
    ["EGA network (how to read it)", "Each circle is an item, numbered as on your scale and colored by its facet. Lines are partial correlations: the link between two items after removing what all the other items share. Thicker lines are stronger links; red lines are negative. Shaded areas are the communities that the Walktrap algorithm finds. An orange ring marks an item that is not in its own facet's community. A dashed circle with a prime (3′) is a near-copy of item 3; a square is an item from the other trait; a dotted gold ring marks an item that asks about today."],
    ["Semantic map", "Each faint dot is one of the 539 items in the AI item bank, placed by meaning: OpenAI text-embedding-3-small vectors (1,536 numbers per item), reduced to two dimensions with UMAP, both traits together. Items that say similar things sit close together. The numbered markers are your scale's items. Near-copies are drawn next to their originals. The mood items were written for this lab and have no embedding, so they are listed below the map instead."],
    ["Correlation matrix (heat map)", "Every pair of items, with darker cells for higher correlations. Items of the same facet are next to each other, so a scale that measures its facets shows darker blocks along the diagonal. Near-copies show up as very dark single cells."],
    ["Scatter plot", "One dot per person. The line is the best-fitting straight line. The tighter the cloud around the line, the higher the correlation r. Each number on the board is a summary of a picture like this."],
    ["Near-copies (redundant items)", "Items that say almost the same thing. They raise α because they agree with each other, but they add no new content, and they can form their own small communities in EGA."],
  ];

  // ---------------------------------------------------------------- the board
  const GAUGE = {
    alpha: { name: "Cronbach's α", side: "rel", def: "Cronbach's alpha (α)", tol: [0.03, 0.05] },
    retest: { name: "Test-retest r", side: "rel", def: "Test-retest reliability", tol: [0.03, 0.05] },
    sem: { name: "SEM (% of score range)", side: "rel", def: "Standard error of measurement (SEM)", tol: [0.5, 1.0] },
    content: { name: "Content coverage", side: "val", def: "Content validity", tol: [0.5, 0.5] },
    structure: { name: "Structure (EGA)", side: "val", def: "Structural validity (EGA)", tol: [0.09, 0.15] },
    conv: { name: "Convergent r (friend's rating)", side: "val", def: "Convergent validity", tol: [0.03, 0.05] },
    disc: { name: "Discriminant r (other trait)", side: "val", def: "Discriminant validity", tol: [0.03, 0.05] },
    crit: { name: "Criterion r (outcome)", side: "val", def: "Criterion validity", tol: [0.03, 0.05] },
    known: { name: "Known groups (d)", side: "val", def: "Known-groups validity", tol: [0.08, 0.15] },
  };
  function gaugeValue(g, ev) {
    switch (g) {
      case "alpha": return ev.alpha;
      case "retest": return ev.retest;
      case "sem": return ev.semPct;
      case "content": return ev.covered;
      case "structure": return ev.structure ? ev.structure.nFit / ev.structure.k : NaN;
      default: return ev[g];
    }
  }
  function gaugeText(g, ev, sc) {
    const o = TRAIT[other(sc.trait)];
    switch (g) {
      case "alpha": return { v: f2(ev.alpha), sub: D.traits[sc.trait].map((fn) => { const fi = D.facets.indexOf(fn); return `${fname(fi)} ${f2(ev.facAlpha[fi])}`; }).join(" · ") };
      case "retest": return isFinite(ev.retest) ? { v: f2(ev.retest) + (ev.retestKind === "T2D" ? " (1 day)" : ""), sub: ev.retestKind === "T2D" ? "same people, one day later" : "same people, two weeks later" } : { v: "–", sub: "applicants answered once: no retest" };
      case "sem": return { v: `${ev.semPct.toFixed(1)}%`, sub: `of the score range: ± ${ev.sem.toFixed(1)} points on a ${ev.k}–${ev.k * ev.fmt} range` };
      case "content": return { v: `${ev.covered} of 3`, sub: ["facets with 2+ items", ev.offTrait ? `+ ${ev.offTrait} ${o} items` : "", ev.mood ? `${ev.mood} items ask about today` : ""].filter(Boolean).join(" · ") };
      case "structure": return { v: `${ev.structure.nFit} of ${ev.structure.k}`, sub: `items sit with their own facet · ${ev.structure.nDim} communities` };
      case "conv": return { v: f2(ev.conv), sub: `with a friend's rating of ${TRAIT[sc.trait].toLowerCase()}` };
      case "disc": return { v: f2(ev.disc), sub: `with a ${o.toLowerCase()} measure (lower is better)` };
      case "crit": return { v: f2(ev.crit), sub: `with ${CRIT[sc.trait]}${ev.critN < K.N ? ` · hired only (n = ${ev.critN})` : ""}` };
      case "known": return { v: f2(ev.known), sub: `students who ${GROUP[sc.trait][0]} vs. ${GROUP[sc.trait][1]}` };
    }
  }
  function verdictClass(g, ev) {
    const v = gaugeValue(g, ev);
    if (!isFinite(v)) return "";
    if (g === "alpha" || g === "retest") return v >= 0.8 ? "good" : v >= 0.7 ? "ok" : "bad";
    if (g === "content") return v === 3 && !ev.offTrait && !ev.mood ? "good" : "bad";
    if (g === "structure") return v >= 0.9 && ev.structure.nDim === 3 ? "good" : v >= 0.75 ? "ok" : "bad";
    if (g === "disc") return v <= 0.25 ? "good" : v <= 0.4 ? "ok" : "bad";
    if (g === "sem") return v <= 6 ? "good" : v <= 9 ? "ok" : "bad";
    if (g === "known") return v >= 0.5 ? "good" : v >= 0.3 ? "ok" : "bad";
    return v >= 0.4 ? "good" : v >= 0.25 ? "ok" : "bad";
  }
  function board(sc, ev, opts) {
    opts = opts || {};
    const tile = (g) => {
      const t = gaugeText(g, ev, sc), hl = opts.highlight && opts.highlight.includes(g);
      return `<div class="gauge ${verdictClass(g, ev)} ${hl ? "hl" : ""}"><div class="gname">${GAUGE[g].name}<button class="info" data-def="${esc(GAUGE[g].def)}" aria-label="Definition: ${esc(GAUGE[g].def)}">i</button></div>
        <div class="gval">${t.v}</div>${V.mini(g, gaugeValue(g, ev))}<div class="gsub">${esc(t.sub)}</div></div>`;
    };
    return `<div class="board"><section><h4>Reliability evidence</h4>${["alpha", "retest", "sem"].map(tile).join("")}</section>
      <section><h4>Validity evidence</h4>${["content", "structure", "conv", "disc", "crit", "known"].map(tile).join("")}</section></div>`;
  }
  function compareTable(sc0, ev0, sc1, ev1, focus, preds, lesson) {
    const rows = Object.keys(GAUGE).map((g) => {
      const a = gaugeText(g, ev0, sc0), b = gaugeText(g, ev1, sc1);
      const isF = focus.includes(g);
      let mark = "";
      if (isF && preds) { const ok = truth(g, ev0, ev1).includes(preds[g]); mark = `<span class="chip ${ok ? "g" : "b"}">${ok ? "your prediction ✓" : "your prediction ✗"}</span>`; }
      return `<tr class="${isF ? "focus" : ""}"><th>${GAUGE[g].name}<button class="info" data-def="${esc(GAUGE[g].def)}" aria-label="Definition">i</button></th><td class="num">${a.v}</td><td class="arrow">${arrowFor(g, ev0, ev1)}</td><td class="num"><b>${b.v}</b></td><td>${mark}${isF && lesson[g] ? `<div class="why">${lesson[g]}</div>` : ""}</td></tr>`;
    }).join("");
    return `<div class="tbl-wrap"><table class="data cmp"><thead><tr><th>Evidence</th><th class="num">Before</th><th></th><th class="num">After</th><th>What happened</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }
  // ---------------------------------------------------------------- pictures
  const VIEWS = {
    net: ["EGA network", "EGA network (how to read it)"], map: ["Semantic map", "Semantic map"], heat: ["Correlations", "Correlation matrix (heat map)"],
    retest: ["Test-retest plot", "Test-retest reliability"], sem: ["Score precision (SEM)", "Standard error of measurement (SEM)"], conv: ["Friend's rating", "Convergent validity"],
    disc: ["Other-trait measure", "Discriminant validity"], crit: ["Outcome", "Criterion validity"], known: ["Known groups", "Known-groups validity"],
  };
  const VIEW_NOTE = {
    net: "Hover or tap an item to see its wording and its strongest links.",
    map: "Faint dots: the whole item bank. Numbered markers: the items on this scale.",
    heat: "Darker cells: items that correlate more. Hover a cell for the value.",
    retest: "Each dot is one person: score the first time (across) and the second time (up).",
    sem: "Bars: how many people got each total score. Orange: the band where a person's true score probably lies.",
    conv: "Each dot is one person: self-report score (across) and a friend's rating (up).",
    disc: "Each dot is one person: this scale (across) and a measure of the other trait (up). A flat cloud is what you want here.",
    crit: "Each dot is one person: score (across) and the outcome (up).",
    known: "Each dot is one person. The black lines are the group means.",
  };
  // draws one view of one scale into an svg; side = {pos} carries the network layout from "before" to "after"
  function drawView(view, svg, sc, e, side, extra) {
    const vec = K.vectors(sc), T = TRAIT[sc.trait];
    const capEl = svg && svg.parentElement && svg.parentElement.querySelector(".vcap");
    if (view === "net") { const pos = V.network(svg, sc, e, { init: side && side.pos, caption: capEl }); if (side && !side.pos) side.pos = pos; if (capEl && !capEl.innerHTML) capEl.innerHTML = `<span class="small muted">${e.structure.nDim} communities · ${e.structure.nFit} of ${e.structure.k} items with their own facet. Hover or tap an item.</span>`; return; }
    if (view === "map") { V.semmap(svg, sc, { tray: capEl, removed: extra && extra.removed }); return; }
    if (view === "heat") { V.heat(svg, sc, e); return; }
    const scoreLab = `${T} score (${vec.min}–${vec.max})`;
    if (view === "retest") {
      if (!vec.retest) { svg.setAttribute("viewBox", "0 0 340 260"); svg.innerHTML = `<rect width="340" height="260" fill="#f6f8fb"/><text x="170" y="125" text-anchor="middle" font-size="13" fill="#5b6880">Applicants answered once:</text><text x="170" y="145" text-anchor="middle" font-size="13" fill="#5b6880">there is no retest.</text>`; return; }
      V.scatter(svg, { x: vec.tot, y: vec.retest, title: "Test-retest", r: e.retest, xlab: "score, first time", ylab: vec.retestKind === "T2D" ? "score, one day later" : "score, two weeks later" }); return;
    }
    if (view === "conv") { V.scatter(svg, { x: vec.tot, y: vec.peer, title: "Convergent", r: e.conv, xlab: scoreLab, ylab: `friend's rating of ${T.toLowerCase()}`, fixY: extra && extra.fixY && extra.fixY.peer, color: "#2f8f5f" }); return; }
    if (view === "disc") { V.scatter(svg, { x: vec.tot, y: vec.otherTot, title: "Discriminant", r: e.disc, xlab: scoreLab, ylab: `${TRAIT[other(sc.trait)].toLowerCase()} measure`, fixY: extra && extra.fixY && extra.fixY.other, color: "#7a58b0" }); return; }
    if (view === "crit") {
      const o = { x: vec.tot, y: vec.crit, title: "Criterion", r: e.crit, xlab: sc.hire ? `${T} score as an applicant` : scoreLab, ylab: sc.trait === "C" ? "% assignments on time" : "arts events attended", fixY: extra && extra.fixY && extra.fixY.crit, color: "#b9861a" };
      if (vec.hired) { o.show = vec.hired; o.rug = vec.hired.map((h) => !h); o.cut = Math.min(...vec.tot.filter((_, i) => vec.hired[i])) - 0.5; o.n = e.critN; }
      V.scatter(svg, o); return;
    }
    if (view === "known") { V.groups(svg, { x: vec.tot, grp: vec.grp, d: e.known, title: "Known groups", labels: sc.trait === "C" ? ["planner", "no planner"] : ["art course", "no course"], xlab: scoreLab }); return; }
    if (view === "sem") { const t = V.dist(svg, { x: vec.tot, min: vec.min, max: vec.max, sem: e.sem, semPct: e.semPct, title: "Score precision", xlab: scoreLab }); if (capEl) capEl.textContent = t; }
  }
  function fixYFor(scs) {
    const all = (f) => { const v = scs.flatMap((sc) => { const x = K.vectors(sc); const s = x.hired || x.tot.map(() => true); return f(x).filter((_, i) => s[i] || !x.hired); }); const lo = Math.min(...v), hi = Math.max(...v), p = (hi - lo) * 0.04; return [lo - p, hi + p]; };
    return { peer: all((x) => x.peer), crit: all((x) => x.crit), other: all((x) => x.otherTot) };
  }
  function tabsHTML(key, views) {
    const cur = ui.tab[key] && views.includes(ui.tab[key]) ? ui.tab[key] : views[0];
    return { cur, html: `<div class="tabs vtabs" role="tablist">${views.map((v) => `<button role="tab" data-vtab="${key},${v}" aria-selected="${v === cur}">${VIEWS[v][0]}</button>`).join("")}<button class="info" data-def="${esc(VIEWS[cur][1])}" aria-label="How to read: ${esc(VIEWS[cur][0])}">i</button></div>` };
  }
  // one scale, several views
  function scaleViews(key, sc, e, views) {
    const t = tabsHTML(key, views), big = ["net", "map", "heat"].includes(t.cur);
    const id = vz((svg) => drawView(t.cur, svg, sc, e, {}));
    return `${t.html}<div class="vwrap ${big ? "big" : "small1"}"><svg id="${id}" role="img" aria-label="${esc(VIEWS[t.cur][0])} of your scale"></svg><div class="vcap small"></div></div><p class="hint">${VIEW_NOTE[t.cur]}</p>`;
  }
  // two scales side by side, same view
  function pairViews(key, scA, eA, labA, scB, eB, labB, views) {
    const t = tabsHTML(key, views), side = {};
    const removed = scA.items.map((x) => x.c).filter((c) => !scB.items.some((y) => y.c === c));
    const fixY = fixYFor([scA, scB]);
    const idA = vz((svg) => drawView(t.cur, svg, scA, eA, side, { fixY }));
    const idB = vz((svg) => drawView(t.cur, svg, scB, eB, side, { fixY, removed }));
    const cell = (id, lab, cls) => `<figure class="vfig ${cls}"><figcaption>${lab}</figcaption><svg id="${id}" role="img" aria-label="${esc(VIEWS[t.cur][0])}: ${esc(lab)}"></svg><div class="vcap small"></div></figure>`;
    return `${t.html}<div class="vpair">${cell(idA, labA, "before")}${cell(idB, labB, "after")}</div><p class="hint">${VIEW_NOTE[t.cur]}</p>`;
  }
  function dumbRows(sc0, e0, sc1, e1, focus, preds) {
    return Object.keys(GAUGE).map((g) => ({ g, name: GAUGE[g].name.replace(/ \(.*\)$/, ""), a: gaugeValue(g, e0), b: gaugeValue(g, e1), ta: gaugeText(g, e0, sc0).v, tb: gaugeText(g, e1, sc1).v,
      focus: focus.includes(g), ok: preds && focus.includes(g) ? truth(g, e0, e1).includes(preds[g]) : null }));
  }
  function dumbHTML(rows) { const id = vz((svg) => V.dumbbell(svg, rows)); return `<div class="vwrap dumbw"><svg id="${id}" role="img" aria-label="Every number on the board, before and after"></svg></div>`; }
  const direction = (g, a, b) => K.direction(g, a, b);
  const truth = (g, a, b) => K.truth(g, a, b);
  function arrowFor(g, ev0, ev1) {
    const d = direction(g, ev0, ev1);
    return d === "na" ? "" : d.startsWith("up") ? "↑" : d.startsWith("down") ? "↓" : "→";
  }

  // ---------------------------------------------------------------- the six breaks
  function BREAKS(sc) {
    const t = sc.trait, o = TRAIT[other(t)], T = TRAIT[t];
    const dropF = fname(K.dropFacet(t));
    const fmtWord = `${sc.fmt} options`;
    return [
      { key: "pad", views: ["net", "heat", "map"], round: 1, title: "Pad it",
        story: `A colleague wants a higher α for the report. They add four reworded copies of items already on the scale. Each copy says the same thing as its original in slightly different words.`,
        list: (s) => { const L = V.labels(s); return K.picks(s).map((x) => `Item ${L[x.c]}′, a reworded copy of item ${L[x.c]}: “${esc(K.ITEM[x.c].s)}”`); },
        predict: ["alpha", "retest", "conv", "structure"],
        lesson: {
          alpha: "Near-copies agree with their originals almost perfectly, and α rewards agreement. α goes up although the scale says nothing new.",
          retest: "The copies repeat what the originals already measure, so the scores are no more and no less stable over two weeks.",
          conv: "A friend's rating tracks the trait, not the wording. The copies add no new information about the trait, so this correlation barely moves.",
          structure: "Each copy and its original form a tight pair, and EGA treats some pairs as small communities of their own. The facets no longer come out cleanly.",
        },
        fixes: [
          ["a", "Remove the four copies.", "fixed", "Without the copies, α returns to its earlier value and EGA finds your facets again. α was higher with the copies, but the scale was not better."],
          ["b", "Keep them: α is higher, so the scale is better.", "no", "A higher α here comes from repetition, not from better measurement. Friend and outcome links did not improve, and the structure is still broken."],
          ["c", "Add four more copies to raise α even further.", "no", "α rises again and the structure gets worse. Repeating items makes the problem bigger."],
        ] },
      { key: "mood", views: ["retest", "conv", "net", "heat"], round: 1, title: "Make it a mood",
        story: `To make the survey feel more current, four items are reworded to ask about today instead of about how the person usually is.`,
        list: (s) => K.SAB.mood(s).items.filter((x) => K.ITEM[x.c] && K.ITEM[x.c].mood).map((x) => `New item (${fname(x.f)}): “${esc(K.ITEM[x.c].s)}”`),
        predict: ["alpha", "retest", "conv", "crit"],
        lesson: {
          alpha: "The mood items still agree with each other on the day of testing, so α moves much less than test-retest does. α comes from one occasion and cannot see that moods change.",
          retest: "Two weeks later the mood is different, so the mood items get different answers. Test-retest reliability drops, and α gave no warning.",
          conv: "A friend rates how the person usually is, not how they felt today, so the scale agrees less with the friend.",
          crit: `The outcome (${CRIT[t]}) depends on the stable trait, not on one day's mood, so the link with the outcome weakens.`,
        },
        fixes: [
          ["a", "Change the four items back to trait wording (“I am someone who…”).", "fixed", "Trait wording asks how people usually are, so the scores are stable over two weeks again and agree with friends and with the outcome."],
          ["b", "Keep the mood items, but retest after one day instead of two weeks.", "partly", "Test-retest looks fine again, but only because one day is too short for moods to change. The scale still measures today's mood: the friend and outcome links stay low. The retest interval has to match the claim: a trait should be stable for weeks."],
          ["c", "Reword the other mood items in too, so all the items match.", "no", "More mood items make the scores even less stable over two weeks, and the friend and outcome links fall further. α stays about the same."],
        ] },
      { key: "tf", views: ["sem", "retest", "net"], round: 1, title: "Two options",
        story: `To make the survey faster, every item now has only two options: True or False.`,
        list: () => [`Before: ${fmtWord}. After: True / False.`],
        predict: ["alpha", "retest", "sem"],
        lesson: {
          alpha: "With two options, people who agree a little and people who agree strongly give the same answer. Each item carries less information, so the items agree less.",
          retest: "People near the middle flip between True and False from one occasion to the next, so the scores are less stable.",
          sem: "The error is larger relative to what the scale can measure, so each person's score is less precise.",
        },
        fixes: [
          ["a", `Go back to ${fmtWord}.`, "fixed", "With more options people can say how strongly they agree, and α, test-retest and precision recover."],
          ["b", "Keep True / False and add six more items.", "partly", "It works, at a cost: six more items bring α back (Spearman–Brown: a longer test of comparable items is more reliable), but every respondent now answers 18 items instead of 12."],
          ["c", "Keep True / False and retest after one day.", "no", "Retesting after one day raises test-retest, but α and precision stay low. The problem is the response format, not the interval."],
        ] },
      { key: "mix", views: ["map", "net", "disc"], round: 2, title: "Mix in the other trait",
        story: `A collaborator adds four items they had lying around. They are good items, but they measure ${o}, not ${T}.`,
        list: () => [0, 4, 8, 1].map((j) => D.std[other(t)][j]).map((c) => `Added: “${esc(K.ITEM[c].s)}” (${o})`),
        predict: ["alpha", "retest", "disc", "structure"],
        lesson: {
          alpha: `${o} items correlate a little with ${T.toLowerCase()} items, so α drops only slightly. α cannot tell you that the scale now mixes two traits.`,
          retest: "Both traits are stable, so the mixed score is as stable as before. Stable does not mean it measures one thing.",
          disc: `The score now contains ${o.toLowerCase()} items, so it correlates more with the ${o.toLowerCase()} measure. Discriminant evidence should show the opposite.`,
          structure: `The ${o.toLowerCase()} items do not belong with any of your facets. EGA puts them in their own community or mixes them into yours, so fewer items sit with their own facet.`,
        },
        fixes: [
          ["a", `Remove the four ${o.toLowerCase()} items.`, "fixed", `The scale measures one trait again: the correlation with ${o.toLowerCase()} drops and your facets come back together.`],
          ["b", "Keep them: α is still above .70.", "no", "An α above .70 says the items agree enough. It does not say they measure the trait named on the scale."],
          ["c", `Rename it the “${T} and ${o} Scale”.`, "no", "Renaming does not change what the items measure. One total built from two traits cannot be read as either trait."],
        ] },
      { key: "hire", views: ["crit", "conv", "net"], round: 2, title: "Use it for hiring",
        story: `A campus office uses the scale to choose student assistants. Applicants answer it, the top 30% are hired, and a semester later the office checks the outcome (${CRIT[t]}) for the people it hired.`,
        list: () => ["Applicants know the scores matter.", "Outcome data exist only for the 90 people hired."],
        predict: ["alpha", "conv", "crit"],
        lesson: {
          alpha: "Applicants describe themselves favorably, some much more than others. That shared push adds agreement among the items, so α stays high or even rises.",
          conv: "Self-promotion changes the self-report but not the friend's view, so the two agree less.",
          crit: "Two things lower it: self-promotion adds error, and outcomes exist only for the people hired, whose scores are all high (range restriction).",
        },
        fixes: [
          ["a", "Use the scale only in an anonymous research survey, and collect the outcome for everyone.", "fixed", "With nothing to gain from looking good, people answer as they usually would, and the outcome is known for everyone: the friend and outcome links return."],
          ["b", "Be more selective: hire only the top 15%.", "no", "A smaller, more selected group narrows the range of scores even more, so the outcome link gets weaker, not stronger."],
          ["c", "Add four more items to make the score more reliable.", "no", "More items make the score more consistent, including the self-promotion in it. Length cannot fix a validity problem."],
        ] },
      { key: "drop", views: ["map", "net", "crit"], round: 2, title: "Drop a facet",
        story: `A reviewer says the scale is too long. You remove the four ${dropF.toLowerCase()} items and keep eight.`,
        list: (s) => s.items.filter((x) => x.f === K.dropFacet(t)).map((x) => `Removed: “${esc(K.ITEM[K.baseCode(x.c)].s)}”`),
        predict: ["content", "alpha", "structure", "crit"],
        lesson: {
          content: `A whole facet of ${T.toLowerCase()} is gone, so the scale no longer covers its blueprint. No statistic forces you to notice.`,
          alpha: "Fewer items usually means a lower α, but the remaining items still agree, so α can still look acceptable.",
          structure: "The two remaining facets still come out cleanly. A clean structure says nothing about what is missing.",
          crit: `${dropF} was the facet most related to the outcome, so the link with ${CRIT[t]} weakens.`,
        },
        fixes: [
          ["a", `Bring the four ${dropF.toLowerCase()} items back.`, "fixed", "All three facets are covered again, and the link with the outcome returns."],
          ["b", "Keep eight items and rename the scale after the two facets left.", "partly", `The new name is honest, but the scale no longer measures ${T.toLowerCase()} as your blueprint defines it, and it predicts the outcome less well.`],
          ["c", "Add four more items to the two remaining facets.", "no", "More items on the remaining facets raise α, but the missing facet is still missing. Length cannot replace content."],
        ] },
    ];
  }

  // ---------------------------------------------------------------- state
  const KEY = "break-it-v1";
  let S = null;
  const ui = { defs: false, defFocus: null, tab: {} };
  const memo = new Map();
  function ev(sc, skip) {
    const key = JSON.stringify(sc) + (skip ? "|s" : "");
    if (!memo.has(key)) memo.set(key, K.evidence(sc, { skipEGA: !!skip }));
    return memo.get(key);
  }
  function save() { try { localStorage.setItem(KEY + ":" + S.id, JSON.stringify(S)); } catch (e) { /* storage unavailable */ } }
  function load(id) { try { const s = localStorage.getItem(KEY + ":" + id); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
  // Construct Lab scale: from this browser's saved progress, or from the student's Construct Lab exit ticket.
  const CL_KEY = "construct-lab-v1:", CL_SALT = "construct-lab|2026";
  function clSaved(id) { try { const raw = localStorage.getItem(CL_KEY + id); return raw ? JSON.parse(raw) : null; } catch (e) { return null; } }
  function clOtherIds(id) {
    const out = [];
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(CL_KEY) && k !== CL_KEY + id) out.push(k.slice(CL_KEY.length)); } } catch (e) { /* storage unavailable */ }
    return out;
  }
  function makeCL(trait, fmt, items, from) {
    if (!(trait === "C" || trait === "O") || !Array.isArray(items) || items.length !== 12) return null;
    if (!items.every((x) => K.ITEM[x.c] && K.ITEM[x.c].t === trait)) return null;
    if (new Set(items.map((x) => x.c)).size !== 12) return null;
    return { trait, fmt: fmt >= 4 ? fmt : 5, items, origFmt: fmt, source: "construct-lab", from };
  }
  function constructLabScale(id) {
    const c = clSaved(id);
    if (!c || !c.final || c.final.length !== 12 || !c.trait || !c.placed) return null;
    try { return makeCL(c.trait, c.fmt, c.final.map((code) => ({ c: code, f: c.placed[code].f })), "browser"); } catch (e) { return null; }
  }
  // Why the automatic load failed, in plain words.
  function clDiagnosis(id) {
    const c = clSaved(id), others = clOtherIds(id);
    if (c && !(c.final && c.final.length === 12)) return `This browser has a Construct Lab session for <b>${esc(id)}</b>, but its final 12 items were never locked (it stopped at the ${c.stage >= 4 ? "pilot" : "earlier"} stage).`;
    if (others.length) return `This browser has Construct Lab progress for a different ID: <b>${others.map(esc).join(", ")}</b>. If that was you, sign in again with that ID, or load your exit ticket below.`;
    return "This browser has no saved Construct Lab progress. That happens with a different browser or computer, a private window, cleared browsing data, or (in Safari) a site not visited for seven days.";
  }
  // Read a Construct Lab exit ticket (the PDF or the .txt the student uploaded to Canvas).
  function parseCLTicket(text, id) {
    const m = /BEGIN-CONSTRUCT-LAB-TICKET(.*?)END-CONSTRUCT-LAB-TICKET/.exec(String(text).replace(/\s+/g, ""));
    if (!m) {
      if (/BEGIN-BREAK-IT-TICKET/.test(String(text).replace(/\s+/g, ""))) return { err: "This is a Break It, Fix It ticket. Choose the exit ticket from the Construct Lab (last week)." };
      return { err: "No Construct Lab ticket was found in this file. Choose the ExitTicket PDF or .txt you saved in the Construct Lab (a screenshot or a scan does not work)." };
    }
    const blob = m[1], b64 = blob.slice(0, -8), sig = blob.slice(-8);
    let json, t;
    try { json = decodeURIComponent(escape(atob(b64))); t = JSON.parse(json); } catch (e) { return { err: "The ticket in this file is damaged. Download it again from your Canvas submission, or use the .txt version." }; }
    if (E.fnv1a(CL_SALT + "|" + json).toString(16).toUpperCase().padStart(8, "0") !== sig) return { err: "This ticket's verification code does not match, so it was changed after it was made. Use the original file." };
    if (String(t.id || "").toLowerCase() !== id) return { err: `This ticket belongs to <b>${esc(t.id)}</b>, but you signed in as <b>${esc(id)}</b>. Use your own ticket, or sign in with the ID on the ticket.` };
    if (!Array.isArray(t.final) || t.final.length !== 12) return { err: "This ticket has no final 12-item scale (the lab was not finished when the ticket was made)." };
    const sc = makeCL(t.trait, t.fmt, t.final.map((x) => ({ c: x[0], f: x[1] })), "ticket");
    return sc ? { scale: sc } : { err: "The items on this ticket do not match the item bank. Ask your instructor." };
  }
  let pdfjsReady = null;
  function loadPdfJs() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    if (!pdfjsReady) pdfjsReady = new Promise((res, rej) => {
      const sc = document.createElement("script"); sc.src = "vendor/pdf.min.js";
      sc.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = "vendor/pdf.worker.min.js"; res(window.pdfjsLib); };
      sc.onerror = () => { pdfjsReady = null; rej(new Error("pdf.js")); };
      document.head.appendChild(sc);
    });
    return pdfjsReady;
  }
  async function fileText(file) {
    const isPdf = /\.pdf$/i.test(file.name) || file.type === "application/pdf";
    if (!isPdf) return file.text();
    const lib = await loadPdfJs();
    const doc = await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    let out = "";
    for (let p = 1; p <= doc.numPages; p++) { const tc = await (await doc.getPage(p)).getTextContent(); out += tc.items.map((x) => x.str).join("") + "\n"; }
    return out;
  }
  async function importTicket(file) {
    const msg = $("#cl-msg"); if (!file || !msg) return;
    msg.innerHTML = `<div class="feedback">Reading ${esc(file.name)}…</div>`;
    let text;
    try { text = await fileText(file); } catch (e) {
      msg.innerHTML = `<div class="feedback no">This PDF could not be read here${location.protocol === "file:" ? " (PDFs cannot be read from an offline copy of the lab)" : ""}. Use the .txt version of your Construct Lab ticket, or a standard scale.</div>`; return;
    }
    const r = parseCLTicket(text, S.id);
    if (r.err) { msg.innerHTML = `<div class="feedback no">${r.err}</div>`; return; }
    ui.clTicket = r.scale; render();
  }
  function standardScale(t) { return { trait: t, fmt: 5, items: D.std[t].map((c) => ({ c, f: K.ITEM[c].f })), source: "standard" }; }

  const STAGES = [["Start", 2], ["Baseline", 4], ["Round 1: break reliability", 9], ["Round 2: break validity", 9], ["Exit ticket", 4]];
  function go(n) { const now = Date.now(); S.time[S.stage] = (S.time[S.stage] || 0) + (now - (S.since || now)); S.stage = n; S.since = now; S.max = Math.max(S.max, n); save(); render(); window.scrollTo(0, 0); }

  // ---------------------------------------------------------------- render
  function topbar() {
    if (!S || !S.scale) return `<header class="topbar"><div class="topbar-inner"><div class="brand">Break It, Fix It <span>pilot · break · rebuild</span></div></div></header>`;
    const track = STAGES.map(([t, m], i) => `<li><button data-go="${i}" ${i === S.stage ? 'aria-current="step"' : ""} class="${i < S.max ? "done" : ""}" ${i > S.max ? "disabled" : ""}><b>${i + 1}. ${t}</b>${m} min</button></li>`).join("");
    return `<header class="topbar"><div class="topbar-inner"><div class="brand">Break It, Fix It <span>pilot · break · rebuild</span></div>
      <nav aria-label="Lab stages" style="flex:1 1 520px;min-width:0"><ol class="track">${track}</ol></nav>
      <div class="clock"><span id="clock"></span></div>
      <div class="who"><button class="defs-btn" data-act="defs">Definitions</button> ${esc(S.name)} · ${esc(S.id)}</div></div></header>`;
  }
  function tick() {
    const el = $("#clock"); if (!el || !S) return;
    const tot = (Object.values(S.time).reduce((a, b) => a + b, 0) + (Date.now() - (S.since || Date.now()))) / 1000;
    el.innerHTML = `Lab time <strong class="${tot > 1800 ? "over" : ""}">${Math.floor(tot / 60)}:${String(Math.floor(tot % 60)).padStart(2, "0")}</strong> / 30:00`;
  }
  setInterval(tick, 1000);
  function render() {
    jobs.length = 0;
    const views = [vStart, vBaseline, () => vRound(1), () => vRound(2), vTicket];
    const st = S ? S.stage : 0;
    $("#root").innerHTML = topbar() + `<main id="app">${S && S.scale ? views[st]() : vStart()}</main>` + (S && S.scale ? `<button class="def-fab" data-act="defs">Definitions</button>` : "");
    if (ui.defs) drawDefs();
    jobs.splice(0).forEach(([id, fn]) => { const el = document.getElementById(id); if (el) { try { fn(el); } catch (err) { console.error(err); } } });
    tick();
  }
  function head(n, title, lede) {
    return `<div class="stage-head"><div><div class="step">Stage ${n + 1} of 5 · ${STAGES[n][1]} minutes</div><h2>${title}</h2><p class="lede">${lede}</p></div></div>`;
  }

  // ---------------------------------------------------------------- 1 start
  function vStart() {
    if (!S) {
      return `<section class="hero"><div>
        <h1>Break It, Fix It</h1>
        <p class="lede">Last week you built a 12-item scale. Today you break it on purpose, six times, and fix it again. Each break targets one kind of evidence. Before you see the data, you predict what will change. The goal: know which number answers which question, and which numbers can look fine while the scale is broken.</p>
        <ol class="plan">
          <li><span><b>Baseline.</b> Your scale's reliability and validity evidence.</span><span class="m">4 min</span></li>
          <li><span><b>Round 1: break reliability.</b> Pad it, make it a mood, cut it to True / False.</span><span class="m">9 min</span></li>
          <li><span><b>Round 2: break validity.</b> Mix in another trait, use it for hiring, drop a facet.</span><span class="m">9 min</span></li>
          <li><span><b>Exit ticket.</b> One reflection, then save and upload.</span><span class="m">4 min</span></li>
        </ol></div>
        <div class="panel"><h3>Sign in</h3>
          <form id="signin" novalidate>
            <label class="field" for="nm">Full name</label><input type="text" id="nm" autocomplete="name">
            <label class="field" for="cid">UVA computing ID</label><input type="text" id="cid" placeholder="e.g., abc2de" autocomplete="username">
            <p class="hint">Use the same ID as in the Construct Lab. On the next screen you can use last week's scale (keep your Construct Lab exit ticket at hand) or a standard scale.</p>
            <div id="msg" role="alert"></div>
            <div class="row" style="margin-top:12px"><button class="btn big" type="submit">Continue</button></div>
          </form></div></section>`;
    }
    const cl = ui.clTicket || constructLabScale(S.id);
    const clCard = cl
      ? `<button class="choice pick" data-start="cl"><span class="t">Use my Construct Lab scale</span><span class="small">${TRAIT[cl.trait]}, 12 items, ${cl.fmt} response options${cl.origFmt < 4 ? ` (last week you used ${cl.origFmt}; this lab starts from 5)` : ""}. ${cl.from === "ticket" ? "Loaded from your exit ticket." : "Found on this browser."}</span></button>`
      : `<div class="choice muted-card cl-import"><span class="t">Load your Construct Lab scale</span>
          <span class="small">${clDiagnosis(S.id)}</span>
          <span class="small"><b>Load it from your Construct Lab exit ticket</b> (the PDF or .txt you uploaded to Canvas; you can download it again from your submission).</span>
          <label class="btn ghost file-btn">Choose my Construct Lab ticket<input type="file" id="cl-file" accept=".pdf,.txt,application/pdf,text/plain"></label>
          <div id="cl-msg" role="status"></div>
          <span class="small">Or choose a standard scale; the lab works the same way.</span></div>`;
    return `${head(0, "Choose your starting scale", "Every break starts from this scale, and every fix is judged against it.")}
      <div class="choice-grid">
        ${clCard}
        <button class="choice pick" data-start="C"><span class="t">Standard Conscientiousness scale</span><span class="small">12 items: self-efficacy, achievement-striving, perseverance. 5 options.</span></button>
        <button class="choice pick" data-start="O"><span class="t">Standard Openness scale</span><span class="small">12 items: introspection, aesthetics, abstract thinking. 5 options.</span></button>
      </div>`;
  }

  // ---------------------------------------------------------------- 2 baseline
  const BASEQ = [
    { id: "b1", q: "Which number on the board tells you whether people get similar scores two weeks apart?",
      o: [["retest", "Test-retest r"], ["alpha", "Cronbach's α"], ["conv", "Convergent r"], ["sem", "SEM"]], key: "retest",
      fb: "Test-retest r correlates the same people's total scores on two occasions. α repeats over items on one occasion; it says nothing about stability over time." },
    { id: "b2", q: null,
      o: [["diff", "Convergent and discriminant evidence: the score agrees more with the same trait measured another way than with a different trait"], ["rel", "Internal consistency: the items agree with each other"], ["crit", "Criterion evidence: the score predicts an outcome"], ["content", "Content evidence: the items cover the facets"]], key: "diff",
      fb: "Comparing a correlation with the same trait (from a different method, a friend's rating) against a correlation with a different trait is convergent and discriminant evidence, together called differential validity." },
  ];
  function vBaseline() {
    const sc = S.scale, e = ev(sc);
    const q2 = `Your scale correlates ${f2(e.conv)} with friends' ratings of ${TRAIT[sc.trait].toLowerCase()} and ${f2(e.disc)} with the ${TRAIT[other(sc.trait)].toLowerCase()} measure. What kind of evidence is this comparison?`;
    const qs = BASEQ.map((b) => {
      const ans = S.base[b.id];
      return `<fieldset class="mcq"><legend>${esc(b.q || q2)}</legend>${b.o.map(([v, t]) => `<label><input type="radio" name="${b.id}" value="${v}" ${ans === v ? "checked" : ""}><span>${esc(t)}</span></label>`).join("")}
        ${ans ? `<div class="feedback ${ans === b.key ? "ok" : "no"}">${ans === b.key ? "Right. " : "Not quite. "}${b.fb}</div>` : ""}</fieldset>`;
    }).join("");
    const done = BASEQ.every((b) => S.base[b.id]);
    return `${head(1, "Baseline: what your scale looks like now", `300 students answered your ${TRAIT[sc.trait].toLowerCase()} scale, and again two weeks later. Their friends rated them, and you know an outcome and a group for each student. This is the evidence board you will use in every round. Press <b>i</b> on any box for its definition.`)}
      ${board(sc, e)}
      <section class="panel"><div class="panel-head"><h3>Look at your scale</h3><span class="small muted">${sc.items.length} items · ${e.structure.nDim} EGA communities</span></div>
        ${scaleViews("base", sc, e, ["net", "map", "heat"])}</section>
      <section class="panel"><h3>Where the numbers come from</h3><p class="small">Every number on the board summarizes a picture of the 300 students. These are the pictures. Press <b>i</b> above any number for its definition.</p>
        <div class="vgallery">${["retest", "sem", "conv", "disc", "crit", "known"].map((v) => { const id = vz((svg) => drawView(v, svg, sc, e, {})); return `<figure class="vfig"><figcaption>${GAUGE[v].name}<button class="info" data-def="${esc(GAUGE[v].def)}" aria-label="Definition">i</button></figcaption><svg id="${id}" role="img" aria-label="${esc(VIEWS[v][0])}"></svg><div class="vcap small"></div></figure>`; }).join("")}</div></section>
      <details class="scale-list"><summary>Your 12 items</summary><ol>${sc.items.map((x) => `<li><span class="tag" style="--fc:${FHEX[x.f]}"><span class="swatch"></span>${fname(x.f)}</span> ${esc(K.ITEM[x.c].s)}</li>`).join("")}</ol></details>
      <section class="panel"><h3>Read the board</h3>${qs}
        <div class="next-bar"><span class="why">${done ? "Next, you break the scale's reliability." : "Answer both questions to continue."}</span><button class="btn big" data-act="to-r1" ${done ? "" : "disabled"}>Start round 1</button></div></section>`;
  }

  // ---------------------------------------------------------------- 3-4 rounds
  function vRound(r) {
    const sc = S.scale, list = BREAKS(sc).filter((b) => b.round === r);
    const idx = Math.min(S.cur[r] || 0, 2);
    const b = list[idx], st = (S.cycles[b.key] = S.cycles[b.key] || { pred: {}, ran: false, fixes: [] });
    const broken = K.SAB[b.key](sc);
    const e0 = ev(sc), e1 = ev(broken);
    const dots = list.map((x, i) => `<span class="dot ${S.cycles[x.key] && S.cycles[x.key].done ? "done" : ""} ${i === idx ? "on" : ""}">${i + 1}. ${x.title}</span>`).join("");
    const predDone = b.predict.every((g) => st.pred[g]);
    const predUI = b.predict.map((g) => {
      const t = gaugeText(g, e0, sc);
      return `<div class="pred"><div class="pname">${GAUGE[g].name}<button class="info" data-def="${esc(GAUGE[g].def)}" aria-label="Definition">i</button><span class="now">now ${t.v}</span></div>
        <div class="seg" role="group" aria-label="Prediction for ${GAUGE[g].name}">${[["up", "↑ goes up"], ["same", "→ about the same"], ["down", "↓ goes down"]].map(([v, l]) =>
          `<button data-pred="${b.key},${g},${v}" aria-pressed="${st.pred[g] === v}" ${st.ran ? "disabled" : ""}>${l}</button>`).join("")}</div></div>`;
    }).join("");
    let result = "";
    if (st.ran) {
      const right = b.predict.filter((g) => truth(g, e0, e1).includes(st.pred[g])).length;
      result = `<section class="panel"><div class="panel-head"><h3><span class="task-n">3</span>What happened</h3><span class="score-pill">${right} of ${b.predict.length} predictions right</span></div>
        ${dumbHTML(dumbRows(sc, e0, broken, e1, b.predict, st.pred))}
        ${compareTable(sc, e0, broken, e1, b.predict, st.pred, b.lesson)}</section>
        <section class="panel"><div class="panel-head"><h3><span class="task-n">3b</span>See it</h3><span class="small muted">same students, same view: before and after the break</span></div>
        ${pairViews(b.key, sc, e0, "Before: your scale", broken, e1, `After: ${esc(b.title.toLowerCase())}`, b.views)}</section>`;
      const last = st.fixes[st.fixes.length - 1];
      const fixUI = b.fixes.map(([id, label]) => `<label class="fixopt ${st.fixes.some((f) => f.id === id) ? "tried" : ""}"><input type="radio" name="fix" value="${id}" ${st.pick === id ? "checked" : ""} ${st.done ? "disabled" : ""}><span>${esc(label)}</span></label>`).join("");
      let fixRes = "";
      if (last) {
        const [, , kind, text] = b.fixes.find((f) => f[0] === last.id);
        const fixed = K.FIX[b.key][last.id](sc, broken), ef = ev(fixed);
        fixRes = `<div class="feedback ${kind === "fixed" ? "ok" : kind === "partly" ? "note" : "no"}"><b>${kind === "fixed" ? "Fixed." : kind === "partly" ? "Partly fixed." : "Not fixed."}</b> ${text}</div>
          ${dumbHTML(dumbRows(sc, e0, fixed, ef, b.predict, null))}
          ${pairViews(b.key + ":fix", broken, e1, "The broken scale", fixed, ef, "With your fix", b.views)}
          <details class="scale-list"><summary>The numbers: your original scale vs. the scale with this fix</summary>${compareTable(sc, e0, fixed, ef, b.predict, null, {})}</details>`;
      }
      const canNext = st.done;
      result += `<section class="panel"><h3><span class="task-n">4</span>Fix it</h3><p class="small">Which change repairs the scale? Pick one and run it. If it does not work, try another.</p>
        <div class="fixes">${fixUI}</div>
        ${st.done ? "" : `<div class="row" style="margin-top:10px"><button class="btn" data-act="tryfix" ${st.pick ? "" : "disabled"}>Run the scale with this fix</button></div>`}
        ${fixRes}
        <div class="next-bar"><span class="why">${canNext ? "" : "Find a fix that works (fully or partly) to continue."}</span>
          ${canNext ? (idx < 2 ? `<button class="btn big" data-act="next-break">Next break: ${esc(list[idx + 1].title)}</button>` : r === 1 ? `<button class="btn big" data-act="to-r2">Start round 2</button>` : `<button class="btn big" data-act="to-ticket">Go to the exit ticket</button>`) : ""}</div></section>`;
    }
    return `${head(r + 1, r === 1 ? "Round 1: break reliability" : "Round 2: break validity", r === 1 ? "Three changes that attack the consistency of the scores. Watch which kind of consistency each one hits." : "Three changes that attack what the scores mean. Watch the reliability numbers: they often stay fine.")}
      <div class="dots">${dots}</div>
      <section class="panel breakcard"><h3><span class="task-n">1</span>Break ${idx + 1} of 3: ${esc(b.title)}</h3><p>${esc(b.story)}</p><ul class="small">${b.list(sc).map((x) => `<li>${x}</li>`).join("")}</ul></section>
      <section class="panel"><h3><span class="task-n">2</span>Predict before you look</h3><p class="small">For each number, will it go up, stay about the same, or go down? A change of .02 or less counts as about the same (for SEM, half a percentage point; for structure, one item).</p>${predUI}
        ${st.ran ? "" : `<div class="row" style="margin-top:12px"><button class="btn orange big" data-act="run" ${predDone ? "" : "disabled"}>Run the broken scale</button></div>`}</section>
      ${result}`;
  }

  // ---------------------------------------------------------------- 5 ticket
  function summary() {
    const sc = S.scale, list = BREAKS(sc), e0 = ev(sc);
    return list.map((b) => {
      const st = S.cycles[b.key] || { pred: {}, fixes: [] };
      const e1 = ev(K.SAB[b.key](sc));
      const preds = b.predict.map((g) => ({ g, said: st.pred[g] || null, ok: !!st.pred[g] && truth(g, e0, e1).includes(st.pred[g]), happened: arrowFor(g, e0, e1), lesson: b.lesson[g] }));
      const fx = st.fixes.map((f) => ({ id: f.id, kind: b.fixes.find((x) => x[0] === f.id)[2] }));
      return { key: b.key, title: b.title, round: b.round, preds, fixes: fx, done: !!st.done };
    });
  }
  function complete() {
    return BASEQ.every((b) => S.base[b.id]) && summary().every((s) => s.done) && words(S.refl) >= MIN_WORDS;
  }
  const REFLECT = "Choose one break where a reliability number (α or test-retest) looked fine but the scale's meaning broke, or the reverse. What did the numbers show, and what would you report to someone who wants to use the scale?";
  function vTicket() {
    if (S.ticket) return vTicketDoc();
    const sm = summary(), done = sm.every((s) => s.done);
    return `${head(4, "Exit ticket", "One reflection, then save your ticket and upload it to Canvas. The ticket shows what you predicted correctly and what to review.")}
      <section class="panel"><h3>Reflection</h3><label class="field" for="refl">${esc(REFLECT)}</label>
        <textarea id="refl" rows="6">${esc(S.refl)}</textarea><div class="wc"><span id="wc">${words(S.refl)}</span> words (at least ${MIN_WORDS})</div>
        ${done ? "" : `<p class="feedback note">Some breaks are not finished: ${sm.filter((s) => !s.done).map((s) => s.title).join(", ")}. Use the bar at the top to go back.</p>`}
        <div class="next-bar"><span class="why"></span><button class="btn orange big" data-act="make-ticket" ${complete() ? "" : "disabled"}>Create my exit ticket</button></div></section>`;
  }
  const b64 = (s) => btoa(unescape(encodeURIComponent(s)));
  const code = (json) => E.fnv1a(SALT + "|" + json).toString(16).toUpperCase().padStart(8, "0");
  function payload() {
    const sc = S.scale, e = ev(sc), sm = summary();
    const r = (x) => +x.toFixed(3);
    return {
      app: "break-it", v: 1, appVersion: APP_VERSION, dataVersion: D.version, name: S.name, id: S.id,
      scale: { source: sc.source, from: sc.from || null, trait: sc.trait, fmt: sc.fmt, items: sc.items.map((x) => [x.c, x.f]) },
      baseline: { alpha: r(e.alpha), retest: r(e.retest), conv: r(e.conv), disc: r(e.disc), crit: r(e.crit), known: r(e.known), nFit: e.structure.nFit, nDim: e.structure.nDim },
      base: S.base, cycles: sm.map((s) => ({ key: s.key, preds: s.preds.map((p) => [p.g, p.said, p.ok ? 1 : 0]), fixes: s.fixes.map((f) => [f.id, f.kind]), done: s.done })),
      refl: S.refl, complete: complete(), minutes: +((Object.values(S.time).reduce((a, b) => a + b, 0)) / 60000).toFixed(1), createdAt: new Date().toISOString(),
    };
  }
  function feedbackLists(sm) {
    const good = [], review = [];
    sm.forEach((s) => s.preds.forEach((p) => {
      const line = `<b>${s.title}, ${GAUGE[p.g].name}:</b> ${p.lesson}`;
      (p.ok ? good : review).push(line);
    }));
    return { good, review };
  }
  function vTicketDoc() {
    const t = S.ticket, json = JSON.stringify(t), cd = code(json), sm = summary(), sc = S.scale;
    const { good, review } = feedbackLists(sm);
    const nPred = sm.reduce((a, s) => a + s.preds.length, 0), nOk = sm.reduce((a, s) => a + s.preds.filter((p) => p.ok).length, 0);
    const firstFix = sm.filter((s) => s.fixes[0] && s.fixes[0].kind === "fixed").length;
    const kindWord = { fixed: "fixed", partly: "partly fixed", no: "not fixed" };
    return `<div class="ticket-actions no-print"><div class="panel" style="border-left:5px solid var(--orange)">
        <h2 style="margin-bottom:6px">Your exit ticket is ready</h2>
        <ol style="margin:0 0 12px;padding-left:20px"><li>Click <b>Save as PDF</b>. Set <i>Destination</i> to <b>Save as PDF</b> (Safari: the PDF menu at the bottom left).</li>
          <li>Upload it to the Canvas assignment <i>Break It, Fix It: Exit Ticket</i>.</li></ol>
        <div class="row"><button class="btn orange big" data-act="print">Save as PDF</button><button class="btn ghost" data-act="txt">Download as .txt instead</button><button class="btn ghost" data-act="unlock">Edit my reflection</button></div></div></div>
      <article class="ticket" id="ticket">
        <div class="t-head"><div><h1>Break It, Fix It · Exit Ticket</h1><div>Research Methods &amp; Data Analysis I · University of Virginia</div></div>
          <div class="t-id"><b>${esc(t.name)}</b><br>Computing ID: <b>${esc(t.id)}</b><br>${new Date(t.createdAt).toLocaleString()}<br>Time in lab: ${t.minutes} min</div></div>
        <div class="box submit"><h3>Status: ${t.complete ? "complete" : "incomplete"}</h3>All six breaks finished, both baseline questions answered, and a reflection of at least ${MIN_WORDS} words. Upload this page as a PDF to <i>Break It, Fix It: Exit Ticket</i>.</div>
        <h2>Your feedback</h2>
        <p>You predicted <b>${nOk} of ${nPred}</b> changes correctly, and your first fix worked in <b>${firstFix} of 6</b> breaks.</p>
        <div class="two"><div class="box"><h3>You saw these coming</h3><ul>${good.map((x) => `<li>${x}</li>`).join("") || "<li>None yet. Review the list on the right.</li>"}</ul></div>
          <div class="box review"><h3>Review these ideas</h3><ul>${review.map((x) => `<li>${x}</li>`).join("") || "<li>Nothing: every prediction was right.</li>"}</ul></div></div>
        <h2>Your scale</h2>
        <p>${sc.source === "construct-lab" ? "Your Construct Lab scale" : "Standard scale"}: ${TRAIT[sc.trait]}, ${sc.items.length} items, ${sc.fmt} response options. Baseline: α = ${f2(t.baseline.alpha)}, test-retest = ${f2(t.baseline.retest)}, convergent = ${f2(t.baseline.conv)}, discriminant = ${f2(t.baseline.disc)}, criterion = ${f2(t.baseline.crit)}, known groups d = ${f2(t.baseline.known)}, EGA ${t.baseline.nFit} of 12 items in place.</p>
        <h2>The six breaks</h2>
        <table><thead><tr><th>Break</th><th>Your predictions</th><th>Fix attempts</th></tr></thead><tbody>
          ${sm.map((s) => `<tr><td><b>${s.title}</b><br><span class="muted">Round ${s.round}</span></td><td>${s.preds.map((p) => `${GAUGE[p.g].name}: you said ${p.said || "–"}, it went ${p.happened || "–"} ${p.ok ? "✓" : "✗"}`).join("<br>")}</td><td>${s.fixes.map((f, i) => `${i + 1}. ${kindWord[f.kind]}`).join("<br>")}</td></tr>`).join("")}
        </tbody></table>
        <h2>Reflection</h2><p><b>${esc(REFLECT)}</b></p><div class="refl">${esc(t.refl)}</div>
        <h2>Key ideas</h2>
        <div class="keyideas"><div class="box"><h3>Repeated over what?</h3>α repeats over items on one occasion; test-retest repeats over time. A scale can pass one and fail the other.</div>
          <div class="box"><h3>Reliable is not valid</h3>Padding and self-promotion can raise α while the meaning of the score gets worse.</div>
          <div class="box"><h3>Evidence for meaning</h3>Content, structure, convergent and discriminant, criterion, and known-groups evidence each answer a different question about what the score means.</div>
          <div class="box"><h3>Fix the cause</h3>Length fixes consistency problems; it never fixes a validity problem.</div></div>
        <div class="verify"><span>Verification code: <b>${cd}</b></span><span>Break It, Fix It v${APP_VERSION} · data ${esc(t.dataVersion)}</span></div>
        <div class="machine"><span class="mk">BEGIN-BREAK-IT-TICKET</span> ${b64(json)} ${cd} <span class="mk">END-BREAK-IT-TICKET</span></div>
      </article>`;
  }
  function ticketText() {
    const t = S.ticket, json = JSON.stringify(t), cd = code(json), sm = summary();
    const L = ["BREAK IT, FIX IT · EXIT TICKET", "Research Methods & Data Analysis I · University of Virginia", "".padEnd(60, "="),
      `Name: ${t.name}`, `Computing ID: ${t.id}`, `Created: ${t.createdAt}`, `Status: ${t.complete ? "complete" : "incomplete"}`, "",
      "Upload this file to the Canvas assignment 'Break It, Fix It: Exit Ticket'.", ""];
    sm.forEach((s) => { L.push(`${s.title} (round ${s.round})`); s.preds.forEach((p) => L.push(`  ${GAUGE[p.g].name}: you said ${p.said}, it went ${p.happened} ${p.ok ? "[right]" : "[review]"}`)); L.push(`  Fix attempts: ${s.fixes.map((f) => f.kind).join(", ")}`, ""); });
    L.push("REFLECTION", REFLECT, t.refl.replace(/\s+/g, " "), "", `Verification code: ${cd}`, "", `BEGIN-BREAK-IT-TICKET ${b64(json)} ${cd} END-BREAK-IT-TICKET`, "");
    return L.join("\n");
  }

  // ---------------------------------------------------------------- definitions drawer
  function drawDefs() {
    let d = $("#defs");
    if (!d) { d = document.createElement("aside"); d.id = "defs"; d.className = "defs"; d.setAttribute("role", "dialog"); d.setAttribute("aria-labelledby", "defs-title"); document.body.appendChild(d); }
    const sc = S && S.scale;
    d.innerHTML = `<div class="defs-head"><h2 id="defs-title" tabindex="-1">Definitions</h2><button class="btn ghost small" data-act="defs-close">Close</button></div>
      ${sc ? `<div class="def-card plain"><h4>What the board uses for your scale</h4><p>Friend's rating: a friend rated the person's ${TRAIT[sc.trait].toLowerCase()}. Other trait: a separate 12-item ${TRAIT[other(sc.trait)].toLowerCase()} measure. Outcome: ${CRIT[sc.trait]}. Groups: students who ${GROUP[sc.trait][0]} vs. those who ${GROUP[sc.trait][1]}.</p></div>` : ""}
      ${DEFS.map(([t, b]) => `<div class="def-card ${ui.defFocus === t ? "focus" : ""}" id="def-${t.replace(/\W+/g, "-")}"><h4>${esc(t)}</h4><p>${esc(b)}</p></div>`).join("")}
      <p class="small muted">Sources: Rust, Kosinski &amp; Stillwell (2020), Ch. 2–3; AERA, APA &amp; NCME (2014); Weeks 8–9 lectures.</p>`;
    d.classList.add("open");
    if (ui.defFocus) { const el = $(`#def-${ui.defFocus.replace(/\W+/g, "-")}`); el && el.scrollIntoView({ block: "start" }); }
    $("#defs-title").focus({ preventScroll: true });
  }
  function openDefs(on, focus) { ui.defs = on; ui.defFocus = focus || null; if (on) drawDefs(); else { const d = $("#defs"); d && d.classList.remove("open"); } }
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && ui.defs) openDefs(false); });

  // ---------------------------------------------------------------- events
  document.addEventListener("submit", (e) => {
    if (e.target.id !== "signin") return;
    e.preventDefault();
    const name = $("#nm").value.trim(), id = $("#cid").value.trim().toLowerCase();
    if (name.split(/\s+/).length < 2) { $("#msg").innerHTML = `<div class="feedback no">Enter your first and last name.</div>`; return; }
    if (!/^[a-z]{2,3}[0-9][a-z]{0,3}$/.test(id)) { $("#msg").innerHTML = `<div class="feedback no">That does not look like a UVA computing ID (for example, abc2de).</div>`; return; }
    S = load(id) || { v: 1, name, id, stage: 0, max: 0, since: Date.now(), time: {}, scale: null, base: {}, cycles: {}, cur: { 1: 0, 2: 0 }, refl: "", ticket: null };
    S.name = name; S.since = Date.now(); save();
    if (S.scale) render(); else $("#root").innerHTML = topbar() + `<main id="app">${vStart()}</main>`;
  });
  document.addEventListener("click", (e) => {
    const t = e.target.closest("button, [data-go]"); if (!t) return;
    const d = t.dataset;
    if (d.def) { openDefs(true, d.def); return; }
    if (d.vtab) { const [k, v] = d.vtab.split(","); ui.tab[k] = v; const y = scrollY; render(); scrollTo(0, y); return; }
    if (d.start) { S.scale = d.start === "cl" ? (ui.clTicket || constructLabScale(S.id)) : standardScale(d.start); delete ui.clTicket; S.stage = 1; S.max = 1; save(); render(); window.scrollTo(0, 0); return; }
    if (!S) return;
    if (d.go) { go(+d.go); return; }
    if (d.pred) { const [k, g, v] = d.pred.split(","); S.cycles[k].pred[g] = v; save(); const y = scrollY; render(); scrollTo(0, y); return; }
    const r = S.stage === 3 ? 2 : 1, list = S.scale ? BREAKS(S.scale).filter((b) => b.round === r) : [], b = list[Math.min(S.cur[r] || 0, 2)];
    switch (d.act) {
      case "defs": openDefs(!ui.defs); return;
      case "defs-close": openDefs(false); return;
      case "to-r1": go(2); return;
      case "to-r2": go(3); return;
      case "to-ticket": go(4); return;
      case "run": { S.cycles[b.key].ran = true; save(); const y = scrollY; render(); scrollTo(0, y); const p = $$(".panel")[2]; p && p.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
      case "tryfix": {
        const st = S.cycles[b.key]; if (!st.pick) return;
        const kind = b.fixes.find((f) => f[0] === st.pick)[2];
        st.fixes.push({ id: st.pick, kind });
        if (kind !== "no") st.done = true;
        save(); const y = scrollY; render(); scrollTo(0, y); return;
      }
      case "next-break": S.cur[r] = (S.cur[r] || 0) + 1; save(); render(); window.scrollTo(0, 0); return;
      case "make-ticket": S.ticket = payload(); save(); render(); window.scrollTo(0, 0); return;
      case "unlock": S.ticket = null; save(); render(); return;
      case "print": { const old = document.title; document.title = `BreakItFixIt_${S.id}`; window.print(); setTimeout(() => { document.title = old; }, 1000); return; }
      case "txt": { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([ticketText()], { type: "text/plain" })); a.download = `BreakItFixIt_${S.id}.txt`; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); return; }
    }
  });
  document.addEventListener("change", (e) => {
    const t = e.target; if (!S) return;
    if (t.id === "cl-file") { importTicket(t.files && t.files[0]); t.value = ""; return; }
    if (t.name === "b1" || t.name === "b2") { S.base[t.name] = t.value; save(); const y = scrollY; render(); scrollTo(0, y); return; }
    if (t.name === "fix") { const r = S.stage === 3 ? 2 : 1, b = BREAKS(S.scale).filter((x) => x.round === r)[Math.min(S.cur[r] || 0, 2)]; S.cycles[b.key].pick = t.value; save(); const y = scrollY; render(); scrollTo(0, y); }
  });
  document.addEventListener("input", (e) => {
    if (e.target.id === "refl") { S.refl = e.target.value; $("#wc").textContent = words(S.refl); save(); const btn = $('[data-act="make-ticket"]'); if (btn) btn.disabled = !complete(); }
  });
  window.addEventListener("beforeunload", () => { if (S) { S.time[S.stage] = (S.time[S.stage] || 0) + (Date.now() - (S.since || Date.now())); S.since = Date.now(); save(); } });
  window.BreakIt = { state: () => S, K, summary: () => S && summary(), ticketText: () => S && S.ticket && ticketText(), truth, ev };
  render();
})();
