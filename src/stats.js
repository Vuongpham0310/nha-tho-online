// Thống kê phiên: tách LIVE thật và TEST (giả lập), không trộn.
function bucket() {
  return { gifts: {}, giftTotal: 0, goalBase: 0, prayers: 0, prayerUsers: new Set(), shares: 0, likes: 0, follows: 0 };
}

export function createStats() {
  const s = {
    live: bucket(),
    test: bucket(),
    sawLive: false, // đã nhận ít nhất 1 sự kiện thật trong phiên
    viewers: 0,
    of(ev) {
      if (!ev.isTest) s.sawLive = true;
      return ev.isTest ? s.test : s.live;
    },
    // Số liệu hiển thị: có live thật thì chỉ hiện live, chưa có thì hiện số test.
    get view() {
      return s.sawLive ? s.live : s.test;
    },
    addGift(ev) {
      const b = s.of(ev);
      b.gifts[ev.giftName] = (b.gifts[ev.giftName] || 0) + ev.count;
      b.giftTotal += ev.count;
    },
    resetGoal() {
      for (const b of [s.live, s.test]) b.goalBase = b.giftTotal;
    },
    reset() {
      s.live = bucket();
      s.test = bucket();
      s.viewers = 0;
      // sawLive giữ nguyên: đã live thật thì vẫn chặn giả lập lớn
    },
  };
  return s;
}

// Lệnh giả lập lớn (50 người ảo, stress, chu kỳ rò rỉ) chỉ được chạy khi chưa nhận sự kiện thật.
export const allowBulkSimulation = (stats) => !stats.sawLive;
