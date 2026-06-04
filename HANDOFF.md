# HANDOFF

## 项目现状

Numerical Analysis Studio（数值分析工作台）当前是一个可运行、可构建、带自动化回归测试的 Next.js 16 + React 19 项目。主目标是提供数值分析学习和工程验证场景下的可视化计算工作台。

本轮交接检查已覆盖依赖安装、类型检查、Lint、数学核心测试、生产构建和 UI 回归测试。项目没有必需的私密环境变量。

## 运行方式

```bash
npm install
npm run dev
```

开发服务器默认运行在 [http://localhost:3000](http://localhost:3000)。

生产构建与启动：

```bash
npm run build
npm run start
```

建议接手后首次验证：

```bash
npm ci
npx tsc --noEmit
npm run lint
npm run test:math
npm run build
npm run test:ui
```

## 核心结构

```text
src/app/                    Next.js 页面、布局、metadata、robots、sitemap、manifest
src/components/workbench/   主工作台布局、导航、线性代数相关模块
src/components/matrix/      矩阵输入、结果展示、矩阵库、步骤卡片、Toast
src/components/common/      通用实验工具、图表、主题切换、符号键盘
src/components/*Panel.tsx   非线性方程、插值逼近、积分、ODE 等实验面板
src/config/workbench.ts     导航分区、侧栏工具标签、示例案例配置
src/hooks/                  工作台状态、历史、Toast、矩阵库桥接和响应式抽屉
src/lib/                    数值算法核心实现
src/store/                  Zustand 持久化状态
src/types/                  共享类型
tests/ui/                   Playwright UI 回归测试
scripts/test-math.ts        数学核心逻辑回归测试
```

## 已完成功能

- 矩阵运算：加、减、乘、逆、转置、RREF、秩、行列式、数乘、平方。
- 线性方程组：直接法和迭代法，包含解类型、秩、残差与收敛提示。
- 矩阵分解：LU、带主元 LU、QR、Cholesky、SVD，以及残差校验。
- 特征分析：实/复特征值、特征向量配对、重数和不可对角化提示。
- 非线性方程：Newton、阻尼 Newton、二分、割线、固定点、Steffensen 等流程。
- 插值与逼近：Lagrange、Newton、分段线性、Hermite、样条、最小二乘和函数实验。
- 数值积分：梯形、Simpson、Romberg、Gauss-Legendre，包含外推序列展示。
- ODE：常见初值问题求解、反向积分、末步缩短提示、误差对比。
- 误差分析：条件数、扰动和相对误差。
- 全局矩阵库：localStorage 持久化、智能导入、跨模块复用。
- 响应式交互：移动端导航抽屉、符号键盘、工作台撤销/重做。

## 已验证命令

最近一次交接检查通过：

- `npm ci`
- `npm run typecheck`
- `npx tsc --noEmit`
- `npm run lint`
- `npm run test:math`
- `npm run build`
- `npm run test:ui`
- `npm test`

## 已知事项

- `NEXT_PUBLIC_SITE_URL` 是可选环境变量；未配置时会回退到默认部署地址。
- `docs/archive/` 保存历史方案和重构记录，不参与运行链路。
- Playwright 会自动启动 dev server；如果本地已有 3000 端口服务，可能复用已有服务或导致测试环境不一致。
- Windows 上若 `npm ci` 报原生 `.node` 文件无法删除，通常是当前项目的 dev server 或 Node 进程占用了 `node_modules`。

## 后续扩展建议

- 为 `src/lib/` 中每个算法模块补充分模块测试文件，逐步拆分当前较大的 `scripts/test-math.ts`。
- 为矩阵库导入、拍照/扫码导入、移动端抽屉增加更多端到端测试。
- 增加算法说明页或内嵌帮助，将每种方法的适用条件、复杂度和失败原因结构化展示。
- 为大矩阵计算增加性能保护，例如尺寸限制、耗时提示、Web Worker 或分块计算。
- 为数值结果导出增加 CSV/JSON/Markdown 格式。
- 若计划长期部署，增加依赖安全扫描和发布前检查脚本。
