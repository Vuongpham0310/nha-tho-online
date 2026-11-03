// Danh sách nghi thức + hàng đợi hiệu ứng. Logic thuần; phần vẽ nằm ở effects.js.
export const RITUALS = [
  { id: "lam-dau", label: "Làm dấu Thánh Giá", size: "small", verb: "làm dấu Thánh Giá" },
  { id: "bai-goi", label: "Bái gối", size: "small", verb: "bái gối trước Nhà Tạm" },
  { id: "quy-cau-nguyen", label: "Quỳ cầu nguyện", size: "small", verb: "quỳ cầu nguyện" },
  { id: "lan-chuoi", label: "Lần chuỗi Mân Côi", size: "small", verb: "lần chuỗi Mân Côi" },
  { id: "thap-nen", label: "Thắp nến khấn", size: "small", verb: "thắp nến khấn" },
  { id: "dang-hoa", label: "Dâng hoa kính Đức Mẹ", size: "big", verb: "dâng hoa kính Đức Mẹ" },
  { id: "vieng-thanh-the", label: "Viếng Thánh Thể", size: "big", verb: "viếng Thánh Thể" },
  { id: "cau-linh-hon", label: "Cầu cho các linh hồn", size: "big", verb: "cầu cho các linh hồn" },
  { id: "hat-thanh-ca", label: "Hát thánh ca", size: "big", verb: "mời mọi người hát thánh ca" },
];
export const RITUAL = Object.fromEntries(RITUALS.map((r) => [r.id, r]));

// Câu chú thích: tối đa 3 tên + "và N người khác", ×tổng nếu > 1.
export function caption(entry, maxNames = 3) {
  const names = entry.users.map((u) => u.nickname);
  let who = names.slice(0, maxNames).join(", ");
  if (names.length > maxNames) who += " và " + (names.length - maxNames) + " người khác";
  return who + " " + RITUAL[entry.ritualId].verb + (entry.total > 1 ? " ×" + entry.total : "");
}

// start(entry) -> handle { update(dt) -> true khi xong, cancel?() }
// end(entry) luôn được gọi đúng 1 lần cho mỗi mục đã bắt đầu (kể cả lỗi/hủy) để nhả khóa.
export function createQueue({ start, end, now = () => Date.now(), maxSmall = 3, maxQueue = 30, mergeMs = 2000 }) {
  let pending = [];
  let running = [];
  let dropped = 0;

  function finish(r, cancelled) {
    running = running.filter((x) => x !== r);
    try {
      if (cancelled) r.handle.cancel?.();
    } catch {
    } finally {
      end(r.entry);
    }
  }

  function launch(entry) {
    entry.started = true;
    pending = pending.filter((e) => e !== entry);
    let handle = null;
    try {
      handle = start(entry);
    } catch {
      handle = null;
    }
    if (!handle) {
      end(entry);
      return;
    }
    running.push({ entry, handle });
  }

  return {
    // { ritualId, size, key, nickname, giftId, count }
    enqueue({ ritualId, size, key, nickname, giftId = "", count = 1 }) {
      const t = now();
      const same = pending.find((e) => e.ritualId === ritualId && !e.started && t - e.createdAt <= mergeMs);
      if (same) {
        if (!same.users.some((u) => u.key === key)) same.users.push({ key, nickname });
        same.gifts[giftId] = (same.gifts[giftId] || 0) + count;
        same.total += count;
        return same;
      }
      const entry = { ritualId, size, users: [{ key, nickname }], gifts: { [giftId]: count }, total: count, createdAt: t, started: false };
      pending.push(entry);
      if (pending.length > maxQueue) {
        const i = pending.findIndex((e) => e.size === "small");
        pending.splice(i >= 0 ? i : 0, 1);
        dropped++;
      }
      return entry;
    },

    tick(dt) {
      for (const r of [...running]) {
        let done;
        try {
          done = r.handle.update(dt);
        } catch {
          done = true;
        }
        if (done) finish(r, false);
      }
      if (!running.some((r) => r.entry.size === "big")) {
        const b = pending.find((e) => e.size === "big");
        if (b) launch(b);
      }
      let small = running.filter((r) => r.entry.size === "small").length;
      for (const e of pending.filter((x) => x.size === "small")) {
        if (small >= maxSmall) break;
        launch(e);
        small++;
      }
    },

    clear() {
      pending = [];
    },
    cancelAll() {
      pending = [];
      for (const r of [...running]) finish(r, true);
    },
    get pending() {
      return pending.length;
    },
    get running() {
      return running.length;
    },
    get dropped() {
      return dropped;
    },
  };
}
