/**
 * @file Geometry validator
 * @description Provides strict geometry validation using Turf.js including coordinate validation,
 *              self-intersection detection, polygon ring orientation checking, and hole validation.
 *              Returns structured validation results with errors and warnings.
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2026-04-13
 */
import * as turf from '@turf/turf'
import type {Geometry, Feature, FeatureCollection, Position, Polygon, MultiPolygon, GeometryCollection} from 'geojson'

import {GisError, GisErrorCode} from '~/common/GisError'

/**
 * Result of coordinate validation
 */
export interface CoordinateValidationResult {
    /** Whether all coordinates are valid */
    isValid: boolean
    /** Array of coordinate errors */
    errors: CoordinateError[]
    /** Array of coordinate warnings */
    warnings: CoordinateWarning[]
}

/**
 * Represents a coordinate validation error
 */
export interface CoordinateError {
    /** Path to the invalid coordinate */
    path: string
    /** Error message */
    message: string
    /** The invalid value */
    value?: unknown
}

/**
 * Represents a coordinate validation warning
 */
export interface CoordinateWarning {
    /** Path to the coordinate */
    path: string
    /** Warning message */
    message: string
    value?: unknown
}

/**
 * Result of full geometry validation
 */
export interface GeometryValidationResult {
    /** Whether the geometry is valid */
    isValid: boolean
    /** Array of geometry errors */
    errors: GeometryError[]
    /** Array of geometry warnings */
    warnings: GeometryWarning[]
}

/**
 * Represents a geometry validation error
 */
export interface GeometryError {
    /** Type of geometry error */
    type: 'self_intersection' | 'ring_orientation' | 'unclosed_ring' | 'too_few_points' | 'invalid_coordinate' | 'empty_geometry' | 'degenerate_ring' | 'hole_outside_shell' | 'nested_holes' | 'duplicate_vertices' | 'hole_intersect_shell' | 'holes_overlap' | 'validation_exception'
    /** Error message */
    message: string
    /** Optional path to the error location */
    path?: string
}

/**
 * Represents a geometry validation warning
 */
export interface GeometryWarning {
    /** Type of warning */
    type: 'suspicious_coordinate' | 'near_zero_coordinate'
    /** Warning message */
    message: string
    /** Optional path to the warning location */
    path?: string
}

/**
 * 几何验证选项
 */
export interface GeometryValidationOptions {
    /** 是否检查自相交 */
    checkSelfIntersection?: boolean;
    /** 是否检查环方向 */
    checkRingOrientation?: boolean;
    /** 是否检查孔洞位置 */
    checkHolePosition?: boolean;
    /** 是否检查重复顶点 */
    checkDuplicateVertices?: boolean;
    /** 环方向：true 表示外环顺时针，false 表示外环逆时针 */
    shellClockwise?: boolean;
    /** 环闭合检查容差（度），默认 0.0000001 */
    ringClosedTolerance?: number;
    /** 重复顶点检测容差（度），默认 0.0000001 */
    duplicateTolerance?: number;
    /** 最小有效面积（平方米），小于此值视为退化几何，默认 0.0001 */
    minValidArea?: number;
    /** 是否将 (0,0) 坐标视为错误（false 则为警告），默认 false */
    strictZeroCoordinate?: boolean;
}

/**
 * 默认验证选项
 */
const DEFAULT_OPTIONS: Required<Omit<GeometryValidationOptions, 'shellClockwise'>> & { shellClockwise: boolean } = {
    checkSelfIntersection: true,
    checkRingOrientation: true,
    checkHolePosition: true,
    checkDuplicateVertices: true,
    shellClockwise: true,
    ringClosedTolerance: 0.0000001,
    duplicateTolerance: 0.0000001,
    minValidArea: 0.0001,
    strictZeroCoordinate: false,
}

