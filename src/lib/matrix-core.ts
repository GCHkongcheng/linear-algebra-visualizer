import Fraction from "fraction.js";
import { all, create } from "mathjs";

import type {
  CholeskyResult,
  DisplayMode,
  EigenAnalysisResult,
  EigenComponent,
  EigenMultiplicity,
  IterativeMethod,
  IterativeSolveResult,
  LUResult,
  MatrixOperationResult,
  QRResult,
  SolveSummary,
  SVDResult,
  Step,
} from "@/types/matrix";

const math = create(all, {});

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

export function toInputMatrix(matrix: number[][]): string[][] {
  return matrix.map((row) => row.map((value) => formatNumber(value)));
}

function formatNumberPrecise(value: number): string {
  if (Math.abs(value) < EPS) return "0";
  return value
    .toFixed(12)
    .replace(/\.0+$/, "")
    .replace(/(\.\d*?)0+$/, "$1");
}

function toPreciseInputMatrix(matrix: number[][]): string[][] {
  return matrix.map((row) => row.map((value) => formatNumberPrecise(value)));
}

export function simplifyExpr(expr: string): string {
  try {
    return math.simplify(expr).toString();
  } catch {
    return expr;
  }
}

export function numericValue(expr: string): number | null {
  const trimmed = expr.trim();
  if (!trimmed) return 0;

  try {
    return new Fraction(trimmed).valueOf();
  } catch {
    // fall through to mathjs
  }

  try {
    const value = math.evaluate(trimmed);
    if (typeof value === "number" && Number.isFinite(value)) return value;
    return null;
  } catch {
    return null;
  }
}

export function isZeroExpr(expr: string): boolean {
  const simplified = simplifyExpr(expr);
  if (simplified === "0") return true;
  const numeric = numericValue(simplified);
  return numeric !== null ? Math.abs(numeric) < EPS : false;
}

export function formatNumber(value: number): string {
  if (Math.abs(value) < EPS) return "0";
  const rounded = Math.abs(value) >= 1000 ? value.toFixed(0) : value.toFixed(6);
  return rounded.replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}

function roundNumericLiterals(expr: string): string {
  return expr.replace(/-?\d+\.\d{6,}/g, (match) => {
    const value = Number(match);
    if (!Number.isFinite(value)) return match;
    return formatNumber(value);
  });
}

function prettySymbolic(expr: string): string {
  return roundNumericLiterals(expr)
    .replace(/\*/g, "·")
    .replace(/sqrt\(/g, "√(");
}

function shouldKeepSymbolicInFractionMode(expr: string): boolean {
  return /sqrt\(|\bpi\b|\be\b|\bi\b/u.test(expr);
}

function tryFraction(expr: string): Fraction | null {
  try {
    return new Fraction(expr.trim() || "0");
  } catch {
    return null;
  }
}

function isZeroFraction(value: Fraction): boolean {
  return Number(value.n) === 0;
}

function fractionToString(value: Fraction): string {
  if (isZeroFraction(value)) return "0";
  return value.toFraction();
}

function toFractionMatrix(matrix: string[][]): Fraction[][] | null {
  const converted: Fraction[][] = [];
  for (const row of matrix) {
    const nextRow: Fraction[] = [];
    for (const value of row) {
      const parsed = tryFraction(value);
      if (!parsed) return null;
      nextRow.push(parsed);
    }
    converted.push(nextRow);
  }
  return converted;
}

function fractionMatrixToString(matrix: Fraction[][]): string[][] {
  return matrix.map((row) => row.map((value) => fractionToString(value)));
}

function isNumericMatrix(matrix: string[][]): boolean {
  return matrix.every((row) => row.every((value) => tryFraction(value) !== null));
}

export function normalizeMatrixInput(inputs: string[][]): string[][] {
  return inputs.map((row) => row.map((value) => simplifyExpr(value || "0")));
}

export function formatValue(expr: string, mode: DisplayMode): string {
  const raw = expr || "0";
  const simplified = simplifyExpr(raw);
  const numeric = numericValue(simplified);
  const preserveSymbolicInFraction =
    shouldKeepSymbolicInFractionMode(raw) ||
    shouldKeepSymbolicInFractionMode(simplified);

  if (mode === "fraction") {
    if (preserveSymbolicInFraction) {
      return prettySymbolic(raw);
    }

    const fraction = tryFraction(simplified);
    if (fraction) return fractionToString(fraction);

    if (numeric !== null) {
      return fractionToString(new Fraction(numeric).simplify(1e-8));
    }

    return prettySymbolic(simplified);
  }

  if (mode === "decimal") {
    if (numeric !== null) return formatNumber(numeric);
    return prettySymbolic(simplified);
  }

  return prettySymbolic(simplified);
}

function toComplexParts(value: EigenComponent): { re: number; im: number } {
  if (typeof value === "number") {
    return { re: value, im: 0 };
  }
  return value;
}

function formatRealByMode(value: number, mode: DisplayMode): string {
  if (mode === "fraction") {
    return fractionToString(new Fraction(value).simplify(1e-8));
  }
  return formatNumber(value);
}

export function formatEigenComponent(
  value: EigenComponent,
  mode: DisplayMode
): string {
  const { re, im } = toComplexParts(value);

  if (Math.abs(im) < EPS) {
    return formatRealByMode(re, mode);
  }

  const reText = formatNumber(re);
  const imagAbs = Math.abs(im);
  const imagUnit = Math.abs(imagAbs - 1) < EPS ? "i" : `${formatNumber(imagAbs)}i`;

  if (Math.abs(re) < EPS) {
    return im < 0 ? `-${imagUnit}` : imagUnit;
  }

  return im < 0 ? `${reText} - ${imagUnit}` : `${reText} + ${imagUnit}`;
}

function addExpr(a: string, b: string): string {
  return simplifyExpr(`(${a}) + (${b})`);
}

function subExpr(a: string, b: string): string {
  return simplifyExpr(`(${a}) - (${b})`);
}

function mulExpr(a: string, b: string): string {
  return simplifyExpr(`(${a}) * (${b})`);
}

function divExpr(a: string, b: string): string {
  return simplifyExpr(`(${a}) / (${b})`);
}

export function hasChinese(text: string): boolean {
  return /[\u3400-\u9FFF]/.test(text);
}

function parseDelimitedRow(row: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < row.length; i += 1) {
    const char = row[i];

    if (char === '"') {
      if (inQuotes && row[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && (char === "," || char === "\t" || char === ";" || char === "，")) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

export function parseMatrixText(text: string): string[][] {
  const normalizedRows = text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((row) => row.trim())
    .filter((row) => row.length > 0);

  const parsed = normalizedRows.map((row) => {
    const hasDelimitedSeparator = /[\t,;，"]/u.test(row);
    const cells = hasDelimitedSeparator
      ? parseDelimitedRow(row)
      : row.split(/\s+/);

    return cells.map((cell) => (cell.length > 0 ? cell : "0"));
  });

  return parsed.filter((row) => row.length > 0);
}

export function applyPaste(
  target: string[][],
  startRow: number,
  startCol: number,
  text: string
): string[][] {
  const rows = parseMatrixText(text);
  if (rows.length === 0) return target;

  const next = target.map((row) => row.slice());
  rows.forEach((row, r) => {
    row.forEach((value, c) => {
      const rr = startRow + r;
      const cc = startCol + c;
      if (rr < next.length && cc < next[0].length) {
        next[rr][cc] = value;
      }
    });
  });

  return next;
}

export function buildAugmentedMatrix(a: string[][], b: string[][]): string[][] {
  return a.map((row, r) => [...row, b[r]?.[0] ?? "0"]);
}

export function splitAugmentedMatrix(
  augmented: string[][],
  variableCount: number
): { A: string[][]; b: string[][] } {
  const A = augmented.map((row) => row.slice(0, variableCount));
  const b = augmented.map((row) => [row[variableCount] ?? "0"]);
  return { A, b };
}

export function toNumericMatrix(inputs: string[][]): number[][] | null {
  const numeric = inputs.map((row) =>
    row.map((value) => {
      const numberValue = numericValue(value);
      return numberValue;
    })
  );

  for (const row of numeric) {
    for (const value of row) {
      if (value === null) return null;
    }
  }

  return numeric as number[][];
}

function multiplyFractionMatrices(a: Fraction[][], b: Fraction[][]): Fraction[][] {
  const rows = a.length;
  const cols = b[0].length;
  const mid = b.length;
  const result: Fraction[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => new Fraction(0))
  );

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      let sum = new Fraction(0);
      for (let k = 0; k < mid; k += 1) {
        sum = sum.add(a[r][k].mul(b[k][c]));
      }
      result[r][c] = sum;
    }
  }

  return result;
}

export function transposeMatrix(matrix: string[][]): string[][] {
  return matrix[0].map((_, c) => matrix.map((row) => row[c]));
}

export function scalarMultiplyMatrix(matrix: string[][], scalar: string): string[][] {
  const numericScalar = tryFraction(scalar);
  const numericMatrix = toFractionMatrix(matrix);

  if (numericScalar && numericMatrix) {
    return fractionMatrixToString(
      numericMatrix.map((row) => row.map((value) => value.mul(numericScalar)))
    );
  }

  return matrix.map((row) => row.map((value) => mulExpr(scalar, value)));
}

export function addMatrices(a: string[][], b: string[][]): string[][] {
  const numericA = toFractionMatrix(a);
  const numericB = toFractionMatrix(b);

  if (numericA && numericB) {
    return fractionMatrixToString(
      numericA.map((row, r) => row.map((value, c) => value.add(numericB[r][c])))
    );
  }

  return a.map((row, r) => row.map((value, c) => addExpr(value, b[r][c])));
}

export function subtractMatrices(a: string[][], b: string[][]): string[][] {
  const numericA = toFractionMatrix(a);
  const numericB = toFractionMatrix(b);

  if (numericA && numericB) {
    return fractionMatrixToString(
      numericA.map((row, r) => row.map((value, c) => value.sub(numericB[r][c])))
    );
  }

  return a.map((row, r) => row.map((value, c) => subExpr(value, b[r][c])));
}

export function multiplyMatrices(a: string[][], b: string[][]): string[][] {
  const numericA = toFractionMatrix(a);
  const numericB = toFractionMatrix(b);

  if (numericA && numericB) {
    return fractionMatrixToString(multiplyFractionMatrices(numericA, numericB));
  }

  const rows = a.length;
  const cols = b[0].length;
  const mid = b.length;
  const result = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => "0")
  );

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      let sum = "0";
      for (let k = 0; k < mid; k += 1) {
        sum = addExpr(sum, mulExpr(a[r][k], b[k][c]));
      }
      result[r][c] = sum;
    }
  }

  return result;
}

