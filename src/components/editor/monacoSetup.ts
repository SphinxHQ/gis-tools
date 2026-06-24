/**
 * @file Monaco editor setup
 * @description Preloads Monaco editor and registers custom WKT language and theme.
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2026-06-23
 */
/**
 * Monaco 编辑器自定义语言与主题注册
 * 在 app 初始化时预加载，确保任何编辑器实例创建前语言/主题已就绪
 */
import type { editor as MonacoEditorNS } from 'monaco-editor/esm/vs/editor/editor.api'

import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'

let monacoEditor: typeof MonacoEditorNS | null = null
let setupPromise: Promise<void> | null = null

/**
 * 预加载 Monaco 并注册自定义语言/主题
 * 应在 app mount 前调用，确保第一个编辑器创建时一切就绪
 * 多次调用安全：后续调用会等待首次初始化完成
 */
export async function setupMonaco() {
  if (setupPromise) return setupPromise

  setupPromise = (async () => {
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

    const langs = mod.languages

    // ---- WKT 语法 ----
    langs.register({ id: 'wkt' })
    langs.setLanguageConfiguration('wkt', {
      brackets: [['(', ')']],
      autoClosingPairs: [{ open: '(', close: ')' }],
      surroundingPairs: [{ open: '(', close: ')' }],
    })
    langs.setMonarchTokensProvider('wkt', {
      defaultToken: '',
      tokenizer: {
        root: [
          [/\b(POINT|MULTIPOINT)\b/, 'geo.type.point'],
          [/\b(LINESTRING|MULTILINESTRING)\b/, 'geo.type.line'],
          [/\b(POLYGON|MULTIPOLYGON)\b/, 'geo.type.polygon'],
          [/\b(GEOMETRYCOLLECTION)\b/, 'geo.type.collection'],
          [/\bEMPTY\b/, 'keyword'],
          [/\b(ZM?|M)\b/, 'tag'],
          [/-?\d+\.?\d*(?:[eE][+-]?\d+)?/, 'number.coord'],
          [/\(|\)/, 'delimiter.parenthesis'],
          [/,/, 'delimiter.comma'],
          [/\s+/, 'white'],
        ],
      },
    })

    // ---- 电子报盘语法 ----
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
        ],
      },
    })

    // ---- GeoJSON 语法 ----
    langs.register({ id: 'geojson' })
    langs.setLanguageConfiguration('geojson', {
      brackets: [['{', '}'], ['[', ']'], ['(', ')']],
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
      wordPattern: /"(?:[^"\\]|\\.)*"|-?\d+\.?\d*(?:[eE][+-]?\d+)?|[a-zA-Z_]\w*/,
    })
    langs.setMonarchTokensProvider('geojson', {
      defaultToken: '',
      tokenizer: {
        root: [
          [/"(type|coordinates|geometry|properties|features|geometries|crs|bbox|name|link|href)"(?=\s*:)/, 'keyword'],
          [/"([^"\\]|\\.)*"(?=\s*:)/, 'string.key'],
          [/"(Point|MultiPoint)"/, 'geo.type.point'],
          [/"(LineString|MultiLineString)"/, 'geo.type.line'],
          [/"(Polygon|MultiPolygon)"/, 'geo.type.polygon'],
          [/"(Feature)"/, 'geo.type.feature'],
          [/"(FeatureCollection|GeometryCollection)"/, 'geo.type.collection'],
          [/"([^"\\]|\\.)*"/, 'string'],
          [/-?\d+\.?\d*(?:[eE][+-]?\d+)?/, 'number'],
          [/\b(true|false|null)\b/, 'keyword'],
          [/[{}[\],:]/, 'delimiter'],
          [/\s+/, 'white'],
        ],
      },
    })

    // ---- 自定义主题 ----
    monacoEditor.defineTheme('gis-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '569cd6', fontStyle: 'bold' },
        { token: 'string.key', foreground: '9cdcfe' },
        { token: 'string', foreground: 'ce9178' },
        { token: 'number', foreground: 'b5cea8' },
        { token: 'number.coord', foreground: 'dcdcaa' },
        { token: 'tag', foreground: 'c586c0' },
        { token: 'delimiter', foreground: '808080' },
        { token: 'delimiter.parenthesis', foreground: 'ffd700' },
        { token: 'delimiter.comma', foreground: '6a9955' },
        { token: 'geo.type.point', foreground: '6aafe6', fontStyle: 'bold' },
        { token: 'geo.type.line', foreground: '6fe89c', fontStyle: 'bold' },
        { token: 'geo.type.polygon', foreground: 'ffa85c', fontStyle: 'bold' },
        { token: 'geo.type.feature', foreground: 'f472b6', fontStyle: 'bold' },
        { token: 'geo.type.collection', foreground: 'd6a8f0', fontStyle: 'bold' },
      ],
      colors: {},
    })
    monacoEditor.defineTheme('gis-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '0000ff', fontStyle: 'bold' },
        { token: 'string.key', foreground: '001080' },
        { token: 'string', foreground: 'a31515' },
        { token: 'number', foreground: '098658' },
        { token: 'number.coord', foreground: '795e26' },
        { token: 'tag', foreground: '9b2d9b' },
        { token: 'delimiter', foreground: '800000' },
        { token: 'delimiter.parenthesis', foreground: '000000' },
        { token: 'delimiter.comma', foreground: '008000' },
        { token: 'geo.type.point', foreground: '4A90D9', fontStyle: 'bold' },
        { token: 'geo.type.line', foreground: '50C878', fontStyle: 'bold' },
        { token: 'geo.type.polygon', foreground: 'FF8C42', fontStyle: 'bold' },
        { token: 'geo.type.feature', foreground: 'c2185b', fontStyle: 'bold' },
        { token: 'geo.type.collection', foreground: '9b2d9b', fontStyle: 'bold' },
      ],
      colors: {},
    })
  })()
}

/**
 * 获取已初始化的 Monaco editor 模块
 * 必须在 setupMonaco() 完成后调用
 */
export function getMonacoEditor(): typeof MonacoEditorNS {
  if (!monacoEditor) throw new Error('Monaco not initialized. Call setupMonaco() first.')
  return monacoEditor
}
