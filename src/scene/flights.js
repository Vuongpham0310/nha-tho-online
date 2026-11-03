import { labels, labelKey } from "./assets.js";
import { timeline, rand, ease } from "./fx.js";
import { W, H, SKY_TOP, TREE, TREE_TOP } from "../layout.js";
import { clip } from "../text.js";
import { EFFECT } from "../wishes.js";

const lerp = (a, b, k) => a + (b - a) * k;

// Hiệu ứng: điều ước bay lên trời, mốc cộng đồng, combo, lên cấp, treo điều ước.
// takeWish(key) → { x, y, text } | null : gỡ điều ước khỏi cây, trả vị trí xuất phát.
export function createFlights({ tex, fx, tree, audio, takeWish, avatarHead }) {
  // Một vật bay + nhãn "Tên: điều ước" đi theo; trail: kiểu vệt sau đuôi
  function fly({ img, size, from, path, dur, text, trail, z = 70, onTop }) {
    const v = fx.spawn({ tex: img, x: from[0], y: from[1], life: dur, size, additive: false, path, z, fadeIn: 0.05 });
    let lk = null, lbl = null;
    if (text) {
      lk = labelKey(clip(text, 34));
      const l = labels.acquire(lk);
      lbl = fx.spawn({ tex: l.tex, x: from[0], y: from[1], life: dur, size: 30, additive: false, z: z + 1, fadeIn: 0.05, path: (k) => { const [x, y] = path(k); return [x, y + size * 0.75]; }, release: () => labels.release(lk) });
      if (!lbl) labels.release(lk);
    }
    let px = from[0], py = from[1], acc = 0, done = false;
    return {
      tick(dt) {
        if (!v || done) return;
        // Quay theo hướng bay (máy bay, hạc)
        if (trail === "sparkle" || trail === "pink") v.m.rotation.z = Math.atan2(-(v.y - py), v.x - px) * 0.6;
        acc += dt;
        while (acc > 0.05) {
          acc -= 0.05;
          if (trail === "fire") fx.spawn({ tex: tex.glowFire, x: v.x + rand(10), y: v.y + size * 0.5, vy: 120, life: 0.6, size: 40, sizeEnd: 8, z: z - 1 });
          else if (trail === "pink") fx.spawn({ tex: tex.glowPink, x: v.x, y: v.y, vx: rand(30), vy: 30, life: 0.9, size: 18, sizeEnd: 4, z: z - 1 });
          else if (trail === "gold") fx.spawn({ tex: tex.glowGold, x: v.x, y: v.y + size * 0.3, vx: rand(20), vy: 20, life: 1, size: 22, sizeEnd: 6, z: z - 1 });
          else fx.spawn({ tex: tex.glowWhite, x: v.x, y: v.y, vx: rand(20), vy: rand(20), life: 0.7, size: 14, sizeEnd: 3, z: z - 1 });
        }
        px = v.x;
        py = v.y;
        if (v.t >= v.life) {
          done = true;
          onTop?.(v.x, v.y);
        }
      },
    };
  }

  // Pháo hoa nổ tại (x, y)
  function burst(x, y, n = 46, glow = tex.glowPink) {
    audio.boom();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, sp = 260 + Math.random() * 120;
      fx.spawn({ tex: i % 3 ? glow : tex.glowGold, x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, ay: 160, life: 1.4, size: 26, sizeEnd: 6 });
    }
  }
  const meteor = (delay = 0, text) => {
    const x0 = -100 + Math.random() * 500, y0 = SKY_TOP + Math.random() * 300, x1 = x0 + 700 + Math.random() * 300, y1 = y0 + 380;
    return fly({ img: tex.star, size: 70, from: [x0, y0], dur: 1.8 + delay, path: (k) => { const q = (k * (1.8 + delay) - delay) / 1.8; return q <= 0 ? [-999, -999] : [lerp(x0, x1, q), lerp(y0, y1, q)]; }, text, trail: "gold" });
  };

  // Lộ trình bay theo từng loại vật
  const PATHS = {
    plane: (x0, y0) => { const x1 = x0 + rand(500); return (k) => [lerp(x0, x1, k) + Math.sin(k * Math.PI * 2) * 90, lerp(y0, SKY_TOP, ease(k))]; },
    "heart-balloon": (x0, y0) => (k) => [x0 + Math.sin(k * 9) * 30, lerp(y0, SKY_TOP - 80, k)],
    crane: (x0, y0) => { const dir = x0 < W / 2 ? 1 : -1; return (k) => [x0 + dir * k * 420 + Math.sin(k * 12) * 12, lerp(y0, SKY_TOP, ease(k))]; },
    lantern: (x0, y0) => (k) => [x0 + Math.sin(k * 6) * 40, lerp(y0, SKY_TOP - 60, k)],
    "hot-air-balloon": (x0, y0) => (k) => [lerp(x0, W / 2 + rand(200), k) + Math.sin(k * 5) * 30, lerp(y0, SKY_TOP - 120, k)],
    rocket: (x0, y0) => (k) => [x0 + Math.sin(k * 20) * 4 * (1 - k), lerp(y0, SKY_TOP + 120, k * k)],
  };
  const LOOK = {
    plane: { img: "plane", size: 70, dur: 3.2, trail: "sparkle" },
    "heart-balloon": { img: "heart-balloon", size: 110, dur: 4, trail: "pink" },
    crane: { img: "crane", size: 80, dur: 3.6, trail: "pink" },
    lantern: { img: "lantern", size: 100, dur: 5.5, trail: "gold" },
    "hot-air-balloon": { img: "hot-air-balloon", size: 190, dur: 6.5, trail: "gold" },
    rocket: { img: "rocket", size: 150, dur: 2.6, trail: "fire" },
  };

  // Điểm xuất phát + chữ trên nhãn cho từng người
  function origin(u) {
    const w = takeWish(u.key);
    if (w) return { from: [w.x, w.y], text: `${u.nickname}: ${w.text}` };
    const head = avatarHead(u.key);
    return { from: head ?? [W / 2 + rand(300), H * 0.66], text: `Điều ước của ${u.nickname}` };
  }

  // Hiệu ứng của một mục hàng đợi quà (đã gộp): tối đa 3 vật bay, người dư chỉ gỡ ước khỏi cây
  function startGift(entry) {
    const id = entry.ritualId;
    const flying = [];
    const users = entry.users;
    users.slice(3).forEach((u) => takeWish(u.key));
    const steps = users.slice(0, 3).map((u, i) => ({
      at: i * 0.45,
      fn: () => {
        const { from, text } = origin(u);
        audio.whoosh();
        if (PATHS[id]) {
          const L = LOOK[id];
          flying.push(fly({ img: tex[L.img], size: L.size, from, path: PATHS[id](from[0], from[1]), dur: L.dur, text, trail: L.trail, onTop: id === "rocket" ? (x, y) => burst(x, y, 60) : undefined }));
          if (id === "lantern") for (let j = 0; j < 3; j++) flying.push(fly({ img: tex.lantern, size: 60, from: [from[0] + rand(240), from[1] + 60 + Math.random() * 80], path: PATHS.lantern(from[0] + rand(240), from[1] + 80), dur: L.dur + j * 0.4, trail: "gold" }));
        } else if (id === "firework") {
          flying.push(fly({ img: tex.glowGold, size: 40, from, path: (k) => [from[0], lerp(from[1], SKY_TOP + 250, ease(k))], dur: 1.1, text, trail: "gold", onTop: (x, y) => burst(x, y, 60, tex.glowPink) }));
          [0.9, 1.5, 2.1, 2.6].forEach((at, j) => steps.push({ at: at + i * 0.45, fn: () => burst(150 + Math.random() * (W - 300), SKY_TOP + 120 + Math.random() * 320, 40, j % 2 ? tex.glowBlue : tex.glowPink) }));
        } else if (id === "meteor") {
          flying.push(meteor(0, text), meteor(0.4), meteor(0.8));
        } else if (id === "bloom") {
          tree.shake(0.04, 2.5);
          tree.bloom(80);
          flying.push(fly({ img: tex.star, size: 90, from, path: (k) => [lerp(from[0], W / 2, k), lerp(from[1], SKY_TOP + 60, ease(k))], dur: 2, text, trail: "gold" }));
          for (let j = 0; j < 8; j++) flying.push(meteor(1 + j * 0.5));
        }
      },
    }));
    const dur = { plane: 4, "heart-balloon": 5, crane: 4.5, lantern: 6.5, "hot-air-balloon": 7.5, rocket: 4.2, firework: 4.6, meteor: 3.5, bloom: 8 }[id] ?? 4;
    return timeline(dur + (Math.min(3, users.length) - 1) * 0.45, { steps, tick: (k, dt) => flying.forEach((f) => f.tick(dt)) });
  }

  // Các màn đặc biệt (mốc cộng đồng, combo, spotlight)
  function startSpecial(entry) {
    const flying = [];
    const tick = (k, dt) => flying.forEach((f) => f.tick(dt));
    const u = entry.users[0];
    switch (entry.ritualId) {
      case "milestone-0": // Rung cây: bụi tiên rơi
        tree.shake(0.05, 2.5);
        audio.chime(0.8);
        return timeline(4, { tick: (k, dt) => { for (let i = 0; i < 4; i++) fx.spawn({ tex: tex.glowGold, x: Math.random() * W, y: TREE_TOP + Math.random() * 200, vx: rand(40), vy: 140 + Math.random() * 80, life: 3, size: 18, sizeEnd: 6 }); } });
      case "milestone-1": // Hoa nở
        tree.bloom(90);
        return timeline(5, { tick: (k, dt) => { for (let i = 0; i < 3; i++) fx.spawn({ tex: tex.petal, x: Math.random() * W, y: -20, vx: rand(80), vy: 120 + Math.random() * 60, life: 6, size: 26, additive: false, spin: rand(4) }); } });
      case "milestone-2": // Đèn lồng sáng
        tree.lightLanterns();
        for (let i = 0; i < 8; i++) flying.push(fly({ img: tex.lantern, size: 70, from: [80 + i * 130, H * 0.7], path: PATHS.lantern(80 + i * 130, H * 0.7 + rand(80)), dur: 6 + rand(1), trail: "gold" }));
        return timeline(7, { tick });
      case "milestone-3": // Đàn hạc giấy bay ngang trời
        for (let i = 0; i < 12; i++) {
          const y = SKY_TOP + 180 + Math.abs(i - 5.5) * 28;
          flying.push(fly({ img: tex.crane, size: 70, from: [-120 - Math.abs(i - 5.5) * 60, y], path: (k) => [lerp(-120 - Math.abs(i - 5.5) * 60, W + 200, k), y + Math.sin(k * 10 + i) * 14], dur: 6, trail: "pink" }));
        }
        return timeline(6.5, { tick });
      case "milestone-4": // Mưa sao băng + pháo hoa
        for (let i = 0; i < 24; i++) flying.push(meteor(i * 0.25));
        return timeline(9, { tick, steps: [1.5, 3, 4.5, 6, 7.5].map((at) => ({ at, fn: () => burst(150 + Math.random() * (W - 300), SKY_TOP + 150 + Math.random() * 300, 50, Math.random() < 0.5 ? tex.glowPink : tex.glowBlue) })) });
      case "combo-planes": {
        const head = avatarHead(u.key) ?? [W / 2, H * 0.66];
        for (let i = 0; i < 8; i++) flying.push(fly({ img: tex.plane, size: 55, from: [head[0] + rand(80), head[1]], path: PATHS.plane(head[0] + rand(80), head[1]), dur: 3 + i * 0.15, trail: "sparkle" }));
        audio.whoosh();
        return timeline(4.5, { tick });
      }
      case "combo-lanterns":
        for (let i = 0; i < 10; i++) flying.push(fly({ img: tex.lantern, size: 70, from: [60 + Math.random() * (W - 120), H * 0.72], path: PATHS.lantern(60 + Math.random() * (W - 120), H * 0.72), dur: 5 + Math.random(), trail: "gold" }));
        return timeline(6.5, { tick });
      case "combo-super":
        for (let i = 0; i < 4; i++) flying.push(meteor(i * 0.3, i ? undefined : `${u.nickname}: siêu phóng điều ước`));
        return timeline(3.5, { tick, steps: [{ at: 1.6, fn: () => burst(W / 2, SKY_TOP + 260, 70, tex.glowPink) }] });
      case "spotlight": {
        const { from, text } = origin(u);
        audio.whoosh();
        flying.push(fly({ img: tex.plane, size: 70, from, path: PATHS.plane(from[0], from[1]), dur: 3.5, text, trail: "sparkle" }));
        return timeline(4, { tick });
      }
      case "chat-react":
        tree.shake(0.02, 1.2);
        return timeline(2.5, { tick: () => fx.spawn({ tex: tex.petal, x: TREE.cx + rand(TREE.width * 0.8), y: TREE_TOP + 200 + Math.random() * 300, vx: rand(60), vy: 90, life: 3, size: 24, additive: false, spin: rand(4) }) });
    }
    return null;
  }

  return {
    start: (entry) => (EFFECT[entry.ritualId] ? startGift(entry) : startSpecial(entry)),
    burst,
    // Điều ước mới: thẻ chữ hiện giữa màn hình rồi bay về chỗ treo; xong thì gọi onHung
    hang(text, to, onHung) {
      const lk = labelKey(clip(text, 34), "big");
      const l = labels.acquire(lk);
      const from = [W / 2, 640];
      const p = fx.spawn({ tex: l.tex, x: from[0], y: from[1], life: 1.6, size: 52, sizeEnd: 20, additive: false, z: 90, fadeIn: 0.15, path: (k) => { const q = Math.max(0, (k - 0.35) / 0.65); return [lerp(from[0], to[0], ease(q)), lerp(from[1], to[1], ease(q)) - Math.sin(q * Math.PI) * 60]; }, release: () => labels.release(lk), onDone: () => { onHung(); for (let i = 0; i < 10; i++) fx.spawn({ tex: tex.glowWarm, x: to[0], y: to[1], vx: rand(160), vy: rand(160), life: 0.7, size: 20, sizeEnd: 4 }); } });
      if (!p) {
        labels.release(lk);
        onHung();
      }
      audio.chime(0.35);
    },
    // Lên cấp: vòng sáng vàng toả quanh cây
    levelUp() {
      audio.chime(0.9);
      for (let i = 0; i < 60; i++) {
        const a = (i / 60) * Math.PI * 2;
        fx.spawn({ tex: tex.glowGold, x: TREE.cx, y: TREE_TOP + 380, vx: Math.cos(a) * 420, vy: Math.sin(a) * 300, life: 1.3, size: 30, sizeEnd: 6 });
      }
      tree.shake(0.02, 1);
    },
    cheerSparkle(x, y) {
      for (let i = 0; i < 14; i++) fx.spawn({ tex: tex.glowGold, x, y, vx: rand(220), vy: -80 - Math.random() * 160, ay: 200, life: 1, size: 18, sizeEnd: 4 });
    },
  };
}
