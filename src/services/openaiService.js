/**
 * OpenAI API連携サービス
 *
 * GPT-5/GPT-4.1 ファミリー、またはローカルLLM (LM Studio等) を使用して
 * ドローン経路の危険度判定・推奨を生成
 *
 * Vercel などのサーバーレス環境では、サーバーサイドプロキシ（/api/chat）経由で
 * APIキーを安全に管理することを想定（GitHub Pages のような静的ホスティングでは非対応）
 */

// APIエンドポイント設定
const OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_LOCAL_ENDPOINT = 'http://localhost:1234/v1/chat/completions';
const VERCEL_PROXY_ENDPOINT = '/api/chat';

// サーバーサイドプロキシ環境かどうかを判定（キャッシュ）
let _isProxyEnv = null;

/**
 * サーバーサイドプロキシ環境かどうかを判定
 * ビルド時の環境変数 VITE_USE_PROXY_API で明示的に指定
 * @returns {boolean}
 */
const isProxyEnvironment = () => {
  if (_isProxyEnv !== null) return _isProxyEnv;

  // ビルド時の環境変数を使用（Vercel等のデプロイ設定で VITE_USE_PROXY_API=true を設定）
  _isProxyEnv = import.meta.env.VITE_USE_PROXY_API === 'true';

  return _isProxyEnv;
};

/**
 * プリセットAPI（サーバー側で設定済み）が利用可能か
 * UIでの表示用
 * @returns {boolean}
 */
export const isPreConfiguredApi = () => {
  return isProxyEnvironment();
};

/**
 * Chat Completionsで `max_tokens` ではなく `max_completion_tokens` を要求するモデルかどうか。
 * ※ GPT-5 / GPT-4.1 系は `max_tokens` を弾くケースがある。
 * @param {string} modelId
 * @returns {boolean}
 */
const requiresMaxCompletionTokens = (modelId) => {
  return /^gpt-5(-|$)/.test(modelId) || /^gpt-4\.1(-|$)/.test(modelId);
};

/**
 * カスタム temperature をサポートしないモデルかどうか。
 * ※ GPT-5 系は temperature=1（デフォルト）のみ対応、カスタム値は Unsupported error になる。
 * @param {string} modelId
 * @returns {boolean}
 */
const requiresDefaultTemperature = (modelId) => {
  return /^gpt-5(-|$)/.test(modelId);
};

/**
 * @typedef {{role: 'system'|'user'|'assistant', content: string}} ChatMessage
 */

/**
 * @typedef {{
 *  model: string,
 *  messages: ChatMessage[],
 *  temperature?: number,
 *  max_tokens?: number,
 *  max_completion_tokens?: number
 * }} ChatCompletionsBody
 */

/**
 * リクエストボディを生成（OpenAI / ローカルで互換性を吸収）
 * @param {{model: string, messages: ChatMessage[], temperature?: number, maxTokens?: number, useLocal: boolean}} params
 * @returns {ChatCompletionsBody}
 */
const buildChatCompletionsBody = ({ model, messages, temperature, maxTokens, useLocal }) => {
  /** @type {ChatCompletionsBody} */
  const body = { model, messages };

  // ローカルLLMは互換実装が多いため max_tokens を優先、temperature も許容
  if (useLocal) {
    if (typeof temperature === 'number') body.temperature = temperature;
    if (typeof maxTokens === 'number') body.max_tokens = maxTokens;
    return body;
  }

  // GPT-5系: temperature はデフォルト(1)のみ対応、カスタム値は送らない
  if (typeof temperature === 'number' && !requiresDefaultTemperature(model)) {
    body.temperature = temperature;
  }

  if (typeof maxTokens === 'number') {
    if (requiresMaxCompletionTokens(model)) {
      // GPT-5/4.1系: max_tokens ではなく max_completion_tokens を要求する場合がある
      // max_tokens は送らない（Unsupported parameter を避ける）
      body.max_completion_tokens = maxTokens;
    } else {
      body.max_tokens = maxTokens;
    }
  }
  return body;
};

