import { describe, it, expect } from 'vitest'
import { getDataType } from '~/components/data/DataFormat'
import { GisDataType } from '~/components/data/GisDataInfo'

describe('DataFormat 数据格式识别', () => {
  // ============================================================================
  // GeoJSON 识别测试 - 9个用例
  // ============================================================================
  describe('GeoJSON 识别', () => {
    it('TC-005-001: 应该识别 Point', () => {
      const geojson = '{"type":"Point","coordinates":[116.397,39.908]}'
      expect(getDataType(geojson)).toBe(GisDataType.GeoJson)
    })

    it('TC-005-002: 应该识别 LineString', () => {
      const geojson = '{"type":"LineString","coordinates":[[116.397,39.908],[116.417,39.915]]}'
      expect(getDataType(geojson)).toBe(GisDataType.GeoJson)
    })

    it('TC-005-003: 应该识别 Polygon', () => {
      const geojson = '{"type":"Polygon","coordinates":[[[116.390,39.910],[116.400,39.910],[116.400,39.920],[116.390,39.920],[116.390,39.910]]]}'
      expect(getDataType(geojson)).toBe(GisDataType.GeoJson)
    })

    it('TC-005-004: 应该识别 Feature', () => {
      const geojson = '{"type":"Feature","geometry":{"type":"Point","coordinates":[116.397,39.908]},"properties":{}}'
      expect(getDataType(geojson)).toBe(GisDataType.GeoJson)
    })

    it('TC-005-005: 应该识别 FeatureCollection', () => {
      const geojson = '{"type":"FeatureCollection","features":[]}'
      expect(getDataType(geojson)).toBe(GisDataType.GeoJson)
    })

    it('TC-005-006: 应该识别 MultiPoint', () => {
      const geojson = '{"type":"MultiPoint","coordinates":[[116.397,39.908],[117.190,39.125]]}'
      expect(getDataType(geojson)).toBe(GisDataType.GeoJson)
    })

    it('TC-005-007: 应该识别 MultiLineString', () => {
      const geojson = '{"type":"MultiLineString","coordinates":[[[116.397,39.908],[116.417,39.915]]]}'
      expect(getDataType(geojson)).toBe(GisDataType.GeoJson)
    })

    it('TC-005-008: 应该识别 MultiPolygon', () => {
      const geojson = '{"type":"MultiPolygon","coordinates":[[[[116.390,39.910],[116.400,39.910],[116.400,39.920],[116.390,39.920],[116.390,39.910]]]]}'
      expect(getDataType(geojson)).toBe(GisDataType.GeoJson)
    })

    it('TC-005-009: 应该识别 GeometryCollection', () => {
      const geojson = '{"type":"GeometryCollection","geometries":[{"type":"Point","coordinates":[116.397,39.908]}]}'
      expect(getDataType(geojson)).toBe(GisDataType.GeoJson)
    })
  })

  // ============================================================================
  // WKT 识别测试 - 9个用例
  // ============================================================================
  describe('WKT 识别', () => {
    it('TC-005-010: 应该识别 POINT', () => {
      expect(getDataType('POINT(116.397 39.908)')).toBe(GisDataType.Wkt)
    })

    it('TC-005-011: 应该识别 LINESTRING', () => {
      expect(getDataType('LINESTRING(116.397 39.908, 116.417 39.915)')).toBe(GisDataType.Wkt)
    })

    it('TC-005-012: 应该识别 POLYGON', () => {
      expect(getDataType('POLYGON((116.390 39.910, 116.400 39.910, 116.400 39.920, 116.390 39.920, 116.390 39.910))')).toBe(GisDataType.Wkt)
    })

    it('TC-005-013: 应该识别 MULTIPOINT', () => {
      expect(getDataType('MULTIPOINT((116.397 39.908), (117.190 39.125))')).toBe(GisDataType.Wkt)
    })

    it('TC-005-014: 应该识别 MULTILINESTRING', () => {
      expect(getDataType('MULTILINESTRING((116.397 39.908, 116.417 39.915))')).toBe(GisDataType.Wkt)
    })

    it('TC-005-015: 应该识别 MULTIPOLYGON', () => {
      expect(getDataType('MULTIPOLYGON(((116.390 39.910, 116.400 39.910, 116.400 39.920, 116.390 39.920, 116.390 39.910)))')).toBe(GisDataType.Wkt)
    })

    it('TC-005-016: 应该识别 GEOMETRYCOLLECTION', () => {
      expect(getDataType('GEOMETRYCOLLECTION(POINT(116.397 39.908))')).toBe(GisDataType.Wkt)
    })

    it('TC-005-017: 应该识别带 Z 值的 WKT', () => {
      expect(getDataType('POINT Z (116.390 39.920 88.5)')).toBe(GisDataType.Wkt)
    })

    it('TC-005-018: 应该识别带 M 值的 WKT', () => {
      expect(getDataType('POINT M (116.397 39.908 100.5)')).toBe(GisDataType.Wkt)
    })
  })

  // ============================================================================
  // 其他格式识别测试 - 5个用例
  // ============================================================================
  describe('其他格式识别', () => {
    it('TC-005-019: 应该识别 WKB（小端序）', () => {
      expect(getDataType('01010000000000000000005D400000000000004340')).toBe(GisDataType.Wkb)
    })

    it('TC-005-020: 应该识别 WKB（大端序）', () => {
      expect(getDataType('0000000001405D0000000000004043000000000000')).toBe(GisDataType.Wkb)
    })

    it('TC-005-021: 应该识别 Exchange 格式', () => {
      expect(getDataType('[属性描述]')).toBe(GisDataType.Exchange)
    })

    it('TC-005-022: 应该识别 ResponseBase 格式', () => {
      const response = '{"status":200,"message":"ok","result":{}}'
      expect(getDataType(response)).toBe(GisDataType.ResponseBase)
    })

    it('TC-005-023: 空内容应抛出错误', () => {
      expect(() => getDataType('')).toThrow()
    })
  })

  // ============================================================================
  // 异常处理测试 - 3个用例
  // ============================================================================
  describe('异常处理', () => {
    it('TC-005-024: null 内容应抛出错误', () => {
      expect(() => getDataType(null as any)).toThrow()
    })

    it('TC-005-025: 非法 JSON 应抛出错误', () => {
      expect(() => getDataType('{invalid json}')).toThrow()
    })

    it('TC-005-026: 无法识别的格式应抛出错误', () => {
      expect(() => getDataType('random string')).toThrow()
    })
  })
})
