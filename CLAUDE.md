# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

GIS 工具项目，基于 Vue 3 + TypeScript + Vite 构建，使用 OpenLayers 作为地图引擎，Element Plus 作为 UI 组件库。支持多种GIS数据格式的读取、解析、坐标转换和可视化。

**在线体验**: https://sphinxhq.github.io/gis-tools/

## 常用命令

```bash
pnpm dev          # 启动开发服务器
pnpm build        # 构建生产版本
pnpm preview      # 预览构建结果

pnpm test         # 运行测试 (watch 模式)
pnpm test:run     # 运行测试 (单次执行)
pnpm test:ui      # 启动测试 UI 界面

pnpm lint         # 代码检查
pnpm lint:fix     # 自动修复 lint 问题
pnpm typecheck    # TypeScript 类型检查
```

## 部署

推送到 `main` 分支会自动触发 GitHub Actions (`deploy.yml`)，构建并部署到 GitHub Pages。

## 核心架构

### 数据流

```
用户输入(文件/拖拽/粘贴)
  → GisDataSetTabs (多数据集Tab管理, 拖拽导入)
    → GisDataTransformer (单数据集, 坐标转换Tab链)
      → GisDataViewer (GeoJson/WKT/地图/检查/绘图 多视图)
        → GeoStrEditor (Monaco代码编辑器)
        → GisMapBase (OpenLayers地图)
```

### 地图系统 (GisMap)

核心类位于 `src/components/gismap/GisMap.ts`，基于 OpenLayers 封装：
- `GisMap` - 基础地图类，管理 olMap 实例、图层、交互工具
- `BlankMap` - 空白底图，适用于纯几何数据展示和绘图
- `BaseTianDiTuMap` - 天地图底图

图层类型 (`src/components/gismap/layer/GisLayer.ts`)：
- `SysGisMapLayer` - 系统矢量图层，管理 Feature 数据，支持投影坐标系直接渲染
- `TianDiTuGisMapLayer` - 天地图瓦片图层

全局地图实例通过 `src/composables/gisMap.ts` 的 `setMainMap`/`getMainMap` 管理。

中国边界缓存: `src/components/gismap/data/chinaBoundaryCache.ts`，用于坐标系识别时的中国范围判断。

### 数据格式系统

`DataFormat` 接口 (`src/components/data/DataFormat.ts`) 定义 `read`/`write` 方法，支持多种格式：
- GeoJSON、WKT、WKB (文本/二进制几何格式)
- ShapeFile、ShapeZip (ESRI Shapefile)
- DXF、EXF、Exchange (交换格式/电子报盘)
- CSV、ResponseBase (自定义格式)

`SimpleDataFormat` 是数据格式工厂，`getDataType()` 自动检测输入数据类型。

`GisDataInfo` 是统一的 GIS 数据信息结构，包含 features、crs、descriptions 等字段。

### 数据状态管理

`src/composables/gisDataStore.ts` - Pinia 风格的响应式数据存储：
- 管理多个数据集的增删改查
- 全局共享当前活跃数据集

### 坐标系统

- 使用 proj4 进行坐标转换，初始化在 `src/components/gismap/proj4Defs.ts`
- `GisCrs` (`src/components/data/GisCrs.ts`) - 坐标系核心类：
  - `tryGetCrs()` - 自动识别坐标系（根据坐标值范围判断）
  - `validPointProjectionCrs()` - 验证投影坐标是否在中国范围内
  - `crsInfo` - 包含 epsgCode、name、projected、zoneDegree、zoneNumber 等
- `GisCrsSelector` - 坐标系选择器（含搜索、分类、3/6度带）
- `GisCrsTransformSelector` - 坐标转换选择器（根据源CRS过滤可选目标）

### 电子报盘格式 (ExchangeDataFormat)

`src/components/data/ExchangeDataFormat.ts` 实现勘测定界界址点坐标交换格式：
- **坐标顺序**: 交换格式为 Y(北),X(东)，GeoJSON 为 [x,y]，通过 `FLIP_XY = true` 常量控制翻转
- **读取**: 解析 [属性描述] 和 [地块坐标] 段，自动识别坐标系（投影/地理）
- **地理坐标系识别**: 当 `计量单位=度` 时直接指定地理 EPSG (4490/4610/4214)
- **写出**: 自动根据当前 CRS 更新头部坐标系描述，闭合点引用首点编号

### 几何校验 (GeomValidator)

`src/common/GeomValidator.ts` - 几何拓扑校验与自动修复：
- 自相交检测 (Bentley-Ottmann 扫描线算法)
- 环方向校验 (右手法则)
- 孔洞位置校验
- 重复顶点检测
- 自动修复建议

### 错误处理

`src/common/GisError.ts` - 统一错误类型：
- `GisError` 类含 `code`(GisErrorCode) 和 `detail` 字段
- `createUserMessage()` 生成面向用户的错误信息
- `handleError()` 统一日志记录和错误转换
- UI层使用自定义对话框 (Textarea) 展示详细错误信息，而非简单 alert

### 事件系统

自定义事件总线 `src/composables/eventBus.ts`：
- `eventBus.on(group, event, callback)` - 注册监听
- `eventBus.emit(group, GisEvent)` - 触发事件
- `eventBus.off(group, event, callback)` - 移除监听

