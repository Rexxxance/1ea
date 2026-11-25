// Edit mode: Shift + E. Drag blocks, nudge with arrows, download layout.json and drop it in this folder.
(function () {
  const KEY = "1ea-layout-v2";
  const sel = ".scr .h, .scr .big, .scr .p, .scr .dia, .scr .beat4, .scr .fact, .rig .stage, .rig .panel";
  const els = [...document.querySelectorAll(sel)];
  els.forEach(e => { const sec = e.closest("section"); const si = [...document.querySelectorAll("section")].indexOf(sec); const k = [...sec.querySelectorAll(sel)].indexOf(e); e.dataset.ed = si + "-" + k; });
  let L = {};
  const apply = () => els.forEach(e => { const v = L[e.dataset.ed]; e.style.translate = v ? `${v[0]}px ${v[1]}px` : ""; });
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(L)); } catch (e) { } };
  // load: browser copy first, otherwise layout.json in the folder
  try { const s = localStorage.getItem(KEY); if (s) { L = JSON.parse(s); apply(); } } catch (e) { }
  if (!Object.keys(L).length) fetch("layout.json").then(r => r.ok ? r.json() : {}).then(j => { L = j || {}; apply(); }).catch(() => { });

  let on = false, cur = null, drag = null;
  function toggle() {
    on = !on; document.body.classList.toggle("editing", on);
    els.forEach(e => e.classList.toggle("ed", on));
    if (!on && cur) { cur.classList.remove("sel"); cur = null; }
  }
  addEventListener("keydown", e => {
    if (e.shiftKey && (e.key === "E" || e.key === "e")) { e.preventDefault(); toggle(); return; }
    if (!on || !cur || !e.key.startsWith("Arrow")) return;
    e.preventDefault(); const st = e.shiftKey ? 10 : 1, id = cur.dataset.ed, v = L[id] || [0, 0];
    if (e.key === "ArrowLeft") v[0] -= st; if (e.key === "ArrowRight") v[0] += st; if (e.key === "ArrowUp") v[1] -= st; if (e.key === "ArrowDown") v[1] += st;
    L[id] = v; apply(); save();
  }, true);
  addEventListener("pointerdown", e => {
    if (!on) return; const t = e.target.closest(".ed"); if (!t) return;
    e.preventDefault(); e.stopPropagation();
    if (cur) cur.classList.remove("sel"); cur = t; t.classList.add("sel");
    const v = L[t.dataset.ed] || [0, 0]; drag = { x: e.clientX, y: e.clientY, v0: [...v], id: t.dataset.ed };
  }, true);
  addEventListener("pointermove", e => { if (!drag) return; L[drag.id] = [Math.round(drag.v0[0] + e.clientX - drag.x), Math.round(drag.v0[1] + e.clientY - drag.y)]; apply(); });
  addEventListener("pointerup", () => { if (drag) { drag = null; save(); } });
  document.getElementById("edExport").onclick = () => {
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(L, null, 1)], { type: "application/json" })); a.download = "layout.json"; a.click();
  };
  document.getElementById("edReset").onclick = () => { L = {}; apply(); save(); };
})();

