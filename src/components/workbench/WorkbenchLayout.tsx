import type { ReactNode } from "react";

import { MathInputProvider, SymbolKeyboard } from "@/components/common/SymbolKeyboard";
import { ToastHost, type ToastItem } from "@/components/matrix/ToastHost";

type WorkbenchLayoutProps = {
  header: ReactNode;
  sidebar: ReactNode;
  children: ReactNode;
  toasts: ToastItem[];
  onDismissToast: (id: number) => void;
};

export function WorkbenchLayout({
  header,
  sidebar,
  children,
  toasts,
  onDismissToast,
}: WorkbenchLayoutProps) {
  return (
    <MathInputProvider>
      <div className="min-h-screen px-6 py-10 text-[15px] text-slate-900">
      {header}

      <div className="mx-auto mt-8 grid w-full max-w-6xl gap-6 lg:grid-cols-[300px_1fr]">
        {sidebar}
        <main>{children}</main>
      </div>

      <ToastHost toasts={toasts} onDismiss={onDismissToast} />
      <SymbolKeyboard />

      <footer className="mx-auto mt-10 w-full max-w-6xl rounded-3xl border border-slate-200 bg-white px-6 py-4 text-xs text-slate-500">
        数值分析工作流 · 默认启用可验证计算
      </footer>
      </div>
    </MathInputProvider>
  );
}
