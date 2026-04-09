/**
 * サンプルデータ（シードデータ）
 * アプリの機能を体験するためのポリゴンとウェイポイントのサンプル
 * 空港・DID制限エリアを避けて全国各地に分散配置
 *
 * external: true のポリゴンは他のドローンオペレーターの飛行計画を表す
 */

/**
 * 自分のサンプルポリゴンを生成
 */
const generateOwnPolygons = () => [
  {
    id: crypto.randomUUID(),
    name: '能登半島・珠洲岬',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [137.3250, 37.5050],
        [137.3320, 37.5050],
        [137.3320, 37.5000],
        [137.3250, 37.5000],
        [137.3250, 37.5050]
      ]]
    },
    color: '#45B7D1',
    createdAt: Date.now()
  },
  {
    id: crypto.randomUUID(),
    name: '北海道・美瑛の丘',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [142.4600, 43.5950],
        [142.4700, 43.5950],
        [142.4700, 43.5870],
        [142.4600, 43.5870],
        [142.4600, 43.5950]
      ]]
    },
    color: '#FF6B6B',
    createdAt: Date.now() - 1000
  },
  {
    id: crypto.randomUUID(),
    name: '千葉・九十九里浜',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [140.4350, 35.5100],
        [140.4450, 35.5100],
        [140.4450, 35.5030],
        [140.4400, 35.5000],
        [140.4350, 35.5030],
        [140.4350, 35.5100]
      ]]
    },
    color: '#4ECDC4',
    createdAt: Date.now() - 2000
  }
]

/**
 * 他のドローンオペレーターの飛行計画（外部ポリゴン）
 * 一部は自分のポリゴンと意図的に重なる配置
 */
const generateExternalPolygons = () => [
  {
    // 能登半島の自分のエリアと部分的に重なる
    id: crypto.randomUUID(),
    name: '[外部] 能登・測量A社',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [137.3280, 37.5070],
        [137.3370, 37.5070],
        [137.3370, 37.5020],
        [137.3280, 37.5020],
        [137.3280, 37.5070]
      ]]
    },
    color: '#FF8800',
    createdAt: Date.now() - 3000,
    external: true,
    operator: '測量A社'
  },
  {
    // 美瑛の自分のエリアと大きく重なる
    id: crypto.randomUUID(),
    name: '[外部] 美瑛・農業ドローンB',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [142.4580, 43.5930],
        [142.4680, 43.5930],
        [142.4680, 43.5860],
        [142.4580, 43.5860],
        [142.4580, 43.5930]
      ]]
    },
    color: '#FF8800',
    createdAt: Date.now() - 4000,
    external: true,
    operator: '農業ドローンB社'
  },
  {
    // 九十九里浜の近くだが重ならない（隣接）
    id: crypto.randomUUID(),
    name: '[外部] 九十九里・点検C社',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [140.4460, 35.5080],
        [140.4530, 35.5080],
        [140.4530, 35.5020],
        [140.4460, 35.5020],
        [140.4460, 35.5080]
      ]]
    },
    color: '#FF8800',
    createdAt: Date.now() - 5000,
    external: true,
    operator: '点検C社'
  }
]

/**
 * 全サンプルポリゴンを生成（自分 + 他者）
 */
export const generateExamplePolygons = () => [
  ...generateOwnPolygons(),
  ...generateExternalPolygons()
]

/**
 * ポリゴンからウェイポイントを生成（自分のポリゴンのみ）
 * 外部ポリゴンにはウェイポイントを生成しない
 */
export const generateExampleWaypoints = (polygons) => {
  const waypoints = []
  let globalIndex = 1

  for (const polygon of polygons) {
    // 外部ポリゴンはスキップ
    if (polygon.external) continue

    const coords = polygon.geometry.coordinates[0].slice(0, -1)
    for (let i = 0; i < coords.length; i++) {
      waypoints.push({
        id: crypto.randomUUID(),
        lat: coords[i][1],
        lng: coords[i][0],
        index: globalIndex++,
        vertexIndex: i,
        polygonId: polygon.id,
        polygonName: polygon.name,
        type: 'vertex'
      })
    }
  }

  return waypoints
}
