/**
 * 坐标工具模块
 * 提供坐标格式转换、坐标验证辅助、坐标系判断等工具函数
 */

// ==================== 坐标格式转换 ====================

/**
 * 将坐标数组格式化为字符串
 *
 * @param coord 坐标 [x, y] 或 [x, y, z]
 * @param precision 小数位数
 * @param separator 分隔符
 * @returns 格式化后的字符串
 */
export function formatCoordinate(coord: number[], precision: number = 6, separator: string = ', '): string {
    return coord.map(c => c.toFixed(precision)).join(separator);
}

/**
 * 解析坐标字符串
 * 支持格式: "x, y", "x y", "x;y", "x,y,z" 等
 *
 * @param str 坐标字符串
 * @returns 坐标数组，解析失败返回 null
 */
export function parseCoordinateString(str: string): number[] | null {
    const trimmed = str.trim();
    if (!trimmed) return null;

    // 尝试多种分隔符
    const separators = [',', ';', ' ', '\t', '|'];
    let parts: string[] = [];

    for (const sep of separators) {
        if (trimmed.includes(sep)) {
            const split = trimmed.split(sep).map(s => s.trim()).filter(s => s.length > 0);
            if (split.length >= 2) {
                parts = split;
                break;
            }
        }
    }

    // 如果没有分隔符，尝试空格分隔
    if (parts.length === 0) {
        parts = trimmed.split(/\s+/).filter(s => s.length > 0);
    }

    if (parts.length < 2 || parts.length > 4) {
        return null;
    }

    const coords = parts.map(Number);
    if (coords.some(isNaN)) {
        return null;
    }

    return coords;
}

/**
 * 批量解析坐标字符串（每行一个坐标）
 *
 * @param str 多行坐标字符串
 * @returns 坐标数组
 */
export function parseBatchCoordinates(str: string): number[][] {
    const lines = str.trim().split(/[\n\r]+/).filter(l => l.trim().length > 0);
    const results: number[][] = [];

    for (const line of lines) {
        const coord = parseCoordinateString(line);
        if (coord) {
            results.push(coord);
        }
    }

    return results;
}

// ==================== 坐标验证辅助 ====================

/**
 * 经纬度范围常量
 */
export const COORDINATE_BOUNDS = {
    WGS84: {
        longitude: { min: -180, max: 180 },
        latitude: { min: -90, max: 90 }
    },
    WEB_MERCATOR: {
        x: { min: -20037508.34, max: 20037508.34 },
        y: { min: -20037508.34, max: 20037508.34 }
    },
    CGCS2000_3DEGREE: {
        // 3度带投影坐标范围（大致）
        x: { min: 300000, max: 45600000 },  // 带号前置或后置
        y: { min: 0, max: 6000000 }
    },
    CGCS2000_6DEGREE: {
        // 6度带投影坐标范围（大致）
        x: { min: 1300000, max: 23500000 },
        y: { min: 0, max: 6000000 }
    }
};

/**
 * 中国境内经纬度范围
 */
export const CHINA_BOUNDS = {
    longitude: { min: 73.62, max: 134.77 },
    latitude: { min: 16.7, max: 53.56 }
};

/**
 * 判断坐标是否在中国境内
 *
 * @param lon 经度
 * @param lat 纬度
 * @returns 是否在中国境内
 */
export function isInChina(lon: number, lat: number): boolean {
    return lon >= CHINA_BOUNDS.longitude.min &&
           lon <= CHINA_BOUNDS.longitude.max &&
           lat >= CHINA_BOUNDS.latitude.min &&
           lat <= CHINA_BOUNDS.latitude.max;
}

/**
 * 判断坐标是否为有效的经纬度
 *
 * @param lon 经度
 * @param lat 纬度
 * @returns 是否有效
 */
export function isValidLonLat(lon: number, lat: number): boolean {
    return !isNaN(lon) && !isNaN(lat) &&
           lon >= -180 && lon <= 180 &&
           lat >= -90 && lat <= 90;
}

/**
 * 判断坐标是否为有效的Web墨卡托坐标
 *
 * @param x X坐标
 * @param y Y坐标
 * @returns 是否有效
 */
export function isValidWebMercator(x: number, y: number): boolean {
    const bounds = COORDINATE_BOUNDS.WEB_MERCATOR;
    return !isNaN(x) && !isNaN(y) &&
           x >= bounds.x.min && x <= bounds.x.max &&
           y >= bounds.y.min && y <= bounds.y.max;
}

/**
 * 判断坐标类型
 */
export type CoordinateType = 'longitude-latitude' | 'web-mercator' | 'projected-china' | 'unknown';