// 利用可能なモデル一覧
export const AVAILABLE_MODELS = [
  { id: 'gpt-4.1-nano', name: 'GPT-4.1 Nano', description: '高速・軽量', cost: '$', type: 'openai' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: '推奨・高速', cost: '$', type: 'openai' },
  // カスタム（ローカルLLM等）
  { id: 'local-default', name: 'カスタム', description: 'Local LLM等', cost: '無料', type: 'local' }
];

// デフォルトモデル
const DEFAULT_MODEL = 'gpt-4.1-nano';

// 環境変数からAPIキーを取得（Vite経由）
const getApiKey = () => {
  // Vite環境変数
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_OPENAI_API_KEY) {
    return import.meta.env.VITE_OPENAI_API_KEY;
  }
  // ローカルストレージ（開発用）
  return localStorage.getItem('openai_api_key');
};

// APIキーを設定（開発用）
export const setApiKey = (key) => {
  localStorage.setItem('openai_api_key', key);
};

// APIキーが設定されているか確認（Vercelプロキシも考慮）
export const hasApiKey = () => {
  // Vercel環境ではプロキシ経由でAPIキーが利用可能
  if (isProxyEnvironment()) {
    return true;
  }
  return !!getApiKey();
};

/**
 * OpenAI API接続テスト
 * 最小限のリクエストでAPIキーの有効性を確認
 * @returns {Promise<{success: boolean, message: string, model?: string}>}
 */
export const testApiConnection = async () => {
  const model = getSelectedModel();
  const useLocal = isLocalModel(model);
  const apiKey = getApiKey();

  if (!useLocal && !apiKey) {
    return { success: false, message: 'APIキーが設定されていません' };
  }

  const endpoint = useLocal ? getLocalEndpoint() : OPENAI_ENDPOINT;
  const actualModel = useLocal ? getLocalModelName() : model;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(useLocal ? {} : { 'Authorization': `Bearer ${apiKey}` })
      },
      body: JSON.stringify(buildChatCompletionsBody({
        model: actualModel,
        messages: [{ role: 'user', content: 'test' }],
        maxTokens: 5,
        useLocal
      }))
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData.error?.message || `HTTP ${response.status}`;
      return { success: false, message: errorMsg };
    }

    const data = await response.json();
    return {
      success: true,
      message: '接続成功',
      model: data.model || actualModel
    };
  } catch (error) {
    return {
      success: false,
      message: error.message || '接続エラー'
    };
  }
};

// 選択中のモデルを取得
export const getSelectedModel = () => {
  return localStorage.getItem('openai_model') || DEFAULT_MODEL;
};

// モデルを設定
export const setSelectedModel = (modelId) => {
  localStorage.setItem('openai_model', modelId);
};

// ローカルLLMエンドポイントを取得
export const getLocalEndpoint = () => {
  return localStorage.getItem('local_llm_endpoint') || DEFAULT_LOCAL_ENDPOINT;
};

// ローカルLLMエンドポイントを設定
export const setLocalEndpoint = (endpoint) => {
  localStorage.setItem('local_llm_endpoint', endpoint);
};

// ローカルLLMモデル名を取得（LM Studioで設定したモデル名）
export const getLocalModelName = () => {
  return localStorage.getItem('local_llm_model') || 'local-model';
};

// ローカルLLMモデル名を設定
export const setLocalModelName = (modelName) => {
  localStorage.setItem('local_llm_model', modelName);
};

// 選択中のモデルがローカルかどうか
export const isLocalModel = (modelId) => {
  const model = AVAILABLE_MODELS.find(m => m.id === modelId);
  return model?.type === 'local';
};

/**
 * OpenAI Chat Completion APIを呼び出し（ローカルLLM対応・Vercelプロキシ対応）
 *
 * @param {Array} messages - チャットメッセージ配列
 * @param {Object} options - オプション
 * @returns {Promise<string>} レスポンステキスト
 */
