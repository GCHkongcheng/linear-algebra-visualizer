"use client";

import {
  Braces,
  Calculator,
  CircleHelp,
  FunctionSquare,
  SplitSquareVertical,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { MatrixGrid } from "@/components/matrix/MatrixGrid";
import { MatrixShelf } from "@/components/matrix/MatrixShelf";
import { OperationButtonGroup } from "@/components/matrix/OperationButtonGroup";
import { ToastHost, type ToastItem } from "@/components/matrix/ToastHost";
import { SaveToLibraryButton } from "@/components/matrix/SaveToLibraryButton";
import { StepCard } from "@/components/matrix/StepCard";
import { useMatrix } from "@/hooks/useMatrix";
import {
  applyPaste,
  choleskyDecomposition,
  choleskyResidual,
  determinant,
  eigsWithMathjs,
  luDecomposition,
  luResidual,
  normalizeMatrixInput,
  qrDecomposition,
  qrOrthogonalityResidual,
  qrResidual,
  resizeInputMatrix,
  toInputMatrix,
  toNumericMatrix,
} from "@/lib/matrix-core";
import type {
  CholeskyResult,
  DisplayMode,
  EigenAnalysisResult,
  LinearSystemMethod,
  LUResult,
  QRResult,
  ResultTone,
} from "@/types/matrix";
import {
  type ActiveContext,
  type MatrixKind,
  suggestNameForContext,
  useMatrixLibraryStore,
} from "@/store/matrix-library";

type TabId = "operations" | "system" | "determinant" | "decomposition" | "eigen";
type DecompositionMode = "lu" | "qr" | "cholesky";

type Feedback = {
  tone: ResultTone;
  text: string;
};

type DecompositionResult =
  | {
      mode: "lu";
      decomposition: LUResult;
      residual: number | null;
      threshold: number;
      passed: boolean | null;
    }
  | {
      mode: "qr";
      decomposition: QRResult;
      residual: number | null;
      orthResidual: number | null;
      threshold: number;
      passed: boolean;
    }
  | {
      mode: "cholesky";
      decomposition: CholeskyResult;
      residual: number | null;
      threshold: number;
      passed: boolean;
    };

const RESIDUAL_THRESHOLD = 1e-10;

const OPERATION_OPTIONS = [
  { id: "add", label: "A + B" },
  { id: "subtract", label: "A - B" },
  { id: "multiply", label: "A * B" },
  { id: "inverse", label: "A^-1" },
  { id: "rank", label: "\u79e9" },
  { id: "determinant", label: "\u884c\u5217\u5f0f" },
  { id: "transpose", label: "转置" },
  { id: "simplify", label: "RREF" },
  { id: "scalar", label: "数乘" },
  { id: "square", label: "A^2" },
] as const;

const DEFAULT_SQUARE = toInputMatrix([
  [2, 1, -1],
  [-3, -1, 2],
  [-2, 1, 2],
]);

const DECOMPOSITION_OPTIONS: Array<{ id: DecompositionMode; label: string }> = [
  { id: "lu", label: "LU（带主元）" },
  { id: "qr", label: "QR（Householder）" },
  { id: "cholesky", label: "Cholesky分解" },
];

const SYSTEM_METHOD_OPTIONS: Array<{ id: LinearSystemMethod; label: string }> = [
  { id: "gaussianElimination", label: "高斯消元" },
  { id: "gaussJordan", label: "高斯-约旦" },
  { id: "jacobi", label: "Jacobi迭代" },
  { id: "gaussSeidel", label: "Gauss-Seidel迭代" },
  { id: "sor", label: "SOR迭代" },
  { id: "conjugateGradient", label: "共轭梯度法" },
];

function isIterativeSystemMethod(method: LinearSystemMethod): boolean {
  return (
    method === "jacobi" ||
    method === "gaussSeidel" ||
    method === "sor" ||
    method === "conjugateGradient"
  );
}

function formatResidual(value: number): string {
  if (!Number.isFinite(value)) return "N/A";
  return value.toExponential(3);
}

function formatSpectralRadius(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "N/A";
  return value.toFixed(6).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}

function cloneMatrixValues(matrix: string[][]): string[][] {
  return matrix.map((row) => row.map((value) => value || "0"));
}

function DisplayModeSwitcher({
  displayMode,
  onChange,
}: {
  displayMode: DisplayMode;
  onChange: (mode: DisplayMode) => void;
}) {
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

export default function Home() {
  const matrix = useMatrix();
  const [activeTab, setActiveTab] = useState<TabId>("operations");

  const [detSize, setDetSize] = useState(3);
  const [detMatrix, setDetMatrix] = useState<string[][]>(
    resizeInputMatrix(DEFAULT_SQUARE, 3, 3, "0")
  );
  const [detResult, setDetResult] = useState<string | null>(null);
  const [detFeedback, setDetFeedback] = useState<Feedback | null>(null);

  const [decompMode, setDecompMode] = useState<DecompositionMode>("lu");
  const [decompRows, setDecompRows] = useState(3);
  const [decompCols, setDecompCols] = useState(3);
  const [decompMatrix, setDecompMatrix] = useState<string[][]>(
    resizeInputMatrix(DEFAULT_SQUARE, 3, 3, "0")
  );
  const [decompResult, setDecompResult] = useState<DecompositionResult | null>(null);
  const [decompFeedback, setDecompFeedback] = useState<Feedback | null>(null);

  const [eigSize, setEigSize] = useState(3);
  const [eigMatrix, setEigMatrix] = useState<string[][]>(
    resizeInputMatrix(DEFAULT_SQUARE, 3, 3, "0")
  );
  const [eigResult, setEigResult] = useState<EigenAnalysisResult | null>(null);
  const [eigFeedback, setEigFeedback] = useState<Feedback | null>(null);

  const matrixInventory = useMatrixLibraryStore((state) => state.matrixInventory);
  const activeMatrixId = useMatrixLibraryStore((state) => state.activeMatrixId);
  const renameInventoryMatrix = useMatrixLibraryStore((state) => state.renameMatrix);
  const deleteInventoryMatrix = useMatrixLibraryStore((state) => state.deleteMatrix);
  const addInventoryMatrix = useMatrixLibraryStore((state) => state.addMatrix);
  const setInventoryActiveMatrix = useMatrixLibraryStore((state) => state.setActiveMatrix);
  const saveCurrentResultToLibrary = useMatrixLibraryStore(
    (state) => state.saveCurrentResultToLibrary
  );
  const [activeOperationTarget, setActiveOperationTarget] = useState<"A" | "B">("A");

  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastSeqRef = useRef(0);
  const toastTimersRef = useRef<Map<number, number>>(new Map());
  const toastGroupRef = useRef<Map<string, number>>(new Map());

  const dismissToast = useCallback((id: number) => {
    const timer = toastTimersRef.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      toastTimersRef.current.delete(id);
    }

    setToasts((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) {
        const groupedId = toastGroupRef.current.get(target.title);
        if (groupedId === id) {
          toastGroupRef.current.delete(target.title);
        }
      }
      return prev.filter((item) => item.id !== id);
    });
  }, []);

  const pushToast = useCallback(
    (payload: Omit<ToastItem, "id">) => {
      const existingId = toastGroupRef.current.get(payload.title);

      if (existingId !== undefined) {
        const timer = toastTimersRef.current.get(existingId);
        if (timer !== undefined) {
          window.clearTimeout(timer);
        }

        setToasts((prev) =>
          prev.map((item) =>
            item.id === existingId ? { id: existingId, ...payload } : item
          )
        );

        const nextTimer = window.setTimeout(() => {
          dismissToast(existingId);
        }, 3600);
        toastTimersRef.current.set(existingId, nextTimer);
        return;
      }

      const id = Date.now() + toastSeqRef.current;
      toastSeqRef.current += 1;

      toastGroupRef.current.set(payload.title, id);
      setToasts((prev) => [...prev, { id, ...payload }]);

      const timer = window.setTimeout(() => {
        dismissToast(id);
      }, 3600);
      toastTimersRef.current.set(id, timer);
    },
    [dismissToast]
  );

  useEffect(() => {
    const timerMap = toastTimersRef.current;
    const groupMap = toastGroupRef.current;

    return () => {
      timerMap.forEach((timer) => window.clearTimeout(timer));
      timerMap.clear();
      groupMap.clear();
    };
  }, []);

  const tabs = useMemo(
    () => [
      { id: "operations", label: "矩阵运算", icon: Calculator },
      { id: "system", label: "线性方程组", icon: Braces },
      { id: "decomposition", label: "矩阵分解", icon: SplitSquareVertical },
      { id: "eigen", label: "特征分析", icon: FunctionSquare },
    ],
    []
  );

  const computeDeterminant = () => {
    const normalized = normalizeMatrixInput(detMatrix);
    if (normalized.length !== normalized[0].length) {
      setDetResult(null);
      setDetFeedback({ tone: "error", text: "行列式计算要求方阵" });
      return;
    }
    setDetResult(determinant(normalized));
    setDetFeedback({ tone: "success", text: "det(A) 计算完成" });
  };

  const computeDecomposition = () => {
    const normalized = normalizeMatrixInput(decompMatrix);
    if (decompMode !== "qr" && decompRows !== decompCols) {
      setDecompResult(null);
      setDecompFeedback({ tone: "error", text: "LU/Cholesky 需要方阵" });
      return;
    }

    if (decompMode === "lu") {
      const decomposition = luDecomposition(normalized);
      if (!decomposition) {
        setDecompResult(null);
        setDecompFeedback({ tone: "error", text: "LU 分解失败" });
        return;
      }
      const residual = luResidual(normalized, decomposition);
      const passed = residual === null ? null : residual < RESIDUAL_THRESHOLD;
      setDecompResult({ mode: "lu", decomposition, residual, threshold: RESIDUAL_THRESHOLD, passed });
      setDecompFeedback({ tone: passed === false ? "warning" : "success", text: "LU 分解完成" });
      return;
    }

    if (decompMode === "qr") {
      const decomposition = qrDecomposition(normalized);
      if (!decomposition) {
        setDecompResult(null);
        setDecompFeedback({ tone: "error", text: "QR 需要纯数值输入" });
        return;
      }
      const residual = qrResidual(normalized, decomposition);
      const orthResidual = qrOrthogonalityResidual(decomposition);
      const passed =
        residual !== null &&
        orthResidual !== null &&
        residual < RESIDUAL_THRESHOLD &&
        orthResidual < RESIDUAL_THRESHOLD;
      setDecompResult({
        mode: "qr",
        decomposition,
        residual,
        orthResidual,
        threshold: RESIDUAL_THRESHOLD,
        passed,
      });
      setDecompFeedback({ tone: passed ? "success" : "warning", text: "QR 分解完成" });
      return;
    }

    const decomposition = choleskyDecomposition(normalized);
    if (!decomposition) {
      setDecompResult(null);
      setDecompFeedback({ tone: "error", text: "Cholesky 需要对称正定矩阵" });
      return;
    }
    const residual = choleskyResidual(normalized, decomposition);
    const passed = residual !== null && residual < RESIDUAL_THRESHOLD;
    setDecompResult({ mode: "cholesky", decomposition, residual, threshold: RESIDUAL_THRESHOLD, passed });
    setDecompFeedback({ tone: passed ? "success" : "warning", text: "Cholesky 分解完成" });
  };

  const computeEigen = () => {
    const normalized = normalizeMatrixInput(eigMatrix);
    const numeric = toNumericMatrix(normalized);
    if (!numeric) {
      setEigResult(null);
      setEigFeedback({ tone: "error", text: "特征分析需要纯数值输入" });
      return;
    }
    const result = eigsWithMathjs(numeric);
    if (!result) {
      setEigResult(null);
      setEigFeedback({ tone: "error", text: "特征分析计算失败" });
      return;
    }
    setEigResult(result);
    if (!result.diagonalizable) {
      setEigFeedback({ tone: "warning", text: "该矩阵不可对角化" });
      return;
    }
    setEigFeedback({ tone: "success", text: "特征分析完成" });
  };
  const activeLibraryContext = useMemo<ActiveContext>(() => {
    if (activeTab === "operations") return "matrix-operations";
    if (activeTab === "system") return "linear-system";
    if (activeTab === "determinant") return "determinant";
    if (activeTab === "decomposition") return "decomposition";
    return "eigen";
  }, [activeTab]);

  const inferMatrixKindByContext = (context: ActiveContext): MatrixKind =>
    context === "linear-system" ? "augmented" : "standard";

  const loadMatrixToOperationsA = (matrixData: string[][]) => {
    matrix.operations.setMatrixA(cloneMatrixValues(matrixData));
    setActiveOperationTarget("A");
  };

  const loadMatrixToOperationsB = (matrixData: string[][]) => {
    matrix.operations.setMatrixB(cloneMatrixValues(matrixData));
    setActiveOperationTarget("B");
  };

  const loadMatrixToContext = (
    matrixData: string[][],
    context: ActiveContext = activeLibraryContext
  ) => {
    const copied = cloneMatrixValues(matrixData);

    if (context === "matrix-operations") {
      if (activeOperationTarget === "B") {
        loadMatrixToOperationsB(copied);
        return;
      }
      loadMatrixToOperationsA(copied);
      return;
    }

    if (context === "linear-system") {
      if ((copied[0]?.length ?? 0) < 2) return;
      matrix.system.setAugmentedMatrix(copied);
      return;
    }

    if (context === "determinant") {
      const size = Math.max(copied.length, copied[0]?.length ?? 1);
      setDetSize(size);
      setDetMatrix(resizeInputMatrix(copied, size, size, "0"));
      return;
    }

    if (context === "eigen") {
      const size = Math.max(copied.length, copied[0]?.length ?? 1);
      setEigSize(size);
      setEigMatrix(resizeInputMatrix(copied, size, size, "0"));
      return;
    }

    if (context === "decomposition") {
      if (decompMode === "qr" || copied.length !== copied[0]?.length) {
        const rows = Math.max(1, copied.length);
        const cols = Math.max(1, copied[0]?.length ?? 1);
        setDecompRows(rows);
        setDecompCols(cols);
        setDecompMatrix(resizeInputMatrix(copied, rows, cols, "0"));
        return;
      }

      const size = Math.max(copied.length, copied[0]?.length ?? 1);
      setDecompRows(size);
      setDecompCols(size);
      setDecompMatrix(resizeInputMatrix(copied, size, size, "0"));
    }
  };

  const saveMatrixWithName = (
    rawMatrix: string[][] | null,
    preferredName: string,
    context: ActiveContext,
    type?: MatrixKind
  ) => {
    saveCurrentResultToLibrary(
      rawMatrix,
      context,
      type ?? inferMatrixKindByContext(context),
      preferredName
    );
  };

  const handleActivateInventoryMatrix = (item: {
    id: string;
    data: string[][];
    type: MatrixKind;
  }) => {
    setInventoryActiveMatrix(item.id, activeLibraryContext);
    loadMatrixToContext(item.data, activeLibraryContext);
  };

  const handleSmartImportMatrix = (payload: {
    name: string;
    data: string[][];
    type: MatrixKind;
  }) => {
    const created = addInventoryMatrix({
      name: payload.name,
      data: payload.data,
      type: payload.type,
    });

    if (!created) {
      pushToast({
        tone: "error",
        title: "智能识别",
        message: "识别矩阵保存失败，请检查矩阵是否为规则二维结构。",
      });
      return;
    }

    setInventoryActiveMatrix(created.id, activeLibraryContext);
    loadMatrixToContext(created.data, activeLibraryContext);
    pushToast({
      tone: "success",
      title: "智能识别",
      message: `已保存矩阵「${created.name}」并加载到当前模块。`,
    });
  };

  const handleSaveCurrentInputToLibrary = (name: string) => {
    const activeEditingMatrix =
      activeLibraryContext === "matrix-operations"
        ? activeOperationTarget === "B"
          ? matrix.operations.matrixB
          : matrix.operations.matrixA
        : activeLibraryContext === "linear-system"
          ? matrix.system.augmented
          : activeLibraryContext === "determinant"
            ? detMatrix
            : activeLibraryContext === "decomposition"
              ? decompMatrix
              : eigMatrix;

    saveMatrixWithName(
      activeEditingMatrix,
      name,
      activeLibraryContext,
      inferMatrixKindByContext(activeLibraryContext)
    );
  };

  const pasteDeterminantMatrix = (row: number, col: number, text: string) => {
    setDetMatrix((prev) => applyPaste(prev, row, col, text));
  };

  const pasteDecompositionMatrix = (row: number, col: number, text: string) => {
    setDecompMatrix((prev) => applyPaste(prev, row, col, text));
  };

  const pasteEigenMatrix = (row: number, col: number, text: string) => {
    setEigMatrix((prev) => applyPaste(prev, row, col, text));
  };

  const decompEvidence = useMemo(() => {
    if (!decompResult) return undefined;
    if (decompResult.mode === "lu") {
      return `P*A = L*U, maxAbs(PA-LU)=${decompResult.residual?.toExponential(3) ?? "N/A"}`;
    }
    if (decompResult.mode === "qr") {
      return `A=QR, maxAbs(A-QR)=${decompResult.residual?.toExponential(3) ?? "N/A"}, maxAbs(Q^TQ-I)=${decompResult.orthResidual?.toExponential(3) ?? "N/A"}`;
    }
    return `A=L*L^T, maxAbs(A-LL^T)=${decompResult.residual?.toExponential(3) ?? "N/A"}`;
  }, [decompResult]);

  const systemUsesIteration = isIterativeSystemMethod(matrix.system.method);
  const systemEvidence = matrix.system.iterativeResult
    ? `残差=${formatResidual(matrix.system.iterativeResult.residual)}，迭代次数=${matrix.system.iterativeResult.iterations}，ρ(B)=${formatSpectralRadius(matrix.system.iterativeResult.spectralRadius)}，判定=${matrix.system.iterativeResult.convergenceGuaranteed === true ? "ρ(B)<1，保证收敛" : matrix.system.iterativeResult.convergenceGuaranteed === false ? "ρ(B)≥1，不保证收敛" : "不适用/无法判定"}`
    : undefined;
  const systemResultMatrix =
    matrix.system.currentStep?.matrix ?? matrix.system.augmented;
  const decompPrimaryMatrix = useMemo(() => {
    if (!decompResult) return null;
    if (decompResult.mode === "lu") return decompResult.decomposition.L;
    if (decompResult.mode === "qr") return decompResult.decomposition.Q;
    return decompResult.decomposition.L;
  }, [decompResult]);

  useEffect(() => {
    if (!matrix.operations.feedback) return;
    pushToast({
      tone: matrix.operations.feedback.tone,
      title: "运算状态",
      message: matrix.operations.feedback.text,
    });
  }, [matrix.operations.feedback, pushToast]);

  useEffect(() => {
    if (!matrix.system.feedback) return;
    pushToast({
      tone: matrix.system.feedback.tone,
      title: "\u6c42\u89e3\u72b6\u6001",
      message: matrix.system.feedback.text,
      evidence: systemEvidence,
    });
  }, [matrix.system.feedback, systemEvidence, pushToast]);

  useEffect(() => {
    if (!detFeedback) return;
    pushToast({
      tone: detFeedback.tone,
      title: "行列式状态",
      message: detFeedback.text,
    });
  }, [detFeedback, pushToast]);

  useEffect(() => {
    if (!decompFeedback) return;
    pushToast({
      tone: decompFeedback.tone,
      title: "\u5206\u89e3\u72b6\u6001",
      message: decompFeedback.text,
      evidence: decompEvidence,
    });
  }, [decompFeedback, decompEvidence, pushToast]);

  useEffect(() => {
    if (!eigFeedback) return;
    pushToast({
      tone: eigFeedback.tone,
      title: "特征分析状态",
      message: eigFeedback.text,
    });
  }, [eigFeedback, pushToast]);

  return (
    <div className="min-h-screen px-6 py-10 text-[15px] text-slate-900">
      <header className="mx-auto w-full max-w-6xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-orange-700">
            线性代数工作室
          </div>
          <Link href="/about" className="step-control" aria-label="打开关于页面">
            <CircleHelp size={14} />
            关于页面
          </Link>
        </div>
        <h1 className="text-4xl font-semibold leading-tight text-slate-900 md:text-5xl">
          线性代数工作台
        </h1>
        <p className="max-w-3xl text-base text-slate-700">
          支持矩阵运算、线性方程组、矩阵分解与特征分析，并提供正确性校验。
        </p>
      </header>

      <div className="mx-auto mt-8 grid w-full max-w-6xl gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="studio-card h-fit space-y-4">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">导航</div>
          <div className="grid gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabId)}
                  className={`nav-tab ${activeTab === tab.id ? "nav-tab-active" : ""}`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>
          <DisplayModeSwitcher displayMode={matrix.displayMode} onChange={matrix.setDisplayMode} />

          <div className="rounded-2xl border border-slate-200 bg-white p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                当前输入
              </div>
              <SaveToLibraryButton
                defaultName={suggestNameForContext(matrixInventory, activeLibraryContext)}
                onSave={handleSaveCurrentInputToLibrary}
              />
            </div>
            <div className="mt-2 text-[11px] text-slate-500">
              {activeLibraryContext === "matrix-operations"
                ? `当前活动输入位：${activeOperationTarget}`
                : "可将当前编辑矩阵保存到矩阵库。"}
            </div>
          </div>
          <MatrixShelf
            items={matrixInventory}
            activeMatrixId={activeMatrixId}
            onActivate={handleActivateInventoryMatrix}
            onDelete={deleteInventoryMatrix}
            onRename={renameInventoryMatrix}
            onSmartImport={handleSmartImportMatrix}
          />
        </aside>

        <div>
          {activeTab === "operations" && (
            <div className="workspace-container">
              <div className="workspace-grid">
                <section className="space-y-6">
                  <div className="studio-card space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h2 className="text-lg font-semibold text-slate-900">矩阵输入</h2>
                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        <label className="flex items-center gap-2">
                          行数
                          <select
                            value={matrix.operations.rows}
                            onChange={(event) => matrix.operations.setDimensions(Number(event.target.value), matrix.operations.cols)}
                            className="studio-select"
                          >
                            {matrix.sizeOptions.map((size) => (
                              <option key={`ops-row-${size}`} value={size}>{size}</option>
                            ))}
                          </select>
                        </label>
                        <label className="flex items-center gap-2">
                          列数
                          <select
                            value={matrix.operations.cols}
                            onChange={(event) => matrix.operations.setDimensions(matrix.operations.rows, Number(event.target.value))}
                            className="studio-select"
                          >
                            {matrix.sizeOptions.map((size) => (
                              <option key={`ops-col-${size}`} value={size}>{size}</option>
                            ))}
                          </select>
                        </label>
                      </div>
                    </div>

                    <MatrixGrid
                      matrix={matrix.operations.matrixA.map((row) => row.map((value) => value || "0"))}
                      inputMatrix={matrix.operations.matrixA}
                      editable
                      displayMode={matrix.displayMode}
                      onChange={matrix.operations.setCellA}
                      onPasteMatrix={matrix.operations.pasteA}
                      onCellFocus={() => setActiveOperationTarget("A")}
                    />

                    {(matrix.operations.operation === "add" || matrix.operations.operation === "subtract" || matrix.operations.operation === "multiply") && (
                      <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                          <div className="font-semibold text-slate-700">矩阵 B</div>
                          {matrix.operations.operation === "multiply" ? (
                            <div className="flex flex-wrap items-center gap-2">
                              <label className="flex items-center gap-1">行数
                                <select
                                  value={matrix.operations.bRows}
                                  onChange={(event) => matrix.operations.setBMatrixDimensions(Number(event.target.value), matrix.operations.bCols)}
                                  className="studio-select"
                                >
                                  {matrix.sizeOptions.map((size) => (
                                    <option key={`ops-b-row-${size}`} value={size}>{size}</option>
                                  ))}
                                </select>
                              </label>
                              <label className="flex items-center gap-1">列数
                                <select
                                  value={matrix.operations.bCols}
                                  onChange={(event) => matrix.operations.setBMatrixDimensions(matrix.operations.bRows, Number(event.target.value))}
                                  className="studio-select"
                                >
                                  {matrix.sizeOptions.map((size) => (
                                    <option key={`ops-b-col-${size}`} value={size}>{size}</option>
                                  ))}
                                </select>
                              </label>
                            </div>
                          ) : null}
                        </div>

                        <MatrixGrid
                          matrix={matrix.operations.matrixB.map((row) => row.map((value) => value || "0"))}
                          inputMatrix={matrix.operations.matrixB}
                          editable
                          displayMode={matrix.displayMode}
                          onChange={matrix.operations.setCellB}
                          onPasteMatrix={matrix.operations.pasteB}
                          onCellFocus={() => setActiveOperationTarget("B")}
                        />
                      </div>
                    )}
                  </div>

                  <div className="studio-card space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h2 className="text-lg font-semibold text-slate-900">运算</h2>
                      <button onClick={matrix.operations.compute} className="studio-primary-btn">计算</button>
                    </div>

                    <OperationButtonGroup
                      options={[...OPERATION_OPTIONS]}
                      active={matrix.operations.operation}
                      onChange={matrix.operations.setOperation}
                    />

                    {matrix.operations.operation === "scalar" && (
                      <input
                        value={matrix.operations.scalar}
                        onChange={(event) => matrix.operations.setScalar(event.target.value)}
                        className="studio-input"
                        placeholder="数乘系数，例如 1/3"
                      />
                    )}
                  </div>
                </section>

                <aside className="space-y-6">
                  <div className="studio-card space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-lg font-semibold text-slate-900">结果</h2>
                      <SaveToLibraryButton
                        disabled={!matrix.operations.resultMatrix}
                        defaultName={suggestNameForContext(
                          matrixInventory,
                          "matrix-operations"
                        )}
                        onSave={(name) =>
                          saveMatrixWithName(
                            matrix.operations.resultMatrix,
                            name,
                            "matrix-operations",
                            "standard"
                          )
                        }
                      />
                    </div>
                    {matrix.operations.resultMatrix ? (
                      <>
                        <MatrixGrid matrix={matrix.operations.resultMatrix} displayMode={matrix.displayMode} />
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => loadMatrixToOperationsA(matrix.operations.resultMatrix!)}
                            className="step-control"
                          >
                            结果填入 A
                          </button>
                          <button
                            onClick={() => loadMatrixToOperationsB(matrix.operations.resultMatrix!)}
                            className="step-control"
                          >
                            结果填入 B
                          </button>
                        </div>
                      </>
                    ) : null}
                    {!matrix.operations.resultMatrix &&
                    (matrix.operations.operation === "rank" ||
                      matrix.operations.operation === "determinant") &&
                    matrix.operations.feedback ? (
                      <div
                        className={
                          matrix.operations.feedback.tone === "error"
                            ? "rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
                            : "rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-mono text-slate-700"
                        }
                      >
                        {matrix.operations.feedback.text}
                      </div>
                    ) : null}
                  </div>
                </aside>
              </div>
            </div>
          )}

                    {activeTab === "system" && (
            <div className="workspace-container">
              <div className="workspace-grid">
                <section className="space-y-6">
                  <div className="studio-card space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h2 className="text-lg font-semibold text-slate-900">线性方程组</h2>
                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        <label className="flex items-center gap-2">方程数
                          <select
                            value={matrix.system.rows}
                            onChange={(event) => matrix.system.setDimensions(Number(event.target.value), matrix.system.cols)}
                            className="studio-select"
                          >
                            {matrix.sizeOptions.map((size) => (
                              <option key={`sys-row-${size}`} value={size}>{size}</option>
                            ))}
                          </select>
                        </label>
                        <label className="flex items-center gap-2">变量数
                          <select
                            value={matrix.system.cols}
                            onChange={(event) => matrix.system.setDimensions(matrix.system.rows, Number(event.target.value))}
                            className="studio-select"
                          >
                            {matrix.sizeOptions.map((size) => (
                              <option key={`sys-col-${size}`} value={size}>{size}</option>
                            ))}
                          </select>
                        </label>
                        <label className="flex items-center gap-2">求解方法
                          <select
                            value={matrix.system.method}
                            onChange={(event) => matrix.system.setMethod(event.target.value as LinearSystemMethod)}
                            className="studio-select"
                          >
                            {SYSTEM_METHOD_OPTIONS.map((item) => (
                              <option key={item.id} value={item.id}>{item.label}</option>
                            ))}
                          </select>
                        </label>
                        {systemUsesIteration ? (
                          <>
                            <label className="flex items-center gap-2">容差
                              <input
                                value={matrix.system.tolerance}
                                onChange={(event) => matrix.system.setTolerance(event.target.value)}
                                className="studio-input w-32"
                                placeholder="1e-10"
                              />
                            </label>
                            <label className="flex items-center gap-2">迭代
                              <input
                                value={matrix.system.maxIterations}
                                onChange={(event) => matrix.system.setMaxIterations(event.target.value)}
                                className="studio-input w-24"
                                placeholder="120"
                              />
                            </label>
                            {matrix.system.method === "sor" ? (
                              <label className="flex items-center gap-2">松弛因子
                                <input
                                  value={matrix.system.omega}
                                  onChange={(event) => matrix.system.setOmega(event.target.value)}
                                  className="studio-input w-24"
                                  placeholder="1.1"
                                />
                              </label>
                            ) : null}
                          </>
                        ) : null}
                        <button onClick={matrix.system.compute} className="studio-primary-btn">求解</button>
                      </div>
                    </div>

                    <MatrixGrid
                      matrix={matrix.system.augmented.map((row) => row.map((value) => value || "0"))}
                      inputMatrix={matrix.system.augmented}
                      editable
                      displayMode={matrix.displayMode}
                      augmentedIndex={matrix.system.cols}
                      onChange={matrix.system.setCell}
                      onPasteMatrix={matrix.system.paste}
                    />
                  </div>

                  {systemUsesIteration ? (
                    <div className="studio-card space-y-4">
                      <h3 className="text-base font-semibold text-slate-900">迭代过程</h3>
                      {matrix.system.iterativeResult ? (
                        <>
                          <MatrixGrid
                            matrix={matrix.system.iterativeResult.solution.map((value) => [value])}
                            displayMode={matrix.displayMode}
                          />
                          <div className="space-y-2">
                            {matrix.system.iterativeResult.history.slice(-8).map((item, idx) => (
                              <div
                                key={`iter-${idx}-${item.iteration}`}
                                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-700"
                              >
                                k={item.iteration}，残差={formatResidual(item.residual)}，x=[{item.vector.join(", ")}]
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="text-sm text-slate-500">执行求解后查看迭代历史。</div>
                      )}
                    </div>
                  ) : (
                    <StepCard
                      step={matrix.system.currentStep}
                      stepIndex={matrix.system.stepIndex}
                      totalSteps={Math.max(matrix.system.steps.length, 1)}
                      stepDescription={matrix.system.currentStep ? matrix.describeStep(matrix.system.currentStep) : "等待求解"}
                      isPlaying={matrix.system.isPlaying}
                      onPrev={matrix.system.prevStep}
                      onNext={matrix.system.nextStep}
                      onReset={matrix.system.resetSteps}
                      onTogglePlay={matrix.system.togglePlay}
                    >
                      {matrix.system.currentStep ? (
                        <MatrixGrid
                          matrix={matrix.system.currentStep.matrix}
                          displayMode={matrix.displayMode}
                          augmentedIndex={matrix.system.cols}
                          pivot={matrix.system.currentStep.pivot}
                          highlightRows={matrix.system.currentStep.highlightRows}
                        />
                      ) : null}
                    </StepCard>
                  )}
                </section>

                <aside className="space-y-6">
                  <div className="studio-card space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-lg font-semibold text-slate-900">结果摘要</h2>
                      <SaveToLibraryButton
                        disabled={!matrix.system.summary}
                        defaultName={suggestNameForContext(matrixInventory, "linear-system")}
                        onSave={(name) =>
                          saveMatrixWithName(
                            systemResultMatrix,
                            name,
                            "linear-system",
                            "augmented"
                          )
                        }
                      />
                    </div>
                    {matrix.system.summary ? (
                      <div className="space-y-2 text-sm">
                        <div>类型：{matrix.system.summary.type}</div>
                        <div>rank(A) = {matrix.system.summary.rankA}</div>
                        <div>rank([A|b]) = {matrix.system.summary.rankAug}</div>
                        {matrix.system.iterativeResult ? (
                          <div className="font-mono text-xs">{matrix.system.iterativeResult.solution.map((v, i) => `x${i + 1}=${matrix.formatValue(v)}`).join(", ")}</div>
                        ) : matrix.system.summary.solution ? (
                          <div className="font-mono text-xs">{matrix.system.summary.solution.map((v, i) => `x${i + 1}=${matrix.formatValue(v)}`).join(", ")}</div>
                        ) : null}
                        {matrix.system.summary.parametric ? (
                          <div className="font-mono text-xs">{matrix.system.summary.parametric.join("; ")}</div>
                        ) : null}
                        {matrix.system.iterativeResult?.note ? (
                          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                            {matrix.system.iterativeResult.note}
                          </div>
                        ) : null}
                        {matrix.system.iterativeResult?.convergenceMessage ? (
                          <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">
                            收敛性判定：{matrix.system.iterativeResult.convergenceMessage}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </aside>
              </div>
            </div>
          )}

          {activeTab === "determinant" && (
            <div className="workspace-container">
              <div className="workspace-grid">
                <section className="space-y-6">
                  <div className="studio-card space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h2 className="text-lg font-semibold text-slate-900">行列式</h2>
                      <div className="flex items-center gap-2 text-sm">
                        维度
                        <select
                          value={detSize}
                          onChange={(event) => {
                            const next = Number(event.target.value);
                            setDetSize(next);
                            setDetMatrix((prev) => resizeInputMatrix(prev, next, next, "0"));
                          }}
                          className="studio-select"
                        >
                          {matrix.sizeOptions.map((size) => (
                            <option key={`det-${size}`} value={size}>{size}</option>
                          ))}
                        </select>
                        <button onClick={computeDeterminant} className="studio-primary-btn">计算</button>
                      </div>
                    </div>

                    <MatrixGrid
                      matrix={detMatrix.map((row) => row.map((value) => value || "0"))}
                      inputMatrix={detMatrix}
                      editable
                      displayMode={matrix.displayMode}
                      onChange={(r, c, value) => {
                        setDetMatrix((prev) => {
                          const next = prev.map((line) => line.slice());
                          next[r][c] = value;
                          return next;
                        });
                      }}
                      onPasteMatrix={pasteDeterminantMatrix}
                    />
                  </div>
                </section>

                <aside className="space-y-6">
                  <div className="studio-card space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-lg font-semibold text-slate-900">结果</h2>
                      <SaveToLibraryButton
                        disabled={!detResult}
                        defaultName={suggestNameForContext(matrixInventory, "determinant")}
                        onSave={(name) =>
                          saveMatrixWithName(detMatrix, name, "determinant", "standard")
                        }
                      />
                    </div>
                    {detResult ? <div className="text-sm">det(A) = {matrix.formatValue(detResult)}</div> : null}
                  </div>
                </aside>
              </div>
            </div>
          )}
          {activeTab === "decomposition" && (
            <div className="workspace-container">
              <div className="workspace-grid">
                <section className="space-y-6">
                  <div className="studio-card space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h2 className="text-lg font-semibold text-slate-900">矩阵分解</h2>
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <label className="flex items-center gap-1">模式
                          <select
                            value={decompMode}
                            onChange={(event) => {
                              const nextMode = event.target.value as DecompositionMode;
                              setDecompMode(nextMode);
                              if (nextMode !== "qr") {
                                setDecompCols(decompRows);
                                setDecompMatrix((prev) => resizeInputMatrix(prev, decompRows, decompRows, "0"));
                              }
                            }}
                            className="studio-select"
                          >
                            {DECOMPOSITION_OPTIONS.map((item) => (
                              <option key={item.id} value={item.id}>{item.label}</option>
                            ))}
                          </select>
                        </label>
                        <label className="flex items-center gap-1">行数
                          <select
                            value={decompRows}
                            onChange={(event) => {
                              const nextRows = Number(event.target.value);
                              setDecompRows(nextRows);
                              if (decompMode === "qr") {
                                setDecompMatrix((prev) => resizeInputMatrix(prev, nextRows, decompCols, "0"));
                                return;
                              }
                              setDecompCols(nextRows);
                              setDecompMatrix((prev) => resizeInputMatrix(prev, nextRows, nextRows, "0"));
                            }}
                            className="studio-select"
                          >
                            {matrix.sizeOptions.map((size) => (
                              <option key={`decomp-row-${size}`} value={size}>{size}</option>
                            ))}
                          </select>
                        </label>
                        <label className="flex items-center gap-1">列数
                          <select
                            value={decompCols}
                            disabled={decompMode !== "qr"}
                            onChange={(event) => {
                              const nextCols = Number(event.target.value);
                              setDecompCols(nextCols);
                              setDecompMatrix((prev) => resizeInputMatrix(prev, decompRows, nextCols, "0"));
                            }}
                            className="studio-select"
                          >
                            {matrix.sizeOptions.map((size) => (
                              <option key={`decomp-col-${size}`} value={size}>{size}</option>
                            ))}
                          </select>
                        </label>
                        <button onClick={computeDecomposition} className="studio-primary-btn">计算</button>
                      </div>
                    </div>

                    <MatrixGrid
                      matrix={decompMatrix.map((row) => row.map((value) => value || "0"))}
                      inputMatrix={decompMatrix}
                      editable
                      displayMode={matrix.displayMode}
                      onChange={(r, c, value) => {
                        setDecompMatrix((prev) => {
                          const next = prev.map((line) => line.slice());
                          next[r][c] = value;
                          return next;
                        });
                      }}
                      onPasteMatrix={pasteDecompositionMatrix}
                    />
                  </div>
                </section>

                <aside className="space-y-6">
                  <div className="studio-card space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-lg font-semibold text-slate-900">结果</h2>
                      <SaveToLibraryButton
                        disabled={!decompResult || !decompPrimaryMatrix}
                        defaultName={suggestNameForContext(matrixInventory, "decomposition")}
                        onSave={(name) =>
                          saveMatrixWithName(
                            decompPrimaryMatrix,
                            name,
                            "decomposition",
                            "standard"
                          )
                        }
                      />
                    </div>

                    {decompResult?.mode === "lu" ? (
                      <>
                        <MatrixGrid matrix={decompResult.decomposition.L} displayMode={matrix.displayMode} />
                        <MatrixGrid matrix={decompResult.decomposition.U} displayMode={matrix.displayMode} />
                        <MatrixGrid matrix={decompResult.decomposition.P} displayMode={matrix.displayMode} />
                      </>
                    ) : null}

                    {decompResult?.mode === "qr" ? (
                      <>
                        <MatrixGrid matrix={decompResult.decomposition.Q} displayMode={matrix.displayMode} />
                        <MatrixGrid matrix={decompResult.decomposition.R} displayMode={matrix.displayMode} />
                      </>
                    ) : null}

                    {decompResult?.mode === "cholesky" ? (
                      <>
                        <MatrixGrid matrix={decompResult.decomposition.L} displayMode={matrix.displayMode} />
                        <MatrixGrid matrix={decompResult.decomposition.Lt} displayMode={matrix.displayMode} />
                      </>
                    ) : null}
                  </div>
                </aside>
              </div>
            </div>
          )}

          {activeTab === "eigen" && (
            <div className="workspace-container">
              <div className="workspace-grid">
                <section className="space-y-6">
                  <div className="studio-card space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h2 className="text-lg font-semibold text-slate-900">特征分析</h2>
                      <div className="flex items-center gap-2 text-sm">
                        维度
                        <select
                          value={eigSize}
                          onChange={(event) => {
                            const next = Number(event.target.value);
                            setEigSize(next);
                            setEigMatrix((prev) => resizeInputMatrix(prev, next, next, "0"));
                          }}
                          className="studio-select"
                        >
                          {matrix.sizeOptions.map((size) => (
                            <option key={`eig-${size}`} value={size}>{size}</option>
                          ))}
                        </select>
                        <button onClick={computeEigen} className="studio-primary-btn">计算</button>
                      </div>
                    </div>

                    <MatrixGrid
                      matrix={eigMatrix.map((row) => row.map((value) => value || "0"))}
                      inputMatrix={eigMatrix}
                      editable
                      displayMode={matrix.displayMode}
                      onChange={(r, c, value) => {
                        setEigMatrix((prev) => {
                          const next = prev.map((line) => line.slice());
                          next[r][c] = value;
                          return next;
                        });
                      }}
                      onPasteMatrix={pasteEigenMatrix}
                    />
                  </div>
                </section>

                <aside className="space-y-6">
                  <div className="studio-card space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-lg font-semibold text-slate-900">结果</h2>
                      <SaveToLibraryButton
                        disabled={!eigResult}
                        defaultName={suggestNameForContext(matrixInventory, "eigen")}
                        onSave={(name) =>
                          saveMatrixWithName(eigMatrix, name, "eigen", "standard")
                        }
                      />
                    </div>

                    {eigResult ? (
                      <div className="space-y-4 text-sm text-slate-700">
                        <div>
                          {eigResult.multiplicities.map((item, idx) => (
                            <div key={`m-${idx}`}>
                              特征值 λ = {matrix.formatEigenComponent(item.value)}，代数重数 ={" "}
                              {item.algebraic}，几何重数 = {item.geometric}
                            </div>
                          ))}
                        </div>
                        {eigResult.eigenPairs.map((pair, idx) => (
                          <div key={`p-${idx}`} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                            <div className="font-semibold">
                              第 {idx + 1} 对：λ = {matrix.formatEigenComponent(pair.value)}
                            </div>
                            {pair.vector.map((component, cIdx) => (
                              <div key={`v-${idx}-${cIdx}`} className="font-mono text-xs">
                                特征向量分量 v[{cIdx + 1}] ={" "}
                                {matrix.formatEigenComponent(component)}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </aside>
              </div>
            </div>
          )}
        </div>
      </div>

      <ToastHost toasts={toasts} onDismiss={dismissToast} />

      <footer className="mx-auto mt-10 w-full max-w-6xl rounded-3xl border border-slate-200 bg-white px-6 py-4 text-xs text-slate-500">
        以矩阵为中心的工作流 · 默认启用列选主元
      </footer>
    </div>
  );
}








