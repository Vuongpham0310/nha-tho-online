import { test } from "node:test";
import assert from "node:assert/strict";
import { createSeats } from "../src/seats.js";
import { createRefCache } from "../src/refcache.js";
import { SLOT_ORDER, SLOT_COUNT, slotPos, W } from "../src/layout.js";

const make = (max = 3) => {
  let t = 1000;
  const s = createSeats({ order: [0, 1, 2, 3, 4], max, now: () => t, protectMs: 500 });
  return { s, tick: (d = 1) => (t += d) };
};

test("chỗ ngồi: không trùng, chỗ đầu ở hàng trước gần giữa", () => {
  assert.equal(new Set(SLOT_ORDER).size, SLOT_COUNT);
  const first = slotPos(SLOT_ORDER[0]);
  assert.equal(first.row, Math.max(...SLOT_ORDER.map((i) => slotPos(i).row)));
  assert.ok(Math.abs(first.x - W / 2) < 120);
});

test("người mới vào chỗ trống; người cũ tương tác giữ chỗ", () => {
  const { s, tick } = make();
  const a = s.touch("a", "A");
  assert.equal(a.created, true);
  tick();
  const again = s.touch("a", "A2");
  assert.equal(again.created, false);
  assert.equal(again.user.seat, a.user.seat);
  assert.equal(again.user.nickname, "A2");
});

test("tên trùng nhưng khác id là 2 người", () => {
  const { s } = make();
  s.touch("id1", "Lan");
  s.touch("id2", "Lan");
  assert.equal(s.count, 2);
});

test("đầy → thay người ít tương tác nhất", () => {
  const { s, tick } = make();
  s.touch("a", "A"); tick();
  s.touch("b", "B"); tick();
  s.touch("c", "C"); tick();
  s.touch("a", "A"); tick(); // a vừa tương tác lại
  const d = s.touch("d", "D");
  assert.equal(d.evicted, "b");
  assert.ok(s.users.has("a"));
});

test("người được bảo vệ (vừa tặng quà) và người busy không bị thay", () => {
  const { s, tick } = make(2);
  s.touch("a", "A"); tick();
  s.touch("b", "B"); tick();
  s.protect("a");
  s.setBusy("b", true);
  const c = s.touch("c", "C");
  assert.equal(c.user, null);
  assert.equal(c.full, true);
  tick(600); // hết bảo vệ của a
  assert.equal(s.touch("c", "C").evicted, "a");
});

test("quà khi đang tạm dừng: protect vẫn áp dụng cho người đã ngồi", () => {
  const { s } = make();
  s.touch("a", "A");
  s.touch("a", "A", { create: false }); // tạm dừng: chỉ cập nhật
  s.protect("a");
  assert.ok(s.users.get("a").protectedUntil > 1000);
  assert.equal(s.touch("z", "Z", { create: false }).user, null);
});

test("giảm MAX khi đầy: không xóa người busy, xử lý khi nhả khóa", () => {
  const { s, tick } = make(3);
  s.touch("a", "A"); tick();
  s.touch("b", "B"); tick();
  s.touch("c", "C"); tick();
  s.setBusy("a", true);
  s.setBusy("b", true);
  const ev = s.setMax(1);
  assert.deepEqual(ev, ["c"]);
  assert.equal(s.count, 2); // a, b đang busy nên vẫn còn
  assert.deepEqual(s.setBusy("a", false), ["a"]);
  assert.deepEqual(s.setBusy("b", false), []);
  assert.equal(s.count, 1);
});

test("khóa busy không lồng: lần khóa thứ 2 trả false", () => {
  const { s } = make();
  s.touch("a", "A");
  assert.equal(s.setBusy("a", true), true);
  assert.equal(s.setBusy("a", true), false);
});

test("reset xóa sạch, cấp lại chỗ từ đầu", () => {
  const { s } = make();
  s.touch("a", "A");
  s.touch("b", "B");
  s.reset();
  assert.equal(s.count, 0);
  assert.equal(s.touch("c", "C").user.seat, 0);
});

test("texture tên dùng chung: thay 1 người trùng tên chưa dispose, thay người còn lại mới dispose", () => {
  const disposed = [];
  const c = createRefCache((k) => ({ k }), (v) => disposed.push(v.k));
  const t1 = c.acquire("Lan");
  const t2 = c.acquire("Lan");
  assert.equal(t1, t2);
  c.release("Lan");
  assert.deepEqual(disposed, []);
  c.release("Lan");
  assert.deepEqual(disposed, ["Lan"]);
  assert.equal(c.size, 0);
});
