<script setup lang="ts">
/**
 * @file Bottom Sheet component
 * @description Mobile bottom sheet container with draggable handle, snap points,
 *              and smooth animations. Follows Material Design 3 motion guidelines
 *              and Hoober's thumb zone theory (handle in green zone).
 *
 * @theory Norman《Design of Everyday Things》: handle is a signifier for drag affordance;
 *         real-time follow (<16ms) provides feedback; snap points create clear mapping.
 * @theory Material Design 3 Motion: 300ms Standard easing (0.4, 0.0, 0.2, 1) for snap;
 *         uses transform: translateY() to avoid layout thrashing.
 * @theory RAIL Model: drag driven by requestAnimationFrame for 60fps.
 *
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2026-06-25
 */
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'

/** Sheet state identifiers */
type SheetState = 'collapsed' | 'half' | 'expanded'

/** Props for Bottom Sheet */
const props = withDefaults(defineProps<{
  /** Whether the sheet is visible */
  visible: boolean
  /** Snap points as viewport height percentages (e.g., 25 = 25vh) */
  snapPoints?: number[]
  /** Default snap index when opened */
  defaultSnap?: number
  /** Whether to show the backdrop overlay */
  showOverlay?: boolean
}>(), {
  snapPoints: () => [25, 40, 80],
  defaultSnap: 1,
  showOverlay: true,
})

const emit = defineEmits<{
  'update:visible': [visible: boolean]
  'height-change': [heightPx: number]
  'state-change': [state: SheetState]
}>()

// 当前高度百分比（vh）
const currentHeight = ref(props.snapPoints[props.defaultSnap])
// 是否正在拖拽
const isDragging = ref(false)
// 拖拽起始信息
const dragStartY = ref(0)
const dragStartHeight = ref(0)
// 是否启用动画（拖拽时禁用）
const animated = ref(true)
// Sheet 根元素引用
const sheetRef = ref<HTMLElement | null>(null)

// 视口高度（px）
const viewportHeight = computed(() =>
  typeof window !== 'undefined' ? window.innerHeight : 800,
)

// 当前高度（px）
const currentHeightPx = computed(() =>
  Math.round((currentHeight.value / 100) * viewportHeight.value),
)

// 当前状态
const sheetState = computed<SheetState>(() => {
  const h = currentHeight.value
  if (h <= 30) return 'collapsed'
  if (h <= 60) return 'half'
  return 'expanded'
})

// 监听 visible 变化，打开时重置到默认吸附点
watch(
  () => props.visible,
  (val) => {
    if (val) {
      animated.value = true
      currentHeight.value = props.snapPoints[props.defaultSnap]
    }
  },
)

// 监听高度变化，发出事件
watch([currentHeight, viewportHeight], () => {
  emit('height-change', currentHeightPx.value)
  emit('state-change', sheetState.value)
})

/**
 * 找到最近的吸附点
 * @param height - 当前高度百分比
 * @returns 最近吸附点的高度百分比
 */
const findNearestSnap = (height: number): number => {
  return props.snapPoints.reduce((prev, curr) =>
    Math.abs(curr - height) < Math.abs(prev - height) ? curr : prev,
  )
}

/**
 * 开始拖拽（touch 或 mouse）
 * @param clientY - 起始 Y 坐标
 */
const startDrag = (clientY: number) => {
  isDragging.value = true
  animated.value = false
  dragStartY.value = clientY
  dragStartHeight.value = currentHeight.value
}

/**
 * 拖拽中（使用 requestAnimationFrame 保证 60fps）
 * @param clientY - 当前 Y 坐标
 */
const onDragMove = (clientY: number) => {
  if (!isDragging.value) return
  const delta = clientY - dragStartY.value
  // 向下拖拽 delta > 0，高度减小
  const deltaPercent = (delta / viewportHeight.value) * 100
  const newHeight = dragStartHeight.value - deltaPercent
  // 限制在 10vh ~ 95vh 之间
  currentHeight.value = Math.min(95, Math.max(10, newHeight))
}

/**
 * 结束拖拽，吸附到最近点
 */
const endDrag = () => {
  if (!isDragging.value) return
  isDragging.value = false
  animated.value = true
  // 吸附到最近点
  currentHeight.value = findNearestSnap(currentHeight.value)
  // 如果吸附到最低点（<=25vh），则关闭 Sheet
  if (currentHeight.value <= props.snapPoints[0]) {
    // 仅当用户拖到最低点时关闭
    if (currentHeight.value <= 15) {
      emit('update:visible', false)
    }
  }
}

