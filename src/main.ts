import { createApp } from "vue";
import App from "./App.vue";

import * as ElementPlusIconsVue from '@element-plus/icons-vue'

import '../public/icon/iconfont.css' 

import "~/styles/index.scss";
import "uno.css";

// If you want to use ElMessage, import it.
import "element-plus/theme-chalk/src/message.scss";
import "element-plus/theme-chalk/index.css"
import  "./composables/eventBus";
import { registerProvider } from "./components/editor/registerProvider";
import { proj4Init } from "./components/gismap/proj4Defs";

registerProvider();
proj4Init();
const app = createApp(App);
// app.use(ElementPlus);
app.mount("#app"); 
  
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    app.component(key, component)
  }
 

