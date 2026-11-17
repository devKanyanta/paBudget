'use client';
import { useEffect, useRef, useState } from 'react';

const DURATION = 1600;
const PAUSE = 7000; // wait between replays

/** Counts each figure up from zero when scrolled into view, then replays after a pause. */
export function AnimatedStats({ items }: { items: [number, string][] }) {
  const ref = useRef<HTMLDListElement>(null);
  const [p, setP] = useState(1); // 0..1 progress; starts complete so SSR/no-JS shows the real numbers

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0; let timer: ReturnType<typeof setTimeout>; let visible = false; let running = false;
    const run = () => {
      if (!visible || running) return;
      running = true;
      const t0 = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - t0) / DURATION);
        setP(1 - Math.pow(1 - t, 3)); // ease-out
        if (t < 1) raf = requestAnimationFrame(tick);
        else { running = false; timer = setTimeout(run, PAUSE); }
      };
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) { setP(0); run(); } else { cancelAnimationFrame(raf); clearTimeout(timer); running = false; }
    }, { threshold: 0.4 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); clearTimeout(timer); };
  }, []);

  return (
    <dl ref={ref} className="card grid grid-cols-3 divide-x divide-border text-center shadow-pop">
      {items.map(([n, l]) => (
        <div key={l} className="px-3 py-6"><dd className="num font-display text-4xl font-extrabold text-brand">{Math.round(n * p)}</dd><dt className="mt-1 text-sm text-muted">{l}</dt></div>
      ))}
    </dl>
  );
}
