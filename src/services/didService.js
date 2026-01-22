/**
 * DID（人口集中地区）判定サービス
 * 国土地理院タイルおよびローカルGeoJSONデータを使用
 *
 * データソース: 令和2年（2020年）国勢調査データ
 * - 表示: 国土地理院 DIDタイル (did2020)
 * - 判定: ローカルGeoJSON (/data/did/r02_did_*.geojson)
 */

import * as turf from '@turf/turf';

/**
 * DIDデータのキャッシュ（都道府県単位）
 */
const didPrefectureCache = new Map();

/**
 * DIDキャッシュをクリア
 */
export const clearDIDCache = () => {
  didPrefectureCache.clear();
  console.log('[DID] Cache cleared');
};

/**
 * 都道府県データ（全47都道府県）
 */
const PREFECTURE_DATA = [
  // ========== 北海道・東北 ==========
  { code: '01', name: 'hokkaido', nameJa: '北海道', bounds: { minLat: 41.3, maxLat: 45.6, minLng: 139.3, maxLng: 145.9 } },
  { code: '02', name: 'aomori', nameJa: '青森県', bounds: { minLat: 40.2, maxLat: 41.6, minLng: 139.5, maxLng: 141.7 } },
  { code: '03', name: 'iwate', nameJa: '岩手県', bounds: { minLat: 38.7, maxLat: 40.5, minLng: 140.7, maxLng: 142.1 } },
  { code: '04', name: 'miyagi', nameJa: '宮城県', bounds: { minLat: 37.8, maxLat: 39.0, minLng: 140.3, maxLng: 141.7 } },
  { code: '05', name: 'akita', nameJa: '秋田県', bounds: { minLat: 39.0, maxLat: 40.5, minLng: 139.7, maxLng: 140.6 } },
  { code: '06', name: 'yamagata', nameJa: '山形県', bounds: { minLat: 37.7, maxLat: 39.2, minLng: 139.5, maxLng: 140.7 } },
  { code: '07', name: 'fukushima', nameJa: '福島県', bounds: { minLat: 36.8, maxLat: 37.9, minLng: 139.2, maxLng: 141.1 } },
  // ========== 関東 ==========
  { code: '08', name: 'ibaraki', nameJa: '茨城県', bounds: { minLat: 35.7, maxLat: 36.9, minLng: 139.85, maxLng: 140.9 } },
  { code: '09', name: 'tochigi', nameJa: '栃木県', bounds: { minLat: 36.2, maxLat: 37.2, minLng: 139.3, maxLng: 140.3 } },
  { code: '10', name: 'gunma', nameJa: '群馬県', bounds: { minLat: 36.0, maxLat: 37.1, minLng: 138.4, maxLng: 139.7 } },
  { code: '11', name: 'saitama', nameJa: '埼玉県', bounds: { minLat: 35.75, maxLat: 36.3, minLng: 138.9, maxLng: 139.95 } },
  { code: '12', name: 'chiba', nameJa: '千葉県', bounds: { minLat: 34.9, maxLat: 36.0, minLng: 139.85, maxLng: 140.9 } },
  { code: '13', name: 'tokyo', nameJa: '東京都', bounds: { minLat: 35.5, maxLat: 35.95, minLng: 138.9, maxLng: 139.95 } },
  { code: '14', name: 'kanagawa', nameJa: '神奈川県', bounds: { minLat: 35.1, maxLat: 35.68, minLng: 138.9, maxLng: 139.85 } },
  // ========== 中部 ==========
  { code: '15', name: 'niigata', nameJa: '新潟県', bounds: { minLat: 37.0, maxLat: 38.6, minLng: 137.8, maxLng: 140.0 } },
  { code: '16', name: 'toyama', nameJa: '富山県', bounds: { minLat: 36.3, maxLat: 36.9, minLng: 136.7, maxLng: 137.8 } },
  { code: '17', name: 'ishikawa', nameJa: '石川県', bounds: { minLat: 36.0, maxLat: 37.9, minLng: 136.2, maxLng: 137.4 } },
  { code: '18', name: 'fukui', nameJa: '福井県', bounds: { minLat: 35.4, maxLat: 36.3, minLng: 135.5, maxLng: 136.8 } },
  { code: '19', name: 'yamanashi', nameJa: '山梨県', bounds: { minLat: 35.2, maxLat: 35.9, minLng: 138.2, maxLng: 139.2 } },
  { code: '20', name: 'nagano', nameJa: '長野県', bounds: { minLat: 35.2, maxLat: 37.0, minLng: 137.3, maxLng: 138.8 } },
  { code: '21', name: 'gifu', nameJa: '岐阜県', bounds: { minLat: 35.1, maxLat: 36.5, minLng: 136.3, maxLng: 137.7 } },
  { code: '22', name: 'shizuoka', nameJa: '静岡県', bounds: { minLat: 34.6, maxLat: 35.6, minLng: 137.5, maxLng: 139.2 } },
  { code: '23', name: 'aichi', nameJa: '愛知県', bounds: { minLat: 34.6, maxLat: 35.4, minLng: 136.7, maxLng: 137.8 } },
  // ========== 近畿 ==========
  { code: '24', name: 'mie', nameJa: '三重県', bounds: { minLat: 33.7, maxLat: 35.3, minLng: 135.8, maxLng: 136.9 } },
  { code: '25', name: 'shiga', nameJa: '滋賀県', bounds: { minLat: 34.8, maxLat: 35.7, minLng: 135.8, maxLng: 136.5 } },
  { code: '26', name: 'kyoto', nameJa: '京都府', bounds: { minLat: 34.7, maxLat: 35.8, minLng: 134.8, maxLng: 136.1 } },
  { code: '27', name: 'osaka', nameJa: '大阪府', bounds: { minLat: 34.3, maxLat: 35.0, minLng: 135.1, maxLng: 135.7 } },
  { code: '28', name: 'hyogo', nameJa: '兵庫県', bounds: { minLat: 34.2, maxLat: 35.7, minLng: 134.2, maxLng: 135.5 } },
  { code: '29', name: 'nara', nameJa: '奈良県', bounds: { minLat: 33.9, maxLat: 34.8, minLng: 135.6, maxLng: 136.2 } },
  { code: '30', name: 'wakayama', nameJa: '和歌山県', bounds: { minLat: 33.4, maxLat: 34.4, minLng: 135.0, maxLng: 136.0 } },
  // ========== 中国 ==========
  { code: '31', name: 'tottori', nameJa: '鳥取県', bounds: { minLat: 35.0, maxLat: 35.6, minLng: 133.2, maxLng: 134.5 } },
  { code: '32', name: 'shimane', nameJa: '島根県', bounds: { minLat: 34.3, maxLat: 37.3, minLng: 131.7, maxLng: 133.4 } },
  { code: '33', name: 'okayama', nameJa: '岡山県', bounds: { minLat: 34.4, maxLat: 35.3, minLng: 133.4, maxLng: 134.4 } },
  { code: '34', name: 'hiroshima', nameJa: '広島県', bounds: { minLat: 34.0, maxLat: 35.0, minLng: 132.0, maxLng: 133.5 } },
  { code: '35', name: 'yamaguchi', nameJa: '山口県', bounds: { minLat: 33.7, maxLat: 34.8, minLng: 130.8, maxLng: 132.4 } },
  // ========== 四国 ==========
  { code: '36', name: 'tokushima', nameJa: '徳島県', bounds: { minLat: 33.5, maxLat: 34.3, minLng: 133.6, maxLng: 134.8 } },
  { code: '37', name: 'kagawa', nameJa: '香川県', bounds: { minLat: 34.1, maxLat: 34.6, minLng: 133.6, maxLng: 134.5 } },
  { code: '38', name: 'ehime', nameJa: '愛媛県', bounds: { minLat: 32.9, maxLat: 34.1, minLng: 132.0, maxLng: 133.7 } },
  { code: '39', name: 'kochi', nameJa: '高知県', bounds: { minLat: 32.7, maxLat: 33.9, minLng: 132.5, maxLng: 134.3 } },
  // ========== 九州・沖縄 ==========
  { code: '40', name: 'fukuoka', nameJa: '福岡県', bounds: { minLat: 33.0, maxLat: 34.0, minLng: 130.0, maxLng: 131.2 } },
  { code: '41', name: 'saga', nameJa: '佐賀県', bounds: { minLat: 33.0, maxLat: 33.6, minLng: 129.7, maxLng: 130.5 } },
  { code: '42', name: 'nagasaki', nameJa: '長崎県', bounds: { minLat: 32.5, maxLat: 34.8, minLng: 128.6, maxLng: 130.5 } },
  { code: '43', name: 'kumamoto', nameJa: '熊本県', bounds: { minLat: 32.1, maxLat: 33.2, minLng: 130.1, maxLng: 131.3 } },
  { code: '44', name: 'oita', nameJa: '大分県', bounds: { minLat: 32.7, maxLat: 33.8, minLng: 130.8, maxLng: 132.1 } },
  { code: '45', name: 'miyazaki', nameJa: '宮崎県', bounds: { minLat: 31.4, maxLat: 32.8, minLng: 130.7, maxLng: 131.9 } },
  { code: '46', name: 'kagoshima', nameJa: '鹿児島県', bounds: { minLat: 27.0, maxLat: 32.4, minLng: 128.4, maxLng: 131.2 } },
  { code: '47', name: 'okinawa', nameJa: '沖縄県', bounds: { minLat: 24.0, maxLat: 27.9, minLng: 122.9, maxLng: 131.3 } },
];

