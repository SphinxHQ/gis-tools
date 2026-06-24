<script setup lang="ts">
/**
 * @file Split panel layout
 * @description Resizable split panel with draggable divider and size memory.
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2026-04-13
 */

import {computed, getCurrentInstance, onMounted, onUnmounted, reactive, ref, watch} from "vue";

/** Slot item state for tracking panel sizes during drag */
interface SlotItem {
  /** Size before drag started */
  originSize: number
  /** Current computed size */
  size?: number
  /** Whether this slot has a fixed (static) size */
  static?: boolean
}

let curInstance: ReturnType<typeof getCurrentInstance>;
const props = defineProps({
  /** Layout direction: 'horizontal' or 'vertical' */
  direction: {
    type: String,
    default: 'horizontal',
    validator: (value: string) => ['horizontal', 'vertical'].includes(value)
  },
  /** Number of panel slots */
  length: {
    type: Number,
    default: 2,
    validator: (value: number) => value >= 2
  },
  /** Divider thickness in pixels */
  dividerSize: {
    type: Number,
    default: 3
  },
  /** Minimum slot size in pixels */
  minSize: {
    type: Number,
    default: 100
  },
  /** Callback when slot sizes change */
  onChange: {
    type: Function,
    default: () => {
    }
  },
  /** Initial size ratios for each slot (number, 'px' string, or '%' string) */
  ratios: {
    type: Array,
    default: () => [],
  }
})
/** Computed event key for mouse position based on direction */
const eKey = computed(() => {
  return props.direction === 'horizontal' ? 'clientX' : 'clientY'
})
/** Computed CSS property key for slot sizing based on direction */
const sKey = computed(() => {
  return props.direction === 'horizontal' ? 'width' : 'height'
})

/** Local copy of ratios that may be updated during drag */
const localRatios = ref<(number | string)[]>([]);

/** Drag event handlers for divider interaction */
const handles = {
  /**
   * Start dragging a divider
   * @param e - Mouse down event
   * @param index - Divider index (slot index on the left/top)
   */
  onDragStart: (e: MouseEvent, index: number) => {
    dragState.dividerIndex = index;
    dragState.origin = e[eKey.value];
    dragState.dragging = true;

    document.body.style.cursor = props.direction.includes('horizontal') ? 'col-resize' : 'row-resize';

    const slotCurrent = slotState[`slot-${index}`] as SlotItem;
    const slotNext = slotState[`slot-${index + 1}`] as SlotItem;
    slotCurrent.originSize = slotCurrent.size ?? 0;
    slotNext.originSize = slotNext.size ?? 0;
  },
  /** End dragging and reset cursor */
  onDragEnd: () => {
    dragState.dragging = false;
    dragState.relative = 0;
    document.body.style.cursor = '';
  },
  /** Handle mouse movement during drag */
  onMove: (e: MouseEvent) => {
    if (dragState.dragging) {
      dragState.relative = e[eKey.value] - dragState.origin;
    }
  },
}
/** Reactive slot size state keyed by slot index */
const slotState = reactive<Record<string, SlotItem>>({});
/** Reactive drag state tracking divider index, origin position, and relative offset */
const dragState = reactive({
  /** Full available space for slots */
  fullSpace: -1,
  /** Mouse position at drag start */
  origin: 0,
  /** Relative mouse offset from drag origin */
  relative: 0,
  /** Index of the divider being dragged */
  dividerIndex: -1,
  /** Whether a drag is in progress */
  dragging: false,
})

/** Refs to slot DOM elements for applying size */
const slotElements = ref<HTMLElement[]>([]);

