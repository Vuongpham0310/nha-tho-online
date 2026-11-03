import { test } from "node:test";
import assert from "node:assert/strict";
import { parseWish, createWishBoard, giftEffect, tierOf, flightCaption, treeLevel, treePoints, newMilestones, energyLevel, topStars, createComboTracker, pickSpotlight, EFFECTS } from "../src/wishes.js";
import { hasKeyword, clip, maskName } from "../src/text.js";

const CFG = {
  giftMap: { Rose: "plane", "Paper Crane": "crane", Galaxy: "meteor" },
  tiers: { medium: 10, big: 300, huge: 1000, smallEffect: "plane", mediumEffect: "lantern", bigEffect: "rocket", hugeEffect: "bloom" },
};

test("parseWish: các biến thể 'ước'", () => {
  for (const [c, t] of [["Ước: thi tốt", "thi tốt"], ["uoc giam 5kg", "giam 5kg"], ["ƯỚC - gia đình bình an", "gia đình bình an"], ["ước:chốt đơn", "chốt đơn"], ["  Uoc   có   việc  ", "có việc"]]) {
    assert.deepEqual(parseWish(c), { ok: true, text: t }, c);
  }
  for (const c of ["hello", "mình ước gì", "uocmo", "", null]) assert.equal(parseWish(c), null, String(c));
});

test("parseWish: chặn số ĐT, link, @, từ cấm (không dấu), rỗng", () => {
  assert.equal(parseWish("Ước: gọi 0912345678").reason, "số điện thoại");
  assert.equal(parseWish("Ước: vào shop.vn nhé").reason, "đường link");
  assert.equal(parseWish("Ước: https://x.y").reason, "đường link");
  assert.equal(parseWish("Ước: @ban tag").reason, "gắn tên");
  assert.equal(parseWish("Ước: đồ ngốc", { banned: ["do ngoc"] }).reason, "từ cấm");
  assert.equal(parseWish("Ước:   ").reason, "trống");
  assert.ok(parseWish("Ước: giảm 5kg trong 2 tháng").ok); // ít số vẫn được
});

test("từ cấm so theo từ, không chặn nhầm", () => {
  const banned = ["lon", "do ngu"];
  assert.ok(parseWish("Ước: con lớn khôn", { banned: ["cac"] }).ok); // "các" ≠ từ cấm khác
  assert.ok(parseWish("Ước: long lanh", { banned }).ok); // "lon" nằm trong "long" nhưng không phải 1 từ
  assert.equal(parseWish("Ước: mày đồ ngu!", { banned }).reason, "từ cấm");
  assert.equal(parseWish("Ước: LỚN", { banned }).reason, "từ cấm"); // trùng nguyên từ thì chặn
});

test("parseWish: cắt 30 ký tự không vỡ emoji", () => {
  const r = parseWish("Ước: " + "🙏".repeat(40));
  assert.equal([...r.text].length, 30);
  assert.ok(r.text.endsWith("…"));
  assert.equal(clip("🙏🙏🙏", 2), "🙏…");
});

test("bảng điều ước: 1 người 1 ước, ước mới thay ước cũ cùng chỗ", () => {
  const b = createWishBoard({ slots: 3 });
  const a = b.add("u1", "An", "thi tốt");
  const a2 = b.add("u1", "An", "đỗ đại học");
  assert.equal(a2.replaced, true);
  assert.equal(a2.wish.slot, a.wish.slot);
  assert.equal(b.count, 1);
  assert.equal(b.get("u1").text, "đỗ đại học");
});

test("bảng điều ước: đầy thì bỏ ước cũ nhất chưa có quà", () => {
  let t = 0;
  const b = createWishBoard({ slots: 2, now: () => t });
  b.add("a", "A", "1"); t++;
  b.add("b", "B", "2"); t++;
  b.markGifted("a");
  const r = b.add("c", "C", "3");
  assert.equal(r.evicted.key, "b");
  assert.ok(b.get("a"));
  b.markGifted("c");
  t++;
  assert.equal(b.add("d", "D", "4").evicted.key, "a"); // tất cả đều có quà → bỏ cũ nhất
  assert.equal(b.count, 2);
});

test("quà: ưu tiên tên, không có tên thì theo tầng xu", () => {
  assert.equal(giftEffect("Rose", 1, CFG), "plane");
  assert.equal(giftEffect("Galaxy", 1000, CFG), "meteor");
  assert.equal(giftEffect("Lạ", 5, CFG), "plane");
  assert.equal(giftEffect("Lạ", 50, CFG), "lantern");
  assert.equal(giftEffect("Lạ", 500, CFG), "rocket");
  assert.equal(giftEffect("Lạ", 5000, CFG), "bloom");
  assert.equal(tierOf(9, CFG.tiers), "small");
  assert.equal(tierOf(300, CFG.tiers), "big");
  assert.ok(EFFECTS.every((e) => e.label && e.size));
});

