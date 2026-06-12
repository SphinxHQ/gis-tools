import { computed, ref } from 'vue'

import Common from '~/common/Common'
import GisDataInfo from '~/components/data/GisDataInfo'

export interface GisDataSetEntry {
  id: string
  name: string
  data: GisDataInfo
}

const datasets = ref<GisDataSetEntry[]>([])
const activeId = ref<string | null>(null)

const activeDataset = computed<GisDataSetEntry | undefined>(() =>
  datasets.value.find(d => d.id === activeId.value)
)

function addDataset(dataInfo: GisDataInfo): string {
  const id = Common.uuid()
  const entry: GisDataSetEntry = {
    id,
    name: dataInfo.name || '未命名',
    data: dataInfo,
  }
  datasets.value = [...datasets.value, entry]
  activeId.value = id
  return id
}

function removeDataset(id: string): void {
  const idx = datasets.value.findIndex(d => d.id === id)
  if (idx === -1) return

  datasets.value = datasets.value.filter(d => d.id !== id)

  if (activeId.value === id) {
    const next = datasets.value[idx] || datasets.value[idx - 1]
    activeId.value = next?.id ?? null
  }
}

function appendToDataset(id: string, additional: GisDataInfo): void {
  const entry = datasets.value.find(d => d.id === id)
  if (!entry) return
  entry.data = GisDataInfo.clone(entry.data)
  entry.data.features.push(...additional.features)
  entry.name = `${entry.name}+${additional.name}`
}

function setActive(id: string): void {
  activeId.value = id
}

function clearAll(): void {
  datasets.value = []
  activeId.value = null
}

export function useGisDataStore() {
  return {
    datasets,
    activeId,
    activeDataset,
    addDataset,
    removeDataset,
    appendToDataset,
    setActive,
    clearAll,
  }
}
