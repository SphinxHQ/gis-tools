# GisTools 移动端 UX 改造计划

> 评估基准：`geo-compacter.md` V2.0  
> 评估日期：2026-06-25  
> 改造周期：5 期，每期 1 个独立交付模块  
> 验证基线：iPhone SE (375px) / iPhone 14 Pro Max (430px) / iPad (768px) / 桌面 (1440px)

---

## 诊断总览

本次对项目全部 40 个 Vue 组件、12 个 composable、路由配置、全局样式进行逐文件诊断，共识别 **24 项 UX 违规**，按严重度分级：

| 严重度 | 数量 | 说明 |
|--------|------|------|
| 🔴 高 | 4 | 布局架构缺陷、核心交互缺失，必须第 1-2 期解决 |
| 🟡 中 | 9 | 触控热区、性能、安全区域等，第 2-4 期解决 |
| 🟢 低 | 11 | 代码清理、token 化、辅助功能，第 4-5 期解决 |

---

## 第一至五期改造计划

---

## 第一期：布局统一与架构重构

**目标**：消除双套布局硬切换，建立统一的弹性布局骨架，建立正确的断点体系。

### 诊断依据

| # | 违规项 | 位置 | 违反的理论 / 规范 | 严重度 |
|---|--------|------|-------------------|--------|
| 1.1 | **双套布局硬切换**：`GisData.vue` 使用 `v-if="showLeftPanel"` 在 `desktop-layout` 与 `mobile-layout` 两套完全不同的 DOM 结构间切换 | `GisData.vue` L390-430 | **Atomic Design** 模板层断裂；**Adaptive First** 硬性约束（同一套 DOM 结构，仅通过 CSS 改变位置/尺寸/可见性） | 🔴 |
| 1.2 | **断点体系缺失 xs 级**：`useBreakpoint.ts` 仅定义 `sm/md/lg/xl` 四级，`sm` 覆盖 <768px 全部，无 `<576px` 的 `xs` 级 | `useBreakpoint.ts` L55-58 | **断点体系规范**：需 5 级断点 `xs(<576) / sm(576-767) / md(768-1023) / lg(1024-1279) / xl(>=1280)` | 🟡 |
| 1.3 | **移动端顶栏高度反直觉**：`.is-mobile .top-bar { height: 36px }` 比桌面端 40px 更矮，违反触控适配原则 | `GisData.vue` L679-683 | **布局尺寸规范**：移动端顶栏 48px + safe-area-inset-top，桌面端 40px | 🟡 |
| 1.4 | **导入弹窗未适配响应式**：`width="96%"` 在所有断点下相同，桌面端应限制最大宽度 | `GisDataImportDialog.vue` L60-61 | **Responsive Web Design** 弹性媒体 | 🟢 |

### 改造方案

```
改造前（硬切换）：
  v-if="showLeftPanel" → desktop-layout（左面板+手柄+地图+状态栏）
  v-else                → mobile-layout（地图+状态栏+底部导航）

改造后（弹性布局）：
  同一套 DOM 结构，通过 CSS @media 适配：
  ┌──────────────────────────────────────┐
  │ 顶栏（flex-shrink: 0）               │
  ├────────────┬─────────────────────────┤
  │ 左面板      │ 地图（flex: 1）         │
  │ (≥768px显) │                         │
  │ 可拖拽resize│                         │
  ├────────────┴─────────────────────────┤
  │ 底部状态栏（flex-shrink: 0）          │
  ├──────────────────────────────────────┤
  │ 底部 Sheet / Tab 栏（<768px 显示）    │
  └──────────────────────────────────────┘
```

