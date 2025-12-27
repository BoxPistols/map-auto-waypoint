/**
 * フライト分析サービス
 *
 * 実データに基づくドローン飛行のリスク判定
 * - 空港・禁止区域との距離計算
 * - DID（人口集中地区）判定（国土地理院タイル使用）
 * - OpenAI連携による総合分析
 * - 申請コスト・タイムライン計算
 * - UTM干渉チェック
 * - 最適機体推奨
 */

import * as turf from '@turf/turf';
import { checkAirspaceRestrictions, AIRPORT_ZONES, NO_FLY_ZONES } from './airspace';
import { analyzeFlightPlan, getRecommendedParameters, hasApiKey } from './openaiService';
import { getLocationInfo, hasReinfolibApiKey } from './reinfolibService';

// ===== ユーティリティ関数 =====

/**
 * 2点間の距離を計算（メートル）
 */
const getDistanceMeters = (lat1, lng1, lat2, lng2) => {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// ===== DID (人口集中地区) 判定 =====

/**
 * 緯度経度からタイル座標を計算
 * @param {number} lat - 緯度
 * @param {number} lng - 経度
 * @param {number} zoom - ズームレベル
 * @returns {{ x: number, y: number }} タイル座標
 */
const latLngToTile = (lat, lng, zoom) => {
  const n = Math.pow(2, zoom);
  const x = Math.floor((lng + 180) / 360 * n);
  const latRad = lat * Math.PI / 180;
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
  return { x, y };
};

/**
 * DIDタイルのキャッシュ（メモリ内）
 */
const didTileCache = new Map();

/**
 * 国土地理院DID GeoJSONタイルを取得
 * @param {number} x - タイルX座標
 * @param {number} y - タイルY座標
 * @param {number} z - ズームレベル
 * @returns {Promise<Object|null>} GeoJSONデータ
 */
const fetchDIDTile = async (x, y, z) => {
  const cacheKey = `${z}/${x}/${y}`;

  // キャッシュチェック
  if (didTileCache.has(cacheKey)) {
    return didTileCache.get(cacheKey);
  }

  // fetch APIが利用できない環境（テスト環境等）ではスキップ
  if (typeof fetch === 'undefined') {
    console.warn('[DID] fetch API unavailable');
    return null;
  }

  try {
    // GSI GeoJSON tiles - note: may be blocked by CORS in browser
    const url = `https://cyberjapandata.gsi.go.jp/xyz/did2015/${z}/${x}/${y}.geojson`;

    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      headers: {
        'Accept': 'application/json'
      }
    });

    // response が undefined の場合（テスト環境等）
    if (!response) {
      console.warn('[DID] Empty response from GSI');
      return null;
    }

    if (!response.ok) {
      // タイルが存在しない（404）= その地域にDIDがない
      if (response.status === 404) {
        didTileCache.set(cacheKey, null);
        return null;
      }
      console.warn(`[DID] GSI tile fetch failed: HTTP ${response.status}`);
      throw new Error(`HTTP ${response.status}`);
    }

    const geojson = await response.json();
    didTileCache.set(cacheKey, geojson);
    console.log(`[DID] GSI tile loaded: ${cacheKey}, features: ${geojson.features?.length || 0}`);
    return geojson;
  } catch (error) {
    // CORS error or network failure - log for debugging
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      console.warn('[DID] CORS or network error - using fallback data');
    } else {
      console.warn('[DID] GSI tile fetch error:', error.message);
    }
    return null;
  }
};

/**
 * DID（人口集中地区）判定 - 国土地理院タイル使用
 * @param {number} lat - 緯度
 * @param {number} lng - 経度
 * @returns {Promise<Object>} DID判定結果
 */
