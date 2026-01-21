# Drone Waypoint - ドローン点検 Waypoint 管理アプリ

MapLibre GL JS を使用したドローン点検用の Waypoint 管理アプリケーションです。 DID（人口集中地区）判定、空港制限区域チェック、AI による飛行計画分析機能を搭載しています。

## 主要機能

### 地図・描画機能

- **マップ表示**: MapLibre GL + 複数のタイルソース（OpenStreetMap、国土地理院標準/淡色/航空写真）
- **3D 表示**: ピッチ・回転による 3 次元表示
- **ポリゴン描画**: 点検エリアをマップ上で描画・編集
- **ファイルインポート**: GeoJSON/KML 形式のポリゴンデータを読み込み
- **住所検索**: Nominatim API によるあいまい検索（検索結果からポリゴン自動生成）

### Waypoint 管理

- **自動生成**: ポリゴンの頂点から Waypoint を自動生成
- **グリッド生成**: ポリゴン内部に等間隔で Waypoint を配置
- **一括操作**: Shift+ドラッグで範囲選択、一括削除
- **標高取得**: 国土地理院 標高 API で各Waypointの標高を取得
- **エクスポート**: JSON/CSV/NOTAM 形式で出力

### 安全性チェック

- **DID 判定**: 人口集中地区（DID）の自動検出
- **空港制限区域**: 主要空港周辺の制限区域表示
- **飛行禁止区域**: 国の重要施設・原発・米軍基地等
- **ヘリポート**: 病院・官公庁等のヘリポート
- **視覚的警告**: DID 内の Waypoint を赤色で表示

### AI フライトアシスタント

- **リスク判定**: 飛行計画の安全性を自動分析
- **最適化提案**: 制限区域を避ける Waypoint 位置を提案
- **許可申請ガイド**: 必要な許可・申請の一覧表示
- **OpenAI 連携**: GPT による詳細な分析（オプション）

## セットアップ

```bash
# 依存パッケージのインストール
npm install

# 開発サーバーの起動
npm run dev

# 本番ビルド（GitHub Pages用）
npm run build

# 本番ビルド（Vercel用）
npm run build:vercel
```

## API 設定

このアプリは OpenAI API（オプション）に対応しています。**なくても基本機能は動作します。**

### 1. OpenAI API（オプション）

AI チャット機能による詳細な飛行計画分析に使用します。

