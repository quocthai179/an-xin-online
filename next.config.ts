import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV === 'development';

/** connect-src entries for Supabase (REST + realtime websocket), only when the project is configured and not forced to demo. */
function supabaseConnectSources(url: string | undefined, forceDemo: string | undefined): string[] {
  if (!url || forceDemo === '1') return [];
  try {
    const u = new URL(url);
    const ws = u.protocol === 'https:' ? 'wss:' : 'ws:';
    return [u.origin, `${ws}//${u.host}`];
  } catch {
    return [];
  }
}

const supabaseSources = supabaseConnectSources(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_FORCE_DEMO);

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src ${["'self'", ...supabaseSources].join(' ')}${isDev ? ' ws://localhost:* ws://127.0.0.1:*' : ''}`,
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
].join('; ');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // the OG routes read the vendored TTFs with fs at runtime
  outputFileTracingIncludes: { '/api/og/**': ['./src/assets/fonts/*.ttf'] },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
