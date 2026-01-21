/**
 * Japan Drone Map Library - Type Definitions
 * DIDinJapan2026 プロジェクトを参考に作成
 */

import type { StyleSpecification } from 'maplibre-gl'

// ============================================
// Base Map Types
// ============================================

/**
 * Configuration for a base map layer
 */
export interface BaseMapConfig {
  /** Unique identifier for the base map */
  id: string
  /** Display name of the base map */
  name: string
  /** Short display name */
  shortName: string
  /** MapLibre GL style definition */
  style: StyleSpecification
}

/** Type for available base map selections */
export type BaseMapKey = 'osm' | 'gsi_std' | 'gsi_pale' | 'gsi_photo'

// ============================================
// Layer Types
// ============================================

/**
 * Configuration for a single geographic layer (prefecture DID data)
 */
export interface LayerConfig {
  /** Unique identifier for the layer */
  id: string
  /** Display name of the layer (prefecture name) */
  name: string
  /** Path to GeoJSON data file */
  path: string
  /** Hex color code for layer visualization */
  color: string
}

/**
 * Grouped collection of layers organized by region
 */
export interface LayerGroup {
  /** Region name (e.g., "関東", "近畿") */
  name: string
  /** Array of layers in this region */
  layers: LayerConfig[]
}

/**
 * Runtime state of a layer in the UI
 */
export interface LayerState {
  /** Layer identifier */
  id: string
  /** Whether the layer is currently visible on the map */
  visible: boolean
}

// ============================================
// Overlay Types
// ============================================

/**
 * Configuration for geographic/weather overlay layers
 */
export interface GeoOverlay {
  /** Unique identifier for the overlay */
  id: string
  /** Display name of the overlay */
  name: string
  /** Array of tile URLs or GeoJSON paths */
  tiles: string[]
  /** Opacity level (0-1) */
  opacity: number
  /** Category of overlay data */
  category: 'geo' | 'weather' | 'restriction'
  /** Minimum zoom level to display overlay */
  minZoom?: number
  /** Maximum zoom level to display overlay */
  maxZoom?: number
}

/**
 * Weather overlay configuration
 */
export interface WeatherOverlay {
  id: string
  name: string
  opacity: number
  dynamic: boolean
  /** Update interval in milliseconds */
  updateInterval?: number
}

// ============================================
// Restriction Zone Types (ドローン飛行制限区域)
// ============================================

export type RestrictionType =
  | 'airport'       // 空港等周辺空域
  | 'airfield'      // 飛行場
  | 'military'      // 自衛隊・米軍基地
  | 'did'           // 人口集中地区
  | 'emergency'     // 緊急用務空域
  | 'manned'        // 有人機発着エリア
  | 'manned_aircraft' // 有人機発着エリア（旧定義互換）
  | 'remote_id'     // リモートID特定区域
  | 'heliport'      // ヘリポート
  | 'hospital_heliport' // 病院ヘリポート
  | 'radio'         // 電波干渉区域
  | 'red'           // 小型無人機等飛行禁止法 レッドゾーン
  | 'yellow'        // 小型無人機等飛行禁止法 イエローゾーン

export type NoFlyZoneCategory =
  | 'imperial'      // 皇室施設
  | 'government'    // 政府施設
  | 'defense'       // 防衛施設
  | 'us_military'   // 在日米軍施設
  | 'nuclear'       // 原子力発電所
  | 'political'     // 政党本部
  | 'embassy'       // 外国公館

export interface RestrictionZone {
  id: string
  name: string
  type: RestrictionType
  color: string
  opacity: number
  /** GeoJSON path */
  path?: string
  /** Tile URL */
  tiles?: string[]
  description?: string
}

export interface RestrictionCategory {
  id: string
  name: string
  zones: RestrictionZone[]
}

// ============================================
// Airport Types
// ============================================

export type AirportType = 'international' | 'domestic' | 'military' | 'heliport'

export interface Airport {
  /** ICAO code or unique identifier */
  id: string
  /** Name of the airport/airfield (Japanese) */
  name: string
  /** English name (optional) */
  nameEn?: string
  /** Type of facility */
  type: AirportType
  /** Coordinates [lng, lat] */
  coordinates: [number, number]
  /** Restriction radius in kilometers */
  radiusKm: number
  /** Airport surfaces (制限表面) - optional */
  surfaces?: AirportSurface[]
}

export interface AirportSurface {
  type: 'horizontal' | 'conical' | 'approach' | 'transitional'
  heightLimit: number // meters
  geometry: GeoJSON.Geometry
}

/** @deprecated Use Airport with new structure */
export type LegacyAirportType = 'airport' | 'airfield' | 'military' | 'heliport'

/** @deprecated Use Airport with new structure */
export interface LegacyAirport {
  name: string
  lat: number
  lng: number
  radius: number
  type: LegacyAirportType
}

