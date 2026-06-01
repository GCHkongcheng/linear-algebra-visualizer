"use client";

import { useMemo } from "react";

import { MatrixGrid } from "@/components/matrix/MatrixGrid";
import {
  eigsWithMathjs,
  relativeEigenError,
} from "@/lib/matrix-eigen";
import {
  analyzeConditionNumbers,
  perturbNumericMatrix,
  perturbNumericVector,
  relativeMatrixErrorInfinity,
  relativeVectorErrorInfinity,
} from "@/lib/matrix-error-analysis";
import { normalizeMatrixInput, toNumericMatrix } from "@/lib/matrix-basic";
import { toInputMatrix } from "@/lib/matrix-format";
import { solveNumericLinearSystem } from "@/lib/matrix-linear-system";
import type { DisplayMode, ResultTone } from "@/types/matrix";
import type {
  EigenPerturbationResult,
  PerturbationTarget,
} from "@/types/workbench";

function formatMetric(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "N/A";
  if (Math.abs(value) >= 1e4 || (Math.abs(value) > 0 && Math.abs(value) < 1e-4)) {
    return value.toExponential(3);
  }
  return value.toFixed(8).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}

type ErrorAnalysisModuleProps = {
  // 共享状态（与 EigenAnalysisModule 共用 eigMatrix/eigVectorB）
  size: number;
  matrix: string[][];
  vectorB: string[];
  perturbationResult: EigenPerturbationResult | null;
  onSizeChange: (size: number) => void;
  onMatrixChange: (r: number, c: number, value: string) => void;
  onMatrixPaste: (r: number, c: number, text: string) => void;
  onVectorBChange: (idx: number, value: string) => void;
  onPerturbationResultChange: (result: EigenPerturbationResult | null) => void;
  // UI 配置
  sizeOptions: number[];
  displayMode: DisplayMode;
  onToast: (tone: ResultTone, title: string, message: string) => void;
};

