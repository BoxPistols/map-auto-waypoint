/**
 * 申請書類生成サービス
 *
 * 飛行計画データからWord/Excel形式の申請書類を生成
 * - DIPS申請用データ
 * - 飛行計画書
 * - チェックリスト
 */

// ===== ユーティリティ関数 =====

/**
 * 10進数の度を度分秒形式に変換
 */
const toDMS = (decimal, isLat) => {
  const absolute = Math.abs(decimal);
  const degrees = Math.floor(absolute);
  const minutesDecimal = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesDecimal);
  const seconds = ((minutesDecimal - minutes) * 60).toFixed(2);

  const direction = isLat
    ? (decimal >= 0 ? 'N' : 'S')
    : (decimal >= 0 ? 'E' : 'W');

  return {
    degrees,
    minutes,
    seconds: parseFloat(seconds),
    direction,
    formatted: `${degrees}°${minutes}'${seconds}"${direction}`,
    japanese: isLat
      ? `北緯${degrees}度${minutes}分${seconds}秒`
      : `東経${degrees}度${minutes}分${seconds}秒`,
  };
};

/**
 * 日付をフォーマット
 */
const formatDate = (date, format = 'japanese') => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();

  if (format === 'japanese') {
    // 令和変換（2019年5月1日以降）
    const reiwaYear = year - 2018;
    return `令和${reiwaYear}年${month}月${day}日`;
  }

  return `${year}/${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}`;
};

// ===== CSV生成 =====

/**
 * DIPS申請用CSVを生成
 */
export const generateDIPSCSV = (flightPlan) => {
  const { waypoints, polygons, route, useCase } = flightPlan;

  const headers = [
    '項目', '内容',
  ];

  const rows = [
    ['飛行の目的', useCase?.name || '点検飛行'],
    ['飛行の日時', formatDate(flightPlan.flightDate || new Date())],
    ['飛行経路', route?.name || '指定エリア内'],
    ['飛行高度', `${flightPlan.altitude || 50}m`],
    ['飛行速度', `${flightPlan.speed || 40}km/h以下`],
    ['機体の種類', flightPlan.aircraft?.model || '回転翼機（マルチコプター）'],
    ['機体の名称', flightPlan.aircraft?.name || '-'],
    ['機体の製造番号', flightPlan.aircraft?.serialNumber || '-'],
    ['機体重量', flightPlan.aircraft?.weight || '-'],
    ['操縦者', flightPlan.pilot?.name || '-'],
    ['操縦者の資格', flightPlan.pilot?.license || '-'],
    ['連絡先', flightPlan.pilot?.phone || '-'],
    ['', ''],
    ['=== 飛行エリア座標 ===', ''],
  ];

  // ポリゴン座標を追加
  if (polygons && polygons.length > 0) {
    polygons.forEach((polygon, pIdx) => {
      rows.push([`エリア${pIdx + 1}: ${polygon.name}`, '']);
      const coords = polygon.geometry.coordinates[0];
      coords.forEach((coord, cIdx) => {
        const lat = toDMS(coord[1], true);
        const lng = toDMS(coord[0], false);
        rows.push([`  頂点${cIdx + 1}`, `${lat.japanese} ${lng.japanese}`]);
      });
    });
  }

  // Waypoint座標を追加
  if (waypoints && waypoints.length > 0) {
    rows.push(['', '']);
    rows.push(['=== Waypoint座標 ===', '']);
    waypoints.forEach((wp, idx) => {
      const lat = toDMS(wp.lat, true);
      const lng = toDMS(wp.lng, false);
      rows.push([`WP${idx + 1}`, `${lat.japanese} ${lng.japanese}`]);
    });
  }

  // CSVに変換
  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');

  return csv;
};

// ===== Excel (XLSX風TSV) 生成 =====

/**
 * 飛行計画書をTSV形式で生成（Excel互換）
 */