### 组件变更

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/composables/useBreakpoint.ts` | 修改 | 新增 `xs` 断点（<576px），`isMobile` 覆盖 `xs + sm`，`isTablet` 覆盖 `md`，新增 `showBottomNav`（<768px 为 true） |
| `src/components/data/GisData.vue` | 修改 | 移除 `v-if="showLeftPanel"` 双套布局，统一为弹性布局；左面板 `display: none` @media <768px；顶栏高度按断点适配 |
| `src/components/data/GisDataImportDialog.vue` | 修改 | 弹窗宽度 `max-width: 640px` @media ≥768px |

### 验收清单

- [ ] `useBreakpoint` 返回 5 级断点，`isMobile` 在 <768px 为 true
- [ ] `GisData.vue` 模板中无 `v-if` 切换两套布局，仅一套 DOM 结构
- [ ] 375px / 768px / 1024px / 1440px 四个视口下布局完整可用
- [ ] 顶栏高度：桌面 40px / 平板 44px / 移动 48px
- [ ] 左面板在 <768px 时 `display: none`，≥768px 时正常显示
- [ ] 面板拖拽 resize 在 ≥1024px 可用

---

## 第二期：移动端核心交互 —— Bottom Sheet + FAB

**目标**：将 `el-drawer` 上滑抽屉改造为符合规范的 Bottom Sheet，新增 FAB 悬浮按钮承载地图控件。

### 诊断依据

| # | 违规项 | 位置 | 违反的理论 / 规范 | 严重度 |
|---|--------|------|-------------------|--------|
| 2.1 | **抽屉重挂载**：`GisMobileNav.vue` 使用 `v-if` 切换 Tab 内容，每次切 Tab 四个重型组件（GisDataTransformer / GisFeatureTree / GisDataValidator / GisDataExport）全部重新挂载 | `GisMobileNav.vue` L102-130 | **Norman** 反馈原则（无过渡动画）；**Hick's Law**（状态丢失加重认知负担） | 🔴 |
| 2.2 | **地图控件在移动端不可达**：`MapControlPanel.vue` 固定在左上角 `padding: 10px 0 0 40px`，按钮为原生 `<button>` 无触控热区设定 | `MapControlPanel.vue` L96-99 | **Hoober** 拇指热区（左上角为红色困难区）；**Fitts's Law**（热区不足 48dp） | 🔴 |
| 2.3 | **无 Bottom Sheet 组件**：当前用 `el-drawer direction="btt"` 模拟，无吸附点、无拖拽手柄、无法半屏/全屏切换 | `GisMobileNav.vue` L94-101 | **通用组件设计规范 10.1**：吸附点 [25vh, 40vh, 80vh]、手柄 32px、300ms Standard easing | 🔴 |
| 2.4 | **Tab 标签字号过小**：`tab-label { font-size: 10px }` 低于 iOS Safari 11px 自动放大阈值 | `GisMobileNav.vue` L222 | **字体排版规范**：移动端最小字号 ≥ 11px | 🟡 |
| 2.5 | **GisDataPanel 与 GisMobileNav 逻辑重复**：两者 Tab 选项、activeData/transformChain 处理逻辑完全一致 | `GisDataPanel.vue` + `GisMobileNav.vue` | **DRY 原则**，代码维护成本 | 🟢 |

### 改造方案

```
移动端交互架构（改造后）：

┌──────────────────────────────┐
│         地图（全屏）          │
│                              │
│                        ┌───┐ │
│                        │ + │ │ ← FAB 56x56dp 右下角绿色区
│                        └───┘ │
├──────────────────────────────┤
│  要素 100 | 点线面 | EPSG:4490│ ← 底部状态栏 compact
├──────────────────────────────┤
│ 坐标系 │ 要素 │ 校验 │ 导出  │ ← 底部 Tab 栏 56px
└──────────────────────────────┘
         ↑ 点击 Tab 后
