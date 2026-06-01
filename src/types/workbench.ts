/**
 * 工作台共享类型定义
 * 从 page.tsx 提取的公共类型
 */

import type { Calculator } from "lucide-react";
import type {
  CholeskyResult,
  LUResult,
  QRResult,
  ResultTone,
  SVDResult,
} from "./matrix";

/**
 * 标签页 ID
 */
export type TabId =
  | "operations"
  | "system"
  | "determinant"
  | "decomposition"
  | "eigen"
  | "nonlinear"
  | "approximation"
  | "integration"
  | "ode"
  | "errorAnalysis";

/**
 * 矩阵分解模式
 */
export type DecompositionMode = "lu" | "luPlain" | "qr" | "cholesky" | "svd";

/**
 * 反馈信息
 */
export type Feedback = {
  tone: ResultTone;
  text: string;
};

/**
 * 扰动目标
 */
export type PerturbationTarget = "A" | "b";

/**
 * 特征值扰动分析结果
 */
export type EigenPerturbationResult = {
  target: PerturbationTarget;
  epsilon: number;
  matrixRelativeError: number | null;
  vectorRelativeError: number | null;
  eigenRelativeError: number | null;
  solutionRelativeError: number | null;
  baselineSolution: string[] | null;
  perturbedSolution: string[] | null;
};

/**
 * 矩阵分解结果（联合类型）
 */
export type DecompositionResult =
  | {
      mode: "lu" | "luPlain";
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
    }
  | {
      mode: "svd";
      decomposition: SVDResult;
      residual: number | null;
      orthResidualU: number | null;
      orthResidualV: number | null;
      threshold: number;
      passed: boolean | null;
    };

/**
 * 导航区域定义
 */
export type NavSection = {
  title: string;
  items: Array<{
    id: TabId;
    label: string;
    description: string;
    icon: typeof Calculator;
  }>;
};

/**
 * 侧边栏工具标签
 */
export type SidebarToolTab = "nav" | "cases" | "params" | "verify" | "data";

/**
 * 历史记录状态
 */
export type HistoryState = {
  canUndo: boolean;
  canRedo: boolean;
  index: number;
  total: number;
};

/**
 * 常量：残差阈值
 */
export const RESIDUAL_THRESHOLD = 1e-10;

/**
 * 常量：历史记录限制
 */
export const HISTORY_LIMIT = 120;

/**
 * 常量：导航抽屉媒体查询
 */
export const NAV_DRAWER_MEDIA_QUERY = "(max-width: 1023px)";

/**
 * 正确性描述符（用于正确性面板展示）
 */
export type CorrectnessDescriptor = {
  title: string;
  equation?: string;
  residual?: number | null;
  threshold?: number | null;
  passed?: boolean | null;
  note?: string;
  metrics?: Array<{ label: string; value: string }>;
};
