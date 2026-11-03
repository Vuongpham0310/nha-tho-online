import { clip } from "./text.js";
import { RITUAL } from "./rituals.js";

// Mọi chữ từ người xem đi qua textContent, không dùng innerHTML.
function el(tag, cls, parent, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  if (parent) parent.appendChild(e);
  return e;
}

// Thánh giá nét mảnh giữa hai đường chỉ (SVG tự vẽ, chữ của mình nên an toàn)
function crossMark() {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 26 34");
  svg.setAttribute("aria-hidden", "true");
  const p = document.createElementNS(ns, "path");
  p.setAttribute("d", "M13 2v30M5 11h16");
  p.setAttribute("stroke", "currentColor");
  p.setAttribute("stroke-width", "2.4");
  p.setAttribute("stroke-linecap", "round");
  p.setAttribute("fill", "none");
  svg.appendChild(p);
  return svg;
}

export function createHud(root, { onUnlockAudio }) {
  const banner = el("div", "banner", root);
  el("div", "rule", banner).appendChild(crossMark());
  const banner1 = el("div", "banner-1", banner);
  const banner2 = el("div", "banner-2", banner);

  const goal = el("div", "goal", banner);
  const goalLabel = el("span", "goal-label", goal);
  const goalBar = el("div", "goal-bar", goal);
  const goalFill = el("div", "goal-fill", goalBar);
  const goalNum = el("span", "goal-num", goal);
  const viewers = el("div", "viewers", root);

  const prayer = el("section", "panel prayer", root);
  el("h2", "panel-title", prayer, "Cầu nguyện");
  const prayerCounts = el("div", "panel-sub", prayer);
  const feed = el("ul", "feed", prayer);

  const gifts = el("section", "panel gifts", root);
  el("h2", "panel-title", gifts, "Dâng lễ");
  el("div", "panel-sub", gifts, "Quà tặng · nghi thức");
  const giftList = el("ul", "gift-list", gifts);

  const caption = el("div", "caption", root);
  const captionText = el("div", "caption-clamp", caption);
  const toasts = el("div", "toasts", root);
  const disclaimer = el("div", "disclaimer", root, "Không gian cầu nguyện mang tính biểu tượng · Quà tặng là ủng hộ kênh");

  const audioBtn = el("button", "audio-btn", root, "Bật âm thanh");
  audioBtn.addEventListener("click", () => onUnlockAudio());

  // Dòng 1 luôn nằm trên một dòng: thu nhỏ chữ tới khi vừa (tối thiểu 36px)
  function fitBanner() {
    let size = 62;
    banner1.style.fontSize = size + "px";
    while (banner1.scrollWidth > banner1.clientWidth && size > 36) banner1.style.fontSize = (size -= 2) + "px";
  }
  document.fonts?.ready.then(fitBanner);

  let capTimer = 0;
  return {
    setBanner(text) {
      const [a = "", b = ""] = String(text).split("\n");
      banner1.textContent = clip(a, 34);
      banner2.textContent = clip(b, 40);
      banner2.hidden = !b.trim();
      fitBanner();
    },
    setGiftTable(giftMap, enabled) {
      giftList.replaceChildren();
      for (const [gift, id] of Object.entries(giftMap)) {
        if (!RITUAL[id] || !enabled[id]) continue;
        const li = el("li", "", giftList);
        el("span", "g-name", li, clip(gift, 14));
        el("span", "g-ritual", li, RITUAL[id].label);
      }
    },
    setDisclaimer(on) {
      disclaimer.hidden = !on;
    },
    setAudioButton(show) {
      audioBtn.hidden = !show;
    },
    counts(view, viewerCount, goalText, goalCur, goalTarget) {
      prayerCounts.textContent = `${view.prayers} lời · ${view.prayerUsers.size} người · ${view.shares} chia sẻ`;
      viewers.textContent = viewerCount ? `${viewerCount} đang xem` : "";
      goalLabel.textContent = clip(goalText, 20);
      goalNum.textContent = `${goalCur}/${goalTarget}`;
      goalFill.style.width = Math.min(100, (goalCur / Math.max(1, goalTarget)) * 100) + "%";
    },
    // Chỉ comment cầu nguyện mới vào bảng; giữ 5 dòng mới nhất
    feed(nickname, text) {
      const li = el("li", "");
      el("div", "f-name", li, clip(nickname, 24));
      el("div", "f-text", li, clip(text, 34));
      feed.prepend(li);
      while (feed.children.length > 5) feed.lastChild.remove();
    },
    toast(nickname) {
      const t = el("div", "toast", toasts);
      el("b", "", t, clip(nickname, 22));
      t.append(" vào nhà thờ");
      while (toasts.children.length > 3) toasts.firstChild.remove();
      setTimeout(() => t.remove(), 3500);
    },
    caption(text, size) {
      captionText.textContent = clip(text, 90);
      // Bỏ class để chuyển động chạy lại khi có chú thích mới
      caption.className = "caption " + size;
      void caption.offsetWidth;
      caption.className = "caption show " + size;
      clearTimeout(capTimer);
      capTimer = setTimeout(() => (caption.className = "caption " + size), size === "big" ? 6000 : 3500);
    },
  };
}
