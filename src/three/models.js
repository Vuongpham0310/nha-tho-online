import * as THREE from "three";

// Tượng trong cung thánh là ảnh phẳng public/images/<name>.webp|.png:
// camera nhìn thẳng từ cuối nhà thờ nên ảnh phẳng trông như tượng thật.
const EXTS = ["webp", "png"];

function loadImage(src) {
  return new Promise((ok, fail) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = fail;
    img.src = src;
  });
}

// Cắt bỏ lề trong suốt để chiều cao ảnh đúng bằng chiều cao tượng.
// Ảnh cần nền trong suốt (WebP/PNG có alpha).
function trimmed(img) {
  const w = img.naturalWidth, h = img.naturalHeight;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
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
  if (x1 < 0) return c;
  const out = document.createElement("canvas");
  out.width = x1 - x0 + 1;
  out.height = y1 - y0 + 1;
  out.getContext("2d").drawImage(c, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
  return out;
}

// Mỗi tên ảnh chỉ nạp + cắt lề 1 lần, các tượng cùng ảnh dùng chung texture
const cache = new Map();
function texture(name) {
  if (!cache.has(name))
    cache.set(
      name,
      EXTS.reduce((p, ext) => p.catch(() => loadImage(`./images/${name}.${ext}`)), Promise.reject()).then((img) => {
        const tex = new THREE.CanvasTexture(trimmed(img));
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 8;
        return tex;
      })
    );
  return cache.get(name);
}

// Đặt ảnh tượng cao `height`, chân tượng ở (x, y, z), luôn quay thẳng về phía giáo dân.
// Thiếu ảnh thì bỏ trống chỗ đó.
export function statueImage(parent, name, { height, x = 0, y = 0, z = 0 }) {
  texture(name).then(
    (tex) => {
      const w = (height * tex.image.width) / tex.image.height;
      // Không chịu đèn để giữ đúng màu ảnh; alphaTest để viền sắc và che đúng thứ tự trước/sau
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, height), new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.08, side: THREE.DoubleSide }));
      plane.position.set(x, y + height / 2, z);
      parent.add(plane);
    },
    () => console.warn(`Thiếu ảnh tượng public/images/${name}.webp|.png`)
  );
}
