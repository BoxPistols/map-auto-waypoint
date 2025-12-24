import { useState, useCallback, useRef } from 'react'
import { parseFile } from '../../utils/fileParser'
import styles from './FileImport.module.scss'

const FileImport = ({ onImport, onClose }) => {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState(null)
  const [preview, setPreview] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef(null)

  const handleFile = useCallback(async (file) => {
    setError(null)
    setIsLoading(true)

    const result = await parseFile(file)

    if (result.success) {
      setPreview({
        filename: file.name,
        polygons: result.polygons
      })
    } else {
      setError(result.error)
      setPreview(null)
    }

    setIsLoading(false)
  }, [])

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFile(files[0])
    }
  }

  const handleFileSelect = (e) => {
    const files = e.target.files
    if (files.length > 0) {
      handleFile(files[0])
    }
  }

  const handleImport = () => {
    if (preview?.polygons) {
      onImport?.(preview.polygons)
      onClose?.()
    }
  }

  const handleCancel = () => {
    setPreview(null)
    setError(null)
    onClose?.()
  }

  return (
    <div className={styles.fileImport}>
      <div className={styles.header}>
        <h3>ファイルインポート</h3>
        <button className={styles.closeButton} onClick={handleCancel}>×</button>
      </div>

      {!preview ? (
        <>
          <div
            className={`${styles.dropZone} ${isDragging ? styles.dragging : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className={styles.dropContent}>
              <span className={styles.icon}>📁</span>
              <p>ファイルをドロップ</p>
              <p className={styles.hint}>または クリックして選択</p>
              <p className={styles.formats}>対応形式: GeoJSON, KML</p>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.geojson,.kml"
            onChange={handleFileSelect}
            className={styles.fileInput}
          />

          {isLoading && (
            <div className={styles.loading}>
              <span className={styles.spinner} />
              読み込み中...
            </div>
          )}

          {error && (
            <div className={styles.error}>
              <span>⚠️</span> {error}
            </div>
          )}
        </>
      ) : (
        <div className={styles.preview}>
          <div className={styles.previewHeader}>
            <span className={styles.filename}>{preview.filename}</span>
            <span className={styles.polygonCount}>
              {preview.polygons.length} ポリゴン
            </span>
          </div>

          <ul className={styles.previewList}>
            {preview.polygons.slice(0, 10).map((polygon, index) => (
              <li key={polygon.id} className={styles.previewItem}>
                <span
                  className={styles.colorDot}
                  style={{ backgroundColor: polygon.color }}
                />
                <span className={styles.polygonName}>
                  {index + 1}. {polygon.name}
                </span>
                <span className={styles.vertexCount}>
                  {polygon.geometry.coordinates[0].length - 1} 頂点
                </span>
              </li>
            ))}
            {preview.polygons.length > 10 && (
              <li className={styles.moreItems}>
                ...他 {preview.polygons.length - 10} ポリゴン
              </li>
            )}
          </ul>

          <div className={styles.actions}>
            <button
              className={styles.cancelButton}
              onClick={() => setPreview(null)}
            >
              戻る
            </button>
            <button
              className={styles.importButton}
              onClick={handleImport}
            >
              インポート
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default FileImport
