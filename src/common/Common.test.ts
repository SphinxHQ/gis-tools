import { describe, it, expect } from 'vitest'

import Common from '~/common/Common'

describe('Common 工具类', () => {
  it('uuid 应该生成唯一标识符', () => {
    const uuid1 = Common.uuid()
    const uuid2 = Common.uuid()

    expect(uuid1).toBeDefined()
    expect(uuid2).toBeDefined()
    expect(uuid1).not.toBe(uuid2)
    expect(typeof uuid1).toBe('string')
    expect(uuid1.length).toBeGreaterThan(0)
    expect(uuid1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
  })

  it('saveLocal 和 loadLocal 应该正确存储和读取数据', () => {
    const key = 'test-key'
    const value = { name: 'test', value: 123 }

    Common.saveLocal(key, value)
    const loaded = Common.loadLocal(key)

    expect(loaded).toEqual(value)
  })

  it('loadLocal 不存在的 key 应返回默认值', () => {
    const result = Common.loadLocal('non-existent-key-xyz', 'default')
    expect(result).toBe('default')
  })

  it('isPrimitive 应该正确判断原始类型', () => {
    expect(Common.isPrimitive('string')).toBe(true)
    expect(Common.isPrimitive(123)).toBe(true)
    expect(Common.isPrimitive(true)).toBe(true)
    expect(Common.isPrimitive(null)).toBe(true)
    expect(Common.isPrimitive(undefined)).toBe(true)
    expect(Common.isPrimitive({})).toBe(false)
    expect(Common.isPrimitive([])).toBe(false)
  })

  it('getTiandituApiKey 应该返回字符串（可能为空）', () => {
    const apiKey = Common.getTiandituApiKey()
    expect(typeof apiKey).toBe('string')
  })

  it('base64ToArrayBuffer 应该正确转换', () => {
    const base64 = 'SGVsbG8gV29ybGQ='
    const buffer = Common.base64ToArrayBuffer(base64)
    expect(buffer).toBeInstanceOf(ArrayBuffer)
    expect(buffer.byteLength).toBeGreaterThan(0)
    const text = new TextDecoder().decode(buffer)
    expect(text).toBe('Hello World')
  })

  it('base64ToArrayBuffer 应该处理 data: 前缀', () => {
    const base64 = 'data:text/plain;base64,SGVsbG8gV29ybGQ='
    const buffer = Common.base64ToArrayBuffer(base64)
    expect(buffer).toBeInstanceOf(ArrayBuffer)
    const text = new TextDecoder().decode(buffer)
    expect(text).toBe('Hello World')
  })

  it('dataTimeToLocal 应该返回本地时间字符串', () => {
    const timestamp = new Date(2026, 0, 1).getTime()
    const result = Common.dataTimeToLocal(timestamp)
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('hasNoUsedChar 应该检测超出 Unicode 范围的字符', () => {
    expect(Common.hasNoUsedChar('abc')).toBe(false)
    expect(Common.hasNoUsedChar('你好')).toBe(false)
  })
})
