<!--
@file GisMap Tianditu variant component
@description A Tianditu basemap variant wrapping GisMapBase with mapType="tianditu".
@author yuanyu <yuanyu@supermap.com>
@date 2026-04-13
-->
<template>
  <gis-map-base :map-name="mapName" :options="options" map-type="tianditu" />
</template>
<script setup lang="ts">
defineProps({
  mapName: String,
  options: Object
})
</script>