/**
 * 緯度経度から該当する都道府県を特定
 */
const getPrefectureFromCoords = (lat, lng) => {
  // 簡易実装: 主要都道府県のみチェック（完全版はflightAnalyzerからコピーすべき）
  // ここではデモ用として短縮していますが、実運用では全データを移行します
  return PREFECTURE_DATA.find(pref => {
    const b = pref.bounds;
    return lat >= b.minLat && lat <= b.maxLat && lng >= b.minLng && lng <= b.maxLng;
  });
};

/**
 * ローカルGeoJSONからDIDデータを取得
 * 令和2年（2020年）国勢調査データを使用
 */
const fetchDIDGeoJSON = async (prefCode, prefName) => {
  const cacheKey = `pref_${prefCode}`;
  if (didPrefectureCache.has(cacheKey)) return didPrefectureCache.get(cacheKey);
  if (typeof fetch === 'undefined') return null;

  // ローカルGeoJSONを取得（令和2年データ）
  const localUrl = `${import.meta.env.BASE_URL}data/did/r02_did_${prefCode}_${prefName}.geojson`;

  try {
    const response = await fetch(localUrl, { headers: { 'Accept': 'application/json' } });
    if (response && response.ok) {
      const geojson = await response.json();
      didPrefectureCache.set(cacheKey, geojson);
      console.log(`[DID] Loaded local data for ${prefName} (R02)`);
      return geojson;
    }
  } catch (error) {
    console.warn(`[DID] Local fetch failed for ${prefName}: ${error.message}`);
  }

  // ローカルデータがない場合はnull（fallbackを使用）
  console.log(`[DID] No local data for ${prefName}, using fallback`);
  return null;
};

