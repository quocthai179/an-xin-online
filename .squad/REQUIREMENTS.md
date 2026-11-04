# Phố Xin Việc 3D — Tài liệu yêu cầu (REQUIREMENTS)

Phiên bản: 1.0 (greenfield) · Ngày: 2026-11-04 · Tác giả: Business Analyst

> Repo hiện chỉ có README.md, nên không có "hành vi hiện tại" để bám theo. Mọi quyết định bên dưới là đề xuất của BA; chỗ nào chưa chắc được đánh dấu `ASSUMPTION` hoặc nằm ở mục Open questions kèm default đề xuất để dev làm tiếp mà không phải chờ.

---

## 1. Tầm nhìn, persona, mục tiêu

### 1.1 Tầm nhìn
Một con phố 3D nơi ứng viên IT/Digital "ngồi vỉa hè xin việc" theo kiểu tự trào: mỗi người là một avatar ngồi cạnh cái nón/bát đựng CV, cầm tấm bìa carton tự viết ("Java 5 năm, nhà còn mẹ già, xin job remote"). HR đi dạo trên phố, bấm vào ứng viên để xem CV, "thả xu" để bày tỏ quan tâm, "thả tờ 500k" để mời phỏng vấn, "bao trọn" để gửi offer. Ngoài ra có góc tâm linh vui (thắp nhang, xin quẻ). Mục tiêu kép: **vui đến mức người ta chia sẻ** và **vẫn là công cụ tuyển dụng dùng được thật** để HR dám dùng.

Toàn bộ tiền (xu, 500k) là **ảo**, không có giao dịch tiền thật.

### 1.2 Persona
| Persona | Mô tả | Nhu cầu chính | Nỗi lo |
|---|---|---|---|
| **Ứng viên** (Candidate) | Dev/designer/tester... đang tìm việc hoặc "ngồi chơi xem thị trường", tự nguyện lên phố | Được chú ý, có sign hài hước, nhận lời mời thật, có thứ để share | Bị chê cười, bị spam, lộ thông tin liên hệ, sếp hiện tại thấy |
| **HR / Recruiter** | Người tuyển dụng, đi tìm ứng viên | Lướt nhanh, lọc theo zone, xem CV gọn, chủ động liên hệ | Mất mặt khi dùng công cụ "đùa", ứng viên giả |
| **Khách xem** (Lurker / Người qua đường) | Không đăng nhập hoặc đăng nhập guest, chỉ xem cho vui | Đi dạo, xem biển hay, xin quẻ, thả "xu tình thương", share | — |

### 1.3 Mục tiêu (Goals)
- G1: MVP chạy được, nhiều người cùng online, thấy nhau di chuyển và thấy sự kiện thả xu realtime.
- G2: Ứng viên tạo hồ sơ + sign trong dưới 2 phút.
- G3: HR đi từ "vào phố" tới "thả 500k" trong dưới 60 giây.
- G4: Có ít nhất 3 điểm chạm share (share card sign, quẻ hằng ngày, "được bao").
- G5: Giữ tone tự trào, không phải ăn xin thật, không châm biếm người thật.

Chỉ số thành công (đề xuất): số ứng viên tạo hồ sơ/ngày; tỷ lệ HR thả ≥1 xu/phiên; số lượt share card; số 500k được ứng viên "Nhận lời"; D1/D7 retention nhờ quẻ hằng ngày.

### 1.4 Non-goals
- Không thanh toán / tiền thật / xu có giá trị quy đổi.
- Không thay thế ATS (không quản lý pipeline tuyển dụng, không lịch phỏng vấn tích hợp).
- Không chat video, không upload file CV (PDF) ở MVP (chỉ field có cấu trúc + link).
- Không native mobile app (web responsive).
- Không xác thực danh tính/doanh nghiệp ở MVP (để v2).

---

## 2. Glossary — ẩn dụ trong game → ý nghĩa thật

| Thuật ngữ | Nghĩa trong sản phẩm | Nghĩa thật |
|---|---|---|
| Phố Xin Việc | Toàn bộ ứng dụng / bản đồ 3D | Job board dạng 3D |
| Ngồi vỉa hè | Hồ sơ ứng viên đang ở trạng thái công khai | Open to work |
| Nón / Bát | Vật đựng CV trước mặt ứng viên; bấm vào để mở CV | Trang CV |
| Biển carton (sign) | Câu tự giới thiệu do ứng viên tự viết | Headline hồ sơ |
| Hẻm / Chợ / Gầm cầu... (Zone) | Khu vực theo chuyên môn | Category ngành nghề |
| Ghế / Vị trí ngồi (Seat) | Vị trí cố định trong zone, đánh số từ đầu phố | Thứ hạng hiển thị |
| Đầu phố / Mặt tiền | Các seat đầu zone, gần cổng vào | Top ranking |
| Thả xu | HR/khách bày tỏ quan tâm (virtual) | "Like/Shortlist nhẹ" |
| Xu tình thương | Xu miễn phí của khách xem (giới hạn/ngày), tách biệt xu HR | Cổ vũ, trọng số thấp |
| Thả tờ 500k | HR mời phỏng vấn | Interview invitation |
| Bao trọn | HR gửi offer, ứng viên nhận thì chuyển "Đã được bao" | Job offer / hired |
| Đã được bao | Trạng thái ứng viên đã nhận offer | Placed |
| Ngồi lì | Số ngày liên tục hồ sơ active | Thời gian tìm việc |
| Leng keng | Âm thanh + toast realtime khi nhận xu/500k | Notification |
| Thắp nhang cầu job | Hành động tâm linh vui, 1 lần/ngày | Tương tác cosmetic |
| Xin quẻ | Bói vui "năm nay có nhảy việc được không" | Nội dung giải trí/viral |
| Tường vinh danh (Được bao wall) | Khu hiển thị người đã được bao | Success stories |
| Người qua đường | Khách xem | Visitor |

---

## 3. User stories

Quy ước: ưu tiên MoSCoW. Mỗi AC phải kiểm chứng được qua UI/API. Giờ "ngày" theo múi giờ **Asia/Ho_Chi_Minh (UTC+7)**, reset lúc 00:00.

### Phạm vi MVP (một dev, một phiên)
Gồm: E1 Danh tính, E2 Hồ sơ ứng viên, E3 Phố 3D & zone, E4 Di chuyển + presence, E5 CV panel, E6 Thả xu / 500k / bao trọn, E7 Realtime + âm thanh, E8 Ranking, E9 Quẻ + nhang, E10 Share card. Gợi ý cắt gọn nếu thiếu thời gian: dùng primitives 3D (hộp/capsule) cho avatar, sign là texture canvas; DB đơn giản; WebSocket một room.

### E1. Danh tính (MVP)

**US-1 Đăng nhập guest** — *As a* người dùng mới, *I want* vào bằng tên hiển thị + vai trò mà không cần email, *so that* thử ngay.  Priority: Must
- AC-1.1 Given trang chủ, when tôi nhập tên hiển thị hợp lệ (2–24 ký tự) và chọn vai trò Ứng viên / HR / Xem, then tôi vào phố và có session lưu bền (reload không mất, ví dụ token trong localStorage/cookie).
- AC-1.2 Given tên rỗng hoặc chứa từ trong blocklist, when submit, then hiện lỗi cụ thể và không tạo session.
- AC-1.3 Given vai trò HR, when đăng ký, then bắt buộc nhập thêm "Công ty" (2–40 ký tự) và nhãn "Chưa xác minh" hiển thị cạnh tên.
- AC-1.4 Given session cũ, when mở lại trên cùng trình duyệt, then khôi phục danh tính, xu còn lại trong ngày, hồ sơ đã tạo.
- AC-1.5 Given tôi chọn "Xem", when muốn thả xu HR hoặc 500k, then bị chặn và có gợi ý "đăng ký HR".

