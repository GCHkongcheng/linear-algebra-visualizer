"use client";

import { Activity, AlertCircle, CheckCircle2, Play, Sigma } from "lucide-react";
import { useMemo, useState } from "react";

import {
  ExperimentCasePanel,
  MethodComparisonTable,
  ParameterScanTable,
  ReliabilityPanel,
  SaveExperimentButton,
} from "@/components/common/ExperimentTools";
import { ModuleSidebarPortal } from "@/components/common/ModuleSidebarPortal";
import { CoordinatePlot } from "@/components/common/CoordinatePlot";
import {
  formatRootNumber,
  sampleFunction,
  solveRoot,
} from "@/lib/nonlinear-core";
import type { ComparisonRow, ExperimentCase, ReliabilityItem, ScanRow } from "@/types/experiment";
import type { RootMethod, RootSolveOptions, RootSolveResult } from "@/types/nonlinear";

const METHOD_OPTIONS: Array<{
  id: RootMethod;
  label: string;
  needsG?: boolean;
  needsInterval?: boolean;
  needsX1?: boolean;
}> = [
  { id: "fixedPoint", label: "简单迭代", needsG: true },
  { id: "steffensen", label: "Steffensen", needsG: true },
  { id: "newton", label: "Newton" },
  { id: "dampedNewton", label: "Newton 下山", },
  { id: "bisection", label: "二分法", needsInterval: true },
  { id: "secant", label: "割线法", needsX1: true },
];

const EXPERIMENT_CASES: ExperimentCase[] = [
  {
    id: "stable-bisection",
    title: "二分法稳定收敛",
    description: "x^3 - x - 1 在 [1,2] 上异号，适合观察区间压缩过程。",
    tag: "稳健",
  },
  {
    id: "newton-sensitive",
    title: "Newton 初值敏感",
    description: "x^3 - 2x + 2 在不同初值下可能震荡，可用于对比下山 Newton。",
    tag: "敏感",
  },
  {
    id: "fixed-point",
    title: "简单迭代与加速",
    description: "使用 g(x)=(x+1)^(1/3) 观察简单迭代与 Steffensen 加速。",
    tag: "加速",
  },
];

