/**
 * GeomUtils 模块共享测试数据
 *
 * 数据来源: docs/test/process/SHARED-TEST-DATA.md
 * 坐标系: CGCS2000 (EPSG:4490) - [经度, 纬度] 格式
 * 维护原则: 单一数据源 (Single Source of Truth)
 */

import type { Geometry, Feature } from 'geojson'

// ============================================================================
// Section 1: 基础环形数据 (用于 getRingclockwise)
// ============================================================================

/**
 * 顺时针正方形 - 北京城区小范围 (约1km x 1km)
 */
export const RING_BEIJING_SQUARE_CW: number[][] = [
  [116.390, 39.900], // 西南角
  [116.400, 39.900], // 东南角
  [116.400, 39.910], // 东北角
  [116.390, 39.910], // 西北角
  [116.390, 39.900], // 闭合
]

/**
 * 逆时针正方形 - 北京城区小范围
 */
export const RING_BEIJING_SQUARE_CCW: number[][] = [
  [116.390, 39.900], // 西南角
  [116.390, 39.910], // 西北角
  [116.400, 39.910], // 东北角
  [116.400, 39.900], // 东南角
  [116.390, 39.900], // 闭合
]

/**
 * 顺时针三角形 - 上海浦东区域
 */
export const RING_SHANGHAI_TRIANGLE_CW: number[][] = [
  [121.500, 31.230], // 顶点1
  [121.520, 31.230], // 顶点2
  [121.510, 31.250], // 顶点3
  [121.500, 31.230], // 闭合
]

/**
 * 逆时针三角形 - 上海浦东区域
 */
export const RING_SHANGHAI_TRIANGLE_CCW: number[][] = [
  [121.500, 31.230], // 顶点1
  [121.510, 31.250], // 顶点3
  [121.520, 31.230], // 顶点2
  [121.500, 31.230], // 闭合
]

/**
 * 大尺寸矩形 - 北京市域范围 (约100km x 80km)
 */
export const RING_BEIJING_LARGE_RECTANGLE: number[][] = [
  [116.000, 39.500], // 西南角
  [117.000, 39.500], // 东南角
  [117.000, 40.300], // 东北角
  [116.000, 40.300], // 西北角
  [116.000, 39.500], // 闭合
]

/**
 * 不规则顺时针多边形 - 广州城区
 */
export const RING_GUANGZHOU_IRREGULAR_CW: number[][] = [
  [113.250, 23.120], // 起点
  [113.270, 23.120],
  [113.280, 23.130],
  [113.270, 23.140],
  [113.250, 23.140],
  [113.240, 23.130],
  [113.250, 23.120], // 闭合
]

/**
 * 不规则逆时针多边形 - 深圳城区
 */
export const RING_SHENZHEN_IRREGULAR_CCW: number[][] = [
  [114.050, 22.540], // 起点
  [114.040, 22.550],
  [114.050, 22.560],
  [114.070, 22.560],
  [114.080, 22.550],
  [114.070, 22.540],
  [114.050, 22.540], // 闭合
]

// ============================================================================
// Section 2: GeoJSON 几何体 (用于 isValidClickwise, 空间运算)
// ============================================================================

/**
 * 有效带孔洞多边形 - 北京东城区含故宫 (外环顺时针，内环逆时针)
 */
export const GEOM_BEIJING_VALID_HOLED_POLYGON: Geometry = {
  type: 'Polygon',
  coordinates: [
    // 外环 - 北京东城区范围 (顺时针)
    [
      [116.400, 39.900], // 西南
      [116.430, 39.900], // 东南
      [116.430, 39.930], // 东北
      [116.400, 39.930], // 西北
      [116.400, 39.900], // 闭合
    ],
    // 内环 - 故宫博物院区域 (逆时针)
    [
      [116.410, 39.910], // 西南
      [116.410, 39.920], // 西北
      [116.420, 39.920], // 东北
      [116.420, 39.910], // 东南
      [116.410, 39.910], // 闭合
    ],
  ],
}

