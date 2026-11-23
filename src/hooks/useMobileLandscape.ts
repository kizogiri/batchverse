import { useEffect, useState } from 'react';

export interface MobileLandscapeState {
  /** True when a narrow phone viewport is held vertically (portrait) and should auto-rotate to landscape */
  isPortraitPhone: boolean;
  /** True on phones in either rotated-portrait or native physical landscape (short vertical height) */
  isCompactLandscape: boolean;
  viewportWidth: number;
  viewportHeight: number;
}

function readViewportState(): MobileLandscapeState {
  if (typeof window === 'undefined') {
    return {
      isPortraitPhone: false,
      isCompactLandscape: false,
      viewportWidth: 1280,
      viewportHeight: 800,
    };
  }

  const vw = Math.round(window.visualViewport?.width ?? window.innerWidth);
  const vh = Math.round(window.visualViewport?.height ?? window.innerHeight);
  const isPortraitPhone = vw < vh && vw < 768;
  const isPhysicalMobileLandscape = vw >= vh && vh < 520 && vw < 1024;

  return {
    isPortraitPhone,
    isCompactLandscape: isPortraitPhone || isPhysicalMobileLandscape,
    viewportWidth: vw,
    viewportHeight: vh,
  };
}

export function useMobileLandscape(): MobileLandscapeState {
  const [state, setState] = useState<MobileLandscapeState>(() => readViewportState());

  useEffect(() => {
    const update = () => setState(readViewportState());

    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    window.visualViewport?.addEventListener('resize', update);

    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      window.visualViewport?.removeEventListener('resize', update);
    };
  }, []);

  return state;
}
