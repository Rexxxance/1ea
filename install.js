// 1e&A installation: body in dots, palm dot controller, pinch = beat
const CFG = {
  spacing: 15, minR: 0.1, maxR: 0.46,
  bpmMin: 70, bpmMax: 150,
  holdSeconds: 2,
  pinchOn: 0.28, pinchOff: 0.45,
  procWidth: 640,
};
const Y = "#F3EF12", W = "#ECEAE2", BG = "#1a1718", IDLE = "#3b3637";

// ---------- models (local copy first, CDN fallback) ----------
let vision;
async function loadVision() {
  try { vision = await import("./lib/vision_bundle.mjs"); return "./lib/wasm"; }
  catch (e) { vision = await import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14"); return "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"; }
}
const MP = "https://storage.googleapis.com/mediapipe-models/";
const SEG = [["./models/selfie_multiclass_256x256.tflite", 1], [MP + "image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite", 1], ["./selfie_segmenter.tflite", 0]];
const HAND = ["./hand_landmarker.task", MP + "hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task"];
const POSE = ["./pose_landmarker_lite.task", MP + "pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task"];
async function task(Cls, fs, url, extra) {
  for (const delegate of ["GPU", "CPU"]) {
    try { return await Cls.createFromOptions(fs, { baseOptions: { modelAssetPath: url, delegate }, runningMode: "VIDEO", ...extra }); } catch (e) { }
  }
  return null;
}
let seg, segMulti = 1, segCPU = false, segURL = null, FS = null, emptyFrames = 0, hands, pose;
async function initModels(msg) {
  const wasm = await loadVision(); const fs = await vision.FilesetResolver.forVisionTasks(wasm);
  msg("Loading body model…");
  FS = fs; for (const [u, m] of SEG) { seg = await task(vision.ImageSegmenter, fs, u, { outputConfidenceMasks: true, outputCategoryMask: false }); if (seg) { segMulti = m; segURL = u; break; } }
  msg("Loading hand model…");
  for (const u of HAND) { hands = await task(vision.HandLandmarker, fs, u, { numHands: 4, minHandDetectionConfidence: 0.5, minHandPresenceConfidence: 0.5, minTrackingConfidence: 0.5 }); if (hands) break; }
  msg("Loading pose model…");
  for (const u of POSE) { pose = await task(vision.PoseLandmarker, fs, u, { numPoses: 4 }); if (pose) break; }
  if (!seg || !hands) throw new Error("Couldn't load the tracking models. Check the internet connection.");
}

// ---------- elements ----------
const stage = document.getElementById("stage"), cv = document.getElementById("stageCv"), ctx = cv.getContext("2d");
const video = document.getElementById("cam"), gate = document.getElementById("gate"), camSel = document.getElementById("camSel"), gateMsg = document.getElementById("gateMsg");
const msg = s => gateMsg.textContent = s;

async function listCams_unused() {
  try { const t = await navigator.mediaDevices.getUserMedia({ video: true }); t.getTracks().forEach(x => x.stop()); } catch (e) { msg("Camera permission was blocked."); }
  const d = (await navigator.mediaDevices.enumerateDevices()).filter(x => x.kind === "videoinput");
  camSel.innerHTML = d.map((x, i) => `<option value="${x.deviceId}">${x.label || "Camera " + (i + 1)}</option>`).join("");
}


// ---------- grid ----------
let Wd = 0, Hd = 0, DPR = 1, N = 0, dx, dy, du, dv, val, samp, maskW = 0, maskH = 0, cover;
function computeCover() {
  const vw = video.videoWidth || 1280, vh = video.videoHeight || 720, s = Math.max(Wd / vw, Hd / vh);
  cover = { dw: vw * s, dh: vh * s, ox: (Wd - vw * s) / 2, oy: (Hd - vh * s) / 2 };
}
const toUV = (x, y) => [1 - (x - cover.ox) / cover.dw, (y - cover.oy) / cover.dh];      // mirrored
const toScr = (u, v) => [(1 - u) * cover.dw + cover.ox, v * cover.dh + cover.oy];
function buildGrid() {
  const S = CFG.spacing * (Wd / 1100) ** 0.5;
  const cols = Math.ceil(Wd / S), rows = Math.ceil(Hd / S); N = cols * rows;
  dx = new Float32Array(N); dy = new Float32Array(N); du = new Float32Array(N); dv = new Float32Array(N); val = new Float32Array(N);
  computeCover();
  let i = 0; const ox = (Wd - (cols - 1) * S) / 2, oy = (Hd - (rows - 1) * S) / 2;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++, i++) { dx[i] = ox + c * S; dy[i] = oy + r * S; const [u, v] = toUV(dx[i], dy[i]); du[i] = u; dv[i] = v; }
  buildGrid.S = S; buildSamples();
}
function buildSamples() {
  if (!maskW || !N) return;
  const S = buildGrid.S * 0.3, off = [[0, 0], [-S, -S], [S, -S], [-S, S], [S, S]];
  samp = new Int32Array(N * 5);
  for (let i = 0; i < N; i++) for (let k = 0; k < 5; k++) {
    const [u, v] = toUV(dx[i] + off[k][0], dy[i] + off[k][1]); const mx = Math.floor(u * maskW), my = Math.floor(v * maskH);
    samp[i * 5 + k] = (mx < 0 || my < 0 || mx >= maskW || my >= maskH) ? -1 : my * maskW + mx;
  }
}
function resize() {
  DPR = Math.min(devicePixelRatio || 1, 2); Wd = stage.clientWidth; Hd = stage.clientHeight;
  cv.width = Wd * DPR; cv.height = Hd * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0); buildGrid();
}
new ResizeObserver(() => resize()).observe(stage);