export function validateCoordinate(
    coord: unknown,
    path = '',
    options: { strictZeroCoordinate?: boolean } = {}
): CoordinateValidationResult {
    const errors: CoordinateError[] = []
    const warnings: CoordinateWarning[] = []
    const { strictZeroCoordinate = false } = options

    if (!Array.isArray(coord)) {
        errors.push({path, message: '坐标不是数组', value: coord})
        return {isValid: false, errors, warnings}
    }

    if (coord.length < 2) {
        errors.push({path, message: '坐标维度不足2', value: coord})
    }

    if (coord.length >= 2) {
        const lon = coord[0]
        const lat = coord[1]

        if (typeof lon !== 'number' || isNaN(lon)) {
            errors.push({path: `${path}[0]`, message: '经度不是有效数字', value: lon})
        }
        if (typeof lat !== 'number' || isNaN(lat)) {
            errors.push({path: `${path}[1]`, message: '纬度不是有效数字', value: lat})
        }

        if (typeof lon === 'number' && !isNaN(lon) && (lon < -180 || lon > 180)) {
            errors.push({path: `${path}[0]`, message: '经度超出范围[-180,180]', value: lon})
        }
        if (typeof lat === 'number' && !isNaN(lat) && (lat < -90 || lat > 90)) {
            errors.push({path: `${path}[1]`, message: '纬度超出范围[-90,90]', value: lat})
        }

        // (0,0) 坐标处理：默认为警告，仅在 strictZeroCoordinate=true 时视为错误
        if (lon === 0 && lat === 0 && errors.length === 0) {
            if (strictZeroCoordinate) {
                errors.push({path, message: '坐标为(0,0)可能是无效数据', value: coord})
            } else {
                warnings.push({path, message: '坐标为(0,0)可能是无效数据，请确认是否为几内亚湾区域', value: coord})
            }
        }
    }

    if (coord.length >= 3 && (typeof coord[2] !== 'number' || isNaN(coord[2]))) {
        errors.push({path: `${path}[2]`, message: '高程值不是有效数字', value: coord[2]})
    }

    return {isValid: errors.length === 0, errors, warnings}
}

export function validateCoordinates(
    coords: Position[],
    path = '',
    options: { strictZeroCoordinate?: boolean } = {}
): CoordinateValidationResult {
    const allErrors: CoordinateError[] = []
    const allWarnings: CoordinateWarning[] = []

    if (!Array.isArray(coords) || coords.length === 0) {
        allErrors.push({path, message: '坐标数组为空'})
        return {isValid: false, errors: allErrors, warnings: allWarnings}
    }

    for (let i = 0; i < coords.length; i++) {
        const result = validateCoordinate(coords[i], `${path}[${i}]`, options)
        allErrors.push(...result.errors)
        allWarnings.push(...result.warnings)
    }

    return {isValid: allErrors.length === 0, errors: allErrors, warnings: allWarnings}
}