/** Apply computed slot sizes to DOM elements during drag */
const slotsRender = () => {
  if (dragState.dragging) {
    const dragEffect = slotState[`slot-${dragState.dividerIndex}`];
    const dragEffectNext = slotState[`slot-${dragState.dividerIndex + 1}`];

    if (!dragEffect || !dragEffectNext) return;

    const range = [props.minSize, dragEffect.originSize + dragEffectNext.originSize - props.minSize];
    if (dragEffect) {
      const newSize = dragState.relative + dragEffect.originSize;
      dragEffect.size = Math.min(Math.max(newSize, range[0]), range[1]);
      if(dragEffect.static){
         localRatios.value[dragState.dividerIndex] = `${dragEffect.size }px`;
      }
    }
    if (dragEffectNext) {
      const newSize = dragEffectNext.originSize - dragState.relative;
      dragEffectNext.size = Math.min(Math.max(newSize, range[0]), range[1]);

      if(dragEffectNext.static){
        localRatios.value[dragState.dividerIndex + 1] = `${dragEffectNext.size }px`;
      }
    }
  }
  const els = slotElements.value;
  if (els && els.length > 0) {
    for (let i = 0; i < els.length; i++) {
      const item = els[i];
      const slotItem = slotState[`slot-${i}`];
      if (slotItem) {
        const itemSize = slotItem.size ?? 0;
        item.style.setProperty(sKey.value, `${itemSize}px`);
      }
    }
  }
}
/** Initialize slot states and ratios from props */
const initSlots = () => {
  if (props.ratios.length === 0) {
    localRatios.value = Array.from({length: props.length}, () => props.minSize);
  } else {
    localRatios.value = [...props.ratios] as (number | string)[];
  }
  for (let i = 0; i < props.length; i++) {
    slotState[`slot-${i}`] = {
      originSize: -1,
      size: 0,
    }
  }
  updateMax();
  //after render
  setTimeout(() => {
    slotsRender()
  }, 0)
}
/** Compute slot sizes from ratios (supports number, 'px', and '%' ratios) */
const updateMax = () => {
  const isNumRatio = localRatios.value.every(x => typeof x === 'number')
  const isStringRatio = localRatios.value.every(item => typeof item === 'string')
  if (isNumRatio) {
    const ratiosCount = localRatios.value.reduce((acc: number, cur) => acc + (cur as number), 0);

    let freeSpace = dragState.fullSpace;
    for (let i = 0; i < props.length; i++) {
      const slotItem = slotState[`slot-${i}`];
      if (slotItem) {
        const ratioPercent = (localRatios.value[i] as number) / ratiosCount;
        let itemSize = dragState.fullSpace * ratioPercent
        if (freeSpace - itemSize >= 1) {
          freeSpace -= itemSize;
        } else {
          itemSize = freeSpace;
          freeSpace = 0
        }
        slotItem.size = itemSize;
      }
    }
  } else if (isStringRatio) {

    let freeSpace = dragState.fullSpace;
    const toPercent: (number | undefined)[] = [];
    let perCount = 0;
    for (let i = 0; i < localRatios.value.length; i++) {
      const ratioStr = localRatios.value[i] as string;
      const slotItem = slotState[`slot-${i}`];
      if(slotItem===undefined){
         break;
      }
      if (ratioStr.endsWith('px')) {
        const px = Number(ratioStr.slice(0, -2));
        slotItem.size = px;
        slotItem.static = true;
        freeSpace -= px;
      } else if (ratioStr.endsWith('%')) {
        const per = Number(ratioStr.slice(0, -1));
        const px = per / 100 * dragState.fullSpace;
        slotItem.size = px;
        slotItem.static = true;
        freeSpace -= px;
      } else {
        const per = 1
        toPercent[i] = per;
        perCount += per;
      }
    }
    for (let i = 0; i < toPercent.length; i++) {
      if (toPercent[i] !== undefined) {
        const itemSize = freeSpace * toPercent[i]! / perCount;
        const slotItem = slotState[`slot-${i}`];
        if (slotItem) {
          slotItem.size = itemSize;
        }
      }
    }
  }
}

const initObserver = () => {
  const curEl = curInstance?.vnode?.el as HTMLElement | undefined;
  if (!curEl) return;
  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
        const max = entry.contentRect[sKey.value as keyof DOMRectReadOnly] as number
        dragState.fullSpace = max - props.dividerSize * (props.length - 1) - 1;
        updateMax();

    }
  });
  resizeObserver.observe(curEl);
}


const disposeEvent = () => {
  window.removeEventListener('mouseup', handles.onDragEnd)
  window.removeEventListener('mousemove', handles.onMove)
}

watch(props, (value, oldValue) => {
  if (value?.length !== oldValue?.length) {
    initSlots();
  }
}, {immediate: true})

watch(dragState, slotsRender, {immediate: true, deep: true})

onUnmounted(() => {
  disposeEvent();
})

onMounted(() => {
  window.addEventListener('mouseup', handles.onDragEnd)
  window.addEventListener('mousemove', handles.onMove)
  curInstance = getCurrentInstance();
  const curEl = curInstance?.vnode?.el;
  if (curEl) {
    curEl.style[`min-${sKey.value}`] = `${(props.dividerSize + props.minSize) * props.length - props.dividerSize}px`;
  }
  initSlots();
  initObserver();
})


</script>
<template>
  <div :class="`split-panel ${props.direction}`">
    <template v-for="(item, index) in props.length" :key="index">
      <div ref="slotElements" :class="`split-panel-item ${props.direction}`">
        <slot :name="`slot-${index}`" />
      </div>
      <div v-if="index < props.length - 1" :class="`split-panel-divider ${props.direction}`"
           @mousedown="(e: MouseEvent)=>handles.onDragStart(e,index)"
/>
    </template>
  </div>
</template>
<style scoped>
.split-panel {
  overflow: hidden;
  width: 100%;
  height: 100%;
}

.split-panel.horizontal {

}

.split-panel.vertical {
}

.split-panel-item {
  //background-image: linear-gradient(180deg, #a3c8ff 0%, #607ef4 100%);
}

.split-panel-item:last-child {
  flex-grow: 1;
}

.split-panel-item.horizontal {
  float: left;
  height: 100%;
}

.split-panel-item.vertical {
}

.split-panel-divider {
  background-color: var(--el-color-primary);
  color: var(--el-color-white);
}

.split-panel-divider.horizontal {
  cursor: col-resize;
  float: left;
  height: 100%;
  width: v-bind(props.dividerSize+ 'px')
}

.split-panel-divider.vertical {
  cursor: row-resize;
  height: v-bind(props.dividerSize+ 'px')
}

</style>
