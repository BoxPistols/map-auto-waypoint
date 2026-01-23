/**
 * No-Fly Zone Data Service
 * 小型無人機等飛行禁止法の対象施設
 *
 * データソース:
 * - 警察庁「小型無人機等飛行禁止法に基づく対象施設」
 *   https://www.npa.go.jp/bureau/security/kogatamujinki/index.html
 * - 国土交通省「無人航空機の飛行禁止空域」
 *   https://www.mlit.go.jp/koku/koku_tk10_000003.html
 * - DIDinJapan2026プロジェクト
 *
 * 注意事項:
 * - 座標・半径は参考値であり、正確な禁止区域は公式情報で確認してください
 * - レッドゾーン: 施設上空は完全飛行禁止
 * - イエローゾーン: 周辺300m、事前通報・許可が必要
 */

import { createCirclePolygon, calculateDistance } from '../utils/geo'

// ============================================
// Type Definitions
// ============================================

export type FacilityType =
  | 'government'      // 政府機関
  | 'imperial'        // 皇室関連
  | 'nuclear'         // 原子力施設
  | 'defense'         // 防衛施設
  | 'foreign_mission' // 外国公館
  | 'prefecture'      // 都道府県庁
  | 'police'          // 警察施設
  | 'prison'          // 刑務所・拘置所
  | 'military_jsdf'   // 自衛隊施設
  | 'energy'          // エネルギー施設
  | 'water'           // ダム・浄水場
  | 'infrastructure'  // その他重要インフラ
  | 'airport'         // 空港（後方互換）

export type OperationalStatus =
  | 'operational'      // 運転中
  | 'stopped'          // 停止中
  | 'decommissioning'  // 廃炉作業中
  | 'decommissioned'   // 廃炉完了
  | 'planned'          // 計画中

export interface NoFlyFacility {
  id: string
  name: string
  nameEn?: string
  type: FacilityType
  coordinates: [number, number] // [lng, lat]
  radiusKm: number
  zone: 'red' | 'yellow'
  category?: string
  source?: string
  // 原子力発電所固有の情報
  operationalStatus?: OperationalStatus
  reactorCount?: number
  capacity?: string
  operator?: string
  // 施設の詳細情報
  address?: string
  description?: string
  established?: string
  lastUpdated?: string
}

// ============================================
// No-Fly Zone Data (486+ facilities)
// ============================================

/**
 * 小型無人機等飛行禁止法の対象施設
 */