export const generateFlightPlanTSV = (flightPlan) => {
  const { waypoints, polygons, route, useCase, evaluation } = flightPlan;

  const lines = [];

  // ヘッダー
  lines.push('飛行計画書');
  lines.push(`作成日\t${formatDate(new Date())}`);
  lines.push('');

  // 基本情報
  lines.push('【飛行概要】');
  lines.push(`飛行目的\t${useCase?.name || '-'}`);
  lines.push(`飛行日時\t${formatDate(flightPlan.flightDate || new Date())}`);
  lines.push(`飛行場所\t${flightPlan.location || '-'}`);
  lines.push(`飛行高度\t${flightPlan.altitude || 50}m`);
  lines.push(`飛行カテゴリ\t${evaluation?.category || '-'}`);
  lines.push('');

  // ルート情報
  if (route) {
    lines.push('【飛行ルート】');
    lines.push(`ルート名\t${route.name}`);
    lines.push(`総距離\t${(route.distance / 1000).toFixed(2)}km`);
    lines.push(`予想飛行時間\t${evaluation?.flightTime || '-'}分`);
    lines.push(`バッテリー消費\t${evaluation?.batteryUsage || '-'}%`);
    lines.push('');
  }

  // 必要な許可・申請
  if (evaluation?.permits && evaluation.permits.length > 0) {
    lines.push('【必要な許可・申請】');
    evaluation.permits.forEach((permit, idx) => {
      lines.push(`${idx + 1}\t${permit}`);
    });
    lines.push('');
  }

  // 注意事項
  if (evaluation?.issues && evaluation.issues.length > 0) {
    lines.push('【注意事項】');
    evaluation.issues.forEach((issue, idx) => {
      lines.push(`${idx + 1}\t${issue.description}`);
    });
    lines.push('');
  }

  // エリア座標
  if (polygons && polygons.length > 0) {
    lines.push('【飛行エリア座標】');
    lines.push('エリア名\t頂点番号\t緯度\t経度\t緯度(度分秒)\t経度(度分秒)');
    polygons.forEach((polygon) => {
      const coords = polygon.geometry.coordinates[0];
      coords.forEach((coord, cIdx) => {
        const lat = toDMS(coord[1], true);
        const lng = toDMS(coord[0], false);
        lines.push([
          polygon.name,
          `頂点${cIdx + 1}`,
          coord[1].toFixed(6),
          coord[0].toFixed(6),
          lat.formatted,
          lng.formatted,
        ].join('\t'));
      });
    });
    lines.push('');
  }

  // Waypoint一覧
  if (waypoints && waypoints.length > 0) {
    lines.push('【Waypoint一覧】');
    lines.push('番号\t緯度\t経度\t標高(m)\t緯度(度分秒)\t経度(度分秒)');
    waypoints.forEach((wp, idx) => {
      const lat = toDMS(wp.lat, true);
      const lng = toDMS(wp.lng, false);
      lines.push([
        `WP${idx + 1}`,
        wp.lat.toFixed(6),
        wp.lng.toFixed(6),
        wp.elevation || '-',
        lat.formatted,
        lng.formatted,
      ].join('\t'));
    });
    lines.push('');
  }

  // チェックリスト
  lines.push('【飛行前チェックリスト】');
  const checklist = [
    '機体の外観点検（プロペラ、フレーム、カメラ）',
    'バッテリー残量確認（フル充電）',
    'コントローラーとの接続確認',
    'GNSSの受信状況確認',
    'フェールセーフ設定の確認',
    '気象条件の確認（風速、視程、降水）',
    '周辺の安全確認（人、車、建物）',
    '飛行禁止区域の最終確認',
    '関係者への連絡完了',
    '緊急連絡先の確認',
  ];
  checklist.forEach((item, idx) => {
    lines.push(`□\t${idx + 1}. ${item}`);
  });
  lines.push('');

  // 緊急連絡先
  lines.push('【緊急連絡先】');
  lines.push('警察\t110');
  lines.push('消防\t119');
  lines.push('国土交通省（航空局）\t03-5253-8111');
  lines.push('');

  lines.push('---');
  lines.push('※ 本書類はDrone Waypointアプリで自動生成されました');

  return lines.join('\n');
};

// ===== Word (HTML形式) 生成 =====

/**
 * 飛行計画書をHTML形式で生成（Word互換）
 */
