'use client';

import { useEffect, useState } from 'react';

/** Coarse pointer or narrow viewport. False on the server and until mounted. */
export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const q = window.matchMedia('(pointer: coarse), (max-width: 760px)');
    const update = () => setMobile(q.matches);
    update();
    q.addEventListener('change', update);
    return () => q.removeEventListener('change', update);
  }, []);
  return mobile;
}
