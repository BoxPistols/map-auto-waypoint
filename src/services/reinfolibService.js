/**
 * 国土交通省 不動産情報ライブラリ API連携サービス
 *
 * 参照: https://www.reinfolib.mlit.go.jp/help/apiManual/
 *
 * ドローン飛行計画に活用できるデータ：
 * - 用途地域（住宅/商業/工業地域の判別）
 * - 都市計画区域（DID判定の参考）
 * - 立地適正化計画（居住誘導区域）
 */

// APIキー（環境変数またはローカルストレージ）
const getApiKey = () => {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_REINFOLIB_API_KEY) {
    return import.meta.env.VITE_REINFOLIB_API_KEY;
  }
  return localStorage.getItem('reinfolib_api_key');
};

export const setReinfolibApiKey = (key) => {
  localStorage.setItem('reinfolib_api_key', key);
};

export const hasReinfolibApiKey = () => {
  return !!getApiKey();
};

export const getReinfolibApiKey = () => getApiKey();

// XYZタイル座標への変換
const latLngToTile = (lat, lng, zoom) => {
  const n = Math.pow(2, zoom);
  const x = Math.floor((lng + 180) / 360 * n);
  const latRad = lat * Math.PI / 180;
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
  return { x, y, z: zoom };
};

/**
 * reinfolib APIを呼び出し
 *
 * @param {string} endpoint - エンドポイント（例: 'XKT002'）
 * @param {Object} params - パラメータ
 * @returns {Promise<Object>} GeoJSON形式のレスポンス
 */
