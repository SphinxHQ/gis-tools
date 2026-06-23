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
    langs.setLanguageConfiguration('wkt', {
      brackets: [
        ['(', ')'],
      ],
      autoClosingPairs: [
        { open: '(', close: ')' },
      ],
      surroundingPairs: [
        { open: '(', close: ')' },
      ],
    })
    langs.setMonarchTokensProvider('wkt', {
      defaultToken: '',
      tokenizer: {
        root: [
          // 几何类型关键字 → 按类型分别着色（与 GeoJSON 对齐）
          [/\b(POINT|MULTIPOINT)\b/, 'geo.type.point'],
          [/\b(LINESTRING|MULTILINESTRING)\b/, 'geo.type.line'],
          [/\b(POLYGON|MULTIPOLYGON)\b/, 'geo.type.polygon'],
          [/\b(GEOMETRYCOLLECTION)\b/, 'geo.type.collection'],
          // EMPTY 关键字 → keyword
          [/\bEMPTY\b/, 'keyword'],
          // 维度标记 Z / M / ZM → tag
          [/\b(ZM?|M)\b/, 'tag'],
          // 坐标数字 → number.coord（独立着色）
          [/-?\d+\.?\d*(?:[eE][+-]?\d+)?/, 'number.coord'],
          // 括号 → delimiter.parenthesis
          [/\(|\)/, 'delimiter.parenthesis'],
          // 逗号 → delimiter.comma
          [/,/, 'delimiter.comma'],
          // 空白
          [/\s+/, 'white'],
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
      ],
      surroundingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '"', close: '"' },
      ],
      indentationRules: {
        increaseIndentPattern: /[{[(]\s*$/,
        decreaseIndentPattern: /^\s*[}\])]/,
      },
      // 双击选中带引号的完整字段名/值
      wordPattern: /"(?:[^"\\]|\\.)*"|-?\d+\.?\d*(?:[eE][+-]?\d+)?|[a-zA-Z_]\w*/,
    })
    langs.setMonarchTokensProvider('geojson', {
      defaultToken: '',
      tokenizer: {
        root: [
          // 关键字段名（带引号 + 后跟冒号）→ keyword 高亮
          [/"(type|coordinates|geometry|properties|features|geometries|crs|bbox|name|link|href)"(?=\s*:)/, 'keyword'],
          // 其他字段名（带引号 + 后跟冒号）→ 字符串属性名
          [/"([^"\\]|\\.)*"(?=\s*:)/, 'string.key'],
          // 几何类型字符串值 → 按类型分别着色
          [/"(Point|MultiPoint)"/, 'geo.type.point'],
          [/"(LineString|MultiLineString)"/, 'geo.type.line'],
          [/"(Polygon|MultiPolygon)"/, 'geo.type.polygon'],
          [/"(Feature)"/, 'geo.type.feature'],
          [/"(FeatureCollection|GeometryCollection)"/, 'geo.type.collection'],
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

    // 为 geojson 语言注册语义色：让 type.identifier / string.key 有明确颜色
    // 在 vs-dark / vs 两个主题中分别定义
    monacoEditor.defineTheme('gis-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        // 通用
        { token: 'keyword', foreground: '569cd6', fontStyle: 'bold' },            // 关键字段名 / EMPTY
        { token: 'string.key', foreground: '9cdcfe' },                             // 属性名
        { token: 'string', foreground: 'ce9178' },                                  // 字符串值
        { token: 'number', foreground: 'b5cea8' },                                  // 数字
        { token: 'number.coord', foreground: 'dcdcaa' },                            // 坐标数字
        { token: 'tag', foreground: 'c586c0' },                                     // 维度标记 Z/M
        { token: 'delimiter', foreground: '808080' },                               // 标点
        { token: 'delimiter.parenthesis', foreground: 'ffd700' },                   // 括号
        { token: 'delimiter.comma', foreground: '6a9955' },                         // 逗号
        // 几何类型按约定颜色（dark 模式提亮）
        { token: 'geo.type.point', foreground: '6aafe6', fontStyle: 'bold' },       // 点 #4A90D9 → 提亮
        { token: 'geo.type.line', foreground: '6fe89c', fontStyle: 'bold' },        // 线 #50C878 → 提亮
        { token: 'geo.type.polygon', foreground: 'ffa85c', fontStyle: 'bold' },     // 面 #FF8C42 → 提亮
        { token: 'geo.type.feature', foreground: 'f472b6', fontStyle: 'bold' },     // Feature 粉色
        { token: 'geo.type.collection', foreground: 'd6a8f0', fontStyle: 'bold' },   // 集合类 淡紫
      ],
      colors: {},
    })
    monacoEditor.defineTheme('gis-light', {
      base: 'vs',
      inherit: true,
      rules: [
        // 通用
        { token: 'keyword', foreground: '0000ff', fontStyle: 'bold' },             // 关键字段名 / EMPTY
        { token: 'string.key', foreground: '001080' },                              // 属性名
        { token: 'string', foreground: 'a31515' },                                   // 字符串值
        { token: 'number', foreground: '098658' },                                   // 数字
        { token: 'number.coord', foreground: '795e26' },                            // 坐标数字
        { token: 'tag', foreground: '9b2d9b' },                                     // 维度标记 Z/M
        { token: 'delimiter', foreground: '800000' },                                // 标点
        { token: 'delimiter.parenthesis', foreground: '000000' },                   // 括号
        { token: 'delimiter.comma', foreground: '008000' },                          // 逗号
        // 几何类型按约定颜色
        { token: 'geo.type.point', foreground: '4A90D9', fontStyle: 'bold' },       // 点
        { token: 'geo.type.line', foreground: '50C878', fontStyle: 'bold' },        // 线
        { token: 'geo.type.polygon', foreground: 'FF8C42', fontStyle: 'bold' },     // 面
        { token: 'geo.type.feature', foreground: 'c2185b', fontStyle: 'bold' },     // Feature 粉色
        { token: 'geo.type.collection', foreground: '9b2d9b', fontStyle: 'bold' },   // 集合类 紫色
      ],
      colors: {},
    })
  }

  return monacoEditor!
}

onMounted(async () => {
  if (!editorContainer.value) return

  const me = await ensureMonaco()

  editor = me.create(editorContainer.value, {
    value: '',
    language: props.language,
    theme: (props.language === 'geojson' || props.language === 'wkt')
      ? (isActuallyDark.value ? 'gis-dark' : 'gis-light')
      : (isActuallyDark.value ? 'vs-dark' : 'vs'),
    readOnly: props.readOnly,
    minimap: { enabled: props.minimap },
    lineNumbers: 'on',
    wordWrap: 'on',
    scrollBeyondLastLine: false,
    // 开启自动布局：监听容器尺寸变化并重新排版，否则在弹窗/异步布局中会渲染成"一条线"
    automaticLayout: true,
    // 显式声明占满父容器
    fontSize: 12,
    renderLineHighlight: 'all',
    folding: props.language === 'json' || props.language === 'geojson',
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

  // 延迟设置初始内容，确保自定义语言/主题已完全生效
  requestAnimationFrame(() => {
    if (editor) {
      const initial = displayValue()
      if (initial) {
        ignoreNextChange = true
        editor.setValue(initial)
      }
    }
  })

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
  const isGeoJson = editor?.getModel()?.getLanguageId() === 'geojson'
  const isWkt = editor?.getModel()?.getLanguageId() === 'wkt'
  const useGisTheme = isGeoJson || isWkt
  monacoEditor.setTheme(useGisTheme ? (dark ? 'gis-dark' : 'gis-light') : (dark ? 'vs-dark' : 'vs'))
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
