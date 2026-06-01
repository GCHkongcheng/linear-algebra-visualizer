import { Redo2, Undo2 } from "lucide-react";

import type { DisplayMode } from "@/types/matrix";

type DisplayModeSwitcherProps = {
  displayMode: DisplayMode;
  onChange: (mode: DisplayMode) => void;
};

export function DisplayModeSwitcher({
  displayMode,
  onChange,
}: DisplayModeSwitcherProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        显示模式
      </div>
      <div className="flex flex-wrap gap-2">
        {[
          { value: "decimal", label: "小数" },
          { value: "fraction", label: "分数" },
          { value: "symbolic", label: "符号" },
        ].map((mode) => (
          <button
            key={mode.value}
            onClick={() => onChange(mode.value as DisplayMode)}
            className={`mode-chip ${displayMode === mode.value ? "mode-chip-active" : ""}`}
          >
            {mode.label}
          </button>
        ))}
      </div>
    </div>
  );
}

type CorrectnessPanelToggleCardProps = {
  enabled: boolean;
  onToggle: (value: boolean) => void;
};

export function CorrectnessPanelToggleCard({
  enabled,
  onToggle,
}: CorrectnessPanelToggleCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-medium text-slate-700">正确性证据</div>
        <button
          type="button"
          onClick={() => onToggle(!enabled)}
          aria-pressed={enabled}
          aria-label={enabled ? "关闭正确性证据面板" : "开启正确性证据面板"}
          className={`relative h-6 w-11 rounded-full transition ${
            enabled ? "bg-emerald-500" : "bg-slate-300"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition ${
              enabled ? "left-5" : "left-0.5"
            }`}
          />
        </button>
      </div>
    </div>
  );
}

type HistoryControlCardProps = {
  canUndo: boolean;
  canRedo: boolean;
  index: number;
  total: number;
  onUndo: () => void;
  onRedo: () => void;
};

export function HistoryControlCard({
  canUndo,
  canRedo,
  index,
  total,
  onUndo,
  onRedo,
}: HistoryControlCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="text-sm font-medium text-slate-700">操作历史</div>
        <div className="text-xs text-slate-500">{total ? `${index}/${total}` : "0/0"}</div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          className="step-control justify-center"
          aria-label="撤销"
        >
          <Undo2 size={14} />
          撤销
        </button>
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          className="step-control justify-center"
          aria-label="重做"
        >
          <Redo2 size={14} />
          重做
        </button>
      </div>
    </div>
  );
}
