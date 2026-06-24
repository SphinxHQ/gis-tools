# 一期成果检验规则 V2

> 基于首次检验遗漏的 3 类问题（内容溢出、子元素堆叠、文字裁剪）制定的全面检验规则。
> 核心原则：**不仅验证容器布局，更要验证内容形态**。

## 一、检验层级模型

```
L1 容器层：父容器尺寸、位置、display、flexDirection
L2 内容层：子元素排列方向、堆叠方式、间距、对齐
L3 元素层：每个可见元素的尺寸、坐标、可见性
L4 文本层：文字内容是否完整显示（scrollWidth vs clientWidth）
L5 溢出层：实际溢出检测（scrollWidth > clientWidth、负坐标、超出父容器）
```

## 二、必检元素清单（全量遍历）

### 2.1 顶栏区域
- `.top-bar` 容器本身
- `.top-bar-left` / `.top-bar-right` 左右分区
- **所有按钮**（`button`, `.el-button`）：逐个检查
- **logo 元素**（`svg`, `img`）：尺寸、位置
- **标题文字**（`.top-bar-title`）：文字是否完整
- **主题切换**（`.theme-switch`）：子元素排列方向、是否堆叠
- **数据集徽章**（`.dataset-badge-btn`）：文字是否裁剪

### 2.2 主内容区
- `.unified-layout` 布局容器
- `.left-panel` / `.panel-resize-handle` 显隐状态
- `.content-area` 内容区域
- `.map-container` 地图容器

### 2.3 状态栏区域
- `.gis-data-status-bar` 状态栏容器
- **所有 `.status-item`**：逐个检查文字完整性
- 状态栏总内容宽度 vs 容器宽度（溢出检测）

### 2.4 底部导航区域
- `.mobile-nav-area` 导航容器
- `.mobile-tab-bar` 标签栏
- **所有 `.mobile-tab-item`**：尺寸、对齐、文字完整性
- **所有 `.tab-label`**：文字是否完整显示

### 2.5 弹窗/抽屉区域（必须打开后逐个检验）

> **强制规则**：弹窗和抽屉内的子组件必须通过交互触发打开后，对其内部元素执行与主页面同等强度的检验。禁止仅检验弹窗外壳。

#### 2.5.1 导入弹窗（GisDataImportDialog + GisDataReader）
- `.import-dialog` 弹窗容器：宽度、高度、是否铺满
- `.gis-data-reader-tabs` tabs 容器
- **`.el-tabs__nav` tabs 导航条**：宽度是否超出容器、是否有负坐标
- **每个 `.el-tabs__item`**：文字是否完整、是否被裁剪
- **`.el-tabs__nav-wrap` 是否出现滚动箭头**（`is-scrollable`）及其触控热区
- 上传区 `.el-upload-dragger`：尺寸是否合理
- 文本编辑器 `.geo-str-editor`：是否铺满、是否溢出
- 绘制图形 tab 内的 `.map-drawer`：尺寸、布局
- 历史记录表格 `.el-table`：是否横向溢出
- footer 按钮区：是否堆叠、是否溢出

#### 2.5.2 数据源抽屉（source-drawer）
- `.source-drawer` 抽屉容器：宽度是否适配移动端
- `.source-drawer-body` 内容区：是否溢出
- 数据源分组卡片：尺寸、文字是否裁剪

#### 2.5.3 其他弹窗/抽屉
- 错误对话框、确认框等：宽度适配、文字完整

### 2.6 交互后复检清单

> **强制规则**：以下交互动作执行后，必须重新运行一次完整检验脚本，因为交互会改变 DOM 结构和可见元素。

| 交互动作 | 复检原因 |
|---------|---------|
| 点击"导入"按钮打开弹窗 | 弹窗内 tabs、上传区、编辑器等子组件首次渲染 |
| 切换 tabs（上传/文本/绘制/历史） | tab 内容区 DOM 切换，可能产生新溢出 |
| 打开数据源抽屉 | 抽屉内数据集卡片首次渲染 |
| 切换数据集 | 状态栏内容变化，可能产生新溢出 |
| 切换断点（旋转设备/调整窗口） | 所有断点下的布局都需重新验证 |

## 三、检验规则矩阵

### 3.1 容器层检验（L1）

