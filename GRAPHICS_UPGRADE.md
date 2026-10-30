# Nâng cấp hình ảnh — 27/10/2026

## Đã thay đổi

- Quán xôi, nhà trong ngõ: vữa sơn chụp thật với normal và roughness map.
- Ngách: gạch đỏ chụp thật, mạch vữa có phản ứng với ánh đèn. Nền bê tông ướt có độ nhám riêng.
- UV theo mét trên các bề mặt chính, tránh kéo một ảnh phủ cả tòa nhà.
- Phản xạ môi trường riêng cho ngày và đêm; ban đêm không phản chiếu bầu trời xanh giữa trưa.
- Bóng nắng trong chương truyện tập trung vào vùng quán/ngõ thay vì trải trên toàn bản đồ.
- Nội thất: ghế tròn bốn chân, chân bàn nghiêng, tủ có ngăn và tay nắm, bổ sung kệ đỡ bát tầng trên, hạt xôi nhỏ, rá dạng lòng chảo, hơi nước mềm và bóng tiếp xúc dưới bàn/tủ.
- Ngoại thất: cửa gỗ chia ô và tay nắm, nắp tường cong, mái tôn có gợn sóng; giảm màu quá bão hòa trên các vật liệu kiến trúc dùng chung.

## Tài nguyên và tải

9 ảnh 1K, tổng 5.226.049 byte (~4,98 MiB), dùng chung giữa các công trình. Không có displacement tăng số đa giác trên bề mặt. Chân ghế, ô cửa, tay nắm và hạt xôi dùng instancing để giới hạn lượt vẽ.

Nguồn, giấy phép CC0 và checksum: `assets/textures/ATTRIBUTION.md` và `assets/textures/sources.json`.

## Kiểm tra

- `npm test`: 21/21 đạt.
- Kiểm tra cú pháp `app.js`, `visual-materials.mjs`.
- Kiểm tra trực quan quán, ngách và ngõ trên trình duyệt; chưa ghi nhận lỗi console/shader.
- Mẫu ở ngõ, cấu hình medium, DPR 1, bật bóng đổ: khoảng 60 FPS, p95 19 ms, 128 lượt vẽ trong lượt kiểm tra. Mẫu ngách: khoảng 56 FPS, p95 18 ms. Đây là số đo tại những góc kiểm tra, không phải kết quả benchmark toàn bản đồ hay bảo đảm cho mọi máy.
- `tests/graphics-preview.html` tạo phiên kiểm tra riêng, hỗ trợ đi tới ba góc nhìn bằng sự kiện bàn phím và trả lại save khi bấm Khôi phục save. Không dùng trang này thay bản chơi chính.

Ảnh trực tiếp từ bản chạy: `graphics-alley-pbr.png`, `graphics-shop-pbr.png`.

## Phạm vi

Đợt này tập trung quán xôi và ngõ 41, đồng thời điều chỉnh vật liệu kiến trúc dùng chung. Một số xe, cây và nhà xa vẫn là mô hình đơn giản từ bản cũ; chưa thay cả thành phố bằng mô hình quét 3D.

## Vá hở thế giới và giảm tải — 27/10