| 項目     | 内容                                                    |
| -------- | ------------------------------------------------------- |
| 用途     | フライトアシスタントの AI チャット                      |
| なくても | ローカル分析（DID/空港チェック）は動作                  |
| 取得方法 | [OpenAI Platform](https://platform.openai.com/api-keys) |

設定方法:

1. アプリ右下のチャットアイコンをクリック
2. 「API キー設定」をクリック
3. OpenAI API キーを入力

## デプロイ

### GitHub Pages

1. リポジトリの Settings > Pages を開く
2. Source を "GitHub Actions" に設定
3. `main` ブランチにプッシュすると自動デプロイ

環境変数（Secrets に設定）:

```bash
VITE_OPENAI_API_KEY=sk-xxx...
```

### Vercel

1. Vercel にリポジトリを接続
2. Framework Preset: Vite を選択
3. Build Command: `npm run build:vercel`

環境変数（Vercel Dashboard で設定）:

```bash
VITE_OPENAI_API_KEY=sk-xxx...
```

## キーボードショートカット

### 一般

| キー                   | 動作                                          |
| ---------------------- | --------------------------------------------- |
| `C`                    | チャット（フライトアシスタント）を開く/閉じる |
| `S`                    | サイドバーを開く/閉じる                       |
| `P`                    | ポリゴンパネルに切り替え                      |
| `W`                    | Waypoint パネルに切り替え                     |
| `?`                    | ヘルプを開く                                  |
| `Cmd/Ctrl + Z`         | 元に戻す                                      |
| `Cmd/Ctrl + Shift + Z` | やり直す                                      |

### マップ操作

| キー | 動作                       |
| ---- | -------------------------- |
| `D`  | DID オーバーレイ ON/OFF    |
| `A`  | 空港エリア ON/OFF          |
| `R`  | レッドゾーン ON/OFF        |
| `Y`  | イエローゾーン ON/OFF      |
| `H`  | ヘリポート ON/OFF          |
| `M`  | 地図スタイル切り替え       |
| `3`  | 2D/3D 切り替え             |

### Waypoint 操作

| キー                   | 動作                         |
| ---------------------- | ---------------------------- |
| `Shift + ドラッグ`     | 範囲選択（複数 Waypoint）    |
| `Delete` / `Backspace` | 選択した Waypoint を一括削除 |
| `Shift + クリック`     | 地図上に Waypoint を手動追加 |
| `Escape`               | 選択解除                     |

## 技術スタック

- **フロントエンド**: React 18, Vite
- **地図**: MapLibre GL JS, react-map-gl
- **描画**: @mapbox/mapbox-gl-draw
- **地理計算**: @turf/turf
- **スタイル**: Sass (SCSS Modules)
- **テスト**: Vitest, Testing Library
- **デプロイ**: GitHub Pages, Vercel

## データソース

| データ | ソース | 更新頻度 |
| --- | --- | --- |
| DID（人口集中地区） | 国土地理院タイル + GitHub GeoJSON (2020年版データ使用) | リアルタイム |
| 空港制限区域 | 内蔵データ（全国150+施設） | 手動更新 |
| 飛行禁止区域 | 内蔵データ（重要施設・原発・米軍基地） | 手動更新 |
| 標高 | 国土地理院 標高 API | リアルタイム |

## ドローン飛行申請ワークフロー対応状況

本アプリは、ドローン飛行申請に必要な事前調査をサポートします。以下は各要件の対応状況です。

### ✅ 対応済み

| 要件 | 実装状況 | データソース |
|------|----------|-------------|
| 住所検索 | Nominatim API によるあいまい検索 | OpenStreetMap |
| DID（人口集中地区）確認 | 地図上に表示 + 自動判定 | 国土地理院タイル |
| 空港周辺確認 | 全国150+施設の制限区域表示 | 内蔵データ |
| 重要施設（小型無人機等飛行禁止法） | 皇居、官邸、原発、米軍基地等 | 内蔵データ |
| 外国公館・政党本部 | イエローゾーンとして表示 | 内蔵データ |
| ヘリポート | 主要ヘリポート表示 | 内蔵データ |
| 国土地理院地図 | 標準/淡色/航空写真切り替え | 国土地理院 |
| DIPS外部リンク | 外部リンク提供 | - |

### ⚠️ 部分的対応

| 要件 | 現状 | 不足点 |
|------|------|--------|
| 管制区 | 空港周辺のみ | 詳細な管制圏情報なし |
| 自衛隊演習場 | 軍用飛行場データあり | 演習場境界の詳細なし |

### ❌ 未実装（対応予定）

| 要件 | データソース | 対応可能性 | 優先度 |
|------|-------------|-----------|--------|
| 進入管制区 | [国土数値情報](https://nlftp.mlit.go.jp/) | ✅ GeoJSON取得可能 | 高 |
| 特別管制区 | [国土数値情報](https://nlftp.mlit.go.jp/) | ✅ GeoJSON取得可能 | 高 |
| 民間訓練試験空域 | [国土数値情報](https://nlftp.mlit.go.jp/) | ✅ GeoJSON取得可能 | 中 |
| NOTAM/SUP情報 | [SWIMポータル](https://aisjapan.mlit.go.jp/) | ✅ API提供あり（2025年2月〜） | 高 |
| 場外離発着場 | [DIPS API](https://www.ossportal.dips.mlit.go.jp/) | ✅ API提供あり | 中 |
| 自治体条例禁止区域 | 各自治体HP | ⚠️ 統一データなし | 低 |
| SkyVector連携 | - | ❌ 公開APIなし | - |

### 実装ロードマップ

#### Phase 1: 国土数値情報連携（優先度：高）

```
- 進入管制区のGeoJSON取得・表示
- 特別管制区のGeoJSON取得・表示
- 民間訓練試験空域のGeoJSON取得・表示
```

#### Phase 2: 公式API連携（優先度：中）

```
- DIPS API連携（飛行禁止エリア情報取得）
- SWIMポータル連携（NOTAM情報取得）
  ※ 2025年2月10日よりAIS JAPANからSWIMポータルへ移行
```

#### Phase 3: 自治体対応（優先度：低）

```
- 主要都市の条例禁止区域データ整備
- または各自治体HPへのリンク集約
```

### 参考リンク

| サービス | URL | 用途 |
|----------|-----|------|
| DIPS 2.0 | https://www.ossportal.dips.mlit.go.jp/ | 飛行許可・承認申請 |
| 国土数値情報 | https://nlftp.mlit.go.jp/ | 空域データGeoJSON |
| SWIMポータル | https://aisjapan.mlit.go.jp/ | NOTAM・航空情報 |
| 警察庁 | https://www.npa.go.jp/bureau/security/kogatamujinki/ | 小型無人機等飛行禁止法 |
| 国土交通省 | https://www.mlit.go.jp/koku/koku_fr10_000041.html | 飛行禁止空域一覧 |

> **注意**: 本アプリは飛行申請の事前調査を支援するツールです。最終的な申請判断には、必ずDIPS、SWIMポータル、各空港HP等の公式情報を直接確認してください。

## データ形式

### Waypoint (JSON)

```json
[
    {
        "number": 1,
        "latitude": 35.65858,
        "longitude": 139.745432,
        "elevation": 42.5,
        "polygonName": "点検エリアA",
        "type": "vertex"
    }
]
```

### Waypoint (CSV)

```csv
番号,緯度,経度,標高,ポリゴン名,種別
1,35.658580,139.745432,42.5,点検エリアA,頂点
```

### NOTAM 形式

```bash
【範囲1 点検エリアA】
海抜高度: 100m

北緯35°39'31" 東経139°44'44"
北緯35°39'28" 東経139°44'48"
北緯35°39'25" 東経139°44'44"
```

## プロジェクト構造

```bash
src/
├── components/          # UIコンポーネント
│   ├── Map/            # 地図関連
│   ├── FlightAssistant/ # AIアシスタント
│   ├── ExportPanel/    # エクスポート機能
│   └── ...
├── services/           # ビジネスロジック
│   ├── flightAnalyzer.js  # 飛行計画分析
│   ├── openaiService.js   # OpenAI連携
│   └── ...
├── utils/              # ユーティリティ
└── test/               # テスト設定
```

## ライセンス

MIT

## 謝辞

- [国土地理院](https://www.gsi.go.jp/) - 地図タイル、DID データ
- [OpenStreetMap](https://www.openstreetmap.org/) - 地図データ