export const NO_FLY_FACILITIES: NoFlyFacility[] = [
  // ============================================
  // 国の重要施設（レッドゾーン）
  // ============================================
  {
    id: 'diet',
    name: '国会議事堂',
    nameEn: 'National Diet Building',
    type: 'government',
    coordinates: [139.745, 35.6759],
    radiusKm: 0.2,
    zone: 'red'
  },
  {
    id: 'kantei',
    name: '首相官邸',
    nameEn: "Prime Minister's Official Residence",
    type: 'government',
    coordinates: [139.7412, 35.6731],
    radiusKm: 0.2,
    zone: 'red'
  },
  {
    id: 'supreme-court',
    name: '最高裁判所',
    nameEn: 'Supreme Court of Japan',
    type: 'government',
    coordinates: [139.7424, 35.6795],
    radiusKm: 0.2,
    zone: 'red'
  },
  {
    id: 'imperial-palace',
    name: '皇居',
    nameEn: 'Imperial Palace',
    type: 'imperial',
    coordinates: [139.7528, 35.6852],
    radiusKm: 0.2,
    zone: 'red'
  },
  {
    id: 'akasaka-palace',
    name: '赤坂御所',
    nameEn: 'Akasaka Palace',
    type: 'imperial',
    coordinates: [139.731, 35.6753],
    radiusKm: 0.2,
    zone: 'red'
  },
  {
    id: 'togu-palace',
    name: '東宮御所',
    nameEn: 'Togu Palace',
    type: 'imperial',
    coordinates: [139.727, 35.6763],
    radiusKm: 0.2,
    zone: 'red'
  },
  {
    id: 'geihinkan',
    name: '迎賓館赤坂離宮',
    nameEn: 'State Guest House Akasaka Palace',
    type: 'imperial',
    coordinates: [139.7267, 35.6803],
    radiusKm: 0.2,
    zone: 'red'
  },

  // ============================================
  // 危機管理行政機関（レッドゾーン）
  // ============================================
  {
    id: 'mlit',
    name: '国土交通省',
    nameEn: 'Ministry of Land, Infrastructure, Transport and Tourism',
    type: 'government',
    coordinates: [139.7501, 35.6746],
    radiusKm: 0.2,
    zone: 'red'
  },
  {
    id: 'npa',
    name: '警察庁',
    nameEn: 'National Police Agency',
    type: 'government',
    coordinates: [139.75, 35.6773],
    radiusKm: 0.2,
    zone: 'red'
  },
  {
    id: 'mod',
    name: '防衛省',
    nameEn: 'Ministry of Defense',
    type: 'defense',
    coordinates: [139.7285, 35.6933],
    radiusKm: 0.2,
    zone: 'red'
  },

  // ============================================
  // 原子力発電所（レッドゾーン）
  // ============================================
  // ===== 北海道電力 =====
  {
    id: 'tomari',
    name: '泊発電所',
    nameEn: 'Tomari Nuclear Power Plant',
    type: 'nuclear',
    coordinates: [140.5136, 43.0339],
    radiusKm: 0.2,
    zone: 'red',
    category: '原子力発電所',
    source: '北海道電力',
    operator: '北海道電力',
    operationalStatus: 'stopped',
    reactorCount: 3,
    capacity: '207.9万kW'
  },
  // ===== 東北電力 =====
  {
    id: 'higashidori',
    name: '東通原子力発電所',
    nameEn: 'Higashidori Nuclear Power Plant',
    type: 'nuclear',
    coordinates: [141.3861, 41.1861],
    radiusKm: 0.2,
    zone: 'red',
    category: '原子力発電所',
    source: '東北電力',
    operator: '東北電力',
    operationalStatus: 'stopped',
    reactorCount: 1,
    capacity: '110万kW'
  },
  {
    id: 'onagawa',
    name: '女川原子力発電所',
    nameEn: 'Onagawa Nuclear Power Plant',
    type: 'nuclear',
    coordinates: [141.5003, 38.4019],
    radiusKm: 0.2,
    zone: 'red',
    category: '原子力発電所',
    source: '東北電力',
    operator: '東北電力',
    operationalStatus: 'operational',
    reactorCount: 3,
    capacity: '217.4万kW'
  },
  // ===== 東京電力 =====
  {
    id: 'fukushima-daiichi',
    name: '福島第一原子力発電所',
    nameEn: 'Fukushima Daiichi Nuclear Power Plant',
    type: 'nuclear',
    coordinates: [141.0328, 37.4211],
    radiusKm: 0.2,
    zone: 'red',
    category: '原子力発電所',
    source: '東京電力',
    operator: '東京電力',
    operationalStatus: 'decommissioning',
    reactorCount: 6,
    capacity: '469.6万kW'
  },
  {
    id: 'fukushima-daini',
    name: '福島第二原子力発電所',
    nameEn: 'Fukushima Daini Nuclear Power Plant',
    type: 'nuclear',
    coordinates: [141.025, 37.3167],
    radiusKm: 0.2,
    zone: 'red',
    category: '原子力発電所',
    source: '東京電力',
    operator: '東京電力',
    operationalStatus: 'decommissioning',
    reactorCount: 4,
    capacity: '440万kW'
  },
  {
    id: 'kashiwazaki-kariwa',
    name: '柏崎刈羽原子力発電所',
    nameEn: 'Kashiwazaki-Kariwa Nuclear Power Plant',
    type: 'nuclear',
    coordinates: [138.5978, 37.4286],
    radiusKm: 0.2,
    zone: 'red',
    category: '原子力発電所',
    source: '東京電力',
    operator: '東京電力',
    operationalStatus: 'stopped',
    reactorCount: 7,
    capacity: '821.2万kW'
  },
  // ===== 日本原子力発電 =====
  {
    id: 'tokai-daini',
    name: '東海第二発電所',
    nameEn: 'Tokai Daini Nuclear Power Plant',
    type: 'nuclear',
    coordinates: [140.6072, 36.4664],
    radiusKm: 0.2,
    zone: 'red',
    category: '原子力発電所',
    source: '日本原子力発電',
    operator: '日本原子力発電',
    operationalStatus: 'stopped',
    reactorCount: 1,
    capacity: '110万kW'
  },
  {
    id: 'tsuruga',
    name: '敦賀発電所',
    nameEn: 'Tsuruga Nuclear Power Plant',
    type: 'nuclear',
    coordinates: [136.0186, 35.7514],
    radiusKm: 0.2,
    zone: 'red',
    category: '原子力発電所',
    source: '日本原子力発電',
    operator: '日本原子力発電',
    operationalStatus: 'stopped',
    reactorCount: 2,
    capacity: '151.8万kW'
  },
  // ===== 中部電力 =====
  {
    id: 'hamaoka',
    name: '浜岡原子力発電所',
    nameEn: 'Hamaoka Nuclear Power Plant',
    type: 'nuclear',
    coordinates: [138.1428, 34.6219],
    radiusKm: 0.2,
    zone: 'red',
    category: '原子力発電所',
    source: '中部電力',
    operator: '中部電力',
    operationalStatus: 'stopped',
    reactorCount: 5,
    capacity: '361.7万kW'
  },
  // ===== 北陸電力 =====
  {
    id: 'shika',
    name: '志賀原子力発電所',
    nameEn: 'Shika Nuclear Power Plant',
    type: 'nuclear',
    coordinates: [136.7289, 37.06],
    radiusKm: 0.2,
    zone: 'red',
    category: '原子力発電所',
    source: '北陸電力',
    operator: '北陸電力',
    operationalStatus: 'stopped',
    reactorCount: 2,
    capacity: '174.6万kW'
  },
  // ===== 関西電力 =====
  {
    id: 'mihama',
    name: '美浜発電所',
    nameEn: 'Mihama Nuclear Power Plant',
    type: 'nuclear',
    coordinates: [135.9581, 35.7017],
    radiusKm: 0.2,
    zone: 'red',
    category: '原子力発電所',
    source: '関西電力',
    operator: '関西電力',
    operationalStatus: 'operational',
    reactorCount: 3,
    capacity: '166.6万kW'
  },
  {
    id: 'ohi',
    name: '大飯発電所',
    nameEn: 'Ohi Nuclear Power Plant',
    type: 'nuclear',
    coordinates: [135.6561, 35.5422],
    radiusKm: 0.2,
    zone: 'red',
    category: '原子力発電所',
    source: '関西電力',
    operator: '関西電力',
    operationalStatus: 'operational',
    reactorCount: 4,
    capacity: '471万kW'
  },
  {
    id: 'takahama',
    name: '高浜発電所',
    nameEn: 'Takahama Nuclear Power Plant',
    type: 'nuclear',
    coordinates: [135.505, 35.5203],
    radiusKm: 0.2,
    zone: 'red',
    category: '原子力発電所',
    source: '関西電力',
    operator: '関西電力',
    operationalStatus: 'operational',
    reactorCount: 4,
    capacity: '339.2万kW'
  },
  // ===== 中国電力 =====
  {
    id: 'shimane',
    name: '島根原子力発電所',
    nameEn: 'Shimane Nuclear Power Plant',
    type: 'nuclear',
    coordinates: [132.9992, 35.5386],
    radiusKm: 0.2,
    zone: 'red',
    category: '原子力発電所',
    source: '中国電力',
    operator: '中国電力',
    operationalStatus: 'stopped',
    reactorCount: 3,
    capacity: '282万kW'
  },
  // ===== 四国電力 =====
  {
    id: 'ikata',
    name: '伊方発電所',
    nameEn: 'Ikata Nuclear Power Plant',
    type: 'nuclear',
    coordinates: [132.3094, 33.4903],
    radiusKm: 0.2,
    zone: 'red',
    category: '原子力発電所',
    source: '四国電力',
    operator: '四国電力',
    operationalStatus: 'operational',
    reactorCount: 3,
    capacity: '202万kW'
  },
  // ===== 九州電力 =====
  {
    id: 'genkai',
    name: '玄海原子力発電所',
    nameEn: 'Genkai Nuclear Power Plant',
    type: 'nuclear',
    coordinates: [129.8369, 33.5153],
    radiusKm: 0.2,
    zone: 'red',
    category: '原子力発電所',
    source: '九州電力',
    operator: '九州電力',
    operationalStatus: 'operational',
    reactorCount: 4,
    capacity: '349万kW'
  },
  {
    id: 'sendai-npp',
    name: '川内原子力発電所',
    nameEn: 'Sendai Nuclear Power Plant',
    type: 'nuclear',
    coordinates: [130.1894, 31.8339],
    radiusKm: 0.2,
    zone: 'red',
    category: '原子力発電所',
    source: '九州電力',
    operator: '九州電力',
    operationalStatus: 'operational',
    reactorCount: 2,
    capacity: '178万kW'
  },

  // ============================================
  // 在日米軍施設（レッドゾーン）
  // ============================================
  {
    id: 'yokota-ab',
    name: '横田基地',
    nameEn: 'Yokota Air Base',
    type: 'defense',
    coordinates: [139.3486, 35.7483],
    radiusKm: 0.2,
    zone: 'red',
    category: '在日米軍',
    source: '警察庁'
  },
  {
    id: 'atsugi-naf',
    name: '厚木基地',
    nameEn: 'Naval Air Facility Atsugi',
    type: 'defense',
    coordinates: [139.45, 35.4547],
    radiusKm: 0.2,
    zone: 'red',
    category: '在日米軍',
    source: '警察庁'
  },
  {
    id: 'yokosuka-nb',
    name: '横須賀基地',
    nameEn: 'U.S. Fleet Activities Yokosuka',
    type: 'defense',
    coordinates: [139.6667, 35.2833],
    radiusKm: 0.2,
    zone: 'red',
    category: '在日米軍',
    source: '警察庁'
  },
  {
    id: 'zama-camp',
    name: '座間キャンプ',
    nameEn: 'Camp Zama',
    type: 'defense',
    coordinates: [139.4, 35.4833],
    radiusKm: 0.2,
    zone: 'red',
    category: '在日米軍',
    source: '警察庁'
  },
  {
    id: 'kadena-ab',
    name: '嘉手納基地',
    nameEn: 'Kadena Air Base',
    type: 'defense',
    coordinates: [127.7683, 26.3517],
    radiusKm: 0.2,
    zone: 'red',
    category: '在日米軍',
    source: '警察庁'
  },
  {
    id: 'futenma-mcas',
    name: '普天間基地',
    nameEn: 'MCAS Futenma',
    type: 'defense',
    coordinates: [127.7558, 26.2744],
    radiusKm: 0.2,
    zone: 'red',
    category: '在日米軍',
    source: '警察庁'
  },
  {
    id: 'misawa-ab-us',
    name: '三沢基地（米軍）',
    nameEn: 'Misawa Air Base (USAF)',
    type: 'defense',
    coordinates: [141.3686, 40.7033],
    radiusKm: 0.2,
    zone: 'red',
    category: '在日米軍',
    source: '警察庁'
  },
  {
    id: 'iwakuni-mcas',
    name: '岩国基地',
    nameEn: 'MCAS Iwakuni',
    type: 'defense',
    coordinates: [132.2361, 34.1456],
    radiusKm: 0.2,
    zone: 'red',
    category: '在日米軍',
    source: '警察庁'
  },
  {
    id: 'sasebo-nfj',
    name: '佐世保基地',
    nameEn: 'U.S. Fleet Activities Sasebo',
    type: 'defense',
    coordinates: [129.7167, 33.15],
    radiusKm: 0.2,
    zone: 'red',
    category: '在日米軍',
    source: '警察庁'
  },

  // ============================================
  // イエローゾーン（外国公館等）
  // ============================================
  {
    id: 'us-embassy',
    name: 'アメリカ大使館',
    nameEn: 'Embassy of the United States',
    type: 'foreign_mission',
    coordinates: [139.7425, 35.6678],
    radiusKm: 0.3,
    zone: 'yellow'
  },
  {
    id: 'china-embassy',
    name: '中国大使館',
    nameEn: 'Embassy of China',
    type: 'foreign_mission',
    coordinates: [139.7353, 35.6558],
    radiusKm: 0.3,
    zone: 'yellow'
  },
  {
    id: 'russia-embassy',
    name: 'ロシア大使館',
    nameEn: 'Embassy of Russia',
    type: 'foreign_mission',
    coordinates: [139.7439, 35.663],
    radiusKm: 0.3,
    zone: 'yellow'
  },
  {
    id: 'korea-embassy',
    name: '韓国大使館',
    nameEn: 'Embassy of the Republic of Korea',
    type: 'foreign_mission',
    coordinates: [139.7297, 35.6611],
    radiusKm: 0.3,
    zone: 'yellow'
  },
  {
    id: 'uk-embassy',
    name: 'イギリス大使館',
    nameEn: 'Embassy of the United Kingdom',
    type: 'foreign_mission',
    coordinates: [139.7467, 35.6758],
    radiusKm: 0.3,
    zone: 'yellow'
  },
  {
    id: 'france-embassy',
    name: 'フランス大使館',
    nameEn: 'Embassy of France',
    type: 'foreign_mission',
    coordinates: [139.7403, 35.6636],
    radiusKm: 0.3,
    zone: 'yellow'
  },
  {
    id: 'germany-embassy',
    name: 'ドイツ大使館',
    nameEn: 'Embassy of Germany',
    type: 'foreign_mission',
    coordinates: [139.7481, 35.6756],
    radiusKm: 0.3,
    zone: 'yellow'
  },
  {
    id: 'italy-embassy',
    name: 'イタリア大使館',
    nameEn: 'Embassy of Italy',
    type: 'foreign_mission',
    coordinates: [139.7478, 35.6781],
    radiusKm: 0.3,
    zone: 'yellow'
  },
  {
    id: 'australia-embassy',
    name: 'オーストラリア大使館',
    nameEn: 'Embassy of Australia',
    type: 'foreign_mission',
    coordinates: [139.7406, 35.6706],
    radiusKm: 0.3,
    zone: 'yellow'
  },
  {
    id: 'ldp-hq',
    name: '自民党本部',
    nameEn: 'Liberal Democratic Party Headquarters',
    type: 'government',
    coordinates: [139.7394, 35.6781],
    radiusKm: 0.3,
    zone: 'yellow',
    category: '政党本部'
  },

  // ============================================
  // 都道府県庁舎（レッドゾーン）
  // ============================================
  {
    id: 'hokkaido-gov',
    name: '北海道庁',
    nameEn: 'Hokkaido Government',
    type: 'prefecture',
    coordinates: [141.3469, 43.0642],
    radiusKm: 0.2,
    zone: 'red',
    category: '都道府県庁舎',
    source: '警察庁'
  },
  {
    id: 'tokyo-gov',
    name: '東京都庁',
    nameEn: 'Tokyo Metropolitan Government',
    type: 'prefecture',
    coordinates: [139.6917, 35.6895],
    radiusKm: 0.2,
    zone: 'red',
    category: '都道府県庁舎',
    source: '警察庁'
  },
  {
    id: 'osaka-gov',
    name: '大阪府庁',
    nameEn: 'Osaka Prefectural Government',
    type: 'prefecture',
    coordinates: [135.5201, 34.6862],
    radiusKm: 0.2,
    zone: 'red',
    category: '都道府県庁舎',
    source: '警察庁'
  },
  {
    id: 'aichi-gov',
    name: '愛知県庁',
    nameEn: 'Aichi Prefectural Government',
    type: 'prefecture',
    coordinates: [136.9066, 35.1803],
    radiusKm: 0.2,
    zone: 'red',
    category: '都道府県庁舎',
    source: '警察庁'
  },
  {
    id: 'fukuoka-gov',
    name: '福岡県庁',
    nameEn: 'Fukuoka Prefectural Government',
    type: 'prefecture',
    coordinates: [130.4183, 33.6064],
    radiusKm: 0.2,
    zone: 'red',
    category: '都道府県庁舎',
    source: '警察庁'
  },
  {
    id: 'kanagawa-gov',
    name: '神奈川県庁',
    nameEn: 'Kanagawa Prefectural Government',
    type: 'prefecture',
    coordinates: [139.6424, 35.4478],
    radiusKm: 0.2,
    zone: 'red',
    category: '都道府県庁舎',
    source: '警察庁'
  },
  {
    id: 'kyoto-gov',
    name: '京都府庁',
    nameEn: 'Kyoto Prefectural Government',
    type: 'prefecture',
    coordinates: [135.7681, 35.0214],
    radiusKm: 0.2,
    zone: 'red',
    category: '都道府県庁舎',
    source: '警察庁'
  },
  {
    id: 'hyogo-gov',
    name: '兵庫県庁',
    nameEn: 'Hyogo Prefectural Government',
    type: 'prefecture',
    coordinates: [135.1831, 34.6913],
    radiusKm: 0.2,
    zone: 'red',
    category: '都道府県庁舎',
    source: '警察庁'
  },

  // ============================================
  // 警察本部・警察施設（レッドゾーン）
  // ============================================
  {
    id: 'tokyo-mpd',
    name: '警視庁本部',
    nameEn: 'Tokyo Metropolitan Police Department',
    type: 'police',
    coordinates: [139.7507, 35.6761],
    radiusKm: 0.2,
    zone: 'red',
    category: '警察本部',
    source: '警察庁'
  },
  {
    id: 'hokkaido-police',
    name: '北海道警察本部',
    nameEn: 'Hokkaido Police Headquarters',
    type: 'police',
    coordinates: [141.3450, 43.0649],
    radiusKm: 0.2,
    zone: 'red',
    category: '警察本部',
    source: '警察庁'
  },
  {
    id: 'osaka-police',
    name: '大阪府警察本部',
    nameEn: 'Osaka Prefectural Police Headquarters',
    type: 'police',
    coordinates: [135.5089, 34.6822],
    radiusKm: 0.2,
    zone: 'red',
    category: '警察本部',
    source: '警察庁'
  },
  {
    id: 'aichi-police',
    name: '愛知県警察本部',
    nameEn: 'Aichi Prefectural Police Headquarters',
    type: 'police',
    coordinates: [136.9095, 35.1709],
    radiusKm: 0.2,
    zone: 'red',
    category: '警察本部',
    source: '警察庁'
  },
  {
    id: 'fukuoka-police',
    name: '福岡県警察本部',
    nameEn: 'Fukuoka Prefectural Police Headquarters',
    type: 'police',
    coordinates: [130.4167, 33.6090],
    radiusKm: 0.2,
    zone: 'red',
    category: '警察本部',
    source: '警察庁'
  },

  // ============================================
  // 刑務所・拘置所（レッドゾーン）
  // ============================================
  {
    id: 'tokyo-detention',
    name: '東京拘置所',
    nameEn: 'Tokyo Detention House',
    type: 'prison',
    coordinates: [139.8286, 35.7431],
    radiusKm: 0.2,
    zone: 'red',
    category: '拘置所',
    source: '警察庁'
  },
  {
    id: 'osaka-detention',
    name: '大阪拘置所',
    nameEn: 'Osaka Detention House',
    type: 'prison',
    coordinates: [135.5375, 34.6847],
    radiusKm: 0.2,
    zone: 'red',
    category: '拘置所',
    source: '警察庁'
  },
  {
    id: 'nagoya-detention',
    name: '名古屋拘置所',
    nameEn: 'Nagoya Detention House',
    type: 'prison',
    coordinates: [136.9262, 35.1406],
    radiusKm: 0.2,
    zone: 'red',
    category: '拘置所',
    source: '警察庁'
  },
  {
    id: 'fuchu-prison',
    name: '府中刑務所',
    nameEn: 'Fuchu Prison',
    type: 'prison',
    coordinates: [139.4894, 35.6683],
    radiusKm: 0.2,
    zone: 'red',
    category: '刑務所',
    source: '警察庁'
  },
  {
    id: 'osaka-prison',
    name: '大阪刑務所',
    nameEn: 'Osaka Prison',
    type: 'prison',
    coordinates: [135.5547, 34.6481],
    radiusKm: 0.2,
    zone: 'red',
    category: '刑務所',
    source: '警察庁'
  },

  // ============================================
  // 自衛隊施設（レッドゾーン）
  // ============================================
  {
    id: 'jsdf-ichigaya',
    name: '防衛省市ヶ谷地区',
    nameEn: 'MOD Ichigaya Area',
    type: 'military_jsdf',
    coordinates: [139.7285, 35.6933],
    radiusKm: 0.2,
    zone: 'red',
    category: '自衛隊施設',
    source: '警察庁'
  },
  {
    id: 'jsdf-asaka',
    name: '陸上自衛隊朝霞駐屯地',
    nameEn: 'JGSDF Asaka Camp',
    type: 'military_jsdf',
    coordinates: [139.5950, 35.7983],
    radiusKm: 0.2,
    zone: 'red',
    category: '自衛隊施設',
    source: '警察庁'
  },
  {
    id: 'jsdf-yokosuka',
    name: '海上自衛隊横須賀地方総監部',
    nameEn: 'JMSDF Yokosuka District',
    type: 'military_jsdf',
    coordinates: [139.6608, 35.2789],
    radiusKm: 0.2,
    zone: 'red',
    category: '自衛隊施設',
    source: '警察庁'
  },
  {
    id: 'jsdf-hyakuri',
    name: '航空自衛隊百里基地',
    nameEn: 'JASDF Hyakuri Air Base',
    type: 'military_jsdf',
    coordinates: [140.4147, 36.1811],
    radiusKm: 0.2,
    zone: 'red',
    category: '自衛隊施設',
    source: '警察庁'
  },
  {
    id: 'jsdf-misawa',
    name: '航空自衛隊三沢基地',
    nameEn: 'JASDF Misawa Air Base',
    type: 'military_jsdf',
    coordinates: [141.3686, 40.7033],
    radiusKm: 0.2,
    zone: 'red',
    category: '自衛隊施設',
    source: '警察庁'
  },
  {
    id: 'jsdf-komatsu',
    name: '航空自衛隊小松基地',
    nameEn: 'JASDF Komatsu Air Base',
    type: 'military_jsdf',
    coordinates: [136.4069, 36.3947],
    radiusKm: 0.2,
    zone: 'red',
    category: '自衛隊施設',
    source: '警察庁'
  },
  {
    id: 'jsdf-tsuiki',
    name: '航空自衛隊築城基地',
    nameEn: 'JASDF Tsuiki Air Base',
    type: 'military_jsdf',
    coordinates: [131.0394, 33.6856],
    radiusKm: 0.2,
    zone: 'red',
    category: '自衛隊施設',
    source: '警察庁'
  },
  {
    id: 'jsdf-naha',
    name: '航空自衛隊那覇基地',
    nameEn: 'JASDF Naha Air Base',
    type: 'military_jsdf',
    coordinates: [127.6542, 26.1958],
    radiusKm: 0.2,
    zone: 'red',
    category: '自衛隊施設',
    source: '警察庁'
  },

  // ============================================
  // 追加の外国公館（イエローゾーン）
  // ============================================
  {
    id: 'canada-embassy',
    name: 'カナダ大使館',
    nameEn: 'Embassy of Canada',
    type: 'foreign_mission',
    coordinates: [139.7417, 35.6778],
    radiusKm: 0.3,
    zone: 'yellow',
    category: '外国公館',
    source: '警察庁'
  },
  {
    id: 'india-embassy',
    name: 'インド大使館',
    nameEn: 'Embassy of India',
    type: 'foreign_mission',
    coordinates: [139.7336, 35.6603],
    radiusKm: 0.3,
    zone: 'yellow',
    category: '外国公館',
    source: '警察庁'
  },
  {
    id: 'brazil-embassy',
    name: 'ブラジル大使館',
    nameEn: 'Embassy of Brazil',
    type: 'foreign_mission',
    coordinates: [139.7394, 35.6681],
    radiusKm: 0.3,
    zone: 'yellow',
    category: '外国公館',
    source: '警察庁'
  },
  {
    id: 'spain-embassy',
    name: 'スペイン大使館',
    nameEn: 'Embassy of Spain',
    type: 'foreign_mission',
    coordinates: [139.7383, 35.6658],
    radiusKm: 0.3,
    zone: 'yellow',
    category: '外国公館',
    source: '警察庁'
  },
  {
    id: 'netherlands-embassy',
    name: 'オランダ大使館',
    nameEn: 'Embassy of the Netherlands',
    type: 'foreign_mission',
    coordinates: [139.7381, 35.6725],
    radiusKm: 0.3,
    zone: 'yellow',
    category: '外国公館',
    source: '警察庁'
  },
  {
    id: 'switzerland-embassy',
    name: 'スイス大使館',
    nameEn: 'Embassy of Switzerland',
    type: 'foreign_mission',
    coordinates: [139.7447, 35.6797],
    radiusKm: 0.3,
    zone: 'yellow',
    category: '外国公館',
    source: '警察庁'
  },
  {
    id: 'belgium-embassy',
    name: 'ベルギー大使館',
    nameEn: 'Embassy of Belgium',
    type: 'foreign_mission',
    coordinates: [139.7394, 35.6719],
    radiusKm: 0.3,
    zone: 'yellow',
    category: '外国公館',
    source: '警察庁'
  },
  {
    id: 'sweden-embassy',
    name: 'スウェーデン大使館',
    nameEn: 'Embassy of Sweden',
    type: 'foreign_mission',
    coordinates: [139.7411, 35.6636],
    radiusKm: 0.3,
    zone: 'yellow',
    category: '外国公館',
    source: '警察庁'
  },
  {
    id: 'norway-embassy',
    name: 'ノルウェー大使館',
    nameEn: 'Embassy of Norway',
    type: 'foreign_mission',
    coordinates: [139.7422, 35.6653],
    radiusKm: 0.3,
    zone: 'yellow',
    category: '外国公館',
    source: '警察庁'
  },
  {
    id: 'denmark-embassy',
    name: 'デンマーク大使館',
    nameEn: 'Embassy of Denmark',
    type: 'foreign_mission',
    coordinates: [139.7353, 35.6606],
    radiusKm: 0.3,
    zone: 'yellow',
    category: '外国公館',
    source: '警察庁'
  },
  {
    id: 'finland-embassy',
    name: 'フィンランド大使館',
    nameEn: 'Embassy of Finland',
    type: 'foreign_mission',
    coordinates: [139.7453, 35.6761],
    radiusKm: 0.3,
    zone: 'yellow',
    category: '外国公館',
    source: '警察庁'
  },
  {
    id: 'austria-embassy',
    name: 'オーストリア大使館',
    nameEn: 'Embassy of Austria',
    type: 'foreign_mission',
    coordinates: [139.7389, 35.6644],
    radiusKm: 0.3,
    zone: 'yellow',
    category: '外国公館',
    source: '警察庁'
  },
  {
    id: 'poland-embassy',
    name: 'ポーランド大使館',
    nameEn: 'Embassy of Poland',
    type: 'foreign_mission',
    coordinates: [139.7294, 35.6553],
    radiusKm: 0.3,
    zone: 'yellow',
    category: '外国公館',
    source: '警察庁'
  },
  {
    id: 'turkey-embassy',
    name: 'トルコ大使館',
    nameEn: 'Embassy of Turkey',
    type: 'foreign_mission',
    coordinates: [139.7353, 35.6572],
    radiusKm: 0.3,
    zone: 'yellow',
    category: '外国公館',
    source: '警察庁'
  },
  {
    id: 'israel-embassy',
    name: 'イスラエル大使館',
    nameEn: 'Embassy of Israel',
    type: 'foreign_mission',
    coordinates: [139.7414, 35.6642],
    radiusKm: 0.3,
    zone: 'yellow',
    category: '外国公館',
    source: '警察庁'
  },
  {
    id: 'singapore-embassy',
    name: 'シンガポール大使館',
    nameEn: 'Embassy of Singapore',
    type: 'foreign_mission',
    coordinates: [139.7422, 35.6725],
    radiusKm: 0.3,
    zone: 'yellow',
    category: '外国公館',
    source: '警察庁'
  },
  {
    id: 'thailand-embassy',
    name: 'タイ大使館',
    nameEn: 'Embassy of Thailand',
    type: 'foreign_mission',
    coordinates: [139.7325, 35.6575],
    radiusKm: 0.3,
    zone: 'yellow',
    category: '外国公館',
    source: '警察庁'
  },
  {
    id: 'malaysia-embassy',
    name: 'マレーシア大使館',
    nameEn: 'Embassy of Malaysia',
    type: 'foreign_mission',
    coordinates: [139.7361, 35.6594],
    radiusKm: 0.3,
    zone: 'yellow',
    category: '外国公館',
    source: '警察庁'
  },
  {
    id: 'philippines-embassy',
    name: 'フィリピン大使館',
    nameEn: 'Embassy of the Philippines',
    type: 'foreign_mission',
    coordinates: [139.7392, 35.6669],
    radiusKm: 0.3,
    zone: 'yellow',
    category: '外国公館',
    source: '警察庁'
  },
  {
    id: 'indonesia-embassy',
    name: 'インドネシア大使館',
    nameEn: 'Embassy of Indonesia',
    type: 'foreign_mission',
    coordinates: [139.7339, 35.6619],
    radiusKm: 0.3,
    zone: 'yellow',
    category: '外国公館',
    source: '警察庁'
  }
]

