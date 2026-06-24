/**
 * @file GeomValidator tests
 * @description Unit tests for geometry validation functions.
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2026-04-13
 */
import { describe, it, expect } from 'vitest'
import {
  validateCoordinate,
  validateCoordinates,
  validateGeometry,
  validateFeature,
  validateFeatureCollection,
  checkSelfIntersection,
} from '~/common/GeomValidator'
import type { Geometry, Feature, FeatureCollection } from 'geojson'

describe('GeomValidator 几何验证器', () => {
  // ============================================================================
  // validatePoint() 测试 - 5个用例
  // ============================================================================
  describe('validateCoordinate()', () => {
    it('TC-004-001: 应该验证有效2D点', () => {
      const result = validateCoordinate([116.397, 39.908])
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('TC-004-002: 应该验证有效3D点', () => {
      const result = validateCoordinate([116.397, 39.908, 88.5])
      expect(result.isValid).toBe(true)
    })

    it('TC-004-003: 应该拒绝NaN坐标', () => {
      const result = validateCoordinate([NaN, 39.908])
      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('TC-004-004: 应该拒绝空坐标数组', () => {
      const result = validateCoordinate([])
      expect(result.isValid).toBe(false)
    })

    it('TC-004-005: 应该拒绝非数组输入', () => {
      expect(validateCoordinate(null).isValid).toBe(false)
      expect(validateCoordinate(undefined).isValid).toBe(false)
      expect(validateCoordinate('string').isValid).toBe(false)
      expect(validateCoordinate(123).isValid).toBe(false)
    })
  })

  // ============================================================================
  // validateLineString() 测试 - 5个用例
  // ============================================================================
  describe('validateCoordinates() for LineString', () => {
    it('TC-004-006: 应该验证有效线（2个点）', () => {
      const result = validateCoordinates([
        [116.397, 39.908],
        [116.417, 39.915],
      ])
      expect(result.isValid).toBe(true)
    })

    it('TC-004-007: 应该验证有效线（多个点）', () => {
      const result = validateCoordinates([
        [116.397, 39.908],
        [116.407, 39.912],
        [116.417, 39.915],
      ])
      expect(result.isValid).toBe(true)
    })

    it('TC-004-008: 应该验证单个坐标点（非LineString场景）', () => {
      const result = validateCoordinates([[116.397, 39.908]])
      expect(result.isValid).toBe(true)
    })

    it('TC-004-009: 应该拒绝空坐标数组', () => {
      const result = validateCoordinates([])
      expect(result.isValid).toBe(false)
    })

    it('TC-004-010: 应该拒绝含NaN坐标的线', () => {
      const result = validateCoordinates([
        [116.397, 39.908],
        [NaN, 39.915],
      ])
      expect(result.isValid).toBe(false)
    })
  })

  // ============================================================================
  // validatePolygon() 测试 - 5个用例
  // ============================================================================
  describe('validateGeometry() for Polygon', () => {
    it('TC-004-011: 应该验证有效面（简单闭合环）', () => {
      const polygon: Geometry = {
        type: 'Polygon',
        coordinates: [
          [
            [116.390, 39.910],
            [116.400, 39.910],
            [116.400, 39.920],
            [116.390, 39.920],
            [116.390, 39.910], // 闭合
          ],
        ],
      }
      const result = validateGeometry(polygon)
      expect(result.isValid).toBe(true)
    })

    it('TC-004-012: 应该验证带孔洞的有效面', () => {
      const polygon: Geometry = {
        type: 'Polygon',
        coordinates: [
          // 外环
          [
            [116.400, 39.900],
            [116.430, 39.900],
            [116.430, 39.930],
            [116.400, 39.930],
            [116.400, 39.900],
          ],
          // 内环
          [
            [116.410, 39.910],
            [116.410, 39.920],
            [116.420, 39.920],
            [116.420, 39.910],
            [116.410, 39.910],
          ],
        ],
      }
      const result = validateGeometry(polygon)
      expect(result.isValid).toBe(true)
    })

    it('TC-004-013: 应该拒绝未闭合的环', () => {
      const polygon: Geometry = {
        type: 'Polygon',
        coordinates: [
          [
            [116.390, 39.910],
            [116.400, 39.910],
            [116.400, 39.920],
            [116.390, 39.920],
            // 缺少闭合点
          ],
        ],
      }
      const result = validateGeometry(polygon)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.type === 'unclosed_ring')).toBe(true)
    })

    it('TC-004-014: 应该拒绝少于4个点的环', () => {
      const polygon: Geometry = {
        type: 'Polygon',
        coordinates: [
          [
            [116.390, 39.910],
            [116.400, 39.910],
            [116.390, 39.910], // 只有2个不同点+闭合点，共3个点
          ],
        ],
      }
      const result = validateGeometry(polygon)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.type === 'too_few_points')).toBe(true)
    })

    it('TC-004-015: 应该处理 null 和 undefined 输入', () => {
      expect(validateGeometry(null as any).isValid).toBe(false)
      expect(validateGeometry(undefined as any).isValid).toBe(false)
    })
  })

  // ============================================================================
  // validateFeature 和 validateFeatureCollection 测试
  // ============================================================================
  describe('validateFeature() and validateFeatureCollection()', () => {
    it('应该验证有效 Feature', () => {
      const feature: Feature = {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [116.397, 39.908],
        },
        properties: {},
      }
      const result = validateFeature(feature)
      expect(result.isValid).toBe(true)
    })

    it('应该拒绝缺少 geometry 的 Feature', () => {
      const feature: any = {
        type: 'Feature',
        geometry: null,
        properties: {},
      }
      const result = validateFeature(feature)
      expect(result.isValid).toBe(false)
    })

    it('应该验证有效 FeatureCollection', () => {
      const fc: FeatureCollection = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [116.397, 39.908] },
            properties: {},
          },
        ],
      }
      const result = validateFeatureCollection(fc)
      expect(result.isValid).toBe(true)
    })

    it('应该拒绝空的 FeatureCollection', () => {
      const fc: FeatureCollection = {
        type: 'FeatureCollection',
        features: [],
      }
      const result = validateFeatureCollection(fc)
      expect(result.isValid).toBe(false)
    })
  })

  // ============================================================================
  // checkSelfIntersection 测试
  // ============================================================================
  describe('checkSelfIntersection()', () => {
    it('应该检测非自相交多边形', () => {
      const polygon: Geometry = {
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
      const result = checkSelfIntersection(polygon)
      expect(result).toBe(true) // true 表示没有自相交
    })

    it('应该处理非多边形类型', () => {
      const point: Geometry = {
        type: 'Point',
        coordinates: [116.397, 39.908],
      }
      const result = checkSelfIntersection(point)
      expect(result).toBe(true)
    })
  })

  // ============================================================================
  // 边界值测试
  // ============================================================================
  describe('边界值', () => {
    it('应该处理经纬度边界值', () => {
      expect(validateCoordinate([-180, -90]).isValid).toBe(true)
      expect(validateCoordinate([180, 90]).isValid).toBe(true)
      expect(validateCoordinate([-181, 0]).isValid).toBe(false) // 经度超出范围
      expect(validateCoordinate([0, -91]).isValid).toBe(false) // 纬度超出范围
    })

    it('应该处理极大值和极小值', () => {
      expect(validateCoordinate([1e10, 1e10]).isValid).toBe(false) // 超出范围
      expect(validateCoordinate([1e-10, 1e-10]).isValid).toBe(true)
    })

    it('应该标记 (0,0) 坐标为可疑（isValid 为 false，因 errors 非空）', () => {
      const result = validateCoordinate([0, 0])
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.message.includes('0,0'))).toBe(true)
    })
  })
})
