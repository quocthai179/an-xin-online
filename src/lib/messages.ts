import type { ErrorCode } from '@/backend/types';

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  UNAUTHENTICATED: 'Bạn chưa vào phố. Tải lại trang rồi thử nhé.',
  NO_PROFILE: 'Bạn chưa có hồ sơ. Đăng ký tên trước đã.',
  WRONG_ROLE: 'Vai trò hiện tại của bạn không làm được việc này. Đổi sang HR hoặc Ứng viên nhé.',
  NOT_FOUND: 'Không tìm thấy. Có thể người ta vừa đứng dậy ra về.',
  SELF_ACTION: 'Tự thả xu cho mình à? Nghe thì thương nhưng không được.',
  CANDIDATE_UNAVAILABLE: 'Người này vừa đứng dậy ra về hoặc đã được bao rồi.',
  SAMPLE_CANDIDATE: 'Đây là ứng viên mẫu cho vui, chưa nhận 500k được.',
  RATE_LIMITED: 'Từ từ thôi, tay nhanh quá phố không kịp đếm xu.',
  IP_LIMIT: 'Mạng này hôm nay làm nhiều quá rồi, mai quay lại nhé.',
  LIMIT_DAILY: 'Hết lượt hôm nay, mai quay lại nhé.',
  LIMIT_PER_CANDIDATE_DAY: 'Hôm nay bạn đã thả đủ cho người này rồi. Thương đều các bạn nữa nhé.',
  INVITE_ALREADY_OPEN: 'Bạn đã có một lời mời đang chờ người này trả lời.',
  INVITE_COOLDOWN: 'Mỗi người chỉ mời lại sau 7 ngày. Kiên nhẫn là vàng.',
  CANDIDATE_FULL: 'Ứng viên đang kín lịch (đủ 5 lời mời đang mở).',
  NEED_ACCEPTED_INVITE: 'Cần ứng viên nhận lời 500k trước rồi mới bao trọn được.',
  OFFER_ALREADY_OPEN: 'Ứng viên đang cân nhắc một offer khác.',
  HR_OFFER_LIMIT: 'Bạn đang có 3 offer chờ rồi. Đợi phản hồi đã.',
  EXPIRED: 'Lời mời này hết hạn mất rồi.',
  NOT_PENDING: 'Việc này đã được xử lý rồi.',
  ALREADY_DONE: 'Hôm nay làm rồi. Mai thắp tiếp nhé.',
  ALREADY_REPORTED: 'Bạn đã báo cáo người này rồi.',
  CONTACT_LOCKED: 'Liên hệ chỉ mở khi ứng viên đã nhận lời 500k của bạn.',
  VALIDATION: 'Thông tin chưa hợp lệ, kiểm tra lại giúp mình nhé.',
  BLOCKED_CONTENT: 'Nội dung có từ không phù hợp. Sửa lại cho lịch sự nhé.',
  PII_NOT_ALLOWED: 'Đừng ghi link, email, số điện thoại ở đây. Liên hệ có ô riêng.',
  NAME_CHANGE_COOLDOWN: 'Tên chỉ đổi được 1 lần mỗi ngày.',
  ZONE_CHANGE_COOLDOWN: 'Chỉ đổi khu được 1 lần mỗi 24 giờ.',
  MODERATION_LOCKED: 'Hồ sơ đang chờ kiểm duyệt nên chưa ngồi lại phố được. Đợi admin xem xong nhé.',
  BANNED: 'Tài khoản này đã bị khóa do vi phạm quy định của phố.',
  TOO_NEW: 'Tài khoản HR mới tạo, đợi vài phút rồi hãy thả 500k nhé.',
  NETWORK: 'Mạng lag, thử lại nhé.',
};

export function errorMessage(code: ErrorCode, field?: string): string {
  const base = ERROR_MESSAGES[code] ?? ERROR_MESSAGES.VALIDATION;
  return field && (code === 'VALIDATION' || code === 'BLOCKED_CONTENT' || code === 'PII_NOT_ALLOWED')
    ? `${base} (${FIELD_LABELS[field] ?? field})`
    : base;
}

export const FIELD_LABELS: Record<string, string> = {
  display_name: 'Tên hiển thị',
  company: 'Công ty',
  sign_text: 'Biển carton',
  title: 'Chức danh',
  years_exp: 'Số năm kinh nghiệm',
  skills: 'Kỹ năng',
  salary: 'Lương',
  work_modes: 'Hình thức làm việc',
  bio: 'Giới thiệu',
  city: 'Thành phố',
  contact: 'Liên hệ',
  zone: 'Khu',
  message: 'Lời nhắn',
  hr_contact: 'Liên hệ của bạn',
  position: 'Vị trí',
  package: 'Gói đãi ngộ',
  reason: 'Lý do',
  avatar: 'Avatar',
  status: 'Trạng thái',
};
