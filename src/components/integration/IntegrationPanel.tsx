"use client";

import { Calculator, ChartArea, Play, Table2 } from "lucide-react";
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
import {
  formatIntegrationNumber,
  parseIntegrationNumber,
  solveIntegration,
} from "@/lib/integration-core";
import type { ComparisonRow, ExperimentCase, ReliabilityItem, ScanRow } from "@/types/experiment";
import type {
  IntegrationMethod,
  IntegrationResult,
} from "@/types/integration";

const METHOD_OPTIONS: Array<{ id: IntegrationMethod; label: string }> = [
  { id: "trapezoid", label: "复化梯形" },
  { id: "simpson", label: "复化 Simpson" },
  { id: "romberg", label: "Romberg" },
  { id: "gaussLegendre", label: "Gauss-Legendre" },
];

const EXPERIMENT_CASES: ExperimentCase[] = [
  {
    id: "smooth-sine",
    title: "光滑函数基准",
    description: "sin(x) 在 [0,pi] 上积分精确值为 2，适合比较不同求积法。",
    tag: "基准",
  },
  {
    id: "oscillation",
    title: "振荡函数",
    description: "sin(20x) 在 [0,pi] 上频繁振荡，适合观察采样密度的影响。",
    tag: "振荡",
  },
  {
    id: "endpoint-curve",
    title: "端点变化较快",
    description: "sqrt(x) 在 [0,1] 左端导数变化快，适合观察误差估计。",
    tag: "误差",
  },
];

function methodLabel(method: IntegrationMethod): string {
  return METHOD_OPTIONS.find((item) => item.id === method)?.label ?? method;
}

function formatRombergConvergence(result: IntegrationResult): string {
  const convergence = result.convergence;
  if (!convergence || convergence.errorLimit === null) {
    return `按指定层数计算（${result.table?.length ?? 0} 层）`;
  }

  if (convergence.stoppedEarly) {
    return `达到误差限 ${formatIntegrationNumber(convergence.errorLimit)}，提前停止于第 ${convergence.usedLevels} 层`;
  }

  if (convergence.reached) {
    return `达到误差限 ${formatIntegrationNumber(convergence.errorLimit)}`;
  }

  return `已达到最大层数 ${convergence.maxLevels}，误差仍高于 ${formatIntegrationNumber(convergence.errorLimit)}`;
}

function solveSafely(options: {
  method: IntegrationMethod;
  expression: string;
  intervalStart: string;
  intervalEnd: string;
  subdivisions: string;
  rombergLevels: string;
  gaussPoints: string;
  errorLimit: string;
  sampleCount?: number;
}): IntegrationResult {
  return solveIntegration({
    method: options.method,
    expression: options.expression,
    intervalStart: parseIntegrationNumber(options.intervalStart),
    intervalEnd: parseIntegrationNumber(options.intervalEnd),
    subdivisions: Number(options.subdivisions),
    rombergLevels: Number(options.rombergLevels),
    gaussPoints: Number(options.gaussPoints),
    errorLimit: Number(options.errorLimit),
    sampleCount: options.sampleCount ?? 220,
  });
}

function IntegrationPlot({ result }: { result: IntegrationResult | null }) {
  if (!result) {
    return <CoordinatePlot ariaLabel="积分函数图像" emptyMessage="等待积分结果" series={[]} />;
  }

  return (
    <CoordinatePlot
      ariaLabel="积分函数图像"
      emptyMessage="等待积分结果"
      includeZeroY
      series={[
        {
          id: "integrand",
          label: "f(x)",
          color: "#ea580c",
          points: result.samples,
          width: 2.6,
          fillToZero: true,
        },
      ]}
      markers={result.nodes.slice(0, 80).map((node, index) => ({
        id: `integration-node-${index}`,
        x: node.x,
        y: node.fx,
        color: "#0f172a",
        radius: 3.2,
      }))}
    />
  );
}

