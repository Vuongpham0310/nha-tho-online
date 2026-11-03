// Thống kê phiên: tách LIVE thật và TEST (giả lập), không trộn.
function bucket() {
  return { gifts: {}, giftTotal: 0, diamonds: 0, wishes: 0, comments: 0, shares: 0, likes: 0, follows: 0 };
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
      b.diamonds += (ev.diamonds || 0) * ev.count;
    },
    // Vòng mới: cây và mốc tính lại từ đầu, giữ tổng quà
    newRound() {
      for (const b of [s.live, s.test]) Object.assign(b, { diamonds: 0, wishes: 0, comments: 0, likes: 0 });
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

// Lệnh giả lập lớn chỉ được chạy khi chưa nhận sự kiện thật.
export const allowBulkSimulation = (stats) => !stats.sawLive;