// ---------- tracking ----------
const proc = document.createElement("canvas"), pctx = proc.getContext("2d");
let person = null, lastT = -1, lastTs = 0, fno = 0;
let handList = [];      // [{pts:[[x,y]...] in video px, size, palm:[u,v]}]
const T = { L: null, R: null, base: false, deg: 5, tempoQ: 100, rU: .5, rV: .5, lU: .5, lV: .5, rSeen: 0, lSeen: 0, persons: 0, raw: 0, since: 0, pitch: .5, tempo: .5, main: null, palmU: .5, palmV: .5, palmSeen: 0, speed: 0, stillSince: 0, hold: false, lastPinch: 0, pinched: false };
const BONES = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12], [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [17, 18], [18, 19], [19, 20], [0, 17], [0, 9], [0, 13], [5, 17]];
const PALM = new Set([4, 8, 12, 16, 20, 21, 22, 23]);

function track(now) {
  if (video.readyState < 2 || video.currentTime === lastT) return;
  lastT = video.currentTime;
  const vw = video.videoWidth, vh = video.videoHeight, pw = CFG.procWidth, ph = Math.round(pw * vh / vw);
  if (proc.width !== pw) { proc.width = pw; proc.height = ph; }
  pctx.drawImage(video, 0, 0, pw, ph);
  let ts = performance.now(); if (ts <= lastTs) ts = lastTs + 1; lastTs = ts;

  const r = seg.segmentForVideo(proc, ts);
  if (r.confidenceMasks && r.confidenceMasks.length) {
    const m = r.confidenceMasks[0], a = m.getAsFloat32Array();
    if (m.width !== maskW || m.height !== maskH || !person) { maskW = m.width; maskH = m.height; person = new Float32Array(maskW * maskH); buildSamples(); }
    if (segMulti) for (let i = 0; i < a.length; i++) person[i] = 1 - a[i]; else person.set(a);
    let sum = 0; for (let i = 0; i < person.length; i += 16) sum += person[i] > 0.5 ? 1 : 0; cover0 = sum / (person.length / 16);
    if ((cover0 < 0.002 || cover0 > 0.97) && (T.persons > 0 || handList.length)) emptyFrames++; else emptyFrames = 0;
    if (emptyFrames > 90 && !segCPU) { segCPU = true; emptyFrames = 0; vision.ImageSegmenter.createFromOptions(FS, { baseOptions: { modelAssetPath: segURL, delegate: "CPU" }, runningMode: "VIDEO", outputConfidenceMasks: true, outputCategoryMask: false }).then(x => { seg = x; }); }
  }
  r.close && r.close();

  const h = hands.detectForVideo(proc, ts);
  handList = (h.landmarks || []).map((l, hi) => {
    const pts = l.map(p => [p.x * vw, p.y * vh]);
    const size = Math.hypot(pts[9][0] - pts[0][0], pts[9][1] - pts[0][1]) || 1;
    const pu = (l[0].x + l[5].x + l[9].x + l[13].x + l[17].x) / 5, pv = (l[0].y + l[5].y + l[9].y + l[13].y + l[17].y) / 5;
    const pinch = Math.hypot(pts[4][0] - pts[8][0], pts[4][1] - pts[8][1]) / size;
    const wl = h.worldLandmarks && h.worldLandmarks[hi];
    const d3 = (a, b) => Math.hypot(wl[a].x - wl[b].x, wl[a].y - wl[b].y, wl[a].z - wl[b].z);
    const pinchM = wl ? d3(4, 8) : pinch * 0.09;                 // thumb tip to index tip, metres
    const tips = wl ? [8, 12, 16, 20].reduce((a, j) => a + d3(j, 0), 0) / 4 / Math.max(0.05, d3(9, 0)) : [8, 12, 16, 20].reduce((a, j) => a + Math.hypot(pts[j][0] - pts[0][0], pts[j][1] - pts[0][1]), 0) / 4 / size;
    const cat = (h.handedness && h.handedness[hi] && h.handedness[hi][0]) ? h.handedness[hi][0].categoryName : "";
    return { pts, size, palm: [pu, pv], pinch, pinchM, l, tips, cat };
  });
  controls(now);

  fno++;
  if (pose && fno % 3 === 0) {
    const p = pose.detectForVideo(proc, ts);
    const n = (p.landmarks || []).length;
    if (n !== T.raw) { T.raw = n; T.since = now; }
    if (now - T.since > 500) T.persons = T.raw;
  }
  if (!pose) T.persons = handList.length ? 1 : 0;
  if (T.persons === 0 && handList.length) T.persons = 1;
}

