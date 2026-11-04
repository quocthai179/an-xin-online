/** WebGL available? Probed once with a throw-away canvas. */
export function hasWebGL(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) return false;
    (gl as WebGLRenderingContext).getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

/** Low-end hint: very few cores or little memory. Users can still switch to 3D by hand (or `?view=3d`). */
export function isWeakDevice(): boolean {
  const nav = navigator as Navigator & { deviceMemory?: number };
  return (nav.hardwareConcurrency !== undefined && nav.hardwareConcurrency <= 2) || (nav.deviceMemory !== undefined && nav.deviceMemory <= 2);
}

/** Initial view: `?view=2d|3d` wins, otherwise 3D when WebGL works and the device is not weak. */
export function initialView(search: string): '2d' | '3d' {
  const v = new URLSearchParams(search).get('view');
  if (v === '2d') return '2d';
  if (!hasWebGL()) return '2d';
  if (v === '3d') return '3d';
  return isWeakDevice() ? '2d' : '3d';
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
