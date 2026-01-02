# PR4: 欧州 U-space に学ぶ UTM 設計パターン（レビュー）

このドキュメントは、**「UTM設計パターンを欧州 U-space から学び、将来のUTM統合を破綻させない境界線を先に決める」**ためのレビューまとめです。  
本リポジトリの現状（`src/services/flightAnalyzer.js` の `checkUTMConflicts` はシミュレーション、`docs/MCP_INTEGRATION_VISION.md` は `utm-integration-server` を想定）に対して、どこまでを「計画アプリ」として持ち、どこからを「UTM/USSP連携」として外だしするかを明確にします。

---

## 1. 用語（最小）

- **U-space**: EU圏の無人航空機運航を支える枠組み。段階的にサービスが高度化していく前提。
- **USSP (U-space Service Provider)**: U-spaceサービス（例: フライト承認、交通情報、追跡等）を提供する事業者。
- **CISP (Common Information Service Provider)**: 共通情報（例: 制限空域/一時制限/気象/有人機関連情報など、運用に必要な共通データ）を集約・配布する役割。

ポイントは **「USSPが意思決定・調整を担当し、CISPが共通情報の配布を担当する」** という分離で、マルチプロバイダ環境で破綻しにくくなります。

---

## 2. U-spaceのサービス階層（U1〜U4の“考え方”）

文献・実証プロジェクト（SESAR/EuroDRONE/CORUS-XUAM等）で頻出する捉え方として、以下のように「段階で必要な機能が増える」整理が使われます（厳密な法的定義の再掲ではなく、設計観点の要約です）。

- **U1（基礎）**: 空域の静的/準静的情報の提供（制限、地理的条件、周知）
- **U2（初期）**: 登録/識別、フライト申請・承認、基本的な運航状況共有
- **U3（高度）**: 交通情報の高度化、（少なくとも）戦略的なコンフリクト検出、動的制限への追従
- **U4（完全）**: 高密度運航に向けた高度自動化（より動的・リアルタイムな協調）

本アプリは「作図・計画・エクスポート」が中心なので、UTM統合は **まずU2〜U3相当の“計画時チェック（戦略的）”** を扱える境界を目標にするのが現実的です。

---

## 3. 設計パターン（実装より先に決めること）

### 3.1 CISP / USSP 分離（責務の固定）

- **CISP的なもの**: 制限空域・一時制限・運用上の共通情報（地理/時間）を配布する
- **USSP的なもの**: フライト意図（flight intent）を受け、承認/拒否/条件付き承認、他者との整合を取る

このリポジトリでは、クライアント（React）にCISPデータを直接混ぜ込むより、将来は `risk-assessment-server` / `utm-integration-server` のどちらかで **「共通情報取得→解釈→結果の正規化」** を担当させるのが安全です。

### 3.2 「点」ではなく「4Dボリューム」で扱う（Flight Intent）

UTMでの衝突/干渉は、基本的に **場所(x,y) + 高度(z) + 時間(t)** の重なりです。  
このアプリのWaypoint列は便利ですが、UTM連携では最終的に **4Dボリューム（例: コリドー/ポリゴン×高度帯×時間窓）** に変換できる必要があります。

最小の型（提案）:

```typescript
export type Iso8601 = string;

export type LngLat = {
  lng: number;
  lat: number;
};

export type AltitudeMeters = {
  minMetersAgl: number; // AGLを採用するなら一貫してAgl
  maxMetersAgl: number;
};

export type TimeWindow = {
  start: Iso8601;
  end: Iso8601;
};

export type Volume4D =
  | {
      kind: "CIRCLE";
      center: LngLat;
      radiusMeters: number;
      altitude: AltitudeMeters;
      time: TimeWindow;
    }
  | {
      kind: "POLYGON";
      // 最小: 先頭と末尾が同一であることは呼び出し側で保証する/サーバ側で正規化
      vertices: LngLat[];
      altitude: AltitudeMeters;
      time: TimeWindow;
    }
  | {
      kind: "CORRIDOR";
      // 経路（中心線）＋幅で近似
      path: LngLat[];
      halfWidthMeters: number;
      altitude: AltitudeMeters;
      time: TimeWindow;
    };

export type FlightIntent = {
  operatorId: string;
  volumes: Volume4D[];
  // 目的や機体種などは補助情報。UTM側で必須でない限り必須化しない
  metadata?: {
    purpose?: string;
    aircraftType?: string;
  };
};
```