test("chú thích bay: gộp tên + ×N", () => {
  assert.equal(flightCaption({ ritualId: "rocket", total: 1, users: [{ nickname: "Minh Anh" }] }), "Minh Anh đã gửi điều ước đi bằng tên lửa");
  assert.equal(flightCaption({ ritualId: "plane", total: 6, users: ["A", "B", "C", "D"].map((n) => ({ nickname: n })) }), "A, B và 2 người khác đã gửi điều ước đi bằng máy bay giấy ×6");
});

test("cấp cây theo điểm + thanh tiến độ", () => {
  const th = [0, 50, 150, 400, 1000, 2500];
  assert.deepEqual(treeLevel(0, th), { level: 1, from: 0, to: 50 });
  assert.deepEqual(treeLevel(680, th), { level: 4, from: 400, to: 1000 });
  assert.equal(treeLevel(99999, th).level, 6);
  assert.equal(treePoints({ wishes: 10, diamonds: 30, comments: 10, likes: 250 }), 20 + 30 + 2 + 2);
});

test("mốc cộng đồng chỉ kích 1 lần", () => {
  const ms = [{ at: 100 }, { at: 250 }, { at: 500 }];
  const fired = new Set();
  assert.deepEqual(newMilestones(99, ms, fired), []);
  assert.deepEqual(newMilestones(260, ms, fired), [0, 1]);
  assert.deepEqual(newMilestones(300, ms, fired), []);
  assert.deepEqual(newMilestones(500, ms, fired), [2]);
});

test("năng lượng + ngôi sao điều ước", () => {
  assert.equal(energyLevel(0, [10, 100, 1000]), 0);
  assert.equal(energyLevel(150, [10, 100, 1000]), 2);
  const m = new Map([["a", { key: "a", energy: 50, since: 1 }], ["b", { key: "b", energy: 900, since: 2 }], ["c", { key: "c", energy: 50, since: 0 }], ["d", { key: "d", energy: 0, since: 0 }]]);
  assert.deepEqual(topStars(m).map((u) => u.key), ["b", "c"]);
});

test("combo: 3 lần, 5 lần, 3 nhỏ rồi 1 lớn; hết 2 phút thì tính lại", () => {
  let t = 0;
  const c = createComboTracker({ now: () => t });
  assert.deepEqual(c.add("u", "small"), []);
  t += 1000;
  assert.deepEqual(c.add("u", "small"), []);
  t += 1000;
  assert.deepEqual(c.add("u", "small"), ["planes"]);
  t += 1000;
  assert.deepEqual(c.add("u", "big"), ["super"]);
  t += 1000;
  assert.deepEqual(c.add("u", "small"), ["lanterns"]);
  t += 1000;
  assert.deepEqual(c.add("u", "small"), []); // đã kích rồi
  t += 200_000;
  c.add("u", "small");
  c.add("u", "small");
  assert.deepEqual(c.add("u", "small"), ["planes"]); // chuỗi mới
  assert.deepEqual(c.add("v", "small"), []); // người khác tách riêng
});

test("spotlight: không chọn người đã tặng quà hoặc vừa được chọn", () => {
  const wishes = ["a", "b", "c"].map((key) => ({ key }));
  const picks = pickSpotlight(wishes, { gifters: new Set(["a"]), recent: new Map([["b", 1000]]), now: 2000, n: 2, rand: () => 0 });
  assert.deepEqual(picks.map((w) => w.key), ["c"]);
  assert.equal(pickSpotlight(wishes, { gifters: new Set(), recent: new Map([["b", 0]]), now: 16 * 60_000, n: 3, rand: () => 0 }).length, 3);
});

test("hasKeyword: so khớp không dấu", () => {
  assert.ok(hasKeyword("Thả lá đi mọi người!!", ["tha la"]));
  assert.ok(!hasKeyword("hello", ["no hoa"]));
});

test("maskName: giữ chữ cái đầu mỗi từ", () => {
  assert.equal(maskName("Đức Anh"), "Đ** A**");
  assert.equal(maskName("  Minh   Anh 29 "), "M** A** 2**");
  assert.equal(maskName("🌸Lan"), "🌸**");
  assert.equal(maskName(""), "");
});
