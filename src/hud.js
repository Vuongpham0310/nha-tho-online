import { clip, maskName } from "./text.js";

// HUD theo mockup Cây Ước Nguyện. Mọi chữ từ người xem đi qua textContent.
function el(tag, cls, parent, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  if (parent) parent.appendChild(e);
  return e;
}
const fmt = (n) => Math.round(n).toLocaleString("vi-VN");
const setText = (e, s) => e.textContent !== s && (e.textContent = s);

// Icon nét vẽ (SVG), dùng chung một kiểu nét
const ICON = {
  scroll: '<path d="M6 4h10a3 3 0 0 1 3 3v11a2 2 0 0 1-2 2H8a3 3 0 0 1-3-3V6"/><path d="M5 6a2 2 0 1 1 4 0v2H5"/><path d="M10 9h6M10 12h6M10 15h4"/>',
  pencil: '<path d="M4 20l1.2-4.2L16.5 4.5a2 2 0 0 1 2.8 0l.2.2a2 2 0 0 1 0 2.8L8.2 18.8z"/><path d="M14.5 6.5l3 3"/>',
  gift: '<rect x="3.5" y="9" width="17" height="11" rx="1.5"/><path d="M2.5 9h19v-3h-19zM12 6v14"/><path d="M12 6c-2-3.5-6-3-5 0M12 6c2-3.5 6-3 5 0"/>',
  people: '<circle cx="9" cy="8" r="3.2"/><circle cx="16.5" cy="9" r="2.6"/><path d="M3 19c.6-3.4 3-5 6-5s5.4 1.6 6 5M14.5 14.2c2.6-.4 5.6 1 6.5 4.8"/>',
  check: '<path d="M5 12.5l4.2 4L19 7"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
  leaf: '<path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14z"/><path d="M5 19l8-8"/>',
  laurel: '<path d="M12 21c-5-2-8-6-8-12M12 21c5-2 8-6 8-12"/><path d="M5 12c-1.5-.5-2.5-2-2.5-3.5M6 16c-2 0-3.2-1.2-3.5-2.5M19 12c1.5-.5 2.5-2 2.5-3.5M18 16c2 0 3.2-1.2 3.5-2.5"/>',
};
const icon = (name, cls = "ic") => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICON[name]}</svg>`;

export function createHud(root, { effectIcon }) {
  const board = el("div", "title-board", root);
  const titleText = el("span", "", board);

  // Điều ước gần đây
  const recent = el("section", "panel recent", root);
  el("h2", "panel-h", recent).innerHTML = icon("leaf", "ic leaf") + "<span>Điều ước gần đây</span>";
  const recentList = el("ul", "recent-list", recent);

  // Cây hôm nay
  const level = el("section", "panel level", root);
  el("div", "level-h", level, "Cây hôm nay");
  const levelN = el("div", "level-n", level);
  const levelBar = el("div", "bar", level);
  const levelFill = el("div", "bar-fill", levelBar);
  const levelNum = el("div", "level-num", level);

  // Chú thích hiệu ứng
  const caption = el("div", "caption", root);
  const capIcon = el("img", "cap-icon", caption);
  capIcon.alt = "";
  const capText = el("div", "cap-text", caption);

  // Ngôi sao điều ước
  const stars = el("section", "panel stars", root);
  el("h2", "stars-h", stars).innerHTML = icon("laurel", "ic laurel") + "<span>Ngôi sao<br>điều ước</span>" + icon("laurel", "ic laurel flip");
  const starList = el("ol", "star-list", stars);

  // Mốc cộng đồng
  const ms = el("section", "panel milestones", root);
  el("h2", "panel-h", ms).innerHTML = icon("people") + "<span>Mốc cộng đồng</span>";
  const track = el("div", "ms-track", ms);
  const trackFill = el("div", "ms-fill", track);
  const msNodes = el("div", "ms-nodes", ms);
  let msKey = "";

  // 2 thẻ hướng dẫn
  const cta1 = el("section", "panel cta cta-wish", root);
  cta1.innerHTML = icon("pencil", "ic cta-ic");
  const cta1t = el("div", "cta-body", cta1);
  const cta1h = el("div", "cta-h", cta1t);
  const cta1s = el("div", "cta-s", cta1t);
  const cta2 = el("section", "panel cta cta-gift", root);
  cta2.innerHTML = icon("gift", "ic cta-ic gift");
  const cta2t = el("div", "cta-body", cta2);
  const cta2h = el("div", "cta-h", cta2t);
  const cta2s = el("div", "cta-s", cta2t);
  const disclaimer = el("div", "disclaimer", root, "Điều ước mang tính giải trí · Quà tặng là ủng hộ kênh");

  let capTimer = 0;
  return {
    setTexts(cfg) {
      titleText.textContent = cfg.title;
      cta1h.textContent = cfg.hintWish;
      cta1s.textContent = cfg.hintWishSub;
      cta2h.textContent = cfg.hintGift;
      cta2s.textContent = cfg.hintGiftSub;
      disclaimer.hidden = !cfg.disclaimer;
    },
    // [{ nickname, text }] mới nhất trước
    recent(list) {
      recentList.replaceChildren();
      for (const w of list.slice(0, 3)) {
        const li = el("li", "", recentList);
        li.innerHTML = icon("scroll", "ic scroll");
        const b = el("div", "rw", li);
        el("div", "rw-name", b, clip(maskName(w.nickname), 16)); // giấu tên người ước
        el("div", "rw-text", b, "Ước: " + w.text);
      }
    },
    level(n, points, from, to) {
      setText(levelN, "Cấp " + n);
      const done = n >= 6;
      setText(levelNum, done ? fmt(points) + " · tối đa" : `${fmt(points)} / ${fmt(to)}`);
      const w = (done ? 100 : Math.min(100, ((points - from) / Math.max(1, to - from)) * 100)) + "%";
      if (levelFill.style.width !== w) levelFill.style.width = w;
    },
    // [{ nickname, energy }]
    stars(list) {
      stars.hidden = !list.length;
      starList.replaceChildren();
      list.forEach((u, i) => {
        const li = el("li", "", starList);
        el("span", "medal m" + (i + 1), li, String(i + 1));
        const b = el("div", "", li);
        el("div", "st-name", b, clip(u.nickname, 14));
        el("div", "st-energy", b, fmt(u.energy));
      });
    },
    milestones(list, count) {
      const key = list.map((m) => m.at + m.label).join("|") + "#" + count;
      if (key === msKey) return;
      msKey = key;
      msNodes.replaceChildren();
      const next = list.findIndex((m) => count < m.at);
      list.forEach((m, i) => {
        const done = count >= m.at;
        const n = el("div", "ms-node" + (done ? " done" : i === next ? " next" : " locked"), msNodes);
        el("div", "ms-at", n, fmt(m.at));
        el("div", "ms-dot", n).innerHTML = done ? icon("check") : i === next ? '<span class="lotus"></span>' : icon("lock");
        el("div", "ms-label", n, m.label);
      });
      // Thanh chạy: đủ các đoạn đã qua + phần đoạn đang tới
      const last = list.length - 1;
      let pos = 0;
      for (let i = 0; i < list.length; i++) {
        const prev = i ? list[i - 1].at : 0;
        if (count >= list[i].at) pos = i;
        else {
          pos = i === 0 ? 0 : i - 1 + (count - prev) / (list[i].at - prev);
          break;
        }
      }
      trackFill.style.width = (Math.min(last, Math.max(0, pos)) / last) * 100 + "%";
    },
    caption(text, effectId, big) {
      capIcon.src = effectIcon(effectId) || "";
      capIcon.hidden = !capIcon.src;
      capText.textContent = clip(text, 80);
      caption.className = "caption" + (big ? " big" : "");
      void caption.offsetWidth;
      caption.className = "caption show" + (big ? " big" : "");
      clearTimeout(capTimer);
      capTimer = setTimeout(() => (caption.className = "caption" + (big ? " big" : "")), big ? 6000 : 4000);
    },
  };
}
