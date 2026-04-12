import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import MapControlPanel from '~/components/gismap/MapControlPanel.vue'

vi.mock('~/components/gismap/MapCitySelector.vue', () => ({
  default: {
    name: 'MapCitySelector',
    template: '<div class="mock-city-selector">City Selector</div>',
  },
}))

Object.defineProperty(document, 'fullscreenElement', {
  get: vi.fn(() => null),
  configurable: true,
})

describe('MapControlPanel 地图控制面板', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('组件渲染', () => {
    it('TC-020-001: 应该渲染组件', () => {
      const wrapper = mount(MapControlPanel, {
        global: {
          stubs: {
            ElButton: { template: '<button class="el-button" @click="$emit(\'click\')"><slot /></button>' },
            MapCitySelector: true,
          },
        },
      })
      expect(wrapper.exists()).toBe(true)
    })

    it('TC-020-002: 应该渲染绘制按钮', () => {
      const wrapper = mount(MapControlPanel, {
        global: {
          stubs: {
            ElButton: { template: '<button class="el-button"><slot /></button>' },
            MapCitySelector: true,
          },
        },
      })
      const buttons = wrapper.findAll('.el-button')
      expect(buttons.length).toBeGreaterThanOrEqual(4)
    })

    it('TC-020-003: 应该包含绘制-点按钮', () => {
      const wrapper = mount(MapControlPanel, {
        global: {
          stubs: {
            ElButton: { template: '<button class="el-button"><slot /></button>' },
            MapCitySelector: true,
          },
        },
      })
      expect(wrapper.text()).toContain('绘制-点')
    })

    it('TC-020-004: 应该包含结束绘制按钮', () => {
      const wrapper = mount(MapControlPanel, {
        global: {
          stubs: {
            ElButton: { template: '<button class="el-button"><slot /></button>' },
            MapCitySelector: true,
          },
        },
      })
      expect(wrapper.text()).toContain('结束绘制')
    })
  })

  describe('Props', () => {
    it('TC-020-005: 应该接受 mapName prop', () => {
      const wrapper = mount(MapControlPanel, {
        props: { mapName: 'secondary' },
        global: {
          stubs: {
            ElButton: true,
            MapCitySelector: true,
          },
        },
      })
      expect(wrapper.props('mapName')).toBe('secondary')
    })

    it('TC-020-006: 应该有默认 mapName', () => {
      const wrapper = mount(MapControlPanel, {
        global: {
          stubs: {
            ElButton: true,
            MapCitySelector: true,
          },
        },
      })
      expect(wrapper.props('mapName')).toBe('main')
    })
  })
})