Ghi chú: Có thể đổi vai trò Xem → Ứng viên/HR sau (giữ cùng user). Một user có tối đa 1 hồ sơ ứng viên. ASSUMPTION: một user không vừa là HR vừa là ứng viên cùng lúc ở MVP (đổi vai trò thì hồ sơ ứng viên bị ẩn, không xóa).

### E2. Hồ sơ ứng viên (MVP)

**US-2 Tạo hồ sơ + sign** — *As a* Ứng viên, *I want* tạo hồ sơ với biển carton do tôi viết, *so that* lên phố ngồi.  Priority: Must
- AC-2.1 Given vai trò Ứng viên chưa có hồ sơ, when điền đủ field bắt buộc và bấm "Ra ngồi", then hồ sơ tạo thành công, avatar xuất hiện ở zone đã chọn tại seat cuối hàng (xem BR-Seat) và tôi được teleport tới đó.
- AC-2.2 Field và ràng buộc:
  - Sign: bắt buộc, 5–80 ký tự, tối đa 2 dòng.
  - Zone: bắt buộc, chọn 1.
  - Chức danh (title): bắt buộc, ≤ 60.
  - Số năm kinh nghiệm: bắt buộc, số nguyên 0–50.
  - Skills: 1–10 tag, mỗi tag ≤ 20 ký tự.
  - Lương mong muốn: tùy chọn; nếu có thì min–max (triệu VND/tháng), min ≤ max, đơn vị VND. Có tùy chọn "Thỏa thuận".
  - Địa điểm / hình thức: thành phố (danh sách + khác) và Remote / Hybrid / Onsite (chọn nhiều).
  - Bio: tùy chọn, ≤ 280 ký tự.
  - Link liên hệ: bắt buộc, 1 trong: email, URL (LinkedIn/GitHub/Zalo/Telegram...), SĐT; validate định dạng. Mặc định **ẩn** (BR-Privacy).
- AC-2.3 Given sign có từ cấm, when submit, then bị từ chối với thông báo nêu rõ phải sửa, không lưu.
- AC-2.4 Given lỗi validation, when submit, then lỗi hiển thị cạnh từng field, dữ liệu đã nhập không mất.

**US-3 Gợi ý sign hài hước** — *As a* Ứng viên bí ý tưởng, *I want* bấm "Gợi ý" ra mẫu sign, *so that* viết nhanh.  Priority: Should (MVP: ≥ 20 mẫu tĩnh + biến {skill} {năm})
- AC-3.1 Given form hồ sơ, when bấm "Gợi ý", then điền sign mẫu ngẫu nhiên (thay {skill}/{năm} bằng giá trị đã nhập nếu có) và tôi vẫn sửa được.
- AC-3.2 Mẫu không chứa nội dung bị blocklist (kiểm bằng test tự động).

**US-4 Sửa / ẩn / xóa hồ sơ** — *As a* Ứng viên, *I want* kiểm soát hồ sơ, *so that* an tâm.  Priority: Must
- AC-4.1 Given hồ sơ của tôi, when sửa sign/field và lưu, then thay đổi hiển thị realtime cho người đang trên phố trong ≤ 3 giây (sau khi qua kiểm duyệt).
- AC-4.2 Given hồ sơ active, when bấm "Đứng dậy ra về" (ẩn), then avatar biến mất khỏi phố, seat được lấp, dữ liệu giữ lại; bấm "Ra ngồi lại" thì quay lại (ngồi lì reset, xem BR-Rank).
- AC-4.3 Given hồ sơ, when xóa vĩnh viễn (xác nhận 2 bước), then toàn bộ dữ liệu hồ sơ bị xóa và URL share trả về 404 / trang "Người này đã về nhà".
- AC-4.4 Chỉ chủ hồ sơ mới sửa/ẩn/xóa được (người khác gọi API nhận 403).

### E3. Phố 3D & zone (MVP)

**US-5 Phố chia zone** — *As a* người dùng, *I want* thấy phố có các khu rõ ràng, *so that* tìm đúng ngành.  Priority: Must
- AC-5.1 Given vào phố, when scene load, then thấy ≥ 8 zone với biển tên, mỗi zone có không khí/props riêng (đơn giản: màu nền + biển).
- AC-5.2 Danh sách zone MVP (tên đề xuất, dev có thể đổi chữ nhưng giữ số lượng/ngành):
  1. Hẻm Backend
  2. Phố Frontend ("Dãy nhà ống Frontend")
  3. Chợ Design (UI/UX/Graphic)
  4. Gầm cầu Fresher / Intern
  5. Ngõ Mobile
  6. Xóm Data/AI
  7. Quán cà phê QA/Tester (hoặc "Tổ Bug")
  8. Góc PM/BA
  9. (tùy chọn) Bãi DevOps/Cloud, Khu Khác
- AC-5.3 Given mini-map hoặc menu zone, when chọn zone, then camera/avatar teleport tới đầu zone đó.
- AC-5.4 Mỗi zone hiển thị số ứng viên đang ngồi.

### E4. Di chuyển & presence (MVP)

**US-6 Đi dạo** — *As a* HR/khách, *I want* di chuyển trên phố bằng WASD hoặc chạm để đi, *so that* khám phá.  Priority: Must
- AC-6.1 Desktop: W/A/S/D (và phím mũi tên) di chuyển avatar; chuột xoay camera hoặc camera tự theo.
- AC-6.2 Mobile: chạm vào mặt đường thì avatar tự đi tới điểm đó; có thể thêm joystick ảo (Could).
- AC-6.3 Avatar không đi xuyên avatar ứng viên đang ngồi / vật cản chính (va chạm đơn giản hoặc giới hạn vùng đi).
- AC-6.4 Tốc độ và vùng đi bị giới hạn phía server hoặc kiểm tra hợp lý (không teleport tùy ý qua client giả mạo; ASSUMPTION: chỉ cần kiểm tra biên và tốc độ tối đa).

**US-7 Thấy người khác (presence)** — *As a* người dùng, *I want* thấy những người khác đang đi dạo, *so that* phố có sức sống.  Priority: Must
- AC-7.1 Given ≥ 2 người online, when A di chuyển, then B thấy avatar A (nhãn tên + nhãn vai trò/HR công ty) di chuyển mượt trong độ trễ ≤ 1 giây ở mạng bình thường.
- AC-7.2 Given người dùng đóng tab hoặc mất kết nối > 15 giây, then avatar biến mất khỏi người khác.
- AC-7.3 Hiển thị bộ đếm "N người đang đi dạo".
- AC-7.4 Giới hạn hiển thị: tối đa 50 avatar đi dạo render đồng thời (người xa nhất bị ẩn) để giữ hiệu năng. Tối thiểu hỗ trợ 100 kết nối đồng thời (xem NFR).

### E5. Xem CV (MVP)

**US-8 Bấm ứng viên xem CV** — *As a* HR/khách, *I want* bấm vào ứng viên để xem CV, *so that* đánh giá.  Priority: Must
- AC-8.1 Given ứng viên ở trong tầm nhìn, when click/tap avatar hoặc cái nón, then mở panel CV gồm: sign, title, năm KN, skills, lương mong muốn, địa điểm/remote, bio, trạng thái, số xu nhận được, số ngày ngồi lì, thứ hạng trong zone.
- AC-8.2 Link liên hệ **không** hiển thị cho tới khi điều kiện BR-Privacy thỏa; panel hiển thị "Thả 500k để mở liên hệ. Liên hệ chỉ mở sau khi ứng viên nhận lời 500k của bạn."
- AC-8.3 Panel đóng được bằng nút X và phím Esc; mở panel không chặn việc nhận realtime.
- AC-8.4 Có nút "Báo cáo" (US-20) trên panel.

### E6. Tương tác tuyển dụng (MVP)

