import { useCallback, useEffect, useRef, useState } from 'react';

export interface MobileLandscapeState {
  /** True when a narrow phone viewport is held vertically (portrait) and should auto-rotate to landscape */
  isPortraitPhone: boolean;
  /** True on phones in either rotated-portrait or native physical landscape (short vertical height) */
  isCompactLandscape: boolean;
  /** Stable layout width (does not shrink unexpectedly when soft keyboard opens) */
  viewportWidth: number;
  /** Stable full layout height (keeps rotated background stage anchored with zero blank top gap) */
  viewportHeight: number;
  /** Live visual viewport width (visible area above soft keyboard) */
  visualWidth: number;
  /** Live visual viewport height (visible area above soft keyboard) */
  visualHeight: number;
  /** Live visual viewport vertical offset */
  visualOffsetTop: number;
  /** Live visual viewport horizontal offset */
  visualOffsetLeft: number;
  /** True when the mobile soft keyboard is currently open */
  isKeyboardOpen: boolean;
  /** True when the browser supports Fullscreen + Screen Orientation landscape lock (Android Chrome/Brave) */
  canLockLandscape: boolean;
  /** True when currently in fullscreen true-landscape mode */
  isFullscreenLandscape: boolean;
  /** Toggle true hardware landscape via Fullscreen + orientation lock (rotates OS keyboard horizontally) */
  toggleFullscreenLandscape: () => Promise<void>;
}

type ScreenOrientationLockable = {
  type?: string;
  lock?: (orientation: 'landscape' | 'portrait' | 'any') => Promise<void>;
  unlock?: () => void;
};

function supportsLandscapeLock(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  const docEl = document.documentElement;
  const orient = window.screen?.orientation as ScreenOrientationLockable | undefined;
  return Boolean(
    typeof docEl?.requestFullscreen === 'function' && typeof orient?.lock === 'function'
  );
}

function isDevicePortrait(): boolean {
  if (typeof window === 'undefined') return false;
  const orientType = window.screen?.orientation?.type;
  if (orientType) {
    if (orientType.startsWith('portrait')) return true;
    if (orientType.startsWith('landscape')) return false;
  }
  if (typeof window.matchMedia === 'function') {
    return window.matchMedia('(orientation: portrait)').matches;
  }
  return window.innerWidth < window.innerHeight;
}

function readViewportState(stablePortraitHeightRef: { current: number }): Omit<
  MobileLandscapeState,
  'toggleFullscreenLandscape'
> {
  if (typeof window === 'undefined') {
    return {
      isPortraitPhone: false,
      isCompactLandscape: false,
      viewportWidth: 1280,
      viewportHeight: 800,
      visualWidth: 1280,
      visualHeight: 800,
      visualOffsetTop: 0,
      visualOffsetLeft: 0,
      isKeyboardOpen: false,
      canLockLandscape: false,
      isFullscreenLandscape: false,
    };
  }

  const innerW = Math.round(window.innerWidth);
  const innerH = Math.round(window.innerHeight);
  const vv = window.visualViewport;
  const visualW = Math.round(vv?.width ?? innerW);
  const visualH = Math.round(vv?.height ?? innerH);
  const visualOffsetTop = Math.round(vv?.offsetTop ?? 0);
  const visualOffsetLeft = Math.round(vv?.offsetLeft ?? 0);

  const portrait = isDevicePortrait();
  const isFullscreen = Boolean(document.fullscreenElement);
  const isPortraitPhone = portrait && innerW < 768 && !isFullscreen;

  if (isPortraitPhone) {
    // Keep the tallest height observed in portrait so opening the soft keyboard
    // never shrinks the rotated classroom stage or creates a blank gap at the top.
    const candidateH = Math.max(innerH, visualH);
    if (candidateH > stablePortraitHeightRef.current) {
      stablePortraitHeightRef.current = candidateH;
    }
  } else {
    stablePortraitHeightRef.current = 0;
  }

  const stableHeight = isPortraitPhone
    ? Math.max(stablePortraitHeightRef.current, innerH)
    : innerH;

  const keyboardDelta = stableHeight - visualH;
  const isKeyboardOpen = keyboardDelta > 120;
  const isPhysicalMobileLandscape = !portrait && innerH < 540 && innerW < 1080;

  return {
    isPortraitPhone,
    isCompactLandscape: isPortraitPhone || isPhysicalMobileLandscape || isFullscreen,
    viewportWidth: innerW,
    viewportHeight: stableHeight,
    visualWidth: visualW,
    visualHeight: visualH,
    visualOffsetTop,
    visualOffsetLeft,
    isKeyboardOpen,
    canLockLandscape: supportsLandscapeLock(),
    isFullscreenLandscape: isFullscreen && !portrait,
  };
}

export function useMobileLandscape(): MobileLandscapeState {
  const stablePortraitHeightRef = useRef<number>(0);
  const [state, setState] = useState(() => readViewportState(stablePortraitHeightRef));

  useEffect(() => {
    const update = () => setState(readViewportState(stablePortraitHeightRef));
    const onOrientationChange = () => {
      stablePortraitHeightRef.current = 0;
      update();
      window.setTimeout(update, 120);
    };

    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', onOrientationChange);
    document.addEventListener('fullscreenchange', onOrientationChange);
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);

    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', onOrientationChange);
      document.removeEventListener('fullscreenchange', onOrientationChange);
      window.visualViewport?.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('scroll', update);
    };
  }, []);

  const toggleFullscreenLandscape = useCallback(async () => {
    const orient = window.screen?.orientation as ScreenOrientationLockable | undefined;
    try {
      if (document.fullscreenElement) {
        try {
          orient?.unlock?.();
        } catch {
          // Ignore unlock errors on unsupported browsers
        }
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
        if (orient?.lock) {
          await orient.lock('landscape');
        }
      }
    } catch {
      // Browser declined fullscreen or orientation lock (e.g. iOS Safari)
    }
  }, []);

  return {
    ...state,
    toggleFullscreenLandscape,
  };
}
