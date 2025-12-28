/**
 * ドローン飛行制限区域データサービス
 *
 * 参考: 国土交通省 DIPS、国土地理院、航空法
 */

// 主要空港の制限区域（半径約9km = 進入表面等を含む概略）
export const AIRPORT_ZONES = [
  // 関東
  { name: '成田国際空港', lat: 35.7647, lng: 140.3864, radius: 9000, type: 'airport' },
  { name: '東京国際空港（羽田）', lat: 35.5494, lng: 139.7798, radius: 9000, type: 'airport' },
  { name: '調布飛行場', lat: 35.6717, lng: 139.5281, radius: 3000, type: 'airfield' },

  // 関西
  { name: '関西国際空港', lat: 34.4347, lng: 135.2441, radius: 9000, type: 'airport' },
  { name: '大阪国際空港（伊丹）', lat: 34.7855, lng: 135.4380, radius: 9000, type: 'airport' },
  { name: '神戸空港', lat: 34.6328, lng: 135.2239, radius: 6000, type: 'airport' },

  // 中部
  { name: '中部国際空港', lat: 34.8584, lng: 136.8124, radius: 9000, type: 'airport' },
  { name: '名古屋飛行場（小牧）', lat: 35.2551, lng: 136.9244, radius: 6000, type: 'airport' },

  // 北海道
  { name: '新千歳空港', lat: 42.7752, lng: 141.6924, radius: 9000, type: 'airport' },
  { name: '丘珠空港', lat: 43.1176, lng: 141.3816, radius: 3000, type: 'airfield' },
  { name: '旭川空港', lat: 43.6708, lng: 142.4475, radius: 6000, type: 'airport' },
  { name: '函館空港', lat: 41.7700, lng: 140.8219, radius: 6000, type: 'airport' },
  { name: '帯広空港', lat: 42.7333, lng: 143.2172, radius: 6000, type: 'airport' },
  { name: '釧路空港', lat: 43.0411, lng: 144.1928, radius: 6000, type: 'airport' },
  { name: 'たきかわスカイパーク', lat: 43.5467, lng: 141.9097, radius: 2000, type: 'airfield' },
  { name: '美唄農道離着陸場', lat: 43.3333, lng: 141.8500, radius: 1500, type: 'airfield' },

  // 九州
  { name: '福岡空港', lat: 33.5859, lng: 130.4510, radius: 9000, type: 'airport' },
  { name: '北九州空港', lat: 33.8459, lng: 131.0349, radius: 6000, type: 'airport' },
  { name: '長崎空港', lat: 32.9169, lng: 129.9136, radius: 6000, type: 'airport' },
  { name: '熊本空港', lat: 32.8373, lng: 130.8551, radius: 6000, type: 'airport' },
  { name: '鹿児島空港', lat: 31.8034, lng: 130.7195, radius: 6000, type: 'airport' },
  { name: '那覇空港', lat: 26.1958, lng: 127.6459, radius: 9000, type: 'airport' },

  // 東北
  { name: '仙台空港', lat: 38.1397, lng: 140.9170, radius: 6000, type: 'airport' },
  { name: '青森空港', lat: 40.7347, lng: 140.6908, radius: 6000, type: 'airport' },

  // その他主要空港
  { name: '広島空港', lat: 34.4361, lng: 132.9194, radius: 6000, type: 'airport' },
  { name: '岡山空港', lat: 34.7569, lng: 133.8553, radius: 6000, type: 'airport' },
  { name: '高松空港', lat: 34.2142, lng: 134.0156, radius: 6000, type: 'airport' },
  { name: '松山空港', lat: 33.8272, lng: 132.6997, radius: 6000, type: 'airport' },
  { name: '新潟空港', lat: 37.9559, lng: 139.1068, radius: 6000, type: 'airport' },
  { name: '富山空港', lat: 36.6483, lng: 137.1875, radius: 6000, type: 'airport' },
  { name: '小松空港', lat: 36.3946, lng: 136.4065, radius: 6000, type: 'airport' },
  { name: '静岡空港', lat: 34.7961, lng: 138.1894, radius: 6000, type: 'airport' },
]

