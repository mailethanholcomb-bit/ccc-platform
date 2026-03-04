"use client";

import { useState, useCallback } from "react";

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useApi<T>() {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(
    async (
      url: string,
      options?: RequestInit
    ): Promise<{ success: boolean; data: T | null }> => {
      setState({ data: null, loading: true, error: null });

      try {
        const res = await fetch(url, {
          headers: { "Content-Type": "application/json", ...options?.headers },
          ...options,
        });

        const json = await res.json();

        if (!json.success) {
          setState({
            data: null,
            loading: false,
            error: json.error?.message || "An error occurred",
          });
          return { success: false, data: null };
        }

        setState({ data: json.data, loading: false, error: null });
        return { success: true, data: json.data };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Network error";
        setState({ data: null, loading: false, error: message });
        return { success: false, data: null };
      }
    },
    []
  );

  const get = useCallback(
    (url: string) => execute(url),
    [execute]
  );

  const post = useCallback(
    (url: string, body: unknown) =>
      execute(url, { method: "POST", body: JSON.stringify(body) }),
    [execute]
  );

  const put = useCallback(
    (url: string, body: unknown) =>
      execute(url, { method: "PUT", body: JSON.stringify(body) }),
    [execute]
  );

  const del = useCallback(
    (url: string) => execute(url, { method: "DELETE" }),
    [execute]
  );

  return { ...state, get, post, put, del, execute };
}

// Polling hook for analysis status
export function usePolling(
  url: string,
  interval: number,
  enabled: boolean,
  onData: (data: unknown) => void
) {
  const [polling, setPolling] = useState(false);

  const startPolling = useCallback(() => {
    if (polling || !enabled) return;
    setPolling(true);

    const poll = async () => {
      try {
        const res = await fetch(url);
        const json = await res.json();
        if (json.success) {
          onData(json.data);
        }
      } catch {
        // Ignore polling errors
      }
    };

    poll();
    const timer = setInterval(poll, interval);

    return () => {
      clearInterval(timer);
      setPolling(false);
    };
  }, [url, interval, enabled, onData, polling]);

  return { polling, startPolling };
}
