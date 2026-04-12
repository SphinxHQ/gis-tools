import * as turf from "@turf/turf";
import type { Geometry, Feature, Polygon, MultiPolygon, FeatureCollection } from 'geojson';
import * as Format from "ol/format";
import * as olGeometry from "ol/geom";

/**
 * 判断多边形环的时针方向
 * 使用鞋带公式（Shoelace formula）计算有符号面积
 * 正面积表示顺时针（在屏幕坐标系中），负面积表示逆时针
 *
 * @param ringPoints 环坐标数组，首尾点应相同
 * @returns true 表示顺时针，false 表示逆时针
 */
const getRingclockwise = (ringPoints: number[][]): boolean => {
    if (!ringPoints || ringPoints.length < 3) {
        return false;
    }

    // 使用鞋带公式计算有符号面积
    // Area = 0.5 * Σ(x_i * y_{i+1} - x_{i+1} * y_i)
    let signedArea = 0;
    const n = ringPoints.length;

    for (let i = 0; i < n; i++) {
        const current = ringPoints[i];
        const next = ringPoints[(i + 1) % n];
        signedArea += (current[0] * next[1]) - (next[0] * current[1]);
    }

    // 在GIS坐标系中（Y轴向上），正面积表示逆时针，负面积表示顺时针
    // 但在Web地图中通常使用屏幕坐标系（Y轴向下），这里保持与原逻辑一致
    // 原算法返回 angleNext - anglePrev > 0 为顺时针
    // 经测试，保持 signedArea < 0 为顺时针
    return signedArea < 0;
};

const isValidClickwise = (geometry: Geometry, shellClockwise: boolean): {
    isValid: boolean,
    errRings: { index: number[], ring: number[][], validClockwise: boolean }[]
} => {
    let isValid = true;

    let errRings: { index: number[], ring: number[][], validClockwise: boolean }[] = [];
    const holeClockwise = !shellClockwise;
    switch (geometry.type) {
        case "Polygon":
            for (let i = 0; i < geometry.coordinates.length; i++) {
                const ring = geometry.coordinates[i];
                const validClockwise = i == 0 ? shellClockwise : holeClockwise;
                if (getRingclockwise(ring) !== validClockwise) {
                    isValid = false;
                    errRings.push({
                        index: [0, i],
                        ring: ring,
                        validClockwise: validClockwise
                    });
                }

            }
            break;
        case "MultiPolygon":
            for (let i = 0; i < geometry.coordinates.length; i++) {
                const polygonIn = geometry.coordinates[i];
                for (let j = 0; j < polygonIn.length; j++) {
                    const ring = polygonIn[j];
                    const validClockwise = j == 0 ? shellClockwise : holeClockwise;
                    if (getRingclockwise(ring) !== validClockwise) {
                        isValid = false;
                        errRings.push({
                            index: [i, j],
                            ring: ring,
                            validClockwise: validClockwise
                        });
                    }
                }
            }
            break;
        default:
            throw new Error("not support geometry type:" + geometry.type);
    }

    return {
        isValid,
        errRings
    };
};

const contains = function (geometry: Geometry, overlay: Geometry): boolean {
    return turf.booleanContains(geometry, overlay);
};

const overlap = function (geometry: Geometry, overlay: Geometry): boolean {
    return turf.booleanOverlap(geometry, overlay);
};

const within = function (geometry: Geometry, overlay: Geometry): boolean {
    return turf.booleanWithin(geometry, overlay);
};

const intersects = function (geometry: Geometry, overlay: Geometry): boolean {
    return turf.booleanIntersects(geometry, overlay);
};

const difference = function (feature1: Feature<Polygon | MultiPolygon>, feature2: Feature<Polygon | MultiPolygon>): Feature<Polygon | MultiPolygon> | null {
    const featureCollection = turf.featureCollection([feature1, feature2]);
    const result = turf.difference(featureCollection);
    return result as Feature<Polygon | MultiPolygon> | null;
};

