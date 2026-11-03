import { createPerson } from "./three/person.js";
import { seatPos } from "./shared.js";
import { clip } from "./text.js";

// Nối dữ liệu chỗ ngồi (seats.js) với nhân vật 3D. Dữ liệu là gốc; nhân vật dựng theo dữ liệu.
export function createCrowd(scene, seats) {
  const people = new Map();

  function spawn(u) {
    const p = createPerson({ name: clip((u.isTest ? "[TEST] " : "") + u.nickname, 18), seed: u.key });
    const pos = seatPos(u.seat);
    p.group.position.set(pos.x, 0, pos.z);
    scene.add(p.group);
    people.set(u.key, p);
    return p;
  }

  function despawn(key) {
    const p = people.get(key);
    if (!p) return;
    p.dispose();
    people.delete(key);
  }

  return {
    people,
    get: (key) => people.get(key),
    // Trả kết quả seats.touch; tạo/xóa nhân vật theo đó.
    join(key, nickname, opts) {
      const r = seats.touch(key, nickname, opts);
      if (r.evicted) despawn(r.evicted);
      if (r.created) spawn(r.user);
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
    rowOf(key) {
      const u = seats.users.get(key);
      return u ? seatPos(u.seat).row : -1;
    },
    keysInRow(row) {
      return [...seats.users.values()].filter((u) => seatPos(u.seat).row === row).map((u) => u.key);
    },
    update(dt) {
      for (const p of people.values()) p.update(dt);
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