function rrefFraction(matrix: string[][]): string[][] {
  const work = toFractionMatrix(matrix);
  if (!work) return matrix;

  const rows = work.length;
  const cols = work[0]?.length ?? 0;
  let lead = 0;

  for (let r = 0; r < rows && lead < cols; r += 1) {
    let i = r;
    while (i < rows && isZeroFraction(work[i][lead])) {
      i += 1;
    }

    if (i === rows) {
      lead += 1;
      r -= 1;
      continue;
    }

    let best = i;
    let bestAbs = Math.abs(work[i][lead].valueOf());
    for (let candidate = i + 1; candidate < rows; candidate += 1) {
      if (isZeroFraction(work[candidate][lead])) continue;
      const abs = Math.abs(work[candidate][lead].valueOf());
      if (abs > bestAbs) {
        bestAbs = abs;
        best = candidate;
      }
    }

    if (best !== r) {
      const temp = work[r];
      work[r] = work[best];
      work[best] = temp;
    }

    const pivot = work[r][lead];
    if (!isZeroFraction(pivot)) {
      for (let c = 0; c < cols; c += 1) {
        work[r][c] = work[r][c].div(pivot);
      }
    }

    for (let rr = 0; rr < rows; rr += 1) {
      if (rr === r) continue;
      const factor = work[rr][lead];
      if (isZeroFraction(factor)) continue;
      for (let c = 0; c < cols; c += 1) {
        work[rr][c] = work[rr][c].sub(factor.mul(work[r][c]));
      }
    }

    lead += 1;
  }

  return fractionMatrixToString(work);
}

function rrefSymbolic(matrix: string[][]): string[][] {
  const work = cloneMatrix(matrix).map((row) => row.map((value) => simplifyExpr(value)));
  const rows = work.length;
  const cols = work[0]?.length ?? 0;
  let lead = 0;

  for (let r = 0; r < rows && lead < cols; r += 1) {
    let i = r;
    while (i < rows && isZeroExpr(work[i][lead])) {
      i += 1;
    }

    if (i === rows) {
      lead += 1;
      r -= 1;
      continue;
    }

    let best = i;
    let bestAbs = -1;
    const initialNumeric = numericValue(work[i][lead]);
    if (initialNumeric !== null) bestAbs = Math.abs(initialNumeric);

    for (let candidate = i + 1; candidate < rows; candidate += 1) {
      if (isZeroExpr(work[candidate][lead])) continue;
      const numeric = numericValue(work[candidate][lead]);
      if (numeric === null) continue;
      const abs = Math.abs(numeric);
      if (abs > bestAbs) {
        bestAbs = abs;
        best = candidate;
      }
    }

    if (best !== r) {
      const temp = work[r];
      work[r] = work[best];
      work[best] = temp;
    }

    const pivot = work[r][lead];
    if (!isZeroExpr(pivot)) {
      const inv = divExpr("1", pivot);
      for (let c = 0; c < cols; c += 1) {
        work[r][c] = mulExpr(work[r][c], inv);
      }
    }

    for (let rr = 0; rr < rows; rr += 1) {
      if (rr === r) continue;
      if (isZeroExpr(work[rr][lead])) continue;
      const factor = work[rr][lead];
      for (let c = 0; c < cols; c += 1) {
        work[rr][c] = subExpr(work[rr][c], mulExpr(factor, work[r][c]));
      }
    }

    lead += 1;
  }

  return work;
}

export function rrefMatrix(matrix: string[][]): string[][] {
  if (isNumericMatrix(matrix)) {
    return rrefFraction(matrix);
  }
  return rrefSymbolic(matrix);
}

export function rankMatrix(matrix: string[][]): number {
  const reduced = rrefMatrix(matrix);
  return reduced.reduce((count, row) => {
    const hasNonZero = row.some((value) => !isZeroExpr(value));
    return count + (hasNonZero ? 1 : 0);
  }, 0);
}

export function inverseMatrix(matrix: string[][]): string[][] | null {
  const size = matrix.length;
  if (size === 0 || matrix[0].length !== size) return null;

  const numeric = toFractionMatrix(matrix);
  if (numeric) {
    const left = numeric.map((row) => row.map((value) => new Fraction(value)));
    const right: Fraction[][] = Array.from({ length: size }, (_, r) =>
      Array.from({ length: size }, (_, c) => new Fraction(r === c ? 1 : 0))
    );

    for (let col = 0; col < size; col += 1) {
      let pivotRow = col;
      let maxAbs = Math.abs(left[col][col].valueOf());
      for (let r = col + 1; r < size; r += 1) {
        const abs = Math.abs(left[r][col].valueOf());
        if (abs > maxAbs) {
          maxAbs = abs;
          pivotRow = r;
        }
      }

      if (isZeroFraction(left[pivotRow][col])) return null;

      if (pivotRow !== col) {
        [left[col], left[pivotRow]] = [left[pivotRow], left[col]];
        [right[col], right[pivotRow]] = [right[pivotRow], right[col]];
      }

      const pivot = left[col][col];
      for (let c = 0; c < size; c += 1) {
        left[col][c] = left[col][c].div(pivot);
        right[col][c] = right[col][c].div(pivot);
      }

      for (let r = 0; r < size; r += 1) {
        if (r === col) continue;
        const factor = left[r][col];
        if (isZeroFraction(factor)) continue;
        for (let c = 0; c < size; c += 1) {
          left[r][c] = left[r][c].sub(factor.mul(left[col][c]));
          right[r][c] = right[r][c].sub(factor.mul(right[col][c]));
        }
      }
    }

    return fractionMatrixToString(right);
  }

  const left = cloneMatrix(matrix).map((row) => row.map((value) => simplifyExpr(value)));
  const right: string[][] = Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => (r === c ? "1" : "0"))
  );

  for (let col = 0; col < size; col += 1) {
    let pivotRow = -1;
    let maxAbs = -1;
    let firstNonZero: number | null = null;

    for (let r = col; r < size; r += 1) {
      const value = left[r][col];
      if (isZeroExpr(value)) continue;
      if (firstNonZero === null) firstNonZero = r;
      const numericValueAtCell = numericValue(value);
      if (numericValueAtCell !== null) {
        const abs = Math.abs(numericValueAtCell);
        if (abs > maxAbs) {
          maxAbs = abs;
          pivotRow = r;
        }
      }
    }

    if (pivotRow === -1) {
      if (firstNonZero === null) return null;
      pivotRow = firstNonZero;
    }

    if (pivotRow !== col) {
      [left[col], left[pivotRow]] = [left[pivotRow], left[col]];
      [right[col], right[pivotRow]] = [right[pivotRow], right[col]];
    }

    const pivot = left[col][col];
    if (isZeroExpr(pivot)) return null;

    for (let c = 0; c < size; c += 1) {
      left[col][c] = divExpr(left[col][c], pivot);
      right[col][c] = divExpr(right[col][c], pivot);
    }

    for (let r = 0; r < size; r += 1) {
      if (r === col || isZeroExpr(left[r][col])) continue;
      const factor = left[r][col];
      for (let c = 0; c < size; c += 1) {
        left[r][c] = subExpr(left[r][c], mulExpr(factor, left[col][c]));
        right[r][c] = subExpr(right[r][c], mulExpr(factor, right[col][c]));
      }
    }
  }

  return right;
}

export function determinant(matrix: string[][]): string {
  const size = matrix.length;
  if (size === 0 || matrix[0].length !== size) return "0";

  const numeric = toFractionMatrix(matrix);
  if (numeric) {
    const work = numeric.map((row) => row.map((value) => new Fraction(value)));
    let det = new Fraction(1);
    let sign = 1;

    for (let col = 0; col < size; col += 1) {
      let pivotRow = col;
      let maxAbs = Math.abs(work[col][col].valueOf());
      for (let r = col + 1; r < size; r += 1) {
        const abs = Math.abs(work[r][col].valueOf());
        if (abs > maxAbs) {
          maxAbs = abs;
          pivotRow = r;
        }
      }

      if (isZeroFraction(work[pivotRow][col])) return "0";
      if (pivotRow !== col) {
        [work[col], work[pivotRow]] = [work[pivotRow], work[col]];
        sign *= -1;
      }

      const pivot = work[col][col];
      det = det.mul(pivot);
      for (let r = col + 1; r < size; r += 1) {
        const factor = work[r][col].div(pivot);
        for (let c = col; c < size; c += 1) {
          work[r][c] = work[r][c].sub(factor.mul(work[col][c]));
        }
      }
    }

    if (sign < 0) det = det.neg();
    return fractionToString(det);
  }

  if (size === 1) return simplifyExpr(matrix[0][0]);
  if (size === 2) {
    return simplifyExpr(
      `(${matrix[0][0]}) * (${matrix[1][1]}) - (${matrix[0][1]}) * (${matrix[1][0]})`
    );
  }

  let det = "0";
  for (let c = 0; c < size; c += 1) {
    const minor = matrix.slice(1).map((row) => row.filter((_, idx) => idx !== c));
    const sign = c % 2 === 0 ? "1" : "-1";
    const term = simplifyExpr(`(${sign}) * (${matrix[0][c]}) * (${determinant(minor)})`);
    det = addExpr(det, term);
  }

  return det;
}

