import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Điều khoản | Phố Xin Việc 3D',
  description: 'Phố Xin Việc 3D là trò chơi. Xu và 500k đều là xu ảo. Tự nguyện, tự trào, từ 16 tuổi.',
};

export default function Terms() {
  return (
    <main className="landing terms">
      <p className="landing-kicker">Phố Xin Việc 3D</p>
      <h1>Điều khoản, đọc cho vui nhưng nghiêm túc</h1>
      <p className="dim">Cập nhật lần cuối: 04/11/2026. Bản tiếng Việt là bản chính.</p>

      <h2>1. Đây là trò chơi</h2>
      <p>
        Phố Xin Việc 3D là một con phố ảo, nơi dân IT ngồi vỉa hè với tấm biển bìa các-tông để xin việc cho vui. Mọi thứ ở đây
        là trò chơi, không phải sàn tuyển dụng chính thức và không có gì đảm bảo bạn sẽ có việc. Ngồi lâu có thể được lên ghế đầu phố, ngồi mãi cũng chẳng sao.
      </p>

      <h2>2. Xu và 500k đều là xu ảo</h2>
      <p>
        &quot;Xu&quot;, &quot;xu tình thương&quot;, &quot;500k&quot; và &quot;bao trọn&quot; là tiền ảo trong trò chơi. Chúng không có giá trị quy đổi,
        không mua bán, không rút ra, không nạp vào. Chúng tôi không nhận và không xử lý bất kỳ khoản thanh toán thật nào.
        500k chỉ là lời mời phỏng vấn, bao trọn chỉ là lời mời làm việc. Mọi thỏa thuận thật diễn ra ngoài trò chơi, giữa hai bên với nhau.
      </p>

      <h2>3. Tự nguyện và tự trào</h2>
      <p>
        Bạn chỉ xuất hiện trên phố khi bạn tự bấm &quot;Ra ngồi&quot; và đồng ý hiển thị biển, tên, vị trí. Bạn có thể đứng dậy, sửa hoặc xóa hồ sơ bất cứ lúc nào.
        Thông tin liên hệ chỉ mở cho nhà tuyển dụng đã gửi lời mời 500k và chờ bạn nhận lời. Hãy viết biển tự trào, đừng viết biển chửi ai.
      </p>

      <h2>4. Từ 16 tuổi</h2>
      <p>Trò chơi dành cho người từ đủ 16 tuổi. Nếu bạn chưa đủ tuổi, vui lòng quay lại sau, phố vẫn ở đây.</p>

      <h2>5. Nội dung và hành vi</h2>
      <ul>
        <li>Không đăng nội dung tục tĩu, quấy rối, lừa đảo, kỳ thị, hoặc thông tin cá nhân của người khác.</li>
        <li>Không chèn link, email, số điện thoại vào biển, tiêu đề hay giới thiệu. Liên hệ chỉ điền vào ô liên hệ riêng.</li>
        <li>Biển có thể bị ẩn tự động khi nhiều người báo cáo, hoặc bị gỡ khi vi phạm. Chúng tôi có thể từ chối hoặc gỡ nội dung mà không cần báo trước.</li>
        <li>Nhà tuyển dụng chưa được xác minh. Hãy tự kiểm tra công ty trước khi chia sẻ thông tin quan trọng.</li>
      </ul>

      <h2>6. Dữ liệu của bạn</h2>
      <p>
        Chế độ demo lưu dữ liệu ngay trong trình duyệt của bạn (localStorage), không gửi lên máy chủ. Khi bạn chia sẻ biển qua đường link,
        nội dung biển, tên, vị trí và số xu sẽ nằm trong link để máy chủ dựng ảnh xem trước, và đã được kiểm duyệt. Chúng tôi dùng lưu trữ cục bộ
        chỉ để duy trì phiên chơi, không quảng cáo, không bán dữ liệu.
      </p>

      <h2>7. Quẻ xăm</h2>
      <p>Quẻ ở đền chỉ để cười. Đừng nghỉ việc, bỏ phỏng vấn hay đổi đời vì một quẻ xăm trong game.</p>

      <h2>8. Miễn trừ</h2>
      <p>
        Trò chơi được cung cấp &quot;như hiện có&quot;. Chúng tôi không chịu trách nhiệm về nội dung do người dùng đăng, cũng như các thỏa thuận ngoài trò chơi.
        Nếu thấy nội dung không ổn, hãy dùng nút Báo cáo.
      </p>

      <Link className="btn primary" href="/">Quay lại phố</Link>
    </main>
  );
}
