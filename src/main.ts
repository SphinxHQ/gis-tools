/**
 * @file Application entry point
 * @description Initializes the Vue 3 application, registers Element Plus icons,
 *              sets up Monaco editor, router, proj4 coordinate system, and entry loader.
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2024-08-06
 */
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

// Start entry loading screen (resource progress auto-tracked by PerformanceObserver 0-60%)
showEntryLoader();

// Preload Monaco editor and register custom language/theme before any editor instance is created
setupMonaco();

const app = createApp(App);
app.use(router).mount('#app');
// Register all Element Plus icons as global components
updateLoaderProgress(60, '正在注册应用组件');
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component);
}

// Initialize proj4 coordinate system definitions
proj4Init();
updateLoaderProgress(70, '正在注册投影坐标系');

// Expose Common utility to window for debugging and external access
Object.assign(window, {
  GisCommon: Common,
});
