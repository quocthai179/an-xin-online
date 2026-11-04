import type { FortuneDraw } from '@/backend/types';
import { fnv1a32, mix32 } from './hash';

export type Tier = 'thuong_thuong' | 'thuong' | 'trung' | 'ha' | 'ha_ha';
export const TIER_ORDER: Tier[] = ['thuong_thuong', 'thuong', 'trung', 'ha', 'ha_ha'];
export const TIER_WEIGHTS: Record<Tier, number> = { thuong_thuong: 5, thuong: 20, trung: 40, ha: 25, ha_ha: 10 };
export const TIER_LABELS: Record<Tier, string> = {
  thuong_thuong: 'Thượng thượng',
  thuong: 'Thượng',
  trung: 'Trung',
  ha: 'Hạ',
  ha_ha: 'Hạ hạ',
};
export const FORTUNE_DISCLAIMER = 'Chỉ để cười. Đừng nghỉ việc vì quẻ.';

export interface Fortune {
  id: string;
  tier: Tier;
  name: string;
  verdict: string;
  advice: string;
}

type Row = [name: string, verdict: string, advice: string];

const DATA: Record<Tier, Row[]> = {
  thuong_thuong: [
    ['Quẻ Lương Gấp Đôi', 'Năm nay offer rơi vào đầu như lá mùa thu, chọn không kịp.', 'Đàm phán đủ rồi hãy gật. Đừng gật vì mừng.'],
    ['Quẻ Sếp Hiền', 'Gặp sếp biết lắng nghe, đồng nghiệp biết viết tài liệu.', 'Đến ngày đầu nhớ mang theo lời cảm ơn.'],
    ['Quẻ Remote Thượng Hạng', 'Việc nhẹ, lương cao, wifi khỏe, mèo ngồi cạnh bàn.', 'Đừng khoe quá, kẻo bạn bè xin hộ khẩu.'],
    ['Quẻ Thăng Tiến', 'Mới ngồi chưa nóng chỗ đã có người mời lên ghế đầu phố.', 'Lên cao nhớ nhìn xuống, vẫn còn nhiều bạn cần kéo.'],
    ['Quẻ Phúc Lộc Song Toàn', 'Việc đến tận tay, lương đến tận ví, bug đến tận tay đồng nghiệp.', 'Chia lại một ly trà đá cho người đã giới thiệu bạn.'],
  ],
  thuong: [
    ['Quẻ Gió Xuôi', 'Hồ sơ gửi đi sẽ có người trả lời, thật đấy, đừng ngạc nhiên.', 'Trả lời lại trong 24 giờ, đừng làm cao.'],
    ['Quẻ Cơ Hội Gõ Cửa', 'Có người đang xem biển của bạn mà bạn chưa hay.', 'Cập nhật bio một dòng cho đẹp hơn.'],
    ['Quẻ Phỏng Vấn Suôn Sẻ', 'Câu hỏi khó nhất sẽ trùng đúng bài bạn ôn tối qua.', 'Ngủ sớm đêm trước, cà phê vừa đủ.'],
    ['Quẻ Lương Nhích Lên', 'Con số cuối cùng cao hơn con số bạn dám mơ.', 'Cứ nói giá thật, đừng tự giảm trước.'],
    ['Quẻ Đồng Nghiệp Tốt', 'Team mới có người pha cà phê ngon và review code nhẹ tay.', 'Nhớ review lại cho người ta.'],
    ['Quẻ Mở Hàng', 'Tuần này có lời mời đầu tiên, sau đó là hàng loạt.', 'Chọn lọc, đừng nhận hết.'],
    ['Quẻ Kỹ Năng Lên Giá', 'Cái bạn tưởng là hiển nhiên hóa ra HR đang cần gấp.', 'Ghi rõ vào CV, đừng ngại.'],
    ['Quẻ Duyên Công Sở', 'Gặp người hợp cạ ngay trong buổi phỏng vấn đầu tiên.', 'Giữ liên lạc, dù được nhận hay không.'],
  ],
  trung: [
    ['Quẻ Bình Bình', 'Không lên không xuống, như ly trà đá đã tan hết đá.', 'Dùng thời gian rảnh học một thứ mới.'],
    ['Quẻ Chờ Thời', 'Thời cơ chưa tới, nhưng đang đi bộ tới, hơi chậm thôi.', 'Chuẩn bị portfolio sẵn sàng.'],
    ['Quẻ Deadline Dời', 'Cái gì cũng dời được, trừ ngày lĩnh lương.', 'Lập danh sách việc, làm việc nhỏ trước.'],
    ['Quẻ Họp Hành', 'Sẽ có một cuộc họp lẽ ra chỉ cần một email.', 'Mang theo ly nước và sự kiên nhẫn.'],
    ['Quẻ Lương Giữ Nguyên', 'Lương không đổi nhưng bát phở cũng không đổi giá, hên.', 'Tiết kiệm một ít, tương lai sẽ cảm ơn.'],
    ['Quẻ Ngồi Yên', 'Đứng núi này trông núi nọ, núi nào cũng có sương mù.', 'So sánh kỹ trước khi đổi.'],
    ['Quẻ Cà Phê Sáng', 'Một ngày bình thường, ly cà phê cũng bình thường.', 'Đổi quán thử xem, biết đâu gặp HR.'],
    ['Quẻ Học Hỏi', 'Năm nay có dự án lạ, làm xong sẽ thấy mình khá hơn.', 'Hỏi nhiều, ghi chép nhiều.'],
    ['Quẻ Cân Bằng', 'Công việc ổn, tình duyên ổn, chỉ có ví là hơi lệch.', 'Tự thưởng một bữa ngon đúng chừng mực.'],
    ['Quẻ Gửi CV Đi', 'Gửi 10 nơi, 3 nơi đọc, 1 nơi gọi lại. Đó là toán học.', 'Đừng nản, gửi nơi thứ 11.'],
  ],
  ha: [
    ['Quẻ Bug Đêm Khuya', 'Đêm nay có tiếng chuông báo lỗi lúc bạn vừa chợp mắt.', 'Tắt thông báo trước khi ngủ, hôm sau fix cũng kịp.'],
    ['Quẻ Sếp Đổi Ý', 'Yêu cầu hôm qua sẽ biến thành "ý anh không phải vậy".', 'Ghi mọi thứ ra giấy, cười thật tươi.'],
    ['Quẻ Phỏng Vấn Trượt Nhẹ', 'Bị hỏi đúng chỗ bạn quên, nhưng bạn sẽ nhớ cả đời.', 'Ghi lại câu hỏi, lần sau trả lời ngon hơn.'],
    ['Quẻ Lương Chậm', 'Tiền về chậm hơn kỳ vọng, hóa đơn về nhanh hơn.', 'Dự phòng quỹ nhỏ, cắt một ly trà sữa.'],
    ['Quẻ Rủi Wifi', 'Wifi sập đúng lúc phỏng vấn online. Quy luật vũ trụ.', 'Chuẩn bị 4G dự phòng và nụ cười.'],
    ['Quẻ Đồng Nghiệp Ồn', 'Có người nghe nhạc không tai nghe cả ngày.', 'Mua tai nghe chống ồn, tiền này đáng.'],
    ['Quẻ Nhớ Nhầm Ngày', 'Hẹn phỏng vấn nhưng bạn nhớ nhầm giờ, thật tiếc.', 'Đặt báo thức hai lần, nhắc cả vợ chồng.'],
    ['Quẻ Hồ Sơ Lạc Trôi', 'CV của bạn đang nằm trong mục "để sau" của ai đó.', 'Nhắn hỏi lịch sự, đừng nhắn 5 lần.'],
    ['Quẻ Rối Ren', 'Hai offer cùng lúc, cả hai đều không như mong đợi.', 'Viết ra ưu nhược điểm, đừng chọn bằng cảm xúc.'],
  ],
  ha_ha: [
    ['Quẻ Sếp Cũ Gọi Lại', 'Sếp cũ sẽ gọi lại, hỏi một câu về code năm ngoái.', 'Đừng bắt máy. Nếu bắt rồi thì đừng sửa giùm miễn phí.'],
    ['Quẻ Production Sập', 'Deploy thứ Sáu chiều, bạn đã biết kết quả rồi.', 'Rollback, thở sâu, đi ăn tối. Mọi chuyện sẽ ổn.'],
    ['Quẻ Mất Bản Nháp', 'File chưa lưu và pin laptop 1% là hai người bạn thân.', 'Bật auto-save ngay từ bây giờ.'],
    ['Quẻ Họp Từ Sáng Đến Đêm', 'Lịch họp của bạn dày hơn sách giáo khoa.', 'Xin một khoảng trống để thở. Nếu không được thì xin ly cà phê.'],
    ['Quẻ Phỏng Vấn Quên Tên', 'Bạn gọi nhầm tên công ty. Công ty đối thủ.', 'Cười, xin lỗi, ghi nhớ tên công ty kế tiếp.'],
    ['Quẻ Hết Đá Hết Trà', 'Ngày xui, trà đá đã hết, deadline thì chưa.', 'Mai là ngày mới, mai vẫn còn đá.'],
    ['Quẻ Đụng Hàng', 'Bạn và ứng viên khác gửi cùng một CV mẫu. Cùng cả lỗi chính tả.', 'Viết lại bằng giọng của mình, bạn đủ hay rồi.'],
    ['Quẻ Chạm Đáy', 'Mọi chuyện không thể tệ hơn. Vậy nên chỉ còn đi lên.', 'Làm một việc nhỏ hôm nay để lấy đà.'],
  ],
};

export const FORTUNES: Fortune[] = TIER_ORDER.flatMap((tier) =>
  DATA[tier].map(([name, verdict, advice], i) => ({ id: `${tier}-${i + 1}`, tier, name, verdict, advice })),
);

export function tierForRoll(roll: number): Tier {
  let acc = 0;
  const r = ((Math.floor(roll) % 100) + 100) % 100;
  for (const t of TIER_ORDER) {
    acc += TIER_WEIGHTS[t];
    if (r < acc) return t;
  }
  return 'ha_ha';
}

export function selectFortune(d: FortuneDraw): Fortune {
  const tier = tierForRoll(d.roll);
  const list = FORTUNES.filter((f) => f.tier === tier);
  return list[Math.floor(Math.abs(d.pick)) % list.length];
}

export function getFortuneById(id: string): Fortune | undefined {
  return FORTUNES.find((f) => f.id === id);
}

export function drawFortuneDemo(userId: string, day: string, salt = 'pxv-demo'): FortuneDraw {
  const base = `${userId}|${day}|${salt}`;
  return {
    day,
    roll: mix32(fnv1a32(`${base}|tier`)) % 100,
    pick: mix32(fnv1a32(`${base}|pick`)),
  };
}
