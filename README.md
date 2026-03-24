# Linear Algebra Studio

预览网址：[math.gchkc.top](https://math.gchkc.top)

一个面向学习与工程实践的线性代数可视化工具。项目聚焦三件事：

- 结果正确：核心算法提供残差与一致性校验，避免“看起来对”但实际错误。
- 过程可解释：支持步骤回放、主元交换原因说明、解类型判定。
- 数据可复用：通过全局矩阵库实现跨模块流转与链式计算。

## 功能总览

### 1. 矩阵运算

- 支持 `A+B`、`A-B`、`A*B`、`A^-1`、`A^2`、`转置`、`RREF`、`数乘`
- 支持 `秩` 与 `行列式`，并在结果区展示具体数值
- 输入支持分数、整数、小数与符号表达（显示模式可切换）

### 2. 线性方程组

- 解法支持：
- `高斯消元`
- `高斯-约旦`
- `Jacobi`
- `Gauss-Seidel`
- `SOR`
- `共轭梯度法`
- 自动判定解类型：`无解 / 唯一解 / 无穷多解`
- 输出 `rank(A)` 与 `rank([A|b])`
- 无穷多解支持参数化表达
- 迭代法自动计算谱半径 `ρ(B)`，给出“是否保证收敛”的判定提示

### 3. 矩阵分解与特征分析

- 分解支持：`LU（带主元）`、`QR（Householder）`、`Cholesky`
- 显示并校验分解残差：
- LU：`maxAbs(PA - LU)`
- QR：`maxAbs(A - QR)` 与 `maxAbs(Q^TQ - I)`
- Cholesky：`maxAbs(A - LL^T)`
- 特征分析支持复数特征值与特征向量配对展示（`λi ↔ vi`）
- 缺陷矩阵可识别并提示不可对角化

### 4. 全局矩阵库（Matrix Library）

- 使用 Zustand 全局状态管理
- 支持保存、重命名、删除、设为当前活动矩阵
- 支持普通矩阵与增广矩阵类型区分
- localStorage 持久化，刷新后不丢失
- 结果区可“一键存入库”，用于下一步链式计算

### 5. 智能识别（Smart Import）

- 侧边栏提供“智能识别”入口
- 支持文本格式快速导入，例如：`1,1;2,2;3,3`
- 支持增广分隔输入，例如：`1,2|3;4,5|6`
- 支持拍照/扫码导入（浏览器支持 `BarcodeDetector` 时）
- 导入后先进入可编辑预览，再保存到矩阵库

### 6. 交互与体验

- Container-based 响应式布局
- 移动端矩阵输入支持内部平滑横向滚动，避免整页溢出
- 侧边栏矩阵预览支持大矩阵滚动查看，不再截断 3x4
- 运算、求解、分解状态统一 Toast 反馈

## 技术栈

- 框架：Next.js 16 + React 19 + TypeScript
- 样式：Tailwind CSS 4 + Typography 插件
- 图标：lucide-react
- 数学计算：mathjs + fraction.js
- 状态管理：zustand（含 persist）

## 目录结构

```text
src/
  app/
    page.tsx                 # 主工作台
    about/page.tsx           # 关于页
    robots.ts                # robots
    sitemap.ts               # sitemap
    manifest.ts              # Web App Manifest
  components/matrix/
    MatrixGrid.tsx           # 矩阵网格（编辑/展示）
    MatrixShelf.tsx          # 矩阵库 + 智能识别
    SaveToLibraryButton.tsx  # 结果存库
    StepCard.tsx             # 步骤卡片
    ToastHost.tsx            # 全局 Toast
  hooks/useMatrix.ts         # 主业务编排 Hook
  lib/matrix-core.ts         # 核心算法与数值逻辑
  store/matrix-library.ts    # 全局矩阵库状态
```

## 本地运行

```bash
npm install
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)

## 提交时自动更新 CHANGELOG

```bash
# 初始化 Git Hook（只需一次）
npm run setup:hooks
```

- 默认行为：每次 `git commit` 会优先调用 `codex exec` 对已暂存改动做审查并更新 `CHANGELOG.md`，然后自动 `git add CHANGELOG.md`。
- 回退行为：若本机不可用 Codex 或执行失败，会回退到本地规则审查，保证提交不中断。
- 强制使用 Codex：设置环境变量 `CHANGELOG_REQUIRE_CODEX=1`，Codex 失败时会直接阻止提交。
- 自定义 Codex 命令：可配置 `hooks.codexChangelogCommand`，支持占位符
- `{REPO_ROOT}` `{CHANGELOG}` `{COMMIT_MSG}` `{STAGED_DIFF}` `{STAGED_FILES}` `{SUBJECT}`

## 质量检查

```bash
# 类型检查
npx tsc --noEmit

# 代码规范
npm run lint

# 数学回归测试
npm run test:math

# 生产构建
npm run build
```

## 部署到 Vercel

1. 将仓库推送到 GitHub
2. 在 Vercel 中导入项目
3. 配置环境变量：

```bash
NEXT_PUBLIC_SITE_URL=https://your-domain.vercel.app
```

4. 点击 Deploy

项目已内置：

- SEO metadata（title/description/open graph/twitter）
- `robots.txt` / `sitemap.xml`
- `manifest.webmanifest`
- 安全响应头与静态资源缓存策略

## 输入格式示例

- 文本矩阵：`1,2,3;4,5,6`
- 逐行输入：
- `1 2 3`
- `4 5 6`
- 增广矩阵：`1,2|3;4,5|6`
- 支持 Excel/CSV 粘贴到矩阵输入网格

## 项目目标

- 让线性代数计算“可视、可证、可复用”
- 在保证数学正确性的前提下，持续优化交互效率

## 联系方式

- GitHub: <https://github.com/GCHkongcheng/linear-algebra-visualizer>
- Email: 2839474636@qq.com
