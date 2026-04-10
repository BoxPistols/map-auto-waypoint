import { useState, useEffect } from 'react'
import {
  X, Map, PenTool, MapPin, Grid3X3, FileUp, Download,
  Mountain, Trash2, Link2, Pencil, Keyboard,
  Plane, ChevronRight, Info, Layers,
  MousePointer2, Hand, Sparkles, Route
} from 'lucide-react'
import styles from './HelpModal.module.scss'

const sections = [
  { id: 'overview', label: '概要', icon: Info },
  { id: 'quickstart', label: 'クイックスタート', icon: Sparkles },
  { id: 'polygon', label: 'ポリゴン作成', icon: PenTool },
  { id: 'waypoint', label: 'Waypoint生成', icon: MapPin },
  { id: 'interactions', label: 'マウス操作', icon: MousePointer2 },
  { id: 'map', label: 'マップ＆レイヤー', icon: Map },
  { id: 'tooltip', label: 'ツールチップ', icon: Info },
  { id: 'routeplanner', label: 'ルート最適化', icon: Route },
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

      case 'quickstart':
        return (
          <div className={styles.section}>
            <h2>クイックスタート</h2>
            <p className={styles.lead}>
              初めて使う方向けに、最短でWaypointを作るステップをまとめました。
            </p>

            <div className={styles.cardGrid}>
              <div className={styles.card}>
                <div className={styles.cardNumber}>1</div>
                <h3>エリアを表示</h3>
                <p>左上の住所検索で地名や住所を入力。候補から選ぶと地図がジャンプします。</p>
                <div className={styles.cardHint}>
                  💡 住所検索の下にある「地図操作」で地図スタイル・3D・ツールチップをまとめて切り替えられます。
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardNumber}>2</div>
                <h3>ポリゴンを描く</h3>
                <p>ヘッダーの「描画モード」をクリック → 地図上で頂点を順にクリック → 最後の点をダブルクリックで完了。</p>
                <div className={styles.cardHint}>
                  💡 検索結果から直接「矩形」または「円形」でエリア生成することもできます。
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardNumber}>3</div>
                <h3>Waypointを生成</h3>
                <p>サイドバーのポリゴン一覧から <MapPin size={12} /> ボタンで頂点に、<Grid3X3 size={12} /> ボタンでグリッド状にWaypointを生成。</p>
                <div className={styles.cardHint}>
                  💡 一括で全ポリゴンから生成する「全てWaypoint生成」ボタンもあります。
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardNumber}>4</div>
                <h3>安全チェック</h3>
                <p>右側のレイヤーコントロールでDID・空港・禁止区域を表示。Waypointが制限エリアに入っていないか確認。</p>
                <div className={styles.cardHint}>
                  💡 「ツールチップ [T]」をONにすると、制限エリアにホバーするだけで詳細情報が見られます。
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardNumber}>5</div>
                <h3>標高取得</h3>
                <p>Waypointパネルの 🏔 ボタンで国土地理院APIから各地点の標高を取得します。</p>
              </div>

              <div className={styles.card}>
                <div className={styles.cardNumber}>6</div>
                <h3>エクスポート</h3>
                <p>ヘッダーの「エクスポート」からDMS・CSV・JSON・GeoJSON・KMLで出力。DIPS 2.0 申請にも利用可能。</p>
              </div>
            </div>
          </div>
        )

      case 'polygon':
        return (
          <div className={styles.section}>
            <h2>ポリゴン作成</h2>

            <h3>作成方法（3通り）</h3>
            <div className={styles.methodGrid}>
              <div className={styles.methodCard}>
                <PenTool size={20} />
                <h4>手動描画</h4>
                <ol>
                  <li>ヘッダーの「描画モード」をON</li>
                  <li>地図をクリックして頂点を追加</li>
                  <li>最後の頂点をダブルクリックで完了</li>
                </ol>
              </div>

              <div className={styles.methodCard}>
                <FileUp size={20} />
                <h4>ファイル取り込み</h4>
                <ol>
                  <li>「インポート」ボタンをクリック</li>
                  <li>GeoJSON または KML をドロップ</li>
                  <li>複数ポリゴンも一括取り込み可能</li>
                </ol>
              </div>

              <div className={styles.methodCard}>
                <Map size={20} />
                <h4>住所検索から生成</h4>
                <ol>
                  <li>住所を入力 → 候補から選択</li>
                  <li>「矩形 / 円形」と「サイズ」を選択</li>
                  <li>「エリア生成」をクリック</li>
                </ol>
              </div>
            </div>

            <h3>ポリゴンの再編集</h3>
            <p className={styles.lead}>
              作成後のポリゴンは <strong>いつでも再編集</strong> できます。以下の方法で編集モードに入れます：
            </p>
            <table className={styles.table}>
              <tbody>
                <tr>
                  <td className={styles.labelCell}>📍 地図上でダブルクリック</td>
                  <td>ポリゴン上をダブルクリックで編集モード開始。頂点をドラッグで位置調整、中点クリックで頂点追加。</td>
                </tr>
                <tr>
                  <td className={styles.labelCell}>🖱 右クリック</td>
                  <td>ポリゴン上で右クリック → メニューから「編集」を選択</td>
                </tr>
                <tr>
                  <td className={styles.labelCell}>✏️ サイドバーのペンアイコン</td>
                  <td>ポリゴン一覧の <Pencil size={12} /> アイコンで編集モードへ</td>
                </tr>
                <tr>
                  <td className={styles.labelCell}>⌨️ キーボード [V]</td>
                  <td>選択中のポリゴンを編集モードにする</td>
                </tr>
              </tbody>
            </table>
            <div className={styles.hint}>
              編集を終了するには、ポリゴン外の地図エリアをクリック、または <kbd>Escape</kbd> でキャンセルできます。
            </div>

            <h3>ポリゴン一覧の操作</h3>
            <table className={styles.table}>
              <tbody>
                <tr>
                  <td><Pencil size={14} /></td>
                  <td>名前を編集</td>
                  <td>名前部分をダブルクリックで直接編集</td>
                </tr>
                <tr>
                  <td><Link2 size={14} /></td>
                  <td>Waypoint同期</td>
                  <td>ONの場合、形状変更時にWaypointが自動で再生成される</td>
                </tr>
                <tr>
                  <td><MapPin size={14} /></td>
                  <td>頂点Waypoint</td>
                  <td>ポリゴン頂点にWaypointを生成</td>
                </tr>
                <tr>
                  <td><Grid3X3 size={14} /></td>
                  <td>グリッドWaypoint</td>
                  <td>ポリゴン内部に格子状にWaypointを生成</td>
                </tr>
                <tr>
                  <td><Trash2 size={14} /></td>
                  <td>削除</td>
                  <td>ポリゴンと関連Waypointを削除</td>
                </tr>
              </tbody>
            </table>

            <h3>競合検出</h3>
            <p>
              複数のポリゴンを作成すると、重なりや時間帯の重複を自動検出し、
              <strong>「飛行エリア競合」</strong> としてサイドバーに警告が表示されます。
            </p>
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

      case 'interactions':
        return (
          <div className={styles.section}>
            <h2>マウス＆タッチ操作</h2>
            <p className={styles.lead}>
              地図・ポリゴン・Waypoint ごとに対応する操作が異なります。用途別に整理しました。
            </p>

            <h3><Hand size={16} /> 地図の移動・ズーム</h3>
            <table className={styles.table}>
              <tbody>
                <tr>
                  <td className={styles.labelCell}>ドラッグ</td>
                  <td>地図をパン（移動）</td>
                </tr>
                <tr>
                  <td className={styles.labelCell}>スクロール / ピンチ</td>
                  <td>ズームイン・アウト</td>
                </tr>
                <tr>
                  <td className={styles.labelCell}>右ドラッグ</td>
                  <td>地図を回転（2本指回転も可）</td>
                </tr>
                <tr>
                  <td className={styles.labelCell}>Ctrl + ドラッグ</td>
                  <td>地図を傾斜（3D視点）</td>
                </tr>
                <tr>
                  <td className={styles.labelCell}>ダブルクリック</td>
                  <td>ズームイン（ポリゴン上では編集開始）</td>
                </tr>
              </tbody>
            </table>

            <h3><PenTool size={16} /> ポリゴンの操作</h3>
            <table className={styles.table}>
              <tbody>
                <tr>
                  <td className={styles.labelCell}>クリック</td>
                  <td>ポリゴンを選択（サイドバーでハイライト表示）</td>
                </tr>
                <tr>
                  <td className={styles.labelCell}>ダブルクリック</td>
                  <td><strong>編集モード開始</strong>（頂点ドラッグで形状変更可能に）</td>
                </tr>
                <tr>
                  <td className={styles.labelCell}>右クリック</td>
                  <td>コンテキストメニュー（編集・削除・頂点リスト等）</td>
                </tr>
                <tr>
                  <td className={styles.labelCell}>3秒ホバー</td>
                  <td>ポリゴン詳細（名前・面積・WP数）をツールチップ表示</td>
                </tr>
              </tbody>
            </table>

            <div className={styles.hint}>
              <strong>編集モード中の操作:</strong>
              <ul>
                <li>頂点（○）をドラッグ: 頂点の位置を移動</li>
                <li>中点（半透明●）をクリック: 新しい頂点を追加</li>
                <li>ポリゴン外をクリック: 編集完了</li>
                <li><kbd>Escape</kbd>: 編集キャンセル</li>
              </ul>
            </div>

            <h3><MapPin size={16} /> Waypointの操作</h3>
            <table className={styles.table}>
              <tbody>
                <tr>
                  <td className={styles.labelCell}>ドラッグ</td>
                  <td>Waypointの位置を移動</td>
                </tr>
                <tr>
                  <td className={styles.labelCell}>クリック</td>
                  <td>サイドバーで該当Waypointにフォーカス</td>
                </tr>
                <tr>
                  <td className={styles.labelCell}>右クリック</td>
                  <td>コンテキストメニュー（削除・座標コピー・フォーカス）</td>
                </tr>
                <tr>
                  <td className={styles.labelCell}>3秒ホバー</td>
                  <td>WP番号・座標・標高・制限区域情報をツールチップ表示</td>
                </tr>
                <tr>
                  <td className={styles.labelCell}>Shift + クリック</td>
                  <td>地図上に新しいWaypointを追加</td>
                </tr>
                <tr>
                  <td className={styles.labelCell}>Shift + ドラッグ</td>
                  <td>範囲選択で複数Waypointを選択</td>
                </tr>
                <tr>
                  <td className={styles.labelCell}>選択後 Delete/Backspace</td>
                  <td>選択したWaypointを一括削除</td>
                </tr>
              </tbody>
            </table>

            <h3>サイドバーでの編集</h3>
            <ul>
              <li><strong>Waypoint番号をダブルクリック:</strong> 番号を直接編集</li>
              <li><strong>緯度・経度をダブルクリック:</strong> 座標を直接入力（DMS / 10進数対応）</li>
              <li><strong>ポリゴン名をダブルクリック:</strong> 名前を変更</li>
              <li><strong>Enter:</strong> 編集確定</li>
              <li><strong>Escape:</strong> 編集キャンセル</li>
            </ul>
          </div>
        )

      case 'tooltip':
        return (
          <div className={styles.section}>
            <h2>情報ツールチップ</h2>
            <p className={styles.lead}>
              制限エリアや施設にマウスを乗せるだけで、詳細情報をPopupで表示します。
              安全チェックを素早く行うための機能です。
            </p>

            <h3>有効化方法</h3>
            <ol className={styles.stepList}>
              <li>左サイドバー「地図操作」の「ツールチップ」にチェック</li>
              <li>または <kbd>T</kbd> キーでON/OFFを切り替え</li>
              <li>対象レイヤー（DID・空港・禁止区域など）を表示</li>
              <li>地図上でマウスを対象エリアに乗せる</li>
            </ol>

            <h3>対象エリア</h3>
            <ul className={styles.featureList}>
              <li>
                <div>
                  <strong>DID（人口集中地区）</strong>
                  <span>市区町村名・人口・面積・人口密度・コード</span>
                </div>
              </li>
              <li>
                <div>
                  <strong>空港 / ヘリポート</strong>
                  <span>施設名・種別・制限半径</span>
                </div>
              </li>
              <li>
                <div>
                  <strong>禁止区域（レッド／イエロー）</strong>
                  <span>施設名・区分・半径・稼働状況（原発のみ）</span>
                </div>
              </li>
              <li>
                <div>
                  <strong>緊急空域 / RemoteID / 有人機</strong>
                  <span>UTM関連レイヤーの名称と説明</span>
                </div>
              </li>
            </ul>

            <h3>「自動で消える」オプション</h3>
            <p>
              ON（デフォルト）: 2秒後にツールチップが自動で消えます。<br />
              OFF: マウスを離すまでツールチップが表示され続けます。情報を読み込みたい時に便利です。
            </p>

            <div className={styles.hint}>
              💡 ツールチップはホバー後 300ms のデバウンスで表示されます。マウスを素早く動かしている間は表示されません（パフォーマンス最適化）。
            </div>
          </div>
        )

      case 'routeplanner':
        return (
          <div className={styles.section}>
            <h2>最適巡回ルートプランナー <span className={styles.betaBadge}>BETA · WIP</span></h2>
            <div className={styles.warning}>
              ⚠️ <strong>構想段階の機能です</strong>：現在「ルートを適用」ボタンは無効化されています。
              計算結果のプレビューのみ確認できます。実際のWaypointやPolygonには影響しません。
            </div>

            <h3>機能概要</h3>
            <p>
              ドローンの仕様（バッテリー容量・巡航速度）と飛行目的に応じて、
              Waypointを効率的に巡回する順序を計算します。TSP（巡回セールスマン問題）ベースのアルゴリズムを使用。
            </p>

            <h3>使い方</h3>
            <ol className={styles.stepList}>
              <li>Waypointパネルの <Route size={12} /> アイコンをクリック</li>
              <li>飛行目的を選択（緊急医療輸送・インフラ点検・測量など）</li>
              <li>使用するドローン機種を選択</li>
              <li>オプション設定（バッテリー分割・安全マージン）</li>
              <li>結果プレビューを確認</li>
            </ol>

            <h3>既知の制限</h3>
            <ul>
              <li>遠距離拠点（20km以上離れた拠点同士）は別フライトとして分離されます</li>
              <li>実際のドローンフライトではなく、あくまで理論上の最適化プレビューです</li>
              <li>制限区域の迂回ルートは未対応</li>
            </ul>

            <div className={styles.hint}>
              本機能は構想段階です。製品版でのリリースに向けて改善中です。
            </div>
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
                  <td><kbd>0</kbd></td>
                  <td>日本全国俯瞰 ⇔ 元の位置に戻る</td>
                </tr>
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
                  <td>地図ツールチップ ON/OFF（制限エリアのホバー情報）</td>
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