function controls(now) {
  T.L = null; T.R = null;
  if (!handList.length) { T.main = null; return; }
  // which hand is which: two hands -> by screen side; one hand -> model's label (input is unmirrored, so labels swap)
  if (handList.length >= 2) {
    const sorted = [...handList].sort((a, b) => (1 - a.palm[0]) - (1 - b.palm[0]));
    T.L = sorted[0]; T.R = sorted[sorted.length - 1];
  } else { const hd = handList[0]; if (hd.cat === "Left") T.R = hd; else T.L = hd; }
  T.main = T.R || T.L; T.palmSeen = now;
  // fist on any hand = back to the basic beat
  let fist = false; handList.forEach(hd => { hd.fist = hd.fist ? hd.tips < 1.35 : hd.tips < 1.15; if (hd.fist) fist = true; });
  if (fist && !T.base) { T.base = true; T.tempoQ = 100; }
  if (!fist) T.base = false;
  const k = v => Math.min(1, Math.max(0, v));
  // right hand up/down = pitch, in steps with hysteresis so it doesn't wobble
  if (T.R && !T.R.fist) {
    T.rU += (T.R.palm[0] - T.rU) * 0.5; T.rV += (T.R.palm[1] - T.rV) * 0.5;
    const target = k((0.85 - T.rV) / 0.7) * 10;
    if (Math.abs(target - T.deg) > 0.75) T.deg = Math.round(target);
    T.pitch = T.deg / 10; T.rSeen = now;
  }
  // left hand left/right = tempo, in 5 bpm steps with hysteresis
  if (T.L && !T.L.fist) {
    T.lU += (T.L.palm[0] - T.lU) * 0.5; T.lV += (T.L.palm[1] - T.lV) * 0.5;
    const target = CFG.bpmMin + k(((1 - T.lU) - 0.1) / 0.8) * (CFG.bpmMax - CFG.bpmMin);
    if (Math.abs(target - T.tempoQ) > 6) T.tempoQ = Math.round(target / 5) * 5;
    T.lSeen = now;
  }
  T.palmU = T.main.palm[0]; T.palmV = T.main.palm[1];
  // pinch (any hand) = beat
  let anyPinch = false; handList.forEach(hd => { if (!hd.fist && hd.pinchM < 0.028) anyPinch = true; });
  const allOpen = handList.every(hd => hd.pinchM > 0.045);
  T.pinchFrames = anyPinch ? (T.pinchFrames || 0) + 1 : 0;
  if (T.pinchFrames >= 2 && !T.pinched && now - T.lastPinch > 120) { T.pinched = true; T.lastPinch = now; onPinch(); }
  else if (allOpen) T.pinched = false;
}

