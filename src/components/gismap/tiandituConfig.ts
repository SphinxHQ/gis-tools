import Common from '~/common/Common'
import { logger } from '~/common/logger'

/**
 * 天地图底图类型
 */
export type TianDiTuBasemapType = 'vec' | 'img'

/**
 * 天地图投影类型
 * - c: 经纬度投影 (EPSG:4326/4490)
 * - w: 球面墨卡托投影 (EPSG:3857)
 */
export type TianDiTuProjectionSuffix = 'c' | 'w'

/**
 * 天地图图层配置
 */
export interface TianDiTuLayerConfig {
  /** 图层类型标识：vec=矢量底图, cva=矢量注记, img=影像底图, cia=影像注记 */
  type: 'vec' | 'cva' | 'img' | 'cia'
  /** 图层名称 */
  name: string
}

/**
 * 天地图底图配置（底图 + 注记）
 */
export interface TianDiTuBasemapConfig {
  /** 底图类型 */
  id: TianDiTuBasemapType
  /** 显示名称 */
  label: string
  /** 底图图层 */
  baseLayer: TianDiTuLayerConfig
  /** 注记图层 */
  annotationLayer: TianDiTuLayerConfig
}

/**
 * 天地图底图配置表
 */
export const TIAN_DI_TU_BASEMAPS: Record<TianDiTuBasemapType, TianDiTuBasemapConfig> = {
  vec: {
    id: 'vec',
    label: '矢量',
    baseLayer: { type: 'vec', name: '矢量底图' },
    annotationLayer: { type: 'cva', name: '矢量注记' },
  },
  img: {
    id: 'img',
    label: '影像',
    baseLayer: { type: 'img', name: '影像底图' },
    annotationLayer: { type: 'cia', name: '影像注记' },
  },
}

/**
 * 根据视图投影代码获取天地图 URL 后缀
 * 始终使用 'w'（球面墨卡托 EPSG:3857）瓦片，由 OL 自动重投影到视图坐标系
 * @param _viewProjCode 视图投影代码（未使用）
 * @returns 固定返回 'w'
 */
export function getTianDiTuProjSuffix(_viewProjCode: string): TianDiTuProjectionSuffix {
  return 'w'
}

/**
 * 构建天地图图层 URL
 * @param layerType 图层类型 (vec/cva/img/cia)
 * @param projSuffix 投影后缀 (c/w)
 * @returns 完整的天地图 DataServer URL
 */
export function buildTianDiTuLayerUrl(
  layerType: TianDiTuLayerConfig['type'],
  projSuffix: TianDiTuProjectionSuffix,
): string {
  // 使用 HTTP：兼容内网 HTTP 部署环境
  // 注意：在 GitHub Pages（HTTPS）等 HTTPS 站点下，HTTP 瓦片会被浏览器拦截（mixed content）
  return `http://t0.tianditu.com/DataServer?T=${layerType}_${projSuffix}`
}

// ============ 天地图 API Key 轮换与降级 ============

const TDT_KEYS_STORAGE = 'gis-tools:tianditu-keys'
const TDT_ACTIVE_INDEX_STORAGE = 'gis-tools:tianditu-active-index'

interface TianDiTuKeyState {
  /** 探测通过的 key 列表（按顺序保留，未通过的放到末尾） */
  keys: string[]
  /** 当前激活的 key 在 keys 数组中的索引 */
  activeIndex: number
}

let cachedState: TianDiTuKeyState | null = null

/**
 * 从环境变量加载所有 key（兼容 VITE_TIANDITU_API_KEYS 和 VITE_TIANDITU_API_KEY）
 */
function loadKeysFromEnv(): string[] {
  const multi = import.meta.env.VITE_TIANDITU_API_KEYS as string | undefined
  const single = import.meta.env.VITE_TIANDITU_API_KEY as string | undefined
  const set = new Set<string>()
  if (multi) {
    multi.split(',').map(s => s.trim()).filter(Boolean).forEach(k => set.add(k))
  }
  if (single) {
    set.add(single.trim())
  }
  return Array.from(set)
}

/**
 * 从 localStorage 恢复 key 状态
 */