export const checkDIDArea = async (lat, lng) => {
  // ズームレベル12でタイル取得（詳細度とパフォーマンスのバランス）
  const zoom = 12;
  const tile = latLngToTile(lat, lng, zoom);

  try {
    const geojson = await fetchDIDTile(tile.x, tile.y, zoom);

    // GSIタイルが取得できなかった場合はフォールバック使用
    if (geojson === null) {
      return checkDIDAreaFallback(lat, lng);
    }

    // タイルは取得できたが特徴がない場合 = DID外
    if (!geojson.features || geojson.features.length === 0) {
      return {
        isDID: false,
        area: null,
        certainty: 'confirmed',
        source: 'GSI',
        description: 'DID外（人口集中地区外）- 国土地理院データ確認済'
      };
    }

    // 判定対象の点
    const point = turf.point([lng, lat]);

    // 各DIDポリゴンと照合
    for (const feature of geojson.features) {
      if (feature.geometry && (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon')) {
        try {
          if (turf.booleanPointInPolygon(point, feature)) {
            const areaName = feature.properties?.CITY_NAME ||
                           feature.properties?.PREF_NAME ||
                           feature.properties?.KEN_NAME ||
                           '人口集中地区';
            return {
              isDID: true,
              area: areaName,
              certainty: 'confirmed',
              source: 'GSI',
              description: `${areaName}のDID内（人口集中地区）- 国土地理院データ`,
              population: feature.properties?.JINKO || null
            };
          }
        } catch (e) {
          // 無効なジオメトリはスキップ
          continue;
        }
      }
    }

    return {
      isDID: false,
      area: null,
      certainty: 'confirmed',
      source: 'GSI',
      description: 'DID外（人口集中地区外）- 国土地理院データ確認済'
    };
  } catch (error) {
    console.error('[DID] Check failed, falling back to estimation:', error);
    // フォールバック: 主要都市の推定データを使用
    return checkDIDAreaFallback(lat, lng);
  }
};

/**
 * DID判定フォールバック（オフライン用）
 * 国土地理院タイル取得失敗時に使用する推定データ
 * 全国の主要都市・県庁所在地をカバー
 *
 * @param {number} lat - 緯度
 * @param {number} lng - 経度
 * @returns {Object} DID判定結果
 */
const checkDIDAreaFallback = (lat, lng) => {
  // 全国の主要DID地域（都道府県庁所在地・政令指定都市・主要都市）
  const MAJOR_DID_AREAS = [
    // 北海道・東北
    { name: '札幌市', lat: 43.0618, lng: 141.3545, radius: 12000 },
    { name: '函館市', lat: 41.7687, lng: 140.7288, radius: 4000 },
    { name: '旭川市', lat: 43.7707, lng: 142.3650, radius: 4000 },
    { name: '青森市', lat: 40.8246, lng: 140.7400, radius: 4000 },
    { name: '盛岡市', lat: 39.7036, lng: 141.1527, radius: 4000 },
    { name: '仙台市', lat: 38.2682, lng: 140.8694, radius: 8000 },
    { name: '秋田市', lat: 39.7186, lng: 140.1024, radius: 4000 },
    { name: '山形市', lat: 38.2404, lng: 140.3633, radius: 3500 },
    { name: '福島市', lat: 37.7503, lng: 140.4676, radius: 4000 },
    { name: '郡山市', lat: 37.4006, lng: 140.3594, radius: 4000 },
    { name: 'いわき市', lat: 37.0504, lng: 140.8879, radius: 3500 },

    // 関東
    { name: '東京都心', lat: 35.6812, lng: 139.7671, radius: 20000 },
    { name: '横浜市', lat: 35.4437, lng: 139.6380, radius: 12000 },
    { name: '川崎市', lat: 35.5308, lng: 139.7030, radius: 6000 },
    { name: 'さいたま市', lat: 35.8617, lng: 139.6455, radius: 8000 },
    { name: '千葉市', lat: 35.6073, lng: 140.1064, radius: 7000 },
    { name: '相模原市', lat: 35.5710, lng: 139.3730, radius: 5000 },
    { name: '水戸市', lat: 36.3418, lng: 140.4468, radius: 4000 },
    { name: '宇都宮市', lat: 36.5658, lng: 139.8836, radius: 5000 },
    { name: '前橋市', lat: 36.3895, lng: 139.0634, radius: 4000 },
    { name: '高崎市', lat: 36.3219, lng: 139.0032, radius: 4000 },

    // 甲信越・北陸
    { name: '新潟市', lat: 37.9162, lng: 139.0365, radius: 6000 },
    { name: '長野市', lat: 36.6485, lng: 138.1950, radius: 4000 },
    { name: '松本市', lat: 36.2381, lng: 137.9720, radius: 3500 },
    { name: '甲府市', lat: 35.6641, lng: 138.5684, radius: 3500 },
    { name: '富山市', lat: 36.6959, lng: 137.2136, radius: 5000 },
    { name: '高岡市', lat: 36.7540, lng: 137.0257, radius: 3500 },
    { name: '金沢市', lat: 36.5613, lng: 136.6562, radius: 5000 },
    { name: '福井市', lat: 36.0652, lng: 136.2216, radius: 4000 },

    // 東海
    { name: '名古屋市', lat: 35.1815, lng: 136.9066, radius: 12000 },
    { name: '静岡市', lat: 34.9756, lng: 138.3828, radius: 5000 },
    { name: '浜松市', lat: 34.7108, lng: 137.7261, radius: 5000 },
    { name: '岐阜市', lat: 35.3912, lng: 136.7223, radius: 4000 },
    { name: '津市', lat: 34.7303, lng: 136.5086, radius: 3500 },
    { name: '四日市市', lat: 34.9649, lng: 136.6249, radius: 4000 },

    // 近畿
    { name: '大阪市', lat: 34.6937, lng: 135.5023, radius: 15000 },
    { name: '堺市', lat: 34.5733, lng: 135.4830, radius: 6000 },
    { name: '京都市', lat: 35.0116, lng: 135.7681, radius: 8000 },
    { name: '神戸市', lat: 34.6901, lng: 135.1956, radius: 8000 },
    { name: '奈良市', lat: 34.6851, lng: 135.8328, radius: 4000 },
    { name: '和歌山市', lat: 34.2306, lng: 135.1707, radius: 4000 },
    { name: '大津市', lat: 35.0045, lng: 135.8686, radius: 4000 },
    { name: '姫路市', lat: 34.8154, lng: 134.6858, radius: 4000 },

    // 中国
    { name: '広島市', lat: 34.3853, lng: 132.4553, radius: 8000 },
    { name: '岡山市', lat: 34.6617, lng: 133.9350, radius: 6000 },
    { name: '倉敷市', lat: 34.5850, lng: 133.7721, radius: 4000 },
    { name: '鳥取市', lat: 35.5039, lng: 134.2381, radius: 3500 },
    { name: '松江市', lat: 35.4723, lng: 133.0505, radius: 3500 },
    { name: '山口市', lat: 34.1861, lng: 131.4705, radius: 3500 },
    { name: '下関市', lat: 33.9589, lng: 130.9413, radius: 4000 },

    // 四国
    { name: '高松市', lat: 34.3401, lng: 134.0434, radius: 5000 },
    { name: '徳島市', lat: 34.0658, lng: 134.5593, radius: 4000 },
    { name: '松山市', lat: 33.8416, lng: 132.7657, radius: 5000 },
    { name: '高知市', lat: 33.5597, lng: 133.5311, radius: 4000 },

    // 九州・沖縄
    { name: '福岡市', lat: 33.5904, lng: 130.4017, radius: 10000 },
    { name: '北九州市', lat: 33.8834, lng: 130.8752, radius: 7000 },
    { name: '佐賀市', lat: 33.2494, lng: 130.2988, radius: 3500 },
    { name: '長崎市', lat: 32.7503, lng: 129.8777, radius: 4000 },
    { name: '熊本市', lat: 32.8032, lng: 130.7079, radius: 6000 },
    { name: '大分市', lat: 33.2382, lng: 131.6126, radius: 4000 },
    { name: '宮崎市', lat: 31.9111, lng: 131.4239, radius: 4000 },
    { name: '鹿児島市', lat: 31.5966, lng: 130.5571, radius: 5000 },
    { name: '那覇市', lat: 26.2124, lng: 127.6809, radius: 5000 },
  ];

  for (const did of MAJOR_DID_AREAS) {
    const distance = getDistanceMeters(lat, lng, did.lat, did.lng);
    if (distance < did.radius) {
      return {
        isDID: true,
        area: did.name,
        certainty: 'estimated',
        source: 'fallback',
        description: `${did.name}のDID内（推定）- オフラインデータ`
      };
    }
  }

  // 人口密度による追加チェック（日本の一般的な都市部の緯度経度範囲）
  // 日本本土の大まかな範囲内でかつ山間部でない場合は注意喚起
  const isInJapanMainland = lat >= 31 && lat <= 45 && lng >= 129 && lng <= 146;

  return {
    isDID: false,
    area: null,
    certainty: 'estimated',
    source: 'fallback',
    description: isInJapanMainland
      ? 'DID外（推定）- 周辺の人口密度を現地確認してください'
      : 'DID外（推定）- 国土地理院データ取得失敗'
  };
};

// ===== 申請コスト・タイムライン計算 =====

/**
 * 申請区分と費用データ
 */
const APPLICATION_CATEGORIES = {
  DID: {
    name: 'DID上空飛行',
    baseDays: 10,
    documents: ['飛行計画書', '機体情報', '操縦者証明', '保険証書'],
    coordination: [{ stakeholder: '地権者', leadTime: 7 }],
    notes: '包括申請があれば個別申請不要な場合あり'
  },
  AIRPORT: {
    name: '空港等周辺飛行',
    baseDays: 14,
    documents: ['飛行計画書', '空域図', '連絡先一覧'],
    coordination: [
      { stakeholder: '空港事務所', leadTime: 14, required: true },
      { stakeholder: '航空局', leadTime: 10 }
    ],
    notes: '空港管制との事前調整が必須'
  },
  HIGH_ALTITUDE: {
    name: '150m以上の高高度飛行',
    baseDays: 14,
    documents: ['飛行計画書', '高度計画図'],
    coordination: [{ stakeholder: '航空局', leadTime: 14 }],
    notes: '航空機との干渉リスクが高いため厳格な審査'
  },
  NIGHT: {
    name: '夜間飛行',
    baseDays: 10,
    documents: ['飛行計画書', '照明計画', '安全対策書'],
    coordination: [],
    notes: '視認性確保の照明設備が必要'
  },
  BVLOS: {
    name: '目視外飛行',
    baseDays: 10,
    documents: ['飛行計画書', '通信計画', '補助者配置計画'],
    coordination: [],
    notes: '補助者なし目視外は更に厳格'
  }
};

/**
 * 申請コストとタイムラインを計算
 * @param {Object} analysisResult - フライト分析結果
 * @returns {Object} 申請コスト詳細
 */
export const calculateApplicationCosts = (analysisResult) => {
  const { risks, context } = analysisResult;
  const applications = [];
  let totalDays = 0;
  let totalCost = 0;
  const allDocuments = new Set();
  const allCoordination = [];

  // DIDチェック（既にcontext.didInfoに格納済み）
  const didCheck = context?.didInfo || null;
  if (didCheck?.isDID) {
    const cat = APPLICATION_CATEGORIES.DID;
    applications.push({
      type: 'DID',
      name: cat.name,
      required: true,
      estimatedDays: cat.baseDays,
      reason: didCheck.description
    });
    totalDays = Math.max(totalDays, cat.baseDays);
    cat.documents.forEach(d => allDocuments.add(d));
    allCoordination.push(...cat.coordination);
  }

  // 空港近接チェック
  if (risks.some(r => r.type === 'airport_proximity')) {
    const cat = APPLICATION_CATEGORIES.AIRPORT;
    applications.push({
      type: 'AIRPORT',
      name: cat.name,
      required: true,
      estimatedDays: cat.baseDays,
      reason: '空港制限区域内での飛行'
    });
    totalDays = Math.max(totalDays, cat.baseDays);
    cat.documents.forEach(d => allDocuments.add(d));
    allCoordination.push(...cat.coordination);
  }

  // 高高度チェック
  if (risks.some(r => r.type === 'high_altitude')) {
    const cat = APPLICATION_CATEGORIES.HIGH_ALTITUDE;
    applications.push({
      type: 'HIGH_ALTITUDE',
      name: cat.name,
      required: true,
      estimatedDays: cat.baseDays,
      reason: '150m超の飛行高度'
    });
    totalDays = Math.max(totalDays, cat.baseDays);
    cat.documents.forEach(d => allDocuments.add(d));
    allCoordination.push(...cat.coordination);
  }

  // BVLOS（目視外）は常に追加（ドローン飛行の一般的なケース）
  const bvlosCat = APPLICATION_CATEGORIES.BVLOS;
  applications.push({
    type: 'BVLOS',
    name: bvlosCat.name,
    required: true,
    estimatedDays: bvlosCat.baseDays,
    reason: '目視外飛行の標準申請'
  });
  totalDays = Math.max(totalDays, bvlosCat.baseDays);
  bvlosCat.documents.forEach(d => allDocuments.add(d));

  // コスト計算（申請自体は無料だが関連費用を算出）
  const coordinationCost = allCoordination.length * 5000; // 調整コスト概算
  totalCost = coordinationCost;

  return {
    applications,
    totalEstimatedDays: totalDays,
    totalEstimatedCost: totalCost,
    requiredDocuments: [...allDocuments],
    coordination: allCoordination,
    timeline: generateTimeline(applications, totalDays),
    tips: [
      '包括申請（1年有効）があれば個別申請が不要な場合があります',
      'DIPS2.0での事前登録で申請がスムーズに',
      '第二種機体認証で一部許可が不要に'
    ]
  };
};

/**
 * 申請タイムラインを生成
 */
const generateTimeline = (applications, totalDays) => {
  const timeline = [];
  const today = new Date();

  timeline.push({
    day: 0,
    date: today.toISOString().split('T')[0],
    event: '申請準備開始',
    tasks: ['書類準備', '関係者連絡']
  });

  if (applications.some(a => a.type === 'AIRPORT')) {
    timeline.push({
      day: 1,
      date: addDays(today, 1).toISOString().split('T')[0],
      event: '空港事務所連絡',
      tasks: ['事前調整依頼', '飛行計画共有']
    });
  }

  timeline.push({
    day: 3,
    date: addDays(today, 3).toISOString().split('T')[0],
    event: 'DIPS申請',
    tasks: ['オンライン申請', '書類アップロード']
  });

  timeline.push({
    day: totalDays,
    date: addDays(today, totalDays).toISOString().split('T')[0],
    event: '承認予定',
    tasks: ['飛行許可取得', '最終確認']
  });

  return timeline;
};

const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

// ===== UTM (空域管理) 干渉チェック =====

/**
 * 既存のUTM登録飛行（シミュレーションデータ）
 */
const SIMULATED_UTM_FLIGHTS = [
  {
    id: 'UTM-2024-001',
    operator: '○○測量株式会社',
    area: { lat: 35.68, lng: 139.76, radius: 500 },
    altitude: { min: 30, max: 100 },
    timeSlots: ['09:00-12:00', '14:00-17:00'],
    purpose: '測量飛行'
  },
  {
    id: 'UTM-2024-002',
    operator: '△△点検サービス',
    area: { lat: 35.55, lng: 139.78, radius: 1000 },
    altitude: { min: 50, max: 150 },
    timeSlots: ['10:00-15:00'],
    purpose: 'インフラ点検'
  }
];

/**
 * UTM干渉チェック
 * @param {Object} flightPlan - フライトプラン
 * @param {Object} options - オプション（時間帯など）
 * @returns {Object} 干渉チェック結果
 */
export const checkUTMConflicts = (flightPlan, options = {}) => {
  const { center } = flightPlan;
  const { plannedTime = '10:00-12:00', altitude = 50 } = options;

  if (!center) {
    return {
      checked: false,
      conflicts: [],
      warnings: [],
      clearForFlight: true,
      message: '位置情報がないためUTMチェックをスキップ'
    };
  }

  const conflicts = [];
  const warnings = [];

  for (const flight of SIMULATED_UTM_FLIGHTS) {
    const distance = getDistanceMeters(center.lat, center.lng, flight.area.lat, flight.area.lng);

    // 距離チェック
    if (distance < flight.area.radius + 500) { // 500mバッファ
      // 時間重複チェック
      const timeOverlap = checkTimeOverlap(plannedTime, flight.timeSlots);

      // 高度重複チェック
      const altitudeOverlap = altitude >= flight.altitude.min - 30 &&
        altitude <= flight.altitude.max + 30;

      if (timeOverlap && altitudeOverlap) {
        conflicts.push({
          id: flight.id,
          severity: 'WARNING',
          operator: flight.operator,
          purpose: flight.purpose,
          distance: Math.round(distance),
          timeSlots: flight.timeSlots,
          recommendation: '時間帯の変更または事前調整を推奨'
        });
      } else if (distance < flight.area.radius) {
        warnings.push({
          id: flight.id,
          severity: 'INFO',
          operator: flight.operator,
          distance: Math.round(distance),
          message: '同エリアで他の飛行予定あり（時間帯は異なる）'
        });
      }
    }
  }

  return {
    checked: true,
    conflicts,
    warnings,
    clearForFlight: conflicts.length === 0,
    totalConflicts: conflicts.length,
    totalWarnings: warnings.length,
    recommendations: conflicts.length > 0
      ? ['他オペレーターとの事前調整を推奨', '飛行時間帯の変更を検討']
      : warnings.length > 0
        ? ['念のため周辺オペレーターへの通知を推奨']
        : ['UTM干渉なし、安全に飛行可能'],
    message: conflicts.length > 0
      ? `${conflicts.length}件の飛行計画と重複の可能性があります`
      : 'UTM干渉は検出されませんでした'
  };
};

/**
 * 時間帯の重複をチェック
 */
const checkTimeOverlap = (plannedTime, existingSlots) => {
  const [plannedStart, plannedEnd] = plannedTime.split('-').map(t => parseInt(t.replace(':', '')));

  for (const slot of existingSlots) {
    const [slotStart, slotEnd] = slot.split('-').map(t => parseInt(t.replace(':', '')));
    if (plannedStart < slotEnd && plannedEnd > slotStart) {
      return true;
    }
  }
  return false;
};

// ===== 機体推奨ロジック =====

/**
 * 機体データベース
 */
const AIRCRAFT_DATABASE = [
  {
    id: 'matrice-300-rtk',
    model: 'DJI Matrice 300 RTK',
    manufacturer: 'DJI',
    category: 'enterprise',
    specs: {
      maxFlightTime: 55,
      maxPayload: 2700, // g
      maxSpeed: 23, // m/s
      maxAltitude: 5000, // m
      windResistance: 15, // m/s
      operatingTemp: [-20, 50],
      rtk: true,
      thermalCamera: true
    },
    suitableFor: ['survey', 'inspection', 'mapping', 'thermal'],
    price: 'high',
    pros: ['長時間飛行', 'RTK高精度', 'マルチペイロード', '耐風性'],
    cons: ['高価格', '大型で運搬に注意']
  },
  {
    id: 'mavic-3-enterprise',
    model: 'DJI Mavic 3 Enterprise',
    manufacturer: 'DJI',
    category: 'enterprise',
    specs: {
      maxFlightTime: 45,
      maxPayload: 0,
      maxSpeed: 21,
      maxAltitude: 6000,
      windResistance: 12,
      operatingTemp: [-10, 40],
      rtk: true,
      thermalCamera: true
    },
    suitableFor: ['inspection', 'survey', 'thermal', 'general'],
    price: 'medium',
    pros: ['コンパクト', '持ち運び容易', '熱画像対応', 'RTKオプション'],
    cons: ['ペイロード不可', '大型機より飛行時間短め']
  },
  {
    id: 'phantom-4-rtk',
    model: 'DJI Phantom 4 RTK',
    manufacturer: 'DJI',
    category: 'survey',
    specs: {
      maxFlightTime: 30,
      maxPayload: 0,
      maxSpeed: 16,
      maxAltitude: 6000,
      windResistance: 10,
      operatingTemp: [0, 40],
      rtk: true,
      thermalCamera: false
    },
    suitableFor: ['survey', 'mapping', 'photogrammetry'],
    price: 'medium',
    pros: ['測量特化', '高精度RTK', 'PPK対応', '実績豊富'],
    cons: ['熱画像なし', '限定的な用途']
  },
  {
    id: 'matrice-30t',
    model: 'DJI Matrice 30T',
    manufacturer: 'DJI',
    category: 'enterprise',
    specs: {
      maxFlightTime: 41,
      maxPayload: 0,
      maxSpeed: 23,
      maxAltitude: 7000,
      windResistance: 15,
      operatingTemp: [-20, 50],
      rtk: true,
      thermalCamera: true
    },
    suitableFor: ['inspection', 'thermal', 'search', 'emergency'],
    price: 'high',
    pros: ['熱画像内蔵', '高耐久性', '全天候対応', 'ズームカメラ'],
    cons: ['高価格']
  },
  {
    id: 'mavic-3t',
    model: 'DJI Mavic 3T',
    manufacturer: 'DJI',
    category: 'thermal',
    specs: {
      maxFlightTime: 45,
      maxPayload: 0,
      maxSpeed: 21,
      maxAltitude: 6000,
      windResistance: 12,
      operatingTemp: [-10, 40],
      rtk: false,
      thermalCamera: true
    },
    suitableFor: ['thermal', 'inspection', 'solar'],
    price: 'medium',
    pros: ['熱画像特化', 'コンパクト', 'コスパ良好'],
    cons: ['RTKなし', '測量には不向き']
  }
];

/**
 * ミッションに最適な機体を推奨
 * @param {string} purpose - ミッション目的
 * @param {Object} requirements - 要件（飛行時間、高度など）
 * @returns {Array} 推奨機体リスト
 */
export const recommendAircraft = (purpose, requirements = {}) => {
  const { flightTime = 30, altitude = 50, needsThermal = false, needsRTK = false } = requirements;

  const purposeLower = purpose.toLowerCase();
  let missionType = 'general';

  // ミッションタイプの判定
  if (purposeLower.includes('太陽光') || purposeLower.includes('ソーラー') || purposeLower.includes('熱')) {
    missionType = 'thermal';
  } else if (purposeLower.includes('測量') || purposeLower.includes('3d') || purposeLower.includes('マッピング')) {
    missionType = 'survey';
  } else if (purposeLower.includes('点検') || purposeLower.includes('送電') || purposeLower.includes('インフラ')) {
    missionType = 'inspection';
  }

  const scoredAircraft = AIRCRAFT_DATABASE.map(aircraft => {
    let score = 50; // ベーススコア
    const matchReasons = [];
    const limitations = [];

    // ミッションタイプマッチ
    if (aircraft.suitableFor.includes(missionType)) {
      score += 30;
      matchReasons.push(`${missionType}ミッションに適合`);
    }

    // 飛行時間要件
    if (aircraft.specs.maxFlightTime >= flightTime) {
      score += 10;
      matchReasons.push(`飛行時間${aircraft.specs.maxFlightTime}分で要件を満たす`);
    } else {
      score -= 20;
      limitations.push(`飛行時間${aircraft.specs.maxFlightTime}分は要件未満`);
    }

    // 熱画像要件
    if (needsThermal || missionType === 'thermal') {
      if (aircraft.specs.thermalCamera) {
        score += 20;
        matchReasons.push('熱画像カメラ搭載');
      } else {
        score -= 30;
        limitations.push('熱画像カメラなし');
      }
    }

    // RTK要件
    if (needsRTK || missionType === 'survey') {
      if (aircraft.specs.rtk) {
        score += 15;
        matchReasons.push('RTK対応で高精度');
      } else {
        score -= 15;
        limitations.push('RTK非対応');
      }
    }

    // 価格スコア（中価格帯にボーナス）
    if (aircraft.price === 'medium') {
      score += 5;
      matchReasons.push('コストパフォーマンス良好');
    }

    return {
      ...aircraft,
      suitability: Math.max(0, Math.min(100, score)),
      matchReasons,
      limitations: [...aircraft.cons, ...limitations]
    };
  });

  // スコア順にソート
  return scoredAircraft
    .sort((a, b) => b.suitability - a.suitability)
    .slice(0, 3) // 上位3機種
    .map(a => ({
      model: a.model,
      manufacturer: a.manufacturer,
      suitability: a.suitability,
      reasons: a.matchReasons,
      limitations: a.limitations,
      specs: {
        flightTime: `${a.specs.maxFlightTime}分`,
        windResistance: `${a.specs.windResistance}m/s`,
        rtk: a.specs.rtk,
        thermal: a.specs.thermalCamera
      }
    }));
};

/**
 * ポリゴンの中心座標を計算
 */
export const getPolygonCenter = (polygon) => {
  if (!polygon?.geometry?.coordinates?.[0]) return null;

  const coords = polygon.geometry.coordinates[0];
  const lats = coords.map(c => c[1]);
  const lngs = coords.map(c => c[0]);

  return {
    lat: (Math.min(...lats) + Math.max(...lats)) / 2,
    lng: (Math.min(...lngs) + Math.max(...lngs)) / 2
  };
};

/**
 * ポリゴンの面積を計算（平方メートル）
 */
export const getPolygonArea = (polygon) => {
  if (!polygon?.geometry) return 0;

  try {
    const turfPolygon = turf.polygon(polygon.geometry.coordinates);
    return turf.area(turfPolygon);
  } catch {
    return 0;
  }
};

/**
 * 全Waypointの空域制限をチェック
 */
export const checkAllWaypointsRestrictions = (waypoints) => {
  const allRestrictions = [];
  const checkedZones = new Set();

  for (const wp of waypoints) {
    const restrictions = checkAirspaceRestrictions(wp.lat, wp.lng);
    for (const r of restrictions) {
      const key = `${r.type}-${r.name}`;
      if (!checkedZones.has(key)) {
        checkedZones.add(key);
        allRestrictions.push(r);
      }
    }
  }

  return allRestrictions;
};

/**
 * 最寄りの空港を検索
 */
export const findNearestAirport = (lat, lng) => {
  let nearest = null;
  let minDistance = Infinity;

  for (const airport of AIRPORT_ZONES) {
    const distance = getDistanceMeters(lat, lng, airport.lat, airport.lng);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = { ...airport, distance: Math.round(distance) };
    }
  }

  return nearest;
};

