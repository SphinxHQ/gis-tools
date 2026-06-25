/**
 * @file Touch gesture composables
 * @description 通用触控手势 hook，供面板拖拽(3.1)、列表左滑(3.5)复用。
 *              解决 TouchEvent 与 MouseEvent 统一处理、水平/垂直位移判定、被动监听控制。
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2026-06-25
 */
import { ref, onUnmounted } from 'vue'

/** 统一的指针位置（MouseEvent.clientX 或 TouchEvent.touches[0].clientX） */
export interface PointerPos {
  clientX: number
  clientY: number
}

/** 从 MouseEvent 或 TouchEvent 提取指针位置 */
export function extractPointer(e: MouseEvent | TouchEvent): PointerPos | null {
  if (e instanceof TouchEvent) {
    if (e.touches.length === 0 && e.changedTouches.length > 0) {
      // touchend 时 touches 为空，回退到 changedTouches
      const t = e.changedTouches[0]
      return { clientX: t.clientX, clientY: t.clientY }
    }
    if (e.touches.length > 0) {
      const t = e.touches[0]
      return { clientX: t.clientX, clientY: t.clientY }
    }
    return null
  }
  return { clientX: e.clientX, clientY: e.clientY }
}

/**
 * 拖拽手势 hook（用于面板 resize 拖拽手柄）
 *
 * @param onMove 拖拽中回调，参数为相对起点的位移 { deltaX, deltaY }
 * @param onEnd 拖拽结束回调
 * @returns startDrag 函数，绑定到手柄的 @mousedown 和 @touchstart
 *
 * @example
 * const { startDrag } = useDragGesture(
 *   ({ deltaX }) => { width.value = clamp(startWidth + deltaX, min, max) },
 *   () => { cleanup() }
 * )
 * <div @mousedown="startDrag" @touchstart="startDrag" />
 */
export function useDragGesture(
  onMove: (delta: { deltaX: number; deltaY: number }) => void,
  onEnd?: () => void,
) {
  const isDragging = ref(false)
  let startX = 0
  let startY = 0

  const handleMove = (e: MouseEvent | TouchEvent) => {
    if (!isDragging.value) return
    const pos = extractPointer(e)
    if (!pos) return
    // touchmove 必须 preventDefault 阻止页面滚动，passive:false
    if (e instanceof TouchEvent) e.preventDefault()
    onMove({ deltaX: pos.clientX - startX, deltaY: pos.clientY - startY })
  }

  const handleEnd = () => {
    if (!isDragging.value) return
    isDragging.value = false
    document.removeEventListener('mousemove', handleMove)
    document.removeEventListener('mouseup', handleEnd)
    document.removeEventListener('touchmove', handleMove)
    document.removeEventListener('touchend', handleEnd)
    document.removeEventListener('touchcancel', handleEnd)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    onEnd?.()
  }

  const startDrag = (e: MouseEvent | TouchEvent) => {
    const pos = extractPointer(e)
    if (!pos) return
    e.preventDefault()
    isDragging.value = true
    startX = pos.clientX
    startY = pos.clientY
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleEnd)
    // touchmove passive:false 以便 preventDefault
    document.addEventListener('touchmove', handleMove, { passive: false })
    document.addEventListener('touchend', handleEnd)
    document.addEventListener('touchcancel', handleEnd)
  }

  onUnmounted(handleEnd)

  return { isDragging, startDrag }
}

/**
 * 左滑手势 hook（用于列表项左滑显示操作按钮）
 *
 * 水平/垂直位移判定：仅当水平位移 > 垂直位移 且超过阈值时触发左滑，
 * 否则放行垂直滚动（避免阻断列表正常滚动）。
 *
 * @param onSwipeLeft 左滑触发回调
 * @param onReset 滑动重置回调（未达阈值回弹）
 * @returns touch handlers，绑定到列表项
 *
 * @example
 * const { touchStart, touchMove, touchEnd } = useSwipeGesture(
 *   () => { showActions.value = true },
 *   () => { showActions.value = false },
 * )
 */
export function useSwipeGesture(
  onSwipeLeft: () => void,
  onReset?: () => void,
) {
  let startX = 0
  let startY = 0
  let tracking = false
  // 水平位移是否主导（用于 touchmove 中决定是否 preventDefault）
  let horizontalDominant = false

  const touchStart = (e: TouchEvent) => {
    if (e.touches.length !== 1) return
    const t = e.touches[0]
    startX = t.clientX
    startY = t.clientY
    tracking = true
    horizontalDominant = false
  }

  const touchMove = (e: TouchEvent) => {
    if (!tracking || e.touches.length !== 1) return
    const t = e.touches[0]
    const deltaX = t.clientX - startX
    const deltaY = t.clientY - startY
    // 仅当水平位移主导时 preventDefault，避免阻断垂直滚动
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 8) {
      horizontalDominant = true
      e.preventDefault()
    }
  }

  const touchEnd = (e: TouchEvent) => {
    if (!tracking) return
    tracking = false
    const t = e.changedTouches[0]
    const deltaX = t.clientX - startX
    // 左滑：deltaX 为负且超过阈值 48px
    if (horizontalDominant && deltaX < -48) {
      onSwipeLeft()
    } else {
      onReset?.()
    }
  }

  return { touchStart, touchMove, touchEnd }
}
