# MCP統合ビジョン - フライト計画自動化システム

## 概要

担当者フィードバック（2024年12月）に基づく、MCPを活用したフライト計画自動化システムの設計ドキュメント。

## 現状の機能

### 実装済み
- [x] 住所検索からの自動ポリゴン生成（矩形・円形）
- [x] 3種類のWaypoint生成（頂点・周囲・グリッド）
- [x] 標高データ自動取得（国土地理院API）
- [x] 禁止空域・DID表示
- [x] 多形式エクスポート（GeoJSON, KML, CSV, NOTAM）
- [x] Undo/Redo履歴管理

### 未実装（MCP統合で実現）
- [ ] 自然言語による経路生成
- [ ] 過去フライトデータの活用
- [ ] 地上リスク自動判定
- [ ] 最適機体提案
- [ ] 申請・調整コスト可視化
- [ ] UTM干渉チェック

---

## MCP統合アーキテクチャ

### Phase 1: 基盤構築

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                     │
│  ┌───────────────────────────────────────────────────┐ │
│  │  ChatInterface.jsx - 自然言語入力UI              │ │
│  │  FlightPlanPanel.jsx - 計画結果表示              │ │
│  │  RiskAssessmentView.jsx - リスク判定表示         │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                   MCP Client Layer                       │
│  - WebSocket/HTTP接続                                   │
│  - Tool呼び出し管理                                     │
│  - Resource購読                                         │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    MCP Servers                           │
├─────────────────────────────────────────────────────────┤
│  🗺️ flight-data-server     │ 過去フライトデータ管理    │
│  📍 risk-assessment-server │ 地上リスク・空域判定      │
│  🚁 aircraft-db-server     │ 機体データベース          │
│  📋 regulation-server      │ 規制・申請要件            │
│  ✈️ utm-integration-server │ UTMシステム連携           │
└─────────────────────────────────────────────────────────┘
```

### Phase 2: MCPサーバー定義

#### 1. flight-data-server (フライトデータサーバー)

```typescript
// Resources
resources: [
  {
    uri: "flight://history/{operator_id}",
    name: "過去フライト履歴",
    description: "オペレーターの過去フライトデータ"
  },
  {
    uri: "flight://templates/{category}",
    name: "フライトテンプレート",
    description: "目的別フライトパターン（太陽光点検、送電線点検等）"
  }
]

// Tools
tools: [
  {
    name: "search_similar_flights",
    description: "類似条件のフライトを検索",
    inputSchema: {
      location: "GeoJSON",
      purpose: "string",
      radius_km: "number"
    }
  },
  {
    name: "generate_flight_path",
    description: "目的に応じた経路を自動生成",
    inputSchema: {
      area: "GeoJSON",
      purpose: "string",
      aircraft_type: "string",
      constraints: "object"
    }
  }
]
```

#### 2. risk-assessment-server (リスク判定サーバー)

```typescript
// Tools
tools: [
  {
    name: "assess_ground_risk",
    description: "地上リスクを判定",
    inputSchema: {
      flight_area: "GeoJSON",
      flight_altitude: "number"
    },
    outputSchema: {
      risk_level: "LOW|MEDIUM|HIGH|CRITICAL",
      factors: [
        { type: "population_density", value: "number", risk: "string" },
        { type: "infrastructure", items: ["string"], risk: "string" },
        { type: "buildings", count: "number", risk: "string" }
      ],
      mitigations: ["string"]
    }
  },
  {
    name: "check_airspace",
    description: "空域制限をチェック",
    inputSchema: {
      flight_area: "GeoJSON",
      flight_altitude: "number",
      datetime: "ISO8601"
    },
    outputSchema: {
      restrictions: [
        { type: "string", authority: "string", requirement: "string" }
      ],
      notams: ["NOTAM"],
      utm_conflicts: ["object"]
    }
  }
]
```

#### 3. aircraft-db-server (機体データベースサーバー)

```typescript
// Resources
resources: [
  {
    uri: "aircraft://catalog",
    name: "登録機体一覧"
  }
]