// ============================================
// No-Fly Zone Types
// ============================================

export type NoFlyZoneType = 'red' | 'yellow'

/** @deprecated Use NoFlyFacility with new structure */
export interface LegacyNoFlyZone {
  /** Name of the zone */
  name: string
  /** Latitude */
  lat: number
  /** Longitude */
  lng: number
  /** Restriction radius in meters */
  radius: number
  /** Zone type (red=prohibited, yellow=restricted) */
  type: NoFlyZoneType
  /** Category of facility */
  category: NoFlyZoneCategory
}

// ============================================
// Heliport Types
// ============================================

export type HeliportType = 'heliport' | 'hospital_heliport'

export interface Heliport {
  /** Name of the heliport */
  name: string
  /** Latitude */
  lat: number
  /** Longitude */
  lng: number
  /** Restriction radius in meters */
  radius: number
  /** Type of heliport */
  type: HeliportType
}

// ============================================
// UTM Zone Types
// ============================================

export interface EmergencyAirspace {
  /** Name of the zone */
  name: string
  /** Latitude */
  lat: number
  /** Longitude */
  lng: number
  /** Restriction radius in meters */
  radius: number
  /** Zone type */
  type: 'emergency'
  /** Whether the zone is currently active */
  active: boolean
}

export interface RemoteIdZone {
  /** Name of the zone */
  name: string
  /** Latitude */
  lat: number
  /** Longitude */
  lng: number
  /** Restriction radius in meters */
  radius: number
  /** Zone type */
  type: 'remote_id'
}

export interface MannedAircraftZone {
  /** Name of the zone */
  name: string
  /** Latitude */
  lat: number
  /** Longitude */
  lng: number
  /** Restriction radius in meters */
  radius: number
  /** Zone type */
  type: 'manned_aircraft'
}

export interface RadioInterferenceZone {
  /** Name of the zone */
  name: string
  /** Latitude */
  lat: number
  /** Longitude */
  lng: number
  /** Restriction radius in meters */
  radius: number
  /** Zone type */
  type: 'radio'
  /** Frequency type */
  frequency: string
}

// ============================================
// Weather Data Types
// ============================================

export interface WindData {
  /** Wind speed in m/s */
  speed: number
  /** Wind direction in degrees */
  direction: number
  /** Gust speed in m/s */
  gust?: number
}

export interface WeatherData {
  timestamp: number
  wind?: WindData
  /** Precipitation in mm/h */
  rain?: number
  /** Visibility in meters */
  visibility?: number
}

export interface RasterSourceConfig {
  type: 'raster'
  tiles: string[]
  tileSize: number
  minzoom?: number
  maxzoom?: number
  attribution?: string
}

// ============================================
// Map State Types
// ============================================

export interface MapCenter {
  lat: number
  lng: number
}

export interface MapState {
  center: MapCenter
  zoom: number
  pitch?: number
  bearing?: number
}

export interface LayerVisibility {
  is3D: boolean
  showDID: boolean
  showAirportZones: boolean
  showRedZones: boolean
  showYellowZones: boolean
  showHeliports: boolean
  showEmergencyAirspace: boolean
  showRemoteIdZones: boolean
  showMannedAircraftZones: boolean
  showGeoFeatures: boolean
  showRainCloud: boolean
  showWind: boolean
  showRadioZones: boolean
}

// ============================================
// Custom Layer Types
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

// ============================================
// Application Data Types (Polygon & Waypoint)
// ============================================

export interface PolygonData {
  id: string
  name: string
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon
  createdAt: number
  color: string
}

export type WaypointType = 'vertex' | 'perimeter' | 'grid'

export interface Waypoint {
  id: string
  /** Display index (1-based) */
  index: number
  lat: number
  lng: number
  /** Elevation in meters (from GSI API) */
  elevation?: number
  /** Flight altitude in meters AGL */
  altitude?: number
  /** Associated polygon ID */
  polygonId?: string
  /** Associated polygon name */
  polygonName?: string
  /** Waypoint generation type */
  type?: WaypointType
}

// ============================================
// GeoJSON Layer Config Types
// ============================================

export interface GeoJsonLayerStyle {
  fillColor: string
  fillOpacity: number
  lineColor: string
  lineWidth: number
  lineDasharray?: number[]
  labelColor: string
  labelSize: number
  labelField?: unknown[] // MapLibre expression
}

export interface GeoJsonLayerConfig {
  id: string
  show: boolean
  data: GeoJSON.FeatureCollection
  style: GeoJsonLayerStyle
}

// ============================================
// Optimized Route Types
// ============================================

export interface OptimizedRouteFlight {
  flightNumber: number
  waypoints: Waypoint[]
  distance: number
  duration: number
}

export interface OptimizedRoute {
  homePoint: MapCenter
  flights: OptimizedRouteFlight[]
  totalDistance: number
  totalDuration: number
}

