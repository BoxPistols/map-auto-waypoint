# OpenAI: GPT‑4.1 系 / GPT‑5 系の「取得ロジック差」メモ（本アプリ向け）

本アプリ（`map-auto-waypoint`）は **Chat Completions** 互換のエンドポイント（`/v1/chat/completions`）で OpenAI / ローカルLLM を呼び出します。
そのため **GPT‑4.1 系 / GPT‑5 系** を使う際に、主に「リクエストパラメータの差」でハマりやすい点をまとめます。

汎用（他アプリにも流用できる）な差分整理は、こちら：

- `docs/OPENAI_GPT4_GPT5_GENERAL_INTEGRATION.md`

---

## 何が違う？（結論）

### 1) トークン上限パラメータ

- **従来**: `max_tokens`
- **一部の新しめのモデル（GPT‑5 / GPT‑4.1）**: `max_tokens` を **Unsupported** として拒否し、代わりに **`max_completion_tokens`** を要求する場合があります

実際にこのアプリの「接続テスト」で以下のエラーが出ました：

- `Unsupported parameter: 'max_tokens' is not supported with this model. Use 'max_completion_tokens' instead.`

### 2) エンドポイント（本アプリでは固定）

OpenAIには大きく2系統の呼び出しスタイルがあります（時期やSDKによって表現は変わります）：

- **Chat Completions**: `POST /v1/chat/completions`
- **Responses API**: `POST /v1/responses`

本アプリは現状 **Chat Completions固定** なので、差分吸収は **リクエストボディ（特にトークン指定）** が中心です。

---

## 本アプリの実装（どこで吸収しているか）

対象ファイル：

- `src/services/openaiService.js`

### 追加した吸収ロジック

- **`requiresMaxCompletionTokens(modelId)`**
  - `gpt-5-*` / `gpt-4.1-*` を判定して、`max_completion_tokens` が必要なモデルかどうかを返します
- **`buildChatCompletionsBody({ model, messages, temperature, maxTokens, useLocal })`**
  - **OpenAIモデル**: 上記判定に応じて `max_tokens` と `max_completion_tokens` を出し分け
  - **ローカルLLM**: 互換実装が `max_tokens` 前提のことが多いため、`max_tokens` を優先

### 影響範囲

- `testApiConnection()`: 接続テスト時の最小リクエスト
- `callOpenAI()`: 実際のチャット/分析呼び出し

どちらも `buildChatCompletionsBody()` を通すことで、モデル差分を一箇所で吸収します。

---

## 具体例（送信ボディのイメージ）

### GPT‑5 / GPT‑4.1 を選んだとき（OpenAI）

```json
{
  "model": "gpt-5-nano",
  "messages": [{ "role": "user", "content": "test" }],
  "temperature": 0.3,
  "max_completion_tokens": 800
}
```

ポイント：

- **`max_tokens` は送らない**
- `max_completion_tokens` に統一して送る

### ローカルLLM（互換エンドポイント想定）

```json
{
  "model": "local-model",
  "messages": [{ "role": "user", "content": "test" }],
  "temperature": 0.3,
  "max_tokens": 800
}
```

ポイント：

- ローカル実装（LM Studio等）は `max_tokens` を期待することが多い
- 互換性のため、本アプリはローカルに対して `max_tokens` を優先

---

## UI（接続テスト）での確認方法

1. 画面右上の設定 → **API設定**
2. OpenAI APIキーを入力
3. **AIモデル** を `GPT-5 Nano/Mini` または `GPT-4.1 Nano/Mini` にする
4. **接続テスト** を押す

ここで `max_tokens` 関連の Unsupported エラーが出ないことが期待結果です。

---

## 今後の拡張メモ（必要になったら）

- 新しいモデル/仕様変更で再度パラメータが変わる可能性があります  
  → まずは `buildChatCompletionsBody()` に吸収ルールを追加するのが最小コストです
- Responses API に移行する場合は、エンドポイント/レスポンス形式が変わるため `openaiService.js` の構造自体を見直すのが安全です

参考（OpenAIドキュメント）：

- [OpenAI API Docs](https://platform.openai.com/docs)

