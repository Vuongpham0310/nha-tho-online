import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { buildChurch } from "./three/church.js";
import { buildPews } from "./three/pews.js";
import { labelCount } from "./three/person.js";
import { SEAT_ORDER } from "./shared.js";
import { createSeats } from "./seats.js";
import { createCrowd } from "./crowd.js";
import { createPipeline, connectTikFinity } from "./events.js";
import { createStats, allowBulkSimulation } from "./stats.js";
import { createQueue, caption, RITUAL } from "./rituals.js";
import { createEffects } from "./effects.js";
import { createAudio } from "./audio.js";
import { createHud } from "./hud.js";
import { loadConfig, CHANNEL } from "./config.js";
import { isPrayer } from "./text.js";

const W = 1080, H = 1920;
let cfg = loadConfig();

// ---------- Khung 9:16 co giãn vừa cửa sổ ----------
const stage = document.getElementById("stage");
function fit() {
  const s = Math.min(innerWidth / W, innerHeight / H);
  stage.style.transform = `translate(-50%, -50%) scale(${s})`;
}
addEventListener("resize", fit);
fit();

// ---------- Cảnh 3D ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
stage.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1b120c);
const pm = new THREE.PMREMGenerator(renderer);
scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
pm.dispose();

const camera = new THREE.PerspectiveCamera(62, W / H, 0.1, 400);
camera.position.set(0, 12.5, 31);
camera.lookAt(0, 5.5, -16);

const church = buildChurch(scene);
buildPews(scene);

// ---------- Logic ----------
const seats = createSeats({ order: SEAT_ORDER, max: cfg.max, protectMs: cfg.protectMin * 60_000 });
const crowd = createCrowd(scene, seats);
const stats = createStats();
const audio = createAudio();
const rawLog = []; // 50 sự kiện thô cuối + cảnh báo, gửi lên control
const log = (kind, text) => {
  rawLog.push({ t: Date.now(), kind, text: String(text).slice(0, 600) });
  if (rawLog.length > 50) rawLog.shift();
};
const pipeline = createPipeline({ warn: (m, raw) => log("warn", m + " · " + (typeof raw === "string" ? raw : JSON.stringify(raw))) });
const effects = createEffects({ scene, church, crowd, audio });
const hud = createHud(document.getElementById("hud"), {
  onUnlockAudio: async () => {
    await audio.unlock();
    hud.setAudioButton(audio.state !== "on");
  },
});

const queue = createQueue({
  start(entry) {
    const k = entry.users[0].key;
    entry.actor = crowd.lock(k) ? k : null;
    hud.caption(caption(entry), entry.size);
    return effects.start(entry);
  },
  end(entry) {
    if (entry.actor) crowd.unlock(entry.actor);
    for (const k of entry.extraLocks || []) crowd.unlock(k);
  },
});

let paused = false;
let ws = "disconnected";
let lastEventAt = 0;
const lastLikeCandle = new Map(); // thả tim → thắp nến, mỗi người tối đa 1 lần/phút

function applyConfig() {
  hud.setBanner(cfg.banner);
  hud.setGiftTable(cfg.giftMap, cfg.enabled);
  hud.setDisclaimer(cfg.disclaimer);
  crowd.setMax(cfg.max);
  seats.protectMs = cfg.protectMin * 60_000;
  church.lights.sun.castShadow = cfg.shadows;
  audio.setVolumes(cfg.volBg, cfg.volFx);
}

function enqueue(id, ev, giftId = "", count = 1) {
  if (paused || !cfg.enabled[id] || !RITUAL[id]) return;
  queue.enqueue({ ritualId: id, size: RITUAL[id].size, key: ev.key, nickname: ev.nickname, giftId, count });
}

// Tạo/cập nhật nhân vật. Tạm dừng: chỉ cập nhật người đã ngồi.
function join(ev) {
  const r = crowd.join(ev.key, ev.nickname, { create: !paused, isTest: ev.isTest });
  if (r.created) {
    hud.toast(ev.nickname);
    if (cfg.freeActions) enqueue("lam-dau", ev);
  }
  return r;
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
      crowd.protect(ev.key); // bảo vệ chỗ ngay, kể cả khi tạm dừng
      enqueue(cfg.giftMap[ev.giftName] ?? cfg.defaultRitual, ev, ev.giftId, ev.count);
      return;
    }
    case "chat": {
      const pray = isPrayer(ev.text, cfg.keywords);
      if (pray) {
        S.prayers++;
        S.prayerUsers.add(ev.key);
      }
      join(ev);
      if (pray && !paused) {
        hud.feed(ev.nickname, ev.text);
        if (cfg.freeActions) enqueue("quy-cau-nguyen", ev);
      }
      return;
    }
    case "like": {
      S.likes += ev.count;
      join(ev);
      const t = Date.now();
      if (cfg.freeActions && t - (lastLikeCandle.get(ev.key) || 0) > 60_000) {
        lastLikeCandle.set(ev.key, t);
        enqueue("thap-nen", ev);
      }
      return;
    }
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

function resetCrowd() {
  queue.cancelAll(); // chạy done() của từng hiệu ứng + nhả khóa
  effects.reset();
  crowd.reset();
  lastLikeCandle.clear();
}
function resetSession() {
  resetCrowd();
  stats.reset();
  church.candles.reset();
  church.flowers.reset();
}

