# Hướng nâng cấp trải nghiệm — 28/10/2026

> Cập nhật 29/10: chương **Tấm ảnh trước cửa** đã có bản chơi được, gồm lời kể, đối chiếu, xin ý kiến, ba kết thúc và bảng lời kết trong ngõ. Trạng thái chi tiết tại [PHOTO_MYSTERY_DESIGN.md](./PHOTO_MYSTERY_DESIGN.md). Phần đề xuất chương bên dưới là ý tưởng trước khi triển khai; bản hiện tại chưa có ảnh chân dung cổ, lồng tiếng hay diễn xuất riêng.

## Quyết định thiết kế

Một khu phố Việt có đời sống, nơi người chơi quen dần hàng xóm và làm thay đổi những chỗ mình thường ghé. Ban ngày có việc làm và khám phá; bí ẩn ban đêm là một tuyến riêng, có mở đầu và kết thúc. Tiệm bài là chỗ nghỉ tùy chọn. Trọng tâm không phải kéo dài bản đồ hay nhồi thêm trò chơi phụ.

Mục tiêu hình ảnh là tỷ lệ người lớn, vật liệu bớt bóng và bớt chói, nhà cửa có chiều sâu, ánh sáng có nguồn rõ ràng, chi tiết gắn với người đang sống ở đó. Không mặc định đã đạt đồ họa như video tham chiếu. UE5 + AI là công cụ sản xuất, không thay thế art direction và tối ưu.

## Những gì thấy trong dự án

- Bản chạy là Three.js 0.160; chưa có dự án Unreal hoạt động. Bộ `unreal-ai` mới là cầu nối Editor chưa được xác nhận trong UE.
- Đã có giao xôi, dọn ngõ, ảnh và chuyển bưu kiện. Phần lớn nội dung ngày luân phiên theo ngày chẵn/lẻ; lời dẫn bảng việc lặp sau ba ngày. Có công trình cộng đồng, nhưng thiếu nguyên nhân và diễn biến dẫn người chơi tới công trình đó.
- Một cây phố có 900 lá, ba batch, ở mọi khoảng cách. Nhân vật đã có giới hạn phạm vi và giảm tần suất cập nhật animation ở xa; không cần làm lại hệ thống đó khi chưa có số đo mới.
- Đã có gộp kiến trúc theo cụm, giữ bóng nhà ở xa và giới hạn cập nhật shadow. Mở rộng thêm hàng trăm mesh riêng lẻ sẽ đi ngược các tối ưu này.
- Số đo cũ trong PERFORMANCE_PASS.md đạt gần 60 FPS ở một số góc; không suy ra đạt mọi góc hoặc 144 FPS. Phải xem thời gian khung hình, tải GPU/CPU và khựng lúc tải asset.

## Đợt này đã triển khai

1. Tán cây ba mức: 900 / 300 / 114 lá. Chuyển ở khoảng 38 m và 90 m, có vùng đệm 16% khi quay lại gần để tránh đảo mức liên tục. Lấy mẫu rải khắp tán, lá ở xa lớn hơn để giữ độ phủ; thân, cành và cây luôn còn. Cây gần vẫn đủ chi tiết. Đây là giảm lượng hình học lá; không đồng nghĩa FPS tăng đúng 87%.
2. Chuyện ban ngày **Giữ một góc ngõ**: lời nhờ của cô Hoa → giúp ba nhóm cư dân khác nhau → chọn Góc xanh hoặc Góc ảnh → nhận một cấp công trình thực tế trong Ngõ 41 và lời kết tương ứng. Làm lại cùng loại việc vẫn có thù lao nhưng không đẩy tiến độ câu chuyện. Tiến độ qua ngày và save/reload; chỉ chọn kết thúc một lần. Nhánh còn lại vẫn xây được bằng điểm sau này. Đây là tuyến chuyện nhỏ, chưa phải chiến dịch đầy đủ hay hội thoại NPC tại chỗ.
3. Sửa tổng kết ngày còn hiển thị ba việc thành bốn việc.
4. Không tạo sự kiện khẩn cấp ngẫu nhiên mới khi người chơi đang nhận một việc trong ngày. Sự kiện đã xuất hiện vẫn giữ quy tắc hiện có; không xóa kết quả hoặc thay đổi công việc đang làm.

## Phần nên phát triển tiếp, theo thứ tự

### 1. Một đoạn phố làm chuẩn hình ảnh

Chọn 60–100 m quanh quán trà và Ngõ 41. Giữ một bộ tỷ lệ cửa, bậc thềm, xe, người; dùng cửa lõm, mái che cong, lan can thật và vài mặt tiền có dấu hiệu nhận diện. Tường/trang phục có độ nhám phù hợp, biển hiệu đọc được ở khoảng cách chơi. Giảm những mảng màu neon không có lý do. Đồ vật phải kể được ai đang dùng: bàn sửa xe có dụng cụ, quán đang mở có ghế và hàng hóa, quán đóng có cửa kéo. Không trang trí dày đều mọi mét đường.

Chụp cùng vị trí ở sáng/chiều/tối; kiểm tra mặt người, chữ biển, bóng tiếp xúc và mép vật thể. Chọn asset miễn phí theo giấy phép cụ thể, ghi nguồn và quyền sửa/redistribute trước khi nhập. Chưa chọn hoặc tải bộ asset mới trong đợt này.