// getDistanceMetersをエクスポート
export { getDistanceMeters };

/**
 * 制限区域から安全な位置を計算
 * @param {number} lat - 現在の緯度
 * @param {number} lng - 現在の経度
 * @param {Object} zone - 制限区域（lat, lng, radius）
 * @param {number} safetyMargin - 安全マージン（メートル）
 * @returns {Object} 安全な位置 {lat, lng, distance}
 */
const calculateSafePosition = (lat, lng, zone, safetyMargin = 500) => {
  const distance = getDistanceMeters(lat, lng, zone.lat, zone.lng);
  const requiredDistance = zone.radius + safetyMargin;

  if (distance >= requiredDistance) {
    // すでに安全な位置
    return { lat, lng, distance: 0, safe: true };
  }

  // 制限区域の中心から外側に移動するベクトルを計算
  const bearing = Math.atan2(
    lng - zone.lng,
    lat - zone.lat
  );

  // 必要な移動距離
  const moveDistance = requiredDistance - distance;

  // メートルを度に変換（近似）
  const latOffset = (moveDistance * Math.cos(bearing)) / 111320;
  const lngOffset = (moveDistance * Math.sin(bearing)) / (111320 * Math.cos(lat * Math.PI / 180));

  return {
    lat: lat + latOffset,
    lng: lng + lngOffset,
    distance: Math.round(moveDistance),
    safe: false,
    reason: `${zone.name}から${safetyMargin}m以上離れる必要があります`
  };
};

