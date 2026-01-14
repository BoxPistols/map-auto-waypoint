/**
 * Custom Layers Service
 * ユーザーがカスタムでアップロード・管理できるレイヤーのサービス
 * ローカルストレージを使用してデータを永続化
 */

// ============================================
// Types
// ============================================

export interface CustomLayer {
  id: string
  name: string
  type: 'restriction' | 'poi' | 'custom'
  category: string
  color: string
  opacity: number
  data: GeoJSON.FeatureCollection
  createdAt: number
  updatedAt: number
  description?: string
}

export interface CustomLayerConfig {
  id?: string
  name: string
  category: string
  color: string
  opacity: number
  description?: string
}

const STORAGE_KEY = 'map-auto-waypoint-custom-layers'

// ============================================
// Local Storage Operations
// ============================================

/**
 * Get all custom layers from local storage
 */
export function getCustomLayers(): CustomLayer[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (!data) return []
    return JSON.parse(data)
  } catch (error) {
    console.error('Failed to load custom layers:', error)
    return []
  }
}

/**
 * Save custom layers to local storage
 */
export function saveCustomLayers(layers: CustomLayer[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layers))
    return true
  } catch (error) {
    console.error('Failed to save custom layers:', error)
    return false
  }
}

/**
 * Add a new custom layer
 */
export function addCustomLayer(
  config: CustomLayerConfig,
  data: GeoJSON.FeatureCollection
): CustomLayer {
  const layers = getCustomLayers()
  const now = Date.now()

  const newLayer: CustomLayer = {
    id: config.id || `custom-${now}`,
    name: config.name,
    type: 'custom',
    category: config.category,
    color: config.color,
    opacity: config.opacity,
    data,
    createdAt: now,
    updatedAt: now,
    description: config.description
  }

  layers.push(newLayer)
  saveCustomLayers(layers)
  return newLayer
}

/**
 * Update an existing custom layer
 */
export function updateCustomLayer(
  id: string,
  updates: Partial<Omit<CustomLayer, 'id' | 'createdAt'>>
): CustomLayer | null {
  const layers = getCustomLayers()
  const index = layers.findIndex(l => l.id === id)

  if (index === -1) return null

  layers[index] = {
    ...layers[index],
    ...updates,
    updatedAt: Date.now()
  }

  saveCustomLayers(layers)
  return layers[index]
}

/**
 * Remove a custom layer
 */
export function removeCustomLayer(id: string): boolean {
  const layers = getCustomLayers()
  const filtered = layers.filter(l => l.id !== id)

  if (filtered.length === layers.length) return false

  saveCustomLayers(filtered)
  return true
}

/**
 * Get custom layer by ID
 */
export function getCustomLayerById(id: string): CustomLayer | null {
  const layers = getCustomLayers()
  return layers.find(l => l.id === id) || null
}

// ============================================
// Import/Export Operations
// ============================================

/**
 * Export all custom layers as JSON
 */
export function exportCustomLayers(): string {
  const layers = getCustomLayers()
  return JSON.stringify(layers, null, 2)
}

/**
 * Export a single layer as GeoJSON
 */
export function exportLayerAsGeoJSON(id: string): string | null {
  const layer = getCustomLayerById(id)
  if (!layer) return null

  const exportData = {
    type: 'FeatureCollection' as const,
    metadata: {
      name: layer.name,
      category: layer.category,
      color: layer.color,
      opacity: layer.opacity,
      description: layer.description,
      exportedAt: new Date().toISOString()
    },
    features: layer.data.features
  }

  return JSON.stringify(exportData, null, 2)
}

/**
 * Import custom layers from JSON
 */
export function importCustomLayers(jsonString: string): { success: boolean; count: number; error?: string } {
  try {
    const imported = JSON.parse(jsonString)

    if (!imported || typeof imported !== 'object') {
      return { success: false, count: 0, error: 'Invalid JSON' }
    }

    if (Array.isArray(imported)) {
      const layers = getCustomLayers()
      const now = Date.now()
      let validCount = 0

      imported.forEach((item, index) => {
        if (!item || typeof item !== 'object' || !item.data || !item.name) return

        const newLayer: CustomLayer = {
          id: item.id || `imported-${now}-${index}`,
          name: item.name,
          type: 'custom',
          category: item.category || 'custom',
          color: item.color || '#888888',
          opacity: item.opacity ?? 0.5,
          data: item.data,
          createdAt: item.createdAt || now,
          updatedAt: now,
          description: item.description
        }
        layers.push(newLayer)
        validCount++
      })

      saveCustomLayers(layers)
      return { success: validCount > 0, count: validCount }
    } else if (imported.type === 'FeatureCollection') {
      const layers = getCustomLayers()
      const now = Date.now()

      const metadata = imported.metadata || {}
      const newLayer: CustomLayer = {
        id: metadata.id || `imported-${now}`,
        name: metadata.name || 'Imported Layer',
        type: 'custom',
        category: metadata.category || 'custom',
        color: metadata.color || '#888888',
        opacity: metadata.opacity ?? 0.5,
        data: {
          type: 'FeatureCollection',
          features: imported.features
        },
        createdAt: now,
        updatedAt: now,
        description: metadata.description
      }

      layers.push(newLayer)
      saveCustomLayers(layers)
      return { success: true, count: 1 }
    }

    return { success: false, count: 0, error: 'Invalid format' }
  } catch (error) {
    return { success: false, count: 0, error: String(error) }
  }
}

// ============================================
// File Handling Utilities
// ============================================

/**
 * Read GeoJSON from File object
 */
export async function readGeoJSONFile(file: File): Promise<GeoJSON.FeatureCollection> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string)
        if (json.type === 'FeatureCollection') resolve(json)
        else if (json.type === 'Feature') resolve({ type: 'FeatureCollection', features: [json] })
        else reject(new Error('Invalid GeoJSON'))
      } catch (error) { reject(error) }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

/**
 * Download data as file
 */
export function downloadAsFile(content: string, filename: string, mimeType: string = 'application/json') {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 100)
}

export const CustomLayerService = {
  getAll: getCustomLayers,
  getById: getCustomLayerById,
  add: addCustomLayer,
  update: updateCustomLayer,
  remove: removeCustomLayer,
  exportAll: exportCustomLayers,
  exportAsGeoJSON: exportLayerAsGeoJSON,
  import: importCustomLayers,
  readFile: readGeoJSONFile,
  download: downloadAsFile
}
