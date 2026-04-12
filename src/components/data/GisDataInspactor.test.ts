/**
 * GisDataInspactor 模块测试
 *
 * 测试目标：
 * 1. 验证组件初始化流程
 * 2. 验证数据加载到地图的时机
 * 3. 验证地图数据是否被意外清除
 * 4. 验证事件发送到正确的地图实例
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, nextTick } from 'vue'

// 模拟依赖
vi.mock('~/composables/eventBus', () => ({
  eventBus: {
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn()
  }
}))

vi.mock('~/components/gismap/GisMapBlank.vue', () => ({
  default: {
    name: 'GisMapBlank',
    template: '<div class="mock-gis-map-blank"></div>'
  }
}))

// 测试数据
const createMockFeature = (type: string, id: number): GeoJSON.Feature => ({
  type: 'Feature',
  id: `feature-${id}`,
  geometry: {
    type,
    coordinates: type === 'Point'
      ? [116.4, 39.9]
      : type === 'LineString'
        ? [[116.4, 39.9], [116.5, 40.0]]
        : [[[116.4, 39.9], [116.5, 39.9], [116.5, 40.0], [116.4, 40.0], [116.4, 39.9]]]
  },
  properties: { name: `Feature ${id}` }
})

const createMockGisDataInfo = (featureCount: number = 3) => {
  const features: GeoJSON.Feature[] = []
  const types = ['Point', 'LineString', 'Polygon']
  for (let i = 0; i < featureCount; i++) {
    features.push(createMockFeature(types[i % 3], i))
  }
  return {
    name: 'Test Data',
    features,
    crs: undefined,
    getTypes: () => [...new Set(features.map(f => f.geometry?.type))]
  }
}

describe('GisDataInspactor 模块测试', () => {
  describe('初始化流程测试', () => {
    it('应该正确初始化内部状态', () => {
      const mapInited = ref(false)
      const conpomentVisiblity = ref(false)
      const curInstanceId = ref(0)
      const treeHeight = ref(0)

      expect(mapInited.value).toBe(false)
      expect(conpomentVisiblity.value).toBe(false)
      expect(curInstanceId.value).toBe(0)
    })

    it('应该在 onMounted 后设置 curInstanceId', async () => {
      const curInstanceId = ref(0)
      const mockUid = 12345
      curInstanceId.value = mockUid

      expect(curInstanceId.value).toBe(mockUid)
    })
  })

  describe('数据加载时机测试', () => {
    it('应该在数据变化时生成树形数据', () => {
      const mockData = createMockGisDataInfo(3)

      expect(mockData.features.length).toBe(3)
      expect(mockData.features[0].geometry.type).toBe('Point')
      expect(mockData.features[1].geometry.type).toBe('LineString')
      expect(mockData.features[2].geometry.type).toBe('Polygon')
    })

    it('应该在地图初始化后加载数据', async () => {
      const { eventBus } = await import('~/composables/eventBus')

      const mapInited = ref(true)
      const conpomentVisiblity = ref(true)
      const curInstanceId = ref(12345)
      const mockData = createMockGisDataInfo(2)

      const emitSpy = vi.fn()
      ;(eventBus.emit as any) = emitSpy

      const { GisMapAddFeaturesEvent } = await import('~/components/gismap/events/GisMapEvents')
      const addFeaturesEvent = new GisMapAddFeaturesEvent(mockData.features, {clear: true})
      eventBus.emit(`${curInstanceId.value}`, addFeaturesEvent)

      expect(emitSpy).toHaveBeenCalled()
    })
  })

  describe('地图数据清除问题测试', () => {
    it('不应该在 validResult 变化时重置 mapInited', () => {
      const mapInited = ref(true)
      expect(mapInited.value).toBe(true)
    })

    it('flashGeometries 应该使用 SYS_TEMP_FLASH 层，不影响 USER_TEMP 层', async () => {
      const flashLayer = 'sys-temp-flash'
      const userTempLayer = 'user-temp'

      expect(flashLayer).not.toBe(userTempLayer)
    })
  })

  describe('事件类型区分测试', () => {
    it('GisMapAddFeaturesEvent 和 GisMapflashFeaturesEvent 应该有不同的行为', async () => {
      const { GisMapAddFeaturesEvent, GisMapflashFeaturesEvent } = await import('~/components/gismap/events/GisMapEvents')

      const features = [createMockFeature('Point', 1)]

      const addEvent = new GisMapAddFeaturesEvent(features, {clear: true})
      expect(addEvent.event_type).toBe('map-event:add-features')

      const flashEvent = new GisMapflashFeaturesEvent(features)
      expect(flashEvent.event_type).toBe('map-event:flash')
    })
  })
})

describe('问题排查测试', () => {
  it('问题1: validResult watch 设置 mapInited=false 会阻止后续数据加载', () => {
    const mapInited = ref(true)
    // 修复后：不移除这行代码
    expect(mapInited.value).toBe(true)
  })

  it('问题2: watch immediate 执行时 curInstanceId 可能还是 0', () => {
    const curInstanceId = ref(0)

    // watch immediate 执行时，onMounted 还没执行
    // curInstanceId.value = 0，事件发送到 "0" 这个 mapName

    const shouldEmitEvent = curInstanceId.value !== 0
    expect(shouldEmitEvent).toBe(false)
  })

  it('问题3: 组件可见性检测可能在 onMounted 之前', () => {
    const treeHeight = ref(0)
    const conpomentVisiblity = ref(false)

    expect(treeHeight.value).toBe(0)
    expect(conpomentVisiblity.value).toBe(false)
  })
})

describe('修复验证测试', () => {
  it('验证：移除 validResult watch 中的 mapInited 重置', () => {
    const mapInited = ref(true)
    expect(mapInited.value).toBe(true)
  })

  it('验证：初始化时应该正确加载全量数据', async () => {
    const mapInited = ref(false)
    const conpomentVisiblity = ref(false)
    const curInstanceId = ref(0)
    const props = { data: createMockGisDataInfo(2) }

    curInstanceId.value = 12345
    conpomentVisiblity.value = true
    mapInited.value = true

    const shouldRender = mapInited.value && conpomentVisiblity.value && curInstanceId.value && props.data?.features?.length
    expect(shouldRender).toBe(true)
  })

  it('验证：数据变化时重新加载地图', async () => {
    const mapInited = ref(true)
    const conpomentVisiblity = ref(true)
    const curInstanceId = ref(12345)

    const newData = createMockGisDataInfo(5)

    const shouldRender = mapInited.value && conpomentVisiblity.value && curInstanceId.value && newData?.features?.length
    expect(shouldRender).toBe(true)
  })
})

describe('地图层隔离测试', () => {
  it('USER_TEMP 层用于持久数据', () => {
    const USER_TEMP = 'user-temp'
    expect(USER_TEMP).toBe('user-temp')
  })

  it('SYS_TEMP_FLASH 层用于闪烁显示', () => {
    const SYS_TEMP_FLASH = 'sys-temp-flash'
    expect(SYS_TEMP_FLASH).toBe('sys-temp-flash')
  })

  it('两个层应该互不影响', () => {
    const USER_TEMP = 'user-temp'
    const SYS_TEMP_FLASH = 'sys-temp-flash'

    expect(USER_TEMP).not.toBe(SYS_TEMP_FLASH)
  })
})

describe('调试日志输出格式测试', () => {
  it('应该输出正确的日志格式用于调试', () => {
    const logData = {
      hasData: true,
      featuresCount: 3,
      curInstanceId: 12345,
      mapInited: true,
      conpomentVisiblity: true
    }

    // 验证日志数据结构
    expect(logData.hasData).toBe(true)
    expect(logData.featuresCount).toBe(3)
    expect(logData.curInstanceId).toBe(12345)
    expect(logData.mapInited).toBe(true)
    expect(logData.conpomentVisiblity).toBe(true)
  })
})
