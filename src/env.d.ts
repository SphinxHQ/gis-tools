/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TIANDITU_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.vue' {
  import { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

declare module 'proj4' {
  import proj4 from 'proj4'
  export default proj4
}

declare module 'shpjs' {
  const shp: (source: string | ArrayBuffer | { shp: ArrayBuffer }) => Promise<GeoJSON.GeoJsonObject | GeoJSON.GeoJsonObject[]>
  export default shp
}

declare module 'wkx' {
  export function parseWkt(wkt: string): { toGeoJSON(): GeoJSON.GeoJsonObject }
  export function parseWkb(wkb: Buffer): { toGeoJSON(): GeoJSON.GeoJsonObject }
}
