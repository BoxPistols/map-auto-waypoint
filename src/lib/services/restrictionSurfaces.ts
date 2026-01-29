/**
 * Restriction Surfaces Service (制限表面データサービス)
 *
 * 航空法に基づく制限表面（Restriction Surfaces）の表示機能
 *
 * データソース:
 * - 国土地理院 ベクトルタイル kokuarea
 * - https://maps.gsi.go.jp/xyz/kokuarea/{z}/{x}/{y}.geojson
 *
 * 制限表面の種類:
 * - 水平表面 (Horizontal Surface): 空港標点を中心とする円形の水平面
 * - 円錐表面 (Conical Surface): 水平表面の外縁から1:20勾配で上昇
 * - 進入表面 (Approach Surface): 着陸帯短辺の外側から滑走路方向に延びる傾斜面
 * - 転移表面 (Transitional Surface): 着陸帯の長辺と進入表面側辺から1:7勾配で上昇
 * - 延長進入表面 (Extended Approach Surface): 精密進入用の延長された進入表面
 * - 外側水平表面 (Outer Horizontal Surface): 大型空港用の外側水平制限
 *
 * @see https://www.mlit.go.jp/koku/koku_fr10_000041.html 航空法における制限表面
 */

/** 制限表面の種類 */
export type RestrictionSurfaceKind =
  | 'approach' // 進入表面
  | 'transitional' // 転移表面
  | 'horizontal' // 水平表面
  | 'conical' // 円錐表面
  | 'outer_horizontal' // 外側水平表面
  | 'extended_approach' // 延長進入表面
  | 'other' // その他

/** 制限表面フィーチャーのプロパティ */
export type RestrictionSurfaceProperties = Record<string, unknown> & {
  __surface_kind?: RestrictionSurfaceKind
  __surface_label?: string
  name?: string
}

export type RestrictionSurfaceFeature = GeoJSON.Feature<GeoJSON.Geometry, RestrictionSurfaceProperties>
export type TileRange = {
  z: number
  xMin: number
  xMax: number
  yMin: number
  yMax: number
  count: number
}

/** 制限表面のスタイル定義 */
export const RESTRICTION_SURFACE_STYLES: Record<
  RestrictionSurfaceKind,
  {
    fillColor: string
    lineColor: string
    fillOpacity: number
    lineWidth: number
    label: string
    labelEn: string
  }
> = {
  approach: {
    fillColor: '#4CAF50',
    lineColor: '#2E7D32',
    fillOpacity: 0.25,
    lineWidth: 1.2,
    label: '進入表面',
    labelEn: 'Approach Surface'
  },
  transitional: {
    fillColor: '#FFC107',
    lineColor: '#FF8F00',
    fillOpacity: 0.22,
    lineWidth: 1.1,
    label: '転移表面',
    labelEn: 'Transitional Surface'
  },
  horizontal: {
    fillColor: '#9C27B0',
    lineColor: '#6A1B9A',
    fillOpacity: 0.2,
    lineWidth: 1.1,
    label: '水平表面',
    labelEn: 'Horizontal Surface'
  },
  conical: {
    fillColor: '#7B1FA2',
    lineColor: '#4A148C',
    fillOpacity: 0.18,
    lineWidth: 1.0,
    label: '円錐表面',
    labelEn: 'Conical Surface'
  },
  outer_horizontal: {
    fillColor: '#E1BEE7',
    lineColor: '#9C27B0',
    fillOpacity: 0.15,
    lineWidth: 0.8,
    label: '外側水平表面',
    labelEn: 'Outer Horizontal Surface'
  },
  extended_approach: {
    fillColor: '#81C784',
    lineColor: '#388E3C',
    fillOpacity: 0.2,
    lineWidth: 1.0,
    label: '延長進入表面',
    labelEn: 'Extended Approach Surface'
  },
  other: {
    fillColor: '#90EE90',
    lineColor: '#2E7D32',
    fillOpacity: 0.15,
    lineWidth: 0.9,
    label: '空港周辺空域',
    labelEn: 'Airport Airspace'
  }
}

