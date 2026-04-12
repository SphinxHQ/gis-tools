<template>
  <gis-map-base :map-name="mapName" :options="options" map-type="blank" />
</template>
<script setup lang="ts">
defineProps({
  mapName: String,
  options: Object
})
</script>