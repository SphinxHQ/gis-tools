import { describe, it, expect } from 'vitest'
import GisCrs from '~/components/data/GisCrs'
import { GisError } from '~/common/GisError'

describe('GisCrs 坐标系统', () => {
  describe('构造函数', () => {
    it('应该使用 EPSG 代码创建实例', () => {
      const crs = new GisCrs(4326)
      expect(crs).toBeDefined()
      expect(crs.epsgCode).toBe(4326)
    })

    it('应该支持 EPSG:3857', () => {
      const crs = new GisCrs(3857)
      expect(crs.epsgCode).toBe(3857)
    })

    it('应该支持 EPSG:4490 (CGCS2000)', () => {
      const crs = new GisCrs(4490)
      expect(crs.epsgCode).toBe(4490)
    })

    it('未知 EPSG 应抛出 GisError', () => {
      expect(() => new GisCrs(9999)).toThrow()
    })

    it('无效 EPSG (0 或负数) 应创建空 CRS', () => {
      const crs = new GisCrs(0)
      expect(crs.epsgCode).toBe(0)
      expect(crs.name).toBe('EPSG:EMPTY')
    })
  })

  describe('getProj4Def()', () => {
    it('应该返回 EPSG:4326 的 proj4 定义（JSON 字符串）', () => {
      const crs = new GisCrs(4326)
      const def = crs.getProj4Def()
      expect(def).toBeDefined()
      expect(typeof def).toBe('string')
      expect(() => JSON.parse(def as string)).not.toThrow()
    })

    it('应该返回 EPSG:3857 的 proj4 定义（JSON 字符串）', () => {
      const crs = new GisCrs(3857)
      const def = crs.getProj4Def()
      expect(def).toBeDefined()
      expect(typeof def).toBe('string')
    })

    it('应该返回 EPSG:4490 的 proj4 定义', () => {
      const crs = new GisCrs(4490)
      const def = crs.getProj4Def()
      expect(def).toBeDefined()
    })

    it('空 CRS (epsgCode=0) 应返回 null', () => {
      const crs = new GisCrs(0)
      const def = crs.getProj4Def()
      expect(def).toBeNull()
    })
  })

  describe('CRS 比较和显示', () => {
    it('应该比较两个 CRS 是否相等', () => {
      const crs1 = new GisCrs(4326)
      const crs2 = new GisCrs(4326)
      const crs3 = new GisCrs(3857)

      expect(crs1.equals(crs2)).toBe(true)
      expect(crs1.equals(crs3)).toBe(false)
    })

    it('应该支持与 EPSG 代码比较', () => {
      const crs = new GisCrs(4326)
      expect(crs.equals(4326)).toBe(true)
      expect(crs.equals(3857)).toBe(false)
    })

    it('应该返回 CRS 名称', () => {
      const crs = new GisCrs(4326)
      const name = crs.getName()
      expect(name).toBeDefined()
      expect(typeof name).toBe('string')
      expect(name.length).toBeGreaterThan(0)
    })
  })
})
