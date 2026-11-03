import * as THREE from "three";
import { createRefCache } from "../refcache.js";

// Ảnh trong public/images/<tên>.webp|png. Nạp hết lúc khởi động; thiếu ảnh nào thì vẽ tạm bằng canvas.
const IMAGES = ["background", "tree", "wish-tag", "plane", "heart-balloon", "crane", "lantern", "hot-air-balloon", "rocket", "star", "petal", "flower"];
const AVATARS = 8; // avatar-1..8, có bao nhiêu dùng bấy nhiêu
const EXTS = ["webp", "png"];

function loadImage(src) {
  return new Promise((ok, fail) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = fail;
    img.src = src;
  });
}
const tryLoad = (name) => EXTS.reduce((p, ext) => p.catch(() => loadImage(`./images/${name}.${ext}`)), Promise.reject());

// Cắt lề trong suốt để kích thước ảnh = kích thước vật
function trimmed(img) {
  const w = img.naturalWidth, h = img.naturalHeight;
  const c = canvas(w, h);
  const g = c.getContext("2d", { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  const px = g.getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (px[(y * w + x) * 4 + 3] > 16) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  if (x1 < 0 || (x0 === 0 && y0 === 0 && x1 === w - 1 && y1 === h - 1)) return c;
  const out = canvas(x1 - x0 + 1, y1 - y0 + 1);
  out.getContext("2d").drawImage(c, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
  return out;
}

function canvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}
function texFrom(src) {
  const t = new THREE.CanvasTexture(src);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  t.userData.aspect = src.width / src.height;
  return t;
}
const draw = (w, h, fn) => {
  const c = canvas(w, h);
  fn(c.getContext("2d"), w, h);
  return c;
};

// ---------- Hình vẽ tạm (cùng tinh thần mockup: dễ thương, sáng) ----------
const heart = (g, cx, cy, s) => {
  g.beginPath();
  g.moveTo(cx, cy + s * 0.35);
  g.bezierCurveTo(cx - s, cy - s * 0.35, cx - s * 0.45, cy - s, cx, cy - s * 0.45);
  g.bezierCurveTo(cx + s * 0.45, cy - s, cx + s, cy - s * 0.35, cx, cy + s * 0.35);
  g.fill();
};
const FALLBACK = {
  background: () => draw(1080, 1920, (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h * 0.6);
    sky.addColorStop(0, "#141a52");
    sky.addColorStop(1, "#5b3f9e");
    g.fillStyle = sky;
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#3f7a3a";
    g.fillRect(0, h * 0.58, w, h);
  }),
  tree: () => draw(1230, 1278, (g) => {
    g.fillStyle = "#7a4a2a";
    g.fillRect(560, 700, 110, 520);
    g.fillStyle = "#f6a6cf";
    g.beginPath();
    g.ellipse(615, 430, 600, 400, 0, 0, Math.PI * 2);
    g.fill();
  }),
  avatar: () => draw(180, 260, (g) => {
    g.fillStyle = "#e8b26a";
    g.beginPath();
    g.ellipse(90, 205, 80, 55, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#3a2618";
    g.beginPath();
    g.arc(90, 95, 80, 0, Math.PI * 2);
    g.fill();
  }),
  "wish-tag": () => draw(120, 230, (g) => {
    g.strokeStyle = "#d8262f";
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(60, 0);
    g.lineTo(60, 60);
    g.stroke();
    g.fillStyle = "#fff4dc";
    g.strokeStyle = "#e7c991";
    g.lineWidth = 4;
    g.beginPath();
    g.roundRect(10, 60, 100, 165, 10);
    g.fill();
    g.stroke();
    g.fillStyle = "#d8262f";
    g.beginPath();
    g.ellipse(46, 66, 14, 9, -0.5, 0, Math.PI * 2);
    g.ellipse(74, 66, 14, 9, 0.5, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "#f08cb3";
    g.lineWidth = 5;
    g.fillStyle = "rgba(0,0,0,0)";
    g.beginPath();
    g.moveTo(60, 160);
    g.bezierCurveTo(28, 135, 34, 106, 60, 124);
    g.bezierCurveTo(86, 106, 92, 135, 60, 160);
    g.stroke();
  }),
  plane: () => draw(200, 120, (g) => {
    g.fillStyle = "#ffffff";
    g.beginPath();
    g.moveTo(195, 20);
    g.lineTo(5, 60);
    g.lineTo(80, 72);
    g.closePath();
    g.fill();
    g.fillStyle = "#dfe6f3";
    g.beginPath();
    g.moveTo(195, 20);
    g.lineTo(80, 72);
    g.lineTo(95, 115);
    g.closePath();
    g.fill();
  }),
  "heart-balloon": () => draw(140, 220, (g) => {
    g.strokeStyle = "#ffffff";
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(70, 130);
    g.quadraticCurveTo(55, 180, 72, 220);
    g.stroke();
    const gr = g.createRadialGradient(50, 50, 5, 70, 70, 80);
    gr.addColorStop(0, "#ffd1e3");
    gr.addColorStop(1, "#ff4f8b");
    g.fillStyle = gr;
    heart(g, 70, 85, 68);
  }),
  crane: () => draw(220, 150, (g) => {
    g.fillStyle = "#ffd9ea";
    g.beginPath();
    g.moveTo(110, 120);
    g.lineTo(10, 30);
    g.lineTo(100, 80);
    g.lineTo(210, 20);
    g.lineTo(125, 90);
    g.closePath();
    g.fill();
    g.fillStyle = "#ff9cc4";
    g.beginPath();
    g.moveTo(100, 80);
    g.lineTo(125, 90);
    g.lineTo(110, 145);
    g.closePath();
    g.fill();
  }),
  lantern: () => draw(120, 160, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, 160);
    gr.addColorStop(0, "#ffd36b");
    gr.addColorStop(1, "#ff8a2a");
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(15, 10);
    g.lineTo(105, 10);
    g.lineTo(95, 145);
    g.lineTo(25, 145);
    g.closePath();
    g.fill();
    g.fillStyle = "#fff3b0";
    g.beginPath();
    g.ellipse(60, 125, 18, 12, 0, 0, Math.PI * 2);
    g.fill();
  }),
  "hot-air-balloon": () => draw(200, 280, (g) => {
    const gr = g.createLinearGradient(0, 0, 200, 0);
    gr.addColorStop(0, "#ff7eb3");
    gr.addColorStop(0.5, "#ffd36b");
    gr.addColorStop(1, "#8ad0ff");
    g.fillStyle = gr;
    g.beginPath();
    g.arc(100, 95, 90, Math.PI, 0);
    g.quadraticCurveTo(190, 160, 120, 200);
    g.lineTo(80, 200);
    g.quadraticCurveTo(10, 160, 10, 95);
    g.fill();
    g.strokeStyle = "#7a4a2a";
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(82, 200);
    g.lineTo(78, 240);
    g.moveTo(118, 200);
    g.lineTo(122, 240);
    g.stroke();
    g.fillStyle = "#a0683c";
    g.fillRect(72, 238, 56, 38);
  }),
  rocket: () => draw(120, 260, (g) => {
    g.fillStyle = "#ffffff";
    g.beginPath();
    g.moveTo(60, 5);
    g.quadraticCurveTo(110, 70, 100, 200);
    g.lineTo(20, 200);
    g.quadraticCurveTo(10, 70, 60, 5);
    g.fill();
    g.fillStyle = "#e33a4a";
    g.beginPath();
    g.moveTo(60, 5);
    g.quadraticCurveTo(85, 30, 92, 60);
    g.lineTo(28, 60);
    g.quadraticCurveTo(35, 30, 60, 5);
    g.fill();
    g.beginPath();
    g.moveTo(20, 150);
    g.lineTo(0, 240);
    g.lineTo(30, 200);
    g.moveTo(100, 150);
    g.lineTo(120, 240);
    g.lineTo(90, 200);
    g.fill();
    g.fillStyle = "#e33a4a";
    heart(g, 60, 120, 26);
  }),
  star: () => draw(128, 128, (g) => {
    const gr = g.createRadialGradient(64, 64, 2, 64, 64, 64);
    gr.addColorStop(0, "#ffffff");
    gr.addColorStop(0.25, "#fff2a8");
    gr.addColorStop(1, "rgba(255,220,120,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, 128, 128);
    g.fillStyle = "#fffbe6";
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 14 : 40;
      g.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r);
    }
    g.fill();
  }),
  petal: () => draw(64, 64, (g) => {
    g.fillStyle = "#ffb6d5";
    g.beginPath();
    g.ellipse(32, 32, 26, 15, 0.6, 0, Math.PI * 2);
    g.fill();
  }),
  flower: () => draw(96, 96, (g) => {
    g.fillStyle = "#ffc2dc";
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      g.beginPath();
      g.ellipse(48 + Math.cos(a) * 22, 48 + Math.sin(a) * 22, 20, 14, a, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = "#ffe36b";
    g.beginPath();
    g.arc(48, 48, 10, 0, Math.PI * 2);
    g.fill();
  }),
};

// Quầng sáng tròn (cho đom đóm, aura, lửa, pháo hoa)
const GLOW = (rgb) => draw(128, 128, (g) => {
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, `rgba(${rgb},1)`);
  r.addColorStop(0.3, `rgba(${rgb},0.45)`);
  r.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = r;
  g.fillRect(0, 0, 128, 128);
});

