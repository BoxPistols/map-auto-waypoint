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
  PREFECTURE_BOUNDS,
  LAYER_GROUPS,
  createLayerIdToNameMap,
  getAllLayers,
  getLayerGroupByName
} from './config/layers'

// ============================================
// Services - Airports
// ============================================
export {
  MAJOR_AIRPORTS,
  REGIONAL_AIRPORTS,
  MILITARY_BASES,
  HELIPORTS,
  getAllAirports,
  getAllAirportsWithHeliports,
  getNoFlyLawAirports,
  generateAirportGeoJSON,
  generateAirportMarkersGeoJSON,
  generateHeliportGeoJSON,
  isInAirportZone,
  AirportService
} from './services/airports'

// Use legacy checkAirspaceRestrictions that includes no-fly zones
export { checkAirspaceRestrictionsLegacy as checkAirspaceRestrictions } from './utils/legacy'

// Legacy format exports for backward compatibility
// These use the old data format: { name, lat, lng, radius (meters), type }
export {
  AIRPORT_ZONES,
  NO_FLY_ZONES,
  getExternalMapLinks,
  checkAirspaceRestrictionsLegacy,
  getAirportZonesGeoJSONLegacy,
  getNoFlyZonesGeoJSONLegacy,
  getLegacyAirportZones,
  getLegacyNoFlyZones
} from './utils/legacy'
export type { LegacyAirport, LegacyNoFlyZone } from './utils/legacy'

// Function aliases for test compatibility
export { getAirportZonesGeoJSONLegacy as getAirportZonesGeoJSON } from './utils/legacy'

// ============================================
// Services - No-Fly Zones
// ============================================
export {
  NO_FLY_FACILITIES,
  getFacilitiesByZone,
  getFacilitiesByType,
  generateRedZoneGeoJSON,
  generateYellowZoneGeoJSON,
  generateAllNoFlyGeoJSON,
  generateEmergencyAirspaceGeoJSON,
  generateRemoteIDZoneGeoJSON,
  generateMannedAircraftZonesGeoJSON,
  generateRadioInterferenceZonesGeoJSON,
  isInNoFlyZone,
  getNearbyNoFlyZones,
  getNuclearPlants,
  getUSMilitaryBases,
  getEmbassies,
  toLegacyFormat,
  NoFlyZoneService
} from './services/noFlyZones'

// Function aliases for legacy compatibility
export { getNoFlyZonesGeoJSONLegacy as getNoFlyZonesGeoJSON } from './utils/legacy'
export {
  generateRedZoneGeoJSON as getRedZonesGeoJSON,
  generateYellowZoneGeoJSON as getYellowZonesGeoJSON
} from './services/noFlyZones'
export type { NoFlyFacility } from './services/noFlyZones'

// ============================================
// Services - Heliports (if exists)
// ============================================
// Heliports are now included in airports.ts
// Export aliases for backward compatibility
export {
  HELIPORTS as HELIPORTS_LIST,
  generateHeliportGeoJSON as getHeliportsGeoJSON
} from './services/airports'

// ============================================
// Services - UTM Zones (if exists)
// ============================================
export {
  generateEmergencyAirspaceGeoJSON as getEmergencyAirspaceGeoJSON,
  generateRemoteIDZoneGeoJSON as getRemoteIdZonesGeoJSON,
  generateMannedAircraftZonesGeoJSON as getMannedAircraftZonesGeoJSON,
  generateRadioInterferenceZonesGeoJSON as getRadioInterferenceZonesGeoJSON
} from './services/noFlyZones'

// ============================================
// Services - Restriction Surfaces (制限表面)
// ============================================
export {
  KOKUAREA_TILE_URL,
  KOKUAREA_PROXY_ENDPOINT,
  KOKUAREA_MAX_TILES,
  RESTRICTION_SURFACE_STYLES,
  fillKokuareaTileUrl,
  buildKokuareaTileUrl,
  getVisibleTileRange,
  getVisibleTileCoordinates,
  classifyRestrictionSurface,
  enrichRestrictionSurfaceFeature,
  fetchRestrictionSurfaceTiles,
  getRestrictionSurfaceLayerStyles,
  RestrictionSurfaceService
} from './services/restrictionSurfaces'
export type { RestrictionSurfaceKind, RestrictionSurfaceProperties } from './services/restrictionSurfaces'

