<template>
  <div class="main-map-container">
    <gis-map-tianditu :map-name="mapName" />
  </div>
</template>

<script setup lang="ts">
defineProps({
  mapName: {
    type: String,
    default: () => {
      return 'main';
    }
  }
})
</script>

<style scoped>
.main-map-container {
  width: 100%;
  height: 100%;
}
</style>