/**
 * Waypointのギャップ分析と推奨位置を計算
 * @param {Array} waypoints - 現在のWaypoint配列
 * @returns {Object} ギャップ分析結果
 */
export const analyzeWaypointGaps = (waypoints) => {
  const gaps = [];
  const recommendedWaypoints = [];
  let hasIssues = false;

  for (const wp of waypoints) {
    let currentWp = { ...wp };
    let issues = [];
    let recommendedPosition = null;

    // 空港制限区域チェック
    for (const airport of AIRPORT_ZONES) {
      const distance = getDistanceMeters(wp.lat, wp.lng, airport.lat, airport.lng);
      if (distance < airport.radius) {
        hasIssues = true;
        const safePos = calculateSafePosition(wp.lat, wp.lng, airport, 500);
        issues.push({
          type: 'airport',
          zone: airport.name,
          currentDistance: Math.round(distance),
          requiredDistance: airport.radius + 500,
          severity: 'high'
        });
        if (!recommendedPosition || safePos.distance > recommendedPosition.distance) {
          recommendedPosition = safePos;
        }
      }
    }

    // 飛行禁止区域チェック
    for (const zone of NO_FLY_ZONES) {
      const distance = getDistanceMeters(wp.lat, wp.lng, zone.lat, zone.lng);
      if (distance < zone.radius + 300) { // 禁止区域は300mマージン
        hasIssues = true;
        const safePos = calculateSafePosition(wp.lat, wp.lng, zone, 300);
        issues.push({
          type: 'prohibited',
          zone: zone.name,
          currentDistance: Math.round(distance),
          requiredDistance: zone.radius + 300,
          severity: 'critical'
        });
        if (!recommendedPosition || safePos.distance > recommendedPosition.distance) {
          recommendedPosition = safePos;
        }
      }
    }

    if (issues.length > 0) {
      gaps.push({
        waypointId: wp.id,
        waypointIndex: wp.index,
        current: { lat: wp.lat, lng: wp.lng },
        recommended: recommendedPosition ? {
          lat: recommendedPosition.lat,
          lng: recommendedPosition.lng
        } : null,
        moveDistance: recommendedPosition?.distance || 0,
        issues
      });

      recommendedWaypoints.push({
        ...wp,
        lat: recommendedPosition?.lat || wp.lat,
        lng: recommendedPosition?.lng || wp.lng,
        modified: !!recommendedPosition
      });
    } else {
      recommendedWaypoints.push({ ...wp, modified: false });
    }
  }

  return {
    hasIssues,
    totalGaps: gaps.length,
    gaps,
    recommendedWaypoints,
    summary: hasIssues
      ? `${gaps.length}個のWaypointに問題があります`
      : 'すべてのWaypointは安全な位置にあります'
  };
};

