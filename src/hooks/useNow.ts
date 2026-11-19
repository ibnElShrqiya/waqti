import { useEffect, useState } from 'react';

/** Current time, refreshed every `intervalMs` (default: one minute, aligned to the minute). */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let interval: number | undefined;
    const align = intervalMs - (Date.now() % intervalMs);
    const timeout = window.setTimeout(() => {
      setNow(new Date());
      interval = window.setInterval(() => setNow(new Date()), intervalMs);
    }, align);
    return () => {
      window.clearTimeout(timeout);
      if (interval) window.clearInterval(interval);
    };
  }, [intervalMs]);

  return now;
}
