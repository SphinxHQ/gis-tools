/**
 * @file GIS type definitions
 * @description Core TypeScript interfaces and type aliases used across the GIS Tools application,
 *              covering features, map options, draw tools, layer styles, CRS items, and validation.
 * @author yuanyu <yuanyu@supermpa.com>
 * @date 2026-04-13
 */

/*
export interface GisFeatureItem extends GeoJSON.Feature {
    id?: string | number;
}

export interface GisMapFitOptions {
    padding?: number[];
    duration?: number;
    easing?: (t: number) => number;
}

export interface GisDrawToolOptions {
    type: 'Polygon' | 'Point' | 'LineString' | 'None';
    cleanBefore?: boolean;
    once?: boolean;
    keep?: boolean;
    allowHole?: boolean;
}
*/

/**
 * Style options for a GIS layer
 */
export interface GisLayerStyleOptions {
    /** Fill color for polygons */
    fill?: string;
    /** Stroke color for lines and polygon borders */
    stroke?: string;
    /** Stroke width in pixels */
    strokeWidth?: number;
    /** Radius for point circles */
    circleRadius?: number;
    /** Fill color for point circles */
    circleFill?: string;
    /** Stroke color for point circles */
    circleStroke?: string;
}

/*
export interface GisMapEventData {
    features?: GeoJSON.Feature[];
    center?: number[];
    zoom?: number;
    layerName?: string;
    options?: Record<string, unknown>;
}

export interface WktCoordinates {
    point?: number[];
    lineString?: number[][];
    polygon?: number[][][];
    multiPolygon?: number[][][][];
}

export interface GisCrsItem {
    code: string;
    name: string;
    proj4: string;
}

export interface GisDataDescription {
    [key: string]: unknown;
}

export interface GisMapOption {
    center?: number[];
    zoom?: number;
    rotation?: number;
    projection: string | number;
}

export interface GisLayerOption {
    id?: string;
    name?: string;
    visible?: boolean;
    opacity?: number;
    zIndex?: number;
    url?: string;
    style?: StyleLike | string | GisLayerStyleOptions;
}

export interface GisMapNotifyData {
    type?: string;
    layer?: unknown;
    feature?: Feature | GeoJSON.Feature;
    features?: Feature[] | GeoJSON.Feature[];
}

export type OlFeature = Feature;

export type GeoJsonFeature = GeoJSON.Feature;

export type GeoJsonGeometry = GeoJSON.Geometry;
*/

/** A coordinate pair [x, y] or coordinate array */
export type Coordinate = number[];

/*
export type Extent = [number, number, number, number];
*/

export type { GeometryTypeValue as GeometryType } from '~/enums'

/**
 * Represents a single validation error
 */
export interface GisValidationError {
    /** Error code identifier */
    code: string;
    /** Human-readable error message */
    message: string;
    /** Optional location information for the error */
    location?: {
        /** Index path to the problematic element */
        index?: number[];
        /** Ring coordinates where the error occurs */
        ring?: number[][];
    };
}

/*
export interface GisValidationResult {
    isValid: boolean;
    errors: GisValidationError[];
}
*/
