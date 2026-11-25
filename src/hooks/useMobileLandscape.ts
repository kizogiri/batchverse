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
  /** True when the browser supports Fullscreen API to hide the browser address bar */
  canFullscreen: boolean;
  /** True when the browser is currently in Fullscreen mode (address bar hidden) */
  isFullscreen: boolean;
  /** True when the browser supports Fullscreen + Screen Orientation landscape lock (Android Chrome/Brave) */
  canLockLandscape: boolean;
  /** True when currently in fullscreen true-landscape mode */
  isFullscreenLandscape: boolean;
  /** Enter browser fullscreen (hides address bar, and locks landscape on phones) */
  enterClassroomFullscreen: () => Promise<boolean>;
  /** Exit browser fullscreen (restores address bar on homepage) */
  exitClassroomFullscreen: () => Promise<void>;
  /** Toggle browser fullscreen (and landscape lock on phones) */
  toggleFullscreenLandscape: () => Promise<void>;
}

type ScreenOrientationLockable = {
  type?: string;
  lock?: (orientation: 'landscape' | 'portrait' | 'any') => Promise<void>;
  unlock?: () => void;
};

type VendorFullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
  webkitFullscreenEnabled?: boolean;
};

type VendorFullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

function getFullscreenElement(): Element | null {
  if (typeof document === 'undefined') return null;
  const doc = document as VendorFullscreenDocument;
  return document.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

function supportsFullscreen(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  const doc = document as VendorFullscreenDocument;
  const docEl = document.documentElement as VendorFullscreenElement;
  if (doc.fullscreenEnabled === false && doc.webkitFullscreenEnabled === false) {
    return false;
  }
  return Boolean(
    typeof docEl?.requestFullscreen === 'function' ||
      typeof docEl?.webkitRequestFullscreen === 'function'
  );
}

function supportsLandscapeLock(): boolean {
  if (!supportsFullscreen()) return false;
  const orient = window.screen?.orientation as ScreenOrientationLockable | undefined;
  return Boolean(typeof orient?.lock === 'function');
}

function isTouchPhoneDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const minScreenDim = Math.min(window.screen?.width ?? window.innerWidth, window.screen?.height ?? window.innerHeight);
  const isCoarsePointer =
    typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  return minScreenDim < 768 && (isCoarsePointer || 'ontouchstart' in window);
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
  'enterClassroomFullscreen' | 'exitClassroomFullscreen' | 'toggleFullscreenLandscape'
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
      canFullscreen: false,
      isFullscreen: false,
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
  const isFullscreen = Boolean(getFullscreenElement());
  // Keep rotated landscape active whenever physically portrait on a narrow phone,
  // even if fullscreen succeeded without hardware orientation lock.
  const isPortraitPhone = portrait && innerW < 768;

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
  const isSmallScreen = Math.min(innerW, innerH) < 560;

  return {
    isPortraitPhone,
    isCompactLandscape:
      isPortraitPhone || isPhysicalMobileLandscape || (isFullscreen && isSmallScreen),
    viewportWidth: innerW,
    viewportHeight: stableHeight,
    visualWidth: visualW,
    visualHeight: visualH,
    visualOffsetTop,
    visualOffsetLeft,
    isKeyboardOpen,
    canFullscreen: supportsFullscreen(),
    isFullscreen,
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
    document.addEventListener('webkitfullscreenchange', onOrientationChange);
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);

    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', onOrientationChange);
      document.removeEventListener('fullscreenchange', onOrientationChange);
      document.removeEventListener('webkitfullscreenchange', onOrientationChange);
      window.visualViewport?.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('scroll', update);
    };
  }, []);

  const enterClassroomFullscreen = useCallback(async (): Promise<boolean> => {
    if (typeof document === 'undefined' || !supportsFullscreen()) return false;
    if (getFullscreenElement()) return true;

    const docEl = document.documentElement as VendorFullscreenElement;
    const orient = window.screen?.orientation as ScreenOrientationLockable | undefined;

    try {
      if (typeof docEl.requestFullscreen === 'function') {
        try {
          await docEl.requestFullscreen({ navigationUI: 'hide' });
        } catch {
          await docEl.requestFullscreen();
        }
      } else if (typeof docEl.webkitRequestFullscreen === 'function') {
        await docEl.webkitRequestFullscreen();
      } else {
        return false;
      }

      if (isTouchPhoneDevice() && orient?.lock) {
        try {
          await orient.lock('landscape');
        } catch {
          // Orientation lock is optional (e.g., unsupported on desktop/some tablets)
        }
      }
      return true;
    } catch {
      return false;
    }
  }, []);

  const exitClassroomFullscreen = useCallback(async (): Promise<void> => {
    if (typeof document === 'undefined') return;
    const doc = document as VendorFullscreenDocument;
    const orient = window.screen?.orientation as ScreenOrientationLockable | undefined;

    try {
      orient?.unlock?.();
    } catch {
      // Ignore unlock errors on unsupported browsers
    }

    if (!getFullscreenElement()) return;
    try {
      if (typeof document.exitFullscreen === 'function') {
        await document.exitFullscreen();
      } else if (typeof doc.webkitExitFullscreen === 'function') {
        await doc.webkitExitFullscreen();
      }
    } catch {
      // Ignore exit errors
    }
  }, []);

  const toggleFullscreenLandscape = useCallback(async () => {
    if (getFullscreenElement()) {
      await exitClassroomFullscreen();
    } else {
      await enterClassroomFullscreen();
    }
  }, [enterClassroomFullscreen, exitClassroomFullscreen]);

  return {
    ...state,
    enterClassroomFullscreen,
    exitClassroomFullscreen,
    toggleFullscreenLandscape,
  };
}
