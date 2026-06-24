<!--
@file GisMap blank variant component
@description A blank map variant (no basemap) wrapping GisMapBase with mapType="blank".
@author yuanyu <yuanyu@supermap.com>
@date 2026-04-13
-->
<template>
  <gis-map-base :map-name="mapName" :options="options" map-type="blank" />
</template>
<script setup lang="ts">
defineProps({
  mapName: String,
  options: Object
})
</script>