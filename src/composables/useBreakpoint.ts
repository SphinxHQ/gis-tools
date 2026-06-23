import { ref, computed, onMounted, onUnmounted } from 'vue'

export type Breakpoint = 'xl' | 'lg' | 'md' | 'sm'

export interface BreakpointState {
  current: Breakpoint
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  panelWidth: number
  panelCollapsedWidth: number
}

const BREAKPOINTS: Record<Breakpoint, { min: number; max: number }> = {
  xl: { min: 1280, max: Number.MAX_SAFE_INTEGER },
  lg: { min: 1024, max: 1279 },
  md: { min: 768, max: 1023 },
  sm: { min: 0, max: 767 },
}

const PANEL_WIDTH: Record<Breakpoint, number> = {
  xl: 320,
  lg: 280,
  md: 0,
  sm: 0,
}

const PANEL_COLLAPSED_WIDTH: Record<Breakpoint, number> = {
  xl: 48,
  lg: 48,
  md: 0,
  sm: 0,
}

function resolveBreakpoint(width: number): Breakpoint {
  if (width >= 1280) return 'xl'
  if (width >= 1024) return 'lg'
  if (width >= 768) return 'md'
  return 'sm'
}

const globalWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1280)
const globalBreakpoint = ref<Breakpoint>(resolveBreakpoint(globalWidth.value))

let listenerCount = 0
let resizeHandler: (() => void) | null = null

function ensureResizeListener() {
  if (resizeHandler) return
  resizeHandler = () => {
    globalWidth.value = window.innerWidth
    globalBreakpoint.value = resolveBreakpoint(window.innerWidth)
  }
  window.addEventListener('resize', resizeHandler, { passive: true })
}

function maybeRemoveResizeListener() {
  if (listenerCount > 0) return
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler)
    resizeHandler = null
  }
}

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
  const isMobile = computed(() => globalBreakpoint.value === 'sm')
  const isTablet = computed(() => globalBreakpoint.value === 'md')
  const isDesktop = computed(() => globalBreakpoint.value === 'xl' || globalBreakpoint.value === 'lg')
  const panelWidth = computed(() => PANEL_WIDTH[globalBreakpoint.value])
  const panelCollapsedWidth = computed(() => PANEL_COLLAPSED_WIDTH[globalBreakpoint.value])
  const showLeftPanel = computed(() => PANEL_WIDTH[globalBreakpoint.value] > 0)
  const showMobileNav = computed(() => globalBreakpoint.value === 'sm')

  return {
    current,
    isMobile,
    isTablet,
    isDesktop,
    panelWidth,
    panelCollapsedWidth,
    showLeftPanel,
    showMobileNav,
    width: computed(() => globalWidth.value),
  }
}
