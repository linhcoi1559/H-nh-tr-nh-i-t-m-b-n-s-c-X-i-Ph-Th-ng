# Kiểm tra đợt nâng cấp trải nghiệm — 28/10/2026

- `npm test`: 107/107 đạt. Bao gồm tiến triển qua các loại công việc, qua ngày mới, chọn kết thúc một lần, snapshot thật, LOD cây có vùng đệm và giữ thân/tán.
- Trình duyệt: `tests/neighborhood-story-preview.html` trên origin riêng `127.0.0.1`. Nạp tiến độ đã giúp hai nhóm, thực hiện phân loại cho ca cuối → nhận thù lao → chọn Góc xanh → kiểm tra công trình cấp 1 và ending trong save → reload → kiểm tra lời kết hiển thị lại. Đây là kiểm thử đoạn cuối của tuyến; hai nhóm trước được chuẩn bị bằng fixture, không phải đã chơi ba ca đầy đủ trên trình duyệt. Unit tests kiểm tra tiến triển từ đầu.
- `tests/high-refresh-preview.html`, phố cũ & trường học, Medium, iframe 1200×600, DPR thực tế 1,10: ba mẫu ~3 giây đạt 60,00 / 59,99 / 60,00 FPS; p95 19,3 / 20,5 / 19,2 ms; CPU update+submit p95 10,3 / 11,2 / 11,8 ms. Không có timing GPU độc lập. Không kết luận nhanh hơn số đo cũ vì DPR trước là 1,00; không xác nhận 144 FPS.
- Lượng lá một cây giảm 900 → 300 → 114 theo khoảng cách; tương ứng 3.600 → 1.200 → 456 tam giác lá, chưa tính thân/cành. Vẫn ba lượt vẽ màu cho tán mỗi mức, không tuyên bố giảm draw call nhờ LOD. Thêm hai bộ instance transform cho mỗi cây nên có chi phí bộ nhớ nhỏ; chưa đo VRAM.
- Browser kiểm tra đi bộ, lên xe, chạy, xuống xe: PASS ở góc phố kiểm thử. Không ghi nhận warn/error trong log được đọc. Chưa xác nhận toàn bộ map, mọi máy hoặc chơi dài nhiều giờ.
- Dữ liệu kiểm thử được backup/restore trên 127.0.0.1; không dùng save localhost của người chơi.

Raw samples và thao tác: `artifacts/world-experience-performance.txt`. Ảnh lời kết: `artifacts/neighborhood-story-ending.png`.

Những phần lịch sinh hoạt NPC, chương điều tra **Tấm ảnh trước cửa**, bộ asset mới và chuẩn ánh sáng toàn map hiện là kế hoạch trong `WORLD_EXPERIENCE_PLAN.md`, chưa phải nội dung đã hoàn tất.