// Footer: a liquid field of dots, sparse at the top, dense at the bottom, yellow under the cursor
(function () {
  const cv = document.getElementById("dotfield"); if (!cv) return;
  const ctx = cv.getContext("2d"); let W, H, D = 1, pts = [], mx = -999, my = -999, heat;
  function build() {
    D = Math.min(devicePixelRatio || 1, 2); W = cv.clientWidth; H = cv.clientHeight; cv.width = W * D; cv.height = H * D; ctx.setTransform(D, 0, 0, D, 0, 0);
    const S = Math.max(18, W / 64); pts = [];
    for (let y = S / 2; y < H - 70; y += S) for (let x = S / 2; x < W; x += S) {
      const depth = y / (H - 70);                       // 0 at the top, 1 at the bottom
      const keep = Math.pow(depth, 1.6) + 0.04;
      if (Math.random() < keep) pts.push({ x, y, depth, s: S, seed: Math.random() * 6.28 });
    }
    heat = new Float32Array(pts.length);
  }
  new ResizeObserver(build).observe(cv);
  cv.parentElement.addEventListener("pointermove", e => { const r = cv.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; });
  cv.parentElement.addEventListener("pointerleave", () => { mx = my = -999; });
  let vis = false; new IntersectionObserver(es => vis = es[0].isIntersecting).observe(cv);
  function tick(now) {
    requestAnimationFrame(tick); if (!vis || !pts.length) return;
    const t = now / 1000; ctx.clearRect(0, 0, W, H);
    const grey = new Path2D(), yel = new Path2D();
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const wx = Math.sin(t * 1.1 + p.y * 0.018 + p.seed * 0.3) * p.s * 0.22 * (1.2 - p.depth);
      const wy = Math.cos(t * 0.9 + p.x * 0.012) * p.s * 0.18;
      let x = p.x + wx, y = p.y + wy;
      const dx = x - mx, dy = y - my, d = Math.hypot(dx, dy), R = 150;
      if (d < R) { const f = 1 - d / R; heat[i] = Math.max(heat[i], f); x += dx / (d || 1) * f * 18; y += dy / (d || 1) * f * 18; }
      heat[i] *= 0.965;
      const r = p.s * (0.14 + 0.2 * p.depth) * (1 + heat[i] * 0.9) * (0.85 + 0.15 * Math.sin(t * 2 + p.seed));
      (heat[i] > 0.12 ? yel : grey).moveTo(x + r, y); (heat[i] > 0.12 ? yel : grey).arc(x, y, r, 0, 6.283);
    }
    ctx.fillStyle = "#4a4546"; ctx.fill(grey); ctx.fillStyle = "#F3EF12"; ctx.fill(yel);
  }
  requestAnimationFrame(tick);
})();

// Seam between the dark Sources page and the yellow closing page: rows of big dots that grow into yellow
(function () {
  const cv = document.getElementById("seam"); if (!cv) return;
  const ctx = cv.getContext("2d"), sec = cv.parentElement; let W, H, D, S, cols, rows = 7, mx = -999, my = -999, heat;
  function build() { D = Math.min(devicePixelRatio || 1, 2); W = cv.clientWidth; H = cv.clientHeight; cv.width = W * D; cv.height = H * D; ctx.setTransform(D, 0, 0, D, 0, 0); S = H / rows; cols = Math.ceil(W / S) + 2; heat = new Float32Array(cols * rows); }
  new ResizeObserver(build).observe(cv);
  addEventListener("pointermove", e => { const r = cv.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; });
  let vis = false; new IntersectionObserver(es => vis = es[0].isIntersecting).observe(cv);
  function tick(now) {
    requestAnimationFrame(tick); if (!vis) return;
    const t = now / 1000, r0 = sec.getBoundingClientRect();
    const grow = Math.min(1, Math.max(0, (innerHeight - r0.top) / (innerHeight * 0.9)));   // dots swell as the page arrives
    ctx.clearRect(0, 0, W, H); ctx.fillStyle = "#231F20"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#F3EF12"; const path = new Path2D();
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const i = r * cols + c, off = (r % 2) * S / 2;
      const x = c * S - S / 2 + off, y = r * S + S / 2;
      const d = Math.hypot(x - mx, y - my); if (d < 220) heat[i] = Math.max(heat[i], 1 - d / 220); heat[i] *= 0.95;
      const depth = (r + 1) / rows;                                   // 0 near black, 1 at the yellow
      const wave = 0.06 * Math.sin(t * 2.2 + c * 0.45 + r * 0.8);
      let rad = S * (0.06 + 0.66 * Math.pow(depth, 1.5) * (0.55 + 0.45 * grow) + wave * depth + heat[i] * 0.28);
      rad = Math.max(0, rad);
      path.moveTo(x + rad, y); path.arc(x, y, rad, 0, 6.283);
    }
    ctx.fill(path); ctx.fillRect(0, (rows - 0.5) * S, W, H);
  }
  requestAnimationFrame(tick);
})();
