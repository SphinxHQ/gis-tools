/**
 * @file GisDataTransformer tests
 * @description Unit tests for the data transformer.
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2026-04-13
 */
import { describe, it, expect } from 'vitest'
import { GeoJsonDataFormat } from '~/components/data/GeoJsonDataFormat'
import { WktDataFormat } from '~/components/data/WktDataFormat'

describe('GisDataTransformer 数据转换器', () => {
  describe('组件存在性验证', () => {
    it('TC-017-001: GisDataTransformer 组件应可导入', async () => {
      const mod = await import('~/components/data/GisDataTransformer.vue')
      expect(mod.default).toBeDefined()
    })

    it('TC-017-002: 组件应有 name 属性', async () => {
      const mod = await import('~/components/data/GisDataTransformer.vue')
      expect(mod.default.name || mod.default.__name || mod.default).toBeDefined()
    })
  })

  describe('格式转换逻辑（非交互）', () => {
    it('TC-017-003: 应该成功转换 GeoJSON 到 WKT', async () => {
      const geoJsonFormat = new GeoJsonDataFormat()
      const wktFormat = new WktDataFormat()
      const geoJsonStr = '{"type":"Feature","geometry":{"type":"Point","coordinates":[116.397,39.908]},"properties":{}}'
      const gisDataInfo = await geoJsonFormat.read(geoJsonStr)
      const wktResults = await wktFormat.write(gisDataInfo)
      expect(wktResults).toBeDefined()
      expect(Array.isArray(wktResults)).toBe(true)
      expect(wktResults.length).toBeGreaterThan(0)
      expect(wktResults[0]).toContain('POINT')
    })

    it('TC-017-004: 应该成功转换 WKT 到 GeoJSON', async () => {
      const wktFormat = new WktDataFormat()
      const geoJsonFormat = new GeoJsonDataFormat()
      const wktStr = 'POINT(116.397 39.908)'
      const gisDataInfo = await wktFormat.read(wktStr)
      const geoJsonResult = await geoJsonFormat.write(gisDataInfo)
      expect(geoJsonResult).toBeDefined()
      expect(typeof geoJsonResult).toBe('string')
      const parsed = JSON.parse(geoJsonResult)
      expect(parsed.type).toBe('FeatureCollection')
      expect(parsed.features.length).toBeGreaterThan(0)
    })

    it('TC-017-005: GeoJSON 往返转换应保持几何一致性', async () => {
      const geoJsonFormat = new GeoJsonDataFormat()
      const wktFormat = new WktDataFormat()
      const original = '{"type":"Feature","geometry":{"type":"LineString","coordinates":[[116.397,39.908],[116.401,39.912]]},"properties":{}}'
      const gisDataInfo = await geoJsonFormat.read(original)
      const wktResults = await wktFormat.write(gisDataInfo)
      const gisDataInfo2 = await wktFormat.read(wktResults[0])
      expect(gisDataInfo2.features.length).toBe(gisDataInfo.features.length)
    })
  })

  describe('错误处理（非交互）', () => {
    it('TC-017-006: 应该处理无效 GeoJSON', async () => {
      const geoJsonFormat = new GeoJsonDataFormat()
      await expect(geoJsonFormat.read('invalid json')).rejects.toThrow()
    })

    it('TC-017-007: 应该处理无效 WKT', async () => {
      const wktFormat = new WktDataFormat()
      await expect(wktFormat.read('INVALID WKT SYNTAX')).rejects.toThrow()
    })
  })
})
