/**
 * 国土交通省 不動産情報ライブラリ API連携サービス
 *
 * 参照: https://www.reinfolib.mlit.go.jp/help/apiManual/
 *
 * ドローン飛行計画に活用できるデータ：
 * - 用途地域（住宅/商業/工業地域の判別）
 * - 都市計画区域（DID判定の参考）
 * - 立地適正化計画（居住誘導区域）
 * - 国土調査（災害履歴）(XST001)
 */

/**
 * =========================
 * 型（JSDoc）
 * =========================
 * ※ このコードベースはJSのため、`any` は使わず JSDoc で最小限厳格化します。
 */

/**
 * @typedef {'11'|'12'|'13'|'14'|'21'|'22'|'23'|'24'|'33'|'34'|'37'|'38'} DisasterTypeCode
 *
 * 災害分類コード（XST001）
 * 参照: https://www.reinfolib.mlit.go.jp/help/apiManual/xst001/
 */

/**
 * @typedef {Object} XYZTile
 * @property {number} x
 * @property {number} y
 * @property {number} z
 */

/**
 * @typedef {Object} DisasterHistoryProperties
 * @property {string=} disastertype_code
 * @property {string=} disaster_name_ja
 * @property {string=} disaster_date
 * @property {string=} disaster_source
 * @property {string=} _id
 * @property {string=} _index
 */

/**
 * @typedef {Object} GeoJSONGeometry
 * @property {string} type
 * @property {unknown=} coordinates
 */

/**
 * @typedef {Object} GeoJSONFeature
 * @property {'Feature'} type
 * @property {GeoJSONGeometry} geometry
 * @property {Record<string, unknown>=} properties
 */

/**
 * @typedef {Object} GeoJSONFeatureCollection
 * @property {'FeatureCollection'} type
 * @property {GeoJSONFeature[]} features
 * @property {Record<string, unknown>=} crs
 * @property {string=} name
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
      // WAF等でブロックされた場合（HTMLが返ってくる）
      if (response.status === 403 && typeof errorText === 'string' && errorText.includes('The request is blocked')) {
        throw new Error('国交省APIがブロックしました(403)。短時間の連続アクセスが原因の可能性があります。数分待って再試行してください。');
      }
      throw new Error(`API Error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[reinfolib] API Error:', error);
    throw error;
  }
};

/**
 * 災害分類コード → 表示名（XST001）
 * @type {Record<DisasterTypeCode, string>}
 */
const DISASTER_TYPE_LABELS = {
  '11': '浸水域等',
  '12': '堤防決壊箇所等',
  '13': '高潮浸水域等',
  '14': '高潮破堤箇所等',
  '21': 'がけ崩れ等',
  '22': '地すべり等',
  '23': '河道閉塞箇所等',
  '24': '土石流等',
  '33': '液状化',
  '34': '地震土砂災害',
  '37': '津波高',
  '38': '津波浸水域'
};

/**
 * XST001の `disaster_date` (YYYYMMDD, 0埋めあり) を安全に読み取る
 * @param {string | undefined} yyyymmdd
 * @returns {{ year: number | null, month: number | null, day: number | null }}
 */
const parseDisasterDate = (yyyymmdd) => {
  if (!yyyymmdd || typeof yyyymmdd !== 'string') return { year: null, month: null, day: null };
  const s = yyyymmdd.trim();
  if (!/^\d{8}$/.test(s)) return { year: null, month: null, day: null };

  const year = Number(s.slice(0, 4));
  const month = Number(s.slice(4, 6));
  const day = Number(s.slice(6, 8));

  return {
    year: year > 0 ? year : null,
    month: month > 0 ? month : null,
    day: day > 0 ? day : null
  };
};

/**
 * 災害履歴の簡易サマリーを作る（UI用）
 * @param {GeoJSONFeatureCollection | null | undefined} fc
 * @returns {{
 *   total: number,
 *   byType: Array<{ code: string, label: string, count: number }>,
 *   yearRange: { min: number | null, max: number | null }
 * }}
 */