/**
 * ポリゴンのギャップ分析と推奨形状を計算
 * @param {Object} polygon - 現在のポリゴン
 * @returns {Object} ギャップ分析結果
 */
export const analyzePolygonGaps = (polygon) => {
  if (!polygon?.geometry?.coordinates?.[0]) {
    return { hasIssues: false, gaps: [], recommendedPolygon: null };
  }

  const coords = polygon.geometry.coordinates[0];
  const gaps = [];
  const recommendedCoords = [];
  let hasIssues = false;

  for (let i = 0; i < coords.length - 1; i++) { // 最後の座標は最初と同じなので除外
    const [lng, lat] = coords[i];
    let issues = [];
    let recommendedPosition = { lat, lng };

    // 空港制限区域チェック
    for (const airport of AIRPORT_ZONES) {
      const distance = getDistanceMeters(lat, lng, airport.lat, airport.lng);
      if (distance < airport.radius) {
        hasIssues = true;
        const safePos = calculateSafePosition(lat, lng, airport, 500);
        issues.push({
          type: 'airport',
          zone: airport.name,
          currentDistance: Math.round(distance),
          severity: 'high'
        });
        recommendedPosition = { lat: safePos.lat, lng: safePos.lng };
      }
    }

    // 飛行禁止区域チェック
    for (const zone of NO_FLY_ZONES) {
      const distance = getDistanceMeters(lat, lng, zone.lat, zone.lng);
      if (distance < zone.radius + 300) {
        hasIssues = true;
        const safePos = calculateSafePosition(lat, lng, zone, 300);
        issues.push({
          type: 'prohibited',
          zone: zone.name,
          currentDistance: Math.round(distance),
          severity: 'critical'
        });
        recommendedPosition = { lat: safePos.lat, lng: safePos.lng };
      }
    }

    if (issues.length > 0) {
      gaps.push({
        vertexIndex: i,
        current: { lat, lng },
        recommended: recommendedPosition,
        issues
      });
    }

    recommendedCoords.push([recommendedPosition.lng, recommendedPosition.lat]);
  }

  // ポリゴンを閉じる
  if (recommendedCoords.length > 0) {
    recommendedCoords.push([...recommendedCoords[0]]);
  }

  const recommendedPolygon = hasIssues ? {
    ...polygon,
    geometry: {
      ...polygon.geometry,
      coordinates: [recommendedCoords]
    }
  } : null;

  return {
    hasIssues,
    totalGaps: gaps.length,
    gaps,
    recommendedPolygon,
    summary: hasIssues
      ? `${gaps.length}個の頂点に問題があります`
      : 'ポリゴンは安全なエリア内にあります'
  };
};

