"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { ToastItem } from "@/components/matrix/ToastHost";

export type ToastPayload = Omit<ToastItem, "id">;

type UseToastQueueOptions = {
  durationMs?: number;
};

export function useToastQueue({ durationMs = 3600 }: UseToastQueueOptions = {}) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastSeqRef = useRef(0);
  const toastTimersRef = useRef<Map<number, number>>(new Map());
  const toastGroupRef = useRef<Map<string, number>>(new Map());

  const dismissToast = useCallback((id: number) => {
    const timer = toastTimersRef.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      toastTimersRef.current.delete(id);
    }

    setToasts((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) {
        const groupedId = toastGroupRef.current.get(target.title);
        if (groupedId === id) {
          toastGroupRef.current.delete(target.title);
        }
      }
      return prev.filter((item) => item.id !== id);
    });
  }, []);

  const pushToast = useCallback(
    (payload: ToastPayload) => {
      const existingId = toastGroupRef.current.get(payload.title);

      if (existingId !== undefined) {
        const timer = toastTimersRef.current.get(existingId);
        if (timer !== undefined) {
          window.clearTimeout(timer);
        }

        setToasts((prev) =>
          prev.map((item) =>
            item.id === existingId ? { id: existingId, ...payload } : item
          )
        );

        const nextTimer = window.setTimeout(() => {
          dismissToast(existingId);
        }, durationMs);
        toastTimersRef.current.set(existingId, nextTimer);
        return;
      }

      const id = Date.now() + toastSeqRef.current;
      toastSeqRef.current += 1;

      toastGroupRef.current.set(payload.title, id);
      setToasts((prev) => [...prev, { id, ...payload }]);

      const timer = window.setTimeout(() => {
        dismissToast(id);
      }, durationMs);
      toastTimersRef.current.set(id, timer);
    },
    [dismissToast, durationMs]
  );

  useEffect(() => {
    const timerMap = toastTimersRef.current;
    const groupMap = toastGroupRef.current;

    return () => {
      timerMap.forEach((timer) => window.clearTimeout(timer));
      timerMap.clear();
      groupMap.clear();
    };
  }, []);

  return {
    toasts,
    pushToast,
    dismissToast,
  };
}
