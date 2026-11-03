import * as THREE from "three";
import { loadAssets, sprite, place, labelCount } from "./scene/assets.js";
import { createFx } from "./scene/fx.js";
import { createTree } from "./scene/tree.js";
import { createCrowd } from "./scene/avatars.js";
import { createFlights } from "./scene/flights.js";
import { W, H, SLOT_ORDER, TAG_SLOTS } from "./layout.js";
import { createSeats } from "./seats.js";
import { createPipeline, connectTikFinity } from "./events.js";
import { createStats, allowBulkSimulation } from "./stats.js";
import { createQueue } from "./queue.js";
import { createAudio } from "./audio.js";
import { createHud } from "./hud.js";
import { loadConfig, CHANNEL } from "./config.js";
import { hasKeyword } from "./text.js";
import { EFFECT, parseWish, createWishBoard, giftEffect, tierOf, flightCaption, treeLevel, treePoints, newMilestones, energyLevel, topStars, createComboTracker, pickSpotlight } from "./wishes.js";

let cfg = loadConfig();

// ---------- Khung 9:16 co giãn vừa cửa sổ ----------
const stage = document.getElementById("stage");
const fit = () => (stage.style.transform = `translate(-50%, -50%) scale(${Math.min(innerWidth / W, innerHeight / H)})`);
addEventListener("resize", fit);
fit();

