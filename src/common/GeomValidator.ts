import * as turf from '@turf/turf'
import type {Geometry, Feature, FeatureCollection, Position, Polygon, MultiPolygon} from 'geojson'

import {GisError, GisErrorCode} from '~/common/GisError'

export interface CoordinateValidationResult {
    isValid: boolean
    errors: CoordinateError[]
}

export interface CoordinateError {
    path: string
    message: string
    value?: unknown
}

export interface GeometryValidationResult {
    isValid: boolean
    errors: GeometryError[]
}

export interface GeometryError {
    type: 'self_intersection' | 'ring_orientation' | 'unclosed_ring' | 'too_few_points' | 'invalid_coordinate' | 'empty_geometry' | 'degenerate_ring' | 'hole_outside_shell' | 'nested_holes' | 'duplicate_vertices'
    message: string
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
}

export function validateCoordinate(coord: unknown, path = ''): CoordinateValidationResult {
    const errors: CoordinateError[] = []

    if (!Array.isArray(coord)) {
        errors.push({path, message: '坐标不是数组', value: coord})
        return {isValid: false, errors}
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

        if (lon === 0 && lat === 0) {
            errors.push({path, message: '坐标为(0,0)可能是无效数据', value: coord})
        }
    }

    if (coord.length >= 3 && (typeof coord[2] !== 'number' || isNaN(coord[2]))) {
        errors.push({path: `${path}[2]`, message: '高程值不是有效数字', value: coord[2]})
    }

    return {isValid: errors.length === 0, errors}
}

export function validateCoordinates(coords: Position[], path = ''): CoordinateValidationResult {
    const allErrors: CoordinateError[] = []

    if (!Array.isArray(coords) || coords.length === 0) {
        allErrors.push({path, message: '坐标数组为空'})
        return {isValid: false, errors: allErrors}
    }

    for (let i = 0; i < coords.length; i++) {
        const result = validateCoordinate(coords[i], `${path}[${i}]`)
        allErrors.push(...result.errors)
    }

    return {isValid: allErrors.length === 0, errors: allErrors}
}

export function validateGeometry(geometry: Geometry, path = ''): GeometryValidationResult {
    const errors: GeometryError[] = []

    if (!geometry || !geometry.type) {
        errors.push({type: 'empty_geometry', message: '几何对象为空或缺少type属性', path})
        return {isValid: false, errors}
    }

    const coords = (geometry as { coordinates?: unknown }).coordinates
    if (!coords) {
        errors.push({type: 'empty_geometry', message: `几何对象缺少coordinates: ${geometry.type}`, path})
        return {isValid: false, errors}
    }

    switch (geometry.type) {
        case 'Point': {
            const result = validateCoordinate(coords as Position, `${path}.coordinates`)
            result.errors.forEach(e => errors.push({type: 'invalid_coordinate', message: e.message, path: e.path}))
            break
        }
        case 'LineString': {
            const positions = coords as Position[]
            if (positions.length < 2) {
                errors.push({type: 'too_few_points', message: 'LineString至少需要2个点', path})
            }
            const result = validateCoordinates(positions, `${path}.coordinates`)
            result.errors.forEach(e => errors.push({type: 'invalid_coordinate', message: e.message, path: e.path}))
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
                const first = ring[0]
                const last = ring[ring.length - 1]
                if (first && last && (first[0] !== last[0] || first[1] !== last[1])) {
                    errors.push({type: 'unclosed_ring', message: `环[${i}]未闭合`, path: `${path}.coordinates[${i}]`})
                }
                const result = validateCoordinates(ring, `${path}.coordinates[${i}]`)
                result.errors.forEach(e => errors.push({type: 'invalid_coordinate', message: e.message, path: e.path}))
            }
            break
        }
        case 'MultiPoint': {
            const result = validateCoordinates(coords as Position[], `${path}.coordinates`)
            result.errors.forEach(e => errors.push({type: 'invalid_coordinate', message: e.message, path: e.path}))
            break
        }
        case 'MultiLineString': {
            const lines = coords as Position[][]
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].length < 2) {
                    errors.push({type: 'too_few_points', message: `LineString[${i}]至少需要2个点`, path: `${path}.coordinates[${i}]`})
                }
                const result = validateCoordinates(lines[i], `${path}.coordinates[${i}]`)
                result.errors.forEach(e => errors.push({type: 'invalid_coordinate', message: e.message, path: e.path}))
            }
            break
        }
        case 'MultiPolygon': {
            const polygons = coords as Position[][][]
            for (let i = 0; i < polygons.length; i++) {
                const subResult = validateGeometry(
                    {type: 'Polygon', coordinates: polygons[i]} as Geometry,
                    `${path}.coordinates[${i}]`
                )
                errors.push(...subResult.errors)
            }
            break
        }
        default:
            break
    }

    return {isValid: errors.length === 0, errors}
}

