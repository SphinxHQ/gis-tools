/**
 * @file Test setup
 * @description Global test setup configuration for Vitest.
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2026-04-13
 */
import { config } from '@vue/test-utils'
import { vi } from 'vitest'

import { proj4Init } from '~/components/gismap/proj4Defs'

vi.mock('*.scss', () => ({}))

proj4Init()

config.global.stubs = {}

config.global.mocks = {
  $router: {
    push: vi.fn(),
    replace: vi.fn(),
  },
}

config.global.stubs.ElButton = true
config.global.stubs.ElInput = true
config.global.stubs.ElSelect = true
config.global.stubs.ElDialog = true
config.global.stubs.ElMessage = true
