<script setup lang="ts">

import { ElMessageBox} from "element-plus";
import * as GeoJSON from 'geojson';
import {getCurrentInstance, onMounted, ref,ComponentInternalInstance} from "vue";

import Common from "~/common/Common";
import {logger as appLogger} from "~/common/logger";
import {SimpleDataFormat} from "~/components/data/DataFormat";
import GisDataInfo from "~/components/data/GisDataInfo";
import {GisFileData} from "~/components/data/LocalDb";
import MapDrawer from "~/components/data/MapDrawer.vue";
import {TipLog, TipLogger} from "~/components/data/TipLogger";
import {localDb} from "~/composables/localDb";

const emitHandler = defineEmits(['read','error'])
defineProps({
  dataType: {
    type: String,
    default: '上传文件'
  }
})
const txt = ref('')
const tipText = ref('')
const loading = ref(false)
let curInstance: ComponentInternalInstance | null = null;
let tipLogger: TipLogger | null = null;
onMounted(() => {
  curInstance = getCurrentInstance();
  if (curInstance) {
    tipLogger = new TipLogger(curInstance);
    tipLogger.on('change', (...args: unknown[]) => {
      const log = args[0] as TipLog;
      setTipText(log.name);
    })
  }
})
const handleFileChanged = (file: { name: string; raw: Blob }) => {
  try {
    const reader = new FileReader()
    const dataNamme = file.name;
    reader.onload = (e) => {
      const val = e.target?.result as string
      readContext(val, dataNamme).then((data: unknown) => {
        localDb.add(dataNamme, val)
        emitHandler('read', data)
      }).catch((e: Error) => {
        appLogger.error('文件解析失败:', e);
        emitHandler('error',e)
        ElMessageBox.alert(`解析失败${e.message}`, "错误", {
          type: 'error',
          confirmButtonText: '确定',
        })
      })
    }
    reader.readAsArrayBuffer(file.raw)
  } catch (e) {
    appLogger.error('文件读取失败:', e);
  }
}

const handleHistoryRowClick = (row: GisFileData) => {
  readContext(row.content, row.name).then((data: unknown) => {
    emitHandler('read', data)
  }).catch((e: Error) => {
    appLogger.error('历史记录解析失败:', e);
    emitHandler('error',e)
    ElMessageBox.alert(`解析失败${e.message}`, "错误", {
      type: 'error',
      confirmButtonText: '确定',
    })
  })
}

const handleTextChanged = (_txt: string) => {
  try {
    const dataName = `文本-${new Date().getTime()}`;
    readContext(_txt, dataName).then((data: unknown) => {
      localDb.add(dataName, _txt)
      emitHandler('read', data)
    }).catch((e: Error) => {
      appLogger.error('文本解析失败:', e);
      emitHandler('error',e)
      ElMessageBox.alert(`解析失败${e.message}`, "错误", {
        type: 'error',
        confirmButtonText: '确定',
      })
    })
  } catch (e) {
    appLogger.error('文本处理失败:', e);
  }
}
const readContext = (context: unknown, dataName: string): Promise<unknown> => {
  if (loading.value) {
    return Promise.reject(new Error("Running"));
  }
  return new Promise<unknown>((resolve, reject) => {
    loading.value = true
    try {
      if (context !== undefined) {
        const simpleDataFormat = new SimpleDataFormat();
        return simpleDataFormat.read(context as ArrayBuffer | string).then((data: GisDataInfo) => {
          data.name = dataName;
          resolve(data)
        }).catch(reject)
      }else {
        reject(new Error("Context Empty"));
      }
    } catch (e) {
      reject(e);
    } finally {
      setTimeout(() => {
        loading.value = false
      }, 500)
    }
  })
}
const historyDatas = ref<GisFileData[]>([])
const setHistory = () => {
  localDb.listAll().then((datas: GisFileData[]) => {
    historyDatas.value = datas
  })
}
localDb.on('changed', setHistory);
setHistory();
const hiastorySupported = ref(localDb.isSupport)

const setTipText = (msg: string) => {
  tipText.value = msg
}
const handleMapDrawSubmit = (features: GeoJSON.Feature[]) => {
  const dataNamme = `绘制-${new Date().getTime()}`;
  const jsonStr = JSON.stringify({
    type: "FeatureCollection",
    features: features
  });
  readContext(jsonStr, dataNamme).then((data: unknown) => {
    localDb.add(dataNamme, jsonStr);
    emitHandler('read', data)
  }).catch((e: Error) => {
    appLogger.error('绘制数据解析失败:', e);
    emitHandler('error',e)
    ElMessageBox.alert(`解析失败${e.message}`, "错误", {
      type: 'error',
      confirmButtonText: '确定',
    })
  })
}
const appendMode = ref(false)
</script>
<template>
  <div v-loading="loading" class="gis-data-reader-container">
    <el-tabs type="border-card" class="gis-data-reader-tabs" editable :closable="false">

      <template #add-icon>
        <div style="margin-right: 10px; color: var(--el-color-primary)">
          <el-switch v-model="appendMode" active-text="追加模式" />
        </div>
      </template>
      <el-tab-pane label="上传文件">
        <el-upload
            class="w-full h-95%"
            drag
            :limit="0"
            :on-change="handleFileChanged"
            :auto-upload="false"
        >
          <div class="upload-info">
            <el-icon class="el-icon--upload">
              <upload-filled />
            </el-icon>
            <div class="el-upload__text">
              拖拽文件到此处 或 <em>点击上传</em>
              <p>
                ShapeFile、ShapeZip、GeoJson、WKT、DXF、EXF、电子报盘
              </p>
            </div>
          </div>
          <template #file>
            <div />
          </template>
        </el-upload>
      </el-tab-pane>
      <el-tab-pane label="输入文本">
        <geo-str-editor :value="txt" @input="handleTextChanged" />
      </el-tab-pane>
      <el-tab-pane label="绘制图形">
        <map-drawer @submit="handleMapDrawSubmit" />
      </el-tab-pane>
      <el-tab-pane v-if="hiastorySupported" label="历史记录">
        <div class="h-40px">
          <el-button type="primary" size="small" @click="setHistory">刷新</el-button>
          <el-button type="primary" size="small" @click="localDb.clear()">清空</el-button>
        </div>
        <el-table :data="historyDatas" stripe class="h-[100%-40px]" @row-click="handleHistoryRowClick">
          <el-table-column prop="id" label="时间" width="150"
                           :formatter="(row: GisFileData) => Common.dataTimeToLocal(row.id) "
/>
          <el-table-column prop="name" label="名称" />
        </el-table>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<style scoped>
.gis-data-reader-container {
  width: 100%;
  height: 370px;
  background: #FFF;
  box-sizing: border-box;
}

.gis-data-reader-tabs {
  height: calc(100%);
}

.gis-data-reader-footer {
  text-align: right;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 0 20px;
}

.gis-data-reader-container :deep(.el-upload--text.is-drag),
.gis-data-reader-container :deep( .el-upload-dragger ){
  height: 100%;
}

.upload-info {
  height: 100%;
  display: flex;
  align-items: center;
  flex-direction: column;
  justify-content: center;
}

.gis-data-reader-container :deep( .el-tabs--border-card ){
  border: none;
}

.gis-data-reader-container :deep( .el-tabs .el-tabs__content .el-tab-pane ){
  height: 100%;
  width: 100%;
  overflow: auto;
  padding: 0;
}

</style>
