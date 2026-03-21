import { AlertTriangle, CheckCircle2, CircleAlert, X, type LucideIcon } from "lucide-react";

import type { ResultTone } from "@/types/matrix";

export type ToastItem = {
  id: number;
  tone: ResultTone;
  title: string;
  message: string;
  evidence?: string;
};

type ToastHostProps = {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
};

const toneMeta: Record<
  ResultTone,
  { icon: LucideIcon; className: string; iconClassName: string }
> = {
  success: {
    icon: CheckCircle2,
    className: "border-emerald-300/70 bg-emerald-50",
    iconClassName: "text-emerald-600",
  },
  warning: {
    icon: AlertTriangle,
    className: "border-amber-300/70 bg-amber-50",
    iconClassName: "text-amber-700",
  },
  error: {
    icon: CircleAlert,
    className: "border-rose-300/70 bg-rose-50",
    iconClassName: "text-rose-700",
  },
};

export function ToastHost({ toasts, onDismiss }: ToastHostProps) {
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-[min(92vw,380px)] flex-col gap-2">
      {toasts.map((toast) => {
        const meta = toneMeta[toast.tone];
        const Icon = meta.icon;

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-2xl border px-3 py-2 shadow-lg shadow-slate-900/10 backdrop-blur ${meta.className}`}
          >
            <div className="flex items-start gap-2">
              <Icon size={16} className={`mt-0.5 shrink-0 ${meta.iconClassName}`} />
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="text-xs font-semibold text-slate-900">{toast.title}</div>
                <div className="text-xs text-slate-700">{toast.message}</div>
                {toast.evidence ? (
                  <div className="text-[11px] text-slate-600">{toast.evidence}</div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => onDismiss(toast.id)}
                className="rounded-full p-1 text-slate-500 transition hover:bg-white/80 hover:text-slate-700"
                aria-label="关闭提示"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
