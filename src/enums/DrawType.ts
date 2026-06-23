/**
 * 绘制工具类型枚举
 * 统一管理地图绘制工具的 type 字面量
 */
export class DrawType {
  static readonly Point = new DrawType('Point');
  static readonly LineString = new DrawType('LineString');
  static readonly Polygon = new DrawType('Polygon');
  static readonly None = new DrawType('None');

  private constructor(
    public readonly value: string,
  ) {}

  static values(): DrawType[] {
    return [DrawType.Point, DrawType.LineString, DrawType.Polygon, DrawType.None];
  }

  static fromValue(value: string): DrawType | undefined {
    return this.values().find(item => item.value === value);
  }

  toString(): string {
    return `DrawType.${this.value}`;
  }
}

export type DrawTypeValue = DrawType['value'];
// 等价于: 'Point' | 'LineString' | 'Polygon' | 'None'
