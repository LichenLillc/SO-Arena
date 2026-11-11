/* SO-Arena project page: renders the leaderboard, charts and explainers from window.SO_ARENA (assets/js/data.js,
   built from the paper's sources by scripts/website/build_site_data.py). No dependencies. */
(() => {
  "use strict";
  const D = window.SO_ARENA;
  if (!D) return;
  document.documentElement.classList.add("js");

  // ---- helpers -------------------------------------------------------------------------------------------------
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const NS = "http://www.w3.org/2000/svg";
  function S(tag, attrs = {}, parent) {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) if (v !== undefined && v !== null) e.setAttribute(k, v);
    if (parent) parent.appendChild(e);
    return e;
  }
  const f1 = v => (Math.round(v * 10) / 10).toFixed(1);
  const f2 = v => (Math.round(v * 100) / 100).toFixed(2);
  const ms = v => v == null ? "—" : v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)} s` : `${v >= 100 ? Math.round(v) : f1(v)} ms`;
  const ord = n => n + (["th", "st", "nd", "rd"][((n % 100) - 20) % 10] || ["th", "st", "nd", "rd"][n % 100] || "th");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- data ----------------------------------------------------------------------------------------------------
  const M = D.models;
  const FAM = Object.fromEntries(D.families.map(f => [f.id, f]));
  const DOM = Object.fromEntries(D.domains.map(d => [d.id, d]));
  const isS1 = m => m.group === "open" || m.group === "api";
  const S1 = M.filter(isS1);
  const REFS = M.filter(m => m.group === "s2").sort((a, b) => b.score - a.score);
  const SIZE_COL = { "0.4B": "#a3cf9b", "4B": "#4fa39b", "9B": "#6a8fc4", "27B": "#8a74b8", "31B": "#433d6e" };
  const API_COL = "#d4a24e";
  const closed = m => m.group === "api" || m.group === "s2";
  const colorOf = m => closed(m) ? API_COL : SIZE_COL[m.size];
  const slug = m => m.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const BYSLUG = Object.fromEntries(M.map(m => [slug(m), m]));
  // competition ranks ("1, 2, 2, 4") among the given models
  function ranksOf(list, val) {
    const out = new Map();
    for (const m of list) {
      const v = val(m);
      if (v == null) continue;
      out.set(m.key, 1 + list.filter(o => val(o) != null && val(o) > v + 1e-9).length);
    }
    return out;
  }
  const RANK = ranksOf(S1, m => m.score);
  const RANK_R = ranksOf(S1, m => m.reliability && m.reliability.R);
  const top = (list, val, n) => list.filter(m => val(m) != null).sort((a, b) => val(b) - val(a)).slice(0, n);

  // ---- icons, logos, robot --------------------------------------------------------------------------------------
  const FAM_ICON = {
    semantic: '<path d="M4 5.5h16v10H10l-4.5 3.5v-3.5H4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="9" cy="10.5" r="1.2" fill="currentColor"/><circle cx="12" cy="10.5" r="1.2" fill="currentColor"/><circle cx="15" cy="10.5" r="1.2" fill="currentColor"/>',
    knowledge: '<path d="M3.5 6c3-1.3 6-1.3 8.5.6 2.5-1.9 5.5-1.9 8.5-.6v12c-3-1.3-6-1.3-8.5.6-2.5-1.9-5.5-1.9-8.5-.6z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 6.6v12" stroke="currentColor" stroke-width="2"/>',
    safety: '<rect x="5" y="10.5" width="14" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8.5 10.5V8a3.5 3.5 0 017 0v2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 14v3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    evidence: '<path d="M5 3.5h9l4 4V12" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M5 3.5v17h6" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="15.5" cy="16" r="3.4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M18 18.5l2.5 2.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    agent: '<path d="M6 3.5l12 7.2-5.3 1.4 3.2 6.2-2.6 1.3-3.2-6.2L6 17.5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
    reliability: '<path d="M5 9h11M13 5.5L16.5 9 13 12.5M19 15H8M11 11.5L7.5 15l3.5 3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  };
  const icon = (id, cls = "fam-ic") => `<span class="${cls}" aria-hidden="true"><svg viewBox="0 0 24 24">${FAM_ICON[id]}</svg></span>`;
  function initials(m) {
    const base = m.name.replace(/-v\d+$/, "").replace(/-\d+(\.\d+)?B$/, "");
    const caps = base.match(/[A-Z]/g) || [base[0]];
    return caps.slice(0, 2).join("");
  }
  function logo(m, s = 28) {
    if (m.logo) return `<span class="logo" style="--s:${s}px"><img src="${m.logo}" alt="" width="${s}" height="${s}" loading="lazy"></span>`;
    return `<span class="logo mono" style="--s:${s}px;background:${colorOf(m)}" aria-hidden="true">${esc(initials(m))}</span>`;
  }
  function tags(m) {
    if (m.group === "s2") return '<span class="tag tag-s2">System Two</span>';
    if (m.group === "auto") return '<span class="tag tag-auto">Auto</span>';
    if (m.group === "api") return '<span class="tag tag-api">API</span>';
    return "";
  }
  const ROBOT = {
    smile: ["......##......", "......##......", "......##......", "..##########..", ".#wwwwwwwwww#.", ".#wssssssssw#.", ".#ws#ssss#sw#.",
      ".#wssssssssw#.", ".#wss#ss#ssw#.", ".#wsss##sssw#.", ".#wwwwwwwwww#.", "..##########..", "....#wwww#....", "..###wwww###..",
      "....#wwww#....", "....######...."],
    hop: ["......##......", "......##......", "......##......", "..##########..", ".#wwwwwwwwww#.", ".#wssssssssw#.", ".#ws#ssss#sw#.",
      ".#wssssssssw#.", ".#wss#ss#ssw#.", ".#wsss##sssw#.", ".#wwwwwwwwww#.", "..##########..", "..#.#wwww#.#..", "...##wwww##...",
      "....#wwww#....", "....######...."],
  };
  function robot(kind = "#a9c3dd", rows = ROBOT.smile) {
    const cm = { "#": "#3d454e", w: kind, s: "#ffffff" };
    let r = "";
    rows.forEach((row, j) => {
      let i = 0;
      while (i < row.length) {
        const c = row[i]; let k = i;
        while (k < row.length && row[k] === c) k++;
        if (cm[c]) r += `<rect x="${i}" y="${j}" width="${k - i + .02}" height="1.02" fill="${cm[c]}"/>`;
        i = k;
      }
    });
    return `<svg viewBox="0 0 14 16" shape-rendering="crispEdges" aria-hidden="true">${r}</svg>`;
  }

  // ---- tooltip -------------------------------------------------------------------------------------------------
  const tip = $("#tooltip");
  function showTip(html, x, y) {
    tip.innerHTML = html; tip.hidden = false;
    const r = tip.getBoundingClientRect();
    let left = x + 14, topY = y + 14;
    if (left + r.width > innerWidth - 8) left = x - r.width - 14;
    if (topY + r.height > innerHeight - 8) topY = y - r.height - 14;
    tip.style.left = Math.max(8, left) + "px"; tip.style.top = Math.max(8, topY) + "px";
  }
  const hideTip = () => { tip.hidden = true; };
  function bindTip(node, html) {
    node.addEventListener("pointerenter", e => showTip(html(), e.clientX, e.clientY));
    node.addEventListener("pointermove", e => showTip(html(), e.clientX, e.clientY));
    node.addEventListener("pointerleave", hideTip);
    node.addEventListener("focus", () => { const b = node.getBoundingClientRect(); showTip(html(), b.right, b.top); });
    node.addEventListener("blur", hideTip);
  }
  const modelTip = (m, extra = "") => `<b>${esc(m.name)}</b> <span class="t-sub">${esc(m.developer)}${m.size ? " · " + m.size : ""}</span><br>` +
    `Score ${f2(m.score)}${RANK.has(m.key) ? ` (#${RANK.get(m.key)} of 18)` : m.group === "s2" ? " (System Two)" : " (not ranked)"}${extra}`;

  // ---- wordmark ------------------------------------------------------------------------------------------------
  function wordmark() {
    const host = $("#wordmark");
    const fs = 132, base = 150, R = 62, rI = 36, gap = 6;
    const svg = S("svg", { viewBox: "0 0 640 190", role: "img", "aria-label": "SO-Arena" });
    const tS = S("text", { x: 0, y: base, "font-family": "Pagella, Palatino, serif", "font-weight": 700, "font-size": fs, fill: "#2b3138" }, svg);
    tS.textContent = "S";
    const ring = S("g", {}, svg);
    const tA = S("text", { y: base, "font-family": "Pagella, Palatino, serif", "font-weight": 700, "font-size": fs, fill: "#2b3138" }, svg);
    tA.textContent = "-Arena";
    const layout = () => {
      const wS = tS.getComputedTextLength(), wA = tA.getComputedTextLength();
      const cx = wS + gap + R, cy = base - .345 * fs;
      ring.innerHTML = "";
      const pt = (r, a) => [cx + r * Math.cos(a * Math.PI / 180), cy - r * Math.sin(a * Math.PI / 180)];
      const half = (a0, a1, fill, sweep) => {
        const [x1, y1] = pt(R, a0), [x2, y2] = pt(R, a1), [x3, y3] = pt(rI, a1), [x4, y4] = pt(rI, a0);
        S("path", { d: `M${x1} ${y1}A${R} ${R} 0 0 ${sweep} ${x2} ${y2}L${x3} ${y3}A${rI} ${rI} 0 0 ${1 - sweep} ${x4} ${y4}Z`, fill, stroke: "#262a2e", "stroke-width": 1.6 }, ring);
      };
      half(135, -45, "#c25b6c", 1);   // Capability, upper right (wine), as in Fig. 1
      half(-45, -225, "#4f85b9", 1);  // Reliability, lower left (blue)
      const rm = (R + rI) / 2, defs = S("defs", {}, ring);
      const [a1x, a1y] = pt(rm, 135), [a2x, a2y] = pt(rm, -45);
      S("path", { id: "wm-top", d: `M${a1x} ${a1y}A${rm} ${rm} 0 0 1 ${a2x} ${a2y}` }, defs);
      S("path", { id: "wm-bot", d: `M${a1x} ${a1y}A${rm} ${rm} 0 0 0 ${a2x} ${a2y}` }, defs);
      for (const [id, label] of [["wm-top", "CAPABILITY"], ["wm-bot", "RELIABILITY"]]) {
        const t = S("text", { "font-family": "Pagella, Palatino, serif", "font-weight": 700, "font-size": 12.5, fill: "#fff", "letter-spacing": .6, "dominant-baseline": "central" }, ring);
        const tp = S("textPath", { href: "#" + id, startOffset: "50%", "text-anchor": "middle" }, t);
        tp.textContent = label;
      }
      tA.setAttribute("x", cx + R + gap);
      svg.setAttribute("viewBox", `-4 ${base - fs * .78} ${cx + R + gap + wA + 8} ${fs * 1.05}`);
    };
    host.appendChild(svg);
    layout();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
  }

  // ---- hero stats ----------------------------------------------------------------------------------------------
  function heroStats() {
    const t = D.totals;
    const items = [[t.tasks.toLocaleString("en-US"), "tasks"], [t.domains, "domains"], [t.families, "capability families"],
      [t.models, "models evaluated"], [(t.tools + t.web).toLocaleString("en-US"), "sandbox tasks"]];
    $("#hero-stats").innerHTML = items.map(([b, s]) => `<li><b>${b}</b><span>${s}</span></li>`).join("");
  }

  // ---- arena ---------------------------------------------------------------------------------------------------
  const ARENA_ORDER = ["sentiment", "intent", "math", "code", "science", "knowledge", "safety", "retrieval", "verification", "tools", "web", "reliability"];
  function rowsHTML(list, val, fmt) {
    const rk = ranksOf(S1, val);
    return `<ol class="rows">${list.map(m => `<li><span class="rank r${rk.get(m.key)}">${rk.get(m.key)}</span>${logo(m, 22)}` +
      `<span class="nm" title="${esc(m.name)}">${esc(m.name)}</span><span class="sc">${fmt(val(m))}</span></li>`).join("")}</ol>`;
  }
  function arena() {
    const host = $("#arena");
    const cards = ARENA_ORDER.map((id, i) => {
      const area = `c${i + 1}`;
      if (id === "reliability") {
        const val = m => m.reliability && m.reliability.R;
        return `<button type="button" class="dcard" style="grid-area:${area};--fam:#655a7a" data-go="reliability">
          <div class="dcard-head">${icon("reliability")}<div><h3>Reliability <i>R</i></h3><div class="sub">Order stability × null discrimination</div></div></div>
          ${rowsHTML(top(S1, val, 3), val, f1)}<span class="more">About the tests →</span></button>`;
      }
      const d = DOM[id], val = m => m.domains[id];
      return `<button type="button" class="dcard" style="grid-area:${area};--fam:${FAM[d.family].color}" data-domain="${id}" aria-label="${esc(d.name)}: full ranking">
        <div class="dcard-head">${icon(d.family)}<div><h3>${esc(d.short === "Sentiment" ? "Sentiment & Emotion" : d.name.replace("Text-based ", ""))}</h3>
        <div class="sub">${d.leaderboard_tier} · ${d.leaderboard_tasks} tasks</div></div></div>
        ${rowsHTML(top(S1, val, 3), val, f1)}<span class="more">Full ranking →</span></button>`;
    }).join("");
    const t3 = top(S1, m => m.score, 3), order = [t3[1], t3[0], t3[2]], cls = ["s2", "s1", "s3"];
    const pod = `<div class="podium"><h3>${icon("reliability", "sr-only")}Overall</h3>
      <div class="sub">Leaderboard score of the 18 System One models</div>
      <div class="steps">${order.map((m, i) => `<button type="button" class="step ${cls[i]}" data-model="${slug(m)}" style="border:0;background:none;cursor:pointer;padding:0" aria-label="${esc(m.name)}, rank ${RANK.get(m.key)}, score ${f2(m.score)}">
        ${logo(m, i === 1 ? 64 : 52)}<span class="who">${esc(m.name)}</span><span class="dev">${esc(m.developer)} · ${m.size || "API"}</span>
        <span class="pts">${f2(m.score)}</span><span class="block">${RANK.get(m.key)}</span></button>`).join("")}</div>
      <div class="refs" aria-label="System Two references"><span style="color:var(--muted)">System Two references:</span>
        ${REFS.map(m => `<button type="button" class="ref-chip" data-model="${slug(m)}" style="cursor:pointer">${logo(m, 20)}${esc(m.name)} <b>${f2(m.score)}</b></button>`).join("")}</div>
      <div class="more-row"><button type="button" class="link-btn" data-tab="tab-table">Full table →</button>
        <button type="button" class="link-btn" data-scroll="#benchmark .scoring">How the score works →</button></div></div>`;
    host.innerHTML = pod + cards;
    $("#arena-note").innerHTML = `Ranks count only the 18 System One models (16 open-weight models and 2 decision APIs). StartLux Auto, which switches between System One and System Two, appears in the full rankings without a rank.`;
  }

  // ---- sheet (dialog) ------------------------------------------------------------------------------------------
  const sheet = $("#sheet"), sheetBody = $("#sheet-body");
  function openSheet(html, title, param) {
    sheetBody.innerHTML = html;
    if (typeof sheet.showModal === "function") { if (!sheet.open) sheet.showModal(); } else sheet.setAttribute("open", "");
    sheet.scrollTop = 0;
    if (param) { const u = new URL(location.href); u.search = param; history.replaceState(null, "", u); }
    document.title = `${title} · SO-Arena`;
  }
  function closeSheet() { if (sheet.open) sheet.close(); }
  sheet.addEventListener("close", () => {
    const u = new URL(location.href); u.search = ""; history.replaceState(null, "", u);
    document.title = "SO-Arena · Benchmarking System One Models"; hideTip();
  });
  $(".sheet-close").addEventListener("click", closeSheet);
  sheet.addEventListener("click", e => { if (e.target === sheet) closeSheet(); });

  function barsHTML(list, val, famColor) {
    const rk = ranksOf(S1, val);
    return `<ul class="bars">${list.map(m => {
      const v = val(m), cls = m.group === "s2" ? "is-ref" : m.group === "auto" ? "is-auto" : "";
      const r = isS1(m) ? rk.get(m.key) : (m.group === "s2" ? "ref" : "–");
      return `<li class="${cls}"><span class="rk">${r}</span>${logo(m, 22)}<button type="button" class="link-btn" style="padding:0;text-align:left;color:var(--ink);font-weight:${isS1(m) && r <= 3 ? 700 : 500}" data-model="${slug(m)}">${esc(m.name)}${tags(m)}</button>
        <span class="bar" style="--fam:${famColor}"><span style="width:${Math.max(0, Math.min(100, v))}%"></span></span><span class="v">${f1(v)}</span></li>`;
    }).join("")}</ul>`;
  }

  function openDomain(id) {
    const d = DOM[id], fam = FAM[d.family], val = m => m.domains[id];
    const list = [...M].sort((a, b) => val(b) - val(a));
    const tiered = !!d.tiers;
    const counts = tiered ? Object.entries(d.tiers).map(([k, v]) => `${({ E: "easy", M: "medium", H: "hard", V: "very hard" })[k]} ${v}`).join(" · ") : "no tiers";
    const html = `<p class="eyebrow" style="color:${fam.color}">${esc(fam.name)}</p><h2 id="sheet-title">${esc(d.name)}</h2>
      <p class="sheet-sub">${d.tasks} tasks (${counts}). The leaderboard uses ${d.leaderboard_tier === "All tasks" ? "all tasks" : d.id === "math" ? "the hard and very hard tiers" : "the hard tier"
      } (${d.leaderboard_tasks} tasks). Sources${d.sources_by_tier ? ", from easy to hard" : ""}: ${esc(d.sources.join(d.sources_by_tier ? " → " : ", "))}.</p>
      ${tiered ? `<div class="tabs" role="tablist" aria-label="Domain views" data-tabs="dom">
        <button role="tab" id="dt-rank" aria-controls="dp-rank" aria-selected="true">Ranking</button>
        <button role="tab" id="dt-tier" aria-controls="dp-tier" aria-selected="false" tabindex="-1">By difficulty</button></div>` : ""}
      <div role="tabpanel" id="dp-rank" aria-labelledby="dt-rank">${barsHTML(list, val, fam.color)}
        <p class="note"># ranks the 18 System One models; ref marks the System Two references; StartLux Auto is not ranked.</p></div>
      ${tiered ? `<div role="tabpanel" id="dp-tier" aria-labelledby="dt-tier" hidden><div class="chart" id="sheet-tier"></div><div class="legend" id="sheet-tier-legend"></div>
        <p class="note">Each line is one model. Highlighted: the top three System One models in this domain and GPT-6 Luna. Hover or focus a line for its values.</p></div>` : ""}`;
    openSheet(html, d.name, `?domain=${id}`);
    setupTabs($('[data-tabs="dom"]', sheetBody), tab => { if (tab === "dt-tier") tierChart($("#sheet-tier"), id, $("#sheet-tier-legend"), { compact: true }); });
  }

  function openModel(m) {
    const r = m.reliability, l = m.latency;
    const rank = RANK.get(m.key), rr = RANK_R.get(m.key);
    const med = id => { const v = S1.map(o => o.domains[id]).sort((a, b) => a - b); return (v[8] + v[9]) / 2; };
    const kv = [
      [f2(m.score), `Leaderboard score${rank ? ` · #${rank} of 18` : m.group === "s2" ? " · System Two" : " · not ranked"}`],
      [r ? f1(r.R) : "—", r ? `Reliability R · #${rr} of 18` : "Reliability R · not measured"],
      [l ? ms(l.mean_ms) : "—", l ? `Mean latency · ${l.timing}` : "Mean latency"],
      [l && l.p99_ms ? ms(l.p99_ms) : (r ? `${r.S.toFixed(2)} / ${r.N.toFixed(2)}` : "—"), l && l.p99_ms ? `99th percentile latency` : "S / N"],
    ];
    const prof = D.domains.map(d => {
      const v = m.domains[d.id], md = med(d.id);
      return `<li><i class="sw" style="background:${FAM[d.family].color}" title="${esc(FAM[d.family].name)}"></i>
        <span>${esc(d.short)}</span><span class="bar" style="--fam:${FAM[d.family].color}"><span style="width:${v}%"></span><i class="med" title="System One median ${f1(md)}" style="left:calc(${md}% - 1px)"></i></span><span class="v">${f1(v)}</span></li>`;
    }).join("");
    const tg = D.domains.map(d => {
      const t = m.tiers[d.id], cell = k => {
        if (t[k] == null) return "<td></td>";
        const a = .06 + .55 * Math.pow(Math.max(0, t[k] - 10) / 90, 1.4);
        return `<td style="background:rgba(${m.group === "s2" ? "192,122,69" : "75,121,165"},${a.toFixed(3)})">${t[k]}</td>`;
      };
      return `<tr><th>${esc(d.short)}</th>${t.All != null ? `<td colspan="4" style="background:rgba(75,121,165,${(.06 + .55 * Math.pow(Math.max(0, t.All - 10) / 90, 1.4)).toFixed(3)})">${t.All} (all)</td>` : ["E", "M", "H", "V"].map(cell).join("")}</tr>`;
    }).join("");
    const html = `<div class="model-head">${logo(m, 56)}<div><h2 id="sheet-title">${esc(m.name)}${tags(m)}</h2>
        <p class="sheet-sub" style="margin:2px 0 0">${esc(m.developer)}${m.size ? " · " + m.size : ""} · ${closed(m) ? "closed API" : "open weights"} · reasoning: ${esc(m.reasoning.toLowerCase())}
        ${m.release_url ? ` · <a href="${m.release_url}" target="_blank" rel="noopener">${esc(m.release)}</a>` : ` · <code>${esc(m.release)}</code>`}</p></div></div>
      <div class="kv">${kv.map(([b, s]) => `<div><b>${b}</b><span>${s}</span></div>`).join("")}</div>
      <h3 style="font-size:18px;margin:4px 0 6px">Domain scores <span style="font:400 13px var(--sans);color:var(--muted)">leaderboard tier; the tick marks the System One median</span></h3>
      <ul class="bars prof">${prof}</ul>
      <h3 style="font-size:18px;margin:16px 0 6px">By difficulty tier</h3>
      <div style="overflow-x:auto"><table class="tier-grid"><thead><tr><th></th><th>Easy</th><th>Medium</th><th>Hard</th><th>Very hard</th></tr></thead><tbody>${tg}</tbody></table></div>
      ${r ? `<p class="note">Order stability S = ${r.S.toFixed(3)}, null discrimination N = ${r.N.toFixed(3)}, reliability R = ${f1(r.R)}.</p>` : ""}
      ${m.note ? `<p class="note">${esc(m.note)}</p>` : ""}`;
    openSheet(html, m.name, `?model=${slug(m)}`);
  }

  // ---- tabs ----------------------------------------------------------------------------------------------------
  function setupTabs(list, onChange) {
    if (!list) return;
    const tabs = $$('[role="tab"]', list);
    const select = (t, focus) => {
      tabs.forEach(o => {
        const on = o === t;
        o.setAttribute("aria-selected", on); o.tabIndex = on ? 0 : -1;
        const p = document.getElementById(o.getAttribute("aria-controls")); if (p) p.hidden = !on;
      });
      if (focus) t.focus();
      if (onChange) onChange(t.id);
    };
    tabs.forEach((t, i) => {
      t.addEventListener("click", () => select(t));
      t.addEventListener("keydown", e => {
        const k = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
        if (k) { e.preventDefault(); select(tabs[(i + k + tabs.length) % tabs.length], true); }
        if (e.key === "Home") { e.preventDefault(); select(tabs[0], true); }
        if (e.key === "End") { e.preventDefault(); select(tabs[tabs.length - 1], true); }
      });
    });
    list._select = id => { const t = tabs.find(o => o.id === id); if (t) select(t); };
  }

  // ---- table ---------------------------------------------------------------------------------------------------
  const TBL = { sort: "score", dir: -1, filter: "all", q: "" };
  const FILTERS = [["all", "All 21"], ["s1", "System One"], ["small", "Open weights ≤ 4B"], ["large", "Open weights ≥ 9B"], ["api", "Closed APIs"]];
  const passes = m => {
    const f = TBL.filter, sz = parseFloat(m.size);
    if (f === "s1" && !isS1(m)) return false;
    if (f === "small" && !((m.group === "open" || m.group === "auto") && sz <= 4)) return false;
    if (f === "large" && !(m.group === "open" && sz >= 9)) return false;
    if (f === "api" && !closed(m)) return false;
    const q = TBL.q.trim().toLowerCase();
    return !q || (m.name + " " + m.developer).toLowerCase().includes(q);
  };
  const COLS = [
    { id: "rank", label: "#", val: m => RANK.get(m.key) ?? null, cls: "c-rank", asc: true },
    { id: "model", label: "Model", val: m => m.name, cls: "c-model" },
    { id: "score", label: "Score", val: m => m.score, cls: "c-score" },
    { id: "R", label: "R", val: m => m.reliability ? m.reliability.R : null, cls: "c-num", title: "Reliability R (%)" },
    { id: "lat", label: "Latency", val: m => m.latency ? m.latency.mean_ms : null, cls: "c-num", asc: true, title: "Mean latency per task" },
    ...D.domains.map(d => ({ id: d.id, label: d.short, val: m => m.domains[d.id], cls: "c-dom", fam: d.family, title: d.name })),
  ];
  function table() {
    const host = $("#lb-table");
    const famSpans = []; let prev = null;
    for (const d of D.domains) { if (d.family !== prev) { famSpans.push({ fam: d.family, n: 0 }); prev = d.family; } famSpans[famSpans.length - 1].n++; }
    const thead = `<thead><tr class="grp"><th colspan="5" style="background:#faf8f2"></th>${famSpans.map(s => `<th colspan="${s.n}" style="background:${FAM[s.fam].color}">${esc(FAM[s.fam].name.split(" ")[0])}</th>`).join("")}</tr>
      <tr>${COLS.map(c => `<th class="${c.cls}" scope="col"${TBL.sort === c.id ? ` aria-sort="${TBL.dir > 0 ? "ascending" : "descending"}"` : ""}><button type="button" data-sort="${c.id}" title="${esc(c.title || "Sort by " + c.label)}">${esc(c.label)}</button></th>`).join("")}</tr></thead>`;
    const col = COLS.find(c => c.id === TBL.sort);
    const rows = M.filter(passes).sort((a, b) => {
      const va = col.val(a), vb = col.val(b);
      if (va == null && vb == null) return b.score - a.score;
      if (va == null) return 1; if (vb == null) return -1;
      if (typeof va === "string") return TBL.dir * va.localeCompare(vb);
      return TBL.dir * (va - vb) || b.score - a.score;
    });
    const heat = (m, v) => {
      const a = .05 + .5 * Math.pow(Math.max(0, v - 15) / 85, 1.5);
      return `background:rgba(${m.group === "s2" ? "192,122,69" : "75,121,165"},${a.toFixed(3)})`;
    };
    const body = rows.map(m => {
      const r = RANK.get(m.key);
      return `<tr tabindex="0" data-model="${slug(m)}" aria-label="${esc(m.name)}: open profile">
        <td class="c-rank">${r ?? (m.group === "s2" ? "ref" : "–")}</td>
        <td class="c-model"><div class="mcell">${logo(m, 28)}<div><div class="nm">${esc(m.name)}${tags(m)}</div><div class="meta">${esc(m.developer)}${m.size ? " · " + m.size : ""}</div></div></div></td>
        <td class="c-score${TBL.sort === "score" ? " sorted" : ""}">${f2(m.score)}</td>
        <td class="c-num${TBL.sort === "R" ? " sorted" : ""}">${m.reliability ? f1(m.reliability.R) : '<span class="muted">—</span>'}</td>
        <td class="c-num${TBL.sort === "lat" ? " sorted" : ""}">${m.latency ? ms(m.latency.mean_ms) : '<span class="muted">—</span>'}</td>
        ${D.domains.map(d => `<td class="c-dom" style="${heat(m, m.domains[d.id])}">${f1(m.domains[d.id])}</td>`).join("")}</tr>`;
    }).join("");
    host.innerHTML = thead + `<tbody>${body || `<tr><td colspan="${COLS.length}" style="padding:20px;color:var(--muted)">No model matches.</td></tr>`}</tbody>`;
  }
  function tableControls() {
    $("#table-filters").innerHTML = FILTERS.map(([id, l]) => `<button type="button" class="chip" data-filter="${id}" aria-pressed="${TBL.filter === id}">${l}</button>`).join("");
    $("#table-filters").addEventListener("click", e => {
      const b = e.target.closest("[data-filter]"); if (!b) return;
      TBL.filter = b.dataset.filter; $$("[data-filter]").forEach(o => o.setAttribute("aria-pressed", o === b)); table();
    });
    $("#table-search").addEventListener("input", e => { TBL.q = e.target.value; table(); });
    $("#lb-table").addEventListener("click", e => {
      const s = e.target.closest("[data-sort]");
      if (s) {
        const c = COLS.find(o => o.id === s.dataset.sort);
        if (TBL.sort === c.id) TBL.dir = -TBL.dir; else { TBL.sort = c.id; TBL.dir = c.asc || c.id === "model" ? 1 : -1; }
        table(); const nb = $(`[data-sort="${c.id}"]`); if (nb) nb.focus();
        return;
      }
      const r = e.target.closest("tr[data-model]"); if (r) openModel(BYSLUG[r.dataset.model]);
    });
    $("#lb-table").addEventListener("keydown", e => {
      const r = e.target.closest("tr[data-model]");
      if (r && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openModel(BYSLUG[r.dataset.model]); }
    });
  }

  // ---- charts --------------------------------------------------------------------------------------------------
  function frame(host, { minH = 320, ratio = .56, maxH = 520 } = {}) {
    host.innerHTML = "";
    const W = Math.max(300, host.clientWidth || 800), H = Math.round(Math.max(minH, Math.min(maxH, W * ratio)));
    const svg = S("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: "img" }, host);
    return { svg, W, H };
  }
  function axes(svg, W, H, m, xs, ys, xt, yt, xTitle, yTitle) {
    const g = S("g", { class: "grid" }, svg), ax = S("g", { class: "ax" }, svg);
    for (const [v, lab] of yt) {
      const y = ys(v);
      S("line", { x1: m.l, x2: W - m.r, y1: y, y2: y }, g);
      S("text", { x: m.l - 8, y: y + 4, "text-anchor": "end" }, ax).textContent = lab;
    }
    for (const [v, lab] of xt) {
      const x = xs(v);
      S("line", { x1: x, x2: x, y1: m.t, y2: H - m.b }, g);
      S("text", { x, y: H - m.b + 18, "text-anchor": "middle" }, ax).textContent = lab;
    }
    S("text", { class: "axis-title", x: (m.l + W - m.r) / 2, y: H - 8, "text-anchor": "middle" }, svg).textContent = xTitle;
    S("text", { class: "axis-title", x: 14, y: (m.t + H - m.b) / 2, transform: `rotate(-90 14 ${(m.t + H - m.b) / 2})`, "text-anchor": "middle" }, svg).textContent = yTitle;
  }
  function mark(g, m, x, y, r = 6.5) {
    if (closed(m)) S("path", { class: "mark", d: `M${x} ${y - r * 1.25}L${x + r * 1.25} ${y}L${x} ${y + r * 1.25}L${x - r * 1.25} ${y}Z`, fill: colorOf(m), stroke: "#262a2e", "stroke-width": 1.2 }, g);
    else S("circle", { class: "mark", cx: x, cy: y, r, fill: m.group === "auto" ? "#fff" : colorOf(m), stroke: m.group === "auto" ? colorOf(m) : "#262a2e", "stroke-width": m.group === "auto" ? 2.4 : 1.2 }, g);
  }
  // greedy label placement: right, left, above, below; skips a label that cannot be placed without overlap
  function placeLabels(svg, items, bounds) {
    const boxes = items.map(it => ({ x0: it.x - 7, x1: it.x + 7, y0: it.y - 7, y1: it.y + 7 }));
    const hit = b => boxes.some(o => b.x0 < o.x1 && o.x0 < b.x1 && b.y0 < o.y1 && o.y0 < b.y1) ||
      b.x0 < bounds.x0 || b.x1 > bounds.x1 || b.y0 < bounds.y0 || b.y1 > bounds.y1;
    const g = S("g", {}, svg);
    for (const it of items.filter(i => i.label)) {
      const w = it.label.length * 6.4 + 2, h = 14, gap = 9;
      const tries = [[it.x + gap, it.y - h / 2, "start"], [it.x - gap - w, it.y - h / 2, "end"], [it.x - w / 2, it.y - gap - h, "middle"], [it.x - w / 2, it.y + gap, "middle"]];
      for (const [x0, y0, anchor] of tries) {
        const b = { x0, x1: x0 + w, y0, y1: y0 + h };
        if (hit(b)) continue;
        boxes.push(b);
        const tx = anchor === "start" ? x0 : anchor === "end" ? x0 + w : x0 + w / 2;
        const t = S("text", { class: "lbl", x: tx, y: y0 + 11, "text-anchor": anchor }, g);
        t.textContent = it.label; t.dataset.key = it.key;
        break;
      }
    }
    return g;
  }
  function legendHTML(withAuto = true, extra = "") {
    return Object.entries(SIZE_COL).map(([s, c]) => `<span><i style="background:${c}"></i>${s}</span>`).join("") +
      `<span><i class="dia" style="background:${API_COL}"></i>Closed API</span>` +
      (withAuto ? `<span><i style="background:#fff;border:2px solid ${SIZE_COL["4B"]}"></i>Hybrid (StartLux Auto)</span>` : "") + extra;
  }
  function pointsLayer(svg, pts, tipFn) {
    const g = S("g", {}, svg);
    for (const p of pts) {
      const a = S("g", { class: "pt", tabindex: 0, role: "button", "aria-label": `${p.m.name}: ${p.aria}` }, g);
      mark(a, p.m, p.x, p.y);
      bindTip(a, () => tipFn(p));
      a.addEventListener("click", () => openModel(p.m));
      a.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openModel(p.m); } });
    }
    return g;
  }

  function speedChart() {
    const host = $("#chart-speed");
    const { svg, W, H } = frame(host, { ratio: .52 });
    const m = { l: 52, r: 24, t: 16, b: 46 };
    const lx = v => Math.log10(v), X0 = lx(4), X1 = lx(5000);
    const xs = v => m.l + (lx(v) - X0) / (X1 - X0) * (W - m.l - m.r);
    const ys = v => H - m.b - (v - 25) / (90 - 25) * (H - m.t - m.b);
    axes(svg, W, H, m, xs, ys, [[10, "10 ms"], [100, "100 ms"], [1000, "1 s"]], [30, 40, 50, 60, 70, 80, 90].map(v => [v, v]),
      "Mean latency per task (log scale)", "Performance");
    const latName = o => o.key === "SII-Decision-4B" ? "SII-4B + fla" : o.name;   // as Fig. 4: timed with flash-linear-attention
    const pts = M.filter(o => o.latency).map(o => ({ m: o, x: xs(o.latency.mean_ms), y: ys(o.score), label: latName(o), key: o.key, aria: `score ${f2(o.score)}, ${ms(o.latency.mean_ms)}` }));
    // Pareto frontier of System One models: best score at each latency
    const fr = []; let best = -1;
    for (const o of [...S1].sort((a, b) => a.latency.mean_ms - b.latency.mean_ms || b.score - a.score)) if (o.score > best) { fr.push(o); best = o.score; }
    S("path", { d: fr.map((o, i) => `${i ? "L" : "M"}${xs(o.latency.mean_ms)} ${ys(o.score)}`).join(""), fill: "none", stroke: "#a8506a", "stroke-width": 2.6, "stroke-linejoin": "round" }, svg);
    pointsLayer(svg, pts, p => modelTip(p.m, `<br>Latency ${ms(p.m.latency.mean_ms)} <span class="t-sub">(${p.m.latency.timing})</span>`));
    placeLabels(svg, pts, { x0: m.l, x1: W - m.r + 20, y0: m.t - 6, y1: H - m.b });
    $("#legend-speed").innerHTML = legendHTML(true, `<span><i class="line" style="background:#a8506a"></i>Pareto frontier</span>`);
  }

  let relMode = "perf";
  function relChart() {
    const host = $("#chart-rel");
    const { svg, W, H } = frame(host, { ratio: .52 });
    const m = { l: 56, r: 24, t: 16, b: 46 };
    const R = S1.filter(o => o.reliability);
    let pts;
    if (relMode === "perf") {
      $("#rel-chart-title").textContent = "Reliability against performance";
      const xs = v => m.l + (v - 28) / (74 - 28) * (W - m.l - m.r), ys = v => H - m.b - v / 90 * (H - m.t - m.b);
      axes(svg, W, H, m, xs, ys, [30, 40, 50, 60, 70].map(v => [v, v]), [0, 20, 40, 60, 80].map(v => [v, v]), "Performance (leaderboard score)", "Reliability R");
      pts = R.map(o => ({ m: o, x: xs(o.score), y: ys(o.reliability.R), label: o.name, key: o.key, aria: `score ${f2(o.score)}, reliability ${f1(o.reliability.R)}` }));
      $("#rel-note").textContent = "The 18 System One models. Higher performance does not always mean higher reliability.";
    } else {
      $("#rel-chart-title").textContent = "Order stability S and null discrimination N";
      const xs = v => m.l + (v - .3) / (1.02 - .3) * (W - m.l - m.r), ys = v => H - m.b - v / .85 * (H - m.t - m.b);
      axes(svg, W, H, m, xs, ys, [.4, .5, .6, .7, .8, .9, 1].map(v => [v, v.toFixed(1)]), [0, .2, .4, .6, .8].map(v => [v, v.toFixed(1)]), "Order stability S", "Null discrimination N");
      const g = S("g", {}, svg);
      for (const r of [.2, .4, .6, .8]) {   // constant R: N = R^2 / S
        const d = []; for (let s = .3; s <= 1.02; s += .01) { const n = r * r / s; if (n <= .85) d.push(`${d.length ? "L" : "M"}${xs(s)} ${ys(n)}`); }
        S("path", { d: d.join(""), fill: "none", stroke: "#a6a99b", "stroke-dasharray": "5 4", "stroke-width": 1.2 }, g);
        const s1 = Math.max(.3, r * r / .82);
        S("text", { x: xs(Math.min(1.0, s1 + .02)), y: ys(r * r / Math.min(1.0, s1 + .02)) - 5, class: "ax" }, g).textContent = `R = ${r}`;
      }
      pts = R.map(o => ({ m: o, x: xs(o.reliability.S), y: ys(o.reliability.N), label: o.name, key: o.key, aria: `S ${o.reliability.S.toFixed(2)}, N ${o.reliability.N.toFixed(2)}` }));
      $("#rel-note").textContent = "0 is chance level for both components; dashed curves mark constant R. Jeva-4B's order stability is 1 by construction.";
    }
    pointsLayer(svg, pts, p => modelTip(p.m, `<br>R ${f1(p.m.reliability.R)} (#${RANK_R.get(p.m.key)} of 18) · S ${p.m.reliability.S.toFixed(2)} · N ${p.m.reliability.N.toFixed(2)}`));
    placeLabels(svg, pts, { x0: m.l, x1: W - m.r + 16, y0: m.t - 6, y1: H - m.b });
    $("#legend-rel").innerHTML = legendHTML(false);
  }

  const TIERED = D.domains.filter(d => d.tiers);
  let tierDomain = "math";
  function tierChart(host, id, legendHost, { compact = false } = {}) {
    const d = DOM[id], labels = Object.keys(d.tiers), names = { E: "Easy", M: "Medium", H: "Hard", V: "Very hard" };
    const { svg, W, H } = frame(host, { ratio: compact ? .5 : .46, minH: 280, maxH: compact ? 380 : 460 });
    const m = { l: 46, r: compact ? 110 : 150, t: 14, b: 44 };
    const xs = i => m.l + (labels.length === 1 ? .5 : i / (labels.length - 1)) * (W - m.l - m.r), ys = v => H - m.b - v / 100 * (H - m.t - m.b);
    axes(svg, W, H, m, i => xs(i), ys, labels.map((k, i) => [i, names[k]]), [0, 20, 40, 60, 80, 100].map(v => [v, v]), "Difficulty tier", "Score");
    const val = o => o.domains[id];
    const hi = new Set([...top(S1, val, compact ? 3 : 1).map(o => o.key), ...(compact ? [] : ["StartLux-4B-Instant"]), "GPT-6 Luna Responses · medium"]);
    const g = S("g", {}, svg), endLabels = [];
    const ordered = [...M].sort((a, b) => (hi.has(a.key) ? 1 : 0) - (hi.has(b.key) ? 1 : 0));
    const lines = new Map();
    for (const o of ordered) {
      const t = o.tiers[id], pts = labels.map((k, i) => [xs(i), ys(t[k])]);
      const on = hi.has(o.key), col = o.group === "s2" ? "#c07a45" : colorOf(o);
      const grp = S("g", { class: "pt", tabindex: 0, role: "button", "aria-label": `${o.name}: ${labels.map(k => `${names[k]} ${t[k]}`).join(", ")}` }, g);
      S("path", { d: pts.map((p, i) => `${i ? "L" : "M"}${p[0]} ${p[1]}`).join(""), fill: "none", stroke: "transparent", "stroke-width": 12 }, grp);
      const ln = S("path", { d: pts.map((p, i) => `${i ? "L" : "M"}${p[0]} ${p[1]}`).join(""), fill: "none", stroke: on ? col : "#c9c4b6", "stroke-width": on ? 2.8 : 1.3,
        "stroke-dasharray": o.group === "s2" ? "6 4" : null, opacity: on ? 1 : .8 }, grp);
      for (const p of pts) S("circle", { cx: p[0], cy: p[1], r: on ? 3.6 : 2.2, fill: on ? col : "#c9c4b6" }, grp);
      lines.set(o.key, { grp, ln, col, on });
      bindTip(grp, () => `<b>${esc(o.name)}</b><br>${labels.map(k => `${names[k]} ${t[k]}`).join(" · ")}`);
      grp.addEventListener("pointerenter", () => { ln.setAttribute("stroke", col); ln.setAttribute("stroke-width", 3.2); grp.parentNode.appendChild(grp); });
      grp.addEventListener("pointerleave", () => { if (!lines.get(o.key).on) { ln.setAttribute("stroke", "#c9c4b6"); ln.setAttribute("stroke-width", 1.3); } });
      grp.addEventListener("click", () => openModel(o));
      if (on) endLabels.push({ x: pts[pts.length - 1][0], y: pts[pts.length - 1][1], label: o.name, key: o.key });
    }
    // end labels, nudged apart vertically
    endLabels.sort((a, b) => a.y - b.y);
    for (let i = 1; i < endLabels.length; i++) if (endLabels[i].y - endLabels[i - 1].y < 15) endLabels[i].y = endLabels[i - 1].y + 15;
    for (const e of endLabels) S("text", { class: "lbl", x: e.x + 8, y: e.y + 4 }, svg).textContent = e.label;
    if (legendHost) legendHost.innerHTML = M.filter(o => hi.has(o.key)).map(o => `<span><i class="${o.group === "s2" ? "dash" : ""}" style="${o.group === "s2" ? "" : `background:${colorOf(o)}`}"></i>${esc(o.name)}</span>`).join("") +
      `<span><i class="line" style="background:#c9c4b6"></i>Other models</span>`;
  }
  function tierControls() {
    const host = $("#tier-domains");
    host.innerHTML = TIERED.map(d => `<button type="button" class="chip" data-tdom="${d.id}" aria-pressed="${d.id === tierDomain}">${esc(d.short)}</button>`).join("");
    host.addEventListener("click", e => {
      const b = e.target.closest("[data-tdom]"); if (!b) return;
      tierDomain = b.dataset.tdom; $$("[data-tdom]").forEach(o => o.setAttribute("aria-pressed", o === b));
      tierChart($("#chart-tiers"), tierDomain, $("#legend-tiers"));
    });
  }

  // ---- reliability demo and facts ------------------------------------------------------------------------------
  function relDemo() {
    const host = $("#rel-demo");
    host.innerHTML = `<h3>The two tests, step by step</h3><p class="demo-sub">A model picks B. Do other benchmarks ask anything more?</p>
      <div class="scenes">
        <div class="scene" data-scene="0"><h4>Other benchmarks</h4><p class="cap">One fixed option set, scored by accuracy</p><div class="blocks"></div><div class="bot"></div><div class="verdict"></div></div>
        <div class="scene" data-scene="1"><h4>Options reordered</h4><p class="cap">Does the model choose the same option again?</p><div class="blocks"></div><div class="bot"></div><div class="verdict"></div></div>
        <div class="scene" data-scene="2"><h4>Correct option missing</h4><p class="cap">Does the model see that no option is correct?</p><div class="blocks"></div><div class="bot"></div><div class="verdict"></div></div>
      </div>
      <div class="demo-ctl"><button type="button" class="btn btn-ghost" id="demo-play">▶ Play again</button></div>`;
    const W = 30, G = 6, NW = 46;
    const scenes = $$(".scene", host).map(sc => {
      const blocks = $(".blocks", sc), bot = $(".bot", sc), verdict = $(".verdict", sc);
      const mk = (lab, w = W) => { const b = document.createElement("span"); b.className = "blk"; b.textContent = lab; b.style.width = w + "px"; blocks.appendChild(b); return b; };
      const A = mk("A"), B = mk("B"), C = mk("C"), N = sc.dataset.scene === "2" ? mk("Null", NW) : null;
      bot.innerHTML = robot("#a9c3dd", ROBOT.hop);
      return { sc, blocks, bot, verdict, A, B, C, N };
    });
    const place = (s, order) => {
      const total = order.reduce((t, b) => t + (b === s.N ? NW : W) + G, -G), x0 = (s.blocks.clientWidth - total) / 2;
      let x = x0;
      for (const b of order) { b.style.left = x + "px"; x += (b === s.N ? NW : W) + G; }
    };
    const robotAt = (s, b) => { const svg = $("svg", s.bot); svg.style.left = (parseFloat(b.style.left) + (b === s.N ? NW : W) / 2 - 17) + "px"; };
    const hop = (s, b) => { s.bot.classList.remove("hop"); void s.bot.offsetWidth; s.bot.classList.add("hop"); b.classList.add("hit", "pick"); setTimeout(() => b.classList.remove("hit"), 420); };
    let timers = [];
    const later = (f, t) => timers.push(setTimeout(f, reduceMotion ? 0 : t));
    function reset() {
      timers.forEach(clearTimeout); timers = [];
      for (const s of scenes) {
        [s.A, s.B, s.C, s.N].forEach(b => b && b.classList.remove("pick", "hit", "gone", "hidden"));
        if (s.N) s.N.classList.add("hidden");
        place(s, [s.A, s.B, s.C, ...(s.N ? [s.N] : [])].filter(b => !s.N || b !== s.N));
        if (s.N) { s.N.style.left = (parseFloat(s.C.style.left) + W + G) + "px"; }
        robotAt(s, s.A); s.verdict.textContent = "";
      }
    }
    function play() {
      reset();
      const [s0, s1, s2] = scenes;
      later(() => { robotAt(s0, s0.B); robotAt(s1, s1.B); robotAt(s2, s2.B); }, 300);
      later(() => { [s0, s1, s2].forEach(s => hop(s, s.B)); s0.verdict.textContent = "✓ Correct"; }, 950);
      later(() => { place(s1, [s1.C, s1.A, s1.B]); s1.B.classList.remove("pick"); robotAt(s1, s1.A); }, 1900);
      later(() => { s2.B.classList.remove("pick"); s2.B.classList.add("gone"); s2.N.classList.remove("hidden"); place(s2, [s2.A, s2.B, s2.C, s2.N]); robotAt(s2, s2.A); }, 1900);
      later(() => { robotAt(s1, s1.B); robotAt(s2, s2.N); }, 2700);
      later(() => { hop(s1, s1.B); s1.verdict.textContent = "✓ Same choice"; hop(s2, s2.N); s2.verdict.textContent = "✓ No valid option"; }, 3350);
    }
    $("#demo-play").addEventListener("click", play);
    reset();
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { play(); io.disconnect(); } }, { threshold: .45 });
      io.observe(host);
    } else play();
    addEventListener("resize", () => { if (!timers.length) reset(); });
  }
  function relFacts() {
    const R = S1.filter(o => o.reliability), n = R.length;
    const s08 = R.filter(o => o.reliability.S > .8).length;
    const Ns = R.map(o => o.reliability.N);
    const byR = top(R, o => o.reliability.R, 2), best = top(S1, o => o.score, 1)[0];
    $("#rel-facts").innerHTML = `
      <div class="fact reveal"><b>${s08} of ${n}</b><p>System One models keep their answer under reordering with order stability <i>S</i> above 0.8.</p></div>
      <div class="fact reveal"><b>${Math.min(...Ns).toFixed(2)}–${Math.max(...Ns).toFixed(2)}</b><p>Null discrimination <i>N</i> varies widely, from near chance to about 0.8. Size alone does not decide it.</p></div>
      <div class="fact reveal"><b>${ord(RANK.get(byR[0].key))} and ${ord(RANK.get(byR[1].key))}</b><p>The performance ranks of the two most reliable models, ${esc(byR[0].name)} and ${esc(byR[1].name)}. The best-performing model, ${esc(best.name)}, ranks ${ord(RANK_R.get(best.key))} of ${n} in reliability.</p></div>`;
  }

  // ---- findings ------------------------------------------------------------------------------------------------
  function findings() {
    const sol = REFS[0], luna = REFS[1], s1top = top(S1, o => o.score, 2);
    const maxOpen = Math.max(...M.filter(o => o.group === "open").map(o => o.latency.mean_ms));
    const math = D.analysis.find(a => a.domain === "math");
    const cards = [
      ["var(--wine)", `${f1(sol.score)} <small>/ ${f1(luna.score)}</small>`, "System Two still leads overall",
        `GPT-6 Sol and Luna outperform every System One model. The strongest System One models, ${esc(s1top[0].name)} and ${esc(s1top[1].name)} (${f1(s1top[0].score)}), trail Luna by about ten points.`],
      ["#2f7d75", `&lt; ${maxOpen < 300 ? "0.3" : f1(maxOpen / 1000)} s`, "System One models are fast",
        "Every open-weight System One model answers within 0.3 seconds per task on one H100 GPU, tens of times faster than GPT-6 Sol and Luna."],
      ["var(--knowledge)", "3 <small>kinds of domain</small>", "The gap depends on the domain",
        "System One models match GPT-6 Luna on direct semantic judgment, come close on fine-grained grounded decisions only with a larger backbone, and fall far behind on multi-step derivation."],
      ["var(--agent)", `${f1(math.thinking_never)} <small>→ ${f1(math.thinking_always)}</small>`, "Thinking helps where derivation is needed",
        "In Math, thinking lifts StartLux Auto from 50.8 to 92.5, close to Luna. In grounded-decision domains, a larger and newer backbone adds far more than thinking."],
    ];
    $("#findings-cards").innerHTML = cards.map(([c, big, h, p]) => `<article class="finding reveal" style="--accent:${c}"><div class="big">${big}</div><h3>${h}</h3><p>${p}</p></article>`).join("");
  }
  function gapChart() {
    const host = $("#gap-chart");
    const CATS = [["direct", "Direct semantic judgment", "System One models perform comparably to System Two."],
      ["grounded", "Fine-grained grounded decision", "Only the larger, more capable backbone comes close."],
      ["derivation", "Multi-step derivation", "Both System One models fall far behind."]];
    const GLI = "#c27a8b", SLX = "#6f93bf";
    const gx = v => 4 + (v + 50) / 65 * 92;        // gap scale -50..+15 in % of width
    const bx = v => 4 + v / 30 * 92, tx = v => 4 + (v + 5) / 50 * 92;
    const bar = (x0, x1, y, h, col) => `<rect x="${Math.min(x0, x1)}%" y="${y}" width="${Math.abs(x1 - x0)}%" height="${h}" rx="2" fill="${col}"/>`;
    const row = a => {
      const d = DOM[a.domain], z = gx(0);
      const ci = (c, y, col) => `<line x1="${gx(c[0])}%" x2="${gx(c[1])}%" y1="${y}" y2="${y}" stroke="${col}" stroke-width="1.3"/><line x1="${gx(c[0])}%" x2="${gx(c[0])}%" y1="${y - 3}" y2="${y + 3}" stroke="${col}"/><line x1="${gx(c[1])}%" x2="${gx(c[1])}%" y1="${y - 3}" y2="${y + 3}" stroke="${col}"/>`;
      const gap = `<svg aria-label="Gap to GPT-6 Luna: GLiDE ${f1(a.gap_glide)}, StartLux Instant ${f1(a.gap_startlux)}">
        <line x1="${z}%" x2="${z}%" y1="0" y2="34" stroke="#8b9198" stroke-width="1"/>
        ${bar(z, gx(a.gap_glide), 5, 10, GLI)}${ci(a.gap_glide_ci, 10, "#6e3b48")}
        ${bar(z, gx(a.gap_startlux), 19, 10, SLX)}${ci(a.gap_startlux_ci, 24, "#2f4f73")}
        <text x="${gx(Math.max(a.gap_glide_ci[1], 0)) + 1}%" y="13">${a.gap_glide > 0 ? "+" : ""}${f1(a.gap_glide)}</text>
        <text x="${gx(Math.max(a.gap_startlux_ci[1], 0)) + 1}%" y="28">${a.gap_startlux > 0 ? "+" : ""}${f1(a.gap_startlux)}</text></svg>`;
      const bb = `<svg aria-label="Backbone gain ${f1(a.backbone_gain)}"><line x1="${bx(0)}%" x2="${bx(0)}%" y1="4" y2="30" stroke="#8b9198"/>${bar(bx(0), bx(a.backbone_gain), 10, 14, "#5f9668")}<text x="${bx(a.backbone_gain) + 1.5}%" y="21">+${f1(a.backbone_gain)}</text></svg>`;
      const th = `<svg aria-label="Thinking gain ${f1(a.thinking_gain)}"><line x1="${tx(0)}%" x2="${tx(0)}%" y1="4" y2="30" stroke="#8b9198"/>${bar(tx(0), tx(a.thinking_gain), 10, 14, "#7a69a8")}<text x="${tx(Math.max(a.thinking_gain, 0)) + 1.5}%" y="21">${a.thinking_gain > 0 ? "+" : ""}${f1(a.thinking_gain)}</text></svg>`;
      return `<div class="gap-row" style="--fam:${FAM[d.family].color}"><span class="dn"><i></i>${esc(d.name.replace("Text-based ", ""))}</span>
        <div><span class="cell-label">Gap to GPT-6 Luna</span>${gap}</div><div><span class="cell-label">Backbone gain</span>${bb}</div><div><span class="cell-label">Thinking gain</span>${th}</div></div>`;
    };
    host.innerHTML = `<div class="legend" style="margin:0 0 10px"><span><i style="background:${GLI}"></i>GLiDE (27B)</span><span><i style="background:${SLX}"></i>StartLux Instant (4B)</span>
      <span><i class="line" style="background:#5f9668"></i>Backbone gain (smaller → 27B, mean of 4 families)</span><span><i class="line" style="background:#7a69a8"></i>Thinking gain (StartLux Auto)</span></div>
      <div class="gap-head"><span>Domain</span><span>Score difference from GPT-6 Luna</span><span>Backbone gain</span><span>Thinking gain</span></div>` +
      CATS.map(([id, h, sub]) => `<div class="gap-cat">${h} <span>${sub}</span></div>` + D.analysis.filter(a => a.category === id).map(row).join("")).join("");
  }

  // ---- benchmark -----------------------------------------------------------------------------------------------
  function families() {
    $("#families").innerHTML = D.families.map(f => {
      const ds = D.domains.filter(d => d.family === f.id), n = ds.reduce((t, d) => t + d.tasks, 0);
      return `<article class="family reveal" style="--fam:${f.color}"><div class="family-head">${icon(f.id)}<h3>${esc(f.name)}</h3><div class="cnt">${n.toLocaleString("en-US")} tasks · ${ds.length} domain${ds.length > 1 ? "s" : ""}</div></div>
        ${ds.map(d => `<div class="dom"><h4>${esc(d.name)}</h4><div class="dmeta">${d.tasks} tasks · ${d.tiers ? Object.values(d.tiers).join(" / ") + (d.tiers.V ? " (E/M/H/V)" : " (E/M/H)") : "untiered"} · ${esc(d.formats)}</div>
          ${d.tiers ? `<div class="tierbar" aria-hidden="true">${Object.values(d.tiers).map((v, i) => `<span class="t${d.tiers.V ? i : i + (i === 2 ? 1 : 0)}" style="flex:${v}"></span>`).join("")}</div>` : ""}
          <div class="src">${esc(d.sources.join(d.sources_by_tier ? " → " : ", "))}</div></div>`).join("")}</article>`;
    }).join("");
  }

  // ---- hero: the arena at a glance -----------------------------------------------------------------------------
  function heroBoard() {
    const host = $("#hero-board");
    const capV = m => m.score, relV = m => m.reliability && m.reliability.R;
    const col = (title, cls, list, val, rk, note, fmt) => `<div class="hb-col ${cls}">
      <div class="hb-head"><span class="hb-dot" aria-hidden="true"></span><h3>${title}</h3></div>
      <ol>${list.map(m => `<li><span class="hb-rk">${rk.get(m.key)}</span>${logo(m, 26)}<button type="button" class="hb-nm" data-model="${slug(m)}">${esc(m.name)}</button>
        <span class="hb-bar" aria-hidden="true"><span style="--w:${val(m).toFixed(1)}%"></span></span><span class="hb-v">${fmt(val(m))}</span></li>`).join("")}</ol>
      <p class="hb-note">${note}</p></div>`;
    host.innerHTML = `<div class="hb-top"><div><p class="hb-kicker">The arena at a glance</p><h2 class="hb-title">Top five of the 18 System One models</h2></div>
        <a class="link-btn" href="#leaderboard">Open the leaderboard ↓</a></div>
      <div class="hb-cols">
        ${col("Capability", "is-cap", top(S1, capV, 5), capV, RANK, `Leaderboard score, 0–100. System Two references: ${REFS.map(m => `${esc(m.name)} ${f1(m.score)}`).join(", ")}.`, f2)}
        ${col("Reliability", "is-rel", top(S1, relV, 5), relV, RANK_R, "R = √(S·N) as a percentage, from order stability S and null discrimination N.", f1)}
      </div>`;
    requestAnimationFrame(() => setTimeout(() => host.classList.add("on"), 150));
  }

  // ---- highlights: four native illustrations ------------------------------------------------------------------
  const R_INK = "#262a2e";
  const bot = (x, y, w, kind = "#a9c3dd", rows = ROBOT.smile) => robot(kind, rows).replace("<svg ", `<svg x="${x}" y="${y}" width="${w}" height="${w * 16 / 14}" `);
  const tickP = (x, y, s = 10, c = "#4b9a72") => `<path d="M${x - .5 * s} ${y}L${x - .12 * s} ${y + .4 * s}L${x + .55 * s} ${y - .45 * s}" fill="none" stroke="${c}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`;
  const crossP = (x, y, s = 9) => `<path d="M${x - s / 2} ${y - s / 2}L${x + s / 2} ${y + s / 2}M${x + s / 2} ${y - s / 2}L${x - s / 2} ${y + s / 2}" stroke="#b0566f" stroke-width="2.4" stroke-linecap="round"/>`;
  const blk = (x, y, lab, { w = 20, fill = "#fff", dash = false, faint = false } = {}) => `<g><rect x="${x + 1.2}" y="${y + 1.2}" width="${w}" height="20" rx="4" fill="${dash ? "none" : R_INK}"/>
    <rect x="${x}" y="${y}" width="${w}" height="20" rx="4" fill="${dash ? "none" : fill}" stroke="${faint ? "#8b9198" : R_INK}" stroke-width="1.6" ${dash ? 'stroke-dasharray="3 2.5"' : ""}/>
    <text x="${x + w / 2}" y="${y + 14.5}" text-anchor="middle" font-family="Pagella, Palatino, serif" font-weight="700" font-size="13" fill="${faint ? "#b9bec4" : R_INK}">${lab}</text></g>`;
  const star = (x, y, r, on) => { let p = ""; for (let k = 0; k < 10; k++) { const a = (-90 + 36 * k) * Math.PI / 180, rr = k % 2 ? r * .45 : r; p += `${k ? "L" : "M"}${(x + rr * Math.cos(a)).toFixed(1)} ${(y + rr * Math.sin(a)).toFixed(1)}`; } return `<path d="${p}Z" fill="${on ? "#c0904a" : "#fff"}" stroke="${on ? "#8a6a2a" : "#aab0b7"}" stroke-width=".9"/>`; };
  const T = (x, y, s, opts = "") => `<text x="${x}" y="${y}" font-family="var(--sans)" font-size="10.5" fill="#4a535c" ${opts}>${s}</text>`;
  const ILLUS = {
    prov: () => {
      const card = (x, title, review, stars, ok) => `<g><text x="${x + 66}" y="14" text-anchor="middle" font-size="10.5" font-weight="700" fill="${ok ? "#796f50" : R_INK}">${title}</text>
        <rect x="${x}" y="24" width="132" height="66" rx="8" fill="#fff" stroke="#4a535c" stroke-width="1.3"/>
        <circle cx="${x + 13}" cy="37" r="5.5" fill="#fff" stroke="#4a535c"/><circle cx="${x + 13}" cy="35.4" r="1.8" fill="#4a535c"/>
        <text x="${x + 24}" y="40.5" font-size="9.5" font-weight="700" fill="#796f50">Customer review</text>
        <text x="${x + 8}" y="58" font-size="9" font-style="italic" fill="${R_INK}" textLength="${review.length > 25 ? 116 : ""}" lengthAdjust="spacingAndGlyphs">${review}</text>
        ${[0, 1, 2, 3, 4].map(k => star(x + 14 + k * 14, 76, 5.4, k < stars)).join("")}
        <circle cx="${x + 130}" cy="26" r="10" fill="${ok ? "#4b9a72" : "#b0566f"}" stroke="#fff" stroke-width="2"/>
        ${ok ? `<path d="M${x + 125} 26l3.5 3.5 6-7" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>` : `<text x="${x + 130}" y="30.5" text-anchor="middle" font-size="13" font-weight="700" fill="#fff">?</text>`}
        <text x="${x + 66}" y="110" text-anchor="middle" font-size="10" font-style="italic" fill="#646a70">${ok ? "Grounded label" : "Ambiguous label"}</text></g>`;
      return `<svg viewBox="0 0 300 118" aria-hidden="true">${card(4, "Other benchmarks", "“Bought it for my parents”", 5, false)}<line x1="150" y1="6" x2="150" y2="114" stroke="#a3a982" stroke-dasharray="4 3"/>${card(160, "SO-Arena", "“Fake product. Don’t buy!”", 1, true)}</svg>`;
    },
    diff: () => {
      const s0 = 84;
      return `<svg viewBox="0 0 300 118" aria-hidden="true">
        <text x="66" y="14" text-anchor="middle" font-size="10.5" font-weight="700" fill="${R_INK}">Other benchmarks</text>
        <line x1="14" y1="70" x2="118" y2="70" stroke="#61847a" stroke-width="2.2"/>
        ${[0, 1, 2].map(k => bot(22 + k * 34, 44, 20, ["#a9c3dd", "#e6c79a", "#e3b3bb"][k]) + tickP(32 + k * 34, 86, 10)).join("")}
        <text x="66" y="110" text-anchor="middle" font-size="10" font-style="italic" fill="#646a70">Uniform difficulty</text>
        <line x1="140" y1="6" x2="140" y2="114" stroke="#86b3b0" stroke-dasharray="4 3"/>
        <text x="222" y="14" text-anchor="middle" font-size="10.5" font-weight="700" fill="#61847a">SO-Arena</text>
        <path d="M150 ${s0}H196V${s0 - 20}H242V${s0 - 40}H294" fill="none" stroke="#61847a" stroke-width="2.2"/>
        ${bot(163, s0 - 25, 20, "#a9c3dd")}${bot(209, s0 - 45, 20, "#e6c79a")}${bot(258, s0 - 65, 20, "#e3b3bb")}
        <text x="173" y="${s0 + 12}" text-anchor="middle" font-size="9.5" font-weight="700" fill="${R_INK}">Easy</text>
        <text x="219" y="${s0 - 8}" text-anchor="middle" font-size="9.5" font-weight="700" fill="${R_INK}">Medium</text>
        <text x="268" y="${s0 - 28}" text-anchor="middle" font-size="9.5" font-weight="700" fill="${R_INK}">Hard</text>
        <text x="222" y="110" text-anchor="middle" font-size="10" font-style="italic" fill="#646a70">Stratified difficulty</text></svg>`;
    },
    inter: () => `<svg viewBox="0 0 276 112" aria-hidden="true">
        <rect x="6" y="22" width="232" height="70" rx="9" fill="#fcf6f3" stroke="#8f6556" stroke-width="1.3" stroke-dasharray="6 4"/>
        <rect x="104" y="15" width="40" height="14" fill="#f6ebe6"/><text x="124" y="26" text-anchor="middle" font-size="10" font-style="italic" fill="#8f6556">Sandbox</text>
        <rect x="14" y="34" width="62" height="44" rx="6" fill="#fff" stroke="#4a535c" stroke-width="1.2"/><rect x="14" y="34" width="62" height="10" rx="5" fill="#eceee6"/>
        ${[0, 1, 2].map(k => `<circle cx="${21 + 6 * k}" cy="39" r="2" fill="${["#c98a8a", "#d9bf7a", "#8fb89a"][k]}"/>`).join("")}
        ${blk(18, 50, "A", { w: 16 })}${blk(37, 50, "B", { w: 16 })}${blk(56, 50, "C", { w: 16 })}
        <path d="M80 56h10" stroke="#8f6556" stroke-width="2"/><path d="M90 52l5 4-5 4z" fill="#8f6556"/>
        ${bot(98, 42, 22)}
        ${["click", "type", "back"].map((s, k) => `<rect x="126" y="${32 + k * 17}" width="38" height="14" rx="7" fill="${k === 1 ? "#f1e2c4" : "#fff"}" stroke="${R_INK}" stroke-width="1.3"/><text x="145" y="${42.5 + k * 17}" text-anchor="middle" font-size="9.5" font-weight="700" fill="${R_INK}">${s}</text>`).join("")}
        <path d="M168 56h10" stroke="#8f6556" stroke-width="2"/><path d="M178 52l5 4-5 4z" fill="#8f6556"/>
        <rect x="188" y="40" width="44" height="32" rx="5" fill="#fff" stroke="#4a535c" stroke-width="1.2"/><rect x="194" y="58" width="22" height="6" rx="2" fill="#e6c79a" stroke="${R_INK}" stroke-width=".8"/>
        <path d="M240 56h8" stroke="#8f6556" stroke-width="2"/>
        ${tickP(254, 44, 9)}${tickP(266, 44, 9)}${crossP(260, 60, 7)}
        <path d="M70 92C70 104 200 104 210 92" fill="none" stroke="#8f6556" stroke-width="1.4"/><path d="M66 94l4-6 4 6z" fill="#8f6556"/>
        <text x="138" y="109" text-anchor="middle" font-size="10" font-style="italic" fill="#646a70">Decide, act, observe, repeat</text></svg>`,
    rel: () => `<svg viewBox="0 0 276 112" aria-hidden="true">
        <text x="8" y="22" font-size="10.5" font-weight="700" fill="#655a7a">Options reordered</text>
        ${blk(8, 30, "A")}${blk(31, 30, "B", { fill: "#f1e2c4" })}${blk(54, 30, "C")}
        <path d="M82 37h18M96 33l4 4-4 4M100 45H82M86 41l-4 4 4 4" fill="none" stroke="#4a535c" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
        ${blk(108, 30, "C")}${blk(131, 30, "A")}${blk(154, 27, "B", { fill: "#f1e2c4" })}
        ${tickP(190, 40, 11)}<text x="204" y="44" font-size="10.5" fill="#3d8a64" font-weight="700">same choice</text>
        <text x="8" y="74" font-size="10.5" font-weight="700" fill="#655a7a">Correct option missing</text>
        ${blk(8, 82, "A")}${blk(31, 82, "B", { dash: true, faint: true })}${blk(54, 82, "C")}${blk(77, 79, "Null", { w: 38, fill: "#f1e2c4" })}
        ${tickP(130, 92, 11)}<text x="144" y="96" font-size="10.5" fill="#3d8a64" font-weight="700">no valid option</text></svg>`,
  };
  function highlights() {
    const items = [
      ["prov", "Verified labels", "Tasks come from traceable sources. Every reference label is checked by hand against the information the model sees, and evaluation references are kept apart from model inputs."],
      ["diff", "Fine-grained difficulty", "Nine domains are split into easy, medium and hard tiers by domain-specific criteria. The leaderboard weights the hardest tier, where differences between models show most."],
      ["inter", "Interactive sandboxes", "In web and tool environments, models reach goals through sequences of decisions, and they also judge recorded executions, including ones whose final states hide different intermediate steps."],
      ["rel", "Decision reliability", "Two tests go beyond accuracy: does a model keep its answer when the options are reordered, and does it recognize that no option is correct when the right one is missing?"],
    ];
    $("#highlights").innerHTML = items.map(([id, h, p]) => `<article class="hl hl-${id} reveal"><div class="hl-art">${ILLUS[id]()}</div><div><h3>${h}</h3><p>${p}</p></div></article>`).join("");
  }

  // ---- ladder: all 21 models on one score scale, in three lanes ------------------------------------------------
  function ladderChart() {
    const host = $("#chart-ladder");
    const W0 = Math.max(320, host.clientWidth || 900), narrow = W0 < 640;
    const lanes = [["Open weights, ≤ 4B", m => (m.group === "open" || m.group === "auto") && parseFloat(m.size) <= 4],
      ["Closed APIs", m => closed(m)], ["Open weights, ≥ 9B", m => m.group === "open" && parseFloat(m.size) >= 9]];
    const H = narrow ? 760 : 620, m = { l: 40, r: 10, t: 40, b: 14 };
    const { svg, W } = frame(host, { ratio: H / W0, minH: H, maxH: H });
    const ys = v => m.t + (90 - v) / (90 - 28) * (H - m.t - m.b);
    const g = S("g", { class: "grid" }, svg), ax = S("g", { class: "ax" }, svg);
    for (let v = 30; v <= 90; v += 10) { S("line", { x1: m.l, x2: W - m.r, y1: ys(v), y2: ys(v) }, g); S("text", { x: m.l - 8, y: ys(v) + 4, "text-anchor": "end" }, ax).textContent = v; }
    const laneW = (W - m.l - m.r) / 3;
    lanes.forEach(([name, test], li) => {
      const x0 = m.l + li * laneW, cx = x0 + laneW / 2;
      S("rect", { x: x0 + 4, y: m.t - 2, width: laneW - 8, height: H - m.t - m.b + 2, rx: 12, fill: li === 1 ? "rgba(212,162,78,.07)" : "rgba(79,133,185,.05)" }, svg);
      const hb = S("g", {}, svg);
      S("rect", { x: cx - 74, y: 6, width: 148, height: 22, rx: 11, fill: li === 1 ? "#a8813b" : "#4f6f93" }, hb);
      S("text", { x: cx, y: 21, "text-anchor": "middle", fill: "#fff", "font-size": 12, "font-weight": 700 }, hb).textContent = name;
      const items = M.filter(test).sort((a, b) => b.score - a.score);
      const pillH = 26, placed = [], fs = narrow ? 11 : 12;
      // a short scale tick at each model's exact score, then the badge beside it
      for (const o of items) {
        const y = ys(o.score);
        const a = S("g", { class: "pt", tabindex: 0, role: "button", "aria-label": `${o.name}: score ${f2(o.score)}` }, svg);
        const nm = S("text", { "font-size": fs, fill: "#23272b", "font-weight": 600 }, a);
        nm.textContent = narrow && o.name.length > 12 ? o.name.slice(0, 11) + "…" : o.name;
        const sv = narrow ? null : S("text", { "font-size": fs, fill: "#626a72", "text-anchor": "end" }, a);
        if (sv) sv.textContent = f1(o.score);
        const w = 29 + nm.getComputedTextLength() + (sv ? 10 + sv.getComputedTextLength() : 0) + 11;
        // two columns per lane (one when narrow): left column ends at the lane centre, right column starts there
        const cols = narrow ? [cx - w / 2] : [cx + 5, cx - 5 - w];
        let box = null;
        for (let shift = 0; !box && shift < 400; shift += 3) {
          for (const x0 of cols) {
            const b = { x0, x1: x0 + w, y0: y - pillH / 2 + shift, y1: y + pillH / 2 + shift };
            if (!placed.some(p => b.x0 < p.x1 + 3 && p.x0 < b.x1 + 3 && b.y0 < p.y1 + 2 && p.y0 < b.y1 + 2)) { box = b; break; }
          }
        }
        placed.push(box);
        const by = (box.y0 + box.y1) / 2, onRight = box.x0 >= cx;
        S("line", { x1: cx - 6, x2: cx + 6, y1: y, y2: y, stroke: "#4a535c", "stroke-width": 1.4 }, a);
        if (Math.abs(by - y) > 1.5) S("path", { d: `M${cx} ${y}V${by}`, stroke: "#8a8f86", "stroke-width": 1, fill: "none" }, a);
        a.insertBefore(S("rect", { x: box.x0, y: box.y0, width: w, height: pillH, rx: 13, fill: "#fff", stroke: o.group === "s2" ? "#c07a45" : "#d6d1c3",
          "stroke-width": o.group === "s2" ? 1.6 : 1, "stroke-dasharray": o.group === "s2" ? "4 3" : null }), nm);
        nm.setAttribute("x", box.x0 + 29); nm.setAttribute("y", box.y0 + 17.5);
        if (sv) { sv.setAttribute("x", box.x1 - 10); sv.setAttribute("y", box.y0 + 17.5); }
        const fo = S("foreignObject", { x: box.x0 + 2, y: box.y0 + 2, width: 22, height: 22 }, a);
        fo.innerHTML = `<div xmlns="http://www.w3.org/1999/xhtml">${logo(o, 22)}</div>`;
        if (!onRight && !narrow) a.dataset.side = "left";
        bindTip(a, () => modelTip(o));
        a.addEventListener("click", () => openModel(o));
        a.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openModel(o); } });
      }
    });
    S("text", { class: "axis-title", x: 12, y: (m.t + H - m.b) / 2, transform: `rotate(-90 12 ${(m.t + H - m.b) / 2})`, "text-anchor": "middle" }, svg).textContent = "Leaderboard score";
  }

  // ---- how SO-Arena is built ------------------------------------------------------------------------------------
  function pipeline() {
    const fams = D.families.map(f => {
      const n = D.domains.filter(d => d.family === f.id).reduce((t, d) => t + d.tasks, 0);
      return `<li style="--fam:${f.color}">${icon(f.id)}<span><b>${esc(f.name.split(" ")[0])}</b>${n}</span></li>`;
    }).join("");
    const steps = [
      ["Sources and quality control", "40", "established sources",
        `<p>Tasks are drawn from public datasets and environments with traceable origins, such as GoEmotions, MATH500, GPQA Diamond, Mind2Web, BFCL and ToolSandbox.</p>
         <p class="pl-flow"><span class="pl-chip">candidate task</span>→<span class="pl-chip">review by people, with an LLM</span>→<span class="pl-chip ok">kept</span><span class="pl-chip no">dropped</span></p>
         <p>A task stays only if its reference label is supported by the information the model sees.</p>`],
      ["Organization and formulation", "11", "domains in five families",
        `<ul class="pl-fams">${fams}</ul>
         <p class="pl-flow"><span class="pl-chip">Easy</span>→<span class="pl-chip">Medium</span>→<span class="pl-chip">Hard</span></p>
         <div class="pl-settings"><div><b>${D.totals.static.toLocaleString("en-US")}</b> static tasks<br><code>choice</code> · <code>noul</code> · <code>score</code></div>
         <div><b>${(D.totals.tools + D.totals.web).toLocaleString("en-US")}</b> environment-based tasks<br>web single step, web multi-step, interactive tool use</div></div>`],
      ["Evaluation", "C · R", "capability and reliability",
        `<p><b>Capability C:</b> the model receives a state and a question, and its decision is scored against the verified label, domain by domain.</p>
         <p><b>Reliability R:</b> the same items with the options reordered, and with the correct option removed.</p>
         <p class="pl-flow"><span class="pl-chip">A B C → C A B</span><span class="pl-chip">A ▢ C → Null</span></p>`],
    ];
    $("#pipeline").innerHTML = steps.map(([h, big, sub, body], i) => `<li class="pl-step reveal"><div class="pl-num">${i + 1}</div><h3>${h}</h3>
      <div class="pl-big"><b>${big}</b><span>${sub}</span></div>${body}</li>`).join("");
  }

  // ---- page wiring ---------------------------------------------------------------------------------------------
  function wire() {
    document.addEventListener("click", e => {
      const dm = e.target.closest("[data-domain]"); if (dm) { openDomain(dm.dataset.domain); return; }
      const md = e.target.closest("[data-model]:not(tr)"); if (md) { openModel(BYSLUG[md.dataset.model]); return; }
      const go = e.target.closest("[data-go]"); if (go) { closeSheet(); document.getElementById(go.dataset.go).scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" }); return; }
      const tb = e.target.closest("[data-tab]"); if (tb) { const l = $('[data-tabs="lb"]'); l._select(tb.dataset.tab); return; }
      const sc = e.target.closest("[data-scroll]"); if (sc) { $(sc.dataset.scroll).scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" }); }
    });
    // mobile menu
    const mb = $(".menu-btn"), mn = $("#mobile-nav");
    mb.addEventListener("click", () => { const o = mn.hidden; mn.hidden = !o; mb.setAttribute("aria-expanded", o); });
    mn.addEventListener("click", e => { if (e.target.closest("a")) { mn.hidden = true; mb.setAttribute("aria-expanded", false); } });
    // active section in the nav
    if ("IntersectionObserver" in window) {
      const links = $$(".nav a"), map = new Map(links.map(a => [a.getAttribute("href").slice(1), a]));
      const io = new IntersectionObserver(es => es.forEach(e => {
        const a = map.get(e.target.id); if (a && e.isIntersecting) { links.forEach(o => o.classList.remove("active")); a.classList.add("active"); }
      }), { rootMargin: "-45% 0px -50% 0px" });
      map.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
      const rv = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); rv.unobserve(e.target); } }), { threshold: .12 });
      $$(".reveal").forEach(n => rv.observe(n));
    } else $$(".reveal").forEach(n => n.classList.add("in"));
    setTimeout(() => $$(".reveal:not(.in)").forEach(n => { if (n.getBoundingClientRect().top < innerHeight * 1.5) n.classList.add("in"); }), 2500);
    // copy BibTeX
    $("#copy-bib").addEventListener("click", async () => {
      const b = $("#copy-bib");
      try { await navigator.clipboard.writeText($("#bib").textContent); b.textContent = "Copied"; }
      catch (_) { const r = document.createRange(); r.selectNodeContents($("#bib")); const s = getSelection(); s.removeAllRanges(); s.addRange(r); b.textContent = "Selected"; }
      setTimeout(() => { b.textContent = "Copy"; }, 1600);
    });
    // reliability chart mode
    $("#rel-mode").addEventListener("click", e => {
      const b = e.target.closest("[data-mode]"); if (!b) return;
      relMode = b.dataset.mode; $$("#rel-mode button").forEach(o => o.setAttribute("aria-pressed", o === b)); relChart();
    });
    // re-render charts on resize
    let rt; addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(renderCharts, 160); });
  }
  function renderCharts() {
    if (!$("#panel-ladder").hidden) ladderChart();
    if (!$("#panel-speed").hidden) speedChart();
    if (!$("#panel-rel").hidden) relChart();
    if (!$("#panel-tiers").hidden) tierChart($("#chart-tiers"), tierDomain, $("#legend-tiers"));
  }

  function init() {
    wordmark(); heroStats(); heroBoard(); highlights(); arena(); tableControls(); table(); tierControls(); pipeline();
    setupTabs($('[data-tabs="lb"]'), id => { if (id === "tab-ladder") ladderChart(); });
    setupTabs($('[data-tabs="ex"]'), () => renderCharts());
    relDemo(); relFacts(); findings(); gapChart(); families(); wire();
    renderCharts();
    $$(".reveal").forEach(n => { if (!("IntersectionObserver" in window)) n.classList.add("in"); });
    const q = new URLSearchParams(location.search);
    if (q.get("domain") && DOM[q.get("domain")]) openDomain(q.get("domain"));
    else if (q.get("model") && BYSLUG[q.get("model")]) openModel(BYSLUG[q.get("model")]);
    window.SOA = { openDomain, openModel: k => openModel(BYSLUG[k] || M.find(m => m.key === k)), selectTab: (list, id) => $(`[data-tabs="${list}"]`)._select(id), setRelMode: mode => { relMode = mode; $$("#rel-mode button").forEach(o => o.setAttribute("aria-pressed", o.dataset.mode === mode)); relChart(); } };
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
