import { Undo2, Redo2, Sun, Moon, Settings } from 'lucide-react'

/**
 * アプリケーションヘッダー
 * タイトル + Undo/Redo + 描画モード + Import/Export + テーマ + 設定 + ヘルプ
 */
export default function AppHeader({
  fullMapMode,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  editingPolygon,
  drawMode,
  setDrawMode,
  onFinishEditing,
  onOpenImport,
  onOpenExport,
  theme,
  THEMES,
  toggleTheme,
  onOpenApiSettings,
  onOpenHelp,
}) {
  return (
    <header className={`app-header ${fullMapMode ? 'hidden' : ''}`}>
      <h1 className="app-title">Drone Waypoint</h1>
      <div className="header-actions">
        <button
          className="icon-button"
          onClick={onUndo}
          disabled={!canUndo}
          data-tooltip="元に戻す (⌘Z)"
          data-tooltip-pos="bottom"
        >
          <Undo2 size={18} />
        </button>
        <button
          className="icon-button"
          onClick={onRedo}
          disabled={!canRedo}
          data-tooltip="やり直す (⌘⇧Z)"
          data-tooltip-pos="bottom"
        >
          <Redo2 size={18} />
        </button>
        <div className="header-divider" />
        {editingPolygon ? (
          <button
            className="mode-toggle active"
            onClick={onFinishEditing}
          >
            編集完了
          </button>
        ) : (
          <button
            className={`mode-toggle ${drawMode ? 'active' : ''}`}
            onClick={() => setDrawMode(!drawMode)}
          >
            {drawMode ? '描画中' : '描画モード'}
          </button>
        )}
        <button
          className="action-button"
          onClick={onOpenImport}
          disabled={!!editingPolygon}
        >
          インポート
        </button>
        <button
          className="action-button"
          onClick={onOpenExport}
          disabled={!!editingPolygon}
        >
          エクスポート
        </button>
        <button
          className="icon-button theme-button"
          onClick={toggleTheme}
          data-tooltip={theme === THEMES.DARK ? 'ライトモード' : 'ダークモード'}
          data-tooltip-pos="bottom"
        >
          {theme === THEMES.DARK ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button
          className="icon-button settings-button"
          onClick={onOpenApiSettings}
          data-tooltip="設定 (⌘⇧K)"
          data-tooltip-pos="bottom"
        >
          <Settings size={18} />
        </button>
        <button
          className="help-button"
          onClick={onOpenHelp}
          data-tooltip="ヘルプ (⌘/ or ?)"
          data-tooltip-pos="left"
        >
          ?
        </button>
      </div>
    </header>
  )
}