**US-9 Thả xu** — *As a* HR, *I want* thả xu cho ứng viên, *so that* bày tỏ quan tâm.  Priority: Must
- AC-9.1 Given tôi là HR còn xu trong ngày, when bấm "Thả xu" ở panel CV, then xu ngày của tôi giảm 1, bộ đếm xu ứng viên tăng 1, hiệu ứng đồng xu rơi vào nón + âm thanh leng keng cho tôi.
- AC-9.2 Given tôi đã hết quota (BR-Coin), when bấm, then thấy lỗi "Hết xu hôm nay, mai quay lại" và không có thay đổi dữ liệu.
- AC-9.3 Given tôi đã thả đủ giới hạn cho ứng viên này trong ngày, when bấm, then nút bị vô hiệu kèm lý do.
- AC-9.4 Ứng viên không thả xu cho chính mình (API trả lỗi).

**US-10 Thả tờ 500k (mời phỏng vấn)** — *As a* HR, *I want* mời phỏng vấn, *so that* tiến tới tuyển.  Priority: Must
- AC-10.1 Given HR còn quota 500k, when bấm "Thả 500k", then hiện form ngắn (lời nhắn ≤ 200 ký tự, bắt buộc; thông tin liên hệ HR: email/link, bắt buộc), sau khi gửi: quota -1, tờ 500k rơi vào nón, tạo lời mời trạng thái "Chờ phản hồi".
- AC-10.2 Given lời mời tạo xong, then ứng viên nhận thông báo kèm thông tin HR; link liên hệ của ứng viên **chỉ** được mở cho HR đó sau khi ứng viên **nhận lời** (BR-Privacy). Ở production, HR mới tạo phải đợi 10 phút mới thả được 500k (`TOO_NEW`, hiện đếm ngược); demo mode trên trình duyệt nới cổng này.
- AC-10.3 Ứng viên có thể "Nhận lời" hoặc "Từ chối" (mặc định kèm lý do ngắn tùy chọn); HR thấy trạng thái cập nhật realtime.
- AC-10.4 Lời mời "Chờ phản hồi" quá 14 ngày tự chuyển "Hết hạn".
- AC-10.5 Trùng lặp: cùng cặp (HR, ứng viên) chỉ có 1 lời mời đang mở tại một thời điểm.

**US-11 Bao trọn (offer)** — *As a* HR, *I want* bao trọn ứng viên, *so that* gửi offer chính thức.  Priority: Must
- AC-11.1 Given tôi đã có lời mời 500k được ứng viên **Nhận lời** (hoặc chỉ cần đã thả 500k, xem Q3), when bấm "Bao trọn", then hiện form offer (vị trí ≤ 60, mức lương/gói ≤ 100 ký tự, lời nhắn ≤ 300), gửi thành công ứng viên nhận thông báo "Bạn được bao trọn!".
- AC-11.2 Ứng viên "Chấp nhận" thì: trạng thái → **Đã được bao**, avatar đứng dậy / đổi trang phục (áo vest/hoa), bảng hiệu đổi thành "ĐÃ ĐƯỢC BAO bởi {Công ty}" (nếu ứng viên đồng ý hiển thị tên công ty), hồ sơ chuyển lên Tường vinh danh, hết nhận xu/500k mới.
- AC-11.3 Ứng viên "Từ chối" thì offer đóng, ứng viên vẫn ngồi, HR nhận thông báo.
- AC-11.4 Offer treo > 7 ngày tự hết hạn.
- AC-11.5 Chỉ 1 offer "đang mở" tại một thời điểm cho mỗi ứng viên (HR thứ hai bị báo "Ứng viên đang cân nhắc một offer khác"). ASSUMPTION để tránh tranh chấp.

**US-12 Xu tình thương của khách** — *As a* khách xem/Ứng viên khác, *I want* thả xu miễn phí, *so that* cổ vũ.  Priority: Should (MVP: có, đơn giản)
- AC-12.1 Given user bất kỳ (trừ chính chủ), when thả "xu tình thương", then bộ đếm tình thương +1, hiện hiệu ứng khác (trái tim vàng) và không trừ xu HR.
- AC-12.2 Giới hạn 5 xu tình thương/user/ngày, tối đa 1 lần/ứng viên/ngày.
- AC-12.3 Xu tình thương hiển thị riêng với xu HR trên panel (không gộp thành một số) để HR không bị nhầm lẫn.

### E7. Realtime & âm thanh (MVP)

**US-13 Thông báo realtime** — *As a* Ứng viên, *I want* nghe "leng keng" ngay khi được thả xu, *so that* thấy vui.  Priority: Must
- AC-13.1 Given tôi online, when HR thả xu cho tôi, then trong ≤ 2 giây: toast "HR {tên} @ {công ty} vừa thả xu" + âm leng keng + hiệu ứng xu rơi vào nón của tôi.
- AC-13.2 Với 500k và bao trọn: âm khác (leng keng dài/"ting ting"), toast nổi bật, có nút đi tới lời mời.
- AC-13.3 Given tôi offline, when thông báo phát sinh, then lưu lại; khi quay lại thấy danh sách "Thông báo chưa đọc" (≥ 50 gần nhất) và badge số lượng.
- AC-13.4 Trình duyệt chặn autoplay: có nút bật/tắt âm thanh, ghi nhớ lựa chọn; lần tương tác đầu tiên mở khóa audio.
- AC-13.5 Gộp thông báo: nếu nhận > 5 xu trong 10 giây, hiển thị gộp "+N xu" (tránh spam toast), âm vẫn phát tối đa 1 lần/giây.

**US-14 Ticker trực tiếp** — *As a* mọi người, *I want* thấy dòng sự kiện "HR X vừa thả 500k cho Y", *so that* phố có không khí.  Priority: Should (MVP)
- AC-14.1 Given sự kiện thả xu/500k/bao trọn công khai, then hiện ở ticker (tối đa 5 dòng gần nhất) trong ≤ 2 giây cho mọi người online.
- AC-14.2 Ứng viên có thể bật "ẩn tên tôi khỏi ticker" (hiển thị "một bạn ẩn danh"). Mặc định hiện tên hiển thị của ứng viên (không phải tên thật). 
- AC-14.3 Lời nhắn và liên hệ không bao giờ xuất hiện trên ticker.

### E8. Ranking & seat (MVP)

**US-15 Thăng hạng lên đầu phố** — *As a* Ứng viên, *I want* ngồi lâu và nhận nhiều xu thì được chuyển lên ghế đẹp hơn, *so that* có động lực.  Priority: Must
- AC-15.1 Given nhiều ứng viên trong một zone, then seat được gán theo điểm giảm dần (seat 1 gần đầu phố nhất) theo BR-Rank.
- AC-15.2 Given điểm thay đổi làm thứ tự đổi, when job tính lại chạy (hoặc ngay khi sự kiện), then avatar di chuyển (animation trượt/đi) tới seat mới, và ứng viên nhận thông báo "Bạn được lên ghế số N".
- AC-15.3 Panel CV hiển thị "Hạng #N trong {zone}".
- AC-15.4 Ứng viên "Đã được bao" không chiếm seat trong zone (đã ở Tường vinh danh).
- AC-15.5 Có chế độ tab "Đầu phố" (top 10 toàn phố, theo điểm).

### E9. Tâm linh vui (MVP)

**US-16 Xin quẻ** — *As a* bất kỳ user, *I want* xin quẻ "năm nay có nhảy việc được không", *so that* giải trí và share.  Priority: Must
- AC-16.1 Given ngôi đền / bàn thờ trên phố (điểm tương tác) hoặc nút menu, when bấm "Xin quẻ", then hiện hoạt ảnh lắc ống xăm ≤ 3 giây rồi ra quẻ: tên quẻ, mức (Thượng thượng / Thượng / Trung / Hạ / Hạ hạ), lời phán hài hước, lời khuyên.
- AC-16.2 Quẻ **cố định theo user theo ngày** (BR-Quẻ): bấm lại, reload, đổi thiết bị cùng session đều ra cùng quẻ trong ngày; hôm sau có thể khác.
- AC-16.3 Có nút "Chia sẻ quẻ" tạo share card (E10).
- AC-16.4 Guest chưa có session cũng xin được (danh tính theo session guest).

