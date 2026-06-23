import { ref, watch, onBeforeUnmount, nextTick, type Ref } from 'vue'
import type { Feature as GeoFeature } from 'geojson'

import Common from '~/common/Common'
import { logger } from '~/common/logger'
import GisDataInfo from '~/components/data/GisDataInfo'
import { GisMapAddFeaturesEvent, GisMapflashFeaturesEvent, GisMapStopModifyEvent } from '~/components/gismap/events/GisMapEvents'
import { eventBus } from '~/composables/eventBus'

export interface MapControllerOptions {
  instanceId: Ref<number | string>
  data: Ref<GisDataInfo | undefined>
}

export function useMapController(options: MapControllerOptions) {
  const { instanceId, data } = options

  const mapReady = ref(false)
  const mapReloaded = ref(true)
  const busy = ref(false)
  const isInEditMode = ref(false)

  let mapReadyHandler: (() => void) | null = null

  const epsgCode = ref<number | undefined>(undefined)

  // 监听 CRS 变化
  watch(() => data.value?.crs, (newCrs) => {
    if (newCrs) {
      epsgCode.value = newCrs.epsgCode
      mapReloaded.value = false
      Common.timeout(() => {
        mapReloaded.value = true
        if (mapReady.value) {
          renderMapFeatures()
        }
      }, 500)
    } else {
      epsgCode.value = undefined
    }
  }, { deep: true, immediate: true })

  const renderMapFeatures = () => {
    logger.info('[MapController] renderMapFeatures called', {
      hasData: !!data.value?.features?.length,
      featuresCount: data.value?.features?.length || 0,
      instanceId: instanceId.value,
      mapReady: mapReady.value,
      isInEditMode: isInEditMode.value
    })

    if (isInEditMode.value) {
      logger.info('[MapController] renderMapFeatures skipped: in edit mode')
      return
    }

    if (!data.value?.features?.length) {
      logger.warn('[MapController] renderMapFeatures skipped: no data')
      return
    }

    if (!instanceId.value) {
      logger.warn('[MapController] renderMapFeatures skipped: no instanceId')
      return
    }

    if (!mapReady.value) {
      logger.warn('[MapController] renderMapFeatures skipped: map not ready')
      return
    }

    nextTick(() => {
      data.value!.features.forEach((f, _idx) => {
        (f as GeoJSON.Feature & { label?: number }).label = _idx
      })
      const addFeaturesEvent = new GisMapAddFeaturesEvent(data.value!.features, { clear: true })
      logger.info('[MapController] Emitting GisMapAddFeaturesEvent', {
        instanceId: instanceId.value,
        featuresCount: data.value!.features.length
      })
      eventBus.emit(`${instanceId.value}`, addFeaturesEvent)
    })
  }

  const flashGeometries = (geometries: Record<string, unknown>[]) => {
    logger.info('[MapController] flashGeometries called', {
      geometriesCount: geometries.length,
      instanceId: instanceId.value
    })

    if (!instanceId.value) return

    const addFeaturesEvent = new GisMapflashFeaturesEvent(geometries.map(x => {
      return {
        type: "Feature" as const,
        geometry: x as unknown as GeoJSON.Geometry,
        properties: {} as GeoJSON.GeoJsonProperties,
      } satisfies GeoJSON.Feature
    }))
    eventBus.emit(`${instanceId.value}`, addFeaturesEvent)
  }

  const setupMapReadyListener = () => {
    if (!instanceId.value) return
    const id = instanceId.value
    mapReadyHandler = () => {
      logger.info('[MapController] Received map ready event for instance:', id)
      mapReady.value = true
      if (data.value?.features?.length) {
        renderMapFeatures()
      }
    }
    eventBus.on(`${id}`, 'map-ready', mapReadyHandler)
  }

  const cleanupMapReadyListener = () => {
    if (mapReadyHandler && instanceId.value) {
      eventBus.off(`${instanceId.value}`, 'map-ready', mapReadyHandler)
      mapReadyHandler = null
    }
  }

  const stopEditMode = () => {
    if (isInEditMode.value && instanceId.value) {
      isInEditMode.value = false
      eventBus.emit(`${instanceId.value}`, new GisMapStopModifyEvent())
      eventBus.emit(`${instanceId.value}`, { event_type: 'map-event:clear-edit-shadow', options: {}, params: [] })
      renderMapFeatures()
    }
  }

  const enterEditMode = () => {
    isInEditMode.value = true
  }

  // 监听数据变化
  watch(() => data.value, (newData) => {
    logger.info('[MapController] data watch triggered', {
      hasNewData: !!newData,
      newFeaturesCount: newData?.features?.length || 0,
      mapReady: mapReady.value
    })

    if (newData?.features?.length) {
      if (mapReady.value) {
        renderMapFeatures()
      }
    }
  }, { deep: true, immediate: true })

  onBeforeUnmount(() => {
    cleanupMapReadyListener()
  })

  return {
    mapReady,
    mapReloaded,
    busy,
    isInEditMode,
    epsgCode,
    renderMapFeatures,
    flashGeometries,
    setupMapReadyListener,
    cleanupMapReadyListener,
    stopEditMode,
    enterEditMode,
  }
}
