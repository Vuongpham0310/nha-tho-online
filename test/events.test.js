import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { normalize, createPipeline } from "../src/events.js";
import { createStats, allowBulkSimulation } from "../src/stats.js";

const F = JSON.parse(readFileSync(new URL("./fixtures/events.json", import.meta.url), "utf8"));
const clone = (o) => JSON.parse(JSON.stringify(o));
const gift = (data) => ({ event: "gift", data: { userId: "u1", nickname: "U", giftId: 1, giftName: "Rose", ...data } });

test("chat chuẩn hóa đủ trường, nhận cả chuỗi JSON", () => {
  const ev = normalize(JSON.stringify(F.chat));
  assert.equal(ev.type, "chat");
  assert.equal(ev.key, "7001");
  assert.equal(ev.nickname, "An Nguyễn");
  assert.match(ev.text, /xin thương xót/);
});

test("JSON lỗi, event lạ, thiếu user → null, không throw", () => {
  assert.equal(normalize("{không phải json"), null);
  assert.equal(normalize({ event: "lạ", data: {} }), null);
  assert.equal(normalize(F.noUser), null);
  assert.equal(normalize(null), null);
});

test("fallback key = uniqueId khi thiếu userId", () => {
  assert.equal(normalize({ event: "share", data: { uniqueId: "x" } }).key, "x");
});

test("roomUser không có user vẫn cập nhật số người xem", () => {
  const ev = normalize(F.roomUser);
  assert.deepEqual(ev, { type: "roomUser", viewerCount: 84, isTest: false });
});

test("combo: chỉ tính 1 lần khi repeatEnd, count = repeatCount", () => {
  const p = createPipeline();
  const out = F.giftComboStreak.map((r) => p(r)).filter(Boolean);
  assert.equal(out.length, 1);
  assert.equal(out[0].count, 5);
});

test("streak chưa kết thúc bị bỏ trước dedupe, không chiếm key", () => {
  const p = createPipeline();
  assert.equal(p(gift({ giftType: 1, repeatEnd: false, repeatCount: 2, msgId: "same" })), null);
  const ev = p(gift({ giftType: 1, repeatEnd: true, repeatCount: 4, msgId: "same" }));
  assert.equal(ev.count, 4);
});

test("cùng 1 sự kiện gửi lại → chỉ tính 1 lần", () => {
  const p = createPipeline();
  assert.ok(p(clone(F.giftNormal)));
  assert.equal(p(clone(F.giftNormal)), null);
});

test("2 combo giống nhau của cùng người trong 60s đều được tính", () => {
  const p = createPipeline();
  const a = p(gift({ giftType: 1, repeatEnd: true, repeatCount: 3, groupId: "g1", msgId: "a" }));
  const b = p(gift({ giftType: 1, repeatEnd: true, repeatCount: 3, groupId: "g2", msgId: "b" }));
  assert.ok(a && b);
});

test("dedupe theo groupId khi không có msgId; hết 60s thì không còn chặn", () => {
  let t = 0;
  const p = createPipeline({ now: () => t });
  assert.ok(p(gift({ giftType: 1, repeatEnd: true, groupId: "g9" })));
  assert.equal(p(gift({ giftType: 1, repeatEnd: true, groupId: "g9" })), null);
  t = 61_000;
  assert.ok(p(gift({ giftType: 1, repeatEnd: true, groupId: "g9" })));
});

test("không có msgId lẫn groupId → không dedupe, có cảnh báo", () => {
  const warns = [];
  const p = createPipeline({ warn: (m) => warns.push(m) });
  assert.ok(p(gift({ giftType: 2 })));
  assert.ok(p(gift({ giftType: 2 })));
  assert.equal(warns.length, 2);
});

test("thiếu giftType: theo repeatEnd nếu có", () => {
  const p = createPipeline();
  assert.equal(p(gift({ repeatEnd: false, repeatCount: 2, msgId: "x1" })), null);
  assert.equal(p(gift({ repeatEnd: true, repeatCount: 2, msgId: "x2" })).count, 2);
});

test("thiếu cả giftType và repeatEnd: tính 1 lần + cảnh báo combo không xác định", () => {
  const warns = [];
  const p = createPipeline({ warn: (m) => warns.push(m) });
  const ev = p(gift({ msgId: "y1", repeatCount: 7 }));
  assert.equal(ev.count, 7);
  assert.ok(warns.some((w) => w.includes("combo không xác định")));
});

test("thiếu giftName → dùng giftId; thiếu repeatCount → count 1", () => {
  const p = createPipeline();
  const ev = p({ event: "gift", data: { userId: "u", giftId: 42, giftType: 2, msgId: "z" } });
  assert.equal(ev.giftName, "42");
  assert.equal(ev.count, 1);
});

test("like: count từ likeCount, vẫn chỉ là 1 user", () => {
  const ev = normalize(F.like);
  assert.equal(ev.key, "7004");
  assert.equal(ev.count, 15);
});

test("event isTest không cộng vào thống kê LIVE", () => {
  const s = createStats();
  s.addGift({ isTest: true, giftName: "Rose", count: 10 });
  assert.equal(s.live.giftTotal, 0);
  assert.equal(s.test.giftTotal, 10);
  assert.equal(s.view, s.test);
  s.addGift({ isTest: false, giftName: "Rose", count: 2 });
  assert.equal(s.live.giftTotal, 2);
  assert.equal(s.view, s.live);
});

test("đã có event thật thì từ chối giả lập lớn (kể cả sau reset)", () => {
  const s = createStats();
  assert.equal(allowBulkSimulation(s), true);
  s.of({ isTest: true });
  assert.equal(allowBulkSimulation(s), true);
  s.of({ isTest: false });
  assert.equal(allowBulkSimulation(s), false);
  s.reset();
  assert.equal(allowBulkSimulation(s), false);
});
