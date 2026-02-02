# Map.jsx リファクタリング計画

## 現状分析

### ファイルサイズ
- **Map.jsx**: 3,018行（プロジェクト最大）
- **課題**: 単一ファイルに機能が集中し、保守性・可読性が低下

### 主な責務（現状）
1. **状態管理** (~100行)
   - 20+ useState hooks
   - viewState, layerVisibility, 各種UI状態
2. **レイヤー設定** (~600行)
   - GeoJSONレイヤー設定（空港、DID、禁止区域等）
   - 制限表面タイル、気象レイヤー
3. **イベントハンドラー** (~400行)
   - マウスイベント（クリック、ホバー、ドラッグ）
   - キーボードショートカット
4. **描画・計算ロジック** (~300行)
   - 最適化ルート表示
   - 衝突検出結果の可視化
5. **UI制御** (~500行)
   - レイヤーコントロール
   - コンテキストメニュー
   - ツールチップ
6. **JSX/レンダリング** (~1,000行)
   - MapGL本体
   - Source/Layer群
   - 各種コントロールコンポーネント

---

## リファクタリング戦略

### 原則
1. **段階的リファクタリング**: 一度に全てを変更せず、機能単位で分離
2. **後方互換性**: 既存APIを維持し、段階的に移行
3. **テスト駆動**: 各リファクタリング後に動作確認
4. **Serena活用**: シンボルレベルでの安全な抽出

### Phase 1: 状態管理の分離（優先度: 高）

#### 目標
- カスタムフックへの抽出
- 関心事の分離

#### 実装

```javascript
// hooks/useMapState.js
export const useMapState = (initialSettings) => {
  const [viewState, setViewState] = useState({...})
  const [isMapReady, setIsMapReady] = useState(false)
  // ... その他のマップ状態

  return {
    viewState, setViewState,
    isMapReady, setIsMapReady,
    // ...
  }
}

// hooks/useLayerVisibility.js
export const useLayerVisibility = (initialSettings) => {
  const [layerVisibility, setLayerVisibility] = useState({...})
  const [favoriteGroups, setFavoriteGroups] = useState(...)

  const toggleLayer = useCallback((layerKey) => {...})
  const toggleGroupLayers = useCallback((layerKeys, enabled) => {...})

  return {
    layerVisibility,
    favoriteGroups,
    toggleLayer,
    toggleGroupLayers,
    toggleFavoriteGroup,
  }
}

// hooks/useCrosshairState.js
export const useCrosshairState = (initialSettings) => {
  const [showCrosshair, setShowCrosshair] = useState(...)
  const [crosshairDesign, setCrosshairDesign] = useState(...)
  const [crosshairColor, setCrosshairColor] = useState(...)
  const [crosshairClickMode, setCrosshairClickMode] = useState(...)

  return {
    showCrosshair, setShowCrosshair,
    crosshairDesign, setCrosshairDesign,
    crosshairColor, setCrosshairColor,
    crosshairClickMode, setCrosshairClickMode,
  }
}

// hooks/useMapInteractions.js
export const useMapInteractions = () => {
  const [contextMenu, setContextMenu] = useState(null)
  const [polygonContextMenu, setPolygonContextMenu] = useState(null)
  const [tooltip, setTooltip] = useState(null)
  const [facilityPopup, setFacilityPopup] = useState(null)

  return {
    contextMenu, setContextMenu,
    polygonContextMenu, setPolygonContextMenu,
    tooltip, setTooltip,
    facilityPopup, setFacilityPopup,
  }
}
```

**Serena実行例:**
```bash
# 1. viewState関連の状態を特定
find_symbol "Map/viewState" --include_body=false

# 2. 依存関係を確認
find_referencing_symbols "viewState")

# 3. hooks/useMapState.js に抽出
replace_symbol_body で安全に移動
```

---

### Phase 2: レイヤー設定の分離（優先度: 高）

#### 目標
- GeoJSONレイヤー設定を独立したモジュールへ
- レイヤー設定の再利用性向上

#### 実装

```javascript
// config/layerConfigs.js
export const createLayerConfigs = () => {
  return [
    {
      id: 'airport-zones',
      label: '空港制限区域',
      getData: getAirportZonesGeoJSON,
      layers: [...],
      visibilityKey: 'showAirportZones'
    },
    // ... 他のレイヤー設定
  ]
}

// config/layerConstants.js
export const LAYER_COLORS = {...}
export const DEFAULT_CENTER = {...}
export const MAP_STYLES = {...}

// components/Map/LayerManager.jsx
const LayerManager = ({ layerVisibility, geoJsonLayerConfigs }) => {
  return (
    <>
      {geoJsonLayerConfigs.map(config => (
        config.visibilityCondition() && (
          <Source key={config.id} {...config.sourceProps}>
            {config.layers.map(layer => (
              <Layer key={layer.id} {...layer} />
            ))}
          </Source>
        )
      ))}
    </>
  )
}
```