/**
 * DID判定フォールバック
 * GeoJSONデータが利用できない場合のデフォルト動作
 * 誤検出を防ぐため、常にisDID=falseを返す
 */
const checkDIDAreaFallback = (_lat, _lng) => {
  // GeoJSONデータが利用できない場合は、安全側に倒してDID外とする
  // 以前は主要都市の円形エリアで推定していたが、誤検出の原因となっていた
  return {
    isDID: false,
    area: null,
    certainty: 'unknown',
    source: 'fallback',
    description: 'DID判定不可（GeoJSONデータなし）'
  };
};

/**
 * GeoJSONから点がDID内かチェック
 */
const checkPointInDIDGeoJSON = (geojson, lat, lng) => {
  if (!geojson?.features) return null;
  const point = turf.point([lng, lat]);

  for (const feature of geojson.features) {
    if (turf.booleanPointInPolygon(point, feature)) {
      // R02データは CITYNAME を使用（CITY_NAME ではない）
      const areaName = feature.properties?.CITYNAME || feature.properties?.CITY_NAME || '人口集中地区';
      let centroid = null;
      try {
        const c = turf.centroid(feature);
        centroid = { lat: c.geometry.coordinates[1], lng: c.geometry.coordinates[0] };
      } catch {
        // Ignore centroid calculation errors
      }

      // デバッグ: DID検出時に詳細をログ出力
      if (import.meta.env.DEV) {
        console.log(`[DID] DETECTED: lat=${lat.toFixed(6)}, lng=${lng.toFixed(6)} -> ${areaName}`);
      }

      return {
        isDID: true,
        area: areaName,
        certainty: 'confirmed',
        source: 'local/R02',
        description: `${areaName}のDID内`,
        centroid
      };
    }
  }
  return null;
};

