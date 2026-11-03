import { loadConfig, saveConfig, DEFAULTS, CHANNEL } from "./config.js";
import { RITUALS } from "./rituals.js";

const $ = (id) => document.getElementById(id);
const ch = new BroadcastChannel(CHANNEL);
let cfg = loadConfig();
let last = null; // STATE gần nhất từ overlay
let lastAt = 0;

// ---------- Form cấu hình ----------
// Gợi ý mã nghi thức: mỗi mã một thẻ code, tên tiếng Việt hiện khi rê chuột
$("ritualIds").append("Mỗi dòng: Tên quà = mã. Mã có sẵn: ");
RITUALS.forEach((r, i) => {
  const c = document.createElement("code");
  c.textContent = r.id;
  c.title = r.label;
  $("ritualIds").append(c, i < RITUALS.length - 1 ? " " : "");
});
for (const r of RITUALS) {
  $("defaultRitual").add(new Option(r.label, r.id));
  const l = document.createElement("label");
  const c = document.createElement("input");
  c.type = "checkbox";
  c.dataset.ritual = r.id;
  l.append(c, " " + r.label + (r.size === "big" ? " (lớn)" : ""));
  $("enabled").append(l);
}

function fill() {
  $("banner").value = cfg.banner;
  $("giftMap").value = Object.entries(cfg.giftMap).map(([g, r]) => `${g} = ${r}`).join("\n");
  $("defaultRitual").value = cfg.defaultRitual;
  $("goalLabel").value = cfg.goalLabel;
  $("goalTarget").value = cfg.goalTarget;
  $("keywords").value = cfg.keywords.join(", ");
  $("freeActions").checked = cfg.freeActions;
  $("disclaimer").checked = cfg.disclaimer;
  $("max").value = cfg.max;
  $("protectMin").value = cfg.protectMin;
  $("shadows").checked = cfg.shadows;
  $("volBg").value = cfg.volBg;
  $("volFx").value = cfg.volFx;
  $("bells").checked = cfg.bells;
  for (const c of document.querySelectorAll("[data-ritual]")) c.checked = cfg.enabled[c.dataset.ritual] !== false;
  $("simGift").replaceChildren(...Object.keys(cfg.giftMap).map((g) => new Option(g, g)));
}

function read() {
  const ids = new Set(RITUALS.map((r) => r.id));
  const giftMap = {};
  const bad = [];
  for (const line of $("giftMap").value.split("\n")) {
    const i = line.lastIndexOf("=");
    if (i < 0) continue;
    const g = line.slice(0, i).trim(), r = line.slice(i + 1).trim();
    if (!g) continue;
    if (ids.has(r)) giftMap[g] = r;
    else bad.push(line.trim());
  }
  if (bad.length) alert("Bỏ qua dòng có mã nghi thức không hợp lệ:\n" + bad.join("\n"));
  const n = (id, lo, hi, d) => {
    const v = Number($(id).value);
    return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d;
  };
  return {
    ...cfg,
    banner: $("banner").value.trim() || DEFAULTS.banner,
    giftMap,
    defaultRitual: $("defaultRitual").value,
    goalLabel: $("goalLabel").value.trim() || DEFAULTS.goalLabel,
    goalTarget: n("goalTarget", 1, 1e7, DEFAULTS.goalTarget),
    keywords: $("keywords").value.split(",").map((s) => s.trim()).filter(Boolean),
    freeActions: $("freeActions").checked,
    disclaimer: $("disclaimer").checked,
    max: n("max", 0, 120, 120),
    protectMin: n("protectMin", 0, 120, 10),
    shadows: $("shadows").checked,
    volBg: Number($("volBg").value),
    volFx: Number($("volFx").value),
    bells: $("bells").checked,
    enabled: Object.fromEntries([...document.querySelectorAll("[data-ritual]")].map((c) => [c.dataset.ritual, c.checked])),
  };
}

function apply() {
  cfg = read();
  saveConfig(cfg);
  ch.postMessage({ type: "CONFIG", cfg });
  fill();
  $("dirty").textContent = "";
}
$("save").onclick = apply;
// Báo có thay đổi chưa lưu khi người dùng sửa form
document.querySelector("main").addEventListener("input", (e) => {
  if (e.target.matches("input, textarea, select") && !["simGift", "simCombo"].includes(e.target.id)) $("dirty").textContent = "Có thay đổi chưa lưu";
});
$("defaults").onclick = () => {
  if (!confirm("Đưa toàn bộ cấu hình về mặc định?")) return;
  cfg = structuredClone(DEFAULTS);
  fill();
  apply();
};