export function luDecomposition(matrix: string[][]): LUResult | null {
  const size = matrix.length;
  if (size === 0 || matrix[0].length !== size) return null;

  const A: string[][] = cloneMatrix(matrix).map((row) => row.map((value) => simplifyExpr(value)));
  const L: string[][] = Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => (r === c ? "1" : "0"))
  );
  const U: string[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => "0")
  );
  const P: string[][] = Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => (r === c ? "1" : "0"))
  );

  for (let k = 0; k < size; k += 1) {
    let pivotRow = -1;
    let maxAbs = -1;
    let firstNonZero: number | null = null;

    for (let r = k; r < size; r += 1) {
      const value = A[r][k];
      if (isZeroExpr(value)) continue;
      if (firstNonZero === null) firstNonZero = r;
      const numericCell = numericValue(value);
      if (numericCell !== null) {
        const abs = Math.abs(numericCell);
        if (abs > maxAbs) {
          maxAbs = abs;
          pivotRow = r;
        }
      }
    }

    if (pivotRow === -1) {
      if (firstNonZero === null) return null;
      pivotRow = firstNonZero;
    }

    if (pivotRow !== k) {
      [A[k], A[pivotRow]] = [A[pivotRow], A[k]];
      [P[k], P[pivotRow]] = [P[pivotRow], P[k]];
      for (let c = 0; c < k; c += 1) {
        const temp = L[k][c];
        L[k][c] = L[pivotRow][c];
        L[pivotRow][c] = temp;
      }
    }

    for (let j = k; j < size; j += 1) {
      let sum = "0";
      for (let s = 0; s < k; s += 1) {
        sum = addExpr(sum, mulExpr(L[k][s], U[s][j]));
      }
      U[k][j] = subExpr(A[k][j], sum);
    }

    if (isZeroExpr(U[k][k])) return null;

    for (let i = k + 1; i < size; i += 1) {
      let sum = "0";
      for (let s = 0; s < k; s += 1) {
        sum = addExpr(sum, mulExpr(L[i][s], U[s][k]));
      }
      L[i][k] = divExpr(subExpr(A[i][k], sum), U[k][k]);
    }
  }

  return { L, U, P };
}



export function luDecompositionPlain(matrix: string[][]): LUResult | null {
  const size = matrix.length;
  if (size === 0 || matrix[0].length !== size) return null;

  const A: string[][] = cloneMatrix(matrix).map((row) =>
    row.map((value) => simplifyExpr(value))
  );

  const L: string[][] = Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => (r === c ? "1" : "0"))
  );
  const U: string[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => "0")
  );
  const P: string[][] = Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => (r === c ? "1" : "0"))
  );

  for (let k = 0; k < size; k += 1) {
    for (let j = k; j < size; j += 1) {
      let sum = "0";
      for (let s = 0; s < k; s += 1) {
        sum = addExpr(sum, mulExpr(L[k][s], U[s][j]));
      }
      U[k][j] = subExpr(A[k][j], sum);
    }

    if (isZeroExpr(U[k][k])) return null;

    for (let i = k + 1; i < size; i += 1) {
      let sum = "0";
      for (let s = 0; s < k; s += 1) {
        sum = addExpr(sum, mulExpr(L[i][s], U[s][k]));
      }
      L[i][k] = divExpr(subExpr(A[i][k], sum), U[k][k]);
    }
  }

  return { L, U, P };
}

function toPlainArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object" && "valueOf" in value) {
    const raw = (value as { valueOf: () => unknown }).valueOf();
    if (Array.isArray(raw)) return raw;
  }
  return [];
}

function normalizeNearZero(value: number): number {
  return Math.abs(value) < EPS ? 0 : value;
}

function toEigenComponent(value: unknown): EigenComponent | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return normalizeNearZero(value);
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return normalizeNearZero(parsed);
    }
  }

  if (value && typeof value === "object") {
    const asComplex = value as { re?: unknown; im?: unknown };
    if (
      typeof asComplex.re === "number" &&
      Number.isFinite(asComplex.re) &&
      typeof asComplex.im === "number" &&
      Number.isFinite(asComplex.im)
    ) {
      const re = normalizeNearZero(asComplex.re);
      const im = normalizeNearZero(asComplex.im);
      if (im === 0) return re;
      return { re, im };
    }

    if ("toNumber" in value && typeof (value as { toNumber?: unknown }).toNumber === "function") {
      const numberLike = (value as { toNumber: () => unknown }).toNumber();
      if (typeof numberLike === "number" && Number.isFinite(numberLike)) {
        return normalizeNearZero(numberLike);
      }
    }

    if ("valueOf" in value && typeof (value as { valueOf?: unknown }).valueOf === "function") {
      const primitive = (value as { valueOf: () => unknown }).valueOf();
      if (primitive !== value) {
        const parsed = toEigenComponent(primitive);
        if (parsed !== null) return parsed;
      }
    }
  }

  return null;
}

function componentMagnitude(value: EigenComponent): number {
  const parts = toComplexParts(value);
  return Math.hypot(parts.re, parts.im);
}

function eigenApproxEqual(a: EigenComponent, b: EigenComponent, tol = 1e-8): boolean {
  const pa = toComplexParts(a);
  const pb = toComplexParts(b);
  const scale = Math.max(1, componentMagnitude(a), componentMagnitude(b));
  return Math.hypot(pa.re - pb.re, pa.im - pb.im) <= tol * scale;
}

type EigenCluster = {
  value: EigenComponent;
  algebraic: number;
};

function clusterEigenValues(values: EigenComponent[]): EigenCluster[] {
  const clusters: EigenCluster[] = [];

  for (const value of values) {
    const cluster = clusters.find((item) => eigenApproxEqual(item.value, value));
    if (cluster) {
      cluster.algebraic += 1;
      continue;
    }

    clusters.push({ value, algebraic: 1 });
  }

  return clusters;
}

function multiplyNumericMatrices(a: number[][], b: number[][]): number[][] | null {
  const rows = a.length;
  const inner = a[0]?.length ?? 0;
  const cols = b[0]?.length ?? 0;

  if (!rows || !inner || !b.length || inner !== b.length) return null;

  const output: number[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => 0)
  );

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      let sum = 0;
      for (let k = 0; k < inner; k += 1) {
        sum += a[r][k] * b[k][c];
      }
      output[r][c] = sum;
    }
  }

  return output;
}

function maxAbsMatrixDiff(a: number[][], b: number[][]): number | null {
  if (a.length !== b.length || a[0]?.length !== b[0]?.length) return null;

  let maxAbs = 0;
  for (let r = 0; r < a.length; r += 1) {
    for (let c = 0; c < a[0].length; c += 1) {
      maxAbs = Math.max(maxAbs, Math.abs(a[r][c] - b[r][c]));
    }
  }
  return maxAbs;
}

function transposeNumericMatrix(matrix: number[][]): number[][] {
  const rows = matrix.length;
  const cols = matrix[0]?.length ?? 0;
  return Array.from({ length: cols }, (_, c) =>
    Array.from({ length: rows }, (_, r) => matrix[r][c])
  );
}

function identityNumericMatrix(size: number): number[][] {
  return Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => (r === c ? 1 : 0))
  );
}

function normalizedNumericMatrix(matrix: number[][]): number[][] {
  return matrix.map((row) => row.map((value) => normalizeNearZero(value)));
}

export function qrDecomposition(matrix: string[][]): QRResult | null {
  const numeric = toNumericMatrix(matrix);
  if (!numeric) return null;

  const rowCount = numeric.length;
  const colCount = numeric[0]?.length ?? 0;
  if (!rowCount || !colCount || rowCount < colCount) return null;

  const qColumns: number[][] = [];
  const rMatrix: number[][] = Array.from({ length: colCount }, () =>
    Array.from({ length: colCount }, () => 0)
  );

  for (let col = 0; col < colCount; col += 1) {
    const vector = Array.from({ length: rowCount }, (_, r) => numeric[r][col]);

    for (let prev = 0; prev < qColumns.length; prev += 1) {
      const qPrev = qColumns[prev];
      let projection = 0;
      for (let i = 0; i < rowCount; i += 1) {
        projection += qPrev[i] * vector[i];
      }

      rMatrix[prev][col] = projection;
      for (let i = 0; i < rowCount; i += 1) {
        vector[i] -= projection * qPrev[i];
      }
    }

    const norm = Math.hypot(...vector);
    if (norm < EPS) return null;

    rMatrix[col][col] = norm;
    qColumns.push(vector.map((value) => value / norm));
  }

  const qMatrix = Array.from({ length: rowCount }, (_, r) =>
    Array.from({ length: colCount }, (_, c) => qColumns[c][r])
  );

  return {
    Q: toPreciseInputMatrix(normalizedNumericMatrix(qMatrix)),
    R: toPreciseInputMatrix(normalizedNumericMatrix(rMatrix)),
  };
}

export function qrResidual(input: string[][], qr: QRResult): number | null {
  const a = toNumericMatrix(input);
  const q = toNumericMatrix(qr.Q);
  const r = toNumericMatrix(qr.R);
  if (!a || !q || !r) return null;

  const qrProduct = multiplyNumericMatrices(q, r);
  if (!qrProduct) return null;
  return maxAbsMatrixDiff(a, qrProduct);
}

export function qrOrthogonalityResidual(qr: QRResult): number | null {
  const q = toNumericMatrix(qr.Q);
  if (!q) return null;

  const qt = transposeNumericMatrix(q);
  const qtq = multiplyNumericMatrices(qt, q);
  if (!qtq) return null;

  return maxAbsMatrixDiff(qtq, identityNumericMatrix(qtq.length));
}

function buildSigmaMatrix(singularValues: number[], rows: number, cols: number): number[][] {
  const sigma = Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0));
  const count = Math.min(rows, cols, singularValues.length);

  for (let i = 0; i < count; i += 1) {
    sigma[i][i] = normalizeNearZero(singularValues[i]);
  }

  return sigma;
}