const callReinfolibApi = async (endpoint, params = {}) => {
  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error('国土交通省APIキーが設定されていません');
  }

  const baseUrl = 'https://www.reinfolib.mlit.go.jp/ex-api/external';
  const queryParams = new URLSearchParams({
    response_format: 'geojson',
    ...params
  });

  const url = `${baseUrl}/${endpoint}?${queryParams}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[reinfolib] API Error:', error);
    throw error;
  }
};

/**
 * 用途地域を取得
 *
 * @param {number} lat - 緯度
 * @param {number} lng - 経度
 * @param {number} zoom - ズームレベル（デフォルト: 14）
 * @returns {Promise<Object>} 用途地域情報
 */
export const getUseZone = async (lat, lng, zoom = 14) => {
  const tile = latLngToTile(lat, lng, zoom);

  try {
    const data = await callReinfolibApi('XKT002', {
      z: tile.z,
      x: tile.x,
      y: tile.y
    });

    // GeoJSONから該当する用途地域を抽出
    if (data.features && data.features.length > 0) {
      // 最初のフィーチャーを返す（より正確にはポイントが含まれるかチェックすべき）
      const feature = data.features[0];
      return {
        success: true,
        zoneCode: feature.properties?.A29_004,
        zoneName: getZoneName(feature.properties?.A29_004),
        rawData: feature.properties
      };
    }

    return {
      success: true,
      zoneCode: null,
      zoneName: '用途地域指定なし',
      rawData: null
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      zoneCode: null,
      zoneName: '取得エラー'
    };
  }
};

/**
 * 都市計画区域を取得
 *
 * @param {number} lat - 緯度
 * @param {number} lng - 経度
 * @param {number} zoom - ズームレベル
 * @returns {Promise<Object>} 都市計画区域情報
 */
export const getUrbanPlanningArea = async (lat, lng, zoom = 12) => {
  const tile = latLngToTile(lat, lng, zoom);

  try {
    const data = await callReinfolibApi('XKT001', {
      z: tile.z,
      x: tile.x,
      y: tile.y
    });

    if (data.features && data.features.length > 0) {
      const feature = data.features[0];
      return {
        success: true,
        areaType: feature.properties?.A29_003,
        areaName: getAreaTypeName(feature.properties?.A29_003),
        rawData: feature.properties
      };
    }

    return {
      success: true,
      areaType: null,
      areaName: '都市計画区域外',
      rawData: null
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      areaType: null,
      areaName: '取得エラー'
    };
  }
};

/**
 * 複合的な地域情報を取得
 *
 * @param {number} lat - 緯度
 * @param {number} lng - 経度
 * @returns {Promise<Object>} 統合された地域情報
 */
export const getLocationInfo = async (lat, lng) => {
  const results = await Promise.allSettled([
    getUseZone(lat, lng),
    getUrbanPlanningArea(lat, lng)
  ]);

  const useZone = results[0].status === 'fulfilled' ? results[0].value : null;
  const urbanArea = results[1].status === 'fulfilled' ? results[1].value : null;

  // リスク判定
  let riskLevel = 'LOW';
  const riskFactors = [];

  if (useZone?.zoneName) {
    if (useZone.zoneName.includes('住居')) {
      riskLevel = 'MEDIUM';
      riskFactors.push({
        type: 'residential_area',
        description: `住居系用途地域: ${useZone.zoneName}`,
        severity: 'medium'
      });
    }
    if (useZone.zoneName.includes('商業')) {
      riskLevel = 'MEDIUM';
      riskFactors.push({
        type: 'commercial_area',
        description: `商業系用途地域: ${useZone.zoneName}`,
        severity: 'medium'
      });
    }
  }

  if (urbanArea?.areaName === '市街化区域') {
    if (riskLevel === 'MEDIUM') riskLevel = 'HIGH';
    else riskLevel = 'MEDIUM';
    riskFactors.push({
      type: 'urbanized_area',
      description: '市街化区域内（DIDの可能性）',
      severity: 'medium'
    });
  }

  return {
    success: true,
    location: { lat, lng },
    useZone,
    urbanArea,
    riskLevel,
    riskFactors,
    recommendations: generateRecommendations(riskLevel, riskFactors)
  };
};

/**
 * 用途地域コードから名称を取得
 */
const getZoneName = (code) => {
  const zones = {
    '1': '第一種低層住居専用地域',
    '2': '第二種低層住居専用地域',
    '3': '第一種中高層住居専用地域',
    '4': '第二種中高層住居専用地域',
    '5': '第一種住居地域',
    '6': '第二種住居地域',
    '7': '準住居地域',
    '8': '田園住居地域',
    '9': '近隣商業地域',
    '10': '商業地域',
    '11': '準工業地域',
    '12': '工業地域',
    '13': '工業専用地域'
  };
  return zones[code] || `用途地域コード: ${code}`;
};

/**
 * 区域区分コードから名称を取得
 */
const getAreaTypeName = (code) => {
  const areas = {
    '1': '市街化区域',
    '2': '市街化調整区域',
    '3': '非線引き都市計画区域'
  };
  return areas[code] || `区域区分コード: ${code}`;
};

/**
 * 推奨事項を生成
 */
const generateRecommendations = (riskLevel, factors) => {
  const recommendations = [];

  if (riskLevel === 'HIGH') {
    recommendations.push('DID（人口集中地区）の可能性があります。DIPS2.0で確認してください');
    recommendations.push('飛行許可・承認の取得を検討してください');
  }

  if (factors.some(f => f.type === 'residential_area')) {
    recommendations.push('住居系地域のため、早朝・夜間の飛行は避けてください');
    recommendations.push('第三者への配慮（事前告知等）を推奨します');
  }

  if (factors.some(f => f.type === 'commercial_area')) {
    recommendations.push('商業地域のため、営業時間帯の飛行に注意してください');
  }

  if (recommendations.length === 0) {
    recommendations.push('特段の制限は検出されませんでした');
    recommendations.push('ただし、現地での目視確認を推奨します');
  }

  return recommendations;
};

export default {
  setReinfolibApiKey,
  hasReinfolibApiKey,
  getReinfolibApiKey,
  getUseZone,
  getUrbanPlanningArea,
  getLocationInfo
};