// ---------- audio (real samples via SFX) ----------
let A, nextT = 0, step = 0, bpm = 100, pad = null, forced = 0;
const visQ = [];
const SC = [0, 3, 5, 7, 10], NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const deg = () => T.deg;
const note = (root, d) => root + Math.floor(d / 5) * 12 + SC[((d % 5) + 5) % 5];
const Dr = () => window.SFX.D;
function audio() { if (A) return; window.SFX.unlock(); A = window.SFX.AC; setInterval(sched, 25); }
const layers = () => forced || Math.min(4, T.persons);
const KICK = [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0], BASS = [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0], BDEG = [0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 4, 0, 0, 3, 0], ARP = [0, 2, 4, 2, 5, 4, 2, 1];
function sched() {
  bpm += ((SONG.on ? SONG.bpm * SONG.rate : T.tempoQ) - bpm) * 0.06;
  if (nextT < A.currentTime) nextT = A.currentTime + 0.05;
  const D = Dr();
  while (nextT < A.currentTime + 0.12) {
    const L = layers(), s = step % 16, dur = 60 / bpm / 4;
    const mel = !T.base && T.R && !T.R.fist;
    if (L > 0 && (!SONG.on || T.base)) {
      if (KICK[s]) { D.kick(nextT, .9); visQ.push({ t: nextT, k: "kick" }); }
      if (s % 2 === 0) { D.hat(nextT, s % 4 === 2 ? .8 : .45); if (mel) { window.SFX.piano(note(60, deg() + ARP[(s / 2) | 0]), nextT, dur * 1.8, .55); visQ.push({ t: nextT, k: "note" }); } }
      if (!T.base && (s === 4 || s === 12)) D.snareSoft(nextT, .6);
      if (s % 4 === 0) visQ.push({ t: nextT, k: "beat", n: (s / 4) | 0 });
      if (!T.base && L >= 2 && BASS[s]) D.bass(nextT, note(36, deg() + BDEG[s]), dur * 2);
      if (!T.base && L >= 3 && (s === 0 || s === 6 || s === 8)) [0, 7, 12].forEach(i => window.SFX.piano(note(48, deg()) + i, nextT, dur * 3, .35));
      if (!T.base && L >= 4 && s % 2 === 1) D.snap(nextT, .35);
    }
    nextT += dur; step++;
  }
}
function setHold(on) {
  T.hold = on; if (!A) return;
  if (on) { const m = note(48, deg()); [0, 7, 12, 15].forEach(i => window.SFX.piano(m + i, A.currentTime, 2.5, .4)); }
}
let palmPop = 0, flashBeat = 0;
function onPinch() {
  if (A) { const dur = 60 / bpm / 4, t = SONG.on ? Math.min(songNextBeat(), A.currentTime + 0.25) : Math.max(A.currentTime + 0.01, nextT - dur * Math.floor((nextT - A.currentTime) / dur)); const m = note(60, deg() + 2); window.SFX.piano(m, t, 0.6, 1); window.SFX.piano(m + 7, t, 0.6, .6); Dr().snap(t, .5); }
  palmPop = 1; flashBeat = 1;
  const [x, y] = toScr(T.palmU, T.palmV); ripples.push({ x, y, t0: performance.now(), str: 1.5, sp: 1.3 });
}