/**
 * 内环方向错误的多边形 (内外环均为顺时针 - 错误)
 */
export const GEOM_SHANGHAI_INVALID_HOLE_POLYGON: Geometry = {
  type: 'Polygon',
  coordinates: [
    // 外环 - 上海黄浦区 (顺时针)
    [
      [121.470, 31.220], // 西南
      [121.500, 31.220], // 东南
      [121.500, 31.250], // 东北
      [121.470, 31.250], // 西北
      [121.470, 31.220], // 闭合
    ],
    // 内环 - 人民广场区域 (顺时针 - 错误！应为逆时针)
    [
      [121.480, 31.230], // 西南
      [121.490, 31.230], // 东南
      [121.490, 31.240], // 东北
      [121.480, 31.240], // 西北
      [121.480, 31.230], // 闭合
    ],
  ],
}

/**
 * 多个孔洞的多边形 - 武汉三镇区域示例
 */
export const GEOM_WUHAN_MULTI_HOLES_POLYGON: Geometry = {
  type: 'Polygon',
  coordinates: [
    // 外环 - 武汉市中心大范围
    [
      [114.280, 30.570], // 西南
      [114.350, 30.570], // 东南
      [114.350, 30.630], // 东北
      [114.280, 30.630], // 西北
      [114.280, 30.570], // 闭合
    ],
    // 孔洞1 - 武昌江滩 (逆时针，与外环方向相反)
    [
      [114.300, 30.580], // 西南
      [114.300, 30.590], // 西北
      [114.310, 30.590], // 东北
      [114.310, 30.580], // 东南
      [114.300, 30.580], // 闭合
    ],
    // 孔洞2 - 汉阳江滩 (逆时针，与外环方向相反)
    [
      [114.320, 30.600], // 西南
      [114.320, 30.610], // 西北
      [114.330, 30.610], // 东北
      [114.330, 30.600], // 东南
      [114.320, 30.600], // 闭合
    ],
  ],
}

/**
 * 简单顺时针多边形 - 北京故宫范围
 */
export const GEOM_BEIJING_FORBIDDEN_CITY: Geometry = {
  type: 'Polygon',
  coordinates: [
    [
      [116.390, 39.910],
      [116.400, 39.910],
      [116.400, 39.920],
      [116.390, 39.920],
      [116.390, 39.910],
    ],
  ],
}

/**
 * 逆时针多边形 - 用于验证方向检测
 */
export const GEOM_BEIJING_COUNTERCLOCKWISE: Geometry = {
  type: 'Polygon',
  coordinates: [
    [
      [116.390, 39.910],
      [116.390, 39.920],
      [116.400, 39.920],
      [116.400, 39.910],
      [116.390, 39.910],
    ],
  ],
}

/**
 * MultiPolygon - 上海浦东+浦西两块区域
 */
export const GEOM_SHANGHAI_MULTIPOLYGON: Geometry = {
  type: 'MultiPolygon',
  coordinates: [
    [
      // 第一个多边形 - 浦东
      [
        [121.470, 31.220],
        [121.500, 31.220],
        [121.500, 31.250],
        [121.470, 31.250],
        [121.470, 31.220],
      ],
    ],
    [
      // 第二个多边形 - 浦西
      [
        [121.520, 31.230],
        [121.550, 31.230],
        [121.550, 31.260],
        [121.520, 31.260],
        [121.520, 31.230],
      ],
    ],
  ],
}

/**
 * Point 几何体 - 用于测试不支持的类型
 */
export const GEOM_POINT: Geometry = {
  type: 'Point',
  coordinates: [116.397, 39.908],
}

/**
 * LineString 几何体 - 用于测试不支持的类型
 */
export const GEOM_LINESTRING: Geometry = {
  type: 'LineString',
  coordinates: [
    [116.397, 39.908],
    [116.417, 39.915],
  ],
}

