<script setup lang="ts">
import {ShapefileParser, GeoJSONFeatureCollection} from "@sphinx_hq/shapefile-parser";
import {ElMessage} from "element-plus";
import {computed, Ref, ref, watch} from "vue";

import {ExchangeDataFormat} from "~/components/data/ExchangeDataFormat";
import GisDataInfo from "~/components/data/GisDataInfo";
import {WktDataFormat} from "~/components/data/WktDataFormat";

const props = defineProps({
  data: {
    type: Object as () => GisDataInfo,
    default: () => new GisDataInfo()
  },
  transformChain: {
    type: Array as () => number[],
    default: () => []
  }
})

const emit = defineEmits<{
  'transform-crs': []
  'reset-crs': []
  'navigate-chain': [epsgCode: number]
}>()

const curGeo = ref<string | null>(null)

const exchangeDataType = ref("HasProperties");
const dataStr_exchange = ref<string[]>([]);
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

},{deep:true,immediate:true})
const geoJsonType = ref("FeatureCollection");
const includeCrs = ref(false);
const jsonFormat = ref("pretty");
const dataStr_Geojson = ref<string | string[] | undefined>(undefined);

const crsObj = computed(() => {
  if (!includeCrs.value || !props.data?.crs?.isValid) return null;
  return { type: "name", properties: { name: `EPSG:${props.data.crs.epsgCode}` } };
});

const jsonSpace = computed(() => jsonFormat.value === 'pretty' ? 2 : undefined);

watch(() => [props.data, geoJsonType.value, includeCrs.value, jsonFormat.value], () => {
  if (!props.data || !props.data.features?.length) {
    dataStr_Geojson.value = undefined;
    return;
  }
  const type = geoJsonType.value;
  const space = jsonSpace.value;
  switch (type) {
    case "FeatureListArray": {
      const features = props.data.features.map(f => {
        const fea = { ...f };
        if (crsObj.value) (fea as Record<string, unknown>).crs = crsObj.value;
        return fea;
      });
      dataStr_Geojson.value = JSON.stringify(features, null, space);
      break;
    }
    case "FeatureCollection": {
      const fc: Record<string, unknown> = {
        type: "FeatureCollection",
        features: props.data.features
      };
      if (crsObj.value) fc.crs = crsObj.value;
      dataStr_Geojson.value = JSON.stringify(fc, null, space);
      break;
    }
    case "FeatureSplit": {
      curGeo.value = null;
      dataStr_Geojson.value = props.data.features.map(f => {
        const fea = { ...f };
        if (crsObj.value) (fea as Record<string, unknown>).crs = crsObj.value;
        return JSON.stringify(fea, null, space);
      });
      break;
    }
    default:
      dataStr_Geojson.value = undefined;
  }
}, {deep: true, immediate: true})