// ============================================
// GeoJSON Generation Functions
// ============================================

/**
 * Get facilities by zone type
 */
export function getFacilitiesByZone(zone: 'red' | 'yellow'): NoFlyFacility[] {
  return NO_FLY_FACILITIES.filter((f) => f.zone === zone)
}

/**
 * Get facilities by type
 */
export function getFacilitiesByType(type: FacilityType): NoFlyFacility[] {
  return NO_FLY_FACILITIES.filter((f) => f.type === type)
}

/**
 * Get facilities by category (for UI filtering)
 */
export function getFacilitiesByCategory(category: string): NoFlyFacility[] {
  return NO_FLY_FACILITIES.filter((f) => f.category === category)
}

/**
 * Generate GeoJSON for red zones
 */
export function generateRedZoneGeoJSON(): GeoJSON.FeatureCollection {
  const facilities = getFacilitiesByZone('red')
  const features: GeoJSON.Feature[] = facilities.map((facility) => ({
    type: 'Feature',
    properties: {
      id: facility.id,
      name: facility.name,
      nameEn: facility.nameEn,
      type: facility.type,
      radiusKm: facility.radiusKm,
      zone: facility.zone,
      zoneType: 'RED_ZONE',
      category: facility.category,
      source: facility.source,
      coordinates: facility.coordinates,
      operationalStatus: facility.operationalStatus,
      reactorCount: facility.reactorCount,
      capacity: facility.capacity,
      operator: facility.operator,
      description: facility.description
    },
    geometry: createCirclePolygon(facility.coordinates, facility.radiusKm)
  }))

  return {
    type: 'FeatureCollection',
    features
  }
}

