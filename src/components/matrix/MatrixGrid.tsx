import { formatValue } from "@/lib/matrix-core";
import type { DisplayMode } from "@/types/matrix";

type MatrixGridProps = {
  matrix: string[][];
  displayMode: DisplayMode;
  augmentedIndex?: number;
  editable?: boolean;
  inputMatrix?: string[][];
  onChange?: (row: number, col: number, value: string) => void;
  onPasteMatrix?: (row: number, col: number, text: string) => void;
  pivot?: { row: number; col: number };
  highlightRows?: number[];
  className?: string;
};

export function MatrixGrid({
  matrix,
  displayMode,
  augmentedIndex = -1,
  editable = false,
  inputMatrix,
  onChange,
  onPasteMatrix,
  pivot,
  highlightRows = [],
  className = "",
}: MatrixGridProps) {
  if (!matrix.length || !matrix[0]?.length) {
    return (
      <div className="studio-empty-grid rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
        暂无矩阵数据
      </div>
    );
  }

  return (
    <div className={`matrix-surface ${className}`}>
      <div className="matrix-scroll">
        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns: `repeat(${matrix[0].length}, minmax(70px, 1fr))`,
          }}
        >
          {matrix.map((row, r) =>
            row.map((value, c) => {
              const isPivot = pivot ? pivot.row === r && pivot.col === c : false;
              const isHighlightedRow = highlightRows.includes(r);
              const isAugmentedCol = augmentedIndex >= 0 && c === augmentedIndex;

              const cellClassName = [
                "matrix-cell",
                isPivot ? "matrix-cell-pivot" : "",
                isHighlightedRow ? "matrix-cell-highlight" : "",
                isAugmentedCol ? "matrix-cell-augmented" : "",
              ]
                .filter(Boolean)
                .join(" ");

              if (editable) {
                return (
                  <input
                    key={`${r}-${c}`}
                    value={inputMatrix?.[r]?.[c] ?? "0"}
                    onChange={(event) => onChange?.(r, c, event.target.value)}
                    onPaste={(event) => {
                      if (!onPasteMatrix) return;
                      event.preventDefault();
                      const text = event.clipboardData.getData("text");
                      onPasteMatrix(r, c, text);
                    }}
                    className={`${cellClassName} matrix-input`}
                  />
                );
              }

              return (
                <div key={`${r}-${c}`} className={cellClassName}>
                  {formatValue(value, displayMode)}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

