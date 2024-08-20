import { createApp } from "vue";
import App from "./App.vue";

import * as ElementPlusIconsVue from '@element-plus/icons-vue'

import '../public/icon/iconfont.css'

import "~/styles/index.scss";
import "uno.css";

// If you want to use ElMessage, import it.
import "element-plus/theme-chalk/src/message.scss";
import "element-plus/theme-chalk/index.css"
import "./composables/eventBus";
import { registerProvider } from "./components/editor/registerProvider";
import { proj4Init } from "./components/gismap/proj4Defs";
import { parse } from "path";

registerProvider();
proj4Init();
const app = createApp(App);
// app.use(ElementPlus);
app.mount("#app");

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

const wkt = 'MULTIPOLYGON (((246 405, 845 405, 845 136, 246 136, 246 405),   (380 340, 694 340, 694 195, 380 195, 380 340),   (755 387, 800 387, 800 320, 755 320, 755 387),   (760 250, 790 250, 790 210, 760 210, 760 250),   (760 170, 800 170, 800 160, 760 160, 760 170)),   ((304 74, 480 74, 480 50, 304 50, 304 74)))';
function getWktCoordinates(wkt: string): any {
  function parsePoint(wkt: string): any {
    return wkt.trim().split(' ').map(Number)
  }
  function parseLineString(wkt: string): any {
    return wkt.trim().split(',').map(parsePoint)
  }
  function parsePolygon(coordinatesStr: string): any {
    const polygon = coordinatesStr.substring(1,coordinatesStr.length - 1);
    const rings = polygon.split("),(")
    const coordinates = []
    for (const ring of rings) {
      coordinates.push(parseLineString(ring))
    }
    return coordinates
  }
  function parseMultiPolygon(coordinatesStr: string): any {
    const polygons =  coordinatesStr.substring(2, coordinatesStr.length - 2).split(')),((').map(function(s){return "("+s+")"})
    const coordinates = []
    for (const polygon of polygons) {
      coordinates.push(parsePolygon(polygon))
    }
    return coordinates;
  }
  wkt = wkt.replace(new RegExp("\\s*([\\,,\\),\\(])\\s*","g"),"$1")
  const type = wkt.substring(0, wkt.indexOf('('))
  const coordinatesStr = wkt.substring(wkt.indexOf('(') + 1, wkt.lastIndexOf(')'))
  switch (type) {
    case 'POINT':
      return parsePoint(coordinatesStr);
    case 'LINESTRING':
      return parseLineString(coordinatesStr);
    case 'POLYGON':
      return parsePolygon(coordinatesStr);
    case 'MULTIPOLYGON':
      return parseMultiPolygon(coordinatesStr);
    default:
      throw new Error('无法识别的WKT:' + wkt)
  }
}
console.log(getWktCoordinates(wkt))
//弹出一个对话框，写你好