export const callOpenAI = async (messages, options = {}) => {
  const {
    model = getSelectedModel(), // ユーザー選択モデル
    temperature = 0.3,     // 一貫性のある出力
    maxTokens = 1000
  } = options;

  const useLocal = isLocalModel(model);
  const useProxy = isProxyEnvironment() && !useLocal;
  const apiKey = getApiKey();

  // OpenAIモデルの場合はAPIキーまたはプロキシが必要
  if (!useLocal && !useProxy && !apiKey) {
    throw new Error('OpenAI APIキーが設定されていません。設定画面からAPIキーを入力してください。');
  }

  // エンドポイントとモデル名を決定
  let endpoint;
  if (useLocal) {
    endpoint = getLocalEndpoint();
  } else if (useProxy) {
    endpoint = VERCEL_PROXY_ENDPOINT;
  } else {
    endpoint = OPENAI_ENDPOINT;
  }
  const modelName = useLocal ? getLocalModelName() : model;

  // ヘッダーを構築
  const headers = {
    'Content-Type': 'application/json'
  };
  // プロキシ経由の場合は認証ヘッダー不要（サーバー側で設定）
  if (!useLocal && !useProxy) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(buildChatCompletionsBody({
        model: modelName,
        messages,
        temperature,
        maxTokens,
        useLocal
      }))
    });

    if (!response.ok) {
      let errorMessage = 'API呼び出しに失敗しました';
      try {
        const error = await response.json();
        errorMessage = error.error?.message || error.error || errorMessage;
      } catch {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      const prefix = useLocal ? 'ローカルLLMエラー' : useProxy ? 'プロキシエラー' : '';
      throw new Error(prefix ? `${prefix}: ${errorMessage}` : errorMessage);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    const source = useLocal ? '[LocalLLM]' : useProxy ? '[Proxy]' : '[OpenAI]';
    console.error(`${source} API Error:`, error);
    throw error;
  }
};

/**
 * ドローン飛行計画の分析をOpenAIに依頼
 *
 * @param {Object} flightContext - 飛行計画のコンテキスト
 * @returns {Promise<Object>} 分析結果
 */
export const analyzeFlightPlan = async (flightContext) => {
  const systemPrompt = `あなたはドローン飛行計画の専門アドバイザーです。
日本の航空法、DIPS（ドローン情報基盤システム）、UTM（無人航空機管理システム）に精通しています。

以下の情報に基づいて、飛行計画を分析し、JSONフォーマットで回答してください：

回答フォーマット:
{
  "riskLevel": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "riskScore": 0-100,
  "summary": "一言サマリー",
  "risks": [
    {"type": "string", "description": "string", "severity": "low|medium|high|critical"}
  ],
  "recommendations": ["推奨事項1", "推奨事項2"],
  "requiredPermissions": ["必要な許可1", "必要な許可2"],
  "estimatedApprovalDays": number,
  "safetyChecklist": ["確認事項1", "確認事項2"]
}`;

  const userPrompt = `以下のドローン飛行計画を分析してください：

## 飛行エリア情報
- 中心座標: ${flightContext.center?.lat.toFixed(6)}, ${flightContext.center?.lng.toFixed(6)}
- エリア面積: 約${flightContext.areaSqMeters ? Math.round(flightContext.areaSqMeters) : '不明'}㎡
- Waypoint数: ${flightContext.waypointCount || 0}点

## 空域制限チェック結果
${flightContext.restrictions.length > 0
    ? flightContext.restrictions.map(r =>
      `- [${r.severity.toUpperCase()}] ${r.name}: ${r.distance}m以内 (制限半径${r.radius}m)`
    ).join('\n')
    : '- 空港・禁止区域との重複なし'
  }

## DID（人口集中地区）
- 状態: ${flightContext.isDID ? 'DID区域内の可能性あり' : '判定中/DID外'}

## 飛行目的
${flightContext.purpose || '未指定'}

## 追加情報
- 飛行高度: ${flightContext.altitude || 50}m
- 最高標高: ${flightContext.maxElevation || '不明'}m

上記に基づいて、リスク判定と推奨事項をJSON形式で回答してください。`;

  try {
    const response = await callOpenAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], {
      temperature: 0.2,
      maxTokens: 1500
    });

    // JSONを抽出（コードブロック内の場合も対応）
    let jsonStr = response;
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    return JSON.parse(jsonStr.trim());
  } catch (error) {
    console.error('[OpenAI] Analysis Error:', error);

    // パースエラー時はフォールバック
    if (error instanceof SyntaxError) {
      return {
        riskLevel: 'MEDIUM',
        riskScore: 50,
        summary: 'AI分析中にエラーが発生しました。手動での確認を推奨します。',
        risks: [{ type: 'error', description: 'AI応答のパースに失敗', severity: 'medium' }],
        recommendations: ['手動で空域を確認してください', 'DIPSで最新情報を確認してください'],
        requiredPermissions: [],
        estimatedApprovalDays: 14,
        safetyChecklist: ['飛行エリアの目視確認', '気象条件の確認']
      };
    }

    throw error;
  }
};