// ============================================
// Services - Weather
// ============================================
export {
  fetchRainViewerData,
  getRainViewerSourceConfig,
  clearRainViewerCache,
  getWindLayerSourceConfig,
  getJMANowcastSourceConfig,
  WEATHER_OVERLAY_IDS
} from './services/weather'
export type { WeatherOverlayId } from './services/weather'

// Weather API (Open-Meteo)
export {
  fetchWeather,
  fetchPrefectureWeather,
  fetchAllPrefecturesWeather,
  findNearestPrefecture,
  isDroneFlightSafe,
  getWeatherDescription,
  formatHourlyTime,
  formatDailyDate,
  getPrefecturesByRegion,
  getAllRegions,
  WeatherApiService,
  JAPAN_PREFECTURES
} from './services/weatherApi'
export type {
  WeatherData,
  HourlyForecast,
  DailyForecast,
  PrefectureWeather
} from './services/weatherApi'

// Sunrise/Sunset Service
export {
  fetchSunriseSunset,
  getCivilTwilightEnd,
  isDaylight,
  getMinutesUntilTwilightEnd,
  getGoldenHours,
  getDroneFlightWindow,
  formatSunTimes,
  formatSunTimesDetailed,
  SunriseSunsetService
} from './services/sunriseSunset'
export type { SunriseSunsetData, SunTimesRequest } from './services/sunriseSunset'

// ============================================
// Services - Custom Layers
// ============================================
export { CustomLayerService } from './services/customLayers'

// ============================================
// Utils - Geo
// ============================================
export {
  calculateDistance,
  getDistanceMeters,
  destinationPoint,
  createCirclePolygon,
  createCirclePolygonMeters,
  formatCoordinates,
  formatCoordinatesDMS,
  convertDecimalToDMS,
  degreesToCompass,
  degreesToJapanese,
  calculateBBox,
  bboxesIntersect
} from './utils/geo'

// ============================================
// Utils - Collision Detection
// ============================================
export {
  createSpatialIndex,
  checkWaypointCollision,
  checkWaypointCollisionOptimized,
  checkPathCollision,
  checkPolygonCollision,
  checkWaypointsCollisionBatch,
  hasAnyCollision,
  getCollisionSummary,
  getSeverityColor,
  getSeverityLabel,
  getZoneTypeLabel,
  ZONE_COLORS,
  ZONE_SEVERITY,
  ZONE_PRIORITY,
  CollisionService
} from './utils/collision'

export type {
  CollisionType,
  CollisionSeverity,
  WaypointCollisionResult,
  PathCollisionResult,
  PolygonCollisionResult,
  RBushItem
} from './utils/collision'

// ============================================
// Utils - Mesh Code (JMA)
// ============================================
export {
  latLngToMeshCode,
  meshCodeToLatLng,
  meshCodeToBBox,
  getSurroundingMeshCodes,
  isValidMeshCode,
  getFirstLevelMeshCode,
  getSecondLevelMeshCode,
  MESH_LEVELS,
  MeshCodeService
} from './utils/meshCode'

// ============================================
// Services - Network Coverage
// ============================================
export {
  checkLTEAvailability,
  estimateSignalStrength,
  getNetworkCoverage,
  getSignalStrengthLabel,
  getSignalStrengthColor,
  generateLTECoverageGeoJSON,
  generate5GCoverageGeoJSON,
  NetworkCoverageService
} from './services/networkCoverage'
export type {
  SignalStrength,
  NetworkCoverageInfo,
  NetworkCoverageRequest
} from './services/networkCoverage'

// Function aliases for network coverage
export {
  generateLTECoverageGeoJSON as getLTECoverageGeoJSON,
  generate5GCoverageGeoJSON as get5GCoverageGeoJSON
} from './services/networkCoverage'

// ============================================
// Hooks - Operation Safety
// ============================================
export {
  useFlightWindow,
  useNetworkCoverage,
  useWeatherMesh,
  useCurrentWeatherForecast,
  classifyWindLevel,
  useOperationSafety,
  getSafetyLevelColor,
  getSafetyLevelText
} from './hooks'
export type {
  FlightWindowResult,
  NetworkCoverageResult,
  MeshWeatherForecast,
  MeshTimeSeriesData,
  WeatherMeshResult,
  WindLevel,
  SafetyLevel,
  SafetyReason,
  OperationSafetyResult
} from './hooks'