const olFeatureToGeoJSON = (feature: unknown): Feature => {
    return JSON.parse(new Format.GeoJSON().writeFeature(feature as object));
};

const geoJSONToOlFeature = (geojson: Feature): unknown => {
    return new Format.GeoJSON().readFeature(geojson);
};

const geoJSONToOlFeatures = (geojson: Feature | FeatureCollection): unknown[] => {
    return new Format.GeoJSON().readFeatures(geojson);
};

const olFeaturesToGeoJSON = (features: unknown[]): FeatureCollection => {
    const parse = JSON.parse(new Format.GeoJSON().writeFeatures(features as object[]));
    return parse as FeatureCollection;
};

const wktToOlFeatures = (wkt: string): unknown[] => {
    let formatter = new Format.WKT();
    let features = formatter.readFeatures(wkt);
    const feas: unknown[] = [];
    features.forEach((fea, idx) => {
        let geometry = (fea as { getGeometry: () => olGeometry.Geometry | undefined }).getGeometry();
        if (geometry instanceof olGeometry.GeometryCollection) {
            let geometries = geometry.getGeometriesArray();
            geometries.forEach(geo => {
                feas.push({
                    geometry: geo,
                    properties: {},
                    id: idx,
                    name: "wkt_" + idx
                });
            });
        } else {
            feas.push(fea);
        }
    });
    return feas;
};

const wkbToOlFeatures = (wkb: string): unknown[] => {
    let formatter = new Format.WKB();
    return formatter.readFeatures(wkb);
};

const wktToGeoJSON = function (wkt: string): Feature {
    return olFeaturesToGeoJSON(wktToOlFeatures(wkt));
};

const wkbToGeoJSON = function (wkb: string): Feature {
    return olFeaturesToGeoJSON(wkbToOlFeatures(wkb));
};

/**
 * WKT 坐标解析结果类型
 */
type WktCoordinatesResult = number[] | number[][] | number[][][] | number[][][][] | number[][][][][];

/**
 * WKT 几何类型枚举
 */
type WktGeometryType =
    | 'POINT' | 'LINESTRING' | 'POLYGON'
    | 'MULTIPOINT' | 'MULTILINESTRING' | 'MULTIPOLYGON'
    | 'GEOMETRYCOLLECTION'
    | 'POINT Z' | 'LINESTRING Z' | 'POLYGON Z'
    | 'POINT M' | 'LINESTRING M' | 'POLYGON M'
    | 'POINT ZM' | 'LINESTRING ZM' | 'POLYGON ZM'
    | 'MULTIPOINT Z' | 'MULTILINESTRING Z' | 'MULTIPOLYGON Z'
    | 'MULTIPOINT M' | 'MULTILINESTRING M' | 'MULTIPOLYGON M'
    | 'MULTIPOINT ZM' | 'MULTILINESTRING ZM' | 'MULTIPOLYGON ZM';

/**
 * 解析 WKT 字符串为坐标数组
 * 支持: POINT, LINESTRING, POLYGON, MULTIPOINT, MULTILINESTRING, MULTIPOLYGON
 * 支持: 带Z值、M值、ZM值的坐标
 *
 * @param wkt WKT格式字符串
 * @returns 坐标数组
 */
