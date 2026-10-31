import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { errorText } from "./api";

/** Load data when the screen gains focus; exposes reload for pull-to-refresh. */
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const hasData = useRef(false);
  // Coming back to a page refreshes quietly: the old content stays until the new arrives.
  const run = useCallback(async (pull = false) => {
    if (pull) setRefreshing(true);
    else if (!hasData.current) setLoading(true);
    try {
      setData(await fnRef.current());
      hasData.current = true;
      setError(null);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useFocusEffect(
    useCallback(() => {
      run();
    }, [run])
  );

  return { data, setData, error, loading, refreshing, reload: () => run(true) };
}

/** Wrap an action with busy + error state. */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    setBusy(true);
    setError(null);
    try {
      return await fn();
    } catch (e) {
      setError(errorText(e));
      return undefined;
    } finally {
      setBusy(false);
    }
  }, []);
  return { busy, error, setError, run };
}
