// Bố cục khung 1080×1920 (toạ độ màn hình: x sang phải, y xuống dưới, đơn vị pixel).
export const W = 1080;
export const H = 1920;

// Cây: ảnh tree.png 1230×1278, rộng 1040px, gốc cây chạm y=1330
export const TREE = { img: [1230, 1278], width: 1040, cx: 540, bottom: 1330 };
const TS = TREE.width / TREE.img[0];
export const TREE_H = TREE.img[1] * TS;
export const TREE_TOP = TREE.bottom - TREE_H;
export const treeToScreen = ([ix, iy]) => [TREE.cx - TREE.width / 2 + ix * TS, TREE_TOP + iy * TS];
export const TREE_SCALE = TS;

// Thẻ ước vẽ sẵn trong ảnh cây (tâm thẻ, toạ độ ảnh) — đo bằng phân tích điểm ảnh
export const BAKED_TAGS = [
  [464, 254], [287, 282], [760, 282], [860, 393], [122, 414], [625, 419], [1111, 481], [453, 551],
  [969, 549], [746, 612], [320, 653], [157, 654], [856, 755], [1027, 759], [777, 775], [391, 785],
];
// Chỗ trống trên tán để code treo thêm thẻ khi đông
export const EXTRA_TAGS = [
  [370, 190], [600, 170], [900, 250], [1040, 330], [200, 330], [540, 330], [700, 450], [1000, 430],
  [260, 520], [560, 640], [1180, 640], [60, 560], [640, 240], [820, 520], [930, 640], [480, 700],
  [650, 720], [1100, 330], [350, 420], [800, 170], [1080, 560], [400, 330], [180, 540], [700, 330],
];
export const TAG_SLOTS = [...BAKED_TAGS, ...EXTRA_TAGS];
export const TAG_SIZE = [52, 98]; // kích thước thẻ trong ảnh cây

// Đèn lồng vẽ sẵn (vàng + tím)
export const LANTERNS = [[970, 350], [1160, 425], [378, 500], [878, 575], [232, 655], [275, 758], [70, 725], [230, 805], [925, 705]];

// Bãi cỏ dưới cây: hàng sau nhỏ, hàng trước to. y = chân nhân vật, h = chiều cao nhân vật
const ROWS = [
  { y: 1300, h: 150, n: 8, x0: 90, x1: 990 },
  { y: 1365, h: 180, n: 7, x0: 70, x1: 1010 },
  { y: 1430, h: 210, n: 7, x0: 50, x1: 1030 },
  { y: 1495, h: 240, n: 6, x0: 40, x1: 1040 },
];
export const SLOTS = ROWS.flatMap((r, row) =>
  Array.from({ length: r.n }, (_, i) => ({
    // hàng lẻ lệch nửa ô để không thẳng hàng
    x: r.x0 + ((i + (row % 2 ? 0.75 : 0.25)) / r.n) * (r.x1 - r.x0),
    y: r.y,
    h: r.h,
    row,
  }))
);
export const SLOT_COUNT = SLOTS.length;
export const slotPos = (i) => SLOTS[i];
// Cấp chỗ: hàng trước trước (tên to dễ đọc), trong mỗi hàng từ giữa ra hai bên
export const SLOT_ORDER = SLOTS.map((_, i) => i).sort((a, b) => SLOTS[b].row - SLOTS[a].row || Math.abs(SLOTS[a].x - W / 2) - Math.abs(SLOTS[b].x - W / 2));

// Vùng trời cho hiệu ứng bay
export const SKY_TOP = 60;