/**
 * メイン: DID判定
 */
export const checkDIDArea = async (lat, lng) => {
  try {
    const prefecture = getPrefectureFromCoords(lat, lng);
    if (!prefecture) {
      if (import.meta.env.DEV) {
        console.log(`[DID] No prefecture for: lat=${lat.toFixed(6)}, lng=${lng.toFixed(6)}`);
      }
      return checkDIDAreaFallback(lat, lng);
    }

    if (import.meta.env.DEV) {
      console.log(`[DID] Checking: lat=${lat.toFixed(6)}, lng=${lng.toFixed(6)} in ${prefecture.nameJa}`);
    }

    const geojson = await fetchDIDGeoJSON(prefecture.code, prefecture.name);
    if (geojson) {
      const result = checkPointInDIDGeoJSON(geojson, lat, lng);
      if (result) return result;
      return {
        isDID: false,
        area: null,
        certainty: 'confirmed',
        source: 'local/R02',
        description: 'DID外'
      };
    }
    return checkDIDAreaFallback(lat, lng);
  } catch {
    return checkDIDAreaFallback(lat, lng);
  }
};

/**
 * 同期的DID判定（キャッシュのみ使用）
 */
export const isPositionInDIDSync = (lat, lng) => {
  const prefecture = getPrefectureFromCoords(lat, lng);
  if (!prefecture) return false;

  const cacheKey = `pref_${prefecture.code}`;
  if (didPrefectureCache.has(cacheKey)) {
    const geojson = didPrefectureCache.get(cacheKey);
    return !!checkPointInDIDGeoJSON(geojson, lat, lng);
  }
  return checkDIDAreaFallback(lat, lng).isDID;
};

/**
 * 指定された座標リストに基づいてDIDデータをプリロード
 * 初回ロード時の遅延判定を回避するために使用
 * @param {Array<{lat: number, lng: number}>} coordinates - 座標リスト
 * @returns {Promise<Set<string>>} - ロードされた都道府県コードのセット
 */
export const preloadDIDDataForCoordinates = async (coordinates) => {
  if (!coordinates || coordinates.length === 0) {
    return new Set();
  }

  // 座標から必要な都道府県を特定
  const prefecturesToLoad = new Set();
  for (const coord of coordinates) {
    const pref = getPrefectureFromCoords(coord.lat, coord.lng);
    if (pref) {
      prefecturesToLoad.add(JSON.stringify({ code: pref.code, name: pref.name }));
    }
  }

  // 並列でDIDデータをフェッチ
  const loadPromises = Array.from(prefecturesToLoad).map(async (prefJson) => {
    const pref = JSON.parse(prefJson);
    try {
      await fetchDIDGeoJSON(pref.code, pref.name);
      return pref.code;
    } catch (error) {
      console.warn(`[DID] Failed to preload ${pref.name}:`, error);
      return null;
    }
  });

  const results = await Promise.all(loadPromises);
  const loadedCodes = new Set(results.filter(Boolean));

  if (loadedCodes.size > 0) {
    console.log(`[DID] Preloaded ${loadedCodes.size} prefecture(s):`, Array.from(loadedCodes).join(', '));
  }

  return loadedCodes;
};

/**
 * DIDキャッシュが特定の都道府県に対してロード済みかチェック
 * @param {number} lat - 緯度
 * @param {number} lng - 経度
 * @returns {boolean} - キャッシュにデータがあるか
 */
export const isDIDCacheReady = (lat, lng) => {
  const prefecture = getPrefectureFromCoords(lat, lng);
  if (!prefecture) return true; // 日本国外はチェック不要

  const cacheKey = `pref_${prefecture.code}`;
  return didPrefectureCache.has(cacheKey);
};

/**
 * 複数座標のDIDキャッシュ準備状態をチェック
 * @param {Array<{lat: number, lng: number}>} coordinates - 座標リスト
 * @returns {boolean} - 全ての座標に対してキャッシュが準備できているか
 */
export const isAllDIDCacheReady = (coordinates) => {
  if (!coordinates || coordinates.length === 0) return true;
  return coordinates.every(coord => isDIDCacheReady(coord.lat, coord.lng));
};