**US-17 Thắp nhang cầu job** — *As a* user, *I want* thắp nhang, *so that* cầu may.  Priority: Should (MVP)
- AC-17.1 Given tôi chưa thắp hôm nay, when bấm "Thắp nhang", then hiệu ứng khói nhang + cộng 1 vào "nhang hôm nay" của đền và của "người tôi cầu cho" (mặc định: chính tôi; nếu là HR/khách có thể chọn cầu cho 1 ứng viên).
- AC-17.2 Giới hạn 1 lần/ngày/user; lần 2 thấy "Mai thắp tiếp nhé".
- AC-17.3 Nhang chỉ mang tính cosmetic (hiển thị "N nén nhang" trên panel & hào quang nhẹ); **không** cộng điểm ranking (BR-Rank) để tránh gian lận.
- AC-17.4 Ứng viên được cầu thì nhận thông báo "Có người thắp nhang cầu job cho bạn" (ẩn danh người thắp).

### E10. Share (MVP)

**US-18 Share card của sign** — *As a* Ứng viên, *I want* share ảnh sign của mình, *so that* kéo người vào xem.  Priority: Must
- AC-18.1 Given hồ sơ active, when bấm "Chia sẻ", then tạo URL công khai `/c/{slug}` và ảnh xem trước (OG image 1200x630) gồm: sign (font chữ tay), tên hiển thị, title, zone, logo; link mở ra trang landing với nút "Vào phố, tới thẳng chỗ {tên}".
- AC-18.2 Có nút "Tải ảnh" (PNG) và "Copy link", và dùng Web Share API nếu có.
- AC-18.3 Meta tags OG/Twitter có ở URL đó (kiểm bằng crawler/curl, không cần JS).
- AC-18.4 Ảnh/URL **không** chứa liên hệ, lương, bio (chỉ nội dung công khai tối thiểu), trừ khi ứng viên bật thêm "hiện lương trên card".
- AC-18.5 Mở link từ người lạ (chưa đăng nhập) thì camera đi thẳng tới ứng viên đó sau khi vào guest.
- AC-18.6 Share card quẻ: ảnh gồm tên quẻ, lời phán, ngày, tên hiển thị (hoặc ẩn danh), link vào phố.

### v2 stories (tóm tắt, chi tiết ở §4 Viral)
- **US-19 Tường vinh danh "Được bao"** (Should, có thể MVP-lite: danh sách tĩnh trong UI): hiển thị ứng viên đã được bao, bảng tên công ty (nếu đồng ý).
- **US-20 Báo cáo & kiểm duyệt** (Must, MVP-lite): nút Báo cáo trên panel/biển; lý do (chọn); lưu vào bảng report; ≥ 5 báo cáo hợp lệ (từ 5 user khác nhau, mỗi tài khoản báo cáo ≥ 1 giờ tuổi) thì sign tự ẩn chờ duyệt (BR-Mod). Giao diện admin để v2, MVP có thể xem qua DB/endpoint bảo vệ bằng ADMIN_KEY.
- **US-21 Chat bubble ngắn** (Could, v2), **US-22 Tùy biến avatar** (Should, v2), **US-23 Badge** (Should, v2), **US-24 HR verification** (Should, v2), **US-25 Leaderboard tuần** (Should, v2/MVP-lite), **US-26 Sự kiện theo mùa** (Could, v2), **US-27 Referral** (Should, v2), **US-28 Ngày/đêm + thời tiết** (Could, v2).

**US-20 Báo cáo** chi tiết AC:
- AC-20.1 Given tôi xem sign/hồ sơ, when bấm Báo cáo, chọn lý do (Tục tĩu / Công kích cá nhân / Spam / Thông tin cá nhân / Khác) và gửi, then ghi nhận 1 report; mỗi user chỉ báo cáo mỗi hồ sơ 1 lần.
- AC-20.2 Given hồ sơ đạt ngưỡng 5 report từ 5 user khác nhau, mỗi người có tài khoản ≥ 1 giờ tuổi (report từ tài khoản mới hơn được lưu nhưng không được tính), then sign tự ẩn (thay bằng "Biển đang chờ duyệt") và chủ hồ sơ được thông báo.

---

## 4. Danh sách tính năng viral (brainstorm 28 ý)

Effort: S (< nửa ngày), M (1–2 ngày), L (> 2 ngày). "MVP" = ship trong build đầu; còn lại v2. Cột "MVP" đã cân nhắc giới hạn một dev một phiên.

| # | Tính năng | Mô tả | Vì sao lan truyền | Effort | Giai đoạn |
|---|---|---|---|---|---|
| V1 | OG image sign cá nhân | Ảnh biển carton + avatar ngồi, tiêu đề "Tôi đang ngồi ở Phố Xin Việc" | Dân IT khoe/chế trên LinkedIn, Facebook, Zalo | M | **MVP** (US-18) |
| V2 | Quẻ hằng ngày + share card | Quẻ cố định/ngày/user, lời phán hài | Thói quen quay lại mỗi sáng, share kết quả | S–M | **MVP** (US-16) |
| V3 | Live ticker | "HR X vừa thả 500k cho Y" chạy realtime | FOMO, cảm giác phố nhộn nhịp | S | **MVP** (US-14) |
| V4 | Sign generator mẫu hài | Mẫu có biến {skill}/{năm}, nút random | Giảm rào cản viết sign, sign hay thì lan | S | **MVP** (US-3) |
| V5 | Xu tình thương | Người qua đường thả xu miễn phí, giới hạn/ngày | Bạn bè vào cổ vũ nhau, kéo traffic | S | **MVP** (US-12) |
| V6 | Thắp nhang | 1 lần/ngày, khói + bộ đếm "N nén nhang" | Ritual hằng ngày, hài tâm linh | S | **MVP** (US-17) |
| V7 | Emoji reaction bay (bắn tim, 🔥, 😭) | Người xem bấm cảm xúc, bay lơ lửng trên đầu ứng viên (không lưu lâu) | Vui, tương tác nhẹ, quay video màn hình | S | **MVP-lite** (nếu còn thời gian, giới hạn 1/3 giây) |
| V8 | Leaderboard "Top xu tuần" | Bảng xếp hạng tuần (reset thứ Hai), top 10 | Ứng viên share "top 3 phố" | S | **MVP-lite**, đầy đủ v2 |
| V9 | Tường vinh danh "Được bao" | Wall of fame + câu chuyện ngắn | Nội dung tích cực, trích dẫn báo chí/LinkedIn | M | v2 (MVP: danh sách đơn giản) |
| V10 | Streak "Ngồi lì" | Chuỗi ngày active; mốc 7/30/100 ngày có huy hiệu | Tạo thói quen, tự hào "ngồi 100 ngày" | S | MVP (hiển thị số ngày) / v2 (huy hiệu) |
| V11 | Người qua đường có tên huy hiệu | "Khách quen", "Mạnh thường quân" theo hoạt động | Gamification | M | v2 |
| V12 | Tùy biến avatar | Nón lá, ghế nhựa, bát inox, mũ bảo hiểm, áo hoodie "I ♥ Java" | Khoe cá tính, mua (ảo) đồ | L | v2 |
| V13 | Ngày/đêm + thời tiết | Trời mưa phố vắng, đêm đèn đường vàng, chợ đêm | Screenshot đẹp, cảm giác "thật" | M | v2 |
| V14 | Sự kiện theo mùa | Tết lì xì (xu đỏ), Trung thu, 20/10, Black Friday "sale lương" | Tính thời sự, kéo user cũ về | M | v2 |
| V15 | Referral "Kéo bạn ra ngồi cùng" | Link mời, bạn đăng ký thì cả hai ngồi cạnh nhau + +bonus xu tình thương | Tăng trưởng trực tiếp theo nhóm bạn | M | v2 |
| V16 | Bảng huy hiệu (badge) | "Người ngồi lâu nhất", "Được 100 xu", "Vua nhang", "Báo thức 5h sáng" | Thu thập, khoe | M | v2 |
| V17 | Chat bubble ngắn | Gõ câu ≤ 60 ký tự hiện bong bóng trên đầu avatar 5 giây, rate limit | Tạo bầu không khí chợ, quay clip | M | v2 |
| V18 | Bộ âm thanh (sound pack) | Leng keng, xích lô, loa phường, tiếng rao "Ai bánh mì...", chọn theo mùa | Vui, ASMR, video | S–M | MVP (1 âm) / v2 (pack) |
| V19 | Mini-game "Hứng xu" hoặc "Đoán lương" | Đoán mức lương ứng viên, đúng được xu tình thương | Tương tác thêm, share điểm | L | v2 |
| V20 | "HR đẹp trai/xinh gái nhất tuần"/Top HR thả xu | Bảng vinh danh HR hào phóng (opt-in) | HR muốn employer branding, share | S–M | v2 |
| V21 | Shareable "Năm nay tôi nhảy việc?" kết quả cuối năm | Tổng kết năm: số xu, số ngày ngồi, quẻ may nhất | Kiểu Spotify Wrapped, mùa tháng 12 | M | v2 |
| V22 | Sign of the day | Biển được vote hay nhất mỗi ngày lên pop-up đầu trang | Ứng viên mong được chọn → share | M | v2 |
| V23 | Hồ sơ "ngồi hộ" (nominate) | Bạn bè đề cử và dựng biển cho bạn (cần ứng viên duyệt, opt-in) | Lan theo graph bạn bè | M | v2 (cần kiểm soát opt-in chặt) |
| V24 | Chế độ stream / spectate | URL "xem phố trực tiếp" chế độ camera tự bay | Livestream, TikTok | M | v2 |
| V25 | Widget embed / badge cho CV | Ảnh "Tôi ngồi phố xin việc, hạng #3 Backend" nhúng vào README/LinkedIn | Backlink, viral dev | S | v2 |
| V26 | Lời nhắn thần chú "xin vía" | HR/khách "xin vía" ứng viên được bao (bấm sờ nón của người đã được bao) | Meme, tương tác người thành công | S | v2 |
| V27 | Daily "Phố hôm nay" digest | Thông báo/email/Zalo OA: "Hôm nay bạn nhận 3 xu, hạng +2" | Re-engagement | M | v2 |
| V28 | Đèn lồng / đốt vàng mã tự trào | "Đốt deadline", "Đốt KPI" mini-ritual share | Hài hước, đặc trưng văn hóa | S | v2 |