export function validateGeometry(
    geometry: Geometry | GeometryCollection,
    path = '',
    options: GeometryValidationOptions = {}
): GeometryValidationResult {
    const errors: GeometryError[] = []
    const warnings: GeometryWarning[] = []
    const { ringClosedTolerance = DEFAULT_OPTIONS.ringClosedTolerance } = options

    if (!geometry || !geometry.type) {
        errors.push({type: 'empty_geometry', message: '几何对象为空或缺少type属性', path})
        return {isValid: false, errors, warnings}
    }

    // 处理 GeometryCollection 类型
    if (geometry.type === 'GeometryCollection') {
        const geometries = (geometry as GeometryCollection).geometries
        if (!geometries || geometries.length === 0) {
            errors.push({type: 'empty_geometry', message: 'GeometryCollection 为空', path})
            return {isValid: false, errors, warnings}
        }
        for (let i = 0; i < geometries.length; i++) {
            const subResult = validateGeometry(geometries[i], `${path}.geometries[${i}]`, options)
            errors.push(...subResult.errors)
            warnings.push(...subResult.warnings)
        }
        return {isValid: errors.length === 0, errors, warnings}
    }

    const coords = (geometry as { coordinates?: unknown }).coordinates
    if (!coords) {
        errors.push({type: 'empty_geometry', message: `几何对象缺少coordinates: ${geometry.type}`, path})
        return {isValid: false, errors, warnings}
    }

    switch (geometry.type) {
        case 'Point': {
            const result = validateCoordinate(coords as Position, `${path}.coordinates`, options)
            result.errors.forEach(e => errors.push({type: 'invalid_coordinate', message: e.message, path: e.path}))
            result.warnings.forEach(w => warnings.push({type: 'suspicious_coordinate', message: w.message, path: w.path}))
            break
        }
        case 'LineString': {
            const positions = coords as Position[]
            if (positions.length < 2) {
                errors.push({type: 'too_few_points', message: 'LineString至少需要2个点', path})
            }
            const result = validateCoordinates(positions, `${path}.coordinates`, options)
            result.errors.forEach(e => errors.push({type: 'invalid_coordinate', message: e.message, path: e.path}))
            result.warnings.forEach(w => warnings.push({type: 'suspicious_coordinate', message: w.message, path: w.path}))
            break
        }
        case 'Polygon': {
            const rings = coords as Position[][]
            if (rings.length === 0) {
                errors.push({type: 'empty_geometry', message: 'Polygon至少需要一个环', path})
                break
            }
            for (let i = 0; i < rings.length; i++) {
                const ring = rings[i]
                if (ring.length < 4) {
                    errors.push({type: 'too_few_points', message: `环[${i}]至少需要4个点(含闭合点)`, path: `${path}.coordinates[${i}]`})
                }
                // 使用容差检查环闭合，与 isRingClosed 保持一致
                const first = ring[0]
                const last = ring[ring.length - 1]
                if (first && last) {
                    const dx = Math.abs(first[0] - last[0])
                    const dy = Math.abs(first[1] - last[1])
                    if (dx > ringClosedTolerance || dy > ringClosedTolerance) {
                        errors.push({type: 'unclosed_ring', message: `环[${i}]未闭合`, path: `${path}.coordinates[${i}]`})
                    }
                }
                const result = validateCoordinates(ring, `${path}.coordinates[${i}]`, options)
                result.errors.forEach(e => errors.push({type: 'invalid_coordinate', message: e.message, path: e.path}))
                result.warnings.forEach(w => warnings.push({type: 'suspicious_coordinate', message: w.message, path: w.path}))
            }
            break
        }
        case 'MultiPoint': {
            const result = validateCoordinates(coords as Position[], `${path}.coordinates`, options)
            result.errors.forEach(e => errors.push({type: 'invalid_coordinate', message: e.message, path: e.path}))
            result.warnings.forEach(w => warnings.push({type: 'suspicious_coordinate', message: w.message, path: w.path}))
            break
        }
        case 'MultiLineString': {
            const lines = coords as Position[][]
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].length < 2) {
                    errors.push({type: 'too_few_points', message: `LineString[${i}]至少需要2个点`, path: `${path}.coordinates[${i}]`})
                }
                const result = validateCoordinates(lines[i], `${path}.coordinates[${i}]`, options)
                result.errors.forEach(e => errors.push({type: 'invalid_coordinate', message: e.message, path: e.path}))
                result.warnings.forEach(w => warnings.push({type: 'suspicious_coordinate', message: w.message, path: w.path}))
            }
            break
        }
        case 'MultiPolygon': {
            const polygons = coords as Position[][][]
            for (let i = 0; i < polygons.length; i++) {
                const subResult = validateGeometry(
                    {type: 'Polygon', coordinates: polygons[i]} as Geometry,
                    `${path}.coordinates[${i}]`,
                    options
                )
                errors.push(...subResult.errors)
                warnings.push(...subResult.warnings)
            }
            break
        }
        default:
            break
    }

    return {isValid: errors.length === 0, errors, warnings}
}

export function validateFeature(feature: Feature, options: GeometryValidationOptions = {}): GeometryValidationResult {
    if (!feature.geometry) {
        return {isValid: false, errors: [{type: 'empty_geometry', message: 'Feature缺少geometry'}], warnings: []}
    }
    return validateGeometry(feature.geometry, '', options)
}