// ---------- Cảnh 2D (three.js, camera trực giao, đơn vị = pixel) ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
stage.prepend(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(0, W, 0, -H, -1000, 1000);
camera.position.z = 500;

const tex = await loadAssets();
const bg = sprite(tex.background, { w: W, h: H, anchor: [0, 0] });
place(bg, 0, H, 0);
scene.add(bg);

const fx = createFx(scene);
const tree = createTree(scene, tex, fx);
const seats = createSeats({ order: SLOT_ORDER, max: cfg.max, protectMs: cfg.protectMin * 60_000 });
const crowd = createCrowd(scene, seats, tex);
const board = createWishBoard({ slots: TAG_SLOTS.length });
const stats = createStats();
const audio = createAudio();

// Năng lượng điều ước theo người: { key, nickname, energy, since }
const energy = new Map();
const combos = createComboTracker();
const gifters = new Set();
const spotlightRecent = new Map();
const firedMilestones = new Set();
let recentWishes = [];
let chatCount = 0;
let lastSpotlight = Date.now();
let level = 1;
let starKeys = [];

const rawLog = [];
const log = (kind, text) => {
  rawLog.push({ t: Date.now(), kind, text: String(text).slice(0, 600) });
  if (rawLog.length > 50) rawLog.shift();
};
const pipeline = createPipeline({ warn: (m, raw) => log("warn", m + " · " + (typeof raw === "string" ? raw : JSON.stringify(raw))) });

// Gỡ điều ước khỏi cây khi nó bay đi
function takeWish(key) {
  const w = board.remove(key);
  if (!w) return null;
  tree.unhang(w.slot);
  crowd.get(key)?.setWish(false);
  const [x, y] = tree.slotPos(w.slot);
  return { x, y, text: w.text };
}
const flights = createFlights({ tex, fx, tree, audio, takeWish, avatarHead: (key) => crowd.get(key)?.head() });

// Icon chú thích lấy từ chính hình vật bay
const ICON_IMG = { plane: "plane", "heart-balloon": "heart-balloon", crane: "crane", lantern: "lantern", "hot-air-balloon": "hot-air-balloon", rocket: "rocket", firework: "star", meteor: "star", bloom: "flower", spotlight: "plane", level: "star", "combo-planes": "plane", "combo-lanterns": "lantern", "combo-super": "star", "chat-react": "petal" };
const iconUrl = new Map();
const effectIcon = (id) => {
  const name = ICON_IMG[id] ?? (id?.startsWith("milestone") ? "flower" : null);
  if (!name) return "";
  if (!iconUrl.has(name)) iconUrl.set(name, tex[name].image.toDataURL());
  return iconUrl.get(name);
};
const hud = createHud(document.getElementById("hud"), { effectIcon });

// Âm thanh: thử bật ngay; nếu Chrome chặn thì tự bật ở lần click/phím đầu tiên trên cửa sổ overlay
audio.unlock();
for (const t of ["pointerdown", "keydown"]) addEventListener(t, () => audio.unlock(), { once: true });

// ---------- Hàng đợi hiệu ứng ----------
const queue = createQueue({
  start(entry) {
    const k = entry.users[0].key;
    entry.actor = crowd.lock(k) ? k : null;
    if (entry.actor) crowd.get(k)?.cheer(entry.size === "big");
    hud.caption(entry.caption ?? flightCaption(entry), entry.ritualId, entry.size === "big");
    return flights.start(entry);
  },
  end(entry) {
    if (entry.actor) crowd.unlock(entry.actor);
  },
});
const SYSTEM = { key: "_system", nickname: "" };
function enqueueSpecial(id, size, caption, who = SYSTEM) {
  if (paused) return;
  const e = queue.enqueue({ ritualId: id, size, key: who.key, nickname: who.nickname });
  e.caption = caption;
}

let paused = false;
let ws = "disconnected";
let lastEventAt = 0;

function applyConfig() {
  hud.setTexts(cfg);
  crowd.setMax(cfg.max);
  seats.protectMs = cfg.protectMin * 60_000;
  audio.setVolumes(cfg.volBg, cfg.volFx);
}

// Tạo/cập nhật nhân vật. Tạm dừng: chỉ cập nhật người đã ngồi.
function join(ev) {
  const r = crowd.join(ev.key, ev.nickname, { create: !paused, isTest: ev.isTest });
  if (r.created && board.get(ev.key)) crowd.get(ev.key).setWish(true);
  return r;
}

// Cập nhật aura nhân vật + độ sáng thẻ ước theo năng lượng
function refreshEnergy(key) {
  const u = energy.get(key);
  const lv = u ? energyLevel(u.energy, cfg.energySteps) : 0;
  crowd.get(key)?.setEnergy(lv);
  const w = board.get(key);
  if (w) tree.setPower(w.slot, w.nickname, lv);
}
function refreshStars() {
  const top = topStars(energy);
  const keys = top.map((u) => u.key);
  for (const k of starKeys) if (!keys.includes(k)) crowd.get(k)?.setStar(false);
  for (const k of keys) crowd.get(k)?.setStar(true);
  starKeys = keys;
  hud.stars(top);
}

function addWish(ev, text, S) {
  S.wishes++;
  for (const i of newMilestones(S.wishes, cfg.milestones, firedMilestones)) {
    const m = cfg.milestones[i];
    enqueueSpecial(`milestone-${i}`, "big", `Đạt mốc ${m.at.toLocaleString("vi-VN")} điều ước: ${m.label}!`);
  }
  if (paused) return;
  const r = board.add(ev.key, ev.nickname, text);
  if (r.evicted) {
    tree.unhang(r.evicted.slot);
    crowd.get(r.evicted.key)?.setWish(false);
  }
  const slot = r.wish.slot;
  const lv = energyLevel(energy.get(ev.key)?.energy ?? 0, cfg.energySteps);
  flights.hang(`${ev.nickname}: ${text}`, tree.slotPos(slot), () => board.get(ev.key)?.slot === slot && tree.hang(slot, ev.nickname, lv));
  crowd.get(ev.key)?.setWish(true);
  recentWishes = [{ nickname: ev.nickname, text }, ...recentWishes.filter((w) => w.nickname !== ev.nickname)].slice(0, 3);
  hud.recent(recentWishes);
}

function handleRaw(raw) {
  log("raw", typeof raw === "string" ? raw : JSON.stringify(raw));
  const ev = pipeline(raw);
  if (!ev) return;
  lastEventAt = Date.now();
  const S = stats.of(ev);
  switch (ev.type) {
    case "roomUser":
      stats.viewers = ev.viewerCount;
      return;
    case "gift": {
      stats.addGift(ev); // đếm ngay, kể cả khi tạm dừng
      join(ev);
      crowd.protect(ev.key);
      gifters.add(ev.key);
      board.markGifted(ev.key);
      const u = energy.get(ev.key) ?? { key: ev.key, nickname: ev.nickname, energy: 0, since: Date.now() };
      u.energy += (ev.diamonds || 1) * ev.count;
      u.nickname = ev.nickname;
      energy.set(ev.key, u);
      refreshEnergy(ev.key);
      refreshStars();
      if (paused) return;
      const id = giftEffect(ev.giftName, ev.diamonds, cfg);
      queue.enqueue({ ritualId: id, size: EFFECT[id].size, key: ev.key, nickname: ev.nickname, giftId: ev.giftId, count: ev.count });
      const tier = tierOf(ev.diamonds || 0, cfg.tiers);
      if (tier === "big" || tier === "huge") tree.shake(0.025, 1.2);
      for (const c of combos.add(ev.key, tier)) {
        const cap = { planes: `Combo! Đàn máy bay giấy của ${ev.nickname}`, lanterns: `Combo! Mưa đèn lồng của ${ev.nickname}`, super: `${ev.nickname} kích hoạt siêu phóng điều ước!` }[c];
        enqueueSpecial(`combo-${c}`, c === "planes" ? "small" : "big", cap, ev);
      }
      return;
    }
    case "chat": {
      S.comments++;
      join(ev);
      const w = parseWish(ev.text, { maxLen: cfg.wishMaxLen, banned: cfg.banned });
      if (w === null) {
        if (hasKeyword(ev.text, cfg.chatKeywords) && ++chatCount % cfg.chatEvery === 0) enqueueSpecial("chat-react", "small", "Cả nhà cùng làm cây rung rinh!");
      } else if (!w.ok) log("warn", `Chặn điều ước (${w.reason}) của ${ev.nickname}: ${ev.text}`);
      else addWish(ev, w.text, S);
      return;
    }
    case "like":
      S.likes += ev.count;
      join(ev);
      return;
    case "share":
      S.shares++;
      join(ev);
      return;
    case "follow":
      S.follows++;
      join(ev);
      return;
    default:
      join(ev); // member, subscribe
  }
}

// Spotlight miễn phí: thỉnh thoảng cây tự chọn điều ước của người chưa tặng quà
function spotlightTick() {
  if (paused || Date.now() - lastSpotlight < cfg.spotlightMin * 60_000) return;
  lastSpotlight = Date.now();
  const picks = pickSpotlight(board.list(), { gifters, recent: spotlightRecent, now: Date.now(), n: board.count > 10 ? 2 : 1 });
  for (const w of picks) {
    spotlightRecent.set(w.key, Date.now());
    enqueueSpecial("spotlight", "small", `Cây chọn ngẫu nhiên điều ước của ${w.nickname}`, w);
  }
}

function hideWish(key) {
  if (!takeWish(key)) return;
  recentWishes = recentWishes.filter((w) => board.get(key) || w.nickname !== energy.get(key)?.nickname);
  hud.recent(recentWishes);
}

// Vòng mới: phần lớn điều ước bay đi, giữ 5 điều ước năng lượng cao nhất, cây và mốc tính lại
function newRound() {
  const keep = new Set(board.list().sort((a, b) => (energy.get(b.key)?.energy ?? 0) - (energy.get(a.key)?.energy ?? 0)).slice(0, 5).map((w) => w.key));
  for (const w of board.list()) if (!keep.has(w.key)) queue.enqueue({ ritualId: "plane", size: "small", key: w.key, nickname: w.nickname });
  stats.newRound();
  firedMilestones.clear();
  level = 1;
  tree.setLevel(1);
}

function resetSession() {
  queue.cancelAll();
  fx.reset();
  crowd.reset();
  board.clear();
  tree.reset();
  stats.reset();
  energy.clear();
  combos.clear();
  gifters.clear();
  spotlightRecent.clear();
  firedMilestones.clear();
  recentWishes = [];
  starKeys = [];
  chatCount = 0;
  level = 1;
  hud.recent([]);
  hud.stars([]);
}

// ---------- Giả lập (isTest) ----------
const NAMES = ["Minh Anh", "Thu Hà", "Ngọc Lan", "Tuấn Kiệt", "Bảo Châu", "Hải Đăng", "Khánh Linh", "Quang Huy", "Mai Phương", "Đức Anh"];
const WISHES = ["thi tốt", "gia đình bình an", "chốt đơn", "giảm 5kg", "có người yêu", "mẹ khỏe mạnh", "công việc thuận lợi", "đỗ đại học", "bình an", "may mắn cả năm"];
const TIER_GIFTS = { small: ["Quà nhỏ", 1], medium: ["Quà vừa", 50], big: ["Quà lớn", 500], huge: ["Quà khủng", 5000] };
const testUser = (i, tag = "t") => ({ userId: `test-${tag}-${i}`, uniqueId: `test_${tag}_${i}`, nickname: NAMES[i % NAMES.length] + " " + i });
let testSeq = 0;
const send = (event, data) => handleRaw({ event, data, isTest: true });
function testGift(u, giftName, combo = 1, diamondCount = 1) {
  const id = ++testSeq;
  for (let c = 1; c <= combo; c++) send("gift", { ...u, giftId: "t-" + giftName, giftName, diamondCount, giftType: combo > 1 ? 1 : 2, repeatCount: c, repeatEnd: c === combo, groupId: "tg" + id, msgId: `tm${id}-${c}` });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const lastTestUser = () => [...seats.users.values()].filter((u) => u.isTest).pop();

function sim({ kind, gift, combo = 1, tier }) {
  const u = testUser(++testSeq, "s");
  const w = WISHES[testSeq % WISHES.length];
  if (kind === "join") send("member", u);
  else if (kind === "wish") send("chat", { ...u, comment: "Ước: " + w });
  else if (kind === "badWish") send("chat", { ...u, comment: "Ước: gọi em 0912345678" });
  else if (kind === "like") send("like", { ...u, likeCount: 10 });
  else if (kind === "chatReact") for (let i = 0; i < cfg.chatEvery; i++) send("chat", { ...testUser(++testSeq, "c"), comment: "thả lá" });
  else if (kind === "gift") {
    // Tặng quà cho người vừa ước gần nhất để thấy điều ước rời cây
    const last = board.list()[0];
    const giver = last ? { userId: last.key, nickname: last.nickname } : u;
    if (tier) testGift(giver, TIER_GIFTS[tier][0], 1, TIER_GIFTS[tier][1]);
    else testGift(giver, gift || Object.keys(cfg.giftMap)[0], combo, 1);
  } else if (kind === "combo") {
    send("chat", { ...u, comment: "Ước: " + w });
    for (let i = 0; i < 3; i++) testGift(u, "Quà nhỏ", 1, 1);
    testGift(u, "Quà lớn", 1, 500);
  } else if (kind === "levelUp") {
    const v = stats.view;
    const lv = treeLevel(treePoints(v), cfg.levels);
    testGift(lastTestUser() ? { userId: lastTestUser().key, nickname: lastTestUser().nickname } : u, "Quà vừa", 1, Math.max(1, lv.to - treePoints(v)));
  } else if (kind === "spotlight") {
    lastSpotlight = 0;
    spotlightTick();
  }
}

const leakRows = [];
function metrics(label) {
  let objects = 0;
  scene.traverse(() => objects++);
  return { label, fps, geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures, calls: renderer.info.render.calls, heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null, objects, users: seats.count, labels: labelCount(), queue: queue.pending + queue.running, particles: fx.count };
}

let bulkBusy = false;
async function bulk(kind, n = 10) {
  if (!allowBulkSimulation(stats)) {
    log("warn", "Đã nhận sự kiện LIVE thật: từ chối giả lập lớn '" + kind + "'");
    return;
  }
  if (bulkBusy) return;
  bulkBusy = true;
  try {
    if (kind === "crowd") {
      for (let i = 0; i < 40; i++) {
        send("chat", { ...testUser(++testSeq, "v"), comment: i % 2 ? "Ước: " + WISHES[i % WISHES.length] : "chào cả nhà" });
        await sleep(60);
      }
    } else if (kind === "stress") {
      const users = Array.from({ length: 60 }, () => testUser(++testSeq, "x"));
      for (let i = 0; i < 150; i++) {
        const u = users[i % users.length];
        if (i % 3 === 2) testGift(u, i % 9 ? "Quà nhỏ" : "Quà lớn", 1 + (i % 4), i % 9 ? 1 : 500);
        else send("chat", { ...u, comment: "Ước: " + WISHES[i % WISHES.length] });
        await sleep(66);
      }
    } else if (kind === "leak") {
      leakRows.length = 0;
      for (let c = 1; c <= n; c++) {
        for (let i = 0; i < 80; i++) send("chat", { ...testUser(c * 1000 + i, "l"), comment: "Ước: " + WISHES[i % WISHES.length] });
        for (let i = 0; i < 20; i++) testGift(testUser(c * 1000 + i, "l"), ["Quà nhỏ", "Quà vừa", "Quà lớn"][i % 3], 1, [1, 50, 500][i % 3]);
        const t0 = Date.now();
        while (queue.pending + queue.running > 0 && Date.now() - t0 < 30_000) await sleep(250);
        resetSession();
        await sleep(800);
        leakRows.push(metrics("vòng " + c));
      }
    }
  } finally {
    bulkBusy = false;
  }
}

// ---------- Đồng bộ với control ----------
const ch = new BroadcastChannel(CHANNEL);
function state() {
  const v = stats.view;
  const lv = treeLevel(treePoints(v), cfg.levels);
  return {
    type: "STATE",
    at: Date.now(),
    ws,
    lastEventAt,
    fps,
    people: seats.count,
    max: seats.max,
    queue: { pending: queue.pending, running: queue.running, dropped: queue.dropped },
    audio: audio.state,
    paused,
    sawLive: stats.sawLive,
    viewers: stats.viewers,
    stats: { giftTotal: v.giftTotal, diamonds: v.diamonds, wishes: v.wishes, likes: v.likes, mode: stats.sawLive ? "LIVE" : "TEST" },
    tree: { level: lv.level, points: treePoints(v) },
    wishes: board.list().map((w) => ({ key: w.key, nickname: w.nickname, text: w.text, gifted: w.gifted })),
    rawLog,
    leakRows,
  };
}
ch.onmessage = ({ data: m }) => {
  if (!m || typeof m !== "object") return;
  if (m.type === "SYNC_REQUEST") ch.postMessage(state());
  else if (m.type === "CONFIG") {
    cfg = m.cfg;
    applyConfig();
  } else if (m.type === "CMD") {
    const a = m.args || {};
    switch (m.cmd) {
      case "pause": paused = true; break;
      case "resume": paused = false; break;
      case "clearQueue": queue.clear(); break;
      case "hideWish": hideWish(a.key); break;
      case "newRound": newRound(); break;
      case "resetSession": resetSession(); break;
      case "sim": sim(a); break;
      case "bulk": bulk(a.kind, a.n); break;
    }
    ch.postMessage(state());
  }
};
setInterval(() => ch.postMessage(state()), 1000);

connectTikFinity({
  onMessage: handleRaw,
  onStatus: (s) => {
    ws = s;
    log("warn", "TikFinity: " + (s === "connected" ? "đã kết nối" : "mất kết nối, đang thử lại"));
  },
});

// HUD + cấp cây + spotlight
setInterval(() => {
  const v = stats.view;
  const pts = treePoints(v);
  const lv = treeLevel(pts, cfg.levels);
  if (lv.level !== level) {
    if (lv.level > level) {
      flights.levelUp();
      hud.caption(`Cây đã lên cấp ${lv.level}!`, "level", true);
    }
    level = lv.level;
    tree.setLevel(level);
  }
  hud.level(lv.level, pts, lv.from, lv.to);
  hud.milestones(cfg.milestones, v.wishes);
  spotlightTick();
}, 250);

// ---------- Vòng render ----------
let fps = 0, frames = 0, fpsT = performance.now(), last = performance.now();
function loop(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  frames++;
  if (now - fpsT >= 1000) {
    fps = Math.round((frames * 1000) / (now - fpsT));
    frames = 0;
    fpsT = now;
  }
  crowd.update(dt);
  queue.tick(dt);
  fx.update(dt);
  tree.update(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

applyConfig();
hud.stars([]);
requestAnimationFrame(loop);
// Cho phép gọi từ console khi gỡ lỗi
window.__cay = { handleRaw, metrics, crowd, queue, stats, board, sim, step: (dt) => (crowd.update(dt), queue.tick(dt), fx.update(dt), tree.update(dt)), render: () => renderer.render(scene, camera) };
