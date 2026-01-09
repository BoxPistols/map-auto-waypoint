/**
 * DID（人口集中地区）判定サービス
 * 国土地理院タイル（令和2年国勢調査）をピクセル判定で使用
 */

import * as turf from '@turf/turf';
import { getDistanceMeters } from '../utils/geoUtils';

// 国土地理院 DIDタイル URL（令和2年国勢調査データ）
const DID_TILE_URL = 'https://cyberjapandata.gsi.go.jp/xyz/did2020/{z}/{x}/{y}.png';
const DID_TILE_ZOOM = 14; // タイル判定に使用するズームレベル

/**
 * 緯度経度からタイル座標を計算
 */
const latLngToTile = (lat, lng, zoom) => {
  const n = Math.pow(2, zoom);
  const x = Math.floor((lng + 180) / 360 * n);
  const latRad = lat * Math.PI / 180;
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
  return { x, y, z: zoom };
};

/**
 * タイル内のピクセル座標を計算
 */
const latLngToPixelInTile = (lat, lng, zoom) => {
  const n = Math.pow(2, zoom);
  const xTile = (lng + 180) / 360 * n;
  const latRad = lat * Math.PI / 180;
  const yTile = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n;

  const pixelX = Math.floor((xTile % 1) * 256);
  const pixelY = Math.floor((yTile % 1) * 256);

  return { pixelX, pixelY };
};

/**
 * タイルキャッシュ（ImageDataを保存）
 */
const tileImageCache = new Map();

/**
 * ブラウザ環境かどうか判定
 */
const isBrowserEnvironment = () => {
  return typeof window !== 'undefined' &&
         typeof document !== 'undefined' &&
         typeof Image !== 'undefined' &&
         !import.meta.env?.VITEST; // テスト環境ではスキップ
};

/**
 * DIDタイルを取得してピクセル判定
 * ピンク色（R > 200, G < 150, B < 150）ならDID内
 */
const checkDIDByTile = async (lat, lng) => {
  // ブラウザ環境でない場合はスキップ
  if (!isBrowserEnvironment()) return null;

  const tile = latLngToTile(lat, lng, DID_TILE_ZOOM);
  const cacheKey = `${tile.z}/${tile.x}/${tile.y}`;

  let imageData = tileImageCache.get(cacheKey);

  if (!imageData) {
    try {
      const url = DID_TILE_URL
        .replace('{z}', tile.z)
        .replace('{x}', tile.x)
        .replace('{y}', tile.y);

      // Canvas APIでタイル画像を読み込み
      const img = new Image();
      img.crossOrigin = 'anonymous';

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
      });

      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      imageData = ctx.getImageData(0, 0, 256, 256);
      tileImageCache.set(cacheKey, imageData);
    } catch (error) {
      console.warn('[DID] Tile fetch error:', error.message);
      return null;
    }
  }

  const { pixelX, pixelY } = latLngToPixelInTile(lat, lng, DID_TILE_ZOOM);
  const idx = (pixelY * 256 + pixelX) * 4;

  const r = imageData.data[idx];
  const g = imageData.data[idx + 1];
  const b = imageData.data[idx + 2];
  const a = imageData.data[idx + 3];

  // 透明または白に近い場合はDID外
  if (a < 128) return { isDID: false, source: 'tile' };

  // ピンク/赤色（DIDエリア）の判定
  // GSI DIDタイルは濃いピンク色 (約 R:255, G:155, B:155)
  const isDIDPixel = r > 200 && g < 200 && b < 200 && r > g && r > b;

  return {
    isDID: isDIDPixel,
    source: 'GSI/did2020',
    certainty: 'confirmed',
    description: isDIDPixel ? 'DID内（令和2年国勢調査）' : 'DID外',
    pixel: { r, g, b, a }
  };
};

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
 * GitHub dronebird/DIDinJapan の命名規則に準拠
 */
