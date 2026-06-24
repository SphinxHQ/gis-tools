/**
 * @file GIS type definitions
 * @description Core TypeScript interfaces and type aliases used across the GIS Tools application,
 *              covering features, map options, draw tools, layer styles, CRS items, and validation.
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2026-04-13
 */
import * as GeoJSON from 'geojson';
import Feature from 'ol/Feature';
import type { StyleLike } from 'ol/style/Style';

/**
 * Represents a GeoJSON feature with an optional id field
 */
export interface GisFeatureItem extends GeoJSON.Feature {
    /** Unique identifier for the feature */
    id?: string | number;
}

/**
 * Options for fitting the map view to a geometry or extent
 */
export interface GisMapFitOptions {
    /** Padding in pixels around the fit area [top, right, bottom, left] */
    padding?: number[];
    /** Animation duration in milliseconds */
    duration?: number;
    /** Easing function for the animation */
    easing?: (t: number) => number;
}

/**
 * Options for the map draw tool
 */
export interface GisDrawToolOptions {
    /** Geometry type to draw */
    type: 'Polygon' | 'Point' | 'LineString' | 'None';
    /** Whether to clear existing features before drawing */
    cleanBefore?: boolean;
    /** Whether to stop after one drawing session */
    once?: boolean;
    /** Whether to keep the drawn feature on the map */
    keep?: boolean;
    /** Whether to allow holes in polygons */
    allowHole?: boolean;
}

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

/**
 * Data payload for map events
 */
export interface GisMapEventData {
    /** Features involved in the event */
    features?: GeoJSON.Feature[];
    /** Map center coordinates [lon, lat] */
    center?: number[];
    /** Map zoom level */
    zoom?: number;
    /** Name of the layer involved */
    layerName?: string;
    /** Additional event-specific options */
    options?: Record<string, unknown>;
}

/**
 * WKT coordinate structures for different geometry types
 */
export interface WktCoordinates {
    /** Point coordinates [x, y] */
    point?: number[];
    /** LineString coordinates array */
    lineString?: number[][];
    /** Polygon coordinates (array of rings) */
    polygon?: number[][][];
    /** MultiPolygon coordinates (array of polygons) */
    multiPolygon?: number[][][][];
}

/**
 * Represents a coordinate reference system item
 */
export interface GisCrsItem {
    /** EPSG code (e.g., "4326") */
    code: string;
    /** Human-readable name */
    name: string;
    /** Proj4 definition string */
    proj4: string;
}

/**
 * Generic data description with string keys
 */
export interface GisDataDescription {
    [key: string]: unknown;
}

/**
 * Map initialization options
 */
export interface GisMapOption {
    /** Initial center coordinates [lon, lat] */
    center?: number[];
    /** Initial zoom level */
    zoom?: number;
    /** Initial rotation in radians */
    rotation?: number;
    /** Map projection (EPSG code string or number) */
    projection: string | number;
}

/**
 * Layer configuration options
 */
export interface GisLayerOption {
    /** Unique layer id */
    id?: string;
    /** Display name */
    name?: string;
    /** Layer visibility */
    visible?: boolean;
    /** Layer opacity (0-1) */
    opacity?: number;
    /** Z-index for layer stacking */
    zIndex?: number;
    /** Tile or data URL */
    url?: string;
    /** Layer style (OpenLayers style, string, or options object) */
    style?: StyleLike | string | GisLayerStyleOptions;
}

/**
 * Notification data for map events
 */
export interface GisMapNotifyData {
    /** Event type identifier */
    type?: string;
    /** Layer object involved */
    layer?: unknown;
    /** Single feature involved */
    feature?: Feature | GeoJSON.Feature;
    /** Multiple features involved */
    features?: Feature[] | GeoJSON.Feature[];
}

/** Alias for OpenLayers Feature */
export type OlFeature = Feature;

/** Alias for GeoJSON Feature */
export type GeoJsonFeature = GeoJSON.Feature;

/** Alias for GeoJSON Geometry */
export type GeoJsonGeometry = GeoJSON.Geometry;

/** A coordinate pair [x, y] or coordinate array */
export type Coordinate = number[];

/** Bounding box extent [minX, minY, maxX, maxY] */
export type Extent = [number, number, number, number];

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

/**
 * Result of geometry validation
 */
export interface GisValidationResult {
    /** Whether the geometry is valid */
    isValid: boolean;
    /** Array of validation errors (empty if valid) */
    errors: GisValidationError[];
}
