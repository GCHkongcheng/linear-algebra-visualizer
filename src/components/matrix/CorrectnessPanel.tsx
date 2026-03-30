import { ResultStateCard } from "@/components/matrix/ResultStateCard";

type CorrectnessMetric = {
  label: string;
  value: string;
};

type CorrectnessPanelProps = {
  title?: string;
  equation?: string;
  residual?: number | null;
  threshold?: number | null;
  passed?: boolean | null;
  note?: string;
  metrics?: CorrectnessMetric[];
};

function formatValue(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "N/A";
  return value.toExponential(3);
}

export function CorrectnessPanel({
  title = "正确性证据",
  equation,
  residual,
  threshold,
  passed = null,
  note,
  metrics = [],
}: CorrectnessPanelProps) {
  const tone = passed === true ? "success" : passed === false ? "warning" : "warning";
  const message =
    passed === true
      ? "校验通过，结果在设定阈值内。"
      : passed === false
        ? "校验未通过，建议检查输入或切换更稳定方法。"
        : "已给出判定依据，可结合上下文解读结果。";

  const evidenceParts = [
    equation ? `关系：${equation}` : null,
    residual !== undefined ? `残差：${formatValue(residual)}` : null,
    threshold !== undefined ? `阈值：${formatValue(threshold)}` : null,
  ].filter((part): part is string => Boolean(part));

  return (
    <ResultStateCard
      tone={tone}
      title={title}
      message={message}
      evidence={evidenceParts.length ? evidenceParts.join(" ｜ ") : undefined}
    >
      {metrics.length ? (
        <div className="space-y-1 rounded-lg border border-slate-200 bg-white/70 px-3 py-2 text-xs text-slate-700">
          {metrics.map((metric) => (
            <div key={`${metric.label}-${metric.value}`} className="flex items-center justify-between gap-4">
              <span className="text-slate-500">{metric.label}</span>
              <span className="font-mono text-slate-800">{metric.value}</span>
            </div>
          ))}
        </div>
      ) : null}
      {note ? <div className="text-xs text-slate-600">{note}</div> : null}
    </ResultStateCard>
  );
}
