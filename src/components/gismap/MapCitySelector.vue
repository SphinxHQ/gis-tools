<script setup lang="ts">
/**
 * @file Map city selector component
 * @description Provides a searchable dropdown for selecting Chinese cities and flying
 *              the map to the selected city's coordinates with an appropriate zoom level.
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2026-04-13
 */
import {markRaw, onMounted, Ref, ref} from "vue";

import {GisMapAddFeaturesEvent, GisMapFlyToEvent} from "~/components/gismap/events/GisMapEvents";
import {eventBus} from "~/composables/eventBus";

const props = defineProps({
  mapName:{
    type: String,
    default: 'main'
  }
})

/** City feature properties from GeoJSON */
type CityProperties = {
  /** Administrative division code */
  adcode: number;
  /** City name */
  name: string;
  /** City center coordinates [lon, lat] */
  center: number[];
  /** City centroid coordinates [lon, lat] */
  centroid: number[];
  /** Number of child divisions */
  childrenNum: number;
  /** Administrative level (province/city/district) */
  level: string;
  /** Parent division reference */
  parent: { adcode: number };
  /** Index among sibling features */
  subFeatureIndex: number;
  /** Administrative route codes */
  acroutes: number[];
}

/** City GeoJSON feature with typed properties and geometry */
type CityFeature = {
  /** City properties */
  properties: CityProperties;
  /** Polygon geometry */
  geometry: {
    /** Geometry type */
    type: string;
    /** Polygon coordinate rings */
    coordinates: number[][][];
  };
  /** Feature type */
  type: string;
}


/** Cascader options for province/city selection */
const options:Ref<any[]> = ref([]);
/** Map from adcode to city feature data */
const dataMap:Map<number,CityFeature> = new Map<number,CityFeature>();

/** Load province and city data on mount, build cascader options */
onMounted(() => {
  Promise.all([
    import('../../assets/json/city.json'),
    import('../../assets/json/province.json')
  ]).then(modules => {
    const _cities = markRaw(Array.from(modules[0].default.features)) as CityFeature[];
    const _provinces = markRaw(Array.from(modules[1].default.features)) as CityFeature[];
    const newOptions: any[] = []
    // Index provinces and cities by adcode for fast lookup
    _provinces.forEach(province => dataMap.set(province.properties.adcode, province))
    _cities.forEach(city => dataMap.set(city.properties.adcode, city))
    // Build cascader tree: province -> cities
    _provinces.forEach(province => {
      newOptions.push({
         value: province.properties.adcode,
        label: province.properties.name,
        children:  markRaw(_cities.filter(city => city.properties?.parent?.adcode === province.properties.adcode).map(x=>({
          value: x.properties.adcode,
          label: x.properties.name,
          leaf: true,
        }))),
        isLeaf: false,
        isDisabled: false,
      })
    })
    options.value = newOptions;
  })

})

/** Currently selected city value */
const localCity:any = ref();

/**
 * Handle cascader selection change — fly to selected city and display boundary
 * @param values - Array of selected adcodes from the cascader
 */
const handleChange = (values: any[]) => {
  const adcode = values[values.length - 1]
  const feature = dataMap.get(adcode)
  if (!feature) return;

  // Fly map to city center at zoom level 12
  const center = feature.properties?.center;
  if (center) {
    void eventBus.emit(props.mapName, new GisMapFlyToEvent(center, 12));
  }

  // Load selected city boundary onto map
  const geojsonFeature: GeoJSON.Feature = {
    type: 'Feature' as const,
    geometry: feature.geometry as GeoJSON.Geometry,
    properties: { name: feature.properties.name, adcode: feature.properties.adcode }
  };
  void eventBus.emit(props.mapName, new GisMapAddFeaturesEvent([geojsonFeature], {
    layerName: 'city-boundary',
    clear: true,
    style: {
      fill: { color: 'rgba(64, 158, 255, 0.1)' },
      stroke: { color: 'rgba(64, 158, 255, 0.8)', width: 2 },
    }
  }));
}
</script>

<template>
  <el-cascader v-model="localCity" placeholder="选择城市" filterable :options="options" style="width: 100%" @change="handleChange" />
</template>

<style scoped>

</style>
