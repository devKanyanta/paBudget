'use client';
import { useEffect, useRef, useState, type ElementType, type ReactNode } from 'react';

/**
 * Fades and lifts content in as it scrolls into view. Content already on screen at load is never hidden,
 * so there is no flash, and nothing is hidden at all without JavaScript or with reduced motion.
 */
export function Reveal({ children, delay = 0, as: Tag = 'div', className = '' }: { children: ReactNode; delay?: number; as?: ElementType; className?: string }) {
  const ref = useRef<HTMLElement>(null);
  const [state, setState] = useState<'idle' | 'hidden' | 'shown'>('idle');
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight * 0.92) return; // already visible: leave it alone
    setState('hidden');
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setState('shown'); io.disconnect(); } }, { threshold: 0.12 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <Tag ref={ref} data-reveal={state} style={{ transitionDelay: state === 'shown' ? `${delay}ms` : undefined }} className={`reveal ${className}`}>{children}</Tag>;
}
