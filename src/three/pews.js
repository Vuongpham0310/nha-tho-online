import * as THREE from "three";
import { std, mk, mergeStatic } from "./util3d.js";
import { ROWS, AISLE, PEW_LEN, rowZ } from "../shared.js";

// Ghế dài gỗ hai bên lối giữa. Người ngồi quay về -z (cung thánh), lưng tựa ở phía +z.
export function buildPews(scene) {
  const g = new THREE.Group();
  const wood = std(0x6b3d22, { roughness: 0.6 });
  const dark = std(0x4a2814, { roughness: 0.6 });
  const seat = new THREE.BoxGeometry(PEW_LEN, 0.12, 0.85);
  const back = new THREE.BoxGeometry(PEW_LEN, 0.8, 0.1);
  const rail = new THREE.BoxGeometry(PEW_LEN + 0.1, 0.08, 0.16);
  const end = new THREE.BoxGeometry(0.14, 1.35, 1.05);
  const kneel = new THREE.BoxGeometry(PEW_LEN - 0.3, 0.12, 0.26);
  for (let r = 0; r < ROWS; r++) {
    const z = rowZ(r);
    for (const s of [-1, 1]) {
      const cx = s * (AISLE + PEW_LEN / 2);
      mk(seat, wood, [cx, 0.5, z + 0.1], g);
      mk(back, wood, [cx, 0.98, z + 0.52], g).rotation.x = 0.08;
      mk(rail, dark, [cx, 1.4, z + 0.55], g);
      mk(end, dark, [cx - PEW_LEN / 2, 0.67, z + 0.12], g);
      mk(end, dark, [cx + PEW_LEN / 2, 0.67, z + 0.12], g);
      mk(kneel, dark, [cx, 0.18, z - 0.85], g);
    }
  }
  scene.add(g);
  mergeStatic(g);
  g.traverse((o) => o.isMesh && (o.castShadow = false));
  return g;
}
