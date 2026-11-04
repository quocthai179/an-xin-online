import type { Metadata, Viewport } from 'next';
import { connection } from 'next/server';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: 'Phố Xin Việc 3D',
  description: 'Ngồi vỉa hè xin việc, tự trào và có tâm. Xu và 500k đều là xu ảo, trò chơi thôi nhé.',
  openGraph: { title: 'Phố Xin Việc 3D', description: 'Con phố nơi dân IT ngồi xin việc cho vui.', locale: 'vi_VN', type: 'website' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#f3d9b1',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // dynamic rendering: the CSP nonce from src/proxy.ts is per request and Next stamps it on its scripts
  await connection();
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
