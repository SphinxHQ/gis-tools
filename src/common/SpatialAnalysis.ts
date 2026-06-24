/**
 * @file Spatial analysis algorithms
 * @description Provides common spatial analysis functions using Turf.js including buffer analysis,
 *              distance calculation (Haversine), area calculation, geometry simplification, etc.
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2026-04-13
 */
/**
 * GIS 空间分析算法模块
 * 提供常用的空间分析功能：缓冲区分析、距离计算、面积计算、简化算法等
 */

import * as turf from '@turf/turf';
import type { Geometry, FeatureCollection, Position, LineString, Polygon, MultiPolygon } from 'geojson';

// ==================== 距离计算 ====================

/**
 * 计算两点之间的距离（单位：米）
 * 使用 Haversine 公式，适用于球面距离计算
 *
 * @param point1 第一个点 [经度, 纬度]
 * @param point2 第二个点 [经度, 纬度]
 * @returns 距离（米）
 */
export function distanceBetweenPoints(point1: Position, point2: Position): number {
    const from = turf.point(point1);
    const to = turf.point(point2);
    return turf.distance(from, to, { units: 'meters' });
}

/**
 * 计算点到线的最短距离
 *
 * @param point 点坐标
 * @param line 线几何
 * @returns 距离（米）
 */
export function distancePointToLine(point: Position, line: Geometry): number {
    const pt = turf.point(point);
    const lineFeature = turf.lineString((line as LineString).coordinates);
    return turf.pointToLineDistance(pt, lineFeature, { units: 'meters' });
}

/**
 * 计算几何对象的长度
 *
 * @param geometry 几何对象
 * @returns 长度（米）
 */
export function getLength(geometry: Geometry): number {
    if (geometry.type === 'LineString' || geometry.type === 'MultiLineString') {
        const feature = { type: 'Feature' as const, geometry, properties: {} };
        return turf.length(feature, { units: 'meters' });
    }
    return 0;
}

/**
 * 计算几何对象的周长
 *
 * @param geometry 多边形几何
 * @returns 周长（米）
 */
export function getPerimeter(geometry: Geometry): number {
    if (geometry.type === 'Polygon') {
        const coords = (geometry as Polygon).coordinates;
        let perimeter = 0;
        for (const ring of coords) {
            const line = turf.lineString(ring);
            perimeter += turf.length(line, { units: 'meters' });
        }
        return perimeter;
    }
    if (geometry.type === 'MultiPolygon') {
        let perimeter = 0;
        for (const polygon of (geometry as MultiPolygon).coordinates) {
            for (const ring of polygon) {
                const line = turf.lineString(ring);
                perimeter += turf.length(line, { units: 'meters' });
            }
        }
        return perimeter;
    }
    return 0;
}

// ==================== 面积计算 ====================

/**
 * 计算几何对象的面积
 *
 * @param geometry 几何对象
 * @returns 面积（平方米）
 */
export function getArea(geometry: Geometry): number {
    if (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon') {
        const feature = { type: 'Feature' as const, geometry: geometry as Polygon | MultiPolygon, properties: {} };
        return turf.area(feature);
    }
    return 0;
}

/**
 * 计算有符号面积（用于判断环方向）
 * 正值表示逆时针，负值表示顺时针
 *
 * @param ring 环坐标
 * @returns 有符号面积
 */
export function getSignedArea(ring: Position[]): number {
    let area = 0;
    const n = ring.length;
    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        area += ring[i][0] * ring[j][1];
        area -= ring[j][0] * ring[i][1];
    }
    return area / 2;
}

// ==================== 缓冲区分析 ====================

/**
 * 缓冲区选项
 */
export interface BufferOptions {
    /** 缓冲半径（米） */
    radius: number;
    /** 边数（圆的近似精度） */
    steps?: number;
}

/**
 * 创建几何对象的缓冲区
 *
 * @param geometry 几何对象
 * @param options 缓冲选项
 * @returns 缓冲区几何
 */
export function buffer(geometry: Geometry, options: BufferOptions): Geometry {
    const feature = { type: 'Feature' as const, geometry, properties: {} };
    const buffered = turf.buffer(feature, options.radius, {
        units: 'meters',
        steps: options.steps || 64
    });
    return buffered ? buffered.geometry : geometry;
}

// ==================== 几何简化 ====================

/**
 * 简化选项
 */
export interface SimplifyOptions {
    /** 容差（米） */
    tolerance?: number;
    /** 是否高质量模式 */
    highQuality?: boolean;
}

/**
 * 使用 Douglas-Peucker 算法简化几何
 *
 * @param geometry 几何对象
 * @param options 简化选项
 * @returns 简化后的几何
 */
export function simplify(geometry: Geometry, options: SimplifyOptions = {}): Geometry {
    const feature = { type: 'Feature' as const, geometry, properties: {} };
    const simplified = turf.simplify(feature, {
        tolerance: options.tolerance || 0.001,
        highQuality: options.highQuality || false
    });
    return simplified.geometry;
}

// ==================== 质心与中心 ====================

/**
 * 计算几何质心（重心）
 *
 * @param geometry 几何对象
 * @returns 质心坐标 [经度, 纬度]
 */
export function getCentroid(geometry: Geometry): Position {
    const feature = { type: 'Feature' as const, geometry, properties: {} };
    const centroid = turf.centroid(feature);
    return centroid.geometry.coordinates;
}

