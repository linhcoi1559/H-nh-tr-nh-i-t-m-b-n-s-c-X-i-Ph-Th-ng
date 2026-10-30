# Lái xe và lối vào khu tưởng niệm — 29/10/2026

- Space khi lái xe là phanh với giảm tốc hữu hạn, dừng về 0 ở cả tiến/lùi và không đổi chiều. Phanh ưu tiên hơn W/Shift, ngắt nitro và bật đèn phanh. Shift vẫn dùng nitro; đi bộ vẫn nhảy bằng Space. Đã bỏ bốc đầu bằng Space và cập nhật hướng dẫn.
- G, nút HUD và E không mở sửa/độ xe khi còn ngồi xe. Dịch vụ xưởng chỉ mở khi xuống xe trong phạm vi 4,5 m quanh trạm `(18.5, -6.05)`. G ngoài địa điểm báo lý do và đặt đích dẫn đường, không mở màn hình mua/độ xe.
- Quầy xôi chỉ mở ở quán `(-26.5,-7)` khi đi bộ; tab quầy không dùng từ xưởng và ngược lại. Câu cá/đá cầu phải tới điểm tương tác tương ứng. Kiểm tra cả lúc mở dịch vụ và lúc bấm nút thực hiện. C nhận đơn ship nhanh và nút nhận đơn nhanh trên HUD vẫn dùng khi đang lái.
- Bỏ một căn nhà chắn mặt tiền tại x≈-20, giữ các căn liền kề và collider. Thêm lối lát từ vỉa hè vào sân, hai cột và biển “LỐI VÀO · KHU TƯỞNG NIỆM”, tường bao sân và bia tưởng niệm. Không xóa va chạm để đi xuyên nhà. Lối đi: x=-20 từ phố tới z=-24 rồi rẽ trái vào NPC ở (-24,-28). Dẫn đường tới khu này cũng dùng lối mới.

Kiểm thử logic: vị trí/đi bộ/ban ngày cho dịch vụ, phanh tiến và lùi ở 30/60/144 Hz, đường vào tránh các footprint nhà liền kề. Fixture `tests/street-access-preview.html` dùng origin riêng 127.0.0.1, backup/restore cả save game, đồ họa và garage; kiểm tra gameplay qua DOM và nút/phím thật của game.

Kết quả: 113/113 Node tests đạt. Browser PASS: G ngoài xưởng bị chặn; còn ngồi xe ở xưởng vẫn bị chặn; C nhận đơn khi lái; Space ngắt nitro khi giữ W+Shift, giảm tốc rồi dừng; xuống xe mở xưởng, độ động cơ và lưu nâng cấp; tab quầy bán hàng không dùng tại xưởng. Phanh được kiểm tra bằng chờ xe dừng trong giới hạn 4 giây, không giả định mọi vận tốc đều dừng trong 1,1 giây.

Browser cũng đi bộ liên tục từ `(-20,-5)` qua cửa vào, tới `(-20,-24)`, rẽ sang `(-24,-27)` và mở được đối thoại **Bác Cựu Chiến Binh Phú Thượng**. Không dịch chuyển giữa các đoạn của lối đi. Dữ liệu thử được khôi phục, không thay save localhost. Raw checks: `artifacts/vehicle-access-browser-check.txt`, `artifacts/memorial-access-browser-check.txt`.
