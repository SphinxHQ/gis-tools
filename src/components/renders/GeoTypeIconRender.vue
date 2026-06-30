<script setup lang="ts">
/**
 * @file Geometry type icon render
 * @description Renders geometry type icons as inline SVG.
 *              颜色遵循项目语义色规范（.agents/geo-compacter.md §6.1）：
 *              点=蓝(--gis-geo-point) / 线=绿(--gis-geo-line) / 面=橙(--gis-geo-polygon) / 集合=灰(--gis-geo-collection)
 *              通过 CSS 变量默认值 + fallback 实现：外层覆盖 CSS 变量即可统一调整，未覆盖时按类型语义色显示。
 *              Types: Point, MultiPoint, LineString, MultiLineString, Polygon, MultiPolygon, GeometryCollection.
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2026-06-27
 */

withDefaults(defineProps<{
  /** Geometry type string (e.g., 'Point', 'Polygon') */
  type?: string
  /** Icon size in pixels */
  size?: number
}>(), {
  type: '',
  size: 14,
})
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 16 16"
    xmlns="http://www.w3.org/2000/svg"
    class="geo-type-icon"
    fill="none"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <!-- Point: 单个点（蓝） -->
    <template v-if="type === 'Point'">
      <circle cx="8" cy="8" r="3" fill="var(--gis-geo-point, #2563eb)" stroke="none" />
    </template>

    <!-- MultiPoint: 多个点（蓝） -->
    <template v-else-if="type === 'MultiPoint'">
      <circle cx="4" cy="5" r="2" fill="var(--gis-geo-point, #2563eb)" stroke="none" />
      <circle cx="11" cy="6" r="2" fill="var(--gis-geo-point, #2563eb)" stroke="none" />
      <circle cx="7" cy="11.5" r="2" fill="var(--gis-geo-point, #2563eb)" stroke="none" />
    </template>

    <!-- LineString: 单条折线（绿） -->
    <template v-else-if="type === 'LineString'">
      <polyline points="2,12 6,4 10,10 14,4" stroke="var(--gis-geo-line, #16a34a)" />
    </template>

    <!-- MultiLineString: 多条折线（绿，次条半透明） -->
    <template v-else-if="type === 'MultiLineString'">
      <polyline points="2,11 6,5 10,9" stroke="var(--gis-geo-line, #16a34a)" />
      <polyline points="5,13 9,7 13,11" stroke="var(--gis-geo-line, #16a34a)" opacity="0.5" />
    </template>

    <!-- Polygon: 单个面（橙描边 + 橙半透明填充） -->
    <template v-else-if="type === 'Polygon'">
      <polygon
        points="8,2 14,6 12,13 4,13 2,6"
        fill="var(--gis-geo-polygon-bg, rgba(234, 88, 12, 0.15))"
        stroke="var(--gis-geo-polygon, #ea580c)"
      />
    </template>

    <!-- MultiPolygon: 多个面（橙，次个半透明） -->
    <template v-else-if="type === 'MultiPolygon'">
      <polygon
        points="2,3 8,2 7,8 1,7"
        fill="var(--gis-geo-polygon-bg, rgba(234, 88, 12, 0.15))"
        stroke="var(--gis-geo-polygon, #ea580c)"
      />
      <polygon
        points="9,7 14,6 13,13 8,12"
        fill="var(--gis-geo-polygon-bg, rgba(234, 88, 12, 0.15))"
        stroke="var(--gis-geo-polygon, #ea580c)"
        opacity="0.6"
      />
    </template>

    <!-- GeometryCollection: 点+线+面组合（灰，混合要素类型） -->
    <template v-else-if="type === 'GeometryCollection'">
      <circle cx="4" cy="4" r="2" fill="var(--gis-geo-collection, #64748b)" stroke="none" />
      <polyline points="2,13 6,9 10,13" stroke="var(--gis-geo-collection, #64748b)" />
      <polygon
        points="10,3 14,6 12,13"
        fill="var(--gis-geo-collection-bg, rgba(100, 116, 139, 0.15))"
        stroke="var(--gis-geo-collection, #64748b)"
      />
    </template>

    <!-- fallback: 空圆环（中性灰） -->
    <template v-else>
      <circle cx="8" cy="8" r="4" stroke="var(--gis-text-placeholder, #c0c4cc)" />
    </template>
  </svg>
</template>

<style scoped>
.geo-type-icon {
  display: inline-block;
  vertical-align: middle;
  flex-shrink: 0;
}
</style>
