/**
 * マップ上に描画モード/編集モード時のヒントを表示する
 */
export default function DrawHints({ drawMode, editingPolygon }) {
  return (
    <>
      {/* Draw mode hint */}
      {drawMode && (
        <div className="draw-hint">
          地図をクリックしてポリゴンを描画
          <br />
          最後の点をダブルクリックで完了
        </div>
      )}

      {/* Edit mode hint */}
      {editingPolygon && (
        <div className="draw-hint editing">
          「{editingPolygon.name}」を編集中
          <br />
          頂点をドラッグして変更 / 中点クリックで頂点追加
          <br />
          <span style={{ opacity: 0.8, fontSize: '0.85em' }}>外側クリックで完了 / ESCでキャンセル</span>
        </div>
      )}
    </>
  )
}
