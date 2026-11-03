import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

// Vật liệu giống nhau dùng chung một đối tượng (để gộp mesh tĩnh cho nhẹ).
const matCache = new Map();
export const std = (color, o = {}) => {
  const plain = Object.values(o).every((v) => typeof v !== "object");
  const key = plain ? color + JSON.stringify(o) : null;
  if (key && matCache.has(key)) return matCache.get(key);
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.7, envMapIntensity: 0.3, ...o });
  if (key) matCache.set(key, m);
  return m;
};
export const gold = (o = {}) => std(0xe3a82a, { metalness: 0.92, roughness: 0.3, emissive: 0x3a2200, envMapIntensity: 1.25, ...o });

export function canvasTex(w, h, draw, repeat) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  return t;
}

// mk(geometry, material, [x,y,z], parent) -> mesh đã thêm vào parent
export function mk(geo, mat, pos, parent) {
  const m = new THREE.Mesh(geo, mat);
  if (pos) m.position.set(pos[0], pos[1], pos[2]);
  if (parent) parent.add(m);
  return m;
}

// Texture quầng sáng dùng chung theo màu (không ai sửa texture nên chia sẻ được)
const glowCache = new Map();
export function glowTex(color = "255,220,140") {
  let t = glowCache.get(color);
  if (!t) {
    t = canvasTex(128, 128, (g, w, h) => {
      const r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      r.addColorStop(0, "rgba(" + color + ",1)");
      r.addColorStop(0.35, "rgba(" + color + ",0.35)");
      r.addColorStop(1, "rgba(" + color + ",0)");
      g.fillStyle = r;
      g.fillRect(0, 0, w, h);
    });
    glowCache.set(color, t);
  }
  return t;
}

// Bật đổ bóng cho các mesh vật liệu chuẩn. maxY: bỏ qua vật ở trên cao (trần, xà) để ánh nắng lọt vào.
function shadowify(root, maxY = 99) {
  const p = new THREE.Vector3();
  root.traverse((o) => {
    if (!o.isMesh || !o.material || !o.material.isMeshStandardMaterial) return;
    o.getWorldPosition(p);
    o.receiveShadow = true;
    o.castShadow = p.y < maxY;
  });
}

// Gộp các mesh tĩnh cùng vật liệu thành một khối để giảm số lần vẽ (GPU yếu vẫn mượt).
export function mergeStatic(root) {
  root.updateMatrixWorld(true);
  shadowify(root, 12);
  const buckets = new Map();
  const dead = [];
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh) return;
    const m = o.material;
    if (!m || !m.isMeshStandardMaterial || m.transparent || Array.isArray(m)) return;
    for (let p = o; p; p = p.parent) if (p.userData.noMerge) return;
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    g.applyMatrix4(o.matrixWorld);
    for (const k of Object.keys(g.attributes)) if (!["position", "normal", "uv"].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    const key = m.uuid + (o.castShadow ? "c" : "n");
    if (!buckets.has(key)) buckets.set(key, { m, cast: o.castShadow, geos: [] });
    buckets.get(key).geos.push(g);
    dead.push(o);
  });
  for (const o of dead) {
    o.parent.remove(o);
    o.geometry.dispose();
  }
  for (const { m, cast, geos } of buckets.values()) {
    const merged = new THREE.Mesh(mergeGeometries(geos), m);
    merged.castShadow = cast;
    merged.receiveShadow = true;
    root.add(merged);
    geos.forEach((g) => g.dispose());
  }
}