┌──────────────────────────────┐
│ ══════  (手柄 32px) ════════ │ ← 可拖拽至 40vh / 80vh
│                              │
│   Tab 内容区（v-show 保持）   │
│                              │
│                              │
└──────────────────────────────┘
```

### 组件变更

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/components/data/GisBottomSheet.vue` | **新建** | 通用底部 Sheet 容器，Props: `snapPoints` / `defaultHeight` / `maxHeight` / `minHeight`；Events: `height-change` / `state-change`；支持拖拽手柄、吸附动画、遮罩层 |
| `src/components/gismap/GisMapFab.vue` | **新建** | 移动端 FAB 悬浮按钮，Props: `items` (FabItem[])，Events: `select`；展开 ≤4 个菜单项，200ms Bouncy easing |
| `src/components/data/GisMobileNav.vue` | 重写 | 改名为 `GisMobileTabBar.vue`，仅负责底部 Tab 栏 + Sheet 切换逻辑；Tab 内容区使用 `v-show` 替代 `v-if` |
| `src/components/data/GisDataPanel.vue` | 修改 | 提取共享 Tab 逻辑为 composable `useDataPanelTabs.ts`，GisDataPanel 和 GisMobileTabBar 共用 |
| `src/components/gismap/MapControlPanel.vue` | 修改 | 新增 `layout` prop：`'desktop'`（左上角） / `'fab'`（移动端收起到 FAB）；桌面端按钮热区扩展到 48dp |
| `src/composables/useDataPanelTabs.ts` | **新建** | 共享 Tab 状态管理：activeTab / activeData / transformChain / hasData / hasActiveData |

### 验收清单

- [ ] Bottom Sheet 手柄热区 32px，视觉 4px，可拖拽至 25vh / 40vh / 80vh 吸附点
- [ ] 切换 Tab 不重新挂载组件（`v-show` 替代 `v-if`），状态保留
- [ ] Sheet 过渡动画 300ms Standard easing，使用 `transform: translateY()`
- [ ] FAB 按钮 56x56dp，位于右下角距边缘 16dp，展开动画 200ms Bouncy
- [ ] 移动端地图控件通过 FAB 可访问（城市选择、CRS 选择、绘制工具）
- [ ] Tab 标签字号 ≥ 11px
- [ ] 地图手势与面板手势无冲突（面板区域 `@touchstart.prevent.stop`）
- [ ] 安全区域适配：`padding-bottom: env(safe-area-inset-bottom, 0px)`

---

## 第三期：手势增强与交互性能

**目标**：完善手势词库，实现面板拖拽 resize 的触控支持，引入 Web Worker 解析大文件，虚拟滚动优化要素列表。

### 诊断依据

| # | 违规项 | 位置 | 违反的理论 / 规范 | 严重度 |
|---|--------|------|-------------------|--------|
| 3.1 | **面板拖拽仅支持鼠标**：`startResize` 仅处理 `MouseEvent`，无 touch 事件，平板端无法拖拽调整面板宽度 | `GisData.vue` L85-110 | **触控交互规范**：touch 与 mouse 事件必须成对出现 | 🟡 |
| 3.2 | **无 Web Worker 解析大文件**：所有数据解析在主线程执行，>5MB 文件会阻塞 UI | `DataFormat.ts` / `SimpleDataFormat` | **性能预算规范**：>5MB 文件必须在 Web Worker 中解析 | 🟡 |
| 3.3 | **要素列表无虚拟滚动**：GisFeatureTree 直接渲染所有要素到 DOM，>500 个要素时性能下降 | `GisFeatureTree.vue` L75-92 | **性能预算规范**：>500 个要素必须启用虚拟滚动 | 🟡 |
| 3.4 | **长按手势缺失**：地图无长按选点弹出气泡功能 | 全局 | **Clark** 手势词汇表：长按 500ms → 选点 + 气泡 + 触觉反馈 | 🟡 |
| 3.5 | **列表项左滑操作缺失**：数据集卡片无左滑删除/导出快捷操作 | 全局 | **Clark** 手势词汇表：左滑 >48dp → 显示操作按钮 | 🟢 |

### 改造方案

