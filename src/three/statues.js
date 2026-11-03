import * as THREE from "three";
import { std, gold, mk } from "./util3d.js";

// Tượng thánh dựng bằng code: dáng tượng thạch cao sơn màu, quay về phía giáo dân (+z).

const V2 = (pts) => pts.map(([r, y]) => new THREE.Vector2(r, y));
// Sơn tượng: hơi bóng như thạch cao phủ sơn
const paint = (color, roughness = 0.5) => std(color, { roughness, envMapIntensity: 0.6 });
const SKIN = 0xf1d3b8;

// Nếp vải dọc, mạnh ở gấu áo và nhạt dần lên trên
function folds(geo, n, amp, yTop) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (y > yTop) continue;
    const k = 1 + amp * Math.sin(Math.atan2(x, z) * n + y * 1.3) * (1 - y / yTop);
    p.setXYZ(i, x * k, y, z * k);
  }
  geo.computeVertexNormals();
  return geo;
}

// Trụ thon nối hai điểm (tay, chân)
function limb(a, b, r1, r2, mat, parent) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const m = mk(new THREE.CylinderGeometry(r2, r1, A.distanceTo(B), 12), mat, null, parent);
  m.position.copy(A).add(B).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.sub(A).normalize());
  return m;
}
const ball = (r, mat, pos, parent, scale = [1, 1, 1]) => {
  const m = mk(new THREE.SphereGeometry(r, 20, 16), mat, pos, parent);
  m.scale.set(...scale);
  return m;
};

// Đầu: mặt, tóc dài
function head(parent, { pos, hair, tilt = [0, 0, 0] }) {
  const h = new THREE.Group();
  h.position.set(...pos);
  h.rotation.set(...tilt);
  parent.add(h);
  const skin = paint(SKIN, 0.55);
  ball(0.27, skin, [0, 0, 0.02], h, [0.86, 1.05, 0.92]);
  ball(0.05, skin, [0, -0.02, 0.27], h, [0.8, 1.3, 1]); // mũi
  const eye = paint(0x2a1a10, 0.4);
  for (const s of [-1, 1]) ball(0.026, eye, [s * 0.085, 0.04, 0.235], h, [1.3, 0.8, 0.6]);
  ball(0.03, paint(0xb5605a, 0.5), [0, -0.12, 0.235], h, [1.6, 0.5, 0.6]); // môi
  const hm = paint(hair, 0.8);
  mk(new THREE.SphereGeometry(0.29, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.52), hm, [0, 0.03, -0.01], h);
  ball(0.27, hm, [0, -0.2, -0.12], h, [1.05, 1.5, 0.55]);
  return h;
}

// Tay chắp trước ngực
function prayingHands(parent, y, z, sleeve) {
  const skin = paint(SKIN, 0.55);
  for (const s of [-1, 1]) {
    limb([s * 0.34, y + 0.32, 0.02], [s * 0.07, y - 0.02, z - 0.06], 0.11, 0.09, sleeve, parent);
    const hnd = mk(new THREE.BoxGeometry(0.08, 0.26, 0.05), skin, [s * 0.03, y + 0.06, z], parent);
    hnd.rotation.set(-0.35, 0, -s * 0.12);
  }
}

// Tượng thiên thần đứng chắp tay: áo trắng, choàng xanh nhạt, đai vàng. Cao ~3.1 khi s=1.
export function angel(parent, { x = 0, y = 0, z = 0, s = 1, ry = 0 }) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.scale.setScalar(s);
  g.rotation.y = ry;
  parent.add(g);
  const robeM = paint(0xf8f6f1);
  const mantleM = std(0xbcd6ee, { roughness: 0.55, envMapIntensity: 0.6, side: THREE.DoubleSide });

  mk(folds(new THREE.LatheGeometry(V2([[0, 0], [0.66, 0], [0.64, 0.08], [0.56, 0.6], [0.47, 1.2], [0.4, 1.7], [0.38, 2.05], [0.3, 2.3], [0.14, 2.42], [0, 2.42]]), 40), 14, 0.06, 1.7), robeM, null, g);
  mk(new THREE.TorusGeometry(0.645, 0.025, 6, 40), gold(), [0, 0.05, 0], g).rotation.x = Math.PI / 2;
  mk(new THREE.TorusGeometry(0.42, 0.04, 8, 32), paint(0xd9b24a), [0, 1.55, 0], g).rotation.x = Math.PI / 2;
  // Áo choàng mở phía trước
  mk(folds(new THREE.LatheGeometry(V2([[0.72, 0.28], [0.68, 0.8], [0.58, 1.4], [0.5, 1.9], [0.45, 2.2], [0.37, 2.36]]), 40, Math.PI * 0.3, Math.PI * 1.4), 10, 0.05, 1.9), mantleM, null, g);
  mk(new THREE.CylinderGeometry(0.09, 0.1, 0.2, 12), paint(SKIN, 0.55), [0, 2.45, 0.02], g);
  head(g, { pos: [0, 2.68, 0.02], hair: 0x8a5a2c, tilt: [0.12, 0, 0] });
  prayingHands(g, 1.8, 0.42, robeM);
  return g;
}

// Cánh thiên thần: 3 lớp lông vũ chồng nhau
const wingGeos = [1, 0.8, 0.6].map((k) => {
  const w = new THREE.Shape();
  w.moveTo(0, 0);
  w.bezierCurveTo(0.7 * k, 0.3 * k, 1.25 * k, 1.5 * k, 0.6 * k, 2.8 * k);
  w.bezierCurveTo(0.45 * k, 2.2 * k, 0.25 * k, 1.6 * k, 0.32 * k, 1.2 * k);
  w.bezierCurveTo(0.12 * k, 0.9 * k, 0.05 * k, 0.4 * k, 0, 0);
  return new THREE.ShapeGeometry(w, 16);
});
export function wings(parent, y, z) {
  // Hơi ngả xám lạnh để nổi trên tường trắng; xòe ra hai bên cho nhìn thấy từ phía giáo dân
  const m = std(0xe4e6ec, { roughness: 0.6, side: THREE.DoubleSide });
  for (const s of [-1, 1])
    wingGeos.forEach((geo, i) => {
      const w = mk(geo, m, [s * 0.2, y + i * 0.12, z - i * 0.05], parent);
      w.scale.set(s * 1.3, 1.3, 1.3);
      w.rotation.set(-0.1, s * (0.28 + i * 0.1), -s * (0.12 + i * 0.06));
    });
}
