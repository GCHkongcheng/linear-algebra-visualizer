"use client";

import { ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";

export type ModuleSidebarPortalTab = "cases" | "params" | "verify" | "data";

export function ModuleSidebarPortal({
  tab,
  children,
}: {
  tab: ModuleSidebarPortalTab;
  children: ReactNode;
}) {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setTarget(document.getElementById(`module-sidebar-${tab}`));
  }, [tab]);

  if (!target) return null;

  return createPortal(children, target);
}
