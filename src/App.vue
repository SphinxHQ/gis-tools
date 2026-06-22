<script lang="ts" setup>
import {reactive, onMounted, onBeforeUnmount} from "vue";

import {hideEntryLoader} from "~/composables/entryLoader";

const font = reactive({
  color: 'rgba(0, 0, 0, .05)',
})

/**
 * 入口 loading 隐藏策略：
 *  1) MutationObserver 监听 #app 子树的所有 DOM 变化
 *  2) 当连续 QUIET_MS（默认 1200ms）没有任何 mutation，判定 app 初始化完毕
 *  3) 初始化完毕后再等 MIN_HOLD_MS（默认 1000ms），让首帧资源先到位
 *  4) 同时设置 HARD_TIMEOUT_MS（默认 30s）兜底，防止异常时永远卡住
 * 满足任一可隐藏条件即调用 hideEntryLoader（内部幂等）
 */
const QUIET_MS = 1200        // 连续无 DOM 变化的"安静期"
const MIN_HOLD_MS = 1000     // 安静期后再等 1s
const HARD_TIMEOUT_MS = 30000 // 兜底

let quietTimer: number | null = null
let holdTimer: number | null = null
let hardTimer: number | null = null
let observer: MutationObserver | null = null

function resetQuietTimer(): void {
  if (quietTimer !== null) window.clearTimeout(quietTimer)
  quietTimer = window.setTimeout(() => {
    // 进入安静期：再额外等 MIN_HOLD_MS 再 hide
    if (holdTimer !== null) window.clearTimeout(holdTimer)
    holdTimer = window.setTimeout(() => {
      hideEntryLoader()
      cleanup()
    }, MIN_HOLD_MS)
  }, QUIET_MS)
}

function cleanup(): void {
  if (observer) { observer.disconnect(); observer = null }
  if (quietTimer) { window.clearTimeout(quietTimer); quietTimer = null }
  if (holdTimer) { window.clearTimeout(holdTimer); holdTimer = null }
  if (hardTimer) { window.clearTimeout(hardTimer); hardTimer = null }
}

onMounted(() => {
  // 硬超时兜底
  hardTimer = window.setTimeout(() => {
    // eslint-disable-next-line no-console
    console.warn('[entryLoader] hard timeout reached, force hide')
    hideEntryLoader()
    cleanup()
  }, HARD_TIMEOUT_MS)

  // 监听 #app 整棵子树的变化，连续 QUIET_MS 无变化即视为初始化完成
  const target = document.getElementById('app') || document.body
  observer = new MutationObserver(() => {
    resetQuietTimer()
  })
  observer.observe(target, { childList: true, subtree: true, attributes: true })
  resetQuietTimer()
})

onBeforeUnmount(() => {
  cleanup()
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
