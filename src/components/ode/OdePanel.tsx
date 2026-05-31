"use client";

import { Activity, Calculator, Play, Table2 } from "lucide-react";
import { useState } from "react";

import {
  ExperimentCasePanel,
  MethodComparisonTable,
  ParameterScanTable,
  ReliabilityPanel,
  SaveExperimentButton,
} from "@/components/common/ExperimentTools";
import { ModuleSidebarPortal } from "@/components/common/ModuleSidebarPortal";
import { CoordinatePlot } from "@/components/common/CoordinatePlot";
import { formatOdeNumber, solveOde } from "@/lib/ode-core";
import type { ComparisonRow, ExperimentCase, ReliabilityItem, ScanRow } from "@/types/experiment";
import type { OdeMethod, OdeResult } from "@/types/ode";

const METHOD_OPTIONS: Array<{ id: OdeMethod; label: string }> = [
  { id: "euler", label: "Euler" },
  { id: "improvedEuler", label: "改进 Euler" },
  { id: "midpoint", label: "中点法" },
  { id: "rk4", label: "RK4" },
];

const EXPERIMENT_CASES: ExperimentCase[] = [
  {
    id: "textbook",
    title: "经典初值问题",
    description: "y'=y-x^2+1，带精确解，适合比较不同方法误差。",
    tag: "基准",
  },
  {
    id: "decay",
    title: "指数衰减",
    description: "y'=-2y，观察步长变大时 Euler 方法的误差累积。",
    tag: "步长",
  },
  {
    id: "oscillation",
    title: "振荡导数",
    description: "y'=cos(x)，精确解 sin(x)，适合观察 RK4 的稳定精度。",
    tag: "振荡",
  },
];

function methodLabel(method: OdeMethod): string {
  return METHOD_OPTIONS.find((item) => item.id === method)?.label ?? method;
}

function solveSafely(options: {
  method: OdeMethod;
  expression: string;
  exactExpression: string;
  x0: string;
  y0: string;
  xEnd: string;
  stepSize: string;
}) {
  return solveOde({
    method: options.method,
    expression: options.expression,
    exactExpression: options.exactExpression,
    x0: Number(options.x0),
    y0: Number(options.y0),
    xEnd: Number(options.xEnd),
    stepSize: Number(options.stepSize),
  });
}

function OdePlot({ result }: { result: OdeResult | null }) {
  if (!result) {
    return <CoordinatePlot ariaLabel="常微分方程数值解曲线" emptyMessage="等待初值问题求解结果" series={[]} />;
  }

  const exactPoints = result.steps.map((step) => ({ x: step.x, y: step.exact }));

  return (
    <CoordinatePlot
      ariaLabel="常微分方程数值解曲线"
      emptyMessage="等待初值问题求解结果"
      includeZeroX
      includeZeroY
      series={[
        {
          id: "ode-approx",
          label: "数值解",
          color: "#ea580c",
          points: result.steps.map((step) => ({ x: step.x, y: step.y })),
          width: 2.6,
        },
        ...(result.exactExpression
          ? [
              {
                id: "ode-exact",
                label: "精确解",
                color: "#16a34a",
                points: exactPoints,
                width: 2.2,
                dashed: true,
              },
            ]
          : []),
      ]}
      markers={result.steps.map((step) => ({
        id: `ode-dot-${step.index}`,
        x: step.x,
        y: step.y,
        color: "#0f172a",
        radius: 3.5,
      }))}
    />
  );
}

function buildReliability(result: OdeResult | null): ReliabilityItem[] {
  if (!result) {
    return [
      {
        label: "等待计算",
        tone: "info",
        detail: "计算后会评估步长、最大误差和精确解对比情况。",
      },
    ];
  }

  const hasExact = Boolean(result.exactExpression);
  const maxError = result.maxError;
  return [
    {
      label: "步进规模",
      tone: result.steps.length > 1000 ? "warning" : "success",
      detail: `当前共 ${result.steps.length - 1} 步，步长 h=${formatOdeNumber(result.stepSize)}。`,
    },
    {
      label: "误差检查",
      tone: !hasExact
        ? "info"
        : maxError !== null && maxError !== undefined && maxError < 1e-5
          ? "success"
          : maxError !== null && maxError !== undefined && maxError < 1e-2
            ? "warning"
            : "error",
      detail: hasExact
        ? `最大误差为 ${formatOdeNumber(maxError)}。`
        : "未提供精确解，建议用方法对比或步长扫描判断可信度。",
    },
    {
      label: "方法建议",
      tone: result.method === "rk4" ? "success" : "info",
      detail: result.method === "rk4"
        ? "RK4 通常在相同步长下有更高精度。"
        : "可与 RK4 对比，观察低阶方法的误差累积。",
    },
  ];
}

