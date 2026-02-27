// src/hooks/useAnimationLoop.ts
// Encapsulates requestAnimationFrame lifecycle: start, stop, and cleanup on unmount.
//
// CRITICAL: Only ONE rAF loop must run at a time. If the component remounts,
// the old loop is cancelled before the new one starts (Pitfall 5 from research).
//
// The tick callback is stored in a ref to avoid stale closures without restarting the loop.
// This pattern prevents the "cancel/restart on every state change" anti-pattern.

import { useRef, useEffect, useCallback } from 'react';

type TickFn = (timestamp: number) => void;

interface UseAnimationLoopReturn {
  start: () => void;
  stop: () => void;
  isRunningRef: React.MutableRefObject<boolean>;
}

export function useAnimationLoop(tick: TickFn): UseAnimationLoopReturn {
  const rafIdRef = useRef<number>(0);
  const isRunningRef = useRef(false);
  const tickRef = useRef<TickFn>(tick);

  // Keep tickRef current without restarting the loop when tick changes
  useEffect(() => {
    tickRef.current = tick;
  });

  const loop = useCallback((timestamp: number) => {
    if (!isRunningRef.current) return;
    tickRef.current(timestamp);
    rafIdRef.current = requestAnimationFrame(loop);
  }, []);

  const start = useCallback(() => {
    if (isRunningRef.current) return; // already running — do not double-start
    isRunningRef.current = true;
    rafIdRef.current = requestAnimationFrame(loop);
  }, [loop]);

  const stop = useCallback(() => {
    isRunningRef.current = false;
    cancelAnimationFrame(rafIdRef.current);
  }, []);

  // Cancel rAF on unmount — prevents CPU leak (Pitfall 5)
  useEffect(() => {
    return () => {
      isRunningRef.current = false;
      cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

  return { start, stop, isRunningRef };
}
