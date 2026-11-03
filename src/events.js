// Nhận sự kiện từ TikFinity (ws://localhost:21213/, payload {event, data}) và chuẩn hóa.

const TYPES = new Set(["chat", "gift", "like", "member", "follow", "share", "roomUser", "subscribe"]);
const DEDUPE_MS = 60_000;

const str = (v) => (v == null ? "" : String(v));
const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

// Chuẩn hóa 1 payload thô. Trả null nếu không dùng được; không bao giờ throw.
export function normalize(raw) {
  let m = raw;
  if (typeof m === "string") {
    try {
      m = JSON.parse(m);
    } catch {
      return null;
    }
  }
  if (!m || typeof m !== "object" || !TYPES.has(m.event)) return null;
  const type = m.event;
  const d = m.data && typeof m.data === "object" ? m.data : {};
  const isTest = m.isTest === true;

  // roomUser = số người đang xem, không gắn với một người cụ thể
  if (type === "roomUser") {
    const v = num(d.viewerCount);
    return v === undefined ? null : { type, viewerCount: v, isTest };
  }

  const userId = d.userId != null && d.userId !== "" ? str(d.userId) : null;
  const uniqueId = d.uniqueId ? str(d.uniqueId) : null;
  const key = userId ?? uniqueId;
  if (!key) return null;

  const ev = {
    type,
    key,
    userId,
    uniqueId,
    nickname: str(d.nickname).trim() || uniqueId || "Khách",
    avatar: str(d.profilePictureUrl),
    msgId: d.msgId != null ? str(d.msgId) : null,
    isTest,
  };
  if (type === "chat") ev.text = str(d.comment);
  if (type === "like") ev.count = Math.max(1, num(d.likeCount) ?? 1);
  if (type === "gift") {
    ev.giftId = d.giftId != null ? str(d.giftId) : "";
    ev.giftName = str(d.giftName) || ev.giftId || "Quà";
    ev.giftType = num(d.giftType);
    ev.repeatEnd = "repeatEnd" in d ? !!d.repeatEnd : undefined;
    ev.repeatCount = num(d.repeatCount);
    ev.groupId = d.groupId != null && d.groupId !== "" ? str(d.groupId) : null;
    ev.diamonds = num(d.diamondCount) ?? 0;
  }
  return ev;
}

// Chuỗi xử lý: phân loại → kiểm user → lọc combo → dedupe. Trả sự kiện đã sẵn sàng đếm, hoặc null.
export function createPipeline({ now = () => Date.now(), warn = () => {} } = {}) {
  const seen = new Map(); // key dedupe -> thời điểm

  function purge(t) {
    for (const [k, ts] of seen) {
      if (t - ts < DEDUPE_MS) break; // Map giữ thứ tự chèn nên phần còn lại mới hơn
      seen.delete(k);
    }
  }

  return function process(raw) {
    const ev = normalize(raw);
    if (!ev || ev.type !== "gift") return ev;

    // Lọc combo trước dedupe: lượt cập nhật streak chưa kết thúc không chiếm key
    if (ev.giftType !== undefined) {
      if (ev.giftType === 1 && !ev.repeatEnd) return null;
    } else if (ev.repeatEnd !== undefined) {
      if (!ev.repeatEnd) return null;
    } else {
      warn("combo không xác định (thiếu giftType và repeatEnd)", raw);
    }
    ev.count = Math.max(1, ev.repeatCount ?? 1);

    const k = ev.msgId ? "m:" + ev.msgId : ev.groupId ? "g:" + ev.groupId + ":" + ev.repeatEnd : null;
    if (!k) {
      warn("quà không có msgId/groupId: không dedupe", raw);
      return ev;
    }
    const t = now();
    purge(t);
    if (seen.has(k)) return null;
    seen.set(k, t);
    return ev;
  };
}

// Kết nối WebSocket tới TikFinity, tự nối lại (backoff 1s→30s có jitter), luôn chỉ 1 kết nối.
export function connectTikFinity({ url = "ws://localhost:21213/", onMessage, onStatus }) {
  let ws = null;
  let attempt = 0;
  let timer = null;
  let stopped = false;

  function schedule() {
    if (stopped) return;
    clearTimeout(timer);
    const base = Math.min(30_000, 1000 * 2 ** attempt++);
    timer = setTimeout(open, base / 2 + (Math.random() * base) / 2);
  }

  function open() {
    if (ws) {
      ws.onclose = ws.onerror = ws.onmessage = null;
      try {
        ws.close();
      } catch {}
    }
    try {
      ws = new WebSocket(url);
    } catch {
      onStatus("disconnected");
      schedule();
      return;
    }
    ws.onopen = () => {
      attempt = 0;
      onStatus("connected");
    };
    ws.onmessage = (e) => onMessage(e.data);
    ws.onclose = () => {
      onStatus("disconnected");
      schedule();
    };
    ws.onerror = () => {}; // onclose luôn chạy sau onerror
  }

  open();
  return {
    close() {
      stopped = true;
      clearTimeout(timer);
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    },
  };
}
