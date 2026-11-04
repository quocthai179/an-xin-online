import type { NextConfig } from 'next';

// The Content-Security-Policy (per-request nonce) is set in src/proxy.ts; the static headers below apply to every response.

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
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
