/**
 * @file Breakpoint composable
 * @description Provides reactive responsive breakpoint detection (xl/lg/md/sm) with
 *              shared resize listener management. Returns computed state for current
 *              breakpoint, device type flags, and panel width configuration.
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2026-06-24
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'

/** Breakpoint size categories (5-level: xs/sm/md/lg/xl) */
export type Breakpoint = 'xl' | 'lg' | 'md' | 'sm' | 'xs'

/*
// Reactive breakpoint state
export interface BreakpointState {
  // Current breakpoint
  current: Breakpoint
  // Whether the viewport is mobile (sm)
  isMobile: boolean
  // Whether the viewport is tablet (md)
  isTablet: boolean
  // Whether the viewport is desktop (xl or lg)
  isDesktop: boolean
  // Panel width in pixels for the current breakpoint
  panelWidth: number
  // Collapsed panel width in pixels
  panelCollapsedWidth: number
}
*/

/** Panel widths per breakpoint */
const PANEL_WIDTH: Record<Breakpoint, number> = {
  xl: 520,
  lg: 520,
  md: 320,
  sm: 0,
  xs: 0,
}

/** Collapsed panel widths per breakpoint */
const PANEL_COLLAPSED_WIDTH: Record<Breakpoint, number> = {
  xl: 48,
  lg: 48,
  md: 48,
  sm: 0,
  xs: 0,
}

/**
 * Resolve a viewport width to a breakpoint category
 * @param width - Viewport width in pixels
 * @returns The matching breakpoint
 */
function resolveBreakpoint(width: number): Breakpoint {
  if (width >= 1280) return 'xl'
  if (width >= 1024) return 'lg'
  if (width >= 768) return 'md'
  if (width >= 576) return 'sm'
  return 'xs'
}

const globalWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1280)
const globalBreakpoint = ref<Breakpoint>(resolveBreakpoint(globalWidth.value))

let listenerCount = 0
let resizeHandler: (() => void) | null = null

/** Ensure the global resize listener is attached */
function ensureResizeListener() {
  if (resizeHandler) return
  resizeHandler = () => {
    globalWidth.value = window.innerWidth
    globalBreakpoint.value = resolveBreakpoint(window.innerWidth)
  }
  window.addEventListener('resize', resizeHandler, { passive: true })
}

/** Remove the resize listener if no consumers remain */
function maybeRemoveResizeListener() {
  if (listenerCount > 0) return
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler)
    resizeHandler = null
  }
}

/**
 * Composable for reactive breakpoint detection
 * @returns Reactive breakpoint state and computed flags
 */
export function useBreakpoint() {
  ensureResizeListener()
  listenerCount++

  onMounted(() => {
    ensureResizeListener()
    globalWidth.value = window.innerWidth
    globalBreakpoint.value = resolveBreakpoint(window.innerWidth)
  })

  onUnmounted(() => {
    listenerCount = Math.max(0, listenerCount - 1)
    maybeRemoveResizeListener()
  })

  const current = computed<Breakpoint>(() => globalBreakpoint.value)
  const isMobile = computed(() => globalBreakpoint.value === 'sm' || globalBreakpoint.value === 'xs')
  const isTablet = computed(() => globalBreakpoint.value === 'md')
  const isDesktop = computed(() => globalBreakpoint.value === 'xl' || globalBreakpoint.value === 'lg')
  const panelWidth = computed(() => PANEL_WIDTH[globalBreakpoint.value])
  const panelCollapsedWidth = computed(() => PANEL_COLLAPSED_WIDTH[globalBreakpoint.value])
  const showLeftPanel = computed(() => PANEL_WIDTH[globalBreakpoint.value] > 0)
  const showBottomNav = computed(() => globalBreakpoint.value === 'xs' || globalBreakpoint.value === 'sm')
  const showMobileNav = showBottomNav // 向后兼容别名

  return {
    current,
    isMobile,
    isTablet,
    isDesktop,
    panelWidth,
    panelCollapsedWidth,
    showLeftPanel,
    showBottomNav,
    showMobileNav,
    width: computed(() => globalWidth.value),
  }
}