export function OdePanel() {
  const [method, setMethod] = useState<OdeMethod>("rk4");
  const [expression, setExpression] = useState("y - x^2 + 1");
  const [exactExpression, setExactExpression] = useState("(x + 1)^2 - 0.5 * exp(x)");
  const [x0, setX0] = useState("0");
  const [y0, setY0] = useState("0.5");
  const [xEnd, setXEnd] = useState("2");
  const [stepSize, setStepSize] = useState("0.2");
  const [result, setResult] = useState<OdeResult | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [comparisonRows, setComparisonRows] = useState<ComparisonRow[]>([]);
  const [scanRows, setScanRows] = useState<ScanRow[]>([]);

  const currentOptions = { method, expression, exactExpression, x0, y0, xEnd, stepSize };

  const compute = () => {
    try {
      const next = solveSafely(currentOptions);
      setResult(next);
      setFeedback({ tone: "success", text: "初值问题求解完成" });
    } catch (error) {
      setResult(null);
      setFeedback({
        tone: "error",
        text: error instanceof Error ? error.message : "求解失败",
      });
    }
  };

  const applyCase = (caseId: string) => {
    if (caseId === "textbook") {
      setExpression("y - x^2 + 1");
      setExactExpression("(x + 1)^2 - 0.5 * exp(x)");
      setX0("0");
      setY0("0.5");
      setXEnd("2");
      setStepSize("0.2");
      setMethod("rk4");
    } else if (caseId === "decay") {
      setExpression("-2*y");
      setExactExpression("exp(-2*x)");
      setX0("0");
      setY0("1");
      setXEnd("3");
      setStepSize("0.25");
      setMethod("euler");
    } else {
      setExpression("cos(x)");
      setExactExpression("sin(x)");
      setX0("0");
      setY0("0");
      setXEnd("6.283185307179586");
      setStepSize("0.2");
      setMethod("rk4");
    }
    setResult(null);
    setComparisonRows([]);
    setScanRows([]);
  };

  const runComparison = () => {
    const methods: OdeMethod[] = ["euler", "improvedEuler", "midpoint", "rk4"];
    setComparisonRows(
      methods.map((item) => {
        try {
          const solved = solveSafely({ ...currentOptions, method: item });
          const tail = solved.steps[solved.steps.length - 1];
          return {
            method: methodLabel(item),
            value: formatOdeNumber(tail?.y),
            metric: formatOdeNumber(solved.maxError),
            cost: `${solved.steps.length - 1} 步`,
            tone: solved.maxError === null || solved.maxError === undefined || solved.maxError < 1e-4 ? "success" : "warning",
            note: solved.message ?? "完成",
          } satisfies ComparisonRow;
        } catch (error) {
          return {
            method: methodLabel(item),
            value: "N/A",
            metric: "N/A",
            cost: "-",
            tone: "error",
            note: error instanceof Error ? error.message : "失败",
          } satisfies ComparisonRow;
        }
      })
    );
  };

  const runStepScan = () => {
    const values = [0.5, 0.25, 0.125, 0.0625];
    setScanRows(
      values.map((h) => {
        try {
          const solved = solveSafely({ ...currentOptions, stepSize: `${h}` });
          const tail = solved.steps[solved.steps.length - 1];
          return {
            parameter: "h",
            value: formatOdeNumber(h),
            metric: `y_end=${formatOdeNumber(tail?.y)}, maxErr=${formatOdeNumber(solved.maxError)}`,
            tone: solved.maxError === null || solved.maxError === undefined || solved.maxError < 1e-4 ? "success" : "warning",
            note: `${solved.steps.length - 1} 步`,
          } satisfies ScanRow;
        } catch (error) {
          return {
            parameter: "h",
            value: formatOdeNumber(h),
            metric: "N/A",
            tone: "error",
            note: error instanceof Error ? error.message : "失败",
          } satisfies ScanRow;
        }
      })
    );
  };

  return (
    <>
      <ModuleSidebarPortal tab="cases">
        <ExperimentCasePanel cases={EXPERIMENT_CASES} onApply={applyCase} />
        <div className="rounded-2xl border border-slate-200 bg-white p-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            实验工具
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={runComparison} className="step-control justify-center">
              方法对比
            </button>
            <button type="button" onClick={runStepScan} className="step-control justify-center">
              步长扫描
            </button>
          </div>
        </div>
      </ModuleSidebarPortal>

      <ModuleSidebarPortal tab="params">
        <div className="studio-card space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <Activity size={18} />
              初值问题参数
            </h2>
            <button type="button" onClick={compute} className="studio-primary-btn inline-flex items-center gap-2">
              <Play size={14} />
              计算
            </button>
          </div>

          <div className="grid gap-3">
            <label className="space-y-1 text-sm font-medium text-slate-700">
              y&apos; = f(x,y)
              <input value={expression} onChange={(event) => setExpression(event.target.value)} className="studio-input font-mono" />
            </label>

            <label className="space-y-1 text-sm font-medium text-slate-700">
              精确解 y(x)
              <input value={exactExpression} onChange={(event) => setExactExpression(event.target.value)} className="studio-input font-mono" />
            </label>

            <label className="space-y-1 text-sm font-medium text-slate-700">
              方法
              <select value={method} onChange={(event) => setMethod(event.target.value as OdeMethod)} className="studio-select w-full">
                {METHOD_OPTIONS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1 text-sm font-medium text-slate-700">
                x0
                <input value={x0} onChange={(event) => setX0(event.target.value)} className="studio-input font-mono" />
              </label>
              <label className="space-y-1 text-sm font-medium text-slate-700">
                y0
                <input value={y0} onChange={(event) => setY0(event.target.value)} className="studio-input font-mono" />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1 text-sm font-medium text-slate-700">
                终点 x
                <input value={xEnd} onChange={(event) => setXEnd(event.target.value)} className="studio-input font-mono" />
              </label>
              <label className="space-y-1 text-sm font-medium text-slate-700">
                步长 h
                <input value={stepSize} onChange={(event) => setStepSize(event.target.value)} className="studio-input font-mono" />
              </label>
            </div>
          </div>

          {feedback ? (
            <div className={`rounded-xl border px-3 py-2 text-xs ${feedback.tone === "error" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
              {feedback.text}
            </div>
          ) : null}
        </div>
      </ModuleSidebarPortal>

      <ModuleSidebarPortal tab="verify">
        <ReliabilityPanel items={buildReliability(result)} />
      </ModuleSidebarPortal>

      <ModuleSidebarPortal tab="data">
        <SaveExperimentButton
          module="ode"
          defaultName="常微分方程实验"
          summary={result ? `${methodLabel(result.method)}: maxErr=${formatOdeNumber(result.maxError)}` : "ODE 初值问题配置"}
          payload={{ method, expression, exactExpression, x0, y0, xEnd, stepSize, result, comparisonRows, scanRows }}
          disabled={!result && comparisonRows.length === 0 && scanRows.length === 0}
        />
      </ModuleSidebarPortal>

      <div className="workspace-container">
        <section className="space-y-6">
          <div className="studio-card space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900">解曲线</h2>
              <div className="text-xs text-slate-500">橙色为数值解，绿色虚线为精确解</div>
            </div>
            <OdePlot result={result} />
          </div>

          <MethodComparisonTable rows={comparisonRows} />
          <ParameterScanTable title="步长扫描" rows={scanRows} />

          <div className="studio-card space-y-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <Calculator size={18} />
              结果
            </h2>
            {result ? (
              <div className="space-y-3 text-sm text-slate-700">
                <div className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs">
                  <div>方法：{methodLabel(result.method)}</div>
                  <div>步数：{result.steps.length - 1}</div>
                  <div>终点数值解：<span className="font-mono">{formatOdeNumber(result.steps[result.steps.length - 1]?.y)}</span></div>
                  <div>最大误差：<span className="font-mono">{formatOdeNumber(result.maxError)}</span></div>
                </div>
                {result.message ? (
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                    {result.message}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500">
                在左侧“参数”中点击计算后显示终点解、误差和过程表。
              </div>
            )}
          </div>

          <div className="studio-card space-y-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <Table2 size={18} />
              步进表
            </h2>
            {result?.steps.length ? (
              <div className="max-h-[560px] overflow-auto rounded-2xl border border-slate-200">
                <table className="w-full min-w-[620px] text-left text-xs">
                  <thead className="sticky top-0 bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-3 py-2">k</th>
                      <th className="px-3 py-2">x_k</th>
                      <th className="px-3 py-2">y_k</th>
                      <th className="px-3 py-2">f(x_k,y_k)</th>
                      <th className="px-3 py-2">精确解</th>
                      <th className="px-3 py-2">误差</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white font-mono">
                    {result.steps.map((step) => (
                      <tr key={`ode-step-${step.index}`}>
                        <td className="px-3 py-2">{step.index}</td>
                        <td className="px-3 py-2">{formatOdeNumber(step.x)}</td>
                        <td className="px-3 py-2">{formatOdeNumber(step.y)}</td>
                        <td className="px-3 py-2">{formatOdeNumber(step.slope)}</td>
                        <td className="px-3 py-2">{formatOdeNumber(step.exact)}</td>
                        <td className="px-3 py-2">{formatOdeNumber(step.error)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500">
                暂无步进数据。
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
