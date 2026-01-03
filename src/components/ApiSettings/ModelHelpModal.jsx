import React, { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import './ModelHelpModal.scss'

/**
 * 4モデル（GPT-5 Nano/Mini, GPT-4.1 Nano/Mini）の違いを簡潔に説明するヘルプ。
 * @param {{ onClose: () => void }} props
 */
function ModelHelpModal({ onClose }) {
  /** @type {React.MutableRefObject<HTMLDivElement | null>} */
  const modalRef = useRef(null)

  useEffect(() => {
    /** @param {KeyboardEvent} event */
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  /** @param {React.MouseEvent<HTMLDivElement>} event */
  const handleOverlayClick = (event) => {
    if (modalRef.current && !modalRef.current.contains(/** @type {Node} */ (event.target))) {
      onClose()
    }
  }

  return (
    <div className='model-help-overlay' onMouseDown={handleOverlayClick}>
      <div className='model-help-modal' ref={modalRef} role='dialog' aria-modal='true' aria-label='AIモデルの違い'>
        <div className='model-help-header'>
          <h3>AIモデルの選び方</h3>
          <button className='close-btn' onClick={onClose} aria-label='閉じる'>
            <X size={18} />
          </button>
        </div>

        <div className='model-help-content'>
          <p className='lead'>
            迷ったら <strong>GPT-5 Nano</strong>。長文・大量データ（超長いプロンプト/ログ）を扱うなら <strong>GPT-4.1</strong> 系が向きます。
          </p>

          <table className='model-table'>
            <thead>
              <tr>
                <th>モデル</th>
                <th>得意</th>
                <th>おすすめ用途</th>
                <th>注意点</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>GPT-5 Nano</td>
                <td>最速/最安、日常の相談・短〜中程度の分析</td>
                <td>接続テスト、軽めのアドバイス、反復作業</td>
                <td>超長文の一括投入には不向きな場合</td>
              </tr>
              <tr>
                <td>GPT-5 Mini</td>
                <td>Nanoより少し丁寧/安定（コストは低いまま）</td>
                <td>少し複雑な相談、要件整理、説明文生成</td>
                <td>超長文は4.1系の方が向くことが多い</td>
              </tr>
              <tr>
                <td>GPT-4.1 Nano</td>
                <td>長いコンテキスト（1Mクラス）に強い</td>
                <td>長いログ/手順/規約の読み込み、比較検討</td>
                <td>短い用途だと5系の方が体感速いことが多い</td>
              </tr>
              <tr>
                <td>GPT-4.1 Mini</td>
                <td>4.1 Nanoより余裕、長文の要約/整形が安定</td>
                <td>大量テキストの整理、詳細なレポート/提案</td>
                <td>最速・最安重視なら5 Nano/5 Mini</td>
              </tr>
            </tbody>
          </table>

          <div className='note'>
            <div className='note-title'>補足</div>
            <ul>
              <li>ここでの「速い/安い」は相対的な目安です（用途・負荷で変動します）。</li>
              <li>本アプリは OpenAI を使わない場合、<strong>ローカルLLM</strong> も選べます（互換性は環境次第）。</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ModelHelpModal

