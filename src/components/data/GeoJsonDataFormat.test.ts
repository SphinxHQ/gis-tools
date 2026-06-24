/**
 * @file GeoJsonDataFormat tests
 * @description Unit tests for the GeoJSON data format parser.
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2026-04-13
 */
import { describe, it, expect } from 'vitest'
import { GeoJsonDataFormat } from '~/components/data/GeoJsonDataFormat'

describe('GeoJsonDataFormat', () => {
  const format = new GeoJsonDataFormat()

  describe('read() 方法', () => {
    it('应该解析 Point 并返回正确的 GisDataInfo', async () => {
      const geojson = '{"type":"Point","coordinates":[116.397,39.908]}'
      const result = await format.read(geojson)
      expect(result).toBeDefined()
      expect(result.features).toHaveLength(1)
      expect(result.features[0].geometry.type).toBe('Point')
      expect(result.features[0].geometry.coordinates).toEqual([116.397, 39.908])
    })

    it('应该解析 LineString 并返回正确的几何', async () => {
      const geojson = '{"type":"LineString","coordinates":[[116.397,39.908],[116.417,39.915]]}'
      const result = await format.read(geojson)
      expect(result.features).toHaveLength(1)
      expect(result.features[0].geometry.type).toBe('LineString')
      expect(result.features[0].geometry.coordinates).toHaveLength(2)
    })

    it('应该解析 Polygon 并返回正确的几何', async () => {
      const geojson = '{"type":"Polygon","coordinates":[[[116.390,39.910],[116.400,39.910],[116.400,39.920],[116.390,39.920],[116.390,39.910]]]}'
      const result = await format.read(geojson)
      expect(result.features).toHaveLength(1)
      expect(result.features[0].geometry.type).toBe('Polygon')
      expect(result.features[0].geometry.coordinates[0]).toHaveLength(5)
    })

    it('应该解析 Feature 并保留 properties', async () => {
      const geojson = '{"type":"Feature","geometry":{"type":"Point","coordinates":[116.397,39.908]},"properties":{"name":"北京"}}'
      const result = await format.read(geojson)
      expect(result.features).toHaveLength(1)
      expect(result.features[0].properties).toEqual({ name: '北京' })
    })

    it('应该解析 FeatureCollection', async () => {
      const geojson = '{"type":"FeatureCollection","features":[{"type":"Feature","geometry":{"type":"Point","coordinates":[116.397,39.908]},"properties":{}}]}'
      const result = await format.read(geojson)
      expect(result.features).toHaveLength(1)
      expect(result.features[0].geometry.type).toBe('Point')
    })

    it('应该处理 3D 坐标', async () => {
      const geojson = '{"type":"Point","coordinates":[116.390,39.920,88.5]}'
      const result = await format.read(geojson)
      expect(result.features[0].geometry.coordinates).toEqual([116.390, 39.920, 88.5])
    })

    it('空 FeatureCollection 应抛出错误', async () => {
      const geojson = '{"type":"FeatureCollection","features":[]}'
      await expect(format.read(geojson)).rejects.toThrow()
    })

    it('应该解析 MultiPoint', async () => {
      const geojson = '{"type":"MultiPoint","coordinates":[[116.397,39.908],[117.190,39.125]]}'
      const result = await format.read(geojson)
      expect(result.features).toHaveLength(1)
      expect(result.features[0].geometry.type).toBe('MultiPoint')
      expect(result.features[0].geometry.coordinates).toHaveLength(2)
    })

    it('应该解析 MultiLineString', async () => {
      const geojson = '{"type":"MultiLineString","coordinates":[[[116.397,39.908],[116.417,39.915]]]}'
      const result = await format.read(geojson)
      expect(result.features).toHaveLength(1)
      expect(result.features[0].geometry.type).toBe('MultiLineString')
    })

    it('应该解析 MultiPolygon', async () => {
      const geojson = '{"type":"MultiPolygon","coordinates":[[[[116.390,39.910],[116.400,39.910],[116.400,39.920],[116.390,39.920],[116.390,39.910]]]]}'
      const result = await format.read(geojson)
      expect(result.features).toHaveLength(1)
      expect(result.features[0].geometry.type).toBe('MultiPolygon')
    })

    it('无效 JSON 应抛出错误', async () => {
      await expect(format.read('{invalid}')).rejects.toThrow()
    })
  })
})
