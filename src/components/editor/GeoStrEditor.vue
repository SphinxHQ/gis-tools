<script setup lang="ts">
import type { editor as MonacoEditorNS } from 'monaco-editor/esm/vs/editor/editor.api'
// Vite ?worker 导入 — 编译时生成 Worker 构建产物
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import { onMounted, onUnmounted, ref, watch } from 'vue'

import { isActuallyDark } from '~/composables/dark'

const props = withDefaults(defineProps<{
  value?: string | string[]
  readOnly?: boolean
  language?: string
  format?: boolean
  minimap?: boolean
}>(), {
  value: '',
  readOnly: true,
  language: 'json',
  format: false,
  minimap: true,
})

const emit = defineEmits<{
  input: [value: string]
}>()

const editorContainer = ref<HTMLElement>()
const loading = ref(true)

let editor: MonacoEditorNS.IStandaloneCodeEditor | null = null
let monacoEditor: typeof MonacoEditorNS | null = null
let resizeObserver: ResizeObserver | null = null
let ignoreNextChange = false
let languagesRegistered = false

const displayValue = () => {
  if (Array.isArray(props.value)) return props.value.join('\n')
  return props.value ?? ''
}

async function ensureMonaco() {
  if (monacoEditor) return monacoEditor

  // 注册 Worker
  self.MonacoEnvironment = {
    getWorker(_moduleId: string, label: string) {
      if (label === 'json') {
        return new JsonWorker()
      }
      return new EditorWorker()
    },
  }

  const mod = await import('monaco-editor/esm/vs/editor/editor.api')
  monacoEditor = mod.editor

  // 注册自定义语言（仅一次）
  if (!languagesRegistered) {
    languagesRegistered = true
    const langs = mod.languages

    // WKT 语法高亮
    langs.register({ id: 'wkt' })
    langs.setMonarchTokensProvider('wkt', {
      tokenizer: {
        root: [
          [/\b(GEOMETRYCOLLECTION|MULTIPOLYGON|MULTILINESTRING|MULTIPOINT|POLYGON|LINESTRING|POINT)\b/, 'keyword'],
          [/\b(EMPTY|Z|M|ZM)\b/, 'type'],
          [/\(|\)/, 'delimiter.parenthesis'],
          [/,/, 'delimiter.comma'],
          [/-?\d+\.?\d*(?:[eE][+-]?\d+)?/, 'number'],
        ]
      }
    })

    // 电子报盘语法高亮
    langs.register({ id: 'exchange' })
    langs.setMonarchTokensProvider('exchange', {
      tokenizer: {
        root: [
          [/\[属性描述\]|\[地块坐标\]/, 'keyword'],
          [/^[^=\[\]]+(?==)/, 'variable'],
          [/=/, 'delimiter'],
          [/\bJ\d+\b/, 'variable.predefined'],
          [/-?\d+\.?\d*/, 'number'],
          [/@/, 'tag'],
          [/\b(点|线|面)\b/, 'type'],
        ]
      }
    })

    // GeoJSON 语法高亮：对 GeoJSON 关键字段名与几何类型值做特殊标注
    langs.register({ id: 'geojson' })
    // 复用 JSON 的括号 / 自动闭合 / 缩进规则，保证编辑体验与 JSON 一致
    langs.setLanguageConfiguration('geojson', {
      comments: { lineComment: '//', blockComment: ['/*', '*/'] },
      brackets: [
        ['{', '}'],
        ['[', ']'],
        ['(', ')'],
      ],
      autoClosingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '"', close: '"', notIn: ['string'] },
        { open: "'", close: "'", notIn: ['string', 'comment'] },
      ],
      surroundingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '"', close: '"' },
        { open: "'", close: "'" },
      ],
      indentationRules: {
        increaseIndentPattern: /[{[(]\s*$/,
        decreaseIndentPattern: /^\s*[}\])]/,
      },
    })
    langs.setMonarchTokensProvider('geojson', {
      defaultToken: 'invalid',
      keywords: [
        'type', 'coordinates', 'geometry', 'properties', 'features',
        'geometries', 'crs', 'bbox', 'name', 'link', 'href',
      ],
      geoTypes: [
        'Feature', 'FeatureCollection',
        'Point', 'MultiPoint', 'LineString', 'MultiLineString',
        'Polygon', 'MultiPolygon', 'GeometryCollection',
      ],
      tokenizer: {
        root: [
          // 关键字段名（带引号 + 后跟冒号）→ keyword
          [/"(type|coordinates|geometry|properties|features|geometries|crs|bbox|name|link|href)"(?=\s*:)/, 'keyword'],
          // 其他字段名（带引号 + 后跟冒号）→ 属性名
          [/"([^"\\]|\\.)*"(?=\s*:)/, 'string.key'],
          // GeoJSON 几何类型字符串值 → type.identifier
          [/"(Feature|FeatureCollection|Point|MultiPoint|LineString|MultiLineString|Polygon|MultiPolygon|GeometryCollection)"/, 'type.identifier'],
          // CRS 相关字符串值（name/link）也作为类型标识
          [/"(EPSG|urn|ogc)":[^"]*"/, 'type.identifier'],
          // 普通字符串值
          [/"([^"\\]|\\.)*"/, 'string'],
          // 数字
          [/-?\d+\.?\d*(?:[eE][+-]?\d+)?/, 'number'],
          // 布尔与 null
          [/\b(true|false|null)\b/, 'keyword'],
          // 标点
          [/[{}[\],:]/, 'delimiter'],
          // 空白
          [/\s+/, 'white'],
        ]
      }
    })
  }

  return monacoEditor!
}