export function validateFeatureCollection(fc: FeatureCollection, options: GeometryValidationOptions = {}): GeometryValidationResult {
    const allErrors: GeometryError[] = []
    const allWarnings: GeometryWarning[] = []

    if (!fc.features || fc.features.length === 0) {
        allErrors.push({type: 'empty_geometry', message: 'FeatureCollection为空'})
        return {isValid: false, errors: allErrors, warnings: allWarnings}
    }

    for (let i = 0; i < fc.features.length; i++) {
        const result = validateFeature(fc.features[i], options)
        result.errors.forEach(e => {
            allErrors.push({...e, path: `features[${i}].${e.path || ''}`})
        })
        result.warnings.forEach(w => {
            allWarnings.push({...w, path: `features[${i}].${w.path || ''}`})
        })
    }

    return {isValid: allErrors.length === 0, errors: allErrors, warnings: allWarnings}
}

/**
 * 自相交检查结果
 */
export interface SelfIntersectionResult {
    /** 是否有效（无自相交） */
    isValid: boolean;
    /** 错误信息 */
    error?: string;
    /** 自相交点坐标 */
    intersectionPoints?: Position[];
}

/**
 * 检查几何是否存在自相交（详细版）
 *
 * @param geometry 几何对象
 * @returns 检查结果对象，包含是否有效、错误信息和交点坐标
 */
export function checkSelfIntersectionDetailed(geometry: Geometry | GeometryCollection): SelfIntersectionResult {
    try {
        if (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon') {
            const feature = {type: 'Feature' as const, geometry: geometry as Polygon | MultiPolygon, properties: {}}
            const kinksResult = turf.kinks(feature)
            if (kinksResult.features.length > 0) {
                return {
                    isValid: false,
                    error: `发现 ${kinksResult.features.length} 个自相交点`,
                    intersectionPoints: kinksResult.features.map(f => f.geometry.coordinates)
                }
            }
            return { isValid: true }
        }
        // GeometryCollection 需要递归检查
        if (geometry.type === 'GeometryCollection') {
            const gc = geometry as GeometryCollection
            for (let i = 0; i < gc.geometries.length; i++) {
                const result = checkSelfIntersectionDetailed(gc.geometries[i])
                if (!result.isValid) {
                    return { ...result, error: `geometries[${i}]: ${result.error}` }
                }
            }
            return { isValid: true }
        }
        return { isValid: true }
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e)
        return {
            isValid: false,
            error: `自相交检查异常: ${errorMessage}`
        }
    }
}

/**
 * 检查几何是否存在自相交（简化版，只返回布尔值）
 *
 * @param geometry 几何对象
 * @returns true 表示无自相交，false 表示存在自相交或检查异常
 */
export function checkSelfIntersectionFn(geometry: Geometry | GeometryCollection): boolean {
    return checkSelfIntersectionDetailed(geometry).isValid
}

/**
 * 检查几何是否存在自相交（向后兼容别名）
 * @deprecated 建议使用 checkSelfIntersectionDetailed 获取详细信息，或使用 checkSelfIntersectionFn 获取布尔结果
 */
export const checkSelfIntersection = checkSelfIntersectionFn;

/**
 * 检查多边形是否为退化几何（面积为0或接近0）
 *
 * @param geometry 多边形几何
 * @param minArea 最小有效面积（平方米），默认 0.0001
 * @returns true 表示有效，false 表示退化
 */
export function checkDegeneratePolygon(geometry: Polygon | MultiPolygon, minArea: number = DEFAULT_OPTIONS.minValidArea): boolean {
    try {
        const feature = { type: 'Feature' as const, geometry, properties: {} };
        const area = turf.area(feature);
        return area > minArea;
    } catch {
        return false;
    }
}

/**
 * 检查孔洞是否在外环内部（完整检查，包括边相交检测）
 *
 * @param shell 外环坐标
 * @param hole 孔洞坐标
 * @returns { isInside: boolean, reason?: string }
 */