// ---------- drawing ----------
const ripples = []; let pulse = 0, notePulse = 0, curBeat = -1, lastF = performance.now();
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function handCover(i) {
  let best = 0; const vw = video.videoWidth, vh = video.videoHeight, x = du[i] * vw, y = dv[i] * vh;
  for (const hd of handList) {
    const p = hd.pts, s = hd.size;
    if (x < hd.bx0 || x > hd.bx1 || y < hd.by0 || y > hd.by1) continue;
    for (let b = 0; b < BONES.length; b++) {
      const [a, c] = BONES[b]; const ax = p[a][0], ay = p[a][1], cx = p[c][0], cy = p[c][1];
      const ex = cx - ax, ey = cy - ay, l2 = ex * ex + ey * ey || 1; let t = ((x - ax) * ex + (y - ay) * ey) / l2; t = t < 0 ? 0 : t > 1 ? 1 : t;
      const d = Math.hypot(x - (ax + ex * t), y - (ay + ey * t)), th = s * (PALM.has(b) ? 0.2 : 0.085);
      const cv2 = smooth(th * 1.3, th * 0.7, d); if (cv2 > best) best = cv2; if (best >= 1) return 1;
    }
  }
  return best;
}
function draw(now) {
  const dt = Math.min(0.05, (now - lastF) / 1000); lastF = now;
  if (A) { const at = A.currentTime; while (visQ.length && visQ[0].t <= at) { const e = visQ.shift(); if (e.k === "kick") { pulse = 1; const [x, y] = T.main ? toScr(T.palmU, T.palmV) : [Wd / 2, Hd / 2]; ripples.push({ x, y, t0: now, str: .7, sp: 1 }); } else if (e.k === "note") notePulse = 1; else if (e.k === "beat") curBeat = e.n; } }
  const dec = (v, k) => v * Math.exp(-k * dt); pulse = dec(pulse, 9); notePulse = dec(notePulse, 12); palmPop = dec(palmPop, 7); flashBeat = dec(flashBeat, 5);
  handList.forEach(hd => { let a = 1e9, b = -1e9, c = 1e9, d = -1e9; hd.pts.forEach(([x, y]) => { a = Math.min(a, x); b = Math.max(b, x); c = Math.min(c, y); d = Math.max(d, y); }); const m = hd.size * 0.3; hd.bx0 = a - m; hd.bx1 = b + m; hd.by0 = c - m; hd.by1 = d + m; });
  const S = buildGrid.S, rMin = S * CFG.minR, rMax = S * CFG.maxR, diag = Math.hypot(Wd, Hd);
  for (let k = ripples.length - 1; k >= 0; k--) { const r = ripples[k]; r.R = (now - r.t0) / 1000 * diag * r.sp * 0.6; if (r.R > diag) ripples.splice(k, 1); }
  ctx.fillStyle = BG; ctx.fillRect(0, 0, Wd, Hd);
  const pb = new Path2D(), pf = new Path2D(), band = S * 2.4, haveMask = person && samp;
  for (let i = 0; i < N; i++) {
    if (!T.hold) {
      let c = 0;
      if (haveMask) { let s = 0; const b = i * 5; for (let k = 0; k < 5; k++) { const j = samp[b + k]; if (j >= 0) s += smooth(0.3, 0.7, person[j]); } c = s / 5; }
      if (handList.length) { const h = handCover(i); if (h > c) c = h; }
      val[i] += (c - val[i]) * (c > val[i] ? 0.6 : 0.35);
    }
    const v = val[i]; let r = rMin + (rMax - rMin) * v;
    r *= 1 + 0.2 * pulse * (0.3 + v);
    for (const rp of ripples) { const d = Math.hypot(dx[i] - rp.x, dy[i] - rp.y) - rp.R; if (d > -band * 2 && d < band * 2) r += S * 0.22 * rp.str * Math.exp(-(d * d) / (band * band)) * (1 - rp.R / diag); }
    if (T.hold) r *= 1 + 0.05 * Math.sin(now / 300 + i * 0.01);
    r = Math.min(r, S * 0.62);
    (v > 0.2 ? pf : pb).moveTo(dx[i] + r, dy[i]); (v > 0.2 ? pf : pb).arc(dx[i], dy[i], r, 0, 6.283);
  }
  ctx.fillStyle = IDLE; ctx.fill(pb); ctx.fillStyle = W; ctx.fill(pf);
  ctx.strokeStyle = "rgba(236,234,226,.22)"; ctx.lineWidth = 1;
  [[T.R, "R"], [T.L, "L"]].forEach(([hd, side]) => {
    if (!hd) return; const [x, y] = toScr(hd.palm[0], hd.palm[1]);
    const R = rMax * 1.6 * (hd.fist ? 0.55 : 1) * (1 - 0.5 * palmPop) * (1 + (side === "R" ? 0.15 * notePulse : 0));
    ctx.fillStyle = W; ctx.beginPath(); ctx.arc(x, y, Math.max(2, R), 0, 6.283); ctx.fill();
    ctx.beginPath(); if (side === "R") { ctx.moveTo(0, y); ctx.lineTo(Wd, y); } else { ctx.moveTo(x, 0); ctx.lineTo(x, Hd); } ctx.stroke();
  });
}

