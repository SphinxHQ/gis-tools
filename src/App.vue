<script lang="ts" setup>
import { watch, defineAsyncComponent, getCurrentInstance, onBeforeMount, reactive, ref, shallowRef, toRef, toRefs } from 'vue';
import { isDark } from './composables';

const font = reactive({
  color: 'rgba(0, 0, 0, .05)',
})

watch(
  isDark,
  () => {
    font.color = isDark.value
      ? 'rgba(255, 255, 255, .05)'
      : 'rgba(0, 0, 0, .05)'
  },
  {
    immediate: true,
  }
)
</script>
<template>
  <el-config-provider size="small" :z-index="9">
    <el-watermark style="height: 100%; width: 100%;" :font="font" :content="['Gis Tools', 'Yuan Yu']">
      <base-main></base-main>
    </el-watermark>
  </el-config-provider>
</template>
<style>
html,
body,
#app {
  height: 100%;
}
</style>
<style scoped>
#app {
  text-align: center;
  color: var(--gt-text-color-primary);
}
</style>
