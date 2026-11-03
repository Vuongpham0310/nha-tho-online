import { test } from "node:test";
import assert from "node:assert/strict";
import { createQueue } from "../src/queue.js";
import { createSeats } from "../src/seats.js";

// Handle giả: xong sau `dur` giây.
function setup({ dur = 1, failOn } = {}) {
  let t = 0;
  const started = [];
  const ended = [];
  const seats = createSeats({ order: [0, 1, 2, 3], now: () => t });
  const q = createQueue({
    now: () => t,
    start(e) {
      if (e.ritualId === failOn) throw new Error("boom");
      e.actor = seats.setBusy(e.users[0].key, true) ? e.users[0].key : null;
      started.push(e);
      let el = 0;
      return { update: (dt) => (el += dt) >= dur };
    },
    end(e) {
      ended.push(e);
      if (e.actor) seats.setBusy(e.actor, false);
    },
  });
  return { q, seats, started, ended, adv: (ms) => (t += ms) };
}

const add = (q, id, key, giftId = "g", count = 1, size = "small") => q.enqueue({ ritualId: id, size, key, nickname: key, giftId, count });

test("gộp theo ritualId trong 2s, giữ đúng count theo giftId", () => {
  const { q, adv } = setup();
  const e = add(q, "thap-nen", "a", "rose", 3);
  adv(500);
  add(q, "thap-nen", "b", "rose", 2);
  add(q, "thap-nen", "a", "tiktok", 1);
  assert.equal(q.pending, 1);
  assert.deepEqual(e.gifts, { rose: 5, tiktok: 1 });
  assert.equal(e.total, 6);
  assert.equal(e.users.length, 2);
  adv(2500);
  add(q, "thap-nen", "c");
  assert.equal(q.pending, 2);
});

test("không gộp vào mục đã bắt đầu", () => {
  const { q, started } = setup();
  add(q, "thap-nen", "a");
  q.tick(0);
  assert.equal(started.length, 1);
  add(q, "thap-nen", "b");
  assert.equal(q.pending, 1);
  assert.equal(started[0].users.length, 1);
});

test("big chạy lần lượt, small song song tối đa 3", () => {
  const { q } = setup({ dur: 1 });
  add(q, "dang-hoa", "a", "g", 1, "big");
  add(q, "hat-thanh-ca", "b", "g", 1, "big");
  for (const id of ["lam-dau", "bai-goi", "quy-cau-nguyen", "lan-chuoi"]) add(q, id, "s-" + id);
  q.tick(0);
  assert.equal(q.running, 4); // 1 big + 3 small
  assert.equal(q.pending, 2);
  q.tick(1.1);
  assert.equal(q.running, 2); // big thứ 2 + small thứ 4
  assert.equal(q.pending, 0);
});

test("tràn hàng đợi bỏ small cũ nhất, không mất mục big", () => {
  const { q } = setup();
  add(q, "dang-hoa", "big1", "g", 1, "big");
  for (let i = 0; i < 40; i++) {
    const id = ["a", "b", "c", "d", "e"][i % 5] + "-" + i; // id khác nhau để không gộp
    add(q, id, "u" + i);
  }
  assert.equal(q.pending, 30);
  assert.ok(q.dropped > 0);
});

test("2 nghi thức của cùng 1 người không chồng animation nhân vật", () => {
  const { q, seats, started } = setup({ dur: 5 });
  seats.touch("a", "a");
  q.enqueue({ ritualId: "lam-dau", size: "small", key: "a", nickname: "a" });
  q.enqueue({ ritualId: "bai-goi", size: "small", key: "a", nickname: "a" });
  q.tick(0);
  assert.equal(started.length, 2);
  assert.equal(started[0].actor, "a");
  assert.equal(started[1].actor, null); // vẫn chạy hiệu ứng nhưng không điều khiển nhân vật
});

test("reset giữa nghi thức: hàng đợi rỗng, khóa nhả hết", () => {
  const { q, seats, ended } = setup({ dur: 10 });
  for (const k of ["a", "b"]) seats.touch(k, k);
  add(q, "lam-dau", "a");
  add(q, "dang-hoa", "b", "g", 1, "big");
  add(q, "bai-goi", "a");
  q.tick(0.1);
  assert.ok(seats.users.get("a").busy);
  q.cancelAll();
  assert.equal(q.pending, 0);
  assert.equal(q.running, 0);
  assert.equal(seats.users.get("a").busy, false);
  assert.equal(seats.users.get("b").busy, false);
  assert.equal(ended.length, 3);
});

test("lỗi khi bắt đầu hoặc khi chạy vẫn nhả khóa", () => {
  const { q, seats, ended } = setup({ failOn: "bai-goi" });
  seats.touch("a", "a");
  add(q, "bai-goi", "a");
  q.tick(0);
  assert.equal(ended.length, 1);

  let t = 0;
  const s2 = createSeats({ order: [0], now: () => t });
  s2.touch("x", "x");
  const q2 = createQueue({
    start(e) {
      s2.setBusy("x", true);
      return { update: () => { throw new Error("vỡ"); } };
    },
    end() { s2.setBusy("x", false); },
  });
  q2.enqueue({ ritualId: "lam-dau", size: "small", key: "x", nickname: "x" });
  q2.tick(0);
  q2.tick(0.1);
  assert.equal(s2.users.get("x").busy, false);
});
