import path from 'path'
import { fileURLToPath } from 'url'

import vue from '@vitejs/plugin-vue'
import {
  presetAttributify,
  presetIcons,
  presetUno,
  transformerDirectives,
  transformerVariantGroup,
} from 'unocss'
import Unocss from 'unocss/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import Components from 'unplugin-vue-components/vite'
import { defineConfig } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import monacoEditorPlugin from 'vite-plugin-monaco-editor'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const pathSrc = path.resolve(__dirname, 'src')

export default defineConfig({
  base: '/gis-tools/',
  resolve: {
    alias: {
      '~/': `${pathSrc}/`,
      'vue': 'vue/dist/vue.esm-bundler.js'
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "~/styles/element/index.scss" as *;`,
      },
    },
  },
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-vue': ['vue', 'vue-router'],
          'vendor-element': ['element-plus', '@element-plus/icons-vue'],
          'vendor-geo': ['ol', '@turf/turf', 'proj4', '@sphinx_hq/shapefile-parser', 'wkx'],
          'vendor-monaco': ['monaco-editor']
        }
      }
    }
  },
  plugins: [
    vue(),
    nodePolyfills(),
    Components({
      extensions: ['vue', 'md'],
      include: [/\.vue$/, /\.vue\?vue/, /\.md$/],
      resolvers: [
        ElementPlusResolver({
          importStyle: 'sass',
        }),
      ],
      dts: 'src/components.d.ts',
    }),

    Unocss({
      presets: [
        presetUno(),
        presetAttributify(),
        presetIcons({
          scale: 1.2,
          warn: true,
        }),
      ],
      transformers: [
        transformerDirectives(),
        transformerVariantGroup(),
      ]
    }),

    monacoEditorPlugin.default({
      languageWorkers: ['editorWorkerService', 'json']
    }),
  ],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: './src/test/setup.ts',
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache'],
    server: {
      deps: {
        inline: ['element-plus']
      }
    }
  },
})