| 规则编号 | 检验项 | 判定标准 |
|---------|--------|---------|
| L1-01 | 容器尺寸 | width/height 符合断点预期 |
| L1-02 | 容器位置 | top/left 在父容器内（≥0） |
| L1-03 | display 属性 | 符合预期（flex/none/block） |
| L1-04 | flexDirection | 符合断点预期（column/row） |
| L1-05 | 占满父容器 | width === parent.width（全宽元素） |

### 3.2 内容层检验（L2）

| 规则编号 | 检验项 | 判定标准 |
|---------|--------|---------|
| L2-01 | 子元素排列方向 | flexDirection 符合预期 |
| L2-02 | 子元素堆叠 | flexWrap=nowrap 时不允许垂直堆叠 |
| L2-03 | 子元素间距 | gap 值合理（8px/10px 等） |
| L2-04 | 子元素对齐 | alignItems/justifyContent 符合预期 |
| L2-05 | 子元素数量 | 符合预期（如 tab 4 个） |

### 3.3 元素层检验（L3）

| 规则编号 | 检验项 | 判定标准 |
|---------|--------|---------|
| L3-01 | 元素可见性 | display !== 'none' && width > 0 && height > 0 |
| L3-02 | 元素尺寸 | width/height > 0 且符合最小触控热区（≥48dp 移动端） |
| L3-03 | 元素在父容器内 | left ≥ parent.left && right ≤ parent.right |
| L3-04 | 元素在视口内 | left ≥ 0 && right ≤ viewport.width && top ≥ 0 && bottom ≤ viewport.height |
| L3-05 | 元素不重叠 | 与同级元素无意外重叠（z-index 除外） |

### 3.4 文本层检验（L4）

| 规则编号 | 检验项 | 判定标准 |
|---------|--------|---------|
| L4-01 | 文字完整显示 | scrollWidth ≤ clientWidth（无横向溢出） |
| L4-02 | 文字不换行 | whiteSpace=nowrap 时不出现多行 |
| L4-03 | 文字不裁剪 | overflow=hidden 时 scrollWidth ≤ clientWidth |
| L4-04 | 字体大小合理 | 移动端 ≥12px，桌面端 ≥14px |
| L4-05 | 文字颜色对比 | color 与 backgroundColor 对比度 ≥4.5:1 |

### 3.5 溢出层检验（L5）

| 规则编号 | 检验项 | 判定标准 |
|---------|--------|---------|
| L5-01 | 横向溢出 | scrollWidth ≤ clientWidth |
| L5-02 | 纵向溢出 | scrollHeight ≤ clientHeight |
| L5-03 | 负坐标 | top ≥ 0 && left ≥ 0（不允许溢出顶部/左侧） |
| L5-04 | 超出父容器 | bottom ≤ parent.bottom && right ≤ parent.right |
| L5-05 | 超出视口 | bottom ≤ viewport.height && right ≤ viewport.width |
| L5-06 | 文档级溢出 | document.documentElement.scrollWidth ≤ viewport.width |

## 四、断点必检项

### 4.1 xs/sm 断点（移动端，<768px）

```
必检元素：
- .top-bar（高度 48px，含安全区）
- .top-bar-left / .top-bar-right（不溢出顶栏）
- .top-bar 所有按钮（文字完整、触控热区≥48dp）
- .theme-switch（不垂直堆叠、不溢出顶栏）
- .dataset-badge-btn（文字完整显示）
- .unified-layout（flexDirection=column）
- .left-panel（display=none）
- .content-area（全宽）
- .map-container（可见、全宽）
- .gis-data-status-bar（内容不溢出）
- .mobile-nav-area（可见、全宽、贴底）
- .mobile-tab-bar（占满导航宽度）
- .mobile-tab-item（均匀分布、文字完整）
```

### 4.2 md 断点（平板端，768-1023px）

```
必检元素：
- .top-bar（高度 44px）
- .unified-layout（flexDirection=row）
- .left-panel（display=none）
- .content-area（全宽）
- .map-container（可见、全宽）
- .gis-data-status-bar（内容不溢出）
- .mobile-nav-area（display=none）
```

### 4.3 lg/xl 断点（桌面端，≥1024px）

```
必检元素：
- .top-bar（高度 40px）
- .unified-layout（flexDirection=row）
- .left-panel（可见、宽度 520px）
- .panel-resize-handle（可见、可拖拽）
- .content-area（宽度 = 视口 - 左面板 - 手柄）
- .map-container（可见）
- .gis-data-status-bar（内容不溢出）
- .mobile-nav-area（display=none）
```

