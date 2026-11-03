import { defineConfig } from "vite";
import { resolve } from "node:path";

// Hai trang: overlay (index.html) + bảng điều khiển (control.html)
export default defineConfig({
  build: {
    target: "es2022", // overlay dùng top-level await để nạp ảnh trước khi dựng cảnh
    rollupOptions: {
      input: {
        overlay: resolve(import.meta.dirname, "index.html"),
        control: resolve(import.meta.dirname, "control.html"),
      },
    },
  },
});