// ---------- song mode: upload a song, it gets analysed and becomes playable ----------
const SONG = { on: false, el: null, src: null, filt: null, gain: null, bpm: 120, first: 0, lastBeat: -1, rate: 1 };
function analyse(buf) {
  // onset envelope -> autocorrelation for tempo -> best phase for the first beat
  const d = buf.getChannelData(0), sr = buf.sampleRate, hop = 512, n = Math.floor(d.length / hop);
  const env = new Float32Array(n); let prev = 0;
  for (let k = 0; k < n; k++) { let e = 0; for (let j = 0; j < hop; j++) { const v = d[k * hop + j]; e += v * v; } e = Math.sqrt(e / hop); env[k] = Math.max(0, e - prev); prev = e; }
  const dt = hop / sr, lo = Math.round(60 / 180 / dt), hi = Math.round(60 / 70 / dt);
  let best = lo, bv = -1; const N = Math.min(n, Math.round(60 / dt));
  for (let lag = lo; lag <= hi; lag++) { let s = 0; for (let k = 0; k + lag < N; k++) s += env[k] * env[k + lag]; if (s > bv) { bv = s; best = lag; } }
  let bpm = 60 / (best * dt); while (bpm < 85) bpm *= 2; while (bpm > 170) bpm /= 2;
  const per = 60 / bpm / dt; let ph = 0, pv = -1;
  for (let o = 0; o < per; o++) { let s = 0; for (let k = o; k < Math.min(n, o + per * 32); k += per) s += env[Math.round(k)] || 0; if (s > pv) { pv = s; ph = o; } }
  return { bpm, first: ph * dt };
}
async function loadSong(file) {
  audio(); const lbl = document.getElementById("songLbl"); lbl.textContent = "Listening to it…";
  const ab = await file.arrayBuffer(); const buf = await A.decodeAudioData(ab.slice(0));
  const an = analyse(buf); SONG.bpm = an.bpm; SONG.first = an.first;
  if (SONG.el) { SONG.el.pause(); }
  const el = new Audio(URL.createObjectURL(file)); el.loop = true; el.preservesPitch = true;
  const src = A.createMediaElementSource(el), filt = A.createBiquadFilter(), g = A.createGain();
  filt.type = "lowpass"; filt.frequency.value = 18000; g.gain.value = 1;
  src.connect(filt); filt.connect(g); g.connect(window.SFX.master);
  Object.assign(SONG, { on: true, el, src, filt, gain: g, lastBeat: -1, rate: 1 });
  await el.play();
  lbl.textContent = file.name.replace(/\.[^.]+$/, "").slice(0, 26) + " · " + Math.round(an.bpm) + " bpm";
  document.getElementById("songOff").classList.add("show");
  document.querySelector("#cPitch b").textContent = "Tone"; document.querySelector("#cTempo b").textContent = "Speed";
}
function songOff() {
  if (SONG.el) SONG.el.pause(); SONG.on = false;
  document.getElementById("songLbl").textContent = "Play your own song"; document.getElementById("songOff").classList.remove("show");
  document.querySelector("#cPitch b").textContent = "Pitch"; document.querySelector("#cTempo b").textContent = "Tempo";
}
document.getElementById("songIn").addEventListener("change", e => { const f = e.target.files[0]; if (f) loadSong(f).catch(err => { document.getElementById("songLbl").textContent = "Couldn't read that file"; console.error(err); }); });
document.getElementById("songOff").onclick = songOff;
function songTick() {
  if (!SONG.on || !SONG.el) return;
  // left hand = speed (keeps the pitch), right hand = tone, fist = drop the song to the basic beat
  const rate = T.L && !T.L.fist ? 0.75 + Math.round(((1 - T.lU) - 0.1) / 0.8 * 12) * 0.05 : SONG.rate;
  SONG.rate = Math.min(1.35, Math.max(0.75, rate)); SONG.el.playbackRate = SONG.rate;
  const tone = T.R && !T.R.fist ? 300 * Math.pow(60, T.pitch) : 18000;
  SONG.filt.frequency.setTargetAtTime(T.base ? 600 : tone, A.currentTime, 0.08);
  SONG.gain.gain.setTargetAtTime(T.base ? 0.15 : 1, A.currentTime, 0.1);
  const per = 60 / SONG.bpm, b = Math.floor((SONG.el.currentTime - SONG.first) / per);
  if (b !== SONG.lastBeat) { SONG.lastBeat = b; pulse = 1; curBeat = ((b % 4) + 4) % 4; const [x, y] = T.main ? toScr(T.palmU, T.palmV) : [Wd / 2, Hd / 2]; ripples.push({ x, y, t0: performance.now(), str: .6, sp: 1 }); }
}
function songNextBeat() { // AudioContext time of the next beat in the song
  const per = 60 / SONG.bpm, st = SONG.el.currentTime, nb = SONG.first + Math.ceil((st - SONG.first) / per) * per;
  return A.currentTime + Math.max(0.01, (nb - st) / SONG.rate);
}