export function ErrorAnalysisModule({
  size,
  matrix,
  vectorB,
  perturbationResult,
  onSizeChange,
  onMatrixChange,
  onMatrixPaste,
  onVectorBChange,
  onPerturbationResultChange,
  sizeOptions,
  displayMode,
  onToast,
}: ErrorAnalysisModuleProps) {
  const eigenCondition = useMemo(() => {
    const normalized = normalizeMatrixInput(matrix);
    const numeric = toNumericMatrix(normalized);
    if (!numeric) return null;
    return analyzeConditionNumbers(numeric);
  }, [matrix]);

  const handleSizeChange = (next: number) => {
    onSizeChange(next);
    onPerturbationResultChange(null);
  };

  const handleCellChange = (r: number, c: number, value: string) => {
    onMatrixChange(r, c, value);
    onPerturbationResultChange(null);
  };

  const handlePaste = (r: number, c: number, text: string) => {
    onMatrixPaste(r, c, text);
    onPerturbationResultChange(null);
  };

  const runPerturbationTest = (target: PerturbationTarget) => {
    const epsilon = 1e-6;
    const normalizedA = normalizeMatrixInput(matrix);
    const numericA = toNumericMatrix(normalizedA);
    if (!numericA) {
      onPerturbationResultChange(null);
      onToast("error", "扰动实验", "矩阵 A 需要纯数值输入。");
      return;
    }

    const numericBCol = toNumericMatrix(vectorB.map((v) => [v]));
    if (!numericBCol) {
      onPerturbationResultChange(null);
      onToast("error", "扰动实验", "向量 b 需要纯数值输入。");
      return;
    }
    const numericB = numericBCol.map((row) => row[0]);

    const baselineEigen = eigsWithMathjs(numericA);
    if (!baselineEigen) {
      onPerturbationResultChange(null);
      onToast("error", "扰动实验", "基线特征值计算失败，无法进行扰动对比。");
      return;
    }

    const perturbedA = target === "A" ? perturbNumericMatrix(numericA, epsilon) : numericA.map((row) => row.slice());
    if (!perturbedA) {
      onPerturbationResultChange(null);
      onToast("error", "扰动实验", "矩阵扰动生成失败。");
      return;
    }

    const perturbedB = target === "b" ? perturbNumericVector(numericB, epsilon) : numericB.slice();
    if (!perturbedB) {
      onPerturbationResultChange(null);
      onToast("error", "扰动实验", "向量扰动生成失败。");
      return;
    }

    const perturbedEigen = eigsWithMathjs(perturbedA);
    const baselineSolution = solveNumericLinearSystem(numericA, numericB);
    const perturbedSolution = solveNumericLinearSystem(perturbedA, perturbedB);

    onPerturbationResultChange({
      target,
      epsilon,
      matrixRelativeError: relativeMatrixErrorInfinity(numericA, perturbedA),
      vectorRelativeError: relativeVectorErrorInfinity(numericB, perturbedB),
      eigenRelativeError: perturbedEigen
        ? relativeEigenError(baselineEigen.values, perturbedEigen.values)
        : null,
      solutionRelativeError:
        baselineSolution && perturbedSolution
          ? relativeVectorErrorInfinity(baselineSolution, perturbedSolution)
          : null,
      baselineSolution: baselineSolution ? toInputMatrix([baselineSolution])[0] : null,
      perturbedSolution: perturbedSolution ? toInputMatrix([perturbedSolution])[0] : null,
    });
    onToast("success", "扰动实验", target === "A" ? "已完成 A 的随机扰动实验。" : "已完成 b 的随机扰动实验。");
  };

  return (
    <div className="workspace-container">
      <div className="workspace-grid">
        <section className="space-y-6">
          <div className="studio-card space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900">误差分析</h2>
              <div className="flex items-center gap-2 text-sm">
                维度
                <select
                  value={size}
                  onChange={(e) => handleSizeChange(Number(e.target.value))}
                  className="studio-select"
                >
                  {sizeOptions.map((s) => (
                    <option key={`error-${s}`} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
            <MatrixGrid
              matrix={matrix.map((row) => row.map((v) => v || "0"))}
              inputMatrix={matrix}
              editable
              displayMode={displayMode}
              onChange={handleCellChange}
              onPasteMatrix={handlePaste}
            />
          </div>
        </section>

        <aside className="space-y-6">
          <div className="studio-card space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">条件数分析</h2>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              {eigenCondition ? (
                <div className="space-y-1 text-xs text-slate-600">
                  <div>||A||₁ = {formatMetric(eigenCondition.norm1)}</div>
                  <div>||A||∞ = {formatMetric(eigenCondition.normInf)}</div>
                  <div>cond₁(A) = {formatMetric(eigenCondition.cond1)}</div>
                  <div>cond∞(A) = {formatMetric(eigenCondition.condInf)}</div>
                  {!eigenCondition.invertible ? (
                    <div className="text-amber-700">
                      当前矩阵不可逆，条件数视为无穷大（不稳定）。
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="text-xs text-slate-500">
                  当前输入不是合法数值方阵，暂时无法计算条件数。
                </div>
              )}
            </div>
          </div>

          <div className="studio-card space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">扰动实验（ε = 10^-6）</h2>
            <p className="text-xs text-slate-600">
              可在 A 或 b 上施加随机微扰，比较特征值与解向量变化的相对误差。
            </p>

            <div>
              <div className="mb-2 text-xs font-semibold tracking-wide text-slate-600">
                线性系统向量 b（用于 Ax=b 的灵敏度对比）
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {vectorB.map((value, idx) => (
                  <label key={`eig-b-${idx}`} className="flex items-center gap-2 text-xs text-slate-600">
                    b{idx + 1}
                    <input
                      value={value}
                      onChange={(e) => {
                        onVectorBChange(idx, e.target.value);
                        onPerturbationResultChange(null);
                      }}
                      className="studio-input"
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button onClick={() => runPerturbationTest("A")} className="studio-primary-btn">
                随机扰动 A
              </button>
              <button onClick={() => runPerturbationTest("b")} className="studio-primary-btn">
                随机扰动 b
              </button>
            </div>

            {perturbationResult ? (
              <div className="space-y-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-700">
                <div>本次扰动对象：{perturbationResult.target}，ε = {perturbationResult.epsilon.toExponential(0)}</div>
                <div>相对扰动 ||ΔA||∞ / ||A||∞ = {formatMetric(perturbationResult.matrixRelativeError)}</div>
                <div>相对扰动 ||Δb||∞ / ||b||∞ = {formatMetric(perturbationResult.vectorRelativeError)}</div>
                <div>特征值相对误差 max|Δλ|/max|λ| = {formatMetric(perturbationResult.eigenRelativeError)}</div>
                <div>解向量相对误差 ||Δx||∞ / ||x||∞ = {formatMetric(perturbationResult.solutionRelativeError)}</div>
                {perturbationResult.baselineSolution && perturbationResult.perturbedSolution ? (
                  <>
                    <div className="pt-1 text-slate-600">
                      原始解 x = [{perturbationResult.baselineSolution.join(", ")}]
                    </div>
                    <div className="text-slate-600">
                      扰动后解 x̃ = [{perturbationResult.perturbedSolution.join(", ")}]
                    </div>
                  </>
                ) : (
                  <div className="pt-1 text-amber-700">
                    由于 A 不可逆或接近奇异，无法稳定求解 Ax=b 的误差对比。
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