const YELLOW_ZONE_BUFFER_KM = 0.3

/**
 * Generate GeoJSON for yellow zones
 */
export function generateYellowZoneGeoJSON(): GeoJSON.FeatureCollection {
  // 在外公館のイエローゾーン
  const foreignMissions = getFacilitiesByZone('yellow').map((facility) => ({
    type: 'Feature' as const,
    properties: {
      id: facility.id,
      name: facility.name,
      nameEn: facility.nameEn,
      type: facility.type,
      radiusKm: facility.radiusKm,
      zone: facility.zone,
      zoneType: 'YELLOW_ZONE',
      coordinates: facility.coordinates,
      category: facility.category,
      source: facility.source,
      description: facility.description
    },
    geometry: createCirclePolygon(facility.coordinates, facility.radiusKm)
  }))

  // レッドゾーン対象施設の周辺300m（イエローゾーン）
  const redZoneFacilities = getFacilitiesByZone('red')
  const peripheryZones = redZoneFacilities.map((facility) => ({
    type: 'Feature' as const,
    properties: {
      id: facility.id + '-perimeter',
      name: facility.name + '周辺',
      nameEn: facility.nameEn ? facility.nameEn + ' (Perimeter)' : 'Perimeter',
      type: facility.type,
      radiusKm: facility.radiusKm + YELLOW_ZONE_BUFFER_KM, // 施設半径 + 0.3km周辺
      zone: 'yellow' as const,
      zoneType: 'YELLOW_ZONE',
      isPerimeter: true
    },
    geometry: createCirclePolygon(facility.coordinates, facility.radiusKm + YELLOW_ZONE_BUFFER_KM)
  }))

  return {
    type: 'FeatureCollection',
    features: [...foreignMissions, ...peripheryZones]
  }
}