export function checkHoleInsideShellComplete(shell: Position[], hole: Position[]): { isInside: boolean; reason?: string } {
    try {
        const shellPolygon = turf.polygon([shell]);
        const holePolygon = turf.polygon([hole]);

        // 1. 检查孔洞的每个点是否在外环内
        for (let i = 0; i < hole.length - 1; i++) { // 排除闭合点
            const point = hole[i];
            const pt = turf.point(point);
            if (!turf.booleanPointInPolygon(pt, shellPolygon)) {
                return { isInside: false, reason: `孔洞顶点[${i}]不在外环内部` };
            }
        }

        // 2. 检查孔洞边是否与外环边相交（孔洞不应该穿出外环）
        const shellLine = turf.lineString(shell);
        const holeLine = turf.lineString(hole);

        // 如果孔洞边与外环边相交，说明孔洞可能穿出外环
        if (turf.booleanCrosses(holeLine, shellLine)) {
            return { isInside: false, reason: '孔洞边与外环边相交，孔洞可能穿出外环' };
        }

        // 3. 检查孔洞是否完全在外环内部（使用 turf.booleanWithin）
        if (!turf.booleanWithin(holePolygon, shellPolygon)) {
            return { isInside: false, reason: '孔洞未完全在外环内部' };
        }

        return { isInside: true };
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        return { isInside: false, reason: `检查异常: ${errorMessage}` };
    }
}

/**
 * 检查孔洞是否在外环内部（简化版，向后兼容）
 *
 * @param shell 外环坐标
 * @param hole 孔洞坐标
 * @returns true 表示孔洞在外环内部
 */
export function checkHoleInsideShell(shell: Position[], hole: Position[]): boolean {
    return checkHoleInsideShellComplete(shell, hole).isInside;
}

/**
 * 检查孔洞之间是否重叠或相交
 *
 * @param holes 孔洞数组
 * @returns 检查结果
 */
export function checkHolesOverlap(holes: Position[][]): { hasOverlap: boolean; pairs: Array<[number, number]> } {
    const pairs: Array<[number, number]> = [];

    for (let i = 0; i < holes.length; i++) {
        for (let j = i + 1; j < holes.length; j++) {
            try {
                const hole1 = turf.polygon([holes[i]]);
                const hole2 = turf.polygon([holes[j]]);

                // 检查两个孔洞是否相交或重叠
                if (turf.booleanIntersects(hole1, hole2) || turf.booleanOverlap(hole1, hole2)) {
                    pairs.push([i, j]);
                }
            } catch {
                // 忽略异常，继续检查其他对
            }
        }
    }

    return { hasOverlap: pairs.length > 0, pairs };
}

/**
 * 检查是否存在孔洞嵌套（一个孔洞包含另一个孔洞）
 *
 * @param holes 孔洞数组
 * @returns 检查结果
 */
export function checkNestedHoles(holes: Position[][]): { hasNested: boolean; pairs: Array<[outerIndex: number, innerIndex: number]> } {
    const pairs: Array<[number, number]> = [];

    for (let i = 0; i < holes.length; i++) {
        for (let j = 0; j < holes.length; j++) {
            if (i === j) continue;
            try {
                const hole1 = turf.polygon([holes[i]]);
                const hole2 = turf.polygon([holes[j]]);

                // 检查 hole1 是否包含 hole2
                if (turf.booleanContains(hole1, hole2)) {
                    pairs.push([i, j]);
                }
            } catch {
                // 忽略异常
            }
        }
    }

    return { hasNested: pairs.length > 0, pairs };
}

/**
 * 重复顶点检测结果
 */
export interface DuplicateVerticesResult {
    /** 是否存在重复顶点 */
    hasDuplicates: boolean;
    /** 重复顶点对：[重复点索引, 原始点索引] */
    duplicatePairs: Array<[duplicateIndex: number, originalIndex: number]>;
    /** 所有重复顶点的索引（去重后） */
    duplicateIndices: number[];
}

/**
 * 检查是否存在重复顶点（检查所有顶点对，而非仅相邻顶点）
 *
 * @param coordinates 坐标数组
 * @param tolerance 容差（度）
 * @returns 重复顶点的索引列表
 */
export function findDuplicateVertices(coordinates: Position[], tolerance: number = DEFAULT_OPTIONS.duplicateTolerance): number[] {
    const result = findAllDuplicateVertices(coordinates, tolerance);
    return result.duplicateIndices;
}

/**
 * 检查是否存在重复顶点（完整版，返回详细信息）
 *
 * @param coordinates 坐标数组
 * @param tolerance 容差（度）
 * @returns 重复顶点检测结果
 */
