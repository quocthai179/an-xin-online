// Shared corpus for moderation parity: tests/lib/moderation-hardening.test.ts asserts the expectations in TS, and
// tests/parity/moderation-sql.test.ts generates supabase/tests/85_moderation_parity.sql so SQL must agree with TS.

/** Must be blocked (bypass attempts from the 2026-11-04 security audit M4 + 0001 cases). */
export const MUST_BLOCK = [
  'đ.m', 'd m', 'Đ M', 'vcl', 'd1t', 'Đ.M mày', 'ĐỊT', 'lồn', 'V.C.L', 'đ  m', 'ditconme', 'dit.con.me', 'chuyển khoản vào đây',
  'ｖｃｌ', 'v​c​l', 'd‮m',
  // leftover combining marks, overlays, fillers
  'lồ̀n', 'l̴ồn', 'lồn', 'đ̸m', 'dㅤm', 'dᅟm', 'dᅠm', 'd⠀m', 'd᠎m',
  'd⁡m', 'v͏cl', 'v﻿cl', 'vc\u{E0041}l',
  // homoglyphs
  'vсl', 'ԁm', 'fυck', 'ѕhit', 'lо̂̀n', 'đмм', 'ⅾm',
  // joined letters and repeats (exact mode)
  'l ồ n', 'l.ồ.n', 'c-ặ-c', 'lồnnnn', 'lồồồn', 'đ ĩ', 'đĩĩĩ',
  // new variants
  'loz', 'lòz', 'Looooz', 'cak', 'cặk', 'đjt', 'djt mẹ', 'dkm', 'vkl', 'vcc', 'vcllll', 'đù má', 'du ma', 'dit me', 'óc chó',
  'đồ óc chó', 'buoi', 'đĩ', 'fuck', 'f u c k', 'fuuuck', 'FUCK you', 'shit', 'shiiit', 'bitch', 'clgt', 'fck',
  // scam phrases
  'việc nhẹ lương cao', 'Tuyển cộng tác viên online', 'nạp tiền nhận việc ngay', 'viec-nhe-luong-cao', 'casino uy tín',
];

/** Must pass: normal Vietnamese / tech sentences (false-positive guard; "cặc" vs "các", "buồi" vs "buổi", ...). */
export const MUST_PASS = [
  'các bạn', 'Các bạn ơi, mình cần việc', 'đi làm', 'Đi làm xa nhà', 'lồng ghép', 'Lồng đèn trung thu', 'buổi sáng',
  'Buổi phỏng vấn', 'con chó nhà tôi', 'Chó Phú Quốc', 'ASP.NET 5 năm', 'Cặp lồng cơm', 'Lớn rồi', 'Lon bia', 'Đeo kính cận',
  'đeo kính', 'Địa chỉ Hà Nội', 'Địa danh đẹp', 'Dịch vụ', 'dịch vụ', 'Đĩa nhạc', 'Cốc cà phê', 'Cách mạng 4.0', 'Việc nhẹ nhàng',
  'Lương cao', 'Cộng tác viên', 'Nạp năng lượng', 'ML engineer', 'Node.js', 'Vue.js', 'VB.NET', 'Data science', 'Có đi có lại',
  'Google Facebook Coffee', 'Booking Bootstrap Kubernetes', 'Đà Nẵng', 'Mẹ đi chợ', 'Đi du lịch', 'Hello world', 'Cool ngầu',
  'Cá kho tộ', 'Cao lương', 'Hội chợ việc làm', 'Shiba Inu', 'Cocktail', 'Classic ASP', 'Kỹ sư cầu đường', 'Bố mẹ già',
  'dimension', 'lớn', 'admin', 'Java 5 năm', 'Backend Developer', 'điểm', 'Phở', 'Thông minh', 'Đi đâu đó', 'Có cá không',
  'Cần việc backend gấp', 'Java 5 năm, nhà còn mẹ già, xin job remote', 'Debug bằng println', 'Kế toán', 'Đầu bếp',
];

/** Must be flagged as PII (URL / email / phone, incl. obfuscations). */
export const PII_YES = [
  'xem https://x.io', 'www.foo', 'mail me a@b.co', 'gọi 0912 345 678', '+84 912.345.678', 'site.com', 'gmail chấm com',
  'minh [at] acme', 'a(dot)b', 'ten {at} cong ty', 'abc [chấm] vn', '０９１２３４５６７８', '0９12 345 6７8', 'bit.ly/abc',
  'Zalo: zalo.me/0912', 't.me/xinviec', 'minh at gmail', 'x@gmail', 'liên hệ tui a còng gmail', 'site dot com', 'abc.xyz',
  '0912_345_678', '0912/345/678', 'tuan.dev',
];

/** Must NOT be flagged as PII. */
export const PII_NO = [
  'Java 5 năm, xin job remote', 'lương 20 đến 30 triệu', 'ASP.NET 5 năm', 'VB.NET', 'ADO.NET', 'ML.NET', 'Node.js', 'Vue.js',
  'Next.js', 'Socket.IO', 'Draw.io', 'Dot net developer', 'Chấm công', 'Thành thạo Gmail, Excel', 'C#/.NET', '5 năm kinh nghiệm',
  'Cần việc backend gấp', 'Mr. Bean', 'Tôm Corp', 'Công ty ABC', 'Lương 15-20 triệu',
];