---

## 5. Quy tắc nghiệp vụ (Business rules)

Tất cả hằng số nên đặt trong 1 file config để chỉnh không cần sửa logic. Các giá trị là **mặc định đề xuất**.

### BR-Coin — Xu của HR
- BR-C1: Mỗi HR có **10 xu/ngày** (reset 00:00 Asia/Ho_Chi_Minh). Không cộng dồn qua ngày.
- BR-C2: Mỗi HR tối đa **2 xu/ứng viên/ngày**. Tổng xu một ứng viên nhận là số tích lũy (không giảm; vẫn dùng decay khi tính điểm ranking).
- BR-C3: Chỉ HR mới có xu HR; khách/ứng viên dùng xu tình thương (BR-Love).
- BR-C4: Ứng viên "Đã được bao" hoặc đã ẩn không nhận xu mới (API trả lỗi rõ ràng).
- BR-C5: Mọi lần thả xu ghi vào bảng giao dịch (id, from, to, type, created_at) để audit và tính ranking. Thao tác thả xu phải atomic (không trừ quota hai lần khi double-click; có idempotency key hoặc lock; test: gửi 20 request song song vẫn chỉ trừ đúng quota).

### BR-500k — Tờ 500k (mời phỏng vấn)
- BR-5-1: Mỗi HR có **3 tờ 500k/ngày**; reset cùng giờ.
- BR-5-2: Mỗi HR chỉ mời **1 lần/ứng viên/7 ngày** (và chỉ 1 lời mời đang mở/cặp).
- BR-5-3: Mỗi ứng viên nhận tối đa **5 lời mời đang mở** cùng lúc; vượt thì HR mới thấy "Ứng viên đang kín lịch" (chống spam ứng viên).
- BR-5-4: Lời mời bắt buộc có lời nhắn ≥ 10 ký tự và liên hệ HR (chống thả bừa).
- BR-5-5: Trạng thái: `Chờ phản hồi` → `Đã nhận lời` | `Từ chối` | `Hết hạn` (14 ngày). Từ chối/hết hạn **không hoàn** tờ 500k (khuyến khích suy nghĩ trước khi gửi). ASSUMPTION: hoàn lại nếu hết hạn có thể để v2.

### BR-Offer — Bao trọn
- BR-O1: Điều kiện: HR đã có lời mời 500k **được nhận lời** với ứng viên đó (default; xem Q3). Mỗi HR tối đa 3 offer đang mở.
- BR-O2: Mỗi ứng viên chỉ có 1 offer đang mở (BR-O3).
- BR-O3: Khi ứng viên Chấp nhận:
  - status ứng viên → `Đã được bao`;
  - hồ sơ **vẫn hiển thị** nhưng chuyển sang Tường vinh danh (khu riêng, đầu phố hoặc quảng trường), mất seat zone, nhận huy hiệu "Đã được bao", không nhận xu/500k mới;
  - các lời mời 500k khác đang mở tự đóng với trạng thái `Ứng viên đã nhận việc khác` và HR được thông báo;
  - xu đã nhận vẫn giữ để hiển thị "Tổng xu: N";
  - ứng viên có thể bấm "Ngồi lại" (quay lại tìm việc) sau 30 ngày hoặc bất cứ lúc nào nếu muốn, status quay `Đang ngồi`, ngồi lì reset về 0, xu tích lũy không reset nhưng decay vẫn chạy. ASSUMPTION.
- BR-O4: Hiển thị tên công ty trên Tường vinh danh **chỉ khi cả ứng viên lẫn HR đều đồng ý** (checkbox khi nhận offer / gửi offer).
- BR-O5: Offer hết hạn sau 7 ngày không phản hồi.
- BR-O6: Hệ thống **không** xác nhận việc làm có thật; "Đã được bao" là tự khai của ứng viên (có thể bị lạm dụng, ghi rõ trong Edge cases).

### BR-Love — Xu tình thương
- BR-L1: 5 xu/user/ngày (kể cả guest HR/Xem/Ứng viên), ≤ 1 xu/ứng viên/ngày, không tự thả cho mình.
- BR-L2: Trọng số ranking thấp (xem BR-Rank), và tính tối đa 20 xu tình thương/ứng viên/ngày vào điểm (chống gian lận bằng đa tài khoản).
- BR-L3: Anti-sybil: tính theo session/user id; thêm giới hạn theo IP (ví dụ ≤ 30 xu tình thương/IP/ngày).

### BR-Rank — Công thức xếp hạng & seat
Điểm (score) của ứng viên i, tính lại mỗi **5 phút** hoặc ngay khi có sự kiện (dev chọn, miễn kết quả nhất quán):