/**
 * 総合的なプラン最適化提案を生成
 * @param {Array} polygons - ポリゴン配列
 * @param {Array} waypoints - Waypoint配列
 * @returns {Object} 最適化提案
 */
export const generateOptimizationPlan = (polygons, waypoints) => {
  const waypointAnalysis = analyzeWaypointGaps(waypoints);
  const polygonAnalysis = polygons.length > 0 ? analyzePolygonGaps(polygons[0]) : null;

  const hasAnyIssues = waypointAnalysis.hasIssues || polygonAnalysis?.hasIssues;

  return {
    hasIssues: hasAnyIssues,
    waypointAnalysis,
    polygonAnalysis,
    recommendedWaypoints: waypointAnalysis.recommendedWaypoints,
    recommendedPolygon: polygonAnalysis?.recommendedPolygon,
    summary: hasAnyIssues
      ? '安全性向上のための修正が提案されています'
      : '現在のプランは安全基準を満たしています',
    actions: hasAnyIssues ? [
      waypointAnalysis.hasIssues ? `${waypointAnalysis.totalGaps}個のWaypointを移動` : null,
      polygonAnalysis?.hasIssues ? `ポリゴンの${polygonAnalysis.totalGaps}頂点を調整` : null
    ].filter(Boolean) : []
  };
};

