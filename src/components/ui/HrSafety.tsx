'use client';

import type { Invitation, Offer } from '@/backend/types';
import { useUi } from '@/state/ui';

const REPORT_EMAIL = process.env.NEXT_PUBLIC_REPORT_EMAIL ?? '';

/** M6: the company is self-declared and the HR contact is free text, so every HR message carries a scam warning and a report action. */
export function HrSafety({ item }: { item: Invitation | Offer }) {
  const toast = useUi((s) => s.toast);
  const report = () => {
    const subject = encodeURIComponent('Báo cáo HR - Phố Xin Việc 3D');
    const body = encodeURIComponent(`HR: ${item.hrName} @ ${item.hrCompany || '—'}\nMã HR: ${item.hrId}\nMã ${'invitationId' in item ? 'offer' : 'lời mời'}: ${item.id}\nLý do:`);
    if (REPORT_EMAIL) {
      window.location.href = `mailto:${REPORT_EMAIL}?subject=${subject}&body=${body}`;
      return;
    }
    // TODO(SEC-M6): replace with a report_hr RPC once the backend has one
    toast({ tone: 'info', text: `Chưa có kênh báo cáo HR tự động. Hãy chụp màn hình, ghi lại tên HR "${item.hrName}" và gửi cho quản trị viên của phố.` });
  };
  return (
    <div className="hr-safety">
      <p className="notice warn">
        <strong>HR chưa xác minh.</strong> Công ty và liên hệ do chính HR tự khai. Không bao giờ chuyển tiền / nạp tiền / mua khóa học cho nhà tuyển dụng, và đừng gửi mã OTP hay giấy tờ tùy thân.
      </p>
      <button type="button" className="btn small ghost" onClick={report}>Báo cáo HR này</button>
    </div>
  );
}
