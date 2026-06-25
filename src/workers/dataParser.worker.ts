/**
 * @file Data parser Web Worker
 * @description 在 Web Worker 中执行大文件解析，避免阻塞主线程 UI 渲染。
 *              复用主线程 DataFormat.ts 的解析逻辑（Vite Worker 支持 ES Module import）。
 *              错误需序列化为 plain object 传输，主线程重建为 GisError 实例。
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2026-06-25
 */
import { GisError, GisErrorCode } from '~/common/GisError'
import { SimpleDataFormat } from '~/components/data/DataFormat'
import type GisDataInfo from '~/components/data/GisDataInfo'

/** Worker 接收消息类型 */
interface WorkerRequest {
  buffer: ArrayBuffer
  id: number
}

/** Worker 发送消息类型（联合） */
type WorkerResponse =
  | { type: 'progress'; id: number; progress: number }
  | { type: 'success'; id: number; dataInfo: GisDataInfo }
  | { type: 'error'; id: number; error: SerializedGisError }

/** 序列化后的 GisError（可被 postMessage 传输） */
interface SerializedGisError {
  isGisError: true
  code: GisErrorCode
  message: string
}

/** 序列化 GisError 为 plain object */
function serializeError(err: unknown): SerializedGisError {
  if (err instanceof GisError) {
    return { isGisError: true, code: err.code, message: err.message }
  }
  return {
    isGisError: true,
    code: GisErrorCode.DATA_PARSE_FAILED,
    message: err instanceof Error ? err.message : String(err),
  }
}

const format = new SimpleDataFormat()

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const { buffer, id } = e.data
  try {
    // 进度通知（解析前）
    ;(self as unknown as Worker).postMessage({ type: 'progress', id, progress: 0 })
    // 执行解析（复用主线程 DataFormat 逻辑）
    const dataInfo = await format.read(buffer)
    ;(self as unknown as Worker).postMessage({ type: 'progress', id, progress: 100 })
    ;(self as unknown as Worker).postMessage({ type: 'success', id, dataInfo })
  } catch (err) {
    ;(self as unknown as Worker).postMessage({ type: 'error', id, error: serializeError(err) })
  }
}
