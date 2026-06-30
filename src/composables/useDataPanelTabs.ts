/**
 * @file Shared Tab state management for data panels
 * @description Extracts common Tab state logic shared between GisDataPanel (desktop)
 *              and GisMobileTabBar (mobile), ensuring single source of truth for
 *              activeTab/activeData/transformChain state. Follows DRY principle
 *              and single-code-path rule (no isMobile branching).
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2026-06-25
 */
import { ref, watch, computed } from 'vue'

import GisDataInfo from '~/components/data/GisDataInfo'

/** Tab identifier type */
export type DataPanelTab = 'crs' | 'feature' | 'validate' | 'export'

/** Tab option definition for el-segmented / custom tab bar */
export interface DataPanelTabOption {
  value: DataPanelTab
  label: string
}

/** Shared Tab options (single source of truth) */
export const DATA_PANEL_TAB_OPTIONS: DataPanelTabOption[] = [
  { value: 'crs', label: '坐标系' },
  { value: 'feature', label: '要素' },
  { value: 'validate', label: '校验' },
  { value: 'export', label: '导出' },
]

/** Props accepted by the composable (mirrors GisDataPanel/GisMobileTabBar props) */
export interface UseDataPanelTabsProps {
  data: GisDataInfo
  instanceId: number | string
  mapReady: boolean
}

/** Emits accepted by the composable */
export interface UseDataPanelTabsEmits {
  (e: 'active-data-change', data: GisDataInfo, transformChain: number[]): void
  (e: 'enter-edit-mode'): void
  (e: 'exit-edit-mode'): void
  (e: 'read', data: unknown): void
  (e: 'error', err: Error): void
}

/**
 * Shared Tab state management for data panels.
 * Used by both GisDataPanel (desktop) and GisMobileTabBar (mobile) to ensure
 * identical state behavior across breakpoints (single code path).
 *
 * @param props - Component props containing data/instanceId/mapReady
 * @param emit - Component emit function for upstream events
 * @param defaultTab - Initial active tab (desktop defaults to 'crs', mobile to '')
 * @returns Shared state: activeTab, activeData, activeTransformChain, hasData, hasActiveData,
 *          handleActiveDataChange, handleEnterEditMode, handleExitEditMode
 */
export function useDataPanelTabs(
  props: UseDataPanelTabsProps,
  emit: UseDataPanelTabsEmits,
  defaultTab: DataPanelTab | '' = 'crs',
) {
  // 当前激活的 Tab
  const activeTab = ref<DataPanelTab | ''>(defaultTab)

  // 当前活跃数据（经过 CRS 转换后的，可能与 props.data 不同）
  const activeData = ref<GisDataInfo>(props.data)

  // 坐标转换链（记录从原始数据到当前数据的 EPSG 转换路径）
  const activeTransformChain = ref<number[]>([])

  // 数据变化时重置活跃数据与转换链
  watch(
    () => props.data,
    (newData) => {
      activeData.value = newData
      activeTransformChain.value = newData?.crs?.epsgCode ? [newData.crs.epsgCode] : []
    },
    { immediate: true },
  )

  // 是否有原始数据
  const hasData = computed(() => !!props.data?.features?.length)

  // 是否有活跃数据（经过转换后可能产生新数据集）
  const hasActiveData = computed(() => !!activeData.value?.features?.length)

  // CRS 转换后更新活跃数据并向上冒泡
  const handleActiveDataChange = (data: GisDataInfo, transformChain: number[]) => {
    activeData.value = data
    activeTransformChain.value = transformChain
    emit('active-data-change', data, transformChain)
  }

  // 进入/退出要素编辑模式
  const handleEnterEditMode = () => emit('enter-edit-mode')
  const handleExitEditMode = () => emit('exit-edit-mode')

  return {
    activeTab,
    activeData,
    activeTransformChain,
    hasData,
    hasActiveData,
    handleActiveDataChange,
    handleEnterEditMode,
    handleExitEditMode,
  }
}