export const generateFlightPlanHTML = (flightPlan) => {
  const { waypoints, polygons, route, useCase, evaluation } = flightPlan;

  const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>飛行計画書</title>
  <style>
    body { font-family: 'Yu Gothic', 'Hiragino Kaku Gothic ProN', sans-serif; margin: 40px; line-height: 1.6; }
    h1 { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; }
    h2 { background: #f0f0f0; padding: 8px 12px; margin-top: 30px; }
    table { border-collapse: collapse; width: 100%; margin: 10px 0; }
    th, td { border: 1px solid #333; padding: 8px 12px; text-align: left; }
    th { background: #e8e8e8; width: 150px; }
    .info-table td:first-child { font-weight: bold; background: #f8f8f8; }
    .coord-table { font-size: 12px; }
    .checklist { list-style: none; padding: 0; }
    .checklist li { padding: 5px 0; }
    .checklist li:before { content: '☐ '; font-size: 18px; }
    .warning { color: #d9534f; font-weight: bold; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ccc; font-size: 12px; color: #666; }
    @media print {
      body { margin: 20px; }
      h2 { break-after: avoid; }
      table { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <h1>飛行計画書</h1>
  <p style="text-align: right;">作成日: ${formatDate(new Date())}</p>

  <h2>飛行概要</h2>
  <table class="info-table">
    <tr><td>飛行目的</td><td>${useCase?.name || '-'}</td></tr>
    <tr><td>飛行日時</td><td>${formatDate(flightPlan.flightDate || new Date())}</td></tr>
    <tr><td>飛行場所</td><td>${flightPlan.location || '-'}</td></tr>
    <tr><td>飛行高度</td><td>${flightPlan.altitude || 50}m</td></tr>
    <tr><td>飛行カテゴリ</td><td>${evaluation?.category || '-'}</td></tr>
  </table>

  ${route ? `
  <h2>飛行ルート</h2>
  <table class="info-table">
    <tr><td>ルート名</td><td>${route.name}</td></tr>
    <tr><td>総距離</td><td>${(route.distance / 1000).toFixed(2)}km</td></tr>
    <tr><td>予想飛行時間</td><td>${evaluation?.flightTime || '-'}分</td></tr>
    <tr><td>バッテリー消費</td><td>${evaluation?.batteryUsage || '-'}%</td></tr>
  </table>
  ` : ''}

  ${evaluation?.permits && evaluation.permits.length > 0 ? `
  <h2>必要な許可・申請</h2>
  <ul>
    ${evaluation.permits.map(p => `<li>${p}</li>`).join('')}
  </ul>
  ` : ''}

  ${evaluation?.issues && evaluation.issues.length > 0 ? `
  <h2>注意事項</h2>
  <ul>
    ${evaluation.issues.map(i => `<li class="${i.severity === 'error' ? 'warning' : ''}">${i.description}</li>`).join('')}
  </ul>
  ` : ''}

  ${polygons && polygons.length > 0 ? `
  <h2>飛行エリア座標</h2>
  <table class="coord-table">
    <tr><th>エリア名</th><th>頂点</th><th>緯度</th><th>経度</th><th>緯度(度分秒)</th><th>経度(度分秒)</th></tr>
    ${polygons.map(polygon => {
      const coords = polygon.geometry.coordinates[0];
      return coords.map((coord, idx) => {
        const lat = toDMS(coord[1], true);
        const lng = toDMS(coord[0], false);
        return `<tr>
          <td>${idx === 0 ? polygon.name : ''}</td>
          <td>頂点${idx + 1}</td>
          <td>${coord[1].toFixed(6)}</td>
          <td>${coord[0].toFixed(6)}</td>
          <td>${lat.formatted}</td>
          <td>${lng.formatted}</td>
        </tr>`;
      }).join('');
    }).join('')}
  </table>
  ` : ''}

  ${waypoints && waypoints.length > 0 ? `
  <h2>Waypoint一覧</h2>
  <table class="coord-table">
    <tr><th>番号</th><th>緯度</th><th>経度</th><th>標高</th><th>緯度(度分秒)</th><th>経度(度分秒)</th></tr>
    ${waypoints.map((wp, idx) => {
      const lat = toDMS(wp.lat, true);
      const lng = toDMS(wp.lng, false);
      return `<tr>
        <td>WP${idx + 1}</td>
        <td>${wp.lat.toFixed(6)}</td>
        <td>${wp.lng.toFixed(6)}</td>
        <td>${wp.elevation || '-'}</td>
        <td>${lat.formatted}</td>
        <td>${lng.formatted}</td>
      </tr>`;
    }).join('')}
  </table>
  ` : ''}

  <h2>飛行前チェックリスト</h2>
  <ul class="checklist">
    <li>機体の外観点検（プロペラ、フレーム、カメラ）</li>
    <li>バッテリー残量確認（フル充電）</li>
    <li>コントローラーとの接続確認</li>
    <li>GNSSの受信状況確認</li>
    <li>フェールセーフ設定の確認</li>
    <li>気象条件の確認（風速、視程、降水）</li>
    <li>周辺の安全確認（人、車、建物）</li>
    <li>飛行禁止区域の最終確認</li>
    <li>関係者への連絡完了</li>
    <li>緊急連絡先の確認</li>
  </ul>

  <h2>緊急連絡先</h2>
  <table class="info-table">
    <tr><td>警察</td><td>110</td></tr>
    <tr><td>消防</td><td>119</td></tr>
    <tr><td>国土交通省（航空局）</td><td>03-5253-8111</td></tr>
  </table>

  <div class="footer">
    <p>※ 本書類はDrone Waypointアプリで自動生成されました</p>
    <p>※ 実際の飛行前に最新の規制・気象情報をご確認ください</p>
  </div>
</body>
</html>
  `.trim();

  return html;
};

// ===== ダウンロード関数 =====

/**
 * テキストデータをファイルとしてダウンロード
 */
export const downloadFile = (content, filename, mimeType) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * 飛行計画書をダウンロード
 */
export const downloadFlightPlan = (flightPlan, format = 'html') => {
  const dateStr = new Date().toISOString().slice(0, 10);

  switch (format) {
    case 'csv':
      downloadFile(
        generateDIPSCSV(flightPlan),
        `flight-plan-dips-${dateStr}.csv`,
        'text/csv;charset=utf-8'
      );
      break;
    case 'tsv':
    case 'excel':
      downloadFile(
        generateFlightPlanTSV(flightPlan),
        `flight-plan-${dateStr}.tsv`,
        'text/tab-separated-values;charset=utf-8'
      );
      break;
    case 'html':
    case 'word':
    default:
      downloadFile(
        generateFlightPlanHTML(flightPlan),
        `flight-plan-${dateStr}.html`,
        'text/html;charset=utf-8'
      );
      break;
  }
};

export default {
  generateDIPSCSV,
  generateFlightPlanTSV,
  generateFlightPlanHTML,
  downloadFlightPlan,
  toDMS,
  formatDate,
};
