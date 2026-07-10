/**
 * OpenAI APIキー / モデル / ローカルLLM 設定の永続化と取得
 *
 * Vercel などのサーバーレス環境では、サーバーサイドプロキシ（/api/chat）経由で
 * APIキーを安全に管理することを想定。
 */

import { DEFAULT_MODEL } from './models';

// APIエンドポイント設定
export const OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
export const DEFAULT_LOCAL_ENDPOINT = 'http://localhost:1234/v1/chat/completions';
export const VERCEL_PROXY_ENDPOINT = '/api/chat';

// サーバーサイドプロキシ環境かどうかを判定（キャッシュ）
let _isProxyEnv = null;

/**
 * サーバーサイドプロキシ環境かどうかを判定
 * ビルド時の環境変数 VITE_USE_PROXY_API で明示的に指定
 * @returns {boolean}
 */
export const isProxyEnvironment = () => {
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

// 環境変数からAPIキーを取得（Vite経由）
export const getApiKey = () => {
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
