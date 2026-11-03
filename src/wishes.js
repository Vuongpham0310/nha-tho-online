// Luật của Cây Ước Nguyện: logic thuần (không đụng DOM/three), có test.
import { normText, normWords, clip } from "./text.js";

// ---------- Hiệu ứng bay ----------
// size: small chạy song song, big chạy lần lượt (theo hàng đợi)
export const EFFECTS = [
  { id: "plane", label: "máy bay giấy", size: "small" },
  { id: "heart-balloon", label: "bong bóng tim", size: "small" },
  { id: "crane", label: "hạc giấy", size: "small" },
  { id: "lantern", label: "đèn lồng", size: "big" },
  { id: "hot-air-balloon", label: "khinh khí cầu", size: "big" },
  { id: "rocket", label: "tên lửa", size: "big" },
  { id: "firework", label: "pháo hoa điều ước", size: "big" },
  { id: "meteor", label: "sao băng", size: "big" },
  { id: "bloom", label: "cây nở rộ", size: "big" },
];
export const EFFECT = Object.fromEntries(EFFECTS.map((e) => [e.id, e]));

// Quà theo tầng xu (giá 1 món). Tên quà khớp trong giftMap thì ưu tiên tên.
export function giftEffect(giftName, diamonds, cfg) {
  if (cfg.giftMap[giftName] && EFFECT[cfg.giftMap[giftName]]) return cfg.giftMap[giftName];
  const d = Number(diamonds) || 0;
  const t = cfg.tiers;
  if (d >= t.huge) return t.hugeEffect;
  if (d >= t.big) return t.bigEffect;
  if (d >= t.medium) return t.mediumEffect;
  return t.smallEffect;
}
export const tierOf = (diamonds, tiers) => (diamonds >= tiers.huge ? "huge" : diamonds >= tiers.big ? "big" : diamonds >= tiers.medium ? "medium" : "small");

// "Minh Anh đã gửi điều ước đi bằng tên lửa", gộp: "A, B và 3 người khác ... ×N"
export function flightCaption(entry, maxNames = 2) {
  const names = entry.users.map((u) => u.nickname);
  let who = names.slice(0, maxNames).join(", ");
  if (names.length > maxNames) who += " và " + (names.length - maxNames) + " người khác";
  return `${who} đã gửi điều ước đi bằng ${EFFECT[entry.ritualId].label}` + (entry.total > 1 ? " ×" + entry.total : "");
}

// ---------- Điều ước ----------
// Comment bắt đầu bằng "ước" (có/không dấu, có/không ":" hoặc "-") là điều ước.
// Trả null nếu không phải điều ước; { ok:false, reason } nếu bị chặn; { ok:true, text } nếu hợp lệ.
export function parseWish(comment, { maxLen = 30, banned = [] } = {}) {
  const m = String(comment ?? "").trim().match(/^([^\s:：\-–]+)\s*[:：\-–]?\s*([\s\S]*)$/);
  if (!m || normText(m[1]) !== "uoc") return null;
  const body = m[2].replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim();
  if (!body) return { ok: false, reason: "trống" };
  if ((body.match(/\d/g) || []).length >= 8) return { ok: false, reason: "số điện thoại" };
  if (/https?:|www\.|\b[\w-]+\.(com|vn|net|org|io|me|ly|gg|xyz|info|shop)\b/i.test(body)) return { ok: false, reason: "đường link" };
  if (/@\w/.test(body)) return { ok: false, reason: "gắn tên" };
  // So theo từ (không dấu) để không chặn nhầm: "lớn" ≠ "lon" trong "long lanh"
  const words = " " + normWords(body) + " ";
  if (banned.some((b) => normWords(b) && words.includes(" " + normWords(b) + " "))) return { ok: false, reason: "từ cấm" };
  return { ok: true, text: clip(body, maxLen) };
}

