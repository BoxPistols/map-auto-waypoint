import { useState, useEffect } from 'react'
import {
  X, Map, PenTool, MapPin, Grid3X3, FileUp, Download,
  Search, Mountain, Trash2, Link2, Pencil, Keyboard,
  Plane, Eye, ChevronRight, Info, Layers
} from 'lucide-react'
import styles from './HelpModal.module.scss'

const sections = [
  { id: 'overview', label: '概要', icon: Info },
  { id: 'polygon', label: 'ポリゴン作成', icon: PenTool },
  { id: 'waypoint', label: 'Waypoint生成', icon: MapPin },
  { id: 'map', label: 'マップ操作', icon: Map },
  { id: 'export', label: 'エクスポート', icon: Download },
  { id: 'shortcuts', label: 'ショートカット', icon: Keyboard },
]

const HelpModal = ({ onClose }) => {
  const [activeSection, setActiveSection] = useState('overview')

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return (
          <div className={styles.section}>
            <h2>Drone Waypoint について</h2>
            <p className={styles.lead}>
              ドローン点検のための飛行エリア（ポリゴン）とWaypoint（経由点）を管理し、
              DMS（度分秒）形式の座標データを作成できるアプリケーションです。
            </p>

            <h3>主な機能</h3>
            <ul className={styles.featureList}>
              <li>
                <PenTool size={18} />
                <div>
                  <strong>ポリゴン描画</strong>
                  <span>地図上で飛行エリアを手動で描画</span>
                </div>
              </li>
              <li>
                <FileUp size={18} />
                <div>
                  <strong>ファイルインポート</strong>
                  <span>GeoJSON/KMLファイルからエリアを読み込み</span>
                </div>
              </li>
              <li>
                <MapPin size={18} />
                <div>
                  <strong>Waypoint生成</strong>
                  <span>ポリゴン頂点やグリッドからWaypointを自動生成</span>
                </div>
              </li>
              <li>
                <Mountain size={18} />
                <div>
                  <strong>標高取得</strong>
                  <span>国土地理院APIで各地点の標高を取得</span>
                </div>
              </li>
              <li>
                <Plane size={18} />
                <div>
                  <strong>DMS形式出力</strong>
                  <span>度分秒形式で座標をテキスト/CSV出力</span>
                </div>
              </li>
            </ul>

            <h3>基本的な流れ</h3>
            <ol className={styles.stepList}>
              <li>住所検索またはマップ移動で対象エリアを表示</li>
              <li>「描画モード」でポリゴンを作成、または GeoJSON/KML をインポート</li>
              <li>ポリゴンから Waypoint を生成（頂点 or グリッド）</li>
              <li>必要に応じて標高を取得</li>
              <li>DMS形式またはCSV/JSONでエクスポート</li>
            </ol>
          </div>
        )

      case 'polygon':
        return (
          <div className={styles.section}>
            <h2>ポリゴン作成</h2>

            <h3>手動で描画する</h3>
            <ol className={styles.stepList}>
              <li>ヘッダーの「描画モード」ボタンをクリック</li>
              <li>地図上でクリックして頂点を追加</li>
              <li>最後の点をダブルクリックで描画完了</li>
            </ol>

            <h3>ファイルからインポート</h3>
            <ol className={styles.stepList}>
              <li>「インポート」ボタンをクリック</li>
              <li>GeoJSON または KML ファイルをドラッグ＆ドロップ</li>
              <li>複数ポリゴンも一括でインポート可能</li>
            </ol>

            <h3>住所検索から生成</h3>
            <ol className={styles.stepList}>
              <li>住所検索フォームに住所を入力</li>
              <li>候補から選択して「エリア生成」をクリック</li>
              <li>建物の境界ボックス（BoundingBox）からポリゴンを自動生成</li>
            </ol>

            <h3>ポリゴンの操作</h3>
            <table className={styles.table}>
              <tbody>
                <tr>
                  <td><PenTool size={14} /></td>
                  <td>形状を編集</td>
                  <td>サイドバーのアイコン、または地図上でダブルクリック・右クリックメニューから編集開始</td>
                </tr>
                <tr>
                  <td><Pencil size={14} /></td>
                  <td>名前を編集</td>
                  <td>クリックまたはダブルクリックで名前変更</td>
                </tr>
                <tr>
                  <td><Link2 size={14} /></td>
                  <td>Waypoint同期</td>
                  <td>ONの場合、形状変更時にWaypointも再生成</td>
                </tr>
                <tr>
                  <td><Trash2 size={14} /></td>
                  <td>削除</td>
                  <td>サイドバーのアイコン、または地図上で右クリックメニューから削除</td>
                </tr>
              </tbody>
            </table>
          </div>
        )

      case 'waypoint':
        return (
          <div className={styles.section}>
            <h2>Waypoint生成</h2>

            <h3>生成方法</h3>
            <table className={styles.table}>
              <tbody>
                <tr>
                  <td><MapPin size={14} /></td>
                  <td>頂点Waypoint</td>
                  <td>ポリゴンの各頂点にWaypointを配置</td>
                </tr>
                <tr>
                  <td><Grid3X3 size={14} /></td>
                  <td>グリッドWaypoint</td>
                  <td>ポリゴン内部に一定間隔でWaypointを配置</td>
                </tr>
              </tbody>
            </table>

            <h3>グリッド設定</h3>
            <p>グリッドWaypoint生成時は設定ダイアログが表示されます：</p>
            <ul>
              <li><strong>間隔:</strong> 5m〜200m で調整（スライダーまたは直接入力）</li>
              <li><strong>頂点も含める:</strong> グリッドと頂点を両方生成</li>
              <li><strong>プレビュー:</strong> 生成数を事前に確認</li>
            </ul>
            <div className={styles.warning}>
              200点以上は警告が表示されます。多すぎるとパフォーマンスに影響します。
            </div>

            <h3>Waypointの編集</h3>
            <ul>
              <li><strong>サイドバーでダブルクリック:</strong> 番号・緯度・経度を直接編集</li>
              <li><strong>ドラッグ:</strong> マップ上でWaypointマーカーを移動</li>
              <li><strong>削除:</strong> サイドバーのゴミ箱アイコン、または地図上で右クリックメニューから削除</li>
            </ul>

            <h3>標高取得</h3>
            <p>
              🏔 ボタンで国土地理院APIから標高を取得します。
              プログレスバーで進捗を確認でき、取得後は各Waypointに標高が表示されます。
            </p>
          </div>
        )

      case 'map':
        return (
          <div className={styles.section}>
            <h2>マップ操作</h2>

            <h3>基本操作</h3>
            <table className={styles.table}>
              <tbody>
                <tr>
                  <td className={styles.labelCell}>移動</td>
                  <td>ドラッグ</td>
                </tr>
                <tr>
                  <td className={styles.labelCell}>ズーム</td>
                  <td>スクロール / ピンチ / +- ボタン</td>
                </tr>
                <tr>
                  <td className={styles.labelCell}>回転</td>
                  <td>右ドラッグ / 2本指回転</td>
                </tr>
                <tr>
                  <td className={styles.labelCell}>傾斜</td>
                  <td>Ctrl + ドラッグ / 2本指上下</td>
                </tr>
              </tbody>
            </table>

            <h3>マップコントロール（右側）</h3>
            <table className={styles.table}>
              <tbody>
                <tr>
                  <td>2D / 3D</td>
                  <td>視点切り替え（3Dは傾斜+回転）</td>
                </tr>
                <tr>
                  <td>N</td>
                  <td>北向きにリセット</td>
                </tr>
              </tbody>
            </table>

            <h3>オーバーレイ</h3>
            <table className={styles.table}>
              <tbody>
                <tr>
                  <td><Layers size={14} /> DID</td>
                  <td>人口集中地区（国土地理院）</td>
                </tr>
                <tr>
                  <td><Layers size={14} /> 空港制限表面</td>
                  <td>航空法の制限表面（空港周辺）</td>
                </tr>
                <tr>
                  <td><Layers size={14} /> 飛行禁止</td>
                  <td>飛行禁止区域（370施設）</td>
                </tr>
              </tbody>
            </table>
            <p className={styles.hint}>
              オーバーレイの状態はlocalStorageに保存されます。
            </p>

            <h3>レイヤーコントロール（グループ機能）</h3>
            <p>飛行禁止区域は14カテゴリーに分類され、効率的な管理が可能です。</p>
            <table className={styles.table}>
              <tbody>
                <tr>
                  <td className={styles.labelCell}>グループトグル</td>
                  <td>グループ名の横のスイッチで、カテゴリー内の全施設を一括ON/OFF</td>
                </tr>
                <tr>
                  <td className={styles.labelCell}>お気に入り</td>
                  <td>⭐アイコンでお気に入りに追加。よく使うグループを上部に固定表示</td>
                </tr>
                <tr>
                  <td className={styles.labelCell}>個別トグル</td>
                  <td>各施設のチェックボックスで個別にON/OFF可能</td>
                </tr>
              </tbody>
            </table>

            <h3>施設詳細の表示</h3>
            <p>地図上の禁止区域施設（円形マーカー）をクリックすると、詳細情報をポップアップ表示します。</p>
            <ul>
              <li><strong>基本情報:</strong> 施設名、種類、座標、制限半径</li>
              <li><strong>原子力施設:</strong> 稼働状況、原子炉数、発電容量、運営事業者</li>
              <li><strong>その他施設:</strong> 所在地、カテゴリー、説明</li>
            </ul>

            <h3>原子力発電所の色分け</h3>
            <p>原子力施設は稼働状況に応じて色分け表示されます。</p>
            <table className={styles.table}>
              <tbody>
                <tr>
                  <td className={styles.labelCell}>🔴 赤</td>
                  <td>運転中（Operational）</td>
                </tr>
                <tr>
                  <td className={styles.labelCell}>🟠 橙</td>
                  <td>停止中（Stopped）</td>
                </tr>
                <tr>
                  <td className={styles.labelCell}>🟡 黄</td>
                  <td>廃炉作業中（Decommissioning）</td>
                </tr>
                <tr>
                  <td className={styles.labelCell}>⚪ 灰</td>
                  <td>廃炉完了（Decommissioned）</td>
                </tr>
              </tbody>
            </table>

            <h3>禁止区域カテゴリー（14種類、370施設）</h3>
            <ul className={styles.featureList}>
              <li>
                <div>
                  <strong>🔴 レッドゾーン（54施設）</strong>
                  <span>政府機関、皇室、原発、防衛施設 - 飛行禁止</span>
                </div>
              </li>
              <li>
                <div>
                  <strong>🟡 イエローゾーン（316施設）</strong>
                  <span>都道府県庁、警察、刑務所、自衛隊、外国公館、重要インフラ - 事前通報必要</span>
                </div>
              </li>
            </ul>
            <p className={styles.hint}>
              詳細は小型無人機等飛行禁止法およびDIPS 2.0で確認してください。
            </p>
          </div>
        )

      case 'export':
        return (
          <div className={styles.section}>
            <h2>エクスポート</h2>

            <h3>Waypointエクスポート</h3>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>形式</th>
                  <th>用途</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>JSON</strong></td>
                  <td>プログラムでの利用、バックアップ</td>
                </tr>
                <tr>
                  <td><strong>CSV</strong></td>
                  <td>Excel等で開く、一覧確認</td>
                </tr>
                <tr>
                  <td><strong>DMS</strong></td>
                  <td>度分秒形式（テキスト）</td>
                </tr>
                <tr>
                  <td><strong>DMS CSV</strong></td>
                  <td>度分秒形式をCSVで出力</td>
                </tr>
              </tbody>
            </table>

            <h3>DMS形式について</h3>
            <p>度分秒（60進数）形式で座標を出力します。</p>
            <ul>
              <li>座標: 北緯37°23'36" 東経136°55'28"</li>
              <li>各範囲ごとに海抜高度を入力可能</li>
              <li>プレビューで確認してからダウンロード</li>
            </ul>

            <h3>ポリゴンエクスポート</h3>
            <p><strong>GeoJSON/KML形式</strong>で出力。他のGISツールやGoogle Earthで読み込み可能。</p>

            <h3>フルバックアップ</h3>
            <p>すべてのデータ（ポリゴン、Waypoint）を1つのJSONファイルに保存。</p>
          </div>
        )

      case 'shortcuts':
        return (
          <div className={styles.section}>
            <h2>キーボードショートカット</h2>
            
            <h3>一般</h3>
            <table className={styles.shortcutTable}>
              <tbody>
                <tr>
                  <td><kbd>Cmd/Ctrl</kbd> + <kbd>K</kbd></td>
                  <td>住所検索にフォーカス</td>
                </tr>
                <tr>
                  <td><kbd>Cmd/Ctrl</kbd> + <kbd>/</kbd> または <kbd>?</kbd></td>
                  <td>ヘルプを開く / 閉じる</td>
                </tr>
                <tr>
                  <td><kbd>Cmd/Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>K</kbd></td>
                  <td>設定を開く / 閉じる</td>
                </tr>
                <tr>
                  <td><kbd>Cmd/Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>D</kbd></td>
                  <td>ライト / ダークモード切替</td>
                </tr>
                <tr>
                  <td><kbd>Escape</kbd></td>
                  <td>モーダルを閉じる</td>
                </tr>
                <tr>
                  <td><kbd>C</kbd></td>
                  <td>チャット（フライトアシスタント）を開く / 閉じる</td>
                </tr>
                <tr>
                  <td><kbd>L</kbd></td>
                  <td>飛行要件サマリーを開く / 閉じる</td>
                </tr>
                <tr>
                  <td><kbd>O</kbd></td>
                  <td>天気予報パネルを開く / 閉じる</td>
                </tr>
                <tr>
                  <td><kbd>S</kbd></td>
                  <td>サイドバーを開く / 閉じる</td>
                </tr>
                <tr>
                  <td><kbd>F</kbd></td>
                  <td>フルマップモード 切り替え</td>
                </tr>
                <tr>
                  <td><kbd>P</kbd></td>
                  <td>ポリゴンパネルに切り替え</td>
                </tr>
                <tr>
                  <td><kbd>W</kbd></td>
                  <td>Waypointパネルに切り替え</td>
                </tr>
                <tr>
                  <td><kbd>V</kbd></td>
                  <td>選択ポリゴンの形状を編集</td>
                </tr>
              </tbody>
            </table>

            <h3>マップ操作</h3>
            <table className={styles.shortcutTable}>
              <tbody>
                <tr>
                  <td><kbd>D</kbd></td>
                  <td>DIDオーバーレイ ON/OFF</td>
                </tr>
                <tr>
                  <td><kbd>A</kbd></td>
                  <td>空港制限表面 ON/OFF</td>
                </tr>
                <tr>
                  <td><kbd>R</kbd></td>
                  <td>レッドゾーン ON/OFF</td>
                </tr>
                <tr>
                  <td><kbd>Y</kbd></td>
                  <td>イエローゾーン ON/OFF</td>
                </tr>
                <tr>
                  <td><kbd>H</kbd></td>
                  <td>ヘリポート ON/OFF</td>
                </tr>
                <tr>
                  <td><kbd>E</kbd></td>
                  <td>緊急用務空域 ON/OFF</td>
                </tr>
                <tr>
                  <td><kbd>I</kbd></td>
                  <td>リモートID特定区域 ON/OFF</td>
                </tr>
                <tr>
                  <td><kbd>U</kbd></td>
                  <td>有人機発着エリア ON/OFF</td>
                </tr>
                <tr>
                  <td><kbd>G</kbd></td>
                  <td>地物 ON/OFF</td>
                </tr>
                <tr>
                  <td><kbd>N</kbd></td>
                  <td>雨雲 ON/OFF</td>
                </tr>
                <tr>
                  <td><kbd>T</kbd></td>
                  <td>電波種(LTE) ON/OFF</td>
                </tr>
                <tr>
                  <td><kbd>3</kbd></td>
                  <td>2D/3D 切り替え</td>
                </tr>
                <tr>
                  <td><kbd>M</kbd></td>
                  <td>地図スタイル切り替え（次へ）</td>
                </tr>
                <tr>
                  <td><kbd>Shift</kbd> + <kbd>M</kbd></td>
                  <td>地図スタイル切り替え（前へ）</td>
                </tr>
                <tr>
                  <td><kbd>X</kbd></td>
                  <td>クロスヘア ON/OFF</td>
                </tr>
              </tbody>
            </table>

            <h3>禁止区域カテゴリー</h3>
            <table className={styles.shortcutTable}>
              <tbody>
                <tr>
                  <td><kbd>Q</kbd></td>
                  <td>原子力発電所 ON/OFF</td>
                </tr>
                <tr>
                  <td><kbd>p</kbd> (小文字)</td>
                  <td>都道府県庁 ON/OFF</td>
                </tr>
                <tr>
                  <td><kbd>K</kbd></td>
                  <td>警察本部 ON/OFF</td>
                </tr>
                <tr>
                  <td><kbd>J</kbd></td>
                  <td>刑務所・拘置所 ON/OFF</td>
                </tr>
                <tr>
                  <td><kbd>B</kbd></td>
                  <td>自衛隊施設 ON/OFF</td>
                </tr>
              </tbody>
            </table>

            <h3>編集操作</h3>
            <table className={styles.shortcutTable}>
              <tbody>
                <tr>
                  <td><kbd>Cmd/Ctrl</kbd> + <kbd>Z</kbd></td>
                  <td>元に戻す (Undo)</td>
                </tr>
                <tr>
                  <td><kbd>Cmd/Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd></td>
                  <td>やり直す (Redo)</td>
                </tr>
              </tbody>
            </table>
            <p className={styles.hint}>
              ※ 入力フォームにフォーカス中はショートカット無効
            </p>

            <h3>ポリゴン編集モード</h3>
            <table className={styles.shortcutTable}>
              <tbody>
                <tr>
                  <td>ダブルクリック</td>
                  <td>ポリゴン形状の編集開始</td>
                </tr>
                <tr>
                  <td>外側をクリック</td>
                  <td>編集完了</td>
                </tr>
                <tr>
                  <td><kbd>Escape</kbd></td>
                  <td>編集キャンセル</td>
                </tr>
              </tbody>
            </table>

            <h3>Waypoint操作</h3>
            <table className={styles.shortcutTable}>
              <tbody>
                <tr>
                  <td><kbd>Shift</kbd> + ドラッグ</td>
                  <td>範囲選択（複数Waypoint）</td>
                </tr>
                <tr>
                  <td><kbd>Delete</kbd> / <kbd>Backspace</kbd></td>
                  <td>選択したWaypointを一括削除</td>
                </tr>
                <tr>
                  <td><kbd>Shift</kbd> + クリック</td>
                  <td>地図上にWaypointを手動追加</td>
                </tr>
                <tr>
                  <td>ダブルクリック</td>
                  <td>座標・番号を編集開始</td>
                </tr>
                <tr>
                  <td><kbd>Enter</kbd></td>
                  <td>編集確定</td>
                </tr>
                <tr>
                  <td><kbd>Escape</kbd></td>
                  <td>編集キャンセル / 選択解除</td>
                </tr>
              </tbody>
            </table>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className={styles.modal}>
      <div className={styles.header}>
        <h1>ヘルプ</h1>
        <button className={styles.closeButton} onClick={onClose}>
          <X size={20} />
        </button>
      </div>

      <div className={styles.body}>
        <nav className={styles.nav}>
          {/* eslint-disable-next-line no-unused-vars */}
          {sections.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`${styles.navItem} ${activeSection === id ? styles.active : ''}`}
              onClick={() => setActiveSection(id)}
            >
              <Icon size={18} />
              <span>{label}</span>
              <ChevronRight size={14} className={styles.chevron} />
            </button>
          ))}
        </nav>

        <main className={styles.content}>
          {renderContent()}
        </main>
      </div>
    </div>
  )
}

export default HelpModal
