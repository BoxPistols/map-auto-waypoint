/**
 * 国土交通省 不動産情報ライブラリ API連携サービス
 *
 * 参照: https://www.reinfolib.mlit.go.jp/help/apiManual/
 *
 * ドローン飛行計画に活用できるデータ：
 * - 用途地域（住宅/商業/工業地域の判別）
 * - 都市計画区域（DID判定の参考）
 * - 立地適正化計画（居住誘導区域）
 * - 災害履歴（水害・地震災害）
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
 * 実行環境を判定
 * - dev: ローカル開発（Viteプロキシ使用）
 * - vercel: Vercel（サーバーレス関数使用、APIキー不要）
 * - github-pages: GitHub Pages（CORS制限あり、使用不可）
 */
const getEnvironment = () => {
  if (import.meta.env.DEV) return 'dev';

  if (typeof window === 'undefined') return 'production';

  const hostname = window.location.hostname;

  // GitHub Pages（API使用不可）
  if (hostname.includes('github.io')) {
    return 'github-pages';
  }

  // Vercel（vercel.appまたはカスタムドメイン）
  // GitHub Pages以外のプロダクション環境はVercelと想定
  return 'vercel';
};

/**
 * reinfolib APIを呼び出し
 *
 * @param {string} endpoint - エンドポイント（例: 'XKT002'）
 * @param {Object} params - パラメータ
 * @returns {Promise<Object>} GeoJSON形式のレスポンス
 */
