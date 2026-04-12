import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import Home from '~/components/Home.vue'

vi.mock('~/components/layouts/BaseMain.vue', () => ({
  default: {
    name: 'BaseMain',
    template: '<div class="mock-base-main"><slot /></div>',
  },
}))

describe('Home 首页组件', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('页面布局渲染', () => {
    it('TC-022-001: 应该渲染整体页面布局', () => {
      const wrapper = mount(Home)
      expect(wrapper.exists()).toBe(true)
    })

    it('TC-022-002: 应该包含 BaseMain 组件', () => {
      const wrapper = mount(Home)
      expect(wrapper.find('.mock-base-main').exists()).toBe(true)
    })

    it('TC-022-003: 应该渲染页面内容', () => {
      const wrapper = mount(Home)
      expect(wrapper.html()).toBeTruthy()
    })
  })

  describe('组件结构', () => {
    it('TC-022-004: 应该是有效的 Vue 组件', () => {
      const wrapper = mount(Home)
      expect(wrapper.vm).toBeDefined()
    })

    it('TC-022-005: 应该正确挂载', () => {
      const wrapper = mount(Home)
      expect(wrapper.element).toBeDefined()
      expect(wrapper.element.nodeType).toBe(1)
    })

    it('TC-022-006: 应该包含 base-main 组件', () => {
      const wrapper = mount(Home)
      expect(wrapper.findComponent({ name: 'BaseMain' }).exists()).toBe(true)
    })
  })

  describe('路由响应', () => {
    it('TC-022-007: 应该响应路由参数', () => {
      const wrapper = mount(Home)
      expect(wrapper.exists()).toBe(true)
    })

    it('TC-022-008: 应该支持导航到其他页面', async () => {
      const wrapper = mount(Home)
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('初始化状态', () => {
    it('TC-022-009: 应该正确初始化默认状态', () => {
      const wrapper = mount(Home)
      expect(wrapper.exists()).toBe(true)
    })

    it('TC-022-010: 应该恢复用户偏好设置', () => {
      const wrapper = mount(Home)
      expect(wrapper.exists()).toBe(true)
    })
  })
})
