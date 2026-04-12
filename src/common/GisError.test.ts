import { describe, it, expect } from 'vitest'
import { GisError, GisErrorCode, handleError, createUserMessage } from '~/common/GisError'

describe('GisError 错误处理类', () => {
  // ============================================================================
  // 构造函数测试 - 4个用例
  // ============================================================================
  describe('构造函数', () => {
    it('TC-002-001: 应该使用错误码和消息创建实例', () => {
      const error = new GisError(GisErrorCode.DATA_PARSE_FAILED, '自定义错误消息')

      expect(error).toBeInstanceOf(GisError)
      expect(error.code).toBe(GisErrorCode.DATA_PARSE_FAILED)
      expect(error.message).toBe('自定义错误消息')
      expect(error.name).toBe('GisError')
    })

    it('TC-002-002: 应该使用默认消息（未提供时）', () => {
      const error = new GisError(GisErrorCode.COORDINATE_TRANSFORM_FAILED)

      expect(error.message).toBe('坐标转换失败')
      expect(error.code).toBe(GisErrorCode.COORDINATE_TRANSFORM_FAILED)
    })

    it('TC-002-003: 应该继承 Error 类', () => {
      const error = new GisError(GisErrorCode.UNKNOWN_ERROR)

      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(GisError)
      expect(error.stack).toBeDefined()
    })

    it('TC-002-004: 应该包含堆栈信息', () => {
      const error = new GisError(GisErrorCode.INVALID_GEOMETRY)

      expect(error.stack).toBeDefined()
      expect(error.stack).toContain('GisError')
    })
  })

  // ============================================================================
  // 错误码枚举测试 - 16个用例（覆盖所有枚举值）
  // ============================================================================
  describe('错误码枚举', () => {
    it('应该包含 COORDINATE_TRANSFORM_FAILED', () => {
      expect(GisErrorCode.COORDINATE_TRANSFORM_FAILED).toBe('COORDINATE_TRANSFORM_FAILED')
    })

    it('应该包含 CRS_NOT_FOUND', () => {
      expect(GisErrorCode.CRS_NOT_FOUND).toBe('CRS_NOT_FOUND')
    })

    it('应该包含 CRS_RECOGNITION_FAILED', () => {
      expect(GisErrorCode.CRS_RECOGNITION_FAILED).toBe('CRS_RECOGNITION_FAILED')
    })

    it('应该包含 DATA_PARSE_FAILED', () => {
      expect(GisErrorCode.DATA_PARSE_FAILED).toBe('DATA_PARSE_FAILED')
    })

    it('应该包含 DATA_FORMAT_UNSUPPORTED', () => {
      expect(GisErrorCode.DATA_FORMAT_UNSUPPORTED).toBe('DATA_FORMAT_UNSUPPORTED')
    })

    it('应该包含 DATA_VALIDATION_FAILED', () => {
      expect(GisErrorCode.DATA_VALIDATION_FAILED).toBe('DATA_VALIDATION_FAILED')
    })

    it('应该包含 STORAGE_READ_FAILED', () => {
      expect(GisErrorCode.STORAGE_READ_FAILED).toBe('STORAGE_READ_FAILED')
    })

    it('应该包含 STORAGE_WRITE_FAILED', () => {
      expect(GisErrorCode.STORAGE_WRITE_FAILED).toBe('STORAGE_WRITE_FAILED')
    })

    it('应该包含 STORAGE_NOT_SUPPORTED', () => {
      expect(GisErrorCode.STORAGE_NOT_SUPPORTED).toBe('STORAGE_NOT_SUPPORTED')
    })

    it('应该包含 MAP_INIT_FAILED', () => {
      expect(GisErrorCode.MAP_INIT_FAILED).toBe('MAP_INIT_FAILED')
    })

    it('应该包含 MAP_OPERATION_FAILED', () => {
      expect(GisErrorCode.MAP_OPERATION_FAILED).toBe('MAP_OPERATION_FAILED')
    })

    it('应该包含 FEATURE_NOT_FOUND', () => {
      expect(GisErrorCode.FEATURE_NOT_FOUND).toBe('FEATURE_NOT_FOUND')
    })

    it('应该包含 INVALID_COORDINATE', () => {
      expect(GisErrorCode.INVALID_COORDINATE).toBe('INVALID_COORDINATE')
    })

    it('应该包含 INVALID_GEOMETRY', () => {
      expect(GisErrorCode.INVALID_GEOMETRY).toBe('INVALID_GEOMETRY')
    })

    it('应该包含 UNKNOWN_ERROR', () => {
      expect(GisErrorCode.UNKNOWN_ERROR).toBe('UNKNOWN_ERROR')
    })

    it('应该有对应的错误消息', () => {
      const codes = Object.values(GisErrorCode)
      codes.forEach(code => {
        const error = new GisError(code)
        expect(error.message).toBeDefined()
        expect(typeof error.message).toBe('string')
      })
    })
  })

  // ============================================================================
  // handleError 函数测试
  // ============================================================================
  describe('handleError()', () => {
    it('应该返回已有的 GisError', () => {
      const gisError = new GisError(GisErrorCode.DATA_PARSE_FAILED, '测试错误')
      const result = handleError(gisError)

      expect(result).toBe(gisError)
    })

    it('应该将标准 Error 转换为 GisError', () => {
      const standardError = new Error('标准错误')
      const result = handleError(standardError)

      expect(result).toBeInstanceOf(GisError)
      expect(result.code).toBe(GisErrorCode.UNKNOWN_ERROR)
      expect(result.message).toBe('标准错误')
    })

    it('应该处理字符串错误', () => {
      const result = handleError('字符串错误')

      expect(result).toBeInstanceOf(GisError)
      expect(result.message).toBe('字符串错误')
    })

    it('应该处理未知类型错误', () => {
      const result = handleError({ custom: 'error' })

      expect(result).toBeInstanceOf(GisError)
      expect(result.message).toContain('[object Object]')
    })
  })

  // ============================================================================
  // createUserMessage 函数测试
  // ============================================================================
  describe('createUserMessage()', () => {
    it('应该从 GisError 提取消息', () => {
      const error = new GisError(GisErrorCode.INVALID_GEOMETRY, '几何无效')
      const message = createUserMessage(error)

      expect(message).toBe('几何无效')
    })

    it('应该从 Error 提取消息', () => {
      const error = new Error('普通错误')
      const message = createUserMessage(error)

      expect(message).toBe('普通错误')
    })

    it('应该将其他类型转换为字符串', () => {
      const message = createUserMessage('简单字符串')
      expect(message).toBe('简单字符串')
    })
  })

  // ============================================================================
  // 兼容性测试
  // ============================================================================
  describe('兼容性', () => {
    it('应该可以被 try-catch 捕获', () => {
      try {
        throw new GisError(GisErrorCode.DATA_PARSE_FAILED, '测试')
      } catch (e) {
        expect(e).toBeInstanceOf(GisError)
        expect(e).toBeInstanceOf(Error)
      }
    })

    it('应该支持 Error 的标准方法', () => {
      const error = new GisError(GisErrorCode.UNKNOWN_ERROR)

      expect(typeof error.toString()).toBe('string')
      expect(error.message).toBeDefined()
    })
  })
})