**削減見込み:** ~600行 → 独立モジュール化

---

### Phase 3: イベントハンドラーの分離（優先度: 中）

#### 目標
- イベントハンドラーを機能別に分離
- カスタムフックへの抽出

#### 実装

```javascript
// hooks/useMapEvents.js
export const useMapEvents = ({
  mapRef,
  waypoints,
  polygons,
  onWaypointClick,
  onPolygonClick,
  ...
}) => {
  const handleClick = useCallback((e) => {...}, [...])
  const handleDoubleClick = useCallback((e) => {...}, [...])
  const handleContextMenu = useCallback((e) => {...}, [...])

  return {
    handleClick,
    handleDoubleClick,
    handleContextMenu,
  }
}

// hooks/useMapKeyboardShortcuts.js
export const useMapKeyboardShortcuts = ({
  toggle3D,
  toggleLayer,
  changeMapStyle,
  ...
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {...}
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [...])
}

// hooks/useMapSelection.js
export const useMapSelection = (mapRef) => {
  const [selectionBox, setSelectionBox] = useState(null)
  const [selectedWaypointIds, setSelectedWaypointIds] = useState(new Set())
  const [isSelecting, setIsSelecting] = useState(false)

  const handleSelectionStart = useCallback((e) => {...}, [...])
  const handleSelectionMove = useCallback((e) => {...}, [...])
  const handleSelectionEnd = useCallback(() => {...}, [...])

  return {
    selectionBox,
    selectedWaypointIds,
    isSelecting,
    handlers: {
      onMouseDown: handleSelectionStart,
      onMouseMove: handleSelectionMove,
      onMouseUp: handleSelectionEnd,
    }
  }
}
```

**削減見込み:** ~400行 → hooks化

---

### Phase 4: 描画ロジックの分離（優先度: 中）

#### 目標
- 最適化ルート、衝突検出などの計算ロジックを分離
- useMemoの効率化

#### 実装

```javascript
// utils/mapDataTransformers.js
export const createOptimizedRouteGeoJSON = (optimizedRoute) => {
  const features = []
  // ... 変換ロジック
  return { type: 'FeatureCollection', features }
}

export const createOptimizationOverlayGeoJSON = (optimizedRoute, waypoints) => {
  const features = []
  // ... 変換ロジック
  return { type: 'FeatureCollection', features }
}

export const createPathCollisionGeoJSON = (pathCollisionResult) => {
  // ...
}

// hooks/useMapOverlays.js
export const useMapOverlays = ({
  optimizedRoute,
  waypoints,
  pathCollisionResult,
  polygonCollisionResult
}) => {
  const optimizedRouteGeoJSON = useMemo(
    () => createOptimizedRouteGeoJSON(optimizedRoute),
    [optimizedRoute]
  )

  const optimizationOverlayGeoJSON = useMemo(
    () => createOptimizationOverlayGeoJSON(optimizedRoute, waypoints),
    [optimizedRoute, waypoints]
  )

  // ...

  return {
    optimizedRouteGeoJSON,
    optimizationOverlayGeoJSON,
    pathCollisionGeoJSON,
    polygonCollisionGeoJSON,
  }
}
```

**削減見込み:** ~300行 → utils + hooks化

---

### Phase 5: UI制御コンポーネントの分離（優先度: 低）

#### 目標
- レイヤーコントロールパネルを独立コンポーネント化
- 再利用性の向上

#### 実装

```javascript
// components/Map/LayerControlPanel.jsx
const LayerControlPanel = ({
  layerVisibility,
  favoriteGroups,
  onToggleLayer,
  onToggleGroup,
  onToggleFavorite,
  geoJsonLayerConfigs
}) => {
  return (
    <div className={styles.layerControls}>
      {/* ALL group */}
      <ControlGroup {...} />

      {/* Favorite groups */}
      {/* Other groups */}
    </div>
  )
}

// components/Map/MapStylePicker.jsx
const MapStylePicker = ({
  currentStyle,
  onStyleChange,
  isOpen,
  onClose
}) => {
  // スタイル切り替えUI
}
```

