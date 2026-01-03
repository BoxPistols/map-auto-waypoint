# OpenAI: GPT‑4.x 系 / GPT‑5 系の「取得ロジック差分」汎用ガイド（他アプリにも流用可）

このドキュメントは、特定アプリに依存しない形で **GPT‑4.x 系** と **GPT‑5 系** の“呼び出し（取得）ロジック”でハマりやすい差分を整理したものです。  
（SDK/モデルの更新で挙動は変わり得るため、**最終的には実際のエラー文・APIレスポンス**を正としてください）

---

## 1. まず押さえるべき前提（エンドポイントの系統）

OpenAIのAPI呼び出しは、大きく次の2系統で語られることが多いです：

- **Chat Completions**: `POST /v1/chat/completions`  
  - `messages: [{role, content}]` を送って `choices[0].message.content` を受け取る形
- **Responses API**: `POST /v1/responses`  
  - 受け取り方や入出力の表現が異なり、実装の組み替えが必要になるケースがある

**重要**: “4系/5系の違い”というより、実装上の差は **どのエンドポイント・どのSDKを使うか** で大きく変わります。  
一方で、同じ系統（例: Chat Completions）に固定していても **モデルにより許容パラメータが違う** ことがあり、そこが現場で一番詰まりやすいポイントです。

---

## 2. 一番詰まりやすい差分：トークン上限パラメータ

### 2.1 現象

モデルによって、トークン上限を指定するパラメータとして：

- `max_tokens` が通る
- `max_tokens` が **Unsupported** で弾かれ、代わりに `max_completion_tokens` を要求される

…の両方が起こり得ます。

典型的なエラー例：

- `Unsupported parameter: 'max_tokens' is not supported with this model. Use 'max_completion_tokens' instead.`

### 2.2 対応方針（汎用）

アプリ側に **互換レイヤ（変換関数）** を用意し、モデルごとに出し分けます。

- **推奨**: “モデルIDのプレフィックス/正規表現”で分岐（例: `gpt-5-*`, `gpt-4.1-*`）
- **より堅牢**: “失敗時のエラー文”を見てリトライ（`max_tokens` → `max_completion_tokens`）
  - ただし **二重課金/二重リクエスト** と見なされるリスクや、レート制限に注意

---

## 3. “互換レイヤ”を作るときの設計パターン

### 3.1 目標

- **呼び出し元（UI/サービス/機能）** では “モデル差分を意識しない”
- **1箇所** に差分吸収を集約する（保守・拡張が容易）

### 3.2 実装の最小構成（疑似コード）

```js
// 1) モデルがどのルールに該当するか判定
function requiresMaxCompletionTokens(modelId) {
  return modelId.startsWith("gpt-5") || modelId.startsWith("gpt-4.1");
}

// 2) APIに投げるボディを組み立て（ここで差分吸収）
function buildBody({ model, messages, temperature, maxTokens }) {
  const body = { model, messages };
  if (typeof temperature === "number") body.temperature = temperature;

  if (typeof maxTokens === "number") {
    if (requiresMaxCompletionTokens(model)) {
      body.max_completion_tokens = maxTokens;
    } else {
      body.max_tokens = maxTokens;
    }
  }
  return body;
}
```

**ポイント**:

- “呼び出し元”は `maxTokens` のようなアプリ内パラメータで統一  
- “APIパラメータ名”は互換レイヤが責務を持つ

---

## 4. Chat Completions を使う場合のリクエスト/レスポンス例

### 4.1 `max_completion_tokens` が必要なモデル例（GPT‑5/GPT‑4.1 等）

```json
{
  "model": "gpt-5-mini",
  "messages": [
    { "role": "system", "content": "You are a helpful assistant." },
    { "role": "user", "content": "要点を3つでまとめて。" }
  ],
  "temperature": 0.3,
  "max_completion_tokens": 300
}
```

### 4.2 `max_tokens` が通るモデル例（環境/モデルによる）

```json
{
  "model": "some-chat-model",
  "messages": [
    { "role": "user", "content": "hello" }
  ],
  "temperature": 0.3,
  "max_tokens": 50
}
```

**注意**: モデルの“世代”ではなく、**個々のモデル仕様**で通る/通らないが変わる場合があります。  
最終的には **実リクエスト**で確かめるのが確実です。

---

## 5. 互換性でよく出る追加論点（他アプリでの事故ポイント）

### 5.1 レスポンス取り出し位置の違い

- Chat Completions は一般に `choices[0].message.content` を見る実装が多い
- Responses API などは出力構造が異なるので、**取り出し位置を抽象化**しておくと移行が楽です

### 5.2 JSONを返させるときの作法

“JSONのみ返せ”は破られやすいので、堅牢化のために：

- コードブロックを許容して抽出する（```json ... ```）
- パース失敗時のフォールバック（安全な既定値）を用意

### 5.3 ローカルLLM互換API（LM Studio 等）との共存

ローカル実装は “Chat Completions互換” をうたっていても差があり：

- `max_tokens` しか受けない
- `temperature` の扱いが違う
- `system` ロールを無視する

…などが起こり得ます。  
この場合も **互換レイヤに `useLocal` フラグ**を渡して分岐させる設計が扱いやすいです。

---

## 6. 推奨チェックリスト（導入/移行時）

- **APIパラメータを“直書き”しない**（互換レイヤに集約）
- **モデル変更の影響範囲を最小化**（判定は1関数に閉じ込める）
- **エラー文をそのままUI/ログに出せる導線**を作る（原因特定が速い）
- **接続テスト**を用意し、最小リクエストで仕様差分を早期に検知
- 失敗時は **「どのモデル/どのエンドポイント/どのパラメータ」** で落ちたかを必ずログに残す

---

## 7. 本リポジトリ固有の実装例（参照）

本アプリ向けの実装メモは別ドキュメントにあります：

- `docs/OPENAI_GPT4_1_GPT5_INTEGRATION.md`

