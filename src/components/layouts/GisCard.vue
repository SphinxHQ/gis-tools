<script setup lang="ts">
/**
 * @file GIS card component
 * @description A styled card container for GIS data sections.
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2026-04-13
 */

import {getCurrentInstance, onMounted, ref} from "vue";

defineProps({
  /** Card title displayed in the header */
  title: {
    type: String,
    default: ''
  }
})
/** Root element ref */
const el = ref();
/** Container div ref */
const div = ref();

onMounted(() => {
  let currentInstance = getCurrentInstance();
  el.value = currentInstance?.vnode.el;
})
</script>

<template>
  <div ref="div" class="gis-card-container">
    <div class="gis-card-box">
      <div class="gis-card-box__header">
        <span class="gis-card-box__title"><el-icon><ElementPlus /></el-icon>&nbsp;{{ title }}</span>
      </div>
      <div class="gis-card-box__body">
        <slot name="default" />
      </div>
    </div>
  </div>
</template>
<style scoped>

.gis-card-container,
.gis-card-container,* {
  box-sizing: border-box;
}
.gis-card-container{
  border:1px solid #DDDDDD;
  border-radius: 5px;
}

.gis-card-container .gis-card-box {
  margin: 0;
  width: 100%;
}

.gis-card-container .gis-card-box__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 35px;
  padding: 0 10px;
  background-image: linear-gradient(45deg, var(--el-color-primary-dark-2), transparent);
  border-bottom: 1px solid #EEE;
}

.gis-card-container  .gis-card-box__title {
  color: white;
  display: flex;
  align-items: center;
}
.gis-card-container .gis-card-box__body{

}
</style>
