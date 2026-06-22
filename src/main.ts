import * as ElementPlusIconsVue from '@element-plus/icons-vue';
import { createApp } from 'vue';

import Common from '~/common/Common';
import router from '~/router';

import App from './App.vue';
import { proj4Init } from './components/gismap/proj4Defs';
import './composables/eventBus';
import { showEntryLoader } from './composables/entryLoader';

import 'element-plus/theme-chalk/src/message.scss';
import 'element-plus/theme-chalk/index.css';
import 'uno.css';
import '~/assets/index.css';
import '~/styles/index.scss';

// 启动主入口 loading 假进度（在地图初始化完成前一直显示）
// 见 entryLoader.ts 与 index.html 中的 #entry-loader-mask
showEntryLoader();

const app = createApp(App);
app.use(router).mount('#app');
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component);
}


proj4Init();

Object.assign(window, {
  GisCommon: Common,
});
