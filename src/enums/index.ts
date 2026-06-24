/**
 * @file Enum barrel exports
 * @description Central export point for all GIS-related enums including geometry types,
 *              coordinate reference system categories, draw tool types, data types, and tip levels.
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2026-06-23
 */
export { GeometryType } from './GeometryType'
export type { GeometryTypeValue } from './GeometryType'

export { CrsCategory } from './CrsCategory'
export type { CrsCategoryValue } from './CrsCategory'

/* [UNUSED] DrawType - 无任何业务代码引用
export { DrawType } from './DrawType'
export type { DrawTypeValue } from './DrawType'
*/

export { GisDataType } from './GisDataType'
export type { GisDataTypeValue } from './GisDataType'

export { TipLevel } from './TipLevel'
export type { TipLevelValue } from './TipLevel'