const PREFECTURE_DATA = [
  { code: '01', name: 'hokkaido', nameJa: '北海道', bounds: { minLat: 41.3, maxLat: 45.6, minLng: 139.3, maxLng: 145.9 } },
  { code: '02', name: 'aomori', nameJa: '青森県', bounds: { minLat: 40.2, maxLat: 41.6, minLng: 139.5, maxLng: 141.7 } },
  { code: '03', name: 'iwate', nameJa: '岩手県', bounds: { minLat: 38.7, maxLat: 40.5, minLng: 140.7, maxLng: 142.1 } },
  { code: '04', name: 'miyagi', nameJa: '宮城県', bounds: { minLat: 37.8, maxLat: 39.0, minLng: 140.3, maxLng: 141.7 } },
  { code: '05', name: 'akita', nameJa: '秋田県', bounds: { minLat: 39.0, maxLat: 40.5, minLng: 139.7, maxLng: 140.6 } },
  { code: '06', name: 'yamagata', nameJa: '山形県', bounds: { minLat: 37.7, maxLat: 39.2, minLng: 139.5, maxLng: 140.7 } },
  { code: '07', name: 'fukushima', nameJa: '福島県', bounds: { minLat: 36.8, maxLat: 37.9, minLng: 139.2, maxLng: 141.1 } },
  { code: '08', name: 'ibaragi', nameJa: '茨城県', bounds: { minLat: 35.7, maxLat: 36.9, minLng: 139.7, maxLng: 140.9 } },
  { code: '09', name: 'tochigi', nameJa: '栃木県', bounds: { minLat: 36.2, maxLat: 37.2, minLng: 139.3, maxLng: 140.3 } },
  { code: '10', name: 'gunma', nameJa: '群馬県', bounds: { minLat: 36.0, maxLat: 37.1, minLng: 138.4, maxLng: 139.7 } },
  { code: '11', name: 'saitama', nameJa: '埼玉県', bounds: { minLat: 35.7, maxLat: 36.3, minLng: 138.9, maxLng: 140.0 } },
  { code: '12', name: 'chiba', nameJa: '千葉県', bounds: { minLat: 34.9, maxLat: 36.0, minLng: 139.7, maxLng: 140.9 } },
  { code: '13', name: 'tokyo', nameJa: '東京都', bounds: { minLat: 35.5, maxLat: 35.95, minLng: 138.9, maxLng: 139.95 } },
  { code: '14', name: 'kanagawa', nameJa: '神奈川県', bounds: { minLat: 35.1, maxLat: 35.68, minLng: 138.9, maxLng: 139.85 } },
  { code: '15', name: 'niigata', nameJa: '新潟県', bounds: { minLat: 37.0, maxLat: 38.6, minLng: 137.8, maxLng: 140.1 } },
  { code: '16', name: 'toyama', nameJa: '富山県', bounds: { minLat: 36.3, maxLat: 36.95, minLng: 136.7, maxLng: 137.8 } },
  { code: '17', name: 'kanazawa', nameJa: '石川県', bounds: { minLat: 36.0, maxLat: 37.9, minLng: 136.2, maxLng: 137.4 } },
  { code: '18', name: 'fukui', nameJa: '福井県', bounds: { minLat: 35.4, maxLat: 36.3, minLng: 135.5, maxLng: 136.9 } },
  { code: '19', name: 'yamanashi', nameJa: '山梨県', bounds: { minLat: 35.2, maxLat: 35.95, minLng: 138.2, maxLng: 139.2 } },
  { code: '20', name: 'nagano', nameJa: '長野県', bounds: { minLat: 35.2, maxLat: 37.0, minLng: 137.3, maxLng: 138.8 } },
  { code: '21', name: 'gifu', nameJa: '岐阜県', bounds: { minLat: 35.1, maxLat: 36.5, minLng: 136.3, maxLng: 137.7 } },
  { code: '22', name: 'shizuoka', nameJa: '静岡県', bounds: { minLat: 34.6, maxLat: 35.65, minLng: 137.5, maxLng: 139.2 } },
  { code: '23', name: 'aichi', nameJa: '愛知県', bounds: { minLat: 34.5, maxLat: 35.45, minLng: 136.7, maxLng: 137.85 } },
  { code: '24', name: 'mie', nameJa: '三重県', bounds: { minLat: 33.7, maxLat: 35.3, minLng: 135.85, maxLng: 136.95 } },
  { code: '25', name: 'shiga', nameJa: '滋賀県', bounds: { minLat: 34.85, maxLat: 35.7, minLng: 135.75, maxLng: 136.45 } },
  { code: '26', name: 'kyoto', nameJa: '京都府', bounds: { minLat: 34.8, maxLat: 35.8, minLng: 134.85, maxLng: 136.05 } },
  { code: '27', name: 'osaka', nameJa: '大阪府', bounds: { minLat: 34.25, maxLat: 35.05, minLng: 135.1, maxLng: 135.75 } },
  { code: '28', name: 'hyogo', nameJa: '兵庫県', bounds: { minLat: 34.15, maxLat: 35.7, minLng: 134.25, maxLng: 135.5 } },
  { code: '29', name: 'nara', nameJa: '奈良県', bounds: { minLat: 33.85, maxLat: 34.75, minLng: 135.6, maxLng: 136.25 } },
  { code: '30', name: 'wakayama', nameJa: '和歌山県', bounds: { minLat: 33.4, maxLat: 34.4, minLng: 135.0, maxLng: 136.0 } },
  { code: '31', name: 'tottori', nameJa: '鳥取県', bounds: { minLat: 35.0, maxLat: 35.65, minLng: 133.15, maxLng: 134.55 } },
  { code: '32', name: 'shimane', nameJa: '島根県', bounds: { minLat: 34.3, maxLat: 37.3, minLng: 131.65, maxLng: 133.4 } },
  { code: '33', name: 'okayama', nameJa: '岡山県', bounds: { minLat: 34.35, maxLat: 35.35, minLng: 133.25, maxLng: 134.45 } },
  { code: '34', name: 'hiroshima', nameJa: '広島県', bounds: { minLat: 34.05, maxLat: 35.0, minLng: 132.05, maxLng: 133.45 } },
  { code: '35', name: 'yamaguchi', nameJa: '山口県', bounds: { minLat: 33.7, maxLat: 34.8, minLng: 130.8, maxLng: 132.25 } },
  { code: '36', name: 'tokushima', nameJa: '徳島県', bounds: { minLat: 33.5, maxLat: 34.3, minLng: 133.55, maxLng: 134.8 } },
  { code: '37', name: 'kagawa', nameJa: '香川県', bounds: { minLat: 34.0, maxLat: 34.55, minLng: 133.55, maxLng: 134.5 } },
  { code: '38', name: 'ehime', nameJa: '愛媛県', bounds: { minLat: 32.9, maxLat: 34.15, minLng: 132.0, maxLng: 133.7 } },
  { code: '39', name: 'kochi', nameJa: '高知県', bounds: { minLat: 32.7, maxLat: 33.9, minLng: 132.5, maxLng: 134.35 } },
  { code: '40', name: 'fukuoka', nameJa: '福岡県', bounds: { minLat: 33.0, maxLat: 34.0, minLng: 130.0, maxLng: 131.2 } },
  { code: '41', name: 'saga', nameJa: '佐賀県', bounds: { minLat: 32.95, maxLat: 33.6, minLng: 129.7, maxLng: 130.55 } },
  { code: '42', name: 'nagasaki', nameJa: '長崎県', bounds: { minLat: 32.55, maxLat: 34.75, minLng: 128.9, maxLng: 130.45 } },
  { code: '43', name: 'kumamoto', nameJa: '熊本県', bounds: { minLat: 32.0, maxLat: 33.2, minLng: 130.1, maxLng: 131.35 } },
  { code: '44', name: 'oita', nameJa: '大分県', bounds: { minLat: 32.7, maxLat: 33.75, minLng: 130.8, maxLng: 132.15 } },
  { code: '45', name: 'miyazaki', nameJa: '宮崎県', bounds: { minLat: 31.35, maxLat: 32.85, minLng: 130.7, maxLng: 131.9 } },
  { code: '46', name: 'kagoshima', nameJa: '鹿児島県', bounds: { minLat: 27.0, maxLat: 32.35, minLng: 128.4, maxLng: 131.2 } },
  { code: '47', name: 'okinawa', nameJa: '沖縄県', bounds: { minLat: 24.0, maxLat: 27.9, minLng: 122.9, maxLng: 131.35 } },
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
 * GitHub dronebird/DIDinJapan からDIDデータを取得
 */
const fetchDIDFromGitHub = async (prefCode, prefName) => {
  const cacheKey = `pref_${prefCode}`;
  if (didPrefectureCache.has(cacheKey)) return didPrefectureCache.get(cacheKey);
  if (typeof fetch === 'undefined') return null;

  try {
    const url = `https://raw.githubusercontent.com/dronebird/DIDinJapan/master/GeoJSON/h22_did_${prefCode}_${prefName}.geojson`;
    const response = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!response || !response.ok) return null;
    const geojson = await response.json();
    didPrefectureCache.set(cacheKey, geojson);
    return geojson;
  } catch (error) {
    console.warn(`[DID] Fetch error: ${error.message}`);
    return null;
  }
};