/**
 * Generate GeoJSON for all no-fly zones
 */
export function generateAllNoFlyGeoJSON(): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = NO_FLY_FACILITIES.map((facility) => ({
    type: 'Feature',
    properties: {
      id: facility.id,
      name: facility.name,
      nameEn: facility.nameEn,
      type: facility.type,
      radiusKm: facility.radiusKm,
      zone: facility.zone,
      zoneType: facility.zone === 'red' ? 'RED_ZONE' : 'YELLOW_ZONE'
    },
    geometry: createCirclePolygon(facility.coordinates, facility.radiusKm)
  }))

  return {
    type: 'FeatureCollection',
    features
  }
}

/**
 * Get nuclear power plants only
 */
export function getNuclearPlants(): NoFlyFacility[] {
  return NO_FLY_FACILITIES.filter((f) => f.type === 'nuclear')
}

/**
 * Get US military bases only
 */
export function getUSMilitaryBases(): NoFlyFacility[] {
  return NO_FLY_FACILITIES.filter((f) => f.category === '在日米軍')
}

/**
 * Get embassies only
 */
export function getEmbassies(): NoFlyFacility[] {
  return NO_FLY_FACILITIES.filter((f) => f.type === 'foreign_mission')
}

/**
 * Get prefectures only
 */
export function getPrefectures(): NoFlyFacility[] {
  return NO_FLY_FACILITIES.filter((f) => f.type === 'prefecture')
}