// ---------- Giả lập (isTest) ----------
const NAMES = ["Maria Lan", "Giuse Minh", "Anna Thu", "Phêrô Hùng", "Têrêsa Hoa", "Gioan Nam", "Cecilia Mai", "Phaolô Tuấn", "Lucia Hạnh", "Antôn Bình"];
const testUser = (i, tag = "t") => ({ userId: `test-${tag}-${i}`, uniqueId: `test_${tag}_${i}`, nickname: NAMES[i % NAMES.length] + " " + i });
let testSeq = 0;
const send = (event, data) => handleRaw({ event, data, isTest: true });
const giftNames = () => Object.keys(cfg.giftMap);
function testGift(u, giftName, combo = 1) {
  const id = ++testSeq;
  const giftId = "t-" + giftName;
  for (let c = 1; c <= combo; c++) {
    send("gift", { ...u, giftId, giftName, giftType: combo > 1 ? 1 : 2, repeatCount: c, repeatEnd: c === combo, groupId: "tg" + id, msgId: `tm${id}-${c}` });
  }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function sim({ kind, gift, combo = 1 }) {
  const u = testUser(Math.floor(Math.random() * 1000), "s");
  if (kind === "join") send("member", u);
  else if (kind === "chat") send("chat", { ...u, comment: "Lạy Chúa, xin ban bình an cho gia đình con. Amen" });
  else if (kind === "like") send("like", { ...u, likeCount: 10 });
  else if (kind === "share") send("share", u);
  else if (kind === "gift") testGift(u, gift || giftNames()[0], combo);
}

const leakRows = [];
function metrics(label) {
  let objects = 0;
  scene.traverse(() => objects++);
  return {
    label,
    fps,
    geometries: renderer.info.memory.geometries,
    textures: renderer.info.memory.textures,
    calls: renderer.info.render.calls,
    heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null,
    objects,
    users: seats.count,
    labels: labelCount(),
    queue: queue.pending + queue.running,
    particles: effects.particles,
  };
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
    if (kind === "virtual50") {
      for (let i = 0; i < 50; i++) {
        send("chat", { ...testUser(++testSeq, "v"), comment: i % 2 ? "Amen" : "Xin chào cả nhà" });
        await sleep(40);
      }
    } else if (kind === "stress") {
      const users = Array.from({ length: 60 }, () => testUser(++testSeq, "x"));
      for (let i = 0; i < 150; i++) {
        const u = users[i % users.length];
        if (i % 3 === 2) testGift(u, giftNames()[i % giftNames().length], 1 + (i % 4));
        else send("chat", { ...u, comment: i % 2 ? "Lạy Chúa thương xót" : "hello" });
        await sleep(66); // ~150 sự kiện trong 10s
      }
    } else if (kind === "leak") {
      leakRows.length = 0;
      const saveMax = cfg.max;
      for (let c = 1; c <= n; c++) {
        crowd.setMax(120);
        for (let i = 0; i < 150; i++) send("chat", { ...testUser(c * 1000 + i, "l"), comment: "Amen" }); // 150 > MAX → thay chỗ
        for (let i = 0; i < 20; i++) testGift(testUser(c * 1000 + 130 + i, "l"), giftNames()[i % giftNames().length], 2);
        const t0 = Date.now();
        while (queue.pending + queue.running > 0 && Date.now() - t0 < 25_000) await sleep(250);
        resetSession();
        await sleep(800);
        leakRows.push(metrics("chu kỳ " + c));
      }
      crowd.setMax(saveMax);
    }
  } finally {
    bulkBusy = false;
  }
}

// ---------- Đồng bộ với control ----------
const ch = new BroadcastChannel(CHANNEL);
function state() {
  const v = stats.view;
  return {
    type: "STATE",
    at: Date.now(),
    ws,
    lastEventAt,
    fps,
    people: seats.count,
    max: seats.max,
    queue: { pending: queue.pending, running: queue.running, dropped: queue.dropped },
    particles: effects.particles,
    audio: audio.state,
    paused,
    sawLive: stats.sawLive,
    viewers: stats.viewers,
    stats: { giftTotal: v.giftTotal, gifts: v.gifts, prayers: v.prayers, prayerUsers: v.prayerUsers.size, shares: v.shares, likes: v.likes, follows: v.follows, mode: stats.sawLive ? "LIVE" : "TEST" },
    gpu: metrics("now"),
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
      case "resetCrowd": resetCrowd(); break;
      case "resetSession": resetSession(); break;
      case "resetGoal": stats.resetGoal(); break;
      case "sim": sim(a); break;
      case "bulk": bulk(a.kind, a.n); break;
    }
    ch.postMessage(state());
  }
};
setInterval(() => ch.postMessage(state()), 1000);

// ---------- TikFinity ----------
connectTikFinity({
  onMessage: handleRaw,
  onStatus: (s) => {
    ws = s;
    log("warn", "TikFinity: " + (s === "connected" ? "đã kết nối" : "mất kết nối, đang thử lại"));
  },
});

// Chuông nền mỗi 15 phút (không gắn với quà)
setInterval(() => cfg.bells && audio.bell(), 15 * 60_000);

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
  effects.update(dt);
  church.update(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

setInterval(() => {
  const v = stats.view;
  hud.counts(v, stats.viewers, cfg.goalLabel, v.giftTotal - v.goalBase, cfg.goalTarget);
  hud.setAudioButton(audio.state !== "on");
}, 250);

applyConfig();
requestAnimationFrame(loop);
// Cho phép gọi từ console khi gỡ lỗi
window.__nhatho = { handleRaw, metrics, crowd, queue, stats, render: () => renderer.render(scene, camera) };
