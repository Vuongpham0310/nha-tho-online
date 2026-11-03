import * as THREE from "three";
import { sprite, place, labels, labelKey, quadGeo } from "./assets.js";
import { slotPos } from "../layout.js";
import { clip } from "../text.js";

const hash = (s) => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
// Vật liệu ảnh nhân vật dùng chung theo ảnh
const mats = new Map();
const matFor = (tex) => {
  if (!mats.has(tex)) mats.set(tex, new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false }));
  return mats.get(tex);
};

// Nhân vật chibi quay lưng ngồi dưới gốc cây: đung đưa nhẹ, thỉnh thoảng nhún,
// nhảy khi tặng quà, tên phía trên đầu, icon điều ước, aura theo năng lượng.
function createAvatar(scene, tex, { key, name, slot }) {
  const p = slotPos(slot);
  const h = hash(key);
  const z = 30 + p.row * 2 + (p.x / 1080) * 0.5;
  const g = new THREE.Group();
  place(g, p.x, p.y, z);
  scene.add(g);

  const t = tex.avatars[h % tex.avatars.length];
  const hh = p.h * (0.94 + ((h >>> 8) % 12) / 100);
  const body = new THREE.Mesh(quadGeo(0.5, 0), matFor(t));
  body.scale.set(hh * t.userData.aspect * ((h >>> 4) % 2 ? -1 : 1), hh, 1);
  g.add(body);

  const aura = sprite(tex.glowGold, { h: hh * 1.6, additive: true });
  aura.position.set(0, hh * 0.5, -0.1);
  aura.visible = false;
  g.add(aura);

  // Tên: cỡ chữ theo hàng (hàng trước to hơn)
  const short = clip(name, 12);
  const lk = labelKey(short);
  const lbl = labels.acquire(lk);
  const lh = 20 + p.row * 3;
  const tag = new THREE.Mesh(quadGeo(0.5, 0), lbl.mat);
  tag.scale.set(lbl.tex.userData.aspect * lh, lh, 1);
  tag.position.set(0, hh + 4, 0.2);
  g.add(tag);
  let starKey = null;

  const wish = sprite(tex["wish-tag"], { h: lh * 1.5, anchor: [1, 0] });
  wish.position.set(-tag.scale.x / 2 - 2, hh + 4, 0.2);
  wish.visible = false;
  g.add(wish);

  // Tên hiện 15 giây sau mỗi lần tương tác; luôn hiện nếu có năng lượng hoặc là ngôi sao điều ước
  let showUntil = performance.now() + 15_000;
  let energyLv = 0;
  let time = (h % 1000) / 100;
  let hop = 0, hopDur = 0, hopAmp = 0;
  let nextHop = 6 + (h % 14);

  return {
    group: g,
    head: () => [p.x, p.y - hh * 0.8],
    update(dt) {
      time += dt;
      body.scale.y = hh * (1 + Math.sin(time * 2.2) * 0.012);
      g.rotation.z = Math.sin(time * 0.9) * 0.025;
      nextHop -= dt;
      if (nextHop <= 0 && hop <= 0) {
        hop = hopDur = 0.45;
        hopAmp = hh * 0.06;
        nextHop = 10 + Math.random() * 20;
      }
      if (hop > 0) {
        hop -= dt;
        g.position.y = -p.y + Math.sin((1 - Math.max(0, hop) / hopDur) * Math.PI) * hopAmp;
      } else g.position.y = -p.y;
      tag.visible = !!starKey || energyLv > 0 || performance.now() < showUntil;
      if (aura.visible) aura.material.opacity = 0.35 + Math.sin(time * 3) * 0.15;
    },
    // Nhảy mừng khi tặng quà
    cheer(big = false) {
      hop = hopDur = big ? 0.8 : 0.5;
      hopAmp = hh * (big ? 0.3 : 0.15);
    },
    setWish(v) {
      wish.visible = v;
    },
    // Năng lượng 0..3: aura từ mức 1, sáng dần
    ping() {
      showUntil = performance.now() + 15_000;
    },
    setEnergy(level) {
      energyLv = level;
      aura.visible = level > 0;
      aura.scale.setScalar(hh * (1.2 + level * 0.25));
    },
    // Ngôi sao điều ước: viền vàng quanh tên
    setStar(on) {
      const want = on ? labelKey(short, "gold") : null;
      if (want === starKey) return;
      if (starKey) labels.release(starKey);
      starKey = want;
      const l = want ? labels.acquire(want) : lbl;
      const k = want ? 1.15 : 1;
      tag.material = l.mat;
      tag.scale.set(l.tex.userData.aspect * lh * k, lh * k, 1);
    },
    dispose() {
      labels.release(lk);
      if (starKey) labels.release(starKey);
      scene.remove(g);
      aura.material.dispose();
      wish.material.dispose();
    },
  };
}

// Nối dữ liệu chỗ ngồi (seats.js) với nhân vật. Dữ liệu là gốc; nhân vật dựng theo dữ liệu.
export function createCrowd(scene, seats, tex) {
  const people = new Map();
  const despawn = (key) => {
    const a = people.get(key);
    if (!a) return;
    a.dispose();
    people.delete(key);
  };
  return {
    people,
    get: (key) => people.get(key),
    join(key, nickname, opts) {
      const r = seats.touch(key, nickname, opts);
      if (r.evicted) despawn(r.evicted);
      if (r.created) people.set(key, createAvatar(scene, tex, { key, name: (opts?.isTest ? "[TEST] " : "") + nickname, slot: r.user.seat }));
      else people.get(key)?.ping();
      return r;
    },
    protect: (key) => seats.protect(key),
    lock: (key) => seats.setBusy(key, true) === true,
    unlock(key) {
      for (const k of seats.setBusy(key, false)) despawn(k);
    },
    setMax(n) {
      for (const k of seats.setMax(n)) despawn(k);
    },
    update(dt) {
      for (const a of people.values()) a.update(dt);
    },
    reset() {
      for (const k of [...people.keys()]) despawn(k);
      seats.reset();
    },
    get count() {
      return seats.count;
    },
  };
}