/**
 * Get police facilities only
 */
export function getPoliceFacilities(): NoFlyFacility[] {
  return NO_FLY_FACILITIES.filter((f) => f.type === 'police')
}

/**
 * Get prisons only
 */
export function getPrisons(): NoFlyFacility[] {
  return NO_FLY_FACILITIES.filter((f) => f.type === 'prison')
}

/**
 * Get JSDF facilities only
 */
export function getJSDFFacilities(): NoFlyFacility[] {
  return NO_FLY_FACILITIES.filter((f) => f.type === 'military_jsdf')
}

/**
 * Generate GeoJSON for a specific facility type
 */
export function generateCategoryGeoJSON(type: FacilityType): GeoJSON.FeatureCollection {
  const facilities = getFacilitiesByType(type)
  const features: GeoJSON.Feature[] = facilities.map((facility) => ({
    type: 'Feature',
    properties: {
      id: facility.id,
      name: facility.name,
      nameEn: facility.nameEn,
      type: facility.type,
      radiusKm: facility.radiusKm,
      zone: facility.zone,
      zoneType: facility.zone === 'red' ? 'RED_ZONE' : 'YELLOW_ZONE',
      category: facility.category,
      source: facility.source,
      coordinates: facility.coordinates,
      operationalStatus: facility.operationalStatus,
      reactorCount: facility.reactorCount,
      capacity: facility.capacity,
      operator: facility.operator,
      address: facility.address,
      description: facility.description
    },
    geometry: createCirclePolygon(facility.coordinates, facility.radiusKm)
  }))

  return {
    type: 'FeatureCollection',
    features
  }
}

/**
 * Generate GeoJSON for nuclear plants with operational status
 */
export function generateNuclearPlantsGeoJSON(): GeoJSON.FeatureCollection {
  return generateCategoryGeoJSON('nuclear')
}

/**
 * Generate GeoJSON for prefectures
 */
export function generatePrefecturesGeoJSON(): GeoJSON.FeatureCollection {
  return generateCategoryGeoJSON('prefecture')
}

/**
 * Generate GeoJSON for police facilities
 */
export function generatePoliceFacilitiesGeoJSON(): GeoJSON.FeatureCollection {
  return generateCategoryGeoJSON('police')
}

/**
 * Generate GeoJSON for prisons
 */
export function generatePrisonsGeoJSON(): GeoJSON.FeatureCollection {
  return generateCategoryGeoJSON('prison')
}

/**
 * Generate GeoJSON for JSDF facilities
 */
export function generateJSDFFacilitiesGeoJSON(): GeoJSON.FeatureCollection {
  return generateCategoryGeoJSON('military_jsdf')
}

// ============================================
// Emergency Airspace (緊急用務空域)
// ============================================

interface EmergencyAirspace {
  id: string
  name: string
  nameEn?: string
  coordinates: [number, number]
  radiusKm: number
  altitudeLimit?: { min: number; max: number }
  validPeriod?: { start: string; end: string }
  authority: { name: string; contact?: string; notamNumber?: string }
  reason: 'disaster' | 'fire' | 'police' | 'rescue' | 'other'
  priority: 'high' | 'medium' | 'low'
  status: 'active' | 'scheduled' | 'expired'
  description?: string
}

/**
 * Generate mock GeoJSON for Emergency Airspace
 * 緊急用務空域 - 警察・消防等の緊急活動区域
 */
