import * as ElementPlusIconsVue from '@element-plus/icons-vue';
import { createApp } from 'vue';

import Common from '~/common/Common';
import { setupMonaco } from '~/components/editor/monacoSetup';
import router from '~/router';

import App from './App.vue';
import { proj4Init } from './components/gismap/proj4Defs';
import './composables/eventBus';
import { showEntryLoader, updateLoaderProgress } from './composables/entryLoader';

import 'element-plus/theme-chalk/src/message.scss';
import 'element-plus/theme-chalk/index.css';
import 'uno.css';
import '~/assets/index.css';
import '~/styles/index.scss';

// 启动主入口 loading（资源加载进度由 PerformanceObserver 自动追踪 0-60%）
showEntryLoader();

// 预加载 Monaco 编辑器并注册自定义语言/主题，确保任何编辑器实例创建前一切就绪
setupMonaco();

const app = createApp(App);
app.use(router).mount('#app');
updateLoaderProgress(60, '正在注册应用组件');
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component);
}

proj4Init();
updateLoaderProgress(70, '正在注册投影坐标系');

Object.assign(window, {
  GisCommon: Common,
});
