/**
 * Custom Layer Manager Component
 * ユーザーがカスタムレイヤーをインポート/エクスポート/管理するUI
 */

import { useState, useRef, useEffect } from 'react'
import {
  CustomLayerService,
  readGeoJSONFile,
  downloadAsFile
} from '../../lib/services/customLayers'
import { X, Plus, Download, Trash2, Layers as LayersIcon } from 'lucide-react'
import './CustomLayerManager.scss'

/**
 * Layer categories and their visual properties
 */
const CATEGORIES = [
  { id: 'custom', name: 'カスタム', color: '#888888' },
  { id: 'restriction', name: '制限区域', color: '#ff4444' },
  { id: 'poi', name: 'ポイント', color: '#4a90d9' },
  { id: 'emergency', name: '緊急', color: '#FFA500' },
  { id: 'infrastructure', name: 'インフラ', color: '#4CAF50' }
]

export function CustomLayerManager({
  onLayerAdded,
  onLayerRemoved,
  onLayerToggle,
  visibleLayers
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [customLayers, setCustomLayers] = useState([])
  const [importing, setImporting] = useState(false)
  const [newLayerConfig, setNewLayerConfig] = useState({
    name: '',
    category: 'custom',
    color: '#888888',
    opacity: 0.5
  })
  const fileInputRef = useRef(null)

  // Load layers on mount
  useEffect(() => {
    setCustomLayers(CustomLayerService.getAll())
  }, [])

  /**
   * Handles GeoJSON file selection and import
   */
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    try {
      const geojson = await readGeoJSONFile(file)

      const config = {
        name: newLayerConfig.name || file.name.replace(/\.[^/.]+$/, ''),
        category: newLayerConfig.category,
        color: newLayerConfig.color,
        opacity: newLayerConfig.opacity,
        description: `Imported from ${file.name}`
      }

      const newLayer = CustomLayerService.add(config, geojson)
      const updated = CustomLayerService.getAll()
      setCustomLayers(updated)
      
      if (onLayerAdded) {
        onLayerAdded(newLayer)
      }

      // Reset form
      setNewLayerConfig({
        name: '',
        category: 'custom',
        color: '#888888',
        opacity: 0.5
      })

      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      console.error('Failed to import GeoJSON:', error)
      alert('GeoJSONファイルの読み込みに失敗しました')
    } finally {
      setImporting(false)
    }
  }

  /**
   * Handles layer deletion
   */
  const handleRemoveLayer = (layerId) => {
    if (window.confirm('このレイヤーを削除しますか？')) {
      CustomLayerService.remove(layerId)
      setCustomLayers(CustomLayerService.getAll())
      if (onLayerRemoved) {
        onLayerRemoved(layerId)
      }
    }
  }

  /**
   * Exports all custom layers
   */
  const handleExportAll = () => {
    const data = CustomLayerService.exportAll()
    downloadAsFile(data, 'custom-layers.json')
  }

  /**
   * Exports a single custom layer
   */
  const handleExportLayer = (layerId) => {
    const data = CustomLayerService.exportAsGeoJSON(layerId)
    if (data) {
      const layer = customLayers.find(l => l.id === layerId)
      downloadAsFile(data, `${layer?.name || layerId}.geojson`)
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="custom-layer-trigger"
        title="カスタムレイヤー管理"
      >
        <LayersIcon size={18} />
        <span>カスタムレイヤー</span>
      </button>
    )
  }

  return (
    <div className="custom-layer-manager">
      <div className="manager-header">
        <div className="header-title">
          <LayersIcon size={16} />
          <h3>カスタムレイヤー管理</h3>
        </div>
        <button className="close-button" onClick={() => setIsOpen(false)}>
          <X size={18} />
        </button>
      </div>

      <div className="manager-content">
        {/* Import Section */}
        <div className="section">
          <h4>新規インポート</h4>
          <div className="form-group">
            <input
              type="text"
              placeholder="レイヤー名（空欄でファイル名）"
              value={newLayerConfig.name}
              onChange={(e) => setNewLayerConfig({ ...newLayerConfig, name: e.target.value })}
            />
          </div>
          <div className="form-row">
            <select
              value={newLayerConfig.category}
              onChange={(e) => {
                const cat = CATEGORIES.find(c => c.id === e.target.value)
                setNewLayerConfig({
                  ...newLayerConfig,
                  category: e.target.value,
                  color: cat?.color || '#888888'
                })
              }}
            >
              {CATEGORIES.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            <input
              type="color"
              value={newLayerConfig.color}
              onChange={(e) => setNewLayerConfig({ ...newLayerConfig, color: e.target.value })}
            />
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.geojson"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <button
            className="import-button"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
          >
            {importing ? '読み込み中...' : <><Plus size={14} /> GeoJSONを選択</>}
          </button>
        </div>

        {/* Layer List */}
        <div className="section">
          <h4>登録済み ({customLayers.length})</h4>
          {customLayers.length === 0 ? (
            <div className="empty-message">登録されたレイヤーはありません</div>
          ) : (
            <div className="layer-list">
              {customLayers.map(layer => (
                <div key={layer.id} className="layer-item">
                  <div className="layer-item-main">
                    <input
                      type="checkbox"
                      checked={visibleLayers?.has(layer.id)}
                      onChange={(e) => onLayerToggle?.(layer.id, e.target.checked)}
                    />
                    <div className="layer-color-preview" style={{ backgroundColor: layer.color }} />
                    <span className="layer-name">{layer.name}</span>
                  </div>
                  <div className="layer-item-actions">
                    <button onClick={() => handleExportLayer(layer.id)} title="エクスポート">
                      <Download size={14} />
                    </button>
                    <button onClick={() => handleRemoveLayer(layer.id)} className="delete" title="削除">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="manager-footer">
          <button
            className="footer-button"
            onClick={handleExportAll}
            disabled={customLayers.length === 0}
          >
            一括書き出し
          </button>
        </div>
      </div>
    </div>
  )
}

export default CustomLayerManager
