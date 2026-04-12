<script setup lang="ts">
import proj4 from "proj4";
import {markRaw, onMounted, Ref, ref} from "vue";

import {CrsBounds, CrsInfo} from "~/components/data/GisProjectedBounds";


const props = defineProps({
  type: {
    type: String,
    default: ''
  },
  disableValues:{
    type: Array,
    default: () => []
  }
})
defineEmits(['change']);
const crsList: Ref<any[]> = ref([]);
onMounted(() => {
  const keys = Object.keys(proj4.defs)
  crsList.value = markRaw(keys.map(x => {
    const proj = proj4.defs(x)
    return {
      name: x,
      title: proj.title,
    }
  }))
})


type CascaderOptions = {
  key: any,
  label: string,
  disabled: boolean,
  value?: any,
  isLeaf?:boolean,
  children?: CascaderOptions[]
}

const generateData = () => {
  const optPrj: CascaderOptions = {
    key: 0,
    label: '投影坐标系',
    disabled: false,
    value:{name:'投影坐标系'},
    children: []
  };
  const optGra: CascaderOptions = {
    key: 2,
    label: '地理坐标系',
    disabled: false,
    value:{name:'地理坐标系'},
    children: []
  }
  Object.values(CrsBounds).sort((a,b)=>a.epsgCode - b.epsgCode).forEach(item => {
    const projected = item.projected;
    const groupName = item.name.split("/")[0].trim();
    let _opt = projected ? optPrj : optGra;
    if (!_opt.children?.some((item: any) => item.label === groupName)) {
      _opt.children?.push({
        key: groupName,
        label: groupName,
        disabled: false,
        children: []
      })
    }
    const find = _opt?.children?.find(item => item.label === groupName);
    find?.children?.push({
      key: item.epsgCode,
      label: item.name,
      value:item,
      isLeaf:true,
      disabled: props.disableValues.includes(item.epsgCode)
    })
  });
  return [optPrj, optGra]
}

const cascaderOptions: Record<string, unknown>[] = generateData()
const cascader:any = ref();
const curCrsInfo:Ref<CrsInfo> = ref<CrsInfo>({} as CrsInfo);
const handleChange = (value:any[]) => {
  curCrsInfo.value = value[2]
}

</script>

<template>
  <div>
    <el-descriptions border :column="2">
      <el-descriptions-item label-class-name="w-80px" label="坐标系名称"><span class="c-value">{{ curCrsInfo.name }}</span></el-descriptions-item>
      <el-descriptions-item label-class-name="w-80px" label="坐标系代码"><span class="c-value">{{ curCrsInfo.epsgCode }}</span></el-descriptions-item>
      <el-descriptions-item label-class-name="w-80px" label="坐标系类型"><span class="c-value">{{ curCrsInfo.projected ? '投影坐标系' : '地理坐标系' }}</span></el-descriptions-item>
      <el-descriptions-item label-class-name="w-80px" label="带号"><span class="c-value">{{ curCrsInfo.withZone ? curCrsInfo.zoneNumber : '无' }}</span></el-descriptions-item>
      <el-descriptions-item label-class-name="w-80px" label="中央经线"><span class="c-value">{{ curCrsInfo.centralMeridian }}</span></el-descriptions-item>
      <el-descriptions-item label-class-name="w-80px" label="经度范围"><span class="c-value">{{ curCrsInfo.minLon }} ~ {{ curCrsInfo.maxLon }}</span></el-descriptions-item>
      <el-descriptions-item label-class-name="w-80px" label="北"><span class="c-value">{{ curCrsInfo.envelope?.top }}</span></el-descriptions-item>
      <el-descriptions-item label-class-name="w-80px" label="西"><span class="c-value">{{ curCrsInfo.envelope?.left }}</span></el-descriptions-item>
      <el-descriptions-item label-class-name="w-80px" label="南"><span class="c-value">{{ curCrsInfo.envelope?.bottom }}</span></el-descriptions-item>
      <el-descriptions-item label-class-name="w-80px" label="东"><span class="c-value">{{ curCrsInfo.envelope?.right }}</span></el-descriptions-item>
      </el-descriptions>
  </div>
  <el-cascader-panel v-model="cascader" filterable class="w-full" :options="cascaderOptions" @change="handleChange">
    <template #default="{ data }">
      <span>{{ data.label }}</span>
      <span v-if="data.children"> ({{ data.children.length }}) </span>
    </template>
  </el-cascader-panel>
  <div class="c-button">
    <el-button type="primary" @click="$emit('change', curCrsInfo)">确定</el-button>
  </div>
</template>
<style scoped>
.crs-option {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
}

.crs-option div:first-child {
  font-size: 14px;
}

.crs-option div:last-child {
  font-size: 11px;
  color: #999;
}
.c-value{
  display: inline-block;
  width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: middle;
}
.c-button{
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
}
</style>