// ===== Touch 事件处理 =====
const handleTouchStart = (e: TouchEvent) => {
  // 阻止冒泡到地图，防止手势冲突
  e.stopPropagation()
  startDrag(e.touches[0].clientY)
}

const handleTouchMove = (e: TouchEvent) => {
  if (!isDragging.value) return
  e.preventDefault()
  e.stopPropagation()
  const clientY = e.touches[0].clientY
  // 使用 rAF 保证 60fps
  requestAnimationFrame(() => onDragMove(clientY))
}

const handleTouchEnd = (e:TouchEvent) => {
  e.stopPropagation()
  endDrag()
}

// ===== Mouse 事件处理（桌面端调试兼容） =====
const handleMouseDown = (e: MouseEvent) => {
  e.preventDefault()
  e.stopPropagation()
  startDrag(e.clientY)

  const onMouseMove = (ev: MouseEvent) => {
    requestAnimationFrame(() => onDragMove(ev.clientY))
  }
  const onMouseUp = () => {
    endDrag()
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  }
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

// 点击遮罩层关闭
const handleOverlayClick = () => {
  animated.value = true
  emit('update:visible', false)
}

// 安全区域底部高度
const safeAreaBottom = ref(0)
const updateSafeArea = () => {
  // env(safe-area-inset-bottom) 通过 CSS 处理，此处仅用于 JS 计算
  safeAreaBottom.value = 0
}

onMounted(() => {
  updateSafeArea()
})

onBeforeUnmount(() => {
  isDragging.value = false
})
</script>

<template>
  <Teleport to="body">
    <!-- 遮罩层 -->
    <Transition name="sheet-overlay">
      <div
        v-if="visible && showOverlay"
        class="sheet-overlay"
        @click="handleOverlayClick"
      />
    </Transition>

    <!-- Bottom Sheet 主体 -->
    <Transition name="sheet-slide">
      <div
        v-if="visible"
        ref="sheetRef"
        class="bottom-sheet"
        :class="{ dragging: isDragging, animated: animated }"
        :style="{ height: `${currentHeight}vh` }"
      >
        <!-- 拖拽手柄（视觉 36×4px，热区全宽×32px） -->
        <div
          class="sheet-handle"
          @touchstart="handleTouchStart"
          @touchmove="handleTouchMove"
          @touchend="handleTouchEnd"
          @mousedown="handleMouseDown"
        >
          <div class="handle-bar" />
        </div>

        <!-- 内容区 -->
        <div class="sheet-content">
          <slot />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* 遮罩层：半透明背景，点击关闭 */
.sheet-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 2000;
}

/* Bottom Sheet 主体 */
.bottom-sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2001;
  background: var(--el-bg-color, #fff);
  border-radius: 12px 12px 0 0;
  box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  /* 安全区域适配 */
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

/* 动画状态：使用 transform 过渡 */
.bottom-sheet.animated {
  transition: height 300ms cubic-bezier(0.4, 0.0, 0.2, 1);
}

/* 拖拽状态：禁用动画，实时跟随 */
.bottom-sheet.dragging {
  transition: none;
}

/* 拖拽手柄：热区全宽×32px，视觉 36×4px */
.sheet-handle {
  width: 100%;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  cursor: grab;
  touch-action: none; /* 阻止浏览器默认手势 */
  user-select: none;
}

.sheet-handle:active {
  cursor: grabbing;
}

/* 手柄视觉条 */
.handle-bar {
  width: 36px;
  height: 4px;
  background: var(--el-border-color, #dcdfe6);
  border-radius: 2px;
}

/* 内容区 */
.sheet-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* ===== 过渡动画 ===== */

/* 遮罩层淡入淡出 */
.sheet-overlay-enter-active,
.sheet-overlay-leave-active {
  transition: opacity 300ms cubic-bezier(0.4, 0.0, 0.2, 1);
}

.sheet-overlay-enter-from,
.sheet-overlay-leave-to {
  opacity: 0;
}

/* Sheet 上滑/下滑（使用 transform 避免布局抖动） */
.sheet-slide-enter-active,
.sheet-slide-leave-active {
  transition: transform 300ms cubic-bezier(0.4, 0.0, 0.2, 1);
}

.sheet-slide-enter-from,
.sheet-slide-leave-to {
  transform: translateY(100%);
}

/* ===== prefers-reduced-motion 支持 ===== */
@media (prefers-reduced-motion: reduce) {
  .bottom-sheet.animated {
    transition: height 50ms ease;
  }

  .sheet-overlay-enter-active,
  .sheet-overlay-leave-active,
  .sheet-slide-enter-active,
  .sheet-slide-leave-active {
    transition-duration: 50ms;
  }
}
</style>