export function validateFeature(feature: Feature): GeometryValidationResult {
    if (!feature.geometry) {
        return {isValid: false, errors: [{type: 'empty_geometry', message: 'Feature缺少geometry'}]}
    }
    return validateGeometry(feature.geometry)
}

export function validateFeatureCollection(fc: FeatureCollection): GeometryValidationResult {
    const allErrors: GeometryError[] = []

    if (!fc.features || fc.features.length === 0) {
        allErrors.push({type: 'empty_geometry', message: 'FeatureCollection为空'})
        return {isValid: false, errors: allErrors}
    }

    for (let i = 0; i < fc.features.length; i++) {
        const result = validateFeature(fc.features[i])
        result.errors.forEach(e => {
            allErrors.push({...e, path: `features[${i}].${e.path || ''}`})
        })
    }

    return {isValid: allErrors.length === 0, errors: allErrors}
}

/**
 * 检查几何是否存在自相交
 *
 * @param geometry 几何对象
 * @returns true 表示无自相交，false 表示存在自相交
 */
export function checkSelfIntersectionFn(geometry: Geometry): boolean {
    try {
        if (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon') {
            const feature = {type: 'Feature' as const, geometry: geometry as Polygon | MultiPolygon, properties: {}}
            return !turf.kinks(feature).features.length
        }
        return true
    } catch {
        return false
    }
}

/**
 * 检查几何是否存在自相交（别名）
 * @deprecated 使用 checkSelfIntersectionFn 代替
 */
export const checkSelfIntersection = checkSelfIntersectionFn;

/**
 * 检查多边形是否为退化几何（面积为0或接近0）
 *
 * @param geometry 多边形几何
 * @returns true 表示有效，false 表示退化
 */
export function checkDegeneratePolygon(geometry: Polygon | MultiPolygon): boolean {
    try {
        const feature = { type: 'Feature' as const, geometry, properties: {} };
        const area = turf.area(feature);
        return area > 0.0001; // 面积大于0.0001平方米视为有效
    } catch {
        return false;
    }
}

/**
 * 检查孔洞是否在外环内部
 *
 * @param shell 外环坐标
 * @param hole 孔洞坐标
 * @returns true 表示孔洞在外环内部
 */
export function checkHoleInsideShell(shell: Position[], hole: Position[]): boolean {
    try {
        const shellPolygon = turf.polygon([shell]);
        // 检查孔洞的每个点是否在外环内
        for (const point of hole) {
            const pt = turf.point(point);
            if (!turf.booleanPointInPolygon(pt, shellPolygon)) {
                return false;
            }
        }
        return true;
    } catch {
        return true;
    }
}

/**
 * 检查是否有重复的相邻顶点
 *
 * @param coordinates 坐标数组
 * @param tolerance 容差（度）
 * @returns 重复顶点的索引列表
 */
export function findDuplicateVertices(coordinates: Position[], tolerance: number = 0.0000001): number[] {
    const duplicates: number[] = [];
    for (let i = 0; i < coordinates.length - 1; i++) {
        const current = coordinates[i];
        const next = coordinates[i + 1];
        const dx = Math.abs(current[0] - next[0]);
        const dy = Math.abs(current[1] - next[1]);
        if (dx < tolerance && dy < tolerance) {
            duplicates.push(i + 1);
        }
    }
    return duplicates;
}

/**
 * 检查环是否闭合
 *
 * @param ring 环坐标
 * @param tolerance 容差（度）
 * @returns true 表示闭合
 */