## 五、检验执行流程

1. **导入测试数据**：确保页面处于有数据状态（非空状态）
2. **逐断点执行**：xs(375) → sm(576) → md(768) → lg(1024) → xl(1280)
3. **每个断点执行全量检验**：L1-L5 所有规则
4. **记录所有 FAIL 项**：含元素路径、实际值、预期值
5. **修复后回归**：修复所有 FAIL 后重新执行全量检验

## 六、检验脚本模板

```javascript
// 全量检验函数（每个断点执行）
function fullCheck() {
  const results = { L1: [], L2: [], L3: [], L4: [], L5: [] };
  const elements = [
    '.top-bar', '.top-bar-left', '.top-bar-right',
    '.unified-layout', '.left-panel', '.panel-resize-handle',
    '.content-area', '.map-container',
    '.gis-data-status-bar', '.mobile-nav-area', '.mobile-tab-bar'
  ];
  
  // L1-L3: 容器、内容、元素层
  elements.forEach(sel => checkElement(sel, results));
  
  // L4: 文本层（遍历所有含文字元素）
  document.querySelectorAll('button, .tab-label, .status-item, .dataset-badge-btn')
    .forEach(el => checkText(el, results));
  
  // L5: 溢出层（遍历所有容器）
  document.querySelectorAll('div').forEach(el => checkOverflow(el, results));
  
  return results;
}
```

## 七、V3 补充规则（基于二次检验遗漏的 4 类问题）

> **遗漏背景**：V2 规则已覆盖弹窗内 tabs，但二次检验仍遗漏了输入文本/绘制图形/历史记录三个 tab 内部的排版问题，以及工具条坐标系按钮文字溢出。根因分析如下。

### 7.1 遗漏根因分析

| 遗漏问题 | 根因 | V2 规则缺陷 |
|---------|------|------------|
| 输入文本 tab 滚动条溢出 | pane overflow:auto + editor 高度 calc 计算不准 | V2 仅检验 `.geo-str-editor` 是否铺满，未检验 pane 自身 scrollH vs clientH |
| 绘制图形 tab 地图 canvas 尺寸错误 | tab 切换后 OpenLayers 未收到 resize 通知 | V2 仅检验 `.map-drawer` 尺寸，未检验 canvas/viewport 实际渲染尺寸是否匹配容器 |
| 历史记录 tab 表格列压缩 | 6 列总宽 650px > 容器 210px | V2 仅检验表格是否横向溢出，未检验列宽总和 vs 容器宽度、未检验列内容是否被压缩 |
| 坐标系按钮文字溢出 | whiteSpace:normal 导致换行 + 文字未用 span 包裹 | V2 的 L4 文本检验仅检查 scrollWidth vs clientWidth，未检查 whiteSpace 属性、未检查按钮内文字是否被 span 包裹（移动端隐藏 span 的场景） |

### 7.2 新增检验规则

#### L4-06: whiteSpace 属性检验
| 规则编号 | 检验项 | 判定标准 |
|---------|--------|---------|
| L4-06 | whiteSpace 属性 | 按钮内文字 whiteSpace 必须为 nowrap（禁止 normal 导致换行溢出） |

#### L4-07: 文字节点包裹检验
| 规则编号 | 检验项 | 判定标准 |
|---------|--------|---------|
| L4-07 | 文字节点包裹 | 按钮内文字必须用 `<span>` 包裹，确保移动端可通过 `span { display: none }` 隐藏文字只保留图标 |

#### L4-08: flex-shrink 检验
| 规则编号 | 检验项 | 判定标准 |
|---------|--------|---------|
| L4-08 | flex-shrink | flex 容器内含文字的按钮必须设置 `flex-shrink: 0`，防止被压缩导致文字溢出 |

#### L5-07: pane 自身溢出检验
| 规则编号 | 检验项 | 判定标准 |
|---------|--------|---------|
| L5-07 | tab pane 自身溢出 | `.el-tab-pane` 的 scrollHeight ≤ clientHeight 且 scrollWidth ≤ clientWidth（禁止 pane 自身出现滚动条） |