- Phần che cũ chỉ bật khi chơi cốt truyện. Bổ sung nền và tường cố định cho hai mép ngõ, cuối ngõ, hai bên ngách và cuối ngách, có collider dùng chung cho ngày/đêm. Giữ cửa quán và ngã rẽ thông nhau.
- Nhà phía sau tường che phần nền khi nhìn từ trên cao. Dãy nhà ngoài rìa bản đồ dùng instancing; không thêm đèn hoặc bóng đổ động cho hậu cảnh.
- `collision-grid.mjs`: chia vật cản tĩnh vào ô 8 m. Người chơi và camera chỉ kiểm tra ô lân cận; truy vấn lại sau mỗi lượt đẩy và giữ thứ tự collider để ổn định ở góc tường. NPC/xe đang chạy vẫn được kiểm tra động.
- NPC trong 25 m giữ tốc độ cập nhật hoạt ảnh theo khung hình; xa hơn dùng 30 Hz, ngoài 55 m dùng 15 Hz. Chuyển động di chuyển vẫn cập nhật mỗi khung hình và thời gian animation được cộng dồn.
- Bản đồ bóng ban ngày tập trung trong vùng 130 m quanh người chơi, dịch cả nguồn sáng và điểm đích cùng nhau để giữ hướng nắng. Độ phân giải và cấu hình đồ họa của người chơi giữ nguyên.
- Camera TPS được phép thu sát người khi sát tường; bỏ giới hạn chiều dài tối thiểu vốn đẩy camera xuyên qua tường gần. Kiểm tra lại sau nội suy để camera không cắt góc khi xoay.
- `npm test`: 27/27 đạt; thêm kiểm tra truy vấn collider qua ranh giới ô, tọa độ âm, vật cản lớn, đăng ký mới, tái sử dụng bộ đệm, camera sát tường/góc chéo và đường ngõ–ngách–quán không bị các tường mới chắn ngang.
- Kiểm tra trình duyệt riêng ở 1280×800, medium, DPR 1,10: cuối ngách chặn cả đi bộ và nhảy tại x=-95,72, z=-37. Mẫu đứng tại đây khoảng 58–60 FPS, p95 17 ms; đây không phải benchmark toàn bản đồ hoặc so sánh trước/sau cùng một góc nhìn.
- Cuối ngõ chặn tại z=-55; tuyến vào/ra quán và ngách đều đi được trong ngày và chương truyện. Tuyến từ ngõ ra phố rồi quay lại đạt trong phiên ban ngày. Mẫu ngách ban đêm khoảng 60 FPS, p95 18 ms. Không ghi nhận lỗi console trong các phiên thử này. Ảnh: `graphics-world-closure-day.png`, `graphics-world-closure-night.png`.

Trang thử `tests/graphics-preview.html?day=1` hỗ trợ ban ngày, thử cuối ngách/cuối ngõ, đổi FPS/TPS và kiểm tra đường vào quán; bản không có `day` dùng chương truyện. Luôn bấm Khôi phục save trước khi đổi phiên. Dùng host 127.0.0.1 để tách dữ liệu khỏi bản chơi localhost.

## Sửa nhấp nháy mặt tiền và khoảng phố trống

- Hai lớp vỏ che ngõ trước đây trùng mặt x=-69,8 và x=-64,2 với nhà có sẵn, gây z-fighting. Lùi vỏ che 16 cm vào sau mặt tiền; không dùng polygon offset để giấu lỗi chồng hình học.
- Bỏ chín tấm nền ảnh vệ tinh tải từ ArcGIS; nền chính dùng bê tông có UV theo mét. Mặt đường/vỉa hè hiện hữu giữ nguyên.
- Bổ sung tám mặt tiền ở đoạn phía Nam còn thiếu, có collider, cửa, cửa sổ, mái và gờ tầng. Chi tiết lặp dùng sáu InstancedMesh, thêm một tường sau; không thêm đèn hoặc vật thể đổ bóng động.
- Bổ sung các cụm nhà phía sau đầu Tây, dùng chung ba lượt vẽ hậu cảnh cũ; giữ lối cổng làng và vườn đào.
- `npm test`: 30/30 đạt. Thêm kiểm tra mặt che không trùng mặt tiền, tầm nhìn qua đoạn phố thiếu được khép, đường chính/lối rẽ trường/cổng làng/vườn đào vẫn thông.
- Kiểm tra trình duyệt Medium, 1280×800, DPR 1: góc cửa ngõ nhìn ra phố khoảng 60 FPS/p95 17 ms; nhìn vào ngõ khoảng 60 FPS/p95 19 ms. Đây là các góc thử, không phải bảo đảm FPS toàn bản đồ. Không ghi nhận lỗi console trong phiên.
- `tests/graphics-preview.html?day=1&street=1` và `?day=1&alley-entry=1` tái hiện hai hướng nhìn. Ảnh: `graphics-street-frontage-fixed.png`, `graphics-facade-depth-fixed.png`.
