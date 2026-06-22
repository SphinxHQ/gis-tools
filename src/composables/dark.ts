import { usePreferredDark, useStorage } from '@vueuse/core'
import { computed, watch } from 'vue'

export type ThemeMode = 'auto' | 'light' | 'dark'

/** 用户偏好 — 持久化到 localStorage */
export const themeMode = useStorage<ThemeMode>('gis-theme-mode', 'auto')

/** 系统暗色偏好 — 响应 prefers-color-scheme */
const prefersDark = usePreferredDark()

/** 实际渲染状态 — 由偏好 + 系统推导 */
export const isActuallyDark = computed(() => {
  if (themeMode.value === 'dark') return true
  if (themeMode.value === 'light') return false
  return prefersDark.value
})

// 同步到 html.dark class
watch(isActuallyDark, (dark) => {
  document.documentElement.classList.toggle('dark', dark)
  // 同步给内联 loading 屏（index.html）使用
  document.documentElement.setAttribute('data-entry-theme', dark ? 'dark' : 'light')
}, { immediate: true })

export function setThemeMode(mode: ThemeMode) {
  themeMode.value = mode
}

export function cycleThemeMode() {
  const order: ThemeMode[] = ['auto', 'light', 'dark']
  const idx = order.indexOf(themeMode.value)
  themeMode.value = order[(idx + 1) % order.length]
}
