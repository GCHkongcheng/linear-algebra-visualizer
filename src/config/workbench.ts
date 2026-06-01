import {
  AlertTriangle,
  Braces,
  Calculator,
  ChartArea,
  FunctionSquare,
  LineChart,
  Sigma,
  SplitSquareVertical,
} from "lucide-react";

import type { ExperimentCase } from "@/types/experiment";
import type { NavSection, SidebarToolTab } from "@/types/workbench";

export const SIDEBAR_TOOL_TABS: Array<{ id: SidebarToolTab; label: string }> = [
  { id: "nav", label: "导航" },
  { id: "cases", label: "案例" },
  { id: "params", label: "参数" },
  { id: "verify", label: "验证" },
  { id: "data", label: "数据" },
];

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "数值线性代数",
    items: [
      {
        id: "operations",
        label: "矩阵运算",
        description: "基础矩阵计算与 RREF",
        icon: Calculator,
      },
      {
        id: "system",
        label: "线性方程组",
        description: "直接法与迭代法",
        icon: Braces,
      },
      {
        id: "determinant",
        label: "行列式",
        description: "方阵体积因子与可逆性",
        icon: Sigma,
      },
      {
        id: "decomposition",
        label: "矩阵分解",
        description: "LU / QR / Cholesky / SVD",
        icon: SplitSquareVertical,
      },
      {
        id: "eigen",
        label: "特征分析",
        description: "特征值、特征向量与对角化",
        icon: FunctionSquare,
      },
    ],
  },
  {
    title: "方程与逼近",
    items: [
      {
        id: "nonlinear",
        label: "非线性方程求根",
        description: "迭代求根与收敛过程",
        icon: Sigma,
      },
      {
        id: "approximation",
        label: "插值与逼近",
        description: "数据点、曲线与误差",
        icon: LineChart,
      },
    ],
  },
  {
    title: "积分与微分方程",
    items: [
      {
        id: "integration",
        label: "数值积分",
        description: "求积策略与误差估计",
        icon: ChartArea,
      },
      {
        id: "ode",
        label: "常微分方程",
        description: "初值问题与步进误差",
        icon: FunctionSquare,
      },
    ],
  },
  {
    title: "误差与稳定性",
    items: [
      {
        id: "errorAnalysis",
        label: "误差分析",
        description: "条件数、扰动与稳定性",
        icon: AlertTriangle,
      },
    ],
  },
];

export const MATRIX_EXPERIMENT_CASES: Record<string, ExperimentCase[]> = {
  operations: [
    {
      id: "ops-inverse",
      title: "可逆矩阵验证",
      description: "载入 3x3 可逆矩阵，适合计算逆矩阵并查看 A*A^-1 残差。",
      tag: "残差",
    },
    {
      id: "ops-rref",
      title: "RREF 行变换",
      description: "载入带相关行的矩阵，观察秩与最简阶梯形。",
      tag: "秩",
    },
  ],
  system: [
    {
      id: "system-unique",
      title: "唯一解方程组",
      description: "经典 3 元线性系统，适合比较直接法与迭代法。",
      tag: "直接法",
    },
    {
      id: "system-iterative",
      title: "对角占优迭代",
      description: "严格对角占优系统，Jacobi/Gauss-Seidel 通常收敛。",
      tag: "收敛",
    },
  ],
  determinant: [
    {
      id: "det-singular",
      title: "奇异矩阵",
      description: "两行线性相关，行列式应为 0。",
      tag: "奇异",
    },
  ],
  decomposition: [
    {
      id: "decomp-spd",
      title: "对称正定矩阵",
      description: "适合 Cholesky，也可比较 LU/QR/SVD 残差。",
      tag: "SPD",
    },
    {
      id: "decomp-rect",
      title: "长方矩阵",
      description: "适合 QR 与 SVD，对比非方阵分解能力。",
      tag: "SVD",
    },
  ],
  eigen: [
    {
      id: "eigen-diagonalizable",
      title: "可对角化矩阵",
      description: "具有清晰特征结构的矩阵，用于验证特征分析。",
      tag: "特征",
    },
    {
      id: "eigen-defective",
      title: "缺陷矩阵",
      description: "Jordan 块示例，几何重数不足。",
      tag: "不可对角化",
    },
  ],
  errorAnalysis: [
    {
      id: "error-hilbert",
      title: "病态 Hilbert 矩阵",
      description: "条件数较大，适合观察扰动放大。",
      tag: "病态",
    },
  ],
};
