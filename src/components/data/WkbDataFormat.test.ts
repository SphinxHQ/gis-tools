/**
 * @file WkbDataFormat tests
 * @description Unit tests for the WKB data format parser.
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2026-04-13
 */
import { describe, it, expect } from 'vitest'
import { WkbDataFormat } from '~/components/data/WkbDataFormat'

describe('WkbDataFormat', () => {
  const format = new WkbDataFormat()

  describe('read() 方法', () => {
    it('read() 尚未实现，应抛出错误', async () => {
      await expect(format.read('')).rejects.toThrow('not yet implemented')
    })
  })

  describe('write() 方法', () => {
    it('应该将 GeoJSON 要素转换为 WKB 十六进制字符串', async () => {
      const gisDataInfo = {
        features: [
          {
            type: 'Feature' as const,
            geometry: {
              type: 'Point' as const,
              coordinates: [116.397, 39.908],
            },
            properties: {},
          },
        ],
      }
      const result = await format.write(gisDataInfo as any)
      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(1)
      expect(typeof result[0]).toBe('string')
    })

    it('应该将 LineString 转换为 WKB', async () => {
      const gisDataInfo = {
        features: [
          {
            type: 'Feature' as const,
            geometry: {
              type: 'LineString' as const,
              coordinates: [
                [116.397, 39.908],
                [116.417, 39.915],
              ],
            },
            properties: {},
          },
        ],
      }
      const result = await format.write(gisDataInfo as any)
      expect(result).toBeDefined()
      expect(result.length).toBe(1)
    })

    it('应该将 Polygon 转换为 WKB', async () => {
      const gisDataInfo = {
        features: [
          {
            type: 'Feature' as const,
            geometry: {
              type: 'Polygon' as const,
              coordinates: [
                [
                  [116.390, 39.910],
                  [116.400, 39.910],
                  [116.400, 39.920],
                  [116.390, 39.920],
                  [116.390, 39.910],
                ],
              ],
            },
            properties: {},
          },
        ],
      }
      const result = await format.write(gisDataInfo as any)
      expect(result).toBeDefined()
      expect(result.length).toBe(1)
    })

    it('应该处理多个要素', async () => {
      const gisDataInfo = {
        features: [
          {
            type: 'Feature' as const,
            geometry: {
              type: 'Point' as const,
              coordinates: [116.397, 39.908],
            },
            properties: {},
          },
          {
            type: 'Feature' as const,
            geometry: {
              type: 'Point' as const,
              coordinates: [117.190, 39.125],
            },
            properties: {},
          },
        ],
      }
      const result = await format.write(gisDataInfo as any)
      expect(result.length).toBe(2)
    })

    it('无效几何应抛出错误', async () => {
      const gisDataInfo = {
        features: [
          {
            type: 'Feature' as const,
            geometry: null,
            properties: {},
          },
        ],
      }
      await expect(format.write(gisDataInfo as any)).rejects.toThrow()
    })
  })
})
