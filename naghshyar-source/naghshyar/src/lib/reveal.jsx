import { useEffect, useRef, useState } from 'react';

/**
 * Hook: element fades/slides in when it enters the viewport.
 * Returns a ref to attach to the container element.
 */
export function useReveal(threshold = 0.15) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.unobserve(el);
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { ref, visible };
}

/**
 * Wrapper component that reveals children on scroll.
 * @param {string} direction - 'up' | 'left' | 'right' | 'fade'
 * @param {number} delay - ms delay
 */
export function Reveal({ children, direction = 'up', delay = 0, className = '', ...rest }) {
  const { ref, visible } = useReveal(0.12);
  const cls = `reveal reveal-${direction} ${visible ? 'revealed' : ''} ${className}`;
  return (
    <div ref={ref} className={cls} style={{ transitionDelay: `${delay}ms` }} {...rest}>
      {children}
    </div>
  );
}

/**
 * Animated counter: counts from 0 to `end` when visible.
 */
export function CountUp({ end, duration = 1800, suffix = '', prefix = '' }) {
  const { ref, visible } = useReveal(0.3);
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!visible) return;
    const start = 0;
    const startTime = performance.now();
    const step = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      // ease-out quad
      const eased = 1 - (1 - progress) * (1 - progress);
      setVal(Math.floor(start + (end - start) * eased));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [visible, end, duration]);

  return <span ref={ref}>{prefix}{val.toLocaleString('fa-IR')}{suffix}</span>;
}
