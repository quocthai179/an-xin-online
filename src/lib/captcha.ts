// Cloudflare Turnstile glue (H1). Optional: everything here is inert unless NEXT_PUBLIC_TURNSTILE_SITE_KEY is set.
// The onboarding renders the widget and hands the solved token to `provideCaptchaToken`; SupabaseBackend awaits `takeCaptchaToken`
// right before `signInAnonymously({ options: { captchaToken } })`. A token is single use, so taking it asks the widget to reset.

export const TURNSTILE_SITE_KEY: string = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '';

const TAKE_TIMEOUT_MS = 120_000;

let token: string | null = null;
let waiters: { resolve: (t: string) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> }[] = [];
const resetListeners = new Set<() => void>();

export function captchaEnabled(): boolean {
  return TURNSTILE_SITE_KEY.length > 0;
}

export function provideCaptchaToken(t: string): void {
  token = t;
  const w = waiters;
  waiters = [];
  for (const x of w) {
    clearTimeout(x.timer);
    x.resolve(t);
  }
  if (w.length) {
    token = null;
    for (const l of resetListeners) l();
  }
}

/** The widget reports an expired or failed token. */
export function clearCaptchaToken(): void {
  token = null;
}

export function takeCaptchaToken(timeoutMs = TAKE_TIMEOUT_MS): Promise<string> {
  if (token) {
    const t = token;
    token = null;
    for (const l of resetListeners) l();
    return Promise.resolve(t);
  }
  return new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => {
      waiters = waiters.filter((w) => w.timer !== timer);
      reject(new Error('captcha timeout'));
    }, timeoutMs);
    waiters.push({ resolve, reject, timer });
  });
}

export function onCaptchaReset(cb: () => void): () => void {
  resetListeners.add(cb);
  return () => resetListeners.delete(cb);
}
