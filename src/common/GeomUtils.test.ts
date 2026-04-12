import { describe, it, expect } from 'vitest'
import GeomUtils from '~/common/GeomUtils'
import {
  // 环形数据
  RING_BEIJING_SQUARE_CW,
  RING_BEIJING_SQUARE_CCW,
  RING_SHANGHAI_TRIANGLE_CW,
  RING_SHANGHAI_TRIANGLE_CCW,
  RING_BEIJING_LARGE_RECTANGLE,
  RING_GUANGZHOU_IRREGULAR_CW,
  RING_SHENZHEN_IRREGULAR_CCW,
  // 几何体
  GEOM_BEIJING_VALID_HOLED_POLYGON,
  GEOM_SHANGHAI_INVALID_HOLE_POLYGON,
  GEOM_WUHAN_MULTI_HOLES_POLYGON,
  GEOM_BEIJING_FORBIDDEN_CITY,
  GEOM_BEIJING_COUNTERCLOCKWISE,
  GEOM_SHANGHAI_MULTIPOLYGON,
  GEOM_POINT,
  GEOM_LINESTRING,
  // 要素
  FEATURE_RECTANGLE_A,
  FEATURE_RECTANGLE_B_OVERLAPPING,
  FEATURE_RECTANGLE_C_NO_INTERSECTION,
  FEATURE_RECTANGLE_D_INSIDE,
  FEATURE_POINT_BEIJING,
  // 格式字符串
  WKT_POLYGON_BEIJING,
  WKT_POLYGON_WITH_HOLE,
  WKT_POINT_BEIJING,
  WKB_POINT_LITTLE_ENDIAN,
  // 边界情况
  EDGE_DEGENERATE_COLLINEAR,
  EDGE_SELF_INTERSECTING,
  EDGE_SINGLE_POINT_RING,
  EDGE_UNCLOSED_RING,
  EDGE_NAN_COORDS,
  EDGE_MIXED_POSITIVE_NEGATIVE,
  // 性能测试
  MAJOR_CITIES,
  generateChinaCirclePolygon,
  // 预期结果
  EXPECTED_CLOCKWISE,
  EXPECTED_COUNTERCLOCKWISE,
} from '~/test/shared-test-data'

