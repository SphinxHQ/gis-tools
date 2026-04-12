<script setup lang="ts">
import {ElMessage} from "element-plus";
import {computed, Ref, ref, watch} from "vue";
import {ShapefileParser, GeoJSONFeatureCollection} from "@sphinx_hq/shapefile-parser";

import {ExchangeDataFormat} from "~/components/data/ExchangeDataFormat";
import GisDataInfo from "~/components/data/GisDataInfo";
import {WktDataFormat} from "~/components/data/WktDataFormat";
import GisDescriptions from "~/components/descriptions/GisDescriptions.vue";

const props = defineProps({
  data: {
    type: Object as () => GisDataInfo,
    default: () => new GisDataInfo()
  }
})


const curGeo: any = ref(null)

const exchangeDataType = ref("HasProperties");
const dataStr_exchange: any = ref([]);
const display_exchange = computed(() => {
  const displayArr: string[] = [];
  if (exchangeDataType.value !== 'HasProperties') {
    dataStr_exchange.value.forEach((x: string) => {
      if (x.startsWith("J")) {
        displayArr.push(x);
      } else if (x.endsWith("@")) {
        displayArr.push("");
      }
    })
    return displayArr.join("\r\n");
  } else {
    return dataStr_exchange.value.join("\r\n");
  }
})

const wktType = ref("GeometryCollection");
const dataStr_wkt: Ref<string[]> = ref<string[]>([]);


watch(() => props.data, (newData) => {
  if (!newData || !newData.features?.length) {
    dataStr_exchange.value = [];
    dataStr_wkt.value = [];
    return;
  }
  //exchangeData
  const exchangeDataFormat = new ExchangeDataFormat();
  exchangeDataFormat.write(newData).then(res => {
    dataStr_exchange.value = res
  }).catch(e => {
    ElMessage.error(e.message)
  })
  //wktData
  const wktDataFormat = new WktDataFormat();
  wktDataFormat.write(newData).then(res => {
    dataStr_wkt.value = res
  }).catch(e => {
    ElMessage.error(e.message)
  })

  //wkbData
  // const wkbDataFormat = new WkbDataFormat();
  // wkbDataFormat.write(newData).then(res => {
  //   dataStr_wkb.value = res
  // }).catch(e => {
  //   ElMessage.error(e.message)
  // })


},{deep:true,immediate:true})
const geoJsonType = ref("FeatureCollection");
const dataStr_Geojson: any = ref(undefined);
watch(() => [props.data, geoJsonType.value], () => {
  if (!props.data || !props.data.features?.length) {
    dataStr_Geojson.value = undefined;
    return;
  }
  const type = geoJsonType.value;
  switch (type) {
    case "FeatureListArray":
      dataStr_Geojson.value = JSON.stringify(props.data.features);
      break;
    case "FeatureCollection":
      dataStr_Geojson.value = JSON.stringify({
        type: "FeatureCollection",
        features: props.data.features
      });
      break;
    case "FeatureSplit":
      curGeo.value = null;
      dataStr_Geojson.value = props.data.features.map(f => JSON.stringify(f));
      break;
    default:
      dataStr_Geojson.value = undefined;
  }
}, {deep: true, immediate: true})

