'use client';

import { usePathname } from 'next/navigation';
import CursorTracker from './CursorTracker';

export default function ConditionalCursor() {
  const pathname = usePathname();
  if (pathname !== '/') return null;
  return <CursorTracker />;
}
