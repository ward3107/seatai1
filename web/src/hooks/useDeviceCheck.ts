import { useEffect, useState } from 'react';

const PHONE_MAX_SHORT_SIDE_PX = 600;

function detectPhone(): boolean {
  if (typeof window === 'undefined') return false;

  const ua = window.navigator.userAgent || '';
  const isIPad = /iPad/i.test(ua) || (ua.includes('Macintosh') && 'ontouchend' in document);
  const isAndroidTablet = /Android/i.test(ua) && !/Mobile/i.test(ua);
  if (isIPad || isAndroidTablet) return false;

  const isPhoneUA = /iPhone|iPod|Mobi/i.test(ua);
  const shortSide = Math.min(window.innerWidth, window.innerHeight);
  const isPhoneViewport = shortSide > 0 && shortSide < PHONE_MAX_SHORT_SIDE_PX;

  return isPhoneUA || isPhoneViewport;
}

export function useDeviceCheck() {
  const [isPhone, setIsPhone] = useState<boolean>(() => detectPhone());

  useEffect(() => {
    const update = () => setIsPhone(detectPhone());
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return { isPhone };
}
