# Khu phía Đông và tuyến vòng ven sông — 29/10/2026

## Đã đưa vào game

- Thêm **454,9 m đường trong game**, tăng mạng đường khu mở rộng từ khoảng 1.004 m lên 1.458 m. Tuyến nối từ nút phía Đông `(205,-205)` qua quán vườn, sân ngắm sông, chợ phiên rồi về Phú Xá tại `(162,-172)`. Hai đầu nối thật vào graph dẫn đường, không phải một đường cụt.
- Ba vùng công cộng có thể đi bộ ra khỏi mép đường: **Quán nghỉ chân vườn tre**, **Sân ngắm sông**, **Chợ phiên đầu Đông**. Có mái quán, bàn ghế, sạp hàng/nông sản, cây, lan can ven nước, biển hướng dẫn và dãy nhà phía sau chợ.
- Nước, bờ cây và nền sân có mesh riêng; không dùng sky để che mặt đất mất. Giữ va chạm đồ vật, lan can; căn nhà không mọc trong sân và lối đi. Nhà ở góc cua mới lùi thêm để giữ vỉa hè trống.
- **Bộ ảnh ven sông:** tự chọn thứ tự ba địa điểm, xuống xe, hướng nhìn đúng cảnh rồi bấm P. Giữ tối đa hai JPEG gần nhất theo giới hạn album sẵn có; dấu hoàn thành cả ba điểm vẫn được lưu. Nộp bộ ảnh một lần nhận 18.000đ, 100 XP và một điểm đóng góp. Không có đồng hồ đếm ngược hay phí vào khu.
- E gần quán cho nghỉ hồi thể lực và xem bản đồ khu vực. Không cho XP hoặc tiền lặp khi nghỉ.
- Nút **Khám phá ven sông**, hoặc N → **Khám phá khu ven sông**, mở danh sách điểm và dẫn đường. Đánh dấu điểm bật GPS theo đường hiện có. HUD và minimap nhận địa điểm/đường mới.
- Bảng khám phá có sơ đồ đường, màu vàng đánh dấu tuyến mới và chấm vị trí người chơi để dễ chọn hướng đi.
- Các sự kiện khẩn cấp của phố cũ không tự phát sinh mới khi người chơi đang ở khu mở rộng xa, tránh giao một mục tiêu cách hàng trăm mét với đồng hồ quá ngắn.
- Save được nới giới hạn X để tải lại giữ vị trí tới sân bờ sông (x=368), vẫn đọc save phiên bản 1. Đổi ngày giữ dấu khám phá và trạng thái đã nhận thưởng.

Khu này **hư cấu cho gameplay**, không khẳng định là đường/công trình có thật trên Google Maps. Không thêm một loạt NPC trùng ngoại hình; nội dung hiện tại là khám phá cảnh, chụp ảnh, nghỉ chân và tuyến chạy xe. Chưa có mua bán chợ phiên, khách hàng hoặc lịch hoạt động NPC riêng tại ba khu mới.

## Kỹ thuật và kiểm tra

- Tiếp tục dùng instancing/chunk của khu phố; giữ silhouette nhà và chỉ giảm chi tiết nhỏ ở xa. Cây mới dùng ba mức lá. Đồ trang trí khu mới gộp tĩnh theo vật liệu, không thêm đèn hoặc vòng cập nhật riêng. Nền sân dùng UV theo mét thay vì kéo một texture qua cả sân.
- Kiểm tra đường đi trên collider thật của nhà và đồ đạc. Đã xử lý một cột sát điểm tới quán và một căn nhà lấn góc vỉa hè ở tuyến vòng.
- Seed 4105, 400 lần dò tuyến không gian: 400 tới đích, 0 điểm xuất phát mắc collider và 0 đoạn chỉ dẫn xuyên collider/ra ranh giới. Không coi đây là 400 lượt chơi đã render hoặc bảo đảm mọi tuyến đều hoàn hảo.
- Browser fixture `tests/east-expansion-preview.html` dùng 127.0.0.1 và backup/restore dữ liệu. Thử P ở cả ba điểm, hướng ảnh, dấu không lặp, thưởng một lần, save/reload và lên/xuống xe. Khi kiểm tra điểm, fixture nạp vị trí từ save; không khẳng định đã lái cả 455 m trong browser.
- Không có số đo 144 FPS cho bản mở rộng. Số đo tại từng cảnh chỉ có giá trị với góc nhìn, preset, DPR và phiên thử được ghi lại; không suy ra tốc độ cho toàn map.

Đọc raw route probes trong `artifacts/world-playtest.md` và `artifacts/world-playtest.json`. Kiểm tra logic bằng `npm test`.

Kết quả đợt này: 117 Node tests đạt; browser PASS tại ba điểm với ảnh JPEG thật, chống lặp, nhận thưởng, save/reload, lên/xuống xe và chạy/phanh trên một đoạn đường mới. Các điểm ảnh được nạp vị trí riêng trong fixture, không phải chạy toàn vòng. Phiên Medium, iframe 1200×720, DPR 1,10 tại góc nhìn sân ngắm sông: ba mẫu xấp xỉ 60 FPS, p95 16,8–16,9 ms, CPU update+submit p95 5,0–5,9 ms. Đây là góc nhìn chủ yếu ra sông, không phải phép đo khu đông nhà hoặc toàn bản đồ. Raw: `artifacts/east-river-performance.txt`, `artifacts/east-expansion-browser-check.txt`.

Góc chợ phiên trong cùng phiên Medium/1200×720/DPR 1,10 cũng đạt xấp xỉ 60 FPS trong ba mẫu, p95 16,8–16,9 ms và CPU update+submit p95 4,6–4,9 ms (`artifacts/east-market-performance.txt`). Sơ đồ và nút dẫn đường từ quán tới sân sông đã mở đúng trong browser; không ghi nhận warn/error trong log được đọc. Ảnh: `artifacts/east-market-preview.png`, `artifacts/east-district-map.png`.