function buildReliability(result: IntegrationResult | null): ReliabilityItem[] {
  if (!result) {
    return [
      {
        label: "等待计算",
        tone: "info",
        detail: "计算后会根据误差估计、节点规模和方法适用性评估结果可信度。",
      },
    ];
  }

  const items: ReliabilityItem[] = [
    {
      label: "数值结果",
      tone: Number.isFinite(result.value) ? "success" : "error",
      detail: `积分值为 ${formatIntegrationNumber(result.value)}。`,
    },
    {
      label: "误差估计",
      tone:
        result.errorEstimate === null || result.errorEstimate === undefined
          ? "info"
          : result.errorEstimate < 1e-8
            ? "success"
            : result.errorEstimate < 1e-4
              ? "warning"
              : "error",
      detail:
        result.errorEstimate === null || result.errorEstimate === undefined
          ? "当前方法没有内置误差估计，可通过参数扫描或方法对比判断稳定性。"
          : `误差估计为 ${formatIntegrationNumber(result.errorEstimate)}。`,
    },
  ];

  if (result.method === "simpson") {
    items.push({
      label: "方法条件",
      tone: "info",
      detail: "复化 Simpson 需要偶数等分；若输入为奇数，系统会自动加 1。",
    });
  }

  if (result.method === "gaussLegendre") {
    items.push({
      label: "采样策略",
      tone: "info",
      detail: "Gauss-Legendre 对光滑函数通常很高效，但不直接复用等距节点。",
    });
  }

  return items;
}