export function findAllDuplicateVertices(coordinates: Position[], tolerance: number = DEFAULT_OPTIONS.duplicateTolerance): DuplicateVerticesResult {
    const duplicatePairs: Array<[number, number]> = [];
    const duplicateIndicesSet = new Set<number>();

    // 检查所有顶点对
    for (let i = 0; i < coordinates.length; i++) {
        for (let j = i + 1; j < coordinates.length; j++) {
            const p1 = coordinates[i];
            const p2 = coordinates[j];
            const dx = Math.abs(p1[0] - p2[0]);
            const dy = Math.abs(p1[1] - p2[1]);
            if (dx <= tolerance && dy <= tolerance) {
                duplicatePairs.push([j, i]);
                duplicateIndicesSet.add(j);
            }
        }
    }

    return {
        hasDuplicates: duplicatePairs.length > 0,
        duplicatePairs,
        duplicateIndices: Array.from(duplicateIndicesSet).sort((a, b) => a - b)
    };
}

/**
 * 检查环是否闭合
 *
 * @param ring 环坐标
 * @param tolerance 容差（度），默认使用 DEFAULT_OPTIONS.ringClosedTolerance
 * @returns true 表示闭合
 */
export function isRingClosed(ring: Position[], tolerance: number = DEFAULT_OPTIONS.ringClosedTolerance): boolean {
    if (ring.length < 2) return false;
    const first = ring[0];
    const last = ring[ring.length - 1];
    const dx = Math.abs(first[0] - last[0]);
    const dy = Math.abs(first[1] - last[1]);
    return dx <= tolerance && dy <= tolerance;
}

/**
 * 计算环的面积（有符号）
 * 正值表示逆时针，负值表示顺时针
 *
 * @param ring 环坐标
 * @returns 有符号面积
 */
export function calculateSignedArea(ring: Position[]): number {
    let area = 0;
    const n = ring.length;
    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        area += ring[i][0] * ring[j][1];
        area -= ring[j][0] * ring[i][1];
    }
    return area / 2;
}

/**
 * 检查环方向
 *
 * @param ring 环坐标
 * @returns true 表示顺时针，false 表示逆时针
 */
export function isRingClockwise(ring: Position[]): boolean {
    return calculateSignedArea(ring) < 0;
}

/**
 * 综合几何验证
 *
 * @param geometry 几何对象
 * @param options 验证选项
 * @returns 验证结果
 */