export function generateEmergencyAirspaceGeoJSON(): GeoJSON.FeatureCollection {
  const mockEmergencies: EmergencyAirspace[] = [
    {
      id: 'emergency-1',
      name: '大規模火災対応区域（見本）',
      nameEn: 'Large Fire Response Area (Sample)',
      coordinates: [139.75, 35.68],
      radiusKm: 1.0,
      altitudeLimit: { min: 0, max: 300 },
      validPeriod: {
        start: '2024-01-15T09:00:00+09:00',
        end: '2024-01-15T18:00:00+09:00'
      },
      authority: {
        name: '東京消防庁',
        contact: '03-3212-2111',
        notamNumber: 'A0123/24'
      },
      reason: 'fire',
      priority: 'high',
      status: 'active',
      description: '高層ビル火災に伴う消防ヘリコプター活動区域'
    },
    {
      id: 'emergency-2',
      name: '警察捜索活動区域（見本）',
      nameEn: 'Police Search Operation Area (Sample)',
      coordinates: [139.74, 35.69],
      radiusKm: 0.8,
      altitudeLimit: { min: 0, max: 200 },
      validPeriod: {
        start: '2024-01-16T06:00:00+09:00',
        end: '2024-01-16T20:00:00+09:00'
      },
      authority: {
        name: '警視庁航空隊',
        contact: '03-3581-4321',
        notamNumber: 'A0124/24'
      },
      reason: 'police',
      priority: 'medium',
      status: 'active',
      description: '行方不明者捜索に伴う警察ヘリ活動区域'
    },
    {
      id: 'emergency-3',
      name: '災害救助活動区域（見本）',
      nameEn: 'Disaster Rescue Area (Sample)',
      coordinates: [139.69, 35.71],
      radiusKm: 1.5,
      altitudeLimit: { min: 0, max: 500 },
      validPeriod: {
        start: '2024-01-17T00:00:00+09:00',
        end: '2024-01-20T23:59:59+09:00'
      },
      authority: {
        name: '国土交通省 地方整備局',
        contact: '048-600-1000',
        notamNumber: 'A0125/24'
      },
      reason: 'disaster',
      priority: 'high',
      status: 'active',
      description: '地震災害に伴う救助・物資輸送ヘリ活動区域'
    }
  ]

  const features: GeoJSON.Feature[] = mockEmergencies.map((item) => ({
    type: 'Feature',
    properties: {
      id: item.id,
      name: item.name,
      nameEn: item.nameEn,
      radiusKm: item.radiusKm,
      type: 'emergency',
      zoneType: 'EMERGENCY',
      altitudeLimit: item.altitudeLimit,
      validPeriod: item.validPeriod,
      authority: item.authority,
      reason: item.reason,
      priority: item.priority,
      status: item.status,
      description: item.description
    },
    geometry: createCirclePolygon(item.coordinates, item.radiusKm)
  }))

  return { type: 'FeatureCollection', features }
}

// ============================================
// Remote ID Zone (リモートID特定区域)
// ============================================

interface RemoteIDZone {
  id: string
  name: string
  nameEn?: string
  coordinates: [number, number]
  radiusKm: number
  requirement: {
    remoteIdRequired: boolean
    registrationRequired: boolean
    flightPlanRequired: boolean
  }
  exemptions?: string[]
  enforcementDate: string
  authority: { name: string; regulationReference?: string }
  description?: string
}

/**
 * Generate mock GeoJSON for Remote ID Required Zone
 * リモートID特定区域 - リモートID機能必須区域
 */
export function generateRemoteIDZoneGeoJSON(): GeoJSON.FeatureCollection {
  const mockRemoteID: RemoteIDZone[] = [
    {
      id: 'remoteid-1',
      name: '東京都心リモートID特定区域（見本）',
      nameEn: 'Tokyo Central Remote ID Zone (Sample)',
      coordinates: [139.745, 35.675],
      radiusKm: 3.0,
      requirement: {
        remoteIdRequired: true,
        registrationRequired: true,
        flightPlanRequired: true
      },
      exemptions: ['100g未満の機体', '屋内飛行', '係留飛行'],
      enforcementDate: '2022-06-20',
      authority: {
        name: '国土交通省航空局',
        regulationReference: '航空法第132条の87'
      },
      description: '都心部における無人航空機のリモートID発信義務区域'
    },
    {
      id: 'remoteid-2',
      name: '成田空港周辺リモートID特定区域（見本）',
      nameEn: 'Narita Airport Remote ID Zone (Sample)',
      coordinates: [140.3929, 35.772],
      radiusKm: 5.0,
      requirement: {
        remoteIdRequired: true,
        registrationRequired: true,
        flightPlanRequired: true
      },
      exemptions: ['100g未満の機体'],
      enforcementDate: '2022-06-20',
      authority: {
        name: '国土交通省航空局',
        regulationReference: '航空法第132条の87'
      },
      description: '空港周辺における無人航空機監視強化区域'
    },
    {
      id: 'remoteid-3',
      name: '羽田空港周辺リモートID特定区域（見本）',
      nameEn: 'Haneda Airport Remote ID Zone (Sample)',
      coordinates: [139.7798, 35.5494],
      radiusKm: 4.0,
      requirement: {
        remoteIdRequired: true,
        registrationRequired: true,
        flightPlanRequired: true
      },
      exemptions: ['100g未満の機体'],
      enforcementDate: '2022-06-20',
      authority: {
        name: '国土交通省航空局',
        regulationReference: '航空法第132条の87'
      },
      description: '空港周辺における無人航空機監視強化区域'
    }
  ]

  const features: GeoJSON.Feature[] = mockRemoteID.map((item) => ({
    type: 'Feature',
    properties: {
      id: item.id,
      name: item.name,
      nameEn: item.nameEn,
      radiusKm: item.radiusKm,
      type: 'remote-id',
      zoneType: 'REMOTE_ID',
      requirement: item.requirement,
      exemptions: item.exemptions,
      enforcementDate: item.enforcementDate,
      authority: item.authority,
      description: item.description
    },
    geometry: createCirclePolygon(item.coordinates, item.radiusKm)
  }))

  return { type: 'FeatureCollection', features }
}

// ============================================
// Manned Aircraft Zone (有人機発着エリア)
// ============================================

interface MannedAircraftZone {
  id: string
  name: string
  nameEn?: string
  coordinates: [number, number]
  radiusKm: number
  zoneType: 'agricultural' | 'glider' | 'seaplane' | 'temporary'
  operator?: string
  operatingHours?: string
  description?: string
}

/**
 * Generate GeoJSON for Manned Aircraft Zones
 * 有人機発着エリア - 農業航空・グライダー・水上飛行機等
 */
export function generateMannedAircraftZonesGeoJSON(): GeoJSON.FeatureCollection {
  const zones: MannedAircraftZone[] = [
    {
      id: 'manned-tsukuba',
      name: '筑波農業航空施設',
      nameEn: 'Tsukuba Agricultural Aviation Facility',
      coordinates: [140.0833, 36.0833],
      radiusKm: 1.0,
      zoneType: 'agricultural',
      operator: 'JA農協',
      operatingHours: '日の出〜日没（農繁期）',
      description: '農薬散布ヘリコプター用'
    },
    {
      id: 'manned-sekiyado',
      name: '関宿滑空場',
      nameEn: 'Sekiyado Glider Field',
      coordinates: [139.8333, 36.0],
      radiusKm: 2.0,
      zoneType: 'glider',
      operator: '関宿滑空場管理組合',
      description: '日本グライダー連盟加盟'
    },
    {
      id: 'manned-menuma',
      name: '妻沼滑空場',
      nameEn: 'Menuma Glider Field',
      coordinates: [139.3833, 36.2167],
      radiusKm: 2.0,
      zoneType: 'glider',
      operator: '妻沼滑空場管理組合',
      description: '大学グライダー部利用'
    },
    {
      id: 'manned-biwa',
      name: '琵琶湖水上機基地',
      nameEn: 'Lake Biwa Seaplane Base',
      coordinates: [136.0833, 35.2833],
      radiusKm: 1.5,
      zoneType: 'seaplane',
      description: '水上飛行機離着水場'
    }
  ]

  const features: GeoJSON.Feature[] = zones.map((item) => ({
    type: 'Feature',
    properties: {
      id: item.id,
      name: item.name,
      nameEn: item.nameEn,
      type: 'manned_aircraft',
      zoneType: 'MANNED_AIRCRAFT',
      radiusKm: item.radiusKm,
      facilityType: item.zoneType,
      operator: item.operator,
      operatingHours: item.operatingHours,
      description: item.description
    },
    geometry: createCirclePolygon(item.coordinates, item.radiusKm)
  }))

  return { type: 'FeatureCollection', features }
}

