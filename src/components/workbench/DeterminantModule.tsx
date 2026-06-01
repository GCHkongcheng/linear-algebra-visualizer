"use client";

import { MatrixGrid } from "@/components/matrix/MatrixGrid";
import { SaveToLibraryButton } from "@/components/matrix/SaveToLibraryButton";
import { determinant, normalizeMatrixInput } from "@/lib/matrix-basic";
import { suggestNameForContext } from "@/store/matrix-library";
import type { MatrixRecord } from "@/store/matrix-library";
import type { DisplayMode } from "@/types/matrix";
import type { Feedback } from "@/types/workbench";

type DeterminantModuleProps = {
  displayMode: DisplayMode;
  sizeOptions: number[];
  size: number;
  matrix: string[][];
  result: string | null;
  matrixInventory: MatrixRecord[];
  onSizeChange: (size: number) => void;
  onMatrixChange: (row: number, col: number, value: string) => void;
  onMatrixPaste: (row: number, col: number, text: string) => void;
  onResultChange: (result: string | null) => void;
  onSaveToLibrary: (matrix: string[][], name: string) => void;
  onFeedback: (feedback: Feedback) => void;
  formatValue: (value: string) => string;
};

export function DeterminantModule({
  displayMode,
  sizeOptions,
  size,
  matrix,
  result,
  matrixInventory,
  onSizeChange,
  onMatrixChange,
  onMatrixPaste,
  onResultChange,
  onSaveToLibrary,
  onFeedback,
  formatValue,
}: DeterminantModuleProps) {
  const handleCompute = () => {
    const normalized = normalizeMatrixInput(matrix);

    // 验证是否为方阵
    if (normalized.length !== normalized[0].length) {
      onResultChange(null);
      onFeedback({ tone: "error", text: "行列式计算要求方阵" });
      return;
    }

    // 计算行列式
    const det = determinant(normalized);
    onResultChange(det);
    onFeedback({ tone: "success", text: "det(A) 计算完成" });
  };

  const handleSizeChange = (newSize: number) => {
    onSizeChange(newSize);
    onResultChange(null);
  };

  const handleCellChange = (row: number, col: number, value: string) => {
    onMatrixChange(row, col, value);
    onResultChange(null);
  };

  const handlePaste = (row: number, col: number, text: string) => {
    onMatrixPaste(row, col, text);
    onResultChange(null);
  };

  const handleSaveToLibrary = (name: string) => {
    onSaveToLibrary(matrix, name);
  };

  return (
    <div className="workspace-container">
      <div className="workspace-grid">
        {/* 输入区域 */}
        <section className="space-y-6">
          <div className="studio-card space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900">行列式</h2>
              <div className="flex items-center gap-2 text-sm">
                维度
                <select
                  value={size}
                  onChange={(event) => handleSizeChange(Number(event.target.value))}
                  className="studio-select"
                  aria-label="选择矩阵维度"
                >
                  {sizeOptions.map((s) => (
                    <option key={`det-${s}`} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleCompute}
                  className="studio-primary-btn"
                  aria-label="计算行列式"
                >
                  计算
                </button>
              </div>
            </div>

            <MatrixGrid
              matrix={matrix.map((row) => row.map((value) => value || "0"))}
              inputMatrix={matrix}
              editable
              displayMode={displayMode}
              onChange={handleCellChange}
              onPasteMatrix={handlePaste}
            />
          </div>
        </section>

        {/* 结果区域 */}
        <aside className="space-y-6">
          <div className="studio-card space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900">结果</h2>
              <SaveToLibraryButton
                disabled={!result}
                defaultName={suggestNameForContext(matrixInventory, "determinant")}
                onSave={handleSaveToLibrary}
              />
            </div>
            {result ? (
              <div className="text-sm">
                det(A) = {formatValue(result)}
              </div>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