const callReinfolibApi = async (endpoint, params = {}) => {
  const env = getEnvironment();
  const apiKey = getApiKey();

  // GitHub Pagesでは国交省APIは使用不可（CORS制限）
  if (env === 'github-pages') {
    throw new Error('GitHub Pagesでは国交省APIは使用できません。Vercel版をご利用ください。');
  }

  // ローカル開発時はAPIキーが必要
  if (env === 'dev' && !apiKey) {
    throw new Error('国土交通省APIキーが設定されていません');
  }

  let baseUrl;
  let useProxy = false;

  if (env === 'dev') {
    // ローカル開発: Viteプロキシ経由
    baseUrl = '/api/reinfolib';
    useProxy = true;
  } else if (env === 'vercel') {
    // Vercel: サーバーレス関数経由（APIキーはサーバー側）
    baseUrl = '/api/reinfolib';
    useProxy = true;
  } else {
    // その他（想定外）: 直接アクセス試行
    baseUrl = 'https://www.reinfolib.mlit.go.jp/ex-api/external';
  }

  const queryParams = new URLSearchParams({
    response_format: 'geojson',
    ...params,
    // ローカル開発時のみAPIキーをクエリパラメータで送信
    ...(env === 'dev' && apiKey ? { _apiKey: apiKey } : {})
  });

  const url = `${baseUrl}/${endpoint}?${queryParams}`;

  console.log('[reinfolib] API call:', { env, endpoint, useProxy, url: url.substring(0, 80) + '...' });

  try {
    const headers = {};
    // 直接アクセスの場合のみヘッダーでAPIキーを送信
    if (!useProxy && apiKey) {
      headers['Ocp-Apim-Subscription-Key'] = apiKey;
    }

    const response = await fetch(url, { method: 'GET', headers });

    console.log('[reinfolib] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error('[reinfolib] Error response:', errorText);
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
 * 災害履歴を取得（水害・地震災害）
 *
 * @param {number} lat - 緯度
 * @param {number} lng - 経度
 * @param {number} zoom - ズームレベル（デフォルト: 14）
 * @returns {Promise<Object>} 災害履歴情報
 */
export const getDisasterHistory = async (lat, lng, zoom = 14) => {
  const tile = latLngToTile(lat, lng, zoom);

  try {
    const data = await callReinfolibApi('XST001', {
      z: tile.z,
      x: tile.x,
      y: tile.y
    });

    if (data.features && data.features.length > 0) {
      const disasters = data.features.map(feature => ({
        type: getDisasterTypeName(feature.properties?.disaster_type),
        date: feature.properties?.disaster_date || feature.properties?.date,
        description: feature.properties?.description || feature.properties?.remarks,
        severity: feature.properties?.severity || 'unknown',
        rawData: feature.properties
      }));

      return {
        success: true,
        hasDisasterHistory: true,
        disasters,
        count: disasters.length,
        summary: `過去${disasters.length}件の災害履歴があります`
      };
    }

    return {
      success: true,
      hasDisasterHistory: false,
      disasters: [],
      count: 0,
      summary: '災害履歴なし'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      hasDisasterHistory: false,
      disasters: [],
      count: 0,
      summary: '災害履歴取得エラー'
    };
  }
};

/**
 * 災害種別コードから名称を取得
 */
const getDisasterTypeName = (code) => {
  const types = {
    '1': '水害（浸水）',
    '2': '水害（洪水）',
    '3': '水害（内水氾濫）',
    '4': '水害（高潮）',
    '5': '土砂災害',
    '6': '地震災害',
    '7': '津波災害',
    '8': '火山災害',
    'flood': '水害',
    'earthquake': '地震災害',
    'landslide': '土砂災害',
    'tsunami': '津波災害'
  };
  return types[code] || `災害種別: ${code || '不明'}`;
};

/**
 * 複合的な地域情報を取得
 *
 * @param {number} lat - 緯度
 * @param {number} lng - 経度
 * @returns {Promise<Object>} 統合された地域情報
 */
export const getLocationInfo = async (lat, lng, options = {}) => {
  const { includeDisasterHistory = false } = options;

  const apiCalls = [
    getUseZone(lat, lng),
    getUrbanPlanningArea(lat, lng)
  ];

  // オプションで災害履歴も取得
  if (includeDisasterHistory) {
    apiCalls.push(getDisasterHistory(lat, lng));
  }

  const results = await Promise.allSettled(apiCalls);

  const useZone = results[0].status === 'fulfilled' ? results[0].value : null;
  const urbanArea = results[1].status === 'fulfilled' ? results[1].value : null;
  const disasterHistory = includeDisasterHistory && results[2]?.status === 'fulfilled' ? results[2].value : null;

  // 両方失敗した場合はエラーを返す
  const useZoneFailed = !useZone?.success || useZone?.zoneName === '取得エラー';
  const urbanAreaFailed = !urbanArea?.success || urbanArea?.areaName === '取得エラー';

  if (useZoneFailed && urbanAreaFailed) {
    return {
      success: false,
      error: useZone?.error || urbanArea?.error || 'API取得失敗',
      location: { lat, lng },
      useZone,
      urbanArea,
      riskLevel: 'LOW',
      riskFactors: [],
      recommendations: []
    };
  }

  // リスク判定（成功したデータのみ使用）
  let riskLevel = 'LOW';
  const riskFactors = [];

  // 用途地域が正常に取得できた場合のみ判定
  if (useZone?.success && useZone.zoneName && useZone.zoneName !== '取得エラー' && useZone.zoneName !== '用途地域指定なし') {
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

  // 都市計画区域が正常に取得できた場合のみ判定
  if (urbanArea?.success && urbanArea.areaName === '市街化区域') {
    if (riskLevel === 'MEDIUM') riskLevel = 'HIGH';
    else riskLevel = 'MEDIUM';
    riskFactors.push({
      type: 'urbanized_area',
      description: '市街化区域内（DIDの可能性）',
      severity: 'medium'
    });
  }

  // 災害履歴がある場合はリスク要因に追加
  if (disasterHistory?.success && disasterHistory.hasDisasterHistory) {
    riskFactors.push({
      type: 'disaster_history',
      description: disasterHistory.summary,
      severity: disasterHistory.count >= 3 ? 'high' : 'medium',
      details: disasterHistory.disasters
    });
    // 災害履歴が多い場合はリスクレベルを上げる
    if (disasterHistory.count >= 3 && riskLevel !== 'HIGH') {
      riskLevel = 'MEDIUM';
    }
  }

  return {
    success: !useZoneFailed || !urbanAreaFailed, // 少なくとも1つ成功すればtrue
    location: { lat, lng },
    useZone,
    urbanArea,
    disasterHistory,
    riskLevel,
    riskFactors,
    recommendations: generateRecommendations(riskLevel, riskFactors, disasterHistory)
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
const generateRecommendations = (riskLevel, factors, disasterHistory = null) => {
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

  // 災害履歴に基づく推奨事項
  if (disasterHistory?.hasDisasterHistory) {
    const hasFlood = disasterHistory.disasters.some(d =>
      d.type?.includes('水害') || d.type?.includes('浸水') || d.type?.includes('洪水')
    );
    const hasLandslide = disasterHistory.disasters.some(d =>
      d.type?.includes('土砂')
    );
    const hasEarthquake = disasterHistory.disasters.some(d =>
      d.type?.includes('地震')
    );

    if (hasFlood) {
      recommendations.push('過去に水害履歴あり：河川・低地での飛行時は天候に注意');
    }
    if (hasLandslide) {
      recommendations.push('過去に土砂災害履歴あり：山間部での飛行時は地盤状況を確認');
    }
    if (hasEarthquake) {
      recommendations.push('過去に地震災害履歴あり：建物・構造物の損傷に注意');
    }
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
  getDisasterHistory,
  getLocationInfo
};
