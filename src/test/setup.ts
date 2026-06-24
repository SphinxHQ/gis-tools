/**
 * @file Test setup
 * @description Global test setup configuration for Vitest.
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2026-04-13
 */
import { config } from '@vue/test-utils'
import { vi } from 'vitest'

import { proj4Init } from '~/components/gismap/proj4Defs'

// Mock SCSS imports (no-op in test environment)
vi.mock('*.scss', () => ({}))

// Initialize proj4 coordinate system definitions before any tests run
proj4Init()

// Global Vue test config: no default stubs
config.global.stubs = {}

// Mock Vue Router
config.global.mocks = {
  $router: {
    push: vi.fn(),
    replace: vi.fn(),
  },
}

// Stub Element Plus components to avoid rendering overhead in tests
config.global.stubs.ElButton = true
config.global.stubs.ElInput = true
config.global.stubs.ElSelect = true
config.global.stubs.ElDialog = true
config.global.stubs.ElMessage = true
