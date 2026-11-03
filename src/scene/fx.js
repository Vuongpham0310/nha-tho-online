import * as THREE from "three";
import { quadGeo } from "./assets.js";

// Hạt hiệu ứng tạo sẵn (pool), không tạo/hủy khi đang chạy. Toạ độ màn hình y-xuống.
const POOL = 800;

export function createFx(scene) {
  const free = [];
  const live = new Set();
  // Gán sẵn texture để shader có bản đồ màu từ đầu: đổi texture sau đó không phải dựng lại shader
  const blank = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
  blank.needsUpdate = true;
  for (let i = 0; i < POOL; i++) {
    const m = new THREE.Mesh(quadGeo(), new THREE.MeshBasicMaterial({ map: blank, transparent: true, depthWrite: false, depthTest: false }));
    m.visible = false;
    scene.add(m);
    free.push(m);
  }

  // o: { tex, x, y, vx, vy, ax, ay, life, size, sizeEnd, aspect, spin, rot, z, additive, color, fadeIn, path(t)->[x,y], onDone, release }
  // onDone: chỉ khi chạy hết; release: dọn tài nguyên, chạy cả khi bị hủy (reset)
  function spawn(o) {
    const m = free.pop();
    if (!m) return null; // hết pool: bỏ hạt này
    const mat = m.material;
    mat.map = o.tex;
    mat.blending = o.additive === false ? THREE.NormalBlending : THREE.AdditiveBlending;
    mat.color.set(o.color ?? 0xffffff);
    mat.opacity = 1;
    m.rotation.z = o.rot ?? 0;
    m.visible = true;
    const p = { m, t: 0, x: o.x, y: o.y, vx: o.vx ?? 0, vy: o.vy ?? 0, ax: o.ax ?? 0, ay: o.ay ?? 0, life: o.life ?? 1, size: o.size ?? 40, sizeEnd: o.sizeEnd ?? o.size ?? 40, aspect: o.aspect ?? o.tex.userData.aspect ?? 1, spin: o.spin ?? 0, z: o.z ?? 60, fadeIn: o.fadeIn ?? 0.1, path: o.path, onDone: o.onDone, release: o.release };
    live.add(p);
    step(p, 0);
    return p;
  }

  function step(p, dt) {
    p.t += dt;
    const k = Math.min(1, p.t / p.life);
    if (p.path) [p.x, p.y] = p.path(k);
    else {
      p.vx += p.ax * dt;
      p.vy += p.ay * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    const s = p.size + (p.sizeEnd - p.size) * k;
    p.m.scale.set(s * p.aspect, s, 1);
    p.m.rotation.z += p.spin * dt;
    p.m.position.set(p.x, -p.y, p.z);
    p.m.material.opacity = k < p.fadeIn ? k / p.fadeIn : k > 0.75 ? (1 - k) / 0.25 : 1;
    return k >= 1;
  }

  function kill(p) {
    live.delete(p);
    p.m.visible = false;
    free.push(p.m);
    try {
      p.release?.();
    } catch {}
  }

  return {
    spawn,
    update(dt) {
      for (const p of live)
        if (step(p, dt)) {
          kill(p);
          try {
            p.onDone?.();
          } catch {}
        }
    },
    reset() {
      for (const p of live) kill(p);
    },
    get count() {
      return live.size;
    },
  };
}

// Khung thời gian: steps chạy 1 lần khi tới mốc, tick mỗi khung, done chạy đúng 1 lần (kể cả hủy).
export function timeline(dur, { steps = [], tick, done } = {}) {
  let t = 0;
  let ended = false;
  const finish = () => {
    if (ended) return;
    ended = true;
    done?.();
  };
  return {
    update(dt) {
      t += dt;
      for (const s of steps) if (!s.ran && t >= s.at) (s.ran = true), s.fn();
      tick?.(Math.min(1, t / dur), dt, t);
      if (t >= dur) {
        finish();
        return true;
      }
      return false;
    },
    cancel: finish,
  };
}

export const rand = (a) => (Math.random() - 0.5) * a;
export const ease = (k) => 1 - (1 - k) ** 3;
