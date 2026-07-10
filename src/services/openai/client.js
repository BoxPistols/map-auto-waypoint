/**
 * OpenAI Chat Completion API クライアント
 *
 * GPT-5/GPT-4.1 ファミリー、またはローカルLLM (LM Studio等) を呼び出す
 * リクエストボディは buildChatCompletionsBody で互換性を吸収する
 */

import { isLocalModel, requiresMaxCompletionTokens, requiresDefaultTemperature } from './models';
import {
  OPENAI_ENDPOINT,
  VERCEL_PROXY_ENDPOINT,
  isProxyEnvironment,
  getApiKey,
  getSelectedModel,
  getLocalEndpoint,
  getLocalModelName,
} from './config';

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
export const buildChatCompletionsBody = ({ model, messages, temperature, maxTokens, useLocal }) => {
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