function loadState(): TianDiTuKeyState | null {
  if (cachedState) return cachedState
  const envKeys = loadKeysFromEnv()
  if (envKeys.length === 0) return null
  try {
    const raw = localStorage.getItem(TDT_KEYS_STORAGE)
    const idxRaw = localStorage.getItem(TDT_ACTIVE_INDEX_STORAGE)
    if (raw) {
      const stored = JSON.parse(raw) as string[]
      // 只保留仍在环境变量中的 key
      const valid = stored.filter(k => envKeys.includes(k))
      // 追加新加入的 key 到末尾
      for (const k of envKeys) {
        if (!valid.includes(k)) valid.push(k)
      }
      if (valid.length > 0) {
        const idx = idxRaw ? Math.max(0, Math.min(parseInt(idxRaw, 10) || 0, valid.length - 1)) : 0
        cachedState = { keys: valid, activeIndex: idx }
        return cachedState
      }
    }
  } catch {
    // ignore
  }
  cachedState = { keys: envKeys, activeIndex: 0 }
  return cachedState
}

/**
 * 持久化 key 状态
 */
function saveState(state: TianDiTuKeyState): void {
  try {
    localStorage.setItem(TDT_KEYS_STORAGE, JSON.stringify(state.keys))
    localStorage.setItem(TDT_ACTIVE_INDEX_STORAGE, String(state.activeIndex))
  } catch {
    // ignore
  }
}

/**
 * 探测单个 key 的可用性
 * 通过拉一张最小瓦片（zoom 0，瓦片 0/0/0）验证
 * @returns true 表示可用
 */
async function probeKey(key: string, timeoutMs = 4000): Promise<boolean> {
  // 天地图 tile (0,0,0) 在 3857 下是全球一张图（HTTP）
  const url = `http://t0.tianditu.com/DataServer?T=vec_w&x=0&y=0&l=0&tk=${key}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const resp = await fetch(url, { method: 'GET', signal: controller.signal, mode: 'cors' })
    clearTimeout(timer)
    if (!resp.ok) return false
    const ct = resp.headers.get('content-type') || ''
    // 图片返回 image/png 或 image/jpeg；其他（如 XML/HTML 错误页）说明 key 无效
    return ct.startsWith('image/')
  } catch {
    clearTimeout(timer)
    return false
  }
}

/**
 * 探测并轮换到第一个可用的 key
 * @returns 选中的可用 key，若全部不可用则返回空字符串
 */
export async function selectAvailableTianDiTuKey(): Promise<string> {
  const state = loadState()
  if (!state || state.keys.length === 0) {
    logger.warn('天地图 API Key 未配置')
    return ''
  }

  // 从当前 activeIndex 开始探测，找到第一个可用的 key
  const startIdx = state.activeIndex
  // 先探测当前 key 是否仍可用
  const cur = state.keys[startIdx]
  if (cur && await probeKey(cur)) {
    logger.info(`天地图 key 探测通过（当前）: index=${startIdx}`)
    saveState(state)
    return cur
  }

  // 当前 key 不可用，顺序探测后续 key
  for (let i = 0; i < state.keys.length; i++) {
    if (i === startIdx) continue
    const key = state.keys[i]
    if (await probeKey(key)) {
      logger.info(`天地图 key 降级到 index=${i}`)
      state.activeIndex = i
      saveState(state)
      // 把探测失败的旧 key 移到最后（保证下次仍会重新探测）
      // 这里不动顺序，仅更新 activeIndex
      return key
    }
    logger.warn(`天地图 key 探测失败: index=${i}`)
  }

  // 全部不可用
  logger.error('所有天地图 API Key 均不可用，将降级到本地底图')
  return ''
}

/**
 * 获取当前应使用的天地图 key（同步，无探测）
 * 注意：仅用于某些需要同步 key 的场景（如 TianDiTuGisMapLayer 默认构造）
 * 推荐在异步流程中调用 selectAvailableTianDiTuKey 获取真实可用 key
 */
export function getCurrentTianDiTuKey(): string {
  const state = loadState()
  if (!state || state.keys.length === 0) {
    // 回退到 Common 中的旧逻辑
    return Common.getTiandituApiKey()
  }
  return state.keys[state.activeIndex] || ''
}

/**
 * 重置 key 状态（用于调试或手动重新探测）
 */
export function resetTianDiTuKeyState(): void {
  cachedState = null
  try {
    localStorage.removeItem(TDT_KEYS_STORAGE)
    localStorage.removeItem(TDT_ACTIVE_INDEX_STORAGE)
  } catch {
    // ignore
  }
}

/**
 * 检测天地图服务可达性
 * 异步探测当前激活的 key 是否可用
 * @returns true 表示可用
 */
export async function checkTianDiTuAvailability(): Promise<boolean> {
  const state = loadState()
  if (!state || state.keys.length === 0) {
    logger.warn('天地图 API Key 未配置，底图切换不可用')
    return false
  }
  const key = await selectAvailableTianDiTuKey()
  return Boolean(key)
}