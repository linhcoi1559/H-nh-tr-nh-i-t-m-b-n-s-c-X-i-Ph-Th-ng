# Bộ nhận diện NPC · 2026-10-28

## Lỗi đã sửa

Hàm chọn mẫu cũ trả về `player` cho NPC nam chưa có `modelKey`. Nhóm học sinh, người chạy bộ, khách trà và một người lái xe vì thế có thể dùng cùng đầu/tóc/quần áo với người chơi. Nhiều trường `style` trong danh sách NPC cũng không được áp dụng lên GLB đang tải. Khách trong tiệm chỉ luân phiên hai mẫu; tổ trưởng dùng nhầm mẫu cư dân nữ.

NPC hiện phải có `identityId` hợp lệ. Không còn nhánh mặc định trả về người chơi hoặc một NPC chung khi thiếu cấu hình. Danh tính được gắn cố định với vai trò, không đổi ngẫu nhiên mỗi lần tải.

## Phạm vi thay đổi

`citizen-roster.mjs` định nghĩa 30 cấu hình riêng: 5 NPC nhiệm vụ, 14 cư dân/học sinh/người nhận hàng, 4 người lái xe, 3 nhân vật sự kiện và 4 khách tiệm.

Các mẫu phối bộ phận từ năm tài sản NPC CC0 hiện có. Không dùng bộ phận hình học của người chơi. Chúng vẫn chia sẻ các kiểu tóc, đầu, quần áo cơ sở; đây không phải 30 nhân vật điêu khắc độc lập. Khác biệt gồm:

- Đầu và khuôn mặt từ mẫu NPC khác nhau; chỉnh tỷ lệ đầu, mắt và miệng, giảm mảng má hồng đậm.
- Tóc ngắn, bob, tóc dài, tóc tết, tóc bạc; người đọc sách có đầu thưa tóc và kính.
- Đồng phục bảo vệ, học sinh, trang phục người bán hàng, người cao tuổi và người đi xe; màu quần áo và da cố định theo danh tính.
- Chiều cao, bề ngang, giày, nón lá/mũ mềm, kính, ba lô và túi đeo khác nhau.
- Phần da bên trong lấy từ đúng mẫu áo/quần; các bộ quần áo tương thích được ghép để tránh lộ bụng. Thêm phần cổ khớp theo xương. Không bỏ các mảnh trang trí đang lấp lỗ của hình học áo gốc.

Khung xương 19 xương đã được kiểm tra tương thích trước khi phối. Hình học chỉ được tạo lúc dựng mẫu và dùng chung giữa các bản sao; vẫn gộp bề mặt skin theo vật liệu. Animation được giữ, NPC chạy có clip chạy tương thích thay vì luôn dùng clip đi bộ. Người chơi giữ nguyên mẫu áo đỏ.

## Kiểm tra và bằng chứng

- 98 bài kiểm tra đạt. Kiểm tra 30 dấu nhận diện không trùng, không tham chiếu hình học người chơi, 30 fingerprint hình học khác nhau, ma trận bind hữu hạn, idle/walk/run/wave hoạt động, nguồn GLB không bị sửa và bộ xương giữa các bản sao độc lập.
- Đã xem nhóm NPC nhiệm vụ cạnh người chơi; nhóm học sinh/cư dân; nhóm người lái/người nhận hàng; khách tiệm/sự kiện trong trang đối chiếu, có bật chuyển động.
- Chẩn đoán trong game xác nhận một người chơi và 26 danh tính NPC ngoài phố/sự kiện khác nhau, không có ID trùng. Bốn khách tiệm dùng bốn cấu hình riêng và đi qua cùng bộ dựng mẫu.
- Kiểm tra đi bộ, lên xe, chạy xe, xuống xe đạt. Tuyến bưu kiện đạt nhận hàng, sửa người nhận sai, giao ba điểm theo thứ tự khác nhau, lưu/nạp, trả sổ và nhận thưởng. Không có lỗi/cảnh báo console trong phiên tích hợp đã kiểm tra.
- Phiên chạy nền bị trình duyệt hạ nhịp nên không dùng số đo đó để tuyên bố FPS. Bản này chưa có phép so sánh FPS mới đáng tin cậy; giữ nguyên các cơ chế gộp và culling đã có.
- Dữ liệu fixture dùng origin 127.0.0.1 được khôi phục; không thay save localhost. Các tab kiểm tra tạm đã đóng.

Ảnh: `artifacts/npc-quest-roster.png`, `artifacts/npc-residents-roster.png`, `artifacts/npc-tailor-in-map.png`. Trang kiểm tra: `tests/npc-roster-preview.html`.
