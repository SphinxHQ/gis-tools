/**
 * @file WktDataFormat tests
 * @description Unit tests for the WKT data format parser.
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2026-04-13
 */
import { describe, it, expect } from 'vitest'
import { WktDataFormat } from '~/components/data/WktDataFormat'

describe('WktDataFormat', () => {
  const format = new WktDataFormat()

  describe('read() 方法', () => {
    it('应该解析 POINT 并返回正确的 GisDataInfo', async () => {
      const wkt = 'POINT(116.397 39.908)'
      const result = await format.read(wkt)
      expect(result).toBeDefined()
      expect(result.features.length).toBeGreaterThan(0)
      expect(result.features[0].geometry.type).toBe('Point')
      expect(result.features[0].geometry.coordinates).toEqual([116.397, 39.908])
    })

    it('应该解析 LINESTRING', async () => {
      const wkt = 'LINESTRING(116.397 39.908, 116.417 39.915)'
      const result = await format.read(wkt)
      expect(result.features.length).toBeGreaterThan(0)
      expect(result.features[0].geometry.type).toBe('LineString')
      expect(result.features[0].geometry.coordinates).toHaveLength(2)
    })

    it('应该解析 POLYGON', async () => {
      const wkt = 'POLYGON((116.390 39.910, 116.400 39.910, 116.400 39.920, 116.390 39.920, 116.390 39.910))'
      const result = await format.read(wkt)
      expect(result.features.length).toBeGreaterThan(0)
      expect(result.features[0].geometry.type).toBe('Polygon')
    })

    it('应该解析带孔洞的 POLYGON', async () => {
      const wkt = 'POLYGON((116.400 39.900, 116.430 39.900, 116.430 39.930, 116.400 39.930, 116.400 39.900), (116.410 39.910, 116.410 39.920, 116.420 39.920, 116.420 39.910, 116.410 39.910))'
      const result = await format.read(wkt)
      expect(result.features.length).toBeGreaterThan(0)
      expect(result.features[0].geometry.type).toBe('Polygon')
      expect(result.features[0].geometry.coordinates).toHaveLength(2)
    })

    it('应该解析 MULTIPOINT', async () => {
      const wkt = 'MULTIPOINT((116.397 39.908), (117.190 39.125))'
      const result = await format.read(wkt)
      expect(result.features.length).toBeGreaterThan(0)
    })

    it('应该解析 MULTILINESTRING', async () => {
      const wkt = 'MULTILINESTRING((116.397 39.908, 116.417 39.915))'
      const result = await format.read(wkt)
      expect(result.features.length).toBeGreaterThan(0)
    })

    it('应该解析 MULTIPOLYGON', async () => {
      const wkt = 'MULTIPOLYGON(((116.390 39.910, 116.400 39.910, 116.400 39.920, 116.390 39.920, 116.390 39.910)))'
      const result = await format.read(wkt)
      expect(result.features.length).toBeGreaterThan(0)
    })

    it('应该解析 GEOMETRYCOLLECTION', async () => {
      const wkt = 'GEOMETRYCOLLECTION(POINT(116.397 39.908), LINESTRING(116.397 39.908, 116.417 39.915))'
      const result = await format.read(wkt)
      expect(result.features.length).toBeGreaterThan(0)
    })

    it('应该解析带 Z 值的 WKT', async () => {
      const wkt = 'POINT Z (116.390 39.920 88.5)'
      const result = await format.read(wkt)
      expect(result.features.length).toBeGreaterThan(0)
    })

    it('无效 WKT 应抛出错误', async () => {
      await expect(format.read('INVALID WKT')).rejects.toThrow()
    })
  })
})
