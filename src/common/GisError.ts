import {logger} from '~/common/logger'

export enum GisErrorCode {
    COORDINATE_TRANSFORM_FAILED = 'COORDINATE_TRANSFORM_FAILED',
    CRS_NOT_FOUND = 'CRS_NOT_FOUND',
    CRS_RECOGNITION_FAILED = 'CRS_RECOGNITION_FAILED',
    DATA_PARSE_FAILED = 'DATA_PARSE_FAILED',
    DATA_FORMAT_UNSUPPORTED = 'DATA_FORMAT_UNSUPPORTED',
    DATA_VALIDATION_FAILED = 'DATA_VALIDATION_FAILED',
    STORAGE_READ_FAILED = 'STORAGE_READ_FAILED',
    STORAGE_WRITE_FAILED = 'STORAGE_WRITE_FAILED',
    STORAGE_NOT_SUPPORTED = 'STORAGE_NOT_SUPPORTED',
    MAP_INIT_FAILED = 'MAP_INIT_FAILED',
    MAP_OPERATION_FAILED = 'MAP_OPERATION_FAILED',
    FEATURE_NOT_FOUND = 'FEATURE_NOT_FOUND',
    INVALID_COORDINATE = 'INVALID_COORDINATE',
    INVALID_GEOMETRY = 'INVALID_GEOMETRY',
    UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

const ERROR_MESSAGES: Record<GisErrorCode, string> = {
    [GisErrorCode.COORDINATE_TRANSFORM_FAILED]: '坐标转换失败',
    [GisErrorCode.CRS_NOT_FOUND]: '坐标系未找到',
    [GisErrorCode.CRS_RECOGNITION_FAILED]: '坐标系识别失败',
    [GisErrorCode.DATA_PARSE_FAILED]: '数据解析失败',
    [GisErrorCode.DATA_FORMAT_UNSUPPORTED]: '不支持的数据格式',
    [GisErrorCode.DATA_VALIDATION_FAILED]: '数据验证失败',
    [GisErrorCode.STORAGE_READ_FAILED]: '存储读取失败',
    [GisErrorCode.STORAGE_WRITE_FAILED]: '存储写入失败',
    [GisErrorCode.STORAGE_NOT_SUPPORTED]: '浏览器不支持本地存储',
    [GisErrorCode.MAP_INIT_FAILED]: '地图初始化失败',
    [GisErrorCode.MAP_OPERATION_FAILED]: '地图操作失败',
    [GisErrorCode.FEATURE_NOT_FOUND]: '要素未找到',
    [GisErrorCode.INVALID_COORDINATE]: '无效坐标',
    [GisErrorCode.INVALID_GEOMETRY]: '无效几何',
    [GisErrorCode.UNKNOWN_ERROR]: '未知错误',
}

export class GisError extends Error {
    code: GisErrorCode
    detail?: unknown

    constructor(code: GisErrorCode, message?: string, detail?: unknown) {
        super(message || ERROR_MESSAGES[code])
        this.name = 'GisError'
        this.code = code
        this.detail = detail
    }
}

export function handleError(error: unknown, context?: string): GisError {
    if (error instanceof GisError) {
        logger.error(`[${error.code}] ${context ? context + ': ' : ''}${error.message}`, error.detail)
        return error
    }

    if (error instanceof Error) {
        logger.error(`${context ? context + ': ' : ''}${error.message}`, error)
        return new GisError(GisErrorCode.UNKNOWN_ERROR, error.message, error)
    }

    const message = typeof error === 'string' ? error : String(error)
    logger.error(`${context ? context + ': ' : ''}${message}`)
    return new GisError(GisErrorCode.UNKNOWN_ERROR, message, error)
}

export function createUserMessage(error: unknown): string {
    if (error instanceof GisError) {
        const baseMsg = ERROR_MESSAGES[error.code] || error.code
        // 如果 message 跟默认描述不同（即携带了详细信息），拼接展示
        if (error.message && error.message !== baseMsg) {
            return `${baseMsg}\n\n${error.message}`
        }
        return baseMsg
    }
    if (error instanceof Error) {
        return error.message
    }
    return String(error)
}
