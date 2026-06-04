# Numerical Analysis Studio

中文名：数值分析工作台

Numerical Analysis Studio 是一个面向数值分析学习与工程实践的 Web 可视化工作台。它把矩阵计算、线性方程组、矩阵分解、特征分析、非线性方程、插值逼近、数值积分、常微分方程和误差分析放在同一个可交互流程里，强调结果可验证、过程可解释、数据可复用。

- 线上预览：[https://math.gchkc.top](https://math.gchkc.top)
- 仓库地址：[GCHkongcheng/numerical-analysis-studio](https://github.com/GCHkongcheng/numerical-analysis-studio)
- 许可证：[MIT](LICENSE)

## 功能概览

- 数值线性代数：矩阵加减乘、逆、转置、RREF、秩、行列式、数乘、平方。
- 线性方程组：高斯消元、高斯-约旦、Jacobi、Gauss-Seidel、SOR、共轭梯度法，并展示解类型、秩和残差。
- 矩阵分解：LU、带主元 LU、QR、Cholesky、SVD，并展示分解残差和正交性校验。
- 特征分析：支持实数和复数特征值、特征向量配对、重数信息和不可对角化提示。
- 非线性方程求根：支持常见一元求根方法，展示迭代历史、误差变化和收敛状态。
- 插值与逼近：支持数据点插值、最小二乘、样条、函数实验和误差指标。
- 数值积分：支持复合梯形、Simpson、Romberg、Gauss-Legendre 等求积策略。
- 常微分方程：支持初值问题数值解、步进数据、精确解对比和误差指标。
- 误差与稳定性：支持条件数、矩阵/向量扰动、相对误差和病态矩阵观察。
- 全局矩阵库：基于 Zustand 和 localStorage，可保存、重命名、删除、复用矩阵。
- 智能导入：支持文本矩阵和增广矩阵导入，例如 `1,2;3,4`、`1,2|3;4,5|6`。

## 技术栈

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Math.js、fraction.js
- Zustand
- Lucide React
- Playwright

## 环境要求

- Node.js 20.9+，推荐使用当前 LTS 或项目验证过的 Node.js 22。
- npm 10+。

## 本地运行

```bash
npm install
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。

如需使用生产构建：

```bash
npm run build
npm run start
```

## 常用脚本

```bash
npm run dev        # 启动本地开发服务器
npm run build      # 生产构建
npm run start      # 启动生产服务，需要先 build
npm run lint       # ESLint 检查
npm run typecheck  # TypeScript 类型检查
npm run test:math  # 数学核心逻辑回归测试
npm run test:ui    # Playwright UI 回归测试
npm test           # 依次运行数学测试和 UI 测试
```

## 环境变量

项目没有必需的私密环境变量。可选配置：

```bash
NEXT_PUBLIC_SITE_URL=https://your-domain.example
```

`NEXT_PUBLIC_SITE_URL` 用于生成 metadata、robots、sitemap 和 manifest 中的站点 URL。可参考 [.env.example](.env.example)。

## 目录结构

```text
src/
  app/                       # Next.js App Router 页面、metadata、robots、sitemap、manifest
  components/
    approximation/           # 插值与逼近面板
    common/                  # 通用图表、实验工具、主题和符号键盘
    integration/             # 数值积分面板
    matrix/                  # 矩阵输入、矩阵库、结果、步骤、Toast
    nonlinear/               # 非线性方程求根面板
    ode/                     # 常微分方程面板
    workbench/               # 主工作台布局、导航和线性代数模块
  config/                    # 工作台导航、标签页和案例配置
  hooks/                     # 工作台状态编排、历史、Toast、响应式抽屉
  lib/                       # 数值算法核心逻辑
  store/                     # Zustand 全局状态
  types/                     # 共享类型定义
tests/ui/                    # Playwright UI 回归测试
scripts/                     # 数学测试与 Git Hook 辅助脚本
docs/archive/                # 历史设计与重构记录
```

## 质量检查

交接前建议至少跑完：

```bash
npm ci
npm run typecheck
npm run lint
npm run test:math
npm run build
npm run test:ui
```

Playwright 测试会自动启动本地 dev server。若 Windows 上 `npm ci` 因原生依赖文件被占用失败，先确认没有正在运行的 `next dev` 或其它 Node 进程占用当前项目的 `node_modules`。

## 部署

推荐部署到 Vercel：

1. 推送仓库到 GitHub。
2. 在 Vercel 导入项目。
3. 设置可选环境变量 `NEXT_PUBLIC_SITE_URL`。
4. 使用默认 Next.js 构建命令部署。

项目已内置：

- SEO metadata
- Open Graph / Twitter image route
- `robots.txt`
- `sitemap.xml`
- `manifest.webmanifest`
- 安全响应头和静态资源缓存策略

## Git Hook

项目提供可选的提交时 CHANGELOG 辅助脚本：

```bash
npm run setup:hooks
```

启用后，提交时会尝试根据暂存改动更新 [CHANGELOG.md](CHANGELOG.md)。如果本次提交已经手动修改 CHANGELOG，脚本会跳过自动写入。

## 维护说明

- 数学算法变更优先补充或更新 `scripts/test-math.ts`。
- 交互流程变更优先补充或更新 `tests/ui/`。
- 工作台导航结构集中在 `src/config/workbench.ts`。
- 交接状态、已知事项和后续建议见 [HANDOFF.md](HANDOFF.md)。

## 联系方式

- GitHub: <https://github.com/GCHkongcheng/numerical-analysis-studio>
- Email: 2839474636@qq.com
