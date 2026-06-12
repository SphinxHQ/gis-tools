<template>
    <div class="base-main-container">
        <div class="main">
            <div class="left">
                <left-panel />
            </div>
            <div class="h-slider" @mousedown="sliderHandles.hStart" />
            <div class="map">
                <main-map />
            </div>
        </div>

        <div class="v-slider" @mousedown="sliderHandles.vStart" />
        <div class="bottom">
            <bottom-panel />
        </div>
    </div>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue';

import Common from '~/common/Common';


//slider
const saveKey_slider = 'sliderInfo';
const minLeftWidth = 400;
const minBottomHeight = 200;
const sliderWidth = ref(2);
interface SliderInfo {
    leftWidth_base: number,
    leftWidth_fix: number,
    bottomHeight_base: number,
    bottomHeight_fix: number,
}
const leftWidth_base = ref(minLeftWidth);
const leftWidth_fix = ref(0);

const bottomHeight_base = ref(minBottomHeight);
const bottomHeight_fix = ref(0);

const leftWidth = computed<number>(() => {
    return leftWidth_base.value + leftWidth_fix.value
})

const bottomHeight = computed<number>(() => {
    return bottomHeight_base.value + bottomHeight_fix.value
})
const getSlider = (): SliderInfo => {
    return {
        leftWidth_base: leftWidth_base.value,
        leftWidth_fix: leftWidth_fix.value,
        bottomHeight_base: bottomHeight_base.value,
        bottomHeight_fix: bottomHeight_fix.value,
    }
}
const setSlider = (sliderInfo: SliderInfo) => {
    leftWidth_base.value = sliderInfo.leftWidth_base
    leftWidth_fix.value = sliderInfo.leftWidth_fix
    bottomHeight_base.value = sliderInfo.bottomHeight_base
    bottomHeight_fix.value = sliderInfo.bottomHeight_fix
}
const saveSlider = () => {
    const sliderInfo = getSlider();
    Common.saveLocal(saveKey_slider, sliderInfo);
}
const loadSlider = () => {
    try {
        const sliderInfo = Common.loadLocal(saveKey_slider) as SliderInfo;
        setSlider(sliderInfo);
    } catch (_e) { }
}
let sliderOrigin = {
    x: 0,
    y: 0
}
let sliderStatus = {
    v: 0,
    h: 0,
}
const sliderHandles = {
    hStart: (e: MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        sliderOrigin = {
            x: e.clientX,
            y: e.clientY
        }
        sliderStatus.h = 1;
        window.addEventListener('mousemove', sliderHandles.move)
    },
    vStart: (e: MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        sliderOrigin = {
            x: e.clientX,
            y: e.clientY
        }
        sliderStatus.v = 1;
        window.addEventListener('mousemove', sliderHandles.move)
    },
    move: (e: MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (sliderStatus.h) {
            const newFix = e.clientX - sliderOrigin.x;
            if (leftWidth_base.value + newFix >= minLeftWidth) {
                leftWidth_fix.value = newFix;
            }
        } else if (sliderStatus.v) {
            const newFix = sliderOrigin.y - e.clientY;
            if (bottomHeight_base.value + newFix >= minBottomHeight) {
                bottomHeight_fix.value = newFix;
            }
        
        }

    },
    stop: () => {
    },
    stopAll: () => {

        window.removeEventListener('mousemove', sliderHandles.move)
        sliderOrigin = {
            x: 0,
            y: 0
        }
        sliderStatus = {
            v: 0,
            h: 0,
        }

        const hFixVal = leftWidth_fix.value;
        leftWidth_fix.value = 0;
        leftWidth_base.value += hFixVal;



        const vFixVal = bottomHeight_fix.value;
        bottomHeight_fix.value = 0;
        bottomHeight_base.value += vFixVal;

        saveSlider();
    }
}
window.addEventListener('mouseup', sliderHandles.stopAll)
loadSlider()
</script>

<style scoped>
.base-main-container {
    overflow: hidden;
    height: 100%;
    width: 100%;
    background: var(--gis-panel-bg-secondary);
}

.main {
    width: 100%;
    height: calc(100% - 1px * v-bind(bottomHeight - sliderWidth));
    display: flex;
    overflow: hidden;
}

.left {
    width: calc(1px * v-bind(leftWidth));
    height: 100%;
}

.h-slider {
    width: calc(1px * v-bind(sliderWidth));
    height: 100%;
    cursor: e-resize;
}

.v-slider {
    width: 100%;
    height: calc(1px * v-bind(sliderWidth));
    cursor: s-resize;
}

.v-slider,
.h-slider {
    background-color: var(--el-color-primary);
    transition: background-color 0.3s ease;
}


.map {
    width: calc(100% - 1px * v-bind(leftWidth - sliderWidth));
    height: 100%;
}

.bottom {
    width: 100%;
    height: calc(1px * v-bind(bottomHeight));
    overflow: hidden;
}
</style>