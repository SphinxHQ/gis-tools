import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GisEventBus, GisEvent } from '~/composables/eventBus'

describe('EventBus 事件总线', () => {
  let bus: GisEventBus

  beforeEach(() => {
    bus = new GisEventBus('test')
  })

  describe('on() - 事件注册', () => {
    it('TC-010-001: 应该注册事件监听器', async () => {
      const callback = vi.fn()
      bus.on('group1', 'test-event', callback)

      const event = new GisEvent('test-event', {})
      await bus.emit('group1', event)
      expect(callback).toHaveBeenCalled()
    })

    it('TC-010-002: 应该支持同一事件的多个监听器', async () => {
      const callback1 = vi.fn()
      const callback2 = vi.fn()

      bus.on('group1', 'test-event', callback1)
      bus.on('group1', 'test-event', callback2)

      const event = new GisEvent('test-event', {})
      await bus.emit('group1', event)
      expect(callback1).toHaveBeenCalled()
      expect(callback2).toHaveBeenCalled()
    })

    it('TC-010-003: 应该支持事件分组', async () => {
      const callback = vi.fn()
      bus.on('group1', 'event1', callback)
      bus.on('group2', 'event2', callback)

      const event = new GisEvent('event1', {})
      await bus.emit('group1', event)
      expect(callback).toHaveBeenCalledTimes(1)
    })
  })

  describe('off() - 事件移除', () => {
    it('TC-010-004: 应该移除特定监听器', async () => {
      const callback = vi.fn()
      bus.on('group1', 'test-event', callback)
      bus.off('group1', 'test-event', callback)

      const event = new GisEvent('test-event', {})
      await bus.emit('group1', event)
      expect(callback).not.toHaveBeenCalled()
    })

    it('TC-010-005: 应该移除组内事件的所有监听器', async () => {
      const callback = vi.fn()
      bus.on('group1', 'event1', callback)
      bus.on('group1', 'event2', callback)

      // 移除 event1 的所有监听器
      bus.off('group1', 'event1')

      const event1 = new GisEvent('event1', {})
      const event2 = new GisEvent('event2', {})
      await bus.emit('group1', event1)
      await bus.emit('group1', event2)

      // event1 的回调不应被调用，但 event2 的应该被调用
      expect(callback).toHaveBeenCalledTimes(1) // 只被 event2 调用
    })
  })

  describe('emit() - 事件触发', () => {
    it('TC-010-006: 应该触发事件并传递数据', async () => {
      const callback = vi.fn()
      const eventData = { value: 123 }
      bus.on('group1', 'test-event', callback)

      const event = new GisEvent('test-event', {}, eventData)
      await bus.emit('group1', event)

      expect(callback).toHaveBeenCalledWith({}, eventData)
    })

    it('TC-010-007: 不同事件类型不应相互干扰', async () => {
      const callback1 = vi.fn()
      const callback2 = vi.fn()

      bus.on('group1', 'event1', callback1)
      bus.on('group1', 'event2', callback2)

      const event1 = new GisEvent('event1', {})
      await bus.emit('group1', event1)

      expect(callback1).toHaveBeenCalled()
      expect(callback2).not.toHaveBeenCalled()
    })
  })

  describe('事件隔离', () => {
    it('TC-010-008: 不同组的事件应该完全隔离', async () => {
      const callback = vi.fn()
      bus.on('group1', 'event1', callback)

      // 清除其他组不应影响 group1
      bus.off('group2', 'event1')

      const event = new GisEvent('event1', {})
      await bus.emit('group1', event)
      expect(callback).toHaveBeenCalled()
    })

    it('TC-010-009: 同组不同事件应该隔离', async () => {
      const callback = vi.fn()
      bus.on('group1', 'event1', callback)

      const event = new GisEvent('event2', {})
      await bus.emit('group1', event)
      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('GisEvent', () => {
    it('TC-010-010: 应该创建 GisEvent 实例', () => {
      const event = new GisEvent('test-type', { option1: 'value1' }, 'param1', 'param2')
      expect(event.event_type).toBe('test-type')
      expect(event.options).toEqual({ option1: 'value1' })
      expect(event.params).toEqual(['param1', 'param2'])
      expect(event.event_id).toBeDefined()
    })
  })
})
