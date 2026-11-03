import * as THREE from "three";
import { glowTex, canvasTex } from "./three/util3d.js";

// Hiệu ứng cho từng nghi thức. start(entry) trả handle { update(dt) -> xong?, cancel() }.
// Khóa nhân vật: entry.actor do overlay khóa sẵn; hiệu ứng nhóm tự khóa thêm vào entry.extraLocks.

const POOL = 220;

export function createEffects({ scene, church, crowd, audio }) {
  const TEX = {
    warm: glowTex("255,210,130"),
    white: glowTex("255,255,255"),
    pink: glowTex("255,170,200"),
    blue: glowTex("150,200,255"),
    note: canvasTex(64, 64, (g, w, h) => {
      g.fillStyle = "#ffe6a0";
      g.font = "bold 52px serif";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText("♪", w / 2, h / 2);
    }),
  };

  // Pool sprite tạo sẵn, không tạo/hủy trong lúc chạy
  const free = [];
  const live = new Set();
  for (let i = 0; i < POOL; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.visible = false;
    scene.add(s);
    free.push(s);
  }

  // Một hạt: bay từ `from` tới `to` theo đường cong (arc), hoặc trôi theo `vel`.
  function spawn({ tex = "warm", from, to, vel, arc = 0, life = 1.5, size = 0.5, fade = true, onArrive }) {
    const s = free.pop();
    if (!s) return null; // hết pool: bỏ hạt này, không ảnh hưởng gì khác
    s.material.map = TEX[tex];
    s.material.blending = tex === "note" ? THREE.NormalBlending : THREE.AdditiveBlending;
    s.material.opacity = 1;
    s.scale.set(size, size, 1);
    s.position.copy(from);
    s.visible = true;
    live.add({ s, from: from.clone(), to: to && to.clone(), vel, arc, life, t: 0, size, fade, onArrive });
    return s;
  }

  function releaseAll() {
    for (const p of live) {
      p.s.visible = false;
      free.push(p.s);
    }
    live.clear();
  }

  function update(dt) {
    for (const p of live) {
      p.t += dt;
      const k = Math.min(1, p.t / p.life);
      if (p.to) {
        p.s.position.lerpVectors(p.from, p.to, k);
        p.s.position.y += Math.sin(k * Math.PI) * p.arc;
      } else if (p.vel) {
        p.s.position.addScaledVector(p.vel, dt);
      }
      if (p.fade) p.s.material.opacity = k < 0.15 ? k / 0.15 : k > 0.75 ? (1 - k) / 0.25 : 1;
      if (k >= 1) {
        live.delete(p);
        p.s.visible = false;
        free.push(p.s);
        try {
          p.onArrive?.();
        } catch {}
      }
    }
  }

  const rand = (a) => (Math.random() - 0.5) * a;
  const headOf = (p) => p.group.position.clone().add(new THREE.Vector3(0, 3.2, 0));

  // Khung thời gian: steps chạy 1 lần khi tới mốc, tick mỗi khung, done luôn chạy đúng 1 lần.
  function timeline(dur, { steps = [], tick, done }) {
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
        tick?.(Math.min(1, t / dur), dt);
        if (t >= dur) {
          finish();
          return true;
        }
        return false;
      },
      cancel: finish,
    };
  }

  // Nhân vật chính của nghi thức (null nếu đang bận nghi thức khác hoặc đã rời ghế)
  const actorOf = (entry) => (entry.actor ? crowd.get(entry.actor) : null);
  // Chỉ trả nhân vật về ghế nếu nó vẫn còn trong cảnh
  const sitBack = (key, p) => {
    if (p && crowd.get(key) === p) {
      p.setRosary(false);
      p.setState("sitting");
    }
  };
  const pulse = (p) => Math.sin(p * Math.PI);

  // Khóa thêm các nhân vật cho nghi thức nhóm
  function lockGroup(entry, keys, pose) {
    entry.extraLocks = entry.extraLocks || [];
    const got = [];
    for (const k of keys) {
      if (k === entry.actor || !crowd.lock(k)) continue;
      entry.extraLocks.push(k);
      const p = crowd.get(k);
      if (p) {
        p.setState(pose);
        got.push([k, p]);
      }
    }
    return got;
  }

  const RUN = {
    "lam-dau"(entry) {
      const p = actorOf(entry);
      return timeline(3, {
        steps: [
          { at: 0, fn: () => {
            audio.chime(0.4);
            if (!p) return;
            const hand = p.handWorld();
            for (let i = 0; i < 6; i++) spawn({ tex: "blue", from: hand, vel: new THREE.Vector3(rand(0.6), 0.4 + Math.random() * 0.4, rand(0.6)), life: 1, size: 0.25 });
            p.act("sign", 2.6);
          } },
        ],
        done: () => {},
      });
    },

    "bai-goi"(entry) {
      const p = actorOf(entry);
      return timeline(3.6, {
        steps: [
          { at: 0, fn: () => p && p.setState("standing") },
          { at: 0.5, fn: () => p && p.act("genuflect", 2.4) },
        ],
        tick: (k) => (church.boost.lamp = Math.max(church.boost.lamp, pulse(k) * 0.5)),
        done: () => {
          church.boost.lamp = 0;
          sitBack(entry.actor, p);
        },
      });
    },

    "quy-cau-nguyen"(entry) {
      const p = actorOf(entry);
      let halo = null;
      return timeline(5, {
        steps: [{ at: 0, fn: () => {
          if (!p) return;
          p.setState("kneeling");
          halo = spawn({ tex: "warm", from: headOf(p), vel: new THREE.Vector3(), life: 5, size: 1.6 });
        } }],
        done: () => sitBack(entry.actor, p),
      });
    },

    "lan-chuoi"(entry) {
      const p = actorOf(entry);
      return timeline(7, {
        steps: [{ at: 0, fn: () => {
          if (!p) return;
          p.setState("kneeling");
          p.setRosary(true);
        } }],
        done: () => sitBack(entry.actor, p),
      });
    },

    "thap-nen"(entry) {
      const p = actorOf(entry);
      const n = Math.min(entry.total, 6);
      const from = p ? headOf(p) : new THREE.Vector3(0, 8, 10);
      const steps = [];
      for (let i = 0; i < n; i++) {
        steps.push({ at: i * 0.35, fn: () => {
          const target = church.candles.light().clone();
          spawn({ tex: "warm", from, to: target, arc: 2, life: 1.4, size: 0.5 });
        } });
      }
      steps.push({ at: 0, fn: () => audio.chime(0.5) });
      return timeline(1.6 + n * 0.35, { steps });
    },

    "dang-hoa"(entry) {
      const p = actorOf(entry);
      const n = 5 + Math.min(entry.total, 10);
      const from = p ? headOf(p) : new THREE.Vector3(0, 6, 12);
      const steps = [{ at: 0, fn: () => {
        p && p.setState("kneeling");
        audio.chime(0.7);
      } }];
      for (let i = 0; i < n; i++) {
        steps.push({ at: 0.3 + i * 0.3, fn: () => {
          const to = church.flowers.target().add(new THREE.Vector3(rand(2), 0, rand(0.6)));
          spawn({ tex: Math.random() < 0.5 ? "white" : "pink", from: from.clone().add(new THREE.Vector3(rand(1), 0, rand(1))), to, arc: 3, life: 2, size: 0.45, onArrive: () => church.flowers.add() });
        } });
      }
      return timeline(7, {
        steps,
        tick: (k) => (church.boost.mary = pulse(k)),
        done: () => {
          church.boost.mary = 0;
          sitBack(entry.actor, p);
        },
      });
    },

    "vieng-thanh-the"(entry) {
      const p = actorOf(entry);
      let group = [];
      return timeline(8, {
        steps: [{ at: 0, fn: () => {
          p && p.setState("kneeling");
          const row = entry.actor ? crowd.rowOf(entry.actor) : 0;
          group = lockGroup(entry, crowd.keysInRow(Math.max(0, row)), "kneeling");
          audio.swell();
        } }],
        tick: (k) => {
          church.boost.lamp = pulse(k);
          church.boost.tab = pulse(k);
        },
        done: () => {
          church.boost.lamp = church.boost.tab = 0;
          sitBack(entry.actor, p);
          for (const [k, q] of group) sitBack(k, q);
        },
      });
    },

    "cau-linh-hon"(entry) {
      let acc = 0;
      return timeline(10, {
        steps: [{ at: 0, fn: () => {
          church.candles.lightAll();
          audio.bell();
        } }],
        tick: (k, dt) => {
          church.boost.dim = pulse(k) * 0.8;
          acc += dt;
          while (acc > 0.12) {
            acc -= 0.12;
            const from = new THREE.Vector3(-6.6 + rand(2.6), 1.2, -11.2 + rand(0.6));
            spawn({ tex: "warm", from, vel: new THREE.Vector3(rand(0.2), 1.2, 0), life: 3, size: 0.3 });
          }
        },
        done: () => (church.boost.dim = 0),
      });
    },

    "hat-thanh-ca"(entry) {
      const p = actorOf(entry);
      let group = [];
      let acc = 0;
      return timeline(9, {
        steps: [{ at: 0, fn: () => {
          p && p.setState("standing");
          group = lockGroup(entry, [...crowd.people.keys()], "standing");
          audio.hymn();
        } }],
        tick: (k, dt) => {
          acc += dt;
          const all = group.length ? group : p ? [[entry.actor, p]] : [];
          while (acc > 0.15 && all.length && k < 0.85) {
            acc -= 0.15;
            const [, q] = all[Math.floor(Math.random() * all.length)];
            spawn({ tex: "note", from: headOf(q), vel: new THREE.Vector3(rand(0.4), 1.4, 0), life: 2.2, size: 0.7 });
          }
        },
        done: () => {
          sitBack(entry.actor, p);
          for (const [k, q] of group) sitBack(k, q);
        },
      });
    },
  };

  return {
    start(entry) {
      const run = RUN[entry.ritualId];
      return run ? run(entry) : null;
    },
    update,
    // Reset: trả hạt về pool, tắt mọi mức sáng hiệu ứng
    reset() {
      releaseAll();
      for (const k of Object.keys(church.boost)) church.boost[k] = 0;
    },
    get particles() {
      return live.size;
    },
  };
}
