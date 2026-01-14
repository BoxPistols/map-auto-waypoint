import { useState, useEffect, useCallback } from 'react'
import { CustomLayerService } from '../lib/services/customLayers'

export function useCustomLayers() {
  const [customLayers, setCustomLayers] = useState([])
  const [visibleCustomLayerIds, setVisibleCustomLayerIds] = useState(new Set())

  // Load custom layers on mount
  useEffect(() => {
    const layers = CustomLayerService.getAll()
    setCustomLayers(layers)
    // Initially show all custom layers
    setVisibleCustomLayerIds(new Set(layers.map(l => l.id)))
  }, [])

  const handleCustomLayerAdded = useCallback((layer) => {
    setCustomLayers(prev => [...prev, layer])
    setVisibleCustomLayerIds(prev => {
      const next = new Set(prev)
      next.add(layer.id)
      return next
    })
  }, [])

  const handleCustomLayerRemoved = useCallback((id) => {
    setCustomLayers(prev => prev.filter(l => l.id !== id))
    setVisibleCustomLayerIds(prev => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }, [])

  const handleCustomLayerToggle = useCallback((id, visible) => {
    setVisibleCustomLayerIds(prev => {
      const next = new Set(prev)
      if (visible) next.add(id)
      else next.delete(id)
      return next
    })
  }, [])

  return {
    customLayers,
    visibleCustomLayerIds,
    handleCustomLayerAdded,
    handleCustomLayerRemoved,
    handleCustomLayerToggle
  }
}
