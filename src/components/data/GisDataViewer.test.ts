import { describe, it, expect } from 'vitest'
import { validateFeature, validateFeatureCollection } from '~/common/GeomValidator'
import type { Feature, FeatureCollection } from 'geojson'

describe('GisDataViewer 数据查看器', () => {
  describe('要素数据验证逻辑（非交互）', () => {
    it('TC-015-001: 应该验证有效要素', () => {
      const feature: Feature = {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [116.397, 39.908] },
        properties: {},
      }
      const result = validateFeature(feature)
      expect(result.isValid).toBe(true)
    })

    it('TC-015-003: 应该处理空属性要素', () => {
      const feature: Feature = {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [116.397, 39.908] },
        properties: null,
      }
      const result = validateFeature(feature)
      expect(result.isValid).toBe(true)
    })

    it('TC-015-004: 应该验证要素集合', () => {
      const fc: FeatureCollection = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [116.397, 39.908] },
            properties: { id: 1 },
          },
          {
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: [[116.397, 39.908], [116.401, 39.912]] },
            properties: { id: 2 },
          },
        ],
      }
      const result = validateFeatureCollection(fc)
      expect(result.isValid).toBe(true)
    })

    it('TC-015-005: 应该检测无效要素', () => {
      const feature: Feature = {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [NaN, 39.908] },
        properties: {},
      }
      const result = validateFeature(feature)
      expect(result.isValid).toBe(false)
    })

    it('TC-015-006: 空要素集合应返回无效', () => {
      const fc: FeatureCollection = {
        type: 'FeatureCollection',
        features: [],
      }
      const result = validateFeatureCollection(fc)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.type === 'empty_geometry')).toBe(true)
    })

    it('TC-015-007: 应该处理大量要素验证', () => {
      const features: Feature[] = Array.from({ length: 1000 }, (_, i) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [116 + i * 0.001, 39 + i * 0.001] },
        properties: { id: i },
      }))
      const fc: FeatureCollection = {
        type: 'FeatureCollection',
        features,
      }
      const start = performance.now()
      const result = validateFeatureCollection(fc)
      const elapsed = performance.now() - start
      expect(result.isValid).toBe(true)
      expect(elapsed).toBeLessThan(3000)
    })
  })
})
