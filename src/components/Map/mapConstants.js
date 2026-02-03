/**
 * Map Component Constants
 *
 * 地図コンポーネントで使用される定数定義
 */

export const CROSSHAIR_DESIGNS = [
  { id: 'square', label: '四角', icon: '□' },
  { id: 'circle', label: '円形', icon: '○' },
  { id: 'minimal', label: 'シンプル', icon: '+' }
]

export const CROSSHAIR_COLORS = [
  { id: '#e53935', label: '赤' },
  { id: '#1e88e5', label: '青' },
  { id: '#00bcd4', label: 'シアン' },
  { id: '#ffffff', label: '白' },
  { id: '#4caf50', label: '緑' }
]

export const COORDINATE_FORMATS = [
  { id: 'decimal', label: '10進数' },
  { id: 'dms', label: '60進数' }
]

// 地図スタイル定義
export const MAP_STYLES = {
  osm: {
    id: 'osm',
    name: 'OpenStreetMap',
    shortName: 'OSM',
    style: {
      version: 8,
      sources: {
        osm: {
          type: 'raster',
          tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '&copy; OpenStreetMap contributors',
          maxzoom: 19
        }
      },
      layers: [
        {
          id: 'osm',
          type: 'raster',
          source: 'osm',
          minzoom: 0,
          maxzoom: 22
        }
      ]
    }
  },
  gsi_std: {
    id: 'gsi_std',
    name: '国土地理院 標準',
    shortName: '標準',
    style: {
      version: 8,
      sources: {
        gsi: {
          type: 'raster',
          tiles: ['https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '&copy; 国土地理院',
          maxzoom: 18
        }
      },
      layers: [
        {
          id: 'gsi',
          type: 'raster',
          source: 'gsi',
          minzoom: 0,
          maxzoom: 22
        }
      ]
    }
  },
  gsi_photo: {
    id: 'gsi_photo',
    name: '国土地理院 航空写真',
    shortName: '航空写真',
    style: {
      version: 8,
      sources: {
        gsi_photo: {
          type: 'raster',
          tiles: ['https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg'],
          tileSize: 256,
          attribution: '&copy; 国土地理院',
          maxzoom: 18
        }
      },
      layers: [
        {
          id: 'gsi_photo',
          type: 'raster',
          source: 'gsi_photo',
          minzoom: 0,
          maxzoom: 22
        }
      ]
    }
  }
}

export const LAYER_COLORS = {
  PREFECTURE: '#ff6600',
  POLICE: '#0066ff',
  PRISON: '#666666',
  JSDF: '#00cc00',
  EMERGENCY_AIRSPACE: '#ff3333',
  REMOTE_ID: '#3366ff',
  MANNED_AIRCRAFT: '#ff1493',
  RADIO_INTERFERENCE: '#9933ff',
  LTE_COVERAGE: '#22c55e',
  FIVE_G_COVERAGE: '#3b82f6'
}
