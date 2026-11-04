'use client';

import { useEffect, useRef } from 'react';
import { loadSceneFonts } from '@/scene-lib/capability';
import { drawSign } from '@/scene-lib/signTexture';

/** Cardboard sign. Same drawing code as the 3D sign textures (WYSIWYG preview). */
export function SignCanvas({ text, className, label }: { text: string; className?: string; label?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const draw = () => ref.current && drawSign(ref.current, text);
    draw();
    // redraw once webfonts are ready
    void loadSceneFonts().then(draw);
  }, [text]);
  return <canvas ref={ref} className={`sign-canvas ${className ?? ''}`} role="img" aria-label={label ?? `Biển: ${text}`} />;
}
