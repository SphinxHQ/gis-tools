<script setup lang="ts">
/**
 * @file GIS data reader component
 * @description Handles file upload, drag-and-drop, clipboard paste, and share target
 *              data import. Supports all spatial data formats via SimpleDataFormat parsing.
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2026-04-13
 */
import * as GeoJSON from 'geojson';
import {getCurrentInstance, onMounted, ref,ComponentInternalInstance, computed} from "vue";

import Common from "~/common/Common";
import {GisError, GisErrorCode, createUserMessage} from "~/common/GisError";
import {logger as appLogger} from "~/common/logger";
import {SimpleDataFormat} from "~/components/data/DataFormat";
import {useBreakpoint} from "~/composables/useBreakpoint";
import GisDataInfo from "~/components/data/GisDataInfo";
import {GisFileData} from "~/components/data/LocalDb";
import MapDrawer from "~/components/data/MapDrawer.vue";
import {TipLog, TipLogger} from "~/components/data/TipLogger";
import GeoTypeRender from "~/components/renders/GeoTypeRender.vue";
import GeoTypeIconRender from "~/components/renders/GeoTypeIconRender.vue";
import VertexCountRender from "~/components/renders/VertexCountRender.vue";
import {localDb} from "~/composables/localDb";

const emitHandler = defineEmits(['read','error'])

const activeReaderTab = ref('upload')
const { isMobile } = useBreakpoint()
/** 数字格式化：超过1000用k显示（如 1200 → 1.2k） */
const formatCount = (n: number): string => {
  if (n >= 1000) {
    const k = n / 1000
    return k >= 10 ? Math.round(k) + 'k' : k.toFixed(1) + 'k'
  }
  return String(n)
}

/** 时间列格式化：移动端去掉年和秒（MM-DD HH:mm），桌面端显示完整时间 */
const formatTime = (row: GisFileData) => {
  const full = Common.dataTimeToLocal(row.id)
  if (isMobile.value) {
    // "2026/4/13 01:08:14" → "04-13 01:08"
    const match = full.match(/\d{4}\/(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})/)
    if (match) {
      return `${match[1].padStart(2,'0')}-${match[2].padStart(2,'0')} ${match[3].padStart(2,'0')}:${match[4]}`
    }
    return full
  }
  return full
}

/** 移动端时间列-日期部分：MM.DD */
const formatTimeDate = (id: number): string => {
  const full = Common.dataTimeToLocal(id)
  const match = full.match(/\d{4}\/(\d{1,2})\/(\d{1,2})/)
  if (match) {
    return `${match[1].padStart(2,'0')}.${match[2].padStart(2,'0')}`
  }
  return full
}

/** 移动端时间列-时分部分：HH:mm */
const formatTimeHM = (id: number): string => {
  const full = Common.dataTimeToLocal(id)
  const match = full.match(/(\d{1,2}):(\d{2})/)
  if (match) {
    return `${match[1].padStart(2,'0')}:${match[2]}`
  }
  return ''
}
defineProps({
  dataType: {
    type: String,
    default: '上传文件'
  }
})
const txt = ref('')
const tipText = ref('')
const loading = ref(false)

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
        localDb.add(dataNamme, val, extractMeta(data as GisDataInfo))
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
      localDb.add(dataName, txt.value, extractMeta(data as GisDataInfo))
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

/** 从解析结果中提取元数据，用于历史记录展示 */
const extractMeta = (data: GisDataInfo) => ({
  crs: data.crs?.epsgCode ? `EPSG:${data.crs.epsgCode}` : '',
  types: data.getTypes()?.join(', ') || '',
  featureCount: data.features?.length ?? 0,
  vertexCount: data.getTotalVertexCount(),
})
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
    localDb.add(dataNamme, jsonStr, extractMeta(data as GisDataInfo));
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
            accept=".geojson,.json,.wkt,.txt,.csv,.shp,.zip,.dxf,.exf,.wkb,application/json,application/zip,application/octet-stream,text/plain,text/csv,application/dxf"
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
        <div class="text-tab-content">
          <el-input
            v-model="txt"
            type="textarea"
            :rows="10"
            placeholder="请输入 GeoJSON / WKT / 电子报盘文本"
            resize="vertical"
            class="text-textarea"
          />
        </div>
      </el-tab-pane>
      <el-tab-pane label="绘制图形">
        <map-drawer @submit="handleMapDrawSubmit" />
      </el-tab-pane>
      <el-tab-pane v-if="hiastorySupported" label="历史记录">
        <div class="history-tab-content">
          <el-table :data="historyDatas" stripe class="history-table" @row-click="handleHistoryRowClick">
            <!-- 移动端：时间列（两行：日期 + 时分） -->
            <el-table-column v-if="isMobile" prop="id" label="时间" width="72" class-name="col-time">
              <template #default="{ row }">
                <div class="time-cell">
                  <div class="time-date">{{ formatTimeDate(row.id) }}</div>
                  <div class="time-hm">{{ formatTimeHM(row.id) }}</div>
                </div>
              </template>
            </el-table-column>
            <!-- 移动端：名称+图形类型合并列（双行展示） -->
            <el-table-column v-if="isMobile" label="名称/类型" min-width="120">
              <template #default="{ row }">
                <div class="mobile-info-cell">
                  <div class="mobile-info-name">{{ row.name }}</div>
                  <div class="mobile-info-meta">
                    <div class="mobile-info-types">
                      <GeoTypeIconRender
                        v-for="t in (row.types || '').split(', ').filter(Boolean)"
                        :key="t"
                        :type="t"
                        :size="14"
                      />
                    </div>
                    <div class="mobile-info-counts">
                      <span class="count-capsule">
                        <span class="count-capsule-left">{{ formatCount(row.featureCount ?? 0) }}</span>
                        <span class="count-capsule-right">{{ formatCount(row.vertexCount ?? 0) }}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </template>
            </el-table-column>

            <!-- 桌面端：完整 6 列布局 -->
            <template v-if="!isMobile">
              <el-table-column prop="id" label="时间" width="150"
                               :formatter="(row: GisFileData) => Common.dataTimeToLocal(row.id) "
              />
              <el-table-column prop="name" label="名称" min-width="120" show-overflow-tooltip />
              <el-table-column prop="crs" label="坐标系" width="100" />
              <el-table-column label="要素类型" min-width="120">
                <template #default="{ row }">
                  <div class="geo-types-cell">
                    <GeoTypeRender
                      v-for="t in (row.types || '').split(', ').filter(Boolean)"
                      :key="t"
                      :type="t"
                      :size="13"
                    />
                  </div>
                </template>
              </el-table-column>
              <el-table-column prop="featureCount" label="要素数" width="70" align="center" />
              <el-table-column label="顶点数" width="90" align="center">
                <template #default="{ row }">
                  <VertexCountRender :count="row.vertexCount ?? 0" />
                </template>
              </el-table-column>
            </template>
          </el-table>
        </div>
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
  overflow: hidden;
  padding: 0;
}

