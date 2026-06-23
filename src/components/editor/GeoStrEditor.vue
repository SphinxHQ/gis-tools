<script setup lang="ts">
import type { editor as MonacoEditorNS } from 'monaco-editor/esm/vs/editor/editor.api'
import { onMounted, onUnmounted, ref, watch } from 'vue'

import { isActuallyDark } from '~/composables/dark'
import { getMonacoEditor, setupMonaco } from './monacoSetup'

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
let resizeObserver: ResizeObserver | null = null
let ignoreNextChange = false

const displayValue = () => {
  if (Array.isArray(props.value)) return props.value.join('\n')
  return props.value ?? ''
}

async function ensureMonaco() {
  await setupMonaco()
  return getMonacoEditor()
}

onMounted(async () => {
  if (!editorContainer.value) return

  const me = await ensureMonaco()

  editor = me.create(editorContainer.value, {
    value: '',
    language: props.language,
    theme: (props.language === 'geojson' || props.language === 'wkt' || props.language === 'exchange')
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

  // 延迟设置初始内容并强制刷新主题，确保自定义语言/主题完全生效
  requestAnimationFrame(() => {
    if (editor) {
      const me = getMonacoEditor()
      const langId = editor.getModel()?.getLanguageId()
      const useGisTheme = langId === 'geojson' || langId === 'wkt' || langId === 'exchange'
      me.setTheme(useGisTheme ? (isActuallyDark.value ? 'gis-dark' : 'gis-light') : (isActuallyDark.value ? 'vs-dark' : 'vs'))
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
  if (!editor) return
  const me = getMonacoEditor()
  const model = editor.getModel()
  if (model) {
    me.setModelLanguage(model, newLang)
  }
})

watch(isActuallyDark, (dark) => {
  const me = getMonacoEditor()
  const isGeoJson = editor?.getModel()?.getLanguageId() === 'geojson'
  const isWkt = editor?.getModel()?.getLanguageId() === 'wkt'
  const isExchange = editor?.getModel()?.getLanguageId() === 'exchange'
  const useGisTheme = isGeoJson || isWkt || isExchange
  me.setTheme(useGisTheme ? (dark ? 'gis-dark' : 'gis-light') : (dark ? 'vs-dark' : 'vs'))
})

watch(() => props.readOnly, (ro) => {
  editor?.updateOptions({ readOnly: ro })
})

onUnmounted(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
  editor?.dispose()
  editor = null
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
