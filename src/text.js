// Bỏ dấu tiếng Việt, đ→d, chữ thường
const fold = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase();

// Chuẩn hóa để so khớp: bỏ dấu, bỏ mọi khoảng trắng và ký tự không phải chữ/số.
export const normText = (s) => fold(s).replace(/[^a-z0-9]/g, "");

// Như normText nhưng giữ ranh giới từ: "Đồ  ngốc!" → "do ngoc"
export const normWords = (s) => fold(s).replace(/[^a-z0-9]+/g, " ").trim();

// Chuỗi có chứa một trong các từ khóa (so khớp không dấu, bỏ khoảng trắng)
export function hasKeyword(text, keywords) {
  const t = normText(text);
  return !!t && keywords.some((k) => {
    const n = normText(k);
    return n && t.includes(n);
  });
}

// Che tên: giữ chữ cái đầu mỗi từ. "Đức Anh" → "Đ** A**"
export const maskName = (s) =>
  String(s ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => [...w][0] + "**")
    .join(" ");

// Cắt chuỗi theo ký tự hiển thị (không cắt đôi emoji).
export function clip(s, n) {
  const a = [...String(s ?? "")];
  return a.length > n ? a.slice(0, n - 1).join("") + "…" : a.join("");
}
