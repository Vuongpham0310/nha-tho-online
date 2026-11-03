import { loadConfig, saveConfig, DEFAULTS, CHANNEL } from "./config.js";
import { EFFECTS, EFFECT } from "./wishes.js";
import { SLOT_COUNT } from "./layout.js";

const $ = (id) => document.getElementById(id);
const ch = new BroadcastChannel(CHANNEL);
let cfg = loadConfig();
let last = null; // STATE gần nhất từ overlay
let lastAt = 0;

// ---------- Form cấu hình ----------
$("effectIds").append("Mã hiệu ứng: ");
EFFECTS.forEach((e, i) => {
  const c = document.createElement("code");
  c.textContent = e.id;
  c.title = e.label;
  $("effectIds").append(c, i < EFFECTS.length - 1 ? " " : "");
});
for (const id of ["effSmall", "effMedium", "effBig", "effHuge"]) for (const e of EFFECTS) $(id).add(new Option(e.label, e.id));
$("max").max = SLOT_COUNT;

const list = (s) => s.split(",").map((x) => x.trim()).filter(Boolean);
const nums = (s) => list(s).map(Number).filter(Number.isFinite);

function fill() {
  for (const k of ["title", "hintWish", "hintWishSub", "hintGift", "hintGiftSub", "wishMaxLen", "spotlightMin", "chatEvery", "max", "protectMin", "volBg", "volFx"]) $(k).value = cfg[k];
  $("disclaimer").checked = cfg.disclaimer;
  $("banned").value = cfg.banned.join(", ");
  $("tierMedium").value = cfg.tiers.medium;
  $("tierBig").value = cfg.tiers.big;
  $("tierHuge").value = cfg.tiers.huge;
  $("effSmall").value = cfg.tiers.smallEffect;
  $("effMedium").value = cfg.tiers.mediumEffect;
  $("effBig").value = cfg.tiers.bigEffect;
  $("effHuge").value = cfg.tiers.hugeEffect;
  $("giftMap").value = Object.entries(cfg.giftMap).map(([g, e]) => `${g} = ${e}`).join("\n");
  $("levels").value = cfg.levels.join(", ");
  $("milestones").value = cfg.milestones.map((m) => `${m.at} = ${m.label}`).join("\n");
  $("energySteps").value = cfg.energySteps.join(", ");
  $("chatKeywords").value = cfg.chatKeywords.join(", ");
  $("simGift").replaceChildren(...Object.keys(cfg.giftMap).map((g) => new Option(g, g)));
}