/**
 * DID判定フォールバック
 */
const checkDIDAreaFallback = (lat, lng) => {
  const MAJOR_DID_AREAS = [
    { name: '東京都心', lat: 35.6812, lng: 139.7671, radius: 15000 },
    { name: '大阪市', lat: 34.6937, lng: 135.5023, radius: 15000 },
    // 他主要都市...
  ];

  for (const did of MAJOR_DID_AREAS) {
    const distance = getDistanceMeters(lat, lng, did.lat, did.lng);
    if (distance < did.radius) {
      return {
        isDID: true,
        area: did.name,
        certainty: 'estimated',
        source: 'fallback',
        description: `${did.name}のDID内（推定）`
      };
    }
  }
  return {
    isDID: false,
    area: null,
    certainty: 'estimated',
    source: 'fallback',
    description: 'DID外（推定）'
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
      const areaName = feature.properties?.CITY_NAME || '人口集中地区';
      let centroid = null;
      try {
        const c = turf.centroid(feature);
        centroid = { lat: c.geometry.coordinates[1], lng: c.geometry.coordinates[0] };
      } catch {
        // Ignore centroid calculation errors
      }

      return {
        isDID: true,
        area: areaName,
        certainty: 'confirmed',
        source: 'GitHub/DIDinJapan',
        description: `${areaName}のDID内`,
        centroid
      };
    }
  }
  return null;
};

