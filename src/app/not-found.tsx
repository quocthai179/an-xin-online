import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="landing">
      <p className="landing-kicker">Phố Xin Việc 3D</p>
      <div className="landing-sign">Người này đã về nhà</div>
      <h1>Không tìm thấy trang</h1>
      <p className="dim">Có thể biển đã được hạ xuống, hoặc đường link bị gõ sai. Phố vẫn còn nhiều ghế trống.</p>
      <Link className="btn primary" href="/">Quay lại phố</Link>
    </main>
  );
}
