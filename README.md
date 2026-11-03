# Cây Ước Nguyện · Overlay live TikTok

Overlay dọc 1080×1920 cho TikTok LIVE: một cây ước nguyện lớn giữa màn hình, người xem thành nhân vật chibi ngồi dưới gốc cây. Ai cũng gửi được điều ước bằng comment, điều ước treo lên cây. Quà tặng quyết định điều ước "bay lên trời" theo cách nào: máy bay giấy, hạc giấy, đèn lồng, khinh khí cầu, tên lửa, sao băng, pháo hoa. Sự kiện lấy từ **TikFinity**.

Bản nhà thờ cũ giữ ở tag git `nha-tho-v1`.

## Chạy

```bash
npm install
npm run build
npm run preview
```

1. Mở TikFinity bản desktop trên cùng máy, kết nối với phiên LIVE (TikFinity phát sự kiện qua `ws://localhost:21213/`).
2. Mở overlay `http://localhost:4173/` trong **Chrome**, ở cửa sổ riêng, bấm chuột một lần vào cửa sổ đó để Chrome cho phát âm thanh.
3. Mở bảng điều khiển `http://localhost:4173/control.html` trong **cùng Chrome** (tab khác).
4. TikTok Live Studio → thêm nguồn **Window Capture** → chọn cửa sổ overlay. Không thu nhỏ cửa sổ overlay: trình duyệt sẽ ngừng vẽ.

Phát triển: `npm run dev`. Test: `npm test`.

## Người xem làm gì

- **Vào live / comment / thả tim / chia sẻ**: có nhân vật dưới gốc cây (tối đa 28 chỗ; đầy thì thay người lâu không tương tác, người vừa tặng quà được giữ chỗ). Tên hiện 15 giây sau mỗi lần tương tác.
- **Comment bắt đầu bằng "Ước"** (ví dụ `Ước: thi tốt`, `uoc giam 5kg`): điều ước hiện giữa màn hình rồi bay lên treo trên cây. Mỗi người 1 điều ước; ước mới thay ước cũ. Tối đa 30 ký tự; tự chặn số điện thoại, đường link, gắn tên @ và từ cấm (sửa ở control). Cây treo tối đa 40 điều ước.
- **Tặng quà**: điều ước của người đó rời cây và bay lên bằng hiệu ứng theo món quà. Chưa có điều ước thì bay "điều ước của {tên}".
- **Comment "thả lá" / "nở hoa" / "ước mạnh lên"**: mỗi 20 comment cây rung, rơi cánh hoa.

## Quà → hiệu ứng

Quà có tên trong bảng (sửa ở control) dùng hiệu ứng riêng; quà khác tự chia tầng theo số xu của 1 món:

| Tầng | Mặc định |
|---|---|
| Nhỏ (dưới 10 xu) | máy bay giấy |
| Vừa (10–299) | đèn lồng |
| Lớn (300–999) | tên lửa (nổ pháo hoa) |
| Rất lớn (từ 1.000) | cây nở rộ + mưa sao băng |

Theo tên: Rose → máy bay giấy, Heart Me / Finger Heart → bong bóng tim, Paper Crane → hạc giấy, Hand Hearts → đèn lồng, Perfume / Doughnut → khinh khí cầu, Fireworks → pháo hoa, Galaxy → sao băng. Tên quà thật có thể khác theo vùng: khi live thử, xem tên trong "Nhật ký sự kiện" trên control rồi sửa bảng.

Quà nhỏ giống nhau trong 2 giây được gộp thành một hiệu ứng (ghi ×N), số quà vẫn đếm đủ.

## Tiến trình

- **Cấp cây 1 → 6** theo điểm = điều ước × 2 + xu + comment × 0,2 + tim ÷ 100. Cấp 2 cây phát sáng, 3 rơi cánh hoa, 4 đom đóm, 5 trời nhiều sao, 6 ánh vàng.
- **Mốc cộng đồng** theo số điều ước: 100 Rung cây · 250 Hoa nở · 500 Đèn lồng sáng · 750 Đàn hạc giấy · 1.000 Mưa sao băng. Mỗi mốc chạy 1 lần mỗi vòng.
- **Năng lượng điều ước** = tổng xu đã tặng. Từ 10 / 100 / 1.000 xu: nhân vật có vầng sáng to dần, thẻ ước trên cây sáng hơn và luôn hiện tên.
- **Combo** trong 2 phút: 3 lần tặng → đàn máy bay giấy; 5 lần → mưa đèn lồng; 3 quà nhỏ rồi 1 quà lớn → siêu phóng điều ước.
- **Ngôi sao điều ước**: 2 người năng lượng cao nhất, tên viền vàng.
- **Spotlight miễn phí**: mỗi 3 phút cây tự chọn 1–2 điều ước của người chưa tặng quà để gửi đi.
- **Vòng mới** (control): điều ước bay đi hết trừ 5 điều ước năng lượng cao nhất, cây về cấp 1, mốc tính lại.

## Ảnh

Ảnh trong `public/images/` (WebP hoặc PNG; trừ nền thì phải có nền trong suốt). Thay ảnh cùng tên là đổi hình, không cần sửa code. Thiếu ảnh nào thì có hình vẽ tạm.

| Tên | Dùng cho | Đang có |
|---|---|---|
| `background` | nền trời đêm + bãi cỏ, 1080×1920 | có |
| `tree` | cây ước nguyện (đã vẽ sẵn 16 thẻ ước + đèn lồng; toạ độ đo trong `src/layout.js`) | có |
| `avatar-1` … `avatar-8` | nhân vật chibi quay lưng, ngồi | 1–4 |
| `wish-tag` | thẻ ước treo thêm khi cây đông | vẽ tạm |
| `plane`, `heart-balloon`, `crane`, `lantern`, `hot-air-balloon`, `rocket`, `star`, `petal`, `flower` | vật bay, hạt | vẽ tạm |

Đổi ảnh cây thì phải đo lại vị trí thẻ (`BAKED_TAGS`) và đèn lồng (`LANTERNS`) trong `src/layout.js`.

## Âm thanh

Nhạc nền `public/audio/nhac-nen.mp3` phát lặp liên tục (thay file cùng tên để đổi nhạc). Tiếng chuông nhỏ, "vút" và "bùm" tự tổng hợp. Nhạc phải có bản quyền hoặc được phép dùng.

## Giới hạn đã biết

- Overlay và control liên lạc qua `BroadcastChannel`, nên **phải cùng một trình duyệt**. OBS Browser Source không điều khiển được bằng control.
- `roomUser` chỉ là số người đang xem; nhân vật tạo khi người xem vào phòng (nếu TikFinity có phát `member`) hoặc lần đầu comment / tặng quà / thả tim.
- Vùng đáy màn hình (mốc cộng đồng + 2 thẻ hướng dẫn) sẽ nằm dưới khung comment của app TikTok trên điện thoại người xem.

## Vận hành an toàn

- Điều ước mang tính giải trí: không nói tặng quà thì điều ước "linh nghiệm hơn". Giữ dòng ghi chú cuối màn hình.
- Theo dõi danh sách điều ước trên control, bấm "Ẩn" nếu có nội dung không phù hợp; bổ sung từ cấm khi cần.
- Streamer nên có mặt (giọng nói hoặc camera nhỏ), không treo live không người.
- Giả lập số lượng lớn tự khóa khi overlay đã nhận sự kiện thật; sự kiện giả lập có nhãn [TEST] và đếm riêng.