export function IntegrationPanel() {
  const [method, setMethod] = useState<IntegrationMethod>("simpson");
  const [expression, setExpression] = useState("sin(x)");
  const [intervalStart, setIntervalStart] = useState("0");
  const [intervalEnd, setIntervalEnd] = useState("pi");
  const [subdivisions, setSubdivisions] = useState("20");
  const [rombergLevels, setRombergLevels] = useState("5");
  const [gaussPoints, setGaussPoints] = useState("8");
  const [errorLimit, setErrorLimit] = useState("");
  const [result, setResult] = useState<IntegrationResult | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [comparisonRows, setComparisonRows] = useState<ComparisonRow[]>([]);
  const [scanRows, setScanRows] = useState<ScanRow[]>([]);

  const currentOptions = {
    method,
    expression,
    intervalStart,
    intervalEnd,
    subdivisions,
    rombergLevels,
    gaussPoints,
    errorLimit,
  };

  const compute = () => {
    try {
      const next = solveSafely(currentOptions);
      setResult(next);
      setFeedback({ tone: "success", text: "积分计算完成" });
    } catch (error) {
      setResult(null);
      setFeedback({
        tone: "error",
        text: error instanceof Error ? error.message : "积分计算失败",
      });
    }
  };

  const applyCase = (caseId: string) => {
    if (caseId === "smooth-sine") {
      setExpression("sin(x)");
      setIntervalStart("0");
      setIntervalEnd("pi");
      setSubdivisions("20");
      setErrorLimit("");
      setMethod("simpson");
    } else if (caseId === "oscillation") {
      setExpression("sin(20*x)");
      setIntervalStart("0");
      setIntervalEnd("pi");
      setSubdivisions("80");
      setErrorLimit("");
      setMethod("simpson");
    } else {
      setExpression("sqrt(x)");
      setIntervalStart("0");
      setIntervalEnd("1");
      setSubdivisions("40");
      setErrorLimit("");
      setMethod("romberg");
    }
    setResult(null);
    setComparisonRows([]);
    setScanRows([]);
  };

  const runComparison = () => {
    const methods: IntegrationMethod[] = ["trapezoid", "simpson", "romberg", "gaussLegendre"];
    setComparisonRows(
      methods.map((item) => {
        try {
          const solved = solveSafely({ ...currentOptions, method: item });
          return {
            method: methodLabel(item),
            value: formatIntegrationNumber(solved.value),
            metric: formatIntegrationNumber(solved.errorEstimate),
            cost: `${solved.subdivisions} 节点/规模`,
            tone: solved.errorEstimate === null || solved.errorEstimate === undefined || solved.errorEstimate < 1e-6 ? "success" : "warning",
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

  const runSubdivisionScan = () => {
    const values = [4, 8, 16, 32, 64, 128];
    setScanRows(
      values.map((n) => {
        try {
          const solved = solveSafely({
            ...currentOptions,
            method: method === "romberg" || method === "gaussLegendre" ? "simpson" : method,
            subdivisions: `${n}`,
          });
          return {
            parameter: "n",
            value: `${n}`,
            metric: `I=${formatIntegrationNumber(solved.value)}`,
            tone: "success",
            note: solved.errorEstimate === null || solved.errorEstimate === undefined
              ? "完成"
              : `err≈${formatIntegrationNumber(solved.errorEstimate)}`,
          } satisfies ScanRow;
        } catch (error) {
          return {
            parameter: "n",
            value: `${n}`,
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
            <button type="button" onClick={runSubdivisionScan} className="step-control justify-center">
              等分扫描
            </button>
          </div>
        </div>
      </ModuleSidebarPortal>

      <ModuleSidebarPortal tab="params">
        <div className="studio-card space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <ChartArea size={18} />
              积分参数
            </h2>
            <button type="button" onClick={compute} className="studio-primary-btn inline-flex items-center gap-2">
              <Play size={14} />
              计算
            </button>
          </div>

          <div className="grid gap-3">
            <label className="space-y-1 text-sm font-medium text-slate-700">
              f(x)
              <input value={expression} onChange={(event) => setExpression(event.target.value)} className="studio-input font-mono" />
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700">
              方法
              <select value={method} onChange={(event) => setMethod(event.target.value as IntegrationMethod)} className="studio-select w-full">
                {METHOD_OPTIONS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1 text-sm font-medium text-slate-700">
                区间左端 a
                <input value={intervalStart} onChange={(event) => setIntervalStart(event.target.value)} className="studio-input font-mono" />
              </label>
              <label className="space-y-1 text-sm font-medium text-slate-700">
                区间右端 b
                <input value={intervalEnd} onChange={(event) => setIntervalEnd(event.target.value)} className="studio-input font-mono" />
              </label>
            </div>
            <label className="space-y-1 text-sm font-medium text-slate-700">
              等分数 n
              <input
                value={subdivisions}
                onChange={(event) => setSubdivisions(event.target.value)}
                disabled={method === "romberg" || method === "gaussLegendre"}
                className="studio-input font-mono disabled:bg-slate-100 disabled:text-slate-400"
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700">
              Romberg 层数
              <input
                value={rombergLevels}
                onChange={(event) => setRombergLevels(event.target.value)}
                disabled={method !== "romberg"}
                className="studio-input font-mono disabled:bg-slate-100 disabled:text-slate-400"
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700">
              Gauss 点数
              <input
                value={gaussPoints}
                onChange={(event) => setGaussPoints(event.target.value)}
                disabled={method !== "gaussLegendre"}
                className="studio-input font-mono disabled:bg-slate-100 disabled:text-slate-400"
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700">
              可选误差限 ε
              <input
                value={errorLimit}
                onChange={(event) => setErrorLimit(event.target.value)}
                disabled={method !== "romberg"}
                placeholder="留空则按层数计算"
                className="studio-input font-mono disabled:bg-slate-100 disabled:text-slate-400"
                aria-label="误差限"
              />
            </label>
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
          module="integration"
          defaultName="数值积分实验"
          summary={result ? `${methodLabel(result.method)}: ${formatIntegrationNumber(result.value)}` : "数值积分配置"}
          payload={{ method, expression, intervalStart, intervalEnd, subdivisions, rombergLevels, gaussPoints, errorLimit, result, comparisonRows, scanRows }}
          disabled={!result && comparisonRows.length === 0 && scanRows.length === 0}
        />
      </ModuleSidebarPortal>

      <div className="workspace-container">
        <section className="space-y-6">
          <div className="studio-card space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <ChartArea size={18} />
                函数图像与积分区域
              </h2>
              <div className="text-xs text-slate-500">阴影为积分区间内的有向面积</div>
            </div>
            <IntegrationPlot result={result} />
          </div>

          <MethodComparisonTable rows={comparisonRows} />
          <ParameterScanTable title="等分数扫描" rows={scanRows} />

          <div className="studio-card space-y-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <Calculator size={18} />
              结果
            </h2>
            {result ? (
              <div className="space-y-3 text-sm text-slate-700">
                <div className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs">
                  <div>方法：{methodLabel(result.method)}</div>
                  <div>区间：[{formatIntegrationNumber(result.interval[0])}, {formatIntegrationNumber(result.interval[1])}]</div>
                  <div>积分值：<span className="font-mono">{formatIntegrationNumber(result.value)}</span></div>
                  <div>节点/等分规模：{result.subdivisions}</div>
                  <div>误差估计：<span className="font-mono">{formatIntegrationNumber(result.errorEstimate)}</span></div>
                  {result.method === "romberg" ? (
                    <div>
                      收敛控制：
                      <span className="font-mono">
                        {formatRombergConvergence(result)}
                      </span>
                    </div>
                  ) : null}
                </div>
                {result.message ? (
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                    {result.message}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500">
                在左侧“参数”中点击计算后显示积分值和过程数据。
              </div>
            )}
          </div>

          {result?.table ? (
            <div className="studio-card space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">Romberg 表</h2>
              <div className="max-h-[360px] overflow-auto rounded-2xl border border-slate-200">
                <table className="w-full min-w-[520px] text-left text-xs">
                  <tbody className="divide-y divide-slate-100 bg-white font-mono">
                    {result.table.map((row) => (
                      <tr key={`romberg-${row.level}`}>
                        <td className="bg-slate-50 px-3 py-2 text-slate-500">{row.level}</td>
                        {row.values.map((value, index) => (
                          <td key={`romberg-${row.level}-${index}`} className="px-3 py-2">
                            {formatIntegrationNumber(value)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {result?.sequence?.length ? (
            <div className="studio-card space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">外推序列</h2>
              <div className="max-h-[360px] overflow-auto rounded-2xl border border-slate-200">
                <table className="w-full min-w-[720px] text-left text-xs">
                  <thead className="sticky top-0 bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-3 py-2">n</th>
                      <th className="px-3 py-2">T_n</th>
                      <th className="px-3 py-2">S_n</th>
                      <th className="px-3 py-2">C_n</th>
                      <th className="px-3 py-2">R_n</th>
                      <th className="px-3 py-2">误差</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white font-mono">
                    {result.sequence.map((row) => (
                      <tr key={`integration-sequence-${row.level}`}>
                        <td className="bg-slate-50 px-3 py-2 text-slate-500">{row.n}</td>
                        <td className="px-3 py-2">{formatIntegrationNumber(row.Tn)}</td>
                        <td className="px-3 py-2">{formatIntegrationNumber(row.Sn)}</td>
                        <td className="px-3 py-2">{formatIntegrationNumber(row.Cn)}</td>
                        <td className="px-3 py-2">{formatIntegrationNumber(row.Rn)}</td>
                        <td className="px-3 py-2">{formatIntegrationNumber(row.error)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {result?.nodes.length ? (
            <div className="studio-card space-y-4">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <Table2 size={18} />
                节点表
              </h2>
              <div className="max-h-[440px] overflow-auto rounded-2xl border border-slate-200">
                <table className="w-full min-w-[520px] text-left text-xs">
                  <thead className="sticky top-0 bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-3 py-2">x</th>
                      <th className="px-3 py-2">w</th>
                      <th className="px-3 py-2">f(x)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white font-mono">
                    {result.nodes.map((node, index) => (
                      <tr key={`${node.x}-${index}`}>
                        <td className="px-3 py-2">{formatIntegrationNumber(node.x)}</td>
                        <td className="px-3 py-2">{formatIntegrationNumber(node.weight)}</td>
                        <td className="px-3 py-2">{formatIntegrationNumber(node.fx)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </>
  );
}