### 2. Thế giới có nhịp sinh hoạt

Một ngày có ba trạng thái cho vài NPC chủ chốt trước: mở quán, tiếp khách, thu dọn. Chuyển lịch khi NPC khuất tầm nhìn hoặc dùng tuyến đi bộ thực tế; không biến mất trước mặt. Người trên đường biết nhường, dừng tại quán, có điểm đến. Mô phỏng đủ chi tiết ở gần; ở xa chỉ cập nhật trạng thái thưa hơn. Âm thanh theo vị trí cho quán nước/động cơ/tiếng sinh hoạt, mức âm có giới hạn và nút âm lượng.

Mỗi vùng cần một lý do quay lại: người mới, một việc còn dang dở, lời hẹn hoặc kết quả từ lần giúp trước. Chỉ mở rộng map khi vùng cũ đã có những điều này.

### 3. Một chương chơi 15–20 phút có tình huống thật

Đề xuất chương **Tấm ảnh trước cửa** — chưa triển khai:

- Mở đầu: bác Sơn tìm người trong bức ảnh cũ để xin phép trưng bày ở Ngõ 41. Hai địa chỉ gần giống nhau; người chơi phải đọc dấu hiệu trong ảnh và hỏi cư dân, thay vì theo một điểm GPS biết sẵn đáp án.
- Phát triển: tiệm may nhận ra bộ đồng phục, quán nước nhớ thời điểm chụp; thứ tự hỏi tùy chọn. Một lời kể mâu thuẫn với biển số nhà, mở lựa chọn quay lại kiểm chứng. Sổ tay ghi bằng chứng đã thấy; câu trả lời không mất khi thoát game.
- Cao trào: người trong ảnh muốn giữ riêng một phần câu chuyện. Người chơi chọn xin lời kể để đăng, dùng ảnh đã che thông tin, hoặc giữ ảnh cho gia đình. Không áp một đáp án đạo đức duy nhất.
- Kết quả: bảng ảnh trong ngõ, lời chào và việc nhờ tiếp theo thay đổi theo lựa chọn. Người chơi thấy hậu quả tại đúng địa điểm, không chỉ nhận XP.

Chuyển bưu kiện và các việc ngày cung cấp cơ hội gặp người/lấy manh mối; tránh bắt cày tiền để đọc cốt truyện. Khi chơi lại, đổi người được hỏi trước và cách công bố câu chuyện; không chỉ đổi tọa độ giao hàng. Minigame có hướng dẫn ngắn, nhịp thư thả, thất bại được sửa; thưởng thêm cho thao tác tốt nhưng không khóa cốt truyện bằng phản xạ.

### 4. Chất lượng khung hình trước khi mở rộng

Mục tiêu kiểm chứng ban đầu: 60 FPS ở độ phân giải và cấu hình đã ghi rõ; theo dõi trung vị, p95/p99 và số khung vượt 33 ms khi đi bộ, rẽ xe, vào khu đông NPC. 144 FPS cần toàn khung khoảng 6,94 ms và môi trường trình duyệt/màn hình cho phép; chưa coi là cam kết.

Đo trước/sau ở cùng camera, đồ họa, độ phân giải và trạng thái tải. Phân biệt CPU cập nhật/submit với thời gian GPU; không dùng nghịch đảo CPU time để gọi là FPS. Tối ưu vật liệu/nhóm mesh/LOD trước, giữ chuyển động và phản hồi điều khiển cập nhật mượt. Tiền tải shader/asset trước khi người chơi vào cảnh mới; không thay đổi chất lượng liên tục giữa lúc chạy gây nhấp nháy.

## Điều kiện hoàn thiện một khu

- Không lộ mép thế giới, không xuyên tường/xe, không nhấp nháy hai mặt phẳng chồng nhau.
- Đi bộ và lái xe liền mạch; NPC có ngoại hình và mục đích riêng.
- Có một chương chơi từ đầu tới cuối, ít nhất một quyết định tạo thay đổi nhìn thấy.
- Save/reload giữ tiến độ và hậu quả, không nhận thưởng lặp.
- Có ảnh trước/sau và kết quả đo cùng điều kiện, ghi rõ giới hạn kiểm tra.

## Cơ sở kỹ thuật đã tham khảo

- [Three.js — tối ưu nhiều đối tượng](https://threejs.org/manual/pages/optimize-lots-of-objects.html): gộp mesh tương thích để giảm overhead lượt vẽ. Dự án đã áp dụng, tiếp tục giữ ranh giới vật thể động/tĩnh.
- [Three.js — LOD](https://threejs.org/docs/pages/LOD.html): mức chi tiết theo khoảng cách và hysteresis chống đảo mức sát ngưỡng; áp dụng vào cây trong đợt này. Đã đối chiếu implementation LOD của Three.js 0.160 đang cài.
- [Epic — Lumen Performance Guide](https://dev.epicgames.com/documentation/en-us/unreal-engine/lumen-performance-guide-for-unreal-engine): ánh sáng/phản chiếu có ngân sách khung hình riêng, cần profiling. Đây là cơ sở lập kế hoạch UE5, không phải bằng chứng bản web đang có Lumen.

Các đề xuất gameplay là quyết định thiết kế dựa trên nội dung hiện có, chưa phải kết quả nghiên cứu người chơi hoặc cam kết giữ chân người chơi.