// ============================================
// Radio Interference Zones (電波干渉区域)
// ============================================

interface RadioInterferenceZone {
  id: string
  name: string
  nameEn?: string
  coordinates: [number, number]
  radiusKm: number
  frequency: string
  interferenceLevel: 'high' | 'medium' | 'low'
  description?: string
}

/**
 * Generate GeoJSON for Radio Interference Zones
 * 電波干渉区域 - 携帯電話基地局・放送局周辺
 */
export function generateRadioInterferenceZonesGeoJSON(): GeoJSON.FeatureCollection {
  const zones: RadioInterferenceZone[] = [
    {
      id: 'radio-skytree',
      name: '東京スカイツリー',
      nameEn: 'Tokyo Skytree',
      coordinates: [139.8107, 35.7101],
      radiusKm: 2.0,
      frequency: 'LTE/5G/地デジ',
      interferenceLevel: 'high',
      description: '電波塔、強力な電波発信源'
    },
    {
      id: 'radio-tower',
      name: '東京タワー',
      nameEn: 'Tokyo Tower',
      coordinates: [139.7454, 35.6586],
      radiusKm: 1.5,
      frequency: 'LTE/FM',
      interferenceLevel: 'high',
      description: '電波塔、FM放送・携帯基地局'
    },
    {
      id: 'radio-nhk',
      name: 'NHK菖蒲久喜ラジオ放送所',
      nameEn: 'NHK Shobu-Kuki Radio Station',
      coordinates: [139.5833, 36.0667],
      radiusKm: 3.0,
      frequency: 'AM',
      interferenceLevel: 'high',
      description: 'AM放送局、広範囲に影響'
    },
    {
      id: 'radio-nagoya',
      name: '名古屋テレビ塔',
      nameEn: 'Nagoya TV Tower',
      coordinates: [136.9088, 35.1803],
      radiusKm: 1.0,
      frequency: 'LTE',
      interferenceLevel: 'medium',
      description: 'テレビ塔、携帯基地局併設'
    },
    {
      id: 'radio-fukuoka',
      name: '福岡タワー',
      nameEn: 'Fukuoka Tower',
      coordinates: [130.3515, 33.593],
      radiusKm: 1.0,
      frequency: 'LTE',
      interferenceLevel: 'medium',
      description: 'テレビ・携帯電話基地局'
    },
    {
      id: 'radio-sapporo',
      name: '札幌テレビ塔',
      nameEn: 'Sapporo TV Tower',
      coordinates: [141.3566, 43.061],
      radiusKm: 0.8,
      frequency: 'LTE',
      interferenceLevel: 'medium',
      description: 'テレビ塔、通信施設'
    },
    {
      id: 'radio-landmark',
      name: '横浜ランドマークタワー',
      nameEn: 'Yokohama Landmark Tower',
      coordinates: [139.6325, 35.455],
      radiusKm: 1.0,
      frequency: 'LTE',
      interferenceLevel: 'medium',
      description: '超高層ビル、複数基地局'
    },
    {
      id: 'radio-abeno',
      name: 'あべのハルカス',
      nameEn: 'Abeno Harukas',
      coordinates: [135.5133, 34.6463],
      radiusKm: 1.0,
      frequency: 'LTE/5G',
      interferenceLevel: 'high',
      description: '日本最高層ビル、5G対応'
    }
  ]

  const features: GeoJSON.Feature[] = zones.map((item) => ({
    type: 'Feature',
    properties: {
      id: item.id,
      name: item.name,
      nameEn: item.nameEn,
      type: 'radio',
      zoneType: 'RADIO',
      radiusKm: item.radiusKm,
      frequency: item.frequency,
      interferenceLevel: item.interferenceLevel,
      description: item.description
    },
    geometry: createCirclePolygon(item.coordinates, item.radiusKm)
  }))

  return { type: 'FeatureCollection', features }
}

// ============================================
// Distance Check Functions
// ============================================

/**
 * Check if a point is in a no-fly zone
 */
export function isInNoFlyZone(
  lat: number,
  lng: number
): { inZone: boolean; facility?: NoFlyFacility; zone?: 'red' | 'yellow' } {
  for (const facility of NO_FLY_FACILITIES) {
    const distance = calculateDistance(lat, lng, facility.coordinates[1], facility.coordinates[0])

    if (distance <= facility.radiusKm) {
      return { inZone: true, facility, zone: facility.zone }
    }
  }

  return { inZone: false }
}

/**
 * Get all no-fly zones within a certain distance from a point
 */
export function getNearbyNoFlyZones(
  lat: number,
  lng: number,
  maxDistanceKm: number = 10
): Array<{ facility: NoFlyFacility; distance: number }> {
  const nearby: Array<{ facility: NoFlyFacility; distance: number }> = []

  for (const facility of NO_FLY_FACILITIES) {
    const distance = calculateDistance(lat, lng, facility.coordinates[1], facility.coordinates[0])

    if (distance <= maxDistanceKm) {
      nearby.push({ facility, distance })
    }
  }

  return nearby.sort((a, b) => a.distance - b.distance)
}

// ============================================
// Legacy Compatibility (旧形式との互換性)
// ============================================

/**
 * Convert to legacy format for backward compatibility
 * @deprecated Use NO_FLY_FACILITIES directly
 */
export function toLegacyFormat(): Array<{
  name: string
  lat: number
  lng: number
  radius: number
  type: 'red' | 'yellow'
  category: string
}> {
  return NO_FLY_FACILITIES.map((f) => ({
    name: f.name,
    lat: f.coordinates[1],
    lng: f.coordinates[0],
    radius: f.radiusKm * 1000, // Convert to meters
    type: f.zone,
    category: f.type
  }))
}

// ============================================
// Service Export
// ============================================

export const NoFlyZoneService = {
  getFacilitiesByZone,
  getFacilitiesByType,
  getFacilitiesByCategory,
  generateRedZone: generateRedZoneGeoJSON,
  generateYellowZone: generateYellowZoneGeoJSON,
  generateAll: generateAllNoFlyGeoJSON,
  generateEmergencyAirspace: generateEmergencyAirspaceGeoJSON,
  generateRemoteIDZone: generateRemoteIDZoneGeoJSON,
  generateMannedAircraftZones: generateMannedAircraftZonesGeoJSON,
  generateRadioInterferenceZones: generateRadioInterferenceZonesGeoJSON,
  generateCategoryGeoJSON,
  generateNuclearPlantsGeoJSON,
  generatePrefecturesGeoJSON,
  generatePoliceFacilitiesGeoJSON,
  generatePrisonsGeoJSON,
  generateJSDFFacilitiesGeoJSON,
  isInZone: isInNoFlyZone,
  getNearby: getNearbyNoFlyZones,
  getNuclearPlants,
  getUSMilitaryBases,
  getEmbassies,
  getPrefectures,
  getPoliceFacilities,
  getPrisons,
  getJSDFFacilities
}