/* 输入文本 tab：flex 纵向布局，textarea 填满剩余空间 */
.text-tab-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
}

.text-textarea {
  flex: 1;
  min-height: 0;
}

.text-textarea :deep(.el-textarea__inner) {
  height: 100% !important;
  resize: vertical;
}

/* 历史记录 tab：flex 纵向布局，表格填满剩余空间 */
.history-tab-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
}

.history-table {
  flex: 1;
  min-height: 0;
}

/* 隐藏 table 滚动条但保留滚动功能（用户要求：table 最好不要滚动条） */
.history-table :deep(.el-scrollbar__bar) {
  display: none;
}

.error-detail-textarea :deep(.el-textarea__inner) {
  font-family: monospace;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--el-color-danger);
}
.geo-types-cell {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

/* 移动端历史记录：时间列两行显示（日期 + 时分），等宽字体对齐 */
.time-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  font-family: 'SF Mono', 'Consolas', 'Menlo', 'Roboto Mono', monospace;
  font-variant-numeric: tabular-nums;
  line-height: 1.3;
}

.time-date {
  font-size: 12px;
  color: var(--gis-text-primary);
  font-weight: 500;
  min-width: 38px;
  text-align: center;
}

.time-hm {
  font-size: 12px;
  color: var(--gis-text-secondary);
  min-width: 38px;
  text-align: center;
}

/* 移动端历史记录：名称+类型合并单元格，双行展示 */
.mobile-info-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 4px 0;
}

.mobile-info-name {
  font-size: 12px;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-bottom: 3px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  color: var(--gis-text-primary);
}

/* 第二排：左侧类型图标 + 右侧胶囊数字 */
.mobile-info-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  line-height: 1.2;
}

.mobile-info-types {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
  flex-shrink: 0;
}

.mobile-info-counts {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-shrink: 0;
}

/* 拼合胶囊：左蓝（要素数）右绿（顶点数），拼成一个胶囊 */
.count-capsule {
  display: inline-flex;
  align-items: center;
  height: 16px;
  border-radius: 8px;
  overflow: hidden;
  font-family: 'SF Mono', 'Consolas', 'Menlo', 'Roboto Mono', monospace;
  font-size: 10px;
  font-weight: 600;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.count-capsule-left {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  min-width: 22px;
  padding: 0 5px;
  background: rgba(37, 99, 235, 0.15);
  color: #2563eb;
  text-align: right;
}

.count-capsule-right {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  min-width: 22px;
  padding: 0 5px;
  background: rgba(22, 163, 74, 0.15);
  color: #16a34a;
  text-align: right;
}

/* 移动端（xs/sm <768px）：tabs 等宽分布，避免溢出和横向滚动 */
@media (max-width: 767px) {
  /* 隐藏 tabs 滚动箭头（改用等宽分布，无需滚动） */
  .gis-data-reader-container :deep(.el-tabs__nav-prev),
  .gis-data-reader-container :deep(.el-tabs__nav-next) {
    display: none !important;
  }

  /* nav-wrap 取消 overflow:hidden，允许 nav 铺满 */
  .gis-data-reader-container :deep(.el-tabs__nav-wrap) {
    overflow: visible;
  }

  /* nav-scroll 铺满，取消居中限制 */
  .gis-data-reader-container :deep(.el-tabs__nav-scroll) {
    width: 100%;
    overflow: visible;
  }

  /* nav 使用 flex 等宽分布 */
  .gis-data-reader-container :deep(.el-tabs__nav) {
    width: 100%;
    transform: none !important;
    display: flex;
  }

  /* 每个 tab 等宽（1/4），文字超长省略 */
  .gis-data-reader-container :deep(.el-tabs__item) {
    flex: 1;
    width: 25%;
    padding: 0 4px !important;
    font-size: 12px;
    text-align: center;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* border-card 类型 tabs 的 header padding 清零 */
  .gis-data-reader-container :deep(.el-tabs--border-card > .el-tabs__header) {
    padding: 0;
  }

  /* 移动端表格单元格 padding 缩小 */
  .gis-data-reader-container :deep(.history-table .el-table__body td) {
    padding: 4px 2px;
  }

  .gis-data-reader-container :deep(.history-table .el-table__header th) {
    padding: 4px 2px;
  }
}
</style>
