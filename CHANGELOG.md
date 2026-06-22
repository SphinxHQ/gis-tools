# 更新日志

所有显著变更记录于此。版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [0.1.1] - 2026-06-22

### 新增
- **天地图 API Key 轮换降级**：支持配置多个 key（`VITE_TIANDITU_API_KEYS`），每次启动应用自动探测可用 key，配额耗尽时降级到下一个；全部不可用时自动切回本地底图。状态持久化到 localStorage。
- **坐标系范围提示**：切换投影坐标系时显示左右两条红色虚线边，框出当前坐标系的标准经度范围（不覆盖整个矩形避免性能问题，不参与要素交互）。
- **底图切换器**：新增【无】选项，支持完全关闭底图。
- **天地图瓦片级别限制**：明确设置 `minZoom: 0, maxZoom: 18`，避免请求超出天地图支持的瓦片级别。

### 变更
- **默认底图**：底图切换器默认选中"矢量"，顺序调整为「矢量 → 影像 → 本地 → 无」。
- **GisDataInspactor（编辑&查看）和 MapDrawer（绘制图形）**：默认从天地图底图加载，提供完整的中国轮廓参照。
- **BaseTianDiTuMap**：支持 `options.projection` 自定义投影，初始化时正确传入投影参数。
- **GisMapBase.vue**：默认初始化时不加载本地底图（保持 BlankMap 默认行为）。
- **深色主题滤镜**：移除 `invert(1) hue-rotate(180deg)` 反相滤镜，避免天地图影像被反色成异常颜色，改为轻微降低亮度。
- **底图切换器和工具栏**：统一按钮样式为 `.gismap-btn`，操作区域使用外层 `.gismap-btns-wrap` 包裹圆角 6px 透明容器。

### 修复
- **高斯-克吕格分带投影底图显示**：修复 EPSG:4524/4525 等分带投影下天地图底图无法正确显示的问题，统一使用中国经度范围（68°~140°）+ 全球纬度（±85°）作为 worldExtent。
- **XYZ source projection**：明确设置天地图 source projection 为 EPSG:3857，避免 OL 误判为视图投影导致瓦片不重投影。
- **图层初始化顺序**：BaseTianDiTuMap 显式调用 `addLayer` 添加底图，避免构造时底图未生效。
- **坐标系范围提示框性能**：使用左右两条 LineString 替代大矩形 Polygon，避免 `forEachFeatureAtPixel` 遍历覆盖大量几何导致卡顿；通过 `layerFilter` 跳过坐标系范围图层。

### 优化
- **pointermove 节流**：使用 RAF 节流 + 像素去重，避免每帧多次查询要素和触发响应式更新。
- **坐标显示节流**：鼠标坐标显示使用 RAF 节流，避免拖动时每像素更新。
- **默认禁用要素 hover 高亮**：所有 feature 默认不参与 `pointermove` hover 高亮和 `FeatureOver` 事件，需要交互的图层显式调用 `map.enableFeatureSelect(layer)` 启用。
- **CSS 滤镜性能**：移除深色主题反相滤镜，降低 GPU 开销。

## [0.1.0] - 2026-06-22

初始版本。