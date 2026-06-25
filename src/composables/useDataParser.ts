/**
 * @file Data parser composable with Web Worker support
 * @description 大文件解析自动切换到 Web Worker，避免阻塞主线程。
 *              阈值：buffer > 5MB 或（网络 4g 且 > 2MB）→ Worker；否则主线程。
 *              Worker 不可用或出错时自动回退主线程解析。
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2026-06-25
 */
import { ref } from 'vue'
import { GisError, GisErrorCode } from '~/common/GisError'
import { SimpleDataFormat } from '~/components/data/DataFormat'
import type GisDataInfo from '~/components/data/GisDataInfo'

/** Worker 大文件阈值：5MB */
const WORKER_THRESHOLD = 5 * 1024 * 1024
/** 弱网下降阈值：2MB（4g 以下网络） */
const WORKER_WEAK_NETWORK_THRESHOLD = 2 * 1024 * 1024

/** 序列化后的 GisError（来自 Worker） */
interface SerializedGisError {
  isGisError: true
  code: GisErrorCode
  message: string
}

/** 从 ArrayBuffer 重建 GisError */
function deserializeError(err: SerializedGisError | Error | unknown): GisError {
  if (err && typeof err === 'object' && (err as SerializedGisError).isGisError) {
    const s = err as SerializedGisError
    return new GisError(s.code, s.message)
  }
  if (err instanceof Error) return new GisError(GisErrorCode.DATA_PARSE_FAILED, err.message)
  return new GisError(GisErrorCode.DATA_PARSE_FAILED, String(err))
}

/** 是否应使用 Worker（基于大小和设备能力） */
function shouldUseWorker(size: number): boolean {
  if (typeof Worker === 'undefined') return false
  if (size > WORKER_THRESHOLD) return true
  // 弱网下降阈值
  if (size > WORKER_WEAK_NETWORK_THRESHOLD) {
    const conn = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection
    if (conn?.effectiveType && ['slow-2g', '2g', '3g'].includes(conn.effectiveType)) return true
  }
  return false
}

/** Worker 实例缓存（单例） */
let workerInstance: Worker | null = null
function getWorker(): Worker | null {
  if (workerInstance) return workerInstance
  if (typeof Worker === 'undefined') return null
  try {
    workerInstance = new Worker(new URL('~/workers/dataParser.worker.ts', import.meta.url), { type: 'module' })
    return workerInstance
  } catch {
    return null
  }
}

/** Worker 解析（带进度回调） */
function parseInWorker(
  buffer: ArrayBuffer,
  onProgress?: (progress: number) => void,
): Promise<GisDataInfo> {
  return new Promise((resolve, reject) => {
    const worker = getWorker()
    if (!worker) {
      reject(new GisError(GisErrorCode.DATA_PARSE_FAILED, 'Worker unavailable'))
      return
    }
    const id = Date.now() + Math.random()
    const onMessage = (e: MessageEvent) => {
      const msg = e.data
      if (msg.id !== id) return
      if (msg.type === 'progress') {
        onProgress?.(msg.progress)
      } else if (msg.type === 'success') {
        worker.removeEventListener('message', onMessage)
        worker.removeEventListener('error', onError)
        resolve(msg.dataInfo as GisDataInfo)
      } else if (msg.type === 'error') {
        worker.removeEventListener('message', onMessage)
        worker.removeEventListener('error', onError)
        reject(deserializeError(msg.error))
      }
    }
    const onError = () => {
      worker.removeEventListener('message', onMessage)
      worker.removeEventListener('error', onError)
      reject(new GisError(GisErrorCode.DATA_PARSE_FAILED, 'Worker runtime error'))
    }
    worker.addEventListener('message', onMessage)
    worker.addEventListener('error', onError)
    worker.postMessage({ buffer, id }, [buffer])
  })
}

/** 主线程解析（现有逻辑） */
async function parseInMain(content: ArrayBuffer | string): Promise<GisDataInfo> {
  const format = new SimpleDataFormat()
  return format.read(content)
}

/**
 * 统一解析入口：自动阈值切换 Worker / 主线程
 *
 * @param content 数据内容（ArrayBuffer 或字符串）
 * @param onProgress 进度回调（仅 Worker 路径触发）
 * @returns 解析后的 GisDataInfo
 *
 * @example
 * const { parseData, isParsing, progress } = useDataParser()
 * const dataInfo = await parseData(buffer, p => console.log(p))
 */
export function useDataParser() {
  const isParsing = ref(false)
  const progress = ref(0)
  const usedWorker = ref(false)

  async function parseData(
    content: ArrayBuffer | string,
    onProgress?: (progress: number) => void,
  ): Promise<GisDataInfo> {
    isParsing.value = true
    progress.value = 0
    const size = content instanceof ArrayBuffer ? content.byteLength : content.length

    if (content instanceof ArrayBuffer && shouldUseWorker(size)) {
      usedWorker.value = true
      try {
        const result = await parseInWorker(content, (p) => {
          progress.value = p
          onProgress?.(p)
        })
        return result
      } catch (err) {
        // Worker 失败回退主线程（buffer 可能已被 transfer，需检查）
        if (content.byteLength > 0) {
          return await parseInMain(content)
        }
        throw err
      } finally {
        isParsing.value = false
      }
    }

    usedWorker.value = false
    try {
      const result = await parseInMain(content)
      progress.value = 100
      onProgress?.(100)
      return result
    } finally {
      isParsing.value = false
    }
  }

  return { parseData, isParsing, progress, usedWorker }
}