// Tools
tools: [
  {
    name: "recommend_aircraft",
    description: "ミッションに最適な機体を提案",
    inputSchema: {
      mission_type: "string",
      flight_distance_km: "number",
      payload_requirement: "string",
      environment: "string"
    },
    outputSchema: {
      recommendations: [
        {
          aircraft_id: "string",
          model: "string",
          suitability_score: "number",
          reasons: ["string"],
          limitations: ["string"]
        }
      ]
    }
  }
]
```

#### 4. regulation-server (規制・申請サーバー)

```typescript
// Tools
tools: [
  {
    name: "analyze_requirements",
    description: "必要な申請・許可を分析",
    inputSchema: {
      flight_plan: "object",
      operator_certifications: ["string"]
    },
    outputSchema: {
      required_permissions: [
        {
          type: "string",
          authority: "string",
          estimated_days: "number",
          estimated_cost: "number",
          documents_needed: ["string"]
        }
      ],
      coordination_needed: [
        {
          stakeholder: "string",
          contact_method: "string",
          lead_time_days: "number"
        }
      ],
      total_estimated_cost: "number",
      total_estimated_days: "number"
    }
  },
  {
    name: "generate_application",
    description: "申請書類を自動生成",
    inputSchema: {
      flight_plan: "object",
      permission_type: "string",
      operator_info: "object"
    }
  }
]
```

#### 5. utm-integration-server (UTM連携サーバー)

```typescript
// 過去のLLMモックで実現していた機能を正式実装
tools: [
  {
    name: "check_utm_conflicts",
    description: "UTMシステムで干渉可能性をチェック",
    inputSchema: {
      flight_plan: "GeoJSON",
      datetime_range: { start: "ISO8601", end: "ISO8601" }
    },
    outputSchema: {
      conflicts: [
        {
          type: "OTHER_FLIGHT|RESTRICTED_AREA|TEMPORARY_RESTRICTION",
          severity: "INFO|WARNING|BLOCKING",
          description: "string",
          area: "GeoJSON",
          time_window: "object",
          contact_info: "string"
        }
      ],
      recommendations: ["string"]
    }
  }
]
```

---

## ユーザーストーリー

### シナリオ1: 太陽光パネル点検

```
ユーザー入力:
「静岡県掛川市の太陽光発電所、約2ヘクタール、パネル異常検知の点検飛行」

システム処理:
1. [flight-data-server] 類似案件の過去フライトを検索
2. [LLM] 最適な飛行パターンを判断（グリッド飛行、高度30m、オーバーラップ80%）
3. [risk-assessment-server] 地上リスク判定（農地・低リスク）
4. [aircraft-db-server] 推奨機体（Matrice 300 RTK + H20T）
5. [regulation-server] 必要申請（DID外・目視外飛行のため包括申請で対応可）
6. [utm-integration-server] 干渉チェック（近隣に他のフライト予定なし）

出力:
- 自動生成されたWaypoint付き飛行経路
- リスクレポート（PDFエクスポート可）
- 推奨機体と理由
- 申請チェックリスト
- 総コスト見積もり
```

### シナリオ2: 送電線点検

```
ユーザー入力:
「東京電力管内、鉄塔No.123〜No.130間、架線近接点検」

システム処理:
1. [flight-data-server] 送電線点検テンプレートを適用
2. [LLM] 鉄塔間の経路を最適化
3. [risk-assessment-server] 高リスク判定（高圧線近接）
4. [regulation-server] 東京電力との調整要件、航空局許可
5. [utm-integration-server] 航空路との干渉チェック

出力:
- 安全マージンを考慮した飛行経路
- 高リスク警告と必須安全対策
- 東京電力調整フロー
- 必要資格・保険要件
```

---

## 実装ロードマップ

### Phase 1: MCP基盤（2-3週間）
- [ ] MCP Clientライブラリ選定・導入
- [ ] チャットインターフェースUI追加
- [ ] 基本的なTool呼び出しフロー確立

### Phase 2: フライトデータ連携（2-3週間）
- [ ] flight-data-server実装
- [ ] 過去フライトデータのインポート機能
- [ ] 類似フライト検索機能

### Phase 3: リスク判定（3-4週間）
- [ ] risk-assessment-server実装
- [ ] 地理データソース連携（国土地理院、統計データ）
- [ ] リスクレポート生成

### Phase 4: 規制・申請連携（3-4週間）
- [ ] regulation-server実装
- [ ] 申請書類テンプレート
- [ ] コスト算出ロジック

### Phase 5: UTM統合（2-3週間）
- [ ] utm-integration-server実装
- [ ] 既存LLMモックの機能移植
- [ ] リアルタイム干渉チェック

---

## 技術スタック案

### Frontend追加
- `@modelcontextprotocol/sdk` - MCP Client
- `openai` or `@anthropic-ai/sdk` - LLM API
- Markdown/リッチテキストレンダリング

### Backend/MCP Servers
- Node.js + TypeScript
- Express/Fastify (HTTP transport)
- PostgreSQL + PostGIS (地理データ)
- Redis (キャッシュ)

### 外部サービス連携
- Claude API (自然言語処理)
- 国土地理院API (地理データ)
- 統計GIS (人口データ)
- UTMプロバイダーAPI

---

## 参考: 過去のLLMモック

> 地図上に経路描画して「判定」を実行するとUTM的に干渉可能性のある情報がリストで表示される機能

この機能は `utm-integration-server` の `check_utm_conflicts` ツールとして実装予定。
UIは既存の地図コンポーネントに「判定」ボタンを追加し、結果をサイドパネルにリスト表示。

---

## 次のアクション

1. **PoC開発**: シンプルなMCP Server + Clientの接続確認
2. **データ収集**: 過去フライトデータのフォーマット定義
3. **ステークホルダー確認**: UTMプロバイダーとのAPI連携可否
4. **優先度決定**: どのPhaseから着手するか
