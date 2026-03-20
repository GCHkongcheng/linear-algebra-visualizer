import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from "lucide-react";
import type { ReactNode } from "react";

import type { Step } from "@/types/matrix";

type StepCardProps = {
  step: Step | null;
  stepIndex: number;
  totalSteps: number;
  stepDescription: string;
  isPlaying: boolean;
  onPrev: () => void;
  onNext: () => void;
  onReset: () => void;
  onTogglePlay: () => void;
  children?: ReactNode;
};

export function StepCard({
  step,
  stepIndex,
  totalSteps,
  stepDescription,
  isPlaying,
  onPrev,
  onNext,
  onReset,
  onTogglePlay,
  children,
}: StepCardProps) {
  if (!step) {
    return (
      <div className="studio-card grid place-items-center rounded-3xl border border-dashed border-slate-300 py-12 text-sm text-slate-500">
        点击“求解”后显示消元步骤。
      </div>
    );
  }

  const disablePrev = stepIndex === 0;
  const disableNext = stepIndex >= totalSteps - 1;

  return (
    <div className="studio-card space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="rounded-2xl bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800">
          步骤 {stepIndex + 1}/{totalSteps}：{stepDescription}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onPrev}
            disabled={disablePrev}
            className="step-control"
            aria-label="上一步"
          >
            <ChevronLeft size={16} />
            上一步
          </button>
          <button
            onClick={onNext}
            disabled={disableNext}
            className="step-control"
            aria-label="下一步"
          >
            下一步
            <ChevronRight size={16} />
          </button>
          <button onClick={onReset} className="step-control" aria-label="复位">
            <RotateCcw size={16} />
            复位
          </button>
          <button onClick={onTogglePlay} className="step-control step-control-primary">
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            {isPlaying ? "暂停" : "自动播放"}
          </button>
        </div>
      </div>

      <div className="step-detail-grid">
        <aside className="step-operator-box">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Operator
          </div>
          <div className="mt-2 font-mono text-xs text-slate-800">{step.operationLabel ?? "-"}</div>
          {step.swapReason ? (
            <div className="mt-3 rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-600">
              {step.swapReason}
            </div>
          ) : null}
        </aside>
        <div>{children}</div>
      </div>
    </div>
  );
}

