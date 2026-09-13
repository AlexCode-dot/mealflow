import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';

type Options = {
  /** Refresh each time the screen is shown again. Not on first mount — the screen's own load covers that. */
  refreshOnFocus?: boolean;
  /** Also refresh on this interval while the screen is focused and the app is in the foreground. */
  pollIntervalMs?: number;
};

/**
 * Keeps a screen close to live for people sharing one account on two phones. There is no server
 * push, so a screen catches up when it's shown again, when the app returns to the foreground, and —
 * where changes matter within seconds, like a shopping list in the store — on a short poll.
 *
 * `refresh` should be quiet: no spinner, and no error screen when a background request fails.
 * Failures are swallowed here; the next trigger simply tries again.
 */
export function useLiveRefresh(
  refresh: () => Promise<unknown> | void,
  { refreshOnFocus = true, pollIntervalMs }: Options = {},
) {
  const isFocused = useIsFocused();
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const refreshRef = useRef(refresh);
  const inFlight = useRef(false);
  const seenFirstFocus = useRef(false);
  const wasActive = useRef(appActive);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  // One request at a time, so polls can't pile up behind a slow reply on a poor connection.
  const run = useCallback(() => {
    if (inFlight.current) return;
    inFlight.current = true;
    Promise.resolve()
      .then(() => refreshRef.current())
      .catch(() => undefined)
      .finally(() => {
        inFlight.current = false;
      });
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!seenFirstFocus.current) {
        seenFirstFocus.current = true;
        return;
      }
      if (refreshOnFocus) run();
    }, [refreshOnFocus, run]),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next: AppStateStatus) =>
      setAppActive(next === 'active'),
    );
    return () => subscription.remove();
  }, []);

  // Back from another app or a locked phone: catch up on whatever changed in the meantime.
  useEffect(() => {
    if (appActive && !wasActive.current && isFocused) run();
    wasActive.current = appActive;
  }, [appActive, isFocused, run]);

  useEffect(() => {
    if (!pollIntervalMs || !isFocused || !appActive) return undefined;
    const id = setInterval(run, pollIntervalMs);
    return () => clearInterval(id);
  }, [appActive, isFocused, pollIntervalMs, run]);
}
