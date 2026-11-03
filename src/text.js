// Chuẩn hóa chữ để so khớp: bỏ dấu, đ→d, chữ thường, bỏ mọi khoảng trắng và ký tự không phải chữ/số.
export function normText(s) {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export const DEFAULT_KEYWORDS = ["amen", "alleluia", "haleluia", "lay chua", "lay chua giesu", "kinh mung maria", "chua ban binh an", "ta on chua", "xin chua thuong xot"];

export function isPrayer(text, keywords = DEFAULT_KEYWORDS) {
  const t = normText(text);
  if (!t) return false;
  return keywords.some((k) => {
    const n = normText(k);
    return n && t.includes(n);
  });
}

// Cắt chuỗi theo ký tự hiển thị (không cắt đôi emoji).
export function clip(s, n) {
  const a = [...String(s ?? "")];
  return a.length > n ? a.slice(0, n - 1).join("") + "…" : a.join("");
}
