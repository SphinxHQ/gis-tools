<script setup lang="ts">
/**
 * @file FAB (Floating Action Button) component
 * @description Mobile floating action button for map controls. Positioned in the
 *              bottom-right thumb zone (green zone) per Hoober's research.
 *              Expands to show up to 4 menu items with Bouncy easing animation.
 *
 * @theory Hoober《Designing for Touch》: FAB at bottom-right 16dp margin is within
 *         thumb's natural zone (green) for single-handed operation.
 * @theory Fitts's Law: 56×56dp target size minimizes movement time (MT).
 * @theory Material Design 3 Motion: 200ms Bouncy easing (0.175, 0.885, 0.32, 1.275)
 *         for FAB expand/collapse to emphasize the action.
 * @theory Hick's Law: menu items ≤4 to minimize decision time.
 *
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2026-06-25
 */
import { ref, onMounted, onBeforeUnmount, type Component } from 'vue'
import { Close, Plus } from '@element-plus/icons-vue'

/** FAB menu item definition */
export interface FabItem {
  /** Unique key for the item */
  key: string
  /** Icon component (Element Plus icon or custom) */
  icon: Component
  /** Label text (shown in expanded menu) */
  label: string
}

/** Props for FAB */
const props = withDefaults(defineProps<{
  /** Menu items (max 4, per Hick's Law) */
  items: FabItem[]
  /** Main button icon */
  mainIcon?: Component
  /** Main button aria-label */
  mainLabel?: string
}>(), {
  mainIcon: undefined,
  mainLabel: '地图工具',
})

const emit = defineEmits<{
  /** Emitted when a menu item is selected */
  select: [key: string]
}>()

// 是否展开菜单
const expanded = ref(false)

/**
 * 切换展开/收起
 */
const toggleExpand = () => {
  expanded.value = !expanded.value
}

/**
 * 点击菜单项
 * @param key - 菜单项 key
 */
const handleItemClick = (key: string) => {
  emit('select', key)
  expanded.value = false
}

/**
 * 点击外部收起菜单
 */
const handleOutsideClick = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (!target.closest('.gis-map-fab')) {
    expanded.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleOutsideClick, { passive: true })
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleOutsideClick)
})
</script>

<template>
  <div class="gis-map-fab" :class="{ expanded }">
    <!-- 遮罩层（展开时显示，点击收起） -->
    <Transition name="fab-overlay">
      <div
        v-if="expanded"
        class="fab-overlay"
        @click="expanded = false"
      />
    </Transition>

    <!-- 展开的菜单项（向上排列） -->
    <TransitionGroup
      v-if="items.length > 0"
      name="fab-item"
      tag="div"
      class="fab-menu"
    >
      <button
        v-for="(item, index) in items"
        v-show="expanded"
        :key="item.key"
        type="button"
        class="fab-menu-item"
        :style="{ transitionDelay: expanded ? `${index * 40}ms` : '0ms' }"
        :title="item.label"
        @click.stop="handleItemClick(item.key)"
      >
        <el-icon :size="20"><component :is="item.icon" /></el-icon>
        <span class="fab-menu-label">{{ item.label }}</span>
      </button>
    </TransitionGroup>

    <!-- 主 FAB 按钮 -->
    <button
      type="button"
      class="fab-main"
      :class="{ expanded }"
      :aria-label="mainLabel"
      @click.stop="toggleExpand"
    >
      <el-icon :size="24">
        <component :is="expanded ? Close : (mainIcon || Plus)" />
      </el-icon>
    </button>
  </div>
</template>

<style scoped>
/* FAB 容器：固定右下角 */
.gis-map-fab {
  position: absolute;
  right: 16px;
  bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12px;
}

/* 遮罩层 */
.fab-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: -1;
}

/* 菜单容器 */
.fab-menu {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

/* 菜单项按钮 */
.fab-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 48px;
  padding: 0 16px;
  border: none;
  border-radius: 24px;
  background: var(--el-bg-color, #fff);
  color: var(--el-text-color-primary, #303133);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: transform 200ms cubic-bezier(0.175, 0.885, 0.32, 1.275),
              opacity 200ms ease;
  transform: scale(0);
  opacity: 0;
  transform-origin: bottom right;
}

.gis-map-fab.expanded .fab-menu-item {
  transform: scale(1);
  opacity: 1;
}

.fab-menu-item:hover {
  background: var(--el-fill-color-light, #f5f7fa);
}

.fab-menu-item:active {
  transform: scale(0.95);
}

/* 菜单项标签 */
.fab-menu-label {
  font-size: 13px;
  font-weight: 500;
}

/* 主 FAB 按钮：56×56dp */
.fab-main {
  width: 56px;
  height: 56px;
  border: none;
  border-radius: 50%;
  background: var(--el-color-primary, #409eff);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  transition: transform 200ms cubic-bezier(0.175, 0.885, 0.32, 1.275),
              background-color 200ms ease;
  flex-shrink: 0;
}

.fab-main:hover {
  background: var(--el-color-primary-light-3, #79bbff);
}

.fab-main:active {
  transform: scale(0.9);
}

/* 展开时主按钮旋转 */
.fab-main.expanded {
  transform: rotate(135deg);
  background: var(--el-color-info, #909399);
}

/* ===== 过渡动画 ===== */

/* 遮罩层淡入淡出 */
.fab-overlay-enter-active,
.fab-overlay-leave-active {
  transition: opacity 200ms ease;
}

.fab-overlay-enter-from,
.fab-overlay-leave-to {
  opacity: 0;
}

/* 菜单项进出场动画 */
.fab-item-enter-active,
.fab-item-leave-active {
  transition: transform 200ms cubic-bezier(0.175, 0.885, 0.32, 1.275),
              opacity 200ms ease;
}

.fab-item-enter-from,
.fab-item-leave-to {
  transform: scale(0) translateY(20px);
  opacity: 0;
}

/* ===== prefers-reduced-motion 支持 ===== */
@media (prefers-reduced-motion: reduce) {
  .fab-main,
  .fab-menu-item,
  .fab-overlay-enter-active,
  .fab-overlay-leave-active,
  .fab-item-enter-active,
  .fab-item-leave-active {
    transition-duration: 50ms;
  }
}
</style>
