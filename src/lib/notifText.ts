import type { AppNotification } from '@/backend/types';

export type SoundKind = 'coin' | 'note' | 'offer' | 'love' | 'incense' | null;
export interface NotifView {
  text: string;
  sound: SoundKind;
  prominent: boolean;
  action?: { label: string; target: 'inbox' };
}

const s = (v: unknown, fallback = '') => (typeof v === 'string' && v ? v : fallback);

/** Vietnamese copy for a persisted notification. Payload fields are plain text; React escapes them on render. */
export function notifView(n: Pick<AppNotification, 'type' | 'payload'>): NotifView {
  const p = n.payload;
  switch (n.type) {
    case 'gift': {
      const who = s(p.giverName, 'Ai đó');
      if (p.kind === 'love') return { text: `${who} vừa thả xu tình thương cho bạn 💛`, sound: 'love', prominent: false };
      const co = s(p.giverCompany);
      return { text: `HR ${who}${co ? ` @ ${co}` : ''} vừa thả xu cho bạn. Leng keng!`, sound: 'coin', prominent: false };
    }
    case 'invite_received':
      return {
        text: `HR ${s(p.hrName, 'Ai đó')}${s(p.hrCompany) ? ` @ ${s(p.hrCompany)}` : ''} vừa thả tờ 500k mời bạn phỏng vấn!`,
        sound: 'note', prominent: true, action: { label: 'Xem lời mời', target: 'inbox' },
      };
    case 'offer_received':
      return {
        text: `Bạn được bao trọn! ${s(p.hrName, 'HR')} gửi offer vị trí ${s(p.position, '...')}.`,
        sound: 'offer', prominent: true, action: { label: 'Xem lời mời', target: 'inbox' },
      };
    case 'invite_responded':
      return {
        text: `${s(p.candidateName, 'Ứng viên')} đã ${p.accepted ? 'nhận lời mời' : 'từ chối lời mời'} 500k của bạn.${p.reason ? ` Lý do: ${s(p.reason)}` : ''}`,
        sound: p.accepted ? 'note' : null, prominent: !!p.accepted, action: { label: 'Xem', target: 'inbox' },
      };
    case 'offer_responded':
      return {
        text: p.accepted ? `${s(p.candidateName, 'Ứng viên')} đã nhận offer của bạn. Chúc mừng!` : `${s(p.candidateName, 'Ứng viên')} từ chối offer của bạn.`,
        sound: p.accepted ? 'offer' : null, prominent: !!p.accepted,
      };
    case 'invite_closed':
      return { text: `${s(p.candidateName, 'Ứng viên')} đã nhận việc khác. Lời mời của bạn đã đóng.`, sound: null, prominent: false };
    case 'incense_for_you':
      return { text: 'Có người thắp nhang cầu job cho bạn 🪔', sound: 'incense', prominent: false };
    case 'sign_hidden':
      return { text: 'Biển của bạn đang chờ duyệt vì có báo cáo. Bạn có thể sửa lại nội dung.', sound: null, prominent: false };
    default:
      return { text: 'Thông báo mới', sound: null, prominent: false };
  }
}