#### L5-08: canvas/viewport 渲染尺寸匹配检验
| 规则编号 | 检验项 | 判定标准 |
|---------|--------|---------|
| L5-08 | 地图 canvas 尺寸匹配 | `.ol-viewport canvas` 的 width/height 必须等于 `.ol-viewport` 的 width/height（tab 切换后必须触发 updateSize） |

#### L5-09: 表格列宽总和检验
| 规则编号 | 检验项 | 判定标准 |
|---------|--------|---------|
| L5-09 | 表格列宽总和 | 所有可见列的 width 之和 ≤ 表格容器 clientWidth，否则必须隐藏次要列或启用横向滚动 |

#### L5-10: 表格行高检验
| 规则编号 | 检验项 | 判定标准 |
|---------|--------|---------|
| L5-10 | 表格行高 | 移动端行高 ≤ 56px（双行上限），超出说明内容换行严重；单行内容行高应 ≤ 32px |

#### L5-11: 表格内容完整性检验
| 规则编号 | 检验项 | 判定标准 |
|---------|--------|---------|
| L5-11 | 内容未丢失 | 每行重要内容（名称、类型）必须完整显示或省略号截断，禁止因列宽不足导致内容不可见 |

#### L5-12: 按钮文字溢出检验（scrollWidth 对比）
| 规则编号 | 检验项 | 判定标准 |
|---------|--------|---------|
| L5-12 | 按钮 scrollWidth vs clientWidth | 所有按钮 `scrollWidth ≤ clientWidth`，否则文字被裁剪。必须检查桌面端+移动端所有断点。flex 容器内的按钮必须设置 `flex-shrink: 0` 防止被压缩 |

#### L5-13: flex 容器内按钮压缩检验
| 规则编号 | 检验项 | 判定标准 |
|---------|--------|---------|
| L5-13 | flex 子元素压缩 | flex 容器内的按钮/标签必须设置 `flex-shrink: 0`，否则容器空间不足时会被压缩导致内容溢出 |

### 7.3 新增必检元素清单

#### 7.3.1 输入文本 tab（激活后检验）
- `.text-tab-content`：flex 纵向布局、height=100%
- `.language-hint`：固定高度 24px
- `.text-editor` / `.geo-str-editor`：flex:1 填满剩余空间、高度 = pane高度 - hint高度
- **`.el-tab-pane` 自身**：scrollHeight ≤ clientHeight（无纵向滚动条）

#### 7.3.2 绘制图形 tab（激活后检验）
- `.map-drawer`：尺寸、布局
- `.md-right`：尺寸
- **`.ol-viewport`**：尺寸 = `.md-right` 尺寸
- **`.ol-viewport canvas`**：尺寸 = `.ol-viewport` 尺寸（L5-08 规则）
- `.map-control-panel` 工具条：所有按钮文字检验（L4-06/07/08）

#### 7.3.3 历史记录 tab（激活后检验）
- `.history-tab-content`：flex 纵向布局
- `.history-toolbar`：固定高度 40px
- `.history-table`：flex:1 填满剩余空间
- **所有可见列**：列宽总和 ≤ 表格 clientWidth（L5-09 规则）
- **移动端隐藏列**：`.hide-on-mobile` 的 display=none

### 7.4 强化检验流程（V3）

> **核心改进**：从"检验容器"升级为"检验每个 tab 激活后的实际渲染内容"。

```
检验流程 V3：
1. 打开导入弹窗
2. 逐个激活每个 tab（上传文件 → 输入文本 → 绘制图形 → 历史记录）
3. 每个 tab 激活后等待 1.5s（等待 DOM 渲染和异步组件加载）
4. 对当前激活的 tab 内容执行 L1-L5 + L4-06~08 + L5-07~09 全量检验
5. 记录每个 tab 的检验结果
6. 所有 tab 检验完成后，切换断点，重复步骤 2-5
```

### 7.5 工具条按钮文字检验清单（V3 新增）

> **强制规则**：工具条内每个按钮必须逐个检验文字溢出，不能只检验工具条容器整体。

| 按钮 | 检验项 | 判定标准 |
|------|--------|---------|
| 图形列表按钮 | 文字/图标显示 | 移动端 span 隐藏后图标完整 |
| 城市选择器 | 下拉框文字 | 文字完整、不溢出 |
| 坐标系按钮 | 文字显示 | whiteSpace=nowrap、span 包裹、flex-shrink=0、移动端前缀隐藏后数字完整 |
| 绘制功能按钮 | 文字/图标显示 | 移动端 span 隐藏后图标完整、dropdown 箭头可见 |