const handleDownloadJson = () => {
  let downloadData = dataStr_Geojson;
  if (geoJsonType.value === "FeatureSplit") {
    downloadData.value = curGeo.value;
  }
  let fileName = geoJsonType.value + new Date().getTime();
  const blob = new Blob([downloadData], {type: "application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName + ".json";
  a.click();
  URL.revokeObjectURL(url);
}

const shpLoading = ref(false);
const handleDownloadShp = async () => {
  if (!props.data?.features?.length) {
    ElMessage.warning("没有数据可导出");
    return;
  }
  shpLoading.value = true;
  try {
    const parser = new ShapefileParser();
    const geojson: GeoJSONFeatureCollection = {
      type: "FeatureCollection",
      features: props.data.features as GeoJSONFeatureCollection['features']
    };
    const fileName = "shapefile_" + new Date().getTime();
    await parser.write(geojson, {
      filename: fileName,
      download: true,
      fieldNameStrategy: 'auto'
    });
    ElMessage.success("Shapefile 导出成功");
  } catch (e: any) {
    ElMessage.error(e.message || "导出失败");
  } finally {
    shpLoading.value = false;
  }
}


const handleDownloadExchange = () => {
  let downloadData = dataStr_exchange;
  let fileName = "电子报盘" + new Date().getTime();
  const blob = new Blob([downloadData], {type: "application/text"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName + ".txt";
  a.click();
  URL.revokeObjectURL(url);
}
const hasFeatures = computed(() => {
  return props.data?.features?.length > 0;
})
</script>
<template>
  <div class="gis-data-viewer-container">
    <el-tabs class="gis-data-viewer-tabs">
      <el-tab-pane label="DataInfo">
        <gis-descriptions :data="props.data" />
         <gis-descriptions :data="props.data?.crs?.crsInfo" />


      </el-tab-pane>
      <el-tab-pane :disabled="!hasFeatures" label="Inspact">
        <gis-data-inspactor :data="props.data" />
      </el-tab-pane>
      <el-tab-pane :disabled="!hasFeatures" label="GeoJson">
        <div class="h-40px"
             style="display: flex;flex-direction: row;align-items: center;justify-content: space-between; "
>
          <el-radio-group v-model="geoJsonType">
            <el-radio-button value="FeatureCollection">FeatureCollection</el-radio-button>
            <el-radio-button value="FeatureListArray">FeatureList Array</el-radio-button>
            <el-radio-button value="FeatureSplit">Feature Split</el-radio-button>
          </el-radio-group>
          <div style="display: flex; gap: 8px;">
            <el-button type="primary" @click="handleDownloadJson">Download Json File</el-button>
            <el-button type="success" :loading="shpLoading" @click="handleDownloadShp">Download Shapefile</el-button>
          </div>
        </div>
        <div class="h-[calc(100%-40px)] overflow-auto">
          <div v-if="geoJsonType === 'FeatureSplit'"
               style="flex-direction: row;display: flex;flex-wrap: nowrap;justify-content: flex-start; height: 100%"
>
            <div class="w-200px h-100% overflow-y-scroll is-flex">
              <el-radio-group v-model="curGeo">
                <el-radio-button v-for="(item,idx) in dataStr_Geojson" :key="idx" :value="item" class="split-btns">{{
                    idx
                  }}
                </el-radio-button>
              </el-radio-group>
            </div>
            <div class="w-100% h-100%">
              <geo-str-editor :value="curGeo" />
            </div>
          </div>
          <geo-str-editor v-else class="h-[calc(100%-40px)]" :value="dataStr_Geojson" />
        </div>
      </el-tab-pane>
      <el-tab-pane :disabled="!hasFeatures" label="Wkt">
        <div class="h-40px"
             style="display: flex;flex-direction: row;align-items: center;justify-content: space-between; "
>
          <el-radio-group v-model="wktType">
            <el-radio-button value="GeometryCollection">GeometryCollection</el-radio-button>
            <el-radio-button value="GeometrySplit">Geometry Split</el-radio-button>
          </el-radio-group>
        </div>
        <div class="h-[calc(100%-40px)]">
          <geo-str-editor
              :value="wktType === 'GeometrySplit'? dataStr_wkt.join(`\r\n\r\n\r\n`) :`GEOMETRYCOLLECTION(${ dataStr_wkt.join(`,`)})`"
/>
        </div>
      </el-tab-pane>
      <!--      <el-tab-pane label="Wkb">-->
      <!--        <geo-str-editor height="350px" :value="dataStr_wkb"></geo-str-editor>-->
      <!--      </el-tab-pane>-->
      <el-tab-pane :disabled="!hasFeatures" label="电子报盘">
        <div class="h-40px"
             style="display: flex;flex-direction: row;align-items: center;justify-content: space-between; "
>
          <el-radio-group v-model="exchangeDataType">
            <el-radio-button value="HasProperties">HasProperties</el-radio-button>
            <el-radio-button value="NoProperties">NoProperties</el-radio-button>
          </el-radio-group>
          <el-button type="primary" @click="handleDownloadExchange">DownloadTxt</el-button>
        </div>
        <div class="h-[calc(100%-40px)]">
          <geo-str-editor :value="display_exchange" />
        </div>
      </el-tab-pane>
    </el-tabs>
    <!--    <div class="gis-data-viewer-footer">-->
    <!--      {{tipText}}-->
    <!--    </div>-->
  </div>
</template>

<style scoped>
.gis-data-viewer-container {
  width: 100%;
  height: 100%;
  background: #FFF;
  border-radius: 5px;
  box-sizing: border-box;
}

.gis-data-viewer-tabs {
  height: calc(100%);
}

.gis-data-viewer-footer {
  text-align: right;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 0 20px;
}

.upload-info {
  height: 290px;
  display: flex;
  align-items: center;
  flex-direction: column;
  justify-content: center;
}


.split-btns {
  width: 50px;
  margin: 2px;
  padding: 0;
}

.gis-data-viewer-container .el-tabs .el-tabs__content .el-tab-pane {
  height: 100%;
  width: 100%;
  overflow: auto;
}
</style>