/**
 * 计算几何中心（几何中心点）
 *
 * @param geometry 几何对象
 * @returns 中心坐标 [经度, 纬度]
 */
export function getCenter(geometry: Geometry): Position {
    const feature = { type: 'Feature' as const, geometry, properties: {} };
    const center = turf.center(feature);
    return center.geometry.coordinates;
}

/**
 * 计算几何的质心点（多边形内部点）
 * 适用于标签放置
 *
 * @param geometry 多边形几何
 * @returns 质心点坐标，如果无法计算则返回 null
 */
export function getPointOnSurface(geometry: Geometry): Position | null {
    if (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon') {
        const feature = { type: 'Feature' as const, geometry: geometry as Polygon | MultiPolygon, properties: {} };
        const point = turf.pointOnFeature(feature);
        return point.geometry.coordinates;
    }
    return null;
}

// ==================== 边界框 ====================

/**
 * 计算几何的边界框
 *
 * @param geometry 几何对象
 * @returns 边界框 [minX, minY, maxX, maxY]
 */
export function getBBox(geometry: Geometry): [number, number, number, number] {
    const feature = { type: 'Feature' as const, geometry, properties: {} };
    return turf.bbox(feature) as [number, number, number, number];
}

/**
 * 从边界框创建多边形
 *
 * @param bbox 边界框 [minX, minY, maxX, maxY]
 * @returns 多边形几何
 */
export function bboxToPolygon(bbox: [number, number, number, number]): Geometry {
    const polygon = turf.bboxPolygon(bbox);
    return polygon.geometry;
}

// ==================== 坐标转换 ====================

/**
 * 将坐标从度分秒转换为十进制度
 *
 * @param degrees 度
 * @param minutes 分
 * @param seconds 秒
 * @returns 十进制度
 */
export function dmsToDecimal(degrees: number, minutes: number, seconds: number): number {
    return degrees + minutes / 60 + seconds / 3600;
}

/**
 * 将十进制度转换为度分秒
 *
 * @param decimal 十进制度
 * @returns [度, 分, 秒]
 */
export function decimalToDms(decimal: number): [number, number, number] {
    const degrees = Math.trunc(decimal);
    const minutesDecimal = (decimal - degrees) * 60;
    const minutes = Math.trunc(minutesDecimal);
    const seconds = (minutesDecimal - minutes) * 60;
    return [degrees, minutes, seconds];
}

// ==================== 方位角计算 ====================

/**
 * 计算从点A到点B的方位角
 *
 * @param from 起点坐标 [经度, 纬度]
 * @param to 终点坐标 [经度, 纬度]
 * @returns 方位角（度），0-360，正北为0度
 */
export function getBearing(from: Position, to: Position): number {
    const start = turf.point(from);
    const end = turf.point(to);
    const bearing = turf.bearing(start, end);
    // 转换为 0-360 范围
    return (bearing + 360) % 360;
}

/**
 * 根据起点、方位角和距离计算终点
 *
 * @param from 起点坐标 [经度, 纬度]
 * @param distance 距离（米）
 * @param bearing 方位角（度）
 * @returns 终点坐标 [经度, 纬度]
 */
export function getDestination(from: Position, distance: number, bearing: number): Position {
    const start = turf.point(from);
    const destination = turf.destination(start, distance, bearing, { units: 'meters' });
    return destination.geometry.coordinates;
}

// ==================== 几何运算 ====================

/**
 * 计算两个几何的交集
 *
 * @param geometry1 第一个几何
 * @param geometry2 第二个几何
 * @returns 交集几何，若无交集则返回 null
 */
export function intersect(geometry1: Geometry, geometry2: Geometry): Geometry | null {
    const feature1 = { type: 'Feature' as const, geometry: geometry1 as Polygon | MultiPolygon, properties: {} };
    const feature2 = { type: 'Feature' as const, geometry: geometry2 as Polygon | MultiPolygon, properties: {} };
    const fc = turf.featureCollection([feature1, feature2]) as FeatureCollection<Polygon | MultiPolygon>;
    const result = turf.intersect(fc);
    return result ? result.geometry : null;
}

/**
 * 计算两个几何的并集
 *
 * @param geometry1 第一个几何
 * @param geometry2 第二个几何
 * @returns 并集几何
 */
export function union(geometry1: Geometry, geometry2: Geometry): Geometry | null {
    const feature1 = { type: 'Feature' as const, geometry: geometry1 as Polygon | MultiPolygon, properties: {} };
    const feature2 = { type: 'Feature' as const, geometry: geometry2 as Polygon | MultiPolygon, properties: {} };
    const fc = turf.featureCollection([feature1, feature2]) as FeatureCollection<Polygon | MultiPolygon>;
    const result = turf.union(fc);
    return result ? result.geometry : null;
}

// ==================== 导出默认对象 ====================

export default {
    // 距离计算
    distanceBetweenPoints,
    distancePointToLine,
    getLength,
    getPerimeter,

    // 面积计算
    getArea,
    getSignedArea,

    // 缓冲区
    buffer,

    // 简化
    simplify,

    // 质心与中心
    getCentroid,
    getCenter,
    getPointOnSurface,

    // 边界框
    getBBox,
    bboxToPolygon,

    // 坐标转换
    dmsToDecimal,
    decimalToDms,

    // 方位角
    getBearing,
    getDestination,

    // 几何运算
    intersect,
    union
};
