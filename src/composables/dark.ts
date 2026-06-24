/**
 * @file Dark mode theme management
 * @description Manages the application theme (auto/light/dark) using VueUse storage and
 *              system preference detection. Syncs the theme to the document root class
 *              and the inline loading screen attribute.
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2024-08-06
 */
import { usePreferredDark, useStorage } from '@vueuse/core'
import { computed, watch } from 'vue'

/** Theme mode: 'auto' follows system, 'light'/'dark' forces the theme */
export type ThemeMode = 'auto' | 'light' | 'dark'

/** User preference — persisted to localStorage */
export const themeMode = useStorage<ThemeMode>('gis-theme-mode', 'auto')

/** System dark preference — responds to prefers-color-scheme */
const prefersDark = usePreferredDark()

/** Actual render state — derived from preference + system */
export const isActuallyDark = computed(() => {
  if (themeMode.value === 'dark') return true
  if (themeMode.value === 'light') return false
  return prefersDark.value
})

// Sync to html.dark class
watch(isActuallyDark, (dark) => {
  document.documentElement.classList.toggle('dark', dark)
  // Sync to inline loading screen (index.html) for use
  document.documentElement.setAttribute('data-entry-theme', dark ? 'dark' : 'light')
}, { immediate: true })

/**
 * Set the theme mode
 * @param mode - Theme mode to set
 */
export function setThemeMode(mode: ThemeMode) {
  themeMode.value = mode
}

/**
 * Cycle through theme modes: auto → light → dark → auto
 */
export function cycleThemeMode() {
  const order: ThemeMode[] = ['auto', 'light', 'dark']
  const idx = order.indexOf(themeMode.value)
  themeMode.value = order[(idx + 1) % order.length]
}
