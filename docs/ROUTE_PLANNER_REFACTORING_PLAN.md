# routePlanner.js リファクタリング計画（未着手）

## 背景・課題

`src/services/routePlanner.js`（491行）は、`legalRequirements.js` / `riskService.js` / `openaiService.js` と同様に機能別分割の対象として着手されたが、**未完成のまま中断**した。

2026-05-16 の並列 Agent 作業で `src/services/route-planner/`（`_constants.js`, `routeGenerator.js`, `routeEvaluator.js`, `useCases.js`）が新規作成されたが、以下の理由により統合されず孤立した状態だった:

- `index.js`（集約・re-export の入口）が存在しなかった
- 元の `routePlanner.js` がファサード化（re-export への置き換え）されていなかった
- 分割先モジュールに `generateRouteOptions`（消費側が実際に使用する主要関数）が移設されていなかった
- 結果として `route-planner/` 配下のどのファイルからも参照されず、デッドコード化していた

2026-07-10 の作業でこの孤立コードは削除した。分割自体は今回のブランチのスコープ外とし、設計情報のみ本ドキュメントに残す。

## 現状（routePlanner.js の構造）

`src/services/routePlanner.js`（491行、変更なし・現行のまま稼働中）:

| エクスポート | 種別 | 概要 |
|---|---|---|
| `USE_CASES` | export const（配列） | ユースケース定義（緊急医療輸送等） |
| `generateDirectRoute(start, end)` | 内部関数 | 直線ルート生成 |
| `generateAvoidanceRoute(start, end, options)` | 内部関数（async） | DID/空港等を回避するルート生成 |
| `evaluateRoute(route, useCase, options)` | 内部関数（async） | ルート評価（距離・リスク等） |
| `generateRouteOptions(start, end, useCase, options)` | **export**（async） | 複数ルート案を生成する主関数 |
| `getUseCaseById(id)` | export | ユースケースIDから定義を取得 |
| `default export` | export | 上記をまとめたオブジェクト |

## 消費側（現在 routePlanner.js を直接 import）

- `src/components/RouteOptimizer/RouteOptimizer.jsx:35` → `import { USE_CASES } from '../../services/routePlanner'`
- `src/components/FlightPlanner/FlightPlanner.jsx:35` → `import { USE_CASES, generateRouteOptions } from '../../services/routePlanner'`

## 分割方針（将来実施する場合の設計案）

他3モジュール（legal / risk / openai）と同じパターンを踏襲する:

```
src/services/route-planner/
├── _constants.js      # METERS_PER_DEGREE 等の定数
├── useCases.js         # USE_CASES, getUseCaseById
├── routeGenerator.js   # generateDirectRoute, generateAvoidanceRoute
├── routeEvaluator.js    # evaluateRoute
└── index.js             # 集約・re-export（generateRouteOptions を含む）
```

`src/services/routePlanner.js` は他3ファイルと同様、`export * from './route-planner'` 形式の薄いファサードに置き換える。

## 完了条件

1. `route-planner/index.js` に `generateRouteOptions` を含む全 export を集約
2. `routePlanner.js` をファサード化（re-export のみ、実装コードなし）
3. 消費側 `RouteOptimizer.jsx:35` / `FlightPlanner.jsx:35` の import が無変更のまま解決すること
4. `npm run test:run` / `npm run lint` / `npm run build` が通ること
5. 実アプリで RouteOptimizer / FlightPlanner のルート生成機能が従来通り動作すること（挙動変更ゼロが原則）

## 関連ドキュメント

- `docs/MAP_REFACTORING_PLAN.md` — 同じ分割パターンの適用元（Map.jsx）
- 本ブランチ（`refactor/comprehensive-2026-05-16`）で実施した MainLayout.jsx / legalRequirements.js / riskService.js / openaiService.js の分割が実装参考になる
