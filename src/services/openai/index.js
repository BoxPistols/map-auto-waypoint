/**
 * OpenAI API 連携サービス (集約モジュール)
 *
 * 機能別に分割:
 *  - models:   利用可能モデル定義
 *  - config:   APIキー/エンドポイント/モデル設定
 *  - client:   Chat Completions 呼び出し
 *  - prompts:  ドローン関連プロンプト
 */

import {
  AVAILABLE_MODELS,
  isLocalModel,
} from './models';
import {
  setApiKey,
  hasApiKey,
  isPreConfiguredApi,
  getSelectedModel,
  setSelectedModel,
  getLocalEndpoint,
  setLocalEndpoint,
  getLocalModelName,
  setLocalModelName,
} from './config';
import { callOpenAI } from './client';
import {
  analyzeFlightPlan,
  getFlightAdvice,
  getRecommendedParameters,
} from './prompts';

export { AVAILABLE_MODELS, isLocalModel } from './models';
export {
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
} from './config';
export { callOpenAI, testApiConnection, buildChatCompletionsBody } from './client';
export {
  analyzeFlightPlan,
  getFlightAdvice,
  getRecommendedParameters,
} from './prompts';

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
  getRecommendedParameters,
};
