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
import { defineConfig, Plugin } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import { VitePWA } from 'vite-plugin-pwa'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const pathSrc = path.resolve(__dirname, 'src')

/**
 * Vite 插件：build 时收集"初始加载必需"的资源清单，内联到 index.html
 *
 * 算法（BFS）：
 *   1. 从入口 chunk（isEntry）出发
 *   2. 递归收集静态依赖（imports）—— 这些是初始加载必需的
 *   3. 收集入口的直接动态依赖（dynamicImports）—— 初始路由组件、Monaco 等
 *   4. 动态依赖的静态依赖也收集（它们的 imports）
 *   5. 不收集动态依赖的动态依赖 —— 那是按需加载的功能模块（如 city-*.js）
 *
 * 这样清单只包含初始渲染必需的资源，运行时等 100% 完成才隐藏 loading
 * dev 模式下不生成清单，loading 屏降级为里程碑驱动
 */
function entryLoaderManifest(): Plugin {
  let chunkAssets: string[] = []
  return {
    name: 'entry-loader-manifest',
    apply: 'build',
    generateBundle(_options, bundle) {
      const initialChunks = new Set<string>()
      const visited = new Set<string>()

      // 找到入口 chunk
      const entryNames = Object.entries(bundle)
        .filter(([, c]) => c.type === 'chunk' && c.isEntry)
        .map(([name]) => name)

      // BFS 队列：allowDynamic=true 表示可以收集其 dynamicImports
      // 入口 chunk 允许收集动态依赖（初始路由组件等）
      // 动态依赖的 chunk 不允许再收集动态依赖（排除按需加载的功能模块）
      const queue: { name: string; allowDynamic: boolean }[] =
        entryNames.map((name) => ({ name, allowDynamic: true }))

      while (queue.length > 0) {
        const { name, allowDynamic } = queue.shift()!
        if (visited.has(name)) continue
        visited.add(name)

        const chunk = bundle[name]
        if (!chunk || chunk.type !== 'chunk') continue

        initialChunks.add(name)

        // 静态依赖：递归收集（保持 allowDynamic 标志）
        for (const dep of chunk.imports || []) {
          if (!visited.has(dep)) {
            queue.push({ name: dep, allowDynamic })
          }
        }

        // 动态依赖：只收集入口的直接动态依赖（初始路由组件、Monaco 等）
        // 不递归它们的动态依赖（按需加载的功能模块，如 city-*.js）
        if (allowDynamic) {
          for (const dep of chunk.dynamicImports || []) {
            if (!visited.has(dep)) {
              queue.push({ name: dep, allowDynamic: false })
            }
          }
        }
      }

      // CSS 文件：初始加载的 CSS（Vite 会把初始 CSS 提取成单独文件）
      const cssAssets = Object.entries(bundle)
        .filter(([, c]) => c.type === 'asset' && c.fileName.endsWith('.css'))
        .map(([name]) => name)

      chunkAssets = [...initialChunks, ...cssAssets]
    },
    transformIndexHtml: {
      order: 'post' as const,
      handler(html: string) {
        const manifestScript = `<script>window.__entryLoaderManifest=${JSON.stringify(chunkAssets)}</script>`
        return html.replace('<!--__ENTRY_LOADER_MANIFEST__-->', manifestScript)
      },
    },
  }
}

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
    entryLoaderManifest(),
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

    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'GIS Tools',
        short_name: 'GIS Tools',
        description: 'GIS 数据处理与可视化工具',
        theme_color: '#1d1e1f',
        background_color: '#1d1e1f',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,txt,woff2}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024, // 8 MiB，覆盖 Monaco/GisData 等大 chunk
      },
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
