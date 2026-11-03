# Sạp cờ tướng & trà đá — gameplay pass

Địa điểm cũ được chuyển thành một sạp trà đá trong phố. Người chơi đi bộ vào cửa mở, bấm **E**, chọn một ông cụ và chơi một ván cờ tướng không cược tiền.

## Vòng lặp chơi

- Ba ông cụ có tính cách, lời thoại, màu nhận diện và độ sâu máy khác nhau: Ông Lâm (chỉ nước), Ông Dũng (phòng thủ), Ông Sơn (khách cờ lâu năm).
- Cầm quân đỏ, chọn quân rồi chọn ô sáng hợp lệ. Luật có cung, tượng qua sông, mã cản chân, pháo có ngòi, tướng lộ mặt và tự chiếu.
- Máy suy nghĩ trong Worker, không khóa render/gameplay; gợi ý tối đa hai ô và có nút đi lại một vòng hoàn chỉnh.
- Có thể rời sạp giữa ván rồi quay lại đúng bàn, đúng lịch sử và đúng lượt. Ván dài từ 8 nước nửa trở lên mới tính tiến triển; xin thua ngay không thể farm phần thưởng.
- Uống trà đá miễn phí một lần mỗi ngày để hồi thể lực; trò chuyện tăng thân quen và mở thêm lời kể phố. Không dùng tiền sinh hoạt, không có chip, không có cược.

## Tiến triển xã hội

- Thắng hoặc chơi đủ ván tăng XP/xây dựng chỉ số Gắn kết khu phố.
- Ông Dũng mở sau ván đầu; Ông Sơn mở sau một ván thắng hoặc ba ván đã chơi.
- Tiến triển, lời thoại theo ngày và ván đang dang dở được lưu cùng save game.
- Mỗi ngày có một “việc ở sạp” luân phiên: trò chuyện với hai ông cụ, chơi một ván đủ 8 nước, hoặc uống trà đá. Hoàn thành một lần nhận XP, không thể nhận lại trong cùng ngày.

## QA

- `tests/tea-chess-preview.html` chạy trên origin cô lập `127.0.0.1`, có kiểm tra đi bộ vào sạp, 32 quân, nước máy qua Worker, gợi ý, trà không trừ tiền, save/reopen, undo và mở ông Dũng.
- Bộ kiểm thử hiện tại: **159/159 pass**.
- Đây là AI giao hữu cấp địa phương, không tuyên bố độ mạnh giải đấu; luật hòa dùng quy tắc casual (lặp thế ba lần hoặc 120 ply không ăn quân).

## Tài liệu kiểm thử cũ

`tests/arcade-preview.html` chỉ là fixture lịch sử của sòng bạc và đã được thay bằng liên kết sang fixture sạp cờ.