const handleDownloadJson = () => {
  let downloadContent: string;
  if (geoJsonType.value === "FeatureSplit") {
    downloadContent = curGeo.value ?? '';
  } else if (Array.isArray(dataStr_Geojson.value)) {
    downloadContent = dataStr_Geojson.value.join('\r\n');
  } else {
    downloadContent = dataStr_Geojson.value ?? '';
  }
  let fileName = geoJsonType.value + new Date().getTime();
  const blob = new Blob([downloadContent], {type: "application/json"});
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
  let downloadContent: string = dataStr_exchange.value.join("\r\n");
  let fileName = "电子报盘" + new Date().getTime();
  const blob = new Blob([downloadContent], {type: "application/text"});
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

const hasValidCrs = computed(() => {
  const crs = props.data?.crs
  return crs && crs.epsgCode > 0 && crs.isValid
})

const crsInfo = computed(() => props.data?.crs?.crsInfo ?? null)

</script>
<template>
  <div class="gis-data-viewer-container">
    <el-tabs class="gis-data-viewer-tabs">
      <el-tab-pane label="数据信息">
        <div class="data-info-content">
          <el-descriptions :column="2" border label-class-name="info-label" class="data-info-desc">
            <el-descriptions-item label="数据名称">{{ props.data?.name || '未命名' }}</el-descriptions-item>
            <el-descriptions-item label="要素数量">{{ props.data?.features?.length ?? 0 }}</el-descriptions-item>
            <el-descriptions-item label="几何类型">{{ props.data?.getTypes?.()?.join(', ') || '无' }}</el-descriptions-item>
            <el-descriptions-item label="坐标系">
              <span v-if="hasValidCrs">EPSG:{{ props.data?.crs?.epsgCode }}</span>
              <span v-else class="text-muted">未设置</span>
            </el-descriptions-item>
            <template v-if="crsInfo">
              <el-descriptions-item label="坐标系名称">{{ crsInfo.name }}</el-descriptions-item>
              <el-descriptions-item label="坐标系类型">
                <el-tag size="small" :type="crsInfo.projected ? 'warning' : 'success'">
                  {{ crsInfo.projected ? '投影坐标系' : '地理坐标系' }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="中央经线">{{ crsInfo.centralMeridian }}</el-descriptions-item>
              <el-descriptions-item label="带号">{{ crsInfo.withZone ? crsInfo.zoneNumber : '无' }}</el-descriptions-item>
              <el-descriptions-item label="经度范围">{{ crsInfo.minLon }} ~ {{ crsInfo.maxLon }}</el-descriptions-item>
              <el-descriptions-item label="是否带号">{{ crsInfo.withZone ? '是' : '否' }}</el-descriptions-item>
            </template>
          </el-descriptions>

          <!-- 转换链溯源 -->
          <div v-if="transformChain.length > 1" class="transform-chain">
            <span class="chain-label">转换历程：</span>
            <template v-for="(epsg, idx) in transformChain" :key="epsg">
              <span
                class="chain-node"
                :class="{ 'is-current': idx === transformChain.length - 1 }"
                @click="idx < transformChain.length - 1 && emit('navigate-chain', epsg)"
              >
                EPSG:{{ epsg }}
              </span>
              <span v-if="idx < transformChain.length - 1" class="chain-arrow">→</span>
            </template>
          </div>

          <div class="data-info-actions">
            <el-button
              size="small"
              type="primary"
              :disabled="!hasValidCrs"
              @click="emit('transform-crs')"
            >
              坐标转换
            </el-button>
            <el-button
              size="small"
              @click="emit('reset-crs')"
            >
              重设坐标系
            </el-button>
          </div>
        </div>
      </el-tab-pane>
      <el-tab-pane :disabled="!hasFeatures" label="编辑&查看">
        <gis-data-inspactor :data="props.data" />
      </el-tab-pane>
      <el-tab-pane :disabled="!hasFeatures" label="GeoJson">
        <div class="h-40px"
             style="display: flex;flex-direction: row;align-items: center;justify-content: space-between; "
>
          <div style="display: flex; align-items: center; gap: 8px;">
            <el-radio-group v-model="geoJsonType" size="small">
              <el-radio-button value="FeatureCollection">FeatureCollection</el-radio-button>
              <el-radio-button value="FeatureListArray">FeatureList Array</el-radio-button>
              <el-radio-button value="FeatureSplit">Feature Split</el-radio-button>
            </el-radio-group>
            <el-checkbox v-model="includeCrs" :disabled="!hasValidCrs" size="small">CRS</el-checkbox>
            <el-select v-model="jsonFormat" size="small" style="width: 100px;">
              <el-option label="格式化" value="pretty" />
              <el-option label="压缩" value="compact" />
            </el-select>
          </div>
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
              language="wkt"
          />
        </div>
      </el-tab-pane>
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
          <geo-str-editor :value="display_exchange" language="exchange" />
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<style scoped>
.gis-data-viewer-container {
  width: 100%;
  height: 100%;
  background: var(--el-bg-color);
  border-radius: 5px;
  box-sizing: border-box;
}

.gis-data-viewer-tabs {
  height: calc(100%);
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

.data-info-content {
  padding: 4px 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.data-info-desc {
  width: 100%;
}

.data-info-desc :deep(.info-label) {
  width: 100px;
  min-width: 100px;
  font-size: 13px;
}

.data-info-desc :deep(.el-descriptions__body) {
  font-size: 13px;
}

.data-info-actions {
  display: flex;
  gap: 8px;
  padding-top: 4px;
}

.transform-chain {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-wrap: wrap;
  padding: 6px 10px;
  background: var(--el-fill-color-lighter);
  border-radius: 6px;
}

.chain-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
  margin-right: 4px;
}

.chain-node {
  font-family: monospace;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  cursor: default;
  transition: all 0.2s;
}

.chain-node:not(.is-current) {
  cursor: pointer;
  color: var(--el-color-primary);
  border-color: transparent;
}

.chain-node:not(.is-current):hover {
  background: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary-light-7);
}

.chain-node.is-current {
  background: var(--el-color-primary-light-8);
  border-color: var(--el-color-primary-light-5);
  color: var(--el-color-primary-dark-2);
  font-weight: 600;
}

.chain-arrow {
  color: var(--el-text-color-placeholder);
  font-size: 11px;
  margin: 0 1px;
}

.text-muted {
  color: var(--el-text-color-placeholder);
  font-style: italic;
}
</style>
