import * as THREE from "three";
import { createRefCache } from "../refcache.js";

// Người chibi thường phục, dựng từ khung chú tiểu của project cũ.
// Mặt quay về -z (cung thánh), camera nhìn từ phía sau nên chi tiết mặt lược bớt.

const SHIRTS = [0xf2efe6, 0x3d5a80, 0x8a3b3b, 0x5b6b4a, 0x6b4f7a, 0xd9c7a0, 0x2f3b4c, 0xb07a4a];
const PANTS = [0x2a2f3a, 0x3c3226, 0x4a4a4a, 0x1f2a44];
const HAIRS = [0x16110e, 0x2a1a10, 0x3a2416, 0x1b1410];
const SKIN = 0xf2c398;

const hash = (s) => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

// Geometry dùng chung giữa mọi nhân vật: khóa theo (lớp, tham số).
const geoCache = new Map();
function geo(C, ...args) {
  let m = geoCache.get(C);
  if (!m) geoCache.set(C, (m = new Map()));
  const k = JSON.stringify(args);
  let g = m.get(k);
  if (!g) m.set(k, (g = new C(...args)));
  return g;
}

// Vật liệu dùng chung theo màu.
const matCache = new Map();
function mat(color, basic = false) {
  const k = color + (basic ? "b" : "s");
  let m = matCache.get(k);
  if (!m) {
    m = basic ? new THREE.MeshBasicMaterial({ color }) : new THREE.MeshStandardMaterial({ color, roughness: 0.95, envMapIntensity: 0.15 });
    matCache.set(k, m);
  }
  return m;
}

// Nhãn tên: texture dùng chung theo chuỗi, đếm tham chiếu.
const labels = createRefCache(
  (text) => {
    const c = document.createElement("canvas");
    c.width = 320;
    c.height = 72;
    const g = c.getContext("2d");
    g.font = "600 30px 'Be Vietnam Pro', 'Segoe UI', sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    const w = Math.min(308, g.measureText(text).width + 36);
    g.fillStyle = "rgba(28,18,12,0.78)";
    g.beginPath();
    g.roundRect(160 - w / 2, 10, w, 52, 26);
    g.fill();
    g.strokeStyle = "rgba(226,190,110,0.75)";
    g.lineWidth = 2;
    g.stroke();
    g.fillStyle = "#fff6e2";
    g.fillText(text, 160, 37, 280);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  },
  (m) => {
    m.map.dispose();
    m.dispose();
  }
);
export const labelCount = () => labels.size;

const mesh = (g, m, x = 0, y = 0, z = 0) => {
  const o = new THREE.Mesh(g, m);
  o.position.set(x, y, z);
  return o;
};
const P = (pts) => pts.map(([r, y]) => new THREE.Vector2(r, y));
const lerp = (a, b, k) => a + (b - a) * k;

// Làm dấu Thánh Giá: trán → ngực → vai trái → vai phải (tay phải, góc [x, z])
const SIGN = [[0.9, -0.25], [2.7, -0.55], [1.6, -0.5], [2.2, -0.95], [2.2, -0.15], [0.9, -0.25]];