// Đọc form; dòng sai thì bỏ qua và báo, giữ giá trị cũ cho ô không hợp lệ
function read() {
  const bad = [];
  const n = (id, lo, hi, d) => {
    const v = Number($(id).value);
    return Number.isFinite(v) && $(id).value !== "" ? Math.min(hi, Math.max(lo, v)) : d;
  };
  const giftMap = {};
  for (const line of $("giftMap").value.split("\n")) {
    const i = line.lastIndexOf("=");
    if (i < 0) continue;
    const g = line.slice(0, i).trim(), e = line.slice(i + 1).trim();
    if (g && EFFECT[e]) giftMap[g] = e;
    else if (line.trim()) bad.push(line.trim());
  }
  const milestones = $("milestones").value.split("\n").map((line) => {
    const i = line.indexOf("=");
    const at = Number(line.slice(0, i).trim());
    return i > 0 && at > 0 ? { at, label: line.slice(i + 1).trim() || "Mốc" } : null;
  }).filter(Boolean).sort((a, b) => a.at - b.at);
  if (milestones.length !== 5) bad.push("Mốc cộng đồng cần đúng 5 dòng (giữ bản cũ)");
  let levels = nums($("levels").value);
  if (levels.length !== 6 || levels.some((v, i) => i && v <= levels[i - 1])) {
    bad.push("Điểm lên cấp cần 6 số tăng dần (giữ bản cũ)");
    levels = cfg.levels;
  }
  const medium = n("tierMedium", 1, 1e6, cfg.tiers.medium), big = n("tierBig", medium + 1, 1e6, cfg.tiers.big), huge = n("tierHuge", big + 1, 1e7, cfg.tiers.huge);
  if (bad.length) alert("Bỏ qua:\n" + bad.join("\n"));
  return {
    ...cfg,
    title: $("title").value.trim() || DEFAULTS.title,
    hintWish: $("hintWish").value.trim(),
    hintWishSub: $("hintWishSub").value.trim(),
    hintGift: $("hintGift").value.trim(),
    hintGiftSub: $("hintGiftSub").value.trim(),
    disclaimer: $("disclaimer").checked,
    wishMaxLen: n("wishMaxLen", 10, 60, cfg.wishMaxLen),
    banned: list($("banned").value),
    tiers: { medium, big, huge, smallEffect: $("effSmall").value, mediumEffect: $("effMedium").value, bigEffect: $("effBig").value, hugeEffect: $("effHuge").value },
    giftMap,
    levels,
    milestones: milestones.length === 5 ? milestones : cfg.milestones,
    energySteps: nums($("energySteps").value).length ? nums($("energySteps").value).sort((a, b) => a - b) : cfg.energySteps,
    spotlightMin: n("spotlightMin", 0.5, 120, cfg.spotlightMin),
    chatKeywords: list($("chatKeywords").value),
    chatEvery: n("chatEvery", 1, 1000, cfg.chatEvery),
    max: n("max", 0, SLOT_COUNT, cfg.max),
    protectMin: n("protectMin", 0, 120, cfg.protectMin),
    volBg: Number($("volBg").value),
    volFx: Number($("volFx").value),
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
$("newRound").onclick = () => confirm("Bắt đầu vòng mới? Điều ước bay đi hết trừ 5 điều ước năng lượng cao nhất, cây về cấp 1.") && cmd("newRound");
$("resetSession").onclick = () => confirm("Đặt lại cả phiên: xóa nhân vật, điều ước, số liệu, cấp cây?") && cmd("resetSession");
for (const b of document.querySelectorAll("[data-sim]")) b.onclick = () => cmd("sim", { kind: b.dataset.sim });
for (const b of document.querySelectorAll("[data-tier]")) b.onclick = () => cmd("sim", { kind: "gift", tier: b.dataset.tier });
$("simGiftBtn").onclick = () => cmd("sim", { kind: "gift", gift: $("simGift").value, combo: Number($("simCombo").value) });
for (const b of document.querySelectorAll("[data-bulk]")) b.onclick = () => cmd("bulk", { kind: b.dataset.bulk, n: 10 });
$("copyLog").onclick = () => navigator.clipboard.writeText($("log").textContent);
$("wishList").addEventListener("click", (e) => {
  const key = e.target.closest("button")?.dataset.key;
  if (key) cmd("hideWish", { key });
});

// ---------- Hiển thị trạng thái ----------
function setStatus(id, cls, text) {
  $(id).className = "status " + cls;
  $(id).textContent = text;
}

let renderedLog = "";
let renderedLeak = 0;
let renderedWishes = "";
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
  $("tWishes").textContent = `${last.stats.wishes} (treo ${last.wishes.length})`;
  $("tGifts").textContent = `${last.stats.giftTotal} · ${last.stats.diamonds} xu`;
  $("tMode").textContent = last.stats.mode;
  $("tTree").textContent = `${last.tree.level} · ${last.tree.points}`;
  $("tAudio").textContent = last.audio === "on" ? "Bật" : "Tắt";
  $("audioHint").textContent = last.audio === "on" ? "" : "Âm thanh chưa bật: bấm chuột một lần vào cửa sổ overlay.";
  $("pause").textContent = last.paused ? "Tiếp tục tương tác" : "Tạm dừng tương tác";
  for (const b of document.querySelectorAll(".bulk")) {
    b.disabled = last.sawLive;
    b.title = last.sawLive ? "Đã nhận sự kiện LIVE thật: giả lập lớn bị khóa" : "";
  }

  // Danh sách điều ước: chỉ vẽ lại khi đổi, để nút Ẩn không bị thay giữa lúc bấm
  const wk = JSON.stringify(last.wishes);
  if (wk !== renderedWishes) {
    renderedWishes = wk;
    $("wishList").replaceChildren(
      ...last.wishes.map((w) => {
        const li = document.createElement("li");
        const who = document.createElement("span");
        who.className = "who";
        who.textContent = w.nickname;
        const what = document.createElement("span");
        what.className = "what";
        what.textContent = w.text;
        li.append(who, what);
        if (w.gifted) {
          const g = document.createElement("span");
          g.className = "gifted";
          g.textContent = "đã tặng quà";
          li.append(g);
        }
        const b = document.createElement("button");
        b.textContent = "Ẩn";
        b.dataset.key = w.key;
        li.append(b);
        return li;
      })
    );
  }

  const logKey = last.rawLog.length + ":" + (last.rawLog.at(-1)?.t ?? 0);
  if (logKey !== renderedLog) {
    renderedLog = logKey;
    $("log").textContent = last.rawLog.map((r) => `[${new Date(r.t).toLocaleTimeString()}] ${r.kind === "warn" ? "⚠ " : ""}${r.text}`).join("\n");
  }
  if (last.leakRows.length && last.leakRows.length !== renderedLeak) {
    renderedLeak = last.leakRows.length;
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
