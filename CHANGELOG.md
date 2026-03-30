# 更新日志

本项目更新日志遵循 Keep a Changelog 约定，并使用语义化版本（SemVer）。

## [Unreleased]

### Added

- 关于页新增“说明文档”与“更新日志”入口，支持弹窗查看 Markdown 文档。
- 关于页新增博客指引链接：<https://blog.gchkc.top>

### Changed

- 文档弹窗从纯文本展示升级为 Markdown 渲染，支持标题、列表、表格等常见语法。

### Commit Audit
- 2026-03-30 18:22:25 | 提交：增加显示正确性证据功能
  - 文件审查：新增 1，修改 2
  - 变更范围：`README.md`、`src/app/page.tsx`、`src/components/matrix/CorrectnessPanel.tsx`
  - 风险提示：涉及前端交互，建议人工回归关键页面
- 2026-03-24 21:13:49 | 提交：Enable Codex-powered changelog updates on commit
  - 文件审查：修改 2
  - 变更范围：`README.md`、`scripts/update-changelog-on-commit.mjs`
## [0.1.0] - 2026-03-23

### Added

- 首次发布线性代数可视化工作台。
- 支持矩阵运算、线性方程组求解、矩阵分解与特征分析。
- 提供全局矩阵库、智能导入、步骤回放与结果校验能力。
