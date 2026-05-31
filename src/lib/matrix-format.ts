export const EPS = 1e-10;

export function cloneMatrix(matrix: string[][]): string[][] {
  return matrix.map((row) => row.slice());
}

export function resizeInputMatrix(
  matrix: string[][],
  rows: number,
  cols: number,
  fill = "0"
): string[][] {
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) =>
      matrix[r]?.[c] !== undefined ? matrix[r][c] : fill
    )
  );
}

export function formatNumber(value: number): string {
  if (Math.abs(value) < EPS) return "0";
  const rounded = Math.abs(value) >= 1000 ? value.toFixed(0) : value.toFixed(6);
  return rounded.replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}

export function formatNumberPrecise(value: number): string {
  if (Math.abs(value) < EPS) return "0";
  return value
    .toFixed(12)
    .replace(/\.0+$/, "")
    .replace(/(\.\d*?)0+$/, "$1");
}

export function toInputMatrix(matrix: number[][]): string[][] {
  return matrix.map((row) => row.map((value) => formatNumber(value)));
}

export function toPreciseInputMatrix(matrix: number[][]): string[][] {
  return matrix.map((row) => row.map((value) => formatNumberPrecise(value)));
}
