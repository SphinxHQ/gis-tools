<script lang="ts" setup>
import "ol/ol.css";
import { ref, onMounted } from "vue";
import { Map as olMap, View as olView } from "ol";
import TileLayer from "ol/layer/Tile";
import XYZ from "ol/source/XYZ";
import * as Proj from "ol/proj";
import { fromLonLat, toLonLat } from "ol/proj";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Feature from "ol/Feature";
import { LineString, Point } from 'ol/geom';
import * as Interaction from 'ol/interaction';
import { Circle, Icon, Style, Stroke, Fill } from "ol/style";
import Common from "~/common/Common";
import MapBrowserEventType from 'ol/MapBrowserEventType';
import { EventTypes } from "ol/Observable";
import { ToolBarAction , ToolBarItem ,toolBarItemProcess} from "./toolbar/MapToolBar";
import { BaseTianDiTuMap } from "./GisMap";

const __key = '23c0fc2a183d6d35b0458286e79ff99f';
console.log(crypto)
const uuid: string = Common.uuid()
const el_id: string = 'map-' + uuid;
console.log(el_id);


const toolBars = ref<ToolBarItem[]>([
    {
        id: Common.uuid(),
        name: "绘制点",
        icon: "atIcon at-icon-huizhidian",
        action: ToolBarAction.DRAW,
        params: { type: "Point" }
    },
    {
        id: Common.uuid(),
        name: "绘制线",
        icon: "atIcon at-icon-huizhixian",
        action: ToolBarAction.DRAW,
        params: { type: "LineString" }
    },
    {
        id: Common.uuid(),
        name: "绘制面",
        icon: "atIcon at-icon-huizhimian1",
        action: ToolBarAction.DRAW,
        params: { type: "Polygon" }
    },
]);
const handleToolbClickar = function(item: ToolBarItem){
    // toolBarItemProcess(item,map)
}

//-----------------toolbar---------------
onMounted(() => {
   const map = new BaseTianDiTuMap(el_id); 
});
</script>
<template>
    <div w="full" h="full" class="ol-map-conainer">
        <div class="tool-bar left">
            <template v-for="(item, index) in toolBars" :key="item.id">
                <el-button type="primary" @click="handleToolbClickar(item)" :ref="`tool-btn-${item.id}`">
                    <el-icon :class="item.icon" style="margin-right: 5px;"></el-icon>{{ item.name }}
                </el-button>
            </template>
        </div>
        <div class="main-map" :id="el_id">
        </div>
    </div>
</template>
<style lang="scss" scoped>
.ol-map-conainer {
    position: relative;
    width: 100%;
    height: 100%;
}

.main-map {
    width: 100%;
    height: 100%;
    position: absolute;
    left: 0;
    top: 0;
    z-index: 0;
}

.tool-bar {
    position: absolute;
    z-index: 2;
    width: calc(100% - 50px);
    height: 40px;
    top: 8px;
    left: 40px;
}
</style>