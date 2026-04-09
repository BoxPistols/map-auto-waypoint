/**
 * サンプルデータ（シードデータ）
 * アプリの機能を体験するためのポリゴンとウェイポイントのサンプル
 * 空港制限エリアを避けつつ、多様な競合パターンを含む
 *
 * external: true のポリゴンは他のドローンオペレーターの飛行計画を表す
 * flightInfo: 飛行詳細情報（時間帯・業務内容・機体情報など）
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
    createdAt: Date.now(),
    flightInfo: {
      date: '2026-04-15',
      timeStart: '09:00',
      timeEnd: '11:30',
      purpose: '海岸線インフラ点検',
      altitude: 80,
      aircraft: 'DJI Matrice 350 RTK',
      pilotName: '田中太郎'
    }
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
    createdAt: Date.now() - 1000,
    flightInfo: {
      date: '2026-04-16',
      timeStart: '06:00',
      timeEnd: '08:00',
      purpose: '農地空撮・オルソ画像作成',
      altitude: 60,
      aircraft: 'DJI Phantom 4 RTK',
      pilotName: '田中太郎'
    }
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
    createdAt: Date.now() - 2000,
    flightInfo: {
      date: '2026-04-17',
      timeStart: '13:00',
      timeEnd: '15:00',
      purpose: '海岸侵食調査',
      altitude: 50,
      aircraft: 'DJI Mavic 3 Enterprise',
      pilotName: '佐藤花子'
    }
  },
  {
    // DID抵触パターン: 金沢市中心部（人口密集地）
    id: crypto.randomUUID(),
    name: '金沢・兼六園周辺',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [136.6580, 36.5640],
        [136.6650, 36.5640],
        [136.6650, 36.5590],
        [136.6580, 36.5590],
        [136.6580, 36.5640]
      ]]
    },
    color: '#9B59B6',
    createdAt: Date.now() - 3000,
    flightInfo: {
      date: '2026-04-18',
      timeStart: '10:00',
      timeEnd: '12:00',
      purpose: '文化財空撮（DID地区・要許可）',
      altitude: 40,
      aircraft: 'DJI Mavic 3 Pro',
      pilotName: '田中太郎'
    }
  }
]

/**
 * 他のドローンオペレーターの飛行計画（外部ポリゴン）
 * 多様な競合パターン:
 *  1. 能登 - 部分的重なり + 時間帯重複
 *  2. 美瑛 - 大きな重なり + 時間帯ずれ
 *  3. 九十九里 - 隣接のみ（重ならない）
 *  4. 金沢 - DID地区で他者と重なる複合パターン
 *  5. 金沢 - 別のオペレーターもDID地区で競合
 */
const generateExternalPolygons = () => [
  {
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
    createdAt: Date.now() - 5000,
    external: true,
    operator: '測量A社',
    flightInfo: {
      date: '2026-04-15',
      timeStart: '10:00',
      timeEnd: '14:00',
      purpose: '海岸地形測量（公共測量）',
      altitude: 100,
      aircraft: 'DJI Matrice 300 RTK',
      pilotName: '山田一郎',
      dipsNumber: 'DIPS-2026-001234'
    }
  },
  {
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
    createdAt: Date.now() - 6000,
    external: true,
    operator: '農業ドローンB社',
    flightInfo: {
      date: '2026-04-16',
      timeStart: '14:00',
      timeEnd: '16:00',
      purpose: '農薬散布（無人航空機の農薬散布）',
      altitude: 5,
      aircraft: 'DJI AGRAS T40',
      pilotName: '鈴木次郎',
      dipsNumber: 'DIPS-2026-002345',
      notes: '農薬散布のため低空飛行。周辺への薬剤飛散に注意。'
    }
  },
  {
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
    createdAt: Date.now() - 7000,
    external: true,
    operator: '点検C社',
    flightInfo: {
      date: '2026-04-17',
      timeStart: '10:00',
      timeEnd: '12:00',
      purpose: '太陽光パネル点検',
      altitude: 30,
      aircraft: 'Skydio X10',
      pilotName: '高橋三郎',
      dipsNumber: 'DIPS-2026-003456'
    }
  },
  {
    // DID + 競合の複合パターン
    id: crypto.randomUUID(),
    name: '[外部] 金沢・撮影D社',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [136.6560, 36.5650],
        [136.6640, 36.5650],
        [136.6640, 36.5600],
        [136.6560, 36.5600],
        [136.6560, 36.5650]
      ]]
    },
    color: '#FF8800',
    createdAt: Date.now() - 8000,
    external: true,
    operator: '撮影D社',
    flightInfo: {
      date: '2026-04-18',
      timeStart: '09:00',
      timeEnd: '11:30',
      purpose: 'テレビ番組の空撮ロケ',
      altitude: 80,
      aircraft: 'Inspire 3',
      pilotName: '伊藤四郎',
      dipsNumber: 'DIPS-2026-004567',
      notes: 'TV局撮影クルー同行。地上スタッフ5名。'
    }
  },
  {
    // 同じ金沢エリアで別オペレーターも競合（3者競合パターン）
    id: crypto.randomUUID(),
    name: '[外部] 金沢・配送E社',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [136.6610, 36.5630],
        [136.6680, 36.5630],
        [136.6680, 36.5580],
        [136.6610, 36.5580],
        [136.6610, 36.5630]
      ]]
    },
    color: '#E74C3C',
    createdAt: Date.now() - 9000,
    external: true,
    operator: '配送E社',
    flightInfo: {
      date: '2026-04-18',
      timeStart: '10:30',
      timeEnd: '15:00',
      purpose: 'ドローン配送実証実験（Level4飛行）',
      altitude: 50,
      aircraft: 'Wingcopter 198',
      pilotName: '中村五郎',
      dipsNumber: 'DIPS-2026-005678',
      notes: 'Level4（有人地帯での目視外飛行）。補助者配置済。飛行経路は固定ルート。'
    }
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