export const summarizeDisasterHistory = (fc) => {
  const features = fc?.features;
  if (!Array.isArray(features)) {
    return { total: 0, byType: [], yearRange: { min: null, max: null } };
  }

  /** @type {Map<string, number>} */
  const counts = new Map();
  /** @type {number | null} */
  let minYear = null;
  /** @type {number | null} */
  let maxYear = null;

  for (const feature of features) {
    const props = /** @type {DisasterHistoryProperties | undefined} */ (feature?.properties);
    const code = props?.disastertype_code;
    if (code) counts.set(code, (counts.get(code) || 0) + 1);

    const parsed = parseDisasterDate(props?.disaster_date);
    if (parsed.year) {
      minYear = minYear === null ? parsed.year : Math.min(minYear, parsed.year);
      maxYear = maxYear === null ? parsed.year : Math.max(maxYear, parsed.year);
    }
  }

  const byType = Array.from(counts.entries())
    .map(([code, count]) => {
      const label = (/** @type {Record<string, string>} */ (DISASTER_TYPE_LABELS))[code] || `コード${code}`;
      return { code, label, count };
    })
    .sort((a, b) => b.count - a.count);

  return {
    total: features.length,
    byType,
    yearRange: { min: minYear, max: maxYear }
  };
};

/**
 * 国土調査（災害履歴）(XST001) を取得
 *
 * XYZ方式のタイル単位で取得するAPI。
 * @param {number} lat
 * @param {number} lng
 * @param {number=} zoom - 9〜15（デフォルト: 14）
 * @param {{ disasterTypeCodes?: DisasterTypeCode[] }=} options
 * @returns {Promise<{
 *   success: true,
 *   tile: XYZTile,
 *   geojson: GeoJSONFeatureCollection,
 *   summary: ReturnType<typeof summarizeDisasterHistory>
 * } | {
 *   success: false,
 *   error: string,
 *   tile: XYZTile
 * }>}
 */
