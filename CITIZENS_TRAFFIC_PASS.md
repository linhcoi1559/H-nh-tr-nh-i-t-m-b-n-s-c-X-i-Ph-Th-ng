# Cư dân, giao thông và tuyến bưu kiện · 2026-10-28

## Thay đổi trong game

- Vật liệu áo/quần có bề mặt dệt nhẹ; điều chỉnh độ nhám của da, tóc, giày và kim loại. Vật liệu và texture được dùng chung giữa các bản sao nhân vật.
- Mũ bảo hiểm có vỏ cong, viền và quai. Kích thước được tính từ các đỉnh chịu ảnh hưởng của xương đầu, đi theo xương khi chuyển động. Người chơi đội mũ khi lên xe; bốn người lái tự động dùng bốn mẫu trang phục sẵn có. Một số cư dân và người chơi có túi đeo vai.
- Biển số là texture trên xe. Thêm đèn phanh và bốn xi-nhan, không thêm nguồn sáng động. Xe tự động nhìn trước đoạn đường để báo rẽ.
- Thay tốc độ tối thiểu 22% bằng phanh/dừng thật. Xe xét người chơi, xe đỗ, người đi bộ trong làn phía trước và khoảng cách đến xe cùng tuyến. Giới hạn cả quãng đường đi mỗi bước để tránh vượt qua vật cản xuất hiện đột ngột. Tăng tốc lại từ từ khi đường thông.
- Người đi bộ dừng và quay về phía người chơi khi gặp ở cự ly gần; dùng khoảng cách khác nhau để dừng/tiếp tục, tránh đổi animation liên tục.
- Thêm ba cư dân nhận hàng cùng biển địa chỉ vật lý ở Phú Gia, Phú Xá và đường đê.

## Hoạt động mới

Mở **N → Một vòng Phú Gia – Phú Xá**. Nhận ba bưu kiện tại gánh xôi, đọc địa chỉ, tự chọn thứ tự giao. Tại mỗi điểm, xuống xe, đối chiếu tên trên nhãn và chọn người nhận. Chọn nhầm được sửa nhưng giảm chất lượng dịch vụ. Ôm cua mạnh làm giảm độ nguyên vẹn; không có thời hạn thất bại. Sau đủ ba chữ ký, mang sổ về gánh xôi để nhận tiền hoặc góp quỹ.

Tiến độ, chất lượng và trạng thái hoàn thành dùng save hiện có. Việc thứ tư tham gia bảng việc hằng ngày; ngày mới làm lại tuyến, giữ tiền và điểm xây dựng. Tiền công gốc 48.000đ, điều chỉnh theo chất lượng. Các tên hộ nhận hàng là tình tiết hư cấu trong game.

## Kiểm tra

- 93 bài kiểm tra Node đạt: sáu GLB và animation với mũ/túi, phanh ở 30/60/120Hz, vật cản xuất hiện đột ngột, nhận/giao/trả sổ đúng giai đoạn, save/reload và trả thưởng một lần; các kiểm tra cũ vẫn đạt.
- `tests/citizens-preview.html`: chạy thật UI nhận hàng, giao nhầm/sửa, giao ba điểm theo thứ tự khác nhau với reload giữa các điểm, trả sổ và nhận thưởng. Từng bước được đặt gần điểm giao để kiểm tra tương tác; đây không phải phép đo hành trình lái toàn tuyến.
- Đã xem cư dân Phú Gia và người chơi ngồi xe ở TPS trong trình duyệt. Không có cảnh báo/lỗi console ở các cảnh đã kiểm tra. Phiên kiểm tra dùng 127.0.0.1, có sao lưu/khôi phục dữ liệu riêng.
- Ảnh: `artifacts/citizens-phu-gia.png`, `artifacts/citizens-riding-upgrade.png`.
- Bản cuối: đi bộ/lên xe/chạy xe/xuống xe đạt. Ba cửa sổ đo riêng ở medium, 1200×600, DPR 1 đạt 59,96 / 60,00 / 56,94 FPS; p95 21,5 / 16,8 / 24,5 ms. Vẫn có dao động khung hình, không coi đây là cam kết khóa 60 FPS. Lượt đo chồng với Node tests thấp hơn cũng được giữ trong `artifacts/citizens-performance-2026-10-28.json`.
