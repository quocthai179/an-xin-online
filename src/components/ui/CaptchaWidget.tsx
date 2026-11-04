'use client';

import { useEffect, useRef } from 'react';
import { captchaEnabled, clearCaptchaToken, onCaptchaReset, provideCaptchaToken, TURNSTILE_SITE_KEY } from '@/lib/captcha';

interface TurnstileApi {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id?: string) => void;
  remove: (id?: string) => void;
}
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let scriptP: Promise<TurnstileApi> | null = null;

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  scriptP ??= new Promise<TurnstileApi>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SCRIPT_SRC;
    s.async = true;
    s.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('turnstile missing')));
    s.onerror = () => {
      scriptP = null;
      reject(new Error('turnstile failed to load'));
    };
    document.head.appendChild(s); // created by our (nonce-trusted) bundle, so 'strict-dynamic' allows it
  });
  return scriptP;
}

/** Cloudflare Turnstile widget. Renders nothing unless NEXT_PUBLIC_TURNSTILE_SITE_KEY is set. */
export function CaptchaWidget() {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!captchaEnabled() || !box.current) return;
    let id: string | undefined;
    let api: TurnstileApi | undefined;
    let dead = false;
    const el = box.current;
    loadTurnstile()
      .then((t) => {
        if (dead) return;
        api = t;
        id = t.render(el, {
          sitekey: TURNSTILE_SITE_KEY,
          language: 'vi',
          callback: (tok: string) => provideCaptchaToken(tok),
          'expired-callback': () => clearCaptchaToken(),
          'error-callback': () => clearCaptchaToken(),
        });
      })
      .catch(() => undefined);
    const off = onCaptchaReset(() => {
      if (api && id) api.reset(id);
    });
    return () => {
      dead = true;
      off();
      if (api && id) api.remove(id);
    };
  }, []);
  if (!captchaEnabled()) return null;
  return <div ref={box} className="captcha" aria-label="Xác minh bạn là người" />;
}
