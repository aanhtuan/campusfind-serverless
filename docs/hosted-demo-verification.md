# Kiểm thử Cloud và dữ liệu demo — 09/11/2026

Đã thực hiện theo xác nhận trong chat: áp dụng hai migration, triển khai hàm `workflow` và tạo tối đa hai tài khoản demo. Frontend hiện chạy tại `http://127.0.0.1:3000` từ `/home/atuna/campusfind-serverless`, nhánh `feat/integrate-campusfind-mvp`, kết nối Supabase Cloud `campusfind-dev` (`gxbpprhivyxmtcqibncf`). Chưa triển khai frontend lên Vercel, chưa commit/push.

## Dữ liệu được giữ lại để xem và thao tác

Tổng cộng **8 tin, mỗi tin 1 ảnh PNG**: 6 tin của tài khoản chính, 2 tin của Demo B/C để đảo vai. Tất cả gắn nhãn DEMO, mô tả rõ không phải thất lạc thực tế; ảnh đồ vật được tạo riêng để minh họa. Giữ lại 15 yêu cầu/phản hồi, 3 lịch bàn giao và lịch sử 2 sự cố để xem các trạng thái. Dữ liệu cũ không được sửa hoặc xóa.

| Tin | Trạng thái | Kịch bản | Mở bằng tài khoản chính |
| --- | --- | --- | --- |
| [DEMO 01] Ví da nâu – đã trao lại | `RESOLVED` | FOUND hoàn tất: đã duyệt một yêu cầu, hẹn và xác nhận đủ hai phía. | [Xem](http://127.0.0.1:3000/my-reports/1956c4c1-de0c-4819-bf65-a4f605d708f4) |
| [DEMO 02] Tai nghe trắng – chủ đồ đã nhận lại | `RESOLVED` | LOST hoàn tất: chủ đồ gửi bằng chứng, người giữ đồ xác minh, hai phía xác nhận. | [Xem](http://127.0.0.1:3000/my-reports/71601874-22a9-41b4-aa26-e1b704f5f839) |
| [DEMO 03] Bình nước xanh – chờ xét duyệt | `OPEN` | Một yêu cầu bị từ chối, một bị hủy; còn một yêu cầu chờ xét duyệt. | [Xem](http://127.0.0.1:3000/my-reports/b6015283-80c9-4d7e-9b64-d2adac7ec28d) |
| [DEMO 04] Chùm chìa khóa – chờ xác minh chủ đồ | `OPEN` | Đã chọn phản hồi và gửi bằng chứng; đang chờ người giữ đồ xác minh. | [Xem](http://127.0.0.1:3000/my-reports/383b05f6-9e04-4edd-b401-c45428a8cc47) |
| [DEMO 05] Tai nghe – tạm dừng do sự cố lịch hẹn | `IN_PROGRESS` | Đang bàn giao nhưng tạm dừng vì sự cố; cần phía còn lại đồng ý tiếp tục. | [Xem](http://127.0.0.1:3000/my-reports/9c3579c1-2064-4bbb-a963-55d886e814bf) |
| [DEMO 06] Ví da – phản hồi không khớp, tiếp tục tìm | `OPEN` | Đã thử không khớp, rút lựa chọn và hủy; hiện có phản hồi mới đang chờ. | [Xem](http://127.0.0.1:3000/my-reports/ae695547-60d2-4e00-bb41-a408bd98f22c) |
| [DEMO 07] Ví nhặt được – Tuấn đang yêu cầu nhận | `OPEN` | Tin của Demo B; tài khoản chính đang là người yêu cầu nhận đồ. | [Xem](http://127.0.0.1:3000/claims/9446e703-dd06-40e8-9e6d-2daa95d653f6) |
| [DEMO 08] Bình nước thất lạc – chờ Tuấn xác minh | `OPEN` | Tin của Demo C; tài khoản chính đang giữ đồ và có nút xác minh chủ đồ. | [Xem](http://127.0.0.1:3000/claims/cecf18bc-4a10-49dd-bb9c-73648e8d6cd7) |

Hai tin RESOLVED không xuất hiện trên bảng tin đang hoạt động, nhưng vẫn xem được trong lịch sử được cấp quyền. Sáu tin còn lại vẫn hiển thị công khai phần văn bản; ảnh cần đăng nhập. Tài khoản từng gửi một yêu cầu giữ lịch sử tin liên quan theo chính sách hiện có, kể cả khi yêu cầu bị từ chối; điều này không cho phép đọc bằng chứng hoặc lịch bàn giao của yêu cầu khác.

## Kết quả kiểm tra thực tế

**17 nhóm PASS** trên Cloud:
- Sáu tin DEMO được tạo dưới đúng tài khoản người dùng, gồm ba LOST và ba FOUND.
- Sáu tin có ảnh Storage thật; thành viên tải được, khách chưa đăng nhập bị chặn.
- FOUND gửi lặp không tạo trùng; không tự nhận tin của mình, không sửa tin người khác hoặc tự cấp ADMIN; bằng chứng riêng tư.
- UI duyệt một yêu cầu FOUND chuyển IN_PROGRESS và tự từ chối yêu cầu cạnh tranh.
- FOUND từ chối không đóng tin; hủy chỉ khi đang chờ; để lại một yêu cầu chờ xét duyệt.
- LOST chọn phản hồi chưa xác minh: cấm tự phản hồi, sai loại yêu cầu, tự xác minh và hẹn bàn giao sớm.
- Form lịch đã sửa hoạt động trên Cloud; lịch cũ/tự chấp thuận bị chặn; liên hệ cần đồng ý, riêng tư và thu hồi được.
- FOUND đủ hai phía mới RESOLVED; ẩn khỏi bảng tin, giữ lịch sử từng yêu cầu và cô lập bằng chứng/lịch hẹn của người khác.
- Sự cố lỡ hẹn chặn hoàn tất; một bên đồng ý tiếp tục chưa đủ; người không liên quan không thể xác nhận.
- LOST bằng chứng do chủ đồ gửi, không thể tự xác minh; dữ liệu riêng và liên hệ bị chặn trước khi người giữ đồ xác minh.
- LOST không khớp hoặc rút lựa chọn vẫn OPEN; hủy phản hồi đang chờ và gửi phản hồi mới hoạt động.
- Bằng chứng LOST gửi từ UI được lưu riêng và bất biến; chỉ người giữ đồ xác minh, rồi mới được bàn giao.
- LOST chủ tin nhận/người phản hồi giao; một phía chưa đủ, đủ hai phía mới hoàn tất; người ngoài không đọc tin/ảnh đã hoàn tất.
- Hai bên cùng đồng ý mới xử lý sự cố; đổi lịch bắt buộc đề xuất mới, phiên bản đúng; giữ mẫu sự cố mới đang mở.
- Không có phiên bị từ chối; dữ liệu giả actor bị chặn; USER không xem được trang tổng quan Admin.
- Đảo vai tài khoản chính: gửi yêu cầu cho FOUND của người khác và là người giữ đồ có quyền xác minh LOST của người khác.
- Tám tin giữ đúng trạng thái và đủ ảnh; hai tin hoàn tất ẩn công khai, hai kịch bản đảo vai xuất hiện trong yêu cầu gửi đi.

Các thao tác được chạy bằng ba danh tính Auth độc lập, caller JWT và RLS thật. Tài khoản chính được đăng nhập và thao tác trên UI: tạo tin đầu tiên, tải ảnh, duyệt FOUND, đề xuất lịch, xác nhận giao FOUND, xem trước/gửi bằng chứng LOST và xác nhận nhận LOST. Hai tài khoản demo thực hiện phía còn lại qua SDK có xác thực và cùng Edge Function/RPC; không dùng service role để bỏ qua nghiệp vụ. Hai vai gửi đi trong UI `my-claims` cũng đã được mở và kiểm tra, gồm đúng nút xác minh khi tài khoản chính là người giữ đồ.

Đây là **frontend localhost + backend Supabase Cloud**, không phải kiểm thử một frontend đã được host trên Vercel. Các xác nhận bàn giao đều là mô phỏng với vật mẫu, không chứng minh trao tài sản ngoài đời.

## Lỗi phát hiện và sửa

Trên trình duyệt đang dùng, trường `datetime-local` hiển thị giá trị nhưng callback dựa vào React state không gửi được đề xuất và không báo lỗi. Đã tái hiện việc không có bản ghi handover trước khi sửa; cập nhật `src/features/workflow/coordination.tsx` để đọc trực tiếp `FormData` từ hai trường có tên `location`, `meeting_at`, và báo lỗi khi ngày giờ không hợp lệ. Sau sửa, đề xuất đã được lưu trên Cloud, phía còn lại chấp thuận và hai bên xác nhận thành công. Vẫn giữ kiểm tra ngày giờ/địa điểm ở client, Edge và database.

Sau sửa: ESLint PASS, TypeScript PASS, 16 test workflow PASS, production webpack build PASS trong bản sao nguồn riêng để không ảnh hưởng dev server. Không thêm dependency hoặc thay đổi schema ngoài hai migration đã duyệt.

## Triển khai và kiểm tra quyền

- Project đích được xác nhận ACTIVE_HEALTHY trước thao tác. Giữ hai migration nền tảng, áp dụng `20261105065313_claims_handover_workflow.sql` rồi `20261109154529_lost_finder_response.sql`.
- MCP tự cấp timestamp khi áp dụng; chỉ hai bản ghi mới được căn chỉnh lại version về tên file nguồn chuẩn để CLI không chạy lại chúng. `list_migrations` sau cùng khớp đủ bốn version trong repo.
- `workflow` ACTIVE, version 1, `verify_jwt=true`; bundled source dùng caller-scoped client và `getUser()`. Không đổi Auth settings, bucket privacy, domain, team, billing hoặc môi trường Vercel.
- SDK đăng ký demo gặp `email_address_invalid` với tên miền thử nghiệm, sau đó gặp `over_email_send_rate_limit` với alias thuộc chủ tài khoản. Vì connector không có Auth Admin endpoint, đúng hai danh tính demo mới được tạo bằng SQL quản trị có phạm vi UUID riêng, bcrypt hash tạo trong bộ nhớ, email alias thuộc chủ tài khoản và role USER. Sau đó cả hai đăng nhập qua Supabase Auth thật, profile/identity được đối chiếu. Không chỉnh tài khoản có sẵn hoặc tắt xác minh email toàn cục.
- Việc tạo fixture bằng quản trị **không xác nhận luồng đăng ký công khai hay gửi email**. Tài khoản chính vẫn USER; không tạo hoặc nâng ai thành ADMIN. Chặn truy cập Admin của USER đã được kiểm tra; thao tác tiếp nhận sự cố của ADMIN trên Cloud chưa chạy.

Security advisor không báo lỗi RLS; còn cảnh báo cấu hình Auth hiện có về [leaked password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Performance advisor có INFO cho 4 foreign key chưa có covering index và 3 index chưa dùng; xem [unindexed foreign keys](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys) và [unused indexes](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index). Không thay cấu hình hoặc xóa/thêm index ngoài phạm vi đã duyệt.

## Bằng chứng và giới hạn

- [Danh sách tin](/home/atuna/.codex/visualizations/2026/11/05/01a1aa79-ceec-7e90-8bb7-d98a390ae466/campusfind-demo-2026-11-09/my-reports.jpg)
- [Tin có ảnh Storage hiển thị thật](/home/atuna/.codex/visualizations/2026/11/05/01a1aa79-ceec-7e90-8bb7-d98a390ae466/campusfind-demo-2026-11-09/report-with-photo.jpg)
- [LOST đã hoàn tất](/home/atuna/.codex/visualizations/2026/11/05/01a1aa79-ceec-7e90-8bb7-d98a390ae466/campusfind-demo-2026-11-09/lost-resolved.jpg)
- [Hai yêu cầu/phản hồi gửi đi](/home/atuna/.codex/visualizations/2026/11/05/01a1aa79-ceec-7e90-8bb7-d98a390ae466/campusfind-demo-2026-11-09/my-claims.jpg)
- [Tài khoản chính là người giữ đồ có quyền xác minh](/home/atuna/.codex/visualizations/2026/11/05/01a1aa79-ceec-7e90-8bb7-d98a390ae466/campusfind-demo-2026-11-09/main-account-as-holder.jpg)
- [Manifest không chứa thông tin đăng nhập](/home/atuna/.codex/visualizations/2026/11/05/01a1aa79-ceec-7e90-8bb7-d98a390ae466/campusfind-demo-2026-11-09/verification.json)
- Dấu vết release, hash nguồn và snapshot schema trước thay đổi nằm trong `/home/atuna/.codex/visualizations/2026/11/05/01a1aa79-ceec-7e90-8bb7-d98a390ae466/campusfind-demo-2026-11-09`.

Mật khẩu người dùng, mật khẩu demo, password hash, access/refresh token không nằm trong báo cáo hoặc manifest. Các phiên SDK tự động đã đăng xuất và mật khẩu demo bị bỏ khỏi bộ nhớ phiên; trình duyệt giữ đăng nhập tài khoản chính để người dùng tiếp tục xem. Giữ các tin/tài khoản demo để người dùng xem theo yêu cầu; không tự xóa dữ liệu Cloud. Không khẳng định production-ready hoặc đã bao phủ mọi tình huống thực tế.
