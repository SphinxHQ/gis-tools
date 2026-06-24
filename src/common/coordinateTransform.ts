/**
 * @file Coordinate transformation utilities
 * @description Provides point and geometry coordinate transformation using Proj4.
 *              Supports transformation between any registered EPSG codes with
 *              structured result objects containing source/target info and error details.
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2026-04-13
 */
import proj4 from "proj4";

/**
 * Result of a coordinate transformation
 */
export interface TransformResult {
    /** Source CRS EPSG code */
    sourceCrs: string;
    /** Target CRS EPSG code */
    targetCrs: string;
    /** Source coordinate */
    sourcePoint: number[];
    /** Transformed target coordinate */
    targetPoint: number[];
    /** Whether the transformation succeeded */
    success: boolean;
    /** Error message if transformation failed */
    error?: string;
}

export function transformPoint(
    point: number[],
    sourceEpsg: number,
    targetEpsg: number
): TransformResult {
    const sourceCrs = `EPSG:${sourceEpsg}`;
    const targetCrs = `EPSG:${targetEpsg}`;

    try {
        const sourceDef = proj4.defs(sourceCrs);
        const targetDef = proj4.defs(targetCrs);

        if (!sourceDef) {
            return {
                sourceCrs,
                targetCrs,
                sourcePoint: point,
                targetPoint: [],
                success: false,
                error: `源坐标系未定义: ${sourceCrs}`
            };
        }
        if (!targetDef) {
            return {
                sourceCrs,
                targetCrs,
                sourcePoint: point,
                targetPoint: [],
                success: false,
                error: `目标坐标系未定义: ${targetCrs}`
            };
        }

        const result = proj4(sourceCrs, targetCrs, point);
        if (result[0] === Infinity || result[1] === Infinity || isNaN(result[0]) || isNaN(result[1])) {
            return {
                sourceCrs,
                targetCrs,
                sourcePoint: point,
                targetPoint: [],
                success: false,
                error: '坐标转换结果无效，请检查坐标系和坐标值'
            };
        }

        const targetPoint = [
            Number(result[0].toFixed(6)),
            Number(result[1].toFixed(6))
        ];

        return {
            sourceCrs,
            targetCrs,
            sourcePoint: point,
            targetPoint,
            success: true
        };
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return {
            sourceCrs,
            targetCrs,
            sourcePoint: point,
            targetPoint: [],
            success: false,
            error: msg
        };
    }
}

export function transformPoints(
    points: number[][],
    sourceEpsg: number,
    targetEpsg: number
): TransformResult[] {
    return points.map(p => transformPoint(p, sourceEpsg, targetEpsg));
}

export function parseCoordinateInput(input: string): number[] | null {
    const trimmed = input.trim();
    if (!trimmed) return null;

    const separators = /[,;\s]+/;
    const parts = trimmed.split(separators).filter(s => s.length > 0);

    if (parts.length < 2 || parts.length > 3) return null;

    const coords = parts.map(Number);
    if (coords.some(isNaN)) return null;

    return coords;
}

export function parseBatchCoordinateInput(input: string): number[][] {
    const lines = input.trim().split(/[\n\r]+/).filter(l => l.trim().length > 0);
    const results: number[][] = [];

    for (const line of lines) {
        const point = parseCoordinateInput(line);
        if (point) {
            results.push(point);
        }
    }

    return results;
}

export function formatPoint(point: number[], precision: number = 6): string {
    return point.map(p => Number(p).toFixed(precision)).join(', ');
}

export function formatTransformResult(result: TransformResult): string {
    if (!result.success) {
        return `转换失败: ${result.error}`;
    }
    return `${formatPoint(result.sourcePoint)} → ${formatPoint(result.targetPoint)}`;
}
