/**
 * @file Tip log level enum
 * @description Defines tip log levels (Info, Warn, Error) as an enum class with value, label,
 *              and Element Plus tag type. Replaces the original numeric enum in TipLogger.ts.
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2026-06-23
 */
/**
 * 提示日志级别枚举
 * 替代原 TipLogger.ts 中的数字 enum，改为枚举类携带 label / tagType
 */
export class TipLevel {
  static readonly Info = new TipLevel('info', '信息', 'primary');
  static readonly Warn = new TipLevel('warn', '警告', 'warning');
  static readonly Error = new TipLevel('error', '错误', 'danger');

  private constructor(
    public readonly value: string,
    public readonly label: string,
    public readonly tagType: string,
  ) {}

  static values(): TipLevel[] {
    return [TipLevel.Info, TipLevel.Warn, TipLevel.Error];
  }

  static fromValue(value: string): TipLevel | undefined {
    return this.values().find(item => item.value === value);
  }

  toString(): string {
    return `TipLevel.${this.value}`;
  }
}

export type TipLevelValue = TipLevel['value'];
