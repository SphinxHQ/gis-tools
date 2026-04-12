<template>
  <gis-map-base :map-name="mapName" :options="options" map-type="tianditu" />
</template>
<script setup lang="ts">
defineProps({
  mapName: String,
  options: Object
})
</script>