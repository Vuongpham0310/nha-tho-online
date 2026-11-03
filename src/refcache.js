// Bộ nhớ đệm có đếm tham chiếu: tài nguyên dùng chung theo khóa, chỉ hủy khi không còn ai dùng.
export function createRefCache(make, destroy) {
  const map = new Map();
  return {
    acquire(key) {
      let e = map.get(key);
      if (!e) map.set(key, (e = { n: 0, value: make(key) }));
      e.n++;
      return e.value;
    },
    release(key) {
      const e = map.get(key);
      if (!e || --e.n > 0) return;
      destroy(e.value);
      map.delete(key);
    },
    get size() {
      return map.size;
    },
  };
}