onMounted(async () => {
  if (!editorContainer.value) return

  const me = await ensureMonaco()

  editor = me.create(editorContainer.value, {
    value: displayValue(),
    language: props.language,
    theme: isActuallyDark.value ? 'vs-dark' : 'vs',
    readOnly: props.readOnly,
    minimap: { enabled: props.minimap },
    lineNumbers: 'on',
    wordWrap: 'on',
    scrollBeyondLastLine: false,
    // 开启自动布局：监听容器尺寸变化并重新排版，否则在弹窗/异步布局中会渲染成"一条线"
    automaticLayout: true,
    // 显式声明占满父容器
    width: '100%',
    height: '100%',
    fontSize: 12,
    renderLineHighlight: 'all',
    folding: props.language === 'json',
    foldingStrategy: 'auto',
    foldingHighlight: true,
    showFoldingControls: 'mouseover',
    overviewRulerBorder: false,
    matchBrackets: 'always',
    bracketPairColorization: { enabled: true },
    guides: {
      bracketPairs: true,
      indentation: true,
      highlightActiveBracketPair: true,
      highlightActiveIndentation: true,
    },
    autoClosingBrackets: 'always',
    autoClosingQuotes: 'always',
    autoIndent: 'advanced',
    formatOnPaste: true,
    selectionHighlight: true,
    occurrencesHighlight: 'singleFile',
    renderWhitespace: 'selection',
    renderControlCharacters: true,
    cursorBlinking: 'smooth',
    cursorSmoothCaretAnimation: 'on',
    smoothScrolling: true,
    contextmenu: true,
    links: true,
    colorDecorators: true,
    scrollbar: {
      verticalScrollbarSize: 8,
      horizontalScrollbarSize: 8,
    },
    padding: { top: 8 },
  })

  loading.value = false

  editor.onDidChangeModelContent(() => {
    if (ignoreNextChange) {
      ignoreNextChange = false
      return
    }
    if (!props.readOnly) {
      emit('input', editor!.getValue())
    }
  })

  resizeObserver = new ResizeObserver(() => {
    editor?.layout()
  })
  resizeObserver.observe(editorContainer.value)
})

watch(() => props.value, (newVal) => {
  if (!editor) return
  let str = Array.isArray(newVal) ? newVal.join('\n') : (newVal ?? '')
  // 自动格式化 JSON
  if (props.format && props.language === 'json' && str.trim()) {
    try {
      str = JSON.stringify(JSON.parse(str), null, 2)
    } catch { /* 非 JSON 内容不格式化 */ }
  }
  const current = editor.getValue()
  if (str !== current) {
    ignoreNextChange = true
    editor.setValue(str)
  }
})

watch(() => props.language, (newLang) => {
  if (!editor || !monacoEditor) return
  const model = editor.getModel()
  if (model) {
    monacoEditor.setModelLanguage(model, newLang)
  }
})

watch(isActuallyDark, (dark) => {
  if (!monacoEditor) return
  monacoEditor.setTheme(dark ? 'vs-dark' : 'vs')
})

watch(() => props.readOnly, (ro) => {
  editor?.updateOptions({ readOnly: ro })
})

onUnmounted(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
  editor?.dispose()
  editor = null
  monacoEditor = null
})
</script>

<template>
  <div class="geo-str-editor">
    <div v-if="loading" class="geo-str-editor-loading">Loading editor...</div>
    <div ref="editorContainer" class="geo-str-editor-core" />
  </div>
</template>

<style scoped>
.geo-str-editor {
  width: 100%;
  height: 100%;
  min-height: 240px;
  box-sizing: border-box;
  overflow: hidden;
  position: relative;
}

.geo-str-editor-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--el-text-color-placeholder);
  font-size: 13px;
  z-index: 1;
}

.geo-str-editor-core {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
</style>
