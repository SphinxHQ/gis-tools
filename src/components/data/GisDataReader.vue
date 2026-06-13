<script setup lang="ts">

import * as GeoJSON from 'geojson';
import {getCurrentInstance, onMounted, ref,ComponentInternalInstance} from "vue";

import Common from "~/common/Common";
import {GisError, GisErrorCode, createUserMessage} from "~/common/GisError";
import {logger as appLogger} from "~/common/logger";
import {SimpleDataFormat} from "~/components/data/DataFormat";
import GisDataInfo from "~/components/data/GisDataInfo";
import {GisFileData} from "~/components/data/LocalDb";
import MapDrawer from "~/components/data/MapDrawer.vue";
import {TipLog, TipLogger} from "~/components/data/TipLogger";
import {localDb} from "~/composables/localDb";

const emitHandler = defineEmits(['read','error'])

const activeReaderTab = ref('upload')
defineProps({
  dataType: {
    type: String,
    default: '上传文件'
  }
})
const txt = ref('')
const tipText = ref('')
const loading = ref(false)
const editorLanguage = ref('json')

// 根据内容自动检测编辑器语言
const detectLanguage = (content: string): string => {
  const trimmed = content.trim()
  if (!trimmed) return 'json'
  // JSON: 以 { 或 [ 开头
  if (/^[\[{]/.test(trimmed)) return 'json'
  // WKT: 以 GEOMETRYCOLLECTION/POLYGON/LINESTRING/POINT/MULTI... 开头
  if (/^\s*(GEOMETRYCOLLECTION|MULTIPOLYGON|MULTILINESTRING|MULTIPOINT|POLYGON|LINESTRING|POINT)\b/i.test(trimmed)) return 'wkt'
  // 电子报盘: 含 [属性描述] 或 [地块坐标]
  if (/\[属性描述\]|\[地块坐标\]/.test(trimmed)) return 'exchange'
  return 'json'
}

const handleTextChanged = (_txt: string) => {
  txt.value = _txt
  editorLanguage.value = detectLanguage(_txt)
}

// 错误详情弹窗
const errorDialogVisible = ref(false)
const errorTitle = ref('')
const errorDetail = ref('')

const showError = (e: unknown, context: string) => {
  errorTitle.value = `${context}失败`
  let msg = createUserMessage(e)
  // 对 GisError 追加错误码信息
  if (e instanceof GisError) {
    const codeLabel: Record<string, string> = {
      [GisErrorCode.CRS_RECOGNITION_FAILED]: '坐标系识别失败',
      [GisErrorCode.COORDINATE_TRANSFORM_FAILED]: '坐标转换失败',
      [GisErrorCode.DATA_PARSE_FAILED]: '数据解析失败',
      [GisErrorCode.DATA_FORMAT_UNSUPPORTED]: '不支持的数据格式',
    }
    const label = codeLabel[e.code] || e.code
    msg = `[${label}]\n\n${msg}`
  }
  errorDetail.value = msg
  errorDialogVisible.value = true
}

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
    reader.onerror = () => {
      loading.value = false;
      appLogger.error('文件读取失败');
      emitHandler('error', new Error('文件读取失败'));
    }
    reader.onload = (e) => {
      const val = e.target?.result as string
      readContext(val, dataNamme).then((data: unknown) => {
        localDb.add(dataNamme, val)
        emitHandler('read', data)
      }).catch((e: Error) => {
        appLogger.error('文件解析失败:', e);
        emitHandler('error',e)
        showError(e, '文件解析')
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
    showError(e, '历史记录解析')
  })
}

const handleTextConfirm = () => {
  if (!txt.value.trim()) return;
  try {
    const dataName = `文本-${new Date().getTime()}`;
    readContext(txt.value, dataName).then((data: unknown) => {
      localDb.add(dataName, txt.value)
      emitHandler('read', data)
    }).catch((e: Error) => {
      appLogger.error('文本解析失败:', e);
      emitHandler('error',e)
      showError(e, '文本解析')
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
const handleMapDrawSubmit = (features: GeoJSON.Feature[], crsEpsg: number) => {
  const dataNamme = `绘制-${new Date().getTime()}`;
  const jsonStr = JSON.stringify({
    type: "FeatureCollection",
    features: features,
    crs: { type: "name", properties: { name: `EPSG:${crsEpsg}` } }
  });
  readContext(jsonStr, dataNamme).then((data: unknown) => {
    localDb.add(dataNamme, jsonStr);
    emitHandler('read', data)
  }).catch((e: Error) => {
    appLogger.error('绘制数据解析失败:', e);
    emitHandler('error',e)
    showError(e, '绘制数据解析')
  })
}

defineExpose({
  handleTextConfirm,
  txt,
  activeReaderTab,
  loading,
})
</script>
<template>
  <div v-loading="loading" class="gis-data-reader-container">
    <!-- 错误详情弹窗 -->
    <el-dialog v-model="errorDialogVisible" :title="errorTitle" width="600" destroy-on-close>
      <el-input
        type="textarea"
        :model-value="errorDetail"
        :rows="10"
        readonly
        resize="vertical"
        class="error-detail-textarea"
      />
      <template #footer>
        <el-button type="primary" @click="errorDialogVisible = false">确定</el-button>
      </template>
    </el-dialog>
    <el-tabs v-model="activeReaderTab" type="border-card" class="gis-data-reader-tabs">
      <el-tab-pane label="上传文件" name="upload">
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
      <el-tab-pane label="输入文本" name="text">
        <div class="language-hint">
          <el-tag size="small" type="info" disable-transitions>{{ editorLanguage === 'json' ? 'GeoJSON' : editorLanguage === 'wkt' ? 'WKT' : '电子报盘' }}</el-tag>
        </div>
        <geo-str-editor :value="txt" :read-only="false" :format="true" :language="editorLanguage" class="h-[calc(100%-24px)]" @input="handleTextChanged" />
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
  height: 100%;
  background: var(--el-bg-color);
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

.language-hint {
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 8px;
}

.error-detail-textarea :deep(.el-textarea__inner) {
  font-family: monospace;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--el-color-danger);
}
</style>
