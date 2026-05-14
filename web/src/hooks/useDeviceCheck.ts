import { useEffect, useState } from 'react';

// Block ONLY very narrow screens (small phones in portrait orientation).
// Tablets, landscape phones, and any screen ≥ 480px wide get the
// responsive UI now that the sidebar collapses into a drawer.
const TINY_PORTRAIT_MAX_WIDTH = 480;

function detectTinyPortrait(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window.innerWidth;
  const h = window.innerHeight;
  if (!w || !h) return false;
  const isPortrait = h > w;
  return isPortrait && w < TINY_PORTRAIT_MAX_WIDTH;
}

export function useDeviceCheck() {
  // `isPhone` keeps the existing name for back-compat with App.tsx but
  // its meaning has narrowed: it's now true only for truly tiny portrait
  // phones where the UI can't usefully fit.
  const [isPhone, setIsPhone] = useState<boolean>(() => detectTinyPortrait());

  useEffect(() => {
    const update = () => setIsPhone(detectTinyPortrait());
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return { isPhone };
}