// Bảng treo điều ước: mỗi người 1 điều ước, tối đa `slots` chỗ.
// Đầy thì bỏ điều ước cũ nhất chưa được tặng quà (hết thì bỏ cũ nhất).
export function createWishBoard({ slots, now = () => Date.now() }) {
  const byKey = new Map(); // key -> { key, nickname, text, slot, at, gifted }
  const used = new Set();
  const free = () => {
    for (let i = 0; i < slots; i++) if (!used.has(i)) return i;
    return -1;
  };
  const remove = (key) => {
    const w = byKey.get(key);
    if (!w) return null;
    used.delete(w.slot);
    byKey.delete(key);
    return w;
  };
  return {
    // Trả { wish, replaced: bool, evicted: wish|null }
    add(key, nickname, text) {
      const old = byKey.get(key);
      if (old) {
        Object.assign(old, { text, nickname, at: now() });
        return { wish: old, replaced: true, evicted: null };
      }
      let evicted = null;
      let slot = free();
      if (slot < 0) {
        const all = [...byKey.values()];
        const pool = all.some((w) => !w.gifted) ? all.filter((w) => !w.gifted) : all;
        evicted = pool.reduce((a, b) => (a.at <= b.at ? a : b));
        remove(evicted.key);
        slot = evicted.slot;
      }
      const wish = { key, nickname, text, slot, at: now(), gifted: false };
      byKey.set(key, wish);
      used.add(slot);
      return { wish, replaced: false, evicted };
    },
    get: (key) => byKey.get(key),
    markGifted(key) {
      const w = byKey.get(key);
      if (w) w.gifted = true;
    },
    remove,
    list: () => [...byKey.values()].sort((a, b) => b.at - a.at),
    get count() {
      return byKey.size;
    },
    clear() {
      byKey.clear();
      used.clear();
    },
  };
}

// ---------- Tiến trình ----------
// Cấp cây 1..N theo điểm; trả { level, from, to } để vẽ thanh tiến độ
export function treeLevel(points, thresholds) {
  let level = 1;
  for (let i = 1; i < thresholds.length; i++) if (points >= thresholds[i]) level = i + 1;
  const from = thresholds[level - 1];
  const to = thresholds[level] ?? thresholds[thresholds.length - 1];
  return { level, from, to };
}

export const treePoints = (s) => s.wishes * 2 + s.diamonds + Math.floor(s.comments * 0.2) + Math.floor(s.likes / 100);

// Mốc mới vừa đạt (chưa kích hoạt) theo số điều ước
export function newMilestones(count, milestones, fired) {
  const out = [];
  milestones.forEach((m, i) => {
    if (count >= m.at && !fired.has(i)) {
      fired.add(i);
      out.push(i);
    }
  });
  return out;
}

// Mức năng lượng 0..3 theo tổng xu
export const energyLevel = (energy, steps) => steps.filter((s) => energy >= s).length;

// 2 người năng lượng cao nhất
export function topStars(energyByKey, n = 2) {
  return [...energyByKey.values()].filter((u) => u.energy > 0).sort((a, b) => b.energy - a.energy || a.since - b.since).slice(0, n);
}

// Combo trong cửa sổ thời gian: 3 lần → "planes", 5 lần → "lanterns",
// 3 quà nhỏ rồi 1 quà lớn → "super". Mỗi người, mỗi loại combo kích 1 lần cho tới khi chuỗi hết hạn.
export function createComboTracker({ windowMs = 120_000, now = () => Date.now() } = {}) {
  const hist = new Map(); // key -> { items: [{t, tier}], fired: Set }
  return {
    add(key, tier) {
      const t = now();
      let h = hist.get(key);
      if (!h || t - h.items[h.items.length - 1].t > windowMs) hist.set(key, (h = { items: [], fired: new Set() }));
      h.items = h.items.filter((x) => t - x.t <= windowMs);
      h.items.push({ t, tier });
      const out = [];
      const fire = (name) => {
        if (!h.fired.has(name)) {
          h.fired.add(name);
          out.push(name);
        }
      };
      if (h.items.length >= 3) fire("planes");
      if (h.items.length >= 5) fire("lanterns");
      const big = tier === "big" || tier === "huge";
      if (big && h.items.slice(0, -1).filter((x) => x.tier === "small").length >= 3) fire("super");
      return out;
    },
    clear: () => hist.clear(),
  };
}

// Chọn điều ước cho spotlight miễn phí: người chưa tặng quà, chưa được chọn trong `cooldownMs`.
export function pickSpotlight(wishes, { gifters, recent, now, n = 1, cooldownMs = 15 * 60_000, rand = Math.random }) {
  const pool = wishes.filter((w) => !gifters.has(w.key) && !(now - (recent.get(w.key) ?? -Infinity) < cooldownMs));
  const out = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  return out;
}
