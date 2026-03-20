import { AlertTriangle, CheckCircle2, CircleAlert, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import type { ResultTone } from "@/types/matrix";

type ResultStateCardProps = {
  tone: ResultTone;
  title: string;
  message: string;
  evidence?: string;
  children?: ReactNode;
};

const toneMap: Record<
  ResultTone,
  { icon: LucideIcon; className: string; iconClassName: string }
> = {
  success: {
    icon: CheckCircle2,
    className: "result-state-success",
    iconClassName: "text-emerald-600",
  },
  warning: {
    icon: AlertTriangle,
    className: "result-state-warning",
    iconClassName: "text-amber-700",
  },
  error: {
    icon: CircleAlert,
    className: "result-state-error",
    iconClassName: "text-rose-700",
  },
};

export function ResultStateCard({
  tone,
  title,
  message,
  evidence,
  children,
}: ResultStateCardProps) {
  const toneMeta = toneMap[tone];
  const Icon = toneMeta.icon;

  return (
    <div className={`result-state-card ${toneMeta.className}`}>
      <div className="flex items-start gap-3">
        <Icon size={18} className={toneMeta.iconClassName} />
        <div className="space-y-1">
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          <div className="text-sm text-slate-700">{message}</div>
          {evidence ? <div className="text-xs text-slate-600">{evidence}</div> : null}
        </div>
      </div>
      {children ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}
