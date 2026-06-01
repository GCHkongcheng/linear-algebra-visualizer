"use client";

import { CorrectnessPanel } from "@/components/matrix/CorrectnessPanel";
import { MatrixGrid } from "@/components/matrix/MatrixGrid";
import { SaveToLibraryButton } from "@/components/matrix/SaveToLibraryButton";
import { eigsWithMathjs } from "@/lib/matrix-eigen";
import { normalizeMatrixInput, toNumericMatrix } from "@/lib/matrix-basic";
import { suggestNameForContext } from "@/store/matrix-library";
import type { MatrixRecord } from "@/store/matrix-library";
import type {
  DisplayMode,
  EigenAnalysisResult,
  EigenComponent,
} from "@/types/matrix";
import type {
  CorrectnessDescriptor,
  EigenPerturbationResult,
  Feedback,
} from "@/types/workbench";

type EigenAnalysisModuleProps = {
  // 共享状态（与 ErrorAnalysisModule 共用）
  size: number;
  matrix: string[][];
  result: EigenAnalysisResult | null;
  vectorB: string[];
  perturbationResult: EigenPerturbationResult | null;
  onSizeChange: (size: number) => void;
  onMatrixChange: (r: number, c: number, value: string) => void;
  onMatrixPaste: (r: number, c: number, text: string) => void;
  onResultChange: (result: EigenAnalysisResult | null) => void;
  onPerturbationResultChange: (result: EigenPerturbationResult | null) => void;
  // UI 配置
  sizeOptions: number[];
  displayMode: DisplayMode;
  showCorrectnessPanel: boolean;
  correctness: CorrectnessDescriptor | null;
  matrixInventory: MatrixRecord[];
  onSaveToLibrary: (matrix: string[][], name: string) => void;
  onFeedback: (feedback: Feedback) => void;
  formatEigenComponent: (v: EigenComponent) => string;
};

export function EigenAnalysisModule({
  size,
  matrix,
  result,
  onSizeChange,
  onMatrixChange,
  onMatrixPaste,
  onResultChange,
  onPerturbationResultChange,
  sizeOptions,
  displayMode,
  showCorrectnessPanel,
  correctness,
  matrixInventory,
  onSaveToLibrary,
  onFeedback,
  formatEigenComponent,
}: EigenAnalysisModuleProps) {
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

  const handleCompute = () => {
    const normalized = normalizeMatrixInput(matrix);
    const numeric = toNumericMatrix(normalized);
    if (!numeric) {
      onResultChange(null);
      onFeedback({ tone: "error", text: "特征分析需要纯数值输入" });
      return;
    }
    const res = eigsWithMathjs(numeric);
    if (!res) {
      onResultChange(null);
      onFeedback({ tone: "error", text: "特征分析计算失败" });
      return;
    }
    onResultChange(res);
    onFeedback({
      tone: res.diagonalizable ? "success" : "warning",
      text: res.diagonalizable ? "特征分析完成" : "该矩阵不可对角化",
    });
  };

  return (
    <div className="workspace-container">
      <div className="workspace-grid">
        <section className="space-y-6">
          <div className="studio-card space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900">特征分析</h2>
              <div className="flex items-center gap-2 text-sm">
                维度
                <select
                  value={size}
                  onChange={(e) => handleSizeChange(Number(e.target.value))}
                  className="studio-select"
                >
                  {sizeOptions.map((s) => (
                    <option key={`eig-${s}`} value={s}>{s}</option>
                  ))}
                </select>
                <button onClick={handleCompute} className="studio-primary-btn">计算</button>
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
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900">结果</h2>
              <SaveToLibraryButton
                disabled={!result}
                defaultName={suggestNameForContext(matrixInventory, "eigen")}
                onSave={(name) => onSaveToLibrary(matrix, name)}
              />
            </div>

            {result ? (
              <div className="space-y-4 text-sm text-slate-700">
                <div>
                  {result.multiplicities.map((item, idx) => (
                    <div key={`m-${idx}`}>
                      特征值 λ = {formatEigenComponent(item.value)}，代数重数 ={" "}
                      {item.algebraic}，几何重数 = {item.geometric}
                    </div>
                  ))}
                </div>
                {result.eigenPairs.map((pair, idx) => (
                  <div
                    key={`p-${idx}`}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <div className="font-semibold">
                      第 {idx + 1} 对：λ = {formatEigenComponent(pair.value)}
                    </div>
                    {pair.vector.map((component, cIdx) => (
                      <div key={`v-${idx}-${cIdx}`} className="font-mono text-xs">
                        特征向量分量 v[{cIdx + 1}] = {formatEigenComponent(component)}
                      </div>
                    ))}
                  </div>
                ))}
                {showCorrectnessPanel && correctness ? (
                  <CorrectnessPanel {...correctness} />
                ) : null}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500">
                点击“计算”后，这里将显示特征值与特征向量对应关系。
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