```
score = 3.0 * Σ_hrCoin(e)   * decay(age_e)
      + 0.3 * Σ_loveCoin(e) * decay(age_e)      (cap 20 xu/ngày)
      + 20  * Σ_500k(e)     * decay(age_e)      (chỉ tính 500k được tạo hợp lệ; nhận lời +10 thêm)
      + 2.0 * min(sitDays, 30)                   (ngồi lì, bão hòa 30 ngày)
      + 1.0 * profileCompleteness                 (0..5: số field tùy chọn đã điền)
```
- decay(age) = 0.5^(age_days / 7)  (half-life 7 ngày) cho các sự kiện xu/500k. Ý nghĩa: hoạt động gần đây quan trọng hơn, nhưng "ngồi lâu" vẫn được thưởng.
- Cap chống thống trị: mỗi HR đóng góp tối đa **6 điểm HR-coin** (tức 2 xu × 3.0) **/ứng viên / ngày** (đã thỏa nhờ BR-C2).
- **Nhang không tính điểm.** Quẻ không tính điểm.
- Hòa điểm: ưu tiên ngồi lì lâu hơn, sau đó `created_at` sớm hơn, sau đó id.
- Seat gán theo zone: sắp xếp score giảm dần, seat 1 ở đầu zone (gần cổng/đầu phố). Tối đa **30 seat/zone** hiển thị 3D; ứng viên từ #31 trở đi vào "hàng chờ phía sau" (vẫn tìm được qua danh sách, hiển thị mờ/ở xa). ASSUMPTION.
- Ứng viên mới: gán điểm khởi đầu 0 nên ngồi cuối; để tránh "chết" hạng, **boost "người mới" 24 giờ đầu: +5 điểm giảm tuyến tính về 0** (Should).
- Ổn định: một ứng viên không bị đổi seat quá **1 lần/phút** (tránh giật hình khi điểm đảo liên tục); animation di chuyển ≤ 3 giây.
- Seat "Đầu phố" toàn cục: top 10 điểm bất kể zone, hiển thị trên quảng trường đầu phố (v2: có thể là MVP-lite dạng list).
- Test: bộ unit test với dữ liệu cố định cho kết quả thứ tự xác định.

### BR-Seat — Gán seat theo zone
- BR-S1: Mỗi zone có dãy seat đánh số 1..30, tọa độ cố định ở hai bên vỉa hè (lẻ bên trái, chẵn bên phải), seat 1 gần đầu phố.
- BR-S2: Ứng viên mới vào zone: seat = vị trí theo điểm (nếu điểm 0 thì cuối dãy); các ứng viên khác dịch chỗ nếu cần.
- BR-S3: Ứng viên ẩn/xóa/được bao thì ứng viên bên dưới dồn lên; không có seat trống ở giữa.
- BR-S4: Đổi zone: avatar rời zone cũ và vào zone mới tại vị trí theo điểm; giới hạn đổi zone **1 lần/24 giờ**.

### BR-Quẻ — Quẻ xin hằng ngày
- BR-Q1: Quẻ được chọn **xác định** bằng: `index = hash(userId + "|" + YYYY-MM-DD(Asia/Ho_Chi_Minh) + "|" + SECRET_SALT) mod N`, trong đó N ≥ 40 quẻ.
- BR-Q2: Không có nút "xin lại"; mọi lần gọi trong ngày cùng user trả cùng kết quả. Không phụ thuộc thiết bị/IP; phụ thuộc user id (guest dùng id từ session; xóa cookie = guest mới, chấp nhận được vì không có giá trị tài chính).
- BR-Q3: Quẻ có 5 mức: Thượng thượng 5%, Thượng 20%, Trung 40%, Hạ 25%, Hạ hạ 10% (phân bố qua danh sách quẻ có trọng số, không phải ngẫu nhiên thật mỗi lần). Quẻ xấu luôn kèm lời khuyên hài/tích cực ("Hạ hạ: sếp cũ sẽ gọi lại, nhưng đừng bắt máy").
- BR-Q4: Nội dung quẻ do team viết sẵn (file tĩnh), không dùng AI sinh nội dung runtime ở MVP (để kiểm soát tone).
- BR-Q5: Quẻ chỉ mang tính giải trí; hiển thị disclaimer nhỏ: "Chỉ để cười. Đừng nghỉ việc vì quẻ."
- BR-Q6: Test: cùng input cho cùng output; 10.000 userId ngẫu nhiên cho phân bố mức trong ±3 điểm phần trăm so với BR-Q3.

### BR-Incense — Thắp nhang
- 1 lần/user/ngày (cùng ngày giờ VN); cosmetic only (xem AC-17.3).

### BR-Privacy — Quyền riêng tư & liên hệ
**Quyết định (cập nhật 2026-11-04, security audit H1):** link liên hệ của ứng viên **ẩn** với mọi người; chỉ **HR có lời mời 500k mà ứng viên đã NHẬN LỜI** mới thấy (thả 500k chưa đủ; từ chối/hết hạn thì khóa lại). Ứng viên thấy liên hệ + thông tin HR trong lời mời. 
Lý do: (1) giữ 500k có giá trị thật ("mở khóa liên hệ"), (2) chống scrape/spam email hàng loạt vì có quota 3 tờ/ngày, (3) ứng viên yên tâm hơn nên dám tham gia, (4) HR vẫn đủ thông tin (title, skills, lương, địa điểm, bio) để quyết định trước khi tốn quota.
- Ứng viên có thể chọn "Cho phép xem liên hệ sau khi thả xu" (opt-in nới lỏng, v2) hoặc "Chỉ khi tôi nhận lời" (chặt hơn, default giữ như trên).
- Ứng viên không công khai tên thật mặc định, chỉ display name. Nhắc ứng viên trong form: "Đừng ghi công ty hiện tại nếu không muốn sếp thấy."
- Ứng viên có tùy chọn "Ẩn khỏi người cùng công ty" ở v2 (chặn theo tên công ty/domain email).
- Lương hiển thị công khai trên panel (ứng viên tự điền, có thể bỏ trống).
- Không thu thập dữ liệu nhạy cảm (giới tính, ngày sinh, CMND). Có link "Xóa dữ liệu của tôi" (US-4.3).
- Thông báo cho ứng viên khi HR xem liên hệ: có (vì chỉ mở sau 500k).

### BR-Spam — Chống spam / lạm dụng
- BR-SP1: Rate limit API: ≤ 5 thao tác xu/giây/user, ≤ 1 lần tạo hồ sơ / 10 phút / session, ≤ 10 lần sửa sign/giờ.
- BR-SP2: Di chuyển gửi ≤ 10 gói tin/giây/kết nối; server bỏ qua phần vượt.
- BR-SP3: Tối đa 3 session đồng thời/IP cho vai trò HR đăng ký mới trong 1 giờ (chống tạo hàng loạt HR giả để bơm xu cho đồng bọn).
- BR-SP4: Nếu phát hiện một ứng viên nhận > 50 xu từ ≥ 90% cùng 1–2 nguồn trong 24 giờ, đánh dấu cờ "nghi ngờ" (không tính ranking, chờ duyệt). Có thể ở v2; MVP cần BR-C2 để giảm.
- BR-SP5: Honeypot field trong form (ẩn) để loại bot đơn giản.
- BR-SP6: Giới hạn độ dài/Unicode: loại bỏ ký tự điều khiển, zero-width, vì mục đích bypass blocklist (chuẩn hóa NFKC trước khi kiểm).

### BR-Mod — Kiểm duyệt nội dung
- BR-M1: Áp dụng cho: sign, bio, title, display name, lời nhắn 500k/offer, công ty HR.
- BR-M2: Chuẩn hóa (NFKC, lowercase, bỏ dấu để so khớp phiên bản không dấu, bỏ ký tự phân cách giữa chữ như "đ.m", "d m") rồi so với blocklist (tục tĩu, phân biệt/kỳ thị, công kích cá nhân, quấy rối, từ khóa quảng cáo/lừa đảo/đa cấp, tiền ảo).
- BR-M3: Blocklist ở file cấu hình riêng (`blocklist.vi.txt`), dễ cập nhật không cần deploy logic; có allowlist cho từ vô hại bị khớp nhầm (ví dụ "Địa danh"). Team cung cấp danh sách ban đầu; không hardcode trong code logic.
- BR-M4: Chặn: URL trong sign/bio (chỉ cho phép ở field link liên hệ), email/SĐT trong sign/bio (tránh lộ/spam), tên riêng của người thật/sếp cũ thì không tự phát hiện được: dựa vào report.
- BR-M5: Report: xem US-20; 5 report hợp lệ (5 user khác nhau, tài khoản ≥ 1 giờ tuổi; ngưỡng nâng từ 3 sau security audit M2) thì auto-ẩn; chủ không tự hiện lại được khi bị khóa kiểm duyệt (MODERATION_LOCKED) cho tới khi admin `unhide`; chủ có thể kháng nghị (v2).
- BR-M6: Admin có thể gỡ hồ sơ/sign (MVP: endpoint hoặc script quản trị với ADMIN_KEY).