// ============================================================================
// Section 3: GeoJSON 要素 (用于 difference, 格式转换)
// ============================================================================

/**
 * 矩形要素 A - 北京区域
 */
export const FEATURE_RECTANGLE_A: Feature = {
  type: 'Feature',
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [116.390, 39.900],
        [116.410, 39.900],
        [116.410, 39.920],
        [116.390, 39.920],
        [116.390, 39.900],
      ],
    ],
  },
  properties: {},
}

/**
 * 矩形要素 B - 与 A 部分重叠
 */
export const FEATURE_RECTANGLE_B_OVERLAPPING: Feature = {
  type: 'Feature',
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [116.400, 39.900],
        [116.420, 39.900],
        [116.420, 39.920],
        [116.400, 39.920],
        [116.400, 39.900],
      ],
    ],
  },
  properties: {},
}

/**
 * 不相交的矩形要素 - 远离北京的区域
 */
export const FEATURE_RECTANGLE_C_NO_INTERSECTION: Feature = {
  type: 'Feature',
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [121.470, 31.220],
        [121.500, 31.220],
        [121.500, 31.250],
        [121.470, 31.250],
        [121.470, 31.220],
      ],
    ],
  },
  properties: {},
}

/**
 * 完全包含的小矩形 - 在 RECTANGLE_A 内部
 */
export const FEATURE_RECTANGLE_D_INSIDE: Feature = {
  type: 'Feature',
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [116.395, 39.905],
        [116.405, 39.905],
        [116.405, 39.915],
        [116.395, 39.915],
        [116.395, 39.905],
      ],
    ],
  },
  properties: {},
}

/**
 * 点要素 - 北京天安门
 */
export const FEATURE_POINT_BEIJING: Feature = {
  type: 'Feature',
  geometry: {
    type: 'Point',
    coordinates: [116.397, 39.908],
  },
  properties: {},
}

// ============================================================================
// Section 4: 格式字符串 (WKT/WKB)
// ============================================================================

/**
 * WKT 简单多边形 - 北京故宫范围
 */
export const WKT_POLYGON_BEIJING =
  'POLYGON((116.390 39.910, 116.400 39.910, 116.400 39.920, 116.390 39.920, 116.390 39.910))'

/**
 * WKT 带孔洞多边形 - 北京城区含故宫
 */
export const WKT_POLYGON_WITH_HOLE =
  'POLYGON((116.400 39.900, 116.430 39.900, 116.430 39.930, 116.400 39.930, 116.400 39.900), (116.410 39.910, 116.410 39.920, 116.420 39.920, 116.420 39.910, 116.410 39.910))'

/**
 * WKT Point - 北京天安门
 */
export const WKT_POINT_BEIJING = 'POINT(116.397 39.908)'

/**
 * WKB Point (小端序) - POINT(116.4 39.9)
 */
export const WKB_POINT_LITTLE_ENDIAN =
  '01010000000000000000005D400000000000004340'

/**
 * WKB Point (大端序) - POINT(116.4 39.9)
 */
export const WKB_POINT_BIG_ENDIAN =
  '0000000001405D0000000000004043000000000000'

// ============================================================================
// Section 5: 退化/边界情况
// ============================================================================

/**
 * 退化多边形（共线点）- 沿直线的线段
 */
export const EDGE_DEGENERATE_COLLINEAR: number[][] = [
  [116.400, 39.900],
  [116.410, 39.900],
  [116.420, 39.900],
  [116.400, 39.900], // 闭合但共线
]

/**
 * 自相交多边形（蝴蝶结形状）- 重庆两江交汇区域模拟
 */
export const EDGE_SELF_INTERSECTING: number[][] = [
  [106.550, 29.560], // 起点
  [106.570, 29.580], // 对角
  [106.570, 29.560], // 同经度不同纬度
  [106.550, 29.580], // 另一对角
  [106.550, 29.560], // 闭合
]

