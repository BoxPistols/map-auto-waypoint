import FileImport from '../../FileImport/FileImport'
import ExportPanel from '../../ExportPanel/ExportPanel'
import GridSettingsDialog from '../../GridSettingsDialog/GridSettingsDialog'
import HelpModal from '../../HelpModal/HelpModal'
import { markVisited } from '../../../utils/storage'

/**
 * Import / Export / Grid設定 / Helpの各モーダル群
 */
export default function AppModals({
  showImport,
  setShowImport,
  handleImport,
  showExport,
  setShowExport,
  waypoints,
  polygons,
  showGridSettings,
  setShowGridSettings,
  handleGridSettingsConfirm,
  showHelp,
  setShowHelp,
}) {
  return (
    <>
      {/* Import Modal */}
      {showImport && (
        <div className="modal-overlay" onClick={() => setShowImport(false)}>
          <div onClick={e => e.stopPropagation()}>
            <FileImport
              onImport={handleImport}
              onClose={() => setShowImport(false)}
            />
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExport && (
        <div className="modal-overlay" onClick={() => setShowExport(false)}>
          <div onClick={e => e.stopPropagation()}>
            <ExportPanel
              waypoints={waypoints}
              polygons={polygons}
              onClose={() => setShowExport(false)}
            />
          </div>
        </div>
      )}

      {/* Grid Settings Modal */}
      {showGridSettings && (
        <div className="modal-overlay" onClick={() => setShowGridSettings(null)}>
          <div onClick={e => e.stopPropagation()}>
            <GridSettingsDialog
              polygon={showGridSettings}
              onConfirm={handleGridSettingsConfirm}
              onCancel={() => setShowGridSettings(null)}
            />
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelp && (
        <div className="modal-overlay" onClick={() => setShowHelp(false)}>
          <div onClick={e => e.stopPropagation()}>
            <HelpModal onClose={() => {
              setShowHelp(false)
              markVisited()
            }} />
          </div>
        </div>
      )}
    </>
  )
}