---

## 八、V4 补充规则（基于一期任务系统核实的 5 类新问题）

> **遗漏背景**：V3 规则覆盖了弹窗内 tab 排版，但一期任务系统核实时发现：验收点本身（左面板显隐、状态栏模式、flex-shrink）存在违规，且弹窗宽度和 table 滚动条问题未被覆盖。根因：之前只检验"导入弹窗内部"，未回归检验"一期验收点本身"。

### 8.1 遗漏根因分析

| 遗漏问题 | 根因 | V3 规则缺陷 |
|---------|------|------------|
| 平板端左面板不显示 | PANEL_WIDTH.md=0 + CSS `<1024px` 隐藏左面板 | V3 的 4.2 md 断点必检项写的是 `.left-panel（display=none）`，这是错误的预期，验收要求 ≥768px 显示 |
| 状态栏 full 模式溢出 | 坐标系全称 288px + status-item flex-shrink:0 不允许收缩 | V3 的 L5-01 仅检查 scrollWidth vs clientWidth，未检查 flex-shrink 对溢出的影响 |
| 弹窗宽度不足 | max-width:640px 导致 table 6列被压缩到 538px | V3 未覆盖弹窗 max-width 与 table 列宽总和的匹配检验 |
| table 滚动条干扰 | el-table 默认显示滚动条 | V3 未覆盖滚动条可见性检验 |

### 8.2 新增检验规则

#### L1-06: 断点配置与验收点一致性检验
| 规则编号 | 检验项 | 判定标准 |
|---------|--------|---------|
| L1-06 | PANEL_WIDTH 配置 | `useBreakpoint.ts` 中 PANEL_WIDTH 每个断点的值必须与验收清单一致。md(768-1023) ≥320px，lg/xl ≥520px，xs/sm =0 |

#### L1-07: CSS 隐藏阈值与断点配置一致性
| 规则编号 | 检验项 | 判定标准 |
|---------|--------|---------|
| L1-07 | CSS @media 隐藏阈值 | CSS 中 `display:none` 的 `@media max-width` 值必须与 PANEL_WIDTH=0 的断点一致。如 PANEL_WIDTH.md>0 则 CSS 不得在 `<1024px` 隐藏左面板 |

#### L2-06: flex-shrink 与溢出联动检验
| 规则编号 | 检验项 | 判定标准 |
|---------|--------|---------|
| L2-06 | flex 子元素收缩策略 | flex 容器内：固定宽度元素 flex-shrink:0，可变宽度元素 flex-shrink:1 + min-width:0 + overflow:hidden。全部 flex-shrink:0 会导致容器溢出 |

#### L5-14: 弹窗 max-width 与 table 列宽匹配检验
| 规则编号 | 检验项 | 判定标准 |
|---------|--------|---------|
| L5-14 | 弹窗宽度 vs table 列宽总和 | 弹窗 body 宽度 ≥ table 所有可见列 width 之和。桌面端 6 列总宽约 650px，弹窗 max-width ≥ 800px |

#### L5-15: 滚动条可见性检验
| 规则编号 | 检验项 | 判定标准 |
|---------|--------|---------|
| L5-15 | 滚动条可见性 | 用户明确要求"不要滚动条"的区域，`.el-scrollbar__bar` 的 display 必须为 none，但滚动功能保留（scrollHeight > clientHeight 时仍可滚动） |

### 8.3 验收点 × 断点测试矩阵（5×6）

> **强制规则**：一期任务验收必须执行 5 个断点 × 6 个验收点的完整测试矩阵，共 30 个测试组合。

| 验收点 | xs(<576) | sm(576-767) | md(768-1023) | lg(1024-1279) | xl(≥1280) |
|--------|-----------|-------------|--------------|---------------|------------|
| 1. 5级断点识别 | current='xs' | current='sm' | current='md' | current='lg' | current='xl' |
| 2. 单一DOM结构 | 无v-if双套布局 | 同左 | 同左 | 同左 | 同左 |
| 3. 布局完整可用 | 顶栏+地图+状态栏+底部导航 | 同左 | 顶栏+左面板+地图+状态栏 | 顶栏+左面板+手柄+地图+状态栏 | 同左 |
| 4. 顶栏高度 | 48px+safe-area | 48px+safe-area | 44px | 40px | 40px |
| 5. 左面板显隐 | display=none | display=none | display=flex, width≥320px | display=flex, width≥520px | 同左 |
| 6. 拖拽手柄 | display=none | display=none | display=none | display=block | display=block |