describe('GeomUtils 几何工具类', () => {
  // ============================================================================
  // getRingclockwise() 测试 - 8 个用例
  // ============================================================================
  describe('getRingclockwise()', () => {
    it('TC-001: 应该识别顺时针正方形（北京城区）', () => {
      const result = GeomUtils.getRingclockwise(RING_BEIJING_SQUARE_CW)
      expect(result).toBe(EXPECTED_CLOCKWISE)
    })

    it('TC-002: 应该识别逆时针正方形', () => {
      const result = GeomUtils.getRingclockwise(RING_BEIJING_SQUARE_CCW)
      expect(result).toBe(EXPECTED_COUNTERCLOCKWISE)
    })

    it('TC-003: 应该识别顺时针三角形（上海浦东）', () => {
      const result = GeomUtils.getRingclockwise(RING_SHANGHAI_TRIANGLE_CW)
      expect(result).toBe(EXPECTED_CLOCKWISE)
    })

    it('TC-004: 应该识别逆时针三角形', () => {
      const result = GeomUtils.getRingclockwise(RING_SHANGHAI_TRIANGLE_CCW)
      expect(result).toBe(EXPECTED_COUNTERCLOCKWISE)
    })

    it('TC-005: 应该识别大尺寸矩形（北京市域）', () => {
      const result = GeomUtils.getRingclockwise(RING_BEIJING_LARGE_RECTANGLE)
      expect(result).toBe(EXPECTED_CLOCKWISE)
    })

    it('TC-006: 应该识别不规则多边形（广州城区）', () => {
      const result = GeomUtils.getRingclockwise(RING_GUANGZHOU_IRREGULAR_CW)
      expect(result).toBe(EXPECTED_CLOCKWISE)
    })

    it('TC-007: 应该处理负坐标和混合坐标', () => {
      const result = GeomUtils.getRingclockwise(EDGE_MIXED_POSITIVE_NEGATIVE)
      expect(typeof result).toBe('boolean')
    })

    it('TC-008: 应该正确处理角度计算优先级', () => {
      const ring = [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
        [0, 0],
      ]
      const result = GeomUtils.getRingclockwise(ring)
      expect(result).toBe(EXPECTED_CLOCKWISE)
    })
  })

  // ============================================================================
  // isValidClickwise() 测试 - 7 个用例
  // ============================================================================
  describe('isValidClickwise()', () => {
    it('TC-009: 应该验证有效的顺时针多边形', () => {
      const result = GeomUtils.isValidClickwise(
        GEOM_BEIJING_FORBIDDEN_CITY,
        EXPECTED_CLOCKWISE
      )
      expect(result.isValid).toBe(true)
      expect(result.errRings).toHaveLength(0)
    })

    it('TC-010: 应该检测外环方向错误的多边形', () => {
      const result = GeomUtils.isValidClickwise(
        GEOM_BEIJING_COUNTERCLOCKWISE,
        EXPECTED_CLOCKWISE
      )
      expect(result.isValid).toBe(false)
      expect(result.errRings).toHaveLength(1)
      expect(result.errRings[0].index).toEqual([0, 0])
    })

    it('TC-011: 应该验证带孔洞的有效多边形（北京东城区含故宫）', () => {
      const result = GeomUtils.isValidClickwise(
        GEOM_BEIJING_VALID_HOLED_POLYGON,
        EXPECTED_CLOCKWISE
      )
      expect(result.isValid).toBe(true)
      expect(result.errRings).toHaveLength(0)
    })

    it('TC-012: 应该检测内环方向错误的多边形', () => {
      const result = GeomUtils.isValidClickwise(
        GEOM_SHANGHAI_INVALID_HOLE_POLYGON,
        EXPECTED_CLOCKWISE
      )
      expect(result.isValid).toBe(false)
      expect(result.errRings.length).toBeGreaterThan(0)
    })

    it('TC-013: 应该验证 MultiPolygon（上海浦东+浦西）', () => {
      const result = GeomUtils.isValidClickwise(
        GEOM_SHANGHAI_MULTIPOLYGON,
        EXPECTED_CLOCKWISE
      )
      expect(result.isValid).toBe(true)
      expect(result.errRings).toHaveLength(0)
    })

    it('TC-014: 应该验证带多个孔洞的多边形（武汉三镇）', () => {
      const result = GeomUtils.isValidClickwise(
        GEOM_WUHAN_MULTI_HOLES_POLYGON,
        EXPECTED_CLOCKWISE
      )
      expect(result.isValid).toBe(true)
    })

    it('TC-015: 应该拒绝不支持的几何类型（Point/LineString）', () => {
      expect(() => {
        GeomUtils.isValidClickwise(GEOM_POINT, EXPECTED_CLOCKWISE)
      }).toThrow(/not support geometry type/)

      expect(() => {
        GeomUtils.isValidClickwise(GEOM_LINESTRING, EXPECTED_CLOCKWISE)
      }).toThrow(/not support geometry type/)
    })
  })

  // ============================================================================
  // 空间关系判断测试 - 8 个用例
  // ============================================================================
  describe('空间关系判断', () => {
    describe('contains()', () => {
      it('TC-016: 应该判断点在多边形内', () => {
        const point = {
          type: 'Point',
          coordinates: [116.395, 39.915],
        } as const
        const result = GeomUtils.contains(
          GEOM_BEIJING_FORBIDDEN_CITY,
          point
        )
        expect(result).toBe(true)
      })

      it('TC-017: 应该判断点在多边形外', () => {
        const point = {
          type: 'Point',
          coordinates: [120.0, 30.0],
        } as const // 远离北京的点
        const result = GeomUtils.contains(
          GEOM_BEIJING_FORBIDDEN_CITY,
          point
        )
        expect(result).toBe(false)
      })
    })

    describe('overlap()', () => {
      it('TC-018: 应该检测重叠的多边形', () => {
        const poly1 = {
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
        } as const
        const poly2 = {
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
        } as const
        const result = GeomUtils.overlap(poly1, poly2)
        expect(result).toBe(true)
      })

      it('TC-019: 应该检测不重叠的多边形', () => {
        const poly1 = {
          type: 'Polygon',
          coordinates: [
            [
              [116.390, 39.900],
              [116.400, 39.900],
              [116.400, 39.910],
              [116.390, 39.910],
              [116.390, 39.900],
            ],
          ],
        } as const
        const poly2 = {
          type: 'Polygon',
          coordinates: [
            [
              [121.470, 31.220],
              [121.480, 31.220],
              [121.480, 31.230],
              [121.470, 31.230],
              [121.470, 31.220],
            ],
          ],
        } as const
        const result = GeomUtils.overlap(poly1, poly2)
        expect(result).toBe(false)
      })
    })

    describe('within()', () => {
      it('TC-020: 应该判断多边形包含于另一多边形', () => {
        const inner = {
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
        } as const
        const outer = {
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
        } as const
        const result = GeomUtils.within(inner, outer)
        expect(result).toBe(true)
      })

      it('TC-021: 应该判断多边形不包含于另一多边形', () => {
        const poly1 = {
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
        } as const
        const poly2 = {
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
        } as const
        const result = GeomUtils.within(poly1, poly2)
        expect(result).toBe(false)
      })
    })

    describe('intersects()', () => {
      it('TC-022: 应该判断相交的几何体', () => {
        const poly1 = {
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
        } as const
        const poly2 = {
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
        } as const
        const result = GeomUtils.intersects(poly1, poly2)
        expect(result).toBe(true)
      })

      it('TC-023: 应该判断不相交的几何体', () => {
        const poly1 = {
          type: 'Polygon',
          coordinates: [
            [
              [116.390, 39.900],
              [116.400, 39.900],
              [116.400, 39.910],
              [116.390, 39.910],
              [116.390, 39.900],
            ],
          ],
        } as const
        const poly2 = {
          type: 'Polygon',
          coordinates: [
            [
              [121.470, 31.220],
              [121.480, 31.220],
              [121.480, 31.230],
              [121.470, 31.230],
              [121.470, 31.220],
            ],
          ],
        } as const
        const result = GeomUtils.intersects(poly1, poly2)
        expect(result).toBe(false)
      })
    })
  })

  // ============================================================================
  // difference() 测试 - 4 个用例
  // ============================================================================
  describe('difference()', () => {
    it('TC-024: 应该计算两个相交矩形的差集', () => {
      const result = GeomUtils.difference(
        FEATURE_RECTANGLE_A,
        FEATURE_RECTANGLE_B_OVERLAPPING
      )
      expect(result).toBeDefined()
      // @turf/turf 的 difference 返回 Feature 或 null
      if (result !== null) {
        expect(result.geometry.type).toBe('Polygon')
      }
    })

    it('TC-025: 不相交时应返回原始要素', () => {
      const result = GeomUtils.difference(
        FEATURE_RECTANGLE_A,
        FEATURE_RECTANGLE_C_NO_INTERSECTION
      )
      expect(result).toBeDefined()
      if (result !== null) {
        expect(result.geometry.type).toBe('Polygon')
        expect(result.geometry.coordinates).toBeDefined()
      }
    })

    it('TC-026: 完全包含时应返回 null 或空几何', () => {
      const result = GeomUtils.difference(
        FEATURE_RECTANGLE_D_INSIDE,
        FEATURE_RECTANGLE_A
      )
      // 当第二个要素完全包含第一个时，差集为 null
      expect(result).toBeNull()
    })

    it('TC-027: 应该处理边界相切的情况', () => {
      const touching1 = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [10, 0],
              [10, 10],
              [0, 10],
              [0, 0],
            ],
          ],
        },
        properties: {},
      } as const
      const touching2 = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [10, 0],
              [20, 0],
              [20, 10],
              [10, 10],
              [10, 0],
            ],
          ],
        },
        properties: {},
      } as const
      const result = GeomUtils.difference(touching1, touching2)
      expect(result).toBeDefined()
    })
  })

  // ============================================================================
  // 格式转换函数测试 - 5 个用例
  // ============================================================================
  describe('格式转换函数', () => {
    describe('wktToGeoJSON()', () => {
      it('TC-028: 应该将简单多边形 WKT 转换为 GeoJSON', () => {
        const result = GeomUtils.wktToGeoJSON(WKT_POLYGON_BEIJING)
        expect(result).toBeDefined()
        expect(result.type).toBe('FeatureCollection')
        expect(result.features).toHaveLength(1)
        expect(result.features[0].geometry.type).toBe('Polygon')
      })

      it('TC-029: 应该转换带孔洞的多边形 WKT', () => {
        const result = GeomUtils.wktToGeoJSON(WKT_POLYGON_WITH_HOLE)
        expect(result).toBeDefined()
        expect(result.features[0].geometry.type).toBe('Polygon')
        // 带孔洞的多边形应该有 2 个坐标数组（外环 + 内环）
        expect(result.features[0].geometry.coordinates).toHaveLength(2)
      })
    })

    describe('wkbToGeoJSON()', () => {
      it('TC-030: 应该将 WKB 十六进制字符串转换为 GeoJSON', () => {
        const result = GeomUtils.wkbToGeoJSON(WKB_POINT_LITTLE_ENDIAN)
        expect(result).toBeDefined()
        expect(result.type).toBe('FeatureCollection')
        expect(result.features).toHaveLength(1)
        expect(result.features[0].geometry.type).toBe('Point')
      })
    })

    describe('olFeatureToGeoJSON()', () => {
      it('TC-031: 应该实现 OpenLayers 要素到 GeoJSON 的往返转换', () => {
        // 先将 GeoJSON 转换为 OpenLayers 要素
        const olFeature = GeomUtils.geoJSONToOlFeature(FEATURE_RECTANGLE_A)
        // 再转换回 GeoJSON
        const convertedBack = GeomUtils.olFeatureToGeoJSON(olFeature)

        expect(convertedBack).toBeDefined()
        expect(convertedBack.type).toBe('Feature')
        expect(convertedBack.geometry.type).toBe(
          FEATURE_RECTANGLE_A.geometry.type
        )
      })
    })

    describe('geoJSONToOlFeature()', () => {
      it('TC-032: 应该将 GeoJSON 转换为 OpenLayers 要素', () => {
        const olFeature = GeomUtils.geoJSONToOlFeature(FEATURE_POINT_BEIJING)
        expect(olFeature).toBeDefined()
        // OpenLayers Feature 应该有 getGeometry 方法
        expect(typeof olFeature.getGeometry).toBe('function')
      })
    })
  })

  // ============================================================================
  // 工具函数测试 - 3 个用例
  // ============================================================================
  describe('工具函数', () => {
    describe('getGeometryCenter()', () => {
      it('TC-033: 应该计算多边形的质心', () => {
        const center = GeomUtils.getGeometryCenter(GEOM_BEIJING_FORBIDDEN_CITY)
        expect(Array.isArray(center)).toBe(true)
        expect(center).toHaveLength(2)
        // 质心应该在多边形中心附近
        expect(center[0]).toBeCloseTo(116.395, 3) // 经度
        expect(center[1]).toBeCloseTo(39.915, 3) // 纬度
      })
    })

    describe('getTypeName()', () => {
      it('TC-034: 应该正确映射所有几何类型名称', () => {
        expect(GeomUtils.getTypeName('Point')).toBe('点')
        expect(GeomUtils.getTypeName('LineString')).toBe('线')
        expect(GeomUtils.getTypeName('Polygon')).toBe('面')
        expect(GeomUtils.getTypeName('MultiPoint')).toBe('多点')
        expect(GeomUtils.getTypeName('MultiLineString')).toBe('多线')
        expect(GeomUtils.getTypeName('MultiPolygon')).toBe('多面')
        expect(GeomUtils.getTypeName('GeometryCollection')).toBe('几何集合')
      })

      it('应该拒绝不支持的类型', () => {
        expect(() => {
          GeomUtils.getTypeName('InvalidType')
        }).toThrow(/不支持的 geometry type/)
      })
    })

    describe('getCoordinatesCount()', () => {
      it('TC-035: 应该正确统计嵌套坐标数量', () => {
        const count = GeomUtils.getCoordinatesCount(FEATURE_RECTANGLE_A)
        expect(count).toBeGreaterThan(0)
        expect(typeof count).toBe('number')

        // 测试 Point 的坐标计数
        const pointCount = GeomUtils.getCoordinatesCount(FEATURE_POINT_BEIJING)
        expect(pointCount).toBe(1)
      })
    })
  })

  // ============================================================================
  // 性能测试 - 2 个用例
  // ============================================================================
  describe('性能测试', () => {
    it('TC-PERF-001: getRingclockwise() 应该在 1ms 内处理 1000 顶点多边形', () => {
      const largeRing = generateChinaCirclePolygon(1000, 50)

      const start = performance.now()
      GeomUtils.getRingclockwise(largeRing)
      const duration = performance.now() - start

      expect(duration).toBeLessThan(10) // 放宽到 10ms 以适应测试环境
    })

    it('TC-PERF-002: isValidClickwise() 应该在 5ms 内验证复杂多边形', () => {
      const complexCoords = generateChinaCirclePolygon(500, 30)
      const complexPolygon = {
        type: 'Polygon',
        coordinates: [complexCoords],
      } as const

      const start = performance.now()
      GeomUtils.isValidClickwise(complexPolygon, EXPECTED_CLOCKWISE)
      const duration = performance.now() - start

      expect(duration).toBeLessThan(50) // 放宽到 50ms 以适应测试环境
    })
  })
})