/**
 * 自然言語でのフライト計画アドバイス
 *
 * @param {string} userQuery - ユーザーの質問
 * @param {Object} context - 現在のコンテキスト（ポリゴン、Waypoint等）
 * @returns {Promise<string>} アドバイステキスト
 */
export const getFlightAdvice = async (userQuery, context = {}) => {
  const systemPrompt = `あなたはドローン飛行計画のアシスタントです。
ユーザーの質問に対して、簡潔で実用的なアドバイスを提供してください。

対応可能なトピック：
- 飛行許可・申請要件
- 飛行パターン（グリッド、周回、ポイント間）
- 機体選定
- リスク評価
- 点検・測量の効率的な方法

回答は日本語で、マークダウン形式で整形してください。`;

  const contextInfo = context.polygons?.length > 0
    ? `\n\n現在の設定:\n- ポリゴン数: ${context.polygons.length}\n- Waypoint数: ${context.waypoints?.length || 0}`
    : '\n\n※まだ飛行エリアは設定されていません';

  const response = await callOpenAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userQuery + contextInfo }
  ], {
    temperature: 0.5,
    maxTokens: 800
  });

  return response;
};

/**
 * 飛行目的から推奨パラメータを取得
 *
 * @param {string} purpose - 飛行目的の説明
 * @returns {Promise<Object>} 推奨パラメータ
 */
export const getRecommendedParameters = async (purpose) => {
  const systemPrompt = `ドローン飛行の目的に基づいて、最適なパラメータを提案してください。

回答フォーマット（JSONのみ）:
{
  "pattern": "grid" | "perimeter" | "waypoint",
  "altitude": number (メートル),
  "speed": number (m/s),
  "overlap": number (パーセント、グリッドの場合),
  "camera": "RGB" | "thermal" | "multispectral" | "lidar",
  "recommendedAircraft": ["機体名1", "機体名2"],
  "estimatedFlightTime": "〇〇分",
  "tips": ["ヒント1", "ヒント2"]
}`;

  try {
    const response = await callOpenAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `飛行目的: ${purpose}` }
    ], {
      temperature: 0.3,
      maxTokens: 500
    });

    let jsonStr = response;
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    return JSON.parse(jsonStr.trim());
  } catch (error) {
    console.error('[OpenAI] Parameter recommendation error:', error);

    // フォールバック
    return {
      pattern: 'perimeter',
      altitude: 50,
      speed: 5,
      overlap: 70,
      camera: 'RGB',
      recommendedAircraft: ['DJI Mavic 3 Enterprise', 'DJI Matrice 300 RTK'],
      estimatedFlightTime: '約20-30分',
      tips: ['事前に現地確認を推奨', '風速5m/s以下での飛行を推奨']
    };
  }
};

export default {
  AVAILABLE_MODELS,
  setApiKey,
  hasApiKey,
  isPreConfiguredApi,
  getSelectedModel,
  setSelectedModel,
  getLocalEndpoint,
  setLocalEndpoint,
  getLocalModelName,
  setLocalModelName,
  isLocalModel,
  callOpenAI,
  analyzeFlightPlan,
  getFlightAdvice,
  getRecommendedParameters
};
