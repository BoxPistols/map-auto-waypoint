/**
 * OpenAI 利用可能モデル定義
 */

// 利用可能なモデル一覧
export const AVAILABLE_MODELS = [
  { id: 'gpt-4.1-nano', name: 'GPT-4.1 Nano', description: '高速・軽量', cost: '$', type: 'openai' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: '推奨・高速', cost: '$', type: 'openai' },
  // カスタム（ローカルLLM等）
  { id: 'local-default', name: 'カスタム', description: 'Local LLM等', cost: '無料', type: 'local' }
];

// デフォルトモデル
export const DEFAULT_MODEL = 'gpt-4.1-nano';

/**
 * 選択中のモデルがローカルかどうか
 * @param {string} modelId
 * @returns {boolean}
 */
export const isLocalModel = (modelId) => {
  const model = AVAILABLE_MODELS.find(m => m.id === modelId);
  return model?.type === 'local';
};

/**
 * Chat Completionsで `max_tokens` ではなく `max_completion_tokens` を要求するモデルかどうか。
 * ※ GPT-5 / GPT-4.1 系は `max_tokens` を弾くケースがある。
 * @param {string} modelId
 * @returns {boolean}
 */
export const requiresMaxCompletionTokens = (modelId) => {
  return /^gpt-5(-|$)/.test(modelId) || /^gpt-4\.1(-|$)/.test(modelId);
};

/**
 * カスタム temperature をサポートしないモデルかどうか。
 * ※ GPT-5 系は temperature=1（デフォルト）のみ対応、カスタム値は Unsupported error になる。
 * @param {string} modelId
 * @returns {boolean}
 */
export const requiresDefaultTemperature = (modelId) => {
  return /^gpt-5(-|$)/.test(modelId);
};
