import { RefObject, useEffect } from 'react';

function findScrollableAncestor(
  target: EventTarget | null,
  boundary: HTMLElement,
  axis: 'y' | 'x'
): HTMLElement | null {
  let el = target instanceof HTMLElement ? target : null;
  while (el && el !== boundary) {
    const style = window.getComputedStyle(el);
    if (axis === 'y') {
      const overflowY = style.overflowY;
      if (
        (overflowY === 'auto' || overflowY === 'scroll') &&
        el.scrollHeight > el.clientHeight + 1
      ) {
        return el;
      }
    } else {
      const overflowX = style.overflowX;
      if (
        (overflowX === 'auto' || overflowX === 'scroll') &&
        el.scrollWidth > el.clientWidth + 1
      ) {
        return el;
      }
    }
    el = el.parentElement;
  }
  return null;
}

/**
 * Enables native-feeling 1:1 touch scrolling with inertial momentum inside a
 * CSS `rotate(90deg)` landscape stage on mobile portrait screens.
 *
 * Under a +90deg clockwise rotation, scrolling visually down/up corresponds to
 * dragging along the physical X axis (`scrollTop += deltaClientX`), and scrolling
 * visually right/left corresponds to dragging along the physical Y axis
 * (`scrollLeft -= deltaClientY`).
 */
export function useRotatedTouchScroll(
  stageRef: RefObject<HTMLElement | null>,
  enabled: boolean
): void {
  useEffect(() => {
    if (!enabled) return;
    const stage = stageRef.current;
    if (!stage) return;

    let scrollYEl: HTMLElement | null = null;
    let scrollXEl: HTMLElement | null = null;
    let lockedAxis: 'y' | 'x' | null = null;
    let startX = 0;
    let startY = 0;
    let lastX = 0;
    let lastY = 0;
    let lastTime = 0;
    let velocity = 0;
    let momentumRafId = 0;

    const stopMomentum = () => {
      if (momentumRafId) {
        cancelAnimationFrame(momentumRafId);
        momentumRafId = 0;
      }
    };

    const resetTouch = () => {
      scrollYEl = null;
      scrollXEl = null;
      lockedAxis = null;
      velocity = 0;
    };

    const onTouchStart = (e: TouchEvent) => {
      stopMomentum();
      if (e.touches.length !== 1) {
        resetTouch();
        return;
      }

      const targetEl = e.target instanceof HTMLElement ? e.target : null;
      if (
        !targetEl ||
        targetEl.closest('canvas, .touch-none, [data-no-rotated-scroll], input[type="range"]')
      ) {
        resetTouch();
        return;
      }

      scrollYEl = findScrollableAncestor(targetEl, stage, 'y');
      scrollXEl = findScrollableAncestor(targetEl, stage, 'x');
      if (!scrollYEl && !scrollXEl) {
        resetTouch();
        return;
      }

      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      lastX = touch.clientX;
      lastY = touch.clientY;
      lastTime = performance.now();
      lockedAxis = null;
      velocity = 0;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!scrollYEl && !scrollXEl) return;
      if (e.touches.length !== 1) {
        resetTouch();
        return;
      }

      const touch = e.touches[0];
      const now = performance.now();
      const dt = Math.max(now - lastTime, 1);

      if (!lockedAxis) {
        const totalDx = touch.clientX - startX;
        const totalDy = touch.clientY - startY;
        if (Math.hypot(totalDx, totalDy) < 6) return;

        if (Math.abs(totalDx) >= Math.abs(totalDy) && scrollYEl) {
          lockedAxis = 'y';
        } else if (Math.abs(totalDy) > Math.abs(totalDx) && scrollXEl) {
          lockedAxis = 'x';
        } else {
          resetTouch();
          return;
        }
        lastX = touch.clientX;
        lastY = touch.clientY;
        lastTime = now;
        return;
      }

      e.preventDefault();

      if (lockedAxis === 'y' && scrollYEl) {
        const dx = touch.clientX - lastX;
        scrollYEl.scrollTop += dx;
        const instantVel = dx / dt;
        velocity = velocity * 0.45 + instantVel * 0.55;
      } else if (lockedAxis === 'x' && scrollXEl) {
        const dy = touch.clientY - lastY;
        scrollXEl.scrollLeft -= dy;
        const instantVel = -dy / dt;
        velocity = velocity * 0.45 + instantVel * 0.55;
      }

      lastX = touch.clientX;
      lastY = touch.clientY;
      lastTime = now;
    };

    const onTouchEnd = () => {
      const axis = lockedAxis;
      const target = axis === 'y' ? scrollYEl : axis === 'x' ? scrollXEl : null;
      let v = velocity;

      resetTouch();

      if (!target || !axis || Math.abs(v) < 0.08) return;

      // Clamp extreme flick velocity
      v = Math.max(-3.5, Math.min(3.5, v));
      let prevTime = performance.now();

      const step = (now: number) => {
        const dt = Math.min(now - prevTime, 34);
        prevTime = now;

        const delta = v * dt;
        if (axis === 'y') {
          const before = target.scrollTop;
          target.scrollTop += delta;
          if (Math.abs(target.scrollTop - before) < 0.25) {
            momentumRafId = 0;
            return;
          }
        } else {
          const before = target.scrollLeft;
          target.scrollLeft += delta;
          if (Math.abs(target.scrollLeft - before) < 0.25) {
            momentumRafId = 0;
            return;
          }
        }

        v *= Math.pow(0.94, dt / 16.67);
        if (Math.abs(v) > 0.02) {
          momentumRafId = requestAnimationFrame(step);
        } else {
          momentumRafId = 0;
        }
      };

      momentumRafId = requestAnimationFrame(step);
    };

    stage.addEventListener('touchstart', onTouchStart, { passive: true });
    stage.addEventListener('touchmove', onTouchMove, { passive: false });
    stage.addEventListener('touchend', onTouchEnd, { passive: true });
    stage.addEventListener('touchcancel', onTouchEnd, { passive: true });

    return () => {
      stopMomentum();
      stage.removeEventListener('touchstart', onTouchStart);
      stage.removeEventListener('touchmove', onTouchMove);
      stage.removeEventListener('touchend', onTouchEnd);
      stage.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [stageRef, enabled]);
}
