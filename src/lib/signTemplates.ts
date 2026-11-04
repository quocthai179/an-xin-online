import { FIELD_LIMITS } from './rules';

export const SIGN_TEMPLATES: string[] = [
  'Biết {skill} {nam} năm, nhà còn mẹ già, xin job remote',
  'Fix bug không cần reproduce, xin một chỗ ngồi',
  '{skill} {nam} năm, lương chưa tăng, mì gói đã tăng',
  'Code {skill} ngon, ngủ hơi ít, xin việc ít họp',
  'Thạo {skill}, giỏi nhất là nhịn đói chờ offer',
  '{nam} năm {skill}, vẫn chưa hiểu sếp muốn gì',
  'Deadline gấp thì tui nhanh, lương thì xin từ từ',
  'Biết {skill}, biết đợi, chưa biết đợi đến bao giờ',
  'Chuyên {skill}, tay nghề xịn, ví tiền xẹp',
  'Làm {skill} từ bé, xin job không có on-call',
  'Gõ phím nhanh hơn người yêu cũ trả lời tin nhắn',
  'Ngồi đây chờ offer, cà phê tự mang theo',
  'Không có kinh nghiệm xin lỗi, có {nam} năm kinh nghiệm xin việc',
  'Đã fix bug lúc 3 giờ sáng, giờ xin ngủ ban đêm',
  '{skill} giỏi, nấu mì giỏi hơn, xin việc gần nhà',
  'Họp được, code được, nhịn cười được, xin việc',
  'Sống sót qua {nam} năm deadline, xin đổi môi trường',
  '{skill} thượng thừa, tiếng Anh trung bình, tiền thuê nhà cao',
  'Hứa không đổi yêu cầu giữa chừng, xin job mới',
  'Có {skill}, có tâm, thiếu mỗi cái bàn làm việc',
  'Xin việc remote, mèo nhà tui làm QA',
  'Tui ngồi đây, offer đâu rồi, mẹ hỏi hoài',
  'Biết {skill}, biết sai, biết sửa, biết đói',
  'Cần job hợp lý: lương ổn, team vui, ít họp thứ Hai',
];

export function fillTemplate(t: string, vars: { skill?: string | null; years?: number | null }): string {
  const skill = vars.skill && vars.skill.trim() ? vars.skill.trim() : 'code';
  const nam = vars.years != null && vars.years > 0 ? String(vars.years) : 'vài';
  const s = t.replace(/\{skill\}/g, skill).replace(/\{nam\}/g, nam);
  const chars = [...s];
  return chars.length > FIELD_LIMITS.signMax ? chars.slice(0, FIELD_LIMITS.signMax).join('').trimEnd() : s;
}

export function randomTemplate(rand: () => number, vars: { skill?: string | null; years?: number | null }): string {
  const t = SIGN_TEMPLATES[Math.floor(rand() * SIGN_TEMPLATES.length) % SIGN_TEMPLATES.length];
  return fillTemplate(t, vars);
}
