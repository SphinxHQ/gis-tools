import * as GeoJSON from 'geojson';
import Feature from 'ol/Feature';
import { Style, StyleLike } from 'ol/style';

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

export interface GisLayerStyleOptions {
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    circleRadius?: number;
    circleFill?: string;
    circleStroke?: string;
}

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

export type Coordinate = number[];

export type Extent = [number, number, number, number];

export type GeometryType = 
    | 'Point' 
    | 'LineString' 
    | 'Polygon' 
    | 'MultiPoint' 
    | 'MultiLineString' 
    | 'MultiPolygon' 
    | 'GeometryCollection';

export interface GisValidationError {
    code: string;
    message: string;
    location?: {
        index?: number[];
        ring?: number[][];
    };
}

export interface GisValidationResult {
    isValid: boolean;
    errors: GisValidationError[];
}
