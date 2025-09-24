'use client';

import { useEffect, useRef, useState } from 'react';

export function useInfiniteScroll(cb: () => void, options?: IntersectionObserverInit) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (!ref.current || !enabled) return;
    const target = ref.current;
    const io = new IntersectionObserver((ents) => {
      ents.forEach((e) => {
        if (e.isIntersecting) cb();
      });
    }, options || { rootMargin: '200px 0px' });

    io.observe(target);
    return () => {
      io.unobserve(target);
      io.disconnect();
    };
  }, [cb, enabled, options]);

  return { ref, setEnabled };
}
