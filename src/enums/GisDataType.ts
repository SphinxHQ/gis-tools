/**
 * @file GIS data format type enum
 * @description Defines all supported spatial data format types (GeoJSON, WKT, WKB, Shapefile, DXF, etc.)
 *              as an enum class with value and label. Replaces the original numeric enum in GisDataInfo.ts.
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2026-06-23
 */
/**
 * GIS 数据格式类型枚举
 * 替代原 GisDataInfo.ts 中的数字 enum，改为枚举类携带 label
 */
export class GisDataType {
  static readonly Base64 = new GisDataType('Base64', 'Base64编码');
  static readonly GeoJson = new GisDataType('GeoJson', 'GeoJSON');
  static readonly Wkt = new GisDataType('Wkt', 'WKT');
  static readonly Wkb = new GisDataType('Wkb', 'WKB');
  static readonly Exchange = new GisDataType('Exchange', '电子报盘');
  static readonly Csv = new GisDataType('Csv', 'CSV');
  static readonly ResponseBase = new GisDataType('ResponseBase', 'ANTU响应');
  static readonly ShapeFile = new GisDataType('ShapeFile', 'ShapeFile');
  static readonly ShapeZip = new GisDataType('ShapeZip', 'ShapeZip');
  static readonly EXF = new GisDataType('EXF', 'EXF');
  static readonly DXF = new GisDataType('DXF', 'DXF');

  private constructor(
    public readonly value: string,
    public readonly label: string,
  ) {}

  static values(): GisDataType[] {
    return [
      GisDataType.Base64, GisDataType.GeoJson, GisDataType.Wkt, GisDataType.Wkb,
      GisDataType.Exchange, GisDataType.Csv, GisDataType.ResponseBase,
      GisDataType.ShapeFile, GisDataType.ShapeZip, GisDataType.EXF, GisDataType.DXF,
    ];
  }

  static fromValue(value: string): GisDataType | undefined {
    return this.values().find(item => item.value === value);
  }

  toString(): string {
    return `GisDataType.${this.value}`;
  }
}

export type GisDataTypeValue = GisDataType['value'];
