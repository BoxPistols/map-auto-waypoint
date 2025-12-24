# Drone Waypoint - ドローン点検Waypoint管理アプリ

MapLibre GL JSを使用したドローン点検用のWaypoint管理アプリケーションです。

## 機能

- **マップ表示**: MapLibre GL + OpenStreetMapタイル
- **ポリゴン描画**: 点検エリアをマップ上で描画
- **ファイルインポート**: GeoJSON/KML形式のポリゴンデータを読み込み
- **住所検索**: Nominatim APIによるあいまい検索
- **Waypoint生成**: ポリゴンの頂点からWaypointを自動生成
- **エクスポート**: JSON/CSV形式でWaypointを出力

## セットアップ

```bash
# 依存パッケージのインストール
npm install

# 開発サーバーの起動
npm run dev

# 本番ビルド
npm run build
```

## 使い方

### ポリゴンの描画

1. ヘッダーの「描画モード」ボタンをクリック
2. マップ上をクリックしてポリゴンの頂点を追加
3. 最後の点をダブルクリックで描画完了

### ファイルのインポート

1. 「インポート」ボタンをクリック
2. GeoJSON または KML ファイルをドラッグ&ドロップ
3. プレビューを確認して「インポート」

### Waypointの生成

1. サイドバーのポリゴン一覧から対象を選択
2. 📍 ボタンでそのポリゴンのWaypointを生成
3. または「全てWaypoint生成」で一括生成

### データのエクスポート

1. 「エクスポート」ボタンをクリック
2. Waypoint: JSON形式またはCSV形式
3. ポリゴン: GeoJSON形式
4. フルバックアップ: 全データを一括保存

## 技術スタック

- React 18
- Vite
- MapLibre GL JS
- react-map-gl
- @mapbox/mapbox-gl-draw
- @turf/turf
- Sass

## データ形式

### Waypoint (JSON)

```json
[
  {
    "number": 1,
    "latitude": 35.658580,
    "longitude": 139.745432,
    "polygonName": "点検エリアA",
    "type": "vertex"
  }
]
```

### Waypoint (CSV)

```csv
番号,緯度,経度,ポリゴン名,種別
1,35.658580,139.745432,点検エリアA,頂点
```

## ライセンス

MIT
