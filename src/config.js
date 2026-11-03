import { RITUALS } from "./rituals.js";
import { DEFAULT_KEYWORDS } from "./text.js";

const KEY = "nha-tho-live-config";
export const CHANNEL = "nha-tho-live";

// Tên quà TikTok → nghi thức. Streamer sửa ở control theo quà thật của kênh.
export const DEFAULTS = {
  banner: "Bình an cho mọi người\nCùng nhau cầu nguyện",
  disclaimer: true,
  giftMap: {
    Rose: "thap-nen",
    TikTok: "quy-cau-nguyen",
    GG: "bai-goi",
    "Ice Cream Cone": "lam-dau",
    "Finger Heart": "lan-chuoi",
    Perfume: "dang-hoa",
    Doughnut: "vieng-thanh-the",
    Confetti: "cau-linh-hon",
    "Hand Hearts": "hat-thanh-ca",
  },
  defaultRitual: "quy-cau-nguyen", // quà không có trong bảng
  goalLabel: "Nến khấn",
  goalTarget: 100,
  keywords: DEFAULT_KEYWORDS,
  freeActions: true, // vào phòng → làm dấu, comment cầu nguyện → quỳ, thả tim → thắp nến
  max: 120,
  protectMin: 10,
  shadows: true,
  enabled: Object.fromEntries(RITUALS.map((r) => [r.id, true])),
  volBg: 0.5,
  volFx: 0.8,
  bells: true, // chuông nền mỗi 15 phút
};

export function loadConfig() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "{}");
    return { ...DEFAULTS, ...saved, enabled: { ...DEFAULTS.enabled, ...(saved.enabled || {}) } };
  } catch {
    return structuredClone(DEFAULTS);
  }
}

export function saveConfig(cfg) {
  try {
    localStorage.setItem(KEY, JSON.stringify(cfg));
  } catch {}
}