export function svdDecomposition(matrix: string[][]): SVDResult | null {
  const numeric = toNumericMatrix(matrix);
  if (!numeric) return null;

  const rowCount = numeric.length;
  const colCount = numeric[0]?.length ?? 0;
  if (!rowCount || !colCount) return null;

  const transpose = transposeNumericMatrix(numeric);
  const ata = multiplyNumericMatrices(transpose, numeric);
  if (!ata) return null;

  const eigen = eigsWithMathjs(ata);
  if (!eigen) return null;

  const candidates = eigen.eigenPairs
    .map((pair) => {
      const eigenValue = toComplexParts(pair.value);
      if (Math.abs(eigenValue.im) > 1e-6) return null;

      const vector = pair.vector.map((entry) => {
        const component = toComplexParts(entry);
        if (Math.abs(component.im) > 1e-6) return Number.NaN;
        return component.re;
      });

      if (vector.length !== colCount || vector.some((value) => !Number.isFinite(value))) {
        return null;
      }

      return {
        lambda: Math.max(0, normalizeNearZero(eigenValue.re)),
        vector,
      };
    })
    .filter((item): item is { lambda: number; vector: number[] } => item !== null)
    .sort((a, b) => b.lambda - a.lambda);

  if (!candidates.length) return null;

  const singularValues: number[] = [];
  const vColumns: number[][] = [];
  const uColumns: number[][] = [];

  for (const candidate of candidates) {
    let v = candidate.vector.slice();

    for (const prev of vColumns) {
      const projection = dotProduct(prev, v);
      v = v.map((value, idx) => value - projection * prev[idx]);
    }

    const vNorm = Math.hypot(...v);
    if (vNorm < EPS) continue;
    v = v.map((value) => value / vNorm);

    const sigma = Math.sqrt(Math.max(0, candidate.lambda));
    if (sigma < EPS) continue;

    let u = matVecMultiply(numeric, v).map((value) => value / sigma);
    for (const prev of uColumns) {
      const projection = dotProduct(prev, u);
      u = u.map((value, idx) => value - projection * prev[idx]);
    }

    const uNorm = Math.hypot(...u);
    if (uNorm < EPS) continue;
    u = u.map((value) => value / uNorm);

    singularValues.push(normalizeNearZero(sigma));
    vColumns.push(v);
    uColumns.push(u);

    if (singularValues.length >= Math.min(rowCount, colCount)) {
      break;
    }
  }

  if (!singularValues.length) {
    singularValues.push(0);
    vColumns.push(Array.from({ length: colCount }, (_, idx) => (idx === 0 ? 1 : 0)));
    uColumns.push(Array.from({ length: rowCount }, (_, idx) => (idx === 0 ? 1 : 0)));
  }

  const rank = singularValues.length;
  const uMatrix = Array.from({ length: rowCount }, (_, row) =>
    Array.from({ length: rank }, (_, col) => normalizeNearZero(uColumns[col][row]))
  );
  const vtMatrix = Array.from({ length: rank }, (_, row) =>
    Array.from({ length: colCount }, (_, col) => normalizeNearZero(vColumns[row][col]))
  );
  const sigma = buildSigmaMatrix(singularValues, rank, rank);

  return {
    U: toPreciseInputMatrix(normalizedNumericMatrix(uMatrix)),
    Sigma: toPreciseInputMatrix(normalizedNumericMatrix(sigma)),
    Vt: toPreciseInputMatrix(normalizedNumericMatrix(vtMatrix)),
    singularValues: singularValues.map((value) => formatNumberPrecise(value)),
  };
}

export function svdResidual(input: string[][], decomposition: SVDResult): number | null {
  const a = toNumericMatrix(input);
  const u = toNumericMatrix(decomposition.U);
  const sigma = toNumericMatrix(decomposition.Sigma);
  const vt = toNumericMatrix(decomposition.Vt);
  if (!a || !u || !sigma || !vt) return null;

  const us = multiplyNumericMatrices(u, sigma);
  if (!us) return null;

  const reconstructed = multiplyNumericMatrices(us, vt);
  if (!reconstructed) return null;

  return maxAbsMatrixDiff(a, reconstructed);
}

export function svdOrthogonalityResiduals(
  decomposition: SVDResult
): { u: number | null; v: number | null; max: number | null } {
  const u = toNumericMatrix(decomposition.U);
  const vt = toNumericMatrix(decomposition.Vt);
  if (!u || !vt) {
    return { u: null, v: null, max: null };
  }

  const ut = transposeNumericMatrix(u);
  const utu = multiplyNumericMatrices(ut, u);
  const uResidual = utu ? maxAbsMatrixDiff(utu, identityNumericMatrix(utu.length)) : null;

  const v = transposeNumericMatrix(vt);
  const vtv = multiplyNumericMatrices(vt, v);
  const vResidual = vtv ? maxAbsMatrixDiff(vtv, identityNumericMatrix(vtv.length)) : null;

  let maxResidual: number | null = null;
  if (uResidual !== null && vResidual !== null) {
    maxResidual = Math.max(uResidual, vResidual);
  } else {
    maxResidual = uResidual ?? vResidual;
  }

  return {
    u: uResidual,
    v: vResidual,
    max: maxResidual,
  };
}
export function choleskyDecomposition(matrix: string[][]): CholeskyResult | null {
  const numeric = toNumericMatrix(matrix);
  if (!numeric) return null;

  const size = numeric.length;
  if (!size || numeric[0].length !== size) return null;

  for (let r = 0; r < size; r += 1) {
    for (let c = r + 1; c < size; c += 1) {
      if (Math.abs(numeric[r][c] - numeric[c][r]) > 1e-8) {
        return null;
      }
    }
  }

  const lMatrix: number[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => 0)
  );

  for (let i = 0; i < size; i += 1) {
    for (let j = 0; j <= i; j += 1) {
      let sum = numeric[i][j];
      for (let k = 0; k < j; k += 1) {
        sum -= lMatrix[i][k] * lMatrix[j][k];
      }

      if (i === j) {
        if (sum <= EPS) return null;
        lMatrix[i][j] = Math.sqrt(sum);
      } else {
        if (Math.abs(lMatrix[j][j]) < EPS) return null;
        lMatrix[i][j] = sum / lMatrix[j][j];
      }
    }
  }

  const normalizedL = normalizedNumericMatrix(lMatrix);
  const ltMatrix = normalizedNumericMatrix(transposeNumericMatrix(lMatrix));

  return {
    L: toPreciseInputMatrix(normalizedL),
    Lt: toPreciseInputMatrix(ltMatrix),
  };
}

export function choleskyResidual(
  input: string[][],
  decomposition: CholeskyResult
): number | null {
  const a = toNumericMatrix(input);
  const l = toNumericMatrix(decomposition.L);
  const lt = toNumericMatrix(decomposition.Lt);
  if (!a || !l || !lt) return null;

  const product = multiplyNumericMatrices(l, lt);
  if (!product) return null;

  return maxAbsMatrixDiff(a, product);
}

export function luResidual(input: string[][], lu: LUResult): number | null {
  const a = toNumericMatrix(input);
  const l = toNumericMatrix(lu.L);
  const u = toNumericMatrix(lu.U);
  const p = toNumericMatrix(lu.P);

  if (!a || !l || !u || !p) return null;

  const pa = multiplyNumericMatrices(p, a);
  const luProduct = multiplyNumericMatrices(l, u);
  if (!pa || !luProduct) return null;

  return maxAbsMatrixDiff(pa, luProduct);
}



export function luResidualPlain(input: string[][], lu: LUResult): number | null {
  const a = toNumericMatrix(input);
  const l = toNumericMatrix(lu.L);
  const u = toNumericMatrix(lu.U);

  if (!a || !l || !u) return null;

  const luProduct = multiplyNumericMatrices(l, u);
  if (!luProduct) return null;

  return maxAbsMatrixDiff(a, luProduct);
}

export function maxAbsAxMinusB(
  a: number[][],
  x: number[],
  b: number[]
): number | null {
  if (!a.length || a.length !== b.length || a[0].length !== x.length) {
    return null;
  }

  let maxAbs = 0;
  for (let r = 0; r < a.length; r += 1) {
    let ax = 0;
    for (let c = 0; c < a[0].length; c += 1) {
      ax += a[r][c] * x[c];
    }
    maxAbs = Math.max(maxAbs, Math.abs(ax - b[r]));
  }

  return maxAbs;
}

export function eigsWithMathjs(matrix: number[][]): EigenAnalysisResult | null {
  try {
    const result = math.eigs(matrix as never) as {
      values: unknown;
      eigenvectors?: Array<{ value: unknown; vector: unknown }>;
    };

    const values = toPlainArray(result.values)
      .map((entry) => toEigenComponent(entry))
      .filter((entry): entry is EigenComponent => entry !== null);

    if (!values.length) return null;

    const eigenPairs = (result.eigenvectors ?? [])
      .map((pair) => {
        const value = toEigenComponent(pair.value);
        const vector = toPlainArray(pair.vector)
          .map((entry) => toEigenComponent(entry))
          .filter((entry): entry is EigenComponent => entry !== null);

        if (value === null || vector.length === 0) {
          return null;
        }

        return { value, vector };
      })
      .filter((pair): pair is { value: EigenComponent; vector: EigenComponent[] } => pair !== null);

    const multiplicities: EigenMultiplicity[] = clusterEigenValues(values).map((cluster) => ({
      value: cluster.value,
      algebraic: cluster.algebraic,
      geometric: eigenPairs.filter((pair) => eigenApproxEqual(pair.value, cluster.value)).length,
    }));

    const diagonalizable = multiplicities.every(
      (item) => item.geometric === item.algebraic
    );

    return {
      values,
      vectors: eigenPairs.map((pair) => pair.vector),
      eigenPairs,
      multiplicities,
      diagonalizable,
    };
  } catch {
    return null;
  }
}

