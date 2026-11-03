// Âm thanh WebAudio, 2 kênh: nhạc nền (lặp liên tục) + hiệu ứng (chuông nhỏ, vút, bùm).
// Nhạc nền lấy từ public/audio/nhac-nen.mp3; thiếu file thì tự tổng hợp hợp âm nhẹ.

const MAX_FX = 3;
// Vòng hợp âm chậm: C - Am - F - G (tần số Hz)
const CHORDS = [
  [130.81, 196.0, 261.63, 329.63],
  [110.0, 164.81, 220.0, 261.63],
  [87.31, 174.61, 220.0, 261.63],
  [98.0, 146.83, 246.94, 293.66],
];

export function createAudio() {
  let ctx = null;
  let bg, fx, duck;
  let fxEnd = []; // thời điểm kết thúc của các âm nghi thức đang phát
  const files = {};
  let vol = { bg: 0.5, fx: 0.8 };

  async function loadFile(name) {
    try {
      const r = await fetch(`./audio/${name}.mp3`);
      if (!r.ok) return;
      files[name] = await ctx.decodeAudioData(await r.arrayBuffer());
    } catch {}
  }

  // Nhạc nền: file nhac-nen.mp3 lặp liên tục; thiếu file thì organ tổng hợp 4 giọng qua lowpass, đổi hợp âm mỗi 8s
  function startBackground() {
    if (files["nhac-nen"]) {
      const src = ctx.createBufferSource();
      src.buffer = files["nhac-nen"];
      src.loop = true;
      src.connect(duck);
      src.start();
      return;
    }
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 900;
    const g = ctx.createGain();
    g.gain.value = 0.07;
    lp.connect(g).connect(duck);
    const voices = CHORDS[0].map((f, i) => {
      const o = ctx.createOscillator();
      o.type = i % 2 ? "triangle" : "sine";
      o.frequency.value = f;
      o.connect(lp);
      o.start();
      return o;
    });
    let c = 0;
    setInterval(() => {
      c = (c + 1) % CHORDS.length;
      voices.forEach((o, i) => o.frequency.setTargetAtTime(CHORDS[c][i], ctx.currentTime, 0.8));
    }, 8000);
  }

  let noiseBuf = null;
  function noise() {
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1.3, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return noiseBuf;
  }

  // Giới hạn số âm hiệu ứng phát cùng lúc
  function slot(dur) {
    const now = ctx.currentTime;
    fxEnd = fxEnd.filter((t) => t > now);
    if (fxEnd.length >= MAX_FX) return false;
    fxEnd.push(now + dur);
    return true;
  }

  // Nhạc nền giảm còn 30% trong `sec` giây rồi trả lại
  function duckFor(sec) {
    const t = ctx.currentTime;
    duck.gain.cancelScheduledValues(t);
    duck.gain.setTargetAtTime(0.3, t, 0.15);
    duck.gain.setTargetAtTime(1, t + sec, 0.8);
  }

  function tone(freq, start, dur, peak, type = "sine") {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(peak, start + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g).connect(fx);
    o.start(start);
    o.stop(start + dur + 0.05);
  }

  // Chuông nhà thờ: các họa âm lệch tắt dần
  function bellAt(f0, start, gain) {
    for (const [r, a, d] of [[0.5, 0.5, 5], [1, 1, 4], [1.19, 0.5, 3], [1.56, 0.35, 2.5], [2, 0.4, 2], [2.51, 0.2, 1.5], [3.01, 0.15, 1.2]]) {
      tone(f0 * r, start, d, a * gain);
    }
  }

  const api = {
    get state() {
      return !ctx ? "locked" : ctx.state === "running" ? "on" : ctx.state;
    },
    // Phải gọi trong sự kiện click (chính sách autoplay của Chrome)
    async unlock() {
      if (ctx) return ctx.resume();
      ctx = new AudioContext();
      bg = ctx.createGain();
      fx = ctx.createGain();
      duck = ctx.createGain();
      duck.connect(bg).connect(ctx.destination);
      fx.connect(ctx.destination);
      api.setVolumes(vol.bg, vol.fx);
      await loadFile("nhac-nen");
      startBackground();
    },
    setVolumes(b, f) {
      vol = { bg: b, fx: f };
      if (!ctx) return;
      bg.gain.value = b;
      fx.gain.value = f;
    },
    chime(gain = 0.5) {
      if (!ctx || !slot(2)) return;
      bellAt(880, ctx.currentTime, gain * 0.25);
    },
    // Tiếng "vút" khi điều ước bay lên: nhiễu trắng qua lọc quét lên
    whoosh() {
      if (!ctx || !slot(1.2)) return;
      const t = ctx.currentTime;
      const src = ctx.createBufferSource();
      src.buffer = noise();
      const f = ctx.createBiquadFilter();
      f.type = "bandpass";
      f.Q.value = 1.2;
      f.frequency.setValueAtTime(300, t);
      f.frequency.exponentialRampToValueAtTime(2600, t + 0.9);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.22, t + 0.15);
      g.gain.exponentialRampToValueAtTime(0.001, t + 1);
      src.connect(f).connect(g).connect(fx);
      src.start(t);
      src.stop(t + 1.05);
    },
    // Tiếng "bùm" pháo hoa: nhịp trầm + nhiễu tắt dần, nhạc nền nhỏ đi một chút
    boom() {
      if (!ctx || !slot(1.5)) return;
      duckFor(1.2);
      const t = ctx.currentTime;
      tone(70, t, 0.6, 0.35);
      const src = ctx.createBufferSource();
      src.buffer = noise();
      const f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = 1800;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.25, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
      src.connect(f).connect(g).connect(fx);
      src.start(t);
      src.stop(t + 1.25);
    },
  };
  return api;
}