export function isRingClosed(ring: Position[], tolerance: number = 0.0000001): boolean {
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
    geometry: Geometry,
    options: GeometryValidationOptions = {}
): GeometryValidationResult {
    const errors: GeometryError[] = [];
    const {
        checkSelfIntersection = true,
        checkRingOrientation = true,
        checkHolePosition = true,
        checkDuplicateVertices = true,
        shellClockwise = true
    } = options;

    // 基本验证
    const basicResult = validateGeometry(geometry);
    errors.push(...basicResult.errors);

    if (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon') {
        const polygons = geometry.type === 'Polygon'
            ? [geometry.coordinates]
            : geometry.coordinates;

        polygons.forEach((polygon, pIndex) => {
            // 检查退化几何
            if (!checkDegeneratePolygon({ type: 'Polygon', coordinates: polygon } as Polygon)) {
                errors.push({
                    type: 'degenerate_ring',
                    message: `多边形${geometry.type === 'MultiPolygon' ? `[${pIndex}]` : ''}面积为0或接近0`,
                    path: geometry.type === 'MultiPolygon' ? `coordinates[${pIndex}]` : 'coordinates'
                });
            }

            // 检查环方向
            if (checkRingOrientation && polygon.length > 0) {
                const shellClockwiseActual = isRingClockwise(polygon[0]);
                const expectedShellClockwise = shellClockwise;

                if (shellClockwiseActual !== expectedShellClockwise) {
                    errors.push({
                        type: 'ring_orientation',
                        message: `外环方向错误（期望${expectedShellClockwise ? '顺时针' : '逆时针'}）`,
                        path: geometry.type === 'MultiPolygon' ? `coordinates[${pIndex}][0]` : 'coordinates[0]'
                    });
                }

                // 检查孔洞方向（应与外环相反）
                for (let h = 1; h < polygon.length; h++) {
                    const holeClockwise = isRingClockwise(polygon[h]);
                    if (holeClockwise === expectedShellClockwise) {
                        errors.push({
                            type: 'ring_orientation',
                            message: `孔洞[${h}]方向错误（应为${expectedShellClockwise ? '逆时针' : '顺时针'}）`,
                            path: geometry.type === 'MultiPolygon' ? `coordinates[${pIndex}][${h}]` : `coordinates[${h}]`
                        });
                    }
                }
            }

            // 检查孔洞位置
            if (checkHolePosition && polygon.length > 1) {
                const shell = polygon[0];
                for (let h = 1; h < polygon.length; h++) {
                    if (!checkHoleInsideShell(shell, polygon[h])) {
                        errors.push({
                            type: 'hole_outside_shell',
                            message: `孔洞[${h}]不在外环内部`,
                            path: geometry.type === 'MultiPolygon' ? `coordinates[${pIndex}][${h}]` : `coordinates[${h}]`
                        });
                    }
                }
            }

            // 检查重复顶点
            if (checkDuplicateVertices) {
                polygon.forEach((ring, rIndex) => {
                    const duplicates = findDuplicateVertices(ring);
                    if (duplicates.length > 0) {
                        errors.push({
                            type: 'duplicate_vertices',
                            message: `环[${rIndex}]存在重复顶点: 索引 ${duplicates.join(', ')}`,
                            path: geometry.type === 'MultiPolygon' ? `coordinates[${pIndex}][${rIndex}]` : `coordinates[${rIndex}]`
                        });
                    }
                });
            }
        });

        // 检查自相交
        if (checkSelfIntersection && !checkSelfIntersectionFn(geometry)) {
            errors.push({
                type: 'self_intersection',
                message: '几何存在自相交'
            });
        }
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * 修复几何问题（尽可能自动修复）
 *
 * @param geometry 几何对象
 * @returns 修复后的几何对象和修复说明
 */
export function repairGeometry(geometry: Geometry): { geometry: Geometry; repairs: string[] } {
    const repairs: string[] = [];
    let repairedGeometry = geometry;

    // 修复未闭合的环
    if (geometry.type === 'Polygon') {
        const coords = geometry.coordinates.map(ring => {
            if (!isRingClosed(ring)) {
                repairs.push('闭合了未闭合的环');
                return [...ring, ring[0]];
            }
            return ring;
        });
        repairedGeometry = { ...geometry, coordinates: coords };
    }

    // 修复环方向（如果需要）
    if (geometry.type === 'Polygon' && geometry.coordinates.length > 0) {
        const coords = geometry.coordinates.map((ring, index) => {
            const isClockwise = isRingClockwise(ring);
            const shouldBeClockwise = index === 0; // 外环顺时针
            if (isClockwise !== shouldBeClockwise) {
                repairs.push(`反转了${index === 0 ? '外环' : `孔洞[${index}]`}的方向`);
                return [...ring].reverse();
            }
            return ring;
        });
        repairedGeometry = { ...geometry, coordinates: coords };
    }

    return { geometry: repairedGeometry, repairs };
}

export function assertValidCoordinate(coord: unknown): asserts coord is Position {
    const result = validateCoordinate(coord)
    if (!result.isValid) {
        throw new GisError(
            GisErrorCode.INVALID_COORDINATE,
            result.errors.map(e => e.message).join('; ')
        )
    }
}

export function assertValidGeometry(geometry: Geometry): void {
    const result = validateGeometry(geometry)
    if (!result.isValid) {
        throw new GisError(
            GisErrorCode.INVALID_GEOMETRY,
            result.errors.map(e => e.message).join('; ')
        )
    }
}