function summaryFromRref(rref: string[][], variableCount: number): SolveSummary {
  const lastColumn = variableCount;

  let rankA = 0;
  let rankAug = 0;
  let inconsistent = false;

  for (const row of rref) {
    const hasA = row.slice(0, variableCount).some((value) => !isZeroExpr(value));
    const hasAug = row.some((value) => !isZeroExpr(value));
    if (hasA) rankA += 1;
    if (hasAug) rankAug += 1;
    if (!hasA && !isZeroExpr(row[lastColumn] ?? "0")) {
      inconsistent = true;
    }
  }

  if (inconsistent || rankAug > rankA) {
    return { type: "无解", rankA, rankAug };
  }

  const rowForPivotCol = new Map<number, number>();
  for (let r = 0; r < rref.length; r += 1) {
    for (let c = 0; c < variableCount; c += 1) {
      if (!isZeroExpr(rref[r][c])) {
        rowForPivotCol.set(c, r);
        break;
      }
    }
  }

  if (rankA === variableCount) {
    const solution = Array.from({ length: variableCount }, () => "0");
    rowForPivotCol.forEach((rowIndex, col) => {
      solution[col] = simplifyExpr(rref[rowIndex][lastColumn] ?? "0");
    });
    return {
      type: "唯一解",
      rankA,
      rankAug,
      solution,
    };
  }

  const freeCols = Array.from({ length: variableCount }, (_, idx) => idx).filter(
    (idx) => !rowForPivotCol.has(idx)
  );
  const freeVariables = freeCols.map((col) => `x${col + 1}`);
  const freeNameMap = new Map<number, string>();
  freeCols.forEach((col, idx) => {
    freeNameMap.set(col, `t${idx + 1}`);
  });

  const parametric = Array.from({ length: variableCount }, (_, col) => {
    if (freeNameMap.has(col)) {
      return `x${col + 1} = ${freeNameMap.get(col)}`;
    }

    const row = rowForPivotCol.get(col);
    if (row === undefined) {
      return `x${col + 1} = 0`;
    }

    let expr = rref[row][lastColumn] ?? "0";
    for (const freeCol of freeCols) {
      const coeff = rref[row][freeCol];
      if (isZeroExpr(coeff)) continue;
      expr = subExpr(expr, mulExpr(coeff, freeNameMap.get(freeCol) ?? "0"));
    }

    return `x${col + 1} = ${simplifyExpr(expr)}`;
  });

  return {
    type: "无穷多解",
    rankA,
    rankAug,
    parametric,
    freeVariables,
  };
}

function gaussianEliminationFraction(
  input: string[][],
  variableCount: number
): { steps: Step[]; summary: SolveSummary } {
  const matrix = toFractionMatrix(input);
  if (!matrix) {
    return gaussianEliminationSymbolic(input, variableCount);
  }

  const rows = matrix.length;
  const cols = matrix[0]?.length ?? 0;
  const steps: Step[] = [];

  const snapshot = () => fractionMatrixToString(matrix);

  steps.push({
    matrix: snapshot(),
    kind: "start",
    operationLabel: "初始增广矩阵",
  });

  let pivotRow = 0;
  for (let col = 0; col < variableCount && pivotRow < rows; col += 1) {
    let maxRow = -1;
    let maxAbs = -1;

    for (let r = pivotRow; r < rows; r += 1) {
      if (isZeroFraction(matrix[r][col])) continue;
      const abs = Math.abs(matrix[r][col].valueOf());
      if (abs > maxAbs) {
        maxAbs = abs;
        maxRow = r;
      }
    }

    if (maxRow === -1) {
      steps.push({
        matrix: snapshot(),
        kind: "skip",
        col,
        operationLabel: `第 ${col + 1} 列无可用主元，跳过`,
      });
      continue;
    }

    if (maxRow !== pivotRow) {
      [matrix[pivotRow], matrix[maxRow]] = [matrix[maxRow], matrix[pivotRow]];
      steps.push({
        matrix: snapshot(),
        kind: "swap",
        pivot: { row: pivotRow, col },
        pivotRow,
        swapWith: maxRow,
        highlightRows: [pivotRow, maxRow],
        swapReason: "选择绝对值最大的主元，避免除以过小数值导致误差放大。",
        operationLabel: `R${pivotRow + 1} <-> R${maxRow + 1}`,
      });
    }

    for (let r = pivotRow + 1; r < rows; r += 1) {
      if (isZeroFraction(matrix[r][col])) continue;
      const factor = matrix[r][col].div(matrix[pivotRow][col]);
      for (let c = col; c < cols; c += 1) {
        matrix[r][c] = matrix[r][c].sub(factor.mul(matrix[pivotRow][c]));
      }

      steps.push({
        matrix: snapshot(),
        kind: "eliminate",
        pivot: { row: pivotRow, col },
        activeRow: r,
        pivotRow,
        targetRow: r,
        factor: fractionToString(factor),
        highlightRows: [r],
        operationLabel: `R${r + 1} <- R${r + 1} - (${fractionToString(factor)})R${pivotRow + 1}`,
      });
    }

    pivotRow += 1;
  }

  steps.push({
    matrix: snapshot(),
    kind: "done",
    operationLabel: "消元完成，得到阶梯形矩阵",
  });

  const summary = summaryFromRref(rrefMatrix(snapshot()), variableCount);
  return { steps, summary };
}

function gaussianEliminationSymbolic(
  input: string[][],
  variableCount: number
): { steps: Step[]; summary: SolveSummary } {
  const matrix = cloneMatrix(input).map((row) => row.map((value) => simplifyExpr(value)));
  const rows = matrix.length;
  const cols = matrix[0]?.length ?? 0;
  const steps: Step[] = [];

  steps.push({
    matrix: cloneMatrix(matrix),
    kind: "start",
    operationLabel: "初始增广矩阵",
  });

  let pivotRow = 0;
  for (let col = 0; col < variableCount && pivotRow < rows; col += 1) {
    let maxRow = -1;
    let maxAbs = -1;
    let firstNonZero: number | null = null;

    for (let r = pivotRow; r < rows; r += 1) {
      const value = matrix[r][col];
      if (isZeroExpr(value)) continue;
      if (firstNonZero === null) firstNonZero = r;
      const numeric = numericValue(value);
      if (numeric !== null) {
        const abs = Math.abs(numeric);
        if (abs > maxAbs) {
          maxAbs = abs;
          maxRow = r;
        }
      }
    }

    if (maxRow === -1) {
      if (firstNonZero === null) {
        steps.push({
          matrix: cloneMatrix(matrix),
          kind: "skip",
          col,
          operationLabel: `第 ${col + 1} 列无可用主元，跳过`,
        });
        continue;
      }
      maxRow = firstNonZero;
    }

    if (maxRow !== pivotRow) {
      [matrix[pivotRow], matrix[maxRow]] = [matrix[maxRow], matrix[pivotRow]];
      steps.push({
        matrix: cloneMatrix(matrix),
        kind: "swap",
        pivot: { row: pivotRow, col },
        pivotRow,
        swapWith: maxRow,
        highlightRows: [pivotRow, maxRow],
        swapReason: "优先选择更稳定的主元，降低消元过程中的误差传播。",
        operationLabel: `R${pivotRow + 1} <-> R${maxRow + 1}`,
      });
    }

    for (let r = pivotRow + 1; r < rows; r += 1) {
      if (isZeroExpr(matrix[r][col])) continue;
      const factor = divExpr(matrix[r][col], matrix[pivotRow][col]);
      for (let c = col; c < cols; c += 1) {
        matrix[r][c] = subExpr(matrix[r][c], mulExpr(factor, matrix[pivotRow][c]));
      }

      steps.push({
        matrix: cloneMatrix(matrix),
        kind: "eliminate",
        pivot: { row: pivotRow, col },
        activeRow: r,
        pivotRow,
        targetRow: r,
        factor,
        highlightRows: [r],
        operationLabel: `R${r + 1} <- R${r + 1} - (${factor})R${pivotRow + 1}`,
      });
    }

    pivotRow += 1;
  }

  steps.push({
    matrix: cloneMatrix(matrix),
    kind: "done",
    operationLabel: "消元完成，得到阶梯形矩阵",
  });

  const summary = summaryFromRref(rrefMatrix(matrix), variableCount);
  return { steps, summary };
}

export function solveLinearSystemWithSteps(
  augmented: string[][],
  variableCount: number
): { steps: Step[]; summary: SolveSummary } {
  if (isNumericMatrix(augmented)) {
    return gaussianEliminationFraction(augmented, variableCount);
  }
  return gaussianEliminationSymbolic(augmented, variableCount);
}

export function solveLinearSystemByGaussJordan(
  augmented: string[][],
  variableCount: number
): { steps: Step[]; summary: SolveSummary } {
  const normalized = cloneMatrix(augmented).map((row) =>
    row.map((value) => simplifyExpr(value))
  );
  const reduced = rrefMatrix(normalized);

  const steps: Step[] = [
    {
      matrix: cloneMatrix(normalized),
      kind: "start",
      operationLabel: "初始增广矩阵",
    },
    {
      matrix: cloneMatrix(reduced),
      kind: "done",
      operationLabel: "Gauss-Jordan 完成，得到最简阶梯形矩阵 (RREF)",
    },
  ];

  return {
    steps,
    summary: summaryFromRref(reduced, variableCount),
  };
}

function isStrictlyDiagonallyDominant(matrix: number[][]): boolean {
  return matrix.every((row, i) => {
    const diagonal = Math.abs(row[i]);
    const others = row.reduce((sum, value, j) => (j === i ? sum : sum + Math.abs(value)), 0);
    return diagonal > others;
  });
}

function isSymmetricMatrix(matrix: number[][], tolerance = 1e-8): boolean {
  for (let r = 0; r < matrix.length; r += 1) {
    for (let c = r + 1; c < matrix.length; c += 1) {
      if (Math.abs(matrix[r][c] - matrix[c][r]) > tolerance) {
        return false;
      }
    }
  }
  return true;
}

function isPositiveDefiniteByCholesky(matrix: number[][]): boolean {
  const size = matrix.length;
  const l: number[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => 0)
  );

  for (let i = 0; i < size; i += 1) {
    for (let j = 0; j <= i; j += 1) {
      let sum = matrix[i][j];
      for (let k = 0; k < j; k += 1) {
        sum -= l[i][k] * l[j][k];
      }

      if (i === j) {
        if (sum <= EPS) return false;
        l[i][j] = Math.sqrt(sum);
      } else {
        if (Math.abs(l[j][j]) < EPS) return false;
        l[i][j] = sum / l[j][j];
      }
    }
  }

  return true;
}

function dotProduct(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) {
    sum += a[i] * b[i];
  }
  return sum;
}

function matVecMultiply(matrix: number[][], vector: number[]): number[] {
  return matrix.map((row) => {
    let sum = 0;
    for (let i = 0; i < row.length; i += 1) {
      sum += row[i] * vector[i];
    }
    return sum;
  });
}