/**
 * ローカルリスク判定（OpenAI不要）
 */
export const analyzeFlightPlanLocal = async (polygons, waypoints, options = {}) => {
  const { altitude = 50, purpose = '' } = options;

  // 基本情報収集
  const polygon = polygons[0];
  const center = polygon ? getPolygonCenter(polygon) : null;
  const areaSqMeters = polygon ? getPolygonArea(polygon) : 0;

  // 空域制限チェック
  const restrictions = waypoints.length > 0
    ? checkAllWaypointsRestrictions(waypoints)
    : center
      ? checkAirspaceRestrictions(center.lat, center.lng)
      : [];

  // 最寄り空港
  const nearestAirport = center ? findNearestAirport(center.lat, center.lng) : null;

  // DID判定（国土地理院タイルから取得）
  const didInfo = center ? await checkDIDArea(center.lat, center.lng) : null;

  // リスクスコア計算
  let riskScore = 0;
  const risks = [];

  // DIDチェック
  if (didInfo?.isDID) {
    riskScore += 25;
    risks.push({
      type: 'did_area',
      description: `人口集中地区（${didInfo.area}）`,
      severity: 'medium'
    });
  }

  // 禁止区域チェック
  const criticalZones = restrictions.filter(r => r.severity === 'critical');
  if (criticalZones.length > 0) {
    riskScore += 80;
    risks.push({
      type: 'prohibited_zone',
      description: `飛行禁止区域内: ${criticalZones.map(z => z.name).join(', ')}`,
      severity: 'critical'
    });
  }

  // 空港近接チェック
  const airportZones = restrictions.filter(r => r.type === 'airport');
  if (airportZones.length > 0) {
    riskScore += 50;
    risks.push({
      type: 'airport_proximity',
      description: `空港制限区域内: ${airportZones.map(z => `${z.name}(${z.distance}m)`).join(', ')}`,
      severity: 'high'
    });
  } else if (nearestAirport && nearestAirport.distance < 15000) {
    riskScore += 20;
    risks.push({
      type: 'airport_nearby',
      description: `空港が近隣: ${nearestAirport.name}まで${(nearestAirport.distance / 1000).toFixed(1)}km`,
      severity: 'medium'
    });
  }

  // 高度チェック
  if (altitude > 150) {
    riskScore += 30;
    risks.push({
      type: 'high_altitude',
      description: `飛行高度${altitude}mは150m超過（航空法制限）`,
      severity: 'high'
    });
  } else if (altitude > 100) {
    riskScore += 10;
    risks.push({
      type: 'altitude_warning',
      description: `飛行高度${altitude}m - 注意が必要`,
      severity: 'low'
    });
  }

  // リスクレベル判定
  let riskLevel;
  if (riskScore >= 80) riskLevel = 'CRITICAL';
  else if (riskScore >= 50) riskLevel = 'HIGH';
  else if (riskScore >= 20) riskLevel = 'MEDIUM';
  else riskLevel = 'LOW';

  // 推奨事項
  const recommendations = [];
  if (riskLevel === 'CRITICAL') {
    recommendations.push('この区域での飛行は禁止されています');
    recommendations.push('別の飛行エリアを検討してください');
  } else if (riskLevel === 'HIGH') {
    recommendations.push('事前に空港事務所への連絡が必要です');
    recommendations.push('DIPS2.0での飛行計画登録を行ってください');
  } else if (riskLevel === 'MEDIUM') {
    recommendations.push('包括申請の範囲内か確認してください');
    recommendations.push('飛行前に最新のNOTAMを確認してください');
  } else {
    recommendations.push('標準的な安全対策で飛行可能です');
  }

  // 必要な許可
  const requiredPermissions = [];
  if (didInfo?.isDID) {
    requiredPermissions.push('DID（人口集中地区）上空の飛行許可');
  }
  if (airportZones.length > 0) {
    requiredPermissions.push('空港等周辺飛行の許可・承認');
  }
  if (altitude > 150) {
    requiredPermissions.push('150m以上の高度での飛行許可');
  }

  // 機体推奨
  const aircraftRecommendations = purpose ? recommendAircraft(purpose, { altitude }) : null;

  // UTMチェック
  const utmCheck = center ? checkUTMConflicts({ center }, { altitude }) : null;

  return {
    riskLevel,
    riskScore: Math.min(100, riskScore),
    summary: riskLevel === 'CRITICAL'
      ? '飛行禁止区域です'
      : riskLevel === 'HIGH'
        ? '高リスク - 許可が必要です'
        : riskLevel === 'MEDIUM'
          ? '中リスク - 確認が必要です'
          : '低リスク - 飛行可能です',
    risks,
    recommendations,
    requiredPermissions,
    estimatedApprovalDays: riskLevel === 'HIGH' ? 14 : riskLevel === 'MEDIUM' ? 10 : 0,
    safetyChecklist: [
      '飛行前の機体点検',
      '気象条件の確認（風速5m/s以下推奨）',
      'バッテリー残量の確認',
      '第三者への注意喚起'
    ],
    aircraftRecommendations,
    utmCheck,
    context: {
      center,
      areaSqMeters,
      restrictions,
      nearestAirport,
      didInfo,
      waypointCount: waypoints.length
    }
  };
};

/**
 * 総合フライト分析（OpenAI連携 + 国土交通省API連携）
 */
