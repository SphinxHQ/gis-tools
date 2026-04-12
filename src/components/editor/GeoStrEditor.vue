<script setup lang="ts">

const emit = defineEmits(['input']);
const modelValue = defineModel('value', { type: [String, Array, Object], default: '' });
const handleInput = (val: string | number) => {
  emit('input', val);
};
</script>

<template>
  <el-input v-model="modelValue" placeholder="GeoJson、WKT、电子报盘、ResponseBase(安图) 文本" class="geo-str-editor" type="textarea" @input="handleInput" />
</template>

<style scoped>
.geo-str-editor{
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  color: #000;
  white-space: pre-wrap;
}
.geo-str-editor :deep( .el-textarea__inner){
  width: 100%;
  height: 100% !important;
}
</style>
<style>
</style>
