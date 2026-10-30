# Đêm đầu: Đơn hàng cuối — bản chơi và hướng phát triển

## Phạm vi đã triển khai

Một đêm hoàn chỉnh với sáu nhịp: làm việc tại quán, giao đơn, xử lý tủ điện, điều tra cuối ngõ, nghe băng, thoát ra phố. Chương Phú Gia là móc nối nội dung, chưa phải khu vực/chương chơi được. Các hoạt động khu phố ban ngày cũ vẫn là chế độ riêng.

## Nhân vật và bí mật

Linh về trông quán xôi của cô Hoa. Sau hai đơn bình thường, một đơn trả trước xuất hiện mang đúng tên Linh. Nó ghi nhà 41 trong ngõ, không phải cổng trường số 41 ngoài phố. Căn nhà đóng cửa từ đêm mất điện năm 2008.

An là em Linh, từng chờ anh với lời hứa mang xôi về trước khi đèn hiên tắt. Gia đình mất liên lạc với An sau đêm đó. Đêm đầu không kết luận An đã chết, không giải thích thực thể là “tội lỗi” qua một câu thoại. Tấm huy hiệu cho thấy một trẻ đã được đưa tới trạm xá Phú Gia lúc 19:41. Cuộn băng nhắc một người lớn cố giấu tên. Người chơi cần phân biệt lời nói, bằng chứng và điều còn chưa biết.

## Nhịp chơi và hệ quả

| Nhịp | Hành động | Kiến thức/hệ quả |
|---|---|---|
| Quán xôi | Gói ba đơn, chọn đúng loại xôi và phần thêm; sai được sửa | Phân biệt nhà và ngõ; nhận hóa đơn lạ. Từng đơn hoàn thành được lưu. |
| Nhà 41 | Gõ cửa; chọn giữ im lặng hoặc đáp tiếng gọi | Đáp lại khiến thực thể đuổi nhanh hơn, mất nhánh giữ lời hứa. Không có lựa chọn ngầm không báo trước: hóa đơn đã cảnh báo. |
| Tủ điện | Bật HIÊN → NGÕ → BÀN THỜ; sai thứ tự nhảy cầu chì | Câu chữ trên nắp và mặt sau ảnh cùng dẫn tới lời giải. Tìm được pin dự phòng. Tuần tra bắt đầu ở đầu ngõ, chừa thời gian nhận biết nguy hiểm. |
| Điều tra | Tìm ảnh, bi ve, huy hiệu; J đọc lại nội dung | Ảnh giải điện, bi xác nhận lời hứa riêng, huy hiệu phản bác kết luận An chết tại ngõ. |
| Cuộn băng | Nghe cuộc ghi âm chưa đầy đủ | Có người đã đưa An đi. Băng gây tiếng động, thực thể tìm tới cuối ngõ. |
| Thoát | Chọn chạy hoặc đi chậm, điều khiển đèn, rẽ vào ngách cắt dấu | Thực thể không nhìn xuyên tường; nhớ vị trí cuối, tìm khoảng 5 giây rồi tuần tra. Quán là nơi trú/đổi pin. |
| Kết | Giữ lời hứa / mang băng điều tra / về nhà | Nhánh giữ lời hứa đòi đủ ba bằng chứng, điện đúng và không đáp tiếng gọi. Có thể quay vào ngõ trước khi chốt kết. |

## Luật sinh tồn

- E tương tác; T đèn; Q dừng trấn tĩnh; J hồ sơ.
- Ánh đèn bị nhận thấy xa hơn trong bóng tối; chạy gây tiếng động lớn.
- Thực thể: tuần tra → điều tra âm thanh → đuổi khi thấy → tìm vị trí cuối → trở lại tuần tra.
- Đường đi dùng các điểm nối trên ngõ hình chữ T, kiểm tra vật cản trước mỗi đoạn di chuyển. Thực thể không bước qua cửa quán; người chơi có thể đổi pin tại đó để không mắc kẹt khi cạn pin.
- Khi đang đọc/gói xôi/giải điện/hồ sơ, chuyển động nguy hiểm và hao pin tạm dừng.
- Bị bắt quay lại quán, giữ vật chứng và tiến độ; không đặt người chơi ngay trước thực thể.
- Tiến độ đêm, lựa chọn, pin, vật chứng và kết thúc cùng được lưu trong save hiện có.

## Hiệu năng và kiểm chứng

- Khi vào truyện, tạm ẩn các nhóm cảnh ngoài khu vực ngõ/quán, khôi phục khi rời truyện.
- Tối đa sáu point light gần camera trong chế độ truyện; vật liệu phát sáng vẫn chỉ vị trí đèn ở xa.
- Không vẽ minimap, không mô phỏng giao thông, không xử lý xe/NPC ẩn trong va chạm, không khôi phục xương NPC khi không dùng.
- Mưa tắt ở cấu hình thấp. Giờ truyện đứng yên thay vì cập nhật lại toàn bộ ánh sáng/HUD mỗi 0,75 giây.
- Trong Cấu hình có mẫu FPS, p95 thời gian khung hình và số lượt vẽ. Đây là số đo trên phiên đang chạy, không phải cam kết FPS trên mọi máy.
- `npm test` kiểm tra lưu/khôi phục đêm, điều kiện kết thúc, điện, tầm nhìn, mất dấu và đường vòng.
- `tests/night-playtest.html` chạy qua UI và sự kiện bàn phím trong iframe. Tự sao lưu/khôi phục save ở origin kiểm thử, không dùng script truy cập trạng thái nội bộ app.

## Các chương sau — thiết kế, chưa triển khai

1. **Phú Gia / Người bế đứa trẻ:** ban ngày hỏi ba nhân chứng, đối chiếu lời khai với sổ trực trạm xá; đêm vào kho hồ sơ. Cơ chế mới: chọn bằng chứng để chất vấn, hậu quả là người hợp tác hoặc khóa cửa.
2. **Nhà không có số:** ảnh cũ và âm thanh xác định một lối đi bị xây kín. Cơ chế mới: đối chiếu không gian hai thời điểm, cấp điện có giới hạn để chọn khu cần mở.
3. **Người còn nhớ:** phát hiện ai đổi tên trên hồ sơ. Một người thân có lý do bảo vệ bí mật. Cơ chế mới: quyết định chia sẻ bằng chứng với ai; thay đổi nhân chứng đêm cuối.
4. **Trở lại 19:41:** sử dụng đường đi, quan hệ và hồ sơ đã học để đưa một người ra khỏi ngõ; kết thúc dựa trên hành động nhiều đêm thay vì chọn ba nút ở cuối.

Không mở bản đồ rộng trước khi một chương hiện có đạt kiểm thử. Mỗi chương mới phải bổ sung một cách suy luận/hành động, một hậu quả được lưu và một thay đổi không gian nhìn thấy được. Không dùng kéo dài quãng đường hoặc lặp nhặt đồ làm nội dung chính.
