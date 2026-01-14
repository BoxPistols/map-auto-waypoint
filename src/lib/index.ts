/**
 * Japan Drone Map Library
 * DIDinJapan2026パターンを参考にしたMap関連ライブラリ
 */

// ============================================
// Types
// ============================================
export * from './types'

// ============================================
// Config
// ============================================
export {
  BASE_MAPS,
  DEFAULT_BASE_MAP,
  DEFAULT_MAP_STYLE,
  getBaseMapStyle,
  getBaseMapKeys
} from './config/baseMaps'

export {
  RESTRICTION_COLORS,
  GEO_OVERLAYS,
  WEATHER_OVERLAYS,
  DID_TILE_URL,
  DID_INFO,
  getDIDSourceConfig,
  getGeographicFeaturesSourceConfig,
  RESTRICTION_ZONES,
  NO_FLY_LAW_ZONES,
  RESTRICTION_CATEGORIES,
  getAllRestrictionZones
} from './config/overlays'

export {
  PREFECTURE_COLORS,
  LAYER_GROUPS,
  createLayerIdToNameMap,
  getAllLayers,
  getLayerGroupByName
} from './config/layers'

// ============================================
// Services
// ============================================
export {
  AIRPORT_ZONES,
  getAirportZonesGeoJSON,
  getAirportsByType,
  getInternationalAirports,
  getMilitaryAirfields,
  checkAirspaceRestrictions,
  getExternalMapLinks
} from './services/airports'

export {
  NO_FLY_ZONES,
  getNoFlyZonesGeoJSON,
  getRedZonesGeoJSON,
  getYellowZonesGeoJSON,
  getNoFlyZonesByType,
  getNoFlyZonesByCategory,
  getNuclearPlants,
  getEmbassies
} from './services/noFlyZones'

export {
  HELIPORTS,
  getHeliportsGeoJSON,
  getHeliportsByType,
  getHospitalHeliports,
  getRegularHeliports
} from './services/heliports'

export {
  EMERGENCY_AIRSPACE,
  REMOTE_ID_ZONES,
  MANNED_AIRCRAFT_ZONES,
  RADIO_INTERFERENCE_ZONES,
  getEmergencyAirspaceGeoJSON,
  getRemoteIdZonesGeoJSON,
  getMannedAircraftZonesGeoJSON,
  getRadioInterferenceZonesGeoJSON,
  getActiveEmergencyAirspace,
  getAgriculturalZones,
  getGliderFields,
  get5GZones
} from './services/utmZones'

export {
  fetchRainViewerData,
  getRainViewerSourceConfig,
  clearRainViewerCache,
  getWindLayerSourceConfig,
  getJMANowcastSourceConfig,
  WEATHER_OVERLAY_IDS
} from './services/weather'
export type { WeatherOverlayId } from './services/weather'

export { CustomLayerService } from './services/customLayers'

// ============================================
// Utils
// ============================================
export {
  calculateDistance,
  getDistanceMeters,
  destinationPoint,
  createCirclePolygon,
  createCirclePolygonMeters
} from './utils/geo'
