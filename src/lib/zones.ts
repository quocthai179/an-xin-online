import type { ZoneId } from './rules';
import { ZONE_IDS } from './rules';

export interface ZoneMeta {
  id: ZoneId;
  name: string;
  short: string;
  blurb: string;
  color: string;
  emoji: string;
}

export const ZONES: Record<ZoneId, ZoneMeta> = {
  backend: { id: 'backend', name: 'Hẻm Backend', short: 'Backend', blurb: 'Nơi những con API thức khuya', color: '#c0562b', emoji: '🛠️' },
  frontend: { id: 'frontend', name: 'Dãy nhà ống Frontend', short: 'Frontend', blurb: 'Căn chỉnh 1px là cả một đời', color: '#2b8ac0', emoji: '🎨' },
  design: { id: 'design', name: 'Chợ Design', short: 'Design', blurb: 'Khách bảo "làm cho nó đẹp hơn"', color: '#b83280', emoji: '✏️' },
  mobile: { id: 'mobile', name: 'Ngõ Mobile', short: 'Mobile', blurb: 'App chạy mượt trên máy của sếp', color: '#2f9e6b', emoji: '📱' },
  data_ai: { id: 'data_ai', name: 'Xóm Data/AI', short: 'Data/AI', blurb: 'Model chạy tốt trên notebook', color: '#6b46c1', emoji: '🤖' },
  qa: { id: 'qa', name: 'Quán cà phê QA/Tổ Bug', short: 'QA', blurb: 'Tìm ra bug trước khi khách tìm ra mình', color: '#a8871a', emoji: '🐞' },
  pm_ba: { id: 'pm_ba', name: 'Góc PM/BA', short: 'PM/BA', blurb: 'Họp xong họp nữa', color: '#c05621', emoji: '📋' },
  devops: { id: 'devops', name: 'Bãi DevOps/Cloud', short: 'DevOps', blurb: 'Máy chủ sập lúc 3 giờ sáng', color: '#2c7a7b', emoji: '☁️' },
  fresher: { id: 'fresher', name: 'Gầm cầu Fresher/Intern', short: 'Fresher', blurb: 'Chưa có kinh nghiệm nhưng có nhiệt huyết', color: '#4a5568', emoji: '🌱' },
  other: { id: 'other', name: 'Khu Khác', short: 'Khác', blurb: 'Nghề lạ nhưng vẫn cần cơm', color: '#718096', emoji: '🎲' },
};

export const ZONE_LIST: ZoneMeta[] = ZONE_IDS.map((id) => ZONES[id]);

export function isZoneId(v: unknown): v is ZoneId {
  return typeof v === 'string' && (ZONE_IDS as readonly string[]).includes(v);
}

export function zoneIndex(id: ZoneId): number {
  return ZONE_IDS.indexOf(id);
}
