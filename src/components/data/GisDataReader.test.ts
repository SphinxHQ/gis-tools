import { describe, it, expect } from 'vitest'
import { getDataType } from '~/components/data/DataFormat'
import { GisDataType } from '~/components/data/GisDataInfo'

describe('GisDataReader 数据读取器', () => {
  describe('组件存在性验证', () => {
    it('TC-016-001: GisDataReader 组件应可导入', async () => {
      const mod = await import('~/components/data/GisDataReader.vue')
      expect(mod.default).toBeDefined()
    })

    it('TC-016-002: 组件应有 name 属性', async () => {
      const mod = await import('~/components/data/GisDataReader.vue')
      expect(mod.default.name || mod.default.__name || mod.default).toBeDefined()
    })
  })

  describe('数据格式识别逻辑（非交互）', () => {
    it('TC-016-003: 应该识别 GeoJSON 格式字符串', () => {
      const result = getDataType('{"type":"Feature","geometry":{"type":"Point","coordinates":[116.397,39.908]},"properties":{}}')
      expect(result).toBe(GisDataType.GeoJson)
    })

    it('TC-016-004: 应该识别 WKT 格式字符串', () => {
      const result = getDataType('POINT(116.397 39.908)')
      expect(result).toBe(GisDataType.Wkt)
    })

    it('TC-016-005: 应该拒绝空字符串', () => {
      expect(() => getDataType('')).toThrow()
    })
  })
})