### 3.3 ライフサイクルを状態機械として扱う（承認→開始→終了）

「チェックした」だけではなく、運用上は以下のような状態を辿ります（名称は一例）:

- `DRAFT`（草案）
- `SUBMITTED`（提出）
- `ACCEPTED` / `REJECTED` / `CONDITIONALLY_ACCEPTED`（承認系）
- `ACTIVATED`（開始）
- `CLOSED`（終了）
- `CANCELLED`（中止）

設計上のポイント:

- **冪等性**: 同じ意図を再送しても二重登録にならない（`clientRequestId` 等）
- **更新**: 変更は「差分」よりも「新しい意図を再提出」＋参照関係（置換）で扱うほうが安全なことが多い

### 3.4 “マルチUSSP”前提のフェデレーション

欧州の考え方では、単一の中央UTMに依存するより、**複数のUSSPが同一空域を扱う可能性**を前提にしがちです。  
このときクライアント（本アプリ）が複数USSPの差異を吸収するのは無理があるため、**統合点はサーバ側（`utm-integration-server`）に置く**のが基本パターンです。

### 3.5 イベント駆動 / 購読（“変化する制限”への追従）

制限空域や一時制限、他運航の状況は変化します。  
「一回チェックして終わり」ではなく、以下のどちらかが必要になります。

- **購読**: ある地域・時間の変更通知を購読し、計画に影響が出たら再評価
- **ポーリング**: 定期的に再評価（PoCではこちらが実装しやすい）

このリポジトリでは、`docs/MCP_INTEGRATION_VISION.md` の “Resource購読” のアイデアと相性が良いです。

---

## 4. 本リポジトリへの落とし込み（具体）

### 4.1 いまあるUTMモックの位置づけ

- `src/services/flightAnalyzer.js` の `checkUTMConflicts` は **「計画中心点と半径の近似」**で衝突を疑似判定している
- `docs/MCP_INTEGRATION_VISION.md` は将来の `utm-integration-server` を想定している

→ PR4としては、ここを **「FlightIntent（4D）」を入出力の中心にする**方向で設計の型を決め、コードは段階的に追随させるのが筋です。

### 4.2 `utm-integration-server`（将来）の最小API像

既存ビジョンの `check_utm_conflicts` を、EU U-spaceパターンに寄せると次が最小ラインです。

```typescript
export type ConflictSeverity = "INFO" | "WARNING" | "BLOCKING";
export type ConflictType =
  | "OTHER_OPERATION"
  | "RESTRICTED_AREA"
  | "TEMPORARY_RESTRICTION"
  | "UNKNOWN";

export type UTMConflict = {
  type: ConflictType;
  severity: ConflictSeverity;
  summary: string;
  // どのボリュームが問題かを参照できるようにしておくとUIが作りやすい
  affectedVolumeIndex: number;
  // 可能なら、問題箇所の4Dボリュームを返す（UIで可視化するため）
  conflictVolume?: Volume4D;
  // 「どう直せば良いか」を機械可読で返すと自動修正に繋がる
  suggestedMitigations: Array<
    | { kind: "SHIFT_TIME"; minutes: number }
    | { kind: "REDUCE_ALTITUDE_MAX"; newMaxMetersAgl: number }
    | { kind: "SHRINK_RADIUS"; newRadiusMeters: number }
    | { kind: "SPLIT_OPERATION"; note?: string }
  >;
};

export type CheckUTMConflictsResponse = {
  checked: true;
  clearForFlight: boolean;
  conflicts: UTMConflict[];
  warnings: string[];
  // 監査/追跡用
  checkedAt: Iso8601;
};
```

### 4.3 まず実装するのは「戦略的チェック」

このアプリで価値が高いのは、リアルタイム追跡より先に **「計画の作成時に弾けるものは弾く」**ことです。

- PoC: `POLYGON` or `CIRCLE` + `Altitude` + `TimeWindow` の重なり検知
- 次: `CORRIDOR`（経路）近似、提案（時間ずらし/高度調整/分割）

---

## 5. PR4の成果物（このドキュメントで満たすこと）

- EU U-spaceの考え方として重要な **責務分離（USSP/CISP）** を明文化した
- UTM統合の中心データを **FlightIntent（4D）** として固定した
- 将来の `utm-integration-server` の **最小API** を、`any` なしの型で提示した