export const runFullAnalysis = async (polygons, waypoints, options = {}) => {
  const { altitude = 50, purpose = '', useAI = true, useMlit = true } = options;

  // まずローカル分析を実行
  const localAnalysis = await analyzeFlightPlanLocal(polygons, waypoints, { altitude, purpose });

  // 国土交通省APIで用途地域情報を取得
  let mlitInfo = null;
  if (useMlit && hasReinfolibApiKey() && localAnalysis.context.center) {
    try {
      mlitInfo = await getLocationInfo(
        localAnalysis.context.center.lat,
        localAnalysis.context.center.lng
      );

      if (mlitInfo.success) {
        // 国土交通省データからのリスクを追加
        mlitInfo.riskFactors.forEach(factor => {
          localAnalysis.risks.push(factor);
        });

        // リスクスコアを調整
        if (mlitInfo.riskLevel === 'HIGH') {
          localAnalysis.riskScore = Math.min(100, localAnalysis.riskScore + 30);
        } else if (mlitInfo.riskLevel === 'MEDIUM') {
          localAnalysis.riskScore = Math.min(100, localAnalysis.riskScore + 15);
        }

        // リスクレベルを再判定
        if (localAnalysis.riskScore >= 80) localAnalysis.riskLevel = 'CRITICAL';
        else if (localAnalysis.riskScore >= 50) localAnalysis.riskLevel = 'HIGH';
        else if (localAnalysis.riskScore >= 20) localAnalysis.riskLevel = 'MEDIUM';

        // 推奨事項を追加
        localAnalysis.recommendations = [
          ...mlitInfo.recommendations,
          ...localAnalysis.recommendations
        ];
      }
    } catch (error) {
      console.warn('[FlightAnalyzer] MLIT API error:', error);
    }
  }

  // コンテキストに国土交通省データを追加
  localAnalysis.context.mlitInfo = mlitInfo;

  // OpenAI APIキーがない、またはuseAI=falseの場合はローカル結果のみ
  if (!useAI || !hasApiKey()) {
    return {
      ...localAnalysis,
      source: hasReinfolibApiKey() ? 'local+mlit' : 'local',
      aiEnhanced: false,
      mlitEnhanced: !!mlitInfo?.success
    };
  }

  // OpenAI連携分析
  try {
    const aiAnalysis = await analyzeFlightPlan({
      center: localAnalysis.context.center,
      areaSqMeters: localAnalysis.context.areaSqMeters,
      waypointCount: localAnalysis.context.waypointCount,
      restrictions: localAnalysis.context.restrictions,
      isDID: localAnalysis.context?.didInfo?.isDID || false,
      purpose,
      altitude,
      maxElevation: waypoints.length > 0
        ? Math.max(...waypoints.filter(w => w.elevation).map(w => w.elevation))
        : null
    });

    // ローカル分析とAI分析をマージ
    return {
      riskLevel: aiAnalysis.riskLevel || localAnalysis.riskLevel,
      riskScore: aiAnalysis.riskScore || localAnalysis.riskScore,
      summary: aiAnalysis.summary || localAnalysis.summary,
      risks: [...localAnalysis.risks, ...(aiAnalysis.risks || [])],
      recommendations: [...new Set([
        ...(aiAnalysis.recommendations || []),
        ...localAnalysis.recommendations
      ])],
      requiredPermissions: [...new Set([
        ...(aiAnalysis.requiredPermissions || []),
        ...localAnalysis.requiredPermissions
      ])],
      estimatedApprovalDays: aiAnalysis.estimatedApprovalDays || localAnalysis.estimatedApprovalDays,
      safetyChecklist: aiAnalysis.safetyChecklist || localAnalysis.safetyChecklist,
      context: localAnalysis.context,
      source: 'openai',
      aiEnhanced: true
    };
  } catch (error) {
    console.error('[FlightAnalyzer] AI analysis failed, using local:', error);
    return {
      ...localAnalysis,
      source: 'local',
      aiEnhanced: false,
      aiError: error.message
    };
  }
};

/**
 * 目的から推奨パラメータを取得
 */
export const getFlightRecommendations = async (purpose) => {
  if (!hasApiKey()) {
    // OpenAI未設定時のフォールバック
    return getLocalRecommendations(purpose);
  }

  try {
    return await getRecommendedParameters(purpose);
  } catch {
    return getLocalRecommendations(purpose);
  }
};

/**
 * ローカルの推奨パラメータ（OpenAI不要）
 */
const getLocalRecommendations = (purpose) => {
  const p = purpose.toLowerCase();

  if (p.includes('太陽光') || p.includes('パネル') || p.includes('ソーラー')) {
    return {
      pattern: 'grid',
      altitude: 30,
      speed: 5,
      overlap: 80,
      camera: 'thermal',
      recommendedAircraft: ['DJI Matrice 300 RTK + H20T', 'DJI Mavic 3T'],
      estimatedFlightTime: '約30-45分',
      tips: ['熱画像カメラでホットスポット検出', '午前中の撮影推奨（温度差が出やすい）']
    };
  }

  if (p.includes('送電線') || p.includes('鉄塔') || p.includes('架線')) {
    return {
      pattern: 'perimeter',
      altitude: 50,
      speed: 3,
      overlap: 70,
      camera: 'RGB',
      recommendedAircraft: ['DJI Matrice 300 RTK', 'DJI Matrice 30T'],
      estimatedFlightTime: '約20-30分',
      tips: ['架線との安全距離30m以上確保', '電力会社との事前調整必須']
    };
  }

  if (p.includes('測量') || p.includes('3d') || p.includes('オルソ')) {
    return {
      pattern: 'grid',
      altitude: 60,
      speed: 4,
      overlap: 85,
      camera: 'RGB',
      recommendedAircraft: ['DJI Phantom 4 RTK', 'DJI Matrice 300 RTK'],
      estimatedFlightTime: '約40-60分',
      tips: ['GCP設置で精度向上', 'PPK/RTK補正推奨']
    };
  }

  if (p.includes('建設') || p.includes('工事') || p.includes('現場')) {
    return {
      pattern: 'grid',
      altitude: 50,
      speed: 5,
      overlap: 75,
      camera: 'RGB',
      recommendedAircraft: ['DJI Mavic 3 Enterprise', 'DJI Matrice 30'],
      estimatedFlightTime: '約20-30分',
      tips: ['定期的な進捗記録に最適', '3D復元で出来高管理']
    };
  }

  // デフォルト
  return {
    pattern: 'perimeter',
    altitude: 50,
    speed: 5,
    overlap: 70,
    camera: 'RGB',
    recommendedAircraft: ['DJI Mavic 3 Enterprise', 'DJI Matrice 300 RTK'],
    estimatedFlightTime: '約20-30分',
    tips: ['周回パターンで概要把握', '必要に応じてグリッドに変更']
  };
};

export default {
  getPolygonCenter,
  getPolygonArea,
  checkAllWaypointsRestrictions,
  findNearestAirport,
  analyzeFlightPlanLocal,
  runFullAnalysis,
  getFlightRecommendations,
  analyzeWaypointGaps,
  analyzePolygonGaps,
  generateOptimizationPlan,
  // 新機能
  checkDIDArea,
  calculateApplicationCosts,
  checkUTMConflicts,
  recommendAircraft
};
