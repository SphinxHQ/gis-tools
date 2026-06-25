/**
 * @file Device capabilities composable
 * @description 提供响应式设备能力检测，作为 UX 决策辅助参考。
 *              检测触摸支持、指针精度、悬停、动效偏好、设备内存、CPU 核心数、网络类型。
 *              与 useBreakpoint 互补：分辨率断点解决"屏幕多大"，设备能力解决"如何交互"。
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2026-06-25
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'

/** 指针精度类型 */
export type PointerPrecision = 'fine' | 'coarse' | 'none'

/** 设备能力快照（仅用于 UX 决策分支，不影响核心业务逻辑） */
export interface DeviceCapabilities {
  /** 触摸点数（0=无触摸能力） */
  maxTouchPoints: number
  /** 是否触摸设备（maxTouchPoints > 0 或 pointer=coarse） */
  hasTouch: boolean
  /** 指针精度：fine(鼠标/触控笔)/coarse(手指)/none(无指针) */
  pointer: PointerPrecision
  /** 是否支持悬停（鼠标设备 true，纯触屏 false） */
  hasHover: boolean
  /** 是否偏好减少动效（系统无障碍设置） */
  prefersReducedMotion: boolean
  /** 设备内存(GB)，部分浏览器不支持则为 undefined */
  deviceMemory?: number
  /** CPU 逻辑核心数（辅助 Worker 策略） */
  hardwareConcurrency: number
  /** 网络类型：'4g'/'3g'/'2g'/'slow-2g'，不支持则为 undefined */
  effectiveType?: string
  /** 是否为低端设备（内存<2GB 或 CPU≤4 核，辅助性能策略） */
  isLowEnd: boolean
}

/** 解析当前设备能力快照 */
function resolveCapabilities(): DeviceCapabilities {
  if (typeof window === 'undefined') {
    // SSR 兜底（本项目纯前端，但保留防御）
    return {
      maxTouchPoints: 0,
      hasTouch: false,
      pointer: 'fine',
      hasHover: true,
      prefersReducedMotion: false,
      hardwareConcurrency: 4,
      isLowEnd: false,
    }
  }

  const nav = navigator as Navigator & {
    deviceMemory?: number
    connection?: { effectiveType?: string }
  }

  const maxTouchPoints = nav.maxTouchPoints || 0
  const pointer: PointerPrecision = window.matchMedia('(pointer: fine)').matches
    ? 'fine'
    : window.matchMedia('(pointer: coarse)').matches
      ? 'coarse'
      : 'none'
  const hasHover = window.matchMedia('(hover: hover)').matches
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const deviceMemory = nav.deviceMemory
  const hardwareConcurrency = nav.hardwareConcurrency || 4
  const effectiveType = nav.connection?.effectiveType

  // 低端设备判定：内存 <2GB 或 CPU ≤4 核
  const isLowEnd = (deviceMemory !== undefined && deviceMemory < 2) || hardwareConcurrency <= 4

  return {
    maxTouchPoints,
    hasTouch: maxTouchPoints > 0 || pointer === 'coarse',
    pointer,
    hasHover,
    prefersReducedMotion,
    deviceMemory,
    hardwareConcurrency,
    effectiveType,
    isLowEnd,
  }
}

// 全局单例状态（参考 useBreakpoint 模式，多组件共享同一份检测）
const globalCapabilities = ref<DeviceCapabilities>(resolveCapabilities())

let listenerCount = 0
let mediaListeners: Array<{ mql: MediaQueryList; handler: (e: MediaQueryListEvent) => void }> = []

/** 附加 matchMedia 变化监听（触摸/悬停/动效偏好可能动态变化，如外接鼠标） */
function ensureMediaListeners() {
  if (mediaListeners.length > 0) return

  const targets = [
    '(pointer: fine)',
    '(pointer: coarse)',
    '(hover: hover)',
    '(prefers-reduced-motion: reduce)',
  ]
  for (const query of targets) {
    const mql = window.matchMedia(query)
    const handler = () => {
      globalCapabilities.value = resolveCapabilities()
    }
    // addEventListener 兼容性：Safari <14 仅支持 addListener
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', handler)
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mql as any).addListener(handler)
    }
    mediaListeners.push({ mql, handler })
  }
}

/** 移除监听 */
function maybeRemoveMediaListeners() {
  if (listenerCount > 0) return
  for (const { mql, handler } of mediaListeners) {
    if (typeof mql.removeEventListener === 'function') {
      mql.removeEventListener('change', handler)
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mql as any).removeListener(handler)
    }
  }
  mediaListeners = []
}

/**
 * 设备能力检测 composable
 * 与 useBreakpoint 互补：分辨率 + 设备能力共同决定 UX 策略
 *
 * @example
 * const { capabilities, hasTouch, isLowEnd } = useDeviceCapabilities()
 * if (hasTouch.value) { 启用触控手势 }
 * if (isLowEnd.value) { 降低虚拟滚动缓冲 }
 */
export function useDeviceCapabilities() {
  ensureMediaListeners()
  listenerCount++

  onMounted(() => {
    ensureMediaListeners()
    // 挂载时刷新一次（应对外接设备变化）
    globalCapabilities.value = resolveCapabilities()
  })

  onUnmounted(() => {
    listenerCount = Math.max(0, listenerCount - 1)
    maybeRemoveMediaListeners()
  })

  const capabilities = computed(() => globalCapabilities.value)
  const hasTouch = computed(() => globalCapabilities.value.hasTouch)
  const isLowEnd = computed(() => globalCapabilities.value.isLowEnd)
  const prefersReducedMotion = computed(() => globalCapabilities.value.prefersReducedMotion)

  return {
    capabilities,
    hasTouch,
    isLowEnd,
    prefersReducedMotion,
  }
}