---

## 6. Tone & guardrails

Nguyên tắc: **ứng viên là người kể chuyện, không phải người bị chế giễu.** Hài hước là do chính họ chọn.

1. **Opt-in rõ ràng:** trước khi tạo hồ sơ có màn giới thiệu "Bạn sẽ ngồi trên phố công khai, ai cũng thấy biển của bạn" + checkbox đồng ý. Có nút xóa/ẩn bất cứ lúc nào.
2. **Ứng viên kiểm soát nội dung:** chỉ chủ hồ sơ viết/sửa sign và bio. HR/khách không thể gắn sign, bình luận công khai lên hồ sơ người khác (không có comment ở MVP). Chat bubble (v2) chỉ nằm trên đầu chính người nói.
3. **Không biến thành ăn xin thật:** thông điệp UI luôn dùng "xu ảo", "game", "roleplay" ("Phố xin việc là trò chơi, không ai xin tiền thật"). Không có nút "nạp tiền", "donate". Từ "xin" chỉ gắn với "xin việc". Hình ảnh nón/bát có CV trong đó, không phải tiền thật. Tránh mô tả nghèo khổ thật (ví dụ không dùng từ ngữ về bệnh tật/thương tật, cấm các sign xin tiền, xin quyên góp, link chuyển khoản).
4. **Không chế giễu người thật:** cấm trong sign/bio: tên người khác, tên công ty cũ kèm chê bai, ảnh người khác. Blocklist + report. Văn bản gợi ý (sign generator) chỉ tự trào (self-deprecating), không châm chọc nhóm/vùng miền/tuổi/giới tính.
5. **Không phân biệt đối xử:** HR không thể lọc theo tuổi, giới tính, quê quán (không có các field đó). Avatar có thể đa dạng, không gắn hình nhạy cảm.
6. **Nhãn HR:** "Chưa xác minh" mặc định; HR đã xác minh (v2: email công ty domain + xác nhận) có huy hiệu ✔. Ở MVP mọi HR đều hiển thị công ty tự khai kèm nhãn "chưa xác minh".
7. **Bảo vệ ứng viên khỏi quấy rối:** chặn user (v2), giới hạn 500k (BR-5-3), mọi lời mời có thể Từ chối bằng một nút, báo cáo HR từ lời mời (US-20 mở rộng cho HR).
8. **Quẻ & nhang:** tránh nội dung tôn giáo gây phản cảm; thông điệp vui, không phán xét. Disclaimer có sẵn (BR-Q5).
9. **Trẻ em:** ASSUMPTION: dành cho 16+ (ghi trong điều khoản). Không thu thập tuổi.
10. **Dùng đủ thân thiện cho HR:** giao diện CV panel sạch, chuyên nghiệp, có chế độ "Chế độ nghiêm túc" (v2) ẩn hiệu ứng, chỉ danh sách + bộ lọc để HR dùng trong giờ làm không ngại.

---

## 7. Edge cases & ngoài phạm vi

