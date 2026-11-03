import { SLOT_COUNT } from "./layout.js";

const KEY = "cay-uoc-live-config";
export const CHANNEL = "cay-uoc-live";

export const DEFAULTS = {
  title: "Cây Ước Nguyện",
  hintWish: "Viết điều ước",
  hintWishSub: "Comment «Ước: …» — bình an, học tốt, may mắn…",
  hintGift: "Tặng quà",
  hintGiftSub: "để gửi điều ước bay xa hơn",
  disclaimer: true,

  wishMaxLen: 30,
  // So theo nguyên từ (không dấu). Tránh từ ngắn trùng chữ thường như "lon" (lớn), "cac" (các), "ngu" (ngủ).
  banned: ["dm", "dmm", "dcm", "vcl", "vkl", "clm", "djt", "dit me", "du ma", "dau buoi", "oc cho", "do ngu", "cho chet"],

  // Tầng quà theo số xu của 1 món; tên quà khớp giftMap thì ưu tiên
  tiers: { medium: 10, big: 300, huge: 1000, smallEffect: "plane", mediumEffect: "lantern", bigEffect: "rocket", hugeEffect: "bloom" },
  giftMap: {
    Rose: "plane",
    "Heart Me": "heart-balloon",
    "Finger Heart": "heart-balloon",
    "Paper Crane": "crane",
    "Hand Hearts": "lantern",
    Perfume: "hot-air-balloon",
    Doughnut: "hot-air-balloon",
    Fireworks: "firework",
    Galaxy: "meteor",
  },

  levels: [0, 50, 150, 400, 1000, 2500], // điểm để lên cấp 1..6
  milestones: [
    { at: 100, label: "Rung cây" },
    { at: 250, label: "Hoa nở" },
    { at: 500, label: "Đèn lồng sáng" },
    { at: 750, label: "Đàn hạc giấy" },
    { at: 1000, label: "Mưa sao băng" },
  ],
  energySteps: [10, 100, 1000],
  spotlightMin: 3,
  chatKeywords: ["thả lá", "nở hoa", "ước mạnh lên"],
  chatEvery: 20,

  max: SLOT_COUNT,
  protectMin: 10,
  volBg: 0.5,
  volFx: 0.8,
};

export function loadConfig() {
  try {
    return { ...structuredClone(DEFAULTS), ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    return structuredClone(DEFAULTS);
  }
}

export function saveConfig(cfg) {
  try {
    localStorage.setItem(KEY, JSON.stringify(cfg));
  } catch {}
}
