# Kiến trúc và màn hình tần số cao · 2026-10-28

## Hình ảnh

- Thân nhà giữ nguyên vị trí và kích thước va chạm, thay góc vuông bằng các mặt vát; mặt tiền vẫn có sáu nhóm vật liệu để giữ texture đúng phía.
- Cửa ban công và một phần cửa sổ dùng hình vòm có khung rỗng. Thêm ô cửa bên hông các nhà trong khu mở rộng để giảm mặt tường trống.
- Mái che cửa hàng chuyển thành bề mặt cong. Khu mở rộng xen kẽ mái bốn phía và mái đầu hồi, dùng pháp tuyến tách cạnh thay vì làm trơn toàn bộ mái.
- Đây vẫn là mô hình nhà dựng bằng mã và phong cách giản lược; chưa thay bằng bộ nhà quét thực tế hoặc asset kiến trúc có nội thất hoàn chỉnh.

## Chi phí dựng hình

- Sau bước gộp tĩnh cũ, gộp tiếp các chi tiết kiến trúc được đánh dấu cố định thành cụm không gian 48 m. Phiên thực tế gộp 391 mesh thành 98 mesh. Các phòng/nút tương tác/đối tượng thay đổi hiển thị giữ nguyên cấu trúc. Cụm ẩn không được đưa sang nhóm luôn hiển thị.
- Chi tiết khu mở rộng dùng cụm 96 m, mái luôn hiện cùng thân nhà. Vẫn giữ khoảng bật/tắt riêng cho chi tiết nhỏ; kiểm tra đường đi và giới hạn số batch hiện có đạt.
- Gộp các phần skin dùng chung đặc tính vật liệu, giữ màu bằng vertex colors, giữ bộ xương, ma trận bind và chất liệu vải. Mỗi mẫu trong sáu mẫu nhân vật giảm ít nhất bảy mesh; hình học gộp dùng chung giữa các bản sao. Kiểm tra kích thước và các clip animation đều đạt.
- Thêm **O → Chất lượng đồ họa → Ưu tiên tốc độ**: DPR tối đa 1, tắt bloom, giữ tone mapping và color grading, bóng 1024 với nhịp cập nhật tối đa 24 Hz khi di chuyển. Mức đồ họa mặc định không thay đổi.
- Bảng hiệu năng bổ sung CPU p95: thời gian chạy cập nhật và nộp lệnh render, không phải phép đo GPU. Không dùng nghịch đảo con số này để tuyên bố FPS có thể đạt.

## 144 FPS: giới hạn xác minh

Game dùng requestAnimationFrame, không có bộ giới hạn cố định 60 FPS. Phép đo trang trống trong phiên kiểm tra trả về khoảng **59,9 nhịp/giây**, trung vị 16,7 ms; điều này không xác nhận thông số màn hình vật lý. Chưa có phiên chạy ở 144 Hz để chứng minh 144 FPS. Ngân sách cho 144 FPS là khoảng **6,94 ms mỗi khung**, cả CPU và GPU phải đáp ứng.

Tại cùng vị trí, 1200×600, DPR 1, không chạy Node tests đồng thời:

| Mức | FPS ba cửa sổ | Khung p95 (ms) | CPU nộp khung p95 (ms) |
|---|---|---|---|
| Ưu tiên tốc độ | 60,00 / 60,00 / 60,00 | 16,8 / 16,8 / 16,9 | 10,7 / 12,2 / 11,4 |
| Medium | 60,00 / 59,01 / 60,00 | 16,9 / 17,0 / 16,8 | 11,1 / 13,8 / 11,8 |

Không suy ra khả năng khóa 144 FPS từ các số đo này. Cảnh có người/xe và bóng thay đổi theo thời gian, nên đây không phải replay xác định để so chênh lệch nhỏ giữa hai mức. Raw: `artifacts/architecture-refresh-performance.json`.

## Kiểm tra

96 bài kiểm tra đạt. Đã kiểm tra hình ảnh ở Phú Xá, đi bộ/lên xe/chạy xe/xuống xe, chuyển medium ↔ ưu tiên tốc độ và đọc mẫu hiệu năng trong trình duyệt. Phiên cuối không có lỗi/cảnh báo console. Ảnh: `artifacts/architecture-arched-street.png`. Dữ liệu riêng của fixture được sao lưu và khôi phục, không thay save localhost.
