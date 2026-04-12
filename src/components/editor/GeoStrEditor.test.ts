import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import GeoStrEditor from '~/components/editor/GeoStrEditor.vue'

describe('GeoStrEditor 编辑器组件', () => {
  describe('组件渲染', () => {
    it('TC-013-001: 应该渲染组件', () => {
      const wrapper = mount(GeoStrEditor, {
        global: {
          stubs: {
            ElInput: true,
          },
        },
      })
      expect(wrapper.exists()).toBe(true)
    })

    it('TC-013-002: 应该使用自定义 placeholder 渲染', () => {
      const wrapper = mount(GeoStrEditor, {
        global: {
          stubs: {
            ElInput: {
              template: '<textarea :placeholder="$attrs.placeholder" />',
            },
          },
        },
      })
      const textarea = wrapper.find('textarea')
      expect(textarea.exists()).toBe(true)
    })
  })

  describe('v-model 双向绑定', () => {
    it('TC-013-003: 应该支持 value prop 传入', () => {
      const wrapper = mount(GeoStrEditor, {
        props: { value: 'test input' },
        global: {
          stubs: {
            ElInput: {
              template: '<div class="mock-input">{{ $attrs.modelValue }}</div>',
            },
          },
        },
      })
      expect(wrapper.text()).toContain('test input')
    })

    it('TC-013-004: 应该显示初始值', () => {
      const wrapper = mount(GeoStrEditor, {
        props: { value: 'initial value' },
        global: {
          stubs: {
            ElInput: {
              template: '<div class="mock-input">{{ $attrs.modelValue }}</div>',
            },
          },
        },
      })
      expect(wrapper.text()).toContain('initial value')
    })
  })

  describe('事件触发', () => {
    it('TC-013-005: 应该在输入时触发 input 事件', async () => {
      const wrapper = mount(GeoStrEditor, {
        global: {
          stubs: {
            ElInput: {
              template: '<input @input="$emit(\'input\', $event.target.value)" />',
            },
          },
        },
      })
      const input = wrapper.find('input')
      await input.trigger('input')
      expect(wrapper.emitted('input')).toBeTruthy()
    })
  })

  describe('边界情况', () => {
    it('TC-013-006: 应该接受空值', () => {
      const wrapper = mount(GeoStrEditor, {
        props: { value: '' },
        global: {
          stubs: {
            ElInput: true,
          },
        },
      })
      expect(wrapper.exists()).toBe(true)
    })

    it('TC-013-007: 应该处理特殊字符', () => {
      const specialChars = '{"type":"Point","coordinates":[116.397,39.908]}'
      const wrapper = mount(GeoStrEditor, {
        props: { value: specialChars },
        global: {
          stubs: {
            ElInput: {
              template: '<div class="mock-input">{{ $attrs.modelValue }}</div>',
            },
          },
        },
      })
      expect(wrapper.text()).toContain('Point')
    })
  })
})
