<script setup lang="ts">
import {Ref, ref} from "vue";

import GisDataInfo from "~/components/data/GisDataInfo";
import GisDataTransformer from "~/components/data/GisDataTransformer.vue";
import GisCard from "~/components/layouts/GisCard.vue";

const data: Ref<GisDataInfo> = ref(new GisDataInfo());
const handles = {
  read: (_data: GisDataInfo) => {
    data.value = _data;
  }
}
</script>

<template>
  <div class="w-full h-full">
    <div style="padding-left: 20px;line-height: 30px;display: flex; justify-content: space-between;">Gis Tools <em
        style="font-size: 9px"
>by <a
        href="mailto:yuanyu@supermap.com?subject=GisToolWeb&body=BUG:"
>yuanyu@supermap.com</a></em></div>
    <div style="width: 100%;height: calc(100% - 30px); padding: 10px;box-sizing: border-box;">
      <gis-card title="数据导入">
        <gis-data-reader @read="handles.read" />
      </gis-card>
      <gis-card title="数据查看" style="margin-top: 10px">
        <gis-data-transformer :data="data" />
      </gis-card>
    </div>

  </div>
</template>

<style scoped>

</style>
