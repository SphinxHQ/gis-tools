/**
 * @file GIS error handling
 * @description Defines the GisError class, GisErrorCode enum, and error handling utilities.
 *              Provides structured error codes, default messages, logging, and user-friendly
 *              message generation for all GIS-related operations.
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2026-04-13
 */

/**
 * Enumeration of all GIS error codes
 */
export enum GisErrorCode {
    /** Coordinate transformation failed */
    COORDINATE_TRANSFORM_FAILED = 'COORDINATE_TRANSFORM_FAILED',
    /** Coordinate reference system not found */
    CRS_NOT_FOUND = 'CRS_NOT_FOUND',
    /** CRS recognition failed */
    CRS_RECOGNITION_FAILED = 'CRS_RECOGNITION_FAILED',
    /** Data parsing failed */
    DATA_PARSE_FAILED = 'DATA_PARSE_FAILED',
    /** Data format not supported */
    DATA_FORMAT_UNSUPPORTED = 'DATA_FORMAT_UNSUPPORTED',
    /** Data validation failed */
    DATA_VALIDATION_FAILED = 'DATA_VALIDATION_FAILED',
    /** Storage read failed */
    STORAGE_READ_FAILED = 'STORAGE_READ_FAILED',
    /** Storage write failed */
    STORAGE_WRITE_FAILED = 'STORAGE_WRITE_FAILED',
    /** Browser does not support local storage */
    STORAGE_NOT_SUPPORTED = 'STORAGE_NOT_SUPPORTED',
    /** Map initialization failed */
    MAP_INIT_FAILED = 'MAP_INIT_FAILED',
    /** Map operation failed */
    MAP_OPERATION_FAILED = 'MAP_OPERATION_FAILED',
    /** Feature not found */
    FEATURE_NOT_FOUND = 'FEATURE_NOT_FOUND',
    /** Invalid coordinate */
    INVALID_COORDINATE = 'INVALID_COORDINATE',
    /** Invalid geometry */
    INVALID_GEOMETRY = 'INVALID_GEOMETRY',
    /** Unknown error */
    UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/** Default Chinese error messages for each error code */
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

/**
 * Structured GIS error with error code and optional detail
 */
export class GisError extends Error {
    /** Error code identifying the type of error */
    code: GisErrorCode
    /** Additional error detail (e.g., original error object) */
    detail?: unknown

    /**
     * Create a GisError
     * @param code - Error code from GisErrorCode enum
     * @param message - Optional custom message (defaults to the standard message for the code)
     * @param detail - Optional additional detail
     */
    constructor(code: GisErrorCode, message?: string, detail?: unknown) {
        super(message || ERROR_MESSAGES[code])
        this.name = 'GisError'
        this.code = code
        this.detail = detail
    }
}

/**
 * Handle an unknown error, logging it and converting to a GisError
 * @param error - The caught error (can be any type)
 * @param context - Optional context string for logging
 * @returns A GisError instance
 */
/* export function handleError(error: unknown, context?: string): GisError {
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
} */

/**
 * Generate a user-friendly error message
 * @param error - The error to generate a message for
 * @returns A human-readable error message string
 */
export function createUserMessage(error: unknown): string {
    if (error instanceof GisError) {
        const baseMsg = ERROR_MESSAGES[error.code] || error.code
        // If message differs from default (i.e., carries detailed info), concatenate for display
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
