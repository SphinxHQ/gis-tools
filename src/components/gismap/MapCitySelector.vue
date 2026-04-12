<script setup lang="ts">
import {markRaw, onMounted, Ref, ref} from "vue";

import { GisMapFlyToEvent} from "~/components/gismap/events/GisMapEvents";
import {eventBus} from "~/composables/eventBus";
const props = defineProps({
  mapName:{
    type: String,
    default: 'main'
  }
})
type CityPorperties = {
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
  properties: CityPorperties;
  geometry: {
    type: string;
    coordinates: number[][][];
  };
  type: string;
}


const options:Ref<any[]> = ref([]);
const dataMap:Map<number,any> = new Map<number,any>();
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
  const center = dataMap.get(adcode)?.properties?.center;
  if (center) {
    void eventBus.emit(props.mapName, new GisMapFlyToEvent(center));
  }
}
</script>

<template>
  <el-cascader v-model="localCity" placeholder="选择城市" filterable :options="options" style="width: 100%" @change="handleChange" />
</template>

<style scoped>

</style>