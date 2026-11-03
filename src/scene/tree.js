import * as THREE from "three";
import { sprite, place, labels, labelKey, quadGeo } from "./assets.js";
import { TREE, TREE_H, TREE_TOP, TREE_SCALE, TAG_SLOTS, BAKED_TAGS, TAG_SIZE, LANTERNS, treeToScreen, W } from "../layout.js";
import { rand } from "./fx.js";
import { clip } from "../text.js";

// Cây ước nguyện: ảnh cây + chỗ treo điều ước + hiệu ứng theo cấp.
export function createTree(scene, tex, fx) {
  const root = new THREE.Group();
  scene.add(root);

  // Quầng sáng sau tán (cấp ≥2) và ánh vàng (cấp 6)
  const halo = sprite(tex.glowPink, { h: TREE_H * 1.15, additive: true });
  place(halo, TREE.cx, TREE_TOP + TREE_H * 0.4, 9);
  halo.material.opacity = 0;
  root.add(halo);
  const goldHalo = sprite(tex.glowGold, { h: TREE_H * 1.25, additive: true });
  place(goldHalo, TREE.cx, TREE_TOP + TREE_H * 0.45, 9);
  goldHalo.material.opacity = 0;
  root.add(goldHalo);

  // Ảnh cây neo ở giữa gốc để rung quanh gốc
  const sway = new THREE.Group();
  place(sway, TREE.cx, TREE.bottom, 0);
  root.add(sway);
  const trunk = sprite(tex.tree, { w: TREE.width, anchor: [0.5, 0] });
  trunk.position.z = 10;
  sway.add(trunk);
  // Toạ độ màn hình → toạ độ trong nhóm rung
  const local = (x, y, z) => new THREE.Vector3(x - TREE.cx, TREE.bottom - y, z);

  // Chỗ treo: thẻ vẽ sẵn chỉ cần quầng sáng; chỗ thêm thì có thẻ do code vẽ
  const tagH = TAG_SIZE[1] * TREE_SCALE;
  const slots = TAG_SLOTS.map((p, i) => {
    const [x, y] = treeToScreen(p);
    const glow = sprite(tex.glowWarm, { h: tagH * 1.6, additive: true });
    glow.position.copy(local(x, y, 11));
    glow.visible = false;
    sway.add(glow);
    let card = null;
    if (i >= BAKED_TAGS.length) {
      card = sprite(tex["wish-tag"], { h: tagH * 1.25, anchor: [0.5, 0.62] });
      card.position.copy(local(x, y, 12));
      card.rotation.z = rand(0.2);
      card.visible = false;
      sway.add(card);
    }
    return { x, y, glow, card, label: null, labelText: "", labelUntil: 0, power: 0 };
  });

  // Quầng đèn lồng (mốc "Đèn lồng sáng")
  const lanterns = LANTERNS.map((p) => {
    const [x, y] = treeToScreen(p);
    const g = sprite(tex.glowWarm, { h: 120, additive: true });
    g.position.copy(local(x, y, 13));
    g.material.opacity = 0;
    sway.add(g);
    return g;
  });

  function setLabel(s, text, secs, style = "") {
    if (s.label) {
      sway.remove(s.label);
      labels.release(s.labelKey);
      s.label = null;
    }
    if (!text) return;
    s.labelKey = labelKey(clip(text, 16), style);
    const lbl = labels.acquire(s.labelKey);
    s.label = new THREE.Mesh(quadGeo(), lbl.mat);
    s.label.scale.set(lbl.tex.userData.aspect * 26, 26, 1);
    s.label.position.copy(local(s.x, s.y + tagH * 0.62, 14));
    sway.add(s.label);
    s.labelUntil = secs === Infinity ? Infinity : performance.now() + secs * 1000;
  }

  // Thẻ chưa có quà chỉ hiện tên ngắn hạn, tối đa 3 thẻ cùng lúc để tán cây không rối
  let recentLabeled = [];
  const MAX_RECENT = 3;
  function labelRecent(i, s, nickname) {
    recentLabeled = recentLabeled.filter((j) => j !== i);
    recentLabeled.push(i);
    while (recentLabeled.length > MAX_RECENT) {
      const j = recentLabeled.shift();
      if (slots[j].power === 0) setLabel(slots[j], "");
    }
    setLabel(s, nickname, 6);
  }

  let level = 1;
  let shakeT = 0, shakeAmp = 0;
  let lanternOn = 0;
  let t = 0;
  let acc = 0;

  return {
    slotPos: (i) => [slots[i].x, slots[i].y],
    // Treo điều ước: power 0..3 (năng lượng người ước) quyết định độ sáng
    hang(i, nickname, power = 0) {
      const s = slots[i];
      s.glow.visible = true;
      s.power = power;
      if (s.card) s.card.visible = true;
      if (power > 0) setLabel(s, nickname, Infinity, power >= 2 ? "gold" : "");
      else labelRecent(i, s, nickname);
    },
    setPower(i, nickname, power) {
      const s = slots[i];
      if (!s.glow.visible) return;
      s.power = power;
      if (power > 0) setLabel(s, nickname, Infinity, power >= 2 ? "gold" : "");
    },
    unhang(i) {
      const s = slots[i];
      s.glow.visible = false;
      if (s.card) s.card.visible = false;
      setLabel(s, "");
    },
    setLevel(l) {
      level = l;
    },
    shake(amp = 0.03, secs = 1.2) {
      shakeAmp = amp;
      shakeT = secs;
    },
    lightLanterns() {
      lanternOn = 1;
    },
    // Hoa nở bung trên tán
    bloom(n = 40) {
      for (let i = 0; i < n; i++) {
        const [x, y] = treeToScreen([80 + Math.random() * 1070, 60 + Math.random() * 700]);
        fx.spawn({ tex: tex.flower, x, y, life: 2.5 + Math.random(), size: 10, sizeEnd: 46, additive: false, z: 15, spin: rand(1), fadeIn: 0.2 });
      }
    },
    update(dt) {
      t += dt;
      // Rung quanh gốc
      if (shakeT > 0) {
        shakeT -= dt;
        sway.rotation.z = Math.sin(t * 22) * shakeAmp * Math.max(0, shakeT);
      } else sway.rotation.z = Math.sin(t * 0.6) * 0.004;
      // Hiệu ứng theo cấp
      halo.material.opacity = level >= 2 ? 0.35 + Math.sin(t * 1.5) * 0.08 : 0;
      goldHalo.material.opacity = level >= 6 ? 0.3 + Math.sin(t * 2) * 0.1 : 0;
      for (const g of lanterns) g.material.opacity = lanternOn * (0.75 + Math.sin(t * 3 + g.position.x) * 0.15);
      const now = performance.now();
      for (const s of slots) {
        if (!s.glow.visible) continue;
        s.glow.material.opacity = 0.35 + s.power * 0.15 + Math.sin(t * 2 + s.x) * 0.08;
        if (s.label && now > s.labelUntil) setLabel(s, "");
      }
      acc += dt;
      while (acc > 0.25) {
        acc -= 0.25;
        // cấp 3: cánh hoa rơi; cấp 4: đom đóm; cấp 6: kim tuyến vàng
        if (level >= 3) {
          const [x, y] = treeToScreen([100 + Math.random() * 1030, 200 + Math.random() * 500]);
          fx.spawn({ tex: tex.petal, x, y, vx: rand(40), vy: 60 + Math.random() * 40, life: 4, size: 22, additive: false, spin: rand(3), z: 16 });
        }
        if (level >= 4) {
          const x = TREE.cx + rand(TREE.width * 0.9), y = TREE_TOP + 100 + Math.random() * TREE_H * 0.8;
          fx.spawn({ tex: tex.glowGold, x, y, vx: rand(30), vy: rand(30), life: 3, size: 16, sizeEnd: 10, z: 17, fadeIn: 0.3 });
        }
        if (level >= 6) fx.spawn({ tex: tex.glowGold, x: TREE.cx + rand(W), y: TREE_TOP + Math.random() * TREE_H, vy: 40, life: 2.5, size: 12, z: 17 });
      }
    },
    reset() {
      for (let i = 0; i < slots.length; i++) this.unhang(i);
      lanternOn = 0;
      level = 1;
      recentLabeled = [];
    },
  };
}
