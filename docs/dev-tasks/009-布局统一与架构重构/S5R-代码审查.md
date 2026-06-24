# S5R: 代码审查 — 布局统一与架构重构

## 审查时间

2026-06-25

## 审查范围

| 文件 | 修改项 | 行数变化 |
|------|--------|----------|
| `src/composables/useBreakpoint.ts` | M1 | +8 / -3 |
| `src/components/data/GisData.vue` | M2+M3+M4 | +45 / -50 |
| `src/components/data/GisDataImportDialog.vue` | M5 | +7 / 0 |

## 审查清单

### 1. 单一代码路径原则（geo-compacter.md 硬性约束）

- [x] GisData.vue 模板中无 `v-if="showLeftPanel"` / `v-else` 双套布局硬切换
- [x] `<script>` 中无 `if (isMobile.value) { ... } else { ... }` 业务逻辑分支
- [x] `currentPanelWidth` 中的 `if (!showLeftPanel.value) return 0` 属于布局宽度计算，非业务逻辑分支
- [x] GisDataOverview 的 `:mode="isMobile ? 'compact' : 'full'"` 属于模板层布局编排

### 2. 断点体系完整性

- [x] `Breakpoint` 类型包含 5 级：`'xl' | 'lg' | 'md' | 'sm' | 'xs'`
- [x] `resolveBreakpoint` 覆盖所有 5 级断点（≥1280 / ≥1024 / ≥768 / ≥576 / <576）
- [x] `PANEL_WIDTH` / `PANEL_COLLAPSED_WIDTH` 包含 `xs` 键值
- [x] `isMobile` 覆盖 `xs + sm`（<768px）
- [x] `showBottomNav` 覆盖 `xs + sm`（<768px）
- [x] `showMobileNav` 保留为 `showBottomNav` 别名，向后兼容

### 3. 模板结构统一性

- [x] 单一 `unified-layout` DOM 结构，无双套布局
- [x] 左面板、拖拽手柄、GisMobileNav 始终在 DOM 中
- [x] 地图 `v-for` 只保留一份（原两份合并为一份）
- [x] `v-if="!panelCollapsed"` 改为 `v-show="!panelCollapsed"`（避免折叠时销毁组件）

### 4. 响应式样式

- [x] `.unified-layout` 替代 `.desktop-layout` + `.mobile-layout`
- [x] `@media (max-width: 767px)` 控制左面板/拖拽手柄隐藏
- [x] `@media (max-width: 767px)` 控制底部导航显示
- [x] `@media (min-width: 768px) and (max-width: 1023px)` 平板端顶栏 44px
- [x] 移动端顶栏 48px + `env(safe-area-inset-top)`
- [x] GisDataImportDialog `@media (min-width: 768px) max-width: 640px`

### 5. 兼容性

- [x] MapDrawer.vue 的 `isMobile` 语义变化兼容（`xs+sm` 仍表示移动端）
- [x] GisMobileNav 的 props/events 接口未变
- [x] GisDataPanel 的 props/events 接口未变
- [x] `showMobileNav` 保留为别名，无外部组件使用（仅 useBreakpoint 内部定义）

### 6. 遗留问题（非本次范围）

- MapDrawer.vue L112/L151 仍使用 `v-if="!isMobile"` / `v-if="isMobile"` 双套布局——属于第二期改造范围
- GisMobileNav.vue 内部体验粗糙——属于第二期改造范围

## 审查结论：通过

所有修改项符合 S3 实施计划，未发现阻断性问题。MapDrawer.vue 的双套布局问题属于后续期次范围，本次不处理。
