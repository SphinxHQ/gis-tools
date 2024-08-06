<template>
    <div ref="cusEditor"></div>
</template>
<script setup lang="ts">
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'
import {   ref,  onMounted, onUnmounted, watch } from 'vue'
import './worker'
const OPTIONS_BASE: monaco.editor.IStandaloneEditorConstructionOptions = {
    value: '', // 初始显示文字
    lineNumbers: 'on', // 是否展示行号 'off' | 'on
    automaticLayout: true, // 自适应布局 默认true
    wordWrap:'on',
    minimap: {
        enabled: false,
    },
    tabSize: 2,
    fontSize: 16
}
interface IProps {
    modelValue: string
    disabled?: boolean
    editorConfig?: { language: string; theme: 'vs' | 'vs-dark' | 'hc-black' }
}
const props = withDefaults(defineProps<IProps>(), {
    modelValue: '',
    disabled: false,
    editorConfig: () => ({ language: 'json', theme: 'hc-black' }),
})

const cusEditor = ref<HTMLElement | null>(null)
let editor: Partial<monaco.editor.IStandaloneCodeEditor> = {}
const emit = defineEmits(['update:modelValue'])

/**初始化编辑器 */
onMounted(() => {
    onDispose()
    if (cusEditor.value) {
        editor = monaco.editor.create(cusEditor.value, { ...OPTIONS_BASE, ...props.editorConfig, readOnly: props.disabled })
        editor.onDidChangeModelContent &&
            editor.onDidChangeModelContent(() => {
                const value = editor.getValue && editor.getValue() // 给父组件实时返回最新文本
                emit('update:modelValue', value)
            })
    }
})
/**销毁实例 */
const onDispose = () => {
    editor && editor.dispose && editor.dispose()
}
onUnmounted(() => {
    onDispose()
})
/**修改只读状态 */
watch(
    () => props.disabled,
    (val) => {
        editor.updateOptions && editor.updateOptions({ readOnly: val })
    }
)
/**修改配置 */
watch(
    () => props.editorConfig,
    (val) => {
        const model = editor.getModel && editor.getModel()
        if (model) {
            monaco.editor.setModelLanguage(model, val.language)
            monaco.editor.setTheme(val.theme)
        }
    },
    { deep: true }
)
/**回显数据 */
watch(
    () => props.modelValue,
    (val) => {
        if (editor) {
            const value = editor.getValue && editor.getValue()
            if (val !== value) {
                editor.setValue && editor.setValue(val || '')
            }
        }
    }
)
</script>
