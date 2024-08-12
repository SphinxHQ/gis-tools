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
import { ToolBarAction, ToolBarItem, toolBarItemProcess } from "./toolbar/MapToolBar";
import { GisMap, GisMapOption } from "./GisMap";
import { GisMapLayer } from "./layer/GisLayer";
import BaseLayer from "ol/layer/Base";

export default {
    newOlMapInstance(mapTarget: string | HTMLElement): olMap {
        return new olMap({
            target: mapTarget,
            view: new olView({
                center: [106.6, 29.6],
                zoom: 12,
                projection: 'EPSG:4490'
            })
        });
    },
}