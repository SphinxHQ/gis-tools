<script lang="ts" setup>
import {reactive} from "vue";

const font = reactive({
  color: 'rgba(0, 0, 0, .05)',
})

</script>
<template>
  <el-config-provider size="small" :z-index="9">
    <el-watermark style="height: 100%; width: 100%;" :font="font" :content="[]">
      <router-view />
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
}
</style>
