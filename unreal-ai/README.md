# Cầu nối AI → Unreal Editor

Trạng thái: đã có mã nguồn plugin Python + MCP stdio, kiểm thử giao thức/queue bằng Node. **Chưa chạy trong UE5 trên máy này**: chưa tìm thấy Editor hay dự án `.uproject` ở workspace, registry Epic và thư mục Unreal Projects thông thường. Đây chưa phải bản chuyển game web sang Unreal.

## Bộ này làm được gì?

Claude Code hoặc Codex → MCP Node → hàng đợi file trong `Saved/LocalAIBridge` → Python của Unreal Editor. Không mở cổng mạng, không cần API key trong plugin. Chi phí/quyền sử dụng AI vẫn phụ thuộc tài khoản của client, không có nghĩa mô hình AI chạy offline miễn phí.

6 công cụ: `ue_status`, `ue_list_actors`, `ue_find_assets`, `ue_spawn_mesh`, `ue_transform_actor`, `ue_select_actor`. Đặt mô hình StaticMesh có sẵn; không tự tạo mô hình đẹp từ hư không. Đơn vị centimet, thứ tự rotation là pitch/yaw/roll. Mỗi thao tác đặt/di chuyển nằm trong một Undo transaction và không tự lưu map. Chỉ chạy trong Editor; chưa có chỉnh graph Blueprint, điều khiển chơi thử, chụp ảnh hoặc đánh giá hình ảnh tự động.

## Cài vào dự án UE5

1. Đóng Editor của dự án đích. Tạo hoặc chọn dự án UE5 thực tế trước; không dùng thư mục game web làm dự án UE.
2. Chạy trong thư mục game web:

```powershell
node unreal-ai/install.mjs 'D:/UnrealProjects/PhoNho/PhoNho.uproject'
```

Thay bằng đường dẫn thật. Installer sao lưu `.uproject`, thêm plugin vào `Plugins/LocalAIBridge`, bật Python Editor Script và Editor Scripting Utilities. Nếu plugin đã tồn tại thì dừng, không ghi đè. Mở lại Editor; Output Log cần hiện `LocalAIBridge ready`. Nếu plugin chưa tự khởi chạy, kiểm tra nó đã Enabled và chạy Python trong Output Log: `import local_ai_bridge; local_ai_bridge.start()`.

3. Chọn **một** client. Đăng ký server bằng CLI nếu client đã cài:

```powershell
claude mcp add --transport stdio unreal-local -- node 'C:/Users/Admin/Desktop/game/unreal-ai/server.mjs' 'D:/UnrealProjects/PhoNho'
```

```powershell
codex mcp add unreal-local -- node 'C:/Users/Admin/Desktop/game/unreal-ai/server.mjs' 'D:/UnrealProjects/PhoNho'
```

Đối số cuối là thư mục chứa `.uproject`, không phải file. Chạy CLI trong ngữ cảnh dự án bạn muốn dùng; mở lại client nếu nó yêu cầu. Bộ mã này không tự thay đổi cấu hình Claude/Codex của máy.

## Kiểm chứng thực tế trước khi làm map

Yêu cầu AI: “Gọi ue_status, kiểm tra connected=true. Liệt kê actor. Tìm StaticMesh có sẵn trong /Game, đặt một bản sao tên AI_Test ở [0,0,100], di chuyển nó sang [200,0,100], chọn actor đó. Không lưu level.” Kiểm tra trong viewport và Ctrl+Z để hoàn tác. Nếu timeout khi đặt đồ vật, xem level trước khi gọi lại vì thao tác có thể đã thực hiện trước lúc mất phản hồi.

Luồng tiếp theo sau khi bridge chạy thật: chọn một đoạn phố nhỏ, nhập asset được cấp phép, dựng cảnh/ánh sáng, thêm nhân vật góc nhìn thứ nhất, chuyển một nhiệm vụ. Game hiện tại chưa được chuyển; không có cam kết FPS hay chất lượng UE5 khi chưa đo trên máy thật.

## Kiểm thử và tài liệu

`node --test tests/unreal-bridge.test.mjs` kiểm tra schema, MCP stdio, editor offline, deadline và trao đổi file với editor giả lập. `python -m py_compile unreal-ai/LocalAIBridge/Content/Python/*.py` chỉ kiểm tra cú pháp; không xác nhận tương thích API Unreal.

- [Epic: Python trong Editor](https://dev.epicgames.com/documentation/en-us/unreal-engine/scripting-the-unreal-editor-using-python)
- [OpenAI: Codex MCP](https://learn.chatgpt.com/docs/extend/mcp)
- [Anthropic: Claude Code MCP](https://code.claude.com/docs/en/mcp)