/**
 * 自动判断坐标类型
 *
 * @param x X坐标或经度
 * @param y Y坐标或纬度
 * @returns 坐标类型
 */
export function detectCoordinateType(x: number, y: number): CoordinateType {
    // 经纬度判断
    if (x >= -180 && x <= 180 && y >= -90 && y <= 90) {
        return 'longitude-latitude';
    }

    // Web墨卡托判断
    const mercatorBounds = COORDINATE_BOUNDS.WEB_MERCATOR;
    if (x >= mercatorBounds.x.min && x <= mercatorBounds.x.max &&
        y >= mercatorBounds.y.min && y <= mercatorBounds.y.max) {
        return 'web-mercator';
    }

    // 中国投影坐标判断（3度带或6度带）
    // 带号前置的投影坐标 X 通常在几百万到几千万
    if (x > 100000 && y > 0 && y < 10000000) {
        return 'projected-china';
    }

    return 'unknown';
}

// ==================== 角度转换 ====================

/**
 * 度转弧度
 */
export function degreesToRadians(degrees: number): number {
    return degrees * Math.PI / 180;
}

/**
 * 弧度转度
 */
export function radiansToDegrees(radians: number): number {
    return radians * 180 / Math.PI;
}

// ==================== 坐标偏移计算 ====================

/**
 * 计算经纬度偏移量对应的米数（近似值）
 *
 * @param lon 经度
 * @param lat 纬度
 * @returns {lonPerMeter: 经度每米偏移, latPerMeter: 纬度每米偏移}
 */
export function getMetersPerDegree(lon: number, lat: number): { lonPerMeter: number; latPerMeter: number } {
    // 地球半径（米）
    const _EARTH_RADIUS = 6371000;

    // 纬度每度对应的米数（几乎恒定）
    const latPerMeter = 111320;

    // 经度每度对应的米数（随纬度变化）
    const lonPerMeter = 111320 * Math.cos(degreesToRadians(lat));

    return {
        lonPerMeter: 1 / lonPerMeter,
        latPerMeter: 1 / latPerMeter
    };
}

/**
 * 将米偏移转换为经纬度偏移
 *
 * @param meterX X方向米偏移
 * @param meterY Y方向米偏移
 * @param refLon 参考经度
 * @param refLat 参考纬度
 * @returns [经度偏移, 纬度偏移]
 */
export function meterOffsetToDegreeOffset(
    meterX: number,
    meterY: number,
    refLon: number,
    refLat: number
): [number, number] {
    const { lonPerMeter, latPerMeter } = getMetersPerDegree(refLon, refLat);
    return [meterX * lonPerMeter, meterY * latPerMeter];
}

// ==================== 坐标插值 ====================

/**
 * 在两点之间进行线性插值
 *
 * @param start 起点坐标
 * @param end 终点坐标
 * @param t 插值参数 [0, 1]
 * @returns 插值点坐标
 */
export function interpolatePoint(start: number[], end: number[], t: number): number[] {
    return start.map((s, i) => s + (end[i] - s) * t);
}

/**
 * 在两点之间按距离均匀插值
 *
 * @param start 起点坐标 [经度, 纬度]
 * @param end 终点坐标 [经度, 纬度]
 * @param interval 插值间隔（米）
 * @returns 插值点数组（包含起点和终点）
 */
export function interpolateByDistance(start: number[], end: number[], interval: number): number[][] {
    const results: number[][] = [start.slice()];

    // 计算总距离（使用 Haversine 近似）
    const R = 6371000; // 地球半径（米）
    const lat1 = degreesToRadians(start[1]);
    const lat2 = degreesToRadians(end[1]);
    const lon1 = degreesToRadians(start[0]);
    const lon2 = degreesToRadians(end[0]);

    const dLat = lat2 - lat1;
    const dLon = lon2 - lon1;

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const totalDistance = R * c;

    // 按间隔插值
    const numPoints = Math.floor(totalDistance / interval);
    for (let i = 1; i <= numPoints; i++) {
        const t = i / (numPoints + 1);
        results.push(interpolatePoint(start, end, t));
    }

    results.push(end.slice());
    return results;
}

// ==================== 导出默认对象 ====================

export default {
    // 格式转换
    formatCoordinate,
    parseCoordinateString,
    parseBatchCoordinates,

    // 常量
    COORDINATE_BOUNDS,
    CHINA_BOUNDS,

    // 验证
    isInChina,
    isValidLonLat,
    isValidWebMercator,
    detectCoordinateType,

    // 角度转换
    degreesToRadians,
    radiansToDegrees,

    // 偏移计算
    getMetersPerDegree,
    meterOffsetToDegreeOffset,

    // 插值
    interpolatePoint,
    interpolateByDistance
};
