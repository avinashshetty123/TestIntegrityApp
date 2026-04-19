'use client';

import { useEffect, useRef } from 'react';

export default function CursorTracker() {
  const dotRef  = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const ringPos = useRef({ x: -100, y: -100 });
  const mousePos = useRef({ x: -100, y: -100 });
  const rafRef  = useRef<number>(0);

  useEffect(() => {
    document.body.style.cursor = 'none';
    const spotlight = document.getElementById('cursor-spotlight');

    const onMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };

      // Update spotlight position directly on the element
      if (spotlight) {
        spotlight.style.background = `radial-gradient(700px circle at ${e.clientX}px ${e.clientY}px, rgba(249,115,22,0.10) 0%, rgba(251,146,60,0.06) 30%, transparent 65%)`;
      }

      // Dot follows instantly
      if (dotRef.current) {
        dotRef.current.style.left = `${e.clientX}px`;
        dotRef.current.style.top  = `${e.clientY}px`;
      }
    };

    // Ring lerps behind cursor
    const animate = () => {
      ringPos.current.x += (mousePos.current.x - ringPos.current.x) * 0.13;
      ringPos.current.y += (mousePos.current.y - ringPos.current.y) * 0.13;
      if (ringRef.current) {
        ringRef.current.style.left = `${ringPos.current.x}px`;
        ringRef.current.style.top  = `${ringPos.current.y}px`;
      }
      rafRef.current = requestAnimationFrame(animate);
    };

    const grow = () => {
      if (dotRef.current)  { dotRef.current.style.width  = '14px'; dotRef.current.style.height  = '14px'; }
      if (ringRef.current) { ringRef.current.style.width = '54px'; ringRef.current.style.height = '54px'; ringRef.current.style.borderColor = 'rgba(234,88,12,0.75)'; }
    };
    const shrink = () => {
      if (dotRef.current)  { dotRef.current.style.width  = '8px';  dotRef.current.style.height  = '8px'; }
      if (ringRef.current) { ringRef.current.style.width = '36px'; ringRef.current.style.height = '36px'; ringRef.current.style.borderColor = 'rgba(234,88,12,0.55)'; }
    };

    document.addEventListener('mousemove', onMove);

    // Attach grow/shrink to all interactive elements
    const interactive = document.querySelectorAll('a, button, input, select, textarea, label, [role="button"]');
    interactive.forEach(el => { el.addEventListener('mouseenter', grow); el.addEventListener('mouseleave', shrink); });

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      document.body.style.cursor = '';
      document.removeEventListener('mousemove', onMove);
      interactive.forEach(el => { el.removeEventListener('mouseenter', grow); el.removeEventListener('mouseleave', shrink); });
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <>
      <div ref={dotRef}  className="cursor-dot"  style={{ left: '-100px', top: '-100px' }} />
      <div ref={ringRef} className="cursor-ring" style={{ left: '-100px', top: '-100px' }} />
    </>
  );
}