**削減見込み:** ~500行 → 独立コンポーネント化

---

## 最終構造（目標）

```
src/components/Map/
├── Map.jsx (500行程度に削減)
│   ├── メインコンポーネント
│   ├── hooksの統合
│   └── JSXレンダリング
│
├── hooks/
│   ├── useMapState.js
│   ├── useLayerVisibility.js
│   ├── useCrosshairState.js
│   ├── useMapInteractions.js
│   ├── useMapEvents.js
│   ├── useMapKeyboardShortcuts.js
│   ├── useMapSelection.js
│   └── useMapOverlays.js
│
├── components/
│   ├── LayerManager.jsx
│   ├── LayerControlPanel.jsx
│   ├── MapStylePicker.jsx
│   └── MapOverlays.jsx
│
├── config/
│   ├── layerConfigs.js
│   ├── layerConstants.js
│   └── mapStyles.js
│
├── utils/
│   └── mapDataTransformers.js
│
├── DrawControl.jsx (既存)
├── ControlGroup.jsx (既存)
└── CustomLayerManager.jsx (既存)
```

---

## 実装ロードマップ

### Week 1: Phase 1 - 状態管理の分離
- [ ] `hooks/useMapState.js` 作成
- [ ] `hooks/useLayerVisibility.js` 作成
- [ ] `hooks/useCrosshairState.js` 作成
- [ ] `hooks/useMapInteractions.js` 作成
- [ ] Map.jsx に統合してテスト

### Week 2: Phase 2 - レイヤー設定の分離
- [ ] `config/layerConfigs.js` 作成
- [ ] `config/layerConstants.js` 作成
- [ ] `components/Map/LayerManager.jsx` 作成
- [ ] 既存レイヤー設定を移行

### Week 3: Phase 3 - イベントハンドラーの分離
- [ ] `hooks/useMapEvents.js` 作成
- [ ] `hooks/useMapKeyboardShortcuts.js` 作成
- [ ] `hooks/useMapSelection.js` 作成
- [ ] 統合テスト

### Week 4: Phase 4 - 描画ロジックの分離
- [ ] `utils/mapDataTransformers.js` 作成
- [ ] `hooks/useMapOverlays.js` 作成
- [ ] パフォーマンステスト

### Week 5: Phase 5 - UI制御コンポーネントの分離
- [ ] `components/Map/LayerControlPanel.jsx` 作成
- [ ] `components/Map/MapStylePicker.jsx` 作成
- [ ] 最終統合テスト

---

## テスト戦略

### 単体テスト
- 各カスタムフックの独立テスト
- utils関数のテスト（GeoJSON変換ロジック）

### 統合テスト
- Map.jsx全体の動作確認
- レイヤー表示/非表示の切り替え
- イベントハンドラーの動作確認

### ビジュアルリグレッションテスト
- Storybook でのコンポーネント表示確認
- スナップショットテスト

---

## リスクと対策

### リスク1: 既存機能の破壊
**対策:**
- 段階的リファクタリング
- 各Phase後に全機能テスト
- Gitブランチでの並行開発

### リスク2: パフォーマンス低下
**対策:**
- useMemo/useCallback の適切な使用
- React DevTools Profilerでの計測
- 必要に応じて最適化

### リスク3: Serena依存の学習コスト
**対策:**
- 小さい関数から練習
- ペアプログラミング
- フォールバック: 手動リファクタリング

---

## 期待される効果

### 保守性
- ✅ ファイルサイズ: 3,018行 → ~500行
- ✅ 関心事の分離による可読性向上
- ✅ 新機能追加が容易に

### 再利用性
- ✅ カスタムフックの他コンポーネントでの利用
- ✅ レイヤー設定の柔軟な拡張

### テスタビリティ
- ✅ 各hooksの独立テストが可能
- ✅ モックしやすい構造

### パフォーマンス
- ✅ 不要な再レンダリングの削減
- ✅ useMemoの最適化

---

## 次のアクション

1. **チーム承認**: この計画をレビュー
2. **Phase 1開始**: useMapState.js から着手
3. **Serena練習**: 小さい関数での操作練習
4. **ブランチ作成**: `feature/refactor-map-component`

---

## 参考資料

- [React Custom Hooks Best Practices](https://react.dev/learn/reusing-logic-with-custom-hooks)
- [MapLibre GL JS Documentation](https://maplibre.org/maplibre-gl-js-docs/api/)
- Serena MCP: `mcp__plugin_serena_serena__*` tools
- CLAUDE.md: Performance section