/** GSI kokuarea ベクトルタイルURL */
export const KOKUAREA_TILE_URL = 'https://maps.gsi.go.jp/xyz/kokuarea/{z}/{x}/{y}.geojson'
/** kokuarea は z=8 のみ提供 */
export const KOKUAREA_TILE_ZOOM = 8
/** kokuarea 取得用プロキシエンドポイント */
export const KOKUAREA_PROXY_ENDPOINT = '/api/kokuarea'
/** 1回の描画で取得する最大タイル数 */
export const KOKUAREA_MAX_TILES = 64

const MAX_TILE_CACHE = 200
const tileFeatureCache = new Map<string, RestrictionSurfaceFeature[]>()
const inflightTileRequests = new Map<string, Promise<RestrictionSurfaceFeature[]>>()

const shouldUseKokuareaProxy = (): boolean => {
  if (import.meta.env.DEV) return true
  if (import.meta.env.VITE_USE_KOKUAREA_PROXY === 'true') return true
  return import.meta.env.VITE_USE_PROXY_API === 'true'
}

/**
 * タイルURLをz/x/y座標で展開
 */
export function fillKokuareaTileUrl(template: string, z: number, x: number, y: number): string {
  return template.replace('{z}', String(z)).replace('{x}', String(x)).replace('{y}', String(y))
}

/**
 * kokuarea タイルURLを環境に応じて生成
 */
export function buildKokuareaTileUrl(z: number, x: number, y: number): string {
  if (shouldUseKokuareaProxy()) {
    const params = new URLSearchParams({
      z: String(z),
      x: String(x),
      y: String(y)
    })
    return `${KOKUAREA_PROXY_ENDPOINT}?${params.toString()}`
  }
  return fillKokuareaTileUrl(KOKUAREA_TILE_URL, z, x, y)
}

const getTileKey = (tile: { z: number; x: number; y: number }): string =>
  `${tile.z}/${tile.x}/${tile.y}`

const storeTileCache = (key: string, features: RestrictionSurfaceFeature[]): void => {
  if (!tileFeatureCache.has(key) && tileFeatureCache.size >= MAX_TILE_CACHE) {
    const oldestKey = tileFeatureCache.keys().next().value
    if (oldestKey) {
      tileFeatureCache.delete(oldestKey)
    }
  }
  tileFeatureCache.set(key, features)
}

const fetchRestrictionSurfaceTile = async (
  tile: { z: number; x: number; y: number }
): Promise<RestrictionSurfaceFeature[]> => {
  const key = getTileKey(tile)
  const cached = tileFeatureCache.get(key)
  if (cached) return cached

  const inflight = inflightTileRequests.get(key)
  if (inflight) return inflight

  const request = (async (): Promise<RestrictionSurfaceFeature[]> => {
    try {
      const url = buildKokuareaTileUrl(tile.z, tile.x, tile.y)
      const response = await fetch(url)
      if (!response.ok) return []

      const geojson = (await response.json()) as GeoJSON.FeatureCollection
      if (!geojson.features) return []

      return geojson.features.map((feature) => enrichRestrictionSurfaceFeature(feature))
    } catch {
      return []
    }
  })()

  inflightTileRequests.set(key, request)
  const features = await request
  inflightTileRequests.delete(key)
  storeTileCache(key, features)
  return features
}

/**
 * 経度からタイルX座標を計算
 */
function toTileX(lon: number, z: number): number {
  const n = 2 ** z
  return Math.floor(((lon + 180) / 360) * n)
}

/**
 * 緯度からタイルY座標を計算
 */
