export type DisplayMode = "decimal" | "fraction" | "symbolic";

export type ResultTone = "success" | "warning" | "error";

export type MatrixOperation =
  | "transpose"
  | "simplify"
  | "scalar"
  | "square"
  | "add"
  | "subtract"
  | "multiply"
  | "inverse"
  | "rank";

export type StepKind = "start" | "swap" | "eliminate" | "skip" | "done";

export type Step = {
  matrix: string[][];
  kind: StepKind;
  pivot?: { row: number; col: number };
  activeRow?: number;
  col?: number;
  pivotRow?: number;
  targetRow?: number;
  swapWith?: number;
  factor?: string;
  operationLabel?: string;
  highlightRows?: number[];
  swapReason?: string;
};

export type SolveSummary = {
  type: "唯一解" | "无解" | "无穷多解";
  rankA: number;
  rankAug: number;
  solution?: string[];
  parametric?: string[];
  freeVariables?: string[];
};

export type IterativeMethod = "jacobi" | "gaussSeidel" | "sor" | "conjugateGradient";

export type DirectSolveMethod = "gaussianElimination" | "gaussJordan";

export type LinearSystemMethod = DirectSolveMethod | IterativeMethod;

export type IterativeSolveResult = {
  method: IterativeMethod;
  converged: boolean;
  iterations: number;
  residual: number;
  solution: string[];
  history: Array<{ iteration: number; vector: string[]; residual: number }>;
  note?: string;
};

export type MatrixOperationResult = {
  matrix: string[][] | null;
  text: string | null;
  tone: ResultTone;
};

export type ComplexValue = {
  re: number;
  im: number;
};

export type EigenComponent = number | ComplexValue;

export type EigenPair = {
  value: EigenComponent;
  vector: EigenComponent[];
};

export type EigenMultiplicity = {
  value: EigenComponent;
  algebraic: number;
  geometric: number;
};

export type EigenAnalysisResult = {
  values: EigenComponent[];
  vectors: EigenComponent[][];
  eigenPairs: EigenPair[];
  multiplicities: EigenMultiplicity[];
  diagonalizable: boolean;
};

export type LUResult = {
  L: string[][];
  U: string[][];
  P: string[][];
};

export type QRResult = {
  Q: string[][];
  R: string[][];
};

export type CholeskyResult = {
  L: string[][];
  Lt: string[][];
};