export function validateGeometryComprehensive(
    geometry: Geometry | GeometryCollection,
    options: GeometryValidationOptions = {}
): GeometryValidationResult {
    const errors: GeometryError[] = [];
    const warnings: GeometryWarning[] = [];
    const {
        checkSelfIntersection = DEFAULT_OPTIONS.checkSelfIntersection,
        checkRingOrientation = DEFAULT_OPTIONS.checkRingOrientation,
        checkHolePosition = DEFAULT_OPTIONS.checkHolePosition,
        checkDuplicateVertices = DEFAULT_OPTIONS.checkDuplicateVertices,
        shellClockwise = DEFAULT_OPTIONS.shellClockwise,
        minValidArea = DEFAULT_OPTIONS.minValidArea,
        duplicateTolerance = DEFAULT_OPTIONS.duplicateTolerance,
    } = options;

    // 基本验证
    const basicResult = validateGeometry(geometry, '', options);
    errors.push(...basicResult.errors);
    warnings.push(...basicResult.warnings);

    // 处理 GeometryCollection
    if (geometry.type === 'GeometryCollection') {
        const gc = geometry as GeometryCollection;
        for (let i = 0; i < gc.geometries.length; i++) {
            const subResult = validateGeometryComprehensive(gc.geometries[i], options);
            subResult.errors.forEach(e => {
                errors.push({ ...e, path: `geometries[${i}].${e.path || ''}` });
            });
            subResult.warnings.forEach(w => {
                warnings.push({ ...w, path: `geometries[${i}].${w.path || ''}` });
            });
        }
        return { isValid: errors.length === 0, errors, warnings };
    }

    if (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon') {
        const polygons = geometry.type === 'Polygon'
            ? [geometry.coordinates]
            : geometry.coordinates;

        polygons.forEach((polygon, pIndex) => {
            const prefix = geometry.type === 'MultiPolygon' ? `[${pIndex}]` : '';
            const pathPrefix = geometry.type === 'MultiPolygon' ? `coordinates[${pIndex}]` : 'coordinates';

            // 检查退化几何
            if (!checkDegeneratePolygon({ type: 'Polygon', coordinates: polygon } as Polygon, minValidArea)) {
                errors.push({
                    type: 'degenerate_ring',
                    message: `多边形${prefix}面积为0或接近0`,
                    path: pathPrefix
                });
            }

            // 检查环方向
            if (checkRingOrientation && polygon.length > 0) {
                const shellClockwiseActual = isRingClockwise(polygon[0]);
                const expectedShellClockwise = shellClockwise;

                if (shellClockwiseActual !== expectedShellClockwise) {
                    errors.push({
                        type: 'ring_orientation',
                        message: `外环${prefix}方向错误（期望${expectedShellClockwise ? '顺时针' : '逆时针'}）`,
                        path: `${pathPrefix}[0]`
                    });
                }

                // 检查孔洞方向（应与外环相反）
                for (let h = 1; h < polygon.length; h++) {
                    const holeClockwise = isRingClockwise(polygon[h]);
                    if (holeClockwise === expectedShellClockwise) {
                        errors.push({
                            type: 'ring_orientation',
                            message: `孔洞[${h}]${prefix}方向错误（应为${expectedShellClockwise ? '逆时针' : '顺时针'}）`,
                            path: `${pathPrefix}[${h}]`
                        });
                    }
                }
            }

            // 检查孔洞位置和关系
            if (checkHolePosition && polygon.length > 1) {
                const shell = polygon[0];
                const holes = polygon.slice(1);

                // 检查每个孔洞是否在外环内部
                for (let h = 0; h < holes.length; h++) {
                    const holeCheck = checkHoleInsideShellComplete(shell, holes[h]);
                    if (!holeCheck.isInside) {
                        errors.push({
                            type: 'hole_outside_shell',
                            message: `孔洞[${h + 1}]${prefix}不在外环内部: ${holeCheck.reason || ''}`,
                            path: `${pathPrefix}[${h + 1}]`
                        });
                    }
                }

                // 检查孔洞之间是否重叠
                const overlapResult = checkHolesOverlap(holes);
                if (overlapResult.hasOverlap) {
                    overlapResult.pairs.forEach(([i, j]) => {
                        errors.push({
                            type: 'holes_overlap',
                            message: `孔洞[${i + 1}]与孔洞[${j + 1}]${prefix}存在重叠`,
                            path: pathPrefix
                        });
                    });
                }

                // 检查孔洞嵌套
                const nestedResult = checkNestedHoles(holes);
                if (nestedResult.hasNested) {
                    nestedResult.pairs.forEach(([outer, inner]) => {
                        errors.push({
                            type: 'nested_holes',
                            message: `孔洞[${outer + 1}]${prefix}嵌套包含孔洞[${inner + 1}]`,
                            path: pathPrefix
                        });
                    });
                }
            }

            // 检查重复顶点
            if (checkDuplicateVertices) {
                polygon.forEach((ring, rIndex) => {
                    const duplicates = findDuplicateVertices(ring, duplicateTolerance);
                    if (duplicates.length > 0) {
                        errors.push({
                            type: 'duplicate_vertices',
                            message: `环[${rIndex}]${prefix}存在重复顶点: 索引 ${duplicates.join(', ')}`,
                            path: `${pathPrefix}[${rIndex}]`
                        });
                    }
                });
            }
        });

        // 检查自相交
        if (checkSelfIntersection) {
            const selfIntersectionResult = checkSelfIntersectionDetailed(geometry);
            if (!selfIntersectionResult.isValid) {
                errors.push({
                    type: 'self_intersection',
                    message: selfIntersectionResult.error || '几何存在自相交'
                });
            }
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
}

/**
 * 修复几何问题（尽可能自动修复）
 *
 * @param geometry 几何对象
 * @param options 修复选项
 * @returns 修复后的几何对象和修复说明
 */
export function repairGeometry(
    geometry: Geometry,
    options: {
        /** 期望外环顺时针方向，默认 true */
        shellClockwise?: boolean;
        /** 环闭合容差，默认使用 DEFAULT_OPTIONS.ringClosedTolerance */
        ringClosedTolerance?: number;
    } = {}
): { geometry: Geometry; repairs: string[]; warnings: string[] } {
    const repairs: string[] = [];
    const warnings: string[] = [];
    const { shellClockwise = true, ringClosedTolerance = DEFAULT_OPTIONS.ringClosedTolerance } = options;

    // 处理 Polygon
    if (geometry.type === 'Polygon') {
        const coords = geometry.coordinates.map((ring, ringIndex) => {
            let repairedRing = [...ring];

            // 修复未闭合的环
            if (!isRingClosed(repairedRing, ringClosedTolerance)) {
                if (repairedRing.length > 0) {
                    repairedRing.push([...repairedRing[0]]); // 添加闭合点
                    repairs.push(`闭合了环[${ringIndex}]`);
                }
            }

            // 检查闭合后点数是否足够
            if (repairedRing.length < 4) {
                warnings.push(`环[${ringIndex}]修复后点数仍不足4个，可能无法形成有效多边形`);
            }

            // 修复环方向
            const isClockwise = isRingClockwise(repairedRing);
            const shouldBeClockwise = ringIndex === 0 ? shellClockwise : !shellClockwise;

            if (isClockwise !== shouldBeClockwise) {
                repairedRing = [...repairedRing].reverse();
                repairs.push(`反转了${ringIndex === 0 ? '外环' : `孔洞[${ringIndex}]`}的方向`);
            }

            return repairedRing;
        });

        return { geometry: { ...geometry, coordinates: coords }, repairs, warnings };
    }

    // 处理 MultiPolygon
    if (geometry.type === 'MultiPolygon') {
        const coords = geometry.coordinates.map((polygon, polygonIndex) => {
            const repairedPolygon = polygon.map((ring, ringIndex) => {
                let repairedRing = [...ring];

                // 修复未闭合的环
                if (!isRingClosed(repairedRing, ringClosedTolerance)) {
                    if (repairedRing.length > 0) {
                        repairedRing.push([...repairedRing[0]]);
                        repairs.push(`闭合了多边形[${polygonIndex}]的环[${ringIndex}]`);
                    }
                }

                // 检查闭合后点数是否足够
                if (repairedRing.length < 4) {
                    warnings.push(`多边形[${polygonIndex}]的环[${ringIndex}]修复后点数仍不足4个`);
                }

                // 修复环方向
                const isClockwise = isRingClockwise(repairedRing);
                const shouldBeClockwise = ringIndex === 0 ? shellClockwise : !shellClockwise;

                if (isClockwise !== shouldBeClockwise) {
                    repairedRing = [...repairedRing].reverse();
                    repairs.push(`反转了多边形[${polygonIndex}]的${ringIndex === 0 ? '外环' : `孔洞[${ringIndex}]`}的方向`);
                }

                return repairedRing;
            });

            return repairedPolygon;
        });

        return { geometry: { ...geometry, coordinates: coords }, repairs, warnings };
    }

    // 其他类型不处理
    return { geometry, repairs, warnings };
}

export function assertValidCoordinate(coord: unknown, options: { strictZeroCoordinate?: boolean } = {}): asserts coord is Position {
    const result = validateCoordinate(coord, '', options)
    if (!result.isValid) {
        throw new GisError(
            GisErrorCode.INVALID_COORDINATE,
            result.errors.map(e => e.message).join('; ')
        )
    }
}

export function assertValidGeometry(geometry: Geometry | GeometryCollection, options: GeometryValidationOptions = {}): void {
    const result = validateGeometry(geometry, '', options)
    if (!result.isValid) {
        throw new GisError(
            GisErrorCode.INVALID_GEOMETRY,
            result.errors.map(e => e.message).join('; ')
        )
    }
}
