# Nền đồ họa môi trường — 31/10/2026

Phạm vi: lớp nền chung của thế giới, không thay nhân vật. Giữ đường đi, save, vị trí công trình và gameplay hiện tại.

## Đã triển khai

- `environment-surfaces.mjs`: chiếu màu, normal và độ nhám theo kích thước thế giới sau biến đổi instance; khắc phục texture bị phóng lớn theo khối nhà. Áp dụng cho scan PBR và các bản sao vật liệu của chúng.
- Nền đất/cỏ liên tục với gò thấp ngoài hành lang chơi; đường, vỉa hè, hàng nhà và sân công cộng được giữ phẳng. Nền không còn là mặt bê tông đồng nhất 1 km².
- Mái ngói PBR cho các khu mở rộng, Phú Xá và nhà dân; vữa/gạch có biến thiên bề mặt nhẹ và chân tường sẫm hơn.
- Dáng tán và phiến lá mới áp dụng qua bộ tạo cây dùng chung; tiếp tục dùng ba cấp LOD cũ.
- Ánh sáng hắt ngày bớt xanh, sáng hơn trong bóng râm; nắng chiều bớt cam gắt.
- `environment-lighting.mjs`: nội suy ánh sáng, sương và sắc trời qua bình minh/ban ngày/hoàng hôn/ban đêm, có kiểm tra tính liên tục tại các mốc giờ.
- Đã gỡ SSAO sau khi tái hiện lỗi trời ban ngày bị đen và quầng viền ở mức Cao. Lần kiểm tra shader trước đó không phát hiện được lỗi hình ảnh này.
- SMAA cuối chuỗi hậu kỳ để làm mượt đường viền; tắt hạt nhiễu và quang sai màu, giảm vignette và bloom, tăng ngưỡng bloom để vạch đường/tường trắng không phát sáng.
- Bỏ hình nón sáng giả của đèn xe (gây phủ trắng góc nhìn FPS ban đêm); giữ đèn pha thật và thay vệt tròn đa giác bằng vệt mềm có alpha.

## Kiểm tra

- Bộ kiểm thử: 170 bài, gồm tính hữu hạn của địa hình, độ phẳng tại đường/sân, sự nhất quán ba bản đồ vật liệu, khả năng cài shader cho vật liệu clone và chuyển ánh sáng theo giờ.
- Mở cảnh Phú Xá thật trong trình duyệt, thử mức Cao; shader không ghi lỗi trong console tại lần kiểm tra.
- Đã mở thêm chợ/công viên, Ngõ 41 và Phú Xá lúc 21 giờ. Ảnh lưu trong `artifacts/environment-overhaul-*.png`; phiên thử riêng được khôi phục save khi kết thúc.
- Cần đo FPS trên tuyến di chuyển và GPU người dùng; ảnh tĩnh không chứng minh hiệu năng cả bản đồ.
- Kiểm tra sửa lỗi mới: ban ngày Cao và ban đêm Ultra tại Phú Xá, console không có lỗi; 170/170 bài kiểm thử đạt. Ảnh `artifacts/graphics-repair-day-high.png` và `artifacts/graphics-repair-night-ultra.png`.

## Giới hạn

Đây là thay nền dựng môi trường trên Three.js hiện có, chưa phải thay toàn bộ asset bằng mô hình quét thực hoặc chuyển sang Unreal Engine. Vỏ kiến trúc cũ và bố cục bản đồ vẫn được giữ; phạm vi thay vật liệu không gồm ảnh biển hiệu, khuôn mặt hoặc trang phục.