export const getDisasterHistory = async (lat, lng, zoom = 14, options = {}) => {
  const tile = latLngToTile(lat, lng, zoom);

  try {
    const disasterTypeCodes = options.disasterTypeCodes;
    const params = {
      z: tile.z,
      x: tile.x,
      y: tile.y,
      ...(Array.isArray(disasterTypeCodes) && disasterTypeCodes.length > 0
        ? { disastertype_code: disasterTypeCodes.join(',') }
        : {})
    };

    const data = /** @type {GeoJSONFeatureCollection} */ (await callReinfolibApi('XST001', params));
    return {
      success: true,
      tile,
      geojson: data,
      summary: summarizeDisasterHistory(data)
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '取得エラー',
      tile
    };
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
      // 仕様（APIマニュアル）上の代表キー:
      // - youto_id: 用途地域分類（コード）
      // - use_area_ja: 用途地域名（日本語）
      const zoneCode = feature.properties?.youto_id ?? feature.properties?.A29_004 ?? null;
      const zoneNameFromApi = feature.properties?.use_area_ja ?? null;
      return {
        success: true,
        zoneCode,
        zoneName: zoneNameFromApi || (zoneCode ? getZoneName(zoneCode) : '用途地域指定なし'),
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
      // 仕様（APIマニュアル）上の代表キー:
      // - kubun_id: 区分コード
      // - area_classification_ja: 区域区分（日本語）
      const areaType = feature.properties?.kubun_id ?? feature.properties?.A29_003 ?? null;
      const areaNameFromApi = feature.properties?.area_classification_ja ?? null;
      return {
        success: true,
        areaType,
        areaName: areaNameFromApi || (areaType ? getAreaTypeName(areaType) : '都市計画区域外'),
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
 * @param {{ includeDisasterHistory?: boolean, disasterTypeCodes?: DisasterTypeCode[] }=} options
 * @returns {Promise<Object>} 統合された地域情報
 */
export const getLocationInfo = async (lat, lng, options = {}) => {
    const includeDisasterHistory = options.includeDisasterHistory !== false

    const tasks = [
        getUseZone(lat, lng),
        getUrbanPlanningArea(lat, lng),
        ...(includeDisasterHistory
            ? [
                  getDisasterHistory(lat, lng, 14, {
                      disasterTypeCodes: options.disasterTypeCodes,
                  }),
              ]
            : []),
    ]

    const results = await Promise.allSettled(tasks)

    const useZone = results[0].status === 'fulfilled' ? results[0].value : null
    const urbanArea =
        results[1].status === 'fulfilled' ? results[1].value : null
    const disasterHistory = includeDisasterHistory
        ? results[2]?.status === 'fulfilled'
            ? results[2].value
            : null
        : null

    // 両方失敗した場合はエラーを返す
    const useZoneFailed =
        !useZone?.success || useZone?.zoneName === '取得エラー'
    const urbanAreaFailed =
        !urbanArea?.success || urbanArea?.areaName === '取得エラー'

    if (useZoneFailed && urbanAreaFailed) {
        return {
            success: false,
            error: useZone?.error || urbanArea?.error || 'API取得失敗',
            location: { lat, lng },
            useZone,
            urbanArea,
            disasterHistory,
            riskLevel: 'LOW',
            riskFactors: [],
            recommendations: [],
        }
    }

    // リスク判定（成功したデータのみ使用）
    let riskLevel = 'LOW'
    const riskFactors = []

    // 用途地域が正常に取得できた場合のみ判定
    if (
        useZone?.success &&
        useZone.zoneName &&
        useZone.zoneName !== '取得エラー' &&
        useZone.zoneName !== '用途地域指定なし'
    ) {
        if (useZone.zoneName.includes('住居')) {
            riskLevel = 'MEDIUM'
            riskFactors.push({
                type: 'residential_area',
                description: `住居系用途地域: ${useZone.zoneName}`,
                severity: 'medium',
            })
        }
        if (useZone.zoneName.includes('商業')) {
            riskLevel = 'MEDIUM'
            riskFactors.push({
                type: 'commercial_area',
                description: `商業系用途地域: ${useZone.zoneName}`,
                severity: 'medium',
            })
        }
    }

    // 都市計画区域が正常に取得できた場合のみ判定
    if (urbanArea?.success && urbanArea.areaName === '市街化区域') {
        if (riskLevel === 'MEDIUM') riskLevel = 'HIGH'
        else riskLevel = 'MEDIUM'
        riskFactors.push({
            type: 'urbanized_area',
            description: '市街化区域内（DIDの可能性）',
            severity: 'medium',
        })
    }

    // 災害履歴（情報提供: low）
    if (disasterHistory?.success && disasterHistory.summary?.total > 0) {
        const top = disasterHistory.summary.byType?.[0]
        const yearRange = disasterHistory.summary.yearRange
        const yearText =
            yearRange?.min && yearRange?.max
                ? yearRange.min === yearRange.max
                    ? `${yearRange.min}年`
                    : `${yearRange.min}〜${yearRange.max}年`
                : null
        const topText = top
            ? `${top.label}(${top.code}) ${top.count}件`
            : `${disasterHistory.summary.total}件`

        riskFactors.push({
            type: 'disaster_history',
            description: `災害履歴: ${topText}${
                yearText ? ` / ${yearText}` : ''
            }`,
            severity: 'low',
            details: {
                total: disasterHistory.summary.total,
                byType: disasterHistory.summary.byType,
                yearRange: disasterHistory.summary.yearRange,
            },
        })
    }

    return {
        success: !useZoneFailed || !urbanAreaFailed, // 少なくとも1つ成功すればtrue
        location: { lat, lng },
        useZone,
        urbanArea,
        disasterHistory,
        riskLevel,
        riskFactors,
        recommendations: generateRecommendations(riskLevel, riskFactors),
    }
}

/**
 * 用途地域コードから名称を取得
 */
const getZoneName = (code) => {
  if (code === null || code === undefined || code === '') return '用途地域指定なし';
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
  if (code === null || code === undefined || code === '') return '都市計画区域外';
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
    getDisasterHistory,
    summarizeDisasterHistory,
    getLocationInfo,
}