```
手势增强清单：

地图区域：
  单击 → 选择要素（已有）
  双击 → 放大 1.5x（新增）
  长按 500ms → 选点 + 气泡 + vibrate(10)（新增）
  双指 → 缩放/旋转（已有，OpenLayers 默认）

面板区域：
  单指拖拽 → Sheet 高度切换（第 2 期实现）
  单指快速滑动 → 半屏/全屏切换（第 2 期实现）

列表区域：
  左滑 48dp → 操作按钮（删除/导出）（新增）
  单指点击 → 选中项（已有）

性能优化：
  要素 > 500 → el-table-v2 虚拟滚动
  文件 > 5MB → Web Worker 解析
  要素 > 2000 → WebGL 渲染（OpenLayers WebGLPointsLayer）
```

### 组件变更

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/components/data/GisData.vue` | 修改 | `startResize` 增加 touch 事件处理（`touchstart` / `touchmove` / `touchend`） |
| `src/composables/useDataParser.ts` | **新建** | Web Worker 封装：文件 >5MB 自动切换到 Worker 线程解析，<5MB 主线程直接解析 |
| `src/workers/dataParser.worker.ts` | **新建** | Web Worker 入口：接收 ArrayBuffer，返回解析后的 GisDataInfo |
| `src/components/data/GisFeatureTree.vue` | 修改 | 要素 >500 时切换到 `el-table-v2` 虚拟滚动；新增左滑手势（`@touchstart` / `@touchmove`） |
| `src/composables/useMapGestures.ts` | **新建** | 地图手势增强：双击放大、长按选点 + 气泡 + 触觉反馈 |
| `src/components/data/GisDataOverview.vue` | 修改 | 数据集卡片新增左滑操作（`transform: translateX(-72px)` 显示删除/导出按钮） |

### 验收清单

- [ ] 面板拖拽在触控设备上可用（iPad / Surface）
- [ ] 5MB 文件解析不阻塞 UI（主线程 FPS ≥ 50）
- [ ] 1000 个要素列表渲染 < 1s，滚动帧率 ≥ 55fps
- [ ] 地图双击放大 1.5x，动画 300ms Sharp easing
- [ ] 长按 500ms 弹出气泡，伴随 `navigator.vibrate(10)`
- [ ] 左滑 48dp 显示操作按钮，动画 200ms Standard easing
- [ ] 1000 个要素地图渲染 < 1s

---

## 第四期：设计 Token 化与视觉一致性

**目标**：将硬编码的间距、颜色、字号替换为 CSS 设计 Token，建立统一的视觉语言，补全暗色模式适配。

### 诊断依据

| # | 违规项 | 位置 | 违反的理论 / 规范 | 严重度 |
|---|--------|------|-------------------|--------|
| 4.1 | **间距硬编码**：使用 `padding: 0 12px`、`gap: 8px`、`margin: 8px` 等非 token 值，不符合 4dp 基准网格 | 全局（GisData.vue / GisMobileNav.vue / GisDataOverview.vue 等） | **间距与网格规范**：必须使用 `var(--gis-space-*)` token | 🟢 |
| 4.2 | **字号硬编码**：`font-size: 13px`、`font-size: 10px`、`font-size: 15px` 等非标准值 | 全局 | **字体排版规范**：必须使用 `var(--gis-text-*)` token | 🟢 |
| 4.3 | **颜色硬编码**：`background: var(--el-fill-color-lighter)` 混用 Element Plus 变量与项目变量 | 全局 | **颜色语义规范**：统一使用 `--gis-*` 命名空间 | 🟢 |
| 4.4 | **无 `prefers-reduced-motion` 支持**：所有动画未考虑用户减少动效偏好 | 全局 | **动画规范**：`prefers-reduced-motion` 时动画 ≤ 50ms | 🟢 |
| 4.5 | **圆角不统一**：`border-radius: 6px` / `8px` / `12px` / `10px` / `5px` 混用 | 全局 | **圆角与阴影规范**：卡片 8dp、面板 10dp、Sheet 12dp、按钮 4dp | 🟢 |
| 4.6 | **现有 `--gis-*` token 不完整**：`src/styles/index.scss` 定义了部分 token，但缺少间距、字号、圆角、阴影 token | `src/styles/index.scss` L25-65 | **设计 Token 体系** | 🟢 |

### 改造方案

```
Token 体系补全（在 src/styles/index.scss 中新增）：