### 7.1 Edge cases
- Hai HR thả xu cùng lúc cho cùng ứng viên: cả hai thành công, thứ tự xác định; bộ đếm khớp tổng giao dịch.
- HR double-click "Thả xu": chỉ tính 1 (hoặc theo BR-C2 giới hạn), không trừ hai lần.
- Ứng viên bị xóa/ẩn trong lúc HR đang mở panel: panel hiện "Người này vừa đứng dậy ra về" và vô hiệu nút; không lỗi 500.
- Ứng viên đang offline: thông báo lưu lại, hiển thị khi online (AC-13.3).
- Kết nối mất giữa chừng: client tự reconnect (backoff), đồng bộ lại snapshot phố; sự kiện bị lỡ trong ticker không cần phát lại.
- Hai tab cùng session: không nhân đôi avatar (kết nối mới thay thế hoặc bị chặn rõ ràng).
- Đổi tên hiển thị / vai trò giữa chừng: avatar cập nhật nhãn; hạn chế đổi tên 1 lần/ngày (chống mạo danh).
- Trùng tên hiển thị: cho phép nhưng hiển thị hậu tố ngắn (#a3f2) trong panel; ASSUMPTION.
- Zone đầy (>30): xử lý theo BR-Rank.
- Zone không có ứng viên: hiện biển "Chưa ai ngồi — bạn là người đầu tiên?" với CTA.
- Phố trống ngày đầu (cold start): seed ≥ 12 ứng viên mẫu (gắn nhãn "Ứng viên mẫu / demo", không nhận 500k thật, tuân thủ tone) và bot đi dạo (tùy chọn, có nhãn bot) để demo không trống. ASSUMPTION; phải bật/tắt bằng config.
- Thiết bị yếu / không WebGL: hiển thị fallback "Chế độ danh sách 2D" (danh sách ứng viên theo zone + panel CV) để vẫn dùng được (Should).
- Mobile: chạm vào ứng viên vs chạm mặt đường phải phân biệt (ưu tiên đối tượng tương tác); vùng bấm tối thiểu 44px.
- Múi giờ: mọi reset theo Asia/Ho_Chi_Minh bất kể thiết bị.
- Đồng hồ thiết bị sai: server là nguồn thời gian duy nhất.
- Lạm dụng "Đã được bao" khoe ảo: chấp nhận ở MVP (xem BR-O6), v2 có xác minh HR 2 phía (HR xác nhận).
- Link share cho hồ sơ đã ẩn/xóa/được bao: ẩn → trang "Người này đã về"; được bao → trang chúc mừng (nếu đồng ý công khai).
- Ký tự đặc biệt/emoji trong sign: cho phép emoji phổ thông; hiển thị đúng trên texture 3D và trên OG image (kiểm font fallback).
- Sign dài tiếng Việt có dấu: hiển thị đúng dấu, tự xuống dòng tối đa 2 dòng, co chữ.
- XSS/HTML injection trong mọi field: luôn escape; kiểm thử với payload `<script>`.

### 7.2 Ngoài phạm vi (Out of scope) — MVP
- Thanh toán, tiền thật, quy đổi xu.
- Đăng nhập xã hội (Google/LinkedIn), email/mật khẩu, quên mật khẩu (guest/session là đủ).
- Upload CV file/ảnh đại diện thật; AI tóm tắt CV.
- Chat riêng 1-1, video call, đặt lịch phỏng vấn.
- Hệ thống tin nhắn email ra ngoài (thông báo ngoài app).
- Xác minh HR/doanh nghiệp, phân quyền nhiều HR trong 1 công ty.
- Trang admin đầy đủ, analytics dashboard (chỉ log cơ bản).
- Đa ngôn ngữ (chỉ tiếng Việt; chuỗi tách ra file i18n để dễ mở rộng).
- Tùy biến avatar, thời tiết/ngày đêm, sự kiện mùa, referral, badge, chat bubble (v2).
- App native, VR.

---

## 8. Yêu cầu phi chức năng (NFR)
- Hiệu năng: tải lần đầu < 5 giây trên 4G (asset 3D tổng ≤ ~5 MB, nén); ≥ 30 FPS trên laptop phổ thông và điện thoại tầm trung với 50 avatar; dùng instancing/LOD đơn giản cho ứng viên.
- Realtime: hỗ trợ tối thiểu 100 kết nối đồng thời trong MVP; độ trễ sự kiện ≤ 2 giây; position update throttle 10 Hz.
- Bảo mật: không lộ liên hệ ứng viên qua API khi chưa đủ điều kiện (kiểm bằng test API, không chỉ ẩn ở UI); xác thực mọi thao tác ghi bằng session token; escape output; giới hạn kích thước request; CORS đúng.
- Quyền riêng tư: không lưu IP lâu dài (ngoài mục đích rate limit ≤ 24 giờ, băm); cho phép xóa dữ liệu.
- Truy cập (a11y): thao tác chính có thể làm bằng bàn phím; panel CV đọc được bởi screen reader (DOM thật, không vẽ trong canvas); tương phản đạt WCAG AA; tùy chọn tắt âm thanh và giảm chuyển động (`prefers-reduced-motion`).
- i18n: nội dung tiếng Việt (UTF-8, font hỗ trợ dấu), múi giờ VN; chuỗi tách khỏi code.
- Logging/Audit: ghi log mọi giao dịch xu/500k/offer, report, hành động admin; không log nội dung nhạy cảm (liên hệ).
- Độ bền dữ liệu: dữ liệu bền qua restart server (DB file/SQL). ASSUMPTION: chọn stack do architect quyết.
- SEO/Share: trang `/c/{slug}` render meta OG phía server.

---

## 9. Assumptions (tổng hợp)
- ASSUMPTION A1: Web app responsive, 3D chạy bằng WebGL (three.js hoặc tương đương) – quyết định công nghệ thuộc architect/dev.
- ASSUMPTION A2: Danh tính guest dựa trên token lưu trình duyệt; không có email; mất token = mất tài khoản (cảnh báo UI, có "Mã khôi phục" đơn giản ở v2).
- ASSUMPTION A3: Một user chỉ giữ một vai trò chủ động tại một thời điểm.
- ASSUMPTION A4: Hằng số giới hạn (xu, 500k, v.v.) là mặc định và có thể chỉnh qua config.
- ASSUMPTION A5: Tên zone vui đã nêu có thể được owner đổi tên; số lượng ≥ 8.
- ASSUMPTION A6: Dữ liệu seed/demo được phép (có nhãn rõ).
- ASSUMPTION A7: Chỉ tiếng Việt; người dùng chính ở Việt Nam, múi giờ UTC+7.
- ASSUMPTION A8: Không cần tuân thủ pháp lý tuyển dụng đặc thù ở MVP, nhưng cần điều khoản sử dụng + chính sách riêng tư tối thiểu (trang tĩnh).
- ASSUMPTION A9: Xu "ảo" không có giá trị; nếu sau này có thương mại hóa (ví dụ HR trả phí để nhiều xu hơn), cần review lại pháp lý (đặc biệt nếu xu mua bằng tiền).

## 10. Xung đột & rủi ro cần lưu ý
- R1 (xung đột): "Viral/vui" vs "HR dám dùng nghiêm túc" → giải pháp: CV panel sạch, chế độ nghiêm túc v2, tone tự trào do ứng viên chọn.
- R2: Ranking dễ bị gian lận bằng nhiều tài khoản HR/khách giả → BR-C2, BR-L2/L3, BR-SP3/SP4, trọng số xu tình thương thấp, decay.
- R3: Nội dung không phù hợp trong sign → blocklist + report + auto-ẩn; cần người duyệt (owner) sau khi launch.
- R4: Hiệu năng 3D trên mobile → primitives đơn giản, giới hạn avatar render, fallback 2D.
- R5: Cold start phố trống → seed data có nhãn.
- R6: Ứng viên bị sếp hiện tại thấy → cảnh báo, ẩn theo công ty (v2), cho phép dùng biệt danh.
- R7: Phạm vi MVP lớn cho một phiên → ưu tiên: E1–E7, E8 (công thức đơn giản), E9 quẻ, E10 OG image; nếu cần cắt: ticker, xu tình thương, nhang, reaction.

---

## 11. Open questions (kèm default đề xuất)

| # | Câu hỏi | Ảnh hưởng nếu không trả lời | Default đề xuất (dev cứ làm theo) |
|---|---|---|---|
| Q1 | Quota xu/500k cho HR là bao nhiêu? | Cân bằng game | 10 xu/ngày, 2 xu/ứng viên/ngày; 3 tờ 500k/ngày, 1 lần/ứng viên/7 ngày |
| Q2 | Liên hệ ứng viên hiện khi nào? | Quyền riêng tư và giá trị 500k | Chỉ hiện cho HR có lời mời được ứng viên nhận lời (BR-Privacy) |
| Q3 | Bao trọn có cần 500k được nhận lời trước không? | Luồng offer | Có: phải có 500k đã "Nhận lời" |
| Q4 | Sau "Đã được bao", ứng viên còn hiển thị không? | UX, viral | Còn, ở Tường vinh danh, mất seat, không nhận xu mới; có thể ngồi lại |
| Q5 | Có cần HR verification ở MVP? | Độ tin cậy | Không; nhãn "chưa xác minh", làm v2 |
| Q6 | Khách chưa đăng nhập xem được CV không? | Tăng trưởng vs scrape | Xem được mọi thứ trừ liên hệ; muốn thả xu cần session guest (tạo 1 click) |
| Q7 | Một user vừa HR vừa ứng viên? | Mô hình dữ liệu | Không ở MVP; đổi vai trò ẩn hồ sơ ứng viên |
| Q8 | Tên zone chính thức? | Branding | Dùng 8 zone ở AC-5.2, owner đổi chữ sau |
| Q9 | Công thức ranking trọng số cụ thể? | Cảm nhận công bằng | BR-Rank mặc định, chỉnh qua config |
| Q10 | Có ticker công khai tên ứng viên không? | Riêng tư | Có, theo display name, ứng viên có thể ẩn danh |
| Q11 | Backend tech/persistence? | Triển khai | Architect quyết; yêu cầu: WebSocket realtime, DB bền, deploy 1 service |
| Q12 | Nhang có tác động ranking không? | Gian lận | Không (cosmetic) |
| Q13 | Tuổi tối thiểu và điều khoản? | Pháp lý | 16+, trang điều khoản/riêng tư tối thiểu |
| Q14 | Có cho phép seed/demo candidate và bot? | Cold start | Có, gắn nhãn "Mẫu", bật bằng config |
| Q15 | Lời mời hết hạn có hoàn tờ 500k không? | Cảm nhận công bằng | Không hoàn ở MVP |
| Q16 | Xử lý moderation vận hành ai làm? | Rủi ro nội dung | Owner dùng endpoint admin + ADMIN_KEY; auto-ẩn sau 5 report hợp lệ |
| Q17 | Ngôn ngữ giao diện ngoài tiếng Việt? | Phạm vi | Chỉ tiếng Việt |
| Q18 | Xử lý hạng khi hòa điểm? | Tính xác định | Theo BR-Rank (ngồi lì > created_at > id) |

---

## 12. Traceability (tóm tắt MVP)
| Hạng mục owner | Story |
|---|---|
| Login guest + tên + vai trò | US-1 |
| Tạo hồ sơ (sign, zone, CV) | US-2, US-3, US-4 |
| Phố 3D + zone | US-5 |
| Đi dạo WASD / tap | US-6 |
| Thấy HR khác di chuyển | US-7 |
| Click xem CV | US-8 |
| Thả xu / 500k / bao trọn | US-9, US-10, US-11, US-12 |
| Thông báo + leng keng | US-13, US-14 |
| Ranking + seat | US-15 (BR-Rank, BR-Seat) |
| Xin quẻ + thắp nhang | US-16, US-17 |
| Share card | US-18 |
| Moderation/report | US-20, BR-Mod |
