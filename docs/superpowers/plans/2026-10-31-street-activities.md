# Hoạt động đời thường — kế hoạch triển khai

**Mục tiêu:** thêm năm việc chơi tại chỗ, giữ cơ chế lưu và thưởng hiện có.
**Thiết kế:** pha trà và cắm hoa dùng công thức có thể xem lại; bơm xe điều chỉnh áp suất; câu cá chốt nhịp chậm ba lần; đồ thất lạc đối chiếu mô tả. Không thua mất tiền, không bắt đếm ngược. Nhận việc bằng N hoặc E tại điểm đầu, xuống xe để thực hiện. Tiến độ từng bước lưu trong daylife; đóng mini game giữa chừng sẽ thử lại bước đó.
**Công nghệ:** Three.js, DOM, JavaScript module; không thêm thư viện.

- [x] Kiểm thử luật mini game và lưu/nhận thưởng của năm việc mới.
- [x] Thêm dữ liệu tuyến việc, giao diện thao tác riêng và mô hình đồ vật tại chỗ.
- [x] Kiểm tra bốn mini game trong trình duyệt, chạy toàn bộ kiểm thử.

## Kiểm chứng và giới hạn

173/173 bài kiểm thử đạt, bao gồm thứ tự bước, save/reload, thưởng một lần/ngày và chặn bấm liên tục để câu đủ cá trong một vòng phao. UI đã mở và thao tác pha trà, cắm hoa, bơm xe, câu cá; tiến độ chuyển sang bước kế tiếp. Đồ thất lạc dùng giao diện tình huống có sẵn, kiểm tra tuyến bằng kiểm thử state, chưa đi trọn tuyến trên trình duyệt. Bốn mini game dùng bảng tương tác, chưa có animation bàn tay hay câu cá 3D. Công thức trà/hoa đổi chẵn lẻ ngày; các việc khác đặt lại lượt sau khi kết ngày.
