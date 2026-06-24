/**
 * 分享接收 Composable
 *
 * 配合 public/sw-share-target.js 使用。SW 拦截系统分享的 POST 请求后，
 * 将文件暂存到 Cache Storage 并 303 重定向到 /?share=1。
 * 本 composable 在页面加载时检测 ?share=1 标记，从缓存读取文件，
 * 复用 SimpleDataFormat 解析 + addDataSource 导入为新数据集，
 * 处理完成后清理缓存与 URL 参数。
 *
 * 数据结构（与 sw-share-target.js 约定一致）：
 *   - /gis-tools/share-pending-meta  → JSON { title, text, url, timestamp, fileCount, fileNames, fileTypes }
 *   - /gis-tools/share-pending-file-{i} → Blob（单个文件的二进制数据）
 */
import { ElMessage } from 'element-plus'

import { logger } from '~/common/logger'
import { SimpleDataFormat } from '~/components/data/DataFormat'
import GisDataInfo from '~/components/data/GisDataInfo'
import { localDb } from '~/composables/localDb'
import { useGisDataStore } from '~/composables/gisDataStore'

/** 分享数据暂存的 Cache Storage 名称（与 sw-share-target.js 一致） */
const SHARE_CACHE = 'share-data-cache'
/** 元数据缓存 key（与 sw-share-target.js 一致） */
const META_KEY = '/gis-tools/share-pending-meta'
/** 文件缓存 key 前缀（与 sw-share-target.js 一致） */
const FILE_KEY_PREFIX = '/gis-tools/share-pending-file-'

/** SW 暂存的分享元数据结构 */
interface ShareMeta {
  title: string
  text: string
  url: string
  timestamp: number
  fileCount: number
  fileNames: string[]
  fileTypes: string[]
}

/**
 * 从 GisDataInfo 提取元数据，用于 localDb 历史记录展示
 * 复用 GisDataReader.vue 中 extractMeta 的逻辑
 */
function extractMeta(data: GisDataInfo) {
  return {
    crs: data.crs?.epsgCode ? `EPSG:${data.crs.epsgCode}` : '',
    types: data.getTypes()?.join(', ') || '',
    featureCount: data.features?.length ?? 0,
    vertexCount: data.getTotalVertexCount(),
  }
}

/**
 * 清理分享缓存：直接删除整个 Cache 对象，确保元数据和所有文件 entries 全部清除
 * 使用 caches.delete 比逐个删除更彻底，避免 fileCount 不匹配时残留
 */
async function clearShareCache(): Promise<void> {
  try {
    await caches.delete(SHARE_CACHE)
  } catch (err) {
    logger.warn('[useShareReceiver] 清理分享缓存失败:', err)
  }
}

/**
 * 处理单个分享文件：解析 → 导入数据集 → 持久化到历史记录
 * @param blob 文件二进制数据
 * @param fileName 文件名
 * @param addDataSource 数据集添加函数（由调用方传入，避免重复获取）
 * @returns 是否成功
 */
async function processSharedFile(
  blob: Blob,
  fileName: string,
  addDataSource: (data: GisDataInfo) => string,
): Promise<boolean> {
  try {
    const arrayBuffer = await blob.arrayBuffer()
    const simpleDataFormat = new SimpleDataFormat()
    const dataInfo = await simpleDataFormat.read(arrayBuffer)
    dataInfo.name = fileName

    // 添加为新数据集（由调用方传入，避免重复获取 store）
    addDataSource(dataInfo)

    // 持久化到历史记录（复用 localDb.add）
    await localDb.add(fileName, arrayBuffer, extractMeta(dataInfo))

    logger.info(`[useShareReceiver] 分享文件导入成功: ${fileName} (${dataInfo.features?.length ?? 0} 要素)`)
    return true
  } catch (err) {
    logger.error(`[useShareReceiver] 分享文件解析失败: ${fileName}`, err)
    return false
  }
}

/**
 * 分享接收主流程
 * 1. 检测 URL ?share=1 标记
 * 2. 从 Cache Storage 读取元数据 + 文件
 * 3. 逐个解析导入
 * 4. 清理缓存与 URL 参数
 */
async function receiveShare(): Promise<void> {
  const search = location.search

  // 错误标记：SW 暂存失败时重定向到 ?share=error
  if (search.includes('share=error')) {
    ElMessage.error('接收分享数据失败，请重试')
    history.replaceState(null, '', location.pathname)
    return
  }

  // 正常标记：?share=1
  if (!search.includes('share=1')) {
    return
  }

  // 不支持 Cache Storage 的环境（如隐私模式）静默跳过，避免抛 TypeError
  if (!('caches' in window)) {
    logger.warn('[useShareReceiver] 当前环境不支持 Cache Storage，跳过分享接收')
    history.replaceState(null, '', location.pathname)
    return
  }

  // 一次性获取 store 方法，避免在循环中重复调用 useGisDataStore()
  const { addDataSource } = useGisDataStore()

  try {
    const shareCache = await caches.open(SHARE_CACHE)
    const metaRes = await shareCache.match(META_KEY)

    if (!metaRes) {
      logger.warn('[useShareReceiver] 未找到分享元数据，可能已被处理')
      return
    }

    const meta: ShareMeta = await metaRes.json()
    logger.info(`[useShareReceiver] 收到分享数据: ${meta.fileCount} 个文件`, meta.fileNames)

    if (meta.fileCount === 0) {
      ElMessage.info('分享内容未包含有效文件')
    } else {
      // 逐个处理文件
      let successCount = 0
      for (let i = 0; i < meta.fileCount; i++) {
        const fileRes = await shareCache.match(FILE_KEY_PREFIX + i)
        if (!fileRes) {
          logger.warn(`[useShareReceiver] 文件 ${i} 缓存缺失，跳过`)
          continue
        }
        const blob = await fileRes.blob()
        const fileName = meta.fileNames[i] || `shared-file-${i}`
        const ok = await processSharedFile(blob, fileName, addDataSource)
        if (ok) successCount++
      }

      if (successCount === 0) {
        ElMessage.error('分享文件解析失败，请检查文件格式')
      } else if (successCount < meta.fileCount) {
        ElMessage.warning(`成功导入 ${successCount}/${meta.fileCount} 个文件`)
      } else {
        ElMessage.success(`成功导入 ${successCount} 个文件`)
      }
    }

    // 清理缓存
    await clearShareCache()
  } catch (err) {
    logger.error('[useShareReceiver] 读取分享数据失败:', err)
    ElMessage.error('读取分享数据失败')
    // 异常时也清理缓存（删除整个 Cache 对象，确保不残留）
    await clearShareCache()
  } finally {
    // 清除 URL 参数，避免刷新重复处理
    history.replaceState(null, '', location.pathname)
  }
}

/**
 * 分享接收 Composable
 * @returns init() 方法，在组件 onMounted 中调用
 */
export function useShareReceiver() {
  const init = () => {
    // 延迟执行，避免与首屏渲染竞争资源
    // SW 重定向后页面是冷启动，需等 Vue 挂载完成后再处理分享数据
    receiveShare().catch((err) => {
      logger.error('[useShareReceiver] 初始化失败:', err)
    })
  }

  return { init }
}