export async function loadAssets() {
  const tex = {};
  const missing = [];
  await Promise.all(
    IMAGES.map((name) =>
      tryLoad(name).then(
        (img) => (tex[name] = texFrom(name === "background" ? img : trimmed(img))),
        () => {
          missing.push(name);
          tex[name] = texFrom(FALLBACK[name]());
        }
      )
    )
  );
  const avatars = [];
  for (let i = 1; i <= AVATARS; i++) {
    try {
      avatars.push(texFrom(trimmed(await tryLoad("avatar-" + i))));
    } catch {}
  }
  if (!avatars.length) {
    avatars.push(texFrom(FALLBACK.avatar()));
    missing.push("avatar-1");
  }
  tex.avatars = avatars;
  for (const [k, rgb] of [["glowWarm", "255,214,140"], ["glowPink", "255,170,215"], ["glowWhite", "255,255,255"], ["glowGold", "255,200,80"], ["glowBlue", "170,210,255"], ["glowFire", "255,130,40"]]) tex[k] = texFrom(GLOW(rgb));
  if (missing.length) console.info("Chưa có ảnh, đang dùng hình vẽ tạm:", missing.join(", "));
  return tex;
}

// ---------- Mặt phẳng ảnh ----------
// Hình học dùng chung theo điểm neo (ax, ay ∈ 0..1; 0.5,0 = giữa đáy)
const quads = new Map();
export function quadGeo(ax = 0.5, ay = 0.5) {
  const k = ax + "," + ay;
  if (!quads.has(k)) quads.set(k, new THREE.PlaneGeometry(1, 1).translate(0.5 - ax, 0.5 - ay, 0));
  return quads.get(k);
}
// Mesh ảnh cao h (rộng theo tỉ lệ ảnh). Toạ độ màn hình y-xuống → three y-lên: đặt y âm.
export function sprite(tex, { h, w, anchor = [0.5, 0.5], material, additive = false } = {}) {
  const m = new THREE.Mesh(
    quadGeo(...anchor),
    material || new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending })
  );
  const height = h ?? w / tex.userData.aspect;
  m.scale.set(w ?? h * tex.userData.aspect, height, 1);
  return m;
}
export const place = (obj, x, y, z = 0) => obj.position.set(x, -y, z);

