'use client';
import { useEffect, useRef, useState } from 'react';

/** Advances a step counter (0..steps-1) every `ms` while the element is on screen. Holds step 0 for reduced motion. */
export function useLoop<T extends HTMLElement>(steps: number, ms: number) {
  const ref = useRef<T>(null);
  const [step, setStep] = useState(steps - 1); // SSR / no-JS: show the finished state
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let timer: ReturnType<typeof setInterval> | undefined;
    const io = new IntersectionObserver(([e]) => {
      clearInterval(timer);
      if (e.isIntersecting) { setStep(0); timer = setInterval(() => setStep((s) => (s + 1) % steps), ms); }
    }, { threshold: 0.35 });
    io.observe(el);
    return () => { io.disconnect(); clearInterval(timer); };
  }, [steps, ms]);
  return { ref, step };
}
