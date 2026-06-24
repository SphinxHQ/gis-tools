/**
 * @file Coordinate reference system category enum
 * @description Defines the two CRS categories (Projected and Geographic) with value, label,
 *              color, and Element Plus tag type. Includes utility methods for lookup by
 *              boolean or value string, and a computed fullLabel getter.
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2026-06-23
 */
/**
 * 坐标系大类枚举
 * 统一管理「投影 / 地理」的 value、中文标签、展示颜色
 */
export class CrsCategory {
  static readonly Projected = new CrsCategory('projected', '投影', '#E6A23C', 'warning');
  static readonly Geographic = new CrsCategory('geographic', '地理', '#409EFF', 'success');

  private constructor(
    public readonly value: string,
    public readonly label: string,
    public readonly color: string,
    public readonly tagType: 'primary' | 'success' | 'info' | 'warning' | 'danger',
  ) {}

  static values(): CrsCategory[] {
    return [CrsCategory.Projected, CrsCategory.Geographic];
  }

  /** 根据 boolean 快捷查找：projected=true → Projected, false → Geographic */
  static fromProjected(projected: boolean): CrsCategory {
    return projected ? CrsCategory.Projected : CrsCategory.Geographic;
  }

  /** 根据 value 字符串查找 */
  static fromValue(value: string): CrsCategory | undefined {
    return this.values().find(item => item.value === value);
  }

  /** 完整描述，如「投影坐标系」「地理坐标系」 */
  get fullLabel(): string {
    return `${this.label}坐标系`;
  }

  toString(): string {
    return `CrsCategory.${this.value}`;
  }
}

export type CrsCategoryValue = CrsCategory['value'];
// 等价于: 'projected' | 'geographic'
