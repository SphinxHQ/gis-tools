<script setup lang="ts">
/**
 * @file Responsive action sheet component
 * @description 响应式弹框组件：桌面端渲染 el-popover（定位精准、轻量），
 *              移动端渲染 el-drawer 从底部滑出（有遮罩、触摸友好）。
 *              统一 API 实现一套代码两端适配，解决复杂操作 popover 在移动端体验差的问题。
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2026-06-27
 */
import { computed, ref, watch } from 'vue'
import { useBreakpoint } from '~/composables/useBreakpoint'

const props = defineProps({
  /** 显隐控制（v-model:visible） */
  visible: { type: Boolean, default: false },
  /** 标题（移动端 drawer 头部显示，桌面端 popover 内顶部显示） */
  title: { type: String, default: '' },
  /** 桌面端 popover 宽度（px） */
  width: { type: [Number, String], default: 320 },
  /** 桌面端 popover 定位 */
  placement: { type: String, default: 'bottom' },
  /** 移动端 drawer 尺寸（高度百分比，如 '70%'、'auto'） */
  mobileSize: { type: [Number, String], default: '70%' },
  /** 移动端 drawer 是否带头部（默认有 title 则显示） */
  withHeader: { type: Boolean, default: true },
})
const emit = defineEmits(['update:visible', 'show', 'hide'])

const { isMobile } = useBreakpoint()

// 内部显隐状态，与 v-model:visible 双向同步
const internalVisible = ref(props.visible)

watch(() => props.visible, (val) => {
  if (val !== internalVisible.value) {
    internalVisible.value = val
  }
})

watch(internalVisible, (val) => {
  emit('update:visible', val)
  emit(val ? 'show' : 'hide')
})

// 移动端点击触发器：打开 drawer
const handleTriggerClick = () => {
  if (isMobile.value) {
    internalVisible.value = true
  }
  // 桌面端由 el-popover 的 trigger="click" 自动管理
}

// 桌面端 popover 宽度处理
const popoverWidth = computed(() => props.width)

// 移动端 drawer 头部显示控制
const drawerWithHeader = computed(() => props.withHeader && !!props.title)
</script>

<template>
  <!-- 桌面端：el-popover（定位精准、轻量） -->
  <!-- :teleported="true" 显式声明 teleport 到 body，避免被祖先 overflow:hidden 裁剪 -->
  <!-- popper-options.preventOverflow.boundary='viewport' 让 popper 不被任何 clippingParent 约束 -->
  <el-popover
    v-if="!isMobile"
    v-model:visible="internalVisible"
    :placement="placement"
    :width="popoverWidth"
    trigger="click"
    :show-arrow="false"
    :teleported="true"
    :popper-options="{
      modifiers: [
        { name: 'preventOverflow', options: { boundary: 'viewport' } },
        { name: 'flip', options: { boundary: 'viewport' } },
      ],
    }"
  >
    <template #reference>
      <slot name="reference" />
    </template>
    <div class="action-sheet-content">
      <div v-if="title" class="action-sheet-title">{{ title }}</div>
      <div class="action-sheet-body">
        <slot />
      </div>
      <div v-if="$slots.footer" class="action-sheet-footer">
        <slot name="footer" />
      </div>
    </div>
  </el-popover>

  <!-- 移动端：触发器 + el-drawer 从底部滑出（有遮罩、触摸友好） -->
  <template v-else>
    <span class="action-sheet-trigger" @click="handleTriggerClick">
      <slot name="reference" />
    </span>
    <el-drawer
      v-model="internalVisible"
      :title="title"
      direction="btt"
      :size="mobileSize"
      :with-header="drawerWithHeader"
      append-to-body
      class="action-sheet-drawer"
    >
      <div class="action-sheet-content mobile">
        <div class="action-sheet-body">
          <slot />
        </div>
        <div v-if="$slots.footer" class="action-sheet-footer">
          <slot name="footer" />
        </div>
      </div>
    </el-drawer>
  </template>
</template>

<style scoped>
/* 移动端触发器 wrapper：display:contents 让 wrapper 不参与布局，子元素直接融入父级 flex */
.action-sheet-trigger {
  display: contents;
}

/* 弹框内容容器 */
.action-sheet-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
  /* 限制最大高度，防止小视口下 popover 内容溢出屏幕 */
  max-height: min(60vh, 480px);
}

.action-sheet-content.mobile {
  height: 100%;
  max-height: none;
  padding: 4px 0 8px;
}

/* 标题（桌面 popover 内） */
.action-sheet-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  padding-bottom: 6px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

/* 内容主体 */
.action-sheet-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

/* 底部操作区 */
.action-sheet-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 6px;
  border-top: 1px solid var(--el-border-color-lighter);
  flex-shrink: 0;
}

.action-sheet-content.mobile .action-sheet-footer {
  padding: 8px 12px;
}
</style>

<style>
/* 移动端 drawer 全局样式覆盖（非 scoped 以穿透 el-drawer 内部） */
.action-sheet-drawer .el-drawer__body {
  padding: 0;
  display: flex;
  flex-direction: column;
}
</style>
