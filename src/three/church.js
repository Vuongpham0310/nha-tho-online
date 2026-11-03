import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { std, gold, canvasTex, mk, glowTex, mergeStatic } from "./util3d.js";
import { angel, wings } from "./statues.js";
import { statueImage } from "./models.js";
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

// Ô cửa hoa văn trắng trên nền tối (sau thánh giá)
function latticeTex() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = "#4a5262";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "#e9e5dc";
    g.lineWidth = 5;
    for (let y = 0; y <= 4; y++)
      for (let x = 0; x <= 4; x++) {
        g.beginPath();
        g.arc(x * 64, y * 64, 32, 0, Math.PI * 2);
        g.stroke();
      }
  }, [3, 3]);
}

// Trụ nối hai điểm (tay, chân tượng, cán chân nến)
function beam(a, b, r, mat, parent) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const m = mk(new THREE.CylinderGeometry(r, r * 0.85, A.distanceTo(B), 10), mat, null, parent);
  m.position.copy(A).add(B).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.sub(A).normalize());
  return m;
}

// Bó hoa hướng dương trong bình vàng
function sunflowers(parent, x, y, z) {
  mk(new THREE.CylinderGeometry(0.22, 0.16, 0.5, 12), gold(), [x, y + 0.25, z], parent);
  const petal = std(0xf2b81c, { roughness: 0.8 });
  const core = std(0x4a2a12, { roughness: 1 });
  for (const [dx, dy] of [[0, 0.95], [-0.32, 0.75], [0.32, 0.78], [-0.15, 0.55], [0.18, 0.55]]) {
    mk(new THREE.CylinderGeometry(0.2, 0.2, 0.04, 14), petal, [x + dx, y + dy, z + 0.1], parent).rotation.x = Math.PI / 2;
    mk(new THREE.CylinderGeometry(0.09, 0.09, 0.05, 10), core, [x + dx, y + dy, z + 0.13], parent).rotation.x = Math.PI / 2;
  }
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

  // Bàn thờ phủ khăn trắng (nến đặt trên bậc phía sau, như ảnh mẫu)
  mk(new THREE.BoxGeometry(5, 1.1, 1.8), marble, [0, SY + 0.55, ALTAR_Z], stat);
  mk(new THREE.BoxGeometry(5.3, 0.06, 2), std(0xffffff, { roughness: 1 }), [0, SY + 1.13, ALTAR_Z], stat);
  mk(new THREE.BoxGeometry(5.3, 0.55, 0.04), std(0xfbf8f0, { roughness: 1 }), [0, SY + 0.85, ALTAR_Z + 1.01], stat);
  mk(new THREE.BoxGeometry(5.3, 0.08, 0.05), gd, [0, SY + 0.6, ALTAR_Z + 1.03], stat);
  for (const s of [-1, 1]) sunflowers(stat, s * 2.1, SY + 1.16, ALTAR_Z + 0.4);

  // Tường trắng sau bàn thờ + ô cửa vòm hoa văn
  const white = std(0xf4f1ea, { roughness: 0.6 });
  mk(new THREE.BoxGeometry(17, 21, 0.4), white, [0, SY + 10.5, HALL.zBack + 0.3], stat);
  const lattice = new THREE.MeshBasicMaterial({ map: latticeTex() });
  mk(new THREE.PlaneGeometry(7, 6), lattice, [0, SY + 10.5, HALL.zBack + 0.52], root);
  mk(new THREE.CircleGeometry(3.5, 32, 0, Math.PI), lattice, [0, SY + 13.5, HALL.zBack + 0.52], root);
  mk(new THREE.TorusGeometry(3.75, 0.3, 8, 32, Math.PI), white, [0, SY + 13.5, HALL.zBack + 0.6], stat);
  for (const s of [-1, 1]) mk(new THREE.BoxGeometry(0.6, 6, 0.4), white, [s * 3.75, SY + 10.5, HALL.zBack + 0.6], stat);

  // Hai cột trắng đầu cột kiểu Côranh
  for (const s of [-1, 1]) {
    const x = s * 7.6, z = HALL.zBack + 1.3;
    mk(new THREE.BoxGeometry(1.6, 1, 1.6), white, [x, SY + 0.5, z], stat);
    mk(new THREE.CylinderGeometry(0.55, 0.6, 14, 20), white, [x, SY + 8, z], stat);
    mk(new THREE.CylinderGeometry(0.95, 0.6, 1.2, 20), white, [x, SY + 15.6, z], stat);
    mk(new THREE.BoxGeometry(2.1, 0.4, 2.1), white, [x, SY + 16.4, z], stat);
    for (const v of [-1, 1]) mk(new THREE.TorusGeometry(0.22, 0.09, 6, 14), white, [x + v * 0.85, SY + 15.8, z + 0.75], stat);
  }

  // Núi Sọ: đá nâu dưới chân thánh giá
  // Đá tròn cạnh, bề mặt gồ ghề tự nhiên, 2 tông nâu
  const rr = rng(23);
  const rocks = [std(0x6e3f24, { roughness: 0.95 }), std(0x5a3220, { roughness: 0.95 })];
  for (let i = 0; i < 14; i++) {
    // Gộp đỉnh trùng để pháp tuyến mượt (Icosahedron mặc định tách đỉnh theo mặt)
    const ico = new THREE.IcosahedronGeometry(1, 3);
    ico.deleteAttribute("normal");
    ico.deleteAttribute("uv");
    const geo = mergeVertices(ico);
    const p = geo.attributes.position;
    const v = new THREE.Vector3();
    for (let j = 0; j < p.count; j++) {
      v.fromBufferAttribute(p, j);
      // Nhiễu theo hướng (không theo đỉnh) để các đỉnh trùng nhau dịch giống nhau, không bị nứt
      const n = 1 + 0.16 * Math.sin(v.x * 3.1 + i) * Math.cos(v.y * 2.7 - i) + 0.07 * Math.sin(v.z * 7 + v.x * 5);
      p.setXYZ(j, v.x * n, v.y * n * 0.72, v.z * n);
    }
    geo.computeVertexNormals();
    const r = 0.9 + rr() * 0.9;
    const m = mk(geo, rocks[i % 2], [(rr() - 0.5) * 8, SY + 2.6 + rr() * 2.2, HALL.zBack + 1.6 + rr() * 0.9], stat);
    m.scale.setScalar(r);
    m.rotation.y = rr() * 6;
  }

  // Thánh giá có tượng Chúa
  const CB = SY + 4.5, CZ = HALL.zBack + 1.4;
  statueImage(root, "crucifix", { height: 11.5, y: CB - 0.4, z: CZ });
  const crossGlow = new THREE.Sprite(flameMat("255,236,190", 0.3));
  crossGlow.scale.set(8, 11, 1);
  crossGlow.position.set(0, CB + 7.5, HALL.zBack + 0.9);
  root.add(crossGlow);

  // Đức Mẹ (trái) và thánh Gioan (phải) đứng hai bên thánh giá
  statueImage(root, "mary", { height: 4.6, x: -3.4, y: SY + 4.2, z: HALL.zBack + 2.4 });
  statueImage(root, "john", { height: 4.8, x: 3.4, y: SY + 4.2, z: HALL.zBack + 2.4 });

  // Bệ thờ phía sau: cửa Nhà Tạm, bậc nến, khám tượng Thánh Tâm
  const ivory = std(0xf3ede0, { roughness: 0.5 });
  const TZ = TABERNACLE.z;
  mk(new THREE.BoxGeometry(9, 1.6, 1.2), ivory, [0, SY + 0.8, TZ], stat);
  for (const x of [-3.6, -2.6, -1.6, 1.6, 2.6, 3.6]) mk(new THREE.BoxGeometry(0.7, 1, 0.06), gd, [x, SY + 0.8, TZ + 0.62], stat);
  mk(new THREE.BoxGeometry(1.3, 1.25, 0.1), gd, [0, SY + 0.8, TZ + 0.64], stat);
  mk(new THREE.BoxGeometry(9.2, 0.12, 1.3), gd, [0, SY + 1.62, TZ], stat);
  mk(new THREE.BoxGeometry(7.2, 0.45, 0.8), ivory, [0, SY + 1.9, TZ - 0.1], stat);
  for (const s of [-1, 1])
    for (const k of [1.6, 2.5, 3.4]) {
      mk(new THREE.CylinderGeometry(0.07, 0.16, 0.5, 10), gd, [s * k, SY + 2.37, TZ - 0.1], stat);
      mk(new THREE.CylinderGeometry(0.07, 0.07, 1.2, 10), std(0xfffbef), [s * k, SY + 3.22, TZ - 0.1], stat);
      const f = new THREE.Sprite(flameMat("255,200,120"));
      f.scale.set(0.45, 0.65, 1);
      f.position.set(s * k, SY + 3.95, TZ - 0.1);
      root.add(f);
    }
  const NZ = TZ - 0.1;
  mk(new THREE.BoxGeometry(2, 0.3, 1), gd, [0, SY + 2.27, NZ], stat);
  mk(new THREE.PlaneGeometry(1.4, 2.4), new THREE.MeshBasicMaterial({ color: 0xf3dca2 }), [0, SY + 3.5, NZ - 0.4], root);
  for (const s of [-1, 1]) mk(new THREE.CylinderGeometry(0.1, 0.1, 2.3, 10), std(0x8a3a2a, { roughness: 0.5 }), [s * 0.82, SY + 3.55, NZ + 0.3], stat);
  mk(new THREE.BoxGeometry(2.2, 0.3, 1.1), gd, [0, SY + 4.8, NZ], stat);
  mk(new THREE.TorusGeometry(0.82, 0.12, 8, 24, Math.PI), gd, [0, SY + 4.95, NZ + 0.3], stat);
  mk(new THREE.SphereGeometry(0.45, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), gd, [0, SY + 5.0, NZ], stat);
  mk(new THREE.BoxGeometry(0.08, 0.6, 0.08), gd, [0, SY + 6.0, NZ], stat);
  mk(new THREE.BoxGeometry(0.36, 0.08, 0.08), gd, [0, SY + 6.1, NZ], stat);
  statueImage(root, "sacred-heart", { height: 2.15, y: SY + 2.42, z: NZ + 0.05 });

  // Hai thiên thần trắng có cánh, tay cầm chân nến
  for (const s of [-1, 1]) {
    const a = new THREE.Group();
    a.position.set(s * 6.3, SY, TZ + 0.7);
    stat.add(a);
    mk(new THREE.BoxGeometry(1.1, 1.2, 1.1), ivory, [0, 0.6, 0], a);
    angel(a, { y: 1.2, s: 0.95, ry: -s * 0.2 });
    wings(a, 2.5, -0.3);
    beam([s * 0.5, 2.0, 0.4], [s * 0.6, 4.3, 0.4], 0.05, gd, a);
    mk(new THREE.BoxGeometry(1.1, 0.06, 0.06), gd, [s * 0.6, 4.3, 0.4], a);
    for (const dx of [-0.45, 0, 0.45]) {
      mk(new THREE.CylinderGeometry(0.05, 0.05, 0.4, 8), std(0xfffbef), [s * 0.6 + dx, 4.53, 0.4], a);
      const f = new THREE.Sprite(flameMat("255,200,120"));
      f.scale.set(0.32, 0.45, 1);
      f.position.set(s * 6.3 + s * 0.6 + dx, SY + 4.95, TZ + 1.1);
      root.add(f);
    }
  }

  // Đèn chầu đỏ cạnh bệ thờ
  const lampPos = new THREE.Vector3(4.9, SY + 2.6, TZ + 1.6);
  mk(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 8), gd, [lampPos.x, SY + 1.2, lampPos.z], stat);
  mk(new THREE.CylinderGeometry(0.2, 0.15, 0.4, 14), new THREE.MeshBasicMaterial({ color: 0xc81e1e }), [lampPos.x, lampPos.y, lampPos.z], root);
  const lamp = new THREE.Sprite(flameMat("255,40,30", 0.6));
  lamp.scale.set(1.4, 1.4, 1);
  lamp.position.copy(lampPos);
  root.add(lamp);
  const tabGlow = new THREE.Sprite(flameMat("255,225,150", 0));
  tabGlow.scale.set(4, 5, 1);
  tabGlow.position.set(0, SY + 3.4, NZ + 0.6);
  root.add(tabGlow);

  // Tượng Đức Mẹ phía trước bên trái (nơi dâng hoa)
  const mary = new THREE.Group();
  mary.position.set(MARY.x, 0, MARY.z);
  root.add(mary);
  mk(new THREE.BoxGeometry(1.7, 1.8, 1.7), marble, [0, 0.9, 0], mary);
  statueImage(mary, "mary", { height: 4.0, y: 1.8 });
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
  // Đèn rọi ấm vào cung thánh cho tượng nổi khối
  const spot = new THREE.SpotLight(0xfff0dc, 380, 0, 0.42, 0.6, 2);
  spot.position.set(0, 26, -12);
  spot.target.position.set(0, SY + 8, HALL.zBack + 1.5);
  scene.add(spot, spot.target);
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
