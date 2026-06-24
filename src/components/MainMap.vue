<template>
  <div class="main-map-container">
    <gis-map-tianditu :map-name="mapName" />
  </div>
</template>

<script setup lang="ts">
/**
 * @file Main map component
 * @description Map view wrapper integrating GisMapSlot, MapControlPanel, and MapDrawer.
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2024-08-06
 */

defineProps({
  /** Map instance identifier */
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