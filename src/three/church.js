import * as THREE from "three";
import { std, gold, canvasTex, mk, glowTex, mergeStatic } from "./util3d.js";
import { HALL, SANCTUARY, ALTAR_Z, TABERNACLE, MARY, FLOWER_STAND, CANDLE_RACK, AISLE } from "../shared.js";

const W = HALL.halfW * 2;
const D = HALL.zFront - HALL.zBack;
const ZC = (HALL.zFront + HALL.zBack) / 2;
const SPRING = 17; // chân vòm
const COL_X = HALL.halfW - 4;
const COL_Z = [-12, -4.4, 3.2, 10.8, 18.4, 26];
const SY = SANCTUARY.y;

// Seed ngẫu nhiên cố định để cảnh lần nào cũng giống nhau
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function tileTex() {
  return canvasTex(256, 256, (g, w, h) => {
    const n = 4;
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        g.fillStyle = (x + y) % 2 ? "#cbbfa8" : "#e6dcc8";
        g.fillRect((x * w) / n, (y * h) / n, w / n, h / n);
      }
    g.strokeStyle = "rgba(90,70,50,0.35)";
    g.lineWidth = 2;
    for (let i = 0; i <= n; i++) {
      g.beginPath(); g.moveTo((i * w) / n, 0); g.lineTo((i * w) / n, h); g.stroke();
      g.beginPath(); g.moveTo(0, (i * h) / n); g.lineTo(w, (i * h) / n); g.stroke();
    }
  }, [W / 4, D / 4]);
}

function stoneTex(rx, ry) {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = "#e3d8c2";
    g.fillRect(0, 0, w, h);
    const r = rng(7);
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 4; x++) {
        const off = y % 2 ? 32 : 0;
        g.fillStyle = `rgba(150,125,95,${0.06 + r() * 0.1})`;
        g.fillRect(x * 64 + off, y * 32, 62, 30);
      }
    g.strokeStyle = "rgba(120,100,80,0.35)";
    for (let y = 0; y <= 8; y++) {
      g.beginPath(); g.moveTo(0, y * 32); g.lineTo(w, y * 32); g.stroke();
    }
  }, [rx, ry]);
}

// Cửa sổ kính màu vòm nhọn: ô màu + khung chì, ngoài vòm trong suốt
function glassTex(seed) {
  const r = rng(seed);
  const COLORS = ["#1f4fa8", "#2c6fd1", "#b8202a", "#e0a020", "#2f8a4a", "#6a2f8f", "#f0d070", "#1a3a80"];
  return canvasTex(128, 320, (g, w, h) => {
    g.save();
    g.beginPath();
    g.moveTo(4, h - 4);
    g.lineTo(4, 70);
    g.quadraticCurveTo(4, 8, w / 2, 4);
    g.quadraticCurveTo(w - 4, 8, w - 4, 70);
    g.lineTo(w - 4, h - 4);
    g.closePath();
    g.clip();
    const cw = w / 4, ch = h / 12;
    for (let y = 0; y < 12; y++)
      for (let x = 0; x < 4; x++) {
        g.fillStyle = COLORS[Math.floor(r() * COLORS.length)];
        g.fillRect(x * cw, y * ch, cw, ch);
      }
    // huy hiệu tròn ở giữa
    g.fillStyle = "#f3e2a0";
    g.beginPath(); g.arc(w / 2, h * 0.42, 30, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#b8202a";
    g.beginPath(); g.arc(w / 2, h * 0.42, 18, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "#1a1410";
    g.lineWidth = 3;
    for (let x = 0; x <= 4; x++) { g.beginPath(); g.moveTo(x * cw, 0); g.lineTo(x * cw, h); g.stroke(); }
    for (let y = 0; y <= 12; y++) { g.beginPath(); g.moveTo(0, y * ch); g.lineTo(w, y * ch); g.stroke(); }
    g.restore();
    g.strokeStyle = "#5a4a38";
    g.lineWidth = 6;
    g.beginPath();
    g.moveTo(4, h - 4); g.lineTo(4, 70); g.quadraticCurveTo(4, 8, w / 2, 4); g.quadraticCurveTo(w - 4, 8, w - 4, 70); g.lineTo(w - 4, h - 4); g.closePath();
    g.stroke();
  });
}

// Cửa sổ hoa hồng tròn
function roseTex() {
  return canvasTex(256, 256, (g, w, h) => {
    const cx = w / 2, cy = h / 2;
    g.fillStyle = "#4a3a2a";
    g.beginPath(); g.arc(cx, cy, 126, 0, Math.PI * 2); g.fill();
    const ring = (rad, n, colors) => {
      for (let i = 0; i < n; i++) {
        const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
        g.fillStyle = colors[i % colors.length];
        g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, rad, a0, a1); g.closePath(); g.fill();
      }
    };
    ring(118, 24, ["#1f4fa8", "#b8202a", "#2c6fd1", "#e0a020"]);
    ring(80, 12, ["#6a2f8f", "#2f8a4a", "#1a3a80"]);
    ring(40, 8, ["#f0d070", "#e0a020"]);
    g.strokeStyle = "#1a1410";
    g.lineWidth = 3;
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * 120, cy + Math.sin(a) * 120); g.stroke();
    }
    for (const rr of [40, 80, 118]) { g.beginPath(); g.arc(cx, cy, rr, 0, Math.PI * 2); g.stroke(); }
  });
}

