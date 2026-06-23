import { computed, ref } from 'vue'

import Common from '~/common/Common'
import GisDataInfo from '~/components/data/GisDataInfo'

export interface GisDataSetEntry {
  id: string
  name: string
  data: GisDataInfo
  sourceId: string
  appendedFrom?: { name: string; count: number }[]
}

export interface GisDataSource {
  id: string
  name: string
  datasets: GisDataSetEntry[]
}

const datasets = ref<GisDataSetEntry[]>([])
const activeId = ref<string | null>(null)
const activeSourceId = ref<string | null>(null)

const activeDataset = computed<GisDataSetEntry | undefined>(() =>
  datasets.value.find(d => d.id === activeId.value)
)

const dataSources = computed<GisDataSource[]>(() => {
  const sourceMap = new Map<string, GisDataSource>()
  for (const ds of datasets.value) {
    if (!sourceMap.has(ds.sourceId)) {
      sourceMap.set(ds.sourceId, { id: ds.sourceId, name: ds.name, datasets: [] })
    }
    sourceMap.get(ds.sourceId)!.datasets.push(ds)
  }
  return Array.from(sourceMap.values())
})

function addDataSource(dataInfo: GisDataInfo): string {
  const sourceId = Common.uuid()
  const datasetId = Common.uuid()
  const entry: GisDataSetEntry = {
    id: datasetId,
    name: dataInfo.name || '未命名',
    data: dataInfo,
    sourceId,
  }
  datasets.value = [...datasets.value, entry]
  activeId.value = datasetId
  activeSourceId.value = sourceId
  return sourceId
}

function addDataset(dataInfo: GisDataInfo, sourceId?: string): string {
  const id = Common.uuid()
  const targetSourceId = sourceId ?? activeSourceId.value ?? Common.uuid()
  const entry: GisDataSetEntry = {
    id,
    name: dataInfo.name || '未命名',
    data: dataInfo,
    sourceId: targetSourceId,
  }
  datasets.value = [...datasets.value, entry]
  activeId.value = id
  activeSourceId.value = targetSourceId
  return id
}

function updateDataset(id: string, data: GisDataInfo): void {
  const entry = datasets.value.find(d => d.id === id)
  if (!entry) return
  entry.data = data
  entry.name = data.name || entry.name
}

function removeDataset(id: string): void {
  const idx = datasets.value.findIndex(d => d.id === id)
  if (idx === -1) return

  const removed = datasets.value[idx]
  datasets.value = datasets.value.filter(d => d.id !== id)

  const sourceHasData = datasets.value.some(d => d.sourceId === removed.sourceId)
  if (!sourceHasData && activeSourceId.value === removed.sourceId) {
    const nextSource = dataSources.value[0]
    activeSourceId.value = nextSource?.id ?? null
  }

  if (activeId.value === id) {
    const next = datasets.value[idx] || datasets.value[idx - 1]
    activeId.value = next?.id ?? null
  }
}

function appendToDataset(id: string, additional: GisDataInfo): void {
  const entry = datasets.value.find(d => d.id === id)
  if (!entry) return
  const appendCount = additional.features.length
  entry.data = GisDataInfo.clone(entry.data)
  entry.data.features.push(...additional.features)
  entry.name = `${entry.name}+${additional.name}`
  if (!entry.appendedFrom) entry.appendedFrom = []
  entry.appendedFrom.push({ name: additional.name || '未命名', count: appendCount })
}

function setActive(id: string): void {
  activeId.value = id
  const entry = datasets.value.find(d => d.id === id)
  if (entry) activeSourceId.value = entry.sourceId
}

function clearAll(): void {
  datasets.value = []
  activeId.value = null
  activeSourceId.value = null
}

export function useGisDataStore() {
  return {
    datasets,
    activeId,
    activeSourceId,
    activeDataset,
    dataSources,
    addDataSource,
    addDataset,
    updateDataset,
    removeDataset,
    appendToDataset,
    setActive,
    clearAll,
  }
}
