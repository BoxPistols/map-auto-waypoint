// localStorage keys
const STORAGE_KEYS = {
  POLYGONS: 'drone_waypoint_polygons',
  WAYPOINTS: 'drone_waypoint_waypoints',
  HISTORY: 'drone_waypoint_history',
  SEARCH_HISTORY: 'drone_waypoint_search_history',
  MAP_SETTINGS: 'drone_waypoint_map_settings'
}

const MAX_HISTORY_ITEMS = 50

// デフォルトのマップ設定
const DEFAULT_MAP_SETTINGS = {
  is3D: false,
  showDID: false,
  showAirportZones: false,
  showRestrictionSurfaces: false,
  showNoFlyZones: false,
  showRedZones: false,
  showYellowZones: false,
  showHeliports: false,
  // UTM新規レイヤー
  showEmergencyAirspace: false,
  showRemoteIdZones: false,
  showMannedAircraftZones: false,
  showGeoFeatures: false,
  showRainCloud: false,
  showWind: false,
  showRadioZones: false,
  // UIコントロール
  showCrosshair: false,
  mapStyleId: 'osm'
}

// Polygon operations
export const savePolygons = (polygons) => {
  try {
    localStorage.setItem(STORAGE_KEYS.POLYGONS, JSON.stringify(polygons))
    return true
  } catch (error) {
    console.error('Failed to save polygons:', error)
    return false
  }
}

export const loadPolygons = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.POLYGONS)
    return data ? JSON.parse(data) : []
  } catch (error) {
    console.error('Failed to load polygons:', error)
    return []
  }
}

// Waypoint operations
export const saveWaypoints = (waypoints) => {
  try {
    localStorage.setItem(STORAGE_KEYS.WAYPOINTS, JSON.stringify(waypoints))
    return true
  } catch (error) {
    console.error('Failed to save waypoints:', error)
    return false
  }
}

export const loadWaypoints = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.WAYPOINTS)
    return data ? JSON.parse(data) : []
  } catch (error) {
    console.error('Failed to load waypoints:', error)
    return []
  }
}

// History operations
export const saveHistory = (item) => {
  try {
    const history = loadHistory()
    const newItem = { ...item, timestamp: Date.now() }
    const updated = [newItem, ...history].slice(0, MAX_HISTORY_ITEMS)
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(updated))
    return true
  } catch (error) {
    console.error('Failed to save history:', error)
    return false
  }
}

export const loadHistory = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.HISTORY)
    return data ? JSON.parse(data) : []
  } catch (error) {
    console.error('Failed to load history:', error)
    return []
  }
}

// Search history
export const saveSearchHistory = (query, results) => {
  try {
    const history = loadSearchHistory()
    const newItem = {
      query,
      timestamp: Date.now(),
      firstResult: results[0] ? {
        name: results[0].display_name,
        lat: parseFloat(results[0].lat),
        lng: parseFloat(results[0].lon)
      } : null
    }
    const updated = [newItem, ...history].slice(0, MAX_HISTORY_ITEMS)
    localStorage.setItem(STORAGE_KEYS.SEARCH_HISTORY, JSON.stringify(updated))
    return true
  } catch (error) {
    console.error('Failed to save search history:', error)
    return false
  }
}

export const loadSearchHistory = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SEARCH_HISTORY)
    return data ? JSON.parse(data) : []
  } catch (error) {
    console.error('Failed to load search history:', error)
    return []
  }
}

// Map settings (overlays, 3D mode, etc.)
export const saveMapSettings = (settings) => {
  try {
    localStorage.setItem(STORAGE_KEYS.MAP_SETTINGS, JSON.stringify(settings))
    return true
  } catch (error) {
    console.error('Failed to save map settings:', error)
    return false
  }
}

export const loadMapSettings = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.MAP_SETTINGS)
    return data ? JSON.parse(data) : DEFAULT_MAP_SETTINGS
  } catch (error) {
    console.error('Failed to load map settings:', error)
    return DEFAULT_MAP_SETTINGS
  }
}

// Export all data
export const exportAllData = () => {
  return {
    polygons: loadPolygons(),
    waypoints: loadWaypoints(),
    history: loadHistory(),
    searchHistory: loadSearchHistory(),
    exportedAt: new Date().toISOString()
  }
}

// Import all data
export const importData = (data) => {
  try {
    if (data.polygons) {
      localStorage.setItem(STORAGE_KEYS.POLYGONS, JSON.stringify(data.polygons))
    }
    if (data.waypoints) {
      localStorage.setItem(STORAGE_KEYS.WAYPOINTS, JSON.stringify(data.waypoints))
    }
    if (data.history) {
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(data.history))
    }
    if (data.searchHistory) {
      localStorage.setItem(STORAGE_KEYS.SEARCH_HISTORY, JSON.stringify(data.searchHistory))
    }
    return true
  } catch (error) {
    console.error('Failed to import data:', error)
    return false
  }
}

// Clear all data
export const clearAllData = () => {
  try {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key))
    return true
  } catch (error) {
    console.error('Failed to clear data:', error)
    return false
  }
}