:root {
  // ===== 间距 =====
  --gis-space-0: 0;
  --gis-space-xs: 4px;
  --gis-space-sm: 8px;
  --gis-space-md: 16px;
  --gis-space-lg: 24px;
  --gis-space-xl: 32px;
  --gis-space-2xl: 48px;
  --gis-space-3xl: 64px;

  // ===== 字体排版 =====
  --gis-text-caption: 11px;
  --gis-text-body2: 12px;
  --gis-text-body1: 14px;
  --gis-text-subtitle2: 14px;
  --gis-text-subtitle1: 16px;
  --gis-text-h6: 18px;
  --gis-text-h5: 22px;
  --gis-font-family: Inter, system-ui, "PingFang SC", "Microsoft YaHei", sans-serif;

  // ===== 圆角 =====
  --gis-radius-sm: 4px;
  --gis-radius-md: 8px;
  --gis-radius-lg: 10px;
  --gis-radius-xl: 12px;
  --gis-radius-round: 50%;

  // ===== 阴影 =====
  --gis-shadow-card: 0 1px 3px rgba(0,0,0,0.08);
  --gis-shadow-panel: 0 2px 8px rgba(0,0,0,0.1);
  --gis-shadow-sheet: 0 -2px 12px rgba(0,0,0,0.12);
  --gis-shadow-dialog: 0 4px 20px rgba(0,0,0,0.15);
  --gis-shadow-fab: 0 4px 12px rgba(0,0,0,0.2);

  // ===== 动画 =====
  --gis-easing-standard: cubic-bezier(0.4, 0.0, 0.2, 1);
  --gis-easing-decelerate: cubic-bezier(0.0, 0.0, 0.2, 1);
  --gis-easing-accelerate: cubic-bezier(0.4, 0.0, 1, 1);
}
```

### 组件变更

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/styles/index.scss` | 修改 | 补全间距、字号、圆角、阴影、缓动 Token；新增 `@media (prefers-reduced-motion: reduce)` 全局规则 |
| `src/components/data/GisData.vue` | 修改 | 替换所有硬编码间距/字号为 `var(--gis-*)` token |
| `src/components/data/GisMobileNav.vue` | 修改 | 同上 |
| `src/components/data/GisDataOverview.vue` | 修改 | 同上 |
| `src/components/data/GisDataImportDialog.vue` | 修改 | 同上 |
| `src/components/data/GisDataPanel.vue` | 修改 | 同上 |
| `src/components/data/GisFeatureTree.vue` | 修改 | 同上 |
| `src/components/gismap/MapControlPanel.vue` | 修改 | 同上 |
| `src/components/gismap/BasemapSwitcher.vue` | 修改 | 同上 |
| `src/App.vue` | 修改 | 补充 `prefers-reduced-motion` 媒体查询 |

### 验收清单

- [ ] 所有 `margin` / `padding` / `gap` 使用 `var(--gis-space-*)` token
- [ ] 所有 `font-size` 使用 `var(--gis-text-*)` token
- [ ] 所有 `border-radius` 使用 `var(--gis-radius-*)` token
- [ ] 所有 `box-shadow` 使用 `var(--gis-shadow-*)` token
- [ ] 系统开启 `prefers-reduced-motion` 后动画 ≤ 50ms
- [ ] 暗色模式下所有 Token 值正确切换
- [ ] 无硬编码的 `3px` / `7px` / `13px` 等非标准间距值