### 8.4 展示内容验证矩阵

> **强制规则**：每个断点下必须验证所有展示内容的可见性和完整性，不仅验证容器布局。

| 展示内容 | xs | sm | md | lg | xl |
|----------|----|----|----|----|-----|
| 顶栏logo | 可见 | 可见 | 可见 | 可见 | 可见 |
| 顶栏标题 | 可见 | 可见 | 可见 | 可见 | 可见 |
| 导入按钮 | 可见 | 可见 | 可见 | 可见 | 可见 |
| 主题切换 | 隐藏 | 隐藏 | 可见 | 可见 | 可见 |
| 左面板 | 隐藏 | 隐藏 | 320px可见 | 520px可见 | 520px可见 |
| 地图 | 全宽可见 | 全宽可见 | 可见 | 可见 | 可见 |
| 状态栏 | compact模式 | compact模式 | compact模式 | full模式 | full模式 |
| 底部导航 | 可见57px | 可见57px | 隐藏 | 隐藏 | 隐藏 |
| body溢出 | 无 | 无 | 无 | 无 | 无 |
| 状态栏溢出 | 无 | 无 | 无 | 无 | 无 |

### 8.5 DPR 影响与 viewport 设置

> **关键经验**：Playwright `browser_resize` 设置的 width 是物理像素，浏览器 `window.innerWidth` 是 CSS 像素，两者关系为 `CSS像素 = 物理像素 / DPR`。

| 设备 | viewport设置 | DPR | 实际CSS宽度 | 对应断点 |
|------|------------|-----|-----------|---------|
| iPhone SE | 375×812 | 1.5 | 250px | xs |
| iPhone 14 | 900×812 | 1.5 | 600px | sm |
| iPad 竖屏 | 1200×1024 | 1.5 | 800px | md |
| 桌面 1600 | 1600×900 | 1.5 | 1067px | lg |
| 桌面 1920 | 1920×1080 | 1.5 | 1280px | xl |

**检验规则**：断点判定基于 `window.innerWidth`（CSS像素），测试时必须验证 `window.innerWidth` 落在目标断点范围内，而非仅验证 viewport 设置值。

### 8.6 状态栏 mode 切换策略

> **关键经验**：状态栏 compact/full 模式不应基于 `isMobile`，应基于 `isDesktop`。平板端(md)虽非移动端，但屏幕宽度有限，full 模式下坐标系全称（如"CGCS2000 / 3-degree Gauss-Kruger CM 117E"）会占 288px 导致溢出。

| 规则 | 说明 |
|------|------|
| mode 切换条件 | `mode = isDesktop ? 'full' : 'compact'`（仅 lg/xl 用 full，xs/sm/md 用 compact） |
| compact 模式特征 | 隐藏"要素"/"顶点"标签、坐标系只显示 EPSG:数字、名称 max-width:120px |
| full 模式特征 | 显示完整标签、坐标系显示全称、名称 max-width:200px |

### 8.7 弹窗宽度配置规范

| 断点 | 弹窗 max-width | table 预期宽度 | 说明 |
|------|--------------|--------------|------|
| xs/sm | 96%（铺满） | 100%-padding | 移动端全屏弹窗 |
| md | 880px | ~778px | 平板端限制最大宽度 |
| lg/xl | 880px | ~778px | 桌面端限制最大宽度，确保 6 列不拥挤 |

### 8.8 一期检验流程 V4（最终版）

```
检验流程 V4：
1. 回归验收点本身：6 个验收点 × 5 个断点 = 30 个测试组合
2. 每个断点验证展示内容矩阵（顶栏/左面板/地图/状态栏/底部导航）
3. 验证 DPR 影响：确认 window.innerWidth 落在目标断点范围
4. 打开导入弹窗，逐 tab 激活后检验（V3 流程）
5. 验证弹窗 max-width 与 table 列宽匹配（L5-14）
6. 验证滚动条可见性（L5-15）
7. 验证 flex-shrink 策略（L2-06）
8. 验证断点配置一致性（L1-06/L1-07）
9. 记录所有 FAIL 项，修复后回归全量检验
```

