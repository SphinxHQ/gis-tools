<!-- <script setup lang="ts">
/**
 * @file GIS descriptions component
 * @description Element Plus descriptions wrapper for displaying feature properties.
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2026-04-13
 */

import {computed} from "vue";

import GisDataInfo from "~/components/data/GisDataInfo";
import { GisCrsInfo} from "~/components/data/GisProjectedBounds";

/** Description item with label and value for el-descriptions rendering */
interface DescriptionItem {
  /** Display label */
  label: string;
  /** Display value */
  value: unknown;
}

const props = defineProps({
  /** Data object to display (GisCrsInfo, GisDataInfo, or plain object) */
  data: {
    type: Object,
    default: () => {
      return {}
    }
  },
  /** Label column width */
  labelWidth:{
    type: String,
    default: '120px'
  },
  /** Number of description columns */
  column:{
    type: Number,
    default: 1
  }
})

/** Computed description items based on data type (GisCrsInfo, GisDataInfo, or generic object) */
const _data = computed(() => {
  const items: DescriptionItem[] = [];
  const data = props.data;

  if (!data) {
    return { items };
  }

  if (data instanceof GisCrsInfo) {
    items.push({ label: '坐标系名称', value: data.name });
    items.push({ label: 'EPSG代码', value: `EPSG:${data.epsgCode}` });
    items.push({ label: '是否投影坐标', value: data.projected ? '是' : '否' });
    items.push({ label: '中央经线', value: data.centralMeridian });
    items.push({ label: '带号', value: data.zoneNumber ?? '无' });
  } else if (data instanceof GisDataInfo) {
    items.push({ label: '数据名称', value: data.name || '未命名' });
    items.push({ label: '要素数量', value: data.features?.length ?? 0 });
    items.push({ label: '几何类型', value: data.getTypes?.()?.join(', ') || '无' });
    if (data.crs) {
      items.push({ label: '坐标系', value: `EPSG:${data.crs.epsgCode}` });
    }
  } else if (typeof data === 'object' && data !== null) {
    // 通用对象展示
    for (const key in data as Record<string, unknown>) {
      const val = (data as Record<string, unknown>)[key];
      if (val !== undefined && val !== null && typeof val !== 'function') {
        items.push({ label: key, value: typeof val === 'object' ? JSON.stringify(val) : val });
      }
    }
  }

  return { items };
})
</script>

<template>
  <el-descriptions :column="column" border>
    <el-descriptions-item v-for="(item,idx) of _data.items" :key="idx" :label-class-name="`w-${labelWidth}`" :label="item.label">{{ item.value }}
    </el-descriptions-item>
  </el-descriptions>
</template>

<style scoped>

</style> -->
