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
  const SIZE = { "0.4B": "#c9cdd2", "4B": "#a0a7ae", "9B": "#7a828b", "27B": "#525a63", "31B": "#272c32" };
  const API = "#8d949b", S2C = "#b0652d";
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
  const mtip = (m, extra = "") => `<b>${esc(m.name)}</b> <span class="s">${meta(m)}</span><br>` +
    `<span class="m">${f2(m.score)}</span> <span class="s">${RANK.has(m.key) ? `score · #${RANK.get(m.key)} of 18` : m.group === "s2" ? "score · System Two" : "score · not ranked"}</span>${extra}`;

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
      addEventListener("scroll", () => { if (scrollY < $("#leaderboard").offsetTop - innerHeight * .5) links.forEach(a => a.classList.remove("on")); }, { passive: true });
    }
  }

  // ---- hero board and stats ------------------------------------------------------------------------------------------
  let boardMode = "cap";
  const LATMAX = Math.max(...S1.map(m => m.latency.mean_ms));     // thin latency bars: linear, slowest System One model = full
  const BMAX = 100;                                                 // score and R bars: 0-100, as everywhere on the page
  const refBand = `<b class="ref" style="left:calc(${(100 * LUNA.score / BMAX).toFixed(2)}% - 1.5px)"></b>`;   // GPT-6 Luna, the System Two reference
  function board() {
    const host = $("#board"), cap = boardMode === "cap";
    const val = cap ? m => m.score : R_, rk = cap ? RANK : RANK_R, list = top(S1, val, 8);
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
    const dots = `<div class="mini"><div class="mr one"><span class="ml">−50</span><span class="mt dots big"><b style="left:${gx(0).toFixed(1)}%"></b>${D.domains.map((d, i) =>
        `<i style="left:${gx(gaps[i]).toFixed(1)}%;background:${FAM[d.family].color}" title="${esc(d.short)}: ${sg(gaps[i])}"></i>`).join("")}</span><span class="mv">+10</span></div></div>`;
    const tiles = [
      ["leaderboard", "", `${f1(best.score)}<small>&nbsp;vs ${f1(LUNA.score)}</small>`, "System Two still leads", "The best System One models trail GPT-6 Luna by about ten points. Luna is strong enough to serve as the System Two reference, and one reference keeps the charts clear; GPT-6 Sol scores 82.3.",
        mini([[esc(best.name), best.score, "var(--cap)"], ["GPT-6 Luna", LUNA.score, "var(--s2)"]], 100, f1)],
      ["results", "speed", "&lt;&thinsp;0.3<small> s</small>", "System One is fast", "Every open System One model answers within 0.3 s per task on one H100; GPT-6 is timed through its API.",
        mini([["Slowest open", slow.latency.mean_ms, "var(--lat)"], ["GPT-6 Luna", LUNA.latency.mean_ms, "var(--s2)"]], 3000, sec)],
      ["reliability", "rel", `${ord(RANK.get(best.key))}<span class="arr">→</span>${ord(RANK_R.get(best.key))}`, "Top score ≠ most reliable", `${esc(best.name)}, the top scorer, is ${ord(RANK_R.get(best.key))} in reliability.`,
        mini([[esc(r1.name), R_(r1), "var(--rel)"], [esc(r2.name), R_(r2), "var(--rel)"], [esc(best.name), R_(best), "var(--rel)"]], 100, f1)],
      ["leaderboard", "view:t-domains", `${sg(lo)}<small>&nbsp;to ${sg(hi)}</small>`, "The gap depends on the domain", `${esc(best.name)} minus GPT-6 Luna in each of the 11 domains (leaderboard tier); dots coloured by domain family.`, dots],
    ];
    const CAP = ["Score", "Mean time per task", "Reliability R", "Per domain, by family"];
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
    { id: "prof", label: "By domain", cls: "c-prof l", title: "One bar per domain, grouped by family; the height is the domain score. Point at a bar for its name and rank." },
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
    const refs = order(M.filter(m => m.group === "s2" && pass(m))), s1 = order(M.filter(m => isS1(m) && pass(m))), hy = order(M.filter(m => m.group === "auto" && pass(m)));
    const grp = (label, list) => list.length ? `<tbody><tr class="grp"><th colspan="${COLS.length}" scope="rowgroup">${label}</th></tr>${list.map(row).join("")}</tbody>` : "";
    // FLIP: after a sort or filter, rows that stay slide from their old place to the new one (300 ms); new rows fade in
    const was = new Map($$("#lb tr[data-model]").map(r => [r.dataset.model, r.getBoundingClientRect().top]));
    $("#lb").innerHTML = head + grp("System Two reference", refs) + grp("System One", s1) + grp("Hybrid: switches to System Two, not ranked", hy) +
      (refs.length + s1.length + hy.length ? "" : `<tbody><tr><td colspan="${COLS.length}" class="l empty">No model matches.</td></tr></tbody>`);
    if (!was.size || RM) return;
    const rows = $$("#lb tr[data-model]");
    rows.forEach(r => { const y = was.get(r.dataset.model);
      if (y == null) { r.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, delay: 80, easing: "ease-out", fill: "backwards" }); return; }
      const dy = y - r.getBoundingClientRect().top;
      if (Math.abs(dy) > 1) r.animate([{ transform: `translateY(${dy}px)` }, { transform: "none" }], { duration: 300, easing: "cubic-bezier(.2, .8, .2, 1)" });
    });
  }
  function dgrid() {
    const ids = D.domains.map(d => d.id), t3 = top(S1, o => o.score, 3);
    const overall = `<button type="button" class="dcard overall" data-view="t-table"><div class="dcard-top"><span class="label">All 11 domains</span><span class="label">${D.totals.leaderboard_tasks.toLocaleString("en-US")} tasks</span></div>
        <h3>Overall score</h3><div class="meta">Mean of the 11 domain scores</div>
        <ol class="drows">${t3.map(m => `<li class="${RANK.get(m.key) === 1 ? "first" : ""}"><span class="p">${RANK.get(m.key)}</span>${logo(m, 22)}<span class="n">${esc(m.name)}</span><span class="meter"><i style="--w:${m.score}%;--c:var(--cap)"></i></span><span class="v">${f2(m.score)}</span></li>`).join("")}</ol>
        <div class="ref"><span>GPT-6 Luna (System Two)</span><b>${f2(LUNA.score)}</b></div>
        <span class="go">Full table →</span></button>`;
    $("#dgrid").innerHTML = overall + ids.map(id => {
      const d = DOM[id], f = FAM[d.family], val = m => m.domains[id], rk = TOPD[id], l = top(S1, val, 3);
      return `<button type="button" class="dcard" data-domain="${id}" style="--fc:${f.color}"><div class="dcard-top"><span class="label"><i></i>${esc(f.name.split(" ")[0])}</span><span class="label">${d.leaderboard_tasks} tasks</span></div>
        <h3>${esc(d.name)}</h3><p class="desc">${DESC[id]}</p><div class="meta">${d.leaderboard_tier === "All tasks" ? "All tasks (untiered)" : d.leaderboard_tier + " tier"}</div>
        <ol class="drows">${l.map(m => `<li class="${rk.get(m.key) === 1 ? "first" : ""}"><span class="p">${rk.get(m.key)}</span>${logo(m, 22)}<span class="n">${esc(m.name)}</span><span class="meter"><i style="--w:${val(m)}%;--c:var(--cap)"></i></span><span class="v">${f1(val(m))}</span></li>`).join("")}</ol>
        <div class="ref"><span>GPT-6 Luna (System Two)</span><b>${f1(val(LUNA))}</b></div>
        <span class="go">Full ranking and tiers →</span></button>`;
    }).join("");
  }
  function leaderboardControls() {
    $("#lb-keys").innerHTML = `<span><i class="k-ref"></i>GPT-6 Luna (System Two)</span><span class="fk"><i class="k-prof"><b></b><b></b><b></b></i>By domain: point at a bar for the domain and its rank</span>`;
    $("#filters").innerHTML = FILTERS.map(([id, l]) => `<button type="button" class="chip" data-f="${id}" aria-pressed="${T.filter === id}">${l}</button>`).join("");
    $("#filters").addEventListener("click", e => { const b = e.target.closest("[data-f]"); if (!b) return; T.filter = b.dataset.f; $$("[data-f]").forEach(o => o.setAttribute("aria-pressed", o === b)); table(); });
    $("#q").addEventListener("input", e => { T.q = e.target.value; table(); });
    $("#msort").addEventListener("click", e => { const b = e.target.closest("[data-ms]"); if (!b) return; const c = COLS.find(o => o.id === b.dataset.ms);
      T.sort = c.id; T.dir = c.asc ? 1 : -1; $$("[data-ms]").forEach(o => o.setAttribute("aria-pressed", o === b)); table(); });
    let onBar = false;                                          // profile bars: domain, score and System One rank
    $("#lb").addEventListener("pointermove", e => {
      const b = e.target.closest(".pb");
      if (!b) { if (onBar) { untip(); onBar = false; } return; }
      const m = BY[b.closest("tr").dataset.model], d = DOM[b.dataset.d], k = isS1(m) ? TOPD[d.id].get(m.key) : null;
      tip(`<b>${esc(d.name)}</b><br><span class="m">${f1(m.domains[d.id])}</span> <span class="s">${k ? `#${k} of ${S1.length}` : m.group === "s2" ? "System Two" : "not ranked"}</span>`, e.clientX, e.clientY);
      onBar = true;
    });
    $("#lb").addEventListener("pointerleave", () => { if (onBar) { untip(); onBar = false; } });
    $("#lb").addEventListener("click", e => {
      const s = e.target.closest("[data-sort]");
      if (s) { const c = COLS.find(o => o.id === s.dataset.sort); if (T.sort === c.id) T.dir = -T.dir; else { T.sort = c.id; T.dir = c.asc ? 1 : -1; } table(); const nb = $(`[data-sort="${c.id}"]`); if (nb) nb.focus(); return; }
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
        <div><b class="num">${r ? `${r.S.toFixed(2)} · ${r.N.toFixed(2)}` : l && l.p99_ms ? ms(l.p99_ms) : "—"}</b><span>${r ? "Order stability S · null discrimination N" : "99th percentile latency"}</span></div>
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
    const list = [...M].sort((a, b) => val(b) - val(a));
    const counts = d.tiers ? Object.entries(d.tiers).map(([k, v]) => `${({ E: "easy", M: "medium", H: "hard", V: "very hard" })[k]} ${v}`).join(", ") : "no tiers";
    const bars = list.map(m => { const ref = m.group === "s2", a = m.group === "auto";
      return `<li class="${ref ? "ref" : a ? "auto" : ""}"><span class="rk">${isS1(m) ? rk.get(m.key) : ref ? "ref" : "–"}</span>${logo(m, 22)}<button type="button" class="n" data-model="${slug(m)}">${esc(m.name)}</button>
        <span class="bar"><i style="width:${val(m)}%;--bc:${ref ? "var(--s2)" : "var(--cap)"}"></i></span><span class="v">${f1(val(m))}</span><span class="ms">${ms(m.latency.mean_ms)}</span></li>`; }).join("");
    openDrawer(f.name, `<h2 id="dr-title">${esc(d.name)}</h2>
      <p class="dr-lead">${DESC[id]}</p>
      <p class="dr-sub">${d.tasks} tasks (${counts}). The leaderboard uses ${d.leaderboard_tier === "All tasks" ? "all tasks" : id === "math" ? "the hard and very hard tiers" : "the hard tier"} (${d.leaderboard_tasks} tasks).
        Sources${d.sources_by_tier ? ", easy to hard" : ""}: ${esc(d.sources.join(d.sources_by_tier ? " → " : ", "))}.</p>
      <h4 class="label" style="margin-top:24px">Ranking</h4><ul class="bars">${bars}</ul>
      <p class="dr-note"># ranks the 18 System One models; “ref” marks the System Two references; StartLux Auto is not ranked. Right column: mean latency per task.</p>
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
    else S("circle", { class: "mk", cx: x, cy: y, r, fill: m.group === "auto" ? "#fff" : colorOf(m), stroke: m.group === "auto" ? colorOf(m) : "#fff", "stroke-width": m.group === "auto" ? 2.2 : 1.5 }, g);
  }
  function labels(svg, items, bounds, only) {
    const boxes = items.map(it => ({ x0: it.x - 7, x1: it.x + 7, y0: it.y - 7, y1: it.y + 7 }));
    const hit = b => boxes.some(o => b.x0 < o.x1 && o.x0 < b.x1 && b.y0 < o.y1 && o.y0 < b.y1) || b.x0 < bounds.x0 || b.x1 > bounds.x1 || b.y0 < bounds.y0 || b.y1 > bounds.y1;
    const g = S("g", {}, svg);
    // Highest points first: they are the strongest models, the ones a reader looks for in a crowded corner.
    for (const it of [...items].sort((a, b) => a.y - b.y)) {
      if (only && !only.has(it.m.key)) continue;              // on narrow screens: label the points that carry the story
      const w = it.label.length * 6.3 + 2, h = 14, gp = 9, dg = 5, far = 24;
      // Next to the point first; if all eight spots are taken, one ring further out with a thin leader line.
      const near = [[it.x + gp, it.y - h / 2, "start"], [it.x - gp - w, it.y - h / 2, "end"], [it.x - w / 2, it.y - gp - h, "middle"], [it.x - w / 2, it.y + gp, "middle"],
        [it.x + dg, it.y - dg - h, "start"], [it.x + dg, it.y + dg, "start"], [it.x - dg - w, it.y - dg - h, "end"], [it.x - dg - w, it.y + dg, "end"]].map(c => [...c, null]);
      const away = [far, far * 1.6].flatMap(R => [[1, -1], [-1, -1], [1, 1], [-1, 1], [0, -1], [0, 1]].map(([dx, dy]) => [dx, dy, R])).map(([dx, dy, R]) => {
        const cx = it.x + dx * R * (dy ? .8 : 1), cy = it.y + dy * R * (dx ? .7 : 1);
        return [dx > 0 ? cx : dx < 0 ? cx - w : cx - w / 2, dx ? cy - h / 2 : dy < 0 ? cy - h : cy, dx > 0 ? "start" : dx < 0 ? "end" : "middle", [dx, dy, cx, cy]];
      });
      for (const [x0, y0, a, lead] of [...near, ...away]) {
        const b = { x0, x1: x0 + w, y0, y1: y0 + h };
        if (hit(b)) continue;
        boxes.push(b);
        if (lead) {
          const [dx, dy, cx, cy] = lead, u = Math.hypot(dx, dy);
          S("line", { class: "lead", x1: it.x + dx / u * 6, y1: it.y + dy / u * 6, x2: cx - dx * 2, y2: cy - (dx ? 0 : dy * 2) }, g);
        }
        S("text", { class: "lbl", x: a === "start" ? x0 : a === "end" ? x0 + w : x0 + w / 2, y: y0 + 11, "text-anchor": a }, g).textContent = it.label;
        break;
      }
    }
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
    sn: { title: "Order stability and null discrimination", sub: "Dashed curves mark constant R.", note: "Jeva-4B's S is 1 by construction (its option cache)." },
    tier: { title: "Scores by difficulty tier", sub: "Tiers are defined within each domain, not across domains.", note: "Highlighted: the domain's best System One model, StartLux Instant and GPT-6 Luna." },
    order: { title: "How accuracy moves with the option order", sub: "Change from the original order, in 12 shuffles of the same items.", note: "Accuracy from the reliability runs, separate from the leaderboard score. Jeva-4B scores each option on its own, so order cannot change its answer." },
    gap: { title: "Gap to GPT-6 Luna, by domain", sub: "Medium and hard tiers, with 95% confidence intervals.", note: "Not only the leaderboard tier, so the gaps differ from the domain cards. Domains are grouped by how the gap behaves. Smaller models build on Qwen3.5, larger ones on Qwen3.8-27B." },
  };
  let tierDom = "math";
  // Two chart panels share this routine: Results (speed, difficulty, gap) and the Reliability section's evidence.
  const PANELS = [{ key: "speed", tabs: "#ins-tabs", host: "#chart", lg: "#legend", title: "#ins-title", sub: "#ins-sub", note: "#ins-note" },
                  { key: "rel", tabs: "#rel-tabs", host: "#rchart", lg: "#rlegend", title: "#r-title", sub: "#r-sub", note: "#r-note" }];
  // Each chart card keeps the height of its tallest tab, so switching tabs never moves the page below it.
  const insights = () => PANELS.forEach(P => {
    const card = $(P.host).closest(".panel"), cur = P.key, keys = $$('[role="tab"]', $(P.tabs)).map(t => t.dataset.k);
    card.style.minHeight = ""; let mx = 0;
    for (const k of keys) { P.key = k; drawPanel(P); mx = Math.max(mx, card.offsetHeight); }
    P.key = cur; drawPanel(P); card.style.minHeight = mx + "px";
  });
  function drawPanel(P) {
    const insKey = P.key, c = INS[insKey], LG = $(P.lg);
    $(P.title).innerHTML = esc(c.title) + (c.note ? ` <button class="info" type="button" data-info="${esc(c.note)}">i</button>` : ""); $(P.sub).textContent = c.sub; $(P.note).textContent = "";
    if (P.host === "#chart") $("#tier-chips").hidden = insKey !== "tier";
    const host = $(P.host);
    host.classList.toggle("html", insKey === "gap"); host.setAttribute("role", insKey === "gap" || insKey === "order" ? "region" : "img");
    if (insKey === "speed") {
      const { svg, W, H } = frame(host, .56, 340, 520), m = { l: 44, r: 20, t: 30, b: 40 };
      const lx = v => Math.log10(v), X0 = lx(4), X1 = lx(5000);
      const xs = v => m.l + (lx(v) - X0) / (X1 - X0) * (W - m.l - m.r), ys = v => H - m.b - (v - 25) / 65 * (H - m.t - m.b);
      axes(svg, W, H, m, xs, ys, [[10, "10 ms"], [100, "100 ms"], [1000, "1 s"]], [30, 40, 50, 60, 70, 80, 90].map(v => [v, v]), "Mean latency per task (log scale) →", "↑ Score");
      const fr = []; let best = -1;
      for (const o of [...S1].sort((a, b) => a.latency.mean_ms - b.latency.mean_ms || b.score - a.score)) if (o.score > best) { fr.push(o); best = o.score; }
      S("path", { d: fr.map((o, i) => `${i ? "L" : "M"}${xs(o.latency.mean_ms)} ${ys(o.score)}`).join(""), fill: "none", stroke: "var(--ink-2)", "stroke-width": 1.6, "stroke-dasharray": "5 4", "stroke-linejoin": "round", opacity: .7 }, svg);
      const pts = M.map(o => ({ m: o, x: xs(o.latency.mean_ms), y: ys(o.score), label: o.name, aria: `score ${f2(o.score)}, ${ms(o.latency.mean_ms)}` }));
      points(svg, pts, o => mtip(o, `<br><span class="m">${ms(o.latency.mean_ms)}</span> <span class="s">mean latency (${o.latency.timing}${o.key === "SII-Decision-4B" ? ", with flash-linear-attention" : ""})</span>`));
      labels(svg, pts, { x0: m.l, x1: W - m.r + 14, y0: m.t - 4, y1: H - m.b }, W < 560 ? new Set([...fr, ...top(S1, o => o.score, 3), ...M.filter(o => closed(o) || o.group === "auto")].map(o => o.key)) : null);
      LG.innerHTML = sizeLegend(true, `<span><i class="ln dash"></i>Pareto frontier</span>`);
    } else if (insKey === "rel" || insKey === "sn") {
      const { svg, W, H } = frame(host, .56, 340, 520), m = { l: 44, r: 20, t: 30, b: 40 };
      const RL = S1.filter(o => o.reliability);
      let pts;
      if (insKey === "rel") {
        const xs = v => m.l + (v - 28) / 46 * (W - m.l - m.r), ys = v => H - m.b - v / 90 * (H - m.t - m.b);
        axes(svg, W, H, m, xs, ys, [30, 40, 50, 60, 70].map(v => [v, v]), [0, 20, 40, 60, 80].map(v => [v, v]), "Score →", "↑ Reliability R");
        pts = RL.map(o => ({ m: o, x: xs(o.score), y: ys(o.reliability.R), label: o.name, aria: `score ${f2(o.score)}, R ${f1(o.reliability.R)}` }));
      } else {
        const xs = v => m.l + (v - .3) / .72 * (W - m.l - m.r), ys = v => H - m.b - v / .85 * (H - m.t - m.b);
        axes(svg, W, H, m, xs, ys, [.4, .5, .6, .7, .8, .9, 1].map(v => [v, v.toFixed(1)]), [0, .2, .4, .6, .8].map(v => [v, v.toFixed(1)]), "Order stability S →", "↑ Null discrimination N");
        const g = S("g", {}, svg);
        for (const r of [.2, .4, .6, .8]) {
          const d = []; for (let s = .3; s <= 1.02; s += .01) { const n = r * r / s; if (n <= .85) d.push(`${d.length ? "L" : "M"}${xs(s)} ${ys(n)}`); }
          S("path", { d: d.join(""), fill: "none", stroke: "#c9c7bd", "stroke-dasharray": "4 4", "stroke-width": 1.1 }, g);
          const s0 = Math.max(.3, r * r / .85);            // label where the curve enters the plot (top or left), away from the points
          S("text", { class: "tick", x: xs(s0) + 6, y: ys(r * r / s0) + 14, "text-anchor": "start" }, g).textContent = `R = ${r * 100}`;
        }
        pts = RL.map(o => ({ m: o, x: xs(o.reliability.S), y: ys(o.reliability.N), label: o.name, aria: `S ${o.reliability.S.toFixed(2)}, N ${o.reliability.N.toFixed(2)}` }));
      }
      points(svg, pts, o => mtip(o, `<br><span class="m">${f1(o.reliability.R)}</span> <span class="s">R · #${RANK_R.get(o.key)} of 18 · S ${o.reliability.S.toFixed(2)} · N ${o.reliability.N.toFixed(2)}</span>`));
      labels(svg, pts, { x0: m.l, x1: W - m.r + 14, y0: m.t - 4, y1: H - m.b }, W < 560 ? new Set([...top(RL, R_, 3), ...top(RL, o => o.score, 3), ...RL.filter(closed), ...top(RL, o => -R_(o), 2)].map(o => o.key)) : null);
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
    // Change from the original option order, per reordering; rows in leaderboard order; the original accuracy at the right.
    const L = S1.filter(o => o.order_acc).sort((a, b) => b.score - a.score);
    const dev = L.flatMap(o => o.order_acc.runs.map(v => Math.abs(v - o.order_acc.original))), X = Math.max(2, Math.ceil(Math.max(...dev)));
    const rowH = 24, m = { l: 150, r: 92, t: 30, b: 42 };
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
    S("text", { class: "tick", x: W - 10, y: m.t - 12, "text-anchor": "end" }, svg).textContent = "original";
    L.forEach((o, i) => {
      const a = o.order_acc, y = m.t + rowH * i + rowH / 2, c = colorOf(o), d = a.runs.map(v => v - a.original);
      const r = S("g", { class: "pt", tabindex: 0, role: "button", "aria-label": `${o.name}: original order ${f1(a.original)}; 12 reorderings from ${f1(a.min)} to ${f1(a.max)}` }, svg);
      S("rect", { x: 0, y: y - rowH / 2, width: W, height: rowH, fill: "transparent" }, r);
      S("text", { class: "lbl", x: m.l - 12, y: y + 4, "text-anchor": "end" }, r).textContent = o.name;
      S("line", { x1: xs(Math.min(0, ...d)), x2: xs(Math.max(0, ...d)), y1: y, y2: y, stroke: c, "stroke-width": 4, "stroke-linecap": "round", opacity: .3 }, r);
      for (const v of d) S("circle", { cx: xs(v), cy: y, r: 3, fill: c, opacity: .85 }, r);
      S("text", { class: "tick", x: W - 10, y: y + 4, "text-anchor": "end" }, r).textContent = f1(a.original);
      bindTip(r, () => `<b>${esc(o.name)}</b><br><span class="m">${f1(a.original)}</span> <span class="s">original order · ${f1(a.min)}–${f1(a.max)} over all 13 orders</span>`);
      r.addEventListener("click", () => openModel(o));
    });
    lg.innerHTML = `<span><i style="background:var(--muted)"></i>One reordering</span>` +
      Object.entries(SIZE).map(([k, c]) => `<span><i style="background:${c}"></i>${k}</span>`).join("") + `<span><i style="background:${API}"></i>Closed API</span>`;
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
      bindTip(a, () => `<b>${esc(o.name)}</b><br><span class="m">${ks.map(k => `${k} ${t[k]}`).join(" · ")}</span>`);
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
    PANELS.forEach(P => tabs($(P.tabs), (id, t) => { P.key = t.dataset.k; drawPanel(P); if (!RM) $(P.host).animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: "ease-out" }); }));
    const TD = D.domains.filter(d => d.tiers);
    $("#tier-chips").innerHTML = TD.map(d => `<button type="button" class="chip" data-td="${d.id}" aria-pressed="${d.id === tierDom}">${esc(d.short)}</button>`).join("");
    $("#tier-chips").addEventListener("click", e => { const b = e.target.closest("[data-td]"); if (!b) return; tierDom = b.dataset.td; $$("[data-td]").forEach(o => o.setAttribute("aria-pressed", o === b)); insights(); });
  }

  // ---- reliability demo and facts -----------------------------------------------------------------------------------
  // Reliability demo, after the paper's Fig. 1: a robot jumps to hit the block it chooses. Scene 1: the original
  // options; scene 2: the blocks shuffle and the robot follows B; scene 3: B is removed, "Null" appears, the robot hits it.
  const ROBOT = `<svg viewBox="0 0 24 30" aria-hidden="true"><rect x="11" y="0" width="2" height="4" fill="currentColor"/><circle cx="12" cy="1.5" r="1.8" fill="var(--cap)"/>
    <rect x="3" y="4" width="18" height="12" rx="3" fill="currentColor"/><rect x="7" y="8.5" width="3" height="3" rx="1" fill="#fff"/><rect x="14" y="8.5" width="3" height="3" rx="1" fill="#fff"/>
    <rect x="6" y="17" width="12" height="8" rx="2" fill="currentColor"/><rect x="7" y="25" width="3" height="5" rx="1" fill="currentColor"/><rect x="14" y="25" width="3" height="5" rx="1" fill="currentColor"/></svg>`;
  function demo() {
    const host = $("#demo");
    const SC = [["Original options", "", "Correct"], ["Shuffled", "s", "Same answer"], ["Correct option missing", "n", "Picks Null"]];
    host.innerHTML = SC.map(([h, k, v], i) => `<div class="scene2" data-i="${i}"><div class="sh">${k ? `<b class="sym ${k}">${k.toUpperCase()}</b>` : ""}<span>${h}</span></div>
        <div class="stage2"><span class="bot">${ROBOT}</span></div>
        <div class="verdict"><svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7.5" fill="#e3f1e9"/><path d="M4.5 8.2l2.3 2.3 4.7-5" fill="none" stroke="#2f7d57" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>${v}</div></div>`).join("") +
      `<button class="replay" type="button" id="replay" aria-label="Replay the demo"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M13 8a5 5 0 1 1-1.5-3.6M13 2.5v3h-3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`;
    const BW = 40, GAP = 10, NW = 56;
    const scenes = $$(".scene2", host).map(s => {
      const st = $(".stage2", s), mk = (t, w = BW) => { const b = document.createElement("span"); b.className = "blk2"; b.textContent = t; b.style.width = w + "px"; st.appendChild(b); return b; };
      const o = { s, st, A: mk("A"), B: mk("B"), C: mk("C"), bot: $(".bot", s), v: $(".verdict", s) };
      if (s.dataset.i === "2") o.N = mk("Null", NW);
      return o;
    });
    const wOf = b => b.textContent === "Null" ? NW : BW;
    const place = order => { let x = 0; for (const b of order) { b.style.left = x + "px"; x += wOf(b) + GAP; } };
    const walk = (o, b) => { o.bot.style.left = (parseFloat(b.style.left) + wOf(b) / 2 - 12) + "px"; };
    const hit = (o, b) => {                          // jump; the block bumps and turns dark as it is hit
      o.bot.classList.remove("jump"); void o.bot.offsetWidth; o.bot.classList.add("jump");
      later(() => { b.classList.add("bump", "pick"); later(() => b.classList.remove("bump"), 220); }, 160);
    };
    let timers = [];
    const later = (f, t) => timers.push(setTimeout(f, RM ? 0 : t));
    function reset() {
      timers.forEach(clearTimeout); timers = [];
      for (const o of scenes) {
        [o.A, o.B, o.C, o.N].forEach(b => b && b.classList.remove("pick", "gone", "hide", "bump"));
        place([o.A, o.B, o.C]); if (o.N) { o.N.classList.add("hide"); o.N.style.left = 3 * (BW + GAP) + "px"; }
        o.bot.classList.remove("jump"); o.bot.style.transition = "none"; o.bot.style.left = "-34px"; void o.bot.offsetWidth; o.bot.style.transition = "";
        o.v.classList.remove("on");
      }
    }
    function play() {
      reset(); const [a, b, c] = scenes;
      later(() => scenes.forEach(o => walk(o, o.B)), 200);                      // all three robots go to B and hit it
      later(() => scenes.forEach(o => hit(o, o.B)), 900);
      later(() => a.v.classList.add("on"), 1300);
      later(() => { b.B.classList.remove("pick"); place([b.C, b.A, b.B]); }, 1900);   // shuffle: B slides to the end
      later(() => walk(b, b.B), 2500);
      later(() => hit(b, b.B), 3150);
      later(() => b.v.classList.add("on"), 3550);
      later(() => { c.B.classList.remove("pick"); c.B.classList.add("gone"); }, 1900);   // the correct option drops out
      later(() => c.N.classList.remove("hide"), 2500);
      later(() => walk(c, c.N), 2900);
      later(() => hit(c, c.N), 3600);
      later(() => c.v.classList.add("on"), 4000);
    }
    $("#replay").addEventListener("click", play);
    reset();
    if ("IntersectionObserver" in window) { const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { play(); io.disconnect(); } }, { threshold: .5 }); io.observe(host); }
    else play();
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
        [`<span>${t.static.toLocaleString("en-US")} static</span><span>${(t.tools + t.web).toLocaleString("en-US")} sandbox</span>`, "<span>Easy</span>→<span>Medium</span>→<span>Hard</span>"]],
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
  }

  function init() {
    nav(); board(); kres(); leaderboardControls(); table(); dgrid(); insightsControls(); insights();
    demo(); benchmark(); wire(); infos(); logoMotion(); systemOne();
    const q = new URLSearchParams(location.search);
    if (q.get("domain") && DOM[q.get("domain")]) openDomain(q.get("domain"));
    else if (q.get("model") && BY[q.get("model")]) openModel(BY[q.get("model")]);
    window.SOA = { openDomain, openModel: k => openModel(BY[k] || M.find(m => m.key === k)), view: id => $("#lb-view")._sel(id), chart: showChart, board: k => { boardMode = k; board(); } };
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
