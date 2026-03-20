"use client";

import {
  Braces,
  Calculator,
  FunctionSquare,
  Sigma,
  SplitSquareVertical,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { MatrixGrid } from "@/components/matrix/MatrixGrid";
import { OperationButtonGroup } from "@/components/matrix/OperationButtonGroup";
import { ResultStateCard } from "@/components/matrix/ResultStateCard";
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

type TabId = "operations" | "system" | "determinant" | "decomposition" | "eigen";
type DecompositionMode = "lu" | "qr" | "cholesky";

type Feedback = {
  tone: ResultTone;
  text: string;
};

type MatrixLibraryItem = {
  id: string;
  name: string;
  matrix: string[][];
  source: string;
  updatedAt: number;
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
const MATRIX_LIBRARY_KEY = "linear-algebra-studio.matrix-library";

const OPERATION_OPTIONS = [
  { id: "add", label: "A + B" },
  { id: "subtract", label: "A - B" },
  { id: "multiply", label: "A · B" },
  { id: "inverse", label: "A⁻¹" },
  { id: "rank", label: "rank(A)" },
  { id: "transpose", label: "Transpose" },
  { id: "simplify", label: "RREF" },
  { id: "scalar", label: "Scalar" },
  { id: "square", label: "A²" },
] as const;

const DEFAULT_SQUARE = toInputMatrix([
  [2, 1, -1],
  [-3, -1, 2],
  [-2, 1, 2],
]);

const DECOMPOSITION_OPTIONS: Array<{ id: DecompositionMode; label: string }> = [
  { id: "lu", label: "LU (pivoting)" },
  { id: "qr", label: "QR (Householder)" },
  { id: "cholesky", label: "Cholesky" },
];

const SYSTEM_METHOD_OPTIONS: Array<{ id: LinearSystemMethod; label: string }> = [
  { id: "gaussianElimination", label: "Gaussian Elimination" },
  { id: "gaussJordan", label: "Gauss-Jordan" },
  { id: "jacobi", label: "Jacobi Iteration" },
  { id: "gaussSeidel", label: "Gauss-Seidel Iteration" },
  { id: "sor", label: "SOR Iteration" },
  { id: "conjugateGradient", label: "Conjugate Gradient" },
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

function cloneMatrixValues(matrix: string[][]): string[][] {
  return matrix.map((row) => row.map((value) => value || "0"));
}

function suggestNextMatrixName(library: MatrixLibraryItem[]): string {
  const used = new Set(library.map((item) => item.name.toUpperCase()));
  for (let i = 0; i < 26; i += 1) {
    const candidate = String.fromCharCode(65 + i);
    if (!used.has(candidate)) return candidate;
  }
  return `M${library.length + 1}`;
}

function loadMatrixLibraryFromStorage(): MatrixLibraryItem[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(MATRIX_LIBRARY_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as MatrixLibraryItem[];
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item) => Array.isArray(item.matrix) && item.matrix.length > 0)
      .map((item) => ({
        ...item,
        matrix: cloneMatrixValues(item.matrix),
      }));
  } catch {
    return [];
  }
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
        Display Mode
      </div>
      <div className="flex flex-wrap gap-2">
        {["decimal", "fraction", "symbolic"].map((mode) => (
          <button
            key={mode}
            onClick={() => onChange(mode as DisplayMode)}
            className={`mode-chip ${displayMode === mode ? "mode-chip-active" : ""}`}
          >
            {mode}
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

  const [matrixLibrary, setMatrixLibrary] = useState<MatrixLibraryItem[]>(
    () => loadMatrixLibraryFromStorage()
  );
  const [libraryName, setLibraryName] = useState(
    () => suggestNextMatrixName(loadMatrixLibraryFromStorage())
  );

  const tabs = useMemo(
    () => [
      { id: "operations", label: "矩阵运算", icon: Calculator },
      { id: "system", label: "线性方程组", icon: Braces },
      { id: "determinant", label: "行列式", icon: Sigma },
      { id: "decomposition", label: "矩阵分解", icon: SplitSquareVertical },
      { id: "eigen", label: "特征分析", icon: FunctionSquare },
    ],
    []
  );

  const computeDeterminant = () => {
    const normalized = normalizeMatrixInput(detMatrix);
    if (normalized.length !== normalized[0].length) {
      setDetResult(null);
      setDetFeedback({ tone: "error", text: "determinant requires a square matrix" });
      return;
    }
    setDetResult(determinant(normalized));
    setDetFeedback({ tone: "success", text: "det(A) computed" });
  };

  const computeDecomposition = () => {
    const normalized = normalizeMatrixInput(decompMatrix);
    if (decompMode !== "qr" && decompRows !== decompCols) {
      setDecompResult(null);
      setDecompFeedback({ tone: "error", text: "LU/Cholesky require a square matrix" });
      return;
    }

    if (decompMode === "lu") {
      const decomposition = luDecomposition(normalized);
      if (!decomposition) {
        setDecompResult(null);
        setDecompFeedback({ tone: "error", text: "LU failed" });
        return;
      }
      const residual = luResidual(normalized, decomposition);
      const passed = residual === null ? null : residual < RESIDUAL_THRESHOLD;
      setDecompResult({ mode: "lu", decomposition, residual, threshold: RESIDUAL_THRESHOLD, passed });
      setDecompFeedback({ tone: passed === false ? "warning" : "success", text: "LU computed" });
      return;
    }

    if (decompMode === "qr") {
      const decomposition = qrDecomposition(normalized);
      if (!decomposition) {
        setDecompResult(null);
        setDecompFeedback({ tone: "error", text: "QR requires numeric input" });
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
      setDecompFeedback({ tone: passed ? "success" : "warning", text: "QR computed" });
      return;
    }

    const decomposition = choleskyDecomposition(normalized);
    if (!decomposition) {
      setDecompResult(null);
      setDecompFeedback({ tone: "error", text: "Cholesky requires SPD matrix" });
      return;
    }
    const residual = choleskyResidual(normalized, decomposition);
    const passed = residual !== null && residual < RESIDUAL_THRESHOLD;
    setDecompResult({ mode: "cholesky", decomposition, residual, threshold: RESIDUAL_THRESHOLD, passed });
    setDecompFeedback({ tone: passed ? "success" : "warning", text: "Cholesky computed" });
  };

  const computeEigen = () => {
    const normalized = normalizeMatrixInput(eigMatrix);
    const numeric = toNumericMatrix(normalized);
    if (!numeric) {
      setEigResult(null);
      setEigFeedback({ tone: "error", text: "Eigen requires numeric input" });
      return;
    }
    const result = eigsWithMathjs(numeric);
    if (!result) {
      setEigResult(null);
      setEigFeedback({ tone: "error", text: "Eigen solve failed" });
      return;
    }
    setEigResult(result);
    if (!result.diagonalizable) {
      setEigFeedback({ tone: "warning", text: "Matrix is not diagonalizable" });
      return;
    }
    setEigFeedback({ tone: "success", text: "Eigen computed" });
  };
  useEffect(() => {
    try {
      window.localStorage.setItem(MATRIX_LIBRARY_KEY, JSON.stringify(matrixLibrary));
    } catch {
      // ignore storage failure
    }
  }, [matrixLibrary]);

  const saveMatrixToLibrary = (
    rawMatrix: string[][] | null,
    preferredName?: string,
    source = "manual"
  ) => {
    if (!rawMatrix || rawMatrix.length === 0 || !rawMatrix[0]?.length) return;

    const matrixSnapshot = cloneMatrixValues(rawMatrix);
    const baseName = (preferredName ?? "").trim();
    let nextSuggested = "A";

    setMatrixLibrary((prev) => {
      const fallbackName = suggestNextMatrixName(prev);
      const finalName = baseName || fallbackName;
      const now = Date.now();
      const existingIndex = prev.findIndex(
        (item) => item.name.toUpperCase() === finalName.toUpperCase()
      );

      let next: MatrixLibraryItem[];
      if (existingIndex >= 0) {
        next = prev.slice();
        next[existingIndex] = {
          ...next[existingIndex],
          name: finalName,
          matrix: matrixSnapshot,
          source,
          updatedAt: now,
        };
      } else {
        next = [
          {
            id: `mat-${now}-${Math.random().toString(16).slice(2, 8)}`,
            name: finalName,
            matrix: matrixSnapshot,
            source,
            updatedAt: now,
          },
          ...prev,
        ];
      }

      nextSuggested = suggestNextMatrixName(next);
      return next;
    });

    setLibraryName(nextSuggested);
  };

  const deleteLibraryMatrix = (id: string) => {
    let nextSuggested = "A";
    setMatrixLibrary((prev) => {
      const next = prev.filter((item) => item.id !== id);
      nextSuggested = suggestNextMatrixName(next);
      return next;
    });
    setLibraryName(nextSuggested);
  };

  const loadMatrixToOperationsA = (matrixData: string[][]) => {
    matrix.operations.setMatrixA(cloneMatrixValues(matrixData));
  };

  const loadMatrixToOperationsB = (matrixData: string[][]) => {
    matrix.operations.setMatrixB(cloneMatrixValues(matrixData));
  };

  const loadMatrixToActiveTab = (matrixData: string[][]) => {
    const copied = cloneMatrixValues(matrixData);

    if (activeTab === "operations") {
      loadMatrixToOperationsA(copied);
      return;
    }

    if (activeTab === "system") {
      if ((copied[0]?.length ?? 0) < 2) return;
      matrix.system.setAugmentedMatrix(copied);
      return;
    }

    if (activeTab === "determinant") {
      const size = Math.max(copied.length, copied[0]?.length ?? 1);
      setDetSize(size);
      setDetMatrix(resizeInputMatrix(copied, size, size, "0"));
      return;
    }

    if (activeTab === "eigen") {
      const size = Math.max(copied.length, copied[0]?.length ?? 1);
      setEigSize(size);
      setEigMatrix(resizeInputMatrix(copied, size, size, "0"));
      return;
    }

    if (activeTab === "decomposition") {
      if (decompMode === "qr") {
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

  const activeEditingMatrix = useMemo(() => {
    if (activeTab === "operations") return matrix.operations.matrixA;
    if (activeTab === "system") return matrix.system.augmented;
    if (activeTab === "determinant") return detMatrix;
    if (activeTab === "decomposition") return decompMatrix;
    return eigMatrix;
  }, [
    activeTab,
    matrix.operations.matrixA,
    matrix.system.augmented,
    detMatrix,
    decompMatrix,
    eigMatrix,
  ]);

  const saveActiveMatrixToLibrary = () => {
    saveMatrixToLibrary(activeEditingMatrix, libraryName, `input-${activeTab}`);
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
      return `P·A = L·U, maxAbs(PA-LU)=${decompResult.residual?.toExponential(3) ?? "N/A"}`;
    }
    if (decompResult.mode === "qr") {
      return `A=QR, maxAbs(A-QR)=${decompResult.residual?.toExponential(3) ?? "N/A"}, maxAbs(Q^TQ-I)=${decompResult.orthResidual?.toExponential(3) ?? "N/A"}`;
    }
    return `A=L·L^T, maxAbs(A-LL^T)=${decompResult.residual?.toExponential(3) ?? "N/A"}`;
  }, [decompResult]);

  const systemUsesIteration = isIterativeSystemMethod(matrix.system.method);
  const systemEvidence = matrix.system.iterativeResult
    ? `residual=${formatResidual(matrix.system.iterativeResult.residual)}, iterations=${matrix.system.iterativeResult.iterations}`
    : undefined;

  return (
    <div className="min-h-screen px-6 py-10 text-[15px] text-slate-900">
      <header className="mx-auto w-full max-w-6xl space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-orange-700">
          Linear Algebra Studio
        </div>
        <h1 className="text-4xl font-semibold leading-tight text-slate-900 md:text-5xl">
          Linear Algebra Workbench
        </h1>
        <p className="max-w-3xl text-base text-slate-700">
          Matrix operations, linear systems, decomposition, and eigen analysis with correctness checks.
        </p>
      </header>

      <div className="mx-auto mt-8 grid w-full max-w-6xl gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="studio-card h-fit space-y-4">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Navigation</div>
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
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Matrix Library
            </div>

            <div className="space-y-2">
              <input
                value={libraryName}
                onChange={(event) => setLibraryName(event.target.value)}
                className="studio-input"
                placeholder="Matrix name (A/B/C...)"
              />
              <div className="flex gap-2">
                <button onClick={saveActiveMatrixToLibrary} className="step-control text-xs">
                  保存当前输入
                </button>
                {activeTab === "operations" && matrix.operations.resultMatrix ? (
                  <button
                    onClick={() =>
                      saveMatrixToLibrary(
                        matrix.operations.resultMatrix,
                        `${libraryName || "R"}_res`,
                        "operations-result"
                      )
                    }
                    className="step-control text-xs"
                  >
                    保存结果
                  </button>
                ) : null}
              </div>
            </div>

            <div className="mt-3 max-h-64 space-y-2 overflow-auto pr-1">
              {matrixLibrary.length === 0 ? (
                <div className="text-xs text-slate-500">暂无已保存矩阵</div>
              ) : (
                matrixLibrary.map((item) => (
                  <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-2">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="font-mono text-xs font-semibold text-slate-800">{item.name}</div>
                      <div className="text-[10px] text-slate-500">
                        {item.matrix.length}×{item.matrix[0]?.length ?? 0}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <button
                        onClick={() => loadMatrixToActiveTab(item.matrix)}
                        className="step-control px-2 py-1 text-[11px]"
                      >
                        载入当前模式
                      </button>
                      {activeTab === "operations" ? (
                        <>
                          <button
                            onClick={() => loadMatrixToOperationsA(item.matrix)}
                            className="step-control px-2 py-1 text-[11px]"
                          >
                            载入 A
                          </button>
                          <button
                            onClick={() => loadMatrixToOperationsB(item.matrix)}
                            className="step-control px-2 py-1 text-[11px]"
                          >
                            载入 B
                          </button>
                        </>
                      ) : null}
                      <button
                        onClick={() => deleteLibraryMatrix(item.id)}
                        className="step-control px-2 py-1 text-[11px]"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>

        <div>
          {activeTab === "operations" && (
            <div className="workspace-container">
              <div className="workspace-grid">
                <section className="space-y-6">
                  <div className="studio-card space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h2 className="text-lg font-semibold text-slate-900">Matrix Input</h2>
                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        <label className="flex items-center gap-2">
                          Rows
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
                          Cols
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
                    />

                    {(matrix.operations.operation === "add" || matrix.operations.operation === "subtract" || matrix.operations.operation === "multiply") && (
                      <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                          <div className="font-semibold text-slate-700">Matrix B</div>
                          {matrix.operations.operation === "multiply" ? (
                            <div className="flex flex-wrap items-center gap-2">
                              <label className="flex items-center gap-1">Rows
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
                              <label className="flex items-center gap-1">Cols
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
                        />
                      </div>
                    )}
                  </div>

                  <div className="studio-card space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h2 className="text-lg font-semibold text-slate-900">Operation</h2>
                      <button onClick={matrix.operations.compute} className="studio-primary-btn">Compute</button>
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
                        placeholder="Scalar e.g. 1/3"
                      />
                    )}
                  </div>
                </section>

                <aside className="space-y-6">
                  <div className="studio-card space-y-4">
                    <h2 className="text-lg font-semibold text-slate-900">Result</h2>
                    {matrix.operations.feedback ? (
                      <ResultStateCard tone={matrix.operations.feedback.tone} title="Operation Status" message={matrix.operations.feedback.text} />
                    ) : (
                      <div className="text-sm text-slate-500">Choose operation and compute.</div>
                    )}
                    {matrix.operations.resultMatrix ? (
                      <>
                        <MatrixGrid matrix={matrix.operations.resultMatrix} displayMode={matrix.displayMode} />
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() =>
                              saveMatrixToLibrary(
                                matrix.operations.resultMatrix,
                                `${libraryName || "R"}_res`,
                                "operations-result"
                              )
                            }
                            className="step-control"
                          >
                            存为新矩阵
                          </button>
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
                      <h2 className="text-lg font-semibold text-slate-900">Linear System</h2>
                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        <label className="flex items-center gap-2">Eq
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
                        <label className="flex items-center gap-2">Vars
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
                        <label className="flex items-center gap-2">Method
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
                            <label className="flex items-center gap-2">Tol
                              <input
                                value={matrix.system.tolerance}
                                onChange={(event) => matrix.system.setTolerance(event.target.value)}
                                className="studio-input w-32"
                                placeholder="1e-10"
                              />
                            </label>
                            <label className="flex items-center gap-2">Iter
                              <input
                                value={matrix.system.maxIterations}
                                onChange={(event) => matrix.system.setMaxIterations(event.target.value)}
                                className="studio-input w-24"
                                placeholder="120"
                              />
                            </label>
                            {matrix.system.method === "sor" ? (
                              <label className="flex items-center gap-2">Omega
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
                        <button onClick={matrix.system.compute} className="studio-primary-btn">Solve</button>
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
                      <h3 className="text-base font-semibold text-slate-900">Iterative Progress</h3>
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
                                k={item.iteration}, residual={formatResidual(item.residual)}, x=[{item.vector.join(", ")}]
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="text-sm text-slate-500">Run solve to inspect iteration history.</div>
                      )}
                    </div>
                  ) : (
                    <StepCard
                      step={matrix.system.currentStep}
                      stepIndex={matrix.system.stepIndex}
                      totalSteps={Math.max(matrix.system.steps.length, 1)}
                      stepDescription={matrix.system.currentStep ? matrix.describeStep(matrix.system.currentStep) : "Waiting"}
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
                    <h2 className="text-lg font-semibold text-slate-900">Summary</h2>
                    {matrix.system.feedback ? (
                      <ResultStateCard
                        tone={matrix.system.feedback.tone}
                        title="Solve Status"
                        message={matrix.system.feedback.text}
                        evidence={systemEvidence}
                      />
                    ) : (
                      <div className="text-sm text-slate-500">Solve to view summary.</div>
                    )}
                    {matrix.system.summary ? (
                      <div className="space-y-2 text-sm">
                        <div>Type: {matrix.system.summary.type}</div>
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
                      <h2 className="text-lg font-semibold text-slate-900">Determinant</h2>
                      <div className="flex items-center gap-2 text-sm">
                        Size
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
                        <button onClick={computeDeterminant} className="studio-primary-btn">Compute</button>
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
                    <h2 className="text-lg font-semibold text-slate-900">Result</h2>
                    {detFeedback ? (
                      <ResultStateCard tone={detFeedback.tone} title="Determinant Status" message={detFeedback.text} />
                    ) : (
                      <div className="text-sm text-slate-500">Input matrix and compute.</div>
                    )}
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
                      <h2 className="text-lg font-semibold text-slate-900">Decomposition</h2>
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <label className="flex items-center gap-1">Mode
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
                        <label className="flex items-center gap-1">Rows
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
                        <label className="flex items-center gap-1">Cols
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
                        <button onClick={computeDecomposition} className="studio-primary-btn">Compute</button>
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
                    <h2 className="text-lg font-semibold text-slate-900">Result</h2>
                    {decompFeedback ? (
                      <ResultStateCard tone={decompFeedback.tone} title="Decomposition Status" message={decompFeedback.text} evidence={decompEvidence} />
                    ) : (
                      <div className="text-sm text-slate-500">Select mode and compute.</div>
                    )}

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
                      <h2 className="text-lg font-semibold text-slate-900">Eigen Analysis</h2>
                      <div className="flex items-center gap-2 text-sm">
                        Size
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
                        <button onClick={computeEigen} className="studio-primary-btn">Compute</button>
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
                    <h2 className="text-lg font-semibold text-slate-900">Result</h2>
                    {eigFeedback ? (
                      <ResultStateCard tone={eigFeedback.tone} title="Eigen Status" message={eigFeedback.text} />
                    ) : (
                      <div className="text-sm text-slate-500">Input matrix and compute.</div>
                    )}

                    {eigResult ? (
                      <div className="space-y-4 text-sm text-slate-700">
                        <div>
                          {eigResult.multiplicities.map((item, idx) => (
                            <div key={`m-${idx}`}>lambda={matrix.formatEigenComponent(item.value)}, alg={item.algebraic}, geo={item.geometric}</div>
                          ))}
                        </div>
                        {eigResult.eigenPairs.map((pair, idx) => (
                          <div key={`p-${idx}`} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                            <div className="font-semibold">lambda{idx + 1} = {matrix.formatEigenComponent(pair.value)}</div>
                            {pair.vector.map((component, cIdx) => (
                              <div key={`v-${idx}-${cIdx}`} className="font-mono text-xs">v[{cIdx + 1}] = {matrix.formatEigenComponent(component)}</div>
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

      <footer className="mx-auto mt-10 w-full max-w-6xl rounded-3xl border border-slate-200 bg-white px-6 py-4 text-xs text-slate-500">
        Matrix-first workflow · Partial Pivoting enabled by default
      </footer>
    </div>
  );
}
