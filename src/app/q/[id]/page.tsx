import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FORTUNE_DISCLAIMER, TIER_LABELS } from '@/lib/fortune';
import { resolvePublicFortune } from '@/lib/shareData';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ n?: string | string[]; d?: string | string[] }>;
};

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function load(p: Props) {
  const { id } = await p.params;
  const sp = await p.searchParams;
  const n = first(sp.n);
  const d = first(sp.d);
  return { id, n, d, q: resolvePublicFortune(id, n, d, Date.now()) };
}

export async function generateMetadata(p: Props): Promise<Metadata> {
  const { id, q } = await load(p);
  if (!q) return { title: 'Quẻ không tồn tại | Phố Xin Việc 3D', robots: { index: false } };
  const title = `${q.name} xin được ${q.fortune.name} (${TIER_LABELS[q.fortune.tier]})`;
  const image = `/api/og/q/${id}?n=${encodeURIComponent(q.name)}&d=${q.day}`;
  return {
    title: `${title} | Phố Xin Việc 3D`,
    description: q.fortune.verdict,
    openGraph: { title, description: q.fortune.verdict, type: 'website', locale: 'vi_VN', images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', title, description: q.fortune.verdict, images: [image] },
    robots: { index: false },
  };
}

export default async function FortuneLanding(p: Props) {
  const { q } = await load(p);
  if (!q) notFound();
  const f = q.fortune;
  return (
    <main className="landing">
      <p className="landing-kicker">Phố Xin Việc 3D · Đền Xin Việc</p>
      <article className={`fortune tier-${f.tier}`}>
        <small>{q.day} · {q.name}</small>
        <h1>{f.name}</h1>
        <strong className="tier">{TIER_LABELS[f.tier]}</strong>
        <p>{f.verdict}</p>
        <p className="advice">Lời khuyên: {f.advice}</p>
        <p className="dim">{FORTUNE_DISCLAIMER}</p>
      </article>
      <Link className="btn primary" href="/">Vào phố xin quẻ của bạn</Link>
      <p className="dim landing-note"><Link href="/terms">Điều khoản</Link></p>
    </main>
  );
}
