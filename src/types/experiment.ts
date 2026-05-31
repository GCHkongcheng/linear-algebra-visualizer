export type ExperimentModule =
  | "linear-algebra"
  | "nonlinear"
  | "approximation"
  | "integration"
  | "ode"
  | "error-analysis";

export type ReliabilityTone = "success" | "warning" | "error" | "info";

export type ReliabilityItem = {
  label: string;
  tone: ReliabilityTone;
  detail: string;
};

export type ExperimentCase = {
  id: string;
  title: string;
  description: string;
  tag?: string;
};

export type ComparisonRow = {
  method: string;
  value: string;
  metric: string;
  cost: string;
  tone: ReliabilityTone;
  note: string;
};

export type ScanRow = {
  parameter: string;
  value: string;
  metric: string;
  tone: ReliabilityTone;
  note?: string;
};

export type SavedExperimentRecord = {
  id: string;
  name: string;
  module: ExperimentModule;
  summary: string;
  payload: unknown;
  createdAt: string;
};