const getWktCoordinates = function (wkt: string): WktCoordinatesResult {
    // 预处理：移除多余空白
    wkt = wkt.trim().toUpperCase();
    wkt = wkt.replace(/\s+/g, ' ');
    wkt = wkt.replace(/\s*([,\)\(])\s*/g, "$1");

    /**
     * 解析单个点的坐标（支持XYZM）
     */
    function parsePoint(coordStr: string): number[] {
        const parts = coordStr.trim().split(/[\s]+/);
        return parts.map(Number);
    }

    /**
     * 解析线坐标
     */
    function parseLineString(lineStr: string): number[][] {
        if (!lineStr || lineStr.trim() === '') return [];
        return lineStr.split(',').map(s => parsePoint(s.trim()));
    }

    /**
     * 解析多边形坐标（可能包含孔洞）
     */
    function parsePolygon(polygonStr: string): number[][][] {
        // 移除最外层括号
        let inner = polygonStr;
        if (inner.startsWith('(') && inner.endsWith(')')) {
            inner = inner.substring(1, inner.length - 1);
        }

        // 分割环（每个环由括号包围）
        const rings: number[][][] = [];
        let depth = 0;
        let currentRing = '';

        for (let i = 0; i < inner.length; i++) {
            const char = inner[i];
            if (char === '(') {
                depth++;
                if (depth === 1) {
                    currentRing = '';
                } else {
                    currentRing += char;
                }
            } else if (char === ')') {
                depth--;
                if (depth === 0 && currentRing.trim()) {
                    rings.push(parseLineString(currentRing.trim()));
                    currentRing = '';
                } else {
                    currentRing += char;
                }
            } else if (depth >= 1) {
                currentRing += char;
            }
        }

        // 处理没有内括号的情况（单环多边形）
        if (rings.length === 0 && inner.trim()) {
            rings.push(parseLineString(inner.trim()));
        }

        return rings;
    }

    /**
     * 解析多点坐标
     */
    function parseMultiPoint(mpStr: string): number[][] {
        // MULTIPOINT 可能有两种格式：
        // MULTIPOINT(0 0, 1 1) 或 MULTIPOINT((0 0), (1 1))
        let inner = mpStr;
        if (inner.startsWith('(') && inner.endsWith(')')) {
            inner = inner.substring(1, inner.length - 1);
        }

        // 检查是否使用括号包裹每个点
        if (inner.includes('(')) {
            // 格式: (0 0), (1 1)
            const points: number[][] = [];
            let depth = 0;
            let current = '';

            for (const char of inner) {
                if (char === '(') {
                    depth++;
                    current = '';
                } else if (char === ')') {
                    depth--;
                    if (current.trim()) {
                        points.push(parsePoint(current.trim()));
                    }
                } else if (depth >= 1) {
                    current += char;
                }
            }
            return points;
        } else {
            // 格式: 0 0, 1 1
            return parseLineString(inner);
        }
    }

    /**
     * 解析多线坐标
     */
    function parseMultiLineString(mlStr: string): number[][][] {
        let inner = mlStr;
        if (inner.startsWith('(') && inner.endsWith(')')) {
            inner = inner.substring(1, inner.length - 1);
        }

        const lines: number[][][] = [];
        let depth = 0;
        let current = '';

        for (const char of inner) {
            if (char === '(') {
                depth++;
                if (depth === 1) {
                    current = '';
                } else {
                    current += char;
                }
            } else if (char === ')') {
                depth--;
                if (depth === 0 && current.trim()) {
                    lines.push(parseLineString(current.trim()));
                    current = '';
                } else {
                    current += char;
                }
            } else if (depth >= 1) {
                current += char;
            }
        }

        return lines;
    }

    /**
     * 解析多多边形坐标
     */
    function parseMultiPolygon(mpStr: string): number[][][][] {
        let inner = mpStr;
        // 移除最外层括号
        if (inner.startsWith('(') && inner.endsWith(')')) {
            inner = inner.substring(1, inner.length - 1);
        }

        const polygons: number[][][][] = [];
        let depth = 0;
        let currentPolygon = '';

        for (let i = 0; i < inner.length; i++) {
            const char = inner[i];
            if (char === '(') {
                depth++;
                currentPolygon += char;
            } else if (char === ')') {
                depth--;
                currentPolygon += char;
                // depth回到0表示一个多边形结束
                if (depth === 0 && currentPolygon.trim()) {
                    polygons.push(parsePolygon(currentPolygon.trim()));
                    currentPolygon = '';
                }
            } else {
                currentPolygon += char;
            }
        }

        return polygons;
    }

    // 提取类型和坐标部分
    const firstParen = wkt.indexOf('(');
    if (firstParen === -1) {
        throw new Error('无效的WKT格式: 缺少括号');
    }

    const type = wkt.substring(0, firstParen).trim() as WktGeometryType;
    const coordinatesStr = wkt.substring(firstParen + 1, wkt.lastIndexOf(')'));

    switch (type) {
        case 'POINT':
        case 'POINT Z':
        case 'POINT M':
        case 'POINT ZM':
            return parsePoint(coordinatesStr);

        case 'LINESTRING':
        case 'LINESTRING Z':
        case 'LINESTRING M':
        case 'LINESTRING ZM':
            return parseLineString(coordinatesStr);

        case 'POLYGON':
        case 'POLYGON Z':
        case 'POLYGON M':
        case 'POLYGON ZM':
            return parsePolygon('(' + coordinatesStr + ')');

        case 'MULTIPOINT':
        case 'MULTIPOINT Z':
        case 'MULTIPOINT M':
        case 'MULTIPOINT ZM':
            return parseMultiPoint(coordinatesStr);

        case 'MULTILINESTRING':
        case 'MULTILINESTRING Z':
        case 'MULTILINESTRING M':
        case 'MULTILINESTRING ZM':
            return parseMultiLineString(coordinatesStr);

        case 'MULTIPOLYGON':
        case 'MULTIPOLYGON Z':
        case 'MULTIPOLYGON M':
        case 'MULTIPOLYGON ZM':
            return parseMultiPolygon(coordinatesStr);

        case 'GEOMETRYCOLLECTION':
            throw new Error('GEOMETRYCOLLECTION 暂不支持直接提取坐标，请使用 wktToGeoJSON 方法');

        default:
            throw new Error(`无法识别的WKT类型: ${type}`);
    }
};

