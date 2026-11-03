// Quản lý chỗ ngồi: dữ liệu thuần, không đụng tới three.js.
// user = { key, nickname, seat, lastActive, protectedUntil, busy, isTest }
export function createSeats({ order, max = order.length, now = () => Date.now(), protectMs = 10 * 60_000 }) {
  const users = new Map();
  const taken = new Set();
  let cap = Math.min(max, order.length);

  // Người có thể bị thay: không đang làm nghi thức, hết thời gian bảo vệ, lâu không tương tác nhất.
  function candidate() {
    const t = now();
    let best = null;
    for (const u of users.values()) {
      if (u.busy || u.protectedUntil > t) continue;
      if (!best || u.lastActive < best.lastActive) best = u;
    }
    return best;
  }

  function remove(key) {
    const u = users.get(key);
    if (!u) return null;
    taken.delete(u.seat);
    users.delete(key);
    return u;
  }

  // Đưa số người về ≤ cap. Trả danh sách key bị thay.
  function enforce() {
    const out = [];
    while (users.size > cap) {
      const c = candidate();
      if (!c) break;
      remove(c.key);
      out.push(c.key);
    }
    return out;
  }

  return {
    users,
    get max() {
      return cap;
    },
    get count() {
      return users.size;
    },
    get protectMs() {
      return protectMs;
    },
    set protectMs(v) {
      protectMs = v;
    },

    // Ghi nhận tương tác. create=false: chỉ cập nhật người đã ngồi.
    // Trả { user, created, evicted: key|null } hoặc { user: null, full: boolean }.
    touch(key, nickname, { create = true, isTest = false } = {}) {
      const u = users.get(key);
      if (u) {
        u.lastActive = now();
        if (nickname) u.nickname = nickname;
        return { user: u, created: false, evicted: null };
      }
      if (!create) return { user: null, full: false };
      let evicted = null;
      let seat;
      if (users.size < cap) {
        seat = order.find((s) => !taken.has(s));
      } else {
        const c = candidate();
        if (!c) return { user: null, full: true };
        seat = c.seat;
        remove(c.key);
        evicted = c.key;
      }
      const nu = { key, nickname, seat, lastActive: now(), protectedUntil: 0, busy: false, isTest };
      users.set(key, nu);
      taken.add(seat);
      return { user: nu, created: true, evicted };
    },

    // Quà hợp lệ: bảo vệ chỗ ngay, kể cả khi đang tạm dừng.
    protect(key) {
      const u = users.get(key);
      if (u) u.protectedUntil = now() + protectMs;
    },

    // Khóa/nhả khi làm nghi thức. Nhả khóa có thể kéo theo thay người nếu đang vượt MAX.
    setBusy(key, busy) {
      const u = users.get(key);
      if (!u) return busy ? false : [];
      if (busy) {
        if (u.busy) return false;
        u.busy = true;
        return true;
      }
      u.busy = false;
      return enforce();
    },

    setMax(n) {
      cap = Math.max(0, Math.min(n, order.length));
      return enforce();
    },

    remove,
    reset() {
      users.clear();
      taken.clear();
    },
  };
}
