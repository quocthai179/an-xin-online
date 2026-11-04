'use client';

import { useSession } from '@/state/session';
import { useUi } from '@/state/ui';
import { Modal } from './Modal';
import { Onboarding } from './Onboarding';

export function AccountPanel() {
  const me = useSession((s) => s.me);
  const close = useUi((s) => s.close);
  return (
    <Modal title="Đổi tên / vai trò">
      <p className="dim">Đổi tên chỉ được 1 lần mỗi ngày. Đổi sang vai trò khác sẽ ẩn hồ sơ ứng viên (không xóa).</p>
      <Onboarding initial={me?.profile} onDone={close} />
    </Modal>
  );
}