function toTileY(lat: number, z: number): number {
  const n = 2 ** z
  const latRad = (lat * Math.PI) / 180
  const y = (1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2
  return Math.floor(y * n)
}

/**
 * 表示範囲内のタイル範囲を取得
 */
export function getVisibleTileRange(
  bounds: { west: number; east: number; south: number; north: number },
  z: number
): TileRange {
  const xMin = toTileX(bounds.west, z)
  const xMax = toTileX(bounds.east, z)
  const yMin = toTileY(bounds.north, z)
  const yMax = toTileY(bounds.south, z)
  const count = (xMax - xMin + 1) * (yMax - yMin + 1)

  return { z, xMin, xMax, yMin, yMax, count }
}

/**
 * 表示範囲内のタイル座標一覧を取得
 */
export function getVisibleTileCoordinates(
  bounds: { west: number; east: number; south: number; north: number },
  z: number
): Array<{ z: number; x: number; y: number }> {
  const range = getVisibleTileRange(bounds, z)
  const tiles: Array<{ z: number; x: number; y: number }> = []
  for (let x = range.xMin; x <= range.xMax; x++) {
    for (let y = range.yMin; y <= range.yMax; y++) {
      tiles.push({ z, x, y })
    }
  }
  return tiles
}

/**
 * フィーチャーのプロパティから制限表面の種類を分類
 */
export function classifyRestrictionSurface(props: Record<string, unknown>): {
  kind: RestrictionSurfaceKind
  label: string
  labelEn: string
} {
  const name = typeof props.name === 'string' ? props.name : ''
  const allValues = [name, ...Object.values(props).filter((v) => typeof v === 'string')].join(' ')

  const has = (needle: string): boolean => allValues.includes(needle)
  const hasI = (needle: string): boolean => allValues.toLowerCase().includes(needle.toLowerCase())

  // 延長進入表面（進入表面より先に判定）
  if (has('延長進入表面') || hasI('extended approach')) {
    const style = RESTRICTION_SURFACE_STYLES.extended_approach
    return { kind: 'extended_approach', label: style.label, labelEn: style.labelEn }
  }

  // 進入表面
  if (has('進入表面') || hasI('approach')) {
    const style = RESTRICTION_SURFACE_STYLES.approach
    return { kind: 'approach', label: style.label, labelEn: style.labelEn }
  }

  // 転移表面
  if (has('転移表面') || hasI('transitional')) {
    const style = RESTRICTION_SURFACE_STYLES.transitional
    return { kind: 'transitional', label: style.label, labelEn: style.labelEn }
  }

  // 外側水平表面（水平表面より先に判定）
  if (has('外側水平表面') || hasI('outer horizontal')) {
    const style = RESTRICTION_SURFACE_STYLES.outer_horizontal
    return { kind: 'outer_horizontal', label: style.label, labelEn: style.labelEn }
  }

  // 水平表面
  if (has('水平表面') || hasI('horizontal')) {
    const style = RESTRICTION_SURFACE_STYLES.horizontal
    return { kind: 'horizontal', label: style.label, labelEn: style.labelEn }
  }

  // 円錐表面
  if (has('円錐表面') || hasI('conical')) {
    const style = RESTRICTION_SURFACE_STYLES.conical
    return { kind: 'conical', label: style.label, labelEn: style.labelEn }
  }

  // その他
  const style = RESTRICTION_SURFACE_STYLES.other
  return { kind: 'other', label: style.label, labelEn: style.labelEn }
}

/**
 * GeoJSONフィーチャーに制限表面の分類情報を付与
 */
export function enrichRestrictionSurfaceFeature(
  feature: GeoJSON.Feature
): GeoJSON.Feature<GeoJSON.Geometry, RestrictionSurfaceProperties> {
  const props = (feature.properties || {}) as Record<string, unknown>
  const classification = classifyRestrictionSurface(props)
  const style = RESTRICTION_SURFACE_STYLES[classification.kind]

  return {
    ...feature,
    properties: {
      ...props,
      __surface_kind: classification.kind,
      __surface_label: classification.label,
      __fill_color: style.fillColor,
      __line_color: style.lineColor,
      __fill_opacity: style.fillOpacity,
      __line_width: style.lineWidth
    }
  } as GeoJSON.Feature<GeoJSON.Geometry, RestrictionSurfaceProperties>
}

/**
 * 複数のタイルからGeoJSONを取得してマージ
 */
export async function fetchRestrictionSurfaceTiles(
  bounds: { west: number; east: number; south: number; north: number },
  zoom: number = 10
): Promise<GeoJSON.FeatureCollection> {
  // kokuarea は z=8 のみ提供されるため固定
  const z = KOKUAREA_TILE_ZOOM
  const range = getVisibleTileRange(bounds, z)
  if (range.count > KOKUAREA_MAX_TILES) {
    return {
      type: 'FeatureCollection',
      features: []
    }
  }

  const tiles: Array<{ z: number; x: number; y: number }> = []
  for (let x = range.xMin; x <= range.xMax; x++) {
    for (let y = range.yMin; y <= range.yMax; y++) {
      tiles.push({ z, x, y })
    }
  }

  const tileFeatureGroups = await Promise.all(
    tiles.map((tile) => fetchRestrictionSurfaceTile(tile))
  )

  const features: RestrictionSurfaceFeature[] = []
  for (const tileFeatures of tileFeatureGroups) {
    if (tileFeatures.length > 0) {
      features.push(...tileFeatures)
    }
  }

  return {
    type: 'FeatureCollection',
    features
  }
}

/**
 * MapLibre用のレイヤースタイル設定を取得
 */
export function getRestrictionSurfaceLayerStyles(): {
  fillPaint: Record<string, unknown>
  linePaint: Record<string, unknown>
} {
  return {
    fillPaint: {
      'fill-color': ['coalesce', ['get', '__fill_color'], RESTRICTION_SURFACE_STYLES.other.fillColor],
      'fill-opacity': [
        'coalesce',
        ['get', '__fill_opacity'],
        RESTRICTION_SURFACE_STYLES.other.fillOpacity
      ]
    },
    linePaint: {
      'line-color': ['coalesce', ['get', '__line_color'], RESTRICTION_SURFACE_STYLES.other.lineColor],
      'line-width': ['coalesce', ['get', '__line_width'], RESTRICTION_SURFACE_STYLES.other.lineWidth]
    }
  }
}

/**
 * 座標を含むタイルを取得
 */
function getTileForPoint(lat: number, lng: number, z: number): { z: number; x: number; y: number } {
  return {
    z,
    x: toTileX(lng, z),
    y: toTileY(lat, z)
  }
}

/**
 * 点が制限表面ポリゴン内にあるかチェック
 * @param lat 緯度
 * @param lng 経度
 * @returns 制限表面内の場合はその情報、そうでなければnull
 */
export async function checkPointInRestrictionSurface(
  lat: number,
  lng: number
): Promise<{
  isInRestrictionSurface: boolean
  surfaceKind?: RestrictionSurfaceKind
  surfaceLabel?: string
  surfaceLabelEn?: string
} | null> {
  try {
    // 対象タイルを取得（kokuareaはz=8固定）
    const tile = getTileForPoint(lat, lng, KOKUAREA_TILE_ZOOM)
    const features = await fetchRestrictionSurfaceTile(tile)

    if (features.length === 0) {
      return { isInRestrictionSurface: false }
    }

    // Turf.jsでpoint-in-polygon判定
    const point: GeoJSON.Feature<GeoJSON.Point> = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Point',
        coordinates: [lng, lat]
      }
    }

    for (const feature of features) {
      if (!feature.geometry) continue

      // Polygon または MultiPolygon の場合のみチェック
      if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
        // 動的インポートを避けるため、シンプルなpoint-in-polygon実装
        const isInside = isPointInFeature(point.geometry.coordinates, feature.geometry)

        if (isInside) {
          const kind = feature.properties?.__surface_kind || 'other'
          const style = RESTRICTION_SURFACE_STYLES[kind]
          return {
            isInRestrictionSurface: true,
            surfaceKind: kind,
            surfaceLabel: style.label,
            surfaceLabelEn: style.labelEn
          }
        }
      }
    }

    return { isInRestrictionSurface: false }
  } catch (error) {
    console.warn('[RestrictionSurface] checkPointInRestrictionSurface error:', error)
    return null // エラー時はnull（フォールバック処理を促す）
  }
}