/**
 * 单点环 - 单一位置重复
 */
export const EDGE_SINGLE_POINT_RING: number[][] = [
  [116.400, 39.900],
  [116.400, 39.900],
]

/**
 * 未闭合的环 - 西安城墙部分段落
 */
export const EDGE_UNCLOSED_RING: number[][] = [
  [108.940, 34.340], // 起点
  [108.960, 34.340],
  [108.960, 34.360],
  [108.940, 34.360],
  // 缺少闭合点
]

/**
 * 含NaN坐标的环 - 无效数据示例
 */
export const EDGE_NAN_COORDS: number[][] = [
  [116.400, 39.900],
  [NaN, 39.900], // 无效经度
  [116.420, 39.920],
  [116.400, 39.920],
  [116.400, 39.900],
]

/**
 * 负坐标多边形 - 混合正负坐标
 */
export const EDGE_MIXED_POSITIVE_NEGATIVE: number[][] = [
  [-10, -10],
  [10, -10],
  [10, 10],
  [-10, 10],
  [-10, -10],
]

// ============================================================================
// Section 6: 性能测试生成器
// ============================================================================

/**
 * 中国主要城市坐标 [经度, 纬度]
 */
export const MAJOR_CITIES = {
  BEIJING: [116.397, 39.908] as [number, number], // 北京
  SHANGHAI: [121.473, 31.230] as [number, number], // 上海
  GUANGZHOU: [113.264, 23.129] as [number, number], // 广州
  SHENZHEN: [114.057, 22.543] as [number, number], // 深圳
  CHENGDU: [104.065, 30.659] as [number, number], // 成都
  HANGZHOU: [120.155, 30.274] as [number, number], // 杭州
  WUHAN: [114.305, 30.592] as [number, number], // 武汉
  XI_AN: [108.940, 34.341] as [number, number], // 西安
  NANJING: [118.796, 32.059] as [number, number], // 南京
  TIANJIN: [117.190, 39.125] as [number, number], // 天津
}

/**
 * 生成指定顶点数的圆形多边形，中心位于中国境内
 * @param vertexCount 顶点数量
 * @param radiusKm 半径(公里)，默认50km
 * @param centerLon 中心经度，默认北京 (116.397)
 * @param centerLat 中心纬度，默认北京 (39.908)
 * @returns CGCS2000坐标数组 [经度, 纬度]
 */
export function generateChinaCirclePolygon(
  vertexCount: number = 1000,
  radiusKm: number = 50,
  centerLon: number = 116.397, // 北京
  centerLat: number = 39.908
): number[][] {
  const vertices: number[][] = []
  // 粗略转换: 1度纬度≈111km, 1度经度≈111km*cos(lat)
  const latOffset = radiusKm / 111.0
  const lonOffset =
    radiusKm / (111.0 * Math.cos((centerLat * Math.PI) / 180))

  for (let i = 0; i < vertexCount; i++) {
    const angle = (i / vertexCount) * Math.PI * 2
    const lon = centerLon + Math.cos(angle) * lonOffset
    const lat = centerLat + Math.sin(angle) * latOffset
    vertices.push([lon, lat])
  }
  vertices.push(vertices[0]) // 闭合
  return vertices
}

// ============================================================================
// Section 7: 预期结果常量
// ============================================================================

/**
 * 顺时针方向的预期结果
 * getRingclockwise 算法：在地理坐标系中，视觉上顺时针（SW→SE→NE→NW）返回 false
 */
export const EXPECTED_CLOCKWISE = false

/**
 * 逆时针方向的预期结果
 * getRingclockwise 算法：在地理坐标系中，视觉上逆时针（SW→NW→NE→SE）返回 true
 */
export const EXPECTED_COUNTERCLOCKWISE = true

/**
 * 有效的多边形验证结果
 */
export const EXPECTED_VALID_RESULT = {
  isValid: true,
  errRings: [],
}