function parseNumber(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function methodLabel(method: RootMethod): string {
  return METHOD_OPTIONS.find((item) => item.id === method)?.label ?? method;
}

function buildOptions(
  method: RootMethod,
  values: {
    fExpression: string;
    gExpression: string;
    x0: string;
    x1: string;
    intervalStart: string;
    intervalEnd: string;
    tolerance: string;
    maxIterations: string;
  }
): RootSolveOptions {
  return {
    method,
    fExpression: values.fExpression,
    gExpression: values.gExpression,
    x0: parseNumber(values.x0, 1),
    x1: parseNumber(values.x1, 2),
    intervalStart: parseNumber(values.intervalStart, 1),
    intervalEnd: parseNumber(values.intervalEnd, 2),
    tolerance: parseNumber(values.tolerance, 1e-8),
    maxIterations: parseNumber(values.maxIterations, 80),
  };
}

function comparisonTone(result: RootSolveResult): ComparisonRow["tone"] {
  if (!result.history.length || !Number.isFinite(result.residual)) return "error";
  if (result.converged) return "success";
  return "warning";
}

function resultToComparisonRow(result: RootSolveResult): ComparisonRow {
  return {
    method: methodLabel(result.method),
    value: formatRootNumber(result.root),
    metric: formatRootNumber(result.residual),
    cost: `${result.iterations} 次迭代`,
    tone: comparisonTone(result),
    note: result.converged ? "收敛" : result.message ?? "未收敛",
  };
}

function buildPlotRange(result: RootSolveResult | null, left: number, right: number) {
  const xs = result?.history.map((item) => item.x).filter(Number.isFinite) ?? [];
  if (xs.length > 0) {
    const min = Math.min(...xs);
    const max = Math.max(...xs);
    const span = Math.max(max - min, 1);
    return { minX: min - span * 0.45, maxX: max + span * 0.45 };
  }

  if (Number.isFinite(left) && Number.isFinite(right) && left !== right) {
    const min = Math.min(left, right);
    const max = Math.max(left, right);
    const span = Math.max(max - min, 1);
    return { minX: min - span * 0.15, maxX: max + span * 0.15 };
  }

  return { minX: -4, maxX: 4 };
}

function buildReliability(result: RootSolveResult | null, tolerance: string): ReliabilityItem[] {
  if (!result) {
    return [
      {
        label: "等待计算",
        tone: "info",
        detail: "选择方法并计算后，这里会评估残差、收敛性和下一步建议。",
      },
    ];
  }

  const tol = parseNumber(tolerance, 1e-8);
  const items: ReliabilityItem[] = [
    {
      label: "收敛状态",
      tone: result.converged ? "success" : "warning",
      detail: result.converged
        ? `方法已收敛，共 ${result.iterations} 次迭代。`
        : result.message ?? "方法未在设定迭代次数内收敛。",
    },
    {
      label: "残差检查",
      tone: result.residual <= tol ? "success" : result.residual <= Math.sqrt(tol) ? "warning" : "error",
      detail: `|f(x)| = ${formatRootNumber(result.residual)}，当前容差为 ${formatRootNumber(tol)}。`,
    },
  ];

  if (result.method === "newton" || result.method === "secant") {
    items.push({
      label: "初值敏感性",
      tone: result.converged ? "info" : "warning",
      detail: "Newton/割线法对初值较敏感；若不收敛，可尝试二分法或 Newton 下山。",
    });
  }

  if (result.method === "bisection") {
    items.push({
      label: "稳健性",
      tone: "success",
      detail: "二分法只要端点异号就具有稳定收敛保障，但通常比 Newton 类方法慢。",
    });
  }

  return items;
}

function FunctionPlot({
  expression,
  result,
  left,
  right,
}: {
  expression: string;
  result: RootSolveResult | null;
  left: number;
  right: number;
}) {
  const range = buildPlotRange(result, left, right);
  const samples = useMemo(
    () => sampleFunction(expression, range.minX, range.maxX, 420),
    [expression, range.maxX, range.minX]
  );
  const points = result?.history.slice(-18) ?? [];

  return (
    <CoordinatePlot
      ariaLabel="函数图像与迭代点"
      emptyMessage="等待迭代结果"
      height={280}
      includeZeroX
      includeZeroY
      series={[
        {
          id: "root-function",
          label: "f(x)",
          color: "#ea580c",
          points: samples,
          width: 2.5,
        },
      ]}
      markers={points.map((point, index) => ({
        id: `root-iterate-${point.iteration}-${index}`,
        x: point.x,
        y: point.fx,
        color: index === points.length - 1 ? "#0f172a" : "#f97316",
        label: `${point.iteration}`,
        radius: index === points.length - 1 ? 5 : 3.5,
      }))}
    />
  );
}

export function NonlinearSolverPanel() {
  const [method, setMethod] = useState<RootMethod>("newton");
  const [fExpression, setFExpression] = useState("x^3 - x - 1");
  const [gExpression, setGExpression] = useState("(x + 1)^(1/3)");
  const [x0, setX0] = useState("1");
  const [x1, setX1] = useState("2");
  const [intervalStart, setIntervalStart] = useState("1");
  const [intervalEnd, setIntervalEnd] = useState("2");
  const [tolerance, setTolerance] = useState("1e-8");
  const [maxIterations, setMaxIterations] = useState("80");
  const [result, setResult] = useState<RootSolveResult | null>(null);
  const [comparisonRows, setComparisonRows] = useState<ComparisonRow[]>([]);
  const [scanRows, setScanRows] = useState<ScanRow[]>([]);

  const activeMethod = METHOD_OPTIONS.find((item) => item.id === method) ?? METHOD_OPTIONS[0];
  const numericLeft = parseNumber(intervalStart, 1);
  const numericRight = parseNumber(intervalEnd, 2);
  const currentValues = {
    fExpression,
    gExpression,
    x0,
    x1,
    intervalStart,
    intervalEnd,
    tolerance,
    maxIterations,
  };

  const compute = () => {
    const next = solveRoot(buildOptions(method, currentValues));
    setResult(next);
  };

  const applyCase = (caseId: string) => {
    if (caseId === "stable-bisection") {
      setMethod("bisection");
      setFExpression("x^3 - x - 1");
      setGExpression("(x + 1)^(1/3)");
      setX0("1");
      setX1("2");
      setIntervalStart("1");
      setIntervalEnd("2");
    } else if (caseId === "newton-sensitive") {
      setMethod("newton");
      setFExpression("x^3 - 2*x + 2");
      setGExpression("(2*x - 2)^(1/3)");
      setX0("0");
      setX1("-1");
      setIntervalStart("-2");
      setIntervalEnd("0");
    } else {
      setMethod("fixedPoint");
      setFExpression("x^3 - x - 1");
      setGExpression("(x + 1)^(1/3)");
      setX0("1");
      setX1("2");
      setIntervalStart("1");
      setIntervalEnd("2");
    }
    setResult(null);
    setComparisonRows([]);
    setScanRows([]);
  };

  const runComparison = () => {
    const methods: RootMethod[] = ["bisection", "newton", "dampedNewton", "secant"];
    setComparisonRows(methods.map((item) => resultToComparisonRow(solveRoot(buildOptions(item, currentValues)))));
  };

  const runInitialValueScan = () => {
    const seeds = [-3, -2, -1, -0.5, 0, 0.5, 1, 1.5, 2, 3];
    setScanRows(
      seeds.map((seed) => {
        const solved = solveRoot({
          ...buildOptions("newton", currentValues),
          x0: seed,
        });
        return {
          parameter: "x0",
          value: formatRootNumber(seed),
          metric: solved.converged
            ? `root=${formatRootNumber(solved.root)}, |f|=${formatRootNumber(solved.residual)}`
            : "未收敛",
          tone: solved.converged ? "success" : "warning",
          note: solved.converged ? `${solved.iterations} 次` : solved.message ?? "失败",
        };
      })
    );
  };

  const statusTone = result?.converged ? "text-emerald-700" : "text-amber-700";
  const StatusIcon = result?.converged ? CheckCircle2 : AlertCircle;
  const reliability = buildReliability(result, tolerance);

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
            <button type="button" onClick={runInitialValueScan} className="step-control justify-center">
              初值扫描
            </button>
          </div>
        </div>
      </ModuleSidebarPortal>

      <ModuleSidebarPortal tab="params">
        <div className="studio-card space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <Sigma size={18} />
              求根参数
            </h2>
            <button type="button" onClick={compute} className="studio-primary-btn inline-flex items-center gap-2">
              <Play size={14} />
              计算
            </button>
          </div>

          <div className="grid gap-3">
            <label className="space-y-1 text-sm font-medium text-slate-700">
              f(x)
              <input value={fExpression} onChange={(event) => setFExpression(event.target.value)} className="studio-input font-mono" />
            </label>

            <label className="space-y-1 text-sm font-medium text-slate-700">
              方法
              <select value={method} onChange={(event) => setMethod(event.target.value as RootMethod)} className="studio-select w-full">
                {METHOD_OPTIONS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm font-medium text-slate-700">
              容差
              <input value={tolerance} onChange={(event) => setTolerance(event.target.value)} className="studio-input font-mono" />
            </label>

            {activeMethod.needsG ? (
              <label className="space-y-1 text-sm font-medium text-slate-700">
                g(x)
                <input value={gExpression} onChange={(event) => setGExpression(event.target.value)} className="studio-input font-mono" />
              </label>
            ) : null}

            {activeMethod.needsInterval ? (
              <>
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  区间左端 a
                  <input value={intervalStart} onChange={(event) => setIntervalStart(event.target.value)} className="studio-input font-mono" />
                </label>
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  区间右端 b
                  <input value={intervalEnd} onChange={(event) => setIntervalEnd(event.target.value)} className="studio-input font-mono" />
                </label>
              </>
            ) : (
              <>
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  初值 x0
                  <input value={x0} onChange={(event) => setX0(event.target.value)} className="studio-input font-mono" />
                </label>
                {activeMethod.needsX1 ? (
                  <label className="space-y-1 text-sm font-medium text-slate-700">
                    初值 x1
                    <input value={x1} onChange={(event) => setX1(event.target.value)} className="studio-input font-mono" />
                  </label>
                ) : null}
              </>
            )}

            <label className="space-y-1 text-sm font-medium text-slate-700">
              最大迭代次数
              <input value={maxIterations} onChange={(event) => setMaxIterations(event.target.value)} className="studio-input font-mono" />
            </label>
          </div>
        </div>
      </ModuleSidebarPortal>

      <ModuleSidebarPortal tab="verify">
        <ReliabilityPanel items={reliability} />
      </ModuleSidebarPortal>

      <ModuleSidebarPortal tab="data">
        <SaveExperimentButton
          module="nonlinear"
          defaultName="非线性方程求根实验"
          summary={result ? `${methodLabel(result.method)}: ${formatRootNumber(result.root)}` : "非线性方程求根配置"}
          payload={{ method, fExpression, gExpression, x0, x1, intervalStart, intervalEnd, tolerance, maxIterations, result, comparisonRows, scanRows }}
          disabled={!result && comparisonRows.length === 0 && scanRows.length === 0}
        />
      </ModuleSidebarPortal>

      <div className="workspace-container">
        <section className="space-y-6">
          <div className="studio-card space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <Activity size={18} />
                函数与迭代轨迹
              </h2>
              <div className="text-xs text-slate-500">最近 18 个迭代点</div>
            </div>
            <FunctionPlot expression={fExpression} result={result} left={numericLeft} right={numericRight} />
          </div>

          <MethodComparisonTable rows={comparisonRows} />
          <ParameterScanTable title="初值敏感性扫描" rows={scanRows} />

          <div className="studio-card space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">结果</h2>
            {result ? (
              <div className="space-y-3 text-sm text-slate-700">
                <div className={`flex items-center gap-2 font-semibold ${statusTone}`}>
                  <StatusIcon size={16} />
                  {result.converged ? "已收敛" : "未收敛"}
                </div>
                <div className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs">
                  <div>方法：{methodLabel(result.method)}</div>
                  <div>根 x：<span className="font-mono">{formatRootNumber(result.root)}</span></div>
                  <div>残差 |f(x)|：<span className="font-mono">{formatRootNumber(result.residual)}</span></div>
                  <div>迭代次数：{result.iterations}</div>
                </div>
                {result.message ? <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">{result.message}</div> : null}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500">
                在左侧“参数”中点击计算后，这里会显示根、残差和收敛状态。
              </div>
            )}
          </div>

          <div className="studio-card space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">迭代表</h2>
            {result?.history.length ? (
              <div className="max-h-[440px] overflow-auto rounded-2xl border border-slate-200">
                <table className="w-full min-w-[520px] text-left text-xs">
                  <thead className="sticky top-0 bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-3 py-2">k</th>
                      <th className="px-3 py-2">x_k</th>
                      <th className="px-3 py-2">f(x_k)</th>
                      <th className="px-3 py-2">误差</th>
                      <th className="px-3 py-2">lambda</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white font-mono">
                    {result.history.map((item) => (
                      <tr key={`${item.iteration}-${item.x}`}>
                        <td className="px-3 py-2">{item.iteration}</td>
                        <td className="px-3 py-2">{formatRootNumber(item.x)}</td>
                        <td className="px-3 py-2">{formatRootNumber(item.fx)}</td>
                        <td className="px-3 py-2">{formatRootNumber(item.error)}</td>
                        <td className="px-3 py-2">{item.lambda === undefined ? "-" : formatRootNumber(item.lambda)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500">
                暂无迭代记录。
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