/**
 * シンプルなpoint-in-polygon判定（ray casting algorithm）
 */
function isPointInFeature(
  point: [number, number],
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon
): boolean {
  if (geometry.type === 'Polygon') {
    return isPointInPolygon(point, geometry.coordinates)
  } else if (geometry.type === 'MultiPolygon') {
    for (const polygon of geometry.coordinates) {
      if (isPointInPolygon(point, polygon)) {
        return true
      }
    }
  }
  return false
}

/**
 * Ray casting algorithm for point in polygon
 */
function isPointInPolygon(
  point: [number, number],
  coordinates: GeoJSON.Position[][]
): boolean {
  const [x, y] = point

  // 外周リングをチェック
  const outerRing = coordinates[0]
  if (!isPointInRing(x, y, outerRing)) {
    return false
  }

  // 内周リング（穴）をチェック - 穴の中にあれば外
  for (let i = 1; i < coordinates.length; i++) {
    if (isPointInRing(x, y, coordinates[i])) {
      return false
    }
  }

  return true
}

/**
 * Ray casting for a single ring
 */
function isPointInRing(x: number, y: number, ring: GeoJSON.Position[]): boolean {
  let inside = false
  const n = ring.length

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = ring[i][0]
    const yi = ring[i][1]
    const xj = ring[j][0]
    const yj = ring[j][1]

    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }

  return inside
}