// ============================================
// Recommended Waypoint Types (Optimization)
// ============================================

export interface RecommendedWaypoint {
  id: string
  index: number
  lat: number
  lng: number
  modified: boolean
  hasDID: boolean
  hasAirport: boolean
  hasProhibited: boolean
  issueTypes?: string[]
}

export interface WaypointIssueFlags {
  hasDID: boolean
  hasAirport: boolean
  hasProhibited: boolean
}

// ============================================
// Airspace Restriction Check Types
// ============================================

export type RestrictionSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface AirspaceRestriction {
  type: 'airport' | 'prohibited'
  name: string
  distance: number
  radius: number
  severity: RestrictionSeverity
}

// ============================================
// External Links Types
// ============================================

export interface ExternalMapLinks {
  dips: string
  sorapass: string
  geospatial: string
}

// ============================================
// DID Info Types
// ============================================

export interface DIDInfo {
  description: string
  source: string
  tileUrl: string
  attribution: string
  externalLinks: {
    gsi: string
    kokudo: string
    dips: string
  }
}

// ============================================
// Component Props Types
// ============================================

export interface MapProps {
  center?: MapCenter
  zoom?: number
  polygons?: PolygonData[]
  waypoints?: Waypoint[]
  customLayers?: CustomLayer[]
  visibleCustomLayerIds?: Set<string>
  recommendedWaypoints?: RecommendedWaypoint[] | null
  didHighlightedWaypointIndices?: Set<number> | null
  waypointIssueFlagsById?: Record<string, WaypointIssueFlags> | null
  highlightedWaypointIndex?: number | null
  optimizedRoute?: OptimizedRoute | null
  onHomePointMove?: (point: MapCenter) => void
  isMobile?: boolean
  onPolygonCreate?: (polygon: PolygonData) => void
  onPolygonUpdate?: (feature: GeoJSON.Feature) => void
  onPolygonDelete?: (id: string) => void
  onPolygonSelect?: (id: string) => void
  onPolygonEditComplete?: () => void
  onMapClick?: (point: MapCenter, event: unknown) => void
  onWaypointClick?: (waypoint: Waypoint) => void
  onWaypointDelete?: (id: string) => void
  onWaypointMove?: (id: string, lat: number, lng: number) => void
  onWaypointsBulkDelete?: (ids: string[]) => void
  onCustomLayerAdded?: (layer: CustomLayer) => void
  onCustomLayerRemoved?: (id: string) => void
  onCustomLayerToggle?: (id: string, visible: boolean) => void
  selectedPolygonId?: string | null
  editingPolygon?: PolygonData | null
  drawMode?: boolean
}

export interface DrawControlProps {
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  onCreate: (features: GeoJSON.Feature[]) => void
  onUpdate: (features: GeoJSON.Feature[]) => void
  onDelete: (features: GeoJSON.Feature[]) => void
  onEditComplete?: () => void
  active: boolean
  editingPolygon: PolygonData | null
}

export interface DrawControlRef {
  startDrawing: () => void
  stopDrawing: () => void
  deleteAll: () => void
  loadPolygon: (polygon: PolygonData) => void
  finishEditing: () => void
}

// ============================================
// Map Settings (LocalStorage)
// ============================================

export interface MapSettings extends LayerVisibility {
  mapStyleId: BaseMapKey
}

// ============================================
// Collision Detection Types (RBush)
// ============================================

export type CollisionType = 'DID' | 'AIRPORT' | 'RED_ZONE' | 'YELLOW_ZONE' | 'MILITARY' | 'PARK' | string

export type CollisionSeverity = 'DANGER' | 'WARNING' | 'SAFE'

export interface WaypointCollisionResult {
  isColliding: boolean
  collisionType: CollisionType | null
  areaName?: string
  severity: CollisionSeverity
  uiColor: string
  message: string
}

export interface PathCollisionResult {
  isColliding: boolean
  intersectionPoints: GeoJSON.Position[]
  severity: CollisionSeverity
  message: string
}

export interface PolygonCollisionResult {
  isColliding: boolean
  overlapArea: number
  overlapRatio: number
  severity: CollisionSeverity
  message: string
}

// ============================================
// No-Fly Zone Types (Updated)
// ============================================

// Note: DID data is based on 2020 (Reiwa 2) Census, but project targets 2026 regulations.

export interface NoFlyFacility {
  /** Unique identifier */
  id: string
  /** Name of the zone (Japanese) */
  name: string
  /** English name (optional) */
  nameEn?: string
  /** Zone type (red=prohibited, yellow=restricted) */
  type: NoFlyZoneType
  /** Coordinates [lng, lat] */
  coordinates: [number, number]
  /** Restriction radius in kilometers */
  radiusKm: number
  /** Category of facility */
  category: NoFlyZoneCategory
  /** Data source */
  source?: string
  /** Description */
  description?: string
}
