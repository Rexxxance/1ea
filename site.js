// 1e&A site
(function () {
  const Y = "#F3EF12", K = "#231F20", W = "#ECEAE2", F = "#4d4849";
  const S = window.SFX, Dr = S.D;

  // ---------- sound unlock button ----------
  const sb = document.getElementById("sound");
  sb.addEventListener("click", () => S.unlock());
  S.onUnlock(() => { sb.classList.add("on"); setTimeout(() => current && enter(current, true), 300); });

  // ---------- diagram specs: [label, beat, dur, sound, y, r, color, bold, anchor, labelDx] ----------
  // GROOVE: type your own syllables for the Waka Waka hook here
  const GROOVE_LABELS = ["1", "2", "3", "4", "5", "6"];
  const SPEC = {
    key: { theme: "light", h: 200, ly: 182, pitchY: m => 150 - (m - 60) * 9, rad: [7, 4, 12, 8, 8, 12], rows: [{ bpm: 96, x0: 25, sx: 100, back: "waltz", notes: [
      ["Hap", 0, .75, 67], ["py", .75, .25, 67, 0, 0, 0, 0, 0, -10], ["BIRTH", 1, 1, 69, 0, 0, "a", 1, 1, 14], ["day", 2, 1, 67], ["to", 3, 1, 72], ["YOU", 4, 2, 71, 0, 0, "a", 1]] }] },
    rhythm: { h: 120, ly: 100, rows: [{ bpm: 104, x0: 20, sx: 92, y: 55, notes: [
      ["hap", 0, .75, 72, 0, 10, "n", 1], ["py", .75, .25, 72, 0, 0, 0, 0, 0, -9], ["and", 1, .5, 72, 0, 0, 0, 0, 0, 9], ["you", 1.5, .5, 72], ["know", 2, .75, 72, 0, 10, "n", 1], ["it", 2.75, .25, 71, 0, 0, 0, 0, 0, -7],
      ["clap", 3, .5, 72, 0, 0, 0, 0, 0, 10], ["your", 3.5, .5, 74], ["hands", 4, 1, 76, 0, 10, "n", 1], ["CLAP", 5, .5, "clap", 0, 11, "y", 1, 1], ["CLAP", 6, .5, "clap", 0, 11, "y", 1]] }] },
    pitch: { h: 210, ly: 196, pitchY: m => 175 - (m - 60) * 9, rows: [{ bpm: 132, x0: 14, sx: 32, notes: [
      ["we", 0, 1, 62, 0, 5, "n", 1], ["wish", 1, 1, 67, 0, 6, "n", 1], ["", 2, .5, 67, 0, 3], ["", 2.5, .5, 69, 0, 3], ["", 3, .5, 67, 0, 3], ["", 3.5, .5, 66, 0, 3], ["", 4, 1, 64, 0, 3], ["", 5, 1, 64, 0, 3],
      ["we", 6, 1, 64, 0, 6, "n", 1], ["wish", 7, 1, 69, 0, 8, "n", 1], ["", 8, .5, 69, 0, 3.5], ["", 8.5, .5, 71, 0, 3.5], ["", 9, .5, 69, 0, 3.5], ["", 9.5, .5, 67, 0, 3.5], ["", 10, 1, 66, 0, 3.5], ["", 11, 1, 62, 0, 3.5],
      ["we", 12, 1, 62, 0, 7, "n", 1], ["WISH", 13, 1, 71, 0, 13, "y", 1, 1], ["", 14, .5, 71, 0, 4], ["", 14.5, .5, 72, 0, 4], ["", 15, .5, 71, 0, 4], ["", 15.5, .5, 69, 0, 4], ["", 16, 1, 67, 0, 4], ["", 17, 1, 64, 0, 4]] }] },
    beat: { h: 290, rows: [
      { bpm: 100, x0: 30, sx: 90, y: 34, ly: 66, counts: ["1", "2", "3", "1", "2", "3"], cy: 112, notes: [
        ["birth", 0, 1, 69, 0, 10, "y", 1], ["day", 1, 1, 67, 0, 6], ["to", 2, 1, 72, 0, 6], ["you", 3, 2, 71, 0, 10, "y", 1], ["ha", 5, .75, 67, 0, 6], ["ppy", 5.75, .25, 67, 0, 5]] },
      { bpm: 100, x0: 30, sx: 70, y: 180, ly: 212, counts: ["1", "2", "3", "4", "1", "2", "3", "4"], cy: 258, gap: 1, notes: [
        ["jin", 0, 1, 64, 0, 10, "y", 1, 1], ["gle", 1, 1, 64, 0, 6], ["bells", 2, 2, 64, 0, 6], ["jin", 4, 1, 64, 0, 10, "y", 1], ["gle", 5, 1, 64, 0, 6], ["bells", 6, 2, 64, 0, 6]] }] },
    tempo: { h: 230, rows: [
      { bpm: 70, x0: 30, sx: 163 * 60 / 70, y: 45, ly: 82, tag: "slow · 70 bpm", notes: [["jin", 0, 1, 64, 0, 8], ["gle", 1, 1, 64, 0, 6], ["bells", 2, 2, 64, 0, 11, "y", 1, 1]] },
      { bpm: 140, x0: 30, sx: 163 * 60 / 140, y: 165, ly: 202, tag: "fast · 140 bpm", gap: .6, notes: [["jin", 0, 1, 64, 0, 8], ["gle", 1, 1, 64, 0, 6], ["bells", 2, 2, 64, 0, 11, "y", 1], ["jin", 4, 1, 64, 0, 8], ["gle", 5, 1, 64, 0, 6], ["bells", 6, 2, 64, 0, 11, "y", 1]] }] },
    groove: { h: 200, rows: [{ bpm: 108, x0: 60, sx: 160, ly: 95, notes: [
      [GROOVE_LABELS[0], 0, .5, "tap", 62, 6], [GROOVE_LABELS[1], .5, .5, "wood", 42, 6], [GROOVE_LABELS[2], 1, .5, "tap", 62, 6], [GROOVE_LABELS[3], 1.5, .5, "wood", 42, 6],
      [GROOVE_LABELS[4], 2, 1, "hit", 30, 14, "y", 1, 1], [GROOVE_LABELS[5], 3, 1, "hit", 30, 14, "y", 1]], feet: { y: 150, ly: 182, beats: [0, 1, 2, 3] } }] },
    sync: { h: 140, rows: [{ bpm: 96, x0: 30, sx: 180, y: 55, ly: 100, notes: [
      ["1", 0, .5, "kick", 0, 5], ["and", .5, .5, "clap", 0, 11, "y", 1, 1], ["2", 1, .5, "kick", 0, 5], ["and", 1.5, .5, "clap", 0, 11, "y", 1], ["3", 2, .5, "kick", 0, 5], ["and", 2.5, .5, "clap", 0, 11, "y", 1], ["4", 3, .5, "kick", 0, 5]] }] },
  };
  const NS = "http://www.w3.org/2000/svg";
  const el = (n, a, p) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); p && p.appendChild(e); return e; };
  const HOLD = new Set(["YOU", "you", "bells", "WISH", "hands"]);

  function build(box) {
    const spec = SPEC[box.dataset.d], light = spec.theme === "light";
    const col = { n: light ? K : W, a: light ? "#6f6b66" : W, y: light ? K : Y, f: light ? "#b9b41a" : F };
    const svg = el("svg", { viewBox: `0 0 620 ${spec.h}` }, box); const G = el("g", {}, svg);
    const items = [];
    spec.rows.forEach((row, ri) => {
      if (row.tag) el("text", { x: 0, y: row.y - 26, class: "lab" }, G).textContent = row.tag;
      row.notes.forEach((n, ni) => {
        const [lab, t, d, snd, yy, rr, c, bold, anchor, ldx] = n;
        const x = row.x0 + t * row.sx;
        const y = spec.pitchY && typeof snd === "number" ? spec.pitchY(snd) : (yy || row.y || 60);
        const r = rr || (spec.rad ? spec.rad[ni] : 6);
        if (d > 1 && HOLD.has(lab)) el("line", { x1: x + r + 6, x2: Math.min(610, row.x0 + (t + d) * row.sx - 10), y1: y, y2: y, stroke: col.n, "stroke-width": 2.5, "stroke-linecap": "round", opacity: .35 }, G);
        const ci = el("circle", { cx: x, cy: y, r, fill: col[c || "n"] }, G);
        if (anchor) { ci.classList.add("anchor"); ci.dataset.c = col[c || "n"]; }
        const tx = lab === "" ? null : el("text", { x: x + (ldx || 0), y: row.ly || spec.ly, class: bold ? "b" : "" }, G); if (tx) tx.textContent = lab;
        items.push({ ci, tx, row: ri, t, d, snd, vel: spec.vel ? spec.vel[ni] : (r > 9 ? 1 : r < 5 ? .6 : .8) });
      });
      if (row.counts) row.counts.forEach((c, i) => {
        const x = row.x0 + i * row.sx;
        const dot = el("circle", { cx: x, cy: row.cy - 16, r: c === "1" ? 4 : 2.5, fill: c === "1" ? (light ? K : Y) : col.f }, G);
        const tx = el("text", { x, y: row.cy }, G); tx.textContent = c;
        items.push({ ci: dot, tx, row: ri, t: i, d: .3, snd: c === "1" ? "click1" : "click", count: 1 });
      });
      if (row.feet) {
        row.feet.beats.forEach(b => { const ci = el("circle", { cx: row.x0 + b * row.sx, cy: row.feet.y, r: 7, fill: col.f }, G); items.push({ ci, row: ri, t: b, d: .3, snd: "kick2", vel: .8 }); });
        el("text", { x: 0, y: row.feet.ly, class: "lab" }, G).textContent = "your feet";
      }
    });
    requestAnimationFrame(() => { try { const bb = G.getBBox(); G.setAttribute("transform", `translate(${(620 - bb.width) / 2 - bb.x},0)`); } catch (e) { } });
    let timers = [], bus = null;
    const stop = () => { timers.forEach(clearTimeout); timers = []; if (bus) { const b = bus, t = S.AC.currentTime; b.gain.setTargetAtTime(0, t, 0.04); setTimeout(() => b.disconnect(), 400); bus = null; } items.forEach(it => { it.ci.classList.remove("on"); it.tx && it.tx.classList.remove("on"); }); };
    const play = () => {
      stop(); const AC = S.AC; bus = AC.createGain(); bus.connect(S.master); S.setOut(bus); const t0 = AC.currentTime + 0.1; let off = 0;
      spec.rows.forEach((row, ri) => {
        const spb = 60 / row.bpm; off += (row.gap || 0) * (ri ? spb : 0); let end = 0;
        const its = items.filter(it => it.row === ri);
        its.forEach(it => {
          const at = t0 + off + it.t * spb, dur = it.d * spb, s = it.snd;
          if (typeof s === "number") S.piano(s, at, dur, it.vel);
          else if (s === "click1") Dr.click(at, true); else if (s === "click") Dr.click(at, false);
          else Dr[s](at, it.vel || 1);
          const ms = (at - AC.currentTime) * 1000;
          timers.push(setTimeout(() => { it.ci.classList.add("on"); it.tx && it.tx.classList.add("on"); }, ms));
          timers.push(setTimeout(() => { it.ci.classList.remove("on"); it.tx && it.tx.classList.remove("on"); }, ms + Math.max(170, Math.min(dur * 1000, 520))));
          end = Math.max(end, it.t + it.d);
        });
        if (row.back) for (let b = 0; b < Math.ceil(end); b++) { const at = t0 + off + b * spb; row.back === "waltz" ? (b % 3 === 0 ? Dr.kick(at, .7) : Dr.hat(at, .7)) : (b % 2 === 0 ? Dr.kick(at, .6) : Dr.snareSoft(at, .5)); }
        off += end * spb;
      });
      S.setOut(null);
      timers.push(setTimeout(() => box._loopNext && box._loopNext(), (t0 + off - AC.currentTime) * 1000 + 1600));
    };
    box._play = play; box._stop = stop;
  }
  document.querySelectorAll(".dia").forEach(build);
  // ---------- word-by-word text reveal ----------
  document.querySelectorAll(".scr .p, .scr .h, .scr .big").forEach(blk => {
    blk.classList.remove("rv"); blk.classList.add("words"); let i = 0;
    const wrap = node => { const w = document.createElement("span"); w.className = "w"; const inner = document.createElement("span"); inner.style.setProperty("--i", i++); w.appendChild(inner); return [w, inner]; };
    [...blk.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
          const [w, inner] = wrap(); inner.textContent = part; frag.appendChild(w);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && !n.classList.contains("anchor")) {
        const [w, inner] = wrap(); n.replaceWith(w); inner.appendChild(n);
      }
    });
  });


  // ---------- the 1 e & a beat ----------
  const b4 = [...document.querySelectorAll(".beat4 i")];
  let b4timer = null;
  function b4start() {
    b4stop(); const AC = S.AC; let t = AC.currentTime + 0.1, k = 0; const spb = 60 / 96 / 2;
    const hitsOf = i => [() => Dr.hat(t, .9), () => (Dr.kick(t, 1), Dr.hat(t, .5)), () => (Dr.snare(t, .75)), () => (Dr.kick(t, .9), Dr.snare(t, 1))][i];
    const tick = () => {
      while (t < AC.currentTime + 0.15) {
        const i = k % 4; hitsOf(i)(); const ms = (t - AC.currentTime) * 1000;
        setTimeout(() => { b4.forEach(x => x.classList.remove("on")); b4[i].classList.add("on"); }, ms);
        setTimeout(() => b4[i].classList.remove("on"), ms + 140);
        t += spb; k++;
      }
    };
    tick(); b4timer = setInterval(tick, 40);
  }
  function b4stop() { clearInterval(b4timer); b4timer = null; b4.forEach(x => x.classList.remove("on")); }

  // ---------- sections: reveal + autoplay ----------
  const secs = [...document.querySelectorAll("section.scr")];
  let current = null;
  function enter(sec, force) {
    if (current === sec && !force) return;
    current = sec; sec.classList.add("in");
    if (!S.ready) return;
    if (sec.id === "count") setTimeout(() => current === sec && b4start(), 500);
    const d = sec.querySelector(".dia");
    if (d) { d._stop(); d._loopNext = () => current === sec && d._play(); clearTimeout(d._t); d._t = setTimeout(() => current === sec && d._play(), 700); }
  }
  function leave(sec) { if (sec.id === "count") b4stop(); const d = sec.querySelector(".dia"); if (d) { d._loopNext = null; clearTimeout(d._t); d._stop(); } }
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { if (current && current !== e.target) leave(current); enter(e.target); } }), { threshold: 0.55 });
  secs.forEach(s => io.observe(s));

  // ---------- heavy smooth scroll with snapping ----------
  let lenis = null;
  if (window.Lenis) {
    lenis = new Lenis({ duration: 1.6, easing: t => 1 - Math.pow(1 - t, 4), wheelMultiplier: 0.9, smoothWheel: true });
    if (window.Snap) { const snap = new Snap(lenis, { type: "mandatory", duration: 1.7, easing: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2, debounce: 80 }); snap.addElements(secs, { align: ["start"] }); const ft = document.getElementById("foot"); if (ft) snap.addElement(ft, { align: ["end"] }); }
    (function r(t) { lenis.raf(t); requestAnimationFrame(r); })();
  }

  // ---------- cursor ----------
  const cur = document.getElementById("cursor"), heroSvg = document.getElementById("heroSvg"), heroCur = document.getElementById("heroCur"), hero = document.querySelector(".hero");
  let mx = innerWidth / 2, my = innerHeight / 2, cx = mx, cy = my, lastMove = 0, hr = 0;
  addEventListener("mousemove", e => { mx = e.clientX; my = e.clientY; lastMove = performance.now(); });
  document.addEventListener("mouseover", e => cur.classList.toggle("big", !!e.target.closest("button,select")));

  // ---------- travelling dot ----------
  const travel = document.getElementById("travel");
  const anchors = [...document.querySelectorAll(".anchor")];
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, t) => { const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(",")})`; };
  const smoother = t => t * t * t * (t * (t * 6 - 15) + 10);
  let px = 0, py = 0, last = [];

  function frame(now) {
    // cursor: fluid follow, dissolves when idle
    cx += (mx - cx) * 0.16; cy += (my - cy) * 0.16;
    const idle = now - lastMove > 1400;
    cur.style.transform = `translate(${cx}px,${cy}px)`;
    const box = hero.getBoundingClientRect(), inHero = cy > box.top && cy < box.bottom;
    hr += ((inHero && !idle ? 34 : 0) - hr) * 0.12;
    if (inHero) { const pt = heroSvg.createSVGPoint(); pt.x = cx; pt.y = cy; const p = pt.matrixTransform(heroSvg.getScreenCTM().inverse()); heroCur.setAttribute("cx", p.x); heroCur.setAttribute("cy", p.y); }
    heroCur.setAttribute("r", hr.toFixed(1));
    cur.classList.toggle("hide", inHero); cur.classList.toggle("idle", idle);
    const under = document.elementFromPoint(Math.max(0, Math.min(innerWidth - 1, cx)), Math.max(0, Math.min(innerHeight - 1, cy)));
    const sec = under && under.closest("[data-theme]");
    cur.classList.toggle("on-light", !!sec && sec.dataset.theme === "light");

    // travelling dot: one stop per section, always visible, curved path
    const vh0 = innerHeight;
    document.querySelectorAll(".words").forEach(blk => {
      const r = blk.getBoundingClientRect(); if (r.bottom < -50 || r.top > vh0 + 50) return;
      const p = Math.min(1, Math.max(0, (vh0 * 0.98 - r.top) / (vh0 * 0.5)));
      if (blk._p !== undefined && Math.abs(blk._p - p) < 0.002) return; blk._p = p;
      const ws = blk._ws || (blk._ws = [...blk.querySelectorAll(".w>span")]), n = ws.length || 1;
      ws.forEach((w, k) => { const t = Math.min(1, Math.max(0, p * 1.6 - (k / n) * 0.6)); const e = 1 - Math.pow(1 - t, 3);
        w.style.transform = e >= 1 ? "" : `translateY(${(1 - e) * 110}%) rotate(${(1 - e) * 5}deg)`; w.style.opacity = e; });
      blk.querySelectorAll(".pd").forEach(d => { d.style.opacity = p > 0.85 ? 1 : 0; });
    });
    const sy = scrollY, vh = innerHeight;
    const A = []; anchors.forEach(a => {
      const r = a.getBoundingClientRect(); const sec = a.closest("section");
      if (r.width < 1) { if (A.length) A.push({ ...A[A.length - 1], a }); return; }
      A.push({ a, x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, s: sec ? sec.offsetTop : 0, c: a.dataset.c || K });
    });
    if (!A.length) return requestAnimationFrame(frame);
    for (let k = 1; k < A.length; k++) if (A[k].s <= A[k - 1].s) A[k].s = A[k - 1].s + 1;
    let i = 0; while (i < A.length - 1 && sy >= A[i + 1].s) i++;
    const a = A[i], b = A[Math.min(i + 1, A.length - 1)];
    const raw = i < A.length - 1 ? Math.min(1, Math.max(0, (sy - a.s) / (b.s - a.s))) : 0;
    const e = smoother(Math.min(1, Math.max(0, (raw - 0.04) / 0.92)));
    const dx = b.x - a.x, dy = b.y - a.y, dist = Math.hypot(dx, dy) || 1, sgn = i % 2 ? 1 : -1;
    const amp = Math.min(innerWidth * 0.32, dist * 0.55) * sgn, nx = -dy / dist, ny = dx / dist;
    const p1x = a.x + nx * amp + dx * 0.15, p1y = a.y + ny * amp + dy * 0.15, p2x = b.x + nx * amp * 0.6 - dx * 0.15, p2y = b.y + ny * amp * 0.6 - dy * 0.15;
    const u = 1 - e;
    const x = u * u * u * a.x + 3 * u * u * e * p1x + 3 * u * e * e * p2x + e * e * e * b.x;
    const y = u * u * u * a.y + 3 * u * u * e * p1y + 3 * u * e * e * p2y + e * e * e * b.y;
    let w = a.w + (b.w - a.w) * e; w *= 1 + 0.9 * Math.sin(Math.PI * e);
    let c = mix(a.c, b.c, e);
    const att = e <= 0 ? a : e >= 1 ? b : null;
    if (att && att.a.classList.contains("on")) w *= 1.4;
    const vx = x - px, vy = y - py, sp = Math.hypot(vx, vy); px = x; py = y;
    const st = 1 + Math.min(0.45, sp / 70), ang = Math.atan2(vy, vx);
    const sc = w / 240;
    travel.style.transform = `translate(${x}px,${y}px) rotate(${ang}rad) scale(${sc * st},${sc / st})`;
    travel.style.background = c;
    anchors.forEach((an, k) => an.classList.toggle("hid", (A[i] && an === A[i].a && e < 1) || (A[i + 1] && an === A[i + 1].a && e > 0)));
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