// state: standing | sitting | kneeling. act(): genuflect | sign (chạy đè lên state).
export function createPerson({ name = "", seed = name } = {}) {
  const h = hash(seed);
  const shirt = mat(SHIRTS[h % SHIRTS.length]);
  const pants = mat(PANTS[(h >>> 3) % PANTS.length]);
  const hair = mat(HAIRS[(h >>> 5) % HAIRS.length]);
  const skin = mat(SKIN);
  const longHair = (h >>> 7) % 3 === 0;

  const root = new THREE.Group();
  const rig = new THREE.Group();
  root.add(rig);
  const upper = new THREE.Group();
  rig.add(upper);

  const body = mesh(geo(THREE.LatheGeometry, P([[0, 0.36], [0.52, 0.36], [0.54, 0.42], [0.48, 0.75], [0.42, 1.05], [0.42, 1.3], [0.32, 1.44], [0, 1.46]]), 20), shirt);
  body.scale.z = 0.8;
  upper.add(body);

  const head = new THREE.Group();
  head.position.y = 1.88;
  upper.add(head);
  head.add(mesh(geo(THREE.SphereGeometry, 0.54, 22, 16), skin));
  head.add(mesh(geo(THREE.SphereGeometry, 0.57, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.6), hair, 0, 0.03, 0.02));
  if (longHair) {
    const back = mesh(geo(THREE.SphereGeometry, 0.5, 16, 12), hair, 0, -0.32, 0.26);
    back.scale.set(1, 1.15, 0.6);
    head.add(back);
  }

  const arms = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(0.44 * s, 1.3, 0);
    pivot.add(mesh(geo(THREE.CylinderGeometry, 0.14, 0.17, 0.72, 10), shirt, 0, -0.36, 0));
    pivot.add(mesh(geo(THREE.SphereGeometry, 0.1, 10, 8), skin, 0, -0.76, 0));
    upper.add(pivot);
    arms.push({ pivot, s });
  }

  const legs = new THREE.Group();
  for (const s of [-1, 1]) legs.add(mesh(geo(THREE.CylinderGeometry, 0.19, 0.2, 0.42, 10), pants, 0.2 * s, 0.25, 0));
  rig.add(legs);
  const lap = mesh(geo(THREE.SphereGeometry, 0.58, 16, 10), pants, 0, 0.2, -0.12);
  lap.scale.set(1.25, 0.38, 1.1);
  rig.add(lap);

  // Tràng chuỗi Mân Côi + hạt sáng chạy vòng
  const rosary = new THREE.Group();
  rosary.position.set(0, 1.02, -0.62);
  rosary.add(mesh(geo(THREE.TorusGeometry, 0.16, 0.02, 6, 20), mat(0x6a3a1c)));
  rosary.add(mesh(geo(THREE.BoxGeometry, 0.03, 0.14, 0.03), mat(0xd9b24a), 0, -0.24, 0));
  const bead = mesh(geo(THREE.SphereGeometry, 0.04, 8, 6), mat(0xffe9a8, true));
  rosary.add(bead);
  rosary.visible = false;
  upper.add(rosary);

  let tag = null;
  if (name) {
    tag = new THREE.Sprite(labels.acquire(name));
    tag.scale.set(1.8, 0.4, 1);
    tag.position.y = 3.05;
    tag.renderOrder = 10;
    root.add(tag);
  }

  let state = "sitting";
  let action = null; // { name, t, dur }
  let t = (h % 1000) / 100;

  function restArms() {
    for (const a of arms) {
      if (state === "standing") a.pivot.rotation.set(0, 0, 0.08 * a.s);
      else if (state === "sitting") a.pivot.rotation.set(0.9, 0, -0.25 * a.s);
      else a.pivot.rotation.set(1.25, 0, -0.5 * a.s); // quỳ: chắp tay
    }
  }

  function setState(s) {
    state = s;
    legs.visible = s !== "sitting";
    lap.visible = s === "sitting";
    rig.position.set(0, s === "sitting" ? 0.42 : s === "kneeling" ? 0.12 : 0, s === "kneeling" ? -0.5 : 0);
    upper.position.y = s === "sitting" ? -0.32 : 0;
    upper.rotation.x = s === "kneeling" ? -0.12 : 0;
    head.rotation.x = s === "kneeling" ? -0.3 : 0;
    restArms();
  }

  function act(name, dur) {
    action = { name, t: 0, dur };
  }

  function update(dt) {
    t += dt;
    if (rosary.visible) {
      const a = t * 1.6;
      bead.position.set(Math.cos(a) * 0.16, Math.sin(a) * 0.16, 0);
    }
    if (!action) {
      if (state === "sitting") upper.position.y = -0.32 + Math.sin(t * 1.3) * 0.012;
      return;
    }
    action.t += dt;
    const p = Math.min(1, action.t / action.dur);
    if (action.name === "genuflect") {
      const k = Math.sin(p * Math.PI);
      rig.position.y = -0.45 * k;
      upper.rotation.x = -0.25 * k;
    } else if (action.name === "sign") {
      const f = p * (SIGN.length - 1);
      const i = Math.min(SIGN.length - 2, Math.floor(f));
      const k = f - i;
      const right = arms[1].pivot;
      right.rotation.x = lerp(SIGN[i][0], SIGN[i + 1][0], k);
      right.rotation.z = lerp(SIGN[i][1], SIGN[i + 1][1], k);
    }
    if (p >= 1) {
      action = null;
      setState(state);
    }
  }

  function dispose() {
    if (tag) labels.release(name);
    tag = null;
    root.removeFromParent();
  }

  setState("sitting");
  return {
    group: root,
    setState,
    act,
    setRosary: (v) => (rosary.visible = v),
    update,
    dispose,
    // Vị trí tay phải trong không gian (cho hiệu ứng nước thánh, nến)
    handWorld: (out = new THREE.Vector3()) => arms[1].pivot.localToWorld(out.set(0, -0.76, 0)),
    get state() {
      return state;
    },
  };
}
