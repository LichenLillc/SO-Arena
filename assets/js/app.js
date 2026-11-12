/* SO-Arena project page. Renders everything from window.SO_ARENA (assets/js/data.js), which is generated from the
   paper's sources. No dependencies. */
(() => {
  "use strict";
  const D = window.SO_ARENA;
  if (!D) return;
  document.documentElement.classList.add("js");

  // ---- helpers ---------------------------------------------------------------------------------------------------
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const NS = "http://www.w3.org/2000/svg";
  const S = (tag, attrs = {}, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) if (v != null) e.setAttribute(k, v);
    if (parent) parent.appendChild(e);
    return e;
  };
  const f1 = v => (Math.round(v * 10) / 10).toFixed(1);
  const f2 = v => (Math.round(v * 100) / 100).toFixed(2);
  const ms = v => v == null ? "—" : v >= 1000 ? `${(v / 1000).toFixed(1)} s` : `${v >= 100 ? Math.round(v) : f1(v)} ms`;
  const ord = n => n + (n % 100 >= 11 && n % 100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th"));
  const RM = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- data ------------------------------------------------------------------------------------------------------
  const M = D.models;
  const FAM = Object.fromEntries(D.families.map(f => [f.id, f]));
  const DOM = Object.fromEntries(D.domains.map(d => [d.id, d]));
  const isS1 = m => m.group === "open" || m.group === "api";
  const S1 = M.filter(isS1);
  const REFS = M.filter(m => m.group === "s2").sort((a, b) => b.score - a.score);
  const LUNA = M.find(m => m.name === "GPT-6 Luna");
  // Hue carries meaning (wine score, blue reliability, orange System Two, family hues for domains); model size is a
  // neutral lightness ramp and access is a shape (diamond = closed API).
  const SIZE = { "0.4B": "#a3cf9b", "4B": "#4fa39b", "9B": "#6a8fc4", "27B": "#8a74b8", "31B": "#433d6e" };   // the paper's size colours
  const API = "#d4a24e", S2C = "#b0652d";                                       // closed APIs amber, as in the paper
  const closed = m => m.group === "api" || m.group === "s2";
  const colorOf = m => m.group === "s2" ? S2C : closed(m) ? API : SIZE[m.size];
  const slug = m => m.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const BY = Object.fromEntries(M.map(m => [slug(m), m]));
  const R_ = m => m.reliability ? m.reliability.R : null;
  function ranksOf(list, val) {
    const out = new Map();
    for (const m of list) { const v = val(m); if (v != null) out.set(m.key, 1 + list.filter(o => val(o) != null && val(o) > v + 1e-9).length); }
    return out;
  }
  const RANK = ranksOf(S1, m => m.score), RANK_R = ranksOf(S1, R_), RANK_L = ranksOf(S1, m => -m.latency.mean_ms);
  const top = (list, val, n) => list.filter(m => val(m) != null).sort((a, b) => val(b) - val(a)).slice(0, n);

  function initials(m) {
    const base = m.name.replace(/-v\d+$/, "").replace(/-\d+(\.\d+)?B$/, "");
    return (base.match(/[A-Z]/g) || [base[0]]).slice(0, 2).join("");
  }
  const logo = (m, s = 26) => m.logo ? `<span class="lg" style="--s:${s}px"><img src="${m.logo}" alt="" width="${s}" height="${s}" loading="lazy" decoding="async"></span>`
    : `<span class="lg mono" style="--s:${s}px;background:${colorOf(m)}" aria-hidden="true">${esc(initials(m))}</span>`;
  const tag = m => m.group === "s2" ? '<span class="tag s2">System Two</span>' : m.group === "api" ? '<span class="tag api">API</span>' : m.group === "auto" ? '<span class="tag auto">Auto</span>' : "";
  const meta = m => `${esc(m.developer)}${m.size ? " · " + m.size : ""}${m.group === "api" ? " · API" : m.group === "auto" ? " · hybrid" : ""}`;

  // ---- tooltip ---------------------------------------------------------------------------------------------------
  const tipEl = $("#tip");
  function tip(html, x, y) {
    const was = tipEl.hidden;
    tipEl.innerHTML = html; tipEl.hidden = false;
    if (was && !RM) tipEl.animate([{ opacity: 0, transform: "translateY(3px)" }, { opacity: 1, transform: "none" }], { duration: 120, easing: "ease-out" });
    const r = tipEl.getBoundingClientRect();
    let l = x + 16, t = y + 16;
    if (l + r.width > innerWidth - 10) l = x - r.width - 16;
    if (t + r.height > innerHeight - 10) t = y - r.height - 16;
    tipEl.style.left = Math.max(10, l) + "px"; tipEl.style.top = Math.max(10, t) + "px";
  }
  const untip = () => { tipEl.hidden = true; };
  function bindTip(node, html) {
    node.addEventListener("pointerenter", e => tip(html(), e.clientX, e.clientY));
    node.addEventListener("pointermove", e => tip(html(), e.clientX, e.clientY));
    node.addEventListener("pointerleave", untip);
    node.addEventListener("focus", () => { const b = node.getBoundingClientRect(); tip(html(), b.right, b.bottom); });
    node.addEventListener("blur", untip);
  }
  const TOUCH = matchMedia("(hover: none)").matches;
  const HINT = `<span class="tip-cta"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5.2 2.6v8.6l2.2-2 1.5 3.4 1.6-.7-1.5-3.3 3-.2z" fill="currentColor"/></svg>${TOUCH ? "Tap" : "Click"} for details</span>`;
  const mtip = (m, extra = "") => `<b>${esc(m.name)}</b> <span class="s">${meta(m)}</span><br>` +
    `<span class="m">${f2(m.score)}</span> <span class="s">${RANK.has(m.key) ? `score · #${RANK.get(m.key)} of 18` : m.group === "s2" ? "score · System Two" : "score · not ranked"}</span>${extra}${HINT}`;

  // ---- navigation --------------------------------------------------------------------------------------------------
  function nav() {
    const bar = $(".nav");
    const onScroll = () => bar.classList.toggle("scrolled", scrollY > 8);
    addEventListener("scroll", onScroll, { passive: true }); onScroll();
    const b = $(".burger"), sn = $("#sheet-nav");
    const setOpen = o => { sn.classList.toggle("open", o); b.setAttribute("aria-expanded", o); b.setAttribute("aria-label", o ? "Close the section menu" : "Open the section menu"); };
    b.addEventListener("click", () => setOpen(!sn.classList.contains("open")));
    sn.addEventListener("click", e => { if (e.target.closest("a")) setOpen(false); });
    addEventListener("keydown", e => { if (e.key === "Escape" && sn.classList.contains("open")) { setOpen(false); b.focus(); } });
    if ("IntersectionObserver" in window) {
      const links = new Map($$(".nav-links a").map(a => [a.getAttribute("href").slice(1), a]));
      const io = new IntersectionObserver(es => es.forEach(e => {
        if (e.isIntersecting) { links.forEach(a => a.classList.remove("on")); const a = links.get(e.target.id); if (a) a.classList.add("on"); }
      }), { rootMargin: "-40% 0px -55% 0px" });
      links.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
      addEventListener("scroll", () => { if (scrollY < $("#glance").offsetTop - innerHeight * .5) links.forEach(a => a.classList.remove("on")); }, { passive: true });
    }
  }

  // ---- hero board and stats ------------------------------------------------------------------------------------------
  let boardMode = "cap";
  const LATMAX = Math.max(...S1.map(m => m.latency.mean_ms));     // thin latency bars: linear, slowest System One model = full
  const BMAX = 100;                                                 // score and R bars: 0-100, as everywhere on the page
  const refBand = `<b class="ref" style="left:calc(${(100 * LUNA.score / BMAX).toFixed(2)}% - 1.5px)"></b>`;   // GPT-6 Luna, the System Two reference
  function board() {
    const host = $("#board"), cap = boardMode === "cap";
    const val = cap ? m => m.score : R_, rk = cap ? RANK : RANK_R, list = top(S1, val, 6);
    const c = cap ? "var(--cap)" : "var(--rel)";
    if (!$(".board-head", host)) {                    // the head (and its toggle) is built once, so the thumb can slide
      host.innerHTML = `<div class="board-head"><span class="label">Top System One models</span>
        <div class="seg seg2" role="group" aria-label="Ranking"><button type="button" data-bm="cap" aria-pressed="true">Score</button><button type="button" data-bm="rel" aria-pressed="false" title="Reliability R, 0-100: keeps its answer when the options are reordered, and notices when the correct option is missing">Reliability</button></div></div>
        <ol class="board-list"></ol><div class="board-foot"></div>`;
    }
    $$(".seg2 button", host).forEach(b => b.setAttribute("aria-pressed", String(b.dataset.bm === boardMode)));
    $(".seg2", host).dataset.on = boardMode;
    const ol = $(".board-list", host), first = new Map();
    $$("li", ol).forEach(li => first.set(li.dataset.k, { y: li.getBoundingClientRect().top, w: $$(".meter i", li).map(e => getComputedStyle(e).width), li }));
    const morph = first.size > 0 && !RM;
    ol.innerHTML = list.map(m => `<li data-k="${slug(m)}"><span class="rk">${rk.get(m.key)}</span>${logo(m, 26)}
        <button type="button" class="who" data-model="${slug(m)}"><b>${esc(m.name)}</b><span>${meta(m)}</span></button>
        <span class="mx"><span class="track"><span class="meter" aria-hidden="true"><i style="--w:${(100 * val(m) / BMAX).toFixed(1)}%;--c:${c}"></i></span>${cap ? refBand : ""}</span><span class="v">${cap ? f2(val(m)) : f1(val(m))}</span>
          ${cap ? `<span class="meter thin" aria-hidden="true"><i style="--w:${(100 * m.latency.mean_ms / LATMAX).toFixed(1)}%;--c:var(--lat)"></i></span><span class="v lat" title="Mean latency per task">${ms(m.latency.mean_ms)}</span>`
            : `<span class="meter thin" aria-hidden="true"><i style="--w:${m.score.toFixed(1)}%;--c:var(--cap)"></i></span><span class="v lat" title="Score">${f2(m.score)}</span>`}</span><span class="chev" aria-hidden="true">›</span></li>`).join("");
    $(".board-foot", host).innerHTML = `<span class="keys">${cap ? `<span><i class="k-ref"></i>GPT-6 Luna ${f1(LUNA.score)} (System Two)</span>` : ""}${cap ? `<span><i class="k-lat"></i>Latency per task</span>` : `<span><i class="k-lat" style="background:var(--cap)"></i>Score</span>`}</span><a href="#leaderboard">Full leaderboard <span class="arr">→</span></a>`;
    if (!morph) { host.dataset.anim = "0"; requestAnimationFrame(() => setTimeout(() => { host.dataset.anim = "1"; }, 60)); return; }
    // FLIP: rows that stay slide from their old place to the new one and their bars change width; new rows fade in;
    // rows that leave the top eight fade out where they were.
    const top0 = ol.getBoundingClientRect().top;
    const rows = $$("li", ol);
    rows.forEach((li, n) => {
      const f = first.get(li.dataset.k), bars = $$(".meter i", li);
      if (f) {
        const dy = f.y - li.getBoundingClientRect().top;
        li.style.transition = "none"; li.style.transform = `translateY(${dy}px)`;
        bars.forEach((b, q) => { b.style.transition = "none"; b.style.width = f.w[q]; });
        li.dataset.d = n;
      } else { li.classList.add("enter"); }
    });
    const keep = new Set(rows.map(li => li.dataset.k));
    const ghosts = [...first.values()].filter(f => !keep.has(f.li.dataset.k)).map(f => {
      const g = f.li; g.classList.add("ghost"); g.style.top = (f.y - top0) + "px"; ol.appendChild(g); return g;
    });
    void ol.offsetWidth;
    requestAnimationFrame(() => {
      rows.forEach(li => {
        if (li.classList.contains("enter")) { li.classList.add("in"); return; }
        li.style.transition = `transform .45s cubic-bezier(.2, .8, .2, 1) ${(+li.dataset.d) * 20}ms`; li.style.transform = "";
        $$(".meter i", li).forEach(b => { b.style.transition = "width .35s cubic-bezier(.2, .8, .2, 1) .05s"; b.style.width = ""; });
      });
      ghosts.forEach(g => g.classList.add("out"));
      setTimeout(() => {
        ghosts.forEach(g => g.parentNode && g.parentNode.removeChild(g));
        rows.forEach(li => { li.style.transition = ""; li.classList.remove("enter", "in"); $$(".meter i", li).forEach(b => { b.style.transition = ""; }); });
      }, 750);
    });
  }
  // Key results: the paper's headline findings, each with a small chart; a tile opens the matching Results chart.
  const mini = (rows, max, fmt) => `<div class="mini">${rows.map(([l, v, c]) => `<div class="mr"><span class="ml">${l}</span><span class="mt"><i style="--w:${(100 * v / max).toFixed(1)}%;--c:${c}"></i></span><span class="mv">${fmt(v)}</span></div>`).join("")}</div>`;
  function kres() {
    const best = top(S1, o => o.score, 1)[0], slow = top(M.filter(m => m.group === "open"), m => m.latency.mean_ms, 1)[0];
    const [r1, r2] = top(S1, R_, 2), gaps = D.domains.map(d => best.domains[d.id] - LUNA.domains[d.id]), lo = Math.min(...gaps), hi = Math.max(...gaps);
    const sec = v => `${(v / 1000).toFixed(v >= 1000 ? 1 : 2)} s`, sg = v => (v > 0 ? "+" : v < 0 ? "−" : "") + f1(Math.abs(v));
    const gx = v => (v + 50) / 60 * 100;
    // the domains far behind, named under their dots (one label per cluster 8 points apart)
    const fb = D.domains.map((d, i) => [d.short, gaps[i]]).filter(([, v]) => v < -15).sort((a, b) => a[1] - b[1]);
    const dots = `<div class="mini"><div class="mr one"><span class="ml">−50</span><span class="mt dots big"><b style="left:${gx(0).toFixed(1)}%"></b>${D.domains.map((d, i) =>
        `<i style="left:${gx(gaps[i]).toFixed(1)}%;background:${FAM[d.family].color}" title="${esc(d.short)}: ${sg(gaps[i])}"></i>`).join("")}</span><span class="mv">+10</span></div>
      <div class="mr one"><span></span><span class="mt dl">${fb.length ? `<span class="fb" style="left:${gx(fb[0][1]).toFixed(1)}%">${fb.map(x => x[0]).join(", ")}</span>` : ""}<span class="lu" style="left:${gx(0).toFixed(1)}%">Luna</span></span><span></span></div></div>`;
    const tiles = [
      ["leaderboard", "", `${f1(best.score)}<small>&nbsp;vs ${f1(LUNA.score)}</small>`, "System Two still leads", "The best System One models trail GPT-6 Luna by about ten points. Luna is strong enough to serve as the System Two reference, and one reference keeps the charts clear; GPT-6 Sol scores 82.3.",
        mini([[esc(best.name), best.score, "var(--cap)"], ["GPT-6 Luna", LUNA.score, "var(--s2)"]], 100, f1)],
      ["glance", "", "&lt;&thinsp;0.3<small> s</small>", "System One is fast", "Every open System One model answers within 0.3 s per task on one H100; GPT-6 is timed through its API.",
        mini([["Slowest open", slow.latency.mean_ms, "var(--lat)"], ["GPT-6 Luna", LUNA.latency.mean_ms, "var(--s2)"]], 3000, sec)],
      ["reliability", "rel", `${ord(RANK.get(best.key))}<span class="arr">→</span>${ord(RANK_R.get(best.key))}`, "Top score ≠ most reliable", `${esc(best.name)}, the top scorer, is ${ord(RANK_R.get(best.key))} in reliability.`,
        mini([r1, r2, best].map(o => [`<span class="rkn">#${RANK_R.get(o.key)}</span>${esc(o.name)}`, R_(o), "var(--rel)"]), 100, f1)],
      ["leaderboard", "view:t-domains", `${sg(lo)}<small>&nbsp;to ${sg(hi)}</small>`, "Gap to Luna varies by domain", `${esc(best.name)}, the top System One model, minus GPT-6 Luna in each of the 11 domains (leaderboard tier). Left of the Luna line: behind Luna. Dots coloured by domain family.`, dots],
    ];
    const CAP = ["Score", "Mean time per task", "Reliability R", `${esc(best.name)} minus GPT-6 Luna, per domain`];
    $("#kres").innerHTML = tiles.map(([sec_, k, big, h, p, viz], i) => `<div class="kr"><a class="krl" href="#${sec_}"${k.startsWith("view:") ? ` data-view="${k.slice(5)}"` : k ? ` data-chart="${k}"` : ""}><div class="big">${big}</div><h3>${h}</h3></a>
      <button class="info" type="button" data-info="${esc(p)}">i</button>${viz}<span class="kcap">${CAP[i]}</span></div>`).join("");
  }

  // ---- leaderboard -------------------------------------------------------------------------------------------------
  const T = { sort: "score", dir: -1, filter: "all", q: "" };
  const FILTERS = [["all", "All"], ["small", "Open ≤ 4B"], ["large", "Open ≥ 9B"], ["api", "APIs"]];
  const pass = m => {
    const q = T.q.trim().toLowerCase(), hit = !q || (m.name + " " + m.developer).toLowerCase().includes(q);
    if (m.group === "s2") return hit;                         // the System Two references stay in every filter
    const sz = parseFloat(m.size), f = T.filter;
    if (f === "small" && !((m.group === "open" || m.group === "auto") && sz <= 4)) return false;
    if (f === "large" && !(m.group === "open" && sz >= 9)) return false;
    if (f === "api" && m.group !== "api") return false;
    return hit;
  };
  const COLS = [
    { id: "rank", label: "#", cls: "c-rk", val: m => RANK.get(m.key) ?? null, asc: true, title: "Rank among the 18 System One models, by the sorted column" },
    { id: "model", label: "Model", cls: "c-m l", val: m => m.name, asc: true },
    { id: "score", label: "Score", cls: "c-score l", val: m => m.score, title: "Mean of the 11 domain scores" },
    { id: "prof", label: "By domain", cls: "c-prof l", title: "One bar per domain, grouped by family; the height is the domain score. Point at the bars for all 11 scores and ranks." },
    { id: "R", label: "Reliability", cls: "c-n", val: R_, title: "Reliability R, 0-100: keeps its answer when the options are reordered, and notices when the correct option is missing. System One models only." },
    { id: "lat", label: "Latency", cls: "c-n", val: m => m.latency ? m.latency.mean_ms : null, asc: true, title: "Mean latency per task; bars on one scale up to the slowest System One model" },
  ];
  // per-domain System One ranks (domain cards, drawers and the profile tooltips)
  const TOPD = Object.fromEntries(D.domains.map(d => [d.id, ranksOf(S1, m => m.domains[d.id])]));
  const FAMS = D.families.map(f => ({ f, ds: D.domains.filter(d => d.family === f.id) }));
  // What each domain asks, in plain words (from the paper's per-domain construction notes)
  const DESC = {
    sentiment: "Read the sentiment, emotion or rating behind reviews and posts.",
    intent: "Tell what a customer wants: single requests, goals across a conversation, fine-grained intents.",
    math: "Pick the right answer to math problems, from grade school to AIME.",
    code: "Judge whether a solution to a programming problem is correct.",
    science: "Answer science questions, from school level to graduate (GPQA Diamond).",
    knowledge: "Answer general-knowledge and everyday commonsense questions.",
    safety: "Judge harmful content, policy compliance, over-refusal and hallucinated answers.",
    retrieval: "Grade how relevant a passage or contract clause is to a query.",
    verification: "Check whether an agent really completed its task, from its state or history.",
    tools: "Choose the next tool call, step by step, in a live API sandbox.",
    web: "Choose the next action on a web page, step by step, to reach a goal.",
  };
  const prof = m => `<div class="dprof" role="img" aria-label="${esc(D.domains.map(d => `${d.short || d.name} ${f1(m.domains[d.id])}`).join(", "))}">${FAMS.map(({ f, ds }) =>
    `<span class="pg" style="--n:${ds.length}">${ds.map(d => `<span class="pb" data-d="${d.id}" style="--h:${m.domains[d.id].toFixed(1)}%;--fc:${f.color}"></span>`).join("")}</span>`).join("")}</div>`;
  // latency bars share one linear scale up to the slowest System One model; slower models get a broken bar
  const latCell = v => `<span class="lcell"><span class="meter${v > LATMAX ? " over" : ""}" aria-hidden="true"><i style="--w:${Math.min(100, 100 * v / LATMAX).toFixed(1)}%;--c:var(--lat)"></i></span><span class="num">${ms(v)}</span></span>`;
  const row = m => {
    const ref = m.group === "s2";
    return `<tr class="${ref ? "ref" : ""}" tabindex="0" data-model="${slug(m)}" aria-label="${esc(m.name)}: open profile">
      <td class="c-rk">${(T.sort === "R" ? RANK_R : T.sort === "lat" ? RANK_L : RANK).get(m.key) ?? (ref ? "" : "–")}</td>
      <td class="c-m"><div class="mcell">${logo(m, 28)}<div><b>${esc(m.name)}</b><small>${meta(m)}</small></div></div></td>
      <td class="c-score l${T.sort === "score" ? " sorted" : ""}" data-l="Score"><div class="scell"><span class="track bt"><span class="meter" aria-hidden="true"><i style="--w:${m.score.toFixed(1)}%;--c:${ref ? "var(--s2)" : "var(--cap)"}"></i></span>${ref ? "" : refBand}</span><span class="num">${f2(m.score)}</span></div></td>
      <td class="c-prof l">${prof(m)}</td>
      <td class="c-n${T.sort === "R" ? " sorted" : ""}" data-l="Reliability">${R_(m) != null ? `<span class="rcell"><span class="meter" aria-hidden="true"><i style="--w:${R_(m)}%;--c:var(--rel)"></i></span><span class="num">${f1(R_(m))}</span></span>` : '<span class="dim" title="Reliability is measured for System One models only">—</span>'}</td>
      <td class="c-n${T.sort === "lat" ? " sorted" : ""}" data-l="Latency">${m.latency ? latCell(m.latency.mean_ms) : '<span class="dim">—</span>'}</td>
</tr>`;
  };
  function table() {
    const head = `<thead><tr>${COLS.map(c => c.id === "prof" ? `<th class="${c.cls}" scope="col"><span class="th" title="${esc(c.title)}">${c.label}</span></th>`
      : `<th class="${c.cls}" scope="col"${T.sort === c.id ? ` aria-sort="${T.dir > 0 ? "ascending" : "descending"}"` : ""}><button type="button" data-sort="${c.id}" title="${esc(c.title || "Sort by " + c.label)}">${esc(c.label)}</button></th>`).join("")}</tr></thead>`;
    const col = COLS.find(c => c.id === T.sort);
    const order = list => list.sort((a, b) => {
      const va = col.val(a), vb = col.val(b);
      if (va == null && vb == null) return b.score - a.score;
      if (va == null) return 1; if (vb == null) return -1;
      if (typeof va === "string") return T.dir * va.localeCompare(vb);
      return T.dir * (va - vb) || b.score - a.score;
    });
    // Groups as in the paper's score table: the System Two references, the closed APIs, then open weights by size;
    // # keeps each model's rank among the 18 System One models. StartLux Auto (hybrid) is not listed (user, 2026-11-12).
    const refs = order(M.filter(m => m.group === "s2" && pass(m))), apis = order(M.filter(m => m.group === "api" && pass(m)));
    const opens = ["31B", "27B", "9B", "4B", "0.4B"].map(z => [z, order(M.filter(m => m.group === "open" && m.size === z && pass(m)))]);
    const n1 = apis.length + opens.reduce((a, [, l]) => a + l.length, 0);
    const grp = (label, list) => list.length ? `<tbody><tr class="grp"><th colspan="${COLS.length}" scope="rowgroup">${label}</th></tr>${list.map(row).join("")}</tbody>` : "";
    // FLIP: after a sort or filter, rows that stay slide from their old place to the new one (300 ms); new rows fade in
    const was = new Map($$("#lb tr[data-model]").map(r => [r.dataset.model, r.getBoundingClientRect().top]));
    // a search that the active filter hides says so, and offers the matches in All
    const q = T.q.trim().toLowerCase(), hidden = q && T.filter !== "all" ? S1.filter(m => (m.name + " " + m.developer).toLowerCase().includes(q) && !pass(m)).length : 0;
    const fl = (FILTERS.find(f => f[0] === T.filter) || [, ""])[1];
    const note = !n1 && hidden ? `<tbody><tr><td colspan="${COLS.length}" class="l empty">No match in ${esc(fl)}. <button type="button" class="showall" data-showall>Show ${hidden} in All</button></td></tr></tbody>`
      : refs.length + n1 ? "" : `<tbody><tr><td colspan="${COLS.length}" class="l empty">No model matches.</td></tr></tbody>`;
    $("#lb").innerHTML = head + grp("System Two reference", refs) + grp("System One · closed APIs", apis) +
      opens.map(([z, l]) => grp(`System One · open weights · ${z}`, l)).join("") + note;
    if (!was.size || RM) return;
    const rows = $$("#lb tr[data-model]");
    rows.forEach(r => { const y = was.get(r.dataset.model);
      if (y == null) { r.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, delay: 80, easing: "ease-out", fill: "backwards" }); return; }
      const dy = y - r.getBoundingClientRect().top;
      if (Math.abs(dy) > 1) r.animate([{ transform: `translateY(${dy}px)` }, { transform: "none" }], { duration: 300, easing: "cubic-bezier(.2, .8, .2, 1)" });
    });
  }
  // By domain: one row per domain, grouped by family. The three best System One models, GPT-6 Luna, and a strip with
  // every System One model's score on 0-100 (the top three solid, Luna as a diamond). A row opens the domain's drawer.
  function dgrid() {
    const ov = { id: "overall", val: m => m.score, rk: RANK };
    const cell = (o, m, i, list) => { const v = o.val(m), tie = i && (o.id === "overall" ? f2 : f1)(v) === (o.id === "overall" ? f2 : f1)(o.val(list[i - 1]));
      return `<div class="pc p${i + 1}" role="cell"><span class="pcw">${logo(m, 22)}<span class="nm"><span class="n">${esc(m.name)}</span><span class="v">${(o.id === "overall" ? f2 : f1)(v)}${tie ? '<span class="tie">tie</span>' : ""}</span></span></span></div>`; };
    const strip = (o, c) => { const l3 = new Set(top(S1, o.val, 3).map(m => m.key));
      return `<div class="c-sp" role="cell"><span class="sp" data-sp="${o.id}" style="--fc:${c}"><b style="left:25%"></b><b style="left:50%"></b><b style="left:75%"></b>` +
        [...S1].sort((x, y) => l3.has(x.key) - l3.has(y.key)).map(m => `<i class="${l3.has(m.key) ? "t" : ""}" style="left:${o.val(m).toFixed(1)}%"></i>`).join("") +
        `<em style="left:${o.val(LUNA).toFixed(1)}%"></em></span></div>`; };
    const line = (o, c, name, meta, attrs) => { const l = top(S1, o.val, 3);
      return `<div ${attrs} role="row" tabindex="0"><div class="dn" role="rowheader"><b>${name}</b><small>${meta}</small></div>${l.map((m, i) => cell(o, m, i, l)).join("")}` +
        `<div class="lu" role="cell">${(o.id === "overall" ? f2 : f1)(o.val(LUNA))}</div>${strip(o, c)}</div>`; };
    const head = `<div class="dr dh" role="row"><div role="columnheader">Domain</div><div role="columnheader">1st</div><div role="columnheader" class="p2">2nd</div><div role="columnheader" class="p3">3rd</div>` +
      `<div role="columnheader" class="lu"><span class="lf">GPT-6 </span>Luna</div><div role="columnheader" class="c-sp">All 18 System One<span class="spk"><span><i class="t"></i>top 3</span><span><i></i>others</span><span><em></em>GPT-6 Luna</span></span></div></div>`;
    const body = `${line(ov, "var(--ink-2)", "Overall", `Mean of the 11 domains · ${D.totals.leaderboard_tasks.toLocaleString("en-US")} tasks`, 'class="dr ov" data-view="t-table" aria-label="Overall: open the full table"')}` +
      FAMS.map(({ f, ds }) => `<div class="dfam" role="row"><div role="rowheader"><i style="background:${f.color}"></i>${esc(f.name)}</div></div>` +
        ds.map(d => line({ id: d.id, val: m => m.domains[d.id] }, f.color, esc(d.name), `${d.leaderboard_tasks} tasks · ${d.leaderboard_tier === "All tasks" ? "untiered" : d.leaderboard_tier.toLowerCase() + " tier"}`,
          `class="dr" data-domain="${d.id}" title="${esc(DESC[d.id])}" aria-label="${esc(d.name)}: full ranking and tiers"`)).join("")).join("");
    $("#dgrid").innerHTML = `<div class="dtab" role="table" aria-label="Top three System One models and GPT-6 Luna in each domain">${head}${body}</div><p class="dtab-note">Scores on each domain's leaderboard tier. A row opens the full ranking and the tiers.</p>`;
  }
  function dgridControls() {
    const g = $("#dgrid"); let on = false;
    g.addEventListener("keydown", e => { const r = e.target.closest(".dr[tabindex]"); if (r && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); r.click(); } });
    // the strip: the model nearest the pointer, with its score and rank in that domain
    g.addEventListener("pointermove", e => {
      const sp = e.target.closest(".sp"); if (!sp) { if (on) { untip(); on = false; } return; }
      const id = sp.dataset.sp, val = id === "overall" ? m => m.score : m => m.domains[id], rk = id === "overall" ? RANK : TOPD[id];
      const r = sp.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * 100;
      const m = [...S1, LUNA].reduce((p, q) => Math.abs(val(q) - x) < Math.abs(val(p) - x) ? q : p);
      tip(`<b>${esc(m.name)}</b> <span class="m">${f1(val(m))}</span> <span class="s">${m === LUNA ? "System Two reference" : `#${rk.get(m.key)} of ${S1.length}`}</span>`, e.clientX, e.clientY); on = true;
    });
    g.addEventListener("pointerleave", () => { if (on) { untip(); on = false; } });
  }
  function leaderboardControls() {
    $("#lb-keys").innerHTML = `<span><i class="k-ref"></i>GPT-6 Luna (System Two)</span><span class="fk">By domain, one bar each:${D.families.map(f => `<span class="fam"><i style="background:${f.color}"></i>${esc(f.name.split(" ")[0])}</span>`).join("")}</span><span>Latency: mean per task, open weights on one H100, APIs end to end</span>`;
    $("#filters").innerHTML = FILTERS.map(([id, l]) => `<button type="button" class="chip" data-f="${id}" aria-pressed="${T.filter === id}">${l}</button>`).join("");
    $("#filters").addEventListener("click", e => { const b = e.target.closest("[data-f]"); if (!b) return; T.filter = b.dataset.f; $$("[data-f]").forEach(o => o.setAttribute("aria-pressed", o === b)); table(); });
    $("#q").addEventListener("input", e => { T.q = e.target.value; table(); });
    $("#msort").addEventListener("click", e => { const b = e.target.closest("[data-ms]"); if (!b) return; const c = COLS.find(o => o.id === b.dataset.ms);
      T.sort = c.id; T.dir = c.asc ? 1 : -1; $$("[data-ms]").forEach(o => o.setAttribute("aria-pressed", o === b)); table(); });
    let onBar = false;                                          // profile bars: domain, score and System One rank
    $("#lb").addEventListener("pointermove", e => {
      // the whole profile at once: all 11 domains with score and System One rank; the pointed domain stands out
      const pf = e.target.closest(".dprof");
      if (!pf) { if (onBar) { untip(); onBar = false; } return; }
      const b = e.target.closest(".pb"), m = BY[pf.closest("tr").dataset.model];
      const rows = D.domains.map(d => { const k = isS1(m) ? TOPD[d.id].get(m.key) : null;
        return `<span class="pr${b && b.dataset.d === d.id ? " on" : ""}"><span>${esc(d.short || d.name)}</span><span class="m">${f1(m.domains[d.id])}</span><span class="s">${k ? `#${k}` : ""}</span></span>`; }).join("");
      tip(`<b>${esc(m.name)}</b> <span class="s">by domain${isS1(m) ? ` · rank of ${S1.length}` : ""}</span><span class="prof-tip">${rows}</span>${HINT}`, e.clientX, e.clientY);
      onBar = true;
    });
    $("#lb").addEventListener("pointerleave", () => { if (onBar) { untip(); onBar = false; } });
    $("#lb").addEventListener("click", e => {
      const s = e.target.closest("[data-sort]");
      if (s) { const c = COLS.find(o => o.id === s.dataset.sort); if (T.sort === c.id) T.dir = -T.dir; else { T.sort = c.id; T.dir = c.asc ? 1 : -1; } table(); const nb = $(`[data-sort="${c.id}"]`); if (nb) nb.focus(); return; }
      if (e.target.closest("[data-showall]")) { T.filter = "all"; $$("[data-f]").forEach(o => o.setAttribute("aria-pressed", o.dataset.f === "all")); table(); return; }
      const r = e.target.closest("tr[data-model]"); if (r) openModel(BY[r.dataset.model]);
    });
    $("#lb").addEventListener("keydown", e => { const r = e.target.closest("tr[data-model]"); if (r && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openModel(BY[r.dataset.model]); } });
    tabs($("#lb-view"), id => { const dom = id === "t-domains"; $("#filters").style.display = dom ? "none" : "flex"; $(".tools-r").style.visibility = dom ? "hidden" : "visible"; $("#msort").classList.toggle("off", dom); });
  }

  // ---- tabs (ARIA) -------------------------------------------------------------------------------------------------
  function tabs(list, onChange) {
    const ts = $$('[role="tab"]', list);
    const sel = (t, focus) => {
      ts.forEach(o => { const on = o === t; o.setAttribute("aria-selected", on); o.tabIndex = on ? 0 : -1; const p = o.getAttribute("aria-controls") && document.getElementById(o.getAttribute("aria-controls")); if (p) p.hidden = !on; });
      if (focus) t.focus();
      if (onChange) onChange(t.id, t);
    };
    ts.forEach((t, i) => {
      t.addEventListener("click", () => sel(t));
      t.addEventListener("keydown", e => { const k = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; if (k) { e.preventDefault(); sel(ts[(i + k + ts.length) % ts.length], true); } });
    });
    list._sel = id => { const t = ts.find(o => o.id === id); if (t) sel(t); };
  }

  // ---- drawer --------------------------------------------------------------------------------------------------------
  const dr = $("#drawer"), drBody = $("#dr-body");
  function openDrawer(kicker, html, param, title) {
    $("#dr-kicker").textContent = kicker; drBody.innerHTML = html; drName = [kicker, title];
    dr.classList.remove("out");
    if (typeof dr.showModal === "function") { if (!dr.open) dr.showModal(); } else dr.setAttribute("open", "");
    document.documentElement.classList.add("dr-open");
    dr.scrollTop = 0;
    const u = new URL(location.href); u.search = param; history.replaceState(null, "", u);
    document.title = `${title} — SO-Arena`;
  }
  // once the title has scrolled away, the sticky head carries the name
  let drName = ["", ""];
  dr.addEventListener("scroll", () => { const k = $("#dr-kicker"), t = dr.scrollTop > 90 ? drName[1] : drName[0]; if (k.textContent !== t) { k.textContent = t; k.classList.toggle("named", dr.scrollTop > 90); } }, { passive: true });
  // closing slides the drawer out (180 ms) before the dialog closes; Escape does the same
  const closeDrawer = () => {
    if (!dr.open || dr.classList.contains("out")) return;
    if (RM) { dr.close(); return; }
    dr.classList.add("out"); setTimeout(() => { dr.classList.remove("out"); if (dr.open) dr.close(); }, 180);
  };
  dr.addEventListener("cancel", e => { e.preventDefault(); closeDrawer(); });
  dr.addEventListener("close", () => { document.documentElement.classList.remove("dr-open"); const u = new URL(location.href); u.search = ""; history.replaceState(null, "", u); document.title = "SO-Arena — Benchmarking System One Models"; untip(); });
  $(".dr-close").addEventListener("click", closeDrawer);
  dr.addEventListener("click", e => { if (e.target === dr) closeDrawer(); });

  function openModel(m) {
    if (!m) return;
    const r = m.reliability, l = m.latency, rk = RANK.get(m.key), rr = RANK_R.get(m.key);
    const med = id => { const v = S1.map(o => o.domains[id]).sort((a, b) => a - b); return (v[8] + v[9]) / 2; };
    const prof = D.domains.map(d => { const v = m.domains[d.id], md = med(d.id), f = FAM[d.family];
      return `<li><i class="sw" style="--fc:${f.color}" title="${esc(f.name)}"></i><span class="n" style="font-weight:500">${esc(d.short)}</span><span class="bar"><i style="width:${v}%;--bc:${m.group === "s2" ? "var(--s2)" : "var(--cap)"}"></i><u style="left:calc(${md}% - 1px)" title="System One median ${f1(md)}"></u></span><span class="v">${f1(v)}</span></li>`; }).join("");
    const heat = v => `rgba(${m.group === "s2" ? "176,101,45" : "168,58,82"},${(.05 + .5 * Math.pow(Math.max(0, v - 10) / 90, 1.4)).toFixed(3)})`;
    const tg = D.domains.map(d => { const t = m.tiers[d.id];
      return `<tr><th>${esc(d.short)}</th>${t.All != null ? `<td colspan="4" style="background:${heat(t.All)}">${t.All} <span style="color:var(--muted)">(all tasks)</span></td>` : ["E", "M", "H", "V"].map(k => t[k] == null ? "<td></td>" : `<td style="background:${heat(t[k])}">${t[k]}</td>`).join("")}</tr>`; }).join("");
    openDrawer(m.group === "s2" ? "System Two reference" : m.group === "auto" ? "Hybrid model" : closed(m) ? "Decision API" : "Open-weight model", `
      <div style="display:flex;gap:14px;align-items:center">${logo(m, 52)}<div><h2 id="dr-title">${esc(m.name)}</h2></div></div>
      <p class="dr-sub">${meta(m)} · ${closed(m) ? "closed API" : "open weights"} · reasoning: ${esc(m.reasoning.toLowerCase())} · ${m.release_url ? `<a href="${m.release_url}" target="_blank" rel="noopener">${esc(m.release)} ↗</a>` : `<span class="mono">${esc(m.release)}</span>`}</p>
      <div class="kv">
        <div><b class="num">${f2(m.score)}</b><span>Score${rk ? ` · <i class="nw">#${rk} of 18</i>` : m.group === "s2" ? " · System Two" : " · not ranked"}</span></div>
        <div><b class="num">${r ? f1(r.R) : "—"}</b><span><i class="nw">Reliability R</i>${rr ? ` · <i class="nw">#${rr} of 18</i>` : " · measured for System One models only"}</span></div>
        <div><b class="num">${l ? ms(l.mean_ms) : "—"}</b><span>Mean latency · <i class="nw">${l ? l.timing : ""}</i></span></div>
        <div><b class="num">${r ? `${r.S.toFixed(2)} · ${r.N.toFixed(2)}` : l && l.p99_ms ? ms(l.p99_ms) : "—"}</b><span>${r ? "Option-order stability S · null discrimination N" : "99th percentile latency"}</span></div>
      </div>
      <h4 class="label">Domain scores <span style="text-transform:none;letter-spacing:0;font-family:var(--sans)">· leaderboard tier; tick = System One median</span></h4>
      <ul class="bars prof">${prof}</ul>
      ${m.order_acc ? (() => { const a = m.order_acc, lo = Math.floor(a.min - 2), hi = Math.ceil(a.max + 2), x = v => (100 * (v - lo) / (hi - lo)).toFixed(1);
        return `<h4 class="label">Accuracy across option orders <span style="text-transform:none;letter-spacing:0;font-family:var(--sans)">· reliability items, original and 12 reorderings (not the score)</span></h4>
        <div class="ordr"><span class="ax">${lo}</span><span class="tr"><b style="left:${x(a.min)}%;width:${(x(a.max) - x(a.min)).toFixed(1)}%"></b>${a.runs.map(v => `<i style="left:${x(v)}%"></i>`).join("")}<u style="left:${x(a.original)}%" title="Original order ${f1(a.original)}"></u></span><span class="ax">${hi}</span>
        <span class="v">${f1(a.min)}–${f1(a.max)}</span></div>`; })() : ""}
      <h4 class="label">By difficulty tier</h4>
      <table class="tg"><thead><tr><th></th><th>Easy</th><th>Medium</th><th>Hard</th><th>V. hard</th></tr></thead><tbody>${tg}</tbody></table>
      ${m.note ? `<p class="dr-note">${esc(m.note)}</p>` : ""}`, `?model=${slug(m)}`, m.name);
  }

  function openDomain(id) {
    const d = DOM[id], f = FAM[d.family], val = m => m.domains[id], rk = TOPD[id];
    const list = M.filter(m => m.group !== "auto").sort((a, b) => val(b) - val(a));
    const counts = d.tiers ? Object.entries(d.tiers).map(([k, v]) => `${({ E: "easy", M: "medium", H: "hard", V: "very hard" })[k]} ${v}`).join(", ") : "no tiers";
    const bars = list.map(m => { const ref = m.group === "s2", a = m.group === "auto";
      return `<li class="${ref ? "ref" : a ? "auto" : ""}"><span class="rk">${isS1(m) ? rk.get(m.key) : ref ? "ref" : "–"}</span>${logo(m, 22)}<button type="button" class="n" data-model="${slug(m)}">${esc(m.name)}</button>
        <span class="bar"><i style="width:${val(m)}%;--bc:${ref ? "var(--s2)" : "var(--cap)"}"></i></span><span class="v">${f1(val(m))}</span><span class="ms">${ms(m.latency.mean_ms)}</span></li>`; }).join("");
    openDrawer(f.name, `<h2 id="dr-title">${esc(d.name)}</h2>
      <p class="dr-lead">${DESC[id]}</p>
      <p class="dr-sub">${d.tasks} tasks (${counts}). The leaderboard uses ${d.leaderboard_tier === "All tasks" ? "all tasks" : id === "math" ? "the hard and very hard tiers" : "the hard tier"} (${d.leaderboard_tasks} tasks).
        Sources${d.sources_by_tier ? ", easy to hard" : ""}: ${esc(d.sources.join(d.sources_by_tier ? " → " : ", "))}.</p>
      <h4 class="label" style="margin-top:24px">Ranking</h4><ul class="bars">${bars}</ul>
      <p class="dr-note"># ranks the 18 System One models; “ref” marks the System Two references. Right column: mean latency per task.</p>
      ${d.tiers ? `<h4 class="label" style="margin-top:28px">By difficulty tier</h4><div class="chart" id="dr-tier"></div><div class="legend" id="dr-tier-lg"></div>` : ""}`,
      `?domain=${id}`, d.name);
    if (d.tiers) requestAnimationFrame(() => tierChart($("#dr-tier"), id, $("#dr-tier-lg"), true));
  }

  // ---- charts --------------------------------------------------------------------------------------------------------
  function frame(host, ratio, minH, maxH) {
    host.innerHTML = "";
    const W = Math.max(300, Math.round(host.clientWidth || 760)), H = Math.round(Math.max(minH, Math.min(maxH, W * ratio)));
    const svg = S("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H }, host);
    return { svg, W, H };
  }
  function axes(svg, W, H, m, xs, ys, xt, yt, xT, yT) {
    const g = S("g", { class: "grid" }, svg);
    for (const [v, l] of yt) { const y = ys(v); S("line", { x1: m.l, x2: W - m.r, y1: y, y2: y }, g); S("text", { class: "tick", x: m.l - 10, y: y + 4, "text-anchor": "end" }, svg).textContent = l; }
    for (const [v, l] of xt) { const x = xs(v); S("line", { x1: x, x2: x, y1: m.t, y2: H - m.b, "stroke-dasharray": "2 4" }, g); S("text", { class: "tick", x, y: H - m.b + 20, "text-anchor": "middle" }, svg).textContent = l; }
    S("line", { x1: m.l, x2: W - m.r, y1: H - m.b, y2: H - m.b, stroke: "#d8d7cf" }, svg);
    if (xT) S("text", { class: "axis-t", x: W - m.r, y: H - 6, "text-anchor": "end" }, svg).textContent = xT;
    if (yT) S("text", { class: "axis-t", x: m.l, y: m.t - 14, "text-anchor": "start" }, svg).textContent = yT;
  }
  function mark(g, m, x, y, r = 6) {
    if (closed(m)) { const k = r * 1.22; S("path", { class: "mk", d: `M${x} ${y - k}L${x + k} ${y}L${x} ${y + k}L${x - k} ${y}Z`, fill: colorOf(m), stroke: "#fff", "stroke-width": 1.5 }, g); }
    else { S("circle", { class: "mk", cx: x, cy: y, r, fill: colorOf(m), stroke: "#fff", "stroke-width": 1.5 }, g);
      if (m.group === "auto") S("circle", { cx: x, cy: y, r: r * .45, fill: "#fff", "pointer-events": "none" }, g); }
  }
  // a polyline as small boxes, so labels keep off a plotted line; w: the cost of a label touching one box
  const lineBoxes = (pts, r = 3, w = 40) => pts.slice(1).flatMap(([x1, y1], i) => { const [x0, y0] = pts[i], n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 4));
    return Array.from({ length: n + 1 }, (_, k) => { const x = x0 + (x1 - x0) * k / n, y = y0 + (y1 - y0) * k / n; return { x0: x - r, x1: x + r, y0: y - r, y1: y + r, w }; }); });
  // Point labels, placed together rather than one by one. Each label has candidate spots: next to its point, or out
  // along a thin leader line (16 directions, 4 lengths). The layout minimizes one cost: overlaps with labels and
  // points are all but forbidden, leader lines must not cross labels, points or each other, labels keep off plotted
  // lines, and nearer and plainer spots are preferred. Coordinate descent from several seeded starts keeps the best.
  const ov = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
  const area = (a, b) => Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
  const cross = (p, q) => { const o = (a, b, c) => Math.sign((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));
    return o(p[0], p[1], q[0]) * o(p[0], p[1], q[1]) < 0 && o(q[0], q[1], p[0]) * o(q[0], q[1], p[1]) < 0; };
  const segBox = (l, b) => { const [x1, y1, x2, y2] = l, A = [x1, y1], B = [x2, y2];
    if ((x1 > b.x0 && x1 < b.x1 && y1 > b.y0 && y1 < b.y1) || (x2 > b.x0 && x2 < b.x1 && y2 > b.y0 && y2 < b.y1)) return true;
    const c = [[b.x0, b.y0], [b.x1, b.y0], [b.x1, b.y1], [b.x0, b.y1]];
    return c.some((p, i) => cross([A, B], [p, c[(i + 1) % 4]])); };
  const segPt = (l, x, y) => { const [x1, y1, x2, y2] = l, dx = x2 - x1, dy = y2 - y1, t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy || 1)));
    return Math.hypot(x1 + t * dx - x, y1 + t * dy - y); };
  function labels(svg, items, bounds, only, obst = []) {
    const g = S("g", {}, svg), L = items.filter(it => !only || only.has(it.m.key)), h = 14;
    const ms = S("text", { class: "lbl", x: -999, y: -999 }, g);
    for (const it of L) { ms.textContent = it.label; const w = ms.getComputedTextLength(); it.w = (w > 0 ? w : it.label.length * 6.3) + 3; }
    ms.remove();
    const inB = b => b.x0 >= bounds.x0 && b.x1 <= bounds.x1 && b.y0 >= bounds.y0 && b.y1 <= bounds.y1;
    const PB = items.map(it => ({ x0: it.x - 7, x1: it.x + 7, y0: it.y - 7, y1: it.y + 7, it }));
    const C = L.map(it => {
      const w = it.w, out = [], box = (x0, y0) => ({ x0, x1: x0 + w, y0, y1: y0 + h });
      for (const [x0, y0, c] of [[it.x + 9, it.y - h / 2, 0], [it.x - 9 - w, it.y - h / 2, 1], [it.x - w / 2, it.y - 9 - h, 1.5], [it.x - w / 2, it.y + 9, 1.5],
        [it.x + 5, it.y - 5 - h, 2], [it.x + 5, it.y + 5, 2], [it.x - 5 - w, it.y - 5 - h, 2.5], [it.x - 5 - w, it.y + 5, 2.5]]) out.push({ b: box(x0, y0), c, l: null });
      for (const R of [24, 36, 52, 72]) for (let k = 0; k < 16; k++) {
        const t = k * Math.PI / 8, dx = Math.cos(t), dy = Math.sin(t), ex = it.x + dx * R, ey = it.y + dy * R;
        const b = dx > .38 ? box(ex + 2, ey - h / 2) : dx < -.38 ? box(ex - 2 - w, ey - h / 2) : box(ex - w / 2, dy < 0 ? ey - h - 1 : ey + 1);
        out.push({ b, c: 6 + R * .14, l: [it.x + dx * 8, it.y + dy * 8, ex, ey] });
      }
      return out.filter(c => inB(c.b)).concat([{ b: null, c: 4000, l: null }]);     // last resort: no label
    });
    // the part of a candidate's cost that does not depend on the other labels
    const own = C.map((cs, i) => cs.map(c => { if (!c.b) return c.c; let v = c.c;
      const bd = q => Math.hypot(Math.max(c.b.x0 - q.x, 0, q.x - c.b.x1), Math.max(c.b.y0 - q.y, 0, q.y - c.b.y1)), d0 = c.l ? 2 : bd(L[i]);
      for (const p of PB) { if (ov(c.b, p)) v += 1e4 + 50 * area(c.b, p); if (p.it === L[i]) continue;
        if (c.l && segPt(c.l, p.it.x, p.it.y) < 8) v += 1500;
        if (bd(p.it) < d0 + 7) v += 400; }                    // another point as close as its own: the label would read as that point's
      for (const o of obst) { if (ov(c.b, o)) v += o.w ?? 40; if (c.l && segBox(c.l, o)) v += (o.w ?? 40) / 8; }
      return v; }));
    const pair = (c, d) => { if (!c.b || !d.b) return 0; let v = 0;
      if (ov(c.b, d.b)) v += 1e4 + 50 * area(c.b, d.b);
      if (c.l && segBox(c.l, d.b)) v += 5000; if (d.l && segBox(d.l, c.b)) v += 5000;    // worse than no label
      if (c.l && d.l && cross([[c.l[0], c.l[1]], [c.l[2], c.l[3]]], [[d.l[0], d.l[1]], [d.l[2], d.l[3]]])) v += 3000;
      return v; };
    const n = L.length; let bestSel = null, bestCost = Infinity, seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let run = 0; run < 6; run++) {
      const sel = new Array(n).fill(-1), order = [...Array(n).keys()].sort((a, b) => L[a].y - L[b].y);
      if (run) for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
      const costOf = (i, k) => { let v = own[i][k]; for (let j = 0; j < n; j++) if (j !== i && sel[j] >= 0) v += pair(C[i][k], C[j][sel[j]]); return v; };
      for (let pass = 0; pass < 30; pass++) {
        let moved = false;
        for (const i of order) { let bk = sel[i], bv = bk >= 0 ? costOf(i, bk) : Infinity;
          for (let k = 0; k < C[i].length; k++) { const v = costOf(i, k); if (v < bv - 1e-9) { bv = v; bk = k; } }
          if (bk !== sel[i]) { sel[i] = bk; moved = true; } }
        if (!moved) break;
      }
      let tot = 0; for (let i = 0; i < n; i++) { tot += own[i][sel[i]]; for (let j = i + 1; j < n; j++) tot += pair(C[i][sel[i]], C[j][sel[j]]); }
      if (tot < bestCost) { bestCost = tot; bestSel = sel.slice(); }
    }
    L.forEach((it, i) => { const c = C[i][bestSel[i]]; if (!c.b) return;
      if (c.l) S("line", { class: "lead", x1: c.l[0], y1: c.l[1], x2: c.l[2], y2: c.l[3] }, g);
      S("text", { class: "lbl", x: c.b.x0 + 1, y: c.b.y0 + 11, "text-anchor": "start" }, g).textContent = it.label; });
  }
  function points(svg, pts, tipFn) {
    const g = S("g", {}, svg);
    for (const p of pts.sort((a, b) => (a.m.group === "s2") - (b.m.group === "s2"))) {
      const a = S("g", { class: "pt", tabindex: 0, role: "button", "aria-label": `${p.m.name}: ${p.aria}` }, g);
      mark(a, p.m, p.x, p.y);
      bindTip(a, () => tipFn(p.m));
      a.addEventListener("click", () => openModel(p.m));
      a.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openModel(p.m); } });
    }
  }
  const sizeLegend = (auto = true, extra = "") => Object.entries(SIZE).map(([s, c]) => `<span><i style="background:${c}"></i>${s}</span>`).join("") +
    `<span><i class="dia" style="background:${API}"></i>Closed API</span>` + (auto ? `<span><i class="ring" style="--c:${SIZE["4B"]}"></i>Hybrid</span>` +
    `<span><i class="dia" style="background:${S2C}"></i>GPT-6 (System Two)</span>` : "") + extra;

  const INS = {
    speed: { title: "Score against latency", sub: "Dashed line: the best score reachable at each speed.",
      note: "Mean latency per task: open weights on one H100 GPU, APIs end to end." },
    rel: { title: "Reliability against score", sub: "A higher score does not always mean higher reliability.", note: "" },
    sn: { title: "Decision reliability", sub: "Option-order stability S against null discrimination N; dashed curves mark constant R.", note: "Jeva-4B's S is 1 by construction (its option cache)." },
    tier: { title: "Scores by difficulty tier", sub: "Tiers are defined within each domain, not across domains.", note: "Highlighted: the domain's best System One model, StartLux Instant and GPT-6 Luna." },
    order: { title: "How accuracy moves with the option order", sub: "Each dot: one of 12 shuffles, against the original order. Ranked by the range over all 13 orders, most stable first.", note: "Range: points between a model's best and worst accuracy over the 13 orders (the original and 12 shuffles); ties go to the higher option-order stability S. Accuracy from the reliability runs, separate from the leaderboard score. Jeva-4B scores each option on its own, so order cannot change its answer." },
    gap: { title: "Gap to GPT-6 Luna, by domain", sub: "Medium and hard tiers, with 95% confidence intervals.", note: "Not only the leaderboard tier, so the gaps differ from the domain cards. Domains are grouped by how the gap behaves. Smaller models build on Qwen3.5, larger ones on Qwen3.8-27B." },
  };
  let tierDom = "math";
  // Two chart panels share this routine: Results (speed, difficulty, gap) and the Reliability section's evidence.
  const PANELS = [{ key: "speed", pair: true, host: "#spchart", lg: "#sp-legend", title: "#sp-title", sub: "#sp-sub", note: "#sp-note" },
                  { key: "sn", pair: true, host: "#snchart", lg: "#sn-legend", title: "#sn-title", sub: "#sn-sub", note: "#sn-note" },
                  { key: "tier", tabs: "#ins-tabs", host: "#chart", lg: "#legend", title: "#ins-title", sub: "#ins-sub", note: "#ins-note" },
                  { key: "rel", tabs: "#rel-tabs", host: "#rchart", lg: "#rlegend", title: "#r-title", sub: "#r-sub", note: "#r-note" }];
  const insights = () => PANELS.forEach(drawPanel);
  // Switching tabs: each card takes its own tab's height, eased over 240 ms (no blank space, no jump); the chart fades in.
  function switchPanel(P, k) {
    const card = $(P.host).closest(".panel"), h0 = card.offsetHeight;
    P.key = k; drawPanel(P);
    if (RM) return;
    const h1 = card.offsetHeight;
    if (Math.abs(h1 - h0) > 2) card.animate([{ height: h0 + "px", overflow: "hidden" }, { height: h1 + "px", overflow: "hidden" }], { duration: 240, easing: "cubic-bezier(.2, .8, .2, 1)" });
    $(P.host).animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: "ease-out" });
  }
  function drawPanel(P) {
    const insKey = P.key, c = INS[insKey], LG = $(P.lg);
    $(P.title).innerHTML = esc(c.title) + (c.note ? ` <button class="info" type="button" data-info="${esc(c.note)}">i</button>` : ""); $(P.sub).textContent = c.sub; $(P.note).textContent = "";
    if (P.host === "#chart") $("#tier-chips").hidden = insKey !== "tier";
    const host = $(P.host);
    host.classList.toggle("html", insKey === "gap"); host.setAttribute("role", insKey === "gap" || insKey === "order" ? "region" : "img");
    if (insKey === "speed") {
      const { svg, W, H } = frame(host, P.pair ? .9 : .56, host.clientWidth < 460 ? 400 : 340, 540), m = { l: 44, r: 20, t: 30, b: 40 };
      const lx = v => Math.log10(v), X0 = lx(4), X1 = lx(5000);
      const xs = v => m.l + (lx(v) - X0) / (X1 - X0) * (W - m.l - m.r), ys = v => H - m.b - (v - 25) / 65 * (H - m.t - m.b);
      axes(svg, W, H, m, xs, ys, [[10, "10 ms"], [100, "100 ms"], [1000, "1 s"]], [30, 40, 50, 60, 70, 80, 90].map(v => [v, v]), "Mean latency per task (log scale) →", "↑ Score");
      const fr = []; let best = -1;
      for (const o of [...S1].sort((a, b) => a.latency.mean_ms - b.latency.mean_ms || b.score - a.score)) if (o.score > best) { fr.push(o); best = o.score; }
      S("path", { d: fr.map((o, i) => `${i ? "L" : "M"}${xs(o.latency.mean_ms)} ${ys(o.score)}`).join(""), fill: "none", stroke: "var(--ink-2)", "stroke-width": 1.6, "stroke-dasharray": "5 4", "stroke-linejoin": "round", opacity: .7 }, svg);
      const pts = M.map(o => ({ m: o, x: xs(o.latency.mean_ms), y: ys(o.score), label: o.name, aria: `score ${f2(o.score)}, ${ms(o.latency.mean_ms)}` }));
      points(svg, pts, o => mtip(o, `<br><span class="m">${ms(o.latency.mean_ms)}</span> <span class="s">mean latency (${o.latency.timing}${o.key === "SII-Decision-4B" ? ", with flash-linear-attention" : ""})</span>`));
      labels(svg, pts, { x0: m.l, x1: W - m.r + 14, y0: m.t - 4, y1: H - m.b }, W < 460 ? new Set([...fr.filter((o, i) => !i || i === fr.length - 1 || o.key === "StartLux-4B-Instant"), ...top(S1, o => o.score, 3), ...M.filter(o => closed(o) || o.group === "auto")].map(o => o.key)) : null,
        lineBoxes(fr.map(o => [xs(o.latency.mean_ms), ys(o.score)])));
      LG.innerHTML = sizeLegend(true, `<span><i class="ln dash"></i>Pareto frontier</span>`);
    } else if (insKey === "rel" || insKey === "sn") {
      const { svg, W, H } = frame(host, P.pair ? .9 : .56, host.clientWidth < 460 ? 400 : 340, 540), m = { l: 44, r: 20, t: 30, b: 40 };
      const RL = S1.filter(o => o.reliability);
      let pts; const rb = [];                                  // the R labels' boxes: model labels keep off them
      if (insKey === "rel") {
        const xs = v => m.l + (v - 28) / 46 * (W - m.l - m.r), ys = v => H - m.b - v / 90 * (H - m.t - m.b);
        axes(svg, W, H, m, xs, ys, [30, 40, 50, 60, 70].map(v => [v, v]), [0, 20, 40, 60, 80].map(v => [v, v]), "Score →", "↑ Reliability R");
        pts = RL.map(o => ({ m: o, x: xs(o.score), y: ys(o.reliability.R), label: o.name, aria: `score ${f2(o.score)}, R ${f1(o.reliability.R)}` }));
      } else {
        const xs = v => m.l + (v - .3) / .72 * (W - m.l - m.r), ys = v => H - m.b - v / .85 * (H - m.t - m.b);
        axes(svg, W, H, m, xs, ys, [.4, .5, .6, .7, .8, .9, 1].map(v => [v, v.toFixed(1)]), [0, .2, .4, .6, .8].map(v => [v, v.toFixed(1)]), "Option-order stability S →", "↑ Null discrimination N");
        const g = S("g", {}, svg);
        for (const r of [.2, .4, .6, .8]) {
          const d = [], cp = []; for (let s = .3; s <= 1.02; s += .01) { const n = r * r / s; if (n <= .85) { d.push(`${d.length ? "L" : "M"}${xs(s)} ${ys(n)}`); cp.push([xs(s), ys(n)]); } }
          rb.push(...lineBoxes(cp, 2, 6));                  // labels may cross the light curves, at a small cost
          S("path", { d: d.join(""), fill: "none", stroke: "#c9c7bd", "stroke-dasharray": "4 4", "stroke-width": 1.1 }, g);
          const s0 = Math.max(.3, r * r / .85);            // label where the curve enters the plot (top or left), away from the points
          S("text", { class: "tick", x: xs(s0) + 6, y: ys(r * r / s0) + 14, "text-anchor": "start" }, g).textContent = `R = ${r * 100}`;
          rb.push({ x0: xs(s0) + 2, x1: xs(s0) + 56, y0: ys(r * r / s0) + 2, y1: ys(r * r / s0) + 18, w: 1e4 });   // never covered
        }
        pts = RL.map(o => ({ m: o, x: xs(o.reliability.S), y: ys(o.reliability.N), label: o.name, aria: `S ${o.reliability.S.toFixed(2)}, N ${o.reliability.N.toFixed(2)}` }));
      }
      points(svg, pts, o => mtip(o, `<br><span class="m">${f1(o.reliability.R)}</span> <span class="s">R · #${RANK_R.get(o.key)} of 18 · S ${o.reliability.S.toFixed(2)} · N ${o.reliability.N.toFixed(2)}</span>`));
      labels(svg, pts, { x0: m.l, x1: W - m.r + 14, y0: m.t - 4, y1: H - m.b }, W < 460 ? new Set([...top(RL, R_, 3), ...top(RL, o => o.score, 3), ...RL.filter(closed), ...top(RL, o => -R_(o), 2)].map(o => o.key)) : null, rb);
      LG.innerHTML = sizeLegend(false);
    } else if (insKey === "order") {
      orderChart(host, LG);
    } else if (insKey === "tier") {
      tierChart(host, tierDom, LG);
    } else {
      gap(host, LG);
    }
  }
  function orderChart(host, lg) {
    // Change from the original option order, per reordering. Rows ranked by the range of accuracy over the 13 orders
    // (the original and 12 shuffles), narrowest first; ties by option-order stability S. The range is printed at the right.
    const span = o => { const v = [o.order_acc.original, ...o.order_acc.runs]; return Math.max(...v) - Math.min(...v); };
    const L = S1.filter(o => o.order_acc).sort((a, b) => span(a) - span(b) || (R_(b) != null ? b.reliability.S : 0) - (R_(a) != null ? a.reliability.S : 0));
    const dev = L.flatMap(o => o.order_acc.runs.map(v => Math.abs(v - o.order_acc.original))), X = Math.max(2, Math.ceil(Math.max(...dev)));
    const rowH = 24, narrow = host.clientWidth < 520, m = { l: narrow ? 116 : 150, r: narrow ? 40 : 92, t: 30, b: 42 };
    host.innerHTML = "";
    const W = Math.max(320, host.clientWidth), H = m.t + m.b + rowH * L.length;
    const svg = S("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H }, host);
    const xs = v => m.l + (v + X) / (2 * X) * (W - m.l - m.r);
    const g = S("g", { class: "grid" }, svg);
    for (let v = -X; v <= X; v++) {
      S("line", { x1: xs(v), x2: xs(v), y1: m.t - 8, y2: H - m.b, stroke: v === 0 ? "#b9b7ad" : null }, g);
      S("text", { class: "tick", x: xs(v), y: H - m.b + 18, "text-anchor": "middle" }, svg).textContent = v > 0 ? `+${v}` : v < 0 ? `−${-v}` : "0";
    }
    S("text", { class: "axis-t", x: xs(0), y: H - 6, "text-anchor": "middle" }, svg).textContent = "Change from the original order (points)";
    S("text", { class: "tick", x: W - 10, y: m.t - 12, "text-anchor": "end" }, svg).textContent = "range";
    L.forEach((o, i) => {
      const a = o.order_acc, y = m.t + rowH * i + rowH / 2, c = colorOf(o), d = a.runs.map(v => v - a.original);
      const r = S("g", { class: "pt", tabindex: 0, role: "button", "aria-label": `${i + 1}. ${o.name}: range ${f1(span(o))} points over 13 orders; original order ${f1(a.original)}` }, svg);
      S("rect", { x: 0, y: y - rowH / 2, width: W, height: rowH, fill: "transparent" }, r);
      S("text", { class: "lbl", x: m.l - 12, y: y + 4, "text-anchor": "end" }, r).textContent = o.name;
      if (!narrow) S("text", { class: "tick", x: 4, y: y + 4, "text-anchor": "start" }, r).textContent = i + 1;
      S("line", { x1: xs(Math.min(0, ...d)), x2: xs(Math.max(0, ...d)), y1: y, y2: y, stroke: c, "stroke-width": 4, "stroke-linecap": "round", opacity: .3 }, r);
      for (const v of d) S("circle", { cx: xs(v), cy: y, r: 3, fill: c, opacity: .85 }, r);
      if (span(o) === 0 && !narrow) S("text", { class: "tick", x: xs(0) + 10, y: y + 4, "text-anchor": "start" }, r).textContent = "scores each option alone: order cannot matter";
      S("text", { class: "tick", x: W - 10, y: y + 4, "text-anchor": "end" }, r).textContent = f1(span(o));
      bindTip(r, () => `<b>${esc(o.name)}</b> <span class="s">#${i + 1} of ${L.length}</span><br><span class="m">${f1(span(o))}</span> <span class="s">points between its best and worst of 13 orders · original ${f1(a.original)}</span>${HINT}`);
      r.addEventListener("click", () => openModel(o));
    });
    lg.innerHTML = `<span><i style="background:var(--muted)"></i>One reordering</span>` +
      Object.entries(SIZE).map(([k, c]) => `<span><i style="background:${c}"></i>${k}</span>`).join("") + `<span><i class="dia" style="background:${API}"></i>Closed API</span>`;
  }
  function tierChart(host, id, lgHost, compact = false) {
    const d = DOM[id], ks = Object.keys(d.tiers), names = { E: "Easy", M: "Medium", H: "Hard", V: "Very hard" };
    const { svg, W, H } = frame(host, compact ? .62 : .56, 300, compact ? 380 : 500);
    const m = { l: 40, r: compact ? 104 : 128, t: 30, b: 40 };
    const xs = i => m.l + i / (ks.length - 1) * (W - m.l - m.r), ys = v => H - m.b - v / 100 * (H - m.t - m.b);
    axes(svg, W, H, m, xs, ys, ks.map((k, i) => [i, W < 520 ? ({ E: "Easy", M: "Med.", H: "Hard", V: "V. hard" })[k] : names[k]]), [0, 20, 40, 60, 80, 100].map(v => [v, v]), "", "↑ Score");
    const val = o => o.domains[id];
    const tops = top(S1, val, compact ? 3 : 1), hi = new Set([...tops.map(o => o.key), ...(compact ? [] : ["StartLux-4B-Instant"]), LUNA.key]);
    const SHADES = ["#8e2c43", "#c4687c", "#e2a7b4"];
    const lineCol = o => o.group === "s2" ? "var(--s2)" : tops.includes(o) ? SHADES[tops.indexOf(o)] : colorOf(o);
    const g = S("g", {}, svg), ends = [];
    for (const o of [...M].sort((a, b) => hi.has(a.key) - hi.has(b.key))) {
      const t = o.tiers[id], pts = ks.map((k, i) => [xs(i), ys(t[k])]), on = hi.has(o.key), col = lineCol(o);
      const dd = pts.map((p, i) => `${i ? "L" : "M"}${p[0]} ${p[1]}`).join("");
      const a = S("g", { class: "pt", tabindex: 0, role: "button", "aria-label": `${o.name}: ${ks.map(k => `${names[k]} ${t[k]}`).join(", ")}` }, g);
      S("path", { d: dd, fill: "none", stroke: "transparent", "stroke-width": 12 }, a);
      const ln = S("path", { d: dd, fill: "none", stroke: on ? col : "#d9d7ce", "stroke-width": on ? 2.4 : 1.2, "stroke-dasharray": o.group === "s2" ? "5 4" : null }, a);
      for (const p of pts) S("circle", { cx: p[0], cy: p[1], r: on ? 3.4 : 2, fill: on ? col : "#d9d7ce", stroke: "#fff", "stroke-width": on ? 1.2 : 0 }, a);
      bindTip(a, () => `<b>${esc(o.name)}</b><br><span class="m">${ks.map(k => `${k} ${t[k]}`).join(" · ")}</span>${HINT}`);
      a.addEventListener("pointerenter", () => { ln.setAttribute("stroke", col); ln.setAttribute("stroke-width", 2.6); a.parentNode.appendChild(a); });
      a.addEventListener("pointerleave", () => { if (!on) { ln.setAttribute("stroke", "#d9d7ce"); ln.setAttribute("stroke-width", 1.2); } });
      a.addEventListener("click", () => openModel(o));
      if (on) ends.push({ x: pts[pts.length - 1][0], y: pts[pts.length - 1][1], label: o.name });
    }
    ends.sort((a, b) => a.y - b.y);
    for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 15) ends[i].y = ends[i - 1].y + 15;
    for (const e of ends) S("text", { class: "lbl", x: e.x + 9, y: e.y + 4 }, svg).textContent = e.label;
    if (lgHost) lgHost.innerHTML = [...tops, ...M.filter(o => hi.has(o.key) && !tops.includes(o))].map(o => `<span><i class="${o.group === "s2" ? "dash" : ""}" style="${o.group === "s2" ? "" : `background:${lineCol(o)}`}"></i>${esc(o.name)}</span>`).join("") + `<span><i class="ln" style="background:#d9d7ce"></i>Other models</span>`;
  }
  const showChart = k => { const t = document.getElementById("k-" + k); if (t) t.closest('[role="tablist"]')._sel(t.id); };
  function insightsControls() {
    PANELS.filter(P => P.tabs).forEach(P => tabs($(P.tabs), (id, t) => switchPanel(P, t.dataset.k)));
    const TD = D.domains.filter(d => d.tiers);
    $("#tier-chips").innerHTML = TD.map(d => `<button type="button" class="chip" data-td="${d.id}" aria-pressed="${d.id === tierDom}">${esc(d.short)}</button>`).join("");
    $("#tier-chips").addEventListener("click", e => { const b = e.target.closest("[data-td]"); if (!b) return; tierDom = b.dataset.td; $$("[data-td]").forEach(o => o.setAttribute("aria-pressed", o === b)); insights(); });
  }

  // ---- reliability demo and facts -----------------------------------------------------------------------------------
  // Reliability demo, after the paper's Fig. 1: a robot jumps to hit the option it chooses. Scene 1: the original options;
  // scene 2: the options shuffle and the robot follows B; scene 3: B is removed, "Null" appears, and the robot hits it.
  // It plays while in view, pauses briefly, rewinds softly and plays again; a small button pauses it.
  const ROBOT = `<svg viewBox="0 0 28 34" aria-hidden="true">
    <path d="M14 6V2.6" stroke="#1b2129" stroke-width="1.6" stroke-linecap="round"/><circle class="tip" cx="14" cy="2.2" r="2.1" fill="var(--cap)"/>
    <rect x="1.6" y="11.6" width="2.6" height="5.4" rx="1.3" fill="#1b2129"/><rect x="23.8" y="11.6" width="2.6" height="5.4" rx="1.3" fill="#1b2129"/>
    <rect x="3.4" y="6" width="21.2" height="15.2" rx="6" fill="#1b2129"/><rect x="6.4" y="9.2" width="15.2" height="8.6" rx="4.3" fill="#2b3442"/>
    <g class="eyes"><circle cx="11" cy="13.5" r="1.75" fill="#9fd4ff"/><circle cx="17" cy="13.5" r="1.75" fill="#9fd4ff"/></g>
    <rect x="7.6" y="22.2" width="12.8" height="7.4" rx="3" fill="#1b2129"/>
    <rect x="9" y="28.8" width="3.6" height="4.8" rx="1.6" fill="#1b2129"/><rect x="15.4" y="28.8" width="3.6" height="4.8" rx="1.6" fill="#1b2129"/></svg>`;
  function demo() {
    const host = $("#demo");
    const SC = [["Original options", "", "Correct"], ["Shuffled", "s", "Same answer"], ["Correct option missing", "n", "Picks Null"]];
    host.innerHTML = SC.map(([h, k, v], i) => `<div class="scene2" data-i="${i}"><div class="sh">${k ? `<b class="sym ${k}">${k.toUpperCase()}</b>` : ""}<span>${h}</span></div>
        <div class="stage2"><span class="rbt"><span class="rbt-b">${ROBOT}</span><i class="shd"></i></span></div>
        <div class="verdict"><svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7.5" fill="#e3f1e9"/><path d="M4.5 8.2l2.3 2.3 4.7-5" fill="none" stroke="#2f7d57" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>${v}</div></div>`).join("") +
      `<button class="replay" type="button" id="dpause" aria-label="Pause the demo" aria-pressed="false"><svg viewBox="0 0 16 16" aria-hidden="true"><path class="pz" d="M5.5 3.5v9M10.5 3.5v9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path class="pl" d="M5 3.2l8 4.8-8 4.8z" fill="currentColor"/></svg></button>`;
    const BW = 40, GAP = 10, NW = 56, SW = 206;
    const scenes = $$(".scene2", host).map(s => {
      const st = $(".stage2", s), mk = (t, w = BW) => { const b = document.createElement("span"); b.className = "op" + (t === "Null" ? " nul" : ""); b.textContent = t; b.style.width = w + "px"; st.appendChild(b); return b; };
      const o = { s, st, A: mk("A"), B: mk("B"), C: mk("C"), bot: $(".rbt", s), v: $(".verdict", s) };
      if (s.dataset.i === "2") o.N = mk("Null", NW);
      o.x0 = o.N ? 0 : (SW - 3 * BW - 2 * GAP) / 2;
      return o;
    });
    const wOf = b => b.classList.contains("nul") ? NW : BW;
    const place = (o, order) => { let x = o.x0; for (const b of order) { b.style.left = x + "px"; x += wOf(b) + GAP; } };
    const walk = (o, b, dur = 620) => {                           // walk under an option, with a small bob while moving
      const to = parseFloat(b.style.left) + wOf(b) / 2 - 14;
      o.bot.style.transitionDuration = dur + "ms"; o.bot.classList.add("walk"); o.bot.style.left = to + "px";
      later(() => o.bot.classList.remove("walk"), dur);
    };
    const hit = (o, b) => {                                      // crouch, jump, hit the option at the top, land
      o.bot.classList.remove("jump"); void o.bot.offsetWidth; o.bot.classList.add("jump");
      later(() => { b.classList.add("bump", "pick"); later(() => b.classList.remove("bump"), 240); }, 230);
      later(() => o.bot.classList.remove("jump"), 620);
    };
    let timers = [], paused = false, inView = false;
    const later = (f, t) => timers.push(setTimeout(f, t));
    function reset() {
      timers.forEach(clearTimeout); timers = [];
      for (const o of scenes) {
        [o.A, o.B, o.C, o.N].forEach(b => b && b.classList.remove("pick", "gone", "bump", "lift", "show"));
        place(o, [o.A, o.B, o.C]); if (o.N) o.N.style.left = 3 * (BW + GAP) + "px";
        o.bot.classList.remove("jump", "walk", "fade"); o.bot.style.transitionDuration = "0ms"; o.bot.style.left = (o.x0 - 30) + "px"; void o.bot.offsetWidth; o.bot.style.transitionDuration = "";
        o.v.classList.remove("on");
      }
    }
    function final() {                                           // the end state, for reduced motion
      reset(); const [a, b, c] = scenes;
      a.B.classList.add("pick"); a.bot.style.left = (parseFloat(a.B.style.left) + 6) + "px";
      place(b, [b.C, b.A, b.B]); b.B.classList.add("pick"); b.bot.style.left = (parseFloat(b.B.style.left) + 6) + "px";
      c.B.classList.add("gone"); c.N.classList.add("show", "pick"); c.bot.style.left = (parseFloat(c.N.style.left) + 14) + "px";
      scenes.forEach(o => o.v.classList.add("on"));
    }
    function play() {
      reset(); const [a, b, c] = scenes;
      later(() => scenes.forEach(o => walk(o, o.B)), 250);                 // all three robots go to B and hit it
      later(() => scenes.forEach(o => hit(o, o.B)), 950);
      later(() => a.v.classList.add("on"), 1450);
      later(() => { b.B.classList.remove("pick"); b.B.classList.add("lift"); }, 1900);   // shuffle: B lifts and moves to the end
      later(() => place(b, [b.C, b.A, b.B]), 2050);
      later(() => b.B.classList.remove("lift"), 2650);
      later(() => walk(b, b.B, 560), 2700);
      later(() => hit(b, b.B), 3330);
      later(() => b.v.classList.add("on"), 3850);
      later(() => { c.B.classList.remove("pick"); c.B.classList.add("gone"); }, 1900);   // the correct option drops out
      later(() => c.N.classList.add("show"), 2550);                                       // "Null" slides in
      later(() => walk(c, c.N, 680), 2950);
      later(() => hit(c, c.N), 3700);
      later(() => c.v.classList.add("on"), 4250);
      later(rewind, 6900);
    }
    function rewind() {                                          // a soft rewind: verdicts and robots fade, options glide back
      scenes.forEach(o => { o.v.classList.remove("on"); o.bot.classList.add("fade"); [o.A, o.B, o.C, o.N].forEach(x => x && x.classList.remove("pick")); });
      later(() => { const [, b, c] = scenes; place(b, [b.A, b.B, b.C]); c.N.classList.remove("show"); c.B.classList.remove("gone"); }, 150);
      later(play, 1000);
    }
    const start = () => { if (!paused && inView) play(); };
    const btn = $("#dpause");
    if (RM) { final(); btn.hidden = true; return; }
    btn.addEventListener("click", () => {
      paused = !paused; btn.setAttribute("aria-pressed", String(paused)); btn.setAttribute("aria-label", paused ? "Play the demo" : "Pause the demo");
      if (paused) { timers.forEach(clearTimeout); timers = []; } else start();
    });
    reset();
    if ("IntersectionObserver" in window) new IntersectionObserver(es => { const v = es.some(e => e.isIntersecting); if (v === inView) return; inView = v; if (v) start(); else reset(); }, { threshold: .35 }).observe(host);
    else { inView = true; start(); }
  }
  function gap(host, lg) {
    const CATS = [["direct", "Direct semantic judgment", "System One models perform comparably to System Two."],
      ["grounded", "Fine-grained grounded decision", "Only the larger, more capable backbone comes close."],
      ["derivation", "Multi-step derivation", "Both System One models fall far behind."]];
    const G1 = "#8e2c43", G2 = "#dba1ae", BB = "#4a535c", TH = "#a3a8ae";
    const gx = v => 4 + (v + 50) / 65 * 90, bx = v => 4 + (v + 5) / 50 * 88, tx = bx;      // both gains on one scale
    const rect = (x0, x1, y, h, c) => `<rect x="${Math.min(x0, x1)}%" y="${y}" width="${Math.max(.4, Math.abs(x1 - x0))}%" height="${h}" rx="2" fill="${c}"/>`;
    const ci = (c, y) => `<line x1="${gx(c[0])}%" x2="${gx(c[1])}%" y1="${y}" y2="${y}" stroke="var(--ink-2)" stroke-width="1.6" opacity=".75"/>`;
    const sg = v => (v > 0 ? "+" : v < 0 ? "−" : "") + f1(Math.abs(v)), lgHtml = gapLegend(G1, G2, BB, TH);
    const vgrid = (f, vals, y1, y2) => vals.map(v => `<line x1="${f(v)}%" x2="${f(v)}%" y1="${y1}" y2="${y2}" stroke="${v === 0 ? "#b9b7ad" : "#efeee9"}"/>`).join("");
    const head = (f, vals, title) => `<svg class="gap-ticks" aria-hidden="true">${vals.map(v => `<text x="${f(v)}%" y="27" text-anchor="middle">${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v)}</text>`).join("")}<text class="t" x="${f(0) - 1}%" y="11" text-anchor="end">${title}</text></svg>`;
    const headG = t => `<svg class="gap-ticks" aria-hidden="true">${[0, 20, 40].map(v => `<text x="${bx(v)}%" y="27" text-anchor="middle">${v ? "+" + v : 0}</text>`).join("")}<text class="t" x="${bx(0)}%" y="11">${t}</text></svg>`;
    const row = a => {
      const d = DOM[a.domain], z = gx(0);
      return `<div class="gap-r"><span class="dn">${esc(d.name)}</span>
        <div><span class="cl">Gap to GPT-6 Luna</span><svg role="img" aria-label="Gap to GPT-6 Luna: GLiDE ${sg(a.gap_glide)}, StartLux Instant ${sg(a.gap_startlux)}">${vgrid(gx, [-40, -30, -20, -10, 0, 10], 0, 34)}
          ${rect(z, gx(a.gap_glide), 6, 9, G1)}${ci(a.gap_glide_ci, 10.5)}${rect(z, gx(a.gap_startlux), 19, 9, G2)}${ci(a.gap_startlux_ci, 23.5)}
          <text x="${gx(Math.max(a.gap_glide_ci[1], 0)) + 1.2}%" y="14">${sg(a.gap_glide)}</text><text x="${gx(Math.max(a.gap_startlux_ci[1], 0)) + 1.2}%" y="27.5">${sg(a.gap_startlux)}</text></svg></div>
        <div class="gain"><span class="cl">Backbone gain</span><svg role="img" aria-label="Backbone gain ${sg(a.backbone_gain)}">${vgrid(bx, [0, 20, 40], 6, 28)}${rect(bx(0), bx(a.backbone_gain), 11, 12, BB)}<text x="${bx(a.backbone_gain) + 1.5}%" y="21">${sg(a.backbone_gain)}</text></svg></div>
        <div class="gain"><span class="cl">Thinking gain</span><svg role="img" aria-label="Thinking gain ${sg(a.thinking_gain)}">${vgrid(tx, [0, 20, 40], 6, 28)}${rect(tx(0), tx(a.thinking_gain), 11, 12, TH)}<text x="${tx(Math.max(0, a.thinking_gain)) + 1.5}%" y="21">${sg(a.thinking_gain)}</text></svg></div></div>`;
    };
    host.innerHTML = `<div class="gap"><div class="legend gap-lg">${lgHtml}</div><div class="gap-h label"><span>Domain</span>${head(gx, [-40, -30, -20, -10, 0, 10], "Gap to GPT-6 Luna")}<div class="gain">${headG("Backbone gain")}</div><div class="gain">${headG("Thinking gain")}</div></div>` +
      CATS.map(([id, h, t]) => `<div class="gap-c"><h4>${h}</h4><span>${t}</span></div>` + D.analysis.filter(a => a.category === id).map(row).join("")).join("") + `</div>`;
    lg.innerHTML = "";
  }
  function gapLegend(G1, G2, BB, TH) {
    return `<span><i style="background:${G1}"></i>GLiDE (27B)</span><span><i style="background:${G2}"></i>StartLux Instant (4B)</span><span><i class="ln" style="background:var(--ink-2)"></i>95% confidence interval</span>
      <span class="gain"><i style="background:${BB}"></i>Backbone gain: smaller → 27B model of the same line, mean of four lines</span><span class="gain"><i style="background:${TH}"></i>Thinking gain: StartLux Auto, always vs. never thinking</span>`;
  }

  // ---- benchmark ---------------------------------------------------------------------------------------------------
  function benchmark() {
    const t = D.totals;
    const steps = [
      ["Sources and quality control", "40", "established sources",
        "",
        ['<span>reviewed by people and an LLM</span>→<span class="ok">kept</span>/<span class="no">dropped</span>']],
      ["Organization and formulation", "11", "domains in five families",
        "",
        [`<span>${t.static.toLocaleString("en-US")} static</span>+<span>${(t.tools + t.web).toLocaleString("en-US")} sandbox</span>`, "<span>Easy</span>→<span>Medium</span>→<span>Hard</span><small class=\"fl-n\">(Math adds Very hard)</small>"]],
      ["Evaluation", t.leaderboard_tasks.toLocaleString("en-US"), "leaderboard tasks (hardest tier per domain)",
        "",
        ["<span>scored against the verified label</span>", "<span>then shuffled and with the answer removed</span>"]],
    ];
    $("#steps").innerHTML = steps.map(([h, big, cap, p, flow], i) => `<div class="step"><span class="n">STEP 0${i + 1}</span><div class="big">${big}</div><div class="big-cap">${cap}</div><h3>${h}</h3>${p ? `<p>${p}</p>` : ""}${flow.map(f => `<div class="flow">${f}</div>`).join("")}</div>`).join("");
    const rows = D.families.map(f => {
      const ds = D.domains.filter(d => d.family === f.id), n = ds.reduce((s, d) => s + d.tasks, 0);
      return ds.map((d, i) => `<tr style="--fc:${f.color}">${i === 0 ? `<td class="fam-cell" rowspan="${ds.length}"><i></i>${esc(f.name)}<div class="label" style="margin-top:6px">${n.toLocaleString("en-US")} tasks</div></td>` : ""}
        <td><span class="dn">${esc(d.name)}</span></td>
        <td class="num">${d.tasks}</td><td class="num tiers">${d.tiers ? Object.entries(d.tiers).map(([k, v]) => `<span class="tk">${k}</span>${v}`).join(" · ") : "—"}</td><td class="src">${esc(d.sources.join(d.sources_by_tier ? " → " : ", "))}</td></tr>`).join("");
    }).join("");
    $("#dtable").innerHTML = `<thead><tr><th>Family</th><th>Domain</th><th>Tasks</th><th class="tiers">Tasks per tier</th><th class="src">Sources</th></tr></thead><tbody>${rows}</tbody>`;
  }

  // ---- the four highlights under the title: hover or tap shows a small animated picture and two lines ----------------
  function highlights() {
    const pop = $("#hlpop"), items = $$(".hl li[data-hl]"); if (!pop || !items.length) return;
    const tiered = D.domains.filter(d => d.tiers).length, t = D.totals;
    // Each illustration compares other benchmarks (left) with SO-Arena (right), after the paper's Fig. 1, and reads
    // on its own: short in-picture labels, no reliance on the paragraph below. 380 units wide; animated by CSS once
    // the popover has the class "go"; the resting state is the final frame (reduced motion shows only that).
    const r1 = v => +v.toFixed(1), DK = "#1b2129", BLUE = "#6f9fd0", OCHRE = "#e0b46a", ROSE = "#d98a98";
    const tx = (x, y, t, c = "", an = "middle", st = "") => `<text x="${r1(x)}" y="${r1(y)}" text-anchor="${an}" class="${c}"${st ? ` style="${st}"` : ""}>${t}</text>`;
    const BOTG = c => { const ln = c === DK ? "" : ` stroke="${DK}" stroke-width="1.4"`;
      return `<path d="M14 6V2.6" stroke="${DK}" stroke-width="1.6" stroke-linecap="round"/><circle cx="14" cy="2.2" r="2.1" fill="var(--cap)"/>` +
        `<rect x="1.6" y="11.6" width="2.6" height="5.4" rx="1.3" fill="${DK}"/><rect x="23.8" y="11.6" width="2.6" height="5.4" rx="1.3" fill="${DK}"/>` +
        `<rect x="3.4" y="6" width="21.2" height="15.2" rx="6" fill="${c}"${ln}/><rect x="6.4" y="9.2" width="15.2" height="8.6" rx="4.3" fill="#2b3442"/>` +
        `<g class="eyes"><circle cx="11" cy="13.5" r="1.75" fill="#9fd4ff"/><circle cx="17" cy="13.5" r="1.75" fill="#9fd4ff"/></g>` +
        `<rect x="7.6" y="22.2" width="12.8" height="7.4" rx="3" fill="${c}"${ln}/>` +
        `<rect x="9" y="28.8" width="3.6" height="4.8" rx="1.6" fill="${DK}"/><rect x="15.4" y="28.8" width="3.6" height="4.8" rx="1.6" fill="${DK}"/>`; };
    // a robot with its feet at (x, y); the outer group carries the animation, in the picture's own units
    const bot = (x, y, sc, c = DK, cls = "", st = "") => `<g class="rb ${cls}"${st ? ` style="${st}"` : ""}><g transform="translate(${r1(x - 14 * sc)} ${r1(y - 34 * sc)}) scale(${sc})">${BOTG(c)}</g></g>`;
    const tick = (x, y, z, c = "", st = "") => `<path class="tk ${c}" pathLength="1"${st ? ` style="${st}"` : ""} d="M${r1(x - .5 * z)} ${r1(y)}L${r1(x - .12 * z)} ${r1(y + .4 * z)}L${r1(x + .55 * z)} ${r1(y - .45 * z)}"/>`;
    const xmk = (x, y, z, c = "", st = "") => { const d = .38 * z; return `<path class="xk ${c}"${st ? ` style="${st}"` : ""} d="M${r1(x - d)} ${r1(y - d)}L${r1(x + d)} ${r1(y + d)}M${r1(x + d)} ${r1(y - d)}L${r1(x - d)} ${r1(y + d)}"/>`; };
    const blk = (x, y, t, c = "", st = "", w = 16, h = 16) => `<g class="bk ${c}"${st ? ` style="${st}"` : ""}><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4"/><text x="${x + w / 2}" y="${r1(y + h / 2 + 3.6)}" text-anchor="middle">${t}</text></g>`;
    const arw = (x1, y1, x2, y2, c = "", st = "") => { const t = Math.atan2(y2 - y1, x2 - x1), h = 5, bx = x2 - h * Math.cos(t), by = y2 - h * Math.sin(t), px = -Math.sin(t) * h * .6, py = Math.cos(t) * h * .6;
      return `<g class="ar ${c}"${st ? ` style="${st}"` : ""}><path d="M${x1} ${y1}L${r1(bx)} ${r1(by)}"/><path class="ah" d="M${x2} ${y2}L${r1(bx + px)} ${r1(by + py)}L${r1(bx - px)} ${r1(by - py)}Z"/></g>`; };
    const star = (x, y, r, on, st) => `<path class="st${on ? " on" : ""}"${on ? ` style="${st}"` : ""} d="M${Array.from({ length: 10 }, (_, k) => { const t = (-90 + 36 * k) * Math.PI / 180, q = k % 2 ? r * .45 : r; return `${r1(x + q * Math.cos(t))} ${r1(y + q * Math.sin(t))}`; }).join("L")}Z"/>`;
    // One frame for all four: two equal panels, "Other benchmarks" (grey) and "SO-Arena" (white, the highlight's
    // colour), a mono label on top, a one-line verdict below. Verdict badges as in the reliability demo.
    const PW = 194, X1 = 206, HH = 160, SC = .62;
    const badge = (x, y, k, c = "", st = "") => `<g class="bd ${k} ${c}"${st ? ` style="${st}"` : ""}><circle cx="${x}" cy="${y}" r="8"/>` +
      (k === "ok" ? `<path d="M${r1(x - 3.7)} ${r1(y + .2)}l2.5 2.5 4.9 -5.2"/>` : `<text x="${x}" y="${r1(y + 3.9)}" text-anchor="middle">?</text>`) + `</g>`;
    const pic = (alt, L, R, cL, cR) => `<svg class="hv" viewBox="0 0 400 ${HH}" role="img" aria-label="${esc(alt)}">` +
      `<rect class="pn" x="0" y="0" width="${PW}" height="${HH}" rx="10"/><rect class="pn so" x="${X1 + .6}" y=".6" width="${PW - 1.2}" height="${HH - 1.2}" rx="9.5"/>` +
      tx(12, 20, "OTHER BENCHMARKS", "ph", "start") + tx(X1 + 12, 20, "SO-ARENA", "ph so", "start") + L + R +
      tx(12, HH - 13, cL, "pc", "start") + tick(X1 + 17, HH - 17, 9, "pt") + tx(X1 + 27, HH - 13, cR, "pc so", "start") + `</svg>`;
    const review = (x, q1, q2, n, d0) => `<rect class="cd" x="${x + 12}" y="30" width="170" height="62" rx="7"/>` +
      tx(x + 22, 48, q1, "q", "start") + tx(x + 22, 62, q2, "q", "start") + tx(x + 22, 82.5, "LABEL", "lk", "start") +
      [0, 1, 2, 3, 4].map(k => star(x + 62 + 11.5 * k, 79, 4.6, k < n, `--d:${r1(d0 + k * .1)}s`)).join("");
    const MC = ["#4fa39b", "#8a74b8", "#d4a24e"];                          // three different models
    const V = {
      labels: () => pic("Other benchmarks: a review saying 'Bought it for my parents' carries a five-star label the text does not support. SO-Arena: 'Fake product. Don't buy!' carries one star, checked against a reliable source and by human review.",
        review(0, "“Bought it for", "my parents.”", 5, .1) + bot(30, 128, SC, DK, "a-hop", "--d:.7s") + badge(51, 106, "q", "a-pop", "--d:.85s"),
        review(X1, "“Fake product.", "Don't buy!”", 1, 1.2) + `<g class="mag"><circle r="7.5"/><path d="M5.3 5.3l4.6 4.6"/></g>` +
          tick(X1 + 78, 108, 8, "a-draw", "--d:1.95s") + tx(X1 + 86, 111.5, "Reliable source", "ck a-in", "start", "--d:1.95s") +
          tick(X1 + 78, 123, 8, "a-draw", "--d:2.2s") + tx(X1 + 86, 126.5, "Human review", "ck a-in", "start", "--d:2.2s") +
          bot(X1 + 30, 128, SC, DK, "a-hop", "--d:2.4s") + badge(X1 + 51, 106, "ok", "a-pop", "--d:2.55s"),
        "Ambiguous label", "Verified label"),
      tiers: () => pic("Other benchmarks: three models all pass tasks of one uniform difficulty, so they tie. SO-Arena: easy, medium and hard tiers; the three models stop at different steps, so they separate.",
        `<path class="fl0" d="M14 118H180"/>` + [52, 97, 142].map((x, i) => bot(x, 118, SC, MC[i], "a-in", `--d:${r1(.1 + .1 * i)}s`) + badge(x, 85, "ok", "a-pop", `--d:${r1(.5 + .15 * i)}s`)).join(""),
        `<path class="fl" d="M${X1 + 12} 118H${X1 + 66}V94H${X1 + 122}V70H${X1 + 182}"/>` +
          tx(X1 + 39, 130, "EASY", "lk", "middle") + tx(X1 + 94, 106, "MEDIUM", "lk", "middle") + tx(X1 + 152, 82, "HARD", "lk", "middle") +
          bot(X1 + 39, 118, SC, MC[0], "c0") + bot(X1 + 94, 94, SC, MC[1], "c1") + bot(X1 + 152, 70, SC, MC[2], "c2"),
        "Uniform difficulty", "Stratified difficulty"),
      agents: () => pic("Other benchmarks: one question, one answer. SO-Arena: in a sandbox the model chooses one action after another (click, type, back), and the episode is scored by progress: three steps done, the fourth failed, the goal not reached.",
        `<g transform="translate(0 8)"><rect class="cd" x="14" y="46" width="58" height="46" rx="6"/><path class="cb" d="M14 56.5H72"/>` +
          [19.5, 24, 28.5].map(x => `<circle class="dot" cx="${x}" cy="51.3" r="1.4"/>`).join("") + `<path class="ln" d="M21 67H53M21 75H43"/>` + tx(62, 86, "?", "pq") +
          arw(78, 69, 93, 69, "a-in", "--d:.2s") + bot(108, 80, SC, DK, "a-hop", "--d:.4s") + blk(126, 60, "B", "pk a-pop", "--d:.65s", 18, 18) + badge(165, 69, "ok", "a-pop", "--d:.85s") + `</g>`,
        `<rect class="sbx" x="${X1 + 8}" y="29" width="178" height="72" rx="8"/>` + tx(X1 + 182, 20, "SANDBOX", "lk sb", "end") +
          `<rect class="cd" x="${X1 + 16}" y="38" width="46" height="40" rx="5"/><path class="cb" d="M${X1 + 16} 47H${X1 + 62}"/>` +
          [21, 25, 29].map(x => `<circle class="dot" cx="${X1 + x}" cy="42.5" r="1.3"/>`).join("") +
          `<rect class="pgh" x="${X1 + 21}" y="53" width="34" height="6" rx="2"/><path class="ln" d="M${X1 + 22} 66H${X1 + 52}M${X1 + 22} 72H${X1 + 44}"/>` +
          arw(X1 + 66, 58, X1 + 78, 58) + bot(X1 + 92, 70, SC, DK, "a-hop4") +
          [["click", 36, "f1"], ["type", 52, "f2"], ["back", 68, "f3"]].map(([t, y, f]) => `<g class="ch ${f}"><rect x="${X1 + 108}" y="${y}" width="48" height="14" rx="7"/>${tx(X1 + 132, y + 10.2, t)}</g>`).join("") +
          `<path class="lp" d="M${X1 + 156} 43C${X1 + 176} 43 ${X1 + 176} 92 ${X1 + 156} 92H${X1 + 39}V83"/><path class="ah2" d="M${X1 + 39} 78.5l-3.2 5.2h6.4z"/>` +
          [0, 1, 2, 3, 4].map(k => { const x = X1 + 12 + 28 * k, d = `--d:${r1(.85 + .8 * k)}s`;
            return `<rect class="sg${k < 3 ? " ok" : k === 3 ? " bad" : ""}" x="${x}" y="111" width="22" height="10" rx="3.5"${k < 4 ? ` style="${d}"` : ""}/>` +
              (k < 3 ? tick(x + 11, 116, 6, "sgm a-draw", d) : k === 3 ? xmk(x + 11, 116, 6.5, "a-pop", d) : ""); }).join("") +
          `<path class="fp" d="M${X1 + 166} 124V104"/><path class="ff" d="M${X1 + 166} 104.5l10 3.6l-10 3.6z"/>`,
        "Single turn", "Scored by progress"),
      rel: () => pic("Other benchmarks: one option order, scored on accuracy only. SO-Arena: the model keeps answer B when the options are shuffled (S), and picks Null when the correct option is removed (N).",
        `<g transform="translate(0 8)">` + blk(57, 52, "A") + blk(76, 52, "B", "pk a-pick", "--d:.55s") + blk(95, 52, "C") + bot(84, 94, SC, DK, "a-wh", "--d:.1s;--h:.4s") + badge(134, 60, "ok", "a-pop", "--d:.75s") + `</g>`,
        `<rect class="syc s" x="${X1 + 12}" y="33" width="14" height="14" rx="3.5"/>` + tx(X1 + 19, 43.6, "S", "sy") +
          blk(X1 + 32, 32, "A") + blk(X1 + 50, 32, "B", "pk a-pick", "--d:1s") + blk(X1 + 68, 32, "C") + arw(X1 + 89, 40, X1 + 102, 40, "a-in", "--d:1.2s") +
          `<g class="a-in" style="--d:1.35s">${blk(X1 + 107, 32, "C") + blk(X1 + 125, 32, "A") + blk(X1 + 143, 32, "B", "pk a-pick", "--d:1.65s")}</g>` +
          bot(X1 + 58, 70, .5, DK, "a-hop", "--d:.85s") + bot(X1 + 151, 70, .5, DK, "a-wh", "--d:1.4s;--h:1.55s") + badge(X1 + 178, 40, "ok", "a-pop", "--d:1.85s") +
          `<rect class="syc n" x="${X1 + 12}" y="85" width="14" height="14" rx="3.5"/>` + tx(X1 + 19, 95.6, "N", "sy") +
          blk(X1 + 32, 84, "A") + blk(X1 + 50, 84, "B", "gone a-gone", "--d:2.2s") + blk(X1 + 68, 84, "C") + blk(X1 + 86, 84, "Null", "pk nul a-sl", "--d:2.45s", 32) +
          bot(X1 + 102, 122, .5, DK, "a-mv") + badge(X1 + 134, 92, "ok", "a-pop", "--d:3.4s"),
        "Accuracy only", "Accuracy + reliability"),
    };
    const C = {
      labels: { h: "Verified labels", pn: "#f5f6e8", hc: "#796f50", hl: "#a3a982",
        p: "Every reference label is checked against what the model can see, by people and an LLM. Tasks that fail are dropped.",
        more: ['href="#benchmark"', "From 40 established sources"] },
      tiers: { h: "Difficulty tiers", pn: "#e2f1f2", hc: "#61847a", hl: "#86b3b0",
        p: `${tiered} of ${D.domains.length} domains are split into tiers by domain-specific criteria, such as the number of calculation steps in Math. The leaderboard counts each domain's hardest tier.`,
        more: ['href="#results" data-chart-link="tier"', "Scores by tier"] },
      agents: { h: "Agent sandboxes", pn: "#f6ebe6", hc: "#8f6556", hl: "#c9a79a",
        p: `In ${t.web.toLocaleString("en-US")} web and ${t.tools.toLocaleString("en-US")} tool tasks, the model works toward a goal step by step, choosing each next action itself.`,
        more: ['href="#benchmark"', "The 11 domains"] },
      rel: { h: "Reliability tests", pn: "#e3e8f4", hc: "#2c6aa8", hl: "#9fb3d4",
        p: "Each item is asked again with its options shuffled (S) and with the correct option removed (N). Reliability R = √(S·N): higher is more reliable.",
        more: ['href="#reliability"', "Reliability results"] },
    };
    let cur = null, leave, intent, loop;
    const place = li => {
      const r = li.getBoundingClientRect(), w = pop.offsetWidth;
      pop.style.left = Math.min(Math.max(12, r.left - 8), innerWidth - w - 12) + scrollX + "px";   // left-aligned to its tag
      pop.style.top = r.bottom + scrollY + 10 + "px";
    };
    const show = li => {
      clearTimeout(leave); clearTimeout(intent);
      if (cur === li) return;
      if (cur) cur.setAttribute("aria-expanded", "false");
      const c = C[li.dataset.hl]; cur = li; li.setAttribute("aria-expanded", "true");
      pop.setAttribute("aria-label", c.h);
      pop.innerHTML = `<span class="label">${c.h}</span><div class="viz" style="--pn:${c.pn};--hc:${c.hc};--hl:${c.hl}">${V[li.dataset.hl]()}</div><p>${c.p}</p><a class="more" ${c.more[0]}>${c.more[1]} <span class="arr">→</span></a>`;
      pop.hidden = false; place(li); pop.classList.remove("go"); clearInterval(loop);
      requestAnimationFrame(() => { pop.classList.add("on"); void pop.offsetWidth; pop.classList.add("go"); });
      if (!RM) loop = setInterval(() => { pop.classList.remove("go"); void pop.offsetWidth; pop.classList.add("go"); }, 7000);   // plays again while open
    };
    const hide = () => {
      clearTimeout(intent); clearInterval(loop); if (!cur) return;
      cur.setAttribute("aria-expanded", "false"); cur = null;
      pop.classList.remove("on", "go"); setTimeout(() => { if (!cur) pop.hidden = true; }, 160);
    };
    items.forEach(li => {
      li.addEventListener("pointerenter", e => { if (e.pointerType !== "mouse") return; clearTimeout(leave); clearTimeout(intent); intent = setTimeout(() => show(li), cur ? 0 : 150); });
      li.addEventListener("pointerleave", e => { if (e.pointerType !== "mouse") return; clearTimeout(intent); leave = setTimeout(hide, 140); });
      li.addEventListener("click", e => { if (e.pointerType === "mouse") return; cur === li ? hide() : show(li); });
      li.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); cur === li ? hide() : show(li); } });
      li.addEventListener("focus", () => show(li)); li.addEventListener("blur", e => { if (!pop.contains(e.relatedTarget)) hide(); });
    });
    pop.addEventListener("pointerenter", () => clearTimeout(leave)); pop.addEventListener("pointerleave", e => { if (e.pointerType === "mouse") leave = setTimeout(hide, 140); });
    pop.addEventListener("click", e => { if (e.target.closest("a")) hide(); });
    addEventListener("keydown", e => { if (e.key === "Escape") hide(); });
    document.addEventListener("pointerdown", e => { if (cur && !cur.contains(e.target) && !pop.contains(e.target)) hide(); });
    addEventListener("scroll", () => { if (cur) hide(); }, { passive: true });
  }
  // ---- "System One" in the title: hover or tap shows a short definition and a real-time speed race ------------------
  function systemOne() {
    const term = $(".s1"), pop = $("#s1pop"), spot = $(".spot"), race = $(".race", pop); if (!term) return;
    let open = false, timers = [];
    const place = () => {
      const r = term.getBoundingClientRect(), w = pop.offsetWidth;
      const left = Math.min(Math.max(12, r.left + r.width / 2 - w / 2), innerWidth - w - 12);
      const h = (term.closest("h1") || term).getBoundingClientRect();
      pop.style.left = left + scrollX + "px"; pop.style.top = h.bottom + scrollY + 10 + "px";
      spot.style.setProperty("--x", r.left + r.width / 2 + "px"); spot.style.setProperty("--y", r.top + r.height / 2 + 40 + "px");
      spot.style.setProperty("--rx", Math.max(240, r.width * 1.6) + "px"); spot.style.setProperty("--ry", "190px");
    };
    const run = () => {                      // the bars fill at the models' real mean times; the times light up when done
      timers.forEach(clearTimeout); timers = [];
      race.classList.remove("go");
      $$(".t", race).forEach(t => { t.classList.remove("done"); t.classList.toggle("wait", !RM); t.textContent = RM ? t.dataset.v : t.dataset.ms > 500 ? "thinking" : ""; });
      void race.offsetWidth; race.classList.add("go");
      $$(".t", race).forEach(t => timers.push(setTimeout(() => { t.classList.remove("wait"); t.classList.add("done"); t.textContent = t.dataset.v; }, RM ? 0 : 250 + +t.dataset.ms)));
    };
    const set = o => {
      if (o === open) return; open = o;
      term.classList.toggle("on", o); spot.classList.toggle("on", o); term.setAttribute("aria-expanded", o);
      if (o) { pop.hidden = false; place(); requestAnimationFrame(() => pop.classList.add("on")); run(); }
      else { pop.classList.remove("on"); timers.forEach(clearTimeout); setTimeout(() => { if (!open) pop.hidden = true; }, 160); }
    };
    let leave, intent;
    const enter = () => { clearTimeout(leave); clearTimeout(intent); set(true); }, out = () => { clearTimeout(intent); leave = setTimeout(() => set(false), 120); };
    term.addEventListener("pointerenter", e => { if (e.pointerType === "mouse") { clearTimeout(leave); intent = setTimeout(enter, open ? 0 : 150); } });
    term.addEventListener("pointerleave", e => { if (e.pointerType === "mouse") out(); });
    pop.addEventListener("pointerenter", enter); pop.addEventListener("pointerleave", out);
    term.addEventListener("click", e => { if (e.pointerType !== "mouse") set(!open); });
    term.addEventListener("focus", () => set(true)); term.addEventListener("blur", () => set(false));
    term.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); set(!open); } });
    addEventListener("keydown", e => { if (e.key === "Escape") set(false); });
    document.addEventListener("pointerdown", e => { if (open && !term.contains(e.target) && !pop.contains(e.target)) set(false); });
    addEventListener("scroll", () => { if (open) set(false); }, { passive: true });
  }

  // ---- logo: the O unfolds the full name when the pointer comes near it ---------------------------------------------
  function logoMotion() {
    const svg = $(".logo-anim"); if (!svg) return;
    const ring = svg.querySelector(".lg-band");
    let open = false, raf = 0, px = 0, py = 0, intent = 0, auto = 0;
    const set = o => { clearTimeout(intent); intent = 0; if (o !== open) { open = o; svg.classList.toggle("open", o); } };
    addEventListener("pointermove", e => {
      if (e.pointerType !== "mouse") return;
      px = e.clientX; py = e.clientY;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const r = ring.getBoundingClientRect(), d = Math.hypot(px - (r.left + r.width / 2), py - (r.top + r.height / 2));
        const b = svg.getBoundingClientRect(), m = 36;            // stays open while the pointer is over the name
        if (!open && d < r.width * .85) { if (!intent) intent = setTimeout(() => { intent = 0; set(true); }, 120); }
        else if (!open && intent) { clearTimeout(intent); intent = 0; }
        else if (open && (px < b.left - m || px > b.right + m || py < b.top - m || py > b.bottom + m)) set(false);
      });
    }, { passive: true });
    svg.addEventListener("click", e => { if (e.pointerType === "mouse") return; clearTimeout(auto); set(!open); if (open) auto = setTimeout(() => set(false), 3000); });
    svg.addEventListener("focus", () => set(true)); svg.addEventListener("blur", () => set(false));
    svg.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); set(!open); } });
  }

  // ---- wiring ------------------------------------------------------------------------------------------------------
  function infos() {
    let cur = null;
    const show = b => { cur = b; const r = b.getBoundingClientRect(); tip(`<span class="s" style="color:inherit">${esc(b.dataset.info)}</span>`, r.right, r.bottom); };
    const hide = () => { cur = null; untip(); };
    document.addEventListener("pointerover", e => { const b = e.target.closest(".info"); if (b && e.pointerType === "mouse") show(b); });
    document.addEventListener("pointerout", e => { const b = e.target.closest(".info"); if (b && e.pointerType === "mouse") hide(); });
    document.addEventListener("click", e => { const b = e.target.closest(".info"); if (b) { e.preventDefault(); e.stopPropagation(); cur === b ? hide() : show(b); } else if (cur) hide(); }, true);
    document.addEventListener("focusin", e => { const b = e.target.closest(".info"); if (b) show(b); });
    document.addEventListener("focusout", e => { if (e.target.closest(".info")) hide(); });
  }
  function wire() {
    document.addEventListener("click", e => {
      const kr = e.target.closest(".krl[data-chart], [data-chart-link]"); if (kr) showChart(kr.dataset.chart || kr.dataset.chartLink);
      const dv = e.target.closest("[data-view]"); if (dv) { $("#lb-view")._sel(dv.dataset.view); $("#leaderboard").scrollIntoView(); return; }
      const bm = e.target.closest("[data-bm]"); if (bm) { boardMode = bm.dataset.bm; board(); return; }
      const dm = e.target.closest("[data-domain]"); if (dm) { openDomain(dm.dataset.domain); return; }
      const md = e.target.closest("[data-model]:not(tr)"); if (md) { openModel(BY[md.dataset.model]); return; }
      const bl = e.target.closest(".board-list li"); if (bl) { openModel(BY[bl.querySelector("[data-model]").dataset.model]); return; }
      const rl = e.target.closest('a[href="#reliability"]'); if (rl && dr.open) closeDrawer();
    });
    const copy = (b, el) => b.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(el.textContent); b.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>Copied`; b.classList.add("ok"); }
      catch (_) { const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r); b.textContent = "Selected"; }
      setTimeout(() => { b.textContent = "Copy"; b.classList.remove("ok"); }, 1500);
    });
    copy($("#copy"), $("#bibtex"));
    $$(".copy-code").forEach(b => copy(b, b.nextElementSibling));
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: .08, rootMargin: "0px 0px -40px 0px" });
      $$(".rv").forEach(n => io.observe(n));
      setTimeout(() => $$(".rv:not(.in)").forEach(n => { if (n.getBoundingClientRect().top < innerHeight * 1.2) n.classList.add("in"); }), 2000);
    } else $$(".rv").forEach(n => n.classList.add("in"));
    let rt; addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(insights, 150); });
    // chart labels are measured: draw again once the web font has loaded, so the measured widths are the real ones
    if (document.fonts && document.fonts.status !== "loaded") document.fonts.ready.then(() => insights());
  }

  function init() {
    nav(); board(); kres(); leaderboardControls(); table(); dgrid(); dgridControls(); insightsControls(); insights();
    demo(); benchmark(); wire(); infos(); logoMotion(); systemOne(); highlights();
    const q = new URLSearchParams(location.search);
    if (q.get("domain") && DOM[q.get("domain")]) openDomain(q.get("domain"));
    else if (q.get("model") && BY[q.get("model")]) openModel(BY[q.get("model")]);
    window.SOA = { openDomain, openModel: k => openModel(BY[k] || M.find(m => m.key === k)), view: id => $("#lb-view")._sel(id), chart: showChart, board: k => { boardMode = k; board(); } };
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
