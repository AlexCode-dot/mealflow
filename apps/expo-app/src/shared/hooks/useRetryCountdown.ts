import { useEffect, useState } from 'react';

export function useRetryCountdown(retryAfterSeconds?: number) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!retryAfterSeconds || retryAfterSeconds <= 0) {
      setRemaining(null);
      return;
    }

    const start = Date.now();
    setRemaining(retryAfterSeconds);

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      const next = Math.max(retryAfterSeconds - elapsed, 0);
      setRemaining(next);
      if (next <= 0) {
        clearInterval(interval);
      }
    }, 250);

    return () => clearInterval(interval);
  }, [retryAfterSeconds]);

  return {
    remaining,
    disabled: remaining !== null && remaining > 0,
  };
}