// ---------- Lệnh ----------
const cmd = (c, args) => ch.postMessage({ type: "CMD", cmd: c, args });
$("pause").onclick = () => cmd(last && last.paused ? "resume" : "pause");
$("clearQueue").onclick = () => cmd("clearQueue");
const confirmCmd = (id, text, c) => ($(id).onclick = () => confirm(text) && cmd(c));
confirmCmd("resetCrowd", "Xóa toàn bộ nhân vật và hàng đợi? (giữ cấu hình và số liệu)", "resetCrowd");
confirmCmd("resetGoal", "Đặt lại thanh mục tiêu quà về 0?", "resetGoal");
confirmCmd("resetSession", "Reset phiên: xóa nhân vật, hàng đợi, số liệu, nến và hoa?", "resetSession");
for (const b of document.querySelectorAll("[data-sim]")) b.onclick = () => cmd("sim", { kind: b.dataset.sim });
$("simGiftBtn").onclick = () => cmd("sim", { kind: "gift", gift: $("simGift").value, combo: Number($("simCombo").value) });
for (const b of document.querySelectorAll("[data-bulk]")) b.onclick = () => cmd("bulk", { kind: b.dataset.bulk, n: 10 });
$("copyLog").onclick = () => navigator.clipboard.writeText($("log").textContent);

// ---------- Hiển thị trạng thái ----------
function setStatus(id, cls, text) {
  $(id).className = "status " + cls;
  $(id).textContent = text;
}

function render() {
  const age = Date.now() - lastAt;
  if (!last) setStatus("overlayStatus", "wait", "Đang chờ overlay…");
  else if (age > 3000) setStatus("overlayStatus", "bad", "Overlay không phản hồi (" + Math.round(age / 1000) + "s)");
  else setStatus("overlayStatus", "ok", "Overlay đang chạy" + (last.paused ? " · ĐANG TẠM DỪNG" : ""));
  if (!last) return;

  const evAge = last.lastEventAt ? Math.round((Date.now() - last.lastEventAt) / 1000) : null;
  if (last.ws !== "connected") setStatus("wsStatus", "bad", "TikFinity: mất kết nối, đang thử lại (mở TikFinity trên máy này)");
  else setStatus("wsStatus", evAge !== null && evAge < 60 ? "ok" : "wait", "TikFinity: đã kết nối · " + (evAge === null ? "chưa nhận sự kiện nào" : "sự kiện gần nhất " + evAge + "s trước"));

  $("tFps").textContent = last.fps;
  $("tPeople").textContent = `${last.people}/${last.max}`;
  $("tQueue").textContent = `${last.queue.pending}/${last.queue.running}`;
  $("tGifts").textContent = last.stats.giftTotal;
  $("tMode").textContent = last.stats.mode;
  $("tPray").textContent = `${last.stats.prayers}/${last.stats.prayerUsers}`;
  $("tAudio").textContent = last.audio === "on" ? "Bật" : "Tắt";
  $("audioHint").textContent = last.audio === "on" ? "" : "Âm thanh chưa bật: bấm nút “Bật âm thanh” trên trang overlay.";
  $("pause").textContent = last.paused ? "Tiếp tục tương tác" : "Tạm dừng tương tác";
  for (const b of document.querySelectorAll(".bulk")) {
    b.disabled = last.sawLive;
    b.title = last.sawLive ? "Đã nhận sự kiện LIVE thật: giả lập lớn bị khóa" : "";
  }
  $("log").textContent = last.rawLog.map((r) => `[${new Date(r.t).toLocaleTimeString()}] ${r.kind === "warn" ? "⚠ " : ""}${r.text}`).join("\n");
  if (last.leakRows.length) {
    $("leak").hidden = false;
    $("leak").tBodies[0].replaceChildren(
      ...last.leakRows.map((r) => {
        const tr = document.createElement("tr");
        for (const v of [r.label, r.fps, r.geometries, r.textures, r.calls, r.heapMB ?? "–", r.objects, r.users, r.labels, r.queue, r.particles]) {
          const td = document.createElement("td");
          td.textContent = v;
          tr.append(td);
        }
        return tr;
      })
    );
  }
}

ch.onmessage = ({ data: m }) => {
  if (m && m.type === "STATE") {
    last = m;
    lastAt = Date.now();
  }
};

fill();
ch.postMessage({ type: "SYNC_REQUEST" }); // mở/reload control → hỏi trạng thái ngay
setInterval(render, 500);
render();
