/**
 * OpenAI API連携サービス
 *
 * GPT-5/GPT-4.1 ファミリー、またはローカルLLM (LM Studio等) を使用して
 * ドローン経路の危険度判定・推奨を生成
 */

// APIエンドポイント設定
const OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_LOCAL_ENDPOINT = 'http://localhost:1234/v1/chat/completions';

// 利用可能なモデル一覧（nano/miniのみ・コスト効率重視）
export const AVAILABLE_MODELS = [
  // GPT-5 系（2025年8月リリース）
  { id: 'gpt-5-nano', name: 'GPT-5 Nano', description: '最速・最安', cost: '$', type: 'openai' },
  { id: 'gpt-5-mini', name: 'GPT-5 Mini', description: '高速・低コスト', cost: '$', type: 'openai' },
  // GPT-4.1 系（2025年4月リリース、1Mコンテキスト）
  { id: 'gpt-4.1-nano', name: 'GPT-4.1 Nano', description: '1Mコンテキスト', cost: '$', type: 'openai' },
  { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', description: '1Mコンテキスト', cost: '$', type: 'openai' },
  // ローカルLLM
  { id: 'local-default', name: 'ローカルLLM', description: 'LM Studio等', cost: '無料', type: 'local' }
];

// デフォルトモデル
const DEFAULT_MODEL = 'gpt-5-nano';

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

// APIキーが設定されているか確認
export const hasApiKey = () => {
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
      body: JSON.stringify({
        model: actualModel,
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 5
      })
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
 * OpenAI Chat Completion APIを呼び出し（ローカルLLM対応）
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
  const apiKey = getApiKey();

  // OpenAIモデルの場合はAPIキーが必要
  if (!useLocal && !apiKey) {
    throw new Error('OpenAI APIキーが設定されていません。設定画面からAPIキーを入力してください。');
  }

  // エンドポイントとモデル名を決定
  const endpoint = useLocal ? getLocalEndpoint() : OPENAI_ENDPOINT;
  const modelName = useLocal ? getLocalModelName() : model;

  // ヘッダーを構築
  const headers = {
    'Content-Type': 'application/json'
  };
  if (!useLocal) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: modelName,
        messages,
        temperature,
        max_tokens: maxTokens
      })
    });

    if (!response.ok) {
      let errorMessage = 'API呼び出しに失敗しました';
      try {
        const error = await response.json();
        errorMessage = error.error?.message || errorMessage;
      } catch {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(useLocal ? `ローカルLLMエラー: ${errorMessage}` : errorMessage);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error(useLocal ? '[LocalLLM] API Error:' : '[OpenAI] API Error:', error);
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
