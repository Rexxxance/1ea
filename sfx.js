// Shared sound engine: real drum + piano samples (CC0 Sonic Pi kit, Salamander piano), loud and clean
(function () {
  const KIT = ["drum_heavy_kick", "drum_bass_hard", "drum_snare_hard", "drum_snare_soft", "drum_cymbal_closed", "drum_cymbal_open", "drum_tom_mid_hard", "drum_tom_hi_hard", "drum_tom_lo_hard", "perc_snap", "perc_snap2", "tbd_perc_tap_1", "elec_wood", "bass_hard_c", "drum_cowbell"];
  const PIANO = { 45: "A2", 48: "C3", 51: "Ds3", 54: "Fs3", 57: "A3", 60: "C4", 63: "Ds4", 66: "Fs4", 69: "A4", 72: "C5", 75: "Ds5", 78: "Fs5", 81: "A5", 84: "C6" };
  let AC, master, out = null, buf = {}, lead = {}, loading = null, unlocked = false;
  const listeners = [];

  function ctx() {
    if (!AC) {
      AC = new (window.AudioContext || window.webkitAudioContext)();
      const comp = AC.createDynamicsCompressor();
      comp.threshold.value = -10; comp.knee.value = 6; comp.ratio.value = 6; comp.attack.value = 0.003; comp.release.value = 0.15;
      const makeup = AC.createGain(); makeup.gain.value = 1.6;
      master = AC.createGain(); master.gain.value = 1;
      master.connect(comp); comp.connect(makeup); makeup.connect(AC.destination);
    }
    return AC;
  }
  async function load() {
    if (loading) return loading;
    ctx();
    const get = async (name, file) => { try { const r = await fetch("sfx/" + file); const b = await AC.decodeAudioData(await r.arrayBuffer()); buf[name] = b;
        // skip the silent lead-in (mp3 padding) so every hit lands exactly on its time
        const d = b.getChannelData(0); let i = 0; while (i < d.length && Math.abs(d[i]) < 0.008) i++;
        lead[name] = Math.max(0, i / b.sampleRate - 0.001); } catch (e) { console.warn("sfx missing", file); } };
    loading = Promise.all([...KIT.map(k => get(k, k + ".flac")), ...Object.entries(PIANO).map(([m, n]) => get("p" + m, "piano_" + n + ".mp3"))]);
    return loading;
  }
  function unlock() {
    ctx(); if (AC.state === "suspended") AC.resume();
    if (!unlocked) { unlocked = true; load(); listeners.forEach(f => f()); }
  }
  ["pointerdown", "keydown", "touchstart"].forEach(ev => addEventListener(ev, unlock, { passive: true }));

  function play(name, t, vel = 1, rate = 1, dur) {
    const b = buf[name]; if (!b || !AC) return;
    const s = AC.createBufferSource(), g = AC.createGain();
    s.buffer = b; s.playbackRate.value = rate; g.gain.value = vel;
    s.connect(g); g.connect(out || master); s.start(t, lead[name] || 0);
    if (dur) { g.gain.setValueAtTime(vel, t + dur); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.35); s.stop(t + dur + 0.4); }
  }
  function piano(m, t, dur = 0.5, vel = 0.9) {
    const keys = Object.keys(PIANO).map(Number); let best = keys[0];
    keys.forEach(k => { if (Math.abs(k - m) < Math.abs(best - m)) best = k; });
    play("p" + best, t, vel * 1.4, Math.pow(2, (m - best) / 12), Math.max(0.25, dur));
  }
  const D = {
    kick: (t, v = 1) => play("drum_heavy_kick", t, 1.3 * v),
    kick2: (t, v = 1) => play("drum_bass_hard", t, 1.2 * v),
    snare: (t, v = 1) => play("drum_snare_hard", t, 1.0 * v),
    snareSoft: (t, v = 1) => play("drum_snare_soft", t, 1.1 * v),
    hat: (t, v = 1) => play("drum_cymbal_closed", t, 0.8 * v),
    open: (t, v = 1) => play("drum_cymbal_open", t, 0.6 * v),
    clap: (t, v = 1) => { play("perc_snap", t, 1.2 * v); play("perc_snap2", t + 0.006, 0.9 * v); play("drum_snare_soft", t, 0.45 * v); },
    snap: (t, v = 1) => play("perc_snap", t, 1.3 * v),
    tap: (t, v = 1) => play("tbd_perc_tap_1", t, 1.3 * v),
    wood: (t, v = 1) => play("elec_wood", t, 1.1 * v),
    tom: (t, v = 1, w = "mid") => play("drum_tom_" + w + "_hard", t, 1.1 * v),
    hit: (t, v = 1) => { play("drum_heavy_kick", t, 1.3 * v); play("drum_snare_hard", t, 0.9 * v); play("drum_cymbal_open", t, 0.35 * v); },
    click: (t, acc) => acc ? (play("drum_heavy_kick", t, 0.9), play("drum_cymbal_closed", t, 0.6)) : play("drum_cymbal_closed", t, 0.45),
    bass: (t, m, dur) => play("bass_hard_c", t, 0.9, Math.pow(2, (m - 36) / 12), dur),
  };
  window.SFX = { ctx, load, unlock, piano, play, D, get ready() { return unlocked; }, get AC() { return ctx(); }, get master() { ctx(); return master; }, onUnlock: f => listeners.push(f), setOut: n => { out = n; } };
})();
