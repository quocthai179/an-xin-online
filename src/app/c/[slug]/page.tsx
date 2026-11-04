import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublicCandidate } from '@/server/publicData';
import { ZONES } from '@/lib/zones';

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ d?: string | string[] }>;
};

async function load(p: Props) {
  const { slug } = await p.params;
  const sp = await p.searchParams;
  const d = Array.isArray(sp.d) ? sp.d[0] : sp.d;
  return { slug, d, c: await getPublicCandidate(slug, d, Date.now()) };
}

export async function generateMetadata(p: Props): Promise<Metadata> {
  const { slug, d, c } = await load(p);
  if (!c) return { title: 'Người này đã về nhà | Phố Xin Việc 3D', robots: { index: false } };
  const title = `${c.name} đang ngồi ở Phố Xin Việc`;
  const image = `/api/og/c/${slug}${c.demo && d ? `?d=${encodeURIComponent(d)}` : ''}`;
  return {
    title: `${title} | Phố Xin Việc 3D`,
    description: c.sign,
    openGraph: { title, description: c.sign, type: 'website', locale: 'vi_VN', images: [{ url: image, width: 1200, height: 630, alt: c.sign }] },
    twitter: { card: 'summary_large_image', title, description: c.sign, images: [image] },
    robots: c.demo ? { index: false } : undefined,
  };
}

export default async function CandidateLanding(p: Props) {
  const { slug, c } = await load(p);
  if (!c) notFound();
  const zone = ZONES[c.zone];
  return (
    <main className="landing">
      <p className="landing-kicker">Phố Xin Việc 3D</p>
      <div className="landing-sign" role="img" aria-label={`Biển: ${c.sign}`}>
        {c.sign}
      </div>
      <h1>{c.name}</h1>
      <p className="dim">
        {c.title} · <span style={{ color: zone.color, fontWeight: 700 }}>{zone.name}</span> · {c.xu} xu
      </p>
      {c.placed && <p className="badge sample">Chúc mừng, bạn này vừa được bao trọn rồi!</p>}
      {c.sample && <p className="badge sample">Ứng viên mẫu, không có thật</p>}
      {c.demo && <p className="dim">Bản demo: dữ liệu chỉ nằm trong trình duyệt của người chia sẻ.</p>}
      <Link className="btn primary" href={`/?c=${encodeURIComponent(slug)}`}>
        Vào phố, tới thẳng chỗ {c.name}
      </Link>
      <p className="dim landing-note">
        Xu và 500k trong trò chơi đều là xu ảo. <Link href="/terms">Điều khoản</Link>
      </p>
    </main>
  );
}