function maxAbsDelta(a: number[], b: number[]): number {
  let maxAbs = 0;
  for (let i = 0; i < a.length; i += 1) {
    maxAbs = Math.max(maxAbs, Math.abs(a[i] - b[i]));
  }
  return maxAbs;
}

function zeroNumericMatrix(rows: number, cols: number): number[][] {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0));
}

function addNumericMatrices(a: number[][], b: number[][]): number[][] | null {
  if (a.length !== b.length || a[0]?.length !== b[0]?.length) return null;
  return a.map((row, r) =>
    row.map((value, c) => normalizeNearZero(value + b[r][c]))
  );
}

function scaleNumericMatrix(matrix: number[][], scalar: number): number[][] {
  return matrix.map((row) =>
    row.map((value) => normalizeNearZero(value * scalar))
  );
}

function invertNumericMatrix(matrix: number[][]): number[][] | null {
  const size = matrix.length;
  if (!size || matrix.some((row) => row.length !== size)) return null;

  const augmented = matrix.map((row, r) => [
    ...row.map((value) => value),
    ...Array.from({ length: size }, (_, c) => (c === r ? 1 : 0)),
  ]);

  for (let col = 0; col < size; col += 1) {
    let pivotRow = col;
    let maxAbs = Math.abs(augmented[col][col]);
    for (let row = col + 1; row < size; row += 1) {
      const abs = Math.abs(augmented[row][col]);
      if (abs > maxAbs) {
        maxAbs = abs;
        pivotRow = row;
      }
    }

    if (maxAbs < EPS) return null;

    if (pivotRow !== col) {
      [augmented[col], augmented[pivotRow]] = [augmented[pivotRow], augmented[col]];
    }

    const pivot = augmented[col][col];
    for (let c = 0; c < augmented[col].length; c += 1) {
      augmented[col][c] /= pivot;
    }

    for (let row = 0; row < size; row += 1) {
      if (row === col) continue;
      const factor = augmented[row][col];
      if (Math.abs(factor) < EPS) continue;
      for (let c = 0; c < augmented[row].length; c += 1) {
        augmented[row][c] -= factor * augmented[col][c];
      }
    }
  }

  return augmented.map((row) =>
    row.slice(size).map((value) => normalizeNearZero(value))
  );
}

function isValidNumericMatrix(matrix: number[][]): boolean {
  if (!Array.isArray(matrix) || matrix.length === 0) return false;
  const cols = matrix[0]?.length ?? 0;
  if (cols === 0) return false;
  return matrix.every(
    (row) =>
      Array.isArray(row) &&
      row.length === cols &&
      row.every((value) => typeof value === "number" && Number.isFinite(value))
  );
}

function matrixOneNormInternal(matrix: number[][]): number {
  const rows = matrix.length;
  const cols = matrix[0].length;
  let maxColumnSum = 0;

  for (let c = 0; c < cols; c += 1) {
    let sum = 0;
    for (let r = 0; r < rows; r += 1) {
      sum += Math.abs(matrix[r][c]);
    }
    if (sum > maxColumnSum) {
      maxColumnSum = sum;
    }
  }

  return maxColumnSum;
}

function matrixInfinityNormInternal(matrix: number[][]): number {
  let maxRowSum = 0;

  for (const row of matrix) {
    const rowSum = row.reduce((sum, value) => sum + Math.abs(value), 0);
    if (rowSum > maxRowSum) {
      maxRowSum = rowSum;
    }
  }

  return maxRowSum;
}

function maxAbsVectorNorm(vector: number[]): number {
  return vector.reduce((maxAbs, value) => Math.max(maxAbs, Math.abs(value)), 0);
}

function safeRelativeError(deltaNorm: number, baseNorm: number): number {
  const denominator = Math.max(baseNorm, EPS);
  return deltaNorm / denominator;
}

export function matrixOneNorm(matrix: number[][]): number | null {
  if (!isValidNumericMatrix(matrix)) return null;
  return normalizeNearZero(matrixOneNormInternal(matrix));
}

export function matrixInfinityNorm(matrix: number[][]): number | null {
  if (!isValidNumericMatrix(matrix)) return null;
  return normalizeNearZero(matrixInfinityNormInternal(matrix));
}

export function analyzeConditionNumbers(matrix: number[][]): {
  norm1: number;
  normInf: number;
  inverseNorm1: number | null;
  inverseNormInf: number | null;
  cond1: number | null;
  condInf: number | null;
  invertible: boolean;
} | null {
  if (!isValidNumericMatrix(matrix)) return null;
  if (matrix.length !== matrix[0].length) return null;

  const norm1 = matrixOneNormInternal(matrix);
  const normInf = matrixInfinityNormInternal(matrix);
  const inverse = invertNumericMatrix(matrix);

  if (!inverse) {
    return {
      norm1: normalizeNearZero(norm1),
      normInf: normalizeNearZero(normInf),
      inverseNorm1: null,
      inverseNormInf: null,
      cond1: null,
      condInf: null,
      invertible: false,
    };
  }

  const inverseNorm1 = matrixOneNormInternal(inverse);
  const inverseNormInf = matrixInfinityNormInternal(inverse);
  const cond1Raw = norm1 * inverseNorm1;
  const condInfRaw = normInf * inverseNormInf;

  return {
    norm1: normalizeNearZero(norm1),
    normInf: normalizeNearZero(normInf),
    inverseNorm1: normalizeNearZero(inverseNorm1),
    inverseNormInf: normalizeNearZero(inverseNormInf),
    cond1: Number.isFinite(cond1Raw) ? normalizeNearZero(cond1Raw) : null,
    condInf: Number.isFinite(condInfRaw) ? normalizeNearZero(condInfRaw) : null,
    invertible: true,
  };
}

export function perturbNumericMatrix(
  matrix: number[][],
  epsilon = 1e-6
): number[][] | null {
  if (!isValidNumericMatrix(matrix)) return null;
  return matrix.map((row) =>
    row.map((value) => normalizeNearZero(value + (Math.random() * 2 - 1) * epsilon))
  );
}

export function perturbNumericVector(
  vector: number[],
  epsilon = 1e-6
): number[] | null {
  if (!Array.isArray(vector) || vector.length === 0) return null;
  if (vector.some((value) => typeof value !== "number" || !Number.isFinite(value))) return null;
  return vector.map((value) => normalizeNearZero(value + (Math.random() * 2 - 1) * epsilon));
}

export function relativeMatrixErrorInfinity(
  baseline: number[][],
  candidate: number[][]
): number | null {
  if (!isValidNumericMatrix(baseline) || !isValidNumericMatrix(candidate)) return null;
  if (
    baseline.length !== candidate.length ||
    baseline[0].length !== candidate[0].length
  ) {
    return null;
  }

  let deltaNorm = 0;
  for (let r = 0; r < baseline.length; r += 1) {
    let rowSum = 0;
    for (let c = 0; c < baseline[0].length; c += 1) {
      rowSum += Math.abs(candidate[r][c] - baseline[r][c]);
    }
    if (rowSum > deltaNorm) {
      deltaNorm = rowSum;
    }
  }

  const baseNorm = matrixInfinityNormInternal(baseline);
  return normalizeNearZero(safeRelativeError(deltaNorm, baseNorm));
}

export function relativeVectorErrorInfinity(
  baseline: number[],
  candidate: number[]
): number | null {
  if (!Array.isArray(baseline) || !Array.isArray(candidate)) return null;
  if (!baseline.length || baseline.length !== candidate.length) return null;
  if (
    baseline.some((value) => typeof value !== "number" || !Number.isFinite(value)) ||
    candidate.some((value) => typeof value !== "number" || !Number.isFinite(value))
  ) {
    return null;
  }

  const delta = baseline.map((value, idx) => candidate[idx] - value);
  const deltaNorm = maxAbsVectorNorm(delta);
  const baseNorm = maxAbsVectorNorm(baseline);
  return normalizeNearZero(safeRelativeError(deltaNorm, baseNorm));
}

export function solveNumericLinearSystem(
  matrixA: number[][],
  vectorB: number[]
): number[] | null {
  if (!isValidNumericMatrix(matrixA)) return null;
  const n = matrixA.length;
  if (matrixA[0].length !== n) return null;
  if (!Array.isArray(vectorB) || vectorB.length !== n) return null;
  if (vectorB.some((value) => typeof value !== "number" || !Number.isFinite(value))) return null;

  const augmented = matrixA.map((row, idx) => [...row, vectorB[idx]]);

  for (let col = 0; col < n; col += 1) {
    let pivotRow = col;
    let maxAbs = Math.abs(augmented[col][col]);
    for (let row = col + 1; row < n; row += 1) {
      const abs = Math.abs(augmented[row][col]);
      if (abs > maxAbs) {
        maxAbs = abs;
        pivotRow = row;
      }
    }

    if (maxAbs < EPS) return null;

    if (pivotRow !== col) {
      [augmented[col], augmented[pivotRow]] = [augmented[pivotRow], augmented[col]];
    }

    for (let row = col + 1; row < n; row += 1) {
      const factor = augmented[row][col] / augmented[col][col];
      if (Math.abs(factor) < EPS) continue;
      for (let c = col; c <= n; c += 1) {
        augmented[row][c] -= factor * augmented[col][c];
      }
    }
  }

  const x = Array.from({ length: n }, () => 0);
  for (let row = n - 1; row >= 0; row -= 1) {
    let sum = augmented[row][n];
    for (let c = row + 1; c < n; c += 1) {
      sum -= augmented[row][c] * x[c];
    }

    const pivot = augmented[row][row];
    if (Math.abs(pivot) < EPS) return null;
    x[row] = normalizeNearZero(sum / pivot);
  }

  return x;
}

function sortEigenComponents(components: EigenComponent[]): EigenComponent[] {
  return [...components].sort((left, right) => {
    const a = toComplexParts(left);
    const b = toComplexParts(right);
    if (Math.abs(a.re - b.re) > 1e-8) return a.re - b.re;
    return a.im - b.im;
  });
}

