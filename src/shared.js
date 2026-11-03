// Bố cục thánh đường + chỗ ngồi, dùng chung cho overlay và test.
export const HALL = { halfW: 18, zBack: -34, zFront: 30, ceil: 26 };
export const SANCTUARY = { y: 0.9, zFront: -14 }; // gian cung thánh nâng cao
export const ALTAR_Z = -22;
export const TABERNACLE = { x: 0, z: -29 };
export const MARY = { x: -11, z: -12.5 };
export const FLOWER_STAND = { x: -11, z: -10.6 };
export const CANDLE_RACK = { x: -6.6, z: -11.2 };

// Ghế dài: 10 hàng × 2 dãy (hai bên lối giữa) × 6 chỗ = 120
export const ROWS = 10;
export const PER_PEW = 6;
export const SEAT_COUNT = ROWS * 2 * PER_PEW;
export const AISLE = 2.4; // nửa bề rộng lối giữa
export const SEAT_W = 1.5;
export const PEW_LEN = PER_PEW * SEAT_W;
export const ROW_Z0 = -7.5;
export const ROW_DZ = 3.2;

export const rowZ = (row) => ROW_Z0 + row * ROW_DZ;

export function seatPos(i) {
  const row = Math.floor(i / (2 * PER_PEW));
  const r = i % (2 * PER_PEW);
  const side = r < PER_PEW ? -1 : 1;
  const k = r % PER_PEW;
  return { x: side * (AISLE + SEAT_W / 2 + k * SEAT_W), z: rowZ(row), row, side };
}

// Thứ tự cấp chỗ: hàng gần camera trước (tên hiện to trên live), sát lối giữa trước, xen kẽ hai bên.
export const SEAT_ORDER = Array.from({ length: SEAT_COUNT }, (_, i) => i).sort((a, b) => {
  const pa = seatPos(a), pb = seatPos(b);
  return pb.row - pa.row || Math.abs(pa.x) - Math.abs(pb.x) || pa.x - pb.x;
});
