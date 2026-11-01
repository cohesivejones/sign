import { useEffect } from 'react';
import type { RefObject } from 'react';

/**
 * Stop touch drags on an element from scrolling the page. iOS Safari doesn't
 * always honour `touch-action: none`, and React's touch listeners are passive,
 * so this needs a native non-passive listener. Only touchmove is blocked, so
 * taps (and the clicks they produce) still work.
 */
export function usePreventTouchScroll(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const block = (e: TouchEvent) => e.preventDefault();
    el.addEventListener('touchmove', block, { passive: false });
    return () => el.removeEventListener('touchmove', block);
  }, [ref]);
}