// ---------- side panel (minimal) ----------
const NSs = "http://www.w3.org/2000/svg";
function mk(svg, n, a) { const e = document.createElementNS(NSs, n); for (const k in a) e.setAttribute(k, a[k]); svg.appendChild(e); return e; }
const q = id => document.querySelector(id);
const sP = q("#cPitch svg"), sT = q("#cTempo svg"), sB = q("#cBeat svg"), sH = q("#cReset svg"), sL = q("#cLayers svg");
mk(sP, "line", { x1: 20, x2: 20, y1: 4, y2: 36, stroke: "#4a4546", "stroke-width": 1.5, "stroke-linecap": "round" });
const pDot = mk(sP, "circle", { cx: 20, cy: 20, r: 5, fill: Y });
const tD = [0, 1, 2, 3].map(i => mk(sT, "circle", { cx: 6 + i * 9, cy: 20, r: 3, fill: W }));
const bD = mk(sB, "circle", { cx: 20, cy: 20, r: 6, fill: "#4a4546" });
const hD = mk(sH, "circle", { cx: 20, cy: 20, r: 6, fill: "none", stroke: "#4a4546", "stroke-width": 1.5 });
const lD = [0, 1, 2, 3].map(i => mk(sL, "circle", { cx: 8 + i * 8, cy: 20, r: 3, fill: "#4a4546" }));
const em = id => q(id + " em");
let lastMeter = 0;
function meters(now) {
  if (now - lastMeter < 33) return; lastMeter = now;
  const on = !!T.main, L = layers();
  q("#cPitch").classList.toggle("dim", !(T.R && !T.R.fist)); q("#cTempo").classList.toggle("dim", !(T.L && !T.L.fist));
  pDot.setAttribute("cy", 34 - T.pitch * 28);
  const m = note(60, deg()); em("#cPitch").textContent = SONG.on ? (T.R ? Math.round(300 * Math.pow(60, T.pitch)) + " hz" : "") : (T.R && !T.base) ? NAMES[m % 12] + (Math.floor(m / 12) - 1) : "";
  const gap = 4 + (bpm - CFG.bpmMin) / (CFG.bpmMax - CFG.bpmMin) * -0 + (1 - (bpm - CFG.bpmMin) / (CFG.bpmMax - CFG.bpmMin)) * 6;
  tD.forEach((c, i) => { c.setAttribute("cx", 20 + (i - 1.5) * (gap + 3)); c.setAttribute("r", (step >> 2) % 4 === i && L ? 4 : 2.5); });
  em("#cTempo").textContent = SONG.on ? SONG.rate.toFixed(2) + "x" : Math.round(bpm) + " bpm";
  bD.setAttribute("r", 5 + flashBeat * 9); bD.setAttribute("fill", flashBeat > 0.1 ? Y : "#4a4546");
  hD.setAttribute("fill", T.base ? Y : "none"); hD.setAttribute("stroke", T.base ? Y : "#4a4546");
  em("#cReset").textContent = T.base ? "basic" : "";
  lD.forEach((c, i) => c.setAttribute("fill", i < L ? (i === L - 1 ? Y : W) : "#4a4546"));
  em("#cLayers").textContent = L ? L + " / 4" : "";
  if (diagOn) diagEl.textContent = `cam ${video.videoWidth}x${video.videoHeight} · body ${(cover0 * 100).toFixed(1)}% · hands ${handList.length} · people ${T.persons} · seg ${segMulti ? "multi" : "basic"}${segCPU ? " cpu" : ""}`;
}

