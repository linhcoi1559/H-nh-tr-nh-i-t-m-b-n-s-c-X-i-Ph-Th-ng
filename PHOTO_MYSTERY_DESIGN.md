# Tấm ảnh trước cửa — nhiệm vụ đã triển khai, 29/10/2026

## Cách vào chơi

Tải lại game, bấm **N → Nhận lời tìm người trong ảnh**. Không cần hoàn thành tuyến chuyện trước, có tiền hoặc mua vật phẩm. Nếu đang làm một việc ngày, khép lại hoặc trả việc đó trước. Có thể **Tạm gác điều tra** để làm việc khác, rồi tiếp tục với nguyên sổ manh mối.

## Vòng lặp mới

1. Tới hiệu sách bác Sơn trên Phú Xá, xuống xe và bấm E. Nhận ảnh lẫn trong sách, ghi lại lời nhắn mặt sau.
2. Hỏi cô Liên ở Phú Gia và chú Bình bên đường đê theo thứ tự tùy chọn. Một người nhận ra nghề qua đường cúc áo, người kia nhớ chuyện đổi số nhà. Cả hai lời kể cần để tránh kết luận nhầm chỉ vì số 41.
3. Mở **N → Mở sổ manh mối**. Đọc các lời kể và phần quan sát kỹ, chọn giả thuyết phù hợp. Đáp án sai có lý do cụ thể và được sửa, không trừ tiền/XP. Không dùng thời gian đếm ngược.
4. Quay lại cô Liên để nghe mong muốn của gia đình; chưa hỏi thì không được công bố câu chuyện.
5. Về quán trà cô Hoa chọn một trong ba kết thúc. Ảnh gốc đều về gia đình; bản sao/lời kể được xử lý khác nhau: ghi tên, giấu tên, hoặc không trưng ảnh. Mỗi cách nhận 150 XP và hai điểm đóng góp, chỉ một lần.
6. Một bảng lời kết trên tường phía Đông Ngõ 41 thay nội dung theo quyết định. Bảng là đồ vật trong cảnh, không hiện xuyên tường. Đây là bảng chữ, chưa có asset ảnh chân dung cổ, diễn xuất hoặc lồng tiếng riêng.

## Giữ tiến độ và nhịp chơi

- Sổ độc lập với ngày: đổi ngày, thoát hoặc tải lại vẫn giữ manh mối, kết luận, ý kiến gia đình và kết thúc.
- Một việc ngày và một chuyến điều tra không cùng được nhận hoạt động: tạm gác điều tra trước khi nhận việc, tránh E chọn sai nhiệm vụ ở cùng địa điểm.
- Đang lái xe không hỏi chuyện. Sự kiện khẩn cấp ngẫu nhiên mới không chen vào chuyến điều tra đang hoạt động.
- Dùng lại các cư dân và biển địa chỉ đã có. Không thêm NPC, đèn, RAF hay loop tìm đường riêng. UI tiến độ đi qua nhịp 5 Hz hiện có.
- Có ba kết thúc nhưng chung tuyến điều tra; chưa phải ba chiến dịch khác nhau. Đây là nội dung hư cấu của trò chơi, không phải lịch sử đã được kiểm chứng của người thật ở Phú Thượng.

## Phạm vi kiểm tra

Unit tests: cả hai thứ tự hỏi, ba kết thúc, chặn kết luận khi thiếu manh mối, trả lời sai/sửa, chặn kết thúc trước khi xin ý kiến, chống thưởng lặp, chuẩn hóa dữ liệu lỗi, save/reload qua từng bước và qua ngày, tạm gác để làm việc khác.

Fixture trình duyệt: `tests/photo-mystery-preview.html`, chỉ trên origin `127.0.0.1`, backup/restore save. Fixture bấm UI thực để nhận/ghi lời kể, suy luận sai/đúng, xin ý kiến và kết thúc; di chuyển giữa các điểm bằng nạp lại vị trí trong save để kiểm tra từng điểm và khả năng khôi phục tiến độ. Không coi đây là kiểm chứng lái toàn tuyến hoặc thời lượng phiên chơi thực tế.

Kết quả: 110/110 Node tests đạt. Phiên trình duyệt đi hết tuyến với thứ tự chú Bình → cô Liên và kết thúc giấu tên: PASS, gồm tạm gác/tiếp tục, khóa hỏi chuyện trên xe, đối chiếu sai rồi đúng, thưởng tăng đúng 150 XP + 2 điểm (đo chênh lệch vì vật phẩm di sản ngoài đường cũng có XP), reload và không nhận lại chương. Hai kết thúc còn lại được kiểm tra bằng unit test, chưa bấm trọn tuyến trên trình duyệt. Kết quả lưu ở `artifacts/photo-mystery-browser-check.txt`, ảnh sổ ở `artifacts/photo-mystery-notebook.png`.