// ---------- Nhãn chữ (dùng chung theo nội dung, đếm tham chiếu) ----------
const FONT = "'Be Vietnam Pro', 'Segoe UI', sans-serif";
export const labels = createRefCache(
  (key) => {
    const [text, style] = key.split("\u0001");
    const big = style === "big";
    const fs = big ? 40 : 30;
    const c = canvas(10, 10);
    let g = c.getContext("2d");
    g.font = `700 ${fs}px ${FONT}`;
    const tw = Math.ceil(g.measureText(text).width);
    c.width = tw + fs * 1.4;
    c.height = fs * 1.9;
    g = c.getContext("2d");
    g.font = `700 ${fs}px ${FONT}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillStyle = style === "gold" ? "rgba(90,44,10,0.85)" : "rgba(40,24,80,0.78)";
    g.beginPath();
    g.roundRect(2, 2, c.width - 4, c.height - 4, c.height / 2);
    g.fill();
    g.strokeStyle = style === "gold" ? "#ffd36b" : "rgba(255,230,170,0.75)";
    g.lineWidth = style === "gold" ? 4 : 2;
    g.stroke();
    g.fillStyle = "#fff7e6";
    g.fillText(text, c.width / 2, c.height / 2 + 1);
    const t = texFrom(c);
    t.anisotropy = 1;
    return { tex: t, mat: new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, depthTest: false }) };
  },
  (v) => {
    v.tex.dispose();
    v.mat.dispose();
  }
);
export const labelKey = (text, style = "") => text + "\u0001" + style;
export const labelCount = () => labels.size;