export function relativeEigenError(
  baseline: EigenComponent[],
  candidate: EigenComponent[]
): number | null {
  if (!baseline.length || baseline.length !== candidate.length) return null;

  const left = sortEigenComponents(baseline);
  const right = sortEigenComponents(candidate);

  let maxDiff = 0;
  let baseMagnitude = 0;

  for (let i = 0; i < left.length; i += 1) {
    const a = toComplexParts(left[i]);
    const b = toComplexParts(right[i]);
    const diff = Math.hypot(a.re - b.re, a.im - b.im);
    maxDiff = Math.max(maxDiff, diff);
    baseMagnitude = Math.max(baseMagnitude, componentMagnitude(left[i]));
  }

  return normalizeNearZero(maxDiff / Math.max(baseMagnitude, EPS));
}

type IterativeConvergenceInfo = {
  spectralRadius: number | null;
  convergenceGuaranteed: boolean | null;
  convergenceMessage?: string;
};

function buildIterationMatrix(
  method: IterativeMethod,
  matrixA: number[][],
  omega: number
): { matrix: number[][] | null; message?: string } {
  if (method === "conjugateGradient") {
    return {
      matrix: null,
      message:
        "共轭梯度法没有固定迭代矩阵 B，rho(B) 判据不适用。",
    };
  }

  const size = matrixA.length;
  const d = zeroNumericMatrix(size, size);
  const l = zeroNumericMatrix(size, size);
  const u = zeroNumericMatrix(size, size);

  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      if (r === c) {
        d[r][c] = matrixA[r][c];
      } else if (r > c) {
        l[r][c] = matrixA[r][c];
      } else {
        u[r][c] = matrixA[r][c];
      }
    }
  }

  if (method === "jacobi") {
    const dInv = zeroNumericMatrix(size, size);
    for (let i = 0; i < size; i += 1) {
      if (Math.abs(d[i][i]) < EPS) {
        return {
          matrix: null,
          message: `对角元 a(${i + 1},${i + 1}) 为 0，无法构造 Jacobi 迭代矩阵 B。`,
        };
      }
      dInv[i][i] = 1 / d[i][i];
    }

    const lPlusU = addNumericMatrices(l, u);
    if (!lPlusU) return { matrix: null, message: "无法构造 Jacobi 迭代矩阵 B。" };

    const product = multiplyNumericMatrices(dInv, lPlusU);
    if (!product) return { matrix: null, message: "无法构造 Jacobi 迭代矩阵 B。" };

    return { matrix: scaleNumericMatrix(product, -1) };
  }

  if (method === "gaussSeidel") {
    const dPlusL = addNumericMatrices(d, l);
    if (!dPlusL) return { matrix: null, message: "无法构造 Gauss-Seidel 迭代矩阵 B。" };

    const leftInverse = invertNumericMatrix(dPlusL);
    if (!leftInverse) {
      return {
        matrix: null,
        message: "矩阵 (D + L) 奇异，无法构造 Gauss-Seidel 迭代矩阵 B。",
      };
    }

    const product = multiplyNumericMatrices(leftInverse, u);
    if (!product) return { matrix: null, message: "无法构造 Gauss-Seidel 迭代矩阵 B。" };

    return { matrix: scaleNumericMatrix(product, -1) };
  }

  const dPlusOmegaL = addNumericMatrices(d, scaleNumericMatrix(l, omega));
  if (!dPlusOmegaL) return { matrix: null, message: "无法构造 SOR 迭代矩阵 B。" };

  const leftInverse = invertNumericMatrix(dPlusOmegaL);
  if (!leftInverse) {
    return {
      matrix: null,
      message: "矩阵 (D + omega*L) 奇异，无法构造 SOR 迭代矩阵 B。",
    };
  }

  const right = addNumericMatrices(
    scaleNumericMatrix(u, omega),
    scaleNumericMatrix(d, omega - 1)
  );
  if (!right) return { matrix: null, message: "无法构造 SOR 迭代矩阵 B。" };

  const product = multiplyNumericMatrices(leftInverse, right);
  if (!product) return { matrix: null, message: "无法构造 SOR 迭代矩阵 B。" };

  return { matrix: scaleNumericMatrix(product, -1) };
}

function spectralRadiusFromMatrix(matrix: number[][]): number | null {
  const eigen = eigsWithMathjs(matrix);
  if (!eigen || !eigen.values.length) return null;

  let maxMagnitude = 0;
  for (const value of eigen.values) {
    maxMagnitude = Math.max(maxMagnitude, componentMagnitude(value));
  }

  if (!Number.isFinite(maxMagnitude)) return null;
  return normalizeNearZero(maxMagnitude);
}

function evaluateIterativeConvergence(
  method: IterativeMethod,
  matrixA: number[][],
  omega: number
): IterativeConvergenceInfo {
  const built = buildIterationMatrix(method, matrixA, omega);
  if (!built.matrix) {
    return {
      spectralRadius: null,
      convergenceGuaranteed: null,
      convergenceMessage: built.message ?? "由于无法构造 B，暂无法判定是否保证收敛。",
    };
  }

  const spectralRadius = spectralRadiusFromMatrix(built.matrix);
  if (spectralRadius === null) {
    return {
      spectralRadius: null,
      convergenceGuaranteed: null,
      convergenceMessage: "无法计算 rho(B)，暂无法给出保证收敛判定。",
    };
  }

  const convergenceGuaranteed = spectralRadius < 1;
  return {
    spectralRadius,
    convergenceGuaranteed,
    convergenceMessage: convergenceGuaranteed
      ? `rho(B)=${formatNumberPrecise(spectralRadius)} < 1，保证收敛。`
      : `rho(B)=${formatNumberPrecise(spectralRadius)} >= 1，不保证收敛。`,
  };
}
function iterativeHistoryEntry(iteration: number, vector: number[], residual: number): {
  iteration: number;
  vector: string[];
  residual: number;
} {
  return {
    iteration,
    vector: vector.map((value) => formatNumberPrecise(value)),
    residual,
  };
}