---

## 第五期：代码清理、可访问性与质量收尾

**目标**：清理死代码，补全可访问性支持，建立性能监控基线，完成最终验收。

### 诊断依据

| # | 违规项 | 位置 | 违反的理论 / 规范 | 严重度 |
|---|--------|------|-------------------|--------|
| 5.1 | **死代码残留**：`Home.vue` → `BaseMain.vue` → `LeftPanel.vue` / `BottomPanel.vue` / `MainMap.vue` 整条链路未被路由引用，但代码仍在 | 多个文件 | 代码库膨胀 | 🟢 |
| 5.2 | **BottomPanel.vue 完全注释**：所有模板代码被 `<!-- -->` 包裹 | `BottomPanel.vue` L1-53 | 同上 | 🟢 |
| 5.3 | **LeftPanel.vue 功能已迁移**：绘制工具已迁移到 `MapControlPanel`，`LeftPanel.vue` 仅剩冗余代码 | `LeftPanel.vue` | 同上 | 🟢 |
| 5.4 | **无键盘导航支持**：无 focus 管理、无 tab 顺序、无 ARIA 标签 | 全局 | **无障碍访问**（WCAG 2.1 A） | 🟢 |
| 5.5 | **无加载/错误骨架屏**：数据面板 Tab 内容首次加载无骨架屏，错误状态仅靠 Toast | `GisDataPanel.vue` / `GisMobileNav.vue` | **通用组件设计规范 10.3**：加载态 el-skeleton，错误态红色 Toast + 重试 | 🟢 |
| 5.6 | **地图控件按钮无 Tooltip**：CSR 坐标系按钮、绘制工具按钮无 hover 提示 | `MapControlPanel.vue` L16-22 | **Norman** 意符：用户需要明确知道按钮功能 | 🟢 |
| 5.7 | **地图 tile 加载失败无错误状态**：无网络断开提示、无 tile 加载失败 fallback | `GisMapTianditu.vue` / `GisMapSlot.vue` | **状态覆盖**：弱网/离线/错误状态 | 🟢 |
| 5.8 | **组件目录结构不符合 Atomic Design**：`components/data/` 混合了数据解析器、UI 面板、地图组件 | `src/components/` 目录 | **Atomic Design** 层级不清 | 🟢 |

### 改造方案

```
目录重构（按 Atomic Design 分层）：

src/components/
├── atoms/           # 原子：最小可复用单元
│   ├── GisCard.vue
│   ├── CrsInfoRender.vue
│   ├── GeoTypeIconRender.vue
│   ├── GeoTypeRender.vue
│   └── VertexCountRender.vue
├── molecules/       # 分子：原子组合
│   ├── GisDataOverview.vue
│   ├── MapCitySelector.vue
│   ├── BasemapSwitcher.vue
│   └── GisDataImportDialog.vue
├── organisms/       # 有机体：分子组合
│   ├── GisDataPanel.vue
│   ├── GisBottomSheet.vue
│   ├── GisMobileTabBar.vue
│   ├── GisFeatureTree.vue
│   ├── GisFeatureEditor.vue
│   ├── GisDataTransformer.vue
│   ├── GisDataValidator.vue
│   ├── GisDataExport.vue
│   ├── GisDataReader.vue
│   ├── GisCrsSelector.vue
│   ├── GisCrsTransformSelector.vue
│   └── MapControlPanel.vue
├── templates/       # 模板：有机体布局
│   └── GisData.vue
├── data/            # 数据层（非 UI 组件）
│   ├── DataFormat.ts
│   ├── GisDataInfo.ts
│   ├── GisCrs.ts
│   ├── LocalDb.ts
│   └── ...
└── gismap/          # 地图层（非 UI 组件）
    ├── GisMapSlot.vue
    ├── GisMapBase.vue
    ├── GisMapTianditu.vue
    └── ...
```