// ---------- boot ----------
const diagEl = document.getElementById("diag"); let diagOn = false, cover0 = 0;
document.getElementById("fsBtn").onclick = () => document.fullscreenElement ? document.exitFullscreen() : stage.requestFullscreen();
addEventListener("keydown", e => {
  if (e.key >= "0" && e.key <= "4") forced = +e.key;
  if (e.key === "d" || e.key === "D") { diagOn = !diagOn; diagEl.classList.toggle("show", diagOn); video.classList.toggle("show", diagOn); }
});
const peek = document.getElementById("peek"); let peekStream = null;
async function preview() {
  try { if (peekStream) peekStream.getTracks().forEach(t => t.stop()); peekStream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: camSel.value ? { exact: camSel.value } : undefined } }); peek.srcObject = peekStream; await peek.play(); } catch (e) { msg("That camera couldn't start. Try another one."); }
}
async function cams() {
  try { const t = await navigator.mediaDevices.getUserMedia({ video: true }); t.getTracks().forEach(x => x.stop()); } catch (e) { msg("Camera permission was blocked. Allow it in the address bar."); return; }
  const d = (await navigator.mediaDevices.enumerateDevices()).filter(x => x.kind === "videoinput");
  camSel.innerHTML = d.map((x, i) => `<option value="${x.deviceId}">${x.label || "Camera " + (i + 1)}</option>`).join("");
  const good = d.find(x => !/\b(ir|infrared|virtual|obs|depth)\b/i.test(x.label)); if (good) camSel.value = good.deviceId;
  preview();
}
camSel.addEventListener("change", preview);
new IntersectionObserver(es => { if (es[0].isIntersecting && camSel.options.length < 2 && !peekStream) cams(); }, { threshold: 0.3 }).observe(stage);
document.getElementById("goBtn").onclick = async () => {
  try {
    msg("Starting camera…");
    if (peekStream) { peekStream.getTracks().forEach(t => t.stop()); peekStream = null; }
    const id = camSel.value;
    video.srcObject = await navigator.mediaDevices.getUserMedia({ video: { deviceId: id ? { exact: id } : undefined, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
    await video.play(); audio();
    await initModels(msg);
    gate.style.display = "none"; resize();
    const loop = now => { try { track(now); } catch (e) { console.error(e); } songTick(); draw(now); meters(now); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  } catch (e) { console.error(e); msg("Error: " + e.message); }
};
resize();
