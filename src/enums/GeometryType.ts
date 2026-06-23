/**
 * GeoJSON 几何类型枚举类
 * 参考 RFC 7946 定义，每个实例携带 value / label / color 三元组
 */
export class GeometryType {
  // ---- 静态实例 ----
  static readonly Point = new GeometryType('Point', '点', '#4A90D9');
  static readonly MultiPoint = new GeometryType('MultiPoint', '多点', '#7B68EE');
  static readonly LineString = new GeometryType('LineString', '线', '#50C878');
  static readonly MultiLineString = new GeometryType('MultiLineString', '多线', '#3CB371');
  static readonly Polygon = new GeometryType('Polygon', '面', '#FF8C42');
  static readonly MultiPolygon = new GeometryType('MultiPolygon', '多面', '#DAA520');
  static readonly GeometryCollection = new GeometryType('GeometryCollection', '几何集合', '#B0BEC5');

  /**
   * 私有构造函数，外部不可 new
   * @param value GeoJSON type 字段值
   * @param label 中文描述
   * @param color 默认展示颜色
   */
  private constructor(
    public readonly value: string,
    public readonly label: string,
    public readonly color: string,
  ) {}

  // ---- 工具方法 ----

  /** 获取所有几何类型实例 */
  static values(): GeometryType[] {
    return [
      GeometryType.Point,
      GeometryType.MultiPoint,
      GeometryType.LineString,
      GeometryType.MultiLineString,
      GeometryType.Polygon,
      GeometryType.MultiPolygon,
      GeometryType.GeometryCollection,
    ];
  }

  /** 根据 GeoJSON type 字符串查找实例 */
  static fromValue(value: string): GeometryType | undefined {
    return this.values().find(item => item.value === value);
  }

  /** 判断是否为单一几何类型（排除 GeometryCollection） */
  isSingleGeometry(): boolean {
    return this !== GeometryType.GeometryCollection;
  }

  toString(): string {
    return `GeometryType.${this.value}`;
  }
}

/** 导出几何类型的字面量联合类型，方便 Props 等类型约束 */
export type GeometryTypeValue = GeometryType['value'];
// 等价于: 'Point' | 'MultiPoint' | 'LineString' | 'MultiLineString'
//         | 'Polygon' | 'MultiPolygon' | 'GeometryCollection'