### 组件变更

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/components/Home.vue` | **删除** | 死代码，路由已指向 GisData.vue |
| `src/components/layouts/BaseMain.vue` | **删除** | 死代码 |
| `src/components/LeftPanel.vue` | **删除** | 功能已迁移到 MapControlPanel |
| `src/components/BottomPanel.vue` | **删除** | 完全注释的死代码 |
| `src/components/MainMap.vue` | **删除** | 死代码 |
| `src/components/layouts/SplitPanel.vue` | 保留 | 面板拖拽功能仍有价值，迁移到 `templates/` 或合并到 GisData.vue |
| `src/components/` 目录 | 重构 | 按 Atomic Design 分层重组织，更新所有 import 路径 |
| `src/components/data/GisDataPanel.vue` | 修改 | 首次加载添加 `el-skeleton` 骨架屏 |
| `src/components/data/GisMobileNav.vue` → `GisMobileTabBar.vue` | 修改 | 首次加载添加骨架屏 |
| `src/components/gismap/MapControlPanel.vue` | 修改 | 所有按钮添加 `el-tooltip` |
| `src/components/gismap/GisMapSlot.vue` | 修改 | 新增 tile 加载失败状态 + 重试按钮 |
| `src/composables/usePerformanceMonitor.ts` | **新建** | 性能监控：FCP / LCP / FID / CLS / 要素渲染时间 / 内存占用，超预算时 console.warn |

### 验收清单

- [ ] 无死代码残留（Home.vue / BaseMain.vue / LeftPanel.vue / BottomPanel.vue / MainMap.vue 已删除）
- [ ] 所有 import 路径更新正确，项目可正常构建运行
- [ ] 组件目录按 Atomic Design 分层
- [ ] 数据面板首次加载显示骨架屏（el-skeleton），加载完成后切换为内容
- [ ] 地图 tile 加载失败时显示错误提示 + 重试按钮
- [ ] 所有地图控件按钮有 Tooltip 提示
- [ ] 键盘 Tab 可遍历主要交互元素，`Enter` / `Space` 可触发
- [ ] 关键 ARIA 标签已添加（`role` / `aria-label`）
- [ ] 性能监控上线：FCP < 1.5s, LCP < 2.5s, FID < 100ms, CLS < 0.1
- [ ] 内存占用（含 5 个数据集）< 150MB

---

## 附录 A：改造依赖关系图

```
第一期（布局统一）
  └──→ 第二期（Sheet + FAB）依赖第一期断点体系
        └──→ 第三期（手势 + 性能）依赖第二期 Sheet 组件
              └──→ 第四期（Token 化）依赖前三期组件稳定
                    └──→ 第五期（清理 + 质量）依赖全部组件就位
```

## 附录 B：关键量化指标总览

| 指标 | 当前状态 | 目标值 | 验证期 |
|------|---------|--------|--------|
| 断点数量 | 4 级（缺 xs） | 5 级 | 第一期 |
| 布局模板数 | 2 套（v-if 硬切换） | 1 套（弹性布局） | 第一期 |
| 触控热区（移动端） | 24-36px | ≥ 48dp | 第二期 |
| Sheet 吸附点 | 无 | 3 个（25vh / 40vh / 80vh） | 第二期 |
| Tab 切换方式 | v-if 重挂载 | v-show 保持实例 | 第二期 |
| 面板拖拽 | 仅鼠标 | 鼠标 + 触控 | 第三期 |
| 大文件解析 | 主线程阻塞 | Web Worker | 第三期 |
| 要素列表（>500） | 全量 DOM 渲染 | 虚拟滚动 | 第三期 |
| 设计 Token 覆盖率 | ~30% | 100% | 第四期 |
| 死代码文件数 | 5 个 | 0 | 第五期 |
| 性能监控 | 无 | 全指标覆盖 | 第五期 |