/**
 * メイン: DID判定
 * 国土地理院タイル（令和2年）を優先、失敗時はGitHubデータにフォールバック
 */
export const checkDIDArea = async (lat, lng) => {
  try {
    // 1. まず国土地理院タイル（令和2年データ）で判定を試みる
    const tileResult = await checkDIDByTile(lat, lng);
    if (tileResult) {
      console.log('[DID] Tile-based check result:', tileResult);
      return {
        isDID: tileResult.isDID,
        area: tileResult.isDID ? '人口集中地区' : null,
        certainty: 'confirmed',
        source: 'GSI/did2020',
        description: tileResult.description
      };
    }

    // 2. タイル判定失敗時はGitHubデータ（平成22年）にフォールバック
    const prefecture = getPrefectureFromCoords(lat, lng);
    if (!prefecture) {
      return checkDIDAreaFallback(lat, lng);
    }

    const geojson = await fetchDIDFromGitHub(prefecture.code, prefecture.name);
    if (geojson) {
      const result = checkPointInDIDGeoJSON(geojson, lat, lng);
      if (result) return result;
      return {
        isDID: false,
        area: null,
        certainty: 'confirmed',
        source: 'GitHub/DIDinJapan',
        description: 'DID外'
      };
    }
    return checkDIDAreaFallback(lat, lng);
  } catch (error) {
    console.warn('[DID] Error:', error);
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
