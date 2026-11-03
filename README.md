# Nhà thờ online · Toolkit live TikTok

Overlay dọc 1080×1920 cho TikTok LIVE: thánh đường 3D, người xem tương tác thành nhân vật ngồi ghế có tên, quà kích hoạt nghi thức (thắp nến khấn, dâng hoa kính Đức Mẹ, viếng Thánh Thể…), bảng "Cầu nguyện", bảng quà, băng rôn, thanh mục tiêu. Sự kiện lấy từ **TikFinity**.

## Chạy

```bash
npm install
npm run build
npm run preview
```

1. Mở TikFinity trên cùng máy và kết nối với phiên LIVE (TikFinity phát sự kiện qua `ws://localhost:21213/`).
2. Mở overlay `http://localhost:4173/` trong **Chrome**, ở cửa sổ riêng, bấm **Bật âm thanh** một lần.
3. Mở bảng điều khiển `http://localhost:4173/control.html` trong **cùng Chrome** (tab khác).
4. TikTok Live Studio → thêm nguồn **Window Capture** → chọn cửa sổ overlay. Không thu nhỏ (minimize) cửa sổ overlay: trình duyệt sẽ ngừng vẽ.

Phát triển: `npm run dev`. Test: `npm test`.

## Giới hạn đã biết

- Overlay và control liên lạc qua `BroadcastChannel`, nên **phải cùng một trình duyệt**. OBS Browser Source chạy trình duyệt riêng nên control sẽ không điều khiển được (overlay vẫn tự chạy với cấu hình đã lưu).
- `roomUser` chỉ là **số người đang xem**, không phải "có người vào phòng". Nhân vật được tạo khi người xem vào phòng (nếu TikFinity có phát `member`) hoặc lần đầu comment / tặng quà / thả tim / follow / chia sẻ.
- Cấu trúc sự kiện quà/combo dựng theo tài liệu TikFinity. Khi live thử, mở "Nhật ký sự kiện thô" trên control, copy payload thật vào `test/fixtures/events.json` rồi chạy lại `npm test`. Quà thiếu cả `msgId` và `groupId` sẽ không được chống trùng (có cảnh báo trong nhật ký).
- Âm thanh organ/chuông được tổng hợp bằng WebAudio. Muốn dùng file riêng: đặt `public/audio/organ.mp3` và/hoặc `public/audio/bell.mp3` (phải có bản quyền).

## Quà → nghi thức

Sửa ở control (mỗi dòng `Tên quà = mã`). Mã nghi thức: `lam-dau`, `bai-goi`, `quy-cau-nguyen`, `lan-chuoi`, `thap-nen` (nhỏ, chạy song song tối đa 3); `dang-hoa`, `vieng-thanh-the`, `cau-linh-hon`, `hat-thanh-ca` (lớn, chạy lần lượt). Quà giống nhau trong 2 giây được gộp thành một hiệu ứng, nhưng bộ đếm vẫn cộng đủ từng quà.

## Vận hành an toàn (giảm rủi ro bị TikTok xử lý)

- Streamer có mặt (giọng nói hoặc camera nhỏ), trò chuyện với người xem. Không treo live 24/7 không người.
- Không nói tặng quà thì "được ban phước / bình an / khỏi bệnh". Quà là ủng hộ kênh; giữ dòng ghi chú cuối màn hình.
- Không nói quà được chuyển tới nhà thờ nếu điều đó không có thật.
- Không đóng vai linh mục, không mô phỏng Thánh lễ hay bí tích.
- Âm nhạc tự tổng hợp hoặc có bản quyền.
- Giả lập lớn (50 người ảo, stress, chu kỳ rò rỉ) tự khóa khi overlay đã nhận sự kiện thật; sự kiện giả lập có nhãn [TEST] và đếm riêng.
