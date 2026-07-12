/**
 * OpenAI API連携サービス (後方互換のファサード)
 *
 * 実装は src/services/openai/ 配下に機能別ファイルとして分割済み。
 * 既存の `import { ... } from './openaiService'` を維持するため re-export する。
 */

export {
  AVAILABLE_MODELS,
  isLocalModel,
  setApiKey,
  hasApiKey,
  isPreConfiguredApi,
  getApiKey,
  getSelectedModel,
  setSelectedModel,
  getLocalEndpoint,
  setLocalEndpoint,
  getLocalModelName,
  setLocalModelName,
  isProxyEnvironment,
  callOpenAI,
  testApiConnection,
  buildChatCompletionsBody,
  analyzeFlightPlan,
  getFlightAdvice,
  getRecommendedParameters,
} from './openai';

export { default } from './openai';
