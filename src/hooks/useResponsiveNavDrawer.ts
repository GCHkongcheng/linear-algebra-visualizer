"use client";

import { useCallback, useEffect, useState } from "react";

import { NAV_DRAWER_MEDIA_QUERY } from "@/types/workbench";

function isNavDrawerViewport(): boolean {
  return typeof window !== "undefined" && window.matchMedia(NAV_DRAWER_MEDIA_QUERY).matches;
}

export function useResponsiveNavDrawer() {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => {
    if (isNavDrawerViewport()) {
      setIsOpen(true);
    }
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia(NAV_DRAWER_MEDIA_QUERY);
    const closeOnWideViewport = () => {
      if (!mediaQuery.matches) {
        close();
      }
    };

    mediaQuery.addEventListener("change", closeOnWideViewport);

    return () => {
      mediaQuery.removeEventListener("change", closeOnWideViewport);
    };
  }, [close]);

  useEffect(() => {
    if (!isOpen) return;
    if (!isNavDrawerViewport()) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [close, isOpen]);

  return {
    isOpen,
    open,
    close,
  };
}