/**
 * 複数の座標点を一括で制限表面判定
 * @param points 座標点の配列 [{lat, lng, id}]
 * @returns 各点の判定結果のMap
 */
export async function checkPointsInRestrictionSurfaces(
  points: Array<{ lat: number; lng: number; id: string }>
): Promise<
  Map<
    string,
    {
      isInRestrictionSurface: boolean
      surfaceKind?: RestrictionSurfaceKind
      surfaceLabel?: string
    }
  >
> {
  const results = new Map<
    string,
    {
      isInRestrictionSurface: boolean
      surfaceKind?: RestrictionSurfaceKind
      surfaceLabel?: string
    }
  >()

  if (points.length === 0) {
    return results
  }

  // 必要なタイルを特定
  const tilesNeeded = new Set<string>()
  const pointTileMap = new Map<string, { z: number; x: number; y: number }>()

  for (const point of points) {
    const tile = getTileForPoint(point.lat, point.lng, KOKUAREA_TILE_ZOOM)
    const tileKey = `${tile.z}/${tile.x}/${tile.y}`
    tilesNeeded.add(tileKey)
    pointTileMap.set(point.id, tile)
  }

  // タイルを一括フェッチ
  const tilePromises = Array.from(tilesNeeded).map(async (tileKey) => {
    const [z, x, y] = tileKey.split('/').map(Number)
    const features = await fetchRestrictionSurfaceTile({ z, x, y })
    return { tileKey, features }
  })

  const tileResults = await Promise.all(tilePromises)
  const tileFeatureMap = new Map<string, RestrictionSurfaceFeature[]>()
  for (const { tileKey, features } of tileResults) {
    tileFeatureMap.set(tileKey, features)
  }

  // 各点を判定
  for (const point of points) {
    const tile = pointTileMap.get(point.id)!
    const tileKey = `${tile.z}/${tile.x}/${tile.y}`
    const features = tileFeatureMap.get(tileKey) || []

    let found = false
    for (const feature of features) {
      if (!feature.geometry) continue

      if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
        const isInside = isPointInFeature([point.lng, point.lat], feature.geometry)

        if (isInside) {
          const kind = feature.properties?.__surface_kind || 'other'
          const style = RESTRICTION_SURFACE_STYLES[kind]
          results.set(point.id, {
            isInRestrictionSurface: true,
            surfaceKind: kind,
            surfaceLabel: style.label
          })
          found = true
          break
        }
      }
    }

    if (!found) {
      results.set(point.id, { isInRestrictionSurface: false })
    }
  }

  return results
}

export const RestrictionSurfaceService = {
  TILE_URL: KOKUAREA_TILE_URL,
  PROXY_ENDPOINT: KOKUAREA_PROXY_ENDPOINT,
  MAX_TILES: KOKUAREA_MAX_TILES,
  STYLES: RESTRICTION_SURFACE_STYLES,
  fillTileUrl: fillKokuareaTileUrl,
  buildTileUrl: buildKokuareaTileUrl,
  getVisibleTileRange,
  getVisibleTiles: getVisibleTileCoordinates,
  classify: classifyRestrictionSurface,
  enrichFeature: enrichRestrictionSurfaceFeature,
  fetchTiles: fetchRestrictionSurfaceTiles,
  getLayerStyles: getRestrictionSurfaceLayerStyles,
  checkPoint: checkPointInRestrictionSurface,
  checkPoints: checkPointsInRestrictionSurfaces
}
