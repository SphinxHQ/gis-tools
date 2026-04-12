import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import GisCrsSelector from '~/components/data/GisCrsSelector.vue'

describe('GisCrsSelector 坐标选择器', () => {
  describe('组件渲染', () => {
    it('TC-014-001: 应该渲染组件', () => {
      const wrapper = mount(GisCrsSelector, {
        global: {
          stubs: {
            ElCascaderPanel: true,
            ElDescriptions: true,
            ElDescriptionsItem: true,
            ElButton: true,
          },
        },
      })
      expect(wrapper.exists()).toBe(true)
    })

    it('TC-014-002: 应该渲染确定按钮', () => {
      const wrapper = mount(GisCrsSelector, {
        global: {
          stubs: {
            ElCascaderPanel: true,
            ElDescriptions: true,
            ElDescriptionsItem: true,
            ElButton: { template: '<button class="el-button"><slot /></button>' },
          },
        },
      })
      const button = wrapper.find('.el-button')
      expect(button.exists()).toBe(true)
      expect(button.text()).toContain('确定')
    })
  })

  describe('Props 传递', () => {
    it('TC-014-003: 应该接受 type prop', () => {
      const wrapper = mount(GisCrsSelector, {
        props: { type: 'source' },
        global: {
          stubs: {
            ElCascaderPanel: true,
            ElDescriptions: true,
            ElDescriptionsItem: true,
            ElButton: true,
          },
        },
      })
      expect(wrapper.props('type')).toBe('source')
    })

    it('TC-014-004: 应该接受 disableValues prop', () => {
      const wrapper = mount(GisCrsSelector, {
        props: { disableValues: [4326, 3857] },
        global: {
          stubs: {
            ElCascaderPanel: true,
            ElDescriptions: true,
            ElDescriptionsItem: true,
            ElButton: true,
          },
        },
      })
      expect(wrapper.props('disableValues')).toEqual([4326, 3857])
    })

    it('TC-014-005: 应该有默认 type 值', () => {
      const wrapper = mount(GisCrsSelector, {
        global: {
          stubs: {
            ElCascaderPanel: true,
            ElDescriptions: true,
            ElDescriptionsItem: true,
            ElButton: true,
          },
        },
      })
      expect(wrapper.props('type')).toBe('')
    })

    it('TC-014-006: 应该有默认 disableValues 值', () => {
      const wrapper = mount(GisCrsSelector, {
        global: {
          stubs: {
            ElCascaderPanel: true,
            ElDescriptions: true,
            ElDescriptionsItem: true,
            ElButton: true,
          },
        },
      })
      expect(wrapper.props('disableValues')).toEqual([])
    })
  })
})