export function solveLinearSystemIterative(options: {
  method: IterativeMethod;
  matrixA: number[][];
  vectorB: number[];
  tolerance?: number;
  maxIterations?: number;
  initialGuess?: number[];
  omega?: number;
}): IterativeSolveResult | null {
  const { method, matrixA, vectorB } = options;

  const rows = matrixA.length;
  const cols = matrixA[0]?.length ?? 0;
  if (!rows || rows !== cols || vectorB.length !== rows) {
    return null;
  }

  if (matrixA.some((row) => row.length !== cols)) {
    return null;
  }

  const toleranceCandidate = options.tolerance ?? 1e-10;
  const tolerance =
    Number.isFinite(toleranceCandidate) && toleranceCandidate > 0
      ? toleranceCandidate
      : 1e-10;

  const maxIterationsCandidate = options.maxIterations ?? 120;
  const maxIterations =
    Number.isFinite(maxIterationsCandidate) && maxIterationsCandidate >= 1
      ? Math.floor(maxIterationsCandidate)
      : 120;

  const omegaCandidate = options.omega ?? 1.1;
  const omega =
    Number.isFinite(omegaCandidate) && omegaCandidate > 0 ? omegaCandidate : 1.1;

  const convergenceInfo = evaluateIterativeConvergence(method, matrixA, omega);

  const defaultGuess = Array.from({ length: rows }, () => 0);
  const initialGuess =
    options.initialGuess && options.initialGuess.length === rows
      ? options.initialGuess.map((value) => normalizeNearZero(value))
      : defaultGuess;

  const history: Array<{ iteration: number; vector: string[]; residual: number }> = [];
  const notes: string[] = [];

  if (method === "conjugateGradient") {
    if (!isSymmetricMatrix(matrixA)) {
      return {
        method,
        converged: false,
        iterations: 0,
        residual: Number.POSITIVE_INFINITY,
        spectralRadius: convergenceInfo.spectralRadius,
        convergenceGuaranteed: convergenceInfo.convergenceGuaranteed,
        solution: initialGuess.map((value) => formatNumberPrecise(value)),
        history: [iterativeHistoryEntry(0, initialGuess, Number.POSITIVE_INFINITY)],
        convergenceMessage: convergenceInfo.convergenceMessage,
        note: "Conjugate Gradient 要求矩阵为对称正定（SPD），当前矩阵不是对称矩阵。",
      };
    }

    if (!isPositiveDefiniteByCholesky(matrixA)) {
      return {
        method,
        converged: false,
        iterations: 0,
        residual: Number.POSITIVE_INFINITY,
        spectralRadius: convergenceInfo.spectralRadius,
        convergenceGuaranteed: convergenceInfo.convergenceGuaranteed,
        solution: initialGuess.map((value) => formatNumberPrecise(value)),
        history: [iterativeHistoryEntry(0, initialGuess, Number.POSITIVE_INFINITY)],
        convergenceMessage: convergenceInfo.convergenceMessage,
        note: "Conjugate Gradient 要求矩阵为对称正定（SPD），当前矩阵未通过正定性检查。",
      };
    }

    let current = initialGuess.slice();
    const ax = matVecMultiply(matrixA, current);
    let r = vectorB.map((value, i) => value - ax[i]);
    let p = r.slice();
    let rr = dotProduct(r, r);

    let residual = maxAbsAxMinusB(matrixA, current, vectorB) ?? Number.POSITIVE_INFINITY;
    history.push(iterativeHistoryEntry(0, current, residual));

    let converged = residual <= tolerance || Math.sqrt(Math.max(rr, 0)) <= tolerance;
    let iterations = 0;

    for (let iter = 1; iter <= maxIterations && !converged; iter += 1) {
      const ap = matVecMultiply(matrixA, p);
      const denom = dotProduct(p, ap);
      if (Math.abs(denom) < EPS) {
        notes.push("迭代方向分母过小，CG 提前终止。请检查矩阵条件数。");
        break;
      }

      const alpha = rr / denom;
      current = current.map((value, i) => normalizeNearZero(value + alpha * p[i]));
      r = r.map((value, i) => normalizeNearZero(value - alpha * ap[i]));

      const rrNew = dotProduct(r, r);
      residual = maxAbsAxMinusB(matrixA, current, vectorB) ?? Number.POSITIVE_INFINITY;
      iterations = iter;

      if (iter <= 10 || iter % 5 === 0 || residual <= tolerance || iter === maxIterations) {
        history.push(iterativeHistoryEntry(iter, current, residual));
      }

      if (residual <= tolerance || Math.sqrt(Math.max(rrNew, 0)) <= tolerance) {
        converged = true;
        rr = rrNew;
        break;
      }

      const beta = rrNew / rr;
      p = r.map((value, i) => normalizeNearZero(value + beta * p[i]));
      rr = rrNew;
    }

    const tail = history[history.length - 1];
    const tailKey = tail?.vector.join(",") ?? "";
    const currentKey = current.map((value) => formatNumberPrecise(value)).join(",");
    if (tailKey !== currentKey) {
      history.push(iterativeHistoryEntry(iterations, current, residual));
    }

    if (!converged) {
      notes.push(
        `达到最大迭代次数 ${maxIterations} 后仍未满足容差 ${formatNumberPrecise(tolerance)}。`
      );
    }

    return {
      method,
      converged,
      iterations,
      residual,
      spectralRadius: convergenceInfo.spectralRadius,
      convergenceGuaranteed: convergenceInfo.convergenceGuaranteed,
      solution: current.map((value) => formatNumberPrecise(value)),
      history,
      note: notes.length ? notes.join(" ") : undefined,
      convergenceMessage: convergenceInfo.convergenceMessage,
    };
  }

  for (let i = 0; i < rows; i += 1) {
    if (Math.abs(matrixA[i][i]) < EPS) {
      return {
        method,
        converged: false,
        iterations: 0,
        residual: Number.POSITIVE_INFINITY,
        spectralRadius: convergenceInfo.spectralRadius,
        convergenceGuaranteed: convergenceInfo.convergenceGuaranteed,
        solution: initialGuess.map((value) => formatNumberPrecise(value)),
        history: [iterativeHistoryEntry(0, initialGuess, Number.POSITIVE_INFINITY)],
        convergenceMessage: convergenceInfo.convergenceMessage,
        note: `主对角线存在 0（第 ${i + 1} 行），当前迭代法不可用。`,
      };
    }
  }

  let current = initialGuess.slice();
  let residual = maxAbsAxMinusB(matrixA, current, vectorB) ?? Number.POSITIVE_INFINITY;
  history.push(iterativeHistoryEntry(0, current, residual));

  let converged = residual <= tolerance;
  let iterations = 0;

  for (let iter = 1; iter <= maxIterations && !converged; iter += 1) {
    const next = current.slice();

    for (let i = 0; i < rows; i += 1) {
      let sigma = 0;
      for (let j = 0; j < cols; j += 1) {
        if (j === i) continue;

        if (method === "jacobi") {
          sigma += matrixA[i][j] * current[j];
          continue;
        }

        const xj = j < i ? next[j] : current[j];
        sigma += matrixA[i][j] * xj;
      }

      const gaussSeidelUpdate = (vectorB[i] - sigma) / matrixA[i][i];
      if (method === "sor") {
        next[i] = normalizeNearZero((1 - omega) * current[i] + omega * gaussSeidelUpdate);
      } else {
        next[i] = normalizeNearZero(gaussSeidelUpdate);
      }
    }

    const delta = maxAbsDelta(next, current);
    residual = maxAbsAxMinusB(matrixA, next, vectorB) ?? Number.POSITIVE_INFINITY;
    iterations = iter;
    current = next;

    if (iter <= 10 || iter % 5 === 0 || residual <= tolerance || iter === maxIterations) {
      history.push(iterativeHistoryEntry(iter, current, residual));
    }

    if (delta <= tolerance || residual <= tolerance) {
      converged = true;
    }
  }

  const tail = history[history.length - 1];
  const tailKey = tail?.vector.join(",") ?? "";
  const currentKey = current.map((value) => formatNumberPrecise(value)).join(",");
  if (tailKey !== currentKey) {
    history.push(iterativeHistoryEntry(iterations, current, residual));
  }

  if (!isStrictlyDiagonallyDominant(matrixA)) {
    notes.push("矩阵不满足严格对角占优，迭代可能不收敛或收敛较慢。");
  }
  if (method === "sor" && (omega <= 0 || omega >= 2)) {
    notes.push("SOR 通常建议 0 < omega < 2，当前参数可能导致发散。");
  }
  if (!converged) {
    notes.push(
      `达到最大迭代次数 ${maxIterations} 后仍未满足容差 ${formatNumberPrecise(tolerance)}。`
    );
  }

  return {
    method,
    converged,
    iterations,
    residual,
    spectralRadius: convergenceInfo.spectralRadius,
    convergenceGuaranteed: convergenceInfo.convergenceGuaranteed,
    solution: current.map((value) => formatNumberPrecise(value)),
    history,
    note: notes.length ? notes.join(" ") : undefined,
    convergenceMessage: convergenceInfo.convergenceMessage,
  };
}

export function describeStep(step: Step, mode: DisplayMode): string {
  if (step.operationLabel) {
    return step.operationLabel.replace(/\(([^)]+)\)/g, (_, expr: string) => {
      return `(${formatValue(expr, mode)})`;
    });
  }

  switch (step.kind) {
    case "start":
      return "初始增广矩阵";
    case "skip":
      return `第 ${step.col !== undefined ? step.col + 1 : "?"} 列没有可用主元，跳过`;
    case "swap":
      return `交换 R${(step.pivotRow ?? 0) + 1} 与 R${(step.swapWith ?? 0) + 1}`;
    case "eliminate":
      return `R${(step.targetRow ?? 0) + 1} <- R${(step.targetRow ?? 0) + 1} - (${formatValue(
        step.factor ?? "0",
        mode
      )})R${(step.pivotRow ?? 0) + 1}`;
    case "done":
      return "消元完成";
    default:
      return "";
  }
}

export function computeOperationResult(options: {
  op: "transpose" | "simplify" | "scalar" | "square" | "add" | "subtract" | "multiply" | "inverse" | "rank" | "determinant";
  matrixA: string[][];
  matrixB: string[][];
  scalar: string;
}): MatrixOperationResult {
  const { op, matrixA, matrixB, scalar } = options;

  if (op === "transpose") {
    return {
      matrix: transposeMatrix(matrixA),
      text: "\u77e9\u9635\u8f6c\u7f6e\u5df2\u5b8c\u6210",
      tone: "success",
    };
  }

  if (op === "simplify") {
    return {
      matrix: rrefMatrix(matrixA),
      text: "\u884c\u6700\u7b80\u9636\u68af\u5f62\uff08RREF\uff09\u5df2\u751f\u6210",
      tone: "success",
    };
  }

  if (op === "scalar") {
    return {
      matrix: scalarMultiplyMatrix(matrixA, simplifyExpr(scalar || "1")),
      text: "\u6570\u4e58\u8fd0\u7b97\u5df2\u5b8c\u6210",
      tone: "success",
    };
  }

  if (op === "square") {
    if (matrixA.length !== matrixA[0].length) {
      return {
        matrix: null,
        text: "A^2 \u4ec5\u652f\u6301\u65b9\u9635 A",
        tone: "error",
      };
    }

    return {
      matrix: multiplyMatrices(matrixA, matrixA),
      text: "\u77e9\u9635\u5e73\u65b9 A*A \u5df2\u5b8c\u6210",
      tone: "success",
    };
  }

  if (op === "inverse") {
    if (matrixA.length !== matrixA[0].length) {
      return {
        matrix: null,
        text: "\u6c42\u9006\u4ec5\u652f\u6301\u65b9\u9635 A",
        tone: "error",
      };
    }

    const inverse = inverseMatrix(matrixA);
    if (!inverse) {
      return {
        matrix: null,
        text: "\u77e9\u9635\u4e0d\u53ef\u9006\uff08det(A)=0 \u6216\u4e3b\u5143\u9000\u5316\uff09",
        tone: "error",
      };
    }

    return {
      matrix: inverse,
      text: "\u77e9\u9635 A \u7684\u9006\u5df2\u8ba1\u7b97",
      tone: "success",
    };
  }

  if (op === "rank") {
    return {
      matrix: null,
      text: `rank(A) = ${rankMatrix(matrixA)}` ,
      tone: "success",
    };
  }

  if (op === "determinant") {
    if (matrixA.length !== matrixA[0].length) {
      return {
        matrix: null,
        text: "\u884c\u5217\u5f0f\u8ba1\u7b97\u4ec5\u652f\u6301\u65b9\u9635 A",
        tone: "error",
      };
    }

    return {
      matrix: null,
      text: `det(A) = ${determinant(matrixA)}`,
      tone: "success",
    };
  }

  if (op === "multiply") {
    if (matrixA[0].length !== matrixB.length) {
      return {
        matrix: null,
        text: "\u77e9\u9635\u4e58\u6cd5\u8981\u6c42 A \u7684\u5217\u6570\u7b49\u4e8e B \u7684\u884c\u6570",
        tone: "error",
      };
    }

    return {
      matrix: multiplyMatrices(matrixA, matrixB),
      text: "\u77e9\u9635\u4e58\u6cd5 A*B \u5df2\u5b8c\u6210",
      tone: "success",
    };
  }

  if (op === "add" || op === "subtract") {
    if (
      matrixA.length !== matrixB.length ||
      matrixA[0].length !== matrixB[0].length
    ) {
      return {
        matrix: null,
        text: op === "add"
          ? "\u77e9\u9635\u52a0\u6cd5\u8981\u6c42 A \u4e0e B \u540c\u578b"
          : "\u77e9\u9635\u51cf\u6cd5\u8981\u6c42 A \u4e0e B \u540c\u578b",
        tone: "error",
      };
    }

    return {
      matrix: op === "add" ? addMatrices(matrixA, matrixB) : subtractMatrices(matrixA, matrixB),
      text: op === "add"
        ? "\u77e9\u9635\u52a0\u6cd5 A+B \u5df2\u5b8c\u6210"
        : "\u77e9\u9635\u51cf\u6cd5 A-B \u5df2\u5b8c\u6210",
      tone: "success",
    };
  }

  return {
    matrix: null,
    text: "\u4e0d\u652f\u6301\u7684\u8fd0\u7b97",
    tone: "error",
  };
}