const getGeometryCenter = (geometry: Geometry) => {
    return turf.center(geometry).geometry.coordinates;
};

const getTypeName = (geoType: string): string => {
    let geoTypeName: string;
    switch (geoType) {
        case "Point":
            geoTypeName = "点";
            break;
        case "LineString":
            geoTypeName = "线";
            break;
        case "Polygon":
            geoTypeName = "面";
            break;
        case "MultiPoint":
            geoTypeName = "多点";
            break;
        case "MultiLineString":
            geoTypeName = "多线";
            break;
        case "MultiPolygon":
            geoTypeName = "多面";
            break;
        case "GeometryCollection":
            geoTypeName = "几何集合";
            break;
        default:
            throw new Error("不支持的 geometry type:" + geoType);
    }
    return geoTypeName;
};

interface GeometryObject {
    type?: string;
    geometry?: {
        coordinates?: unknown;
    };
    coordinates?: unknown;
}

const getCoordinatesCount = (geoObj: unknown): number => {
    if (geoObj && typeof geoObj === 'object') {
        const obj = geoObj as GeometryObject;
        if (obj.type === "Feature") {
            return getCoordinatesCount(obj.geometry?.coordinates);
        }
    }
    if (geoObj && typeof geoObj === 'object') {
        const obj = geoObj as GeometryObject;
        if (obj.coordinates) {
            return getCoordinatesCount(obj.coordinates);
        }
    }
    if (Array.isArray(geoObj)) {
        if (geoObj.length === 2 && geoObj.every(item => typeof item === "number")) {
            return 1;
        }
        return geoObj.map(getCoordinatesCount).reduce((a, b) => a + b, 0);
    }
    return 0;
};

export default {
    getRingclockwise,
    isValidClickwise,
    contains,
    overlap,
    within,
    intersects,
    difference,
    olFeatureToGeoJSON,
    geoJSONToOlFeature,
    getWktCoordinates,
    geoJSONToOlFeatures,
    olFeaturesToGeoJSON,
    wktToOlFeatures,
    wkbToOlFeatures,
    wktToGeoJSON,
    wkbToGeoJSON,
    getGeometryCenter,
    getTypeName,
    getCoordinatesCount,
}
