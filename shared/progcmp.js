/*! © 2026 Award Insights · awardinsights.org · All rights reserved. */
/* Program pages (/programs/…): compare an institution with the program's recipients (owner, 2026-11-27, as the tools'
   By program). Pick an institution and each row of "Who received its awards" shows its group at full strength, the
   others faded, with a line saying which group it is in and what share of the recipients are in it. No match score.
   The institutions' groups come from /programs/prof.json (scripts/build_programs.py), fetched when someone types;
   the program's own recipients (award counts in its three-year window) sit in the page as #pgot. */
(() => {
"use strict";
const box = document.querySelector(".pcmp"), gotEl = document.getElementById("pgot");
if (!box || !gotEl || !window.fetch) return;
const q = document.getElementById("pcq"), res = document.getElementById("pcres"), me = document.getElementById("pcme");
const card = box.closest(".card"), got = JSON.parse(gotEl.textContent);
const N = +box.dataset.n, FY = box.dataset.fy, NOUN = box.dataset.noun;
let D = null, NORM = null, loading = null;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const norm = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/&/g, " and ").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
const load = () => loading || (loading = fetch(box.dataset.prof).then(r => r.json()).then(j => {
  D = j; NORM = {}; for (const u in D.u) NORM[u] = norm(D.u[u][0]); return D; }));
const RD = 2 + 4;   // the R&D expenditure row, used to put larger research institutions first in the results
box.hidden = false;

function search() {
  const t = norm(q.value);
  if (t.length < 2) { res.hidden = true; res.innerHTML = ""; return; }
  load().then(() => {
    if (norm(q.value) !== t) return;
    const w = t.split(" "), L = [];
    for (const u in D.u) { const n = NORM[u]; if (w.every(x => n.includes(x))) L.push(u); }
    const rd = u => { const v = D.u[u][RD]; return v == null ? 9 : v; };
    L.sort((a, b) => ((got[b] ? 1 : 0) - (got[a] ? 1 : 0)) || (rd(a) - rd(b)) || (NORM[b].startsWith(t) - NORM[a].startsWith(t)) || (D.u[a][0].length - D.u[b][0].length));
    res.innerHTML = L.slice(0, 8).map(u => { const r = D.u[u];
      return `<button type="button" data-u="${esc(u)}"><span class="rn">${esc(r[0])}</span><span class="rs">${esc([r[1], D.sec[0][r[2]]].filter(Boolean).join(" · "))}</span></button>`; }).join("")
      || '<p class="none">No institution by that name</p>';
    res.hidden = false;
  });
}

function clear() {
  card.querySelectorAll(".cmp,.me").forEach(e => e.classList.remove("cmp", "me"));
  card.querySelectorAll(".pcr").forEach(e => { e.hidden = true; e.innerHTML = ""; });
  document.querySelectorAll(".ag li.me").forEach(e => e.classList.remove("me"));
  me.hidden = true; me.innerHTML = ""; q.parentElement.hidden = false;
  if (location.hash.startsWith("#c=")) history.replaceState(null, "", location.pathname + location.search);
}

function pick(u) {
  load().then(() => {
    const r = D.u[u]; if (!r) return;
    clear(); res.hidden = true; q.value = ""; q.parentElement.hidden = true;
    const nm = esc(r[0]), k = got[u] || 0;
    me.innerHTML = `<span class="pcchip">${nm}<button type="button" aria-label="Clear the comparison" title="Clear">✕</button></span> `
      + (k ? `received <b>${k.toLocaleString()}</b> of these ${N.toLocaleString()} ${esc(NOUN)} in ${esc(FY)}.` : `received none of these ${esc(NOUN)} in ${esc(FY)}.`)
      + " Its own group is shown at full strength in each row below; the others are faded.";
    me.hidden = false;
    card.querySelectorAll("tr[data-s]").forEach(tr => {
      const line = tr.querySelector(".pcr"); tr.classList.add("cmp");
      if (tr.dataset.s === "m") {
        const have = D.flags.filter((_, i) => r[r.length - 1] & (1 << i));
        const bits = have.map((l, i) => { const el = tr.querySelector(`.pf[data-v="${CSS.escape(l)}"]`);
          if (el) el.classList.add("me"); return `<b>${esc(l)}</b> (${el ? el.querySelector("b").textContent : "none"}${i ? "" : " of these recipients"})`; });
        line.innerHTML = have.length ? `${nm}: ${bits.join(" · ")}` : `${nm}: none of these`;
      } else {
        const s = +tr.dataset.s, gi = r[2 + s], v = gi == null ? null : D.sec[s][gi];
        const bar = tr.querySelector(".pbar"); if (bar) bar.classList.add("cmp");
        let key = null;
        tr.querySelectorAll("[data-v]").forEach(e => { if (v != null && e.dataset.v === v) { e.classList.add("me"); if (e.classList.contains("pk")) key = e; } });
        line.innerHTML = v == null ? `${nm}: not in the profile data`
          : key ? `${nm}: <b>${esc(v)}</b> · ${key.querySelector("b").textContent} of these recipients are in this group`
          : `${nm}: <b>${esc(v)}</b> · none of these recipients are in this group`;
      }
      line.hidden = false;
    });
    document.querySelectorAll(`.ag li[data-u="${CSS.escape(u)}"]`).forEach(e => e.classList.add("me"));
    history.replaceState(null, "", "#c=" + encodeURIComponent(u));
  });
}

q.addEventListener("input", search);
q.addEventListener("focus", () => { load(); if (q.value) search(); });
q.addEventListener("keydown", e => {
  if (e.key === "Enter") { const b = res.querySelector("button"); if (b) { e.preventDefault(); pick(b.dataset.u); } }
  else if (e.key === "Escape") { res.hidden = true; }
  else if (e.key === "ArrowDown") { const b = res.querySelector("button"); if (b) { e.preventDefault(); b.focus(); } }
});
res.addEventListener("keydown", e => {
  const b = e.target.closest("button"); if (!b) return;
  if (e.key === "ArrowDown" && b.nextElementSibling) { e.preventDefault(); b.nextElementSibling.focus(); }
  else if (e.key === "ArrowUp") { e.preventDefault(); (b.previousElementSibling || q).focus(); }
  else if (e.key === "Escape") { res.hidden = true; q.focus(); }
});
res.addEventListener("click", e => { const b = e.target.closest("button[data-u]"); if (b) pick(b.dataset.u); });
me.addEventListener("click", e => { if (e.target.closest("button")) { clear(); q.focus(); } });
document.addEventListener("click", e => { if (!box.contains(e.target)) res.hidden = true; });
const h = location.hash.match(/^#c=([^&]+)/); if (h) pick(decodeURIComponent(h[1]));
})();
