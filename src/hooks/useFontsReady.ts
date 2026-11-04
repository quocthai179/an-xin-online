'use client';

import { useEffect, useState } from 'react';
import { loadSceneFonts } from '@/scene-lib/capability';

/** False until the sign/label webfonts are loaded, so canvas textures can be redrawn once with the right glyphs. */
export function useFontsReady(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    void loadSceneFonts().then(() => {
      if (alive) setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);
  return ready;
}
