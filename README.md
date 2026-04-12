# GIS Tools - GIS数据处理工具

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Vue](https://img.shields.io/badge/Vue-3.4-brightgreen.svg)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)](https://www.typescriptlang.org/)

一个基于 Web 的地理信息系统数据处理工具，支持多种GIS数据格式的读取、解析、转换和可视化。

**在线体验**: [https://sphinxhq.github.io/gis-tools/](https://sphinxhq.github.io/gis-tools/)

## 功能特性

- **多格式数据导入**: 支持 GeoJSON、WKT、WKB、Shapefile、DXF、EXF 等格式
- **坐标系识别与转换**: 自动识别常用坐标系，支持坐标转换
- **地图可视化**: 基于 OpenLayers 的地图展示与交互
- **绘图工具**: 支持在地图上绘制点、线、面
- **数据导出**: 支持 GeoJSON、WKT、Shapefile 导出

## 技术栈

| 类别 | 技术 |
|------|------|
| 前端框架 | Vue 3 + TypeScript |
| 构建工具 | Vite 5 |
| UI组件库 | Element Plus |
| 地图引擎 | OpenLayers 10 |
| 坐标转换 | Proj4 |
| 几何运算 | Turf.js |
| Shapefile | [@sphinx_hq/shapefile-parser](https://www.npmjs.com/package/@sphinx_hq/shapefile-parser) |

## 快速开始

### 环境要求

- Node.js 18+
- pnpm 8+ (推荐)

### 安装依赖

```bash
pnpm install
```

### 环境配置

复制 `.env.example` 为 `.env.development`，配置天地图 API Key（可选）：

```env
VITE_TIANDITU_API_KEY=your_api_key_here
```

> 如不配置天地图 Key，地图底图功能将受限，但其他数据处理功能正常使用。

### 开发命令

```bash
pnpm dev          # 启动开发服务器
pnpm build        # 构建生产版本
pnpm preview      # 预览构建结果
pnpm test         # 运行测试
pnpm lint         # 代码检查
pnpm typecheck    # TypeScript 类型检查
```

## 支持的数据格式

### 输入格式

| 格式 | 扩展名 | 说明 |
|------|--------|------|
| GeoJSON | .geojson, .json | 标准 GeoJSON 格式 |
| WKT | .wkt, .txt | Well-Known Text 格式 |
| WKB | 十六进制字符串 | Well-Known Binary 格式 |
| Shapefile | .shp | ESRI Shapefile |
| ShapeZip | .zip | 压缩的 Shapefile |
| DXF | .dxf | AutoCAD DXF 格式 |
| EXF | .exf | 扩展交换格式 |

### 输出格式

| 格式 | 扩展名 | 说明 |
|------|--------|------|
| GeoJSON | .geojson | 标准 GeoJSON 格式 |
| WKT | .wkt | Well-Known Text 格式 |
| Shapefile | .zip | ESRI Shapefile (ZIP压缩) |

## 支持的坐标系统

- WGS84 (EPSG:4326)
- CGCS2000 (EPSG:4490)
- 北京54 (EPSG:4214)
- 西安80 (EPSG:4610)
- Web墨卡托 (EPSG:3857)
- 高斯-克吕格投影（3度带、6度带）

## 项目结构

```
gis-tools/
├── src/
│   ├── common/           # 通用工具
│   ├── components/       # 组件目录
│   │   ├── data/         # 数据处理组件
│   │   ├── editor/       # 编辑器组件
│   │   ├── gismap/       # 地图核心模块
│   │   ├── layouts/      # 布局组件
│   │   └── parser/       # 解析器组件
│   ├── composables/      # 组合式函数
│   ├── styles/           # 样式文件
│   └── types/            # 类型定义
└── public/               # 静态资源
```

## 开发指南

### 路径别名

`~/` 映射到 `src/` 目录：

```typescript
import { Common } from '~/common/Common'
```

### 代码规范

- 使用 TypeScript 严格模式
- 遵循 Vue 官方风格指南
- 使用组合式 API

## 浏览器支持

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 许可证

[MIT License](LICENSE)

## 作者

YuanYu - [yumen2009@vip.qq.com](mailto:yumen2009@vip.qq.com)