// 飛行禁止区域（重要施設周辺）
export const NO_FLY_ZONES = [
  { name: '皇居', lat: 35.6852, lng: 139.7528, radius: 300, type: 'prohibited' },
  { name: '国会議事堂', lat: 35.6760, lng: 139.7450, radius: 300, type: 'prohibited' },
  { name: '首相官邸', lat: 35.6736, lng: 139.7500, radius: 300, type: 'prohibited' },
  { name: '最高裁判所', lat: 35.6797, lng: 139.7414, radius: 300, type: 'prohibited' },
  { name: '迎賓館', lat: 35.6803, lng: 139.7267, radius: 300, type: 'prohibited' },
  // 原子力発電所（代表例）
  { name: '福島第一原発', lat: 37.4211, lng: 141.0328, radius: 300, type: 'prohibited' },
  { name: '福島第二原発', lat: 37.3167, lng: 141.0250, radius: 300, type: 'prohibited' },
  { name: '柏崎刈羽原発', lat: 37.4286, lng: 138.5978, radius: 300, type: 'prohibited' },
]

// 国土地理院 DID (人口集中地区) タイルレイヤー
// 参照: https://www.gsi.go.jp/chizujoho/h27did.html
export const DID_TILE_URL = 'https://cyberjapandata.gsi.go.jp/xyz/did2015/{z}/{x}/{y}.geojson'

// DID区域の情報
export const DID_INFO = {
  description: '人口集中地区（DID）は国勢調査に基づく人口密度4,000人/km²以上の地域',
  source: '総務省統計局 平成27年国勢調査',
  tileUrl: DID_TILE_URL,
  attribution: '国土地理院',
  externalLinks: {
    gsi: 'https://www.gsi.go.jp/chizujoho/h27did.html',
    kokudo: 'https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-A16-v2_3.html',
    dips: 'https://www.ossportal.dips-reg.mlit.go.jp/portal/top'
  }
}

// DIDタイルソース設定（MapLibre用）
export const getDIDSourceConfig = () => ({
  type: 'vector',
  tiles: ['https://cyberjapandata.gsi.go.jp/xyz/did2015/{z}/{x}/{y}.pbf'],
  minzoom: 8,
  maxzoom: 16
})

// 空港制限区域をGeoJSON Feature Collectionに変換
export const getAirportZonesGeoJSON = () => {
  return {
    type: 'FeatureCollection',
    features: AIRPORT_ZONES.map(zone => createCircleFeature(zone, 64))
  }
}

// 飛行禁止区域をGeoJSON Feature Collectionに変換
export const getNoFlyZonesGeoJSON = () => {
  return {
    type: 'FeatureCollection',
    features: NO_FLY_ZONES.map(zone => createCircleFeature(zone, 32))
  }
}

// 円形のGeoJSON Polygonを生成
const createCircleFeature = (zone, points = 64) => {
  const coords = []
  const { lat, lng, radius } = zone

  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * 2 * Math.PI
    const dx = radius * Math.cos(angle)
    const dy = radius * Math.sin(angle)

    // メートルから度への変換（近似）
    const latOffset = dy / 111320
    const lngOffset = dx / (111320 * Math.cos(lat * Math.PI / 180))

    coords.push([lng + lngOffset, lat + latOffset])
  }

  return {
    type: 'Feature',
    properties: {
      name: zone.name,
      type: zone.type,
      radius: zone.radius
    },
    geometry: {
      type: 'Polygon',
      coordinates: [coords]
    }
  }
}

// Waypoint/ポリゴンが制限区域に入っているかチェック
export const checkAirspaceRestrictions = (lat, lng) => {
  const restrictions = []

  // 空港チェック
  for (const airport of AIRPORT_ZONES) {
    const distance = getDistanceMeters(lat, lng, airport.lat, airport.lng)
    if (distance < airport.radius) {
      restrictions.push({
        type: 'airport',
        name: airport.name,
        distance: Math.round(distance),
        radius: airport.radius,
        severity: 'high'
      })
    }
  }

  // 飛行禁止区域チェック
  for (const zone of NO_FLY_ZONES) {
    const distance = getDistanceMeters(lat, lng, zone.lat, zone.lng)
    if (distance < zone.radius) {
      restrictions.push({
        type: 'prohibited',
        name: zone.name,
        distance: Math.round(distance),
        radius: zone.radius,
        severity: 'critical'
      })
    }
  }

  return restrictions
}

// 2点間の距離を計算（メートル）
const getDistanceMeters = (lat1, lng1, lat2, lng2) => {
  const R = 6371000 // 地球の半径（メートル）
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// 外部サービスへのリンクを取得
export const getExternalMapLinks = (lat, lng) => {
  return {
    dips: `https://www.ossportal.dips-reg.mlit.go.jp/portal/top`,
    sorapass: `https://www.sorapass.com/map?lat=${lat}&lng=${lng}&zoom=14`,
    geospatial: `https://maps.gsi.go.jp/#15/${lat}/${lng}/`
  }
}
