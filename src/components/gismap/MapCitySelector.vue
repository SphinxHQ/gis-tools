<script setup lang="ts">
import {markRaw, onMounted, Ref, ref} from "vue";

import {GisMapAddFeaturesEvent, GisMapFlyToEvent} from "~/components/gismap/events/GisMapEvents";
import {eventBus} from "~/composables/eventBus";

const props = defineProps({
  mapName:{
    type: String,
    default: 'main'
  }
})
type CityProperties = {
  adcode: number;
  name: string;
  center: number[];
  centroid: number[];
  childrenNum: number;
  level: string;
  parent: { adcode: number };
  subFeatureIndex: number;
  acroutes: number[];
}

type CityFeature = {
  properties: CityProperties;
  geometry: {
    type: string;
    coordinates: number[][][];
  };
  type: string;
}


const options:Ref<any[]> = ref([]);
const dataMap:Map<number,CityFeature> = new Map<number,CityFeature>();
onMounted(() => {
  Promise.all([
    import('../../assets/json/city.json'),
    import('../../assets/json/province.json')
  ]).then(modules => {
    const _cities = markRaw(Array.from(modules[0].default.features)) as CityFeature[];
    const _provinces = markRaw(Array.from(modules[1].default.features)) as CityFeature[];
    const newOptions: any[] = []
    _provinces.forEach(province => dataMap.set(province.properties.adcode, province))
    _cities.forEach(city => dataMap.set(city.properties.adcode, city))
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

const localCity:any = ref();

const handleChange = (values: any[]) => {
  const adcode = values[values.length - 1]
  const feature = dataMap.get(adcode)
  if (!feature) return;

  const center = feature.properties?.center;
  if (center) {
    void eventBus.emit(props.mapName, new GisMapFlyToEvent(center, 12));
  }

  // 加载选中城市的边界到地图
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