### 暗色模式

`src/composables/dark.ts` - 基于 CSS 变量的亮/暗主题切换：
- `useDark()` composable
- `src/styles/element/dark.scss` - Element Plus 暗色覆盖

## 环境配置

复制 `.env.example` 为 `.env.development`，配置天地图 API Key：
```
VITE_TIANDITU_API_KEY=your_api_key
```

> 如不配置天地图 Key，地图底图功能将受限，但其他数据处理功能正常使用。

## 路径别名

`~/` 映射到 `src/` 目录，例如 `~/common/Common` 对应 `src/common/Common.ts`。

## 测试

使用 Vitest + happy-dom，测试文件命名规则 `**/*.test.ts`。测试配置在 `vite.config.ts` 的 `test` 字段。

<!-- superpowers-zh:begin (do not edit between these markers) -->
# Superpowers-ZH 中文增强版

本项目已安装 superpowers-zh 技能框架（20 个 skills）。

## 核心规则

1. **收到任务时，先检查是否有匹配的 skill** — 哪怕只有 1% 的可能性也要检查
2. **设计先于编码** — 收到功能需求时，先用 brainstorming skill 做需求分析
3. **测试先于实现** — 写代码前先写测试（TDD）
4. **验证先于完成** — 声称完成前必须运行验证命令

## 可用 Skills

Skills 位于 `.claude/skills/` 目录，每个 skill 有独立的 `SKILL.md` 文件。

- **brainstorming**: 在任何创造性工作之前必须使用此技能——创建功能、构建组件、添加功能或修改行为。在实现之前先探索用户意图、需求和设计。
- **chinese-code-review**: 中文 review 沟通参考——话术模板、分级标注（必须修复/建议修改/仅供参考）、国内团队常见反模式应对。仅在用户显式 /chinese-code-review 时调用，不要根据上下文自动触发。
- **chinese-commit-conventions**: 中文 commit 与 changelog 配置参考——Conventional Commits 中文适配、commitlint/husky/commitizen 中文模板、conventional-changelog 中文配置。仅在用户显式 /chinese-commit-conventions 时调用，不要根据上下文自动触发。
- **chinese-documentation**: 中文文档排版参考——中英文空格、全半角标点、术语保留、链接格式、中文文案排版指北约定。仅在用户显式 /chinese-documentation 时调用，不要根据上下文自动触发。
- **chinese-git-workflow**: 国内 Git 平台配置参考——Gitee、Coding.net、极狐 GitLab、CNB 的 SSH/HTTPS/凭据/CI 接入差异与镜像同步配置。仅在用户显式 /chinese-git-workflow 时调用，不要根据上下文自动触发。
- **dispatching-parallel-agents**: 当面对 2 个以上可以独立进行、无共享状态或顺序依赖的任务时使用
- **executing-plans**: 当你有一份书面实现计划需要在单独的会话中执行，并设有审查检查点时使用
- **finishing-a-development-branch**: 当实现完成、所有测试通过、需要决定如何集成工作时使用——通过提供合并、PR 或清理等结构化选项来引导开发工作的收尾
- **mcp-builder**: MCP 服务器构建方法论 — 系统化构建生产级 MCP 工具，让 AI 助手连接外部能力
- **receiving-code-review**: 收到代码审查反馈后、实施建议之前使用，尤其当反馈不明确或技术上有疑问时——需要技术严谨性和验证，而非敷衍附和或盲目执行
- **requesting-code-review**: 完成任务、实现重要功能或合并前使用，用于验证工作成果是否符合要求
- **subagent-driven-development**: 当在当前会话中执行包含独立任务的实现计划时使用
- **systematic-debugging**: 遇到任何 bug、测试失败或异常行为时使用，在提出修复方案之前执行
- **test-driven-development**: 在实现任何功能或修复 bug 时使用，在编写实现代码之前
- **using-git-worktrees**: 当需要开始与当前工作区隔离的功能开发，或在执行实现计划之前使用——通过原生工具或 git worktree 回退机制确保隔离工作区存在
- **using-superpowers**: 在开始任何对话时使用——确立如何查找和使用技能，要求在任何响应（包括澄清性问题）之前调用 Skill 工具
- **verification-before-completion**: 在宣称工作完成、已修复或测试通过之前使用，在提交或创建 PR 之前——必须运行验证命令并确认输出后才能声称成功；始终用证据支撑断言
- **workflow-runner**: 在 Claude Code / OpenClaw / Cursor 中直接运行 agency-orchestrator YAML 工作流——无需 API key，使用当前会话的 LLM 作为执行引擎。当用户提供 .yaml 工作流文件或要求多角色协作完成任务时触发。
- **writing-plans**: 当你有规格说明或需求用于多步骤任务时使用，在动手写代码之前
- **writing-skills**: 当创建新技能、编辑现有技能或在部署前验证技能是否有效时使用

## 如何使用

当任务匹配某个 skill 时，使用 `Skill` 工具加载对应 skill 并严格遵循其流程。绝不要用 Read 工具读取 SKILL.md 文件。

如果你认为哪怕只有 1% 的可能性某个 skill 适用于你正在做的事情，你必须调用该 skill 检查。
<!-- superpowers-zh:end -->