const glassMat = (tex) => new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, toneMapped: false });
const flameMat = (color, opacity = 0.95) => new THREE.SpriteMaterial({ map: glowTex(color), transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });

export function buildChurch(scene) {
  const root = new THREE.Group();
  const stat = new THREE.Group(); // phần tĩnh, gộp mesh sau khi dựng
  root.add(stat);
  scene.add(root);

  const marble = std(0xf1ebe0, { roughness: 0.35 });
  const stone = std(0xffffff, { map: stoneTex(6, 10), roughness: 0.9 });
  const wood = std(0x4a2a18, { roughness: 0.7 });
  const red = std(0x8a1620, { roughness: 0.95 });
  const gd = gold();

  // Sàn + thảm đỏ lối giữa
  mk(new THREE.PlaneGeometry(W, D), std(0xffffff, { map: tileTex(), roughness: 0.55 }), [0, 0, ZC], stat).rotation.x = -Math.PI / 2;
  mk(new THREE.PlaneGeometry(AISLE * 2 - 0.8, HALL.zFront - SANCTUARY.zFront), red, [0, 0.015, (HALL.zFront + SANCTUARY.zFront) / 2], stat).rotation.x = -Math.PI / 2;

  // Tường hai bên + cửa sổ kính màu
  for (const s of [-1, 1]) {
    const wall = mk(new THREE.PlaneGeometry(D, 34), stone, [s * HALL.halfW, 17, ZC], stat);
    wall.rotation.y = -s * Math.PI / 2;
    for (let i = 0; i < COL_Z.length - 1; i++) {
      const z = (COL_Z[i] + COL_Z[i + 1]) / 2;
      const win = mk(new THREE.PlaneGeometry(3.4, 8.5), glassMat(glassTex(i * 7 + (s > 0 ? 3 : 0))), [s * (HALL.halfW - 0.05), 9.5, z], root);
      win.rotation.y = -s * Math.PI / 2;
    }
  }

  // Cột + vòm nhọn nối các cột
  const colGeo = new THREE.CylinderGeometry(0.7, 0.8, SPRING, 20);
  const capGeo = new THREE.BoxGeometry(1.9, 0.6, 1.9);
  const baseGeo = new THREE.BoxGeometry(2, 0.5, 2);
  const archGeo = new THREE.TorusGeometry(3.8, 0.4, 8, 24, Math.PI);
  for (const s of [-1, 1]) {
    for (const z of COL_Z) {
      mk(colGeo, stone, [s * COL_X, SPRING / 2, z], stat);
      mk(capGeo, stone, [s * COL_X, SPRING, z], stat);
      mk(baseGeo, stone, [s * COL_X, 0.25, z], stat);
    }
    for (let i = 0; i < COL_Z.length - 1; i++) {
      const a = mk(archGeo, stone, [s * COL_X, SPRING, (COL_Z[i] + COL_Z[i + 1]) / 2], stat);
      a.rotation.y = Math.PI / 2;
    }
  }

  // Trần vòm + trần phẳng hai gian bên
  const vault = mk(new THREE.CylinderGeometry(COL_X, COL_X, D, 40, 1, true, -Math.PI / 2, Math.PI), std(0xf3ead6, { side: THREE.DoubleSide, roughness: 0.9 }), [0, SPRING, ZC], stat);
  vault.rotation.x = -Math.PI / 2;
  for (const s of [-1, 1]) mk(new THREE.PlaneGeometry(HALL.halfW - COL_X, D), std(0xe9dfc8, { side: THREE.DoubleSide }), [s * (COL_X + (HALL.halfW - COL_X) / 2), SPRING + 0.3, ZC], stat).rotation.x = Math.PI / 2;
  // Sườn vòm
  const ribGeo = new THREE.TorusGeometry(COL_X, 0.25, 6, 40, Math.PI);
  for (const z of COL_Z) mk(ribGeo, std(0xcdbb98), [0, SPRING, z], stat);

  // Tường cung thánh + cửa sổ hoa hồng + 2 cửa sổ cao
  mk(new THREE.PlaneGeometry(W, 34), stone, [0, 17, HALL.zBack], stat);
  mk(new THREE.CircleGeometry(4.6, 48), glassMat(roseTex()), [0, 22.5, HALL.zBack + 0.06], root);
  for (const x of [-10, 10]) mk(new THREE.PlaneGeometry(3.2, 8), glassMat(glassTex(x > 0 ? 91 : 57)), [x, 11, HALL.zBack + 0.06], root);

  // Gian cung thánh nâng cao + 3 bậc
  const sanDepth = SANCTUARY.zFront - HALL.zBack;
  mk(new THREE.BoxGeometry(W, SY, sanDepth), marble, [0, SY / 2, HALL.zBack + sanDepth / 2], stat);
  for (let i = 0; i < 3; i++) {
    const h = SY * (1 - i / 3);
    mk(new THREE.BoxGeometry(W * 0.6, h, 0.45), marble, [0, h / 2, SANCTUARY.zFront + 0.22 + i * 0.45], stat);
  }

  // Bàn thờ phủ khăn trắng + nến
  mk(new THREE.BoxGeometry(5, 1.1, 1.8), marble, [0, SY + 0.55, ALTAR_Z], stat);
  mk(new THREE.BoxGeometry(5.3, 0.06, 2), std(0xffffff, { roughness: 1 }), [0, SY + 1.13, ALTAR_Z], stat);
  mk(new THREE.BoxGeometry(5.3, 0.55, 0.04), std(0xfbf8f0, { roughness: 1 }), [0, SY + 0.85, ALTAR_Z + 1.01], stat);
  mk(new THREE.BoxGeometry(5.3, 0.08, 0.05), gd, [0, SY + 0.6, ALTAR_Z + 1.03], stat);
  for (const x of [-2, -1.2, 1.2, 2]) {
    mk(new THREE.CylinderGeometry(0.07, 0.12, 0.5, 10), gd, [x, SY + 1.4, ALTAR_Z - 0.3], stat);
    mk(new THREE.CylinderGeometry(0.06, 0.06, 0.45, 10), std(0xfffbef), [x, SY + 1.87, ALTAR_Z - 0.3], stat);
    const f = new THREE.Sprite(flameMat("255,200,120"));
    f.scale.set(0.5, 0.7, 1);
    f.position.set(x, SY + 2.2, ALTAR_Z - 0.3);
    root.add(f);
  }

  // Phông sau + thánh giá (đơn giản, trang nghiêm)
  mk(new THREE.BoxGeometry(10, 15, 0.3), std(0x5a1418, { roughness: 0.9 }), [0, SY + 7.5, HALL.zBack + 0.4], stat);
  for (const [w, h, x, y] of [[10.4, 0.4, 0, SY + 15], [0.4, 15, -5.2, SY + 7.5], [0.4, 15, 5.2, SY + 7.5]]) mk(new THREE.BoxGeometry(w, h, 0.4), gd, [x, y, HALL.zBack + 0.45], stat);
  const crossMat = std(0x3a2214, { roughness: 0.6 });
  mk(new THREE.BoxGeometry(0.5, 9, 0.35), crossMat, [0, SY + 7.8, HALL.zBack + 0.8], stat);
  mk(new THREE.BoxGeometry(4.2, 0.5, 0.35), crossMat, [0, SY + 9.6, HALL.zBack + 0.8], stat);
  const crossGlow = new THREE.Sprite(flameMat("255,230,170", 0.35));
  crossGlow.scale.set(9, 11, 1);
  crossGlow.position.set(0, SY + 8.5, HALL.zBack + 0.6);
  root.add(crossGlow);

  // Nhà Tạm + đèn chầu đỏ
  mk(new THREE.BoxGeometry(1.8, 1.6, 1.2), marble, [TABERNACLE.x, SY + 0.8, TABERNACLE.z], stat);
  mk(new THREE.BoxGeometry(1.2, 1.3, 0.9), gd, [TABERNACLE.x, SY + 2.25, TABERNACLE.z], stat);
  mk(new THREE.BoxGeometry(0.08, 0.5, 0.08), gd, [TABERNACLE.x, SY + 3.15, TABERNACLE.z], stat);
  mk(new THREE.BoxGeometry(0.3, 0.08, 0.08), gd, [TABERNACLE.x, SY + 3.25, TABERNACLE.z], stat);
  const lampPos = new THREE.Vector3(TABERNACLE.x + 2.4, SY + 2.6, TABERNACLE.z + 0.5);
  mk(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 8), gd, [lampPos.x, SY + 1.2, lampPos.z], stat);
  mk(new THREE.CylinderGeometry(0.2, 0.15, 0.4, 14), new THREE.MeshBasicMaterial({ color: 0xc81e1e }), [lampPos.x, lampPos.y, lampPos.z], root);
  const lamp = new THREE.Sprite(flameMat("255,40,30", 0.6));
  lamp.scale.set(1.4, 1.4, 1);
  lamp.position.copy(lampPos);
  root.add(lamp);
  const tabGlow = new THREE.Sprite(flameMat("255,225,150", 0));
  tabGlow.scale.set(4, 4, 1);
  tabGlow.position.set(TABERNACLE.x, SY + 2.3, TABERNACLE.z + 0.6);
  root.add(tabGlow);

  // Tượng Đức Mẹ: áo trắng, khăn choàng xanh, quầng vàng
  const mary = new THREE.Group();
  mary.position.set(MARY.x, 0, MARY.z);
  root.add(mary);
  mk(new THREE.BoxGeometry(1.7, 1.8, 1.7), marble, [0, 0.9, 0], mary);
  const V = (pts) => pts.map(([r, y]) => new THREE.Vector2(r, y));
  mk(new THREE.LatheGeometry(V([[0, 1.8], [0.62, 1.8], [0.55, 2.6], [0.42, 3.6], [0.3, 4.15], [0, 4.2]]), 28), std(0xf7f3ea, { roughness: 0.8 }), [0, 0, 0], mary);
  const mantle = mk(new THREE.LatheGeometry(V([[0.7, 1.95], [0.64, 2.7], [0.5, 3.6], [0.38, 4.2], [0.36, 4.55]]), 28, Math.PI * 0.62, Math.PI * 1.76), std(0x2f5fa8, { roughness: 0.8, side: THREE.DoubleSide }), [0, 0, 0], mary);
  mantle.rotation.y = Math.PI;
  mk(new THREE.SphereGeometry(0.32, 20, 16), std(0xf2d2b4, { roughness: 0.6 }), [0, 4.55, 0.02], mary);
  mk(new THREE.SphereGeometry(0.36, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.6), std(0x2f5fa8, { roughness: 0.8 }), [0, 4.6, -0.04], mary);
  mk(new THREE.SphereGeometry(0.13, 12, 10), std(0xf2d2b4), [0, 3.5, 0.45], mary); // tay chắp
  mk(new THREE.TorusGeometry(0.62, 0.04, 8, 40), gd, [0, 4.65, -0.35], mary);
  const maryGlow = new THREE.Sprite(flameMat("200,220,255", 0.15));
  maryGlow.scale.set(4, 5.5, 1);
  maryGlow.position.set(0, 3.4, -0.3);
  mary.add(maryGlow);

  // Bàn hoa trước tượng: hoa thêm dần khi dâng hoa (tối đa 40, bỏ bông cũ nhất)
  mk(new THREE.BoxGeometry(2.6, 0.8, 0.9), wood, [FLOWER_STAND.x, 0.4, FLOWER_STAND.z], stat);
  const flowerGeo = new THREE.SphereGeometry(0.14, 10, 8);
  const flowerMats = [0xffffff, 0xf7b6c8, 0xffe08a, 0xe86a8a].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 }));
  const flowerGroup = new THREE.Group();
  root.add(flowerGroup);
  const fr = rng(11);
  const flowers = {
    add() {
      if (flowerGroup.children.length >= 40) flowerGroup.remove(flowerGroup.children[0]);
      const m = new THREE.Mesh(flowerGeo, flowerMats[Math.floor(fr() * flowerMats.length)]);
      m.position.set(FLOWER_STAND.x + (fr() - 0.5) * 2.3, 0.86 + fr() * 0.25, FLOWER_STAND.z + (fr() - 0.5) * 0.7);
      flowerGroup.add(m);
      return m.position;
    },
    target: () => new THREE.Vector3(FLOWER_STAND.x, 1.1, FLOWER_STAND.z),
    reset: () => flowerGroup.clear(),
  };

  // Giá nến khấn 3 tầng × 8 nến
  const slots = [];
  const candleGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.28, 8);
  const candleMat = std(0xfff6e0);
  for (let t = 0; t < 3; t++) {
    const y = 0.6 + t * 0.35, z = CANDLE_RACK.z + 0.35 - t * 0.35;
    mk(new THREE.BoxGeometry(2.8, 0.1, 0.4), gd, [CANDLE_RACK.x, y, z], stat);
    mk(new THREE.BoxGeometry(0.08, y, 0.08), gd, [CANDLE_RACK.x - 1.35, y / 2, z], stat);
    mk(new THREE.BoxGeometry(0.08, y, 0.08), gd, [CANDLE_RACK.x + 1.35, y / 2, z], stat);
    for (let i = 0; i < 8; i++) {
      const x = CANDLE_RACK.x - 1.2 + i * (2.4 / 7);
      mk(candleGeo, candleMat, [x, y + 0.19, z], stat);
      const f = new THREE.Sprite(flameMat("255,190,90", 0));
      f.scale.set(0.35, 0.5, 1);
      f.position.set(x, y + 0.42, z);
      root.add(f);
      slots.push({ f, life: 0, ph: i * 1.7 + t });
    }
  }
  const BURN = 8 * 60; // nến khấn sáng 8 phút rồi tắt dần
  const candles = {
    // Thắp 1 nến: ô trống đầu tiên, hết chỗ thì thay nến sắp tàn nhất
    light() {
      let s = slots.find((x) => x.life <= 0);
      if (!s) s = slots.reduce((a, b) => (a.life < b.life ? a : b));
      s.life = BURN;
      return s.f.position;
    },
    lightAll() {
      for (const s of slots) s.life = Math.max(s.life, BURN);
    },
    get lit() {
      return slots.filter((s) => s.life > 0).length;
    },
    reset() {
      for (const s of slots) s.life = 0;
    },
  };

  // Bình nước thánh ở đầu lối đi
  const holyWater = new THREE.Vector3(-AISLE - 0.6, 1.1, HALL.zFront - 4);
  mk(new THREE.CylinderGeometry(0.15, 0.25, 1, 12), marble, [holyWater.x, 0.5, holyWater.z], stat);
  mk(new THREE.SphereGeometry(0.4, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), marble, [holyWater.x, 1.15, holyWater.z], stat);

  // Đèn chùm dọc lối giữa
  const bulbs = [];
  for (const z of [4, 16]) {
    mk(new THREE.CylinderGeometry(0.04, 0.04, 8, 6), gd, [0, 24, z], stat);
    mk(new THREE.TorusGeometry(1.5, 0.08, 8, 32), gd, [0, 20, z], stat).rotation.x = Math.PI / 2;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const b = new THREE.Sprite(flameMat("255,215,150", 0.85));
      b.scale.set(0.9, 0.9, 1);
      b.position.set(Math.cos(a) * 1.5, 20.25, z + Math.sin(a) * 1.5);
      root.add(b);
      bulbs.push(b);
    }
  }

  // Ánh sáng: ấm, hơi chếch như nắng qua cửa sổ
  const hemi = new THREE.HemisphereLight(0xfff1dc, 0x6a5040, 1.0);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe2b8, 1.6);
  sun.position.set(-30, 50, 25);
  sun.target.position.set(0, 0, -6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 40, bottom: -40, near: 1, far: 160 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.05;
  scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight(0x9ab8ff, 0.35); // ánh kính màu xanh từ phía phải
  fill.position.set(30, 20, 0);
  scene.add(fill);

  mergeStatic(stat);
  // Ghế, người không đổ bóng; chỉ cột/tượng/bàn thờ (mergeStatic đã bật castShadow phần thấp)

  let t = 0;
  // Hiệu ứng đặt các mức 0..1 này; update() vẽ theo.
  const boost = { lamp: 0, tab: 0, mary: 0, dim: 0 };
  return {
    root,
    boost,
    lights: { hemi, sun, fill },
    mary: { group: mary, top: new THREE.Vector3(MARY.x, 5.2, MARY.z) },
    flowers,
    candles,
    holyWater,
    tabernacle: new THREE.Vector3(TABERNACLE.x, SY + 2.3, TABERNACLE.z),
    update(dt) {
      t += dt;
      for (const s of slots) {
        if (s.life > 0) s.life -= dt;
        const k = Math.min(1, Math.max(0, s.life) / 20); // 20s cuối tắt dần
        s.f.material.opacity = k * (0.8 + Math.sin(t * 9 + s.ph) * 0.12);
      }
      lamp.material.opacity = 0.55 + boost.lamp * 0.45 + Math.sin(t * 3) * 0.04;
      lamp.scale.setScalar(1.4 + boost.lamp * 1.2);
      tabGlow.material.opacity = boost.tab * 0.8;
      maryGlow.material.opacity = 0.15 + boost.mary * 0.6;
      hemi.intensity = 1.0 - boost.dim * 0.45;
      sun.intensity = 1.6 - boost.dim * 0.9;
      crossGlow.material.opacity = 0.35 + boost.tab * 0.25;
      for (let i = 0; i < bulbs.length; i++) bulbs[i].material.opacity = 0.8 + Math.sin(t * 2 + i) * 0.05;
    },
  };
}
